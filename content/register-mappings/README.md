# Register entity mappings

One file maps catalogue options to one public register. The filename is the register id from `content/registers.json`.

The local identity is always `<cid>/<entityCode>`. The mapping also pins the SHA-256 of the option's current `{code, name}` pair. A changed name does not silently inherit an old legal-entity match.

Statuses are explicit:

- `matched`: one reviewed legal identity with a stable register identifier and evidence;
- `ambiguous`: more than one defensible candidate, so no claim may be generated;
- `unmatched`: a documented search found no defensible record;
- `not-applicable`: the option is outside that register's jurisdiction or subject matter;
- `unreviewed`: a scaffold row that has not been researched.

Only `matched` rows may cross `pipeline/registers/entity_mapping.py` into evidence generation. Every other state remains visible and emits nothing.

Create a scaffold for selected built decisions:

```bash
python pipeline/registers/scaffold_entity_map.py \
  --register sec-edgar \
  --cid banking \
  --updated 2026-08-14
```

Never use `--force` over reviewed work. Merge new scaffold rows into an existing map deliberately.
