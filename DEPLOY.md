# Deployment checklist

1. Confirm you are deploying into the **same private site project**, rather than creating a public copy. Avoid revealing private source trails by default.
2. Preserve existing ChatGPT Sites access controls. This package does not modify access permissions.
3. Deploy the repository root as a static site. A build tool is not required. **Do not** deploy the ZIP itself as a single asset.
4. Confirm `/` serves `index.html`, `/assets/js/app.js` is HTTP 200, and `/data/atlas.json` is HTTP 200 with JSON MIME type.
5. Visit the site's homepage and confirm `Edition 9` plus the evidence graph. Test Overview, Knowledge graph, Claim register, Timeline, Source documents and Historical evidence.
6. Check that graph edge counts and document citations open correctly; test both light and dark modes.
7. Validate against `python3 scripts/validate.py` before deploying and retain the old deployment as a rollback option.

Note: the ChatGPT Sites publisher was not available through the tools in the session that created this source archive, so **this archive by itself does not update the prior live website**.
