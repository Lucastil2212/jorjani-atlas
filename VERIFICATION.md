# Source verification — public release, 29 October 2026

The Edition 9 dataset is the public dataset. Counts after the publication pass:

- 2,229 entities, 2,271 claims, 259 documents, 121 research sources
- 3,455 typed relationship records and 3,385 unique directed relationships
- 90 audio targets, 0 listened to
- 6 Edition 9 historical-boundary dossiers, 0 newly acquired originals

Publication changes inside that count:

- Entity summaries were completed from claims and sources already in the file. They are labeled as attributed wording.
- `ent-e8-admonitio-generalis` is linked to claim `e8-hist-0003`, source `e8-charlemagne-mgh`, and document `doc-e8-admonitio`.
- `ent-e9-dec1947-army-files` is linked to claims `e9-hist-0001`–`e9-hist-0003`, sources `e9-horten-1947` and `e9-horten-mccoy`, and documents `doc-e9-horten-1947` and `doc-e9-horten-mccoy`.
- Edition 6 totals were preserved as `audit.edition6`. Edition 7 repeats those totals. Editions 8 and 9 are computed from the records added in those passes. The Edition 6 snapshot matches the previous `audit.after` block.
- `offline/atlas_explorer.html` embeds the same `data/atlas.json` and the same application updates. It is no longer a byte-for-byte copy of the pre-publication portable file.

`python3 scripts/validate.py` checks referential integrity, those links, the edition snapshots, the schema keys, and the public-release files.

Not done here:

- The 90 name targets were not listened to.
- The six historical originals named in `research/EDITION9_HISTORICAL_BOUNDARY.md` were not acquired.
- Interactive browser acceptance still belongs in a normal browser session against `python3 -m http.server`.
