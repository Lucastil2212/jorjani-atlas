# Manticore / Jorjani Atlas — Edition 9 source code

This repository is reconstructed **from the Edition 9 portable atlas**. The application source was previously packaged in a single HTML file; this extraction preserves its original application logic and styles while loading data separately for web hosting. This is **not** a copy of the earlier site's unavailable private Git source checkout, and it does not claim that Edition 9 is already deployed to the historical ChatGPT Sites URL.

## Layout

- `index.html` — deployable application entrypoint and page markup
- `assets/css/` — base, graph, default light/dark theme and charts
- `assets/js/` — theme switching, directed graph renderer, insight visualizations, application and evidence drawers
- `data/atlas.json` — the complete Edition 9 dataset; `schema.json` is the collection schema
- `offline/atlas_explorer.html` — the original **single-file, offline-capable** Edition 9 explorer, including embedded dataset
- `research/` — archival reports, research source registry, provenance, and weighted graph exports
- `scripts/validate.py` — static source and data integrity checks

## Run locally

Use any static HTTP server (direct `file://` navigation does not work for the modular edition because of browser restrictions on `fetch`):

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. The `offline/atlas_explorer.html` version can instead be opened directly from disk.

## Deploy to the existing site

The existing site is `https://manticore-jorjani-atlas.manticube-ga-7573.chatgpt.site` (owner-only access at its previous published revision). This source package is **deployment-ready**, but publishing to that same URL requires the ChatGPT Sites source-repository/deploy integration or repository credentials from the owner's current authenticated Sites session.

When that integration is accessible, upload the **contents of this repository root** (or put them in the site's configured deployment root), deploy as a static website and verify the site displays `Edition 9` and 2,229 entities / 2,271 claims. Do not switch an owner-only site to a public access mode.

For generic static hosts such as Cloudflare Pages, Netlify or Render Static Sites, use this repository root as the publish directory; no build command or Node dependencies are needed. It is currently designed to load all data in one JSON request, so enable Brotli/gzip and long-lived caching if the host provides them. Do not publish the research dataset publicly without explicitly choosing that access policy.

## Evidence policy

All interview statements remain attributed. The documentary research adds evidence about source identity and historical records, **not** proof of extraordinary allegations. See `research/EDITION9_HISTORICAL_BOUNDARY.md` and the data's evidence/status fields. The 90 phonetic/name targets remain audio-unverified.

## Rights

This is user-controlled project source and research data. No open-source license is granted in this archive. Linked archival material, transcript snippets and original platform components remain subject to their respective rights.
