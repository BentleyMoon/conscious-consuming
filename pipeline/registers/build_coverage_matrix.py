#!/usr/bin/env python3
"""Build a complete taxonomy-derived decision by register coverage matrix."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent))
from tracked_io import write_text  # noqa: E402

TAXONOMY = ROOT / "content" / "taxonomy.json"
SHELF = ROOT / "content" / "registers.json"
RULES = ROOT / "content" / "register-coverage-rules.json"
INVENTORY = HERE / "entity-inventory.json"
OUTPUT = HERE / "coverage-matrix.json"
TARGET_SCOPES = {"covered", "open"}
MATCH_FIELDS = ("realms", "fields", "families", "types", "modes", "scopes", "decisionIds", "cids")


class CoverageError(ValueError):
    """Coverage rules cannot produce one unambiguous matrix."""


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def collect_decisions(value: object, out: list[dict] | None = None) -> list[dict]:
    if out is None:
        out = []
    if isinstance(value, list):
        for item in value:
            collect_decisions(item, out)
    elif isinstance(value, dict):
        if all(key in value for key in ("id", "path", "scope", "mode", "realm", "field", "family", "type")):
            out.append(value)
        for item in value.values():
            collect_decisions(item, out)
    return out


def selector_matches(decision: dict, match: dict) -> bool:
    lookup = {
        "realms": decision.get("realm"),
        "fields": decision.get("field"),
        "families": decision.get("family"),
        "types": decision.get("type"),
        "modes": decision.get("mode"),
        "scopes": decision.get("scope"),
        "decisionIds": decision.get("id"),
        "cids": decision.get("cid"),
    }
    for field in MATCH_FIELDS:
        if field in match and lookup[field] not in match[field]:
            return False
    return True


def decision_is_proven(decision: dict, register: dict) -> bool:
    names = {decision.get("id"), decision.get("cid")}
    return any(proven in names for proven in register.get("proven", []))


def resolve_coverage(decision: dict, register: dict, rule: dict) -> dict:
    candidates = []
    if decision_is_proven(decision, register):
        candidates.append({
            "priority": 1000,
            "status": "applicable",
            "reason": "The register shelf records a hand-verified citation for this decision.",
            "basis": {"kind": "shelf-proven"},
        })
    for selector in rule.get("selectors", []):
        if selector_matches(decision, selector["match"]):
            candidates.append({
                "priority": selector["priority"],
                "status": selector["status"],
                "reason": selector["reason"],
                "basis": {"kind": "selector", "id": selector["id"]},
            })
    if not candidates:
        default = rule["default"]
        return {
            "registerId": register["id"],
            "criterion": register["provenanceKey"],
            "status": default["status"],
            "reason": default["reason"],
            "basis": {"kind": "default"},
        }
    highest = max(row["priority"] for row in candidates)
    winners = [row for row in candidates if row["priority"] == highest]
    signatures = {(row["status"], row["reason"]) for row in winners}
    if len(signatures) != 1:
        ids = [row["basis"].get("id", row["basis"]["kind"]) for row in winners]
        raise CoverageError(f"{decision['id']}/{register['id']}: conflicting priority {highest} selectors {ids}")
    winner = winners[0]
    return {
        "registerId": register["id"],
        "criterion": register["provenanceKey"],
        "status": winner["status"],
        "reason": winner["reason"],
        "basis": winner["basis"],
    }


def validate_rules(shelf: dict, rules: dict, decisions: list[dict]) -> dict[str, dict]:
    shelf_ids = [row["id"] for row in shelf.get("registers", [])]
    rule_rows = rules.get("registers", [])
    rule_ids = [row.get("registerId") for row in rule_rows]
    if len(rule_ids) != len(set(rule_ids)):
        raise CoverageError("coverage rules contain duplicate register ids")
    if set(rule_ids) != set(shelf_ids):
        missing = sorted(set(shelf_ids) - set(rule_ids))
        extra = sorted(set(rule_ids) - set(shelf_ids))
        raise CoverageError(f"coverage rule/shelf mismatch missing={missing} extra={extra}")
    for rule in rule_rows:
        selector_ids = set()
        if rule.get("default", {}).get("status") != "unmapped":
            raise CoverageError(f"{rule['registerId']}: default status must be unmapped")
        for selector in rule.get("selectors", []):
            if selector["id"] in selector_ids:
                raise CoverageError(f"{rule['registerId']}: duplicate selector id {selector['id']}")
            selector_ids.add(selector["id"])
            if not selector.get("match"):
                raise CoverageError(f"{rule['registerId']}/{selector['id']}: empty match would cover everything")
            unknown = set(selector["match"]) - set(MATCH_FIELDS)
            if unknown:
                raise CoverageError(f"{rule['registerId']}/{selector['id']}: unknown match fields {sorted(unknown)}")
            matched = [decision for decision in decisions if selector_matches(decision, selector["match"])]
            if not matched:
                raise CoverageError(f"{rule['registerId']}/{selector['id']}: selector matches no current target decision")
            for field, allowed in selector["match"].items():
                lookup_key = {
                    "realms": "realm", "fields": "field", "families": "family", "types": "type",
                    "modes": "mode", "scopes": "scope", "decisionIds": "id", "cids": "cid",
                }[field]
                known = {decision.get(lookup_key) for decision in decisions}
                invalid = sorted(set(allowed) - known)
                if invalid:
                    raise CoverageError(f"{rule['registerId']}/{selector['id']}: unknown {field} values {invalid}")
    return {row["registerId"]: row for row in rule_rows}


def build_matrix() -> dict:
    taxonomy = read_json(TAXONOMY)
    shelf = read_json(SHELF)
    rules = read_json(RULES)
    inventory = read_json(INVENTORY)
    built_cids = {row["cid"] for row in inventory.get("decisions", [])}
    all_decisions = collect_decisions(taxonomy)
    targets = sorted((row for row in all_decisions if row["scope"] in TARGET_SCOPES), key=lambda row: row["id"])
    rules_by_register = validate_rules(shelf, rules, targets)
    excluded = [row for row in all_decisions if row["scope"] not in TARGET_SCOPES]
    registers = sorted(shelf.get("registers", []), key=lambda row: row["id"])
    status_counts = {status: 0 for status in ("applicable", "not-applicable", "blocked", "unmapped")}
    register_counts = {row["id"]: {status: 0 for status in status_counts} for row in registers}
    decisions = []
    for decision in targets:
        coverage = {"applicable": [], "notApplicable": [], "blocked": [], "unmapped": []}
        for register in registers:
            row = resolve_coverage(decision, register, rules_by_register[register["id"]])
            status_counts[row["status"]] += 1
            register_counts[register["id"]][row["status"]] += 1
            if row["status"] == "unmapped":
                coverage["unmapped"].append(row["registerId"])
            else:
                group = "notApplicable" if row["status"] == "not-applicable" else row["status"]
                coverage[group].append({
                    "registerId": row["registerId"],
                    "criterion": row["criterion"],
                    "reason": row["reason"],
                    "basis": row["basis"],
                })
        decisions.append({
            "id": decision["id"],
            "cid": decision.get("cid"),
            "label": decision["label"],
            "path": decision["path"],
            "scope": decision["scope"],
            "built": decision.get("cid") in built_cids,
            "realm": decision["realm"],
            "field": decision["field"],
            "family": decision["family"],
            "type": decision["type"],
            "mode": decision["mode"],
            "coverage": coverage,
        })
    relationship_count = len(targets) * len(registers)
    if sum(status_counts.values()) != relationship_count:
        raise CoverageError("status counts do not equal the decision by register denominator")
    return {
        "format": "open-values-register-coverage-matrix",
        "version": "1.0.0",
        "generatedFrom": {
            "taxonomy": "content/taxonomy.json",
            "taxonomySha256": file_hash(TAXONOMY),
            "registerShelf": "content/registers.json",
            "registerShelfSha256": file_hash(SHELF),
            "coverageRules": "content/register-coverage-rules.json",
            "coverageRulesSha256": file_hash(RULES),
            "entityInventory": "pipeline/registers/entity-inventory.json",
            "entityInventorySha256": file_hash(INVENTORY),
        },
        "counts": {
            "taxonomyDecisions": len(all_decisions),
            "targetDecisions": len(targets),
            "coveredDecisions": sum(row["scope"] == "covered" for row in targets),
            "openDecisions": sum(row["scope"] == "open" for row in targets),
            "builtTargetDecisions": sum(row.get("cid") in built_cids for row in targets),
            "excludedHoldDecisions": sum(row["scope"] == "hold" for row in excluded),
            "excludedOutDecisions": sum(row["scope"] == "out" for row in excluded),
            "registers": len(registers),
            "relationships": relationship_count,
            "statuses": status_counts,
        },
        "registers": [
            {
                "registerId": register["id"],
                "criterion": register["provenanceKey"],
                "counts": register_counts[register["id"]],
            }
            for register in registers
        ],
        "decisions": decisions,
    }


def main() -> None:
    matrix = build_matrix()
    rendered = json.dumps(matrix, ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != rendered:
            raise SystemExit("register coverage matrix is stale; run python pipeline/registers/build_coverage_matrix.py")
        print(f"register coverage matrix current: {matrix['counts']['targetDecisions']} decisions x {matrix['counts']['registers']} registers = {matrix['counts']['relationships']} relationships")
        return
    write_text(OUTPUT, rendered)
    print(f"register coverage matrix: {matrix['counts']['targetDecisions']} decisions x {matrix['counts']['registers']} registers = {matrix['counts']['relationships']} relationships")
    print("statuses:", matrix["counts"]["statuses"])


if __name__ == "__main__":
    main()
