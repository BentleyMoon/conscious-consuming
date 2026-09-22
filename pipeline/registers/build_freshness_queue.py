#!/usr/bin/env python3
"""Build the maintainer register-pass queue from governed register artifacts."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent))
from tracked_io import write_text  # noqa: E402

SHELF = ROOT / "content" / "registers.json"
COVERAGE = HERE / "coverage-matrix.json"
RAW = HERE / "raw"
MAPPINGS = ROOT / "content" / "register-mappings"
EVIDENCE = HERE / "evidence"
REVIEWS = ROOT / "content" / "register-reviews"
OUTPUT = ROOT / "docs" / "REGISTER-FRESHNESS-QUEUE.md"
CADENCE_DAYS = {"api": 30, "bulk": 90, "page": 180}
STATE_ORDER = {"blocked": 0, "capture": 1, "refresh": 2, "map": 3, "review": 4, "expand": 5, "current": 6}


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_date(value: str) -> date:
    return date.fromisoformat(value[:10])


def approved_evidence_paths() -> set[str]:
    approved = set()
    if not REVIEWS.exists():
        return approved
    for path in REVIEWS.glob("*.json"):
        review = read_json(path)
        if review.get("status") == "approved" and review.get("evidence"):
            approved.add(str(review["evidence"]).replace("\\", "/"))
    return approved


def register_row(register: dict, matrix: dict, as_of: date, approved_paths: set[str]) -> dict:
    register_id = register["id"]
    matrix_row = next(row for row in matrix["registers"] if row["registerId"] == register_id)
    applicable = matrix_row["counts"]["applicable"]
    built_ids = {
        row.get("cid") or row["id"]
        for row in matrix["decisions"]
        if row.get("built")
        and any(item["registerId"] == register_id for item in row["coverage"]["applicable"])
    }

    manifests = sorted((RAW / register_id).glob("*.snapshot.json")) if (RAW / register_id).exists() else []
    latest_date = None
    if manifests:
        latest_date = max(parse_date(read_json(path)["capturedAt"]) for path in manifests)

    mapping_path = MAPPINGS / f"{register_id}.json"
    mappings = read_json(mapping_path).get("mappings", []) if mapping_path.exists() else []
    matched = sum(row.get("status") == "matched" for row in mappings)

    evidence_files = []
    approved_cells = 0
    approved_decisions = set()
    for path in sorted(EVIDENCE.glob("*.evidence.json")):
        bundle = read_json(path)
        if bundle.get("registerId") != register_id:
            continue
        evidence_files.append(path)
        rel = path.relative_to(ROOT).as_posix()
        if rel in approved_paths:
            approved_cells += len(bundle.get("entries", []))
            approved_decisions.update(entry["cid"] for entry in bundle.get("entries", []))

    cadence = CADENCE_DAYS[register["access"]]
    age = (as_of - latest_date).days if latest_date else None
    caution = str(register.get("caution", "")).lower()
    access_blocked = latest_date is None and bool(re.search(r"approved (?:api )?key|required credential|requires? an? .*key", caution))
    remaining_built = built_ids - approved_decisions

    if access_blocked:
        state = "blocked"
        action = "Resolve the documented access requirement before capture."
    elif latest_date is None:
        state = "capture"
        action = f"Capture one bounded {register['access']} snapshot; never fetch once per option."
    elif age is not None and age > cadence:
        state = "refresh"
        action = f"Refresh the {age}-day-old snapshot, then replay the existing parser and checks."
    elif approved_cells == 0 and not evidence_files:
        state = "map"
        action = "Parse the latest snapshot and record exact mappings or scoped absences."
    elif approved_cells == 0:
        state = "review"
        action = "Complete the deterministic sample review before promotion."
    elif remaining_built:
        state = "expand"
        action = f"Extend exact mappings to {len(remaining_built)} remaining built decision(s) from the same register."
    else:
        state = "current"
        action = f"Re-run on the {cadence}-day {register['access']} cadence or after a publisher change."

    return {
        "id": register_id,
        "name": register["name"],
        "access": register["access"],
        "criterion": register["provenanceKey"],
        "applicable": applicable,
        "built": len(built_ids),
        "latest": latest_date,
        "snapshotCount": len(manifests),
        "matched": matched,
        "approvedCells": approved_cells,
        "approvedDecisions": len(approved_decisions),
        "state": state,
        "action": action,
    }


def render(as_of: date) -> str:
    shelf = read_json(SHELF)
    matrix = read_json(COVERAGE)
    approved_paths = approved_evidence_paths()
    rows = [register_row(register, matrix, as_of, approved_paths) for register in shelf["registers"]]
    rows.sort(key=lambda row: (
        STATE_ORDER[row["state"]],
        -row["built"],
        -row["applicable"],
        row["id"],
    ))
    states = Counter(row["state"] for row in rows)
    snapshotted = sum(row["snapshotCount"] > 0 for row in rows)
    approved_cells = sum(row["approvedCells"] for row in rows)

    lines = [
        "# Register freshness queue",
        "",
        f"*Derived for {as_of.isoformat()} by `python pipeline/registers/build_freshness_queue.py`. Do not edit the table by hand.*",
        "",
        "This is a maintainer queue, not a user-facing stale badge. It derives its subject from the register shelf, coverage matrix, committed snapshots, mappings, evidence bundles, and review receipts. API registers use a 30-day operating cadence, bulk registers 90 days, and page registers 180 days. A cadence is a review prompt, not evidence that a publisher changed.",
        "",
        "## Current receipt",
        "",
        f"- Registers: {len(rows)}",
        f"- Applicable register-to-decision relationships: {sum(row['applicable'] for row in rows)}",
        f"- Registers with committed snapshots: {snapshotted}/{len(rows)}",
        f"- Approved generated evidence cells: {approved_cells}",
        "- Queue states: " + ", ".join(f"{state} {states[state]}" for state in STATE_ORDER if states[state]),
        f"- Shelf SHA-256: `{sha256(SHELF)}`",
        f"- Coverage matrix SHA-256: `{sha256(COVERAGE)}`",
        "",
        "## Ordered register passes",
        "",
        "| # | State | Register | Access | Criterion | Built reach | Catalogue reach | Latest snapshot | Approved cells | Next pass |",
        "| ---: | --- | --- | --- | --- | ---: | ---: | --- | ---: | --- |",
    ]
    for index, row in enumerate(rows, 1):
        latest = row["latest"].isoformat() if row["latest"] else "none"
        lines.append(
            f"| {index} | {row['state']} | `{row['id']}` | {row['access']} | `{row['criterion']}` | "
            f"{row['built']} | {row['applicable']} | {latest} | {row['approvedCells']} | {row['action']} |"
        )

    lines.extend([
        "",
        "## How to use the queue",
        "",
        "1. Take the highest row whose access requirement can be met.",
        "2. Read [REGISTER-PASS-RUNBOOK.md](REGISTER-PASS-RUNBOOK.md) before capturing or promoting anything.",
        "3. Rebuild this file after any snapshot, mapping, evidence, review, shelf, or coverage change.",
        "4. Treat `blocked`, `unmapped`, and scoped absence as visible work. Never turn them into positive claims.",
        "",
    ])
    return "\n".join(lines)


def pinned_as_of() -> date:
    if not OUTPUT.exists():
        raise ValueError(f"{OUTPUT.relative_to(ROOT)} is missing; run the build command")
    match = re.search(r"\*Derived for (\d{4}-\d{2}-\d{2}) by", OUTPUT.read_text(encoding="utf-8"))
    if not match:
        raise ValueError(f"{OUTPUT.relative_to(ROOT)} has no derived date")
    return parse_date(match.group(1))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", help="Queue date in YYYY-MM-DD form; defaults to current UTC date")
    parser.add_argument("--check", action="store_true", help="Fail if the committed queue is stale or not reproducible")
    args = parser.parse_args()

    try:
        as_of = pinned_as_of() if args.check and not args.as_of else parse_date(args.as_of or datetime.now(timezone.utc).date().isoformat())
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    if args.check:
        age = (datetime.now(timezone.utc).date() - as_of).days
        if age < 0 or age > 31:
            raise SystemExit(f"{OUTPUT.relative_to(ROOT)} is {age} days from the current UTC date; rebuild the queue")
        expected = render(as_of)
        actual = OUTPUT.read_text(encoding="utf-8")
        if actual != expected:
            raise SystemExit(f"{OUTPUT.relative_to(ROOT)} is stale; run npm run build:register-freshness")
        print("Register freshness queue audit")
        print(f"  derived date: {as_of.isoformat()}")
        print(f"  queue age: {age} day(s)")
        print("  artifact parity: exact")
        print("REGISTER FRESHNESS QUEUE CHECKS PASS")
        return

    write_text(OUTPUT, render(as_of))
    print(f"Wrote {OUTPUT.relative_to(ROOT)} for {as_of.isoformat()}")


if __name__ == "__main__":
    main()
