/* Four compositions, simultaneous letter tracks, hard cuts and a feathered map reveal. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const out=process.env.QUIZ_CHECK_OUTPUT||'/tmp/kod-film-check';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],failed=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failed.push(r.url()));
 await p.clock.install();await p.goto(process.env.QUIZ_URL||'http://127.0.0.1:8770');await p.evaluate(()=>document.fonts.ready);await p.waitForLoadState('networkidle');await p.clock.pauseAt(await p.evaluate(()=>Date.now()+1000));
 const epoch=await p.locator('.poster-film').evaluate(x=>Number(x.dataset.startedAt));
 const at=async ms=>{const now=await p.evaluate(()=>performance.now());await p.clock.fastForward(Math.max(0,epoch+ms-now));};
 const read=()=>p.evaluate(()=>({scene:document.querySelector('.poster-film').dataset.scene,map:getComputedStyle(document.querySelector('.poster-sheet'),'::before').visibility,visible:[...document.querySelectorAll('.film-scene')].filter(x=>getComputedStyle(x).display!=='none').map(el=>({id:Number(el.dataset.scene),letter:el.dataset.letter,pieces:[...el.querySelectorAll('.film-piece')].map(piece=>{const mask=document.querySelector(`[data-mask="${piece.dataset.key}"]`),a=piece.querySelector('.film-photo-a'),b=piece.querySelector('.film-photo-b'),m=mask.transform.baseVal.consolidate().matrix,photo=a.transform.baseVal.consolidate().matrix;return {sector:Number(piece.dataset.sector),mask:[m.a,m.b,m.c,m.d,m.e,m.f],image:[photo.a,photo.b,photo.c,photo.d,photo.e,photo.f],a:a.getAttribute('href'),b:b.getAttribute('href'),blend:Number(b.getAttribute('opacity'))};})}))}));
 assert.equal(await p.locator('.film-scene').count(),4);
 // Rasterize actual SVG regions on a reduced canvas every 50 ms. Count fully
 // covered pixels only, excluding antialiasing. Any pairwise collision fails.
 const src=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
 const poseSource=src.slice(src.indexOf('const filmEase='),src.indexOf('function stopPosterTour('));
 const geometry=await p.evaluate(source=>{
  const pose=new Function(source+';return filmPose;')(),art=COVER_ART,mark=document.querySelector('.poster-wordmark'),sheet=document.querySelector('.poster-sheet'),cs=getComputedStyle(mark),scale=parseFloat(cs.width)/art.width,bx=sheet.offsetLeft+parseFloat(cs.left),by=sheet.offsetTop+parseFloat(cs.top);
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const ctx=canvas.getContext('2d',{willReadFrequently:true});let checks=0;
  for(let scene=0;scene<4;scene++)for(let frame=0;frame<=80;frame++){
   const ids=scene===3?art.sectors.map((_,i)=>i):[0,1,2].map(i=>scene*3+i),occupied=new Uint8Array(480*270);
   for(const [j,id] of ids.entries()){
    const part=art.sectors[id],b=part.box,center=[b[0]+b[2]/2,b[1]+b[3]/2],target={center,x:bx+(art.letters[part.letter].x+center[0])*scale,y:by+center[1]*scale,scale};
    const [x,y,sx,sy,a,cx,cy]=pose(scene,j,id,frame/20,target);
    ctx.resetTransform();ctx.clearRect(0,0,480,270);ctx.scale(.25,.25);ctx.translate(x,y);ctx.rotate(a*Math.PI/180);ctx.scale(sx,sy);ctx.translate(-cx,-cy);ctx.fillStyle='#000';ctx.fill(new Path2D(part.region));
    const pixels=ctx.getImageData(0,0,480,270).data;
    for(let i=0;i<occupied.length;i++)if(pixels[i*4+3]>240){if(occupied[i])return {collision:{scene,t:frame/20,sector:id,pixel:i}};occupied[i]=1;}
   }checks++;
  }return {checks};
 },poseSource);
 assert.equal(geometry.collision,undefined,JSON.stringify(geometry));assert.equal(geometry.checks,324);
 const history=[];
 for(let i=0;i<4;i++){
  for(const [k,local] of [.08,1,2,3,3.85].entries()){
   await at(4000+i*4000+local*1000);const s=await read();assert.equal(s.scene,String(i));assert.equal(s.map,'hidden');assert.equal(s.visible.length,1,'direct cuts: exactly one composition');
   const v=s.visible[0];assert.equal(v.letter,['К','О','Д','КОД'][i]);assert.deepEqual(v.pieces.map(x=>x.sector),i===3?[0,1,2,3,4,5,6,7,8]:[0,1,2].map(j=>i*3+j));
   assert(v.pieces.every(x=>Math.abs(x.image[1])<1e-8&&Math.abs(x.image[2])<1e-8&&Math.abs(x.image[0]-x.image[3])<1e-8),'upright photos');
   if(i<3)assert.equal(await p.locator(`.film-scene[data-scene="${i}"] .film-map`).count(),0);
   if(k===2)history.push(s);
   if(i===3){
    const map=await p.locator('.film-map').evaluate(x=>({scale:x.transform.baseVal.consolidate().matrix.a,x1:Number(document.querySelector('#film-map-sweep').getAttribute('x1')),x2:Number(document.querySelector('#film-map-sweep').getAttribute('x2'))}));
    if(k===0)assert(map.x2<0,'final shot starts on a fully white background');
    if(k>0)assert(map.scale<previous.scale&&map.x1>previous.x1,'map simultaneously shrinks and reveals left to right');
    if(k===4){assert(Math.abs(map.scale-1)<.001);assert(map.x1>1920,'entire map revealed at exact poster size');}
    var previous=map;
   }
   await p.screenshot({path:out+`/scene-${i+1}-${k}.png`});
  }
 }
 const photoMatch=await p.evaluate(()=>[...document.querySelectorAll('.film-final-photo')].map((photo,i)=>{const original=document.querySelectorAll('.poster-photo')[i],a=photo.getScreenCTM(),b=original.getScreenCTM();return ['a','b','c','d','e','f'].every(k=>Math.abs(a[k]-b[k])<.001)&&['x','y','width','height'].every(k=>photo.getAttribute(k)===original.getAttribute(k));}));assert(photoMatch.every(Boolean),'final photo crops/transforms exactly match the paused live poster');
 const landed=await p.evaluate(()=>{const art=COVER_ART,mark=document.querySelector('.poster-wordmark'),sheet=document.querySelector('.poster-sheet'),cs=getComputedStyle(mark),scale=parseFloat(cs.width)/art.width,bx=sheet.offsetLeft+parseFloat(cs.left),by=sheet.offsetTop+parseFloat(cs.top);return [...document.querySelectorAll('.film-scene[data-scene="3"] .film-piece')].map(el=>{const id=Number(el.dataset.sector),part=art.sectors[id],m=document.querySelector(`[data-mask="${el.dataset.key}"]`).transform.baseVal.consolidate().matrix;return Math.max(Math.abs(m.a-scale),Math.abs(m.d-scale),Math.abs(m.b),Math.abs(m.c),Math.abs(m.e-(bx+art.letters[part.letter].x*scale)),Math.abs(m.f-by));});});assert(landed.every(x=>x<2));
 await at(22000);assert.equal((await read()).scene,'poster');assert.equal((await read()).map,'visible');assert.equal(await p.locator('.poster-film').evaluate(x=>Number(getComputedStyle(x).opacity)),0);
 await p.evaluate(()=>document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).forEach(a=>a.finish()));await p.screenshot({path:out+'/poster.png'});
 await at(26000);const again=await read();assert.equal(again.scene,'0');assert.notDeepEqual(again.visible[0].pieces.map(x=>x.a),history[0].visible[0].pieces.map(x=>x.a));
 await p.clock.resume();await p.locator('.cover').click();await p.locator('.stage-sequence').waitFor({timeout:5000});assert.equal((await p.evaluate(()=>CulturalCode.snapshot())).current.screen,'stages');
 await p.keyboard.press('Escape');await p.keyboard.press('m');await p.locator('[data-tab="settings"]').click();await p.locator('[data-preference="reduced"]').check();assert.equal(await p.locator('.poster-film').evaluate(x=>getComputedStyle(x).display),'none');assert.equal(await p.locator('.poster-sheet').getAttribute('data-film-motion'),null);
 await p.keyboard.press('Escape');await p.locator('.cover').click();await p.locator('.stage-sequence').waitFor({timeout:600});assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log('PASS: four uninterrupted compositions; simultaneous tracks, 324 mask poses without overlaps, direct cuts, upright photos, white final background, left-to-right feathered map reveal with shrink, exact assembly, loop, click interruption and reduced motion.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
