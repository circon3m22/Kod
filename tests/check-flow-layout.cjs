/* Render the production sequence controller/helpers as isolated layout fixtures. */
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});await p.goto(process.env.QUIZ_URL||'http://127.0.0.1:8770');await p.evaluate(()=>document.fonts.ready);
 const src=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),helpers=src.match(/^function matching\(.*$/m)[0]+'\n'+src.slice(src.indexOf('function chronologyView('),src.indexOf('function questionView('))+'\n'+src.match(/^function timeText\(.*$/m)[0];
 const result=await p.evaluate(async source=>{
  const root=document.querySelector('#screen');root.className='flow-screen';const data=QUIZ_DATA,s=CulturalCode.snapshot();s.current.screen='flow';s.teams=Array.from({length:10},(_,i)=>({id:'layout-'+i,name:'Команда '+(i+1),number:i+1,score:i*100}));s.flow=QUIZ_FLOW.fresh();s.flow.base=Object.fromEntries(s.teams.map(t=>[t.id,t.score]));s.flow.drafts=s.teams.map(t=>({id:t.id,name:t.name,number:t.number}));s.flow.teamCount=10;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const methods=new Function('esc','state',source+';return {matching,chronologyView,timeText}')(esc,s),ui=QUIZ_FLOW.mount({data,state:()=>s,esc,id:()=>Math.random().toString(),...methods});
  let checked=0;const bad=[],broken=[];
  for(const [index,step] of ui.rows.entries()){
   if(!['warmup','warmup-answer','question','answer','rules','names','blocks','stages','manual','captain-winner','final-results','captains-intro'].includes(step.kind))continue;
   s.flow.cursor=index;s.flow.clock=step.seconds?{owner:step.id,remaining:step.seconds,running:false}:null;root.innerHTML=ui.view();if(root.querySelectorAll('.flow-organizer,.poster-organizer').length!==0)bad.push({step:step.id,error:'organizer logo outside main stage menu'});await Promise.all([...root.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
   for(const img of root.querySelectorAll('img'))if(!img.naturalWidth)broken.push({step:step.id,src:img.src});
   const overflow=[...root.querySelectorAll('.flow-question-copy,.flow-question-text,.chronology-card,.flow-rule-cards article,.flow-block h2,.flow-stage-cards,.flow-team-rows')].filter(el=>el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2).map(el=>({class:el.className,height:[el.scrollHeight,el.clientHeight],width:[el.scrollWidth,el.clientWidth],text:el.textContent.slice(0,100)}));
   for(const el of root.querySelectorAll('.flow-stage-card,.flow-block,.flow-organizer')){const box=el.getBoundingClientRect(),stage=document.querySelector('#stage').getBoundingClientRect();if(box.left<stage.left-1||box.top<stage.top-1||box.right>stage.right+1||box.bottom>stage.bottom+1)overflow.push({class:el.className,reason:'outside stage'});}
   if(overflow.length)bad.push({step:step.id,overflow});checked++;
  }
  return {checked,bad,broken};
 },helpers);
 assert.deepEqual(result.broken,[]);assert.deepEqual(result.bad,[]);console.log(`PASS: ${result.checked} production layout fixtures fit, including every warmup/question/answer, matching, timelines, ten-team forms and stage menus; all images load.`);
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
