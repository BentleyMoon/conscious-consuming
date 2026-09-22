#!/usr/bin/env python3
"""Parse the governed French washing-machine durability consolidation."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent))
from tracked_io import write_text  # noqa: E402
from snapshot import verify_snapshot  # noqa: E402

INVENTORY = HERE / "entity-inventory.json"
LENSES = ROOT / "content" / "lenses"
MAPPINGS = ROOT / "content" / "register-mappings"
OBSERVATIONS = HERE / "observations"

CID = "washing-machines"

# These rows already survived hand verification against their individual
# producer filings in the source lens. Pinning the consolidated unique record
# identifier removes model-name inference from future refreshes.
TARGETS = {
    "hotpoint-hb93-care": "5054645730704-FR001088_05WVDO-2026-03-12",
    "samsung-ww80t4020ehef": "WW80T4020EHEF-SEF-2025-02-27",
    "whirlpool-w0m310wads": "8690842895661-FR001088_05WVDO-2026-04-21",
}

REQUIRED_COLUMNS = {
    "id_unique",
    "id_modele",
    "referentiel_id_modele",
    "nom_modele",
    "nom_metteur_sur_le_marche",
    "date_calcul",
    "note_id",
    "note_reparabilite",
    "note_fiabilite",
    "datagouv_resource_id",
}


class ParserError(ValueError):
    """The French durability snapshot or reviewed exact mapping drifted."""


def canonical(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def identity_hash(code: str, name: str) -> str:
    return hashlib.sha256(canonical({"code": code, "name": name}).encode("utf-8")).hexdigest()


def score(value: str, label: str) -> float:
    try:
        result = round(float(value), 2)
    except (TypeError, ValueError) as exc:
        raise ParserError(f"{label}: invalid score {value!r}") from exc
    if not 0 <= result <= 10:
        raise ParserError(f"{label}: score outside zero to ten")
    return result


def build(snapshot_path: Path, reviewed_by: str, reviewed_on: str) -> tuple[dict, dict]:
    snapshot_path = snapshot_path.resolve()
    manifest = verify_snapshot(snapshot_path)
    if manifest["registerId"] != "france-durability":
        raise ParserError("snapshot is not from france-durability")
    payload_path = snapshot_path.parent / manifest["response"]["payload"]
    with payload_path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if not reader.fieldnames or REQUIRED_COLUMNS - set(reader.fieldnames):
            raise ParserError(f"durability CSV missing columns: {sorted(REQUIRED_COLUMNS - set(reader.fieldnames or []))}")
        rows = list(reader)
    by_id = {}
    line_by_id = {}
    for index, row in enumerate(rows, start=2):
        unique_id = row.get("id_unique", "").strip()
        if unique_id in by_id:
            raise ParserError(f"duplicate durability record id {unique_id}")
        by_id[unique_id] = row
        line_by_id[unique_id] = index

    receipt = next(
        row for row in json.loads(INVENTORY.read_text(encoding="utf-8"))["decisions"]
        if row["cid"] == CID
    )
    dataset = json.loads((ROOT / receipt["dataset"]).read_text(encoding="utf-8"))
    entities = {row["code"]: row for row in dataset[receipt["entityField"]]}
    mappings = []
    observations = []
    targets = []
    for code, unique_id in sorted(TARGETS.items()):
        entity = entities.get(code)
        if not entity:
            raise ParserError(f"{CID}/{code}: option is missing from current dataset")
        row = by_id.get(unique_id)
        if not row:
            raise ParserError(f"{CID}/{code}: exact reviewed record is absent: {unique_id}")
        model = row["nom_modele"].strip()
        producer = row["nom_metteur_sur_le_marche"].strip()
        resource_id = row["datagouv_resource_id"].strip()
        source = f"https://www.data.gouv.fr/fr/datasets/r/{resource_id}"
        target = f"{CID}/{code}"
        targets.append(target)
        mappings.append({
            "cid": CID,
            "entityCode": code,
            "entityName": entity["name"],
            "entityIdentitySha256": identity_hash(code, entity["name"]),
            "status": "matched",
            "legalName": producer,
            "aliases": sorted({entity["name"], model}),
            "jurisdiction": "FR",
            "registerIdentifier": {
                "scheme": "fr-durability-id-unique",
                "value": unique_id,
                "url": source,
            },
            "matchEvidence": {
                "source": source,
                "note": "This exact model row previously survived hand verification in its producer filing. The governed consolidation preserves its unique record id, model identifier, model name, producer, calculation date, and component scores.",
                "accessed": reviewed_on,
            },
            "review": {"by": reviewed_by, "on": reviewed_on},
        })
        record_id = "frdur-" + hashlib.sha256(unique_id.encode("utf-8")).hexdigest()[:16]
        observations.append({
            "registerIdentifier": {
                "scheme": "fr-durability-id-unique",
                "value": unique_id,
            },
            "outcome": "records-found",
            "searchTerms": sorted({unique_id, row["id_modele"].strip(), model}),
            "records": [{"id": record_id, "pointer": f"row:{line_by_id[unique_id]}"}],
            "claims": [
                {"label": "Calculation date", "value": row["date_calcul"].strip(), "recordIds": [record_id]},
                {"label": "Durability index", "value": score(row["note_id"], f"{code}.note_id"), "unit": "out of 10", "recordIds": [record_id]},
                {"label": "Model", "value": model, "recordIds": [record_id]},
                {"label": "Model identifier", "value": row["id_modele"].strip(), "recordIds": [record_id]},
                {"label": "Model identifier scheme", "value": row["referentiel_id_modele"].strip(), "recordIds": [record_id]},
                {"label": "Producer", "value": producer, "recordIds": [record_id]},
                {"label": "Reliability component", "value": score(row["note_fiabilite"], f"{code}.note_fiabilite"), "unit": "out of 10", "recordIds": [record_id]},
                {"label": "Repairability component", "value": score(row["note_reparabilite"], f"{code}.note_reparabilite"), "unit": "out of 10", "recordIds": [record_id]},
            ],
        })

    mapping = {
        "format": "open-values-register-entity-map",
        "version": "1.0.0",
        "registerId": "france-durability",
        "updated": reviewed_on,
        "note": "Exact record migration for the washing-machine models whose individual French durability filings already survived hand review. Regional suffixes are preserved and no brand-level inference is allowed.",
        "mappings": mappings,
    }
    observation_bundle = {
        "format": "open-values-register-observations",
        "version": "1.0.0",
        "registerId": "france-durability",
        "snapshot": {
            "manifest": snapshot_path.relative_to(ROOT).as_posix(),
            "snapshotId": manifest["snapshotId"],
            "payloadSha256": manifest["response"]["sha256"],
        },
        "parser": manifest["parser"],
        "targets": targets,
        "observations": observations,
    }
    return mapping, observation_bundle


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--reviewed-by", required=True)
    parser.add_argument("--reviewed-on", required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    mapping, observations = build(args.snapshot, args.reviewed_by, args.reviewed_on)
    mapping_path = MAPPINGS / "france-durability.json"
    observations_path = OBSERVATIONS / f"france-durability-{observations['snapshot']['snapshotId']}.observations.json"
    for path, value in ((mapping_path, mapping), (observations_path, observations)):
        rendered = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        if args.check:
            if not path.is_file() or path.read_text(encoding="utf-8") != rendered:
                raise SystemExit(f"French durability output stale: {path.relative_to(ROOT).as_posix()}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            write_text(path, rendered)
    print(f"French durability {'current' if args.check else 'parsed'}: {len(mapping['mappings'])} exact model mappings")


if __name__ == "__main__":
    main()
