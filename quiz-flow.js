/* Sequential quiz model and presenter UI. Local scripts/assets; no network state. */
(function(global){
'use strict';
const clone=v=>JSON.parse(JSON.stringify(v)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
function sequence(data,legacy=false){
 const rows=[{id:'rules',kind:'rules'},{id:'naming',kind:'naming',seconds:60},{id:'names',kind:'names'}];
 const warm=data.rounds.find(r=>r.kind==='warmup');
 warm.questionIds.forEach((qid,i)=>{rows.push({id:`warm-${i}-q`,kind:'warmup',qid,index:i},{id:`warm-${i}-a`,kind:'warmup-answer',qid,index:i});});
 rows.push({id:'stages',kind:'stages'});
 data.rounds.filter(r=>r.kind==='main').forEach(round=>{
  rows.push({id:`block-${round.id}`,kind:'blocks',roundId:round.id});
  round.questionIds.forEach((qid,i)=>rows.push({id:`main-${round.id}-${i}`,kind:'question',qid,index:i,roundId:round.id,seconds:30}));
  rows.push({id:`collect-${round.id}`,kind:'collection',roundId:round.id,seconds:30},{id:`answers-${round.id}`,kind:'answers-title',roundId:round.id});
  round.questionIds.forEach((qid,i)=>rows.push({id:`review-${round.id}-${i}-q`,kind:'review',qid,index:i,roundId:round.id},{id:`review-${round.id}-${i}-a`,kind:'answer',qid,index:i,roundId:round.id}));
 });
 if(legacy)rows.push({id:'count',kind:'count'},{id:'main-results',kind:'main-results'},
  {id:'creative-intro',kind:'creative-intro'},{id:'creative-prepare',kind:'creative-timer',seconds:data.bonuses[0]?.prepareSeconds||300},
  {id:'creative-present',kind:'creative-presentation',seconds:data.bonuses[0]?.defendSeconds||180},{id:'creative-score',kind:'manual',stage:'creative'},
  {id:'captains-intro',kind:'captains-intro'},{id:'captains-play',kind:'captains-timer',seconds:60},{id:'captains-score',kind:'manual',stage:'captains'},{id:'awards',kind:'awards'});
 else rows.push({id:'count',kind:'count'},{id:'captains-intro',kind:'captains-intro'},
  {id:'captains-play',kind:'captains-timer',seconds:60},{id:'captains-score',kind:'manual',stage:'captains'},
  {id:'final-results',kind:'final-results'},{id:'awards',kind:'awards'});
 return rows;
}
function fresh(){return {version:2,cursor:0,frontier:0,awardIndex:-1,base:{},warmWins:{},marks:{},manual:{creative:{},captains:{}},undo:[],clock:null,drafts:[],teamCount:2,nameIndex:0};}
function points(flow,teamId,data){
 const warm=Object.values(flow.warmWins).filter(id=>id===teamId).length*100;
 const checked=new Set(own(flow.marks,teamId)?flow.marks[teamId]:[]);
 const main=data.questions.filter(q=>checked.has(q.id)).reduce((n,q)=>n+q.value,0);
 const creative=own(flow.manual.creative,teamId)?flow.manual.creative[teamId]:0,captains=own(flow.manual.captains,teamId)?flow.manual.captains[teamId]:0;
 return {warm,main,creative,captains,total:warm+main+creative+captains};
}
function awards(teams){
 const sorted=[...teams].sort((a,b)=>b.score-a.score||a.number-b.number);let last,place=0;
 return sorted.map((t,i)=>{if(t.score!==last)place=i+1;last=t.score;return {...t,place};}).reverse();
}
function apply(flow,op){
 if(op.kind==='warm')flow.warmWins={...flow.warmWins,[op.qid]:op.to||null};
 else if(op.kind==='mark'){const set=new Set(own(flow.marks,op.teamId)?flow.marks[op.teamId]:[]);if(op.to)set.add(op.qid);else set.delete(op.qid);flow.marks={...flow.marks,[op.teamId]:[...set]};}
 else if(op.kind==='manual')flow.manual[op.stage]={...flow.manual[op.stage],...op.to};
}
function inverse(op){return {...op,from:clone(op.to),to:clone(op.from)};}
function pause(flow,now=Date.now()){const t=flow?.clock;if(t?.running){t.remaining=Math.max(0,(t.deadline-now)/1000);t.running=false;t.deadline=0;}}
function validate(raw,teams,data){
 if(!raw||![1,2].includes(raw.version))return null;if(teams.length>9)throw Error('В этом сценарии может быть не больше 9 команд.');
 const f=fresh(),rows=sequence(data),ids=new Set(teams.map(t=>t.id)),qids=new Set(data.questions.map(q=>q.id)),warmIds=new Set(data.warmup.map(q=>q.id));
 const integer=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max,signed=n=>Number.isInteger(n)&&Math.abs(n)<=1000000;
 const oldRows=raw.version===1?sequence(data,true):rows;const mapIndex=n=>{const old=oldRows[integer(n,oldRows.length-1)?n:0],id=old?.id;const found=rows.findIndex(row=>row.id===id);return found>=0?found:rows.findIndex(row=>row.id==='captains-intro');};f.cursor=mapIndex(raw.cursor);f.frontier=Math.max(f.cursor,mapIndex(raw.frontier));f.awardIndex=Number.isInteger(raw.awardIndex)?Math.max(-1,Math.min(teams.length-1,raw.awardIndex)):-1;
 f.warmWins=Object.fromEntries([...warmIds].filter(q=>ids.has(raw.warmWins?.[q])).map(q=>[q,raw.warmWins[q]]));
 f.marks=Object.fromEntries(teams.map(t=>[t.id,[...new Set((Array.isArray(raw.marks?.[t.id])?raw.marks[t.id]:[]).filter(q=>qids.has(q)))]]));
 for(const stage of ['creative','captains'])f.manual[stage]=Object.fromEntries(teams.map(t=>[t.id,(stage==='captains'?signed(raw.manual?.[stage]?.[t.id]):integer(raw.manual?.[stage]?.[t.id],1000000))?raw.manual[stage][t.id]:0]));
 f.drafts=(Array.isArray(raw.drafts)?raw.drafts:[]).slice(0,9).filter(t=>t&&typeof t.id==='string'&&t.id.length<=100).map((t,i)=>({id:t.id,name:String(t.name||'').slice(0,120),number:integer(t.number,9)&&t.number>0?t.number:i+1}));
 f.teamCount=Math.max(f.drafts.length,teams.length,integer(raw.teamCount,9)&&raw.teamCount>0?raw.teamCount:2);f.nameIndex=integer(raw.nameIndex,f.teamCount-1)?raw.nameIndex:0;
 const patch=p=>p&&((p.kind==='warm'&&warmIds.has(p.qid)&&[p.from,p.to].every(id=>id===null||ids.has(id)))||(p.kind==='mark'&&ids.has(p.teamId)&&qids.has(p.qid)&&typeof p.from==='boolean'&&typeof p.to==='boolean')||(p.kind==='manual'&&['creative','captains'].includes(p.stage)&&[p.from,p.to].every(v=>v&&typeof v==='object'&&Object.keys(v).every(id=>ids.has(id)&&(p.stage==='captains'?signed(v[id]):integer(v[id],1000000))))));
 f.base=Object.fromEntries(teams.map(t=>{const value=raw.base?.[t.id];if(own(raw.base,t.id)&&(!Number.isSafeInteger(value)||Math.abs(value)>1e9))throw Error('Некорректный начальный счёт.');const base=Number.isSafeInteger(value)&&Math.abs(value)<=1e9?value:t.score-points(f,t.id,data).total;if(base+points(f,t.id,data).total!==t.score)throw Error('Баллы в сохранении не совпадают с бланками.');return [t.id,base];}));
 f.undo=(Array.isArray(raw.undo)?raw.undo:[]).slice(-1000).filter(h=>h&&typeof h.recordId==='string'&&patch(h.op)).map(h=>({recordId:h.recordId,op:clone(h.op)}));
 const step=rows[f.cursor],c=raw.clock;if(step.seconds&&c?.owner===step.id&&Number.isFinite(c.remaining)&&c.remaining>=0&&c.remaining<=step.seconds){f.clock={owner:step.id,remaining:c.remaining,started:!!c.started,running:!!c.running,deadline:Math.max(0,Math.min(Date.now()+step.seconds*1000,Number(c.deadline)||0))};pause(f);}
 return f;
}
function mount(env){
 const {data:D,esc,id,openModal,closeModal,screen,stage,overlay}=env,rows=sequence(D),rounds=D.rounds.filter(r=>r.kind==='main');let sheetTeam=null;
 const state=()=>env.state(),flow=()=>state().flow,step=()=>rows[flow()?.cursor||0],idx=id=>rows.findIndex(r=>r.id===id),findQ=s=>D.questions.find(q=>q.id===s.qid)||D.warmup.find(q=>q.id===s.qid),isWarm=s=>s.kind==='warmup'||s.kind==='warmup-answer';
 // Warm only the next visible question/answer while the presenter is reading.
 // Keep a small bounded set and discard pending work on rapid navigation.
 let preloadJob=null,preloaded=[];
 function preloadNext(){
  if(preloadJob!==null){if(window.cancelIdleCallback)cancelIdleCallback(preloadJob);else clearTimeout(preloadJob);preloadJob=null;}
  const cursor=flow()?.cursor,next=rows[cursor+1];if(!next?.qid||document.hidden||navigator.connection?.saveData)return;
  const q=findQ(next);if(!q)return;
  const answer=next.kind==='answer'||next.kind==='warmup-answer';
  const paths=q.type==='chronology'?(q.events||[]).map(e=>e.image):answer?(q.answerImages?.length?q.answerImages:q.images):(q.paperImages?.length?q.paperImages:q.images);
  const run=()=>{preloadJob=null;if(state().current.screen!=='flow'||flow()?.cursor!==cursor||document.hidden)return;preloaded=[...new Set((paths||[]).filter(Boolean))].slice(0,5).map(src=>{const img=new Image();img.decoding='async';img.src=src;img.decode?.().catch(()=>{});return img;});};
  preloadJob=window.requestIdleCallback?requestIdleCallback(run,{timeout:1200}):setTimeout(run,250);
 }
 const fmt=n=>Math.round(n).toLocaleString('ru-RU'),remain=()=>{const t=flow().clock;return t?.running?Math.max(0,(t.deadline-Date.now())/1000):t?.remaining||0;};
 function ensureClock(){const s=step();if(!s.seconds){flow().clock=null;return;}if(flow().clock?.owner!==s.id)flow().clock={owner:s.id,remaining:s.seconds,running:false,started:false,deadline:0};if(s.kind==='collection'&&!flow().clock.started)startClock();}
 function startClock(){const t=flow().clock;if(!t)return;if(t.remaining<=0)t.remaining=step().seconds;t.running=true;t.started=true;t.deadline=Date.now()+t.remaining*1000;env.save();tick();}
 function go(index){
  pause(flow());const old=step();
  if(old.kind==='warmup-answer'&&old.index===14&&index>flow().cursor){state().warmDone=D.warmup.map((_,i)=>i);state().completedStages=[...new Set([...state().completedStages,'warmup'])];}
  if(old.kind==='answer'&&old.index===9&&index>flow().cursor){state().roundProgress[old.roundId]={phase:'complete',index:9,completed:true};state().used=[...new Set([...state().used,...rounds.find(r=>r.id===old.roundId).questionIds])];if(old.roundId===rounds.at(-1).id)state().completedStages=[...new Set([...state().completedStages,'board'])];}
  if(old.kind==='manual'&&index>flow().cursor)state().completedStages=[...new Set([...state().completedStages,'captains'])];
  flow().cursor=Math.max(0,Math.min(rows.length-1,index));flow().frontier=Math.max(flow().frontier,flow().cursor);if(step().kind==='awards'&&old.kind!=='awards')flow().awardIndex=-1;if(step().kind==='rules')state().rulesSeen=false;ensureClock();env.go('flow');
 }
 function enter(){if(!flow()&&state().teams.length>9){env.render();env.legacyTeams();return;}if(!flow()){state().flow=fresh();flow().teamCount=Math.max(state().teams.length,Math.min(9,Math.max(1,state().setupTeamCount||2)));flow().base=Object.fromEntries(state().teams.map(t=>[t.id,t.score]));}for(const t of Object.values(state().timers)){if(t.running){t.remaining=env.remaining(t);t.running=false;}}ensureClock();env.go('flow');}
 function next(source='click'){
  const s=step();if(s.kind==='names'){submitNames(false);return;}if(s.kind==='manual'){submitManual();return;}
  if(s.kind==='awards'){flow().awardIndex=Math.min(state().teams.length-1,flow().awardIndex+1);env.save();env.render();return;}
  if(s.kind==='stages'){stageNext(flow().frontier>=idx('captains-intro')?'captains':'main');return;}
  if(s.seconds&&s.kind!=='collection'&&source!=='auto'){if(!flow().clock?.running){startClock();return;}}
  if(s.kind==='rules')state().rulesSeen=true;go(flow().cursor+1);
 }
 function back(){if(step().kind==='names'&&flow().nameIndex>0){flow().nameIndex--;env.save();env.render();return;}if(step().kind==='awards'&&flow().awardIndex>=0){flow().awardIndex--;env.save();env.render();return;}if(flow().cursor>0)go(flow().cursor-1);else env.go('home');}
 function clock(){if(flow().clock?.running){pause(flow());env.save();tick();}else startClock();}
 function tick(){
  if(state().current.screen!=='flow'||!flow()?.clock||flow().clock.owner!==step().id)return;
  const t=flow().clock,n=remain();if(t.running&&n<=0){t.running=false;t.remaining=0;t.deadline=0;env.save();next('auto');return;}
  screen.querySelectorAll('[data-flow-clock]').forEach(el=>{env.paintTimer(el,env.timeText(n),t.running);el.classList.toggle('timer-urgent',t.running&&n<=10);el.setAttribute('aria-label',t.running?(el.classList.contains('flow-clock-large')?'Продолжить':'Пауза таймера'):'Запустить таймер');});
 }
 function clockMarkup(large=false){return `<button class="flow-clock ${large?'flow-clock-large':''}" data-action="${large?'flow-next':'flow-clock'}" data-flow-clock aria-label="Запустить таймер">${env.timeText(remain())}</button>`;}
 function clickable(content,cls=''){return `<section class="view flow-page ${cls}" data-action="flow-next" role="button" tabindex="0" aria-label="Следующий экран">${content}</section>`;}
 function question(s){
  const q=findQ(s),answer=s.kind==='answer'||s.kind==='warmup-answer';if(!q)return '';
  const meta=s.kind==='question'?`<div class="flow-question-bar"><span>${s.index+1} / 10</span><span class="flow-cost" aria-label="${q.value} баллов">${q.value}</span>${clockMarkup()}</div>`:'';
  if(q.type==='chronology')return clickable(meta+`<div class="flow-chronology">${env.chronologyView(q,answer)}</div>`,'flow-question');
  const media=answer?(q.answerImages?.length?q.answerImages:q.images):(q.paperImages?.length?q.paperImages:q.images),details=answer?q.answerImageDetails:q.paperImageDetails||q.imageDetails;
  const pictures=(media||[]).map(src=>`<img src="${esc(src)}" alt="${esc(details?.find(d=>d.src===src)?.alt||'Историческая иллюстрация')}" draggable="false">`).join('');
  let text;if(q.type==='matching')text=(answer?`<p class="flow-question-lead">${esc(q.text)}</p>`:'')+env.matching(q,answer);else text=`${answer?`<p class="flow-question-lead">${esc(q.text)}</p>`:''}<h1 class="flow-question-text ${(answer?q.answer:q.text).length>330?'long':(answer?q.answer:q.text).length>150?'medium':''}">${esc(answer?q.answer:q.text)}</h1>`;
  return clickable(meta+`<div class="flow-question-layout ${q.text.length>550||q.columns?.[0]?.length>5?'dense':''}"><div class="flow-question-copy ${q.type==='matching'?'flow-matching':''}">${text}</div><div class="flow-question-image ${media?.length>1?'multiple':''}">${pictures}</div></div>`,'flow-question '+(isWarm(s)?'flow-warmup':''));
 }
 function draft(){while(flow().drafts.length<(flow().teamCount||2)){const i=flow().drafts.length;flow().drafts.push({id:state().teams[i]?.id||id(),name:state().teams[i]?.name||'',number:i+1});}return flow().drafts;}
 function collectDraft(){const form=document.querySelector('#flow-team-form');if(!form)return;flow().drafts=[...form.querySelectorAll('.flow-team-row')].map(el=>({id:el.dataset.id,number:Number(el.querySelector('select').value),name:el.querySelector('input').value.slice(0,120)}));env.save();}
 function namesForm(edit=false){if(!edit){const i=flow().nameIndex||0,t=draft()[i];return `<form id="flow-team-form" class="flow-name-single" data-edit="false"><strong>${i+1}</strong><input data-team-name-entry maxlength="120" aria-label="Название команды ${i+1}" value="${esc(t.name)}" required autofocus><p class="flow-form-error" role="alert"></p><button type="submit" aria-label="Далее">→</button></form>`;}return `<form id="flow-team-form" data-edit="${edit}"><h1>Команды</h1><div class="flow-team-rows">${draft().map(t=>`<div class="flow-team-row" data-id="${esc(t.id)}"><select aria-label="Номер команды" data-flow-draft>${Array.from({length:9},(_,i)=>`<option value="${i+1}" ${t.number===i+1?'selected':''}>${i+1}</option>`).join('')}</select><input data-flow-draft maxlength="120" placeholder="Название команды" aria-label="Название команды ${t.number}" value="${esc(t.name)}" required><button type="button" data-action="flow-remove-team" data-id="${esc(t.id)}" aria-label="Удалить команду" ${draft().length<=1?'disabled':''}>×</button></div>`).join('')}</div><p class="flow-form-error" role="alert"></p><div class="flow-form-actions"><button type="button" class="flow-add-team" data-action="flow-add-team" aria-label="Добавить команду" ${draft().length>=9?'disabled':''}>+</button><button type="submit" class="flow-submit">${edit?'Готово':'Начать разминку'}</button></div></form>`;}
 function submitNames(edit){
  if(!edit){const i=flow().nameIndex||0,input=document.querySelector('[data-team-name-entry]');if(!input)return;const name=input.value.trim();if(!name){document.querySelector('.flow-form-error').textContent='Введите название команды';return;}draft()[i].name=name;if(i<flow().teamCount-1){flow().nameIndex=i+1;env.save();env.render();return;}}
  else collectDraft();const drafts=flow().drafts,numbers=drafts.map(t=>t.number),error=!drafts.length?'Добавьте хотя бы одну команду.':drafts.length>9?'Максимум 9 команд.':drafts.some(t=>!t.name.trim())?'У каждой команды должно быть название.':new Set(numbers).size!==numbers.length?'Номера команд должны быть разными.':'';
  if(error){document.querySelector('.flow-form-error').textContent=error;return;}
  const existing=new Map(state().teams.map(t=>[t.id,t]));flow().base=Object.fromEntries(drafts.map(t=>[t.id,own(flow().base,t.id)?flow().base[t.id]:existing.get(t.id)?.score||0]));state().teams=drafts.map(t=>({id:t.id,name:t.name.trim(),number:t.number,score:existing.get(t.id)?.score||0})).sort((a,b)=>a.number-b.number);flow().teamCount=state().teams.length;env.save();if(edit){closeModal();env.render();}else go(flow().cursor+1);
 }
 function stageNext(which){
  const target=which==='main'?idx('block-b1'):idx('captains-intro'),front=flow().frontier;
  if(which==='captains'&&front<target)return;
  const next=which==='main'?idx('captains-intro'):rows.length;
  go(front>=target&&front<next?front:target);
 }
 function blocks(s){return clickable(`<h1 class="flow-section-title">Основной этап</h1><div class="flow-blocks">${rounds.map(r=>`<button style="--flow-i:${r.number-1}" class="flow-block ${r.id===s.roundId?'active':''}" data-action="flow-next" ${r.id===s.roundId?'':'disabled'}><span class="flow-block-number">${r.number}</span><h2>${esc(r.title)}</h2><img src="${esc(r.image)}" alt="" draggable="false"></button>`).join('')}</div>`,'flow-block-page');}
 function stages(){const active=flow().frontier>=idx('captains-intro')?'captains':'main';return clickable(`<h1 class="flow-section-title">Этапы игры</h1><div class="flow-stage-cards">${[['main','Основная часть','main-globe.png'],['captains','Конкурс капитанов','captains-compass.png']].map(([name,title,img],i)=>`<button style="--flow-i:${i}" class="flow-stage-card ${active===name?'active':''}" data-action="flow-stage" data-stage="${name}" ${active===name?'':'disabled'}><h2>${title}</h2><img src="assets/stage-objects/${img}" alt="" draggable="false"></button>`).join('')}</div>`,'flow-stage-page');}
 function manualForm(){return `<form id="flow-manual-form" class="view flow-manual"><h1>Итоговые баллы</h1><p class="flow-manual-note">Введите итоговый счёт каждой команды перед объявлением результатов.</p><div class="flow-manual-rows">${state().teams.map(t=>`<label><span class="flow-team-number">${t.number}</span><span>${esc(t.name)}</span><input type="number" min="0" max="1000000" step="1" required data-manual-team="${esc(t.id)}" value="${t.score}" aria-label="Итоговые баллы ${esc(t.name)}"></label>`).join('')}</div><p class="flow-form-error" role="alert"></p><button class="flow-submit" type="submit">Показать результаты</button></form>`;}
 function change(op,reason,undoing=false){
  const before=new Map(state().teams.map(t=>[t.id,points(flow(),t.id,D).total]));apply(flow(),op);
  const entries=state().teams.map(t=>({teamId:t.id,teamName:t.name,delta:points(flow(),t.id,D).total-before.get(t.id)})).filter(e=>e.delta);
  if(!entries.length){env.save();return true;}
  if(!env.record(entries,reason,undoing,null,op.kind==='warm'?'warmup':op.kind==='mark'?rounds.find(r=>r.questionIds.includes(op.qid))?.id:null)){apply(flow(),inverse(op));return false;}
  if(!undoing){flow().undo.push({recordId:state().history.at(-1).id,op:clone(op)});flow().undo=flow().undo.slice(-1000);}env.save();return true;
 }
 function award(teamId){const s=step();if(!isWarm(s))return;const from=flow().warmWins[s.qid]||null;if(from===teamId){closeModal();return;}if(change({kind:'warm',qid:s.qid,from,to:teamId},`Разминка · ${s.index+1}`)){closeModal();env.render();}}
 function undo(){const last=flow()?.undo.at(-1);if(!last)return;if(!change(inverse(last.op),'Отмена начисления',true))return;flow().undo.pop();const h=state().history.find(h=>h.id===last.recordId);if(h)h.undone=true;env.save();if(env.modal()?.kind==='flow-sheet'){if(step().kind==='final-results')env.render();openSheets(sheetTeam);}else{closeModal();env.render();}}
 function submitManual(){
  const s=step(),inputs=[...document.querySelectorAll('[data-manual-team]')];if(!inputs.length)return;
  const to=Object.fromEntries(inputs.map(el=>[el.dataset.manualTeam,Number(el.value)]));if(inputs.some(el=>el.value.trim()===''||!Number.isInteger(Number(el.value))||Number(el.value)<0||Number(el.value)>1000000)){document.querySelector('.flow-form-error').textContent='Введите целые баллы от 0 до 1 000 000.';return;}
  const from=Object.fromEntries(state().teams.map(t=>[t.id,flow().manual.captains[t.id]||0]));const delta=Object.fromEntries(state().teams.map(t=>[t.id,from[t.id]+to[t.id]-t.score]));if(change({kind:'manual',stage:'captains',from,to:delta},'Итоговые баллы'))go(flow().cursor+1);
 }
 function openSheets(teamId=sheetTeam){
  sheetTeam=state().teams.some(t=>t.id===teamId)?teamId:state().teams[0]?.id;if(!sheetTeam)return;
  const team=state().teams.find(t=>t.id===sheetTeam),set=new Set(flow().marks[sheetTeam]||[]);
  openModal('Бланки команд',`<div class="flow-sheets"><aside>${state().teams.map(t=>`<button class="${t.id===sheetTeam?'active':''}" data-action="flow-sheet-team" data-id="${esc(t.id)}"><span>${t.number}</span>${esc(t.name)}</button>`).join('')}</aside><section><header><h2>${esc(team.name)}</h2><strong data-sheet-total>${fmt(points(flow(),team.id,D).main)}</strong><button data-action="flow-undo" aria-label="Отменить последнее действие">${env.quickIcon('undo')}</button></header><div class="flow-sheet-grid"><div class="flow-sheet-grid-head"><span></span>${Array.from({length:10},(_,i)=>`<span>${i+1}<small>${(i+1)*100}</small></span>`).join('')}</div>${rounds.map(r=>`<div class="flow-sheet-row"><span title="${esc(r.title)}">${r.number}</span>${r.questionIds.map((qid,i)=>`<label><input type="checkbox" data-flow-mark="${qid}" data-team="${esc(team.id)}" ${set.has(qid)?'checked':''} aria-label="Блок ${r.number}, вопрос ${i+1}, ${(i+1)*100} баллов"><span aria-hidden="true"></span></label>`).join('')}</div>`).join('')}</div><button class="flow-submit" data-action="close">Готово</button></section></div>`,'flow-sheet-dialog','flow-sheet');
 }
 function operator(){
  if(step().kind==='count'){openSheets();return;}
  if(env.modal()?.kind==='quick'){closeModal();return;}
  const warm=isWarm(step());openModal('Команды и управление',`<div class="quick-teams" ${warm?'':'hidden'}>${state().teams.map(t=>`<button class="quick-team ${warm&&flow().warmWins[step().qid]===t.id?'selected-team':''}" data-action="flow-award" data-id="${esc(t.id)}" ${warm?'':'disabled'} aria-label="Команда ${t.number}: ${esc(t.name)}"><span class="quick-name">${esc(t.name)}</span></button>`).join('')}</div><nav class="quick-nav">${[['home','flow-stages','Этапы'],['undo','flow-undo','Отменить'],['more','manager','Настройки']].map(([icon,action,label])=>`<button class="quick-icon" data-action="${action}" aria-label="${label}">${env.quickIcon(icon)}</button>`).join('')}</nav>`,'quick-dialog','quick');overlay.classList.add('quick-mode','menu-opening');stage.classList.add('quick-menu-open');document.querySelector('#operator-dot').setAttribute('aria-expanded','true');env.morphQuick(overlay.firstElementChild,true,()=>overlay.classList.remove('menu-opening'));
 }
 function manager(tab){
  if(tab==='teams'){flow().drafts=state().teams.map(t=>({id:t.id,name:t.name,number:t.number}));openModal('Команды',namesForm(true),'flow-team-dialog','flow-teams');return;}
  if(tab==='scores'){if(step().kind==='manual'){closeModal();env.render();}else openSheets();return;}
  openModal('Управление',`<div class="flow-details">${[['Команды','teams'],['Бланки','scores'],['Сохранение','session'],['Настройки','settings']].map(([label,tab])=>`<button data-action="manager-tab" data-tab="${tab}">${label}</button>`).join('')}<button data-action="new-game">Новая игра</button></div>`,'flow-details-dialog','flow-details');
 }
 function view(){
  const s=step();if(['warmup','warmup-answer','question','review','answer'].includes(s.kind))return question(s);
  if(s.kind==='rules')return clickable(`<h1 class="flow-rules-title">Правила игры</h1><div class="flow-rule-cards">${[['Без телефонов','telephone','Старинный телефон'],['Не подсматривать','binoculars','Старинный бинокль'],['30 секунд на ответ','hourglass','Песочные часы']].map(([label,img,alt])=>`<article><img src="assets/rules/${img}.png" alt="${alt}" draggable="false"><h2>${label}</h2></article>`).join('')}</div>`,'flow-rules');
  if(s.kind==='names')return `<section class="view flow-names">${namesForm()}</section>`;
  if(s.kind==='naming')return clickable(clockMarkup(true),'flow-countdown');
  if(s.kind==='stages')return stages();if(s.kind==='blocks')return blocks(s);
  if(s.kind==='collection')return clickable(`<h1>Сдаём бланки</h1>${clockMarkup(true)}`,'flow-countdown flow-collection');
  if(s.kind==='answers-title')return clickable(`<h1>Ответы блока</h1><div class="flow-answer-number">${rounds.find(r=>r.id===s.roundId).number}</div>`,'flow-title-page');
  if(s.kind==='count')return clickable(`<h1>Подсчёт<br>голосов</h1><img class="flow-count-art" src="assets/stage-objects/creative-quill.png" alt="" draggable="false">`,'flow-title-page flow-count');
  if(s.kind==='final-results'){const teams=[...state().teams].sort((a,b)=>b.score-a.score||a.number-b.number);return clickable(`<h1>Итоги игры</h1><div class="flow-results">${teams.map(t=>`<div><span>${t.number}</span><h2>${esc(t.name)}</h2><strong>${fmt(t.score)}</strong></div>`).join('')}</div>`,'flow-results-page');}
  if(s.kind==='captains-intro')return clickable(`<div><h1>Конкурс<br>капитанов</h1></div><img src="assets/stage-objects/captains-compass.png" alt="Старинный компас" draggable="false">`,'flow-task-intro');
  if(s.kind==='captains-timer')return clickable(clockMarkup(true),'flow-countdown');
  if(s.kind==='manual')return manualForm();
  if(s.kind==='awards'){
   const team=awards(state().teams)[flow().awardIndex];if(!team)return clickable('<h1>Награждение</h1><div class="flow-award-orbit" aria-hidden="true"><i></i><i></i><i></i></div>','flow-awards-intro');
   const podium=team.place<=3;return clickable(`${podium?`<div class="flow-award-backdrop" aria-hidden="true">${team.place}</div><p class="flow-award-place">${team.place} место</p>`:''}<h1>${esc(team.name)}</h1><p class="flow-award-score">${fmt(team.score)}</p>${team.place===1?'<svg class="flow-winner-mark" viewBox="0 0 100 100" aria-hidden="true"><path d="m50 8 10 27 29 2-22 19 7 29-24-16-24 16 7-29L11 37l29-2Z" fill="currentColor"/></svg>':''}`,'flow-award '+(podium?'flow-podium podium-'+team.place:'flow-participant'));
  }return '';
 }
 function handleAction(action,el){
  const map={
   'flow-next':()=>next(),'flow-clock':clock,'flow-stage':()=>stageNext(el.dataset.stage),'flow-stages':()=>go(idx('stages')),'flow-award':()=>award(el.dataset.id),'flow-undo':undo,'flow-sheet-team':()=>openSheets(el.dataset.id),
   'flow-add-team':()=>{collectDraft();if(draft().length>=9)return;const used=new Set(draft().map(t=>t.number));flow().drafts.push({id:id(),name:'',number:[1,2,3,4,5,6,7,8,9].find(n=>!used.has(n))});flow().teamCount=flow().drafts.length;env.save();if(env.modal()?.kind==='flow-teams')openModal('Команды',namesForm(true),'flow-team-dialog','flow-teams');else env.render();},
   'flow-remove-team':()=>{collectDraft();flow().drafts=flow().drafts.filter(t=>t.id!==el.dataset.id);flow().teamCount=flow().drafts.length;env.save();if(env.modal()?.kind==='flow-teams')openModal('Команды',namesForm(true),'flow-team-dialog','flow-teams');else env.render();}
  };if(!map[action])return false;map[action]();return true;
 }
 function handleInput(el){if(el.hasAttribute('data-team-name-entry')){draft()[flow().nameIndex].name=el.value.slice(0,120);env.save();return true;}if(el.hasAttribute('data-flow-draft')){collectDraft();return true;}if(el.hasAttribute('data-flow-mark')){const teamId=el.dataset.team,qid=el.dataset.flowMark,from=(flow().marks[teamId]||[]).includes(qid);if(!change({kind:'mark',teamId,qid,from,to:el.checked},`Бланк · ${state().teams.find(t=>t.id===teamId).name}`))el.checked=from;const total=overlay.querySelector('[data-sheet-total]');if(total)total.textContent=fmt(points(flow(),teamId,D).main);if(step().kind==='final-results')env.render();return true;}return false;}
 return {enter,view,next,back,tick,operator,manager,undo,afterRender:()=>{preloadNext();const s=step(),q=findQ(s);if(s.kind!=='answer'||q?.type!=='chronology'||env.reduceMotion())return;const row=screen.querySelector('.chronology-cards');if(!row)return;[...row.children].forEach((el,i)=>{const original=q.events.findIndex(e=>e.label===el.dataset.event),dx=(original-i)*(el.offsetWidth+26);if(dx)el.animate([{transform:`translateX(${dx}px)`},{transform:'translateX(0)'}],{duration:850*env.motionScale,easing:'cubic-bezier(.3,0,.18,1)'});});},pause:()=>flow()&&pause(flow()),handleAction,handleInput,
  submit:form=>{if(form.id==='flow-team-form'){submitNames(form.dataset.edit==='true');return true;}if(form.id==='flow-manual-form'){submitManual();return true;}return false;},
  digit:n=>{if(isWarm(step())){const t=state().teams.find(t=>t.number===n);if(t)award(t.id);}},
  navigate:kind=>{if(kind==='stages')go(idx('stages'));else if(kind==='setup')manager('teams');else if(kind==='board')stageNext('main');else if(kind==='bonus')stageNext('captains');else if(kind==='captains')stageNext('captains');else if(kind==='rules')go(0);else if(kind==='ranking'&&flow().frontier>=idx('final-results'))go(idx('final-results'));else if(kind==='final'&&flow().frontier>=idx('awards'))go(idx('awards'));else if(kind==='warmup')go(idx('warm-0-q'));},
  openQuestion:qid=>{const i=rows.findIndex(s=>s.qid===qid&&['question','warmup'].includes(s.kind));if(i>=0)go(i);},
  active:()=>!!flow(),step,rows
 };
}
global.QUIZ_FLOW={fresh,sequence,points,awards,apply,inverse,validate,pause,mount};
})(window);
