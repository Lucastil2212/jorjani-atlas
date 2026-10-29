# Publishing the atlas

The site is static. Publish the repository root. Do not upload a zip as the site, and do not run a build.

## Before you publish

```sh
python3 scripts/validate.py
python3 -m http.server 8000
```

In a browser, confirm:

1. `/` serves the atlas and the sidebar says **Public research edition**.
2. The footer names Edition 9, 2,271 attributed records, 3 conversations, and 121 research sources.
3. Overview, Knowledge graph, Claim register, Timeline, Source documents, and Historical evidence open.
4. Coverage shows **What this atlas still does not establish** and a growth table through Edition 9.
5. Light and dark modes both render the graph.
6. A claim drawer opens a source link, and an entity card shows a summary.

## GitHub

1. Create a public repository and push this directory.
2. Set the repository description to: `Source-linked atlas of three American Alchemy conversations and their documentary evidence`.
3. Suggested topics: `research`, `knowledge-graph`, `static-site`.
4. Under Settings → Pages, deploy from the branch root. `.nojekyll` is already present.
5. Put the resulting Pages URL into `CITATION.cff` (`repository-code`) if you want a machine-readable citation.

## Other static hosts

Cloudflare Pages, Netlify, and Render Static Sites can use this directory with an empty build command. Turn on compression for `data/atlas.json` (about 26 MB). The app requests that file with `cache: no-cache` so a later dataset update is revalidated.

## What publishing does not do

Publishing this repository does not change any earlier private site. It also does not mark the 90 audio targets as listened to, and it does not supply the six historical originals listed on the Coverage page.
