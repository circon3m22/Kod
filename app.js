/* Cultural Code. Buildless, file:// compatible. All content is in quiz-data.js. */
(function () {
'use strict';
const MOTION_SCALE = 2;
const D = window.QUIZ_DATA, KEY = 'cultural-code-session-v1';
const $ = s => document.querySelector(s);
const screen = $('#screen'), stage = $('#stage'), overlay = $('#overlay');
const esc = v => String(v ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const id = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
const btn = (label, action, cls = '', data = '', disabled = false) => `<button class="btn ${cls}" data-action="${action}" ${data} ${disabled ? 'disabled' : ''}>${label}</button>`;
const qById = qid => D.questions.find(q => q.id === qid);
const screens = ['home','setup','stages','rules','board','question','warmup','bonus','captains','ranking','final','paper','flow'];
function taskKey(c=state.current){if(c.screen==='question')return qById(c.questionId)?'main:'+c.questionId:null;if(c.screen==='warmup')return D.warmup[c.warmIndex]?'warmup:'+D.warmup[c.warmIndex].id:null;if(c.screen==='bonus')return D.bonuses[c.bonusIndex]?'bonus:'+D.bonuses[c.bonusIndex].id:null;if(c.screen==='captains')return D.captains.length?(D.captains[c.captainIndex]?'captains:'+D.captains[c.captainIndex].id:null):'captains:contest';return null;}
function validTaskKeys(){return [...D.questions.map(q=>'main:'+q.id),...D.warmup.map(q=>'warmup:'+q.id),...(D.legacyWarmupIds||[]).map(id=>'warmup:'+id),...D.bonuses.map(q=>'bonus:'+q.id),...(D.captains.length?D.captains.map(q=>'captains:'+q.id):['captains:contest'])];}
function inferLegacyTask(reason){const match=(q,value)=>value!=null&&reason===(Number.isInteger(q.sourceSlide)?`${q.category} · ${value} · слайд ${q.sourceSlide}`:`${q.category} · ${value}`);const q=D.questions.find(q=>match(q,q.legacyValue))||D.questions.find(q=>match(q,q.value));if(q)return 'main:'+q.id;const m=/^Разминка (\d+)$/.exec(reason);if(m&&D.warmup[Number(m[1])-1])return 'warmup:'+((D.legacyWarmupIds||[])[Number(m[1])-1]||D.warmup[Number(m[1])-1].id);const b=D.bonuses.find(q=>q.title===reason);if(b)return 'bonus:'+b.id;if(reason==='Конкурс капитанов')return 'captains:contest';return null;}
function paperRound(id){return (D.rounds||[]).find(r=>r.id===id);}
function paperQuestions(round){if(!round)return [];const source=round.kind==='warmup'?D.warmup:D.questions;return round.questionIds.map(id=>source.find(q=>q.id===id)).filter(Boolean);}
function paperPosition(c){const r=paperRound(c.blockId),count=paperQuestions(r).length;if(!count)return null;return {blockId:r.id,paperPhase:c.blockId==='warmup'&&c.paperPhase==='handoff'?'intro':['intro','questions','handoff','answers'].includes(c.paperPhase)?c.paperPhase:'intro',paperIndex:Math.max(0,Math.min(count-1,Number.isInteger(c.paperIndex)?c.paperIndex:0))};}
function paperTimerOwner(c){return c.blockId!=='warmup'&&c.screen==='paper'&&['questions','handoff'].includes(c.paperPhase)?`${c.blockId}:${c.paperPhase}:${c.paperIndex}`:null;}
function fresh() {
 return {schema:1, flow:null, started:false, rulesSeen:false, teams:[], history:[], pendingAward:null, roundProgress:{}, used:[], warmDone:[], current:{screen:'home',questionId:null,warmIndex:0,bonusIndex:0,captainIndex:0,answer:false}, settings:{contrast:false,reduced:false,large:false,timerSound:false}, timers:{}, bonusPhase:'prepare', completedStages:[], intermission:null, updatedAt:null};
}
let state=fresh(), saved=null, storageOK=true, modal=null, lastFocus=null, scoreContext=null, toastHandle, pendingVideo=null;
let flowUI=null;
const sessionVideos = new Map();
function validateState(s) {
 if(!s || s.schema!==1 || !Array.isArray(s.teams) || s.teams.length>24 || !Array.isArray(s.history) || s.history.length>10000 || !Array.isArray(s.used) || !s.current || !screens.includes(s.current.screen)) throw Error('Неверный формат сохранения. Нужен JSON-файл этой платформы.');
 const n=fresh(), seen=new Set();
 n.teams=s.teams.map(t=>{if(!t || typeof t.id!=='string' || t.id.length>100 || seen.has(t.id) || typeof t.name!=='string' || t.name.length>120 || !Number.isSafeInteger(t.score) || Math.abs(t.score)>1e9) throw Error('Некорректные данные команды.');seen.add(t.id);return {id:t.id,name:t.name,score:t.score,number:Number.isInteger(t.number)&&t.number>=1&&t.number<=9?t.number:s.teams.indexOf(t)+1};});
 n.history=s.history.map(h=>{if(!h || typeof h.id!=='string' || !Array.isArray(h.entries) || h.entries.length>24)throw Error('Некорректная история счёта.');return {id:h.id,time:String(h.time||'').slice(0,50),reason:String(h.reason||'').slice(0,300),undone:!!h.undone,isUndo:!!h.isUndo,roundId:paperRound(h.roundId)?h.roundId:null,taskKey:validTaskKeys().includes(h.taskKey)?h.taskKey:(!h.isUndo?inferLegacyTask(String(h.reason||'')):null),entries:h.entries.map(e=>{if(!e||typeof e.teamId!=='string'||!Number.isSafeInteger(e.delta)||Math.abs(e.delta)>2e9)throw Error('Некорректное начисление.');return {teamId:e.teamId,teamName:String(e.teamName||'').slice(0,120),delta:e.delta};})};});
 n.used=[...new Set(s.used.filter(v=>qById(v)))];n.warmDone=Array.isArray(s.warmDone)?s.warmDone.filter(v=>Number.isInteger(v)&&v>=0&&v<D.warmup.length):[];
 n.current={screen:s.current.screen,questionId:qById(s.current.questionId)?s.current.questionId:null,warmIndex:Math.min(D.warmup.length-1,Math.max(0,Number(s.current.warmIndex)||0))|0,bonusIndex:Math.min(D.bonuses.length-1,Math.max(0,Number(s.current.bonusIndex)||0))|0,captainIndex:Math.max(0,Number(s.current.captainIndex)||0)|0,answer:!!s.current.answer,...(paperRound(s.current.blockId)?{blockId:s.current.blockId}:{})};
 if(n.current.screen==='rules'&&paperRound(s.current.rulesNext))n.current.rulesNext=s.current.rulesNext;
 if(n.current.screen==='paper'){const position=paperPosition(s.current);if(position)Object.assign(n.current,position);else n.current.screen='board';}
 for(const r of D.rounds||[]){const saved=s.roundProgress?.[r.id];if(!saved||typeof saved!=='object')continue;const position=paperPosition({blockId:r.id,paperPhase:saved.phase,paperIndex:saved.index});if(position)n.roundProgress[r.id]={phase:saved.completed?'complete':position.paperPhase,index:position.paperIndex,completed:!!saved.completed};}
 if(n.current.screen==='question' && (!qById(n.current.questionId) || !qById(n.current.questionId).enabled))n.current.screen='board';
 if(n.current.screen==='paper'&&n.roundProgress[n.current.blockId]?.completed)n.current.screen='home';
 if(n.current.screen==='paper')n.roundProgress[n.current.blockId]={phase:n.current.paperPhase,index:n.current.paperIndex,completed:false};
 for(const k of Object.keys(n.settings))n.settings[k]=!!s.settings?.[k];
 if(s.pendingAward&&s.pendingAward.taskKey===taskKey(n.current)&&n.teams.some(t=>t.id===s.pendingAward.teamId))n.pendingAward={taskKey:s.pendingAward.taskKey,teamId:s.pendingAward.teamId};
 n.completedStages=Array.isArray(s.completedStages)?[...new Set(s.completedStages.filter(x=>['warmup','board','bonus','captains'].includes(x)))]:[];n.intermission=s.intermission&&['warmup','board','bonus'].includes(s.intermission.after)&&['board','bonus','captains'].includes(s.intermission.next)?{after:s.intermission.after,next:s.intermission.next}:null;
 n.rulesSeen=!!s.rulesSeen;n.started=!!s.started;n.updatedAt=String(s.updatedAt||'');n.bonusPhase=s.bonusPhase==='defend'?'defend':'prepare';
 if(s.timers && typeof s.timers==='object')for(const k of ['social-prepare','social-defend','captains','general','paper']){const t=s.timers[k];if(t && Number.isFinite(t.remaining)&&t.remaining>=0&&t.remaining<=86400)n.timers[k]={duration:Math.max(1,Math.min(86400,Number(t.duration)||t.remaining||60)),remaining:t.remaining,running:!!t.running,deadline:Math.max(0,Math.min(Date.now()+86400000,Number(t.deadline)||0)),...(k==='paper'?{duration:30,remaining:Math.min(30,t.remaining),deadline:Math.min(Date.now()+30000,Math.max(0,Number(t.deadline)||0)),owner:typeof t.owner==='string'?t.owner.slice(0,100):null}: {})};}
 if(s.flow){n.flow=window.QUIZ_FLOW.validate(s.flow,n.teams,D);if(n.flow&&(s.teams.some(t=>!Number.isInteger(t.number)||t.number<1||t.number>9)||new Set(n.teams.map(t=>t.number)).size!==n.teams.length))throw Error('Номера команд должны быть разными.');}
 if(n.current.screen==='flow'&&!n.flow)n.current.screen='home';
 return n;
}
try{const raw=localStorage.getItem(KEY);if(raw)saved=validateState(JSON.parse(raw));}catch(e){storageOK=false;}
let resumeCurrent=saved?structuredCloneSafe(saved.current):null;
if(saved){state=structuredCloneSafe(saved);if(state.flow)window.QUIZ_FLOW.pause(state.flow);if(state.timers.paper?.running){state.timers.paper.remaining=remaining(state.timers.paper);state.timers.paper.running=false;}state.current={...state.current,screen:'home'};}
function save(){state.updatedAt=new Date().toISOString();const payload=structuredCloneSafe(state);if(state.current.screen==='home'&&resumeCurrent)payload.current=structuredCloneSafe(resumeCurrent);saved=payload;try{localStorage.setItem(KEY,JSON.stringify(payload));storageOK=true;}catch(e){storageOK=false;} }
function structuredCloneSafe(s){return JSON.parse(JSON.stringify(s));}
function toast(text){if(!modal)return;$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastHandle);toastHandle=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
function applySettings(){document.body.classList.toggle('high-contrast',state.settings.contrast);document.body.classList.toggle('reduced',state.settings.reduced);document.body.classList.toggle('large',state.settings.large);if(reduceMotion())stopPosterTour();}
function fitStage(){const vv=window.visualViewport,w=vv?vv.width:window.innerWidth,h=vv?vv.height:window.innerHeight;const cs=getComputedStyle($('#safe-probe')),l=parseFloat(cs.paddingLeft)||0,r=parseFloat(cs.paddingRight)||0,t=parseFloat(cs.paddingTop)||0,b=parseFloat(cs.paddingBottom)||0;const aw=Math.max(1,w-l-r),ah=Math.max(1,h-t-b),portrait=window.innerHeight>window.innerWidth;const scale=portrait?Math.min(ah/1920,aw/1080):Math.min(aw/1920,ah/1080);stage.style.left=((vv?.offsetLeft||0)+l+aw/2-960)+'px';stage.style.top=((vv?.offsetTop||0)+t+ah/2-540)+'px';stage.style.transform=`rotate(${portrait?90:0}deg) scale(${scale})`;stage.dataset.rotation=portrait?'90':'0';stage.dataset.scale=scale;}
window.addEventListener('resize',fitStage);window.addEventListener('orientationchange',fitStage);window.visualViewport?.addEventListener('resize',fitStage);window.visualViewport?.addEventListener('scroll',fitStage);
async function fullscreen(){try{if(document.fullscreenElement){await document.exitFullscreen();return;}if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();try{await window.screen.orientation?.lock?.('landscape');}catch(e){} }else toast('Браузер не поддерживает полноэкранный режим. Сцена продолжит работать с CSS-поворотом.');}catch(e){toast('Браузер запретил полный экран. Масштабирование и CSS-поворот продолжают работать.');}fitStage();}
document.addEventListener('fullscreenchange',()=>{fitStage();renderHeader();});
function renderHeader(){
 $('#header').innerHTML='';
 let dot=$('#operator-dot');
 if(!dot){dot=document.createElement('button');dot.id='operator-dot';dot.className='operator-dot';dot.setAttribute('data-action','quick-menu');dot.setAttribute('aria-label','Управление квизом');dot.innerHTML='<span aria-hidden="true"></span>';dot.setAttribute('aria-expanded','false');dot.setAttribute('aria-haspopup','dialog');stage.append(dot);}
 dot.hidden=state.current.screen==='home'&&!state.flow&&!Object.values(state.roundProgress||{}).some(r=>r.completed);
}
function renderScores(){$('#scorebar').innerHTML='';}

function go(where,extra={}){if(state.current.screen==='flow'&&where!=='flow')flowUI?.pause();const clock=state.timers.paper;if(clock?.running&&clock.owner===paperTimerOwner(state.current)&&clock.owner!==paperTimerOwner({...state.current,screen:where,...extra})){clock.remaining=remaining(clock);clock.running=false;}coverTransition=null;closeModal(false);if(where==='home'&&state.current.screen!=='home')resumeCurrent=structuredCloneSafe(state.current);state.current={...state.current,screen:where,answer:false,...extra};if(state.pendingAward?.taskKey!==taskKey())state.pendingAward=null;if(where!=='home'){state.started=true;resumeCurrent=structuredCloneSafe(state.current);}save();render();}
function render(){
 if(posterFilm)stopPosterTour();
 const previous=screen.querySelector('.chronology-cards'),same=previous&&state.current.screen==='question'&&previous.dataset.question===state.current.questionId;
 const positions=same?new Map([...previous.children].map(el=>{const transform=getComputedStyle(el).transform,matrix=transform==='none'||!window.DOMMatrixReadOnly?null:new DOMMatrixReadOnly(transform);return [el.dataset.event,{left:el.offsetLeft+(matrix?.m41||0),top:el.offsetTop+(matrix?.m42||0)}];})):null;
 const reorder=same&&previous.dataset.answer!==String(state.current.answer);
 applySettings();renderHeader();renderScores();screen.className=state.current.screen==='home'?'home-screen':state.current.screen==='stages'?'stage-menu-screen':state.current.screen==='flow'?'flow-screen':'';screen.style.animation='none';if(!same){void screen.offsetWidth;screen.style.animation='';}
 if(state.current.screen==='paper')paperPrepareClock(state.current.blockId,state.current.paperPhase,state.current.paperIndex);
 const view=state.current.screen==='flow'?()=>flowUI.view():views[state.current.screen]||views.home;screen.innerHTML=view();fitStage();updateTimerUI();animatePaperChronology();if(state.current.screen==='flow')flowUI.afterRender();if(state.current.screen==='home')startPosterTour();
 if(reorder&&!state.settings.reduced&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){screen.querySelectorAll('.chronology-card').forEach(el=>{const old=positions.get(el.dataset.event);if(!old||!el.animate)return;const dx=old.left-el.offsetLeft,dy=old.top-el.offsetTop;if(Math.abs(dx)<1&&Math.abs(dy)<1)return;el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:`translate(${dx*.44}px,${dy-18}px)`,offset:.5},{transform:'translate(0,0)'}],{duration:850*MOTION_SCALE,easing:'cubic-bezier(.3,0,.18,1)'});});}
}
function questionOrigin(q){return Number.isInteger(q.sourceSlide)?`Слайды ${q.sourceSlide} / ${q.answerSlide}`:q.type==='photo'?'Фотозадание · новая редакция':'Хронология · новая категория';}
function section(title,kicker,right=''){return `<div class="section-head"><div><div class="eyebrow">${kicker}</div><h2>${title}</h2></div>${right}</div>`;}
function circle(label,action,data='',disabled=false){return `<button class="circle-control" data-action="${action}" ${data} ${disabled?'disabled':''}>${label}</button>`;}
/* One uninterrupted composition per letter. Rotation, scale and section
   convergence share the same clock; letters change by a direct cut. */
