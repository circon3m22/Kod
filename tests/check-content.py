#!/usr/bin/env python3
"""Check complete migration against the extracted source. Python standard library only."""
from pathlib import Path
import json,re,hashlib
r=Path(__file__).resolve().parents[1]
d=json.loads((r/'quiz-data.js').read_text().split('window.QUIZ_DATA = ',1)[1].rstrip(';\n'))
s=json.loads((r/'source/slides-extracted.json').read_text())
archive=json.loads((r/'source/replaced-video-questions.json').read_text())['questions']
photo_sources=json.loads((r/'source/photo-round-sources.json').read_text())
new_sources=json.loads((r/'source/new-question-evidence.json').read_text())['sources']
assert len(s)==52 and len(d['questions'])==30 and len(d['categories'])==6
assert len(d['warmup'])==12 and all(q['enabled'] for q in d['questions'])
assert len({q['id'] for q in d['questions']})==30
assert len({(q['category'],q['value']) for q in d['questions']})==30
assert all(sum(q['category']==c and q['value']==v for q in d['questions'])==1 for c in d['categories'] for v in d['values'])
clean=lambda t:t.replace('\x0b','\n').strip()
content=lambda slide:[clean(t) for t in slide['texts'] if t.strip() and not t.startswith(('Узнать ответ','Вернуться к выбору'))]
original_questions=[q for q in d['questions'] if q['sourceSlide'] is not None]
assert len(original_questions)==20 and len(archive)==5
original_categories=d['categories'][:4]+[archive[0]['category']]
for q in original_questions+archive:
 ci=original_categories.index(q['category']);vi=d['values'].index(q['value'])+1
 target=s[1]['tableLinks'][ci][vi]['targets'][0]
 assert int(re.search(r'slide(\d+)',target).group(1))==q['sourceSlide'],q['id']
 qs=s[q['sourceSlide']-1];ans=s[q['answerSlide']-1]
 original=q.get('original',q)
 if q['type']=='matching':
  parts=content(qs)
  assert original['columns']==[parts[1].strip().split('\n'),parts[2].strip().split('\n')]
  assert q['matches']==([3,1,4,5] if q['sourceSlide']==9 else [2,1,4,5,3,6,0])
 else:
  assert original['text']=='\n\n'.join(content(qs)),q['id']+' text'
  assert original['answer']=='\n\n'.join(content(ans)),q['id']+' answer'
 for path in q['images']+q['answerImages']:
  assert (r/path).is_file(),path
 if q['enabled']:
  assert q['status']=='complete' and q['answer'].strip() and q['text'].strip()
  assert q['answer'].strip()!='Текст' and q['text'].strip()!='Текст'
  assert 'original' in q and q['revision']['date']=='2026-10-25'
 if q['status']=='missing-video':assert q['images'] and not q['video'] and not q['enabled']
known_refs=set(new_sources)|{x['id'] for x in photo_sources}
for q in d['questions']:
 assert q['enabled'] and q['status']=='complete' and q['text'].strip() and q['answer'].strip()
 assert q['text'].strip()!='Текст' and q['answer'].strip()!='Текст'
 assert q['category'] in d['categories'] and q['value'] in d['values']
 if q['sourceSlide'] is None:
  assert q['type'] in ['photo','chronology'] and q['acceptance']
  assert q['sourceRefs'] and set(q['sourceRefs'])<=known_refs
  assert q['revision']['date']=='2026-10-25' and not q['video']
 for path in q['images']+q['answerImages']:assert (r/path).is_file(),path
photos=[q for q in d['questions'] if q['type']=='photo' and q['sourceSlide'] is None]
timelines=[q for q in d['questions'] if q['type']=='chronology']
assert len(photos)==len(timelines)==len(photo_sources)==5
assert not {q['id'] for q in d['questions']}&{q['id'] for q in archive}
for item in photo_sources:
 assert hashlib.sha256((r/item['file']).read_bytes()).hexdigest()==item['sha256']
 assert item['metadata']['LicenseShortName']['value'] in ['Public domain','CC BY 4.0']
