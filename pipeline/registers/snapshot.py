#!/usr/bin/env python3
"""Capture and replay public-register snapshots without build-time network access."""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import shutil
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO, Iterable

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent))
from tracked_io import write_text  # noqa: E402

FORMAT = "open-values-register-snapshot"
VERSION = "1.0.0"
DEFAULT_USER_AGENT = "ConsciousConsuming/1.0 register-snapshot"
SECRET_QUERY_KEYS = re.compile(r"(?:^|_)(?:api_?key|access_?token|token|secret|password)(?:$|_)", re.I)
SECRET_HEADER_NAMES = {"authorization", "cookie", "proxy-authorization", "x-api-key", "api-key"}
SECRET_HEADER_CANONICAL = {
    "authorization": "Authorization",
    "cookie": "Cookie",
    "proxy-authorization": "Proxy-Authorization",
    "x-api-key": "X-Api-Key",
    "api-key": "Api-Key",
}
ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")


class SnapshotError(RuntimeError):
    """A snapshot cannot be captured or replayed safely."""


@dataclass(frozen=True)
class RegisterRecord:
    register_id: str
    access: str
    endpoint: str
    also_at: tuple[str, ...]


@dataclass(frozen=True)
class FetchResult:
    status: int
    final_url: str
    media_type: str
    byte_count: int
    sha256: str


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_timestamp(value: str) -> str:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise SnapshotError("captured-at must be an ISO 8601 timestamp") from exc
    if parsed.tzinfo is None:
        raise SnapshotError("captured-at must include a timezone")
    return parsed.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_shelf(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def register_record(shelf: dict, register_id: str) -> RegisterRecord:
    for row in shelf.get("registers", []):
        if row.get("id") == register_id:
            return RegisterRecord(
                register_id=register_id,
                access=row["access"],
                endpoint=row["endpoint"],
                also_at=tuple(row.get("alsoAt", [])),
            )
    raise SnapshotError(f"unknown register id: {register_id}")


def normalize_query(items: Iterable[str]) -> dict[str, list[str]]:
    query: dict[str, list[str]] = {}
    for item in items:
        if "=" not in item:
            raise SnapshotError(f"query must be key=value: {item}")
        key, value = item.split("=", 1)
        key = key.strip()
        if not key:
            raise SnapshotError("query key must not be empty")
        if SECRET_QUERY_KEYS.search(key):
            raise SnapshotError(f"secret-like query key is not recordable: {key}")
        query.setdefault(key, []).append(value)
    return {key: sorted(values) for key, values in sorted(query.items())}


def query_url(url: str, query: dict[str, list[str]]) -> str:
    parsed = urllib.parse.urlsplit(url)
    if parsed.query:
        raise SnapshotError("source URL must not contain a query; pass every parameter with --query")
    if parsed.fragment:
        raise SnapshotError("source URL must not contain a fragment")
    encoded = urllib.parse.urlencode(sorted((key, value) for key, values in query.items() for value in values))
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, encoded, parsed.fragment))


def allowed_source_url(record: RegisterRecord, url: str) -> bool:
    candidate = urllib.parse.urlsplit(url)
    if candidate.scheme not in {"http", "https"} or not candidate.hostname:
        return False
    for allowed in (record.endpoint, *record.also_at):
        parsed = urllib.parse.urlsplit(allowed)
        if candidate.hostname == parsed.hostname or candidate.hostname.endswith(f".{parsed.hostname}"):
            return True
    return False


def default_accept(access: str) -> str:
    if access == "api":
        return "application/json, application/*+json;q=0.9, */*;q=0.1"
    if access == "page":
        return "text/html, application/xhtml+xml;q=0.9, */*;q=0.1"
    return "*/*"


