# Edition 9 source verification — October 29, 2026

Completed:

- Edition 9 JSON dataset is parseable and exactly equals the JSON embedded in the original single-file offline explorer.
- 2,229 entities, 2,271 claims and 259 documents are retained.
- Browser-targeted JavaScript files pass `node --check`.
- Static site route `/` returns HTTP 200 with expected HTML.
- Static assets and `/data/atlas.json` are present.
- Original offline explorer is preserved byte-for-byte in `offline/`.
- Source and deployment archives include SHA-256 checksums of their files.

Not completed:

- A full interactive browser check: headless Chromium navigation to localhost returned `net::ERR_BLOCKED_BY_ADMINISTRATOR` in this runtime. This is an environment restriction, not evidence of a JavaScript rendering error.
- Production publication: the ChatGPT Sites repository/deployment tool is unavailable in this session. No live-site changes have been made.

Use `python3 -m http.server 8000` and visit the resulting URL in your own browser for interactive acceptance testing before publishing.