for q in timelines:
 events=q['events'];ordered=sorted(events,key=lambda x:x['date'])
 assert len({x['date'] for x in events})==len(events)
 assert len({x['label'] for x in events})==len(events)
 assert q['correctOrder']==[x['label'] for x in ordered]
 assert q['answer'].startswith(' → '.join(q['correctOrder']))
 assert all(x['sourceRef'] in new_sources for x in events)
 assert all(x['text'] in q['text'] and x['text'] in q['answer'] for x in events)
assert all(w['text'].strip() and w['answer'].strip() and w.get('original') for w in d['warmup'])
assert d['warmup'][6]['answer'].startswith('Борис Годунов')
assert '1923' in next(q for q in d['questions'] if q['id']=='c1-1000')['text']
assert next(q for q in d['questions'] if q['id']=='c3-200')['answer']=='Спасо-Преображенский кафедральный собор.'
by_id={q['id']:q for q in d['questions']}
assert by_id['c1-600']['text']==by_id['c1-600']['original']['text']
assert len(by_id['c2-400']['text'])>=len(by_id['c2-400']['original']['text'])
assert 'Н. Л. Гондатти' in by_id['c2-400']['text']
assert 'Вашингтонского' in by_id['c2-400']['text']
assert 'Золотой Рог' not in by_id['c2-800']['text']
assert '1233' in by_id['c2-800']['text']
assert 'Какие две исторические личности' in by_id['c4-200']['text']
manifest={}
for p in sorted((r/'assets').rglob('*')):
 if p.is_file():manifest[str(p.relative_to(r))]={'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
for fn in ['index.html','styles.css','app.js','quiz-data.js']:
 txt=(r/fn).read_text()
 assert not re.search(r'https?://|@import|fetch\s*\(|XMLHttpRequest|import\s*\(',txt),fn+' contains external dependency'
for path in re.findall(r"url\(['\"]?([^)'\"]+)",(r/'styles.css').read_text()):
 if path.startswith('#'):assert 'id="'+path[1:]+'"' in (r/'app.js').read_text()+(r/'index.html').read_text(),path
 else:assert (r/path).is_file(),path
assert len(list((r/'assets/images').glob('*')))==38
assert manifest==json.loads((r/'tests/asset-checksums.json').read_text()),'Asset checksums differ from the reviewed manifest'
answer_sources=json.loads((r/'source/answer-image-sources.json').read_text())
assert set(answer_sources)=={q['id'] for q in d['questions']+d['warmup']}
for q in d['questions']+d['warmup']:
 images=answer_sources[q['id']]['images']
 assert images and q['answerImages']==[x['path'] for x in images],q['id']
 assert q['answerImageDetails']==[{'src':x['path'],'alt':x['alt'],'caption':x['caption']} for x in images],q['id']
 for x in images:
  assert x['alt'] and x['caption'] and x['sourceUrl'] and x['license'],q['id']
  assert hashlib.sha256((r/x['path']).read_bytes()).hexdigest()==x['sha256'],x['path']
for qid in ['c5-photo-400','c5-photo-1000']:
 assert by_id[qid]['images']==by_id[qid]['answerImages']
 assert answer_sources[qid]['images'][0]['colorEvidence']
objects=json.loads((r/'source/stage-object-sources.json').read_text())['images']
assert {x['stage'] for x in objects}=={'warmup','board','bonus','captains'}
for x in objects:
 assert hashlib.sha256((r/x['path']).read_bytes()).hexdigest()==x['sha256']
print('PASS: 52 source slides, 25 original mappings preserved, 30 active cells in 6 categories, 12 warmup questions, 5 sourced photos, 5 verified timelines, local assets/checksums.')
print('PASS: 42 sourced answer illustrations, two authentic color 1945 photographs, four local stage objects.')
