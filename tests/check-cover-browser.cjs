/* Verify the composed 4:3 cover, real outgoing motion and asynchronous navigation. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const output=process.env.QUIZ_CHECK_OUTPUT||'/tmp/kod-cover-check';fs.mkdirSync(output,{recursive:true});
const url=process.env.QUIZ_URL||'http://127.0.0.1:8782';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const errors=[],failed=[];const context=await browser.newContext({viewport:{width:1920,height:1080}});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failed.push(r.url()));
 await p.goto(url);await p.evaluate(async()=>{await document.fonts.ready;await Promise.all(COVER_ART.sectors.map(async s=>{const i=new Image();i.src=s.photo;await i.decode()}));});
 const read=()=>p.evaluate(()=>CulturalCode.snapshot());
 assert.equal(await p.locator('.kod-sector image').count(),9);assert.equal(await p.locator('.kod-sector image').evaluateAll(xs=>new Set(xs.map(x=>x.getAttribute('href'))).size),9);
 assert.equal(await p.locator('.cover-poster img,.cover-poster object,.cover-poster canvas').count(),0);
 assert.equal(await p.locator('.poster-date').innerText(),'2 ноября 18:30');assert.equal(await p.locator('.poster-venue').innerText(),'«Вектор», ул. Фрунзе, 60');
 assert(await p.locator('#home-letter-1 path').evaluate(x=>{const b=x.getBBox();return b.width===560&&b.height===560}));
 for(const [width,height] of [[1920,1080],[1366,768],[390,844],[844,390],[768,1024]]){
  await p.setViewportSize({width,height});const fits=await p.evaluate(()=>{const stage=document.querySelector('#stage').getBoundingClientRect();return [...document.querySelectorAll('.poster-sheet,.poster-kicker,.poster-title,.poster-wordmark,.poster-details')].every(x=>{const r=x.getBoundingClientRect();return r.left>=stage.left-1&&r.top>=stage.top-1&&r.right<=stage.right+1&&r.bottom<=stage.bottom+1&&x.scrollWidth<=x.clientWidth+1})});assert(fits,`cover clipped at ${width}x${height}`);await p.screenshot({path:output+`/home-${width}.jpg`,quality:88});
 }
 await p.setViewportSize({width:1920,height:1080});const before=await p.locator('.kod-sector').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().x));
 await p.locator('.cover').click();await p.waitForTimeout(330);assert.equal((await read()).current.screen,'home');
 const during=await p.locator('.kod-sector').evaluateAll(xs=>xs.map(x=>({x:x.getBoundingClientRect().x,opacity:Number(getComputedStyle(x).opacity)})));
 assert(during[0].x<before[0]-10&&during[7].x>before[7]+10,'pieces must move outwards');assert(during.every(x=>x.opacity<1&&x.opacity>0),'pieces must fade while travelling');
 assert(await p.locator('.poster-title').evaluate(x=>Number(getComputedStyle(x).opacity)<.3));await p.screenshot({path:output+'/cover-motion.jpg',quality:88});
 await p.evaluate(()=>{for(let i=0;i<4;i++)document.querySelector('.cover').click()});await p.locator('.stage-sequence').waitFor();assert.equal((await read()).teams.length,2);await p.waitForTimeout(400);assert.equal((await read()).current.screen,'stages');
 // Cancelling the cover transition must never navigate a newly rendered screen later.
 await p.keyboard.press('Escape');await p.locator('.cover').click();await p.waitForTimeout(150);await p.keyboard.press('m');await p.locator('#overlay [data-action="home"]').click();await p.waitForTimeout(1600);assert.equal((await read()).current.screen,'home');await p.locator('.cover').focus();await p.keyboard.press('Space');await p.locator('.stage-sequence').waitFor();
 // The operator's reduced-motion setting uses the same immediate path as the OS preference.
 await p.keyboard.press('m');await p.locator('[data-tab="settings"]').click();await p.locator('[data-preference="reduced"]').check();await p.keyboard.press('Escape');await p.keyboard.press('Escape');await p.locator('.cover').click();await p.locator('.stage-sequence').waitFor({timeout:600});
 for(const key of ['Enter','Space']){const c=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});const q=await c.newPage();await q.goto(url);await q.locator('.cover').focus();await q.keyboard.press(key);await q.locator('.stage-sequence').waitFor({timeout:600});assert.equal((await q.evaluate(()=>CulturalCode.snapshot())).teams.length,2);await c.close();}
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('PASS: live 4:3 cover, nine unique photographs, circular O, five viewports, real outward motion/fade, one transition after repeated clicks, cancellation, keyboard and app/system reduced motion.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