function posterFilmMarkup(){
 const art=window.COVER_ART,layouts=[[0,1,2],[3,4,5],[6,7,8],art.sectors.map((_,i)=>i)];
 let defs='<linearGradient id="film-map-sweep" gradientUnits="userSpaceOnUse" x1="-540" x2="-100"><stop offset="0" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient><mask id="film-map-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><rect width="1920" height="1080" fill="url(#film-map-sweep)"/></mask>',scenes='';
 layouts.forEach((ids,scene)=>{let pieces='';ids.forEach((sector,j)=>{const part=art.sectors[sector],key=`film-${scene}-${j}`;
 defs+=`<clipPath id="${key}-mask" clipPathUnits="userSpaceOnUse"><path class="film-mask" data-mask="${key}" d="${part.region}"/></clipPath>`;
 pieces+=`<g class="film-piece" data-sector="${sector}" data-key="${key}" clip-path="url(#${key}-mask)"><image class="film-photo film-photo-a" x="0" y="0" width="1920" height="1080" preserveAspectRatio="xMidYMid slice"/><image class="film-photo film-photo-b" x="0" y="0" width="1920" height="1080" preserveAspectRatio="xMidYMid slice" opacity="0"/>${scene===3?`<image class="film-final-photo" href="${part.photo}" preserveAspectRatio="${part.imageBox?'none':part.align+' slice'}" opacity="0"/>`:''}</g>`;
 });scenes+=`<g class="film-scene" data-scene="${scene}" data-letter="${window.COVER_FILM.sequence[scene]}" style="display:none"><rect width="1920" height="1080" fill="#fff"/>${scene===3?'<g class="film-map-window" mask="url(#film-map-reveal)"><image class="film-map" href="assets/design/poster-russia-silhouette.svg" x="240" y="0" width="1440" height="1080"/></g>':''}${pieces}</g>`;});
 return `<svg class="poster-film" viewBox="0 0 1920 1080" aria-hidden="true" focusable="false"><defs>${defs}</defs>${scenes}</svg><div class="poster-film-final" aria-hidden="true"><div class="final-map-window"><canvas class="final-map" width="1920" height="1080"></canvas><div class="final-map-curtain"></div></div><div class="final-pieces"></div></div>`;
}
let posterFilm=null;
const filmEase=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const filmMix=(a,b,t)=>a+(b-a)*t;
const filmCenters=[[232.5,280],[280,280],[260,315]];
const filmSeparation=[[-155,0],[100,-115],[100,115],[125,-72],[0,145],[-125,-72],[-120,-30],[120,-30],[0,95]];
function filmPose(scene,j,sector,t,target){
 const letter=scene<3?scene:Math.floor(sector/3),[cx,cy]=filmCenters[letter],u=Math.max(0,Math.min(1,t/4));
 let x,y,scale,angle,spread;
 if(scene<3){
  const [large,small,close,start,turn]=[[2.25,1.35,2.7,-40,92],[2.4,1.45,2.85,-60,160],[2.05,1.22,2.4,38,-88]][letter];
  // These tracks run concurrently, not as three consecutive sub-scenes. The
  // turn never stops; convergence and shrink begin together, then the assembled
  // letter grows into the outgoing close-up while continuing its rotation.
  scale=u<.5?filmMix(large,small,filmEase(u*2)):filmMix(small,close,filmEase((u-.5)*2));
  angle=start+turn*u;spread=.9*Math.pow(1-filmEase(u/.58),2);x=960;y=540;
 }else{
  const land=filmEase(t/3.65),zoom=filmMix(1.16,1,land);
  const finalX=target.x+(cx-target.center[0])*target.scale,finalY=target.y+(cy-target.center[1])*target.scale;
  x=960+(finalX-960)*zoom;y=540+(finalY-540)*zoom;scale=target.scale*zoom;angle=0;spread=.10*(1-land);
 }
 const [dx,dy]=filmSeparation[sector],rad=angle*Math.PI/180;
 // A shared rotation and outward-only offsets preserve the gaps between parts.
 return [x+scale*spread*(dx*Math.cos(rad)-dy*Math.sin(rad)),y+scale*spread*(dx*Math.sin(rad)+dy*Math.cos(rad)),scale,scale,angle,cx,cy];
}
// Rasterize each section once in spare time. The finale then changes only
// compositor transforms/opacity, without repainting SVG paths or photographs.
function filmDrawCover(ctx,image,x,y,w,h,stretch=false){
 if(!image?.complete||!image.naturalWidth)return false;
 if(stretch){ctx.drawImage(image,x,y,w,h);return true;}
 const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight),sw=w/scale,sh=h/scale;
 ctx.drawImage(image,(image.naturalWidth-sw)/2,(image.naturalHeight-sh)/2,sw,sh,x,y,w,h);return true;
}
function prepareFilmFinal(film,decoded){
 const layer=film.finalLayer;if(!layer||typeof Path2D==='undefined')return null;
 const map=layer.querySelector('.final-map'),ctx=map.getContext('2d');if(!ctx)return null;
 const f={layer,map,curtain:layer.querySelector('.final-map-curtain'),queue:[],idle:0,cycle:null,ready:false,mapReady:false};
 const source=new Image();source.src='assets/design/poster-russia-silhouette.svg';source.decode().then(()=>{if(!film.svg.isConnected)return;ctx.drawImage(source,240,0,1440,1080);f.mapReady=true;if(f.cycle!==null)f.markReady();}).catch(()=>{});
 f.pieces=film.scenes[3].pieces.map(p=>{
  const part=window.COVER_ART.sectors[p.sector],b=p.mask.getBBox(),scale=p.target.scale,pad=2/scale,box=[b.x-pad,b.y-pad,b.width+pad*2,b.height+pad*2],origin=[p.target.x+(box[0]-p.target.center[0])*scale,p.target.y+(box[1]-p.target.center[1])*scale];
  const el=document.createElement('div');el.className='final-piece';el.dataset.sector=p.sector;el.style.width=box[2]*scale+'px';el.style.height=box[3]*scale+'px';
  const textures=['a','b','original'].map(name=>{const c=document.createElement('canvas');c.className='final-texture final-texture-'+name;c.width=Math.ceil(box[2]*scale*1.25);c.height=Math.ceil(box[3]*scale*1.25);el.append(c);return c;});layer.querySelector('.final-pieces').append(el);
  return {...p,el,textures,box,origin,path:new Path2D(part.region),letterPath:new Path2D(window.COVER_ART.letters[part.letter].path),imageBox:['x','y','width','height'].map(attr=>Number(p.original.getAttribute(attr))),stretch:!!part.imageBox};
 });
 f.draw=(p,index,image,matrix)=>{
  if(!image?.complete||!image.naturalWidth)return false;
  const c=p.textures[index],g=c.getContext('2d'),ratioX=c.width/(p.box[2]*p.target.scale),ratioY=c.height/(p.box[3]*p.target.scale),[ox,oy]=p.origin;
  g.resetTransform();g.clearRect(0,0,c.width,c.height);g.save();g.setTransform(ratioX*p.target.scale,0,0,ratioY*p.target.scale,-p.box[0]*ratioX*p.target.scale,-p.box[1]*ratioY*p.target.scale);g.clip(p.path);g.clip(p.letterPath,'evenodd');
  if(index===2){const m=matrix;g.setTransform(ratioX*m.a,ratioY*m.b,ratioX*m.c,ratioY*m.d,ratioX*(m.e-ox),ratioY*(m.f-oy));filmDrawCover(g,image,...p.imageBox,p.stretch);}
  else{const zoom=1.04;g.setTransform(ratioX*zoom,0,0,ratioY*zoom,ratioX*(960*(1-zoom)-ox),ratioY*(540*(1-zoom)-oy));filmDrawCover(g,image,0,0,1920,1080);}
  g.restore();return true;
 };
 f.markReady=()=>{f.ready=!f.queue.length&&f.mapReady;if(f.ready&&!f.effects?.length)f.makeAnimations();layer.dataset.ready=String(f.ready);};
 f.makeAnimations=()=>{
  const frames=Array.from({length:121},(_,i)=>i/120),bind=(el,keyframes)=>{const effect=el.animate(keyframes,{duration:4000*MOTION_SCALE,fill:'both',easing:'linear'});effect.pause();effect.currentTime=0;return effect;};
  f.effects=[bind(f.curtain,frames.map(u=>({offset:u,transform:`translateX(${filmMix(-320,2240,filmEase((u*4-.35)/3.1))-220}px)`}))),bind(f.map,frames.map(u=>{const scale=Math.pow(3.6,1-filmEase(u*4/3.65));return {offset:u,transform:`matrix(${scale},0,0,${scale},${960*(1-scale)},${540*(1-scale)})`};}))];
  f.pieces.forEach(p=>{
   f.effects.push(bind(p.el,frames.map(u=>{const [x,y,sx,sy,,cx,cy]=filmPose(3,p.j,p.sector,u*4,p.target),zoom=sx/p.target.scale;return {offset:u,transform:`matrix(${zoom},0,0,${zoom},${x+sx*(p.box[0]-cx)},${y+sy*(p.box[1]-cy)})`};})),bind(p.textures[1],frames.map(u=>({offset:u,opacity:filmEase(u*4/2.7)}))),bind(p.textures[2],frames.map(u=>({offset:u,opacity:filmEase((u*4-2.7)/.95)}))));
  });
 };
 f.schedule=()=>{if(f.idle||!f.queue.length||posterFilm!==film)return;const run=()=>{f.idle=0;if(posterFilm!==film)return;const task=f.queue.shift();if(task&&!task())f.queue.push(task);f.markReady();if(f.queue.length)f.schedule();};f.idle=window.requestIdleCallback?requestIdleCallback(run,{timeout:50}):setTimeout(run,16);};
 f.prepare=cycle=>{
  f.effects?.forEach(a=>a.cancel());f.effects=[];f.playCycle=null;f.cycle=cycle;f.ready=false;f.queue=[];
  // One batch of reads after the poster drift pauses, before any texture writes.
  const inverse=film.svg.getScreenCTM().inverse(),matrices=f.pieces.map(p=>inverse.multiply(p.original.getScreenCTM()));
  f.pieces.forEach((p,i)=>{f.queue.push(()=>f.draw(p,0,decoded.get(film.all[p.order[(cycle+1)%film.all.length]])),()=>f.draw(p,1,decoded.get(film.all[p.order[(cycle+2)%film.all.length]])),()=>f.draw(p,2,decoded.get(window.COVER_ART.sectors[p.sector].photo),matrices[i]));});
  f.schedule();
 };
 return f;
}
function paintFilmFinal(film,time){
 const f=film.final;
 if(f.playCycle!==f.cycle){
  const start=film.start+(f.cycle/3*20000+16000)*MOTION_SCALE;
  f.effects.forEach(a=>{a.play();a.startTime=start;});f.playCycle=f.cycle;
 }
 // Geometry and fades now run on the compositor. The main loop only selects
 // the scene; it no longer sends 29 transform/opacity updates on every frame.
 f.layer.dataset.landed=String(time>=3.65);
}
function stopPosterTour(exit=false){
 const film=posterFilm;if(!film)return;cancelAnimationFrame(film.raf);posterFilm=null;
 if(exit&&film.titleAnimation){try{film.titleAnimation.commitStyles();}catch(e){}}film.titleAnimation?.cancel();
 film.final?.effects?.forEach(a=>{if(exit&&a.effect?.target?.isConnected){try{a.commitStyles();}catch(e){}}a.cancel();});
 if(film.final?.idle){if(window.cancelIdleCallback)cancelIdleCallback(film.final.idle);else clearTimeout(film.final.idle);}
 if(exit){for(const layer of [film.svg,film.finalLayer])if(layer){layer.classList.add('film-exiting');layer.style.opacity='0';}}
 else{film.svg.style.opacity='0';if(film.finalLayer)film.finalLayer.style.opacity='0';film.sheet.removeAttribute('data-film-motion');film.sheet.style.removeProperty('--film-copy');film.sheet.style.removeProperty('--film-map');}
}
function startPosterTour(){
 const svg=screen.querySelector('.poster-film'),sheet=screen.querySelector('.poster-sheet'),finalLayer=screen.querySelector('.poster-film-final');
 if(!svg||!window.COVER_FILM||reduceMotion()||coverTransition||posterFilm?.svg===svg)return;
 stopPosterTour();
 const decoded=new Map(),all=[...new Set([...window.COVER_FILM.photos,...window.COVER_ART.sectors.map(s=>s.photo)])],images=all.map(src=>{const image=new Image();image.src=src;decoded.set(src,image);image.decode?.().catch(()=>{});return image;});
 let seed=86231;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const art=window.COVER_ART,mark=sheet.querySelector('.poster-wordmark'),style=getComputedStyle(mark),baseScale=parseFloat(style.width)/art.width,baseX=sheet.offsetLeft+parseFloat(style.left),baseY=sheet.offsetTop+parseFloat(style.top);
 const orders=art.sectors.map(()=>{const order=all.map((_,i)=>i);for(let i=order.length-1;i>0;i--){const k=Math.floor(random()*(i+1));[order[i],order[k]]=[order[k],order[i]];}return order;});
 const scenes=[...svg.querySelectorAll('.film-scene')].map((el,scene)=>({el,pieces:[...el.querySelectorAll('.film-piece')].map((el,j)=>{const sector=Number(el.dataset.sector),p=art.sectors[sector],b=p.box,center=[b[0]+b[2]/2,b[1]+b[3]/2];
 return {el,sector,j,mask:svg.querySelector(`[data-mask="${el.dataset.key}"]`),a:el.querySelector('.film-photo-a'),b:el.querySelector('.film-photo-b'),final:el.querySelector('.film-final-photo'),original:mark.querySelectorAll('.poster-photo')[sector],order:orders[sector],lastA:null,lastB:null,target:{center,x:baseX+(art.letters[p.letter].x+center[0])*baseScale,y:baseY+center[1]*baseScale,scale:baseScale}};
 })}));
 const film={svg,sheet,finalLayer,title:screen.querySelector('.film-calligraphy'),scenes,images,all,raf:0,start:performance.now(),duration:20000*MOTION_SCALE,sceneSeconds:4*MOTION_SCALE};posterFilm=film;svg.dataset.startedAt=film.start;film.final=prepareFilmFinal(film,decoded);
 film.paint=(ms)=>{
  ms/=MOTION_SCALE; // All tracks share the same half-speed clock, including the SVG fallback.
  const seconds=((ms%20000)+20000)%20000/1000,active=seconds>=3.5&&seconds<20;
  if(film.motion!==active){film.motion=active;sheet.toggleAttribute('data-film-motion',active);if(active&&film.final)film.final.prepare(Math.floor(ms/20000)*3);}
  svg.dataset.scene=active?String(Math.min(3,Math.max(0,Math.floor((seconds-4)/4)))):'poster';
  const copy=seconds<3.5?1:seconds<4?1-filmEase((seconds-3.5)/.5):seconds<19.65?0:filmEase((seconds-19.65)/.35);
  sheet.style.setProperty('--film-copy',copy);sheet.style.setProperty('--film-map','1');
  const layeredFinal=active&&seconds>=16&&film.final?.ready;
  svg.style.opacity=active&&!layeredFinal?String(1-copy):'0';if(finalLayer)finalLayer.style.opacity=layeredFinal?String(1-copy):'0';
  if(layeredFinal)paintFilmFinal(film,seconds-16);
  const titleCycle=active&&seconds>=16?Math.floor(ms/20000):-1;
  if(titleCycle!==film.titleCycle){
   film.titleCycle=titleCycle;film.titleAnimation?.cancel();
   if(film.title&&titleCycle>=0){film.titleAnimation=film.title.animate([{offset:0,opacity:0,transform:'translateY(24px) scale(1.045)'},{offset:.15,opacity:0,transform:'translateY(24px) scale(1.045)'},{offset:.78,opacity:1,transform:'translateY(0) scale(1)'},{offset:1,opacity:1,transform:'translateY(0) scale(1)'}],{duration:4000*MOTION_SCALE,fill:'both',easing:'cubic-bezier(.22,.65,.25,1)'});film.titleAnimation.startTime=film.start+(titleCycle*20000+16000)*MOTION_SCALE;}
  }
  scenes.forEach(({el,pieces},scene)=>{
   const time=seconds-(4+scene*4),visible=!(scene===3&&layeredFinal)&&time>=(scene===0?-.5:0)&&time<4;
   el.style.display=visible?'':'none';if(!visible)return;
   if(scene===3){
    const map=el.querySelector('.film-map'),land=filmEase(time/3.65),scale=Math.pow(3.6,1-land),front=filmMix(-320,2240,filmEase((time-.35)/3.1));
    map.setAttribute('transform',`translate(960 540) scale(${scale}) translate(-960 -540)`);
    const sweep=svg.querySelector('#film-map-sweep');sweep.setAttribute('x1',front-220);sweep.setAttribute('x2',front+220);
   }
   pieces.forEach(p=>{const local=Math.max(0,Math.min(4,time)),pose=filmPose(scene,p.j,p.sector,local,p.target),[x,y,sx,sy,angle,cx,cy]=pose;
    p.mask.setAttribute('transform',`translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${angle.toFixed(3)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-cx} ${-cy})`);
    const cycle=Math.floor(ms/20000)*3,first=cycle+(scene===3?1:0),a=all[p.order[first%all.length]],b=all[p.order[(first+1)%all.length]];
    const fade=scene===3?filmEase(local/2.7):filmEase((local-.65)/2.8);
    if(a!==p.lastA){p.a.setAttribute('href',a);p.lastA=a;}if(b!==p.lastB){p.b.setAttribute('href',b);p.lastB=b;}
    p.b.setAttribute('opacity',fade.toFixed(4));
    const zoom=1.025+.035*local/4;[p.a,p.b].forEach(image=>image.setAttribute('transform',`translate(960 540) scale(${zoom.toFixed(4)}) translate(-960 -540)`));
    if(p.final){
     // Match the paused live photograph, including its crop and drift transform,
     // so the final frame hands back to the actual poster without a photo jump.
     if(p.finalCycle!==cycle){const m=svg.getScreenCTM().inverse().multiply(p.original.getScreenCTM());p.final.setAttribute('transform',`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);for(const attr of ['x','y','width','height'])p.final.setAttribute(attr,p.original.getAttribute(attr));p.finalCycle=cycle;}
     p.final.setAttribute('opacity',filmEase((local-2.7)/.95));
    }
   });
  });
 };
 const tick=now=>{if(posterFilm!==film||!svg.isConnected)return;film.paint(now-film.start);film.raf=requestAnimationFrame(tick);};film.paint(0);film.raf=requestAnimationFrame(tick);
}

function teamStart(){
 if(coverTransition||state.current.screen!=='home')return;
 const cover=screen.querySelector('.cover-poster'),token={cover};coverTransition=token;
 const mark=cover?.querySelector('.poster-wordmark'),sheet=cover?.querySelector('.poster-sheet');
 if(mark&&sheet){
  const bounds=cover.querySelector('#home-letter-1 path').getBBox(),art=window.COVER_ART,box=getComputedStyle(mark),scale=parseFloat(box.width)/art.width;
  const focusX=art.letters[1].x+bounds.x+(bounds.width||560)/2,focusY=bounds.y+(bounds.height||560)/2;
  mark.style.transformOrigin=`${focusX/art.width*100}% ${focusY/art.height*100}%`;
  mark.style.setProperty('--zoom-x',`${stage.clientWidth/2-sheet.offsetLeft-parseFloat(box.left)-focusX*scale}px`);
  mark.style.setProperty('--zoom-y',`${stage.clientHeight/2-sheet.offsetTop-parseFloat(box.top)-focusY*scale}px`);
 }
 stopPosterTour(true);screen.classList.add('cover-leaving');cover?.setAttribute('aria-busy','true');
 const done=()=>{if(coverTransition!==token)return;coverTransition=null;if(state.current.screen==='home'&&cover?.isConnected)flowUI.enter();};
 if(state.settings.reduced||window.matchMedia('(prefers-reduced-motion: reduce)').matches){done();return;}
 const allAnimations=cover?.getAnimations?.({subtree:true})||[];allAnimations.filter(a=>a.effect?.getTiming().iterations===Infinity).forEach(a=>a.pause());
 const animations=allAnimations.filter(a=>a.effect?.getTiming().iterations!==Infinity);const now=document.timeline?.currentTime;if(now!=null)animations.forEach(a=>{if(a.pending&&a.startTime===null)a.startTime=now;});if(animations.length)Promise.allSettled(animations.map(a=>a.finished)).then(done);else setTimeout(done,1450*MOTION_SCALE);
}
let coverTransition=null;
function posterWordmark(){const art=window.COVER_ART;return `<svg class="poster-wordmark" viewBox="0 0 ${art.width} ${art.height}" aria-hidden="true" focusable="false"><defs>${art.letters.map((l,i)=>`<clipPath id="home-letter-${i}"><path d="${l.path}" clip-rule="evenodd"/></clipPath>`).join('')}${art.sectors.map((s,i)=>`<clipPath id="home-sector-${i}"><path d="${s.region}"/></clipPath>`).join('')}</defs>${art.sectors.map((s,i)=>{const [x,y,w,h]=s.imageBox||s.box;const [duration,delay,dx,dy]=[[24,0,2.4,1.4],[30,-6,-2,1.8],[27,-15,2.1,-1.5],[32,-10,-2.3,-1.5],[25,-4,1.8,2],[29,-20,-2.2,1.4],[31,-12,2.3,-1.8],[26,-18,-1.9,1.7],[28,-8,2,-2]][i];return `<g transform="translate(${art.letters[s.letter].x} 0)"><g class="kod-sector" data-sector="${i}"><g clip-path="url(#home-letter-${s.letter})"><g clip-path="url(#home-sector-${i})"><image class="poster-photo" style="--photo-duration:${duration*MOTION_SCALE}s;--photo-delay:${delay*MOTION_SCALE}s;--photo-x:${dx}%;--photo-y:${dy}%" href="${s.photo}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${s.imageBox?'none':s.align+' slice'}"/></g></g></g></g>`;}).join('')}</svg>`;}

function finishStage(after,next=null){if(!state.completedStages.includes(after))state.completedStages.push(after);for(const [key,t] of Object.entries(state.timers)){if(t.running){t.remaining=remaining(t);t.running=false;}}state.intermission=next?{after,next}:null;go(next?'ranking':'stages');}
function continueAfterResults(){const next=state.intermission?.next;state.intermission=null;go(next||'stages');}
const views={
 home(){const e=window.COVER_ART.event;return `<div class="cover cover-poster" data-action="enter-cover" role="button" tabindex="0" aria-label="Открыть игру"><div class="poster-sheet"><p class="poster-kicker">${esc(e.kicker)}</p><img class="poster-organizer" src="assets/brand/youth-council-black.svg" alt="Молодёжный совет Хабаровска"><h1 class="poster-title">${esc(e.title)}<span class="sr-only"> КОД</span></h1>${posterWordmark()}<div class="poster-details"><p class="poster-date">${esc(e.date)}</p><p class="poster-venue">${esc(e.venue)}</p></div></div>${posterFilmMarkup()}<div class="film-calligraphy" aria-hidden="true">${esc(e.title)}</div></div>`;},
 setup(){return `<div class="view team-selection"><div class="team-selection-grid scroll">${state.teams.map((t,i)=>`<div class="team-tile"><span class="team-index">${String(i+1).padStart(2,'0')}</span><input maxlength="120" aria-label="Название команды ${i+1}" value="${esc(t.name)}" data-team-name="${esc(t.id)}"><button class="team-remove" data-action="remove-team" data-id="${esc(t.id)}" aria-label="Удалить команду ${i+1}">×</button></div>`).join('')}</div><div class="selection-controls">${circle('+','add-team','aria-label="Добавить команду"',state.teams.length>=9)}${circle('→','stages','aria-label="Продолжить к этапам"',!state.teams.length)}</div></div>`;},
 stages(){return `<div class="view stage-sequence paper-stage-menu"><h2 class="sequence-heading">Этапы игры</h2><div class="sequence-list">${[['Разминка','warmup','warmup-book.png'],['Основная часть','board','main-globe.png']].map(([title,action,image],i)=>`<button style="--stage-index:${i}" class="sequence-item ${state.completedStages.includes(action)?'stage-completed':''}" data-action="${action}"><strong>${title}</strong><img src="assets/stage-objects/${image}" alt="" draggable="false"></button>`).join('')}</div></div>`;},
 rules(){return rulesView();},
 board(){return `<div class="view paper-block-menu"><h2>Основная часть</h2><div class="paper-block-list">${(D.rounds||[]).filter(r=>r.kind==='main').map(r=>`<button class="paper-block-card ${state.roundProgress[r.id]?.completed?'block-complete':''}" data-action="start-round" data-round="${r.id}"><span class="paper-block-number">${String(r.number).padStart(2,'0')}</span><h3>${esc(r.title)}</h3><img src="${esc(r.image)}" alt="" draggable="false">${state.roundProgress[r.id]?.completed?'<span class="paper-block-done" aria-label="Блок завершён"></span>':''}</button>`).join('')}</div></div>`;},
 paper(){return paperView();},
 question(){const q=qById(state.current.questionId);return q?questionView(q,state.current.answer):views.board();},
 warmup(){return questionView({...D.warmup[state.current.warmIndex],type:'warmup'},state.current.answer,'warmup');},
 bonus(){const q=D.bonuses[state.current.bonusIndex];if(!q)return views.stages();const key='social-'+state.bonusPhase,t=getTimer(key,state.bonusPhase==='prepare'?300:180);return `<div class="view"><div class="bonus-layout"><div class="scroll bonus-copy">${esc(q.text)}</div><div class="timer-panel"><button class="timer-digits" data-timer-display="${key}" data-action="timer-toggle" data-key="${key}" aria-label="${t.running?'Поставить таймер на паузу':'Запустить таймер'}">${timeText(remaining(t))}</button></div></div></div>`;},
 captains(){const q=D.captains[state.current.captainIndex];if(q)return questionView({...q,category:'Конкурс капитанов',value:100},state.current.answer,'captains');const t=getTimer('captains',60);return `<div class="view captain-canvas"><button class="timer-digits" data-timer-display="captains" data-action="timer-toggle" data-key="captains" aria-label="${t.running?'Поставить таймер на паузу':'Запустить таймер'}">${timeText(remaining(t))}</button></div>`;},
 ranking(){return `<div class="view intermission"><div class="intermission-heading"><p class="eyebrow">${state.intermission?'Промежуточные итоги':'Культурный код'}</p><h2>${state.intermission?({warmup:'Разминка',board:'Основная часть',bonus:'Творческое задание'}[state.intermission.after]):'Результаты'}</h2></div><div class="ranking scroll">${rankingRows()}</div><button class="results-continue" data-action="continue-results">Продолжить <span aria-hidden="true">→</span></button></div>`;},
 final(){return statisticsView();}
};

function beginRound(blockId){if(!paperRound(blockId))return;if(!state.rulesSeen){go('rules',{rulesNext:blockId});return;}paperStart(blockId);}
function rulesView(){
 const icons=[
 '<rect x="61" y="30" width="78" height="140" rx="16"/><path d="M87 44h26m-17 110h8M33 167 167 33"/>',
 '<rect x="28" y="53" width="82" height="110" rx="13"/><rect x="90" y="30" width="82" height="110" rx="13" fill="#efefeb"/><path d="M108 55h44m-44 20h44m-44 20h24M30 173 172 31"/>',
 '<circle cx="100" cy="104" r="66"/><path d="M84 19h32m-16 0v19m48 4 12 12"/><text x="100" y="124" text-anchor="middle" stroke="none" fill="currentColor" font-family="CodeDisplay, sans-serif" font-size="61">30</text>'
 ];
 return `<div class="view opening-rules"><p class="eyebrow">Культурный код</p><h1>Правила игры</h1><div class="opening-rule-list">${[['Без телефонов',''],['Не подсматриваем','У других команд'],['30 секунд на ответ','В основных блоках']].map(([title,note],i)=>`<article class="opening-rule"><svg class="rule-art" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[i]}</svg><h2>${title}</h2>${note?`<p>${note}</p>`:''}</article>`).join('')}</div><button class="btn rules-start" data-action="rules-start">Начать игру</button></div>`;
}
function paperStart(blockId,restart=false){
 const round=paperRound(blockId);if(!round)return;
 const previous=!restart?state.roundProgress[blockId]:null;
 const position=previous&&!previous.completed?previous:{phase:'intro',index:0};
 state.roundProgress[blockId]={...position,completed:false};paperPrepareClock(blockId,position.phase,position.index);state.pendingAward=null;state.intermission=null;
 go('paper',{blockId,paperPhase:position.phase,paperIndex:position.index,questionId:null});
}
function paperSet(phase,index){const blockId=state.current.blockId;state.roundProgress[blockId]={phase,index,completed:false};paperPrepareClock(blockId,phase,index,true);go('paper',{blockId,paperPhase:phase,paperIndex:index,questionId:null});}
function paperNext(){
 const c=state.current,round=paperRound(c.blockId),questions=paperQuestions(round);if(!questions.length)return;
 if(c.paperPhase==='intro'){paperSet('questions',0);return;}
 if(c.paperPhase==='questions'&&round.kind==='warmup'){paperSet('answers',c.paperIndex);return;}
 if(c.paperPhase==='questions'){paperSet(c.paperIndex+1<questions.length?'questions':'handoff',c.paperIndex+1<questions.length?c.paperIndex+1:0);return;}
 if(c.paperPhase==='handoff'){paperSet('answers',0);return;}
 if(c.paperPhase==='answers'&&c.paperIndex+1<questions.length){paperSet(round.kind==='warmup'?'questions':'answers',c.paperIndex+1);return;}
 state.roundProgress[c.blockId]={phase:'complete',index:questions.length-1,completed:true};
 if(round.kind==='warmup'){state.warmDone=questions.map((_,i)=>i);if(!state.completedStages.includes('warmup'))state.completedStages.push('warmup');}
 else{state.used=[...new Set([...state.used,...questions.map(q=>q.id)])];if((D.rounds||[]).filter(r=>r.kind==='main').every(r=>state.roundProgress[r.id]?.completed)&&!state.completedStages.includes('board'))state.completedStages.push('board');}
 save();if(round.kind==='warmup'){state.intermission={after:'warmup',next:'board'};go('ranking');}else if((D.rounds||[]).every(r=>state.roundProgress[r.id]?.completed)){state.intermission=null;go('final');}else go('home');
}
function paperBack(){const c=state.current;if(c.blockId==='warmup'){if(c.paperPhase==='answers')paperSet('questions',c.paperIndex);else if(c.paperPhase==='questions')paperSet(c.paperIndex?'answers':'intro',Math.max(0,c.paperIndex-1));else go('stages');return;}if(c.paperPhase==='questions'){if(c.paperIndex>0)paperSet('questions',c.paperIndex-1);else paperSet('intro',0);}else if(c.paperPhase==='answers'){if(c.paperIndex>0)paperSet('answers',c.paperIndex-1);}else if(c.paperPhase==='handoff'){paperSet('questions',paperQuestions(paperRound(c.blockId)).length-1);}else go(c.blockId==='warmup'?'stages':'board');}
function paperOpenQuestion(qid){const round=(D.rounds||[]).find(r=>r.questionIds.includes(qid));if(!round)return;paperStart(round.id);paperSet('questions',round.questionIds.indexOf(qid));}
function paperPrepareClock(blockId,phase,index,reset=false){
 if(blockId==='warmup'||!['questions','handoff'].includes(phase)){const t=state.timers.paper;if(t?.running){t.remaining=remaining(t);t.running=false;}if(t?.owner?.startsWith('warmup:'))delete state.timers.paper;return;}
 const owner=paperTimerOwner({screen:'paper',blockId,paperPhase:phase,paperIndex:index});let t=state.timers.paper;
 if(reset||!t||t.owner!==owner)t=state.timers.paper={owner,duration:30,remaining:30,running:false,deadline:0};
 if(phase==='handoff'&&!t.running){t.deadline=Date.now()+Math.max(.2,t.remaining)*1000;t.running=true;}
}
function paperClick(){if(state.current.blockId==='warmup'){paperNext();return;}if(state.current.paperPhase==='questions'){const t=state.timers.paper;if(t?.running)paperNext();else if(t)timerToggle('paper');}else if(state.current.paperPhase!=='handoff')paperNext();}
function paperClockMarkup(big=false){const t=getTimer('paper',30);return `<button class="paper-clock ${big?'paper-clock-big':''}" data-action="timer-toggle" data-key="paper" data-timer-display="paper" aria-label="${t.running?'Поставить таймер на паузу':'Запустить таймер'}">${timeText(remaining(t))}</button>`;}
function paperImage(q,a){const paths=a?(q.answerImages?.length?q.answerImages:q.images):(q.paperImages?.length?q.paperImages:q.images);return {...q,images:paths||[],imageDetails:q.paperImageDetails||(paths||[]).map(src=>({src,alt:q.type==='photo'?'Изображение для вопроса':'Историческая иллюстрация'}))};}
function paperView(){
 const c=state.current,round=paperRound(c.blockId),questions=paperQuestions(round);if(!round||!questions.length)return views.board();
 const intro=c.paperPhase==='intro',handoff=c.paperPhase==='handoff',answer=c.paperPhase==='answers',q=questions[c.paperIndex]||questions[0];
 if(intro)return `<div class="view paper-intro" data-action="advance" role="button" tabindex="0" aria-label="Начать ${esc(round.title)}"><div class="paper-intro-copy"><p class="eyebrow">${round.kind==='warmup'?'Разминка':`Блок ${String(round.number).padStart(2,'0')}`}</p><h1>${esc(round.title)}</h1><p class="paper-intro-count">${questions.length} вопросов${round.kind==='warmup'?' · по 100 баллов':''}</p><p class="paper-intro-note">${round.kind==='warmup'?'Без таймера · вопрос и ответ по клику':'Ответы — после сдачи бланков'}</p>${round.kind==='main'?`<div class="paper-scale" aria-label="Стоимость вопросов">${questions.map(x=>`<span>${x.value}</span>`).join('')}</div>`:''}</div><div class="paper-intro-art"><img src="${esc(round.image)}" alt="" draggable="false"></div></div>`;
 if(handoff)return `<div class="view paper-handoff"><p class="eyebrow">${esc(round.title)}</p><h1>Собираем<br>бланки</h1><p>Сдайте ответы ведущему</p>${paperClockMarkup(true)}</div>`;
 const content=questionView(paperImage(q,answer),answer,'paper');
 return `<div class="view paper-screen ${answer?'paper-answer-screen':''}"><header class="paper-bar"><span>${esc(round.title)}</span><span class="paper-counter">${answer?'Ответ':'Вопрос'} ${c.paperIndex+1}<small> / ${questions.length}</small></span>${!answer&&round.kind!=='warmup'?paperClockMarkup():''}<strong class="paper-value">${q.value} <span>баллов</span></strong></header><div class="paper-body">${content}</div><div class="paper-progress" aria-hidden="true">${questions.map((_,i)=>`<i class="${i<=c.paperIndex?'done':''}"></i>`).join('')}</div></div>`;
}
function animatePaperChronology(){
 const c=state.current;if(c.screen!=='paper'||c.paperPhase!=='answers'||reduceMotion())return;
 const q=paperQuestions(paperRound(c.blockId))[c.paperIndex];if(q?.type!=='chronology')return;
 const row=screen.querySelector('.chronology-cards');if(!row)return;
 [...row.children].forEach((el,i)=>{const original=q.events.findIndex(e=>e.label===el.dataset.event),dx=(original-i)*(el.offsetWidth+26);if(dx)el.animate([{transform:`translateX(${dx}px)`},{transform:'translateX(0)'}],{duration:850*MOTION_SCALE,easing:'cubic-bezier(.3,0,.18,1)'});});
}

function roundScore(teamId,roundId){return state.history.filter(h=>!h.undone&&!h.isUndo&&h.roundId===roundId).reduce((sum,h)=>sum+h.entries.filter(e=>e.teamId===teamId).reduce((n,e)=>n+e.delta,0),0);}
function statisticsView(){
 const rounds=D.rounds||[],completed=rounds.filter(r=>state.roundProgress[r.id]?.completed).length,teams=[...state.teams].sort((a,b)=>b.score-a.score);
 return `<div class="view statistics-view"><header><p class="eyebrow">Культурный код</p><h1>Статистика</h1><p>${completed} / ${rounds.length} блоков · 75 вопросов · максимум 34 500 баллов</p></header><div class="statistics-scroll scroll"><table class="statistics-table"><thead><tr><th>Команда</th>${rounds.map(r=>`<th>${esc(r.title)}</th>`).join('')}<th>Прочее</th><th>Всего</th></tr></thead><tbody>${teams.map(t=>{const values=rounds.map(r=>roundScore(t.id,r.id)),other=t.score-values.reduce((a,b)=>a+b,0);return `<tr><th>${esc(t.name)}</th>${values.map(n=>`<td>${n.toLocaleString('ru-RU')}</td>`).join('')}<td>${other.toLocaleString('ru-RU')}</td><td class="statistics-total">${t.score.toLocaleString('ru-RU')}</td></tr>`;}).join('')}</tbody></table></div><p class="statistics-note">Баллы по проверенным бланкам. Дополнения и корректировки — через меню команд.</p></div>`;
}
function rankingRows(){const ts=[...state.teams].sort((a,b)=>b.score-a.score);let place=0,last;return ts.length?ts.map((t,i)=>{if(t.score!==last)place=i+1;last=t.score;return `<div class="rank-row"><span class="place">${String(place).padStart(2,'0')}</span><span class="team-name">${esc(t.name)}</span><strong class="points">${t.score.toLocaleString('ru-RU')}</strong></div>`;}).join(''):'<div class="empty">Добавьте команды в панели ведущего.</div>';}
function teamEditors(){return state.teams.map(t=>`<div class="team-edit"><input maxlength="120" aria-label="Название команды" value="${esc(t.name)}" data-team-name="${esc(t.id)}"><input type="number" min="-1000000000" max="1000000000" aria-label="Баллы ${esc(t.name)}" value="${t.score}" data-team-score="${esc(t.id)}">${btn('×','remove-team','small',`data-id="${esc(t.id)}" aria-label="Удалить команду"`)}</div>`).join('')||'<div class="empty">Нажмите «Добавить команду» или загрузите названия из сценария.</div>';}
function mediaMarkup(q,images,a){const details=a?q.answerImageDetails:q.imageDetails;return `<div class="question-media ${images.length>2?'media-many':''}" style="--count:${images.length}">${images.map((src,i)=>{const detail=details?.find(x=>x.src===src);return `<button class="media-item" data-action="advance" aria-label="${state.current.screen==='paper'?(a?'Следующий ответ':'Следующий вопрос'):(a?'Продолжить':'Раскрыть ответ')}"><span class="media-visual"><img src="${esc(src)}" alt="${esc(detail?.alt||'Материал задания')}" draggable="false"></span></button>`;}).join('')}</div>`;}
function chronologyView(q,a){
 const events=a?[...q.events].sort((x,y)=>x.date.localeCompare(y.date)):q.events;
 const yearCounts=q.events.reduce((counts,e)=>(counts[e.date.slice(0,4)]=(counts[e.date.slice(0,4)]||0)+1,counts),{});
 const intro=q.text.split('\n\n')[0];
 return `<div class="view question-canvas chronology-canvas ${a?'answer-canvas':''}" data-answer="${a}" data-action="advance" role="button" tabindex="0" aria-label="${state.current.screen==='paper'?(a?'Следующий ответ':'Следующий вопрос'):(a?'Завершить вопрос':'Раскрыть правильный порядок')}"><h2 class="chronology-heading">${esc(intro)}</h2><div class="chronology-cards" data-question="${q.id}" data-answer="${a}" style="--event-count:${events.length};--row-width:${events.length===2?1180:events.length===3?1550:1720}px">${events.map(e=>{const day=yearCounts[e.date.slice(0,4)]>1&&e.date.length>4?new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(e.date+'T12:00:00Z')):'';return `<article class="chronology-card" data-event="${e.label}"><div class="chronology-image"><img src="${esc(e.image)}" alt="${esc(e.text)}" draggable="false"><span class="chronology-label">${esc(e.label)}</span></div><h3 class="chronology-event-title">${esc(e.text)}</h3><div class="chronology-date" ${a?'':'aria-hidden="true"'}>${a?`<strong>${esc(e.date.slice(0,4))}</strong>${day?`<span>${esc(day)}</span>`:''}`:''}</div></article>`;}).join('')}</div></div>`;
}
function questionView(q,a,mode='question'){
 if(q.type==='chronology')return chronologyView(q,a);
 const images=a?(q.answerImages?.length?q.answerImages:(q.type==='map'?q.images:[])):q.images||[],txt=a?(q.answer?.trim()||'В исходных материалах нет ответа.'):(q.text||''),video=q.video||sessionVideos.get(q.id),hasMedia=images.length||(!a&&video);
 const progress=mode==='warmup'?`<div class="warm-progress" aria-label="${state.current.warmIndex+1} из ${D.warmup.length}">${D.warmup.map((_,j)=>`<i class="${j<=state.current.warmIndex?'done':''}"></i>`).join('')}</div>`:'';
 return `<div class="view question-canvas ${mode==='warmup'?'warm-question-canvas':''} ${q.type==='photo'&&!q.sourceSlide?'photo-canvas':q.type==='chronology'?'chronology-canvas':''} ${a?'answer-canvas':''}" data-answer="${a}" data-action="advance" role="button" tabindex="0" aria-label="${mode==='paper'?(a?'Следующий ответ':'Следующий вопрос'):(a?(mode==='warmup'?'Следующий вопрос':'Вернуться ктаблице'):'Раскрыть ответ')}">${q.type==='matching'?`<div class="matching-answer-layout ${hasMedia&&(a||mode==='paper')?'has-media':''}"><div class="matching-copy">${matching(q,a)}</div>${hasMedia&&(a||mode==='paper')?mediaMarkup(q,images,a):''}</div>`:`<div class="question-body ${hasMedia?'has-media':''}"><div class="question-text ${a?'answer':''} ${(txt.length>330||txt.split('\n').length>7||(a&&hasMedia&&txt.length>200))?'long':(txt.length>160||(hasMedia&&txt.length>100))?'medium':''}">${esc(txt)}</div>${hasMedia?(!a&&video?`<div class="question-media"><video controls playsinline preload="metadata" ${q.images?.[0]?`poster="${esc(q.images[0])}"`:''} src="${esc(video)}"></video></div>`:mediaMarkup(q,images,a)):''}</div>`}${progress}</div>`;
}

function matching(q,a){const columns=q.columns||[],letters=['А','Б','В','Г','Д','Е','Ж'];if(a){const rows=columns[0].map((text,i)=>{const left=text.replace(/^[AАБВГ]\)\s*/,''),right=columns[1][q.matches[i]].replace(/^(?:\d+|[АБВГДЕЖ])\)\s*/,'');return `<div class="match-answer-row"><span>${esc(left)}</span><b>—</b><strong>${esc(right)}</strong></div>`;}).join('');return `<div class="match-answer-key">${esc(q.answer)}</div><div class="match-answers scroll ${columns[0].length>4?'dense':''}" role="status">${rows}</div>`;}return `<div class="match-title">${esc(q.text)}</div><div class="matching ${columns[0].length>4?'dense':''}"><div class="matching-column">${columns[0].map((text,i)=>`<div class="match-item"><strong>${q.sourceSlide===9?letters[i]:i+1}</strong><span>${esc(text.replace(/^[AАБВГ]\)\s*/,''))}</span></div>`).join('')}</div><div class="matching-column">${columns[1].map(text=>`<div class="match-item"><span>${esc(text)}</span></div>`).join('')}</div></div>`;}
function getTimer(key,duration=300){return state.timers[key]||(state.timers[key]={duration,remaining:duration,running:false,deadline:0});}
function remaining(t){return t.running?Math.max(0,(t.deadline-Date.now())/1000):t.remaining;}
function timeText(sec){sec=Math.max(0,Math.ceil(sec));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
function timerMarkup(key,seconds){const t=getTimer(key,seconds);return `<div class="timer-digits" data-timer-display="${key}" role="timer" aria-label="Оставшееся время">${timeText(remaining(t))}</div><div class="row">${btn(t.running?'Пауза':'Старт','timer-toggle','primary',`data-key="${key}"`)}${btn('Сброс','timer-reset','',`data-key="${key}"`)}</div>`;}
function readTimerDuration(key){if(key!=='captains')return;const input=document.querySelector('[data-setting="captain-duration"]');if(!input)return;const n=Number(input.value),t=getTimer(key);if(Number.isInteger(n)&&n>=1&&n<=86400&&n!==t.duration){t.duration=n;t.remaining=n;t.running=false;}}
function timerToggle(key){readTimerDuration(key);const t=getTimer(key);if(t.running){t.remaining=remaining(t);t.running=false;}else{if(t.remaining<=0)t.remaining=t.duration;t.deadline=Date.now()+t.remaining*1000;t.running=true;}save();refreshTimerButtons();updateTimerUI();}
function timerReset(key){readTimerDuration(key);const t=getTimer(key);t.running=false;t.remaining=t.duration;t.deadline=0;save();refreshTimerButtons();updateTimerUI();}
function refreshTimerButtons(){document.querySelectorAll('[data-action="timer-toggle"]').forEach(el=>{const running=getTimer(el.dataset.key).running;if(el.hasAttribute('data-timer-display'))el.setAttribute('aria-label',running?'Поставить таймер на паузу':'Запустить таймер');else el.textContent=running?'Пауза':'Старт';});}
function digitFace(value){return `<span class="digit-face">${esc(value)}</span>`;}
function resetDigit(slot,value){slot.classList.remove('rolling');slot.innerHTML=`<span class="digit-track">${digitFace(value)}</span>`;}
function paintTimer(el,text,animate=false){const previous=el.dataset.timerValue;let wheels=el.querySelector('.timer-wheels');if(!wheels||previous===undefined||previous.length!==text.length){el.innerHTML=`<span class="timer-screenreader">${esc(text)}</span><span class="timer-wheels" aria-hidden="true">${[...text].map(value=>value===':'?'<span class="timer-separator">:</span>':`<span class="timer-slot" data-digit="${value}"><span class="digit-track">${digitFace(value)}</span></span>`).join('')}</span>`;el.dataset.timerValue=text;return;}if(previous===text)return;el.dataset.timerValue=text;el.querySelector('.timer-screenreader').textContent=text;const reduce=state.settings.reduced||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;[...wheels.children].forEach((slot,i)=>{if(text[i]===':'||previous[i]===text[i])return;slot.dataset.digit=text[i];if(!animate||reduce){resetDigit(slot,text[i]);return;}slot.classList.remove('rolling');slot.innerHTML=`<span class="digit-track">${digitFace(previous[i])}${digitFace(text[i])}</span>`;void slot.offsetWidth;slot.classList.add('rolling');});}
document.addEventListener('animationend',e=>{if(e.animationName!=='digits-roll')return;const slot=e.target.closest('.timer-slot');if(slot)resetDigit(slot,slot.dataset.digit);});
function updateTimerUI(){for(const [key,t] of Object.entries(state.timers)){const r=remaining(t),wasRunning=t.running;if(t.running&&r<=0){t.running=false;t.remaining=0;save();refreshTimerButtons();toast('Время вышло');if(state.settings.timerSound)beep();if(key==='paper'&&t.owner===paperTimerOwner(state.current)){paperNext();return;}}document.querySelectorAll(`[data-timer-display="${key}"]`).forEach(el=>{paintTimer(el,timeText(r),wasRunning);el.classList.toggle('timer-urgent',t.running&&r>0&&r<=10);el.classList.toggle('expired',r<=0);});}flowUI?.tick();}
let audioContext;
function beep(){try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.connect(g);g.connect(audioContext.destination);g.gain.value=.12;o.frequency.value=660;o.start();o.stop(audioContext.currentTime+.5);}catch(e){}}
function currentTimerKey(){if(paperTimerOwner(state.current))return 'paper';if(state.current.screen==='bonus')return 'social-'+state.bonusPhase;if(state.current.screen==='captains')return 'captains';return 'general';}
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',()=>{applySettings();if(state.current.screen==='home')startPosterTour();});
setInterval(updateTimerUI,200);
function record(entries,reason,isUndo=false,task=null,roundId=null){if(!entries.length)return false;if(state.history.length>=10000){toast('История заполнена. Экспортируйте игру и начните новую сессию.');return false;}if(entries.some(e=>{const t=state.teams.find(t=>t.id===e.teamId);return !t||!Number.isSafeInteger(t.score+e.delta)||Math.abs(t.score+e.delta)>1e9;})){toast('Счёт должен оставаться в пределах ±1 000 000 000.');return false;}for(const e of entries)state.teams.find(t=>t.id===e.teamId).score+=e.delta;state.history.push({id:id(),time:new Date().toISOString(),reason,entries,undone:false,isUndo,taskKey:task,roundId:paperRound(roundId)?roundId:null});save();renderScores();return true;}
function undo(){if(state.flow&&flowUI){flowUI.undo();return;}const h=[...state.history].reverse().find(h=>!h.undone&&!h.isUndo&&h.entries.some(e=>state.teams.some(t=>t.id===e.teamId)));if(!h){toast('Нет начислений для отмены');return;}const entries=h.entries.filter(e=>state.teams.some(t=>t.id===e.teamId)).map(e=>({...e,delta:-e.delta}));if(!entries.length){toast('Команды этого начисления удалены');return;}if(record(entries,'Отмена: '+h.reason,true)){h.undone=true;save();toast('Последнее начисление отменено');if(modal?.kind==='manager')openManager(modal.tab);else render();}}
let quickMotion=null;
const reduceMotion=()=>state.settings.reduced||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function cancelQuickMotion(){const active=quickMotion;quickMotion=null;active?.animations.forEach(a=>a.cancel());}
function openModal(title,html,cls='',kind='custom'){
 if(!modal&&!overlay.querySelector('.quick-dialog'))lastFocus=document.activeElement;
 cancelQuickMotion();stage.classList.remove('quick-menu-open','quick-menu-closing');$('#operator-dot')?.setAttribute('aria-expanded','false');
 modal={kind,...(typeof kind==='object'?kind:{})};overlay.classList.remove('quick-mode','menu-opening','menu-closing');overlay.hidden=false;
 overlay.innerHTML=`<section class="dialog ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="dialog-head"><h2>${esc(title)}</h2>${btn(cls.includes('flow-')?'×':'Закрыть ×','close','small','aria-label="Закрыть"')}</div><div class="dialog-content">${html}</div></section>`;
 const dialog=overlay.firstElementChild;setTimeout(()=>{if(overlay.firstElementChild===dialog&&modal)overlay.querySelector('button:not(:disabled),input,select')?.focus({preventScroll:true});},0);
}
function morphQuick(dialog,opening,done){
 const content=dialog.querySelector('.dialog-content'),currentClip=getComputedStyle(dialog).clipPath,currentOpacity=getComputedStyle(content).opacity;
 cancelQuickMotion();
 if(reduceMotion()||!dialog.animate){dialog.style.clipPath='';done();return;}
 const circle=`inset(${Math.max(0,dialog.offsetHeight-64)}px 0px 0px ${dialog.offsetWidth-64}px round 32px)`,expanded='inset(0px 0px 0px 0px round 28px)';
 const shell=dialog.animate([{clipPath:currentClip==='none'?(opening?circle:expanded):currentClip},{clipPath:opening?expanded:circle}],{duration:(opening?620:360)*MOTION_SCALE,easing:opening?'cubic-bezier(.2,.8,.2,1)':'cubic-bezier(.4,0,.2,1)',fill:'both'});
 const copy=content.animate(opening?[{opacity:currentClip==='none'?0:currentOpacity,translate:currentClip==='none'?'0 9px':getComputedStyle(content).translate},{opacity:1,translate:'0 0'}]:[{opacity:currentOpacity},{opacity:0}],{duration:(opening?300:140)*MOTION_SCALE,delay:(opening?170:0)*MOTION_SCALE,easing:'ease',fill:'both'});
 const token={animations:[shell,copy]};quickMotion=token;
 Promise.all(token.animations.map(a=>a.finished)).then(()=>{if(quickMotion!==token||!dialog.isConnected)return;quickMotion=null;token.animations.forEach(a=>a.cancel());done();}).catch(()=>{});
}
function closeModal(restore=true){
 const wasQuick=overlay.classList.contains('quick-mode'),old=overlay.firstElementChild;modal=null;$('#operator-dot')?.setAttribute('aria-expanded','false');
 const clear=()=>{if(overlay.firstElementChild!==old)return;cancelQuickMotion();stage.classList.remove('quick-menu-open','quick-menu-closing');overlay.classList.remove('quick-mode','menu-opening','menu-closing');overlay.hidden=true;overlay.innerHTML='';if(restore&&lastFocus?.isConnected)lastFocus.focus({preventScroll:true});};
 if(wasQuick&&old){overlay.classList.remove('menu-opening');overlay.classList.add('menu-closing');stage.classList.add('quick-menu-closing');morphQuick(old,false,clear);}else clear();
}
function confirmAction(title,message,onConfirm){openModal(title,`<p>${esc(message)}</p><div class="actions">${btn('Отмена','close','')}${btn('Подтвердить','confirm','primary')}</div>`,'confirm-box','confirm');modal.onConfirm=onConfirm;}
const tabs=[['navigate','Этапы'],['teams','Команды'],['scores','Баллы'],['history','История'],['questions','Вопросы'],['session','Сохранение'],['settings','Настройки']];
function openManager(tab='navigate'){if(state.flow&&flowUI&&['navigate','teams','scores'].includes(tab)){flowUI.manager(tab);return;}const content=managerContent(tab);openModal('Панель ведущего',`<nav class="dialog-tabs" aria-label="Разделы панели">${tabs.map(([k,t])=>btn(t,'manager-tab',`small ${tab===k?'active':''}`,`data-tab="${k}"`)).join('')}</nav>${content}`,'','manager');modal.tab=tab;}
function managerContent(tab){if(tab==='navigate'){const k=currentTimerKey();return `<div class="actions" style="margin-bottom:20px">${btn('Команды','setup','small')}${btn('Обложка','home','small')}${btn('Назад','presenter-back','small')}${btn('Продолжить','presenter-next','small')}${btn('Полный экран','fullscreen','small')}${btn('Увеличить материалы','zoom-current','small','',!['question','warmup','paper'].includes(state.current.screen))}${btn('Цифровая клавиатура','show-keypad','small')}${btn('Снять выбор команды','clear-selection','small')}${btn('Отменить начисление','quiet-undo','small')}</div><div id="keypad-slot" hidden><input type="tel" inputmode="numeric" pattern="[1-9]" maxlength="1" id="score-keyboard" autocomplete="off" aria-label="Номер команды от 1 до 9" placeholder="1–9"></div><div class="panel-grid">${[['Разминка','warmup'],['Шесть блоков','board'],['Бонусный раунд','bonus'],['Конкурс капитанов','captains'],['Правила','rules'],['Статистика','final']].map(([t,a])=>btn(t,a,'')).join('')}</div><div class="rule"></div><div class="row">${btn('Показать / скрыть ответ','manager-answer','', '',!['question','warmup','captains'].includes(state.current.screen))}${btn('К блокам','board','primary')}${state.current.screen==='paper'?btn('Следующий экран без ожидания','paper-skip','small')+btn('Начать блок заново','restart-round','small'):''}</div><div class="rule"></div><div class="timer-mini"><span class="note">Таймер текущего этапа</span><strong data-timer-display="${k}">${timeText(remaining(getTimer(k,300)))}</strong>${btn(getTimer(k).running?'Пауза':'Старт','timer-toggle','small',`data-key="${k}"`)}${btn('Сброс','timer-reset','small',`data-key="${k}"`)}</div>${state.current.screen==='bonus'?`<div class="actions" style="margin-top:20px">${btn('Подготовка · 5 минут','timer-phase','small','data-phase="prepare"')}${btn('Защита · 3 минуты','timer-phase','small','data-phase="defend"')}</div>`:''}${state.current.screen==='captains'?`<label class="field" style="margin-top:20px">Длительность таймера, секунд<input type="number" min="1" max="86400" data-setting="captain-duration" value="${getTimer('captains',60).duration}"></label>`:''}`;}
 if(tab==='teams')return `<p class="note" style="margin-bottom:20px">Изменения сохраняются при выходе из поля. Начальный счёт тоже записывается в историю.</p><div class="setup-list">${teamEditors()}</div><div class="actions" style="margin-top:24px">${btn('+ Добавить команду','add-team','primary','',state.teams.length>=9)}${btn('Команды из сценария','preset-teams','')}</div>`;
 if(tab==='scores')return `<div class="panel-grid">${btn('Начислить','score','primary')}${btn('Корректировка','manual-score','')}${btn('Отменить','undo','')}</div><div class="rule"></div>${rankingRows()}`;
 if(tab==='history')return `<div class="row" style="margin-bottom:24px">${btn('Отменить последнее начисление','undo','small')}${btn('Сохранить игру в файл','export','small')}<span class="note">${state.history.length} записей</span></div>${historyMarkup()}`;
 if(tab==='questions')return `<p class="note" style="margin-bottom:22px">Откройте вопрос в последовательном блоке. В обычном показе ответы доступны только после всех вопросов и сбора бланков. Счёт вводится вручную по проверенным бланкам.</p><div class="restore-grid">${D.questions.map(q=>`<div class="restore-row"><span>${esc(q.category)} · <b>${q.value}</b><br><small class="muted">${esc(questionOrigin(q))}${!q.enabled?' · '+esc(q.status==='placeholder'?'заглушка':sessionVideos.has(q.id)?'видео подключено до закрытия страницы':'нет видео'):''}</small></span><div class="controls">${q.enabled||sessionVideos.has(q.id)?btn('Открыть','admin-open','small',`data-id="${q.id}"`):btn('Материалы','inspect','small',`data-id="${q.id}"`)}${state.used.includes(q.id)?btn('↺','restore','small',`data-id="${q.id}" aria-label="Восстановить вопрос"`):''}</div></div>`).join('')}</div><div class="rule"></div>${btn('Материалы без условий задания','orphans','small')}<div class="rule"></div><h3 style="margin-bottom:20px">Вопросы разминки</h3><div class="panel-grid">${D.warmup.map((q,i)=>btn('Разминка '+(i+1),'open-warm','small',`data-index="${i}"`)).join('')}</div>`;
 if(tab==='session')return `<div class="panel-grid">${btn('Сохранить игру в файл','export','primary')}${btn('Загрузить игру из файла','import','')}${btn('Сбросить прогресс','reset','danger')}</div><div class="rule"></div><p>Автосохранение: ${storageOK?'доступно в этом браузере':'недоступно. Сохраняйте игру в файл'}. Для переноса между компьютерами экспортируйте JSON.</p><p style="margin-top:20px">Загрузка файла заменяет текущую сессию после подтверждения. Перед сбросом сохраните результаты.</p><div class="rule"></div><label class="field">Резервный импорт: вставьте текст JSON<textarea id="import-text" rows="3" spellcheck="false" placeholder="Текст сохранённой игры"></textarea></label><div class="actions" style="margin-top:18px">${btn('Загрузить JSON из текста','import-text','small')}</div>`;
 if(tab==='settings')return `<a class="photo-credits-link" href="credits.html" target="_blank" rel="noopener">Источники фото ↗</a> <a class="photo-credits-link" href="design/answer-sheets.pdf" target="_blank" rel="noopener">Бланки PDF ↗</a> <a class="photo-credits-link" href="design/host-answer-key.html" target="_blank" rel="noopener">Ключ ведущего ↗</a><div class="settings-grid">${[['contrast','Высокий контраст для проектора'],['large','Крупнее текст вопросов'],['reduced','Уменьшить анимацию'],['timerSound','Звук окончания таймера']].map(([k,t])=>`<label class="score-check"><input type="checkbox" data-preference="${k}" ${state.settings[k]?'checked':''}>${t}</label>`).join('')}</div><div class="rule"></div><p class="note">Клик, пробел и → ведут вперёд, ← возвращает назад. В разминке нет таймера: вопрос → ответ. Команда получает 100 баллов через круглое меню или свою цифру 1–9. Основные вопросы: первый клик запускает 30 секунд, следующий клик или ноль таймера — следующий вопрос. Сдачу бланков можно пропустить кликом. После всех блоков отметьте правильные ответы каждой команды через круглую кнопку на экране подсчёта. Творческое задание и капитаны оцениваются вручную. U — отмена баллов, F — полный экран, M — управление.</p><p class="note" style="margin-top:20px">В вертикальном окне сцена поворачивается средствами CSS на 90°. Блокировка ориентации и Fullscreen API зависят от браузера. В Safari на iPhone эти возможности могут быть недоступны.</p>`;return '';}
function historyMarkup(){return state.history.length?`<table class="history-table"><thead><tr><th>ВРЕМЯ</th><th>ОСНОВАНИЕ</th><th>КОМАНДЫ И БАЛЛЫ</th></tr></thead><tbody>${[...state.history].reverse().map(h=>`<tr class="${h.undone?'undone':''}"><td>${esc(new Date(h.time).toLocaleTimeString('ru-RU'))}</td><td>${esc(h.reason)}${h.undone?' · отменено':''}</td><td>${h.entries.map(e=>`${esc(e.teamName)}: ${e.delta>0?'+':''}${e.delta}`).join('<br>')}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">История пуста. Здесь появятся все изменения счёта.</div>';}
function scoreDefaults(){const c=state.current;if(c.screen==='paper'||['home','ranking','final'].includes(c.screen)&&paperRound(c.blockId))return {amount:0,reason:'Бланки · '+(paperRound(c.blockId)?.title||'блок'),roundId:c.blockId};if(c.screen==='warmup')return {amount:10,reason:`Разминка ${c.warmIndex+1}`};if(c.screen==='bonus')return {amount:200,reason:D.bonuses[c.bonusIndex].title};if(c.screen==='captains')return {amount:100,reason:'Конкурс капитанов'};if(c.screen==='question'){const q=qById(c.questionId),value=q.legacyValue??q.value;return {amount:value,reason:Number.isInteger(q.sourceSlide)?`${q.category} · ${value} · слайд ${q.sourceSlide}`:`${q.category} · ${value}`};}return {amount:0,reason:'Ручное изменение счёта'};}
function openScore(teamId=null,manual=false){if(state.flow&&flowUI){flowUI.manager('scores');return;}scoreContext=manual?{amount:0,reason:'Ручное изменение счёта',taskKey:null}:{...scoreDefaults(),taskKey:taskKey()};openModal('Начисление баллов',`<form id="score-form"><div class="score-form"><div class="score-checks">${state.teams.map(t=>`<label class="score-check"><input name="teams" type="checkbox" value="${esc(t.id)}" ${t.id===teamId?'checked':''}><span>${esc(t.name)}</span><span class="team-score">${t.score}</span></label>`).join('')||'<p>Сначала добавьте команды в панели ведущего.</p>'}</div><div class="score-fields"><label class="field">Баллы<input id="score-amount" type="number" step="1" min="-1000000" max="1000000" value="${scoreContext.amount}" required></label><label class="field">Блок<select id="score-round"><option value="">Общий счёт / корректировка</option>${(D.rounds||[]).map(r=>`<option value="${r.id}" ${scoreContext.roundId===r.id?'selected':''}>${esc(r.title)}</option>`).join('')}</select></label><label class="field">Основание<input id="score-reason" maxlength="300" value="${esc(scoreContext.reason)}" required></label><div class="actions"><button type="submit" class="btn primary" ${!state.teams.length?'disabled':''}>Применить</button>${btn('Отмена','close','')}</div></div></div></form>`,'','score');}
function exportGame(){save();const payload={...saved,exportedAt:new Date().toISOString(),application:'Культурный код'};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cultural-code-save-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);toast('Файл игры подготовлен для сохранения');}
function resetGame(){confirmAction('Сбросить игру?','Будут удалены команды, баллы, история и статусы вопросов. Сначала сохраните игру в файл через раздел «Сохранение».',()=>{state=fresh();saved=null;resumeCurrent=null;try{localStorage.removeItem(KEY);}catch(e){}closeModal();render();toast('Прогресс сброшен');});}
function startNew(){const start=()=>{state=fresh();resumeCurrent=null;state.started=true;flowUI.enter();};if(saved?.started)confirmAction('Начать новую игру?','Это заменит текущую сессию. При необходимости сначала сохраните её в файл через панель ведущего.',start);else start();}
function addTeam(){if(state.teams.length>=9)return;state.teams.push({id:id(),name:'Команда '+(state.teams.length+1),score:0});save();refreshTeamView();}
function refreshTeamView(){render();if(modal?.kind==='manager')openManager('teams');}
function openQuestion(qid,admin=false){const q=qById(qid);if(!q||(!q.enabled&&!sessionVideos.has(q.id))||(!admin&&state.used.includes(qid)))return;go('question',{questionId:qid});}
function toggleAnswer(){if(!['question','warmup','captains'].includes(state.current.screen))return;if(state.current.screen==='captains'&&!D.captains.length)return;state.current.answer=!state.current.answer;save();render();}
function step(delta){const c=state.current;if(c.screen==='warmup'){if(delta>0&&!commitSelection())return;if(delta<0)state.pendingAward=null;if(delta>0&&!state.warmDone.includes(c.warmIndex))state.warmDone.push(c.warmIndex);c.warmIndex=Math.min(D.warmup.length-1,Math.max(0,c.warmIndex+delta));c.answer=false;if(state.pendingAward?.taskKey!==taskKey())state.pendingAward=null;save();render();}else if(c.screen==='captains'&&D.captains.length){if(delta>0&&!commitSelection())return;if(delta<0)state.pendingAward=null;c.captainIndex=Math.min(D.captains.length-1,Math.max(0,c.captainIndex+delta));c.answer=false;if(state.pendingAward?.taskKey!==taskKey())state.pendingAward=null;save();render();}}
function back(){if(modal){closeModal();return;}if(state.current.screen==='flow'){flowUI.back();return;}if(state.current.screen==='paper'){paperBack();return;}if(state.current.screen==='question')go('board');else if(['stages','setup'].includes(state.current.screen))go('home');else if(state.current.screen!=='home')go('stages');}
function inspect(qid){const q=qById(qid);openModal('Материалы исходного задания',`<p>${esc(q.category)} · ${q.value} · слайды ${q.sourceSlide}/${q.answerSlide}</p><div class="alert">${esc(q.unavailableReason)}</div><p>${esc(q.text)}</p>${q.images.map(src=>`<img style="height:270px;max-width:100%;object-fit:contain;margin-top:20px" src="${esc(src)}" alt="Сохранённый кадр-превью">`).join('')}<div class="rule"></div><p>Исходный ответ: ${esc(q.answer)}</p>${q.status==='missing-video'?`<div class="actions" style="margin-top:25px">${btn('Подключить оригинальное видео','attach-video','primary',`data-id="${q.id}"`)}</div><p class="note" style="margin-top:18px">Файл подключается до закрытия страницы. Для постоянного подключения поместите ролик в assets/videos и укажите путь в quiz-data.js.</p>`:''}`,'','inspect');}
let lastAdvance=0;
let dotFeedbackHandle;
function flashDot(number=null){const dot=$('#operator-dot');if(!dot)return;clearTimeout(dotFeedbackHandle);dot.classList.remove('ack','number-feedback');const mark=dot.querySelector('span');mark.textContent=number===null?'':String(number);void dot.offsetWidth;dot.classList.add(number===null?'ack':'number-feedback');dotFeedbackHandle=setTimeout(()=>{dot.classList.remove('ack','number-feedback');mark.textContent='';},(number===null?240:1050)*MOTION_SCALE);}
function alreadyAwarded(key=taskKey()){return !!key&&state.history.some(h=>h.taskKey===key&&!h.undone&&!h.isUndo);}
function selectTeam(index,keepOpen=false){const t=state.teams[index],key=taskKey();if(!t||!key||scoreDefaults().amount<=0||alreadyAwarded(key))return;if(state.pendingAward?.taskKey!==key||state.pendingAward.teamId!==t.id){state.pendingAward={taskKey:key,teamId:t.id};save();}if(!keepOpen)closeModal(false);else refreshSelection();flashDot(index+1);}
function refreshSelection(){const key=taskKey(),selected=state.pendingAward?.taskKey===key?state.pendingAward.teamId:null;overlay.querySelectorAll('[data-action="select-team"]').forEach(el=>{const t=state.teams[Number(el.dataset.index)],active=t?.id===selected;el.classList.toggle('selected-team',active);el.setAttribute('aria-pressed',String(active));});const status=$('#selection-status');if(status){const t=state.teams.find(t=>t.id===selected);status.textContent=scoreDefaults().amount<=0?'На этом экране выбор команды не требуется':alreadyAwarded(key)?'Баллы за это задание уже начислены':t?`${t.name} · +${scoreDefaults().amount} при переходе дальше`:'Выберите команду — баллы начислятся при переходе дальше';}const undoButton=overlay.querySelector('[data-action="quiet-undo"]');if(undoButton)undoButton.disabled=!state.history.some(h=>!h.undone&&!h.isUndo&&h.entries.some(e=>state.teams.some(t=>t.id===e.teamId)));}
function commitSelection(){const key=taskKey(),pending=state.pendingAward;if(!pending||pending.taskKey!==key)return true;if(alreadyAwarded(key)){state.pendingAward=null;save();return true;}const t=state.teams.find(t=>t.id===pending.teamId),context=scoreDefaults();if(!t||context.amount<=0){state.pendingAward=null;save();return true;}if(!record([{teamId:t.id,teamName:t.name,delta:context.amount}],context.reason,false,key))return false;state.pendingAward=null;save();return true;}
function clearSelection(){state.pendingAward=null;save();refreshSelection();}
function zoomCurrent(){const q=state.current.screen==='paper'?paperQuestions(paperRound(state.current.blockId))[state.current.paperIndex]:state.current.screen==='question'?qById(state.current.questionId):state.current.screen==='warmup'?D.warmup[state.current.warmIndex]:null;if(!q)return;const answer=state.current.screen==='paper'?state.current.paperPhase==='answers':state.current.answer,images=answer?(q.answerImages?.length?q.answerImages:q.images):(q.paperImages?.length&&state.current.screen==='paper'?q.paperImages:q.images);if(!images?.length)return;openModal('',`<div class="operator-gallery">${images.map((src,i)=>`<button class="media-item" data-action="zoom" data-src="${esc(src)}" aria-label="Увеличить изображение ${i+1}"><img src="${esc(src)}" alt="Материал задания"></button>`).join('')}</div>`,'lightbox','gallery');}
function quietUndo(){if(state.flow&&flowUI){flowUI.undo();return;}const h=[...state.history].reverse().find(h=>!h.undone&&!h.isUndo&&h.entries.some(e=>state.teams.some(t=>t.id===e.teamId)));if(!h)return;const entries=h.entries.filter(e=>state.teams.some(t=>t.id===e.teamId)).map(e=>({...e,delta:-e.delta}));if(entries.length&&record(entries,'Отмена: '+h.reason,true)){h.undone=true;save();flashDot();if(modal?.kind==='quick')refreshSelection();else if(modal?.kind==='manager')openManager(modal.tab);}}
function quickIcon(name){const paths={
 home:'<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
 cover:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.3"/><path d="m4 17 5-5 4 4 3-3 5 5"/>',
 undo:'<path d="m8 4-5 5 5 5M3 9h10a6 6 0 0 1 0 12"/>',
 more:'<g fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></g>'
 };return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
function openQuickMenu(){if(state.flow&&flowUI){flowUI.operator();return;}
 if(modal?.kind==='quick'){closeModal();return;}
 // Reverse an interrupted exit from its current outline instead of restarting at a circle.
 const exiting=overlay.classList.contains('menu-closing')&&overlay.querySelector('.quick-dialog');
 if(exiting){modal={kind:'quick'};overlay.classList.remove('menu-closing');overlay.classList.add('menu-opening');stage.classList.remove('quick-menu-closing');$('#operator-dot').setAttribute('aria-expanded','true');refreshSelection();morphQuick(exiting,true,()=>overlay.classList.remove('menu-opening'));return;}
 const cost=scoreDefaults().amount,locked=alreadyAwarded(),paperManual=state.current.screen==='paper'||['home','ranking','final'].includes(state.current.screen)&&Object.values(state.roundProgress||{}).some(r=>r.completed);
 openModal('Управление квизом',`<div class="quick-teams">${state.teams.map((t,i)=>`<button class="quick-team" data-action="${paperManual?'paper-score-team':'select-team'}" data-index="${i}" ${!paperManual&&(cost<=0||locked)?'disabled':''} aria-pressed="false"><span class="quick-name">${esc(t.name)}</span><span class="quick-selected" aria-hidden="true"></span></button>`).join('')}</div><p id="selection-status" class="sr-only" role="status"></p><nav class="quick-nav" aria-label="Управление">${[['home','stages','Домой — этапы квиза'],['cover','home','Заставка'],['undo','quiet-undo','Отменить последнее начисление'],['more','manager','Подробное меню']].map(([icon,action,label])=>`<button class="quick-icon" data-action="${action}" aria-label="${label}">${quickIcon(icon)}</button>`).join('')}</nav>`,'quick-dialog','quick');
 overlay.classList.add('quick-mode','menu-opening');stage.classList.add('quick-menu-open');$('#operator-dot')?.setAttribute('aria-expanded','true');refreshSelection();
 morphQuick(overlay.firstElementChild,true,()=>overlay.classList.remove('menu-opening'));
}
function advance(){if(state.current.screen==='flow'){flowUI.next();return;}if(Date.now()-lastAdvance<300)return;lastAdvance=Date.now();const c=state.current;
 if(c.screen==='paper'){paperClick();return;}
 if(c.screen==='home'){teamStart();return;}
 if(c.screen==='question'){if(!c.answer)toggleAnswer();else actions['finish-question']();return;}
 if(c.screen==='warmup'){if(!c.answer)toggleAnswer();else if(c.warmIndex===D.warmup.length-1){if(!commitSelection())return;if(!state.warmDone.includes(c.warmIndex))state.warmDone.push(c.warmIndex);finishStage('warmup','board');}else step(1);return;}
 if(c.screen==='captains'&&D.captains.length){if(!c.answer)toggleAnswer();else if(c.captainIndex===D.captains.length-1){if(commitSelection())finishStage('captains');}else step(1);return;}
}
function presenterNext(){if(state.current.screen==='flow'){closeModal(false);flowUI.next('keyboard');return;}const c=state.current;closeModal(false);if(c.screen==='setup'){commitTeamEdits();go('stages');}else if(c.screen==='stages')beginRound('warmup');else if(c.screen==='rules')actions['rules-start']();else if(c.screen==='paper')advance();else if(['home','warmup','question'].includes(c.screen)||(c.screen==='captains'&&D.captains.length))advance();else if(c.screen==='board'){const next=(D.rounds||[]).find(r=>r.kind==='main'&&!state.roundProgress[r.id]?.completed);if(next)beginRound(next.id);}else if(c.screen==='bonus'){if(commitSelection())finishStage('bonus','captains');}else if(c.screen==='captains'){if(commitSelection())finishStage('captains');}else if(c.screen==='ranking')continueAfterResults();else go('stages');}
const actions={
 'paper-skip':()=>{closeModal(false);if(state.current.screen==='paper')paperNext();},'rules-start':()=>{const next=state.current.rulesNext;state.rulesSeen=true;if(paperRound(next))paperStart(next);else go('stages');},'start-round':el=>beginRound(el.dataset.round),'restart-round':()=>{if(state.current.screen==='paper')paperStart(state.current.blockId,true);},'enter-cover':teamStart,'continue-results':continueAfterResults,advance,'quick-menu':openQuickMenu,'paper-score-team':el=>{const t=state.teams[Number(el.dataset.index)];if(t)openScore(t.id);},'select-team':el=>selectTeam(Number(el.dataset.index)),'clear-selection':clearSelection,'zoom-current':zoomCurrent,'quiet-undo':quietUndo,'show-keypad':()=>{const slot=$('#keypad-slot');slot.hidden=false;$('#score-keyboard').focus();},'presenter-next':presenterNext,'presenter-back':()=>{closeModal(false);if(state.current.screen==='warmup'&&state.current.warmIndex>0)step(-1);else back();},
 home:()=>go('home'),stages:()=>go('stages'),setup:()=>go('setup'),board:()=>go('board'),warmup:()=>beginRound('warmup'),bonus:()=>go('bonus'),captains:()=>go('captains'),rules:()=>go('rules',{rulesNext:null}),ranking:()=>go('ranking'),final:()=>{state.intermission=null;go('final')},
 fullscreen,manager:()=>modal?.kind==='manager'?closeModal():openManager(),settings:()=>openManager('settings'),teams:()=>openManager('teams'),history:()=>openManager('history'),close:()=>closeModal(),
 'manager-tab':el=>openManager(el.dataset.tab),'manager-answer':()=>{closeModal();toggleAnswer();},
 'new-game':startNew,continue:()=>{if(saved){state=validateState(saved);if(state.current.screen==='home')state.current.screen='stages';render();}},
 'open-warm':el=>{paperStart('warmup');paperSet('questions',Math.min(D.warmup.length-1,Math.max(0,Number(el.dataset.index)||0))) },'open-question':el=>openQuestion(el.dataset.id),'admin-open':el=>paperOpenQuestion(el.dataset.id),
 'toggle-answer':toggleAnswer,'finish-question':()=>{if(!commitSelection())return;const qid=state.current.questionId;if(!state.used.includes(qid))state.used.push(qid);if(D.questions.filter(q=>q.enabled||sessionVideos.has(q.id)).every(q=>state.used.includes(q.id)))finishStage('board','bonus');else go('board');},next:()=>step(1),previous:()=>step(-1),
 score:()=>openScore(),'manual-score':()=>openScore(null,true),'quick-score':el=>openScore(el.dataset.id),undo,
 'add-team':addTeam,'remove-team':el=>{const t=state.teams.find(t=>t.id===el.dataset.id);if(t)confirmAction('Удалить команду?',`Команда «${t.name}» будет удалена из рейтинга. Её записи останутся в истории.`,()=>{state.teams=state.teams.filter(x=>x.id!==t.id);save();closeModal();if(state.current.screen==='setup')render();else{render();openManager('teams');}});},
 'preset-teams':()=>{const apply=()=>{for(const name of D.defaultTeams)if(!state.teams.some(t=>t.name===name)&&state.teams.length<9)state.teams.push({id:id(),name,score:0});save();closeModal();if(state.current.screen==='setup')render();else{render();openManager('teams');}};apply();},
 'timer-toggle':el=>{if(state.settings.timerSound){try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();}catch(e){}}timerToggle(el.dataset.key);},'timer-reset':el=>timerReset(el.dataset.key),'timer-phase':el=>{const old=getTimer('social-'+state.bonusPhase);if(old.running){old.remaining=remaining(old);old.running=false;}state.bonusPhase=el.dataset.phase;save();closeModal(false);render();},
 export:exportGame,import:()=>$('#import-file').click(),'import-text':()=>requestImport($('#import-text').value),reset:resetGame,confirm:()=>{const fn=modal?.onConfirm;if(fn)fn();},
 restore:el=>{state.used=state.used.filter(x=>x!==el.dataset.id);save();render();openManager('questions');toast('Вопрос восстановлен');},
 zoom:el=>openModal('',`<button class="lightbox-image" data-action="close" aria-label="Вернуться к вопросу"><img src="${esc(el.dataset.src)}" alt="Увеличенный материал задания"></button>`,'lightbox','zoom'),inspect:el=>inspect(el.dataset.id),
 'attach-video':el=>{pendingVideo=el.dataset.id;$('#video-file').click();},
 orphans:()=>openModal('Материалы без восстановленного задания',`<p class="note">Эти фрагменты сохранены дословно из сценария. Условий задания нет, поэтому они не включены в игровые раунды.</p>${D.orphanMaterials.map(t=>`<div class="rule"></div><p>${esc(t)}</p>`).join('')}`,'','orphans')
};
flowUI=window.QUIZ_FLOW.mount({data:D,state:()=>state,esc,id,save,render,go,openModal,closeModal,screen,stage,overlay,record,remaining,paintTimer,timeText,quickIcon,morphQuick,modal:()=>modal,chronologyView,matching,legacyTeams:()=>openManager('teams'),reduceMotion,motionScale:MOTION_SCALE});
for(const target of ['stages','setup','board','warmup','bonus','captains','rules','ranking','final'])actions[target]=()=>{if(!state.flow){if(state.teams.length>9){openManager('teams');return;}state.flow=window.QUIZ_FLOW.fresh();state.flow.base=Object.fromEntries(state.teams.map(t=>[t.id,t.score]));}flowUI.navigate(target);};
actions['admin-open']=el=>flowUI.openQuestion(el.dataset.id);
actions['open-warm']=el=>flowUI.openQuestion(D.warmup[Number(el.dataset.index)]?.id);
function commitTeamEdits(){document.querySelectorAll('[data-team-name]').forEach(input=>{const t=state.teams.find(t=>t.id===input.dataset.teamName);if(t)t.name=input.value.trim().slice(0,120)||'Команда';});document.querySelectorAll('[data-team-score]').forEach(input=>{const t=state.teams.find(t=>t.id===input.dataset.teamScore),v=Number(input.value);if(t&&Number.isSafeInteger(v)&&Math.abs(v)<=1e9&&v!==t.score)record([{teamId:t.id,teamName:t.name,delta:v-t.score}],'Установка счёта команды');});}
let pointerStart=null,pointerTravel=false;document.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};pointerTravel=false;});document.addEventListener('pointermove',e=>{if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>10)pointerTravel=true;});
document.addEventListener('click',e=>{if(pointerTravel){pointerTravel=false;pointerStart=null;return;}pointerStart=null;if(!overlay.hidden&&overlay.classList.contains('quick-mode')&&!e.target.closest('.quick-dialog,#operator-dot')){closeModal();return;}const el=e.target.closest('[data-action]');if(!el||el.disabled||e.target.closest('video,input,textarea,select'))return;commitTeamEdits();if(flowUI.handleAction(el.dataset.action,el))return;const fn=actions[el.dataset.action];if(fn)fn(el);});
document.addEventListener('submit',e=>{if(['flow-team-form','flow-manual-form'].includes(e.target.id)){e.preventDefault();flowUI.submit(e.target);return;}if(e.target.id!=='score-form')return;e.preventDefault();const amount=Number($('#score-amount').value),reason=$('#score-reason').value.trim();const ids=[...overlay.querySelectorAll('input[name=teams]:checked')].map(x=>x.value);if(!ids.length){toast('Выберите хотя бы одну команду');return;}if(!Number.isSafeInteger(amount)||!amount||Math.abs(amount)>1e6||!reason){toast('Укажите целое ненулевое число и основание');return;}const entries=ids.map(tid=>{const t=state.teams.find(x=>x.id===tid);return {teamId:tid,teamName:t.name,delta:amount};});if(record(entries,reason,false,scoreContext?.taskKey||null,$('#score-round').value||null)){if(state.pendingAward?.taskKey===scoreContext?.taskKey)state.pendingAward=null;save();closeModal();render();toast(`${amount>0?'+':''}${amount} баллов · команд: ${entries.length}`);}});
document.addEventListener('input',e=>{if(e.target.type!=='checkbox'&&state.flow&&flowUI.handleInput(e.target))return;if(e.target.dataset.setting==='captain-duration'){const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=86400){const t=getTimer('captains');t.duration=n;t.remaining=n;t.running=false;t.deadline=0;save();refreshTimerButtons();updateTimerUI();}}if(e.target.id==='score-keyboard'){const n=e.target.value.replace(/[^1-9]/g,'').slice(-1);e.target.value='';if(n)selectTeam(Number(n)-1,true);}});
document.addEventListener('change',e=>{const el=e.target;if(state.flow&&flowUI.handleInput(el))return;
 if(el.dataset.teamName){const t=state.teams.find(t=>t.id===el.dataset.teamName);t.name=el.value.trim().slice(0,120)||'Команда';el.value=t.name;save();renderScores();}
 if(el.dataset.teamScore){const t=state.teams.find(t=>t.id===el.dataset.teamScore),v=Number(el.value);if(Number.isSafeInteger(v)&&Math.abs(v)<=1e9){const delta=v-t.score;if(delta)record([{teamId:t.id,teamName:t.name,delta}],'Установка счёта команды');}else{el.value=t.score;toast('Укажите целое число в пределах ±1 000 000 000');}}
 if(el.dataset.preference){state.settings[el.dataset.preference]=el.checked;applySettings();if(state.current.screen==='home')startPosterTour();save();}
 if(el.dataset.setting==='captain-duration'){const v=Number(el.value);if(Number.isInteger(v)&&v>=1&&v<=86400){const t=getTimer('captains');t.duration=v;timerReset('captains');}else el.value=getTimer('captains').duration;}
});
function requestImport(text){try{if(text.length>5*1024*1024)throw Error('Файл сохранения слишком большой. Максимум 5 МБ.');const next=validateState(JSON.parse(text));confirmAction('Загрузить сохранённую игру?',`Текущая сессия будет заменена. В файле ${next.teams.length} команд и ${next.history.length} записей счёта.`,()=>{state=next;resumeCurrent=structuredCloneSafe(next.current);if(!state.flow)state.current.screen='home';save();closeModal();render();toast('Игра загружена');});}catch(err){toast(err.message||'Не удалось прочитать сохранение');}}
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>5*1024*1024)throw Error('Файл сохранения слишком большой. Максимум 5 МБ.');requestImport(await file.text());}catch(err){toast(err.message||'Не удалось прочитать файл');}});
$('#video-file').addEventListener('change',e=>{const file=e.target.files[0];e.target.value='';if(!file||!pendingVideo)return;if(!file.type.startsWith('video/')){toast('Выберите видеофайл');return;}const old=sessionVideos.get(pendingVideo);if(old)URL.revokeObjectURL(old);sessionVideos.set(pendingVideo,URL.createObjectURL(file));closeModal();render();toast('Видео подключено до закрытия страницы. Ячейка доступна.');});
document.addEventListener('keydown',e=>{
 const typing=e.target.closest('input,textarea,select,[contenteditable=true]');
 if(e.key==='Tab'&&modal){const els=[...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select,textarea,a[href]')].filter(x=>x.offsetParent!==null);if(!els.length)return;const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
 if(e.key==='Escape'){e.preventDefault();back();return;}
 if(typing||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
 const k=e.key.toLowerCase();
 if(state.current.screen==='flow'&&!modal&&(e.key==='ArrowRight'||e.key==='ArrowLeft'||e.code==='Space'||e.key==='Enter'&&!e.target.closest('button,a'))){e.preventDefault();if(e.key==='ArrowLeft')flowUI.back();else flowUI.next('keyboard');return;}
 if(/^[1-9]$/.test(k)&&(!modal||modal.kind==='quick')){e.preventDefault();if(state.flow){flowUI.digit(Number(k));return;}selectTeam(Number(k)-1,modal?.kind==='quick');return;}
 if(k==='f'){e.preventDefault();fullscreen();}else if(k==='m'){e.preventDefault();actions.manager();}else if(k==='u'&&(!modal||modal.kind==='quick')){e.preventDefault();quietUndo();}
 else if(!modal&&e.code==='Space'&&!e.target.closest('button,a,input,textarea,video')){e.preventDefault();if(state.current.screen==='home')teamStart();else if(state.current.screen==='paper')advance();else if(state.current.screen==='rules')actions['rules-start']();else toggleAnswer();}
 else if(!modal&&(e.key==='ArrowRight'||(e.key==='Enter'&&!e.target.closest('button,a')))){e.preventDefault();presenterNext();}
 else if(!modal&&e.key==='ArrowLeft'){e.preventDefault();if(state.current.screen==='warmup'&&state.current.warmIndex>0)step(-1);else back();}
});
window.addEventListener('beforeunload',()=>{if(state.started)save();});
// Read-only diagnostics for testing and operator support. Mutations use the UI.
window.CulturalCode={snapshot:()=>structuredCloneSafe(state),content:D,validateSave:validateState};
fitStage();render();if(!storageOK)toast('Автосохранение недоступно. Используйте сохранение игры в файл.');
})();
