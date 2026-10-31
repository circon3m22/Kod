const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const artifact=process.env.STANDALONE_HTML||path.resolve(__dirname,'../../Kulturny-kod-14-00-standalone.html');

(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1920,height:1080},offline:true});
  const page=await context.newPage(),unexpected=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
   if(route.request().url()==='http://single-file.test/')await route.fulfill({body:fs.readFileSync(artifact),contentType:'text/html; charset=utf-8'});
   else {unexpected.push({url:route.request().url(),type:route.request().resourceType()});await route.abort();}
  });
  await page.goto('http://single-file.test/');
  await page.waitForFunction(()=>window.__KOD_ASSETS_READY===true,{timeout:30000});
  assert.equal(await page.locator('#loading-screen').evaluate(el=>el.classList.contains('loaded')),true);
  assert.equal(await page.locator('#viewport').evaluate(el=>el.inert),false);
  assert.equal(await page.evaluate(()=>window.KOD_PRELOAD_ASSETS.length),157);
  assert(await page.evaluate(async()=>{
   const image=new Image();image.src=COVER_ART.sectors[0].photo;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;canvas.getContext('2d').drawImage(image,0,0,1,1);
   return canvas.getContext('2d').getImageData(0,0,1,1).data.length===4;
  }),'embedded images must remain readable by the film canvas');
  assert(await page.evaluate(async()=>{
   const response=await fetch(window.KOD_ASSET_URLS['design/answer-sheets.pdf']);
   const bytes=new Uint8Array(await response.arrayBuffer());
   return String.fromCharCode(...bytes.slice(0,4))==='%PDF';
  }),'printable answer sheet must be embedded');
  await page.locator('#operator-dot').click();
  const download=page.waitForEvent('download');
  await page.locator('[data-action="standalone-pdf"]').click();
  assert.equal((await download).suggestedFilename(),'Бланки-Культурный-код.pdf');
  await page.keyboard.press('Escape');
  await page.locator('.cover').click();await page.locator('.flow-rules').waitFor();
  assert.equal(await page.locator('.flow-rule-cards img').count(),3);
  assert(await page.locator('.flow-rule-cards img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)));
  if(unexpected.length)console.error('Unexpected resources:',unexpected,await page.evaluate(()=>[...document.querySelectorAll('[src],[href]')].filter(el=>el.getAttribute('src')==='undefined'||el.getAttribute('href')==='undefined').map(el=>el.outerHTML.slice(0,280))));
  assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
  console.log('PASS: single HTML opens offline with zero extra requests; photos, canvas, fonts, rules and PDF are embedded.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