def parse_secret_header_env(items: Iterable[str]) -> tuple[dict[str, str], list[str]]:
    headers: dict[str, str] = {}
    names: list[str] = []
    for item in items:
        if "=" not in item:
            raise SnapshotError(f"secret header must be Header=ENV_VAR: {item}")
        name, env_name = item.split("=", 1)
        name = name.strip()
        env_name = env_name.strip()
        normalized_name = name.lower()
        if normalized_name not in SECRET_HEADER_NAMES:
            raise SnapshotError(f"header is not on the secret-header allowlist: {name}")
        value = os.environ.get(env_name)
        if not value:
            raise SnapshotError(f"environment variable is missing or empty: {env_name}")
        canonical_name = SECRET_HEADER_CANONICAL[normalized_name]
        headers[canonical_name] = value
        names.append(canonical_name)
    return headers, sorted(set(names), key=str.lower)


def stream_hash(source: BinaryIO, target: BinaryIO) -> tuple[int, str]:
    digest = hashlib.sha256()
    byte_count = 0
    while True:
        chunk = source.read(1024 * 1024)
        if not chunk:
            break
        target.write(chunk)
        digest.update(chunk)
        byte_count += len(chunk)
    return byte_count, digest.hexdigest()


class RegisterAdapter:
    access = ""

    def fetch(
        self,
        url: str,
        target: Path,
        headers: dict[str, str],
        retries: int = 3,
    ) -> FetchResult:
        last_error: Exception | None = None
        for attempt in range(retries):
            try:
                request = urllib.request.Request(url, headers=headers, method="GET")
                with urllib.request.urlopen(request, timeout=90) as response, target.open("wb") as handle:
                    byte_count, digest = stream_hash(response, handle)
                    media_type = response.headers.get_content_type() or "application/octet-stream"
                    return FetchResult(
                        status=int(response.status),
                        final_url=response.geturl(),
                        media_type=media_type,
                        byte_count=byte_count,
                        sha256=digest,
                    )
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                last_error = exc
                if target.exists():
                    target.unlink()
                if attempt + 1 < retries:
                    time.sleep(2 * (attempt + 1))
        raise SnapshotError(f"register fetch failed after {retries} attempts: {last_error}")


class ApiAdapter(RegisterAdapter):
    access = "api"


class BulkAdapter(RegisterAdapter):
    access = "bulk"


class PageAdapter(RegisterAdapter):
    access = "page"


ADAPTERS = {adapter.access: adapter() for adapter in (ApiAdapter, BulkAdapter, PageAdapter)}


def safe_extension(media_type: str, source_url: str, override: str | None = None) -> str:
    if override:
        candidate = override.lower().lstrip(".")
    else:
        candidate = Path(urllib.parse.urlsplit(source_url).path).suffix.lower().lstrip(".")
        if not candidate:
            candidate = (mimetypes.guess_extension(media_type.split(";", 1)[0]) or ".bin").lstrip(".")
    if not re.fullmatch(r"[a-z0-9]{1,10}", candidate):
        raise SnapshotError(f"unsafe payload extension: {candidate}")
    return candidate


def snapshot_identity(manifest: dict) -> dict:
    identity = {
        key: value
        for key, value in manifest.items()
        if key not in {"format", "version", "snapshotId"}
    }
    identity["response"] = {
        key: value
        for key, value in manifest["response"].items()
        if key != "payload"
    }
    return identity


