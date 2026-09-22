#!/usr/bin/env python3
"""Falsifiability tests for conservative coverage resolution."""

from __future__ import annotations

from build_coverage_matrix import CoverageError, resolve_coverage, selector_matches


def main() -> None:
    print("Register coverage resolution test")
    decision = {
        "id": "fixture-decision",
        "cid": "fixture-cid",
        "realm": "money",
        "field": "everyday-banking",
        "family": "accounts",
        "type": "Services",
        "mode": "subscribe",
        "scope": "covered",
    }
    register = {"id": "fixture-register", "provenanceKey": "complaints", "proven": []}
    rule = {
        "default": {"status": "unmapped", "reason": "No reviewed rule."},
        "selectors": [{
            "id": "money-services",
            "priority": 10,
            "status": "applicable",
            "reason": "Fixture applies.",
            "match": {"realms": ["money"], "types": ["Services"]},
        }],
    }
    if not selector_matches(decision, rule["selectors"][0]["match"]):
        raise AssertionError("selector should match every declared dimension")
    resolved = resolve_coverage(decision, register, rule)
    if resolved["status"] != "applicable" or resolved["basis"].get("id") != "money-services":
        raise AssertionError("reviewed selector should resolve applicable")

    unmatched = dict(decision, realm="home")
    if resolve_coverage(unmatched, register, rule)["status"] != "unmapped":
        raise AssertionError("missing reviewed rule must remain unmapped")

    proven_register = dict(register, proven=["fixture-cid"])
    if resolve_coverage(unmatched, proven_register, rule)["basis"]["kind"] != "shelf-proven":
        raise AssertionError("hand-verified shelf proof must override lower-priority selectors")

    conflict_rule = {
        "default": rule["default"],
        "selectors": [
            dict(rule["selectors"][0], id="one", status="applicable", reason="One"),
            dict(rule["selectors"][0], id="two", status="blocked", reason="Two"),
        ],
    }
    try:
        resolve_coverage(decision, register, conflict_rule)
        raise AssertionError("equal-priority conflicting selectors should fail")
    except CoverageError:
        pass

    print("  reviewed selector: applicable")
    print("  missing rule: unmapped")
    print("  shelf proof: overrides selector")
    print("  equal-priority conflict: failed as expected")
    print("REGISTER COVERAGE RESOLUTION TESTS PASS")


if __name__ == "__main__":
    main()
