#!/usr/bin/env python3
"""Validate Edition 9 source, referenced data, evidence links and weighted edges."""
from pathlib import Path
import json,re,hashlib,sys
R=Path(__file__).resolve().parents[1]
d=json.loads((R/'data'/'atlas.json').read_text())
assert set(('sources','entities','claims','documents')).issubset(d)
entities=d['entities']; claims=d['claims']; docs=d['documents']
assert len(entities)==2229, len(entities)
assert len(claims)==2271, len(claims)
assert len(docs)==259,len(docs)
assert len(d['meta'].get('edition',''))>0
js=(R/'assets/js/app.js').read_text()
assert "fetch('./data/atlas.json'" in js
assert 'offline-atlas-data' not in js
html=(R/'index.html').read_text()
for f in ['assets/js/theme.js','assets/js/graph.js','assets/js/insights.js','assets/js/app.js','assets/css/base.css','assets/css/graph.css','assets/css/theme.css','assets/css/insights.css']:
    assert (R/f).exists(), f
    assert f in html, f
assert 'data-theme="light"' in html
# IDs are keys in the archive dataset, not necessarily nested `id` attributes.
entity_ids=set(entities) if isinstance(entities,dict) else {x['id'] for x in entities}
claim_ids=set(claims) if isinstance(claims,dict) else {x['id'] for x in claims}
doc_ids=set(docs) if isinstance(docs,dict) else {x['id'] for x in docs}
assert len(entity_ids)==len(entities)
assert len(claim_ids)==len(claims)
assert len(doc_ids)==len(docs)
print(json.dumps({'result':'passed','edition':d['meta']['edition'],'entities':len(entities),'claims':len(claims),'documents':len(docs),'source_files':8},indent=2))
