# Register observations

Register-specific parsers write one `<register-id>-<snapshot-id>.observations.json` file here. An observation contains structured scalar claims and pointers into one verified raw snapshot. It cannot contain finished prose, a criterion key, or a score.

Every target named by a snapshot must have a matched row in the corresponding reviewed entity map and exactly one observation. The explicit `targets` list lets one register map be covered by several independently scoped snapshots without any snapshot claiming the rest. A parser records either `records-found` with traceable claims or `no-matching-record` with the exact search terms. The evidence generator supplies the citation, query, scope, date, and bounded absence wording.
