/* Development-only browser verification. Requires Playwright and Chromium. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const output=process.env.QUIZ_CHECK_OUTPUT||'/tmp/kod-rounds-check';
fs.mkdirSync(output,{recursive:true});
const pause=p=>p.waitForTimeout(340);
async function click(p,a,attrs=''){const selector=`[data-action="${a}"]${attrs}`;const target=await p.locator("#overlay").isVisible()&&await p.locator("#overlay "+selector).count()?p.locator("#overlay "+selector):p.locator(selector);await target.first().click();await pause(p);}
async function manager(p,tab){if(await p.locator('#overlay').isVisible())await p.keyboard.press('Escape');await p.keyboard.press('m');await pause(p);if(tab)await click(p,'manager-tab',`[data-tab="${tab}"]`);}
async function next(p){await p.keyboard.press('ArrowRight');await pause(p);}
const snapshot=p=>p.evaluate(()=>CulturalCode.snapshot());
async function layout(p){return p.evaluate(()=>({overflow:[...document.querySelectorAll('#screen .question-text')].filter(x=>x.scrollHeight>x.clientHeight+2||x.scrollWidth>x.clientWidth+2).map(x=>({client:x.clientHeight,scroll:x.scrollHeight})),images:[...document.querySelectorAll('#screen img')].every(x=>x.complete&&x.naturalWidth>0),text:document.querySelector('#screen').innerText}));}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1920,height:1080}});
  const p=await context.newPage();p.setDefaultTimeout(8000);
  const errors=[],failures=[];p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failures.push(r.url()));
  const url=process.env.QUIZ_URL||'http://127.0.0.1:8765';
  await p.goto(url);await p.evaluate(()=>document.fonts.ready);await pause(p);
  await click(p,'enter-cover');await p.locator('.stage-sequence').waitFor();await manager(p);await click(p,'board');
  const data=await p.evaluate(()=>CulturalCode.content);
  assert.equal(await p.locator('.category').count(),6);assert.equal(await p.locator('.cell').count(),30);assert.equal(await p.locator('.cell:disabled').count(),0);
  for(const [w,h] of [[1920,1080],[1366,768],[390,844],[430,932],[844,390],[932,430],[768,1024]]){
   await p.setViewportSize({width:w,height:h});await pause(p);
   const geometry=await p.evaluate(()=>{const stage=document.querySelector('#stage').getBoundingClientRect(),board=document.querySelector('.board').getBoundingClientRect();return {stage:{x:stage.x,y:stage.y,right:stage.right,bottom:stage.bottom},cells:[...document.querySelectorAll('.cell')].every(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0&&r.x>=board.x-1&&r.y>=board.y-1&&r.right<=board.right+1&&r.bottom<=board.bottom+1}),headings:[...document.querySelectorAll('.category')].every(x=>x.scrollHeight<=x.clientHeight+1&&x.scrollWidth<=x.clientWidth+1)};});
   assert(geometry.cells&&geometry.headings,`board contents clipped at ${w}x${h}`);assert(geometry.stage.x>=-1&&geometry.stage.y>=-1&&geometry.stage.right<=w+1&&geometry.stage.bottom<=h+1);
   if(w===1920||w===390)await p.screenshot({path:path.join(output,`board-${w}.jpg`),quality:85});
  }
  await p.setViewportSize({width:1920,height:1080});await pause(p);
  const measured=[];
  for(const q of data.questions){
   await manager(p,'questions');await click(p,'admin-open',`[data-id="${q.id}"]`);
   let view=await layout(p);assert(view.images,q.id+' question image missing');
   if(q.type!=='matching')assert(view.text.includes(q.text),q.id+' question mismatch');
   if(!q.sourceSlide){assert.deepEqual(view.overflow,[],q.id+' question needs scroll');await p.keyboard.press('1');await p.keyboard.press('1');assert.equal((await snapshot(p)).pendingAward.taskKey,'main:'+q.id);}
   if(q.id==='c5-photo-600')await p.screenshot({path:path.join(output,'photo-question.jpg'),quality:85});
   await next(p);view=await layout(p);assert(view.images,q.id+' answer image missing');assert(view.text.includes(q.answer),q.id+' answer mismatch');
   if(!q.sourceSlide)assert.deepEqual(view.overflow,[],q.id+' answer needs scroll');
   if(q.id==='c6-order-1000')await p.screenshot({path:path.join(output,'timeline-answer.jpg'),quality:85});
   await next(p);assert(['board','ranking'].includes((await snapshot(p)).current.screen));
   measured.push(q.id);
  }
  let s=await snapshot(p);assert.equal(s.teams[0].score,6000);assert.equal(s.history.length,10);
  await manager(p,'questions');await click(p,'admin-open','[data-id="c5-photo-600"]');await p.keyboard.press('2');assert.equal((await snapshot(p)).pendingAward,null);await next(p);await next(p);assert.equal((await snapshot(p)).teams[0].score,6000);
  await manager(p,'settings');await p.locator('[data-preference="large"]').check();await p.keyboard.press('Escape');
  for(const q of data.questions.filter(q=>!q.sourceSlide)){
   await manager(p,'questions');await click(p,'admin-open',`[data-id="${q.id}"]`);assert.deepEqual((await layout(p)).overflow,[],q.id+' large question needs scroll');await next(p);assert.deepEqual((await layout(p)).overflow,[],q.id+' large answer needs scroll');await next(p);
  }
  await manager(p,'questions');assert(!/Слайды null|нет видео|заглушка/.test(await p.locator('#overlay').innerText()));await p.keyboard.press('Escape');
  // Touch the sixth row and a photo using a rotated mobile viewport.
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const m=await mobile.newPage();await m.goto(url);await pause(m);
  for(const a of ['enter-cover']){await m.locator(`[data-action="${a}"]`).first().tap();await pause(m);}
  await m.locator('.stage-sequence').waitFor();await m.keyboard.press('m');await pause(m);await m.locator('#overlay [data-action="board"]').first().tap();await pause(m);await m.locator('[data-id="c6-order-1000"]').tap();await pause(m);assert.equal((await snapshot(m)).current.questionId,'c6-order-1000');assert.deepEqual((await layout(m)).overflow,[]);
  await m.keyboard.press('Escape');await pause(m);await m.locator('[data-id="c5-photo-1000"]').tap();await pause(m);assert((await layout(m)).images);await m.locator('.media-item').tap();await pause(m);assert((await snapshot(m)).current.answer);assert.deepEqual((await layout(m)).overflow,[]);await m.screenshot({path:path.join(output,'photo-mobile.jpg'),quality:85});
  await mobile.close();assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({questions:measured,newAwards:10,total:6000,largeMode:'pass',mobileTouch:'pass',viewports:7,errors,failures},null,2));
  console.log('PASS: 30 questions/answers, 10 new awards = 6000, duplicate protection, large mode, 7 board viewports, rotated touch navigation, all photos local, no JS/resource errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