def snapshot_id(captured_at: str, manifest: dict) -> str:
    canonical = json.dumps(snapshot_identity(manifest), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return f"{captured_at[:10]}-{digest[:12]}"


def build_manifest(
    *,
    record: RegisterRecord,
    captured_at: str,
    source_url: str,
    query: dict[str, list[str]],
    scope: str,
    public_headers: dict[str, str],
    secret_header_names: list[str],
    fetch_mode: str,
    result: FetchResult,
    payload_name: str,
    license_url: str,
    license_note: str,
    parser_id: str,
    parser_version: str,
    snapshot_id_value: str = "",
) -> dict:
    return {
        "format": FORMAT,
        "version": VERSION,
        "snapshotId": snapshot_id_value,
        "registerId": record.register_id,
        "access": record.access,
        "capturedAt": captured_at,
        "request": {
            "method": "GET",
            "url": source_url,
            "query": query,
            "scope": scope,
            "headers": dict(sorted(public_headers.items(), key=lambda item: item[0].lower())),
            "secretHeaderNames": secret_header_names,
        },
        "response": {
            "status": result.status,
            "finalUrl": result.final_url,
            "mediaType": result.media_type,
            "bytes": result.byte_count,
            "sha256": result.sha256,
            "payload": payload_name,
            "fetchMode": fetch_mode,
        },
        "license": {"url": license_url, "note": license_note},
        "parser": {"id": parser_id, "version": parser_version},
    }


def write_manifest(path: Path, manifest: dict) -> None:
    write_text(path, json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


def capture(
    *,
    record: RegisterRecord,
    output_root: Path,
    source_url: str,
    query: dict[str, list[str]],
    scope: str,
    captured_at: str,
    license_url: str,
    license_note: str,
    parser_id: str,
    parser_version: str,
    source_file: Path | None = None,
    media_type: str | None = None,
    extension: str | None = None,
    secret_headers: dict[str, str] | None = None,
    secret_header_names: list[str] | None = None,
    user_agent: str = DEFAULT_USER_AGENT,
) -> Path:
    if not ID.fullmatch(record.register_id):
        raise SnapshotError(f"invalid register id: {record.register_id}")
    if record.access not in ADAPTERS:
        raise SnapshotError(f"unsupported access mode: {record.access}")
    if not allowed_source_url(record, source_url):
        raise SnapshotError(f"source URL is outside the register's declared hosts: {source_url}")
    if not scope.strip():
        raise SnapshotError("scope must state what the request covers")
    if not license_url.startswith(("http://", "https://")) or not license_note.strip():
        raise SnapshotError("license URL and note are required")
    if not ID.fullmatch(parser_id) or not SEMVER.fullmatch(parser_version):
        raise SnapshotError("parser id must be kebab-case and parser version must be semver")

    captured_at = parse_timestamp(captured_at)
    public_headers = {"Accept": default_accept(record.access), "User-Agent": user_agent}
    request_url = query_url(source_url, query)
    register_dir = output_root / record.register_id
    register_dir.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(prefix="register-", suffix=".payload", dir=register_dir, delete=False) as temp:
        temp_path = Path(temp.name)
    try:
        if source_file:
            if not source_file.is_file():
                raise SnapshotError(f"source file does not exist: {source_file}")
            with source_file.open("rb") as source, temp_path.open("wb") as target:
                byte_count, digest = stream_hash(source, target)
            guessed_type = media_type or mimetypes.guess_type(source_file.name)[0] or "application/octet-stream"
            result = FetchResult(200, request_url, guessed_type, byte_count, digest)
            fetch_mode = "file-import"
        else:
            headers = dict(public_headers)
            headers.update(secret_headers or {})
            result = ADAPTERS[record.access].fetch(request_url, temp_path, headers)
            fetch_mode = "network"

        ext = safe_extension(media_type or result.media_type, source_url, extension)
        manifest = build_manifest(
            record=record,
            captured_at=captured_at,
            source_url=source_url,
            query=query,
            scope=scope.strip(),
            public_headers=public_headers,
            secret_header_names=secret_header_names or [],
            fetch_mode=fetch_mode,
            result=result,
            payload_name="",
            license_url=license_url,
            license_note=license_note.strip(),
            parser_id=parser_id,
            parser_version=parser_version,
        )
        sid = snapshot_id(captured_at, manifest)
        payload_name = f"{sid}.payload.{ext}"
        payload_path = register_dir / payload_name
        manifest_path = register_dir / f"{sid}.snapshot.json"
        manifest["snapshotId"] = sid
        manifest["response"]["payload"] = payload_name
        os.replace(temp_path, payload_path)
        write_manifest(manifest_path, manifest)
        return manifest_path
    finally:
        if temp_path.exists():
            temp_path.unlink()


def verify_snapshot(manifest_path: Path) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("format") != FORMAT or manifest.get("version") != VERSION:
        raise SnapshotError(f"unsupported snapshot format: {manifest_path}")
    expected_id = snapshot_id(str(manifest.get("capturedAt", "")), manifest)
    if manifest.get("snapshotId") != expected_id:
        raise SnapshotError("snapshot receipt hash mismatch")
    payload_name = manifest.get("response", {}).get("payload", "")
    if not payload_name or Path(payload_name).name != payload_name:
        raise SnapshotError("payload must be a filename beside its manifest")
    if not payload_name.startswith(f"{manifest['snapshotId']}.payload."):
        raise SnapshotError("payload filename must begin with snapshot id")
    payload_path = manifest_path.parent / payload_name
    if not payload_path.is_file():
        raise SnapshotError(f"snapshot payload is missing: {payload_path}")
    digest = hashlib.sha256()
    byte_count = 0
    with payload_path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
            byte_count += len(chunk)
    response = manifest["response"]
    if digest.hexdigest() != response.get("sha256"):
        raise SnapshotError("snapshot payload sha256 mismatch")
    if byte_count != response.get("bytes"):
        raise SnapshotError("snapshot payload byte count mismatch")
    return manifest


def replay_snapshot(manifest_path: Path, target: BinaryIO) -> dict:
    manifest = verify_snapshot(manifest_path)
    payload_path = manifest_path.parent / manifest["response"]["payload"]
    with payload_path.open("rb") as source:
        shutil.copyfileobj(source, target)
    return manifest


def cli() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--shelf", type=Path, default=ROOT / "content" / "registers.json")
    subparsers = parser.add_subparsers(dest="command", required=True)

    capture_parser = subparsers.add_parser("capture", help="capture a network response or downloaded file")
    capture_parser.add_argument("--register", required=True)
    capture_parser.add_argument("--url")
    capture_parser.add_argument("--query", action="append", default=[])
    capture_parser.add_argument("--scope", required=True)
    capture_parser.add_argument("--captured-at", default=utc_now())
    capture_parser.add_argument("--license-url", required=True)
    capture_parser.add_argument("--license-note", required=True)
    capture_parser.add_argument("--parser-id", required=True)
    capture_parser.add_argument("--parser-version", required=True)
    capture_parser.add_argument("--source-file", type=Path)
    capture_parser.add_argument("--media-type")
    capture_parser.add_argument("--extension")
    capture_parser.add_argument("--secret-header-env", action="append", default=[])
    capture_parser.add_argument("--user-agent", default=DEFAULT_USER_AGENT)
    capture_parser.add_argument("--output-root", type=Path, default=HERE / "raw")

    verify_parser = subparsers.add_parser("verify", help="verify one snapshot without network access")
    verify_parser.add_argument("manifest", type=Path)

    replay_parser = subparsers.add_parser("replay", help="stream a verified payload to stdout")
    replay_parser.add_argument("manifest", type=Path)

    args = parser.parse_args()
    try:
        if args.command == "capture":
            shelf = load_shelf(args.shelf)
            record = register_record(shelf, args.register)
            secret_headers, secret_names = parse_secret_header_env(args.secret_header_env)
            manifest_path = capture(
                record=record,
                output_root=args.output_root,
                source_url=args.url or record.endpoint,
                query=normalize_query(args.query),
                scope=args.scope,
                captured_at=args.captured_at,
                license_url=args.license_url,
                license_note=args.license_note,
                parser_id=args.parser_id,
                parser_version=args.parser_version,
                source_file=args.source_file,
                media_type=args.media_type,
                extension=args.extension,
                secret_headers=secret_headers,
                secret_header_names=secret_names,
                user_agent=args.user_agent,
            )
            print(manifest_path.relative_to(ROOT).as_posix())
        elif args.command == "verify":
            manifest = verify_snapshot(args.manifest)
            print(f"verified {manifest['snapshotId']} {manifest['response']['sha256']}")
        else:
            replay_snapshot(args.manifest, sys.stdout.buffer)
        return 0
    except SnapshotError as exc:
        print(f"snapshot error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(cli())
