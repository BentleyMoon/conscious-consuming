#!/usr/bin/env python3
"""Audit Phase 9 guide depth for every decision with approved register evidence."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = ROOT / "pipeline" / "registers" / "evidence"
REVIEW_DIR = ROOT / "content" / "register-reviews"
GUIDE_DIR = ROOT / "content" / "guides"

# Slug aliases are presentation routing, not a second list of covered decisions.
GUIDE_ALIASES = {"banking": "ethical-banking"}


def fail(message: str) -> None:
    raise SystemExit(message)


def approved_bundles() -> list[dict]:
    bundles = []
    for path in sorted(EVIDENCE_DIR.glob("*.evidence.json")):
        review_path = REVIEW_DIR / path.name.replace(".evidence.json", ".json")
        if not review_path.exists():
            continue
        review = json.loads(review_path.read_text(encoding="utf-8"))
        if review.get("status") != "approved":
            continue
        bundle = json.loads(path.read_text(encoding="utf-8"))
        if not bundle.get("entries"):
            fail(f"{path.name}: approved evidence bundle has no entries")
        bundles.append(bundle)
    if not bundles:
        fail("no approved register evidence bundles found")
    return bundles


def read_guide(cid: str) -> tuple[str, str]:
    slug = GUIDE_ALIASES.get(cid, cid)
    path = GUIDE_DIR / f"{slug}.md"
    if not path.exists():
        fail(f"{cid}: approved register evidence has no guide ({path.relative_to(ROOT)})")
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        fail(f"{cid}: guide frontmatter is malformed")
    frontmatter, body = text[4:].split("\n---\n", 1)
    if not re.search(r"(?m)^status:\s*published\s*$", frontmatter):
        fail(f"{cid}: register-backed guide must be published")
    return slug, body


def main() -> None:
    print("Register editorial wave audit")
    bundles = approved_bundles()
    criteria_by_cid: dict[str, set[str]] = {}
    evidence_cells = 0
    for bundle in bundles:
        criterion = bundle["criterion"]
        for entry in bundle["entries"]:
            criteria_by_cid.setdefault(entry["cid"], set()).add(criterion)
            evidence_cells += 1

    handoff = (ROOT / "docs" / "CONTENT-HANDOFF.md").read_text(encoding="utf-8")
    for cid in sorted(criteria_by_cid):
        slug, body = read_guide(cid)
        lower = body.lower()
        # The label was changed by hand across all 108 guides on 2026-08-15. The convention
        # this protects is the signed blockquote, not the adjective in front of it.
        if "**the short answer.**" not in lower:
            fail(f"{cid}: guide is missing the signed short-answer block")
        if f"](#explore/{cid})" not in body:
            fail(f"{cid}: guide does not link back to its explorer")
        if len(re.findall(r"(?m)^##\s+", body)) < 3:
            fail(f"{cid}: guide needs at least three explanatory sections")
        comparison_rows = len(re.findall(r"(?m)^\|.+\|\s*$", body))
        list_rows = len(re.findall(r"(?m)^[-*]\s+", body))
        if comparison_rows < 3 and list_rows < 5:
            fail(f"{cid}: guide needs a concrete comparison structure")
        if len(re.findall(r"\b[\w'-]+\b", body)) < 500:
            fail(f"{cid}: guide is too short to explain differences and evidence limits")
        if "\u2014" in body:
            fail(f"{cid}: guide contains an em dash")

        criteria = criteria_by_cid[cid]
        if "complaints" in criteria:
            has_raw_boundary = "raw" in lower and (
                "denominator" in lower or "market share" in lower
            )
            if not has_raw_boundary:
                if cid != "banking" or "[H23 active/design-app]" not in handoff:
                    fail(f"{cid}: complaint evidence lacks a raw-count denominator boundary")
        if "certification" in criteria and not (
            "does not tell you" in lower or "cannot establish" in lower or "weaker" in lower
        ):
            fail(f"{cid}: certification evidence has no explicit claim boundary")
        if "durability" in criteria and not (
            "not a promise" in lower or "does not prove" in lower or "cannot establish" in lower
        ):
            fail(f"{cid}: durability evidence has no explicit claim boundary")
        print(f"  {cid}: {slug}.md ({', '.join(sorted(criteria))})")

    print(f"  approved evidence bundles: {len(bundles)}")
    print(f"  derived register-backed decisions: {len(criteria_by_cid)}")
    print(f"  promoted evidence cells represented: {evidence_cells}")
    print("REGISTER EDITORIAL WAVE CHECKS PASS")


if __name__ == "__main__":
    main()
