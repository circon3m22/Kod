const {chromium}=require('playwright'),assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  let release,first=true;
  await page.route('**/assets/paper-rounds/ship-engraving.webp',async route=>{
   if(first){first=false;await new Promise(resolve=>{release=resolve;});await route.abort();}
   else await route.continue();
  });
  const navigation=page.goto(process.env.QUIZ_URL||'http://127.0.0.1:8770/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Array.isArray(window.KOD_PRELOAD_ASSETS));
  await page.waitForFunction(()=>document.getElementById('loading-progress')?.textContent!=='0%');
  assert(await page.locator('#loading-screen').isVisible());
  assert.equal(await page.evaluate(()=>window.__KOD_ASSETS_READY),undefined);
  await page.waitForFunction(()=>document.querySelector('#loading-progress')?.textContent.includes('%'));
  while(!release)await new Promise(resolve=>setTimeout(resolve,10));
  release();await navigation;
  await page.locator('#loading-retry:visible').waitFor();
  assert.equal(await page.evaluate(()=>window.__KOD_ASSETS_READY),undefined);
  await page.locator('#loading-retry').click();
  await page.waitForFunction(()=>window.__KOD_ASSETS_READY===true);
  assert(await page.locator('#loading-screen').evaluate(el=>el.classList.contains('loaded')));
  assert.equal(await page.locator('#loading-progress').textContent(),'100%');
  console.log('PASS: initial screen remains until every local image loads; retry completes after an image failure.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
