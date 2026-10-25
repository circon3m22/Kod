#!/usr/bin/env python3
"""Check complete migration against the extracted source. Python standard library only."""
from pathlib import Path
import json,re,hashlib
r=Path(__file__).resolve().parents[1]
d=json.loads((r/'quiz-data.js').read_text().split('window.QUIZ_DATA = ',1)[1].rstrip(';\n'))
s=json.loads((r/'source/slides-extracted.json').read_text())
assert len(s)==52 and len(d['questions'])==25
assert len(d['warmup'])==12 and sum(q['enabled'] for q in d['questions'])==20
assert len({q['id'] for q in d['questions']})==25
clean=lambda t:t.replace('\x0b','\n').strip()
content=lambda slide:[clean(t) for t in slide['texts'] if t.strip() and not t.startswith(('Узнать ответ','Вернуться к выбору'))]
for q in d['questions']:
 ci=d['categories'].index(q['category']);vi=d['values'].index(q['value'])+1
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
for path in re.findall(r"url\(['\"]?([^)'\"]+)",(r/'styles.css').read_text()):assert (r/path).is_file(),path
assert len(list((r/'assets/images').glob('*')))==38
(r/'tests/asset-checksums.json').write_text(json.dumps(manifest,indent=2))
print('PASS: 52 slides, 25 linked cells, 20 active questions, 12 warmup questions, 38 images, all local dependencies.')
