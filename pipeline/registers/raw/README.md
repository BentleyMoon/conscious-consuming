# Committed register snapshots

Each register gets one subdirectory named for its `content/registers.json` id. A capture writes a `.snapshot.json` manifest and its sibling `.payload.<extension>` file there. Both files are source inputs and must be committed together.

This directory is intentionally empty until the first live register pass. Do not add placeholder snapshots or copy test fixtures here to make a coverage count look nonzero.
