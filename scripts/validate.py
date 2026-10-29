#!/usr/bin/env python3
"""Validate the public Edition 9 atlas: links, counts, schema keys, and release files."""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []


def check(condition, message):
    if not condition:
        errors.append(message)


data = json.loads((ROOT / 'data' / 'atlas.json').read_text())
schema = json.loads((ROOT / 'data' / 'schema.json').read_text())
entities = data['entities']
claims = data['claims']
documents = data['documents']
research_sources = data['research_sources']

check(len(entities) == 2229, f'entities {len(entities)}')
check(len(claims) == 2271, f'claims {len(claims)}')
check(len(documents) == 259, f'documents {len(documents)}')
check(len(research_sources) == 121, f'research sources {len(research_sources)}')
check(data['meta'].get('edition', '').startswith('Edition 9'), 'edition label')
check(data['meta'].get('transcript_redistribution') is False, 'transcript redistribution flag')
check(isinstance(data['meta'].get('known_gaps'), list) and len(data['meta']['known_gaps']) >= 9, 'known gaps')
check(data['meta'].get('public_release', {}).get('audio_targets_listened') == 0, 'audio listened count')

for key in ('primary_segments', 'audit', 'research_trails'):
    check(key in data, f'dataset missing {key}')
    check(key in schema['properties'], f'schema missing {key}')

entity_ids = {row['id'] for row in entities}
claim_ids = {row['id'] for row in claims}
document_ids = {row['id'] for row in documents}
source_ids = {row['id'] for row in data['sources']} | {row['id'] for row in research_sources}
segment_ids = {row['id'] for row in data['segments']} | {row['id'] for row in data['primary_segments']}
check(len(entity_ids) == len(entities), 'duplicate entity ids')
check(len(claim_ids) == len(claims), 'duplicate claim ids')
check(len(document_ids) == len(documents), 'duplicate document ids')

for claim in claims:
    check(claim.get('source_id') in source_ids, f"claim {claim['id']} source")
    for eid in claim.get('entity_ids') or []:
        check(eid in entity_ids, f"claim {claim['id']} entity {eid}")
    for did in claim.get('document_ids') or []:
        check(did in document_ids, f"claim {claim['id']} document {did}")
    for sid in (claim.get('segment_ids') or []) + (claim.get('primary_segment_ids') or []):
        check(sid in segment_ids, f"claim {claim['id']} segment {sid}")
    for relation in claim.get('relations') or []:
        for endpoint in ('subject_id', 'object_id'):
            if relation.get(endpoint):
                check(relation[endpoint] in entity_ids, f"claim {claim['id']} relation {endpoint}")

missing_descriptions = [row['id'] for row in entities if not str(row.get('description') or '').strip()]
check(not missing_descriptions, f'entities without descriptions: {missing_descriptions[:8]}')

by_id = {row['id']: row for row in entities}
admonitio = by_id['ent-e8-admonitio-generalis']
horten = by_id['ent-e9-dec1947-army-files']
check(admonitio['claim_ids'] == ['e8-hist-0003'], 'Admonitio claim link')
check('e8-charlemagne-mgh' in admonitio['research_source_ids'], 'Admonitio source link')
check(horten['claim_ids'] == ['e9-hist-0001', 'e9-hist-0002', 'e9-hist-0003'], 'Horten file claim links')
check({'e9-horten-1947', 'e9-horten-mccoy'} <= set(horten['research_source_ids']), 'Horten file source links')

audit = data['audit']
check(audit.get('edition') == 9, 'audit edition')
check(audit.get('edition6', {}).get('entities') == 2208, 'edition 6 entity snapshot')
check(audit.get('edition6', {}).get('claims') == 2251, 'edition 6 claim snapshot')
check(audit.get('edition7') == audit.get('edition6'), 'edition 7 preserved edition 6 counts')
check(audit.get('edition8', {}).get('entities') == 2215, 'edition 8 entities')
check(audit.get('edition8', {}).get('claims') == 2257, 'edition 8 claims')
check(audit.get('edition9', {}).get('entities') == 2229, 'edition 9 entities')
check(audit.get('edition9', {}).get('claims') == 2271, 'edition 9 claims')
check(audit.get('after') == audit.get('edition9'), 'after matches edition 9')
check(data['historical_boundary_e9'].get('audio_targets_listened') == 0, 'boundary audio listened')
retrans = data['final_verification'].get('audio_retranscription') or {}
check(retrans.get('windows') == 90, 'retranscription windows')
check(retrans.get('human_listened') == 0, 'retranscription is not human listening')
check(retrans.get('indexed_spelling_heard') == 36, 'spelling matches')
check(retrans.get('phonetic_variant_heard') == 42, 'phonetic variants')
check(retrans.get('indexed_name_not_secured') == 12, 'unsecured names')
check(all(row.get('audio_retranscription') for row in data['final_verification']['audio_targets']), 'missing transcripts')
check('cadc136820a123ae705a8170b244fbc43c995d7fccf839322db0c7e3c53aa099' in json.dumps(data['historical_boundary_e9']), 'Puharich scan hash')
check((ROOT / 'research' / 'part3_name_retranscription.json').exists(), 'retranscription export')

html = (ROOT / 'index.html').read_text()
app = (ROOT / 'assets' / 'js' / 'app.js').read_text()
check('Private research workspace' not in html, 'public badge')
check("fetch('./data/atlas.json'" in app, 'dataset fetch')
check('knownGapsPanel' in app, 'known gaps panel')
for name in ('LICENSE', 'CITATION.cff', 'README.md', 'DEPLOY.md', '.nojekyll'):
    check((ROOT / name).exists(), f'missing {name}')

offline = (ROOT / 'offline' / 'atlas_explorer.html').read_text()
marker = '<script id="offline-atlas-data" type="application/json">'
start = offline.find(marker)
end = offline.find('</script>', start)
embedded = json.loads(offline[start + len(marker):end])
check(embedded['meta'].get('public_release') == data['meta'].get('public_release'), 'offline dataset matches public release block')
check(len(embedded['entities']) == len(entities) and len(embedded['claims']) == len(claims), 'offline counts')
check('Private research workspace' not in offline, 'offline public badge')

if errors:
    print(json.dumps({'result': 'failed', 'errors': errors}, indent=2))
    sys.exit(1)

print(json.dumps({
    'result': 'passed',
    'edition': data['meta']['edition'],
    'entities': len(entities),
    'claims': len(claims),
    'documents': len(documents),
    'research_sources': len(research_sources),
    'known_gaps': len(data['meta']['known_gaps']),
    'entity_summaries': len(entities),
}, indent=2))
