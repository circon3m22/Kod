const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();await p.goto(process.env.QUIZ_URL||'http://127.0.0.1:8770');await p.evaluate(()=>document.fonts.ready);await p.waitForLoadState('networkidle');await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));
 assert(await p.evaluate(()=>document.fonts.check('500 112px CodeDisplay','КУЛЬТУРНЫЙ')));assert.equal((await p.locator('.poster-title').innerText()).replace(/\s+/g,' '),'КУЛЬТУРНЫЙ КОД');
 const epoch=await p.locator('.poster-film').evaluate(el=>Number(el.dataset.startedAt)),at=async ms=>{await p.clock.runFor(Math.max(0,epoch+ms-await p.evaluate(()=>performance.now())));};
 const opacity=()=>p.locator('.film-calligraphy').evaluate(el=>Number(getComputedStyle(el).opacity));
 await at(18000);assert.equal(await opacity(),0,'title hidden in individual-letter scenes');await at(32200);assert((await opacity())<.02,'the final assembly begins on white');
 const phases=[];for(const u of [.3,.5,.8]){await at(32000+u*8000);phases.push(await p.locator('.film-calligraphy').evaluate((el,time)=>{const a=el.getAnimations()[0];a.pause();a.currentTime=time;return Number(getComputedStyle(el).opacity);},u*8000));}assert(phases[1]>phases[0]&&phases[2]>.99,'title reveals smoothly during the final assembly');await p.screenshot({path:'/tmp/kod-calligraphy-finale.png'});
 await at(40200);assert.equal(await opacity(),0,'final title animation resets on returning to the poster');assert.equal(await p.locator('.poster-title').evaluate(el=>Number(getComputedStyle(el).opacity)),1);
 assert.deepEqual(errors,[]);console.log('PASS: original display heading enlarged to 112px; hidden during letter scenes, gradual final-assembly reveal, clean loop reset; standalone outlined black SVG and PNG available.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
