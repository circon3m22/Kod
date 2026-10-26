/* Motion, background cleanup and bounded next-image preload on the packaged site. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.QUIZ_URL||'http://127.0.0.1:8770/');
 assert.equal(await page.locator('.final-texture').count(),27);
 for(let i=0;i<3;i++){
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.locator('.poster-film').evaluate(el=>el.style.opacity),'0');
  assert.equal(await page.locator('.final-texture').count(),0,'hidden cover releases its textures');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.locator('.final-texture').count(),27,'restarting the cover must not accumulate canvases');
 }
 await page.evaluate(()=>{delete document.hidden;});
 await page.locator('.cover').click();await page.locator('.flow-rules').waitFor({timeout:7000});
 assert.deepEqual(await page.locator('.flow-rule-cards article').evaluateAll(xs=>xs.map(x=>getComputedStyle(x).animationName)),['flow-detail-in','flow-detail-in','flow-detail-in']);
 const prefetch=await page.evaluate(async()=>{
  const oldImage=window.Image,oldIdle=window.requestIdleCallback,oldCancel=window.cancelIdleCallback;
  const jobs=new Map(),seen=[];let next=0;
  window.requestIdleCallback=fn=>{jobs.set(++next,fn);return next};window.cancelIdleCallback=id=>jobs.delete(id);
  window.Image=class{set src(v){seen.push(v)} decode(){return Promise.resolve()}};
  try{
   const state={current:{screen:'flow'},flow:QUIZ_FLOW.fresh()},rows=QUIZ_FLOW.sequence(QUIZ_DATA);
   const ui=QUIZ_FLOW.mount({data:QUIZ_DATA,state:()=>state,screen:document.querySelector('#screen')});
   state.flow.cursor=rows.findIndex(s=>s.id==='warm-0-q');ui.afterRender();
   state.flow.cursor=rows.findIndex(s=>s.id==='warm-1-q');ui.afterRender();
   const q=QUIZ_DATA.warmup.find(q=>q.id===rows[state.flow.cursor+1].qid);
   const expected=[...new Set((q.answerImages?.length?q.answerImages:q.images)||[])].slice(0,5);
   for(const fn of jobs.values())fn();return {seen,expected,jobs:jobs.size};
  }finally{window.Image=oldImage;window.requestIdleCallback=oldIdle;window.cancelIdleCallback=oldCancel;}
 });
 assert.equal(prefetch.jobs,1,'rapid navigation cancels obsolete preloads');assert.deepEqual(prefetch.seen,prefetch.expected);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert(await page.locator('.flow-rule-cards article').evaluateAll(xs=>xs.every(x=>getComputedStyle(x).animationName==='none')),'reduced motion removes decorative animations');
 assert.deepEqual(errors,[]);console.log('PASS: rules animate, hidden cover releases and recreates exactly 27 textures, next-image preload is bounded and cancels stale work, reduced motion is respected.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
