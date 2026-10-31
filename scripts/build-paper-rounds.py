#!/usr/bin/env python3
"""Build offline quiz data from reviewed content and local image provenance."""
import copy,json,hashlib,html
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text())
def write(p,d):(R/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
d=read('source/pre-paper-quiz-data.json');draft=read('source/paper-round-content.json');oldpics=read('source/paper-existing-images.json')
answers=read('source/pre-paper-answer-image-sources.json');chrono=read('source/chronology-card-sources.json');pool={}
def collect(x):
 if isinstance(x,list):
  for v in x:collect(v)
 elif isinstance(x,dict):
  p=x.get('path') or x.get('file')
  if p and isinstance(p,str) and p.startswith('assets/') and x.get('sourceUrl'):pool[p]=x
  for v in x.values():
   if isinstance(v,(list,dict)):collect(v)
for p in (R/'source').glob('*sources.json'):collect(json.loads(p.read_text()))
collect(read('source/paper-image-sources.json'))
def meta(path):
 x=copy.deepcopy(pool[path]);x['path']=path;x['alt']=x.get('alt') or x.get('caption') or 'Историческая иллюстрация';x['caption']=x.get('caption') or x['alt'];x['sha256']=hashlib.sha256((R/path).read_bytes()).hexdigest();return x
def local(id):return 'assets/paper-rounds/'+id+'.jpg'
def detail(path,neutral=False):
 x=meta(path);return {'src':path,'alt':'Иллюстрация к вопросу' if neutral else x['alt'],'caption':'' if neutral else x['caption']}
def setimages(q,question,answer=None):
 answer=answer or question;q['paperImages']=question;q['paperImageDetails']=[detail(p,True) for p in question];q['answerImages']=answer;q['answerImageDetails']=[detail(p) for p in answer];answers[q['id']]={'images':[meta(p) for p in answer]}
byid={q['id']:q for q in d['questions']}
for q in byid.values():
 q['legacyValue']=q['value'];q['paperImages']=[x['src'] for x in oldpics[q['id']]['images']];q['paperImageDetails']=oldpics[q['id']]['images']
newpaths={
'p-c1-beresta':['birch-bark-onfim'],'p-c1-beard-token':['beard-token'],'p-c1-yermak':['yermak'],'p-c1-year-7208':['assets/images/image17.jpeg'],'p-c1-vasyutinsky':['assets/answer-history/chervonets.jpg'],
'p-c2-petropavlovsk':['petropavlovsk'],'p-c2-sakhalin-census':['sakhalin-velikan'],'p-c2-la-perouse':['sakhalin-velikan'],'p-c2-pallada':['pallada'],'p-c2-manjur':['manjur'],
'p-c3-komsomolsk':['komsomolsk'],'p-c3-kurosawa':['kurosawa'],'p-c3-petroglyphs':['sikachi-alyan'],'p-c3-small-railway':['children-railway'],'p-c3-stone-turtle':['stone-tortoise'],
'p-c4-mendeleev':['mendeleev'],'p-c4-tsiolkovsky':['tsiolkovsky'],'p-c4-pirogov':['pirogov'],'p-c4-shukhov':['shukhov'],'p-c4-lodygin':['lodygin'],
'p-c5-olympics':['assets/cover-eras/olympics-1980.jpg'],'p-c5-soyuz-apollo':['assets/cover-eras/soyuz-1975.jpg'],'p-c5-duma':['duma-opening'],'p-c5-prokudin':['assets/cover-eras/tolstoy.jpg'],'p-c5-exter':['aelita-costume']}
eventimages={'metro-moscow':'metro-moscow','rail-tsarskoe':'rail-tsarskoe','rail-capitals':'rail-capitals','russian-museum':'russian-museum','hermitage':'hermitage','tretyakov':'tretyakov','war-peace':'assets/cover-eras/tolstoy.jpg','hero':'lermontov','souls':'gogol','obninsk':'obninsk','popov':'popov','northpole':'northpole','portsmouth':'portsmouth','bloody-sunday':'bloody-sunday','potemkin-uprising':'potemkin-uprising'}
resolve=lambda p:p if p.startswith('assets/') else local(p)
for raw in draft['main']:
 q=copy.deepcopy(raw);q.update(category=d['categories'][q.pop('categoryIndex')-1],enabled=True,status='complete',sourceSlide=None,answerSlide=None,video=None,images=[],source='source/paper-round-content.json',sourceRefs=[raw['id']],revision={'date':'2026-10-26','note':'Новый вопрос для бланков; факты и критерии зачёта сохранены в источнике.'});q.pop('suggestedValue',None);q.pop('sources',None)
 if q['type']=='chronology':
  es=[];source={}
  for i,e in enumerate(raw['events']):
   p=resolve(eventimages[e['id']]);label='АБВГ'[i];ev={'label':label,'text':e['text'],'date':e['date'],'sourceRef':q['id']+':'+e['id'],'image':p};es.append(ev);source[label]={**meta(p),'eventDate':ev['date'],'eventText':ev['text'],'evidenceUrl':e['sourceUrl']}
  q['events']=es;q['correctOrder']=[e['label'] for e in sorted(es,key=lambda e:e['date'])];q['text']=raw['text']+' Назовите порядок букв.\n\n'+'\n\n'.join(e['label']+') '+e['text'] for e in es)
  sameyear=len({e['date'][:4] for e in es})==1
  def showdate(s):
   if not sameyear:return s[:4]
   y,m,day=s.split('-');return f'{int(day):02}.{m}.{y}'
  q['answer']=' → '.join(q['correctOrder'])+'\n\n'+'\n'.join(e['label']+') '+e['text']+' — '+showdate(e['date'])+'.' for e in sorted(es,key=lambda e:e['date']));q['images']=[e['image'] for e in es];setimages(q,q['images'],[e['image'] for e in sorted(es,key=lambda e:e['date'])]);chrono[q['id']]=source
 else:
  q['images']=[resolve(p) for p in newpaths[q['id']]];setimages(q,q['images'])
 byid[q['id']]=q
orders=[
['p-c1-beresta','c1-400','c1-600','p-c1-beard-token','c1-200','p-c1-yermak','c1-800','p-c1-year-7208','c1-1000','p-c1-vasyutinsky'],
['c2-200','p-c2-petropavlovsk','c2-1000','p-c2-sakhalin-census','c2-400','p-c2-la-perouse','c2-600','p-c2-pallada','c2-800','p-c2-manjur'],
['c3-200','p-c3-komsomolsk','c3-400','p-c3-kurosawa','c3-600','p-c3-petroglyphs','c3-800','p-c3-small-railway','c3-1000','p-c3-stone-turtle'],
['c4-200','p-c4-mendeleev','c4-400','p-c4-tsiolkovsky','c4-1000','c4-600','p-c4-pirogov','p-c4-shukhov','c4-800','p-c4-lodygin'],
['c5-photo-400','p-c5-olympics','c5-photo-200','p-c5-soyuz-apollo','c5-photo-600','p-c5-duma','c5-photo-800','p-c5-prokudin','c5-photo-1000','p-c5-exter'],
['p-c6-transport','c6-order-200','p-c6-museums','c6-order-400','p-c6-literature','c6-order-600','p-c6-science','c6-order-800','p-c6-year1905','c6-order-1000']]
d['questions']=[]
for ids in orders:
 for i,qid in enumerate(ids):q=byid[qid];q['value']=(i+1)*100;d['questions'].append(q)
warmimages={
'pw1':(['kopecks'],['kopecks']),
'pw2':(['assets/paper-rounds/ship-engraving.webp'],['oryol']),
'pw3':(['assets/images/image21.jpeg'],['assets/images/image21.jpeg']),
'pw4':(['lazarev'],['lazarev']),
'pw5':(['venus-transit'],['venus-transit']),
'pw6':(['borodin'],['borodin']),
'pw7':(['pushkin'],['pushkin']),
'pw8':(['platinum'],['platinum']),
'pw9':(['assets/cover-history/haying.jpg'],['peter-iii']),
'pw10':(['shostakovich'],['shostakovich']),
'pw11':(['assets/paper-rounds/soviet-computer.webp'],['assets/paper-rounds/tetris-gameboy.webp']),
'pw12':(['sputnik2'],['laika']),
'pw13':(['kotelnikov'],['kotelnikov']),
'pw14':(['assets/paper-rounds/film-projector.webp'],['road-to-life']),
'pw15':(['millennium'],['millennium'])}
warmbyid={}
for raw in draft['warmup']:
 q=copy.deepcopy(raw);q.update(value=100,source='source/paper-round-content.json',sourceRefs=[q['id']],images=[],enabled=True,status='complete',video=None);q.pop('sources',None)
 question,answer=warmimages[q['id']];q['images']=[resolve(p) for p in question];setimages(q,q['images'],[resolve(p) for p in answer]);warmbyid[q['id']]=q
warmorder=['pw1','pw12','pw2','pw9','pw15','pw11','pw3','pw5','pw7','pw10','pw4','pw6','pw13','pw8','pw14']
d['warmup']=[warmbyid[id] for id in warmorder];d['legacyWarmupIds']=[q['id'] for q in read('source/pre-paper-quiz-data.json')['warmup']]
covers=['assets/cover-eras/bogatyrs.jpg',local('sakhalin-velikan'),local('amur-cliff'),local('mendeleev'),'assets/cover-eras/olympics-1980.jpg',local('rail-tsarskoe')]
d['rounds']=[{'id':'warmup','kind':'warmup','title':'Разминка','questionIds':warmorder,'image':local('pushkin')}]+[{'id':'b'+str(i+1),'kind':'main','number':i+1,'title':d['categories'][i],'questionIds':ids,'image':covers[i]} for i,ids in enumerate(orders)]
d['values']=list(range(100,1001,100));d['version']=8;d['contentRevision']={'date':'2026-10-26','mode':'paper','note':'15 новых вопросов разминки; 60 основных вопросов; разминка по клику без таймера; основные вопросы и ответы отдельными проходами.'};d['rules']='Без телефонов. Не подсматриваем ответы у других команд. Разминка: 15 вопросов без начисления баллов и без таймера; клик показывает ответ, следующий клик открывает новый вопрос. Основная часть: 6 блоков по 10 вопросов, от 100 до 1000 баллов. На каждый ответ — 40 секунд. Первый клик запускает таймер, клик во время отсчёта сразу переключает вопрос. По нулю следующий вопрос открывается автоматически. После вопросов основного блока — 30 секунд на сдачу бланков, затем все ответы по порядку. После основных блоков — конкурс капитанов. Затем ведущий вводит баллы основной части и выбирает команду, получающую дополнительные 1000 баллов. Результаты показываются только в конце.'
# URLs are evidence, never runtime dependencies; runtime refers to source record IDs.
def stripurls(x):
 if isinstance(x,dict):return {k:stripurls(v) for k,v in x.items() if not (isinstance(v,str) and v.startswith(('http://','https://')))}
 if isinstance(x,list):return [stripurls(v) for v in x]
 return x
d=stripurls(d);(R/'quiz-data.js').write_text('window.QUIZ_DATA = '+json.dumps(d,ensure_ascii=False,indent=2)+';\n')
answers={q['id']:answers[q['id']] for q in d['questions']+d['warmup']};write('source/answer-image-sources.json',answers);write('source/chronology-card-sources.json',chrono)
print('Built',len(d['questions']),'main,',len(d['warmup']),'warmup,',len(d['rounds']),'rounds.')
