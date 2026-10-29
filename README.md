# Manticore / Jorjani Atlas

A public research atlas of three American Alchemy conversations with Jason Reza Jorjani, and of the documents those conversations cite or imply. The atlas keeps interview statements and later documentary checks in separate evidence layers. A record being included means it was indexed, not that it is true.

**Edition 9** · 2,229 entities · 2,271 attributed claims · 259 document records · 121 research sources

The interface is a static site: search, a directed knowledge graph, a claim register, a timeline, source documents, and the review ledgers from Editions 3–9. `data/atlas.json` is the dataset. `offline/atlas_explorer.html` is the same edition in one file and can be opened from disk.

## How to read a record

- **Conversation** claims are attributed to a speaker, a video, and a timestamp. They include assertions, hypotheses, reported testimony, questions, and advertisements.
- **Documentary research** claims cite a book, archive, paper, or catalog record. They say what that source contains. They do not promote an interview allegation into a finding.
- Edge numbers count distinct supporting claims. They are not probabilities and they are not independent corroboration.
- Full transcripts stay with their publishers. This repository stores locators, paraphrases, and short attributed statements (`meta.transcript_redistribution` is false).

## Run locally

The modular site loads `data/atlas.json` with `fetch`, so open it through a local server:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`.

Check the dataset before you publish a change:

```sh
python3 scripts/validate.py
```

## Publish

This repository is the public source. Host the repository root as a static site. There is no build step and no Node dependency.

- **GitHub Pages:** in the repository settings, deploy from the branch root. `index.html` is the entrypoint. `.nojekyll` is included so Pages serves the directory as-is.
- **Any other static host** (Cloudflare Pages, Netlify, Render): publish this directory with no build command. Enable gzip or Brotli for `data/atlas.json`.

Confirm the homepage shows Edition 9, the evidence graph, and the public-research notice. Open Coverage and read **What this atlas still does not establish.**

An earlier owner-only ChatGPT Sites deployment is not this repository and is not updated by publishing here.

## What this public edition adds

The Edition 9 historical-boundary review is preserved. The publication pass fills gaps that were already inside the collection:

- Every entity now has a summary. Where the card was blank, the summary quotes one attributed claim and labels its assertion type. It is not an independent biography.
- Two documentary entities that had no links — *Admonitio generalis* (789) and the December 1947 Horten intelligence memoranda — now point at the claims, sources, and document cards that already described them.
- The growth table includes Editions 7, 8, and 9. Edition 7 kept the Edition 6 counts and recorded source verdicts. Editions 8 and 9 added the historical-boundary claims.
- `data/schema.json` now names `primary_segments`, `audit`, and `research_trails`, which the dataset already contained.
- Coverage lists the limits that are still open.

## Known limits

These are recorded in `meta.known_gaps` and on the Coverage page. They were not closed by guessing.

| Limit | What would close it |
| --- | --- |
| 90 Part 3 name windows | An independent machine transcript is recorded. 36 match the indexed spelling, 42 are phonetic variants, and 12 still do not secure the indexed name. Human listening is still zero |
| Five historical closure conditions | A Bahnson intelligence file, a medieval aerial-reporting edict, the speaker’s exact 1947 printout, Vatican or Magenta custody, and a Stephenson–Josephine Brown telegram. The Puharich scan was retrieved and described. The March 1997 Klass comparison of the Schulgen memo was read |
| 221 claims with no typed relationship | Add an edge only when the wording names both endpoints |
| Six document cards with no exact public URL | An item-level catalog record for the specific work, not a category page |

The existence of an archival file does not authenticate the extraordinary claim that cites it.

## Layout

- `index.html` — site entrypoint
- `assets/css/`, `assets/js/` — theme, graph, charts, and the application
- `data/atlas.json` — dataset; `data/schema.json` — collection schema
- `offline/atlas_explorer.html` — single-file explorer, including the dataset
- `research/` — edition reports, source registry, and graph exports
- `scripts/validate.py` — referential integrity and publication checks
- `SHA256SUMS.txt` — checksums for this tree

## License

Original application code is [MIT](LICENSE). The original research compilation is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Recordings, captions, and third-party documents are not relicensed. See `LICENSE`.

`package.json` is marked `private` so this project is not published to npm. That flag does not hide the GitHub repository.

## Citation

See `CITATION.cff`. The citation URL is `https://github.com/Lucastil2212/jorjani-atlas`. A citation does not endorse the interview allegations.
