#!/usr/bin/env python3
"""Offline contract tests for all three register adapter classes."""

from __future__ import annotations

import hashlib
import http.server
import io
import json
import tempfile
import threading
import urllib.parse
from pathlib import Path

from snapshot import (
    ADAPTERS,
    RegisterRecord,
    SnapshotError,
    capture,
    normalize_query,
    query_url,
    replay_snapshot,
    verify_snapshot,
)

FIXED_TIME = "2026-08-14T12:00:00Z"


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


MEDIA_TYPES = {
    "api": "application/json",
    "bulk": "text/csv",
    "page": "text/html",
}


class FixtureHandler(http.server.BaseHTTPRequestHandler):
    payloads: dict[str, bytes] = {}

    def do_GET(self) -> None:
        access = urllib.parse.urlsplit(self.path).path.strip("/")
        payload = self.payloads.get(access)
        if payload is None:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", MEDIA_TYPES[access])
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format: str, *args: object) -> None:
        return


def capture_fixture(root: Path, access: str, payload: bytes, extension: str, endpoint: str, source_file: Path | None = None) -> tuple[Path, bytes]:
    record = RegisterRecord(
        register_id=f"fixture-{access}",
        access=access,
        endpoint=endpoint,
        also_at=(),
    )
    manifest = capture(
        record=record,
        output_root=root / "snapshots",
        source_url=record.endpoint,
        query=normalize_query(["region=US", "year=2025"]),
        scope=f"Offline {access} adapter fixture",
        captured_at=FIXED_TIME,
        license_url="https://register.example/license",
        license_note="Synthetic fixture data created for offline contract testing.",
        parser_id=f"fixture-{access}-parser",
        parser_version="1.0.0",
        source_file=source_file,
        extension=extension,
        secret_headers={"Authorization": "fixture-secret-value"},
        secret_header_names=["Authorization"],
    )
    return manifest, payload


def main() -> None:
    print("Register snapshot offline test")
    expect(set(ADAPTERS) == {"api", "bulk", "page"}, "adapter set must cover api, bulk, and page")
    fixtures = {
        "api": (b'{"records":[{"id":"one"}]}\n', "json"),
        "bulk": (b"id,value\none,1\n", "csv"),
        "page": (b"<!doctype html><title>Fixture</title>\n", "html"),
    }
    with tempfile.TemporaryDirectory(prefix="register-snapshot-test-") as temp:
        root = Path(temp)
        FixtureHandler.payloads = {access: payload for access, (payload, _) in fixtures.items()}
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base_url = f"http://127.0.0.1:{server.server_port}"
        manifests = []
        try:
            for access, (payload, extension) in fixtures.items():
                endpoint = f"{base_url}/{access}"
                manifest_path, expected = capture_fixture(root, access, payload, extension, endpoint)
                manifest = verify_snapshot(manifest_path)
                replayed = io.BytesIO()
                replay_snapshot(manifest_path, replayed)
                expect(replayed.getvalue() == expected, f"{access}: offline replay changed payload bytes")
                expect(manifest["response"]["sha256"] == hashlib.sha256(expected).hexdigest(), f"{access}: wrong sha256")
                expect(manifest["response"]["fetchMode"] == "network", f"{access}: wrong fetch mode")
                expect(b"fixture-secret-value" not in manifest_path.read_bytes(), f"{access}: secret value leaked into manifest")
                manifests.append(manifest_path)

            second_root = root / "determinism"
            second_root.mkdir()
            second_manifest, _ = capture_fixture(second_root, "api", fixtures["api"][0], fixtures["api"][1], f"{base_url}/api")
            expect(manifests[0].read_bytes() == second_manifest.read_bytes(), "same inputs must produce a byte-identical manifest")

            imported_source = root / "manual-download.csv"
            imported_source.write_bytes(fixtures["bulk"][0])
            imported_manifest, _ = capture_fixture(root / "import", "bulk", fixtures["bulk"][0], "csv", f"{base_url}/bulk", imported_source)
            expect(verify_snapshot(imported_manifest)["response"]["fetchMode"] == "file-import", "manual file import must be recorded")
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)

        first = manifests[0]
        original_manifest = first.read_bytes()
        first_manifest = json.loads(first.read_text(encoding="utf-8"))
        payload_path = first.parent / first_manifest["response"]["payload"]
        payload_path.write_bytes(payload_path.read_bytes() + b"tamper")
        try:
            verify_snapshot(first)
            raise AssertionError("tampered payload should fail verification")
        except SnapshotError:
            pass
        expect(first.read_bytes() == original_manifest, "verification must not rewrite the manifest")

        try:
            normalize_query(["api_key=must-not-be-recorded"])
            raise AssertionError("secret-like query key should be rejected")
        except SnapshotError:
            pass

        try:
            query_url("https://register.example/api?token=must-not-be-recorded", {})
            raise AssertionError("query embedded in source URL should be rejected")
        except SnapshotError:
            pass

    print("  network adapters: api, bulk, page over loopback")
    print("  manual file import: verified")
    print("  offline replay: 3/3")
    print("  deterministic capture: byte-identical")
    print("  credential recording: names only")
    print("  tamper probe: failed as expected")
    print("  secret query probe: failed as expected")
    print("  embedded query probe: failed as expected")
    print("REGISTER SNAPSHOT OFFLINE TESTS PASS")


if __name__ == "__main__":
    main()
