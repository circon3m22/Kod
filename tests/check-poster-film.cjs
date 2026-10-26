/* Three genuine camera shots per letter; disjoint sections and a shrinking final map. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const out=process.env.QUIZ_CHECK_OUTPUT||'/tmp/kod-film-check';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],failed=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failed.push(r.url()));
 await p.clock.install();await p.goto(process.env.QUIZ_URL||'http://127.0.0.1:8770');await p.evaluate(()=>document.fonts.ready);await p.waitForLoadState('networkidle');await p.clock.pauseAt(await p.evaluate(()=>Date.now()+1000));
 const epoch=await p.locator('.poster-film').evaluate(x=>Number(x.dataset.startedAt));
 const at=async ms=>{const now=await p.evaluate(()=>performance.now());await p.clock.fastForward(Math.max(0,epoch+ms-now));};
 const read=()=>p.evaluate(()=>({scene:document.querySelector('.poster-film').dataset.scene,map:getComputedStyle(document.querySelector('.poster-sheet'),'::before').visibility,visible:[...document.querySelectorAll('.film-scene')].filter(x=>getComputedStyle(x).display!=='none').map(el=>({id:Number(el.dataset.scene),letter:el.dataset.letter,pieces:[...el.querySelectorAll('.film-piece')].map(piece=>{const mask=document.querySelector(`[data-mask="${piece.dataset.key}"]`),a=piece.querySelector('.film-photo-a'),b=piece.querySelector('.film-photo-b'),m=mask.transform.baseVal.consolidate().matrix,photo=a.transform.baseVal.consolidate().matrix;return {sector:Number(piece.dataset.sector),mask:[m.a,m.b,m.c,m.d,m.e,m.f],image:[photo.a,photo.b,photo.c,photo.d,photo.e,photo.f],a:a.getAttribute('href'),b:b.getAttribute('href'),blend:Number(b.getAttribute('opacity'))};})}))}));
 assert.equal(await p.locator('.film-scene').count(),10);
 // Rasterize actual SVG regions on a reduced canvas every 100 ms. Count fully
 // covered pixels only, excluding antialiasing. Any pairwise collision fails.
 const src=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
 const poseSource=src.slice(src.indexOf('const filmEase='),src.indexOf('function stopPosterTour('));
 const geometry=await p.evaluate(source=>{
  const pose=new Function(source+';return filmPose;')(),art=COVER_ART,mark=document.querySelector('.poster-wordmark'),sheet=document.querySelector('.poster-sheet'),cs=getComputedStyle(mark),scale=parseFloat(cs.width)/art.width,bx=sheet.offsetLeft+parseFloat(cs.left),by=sheet.offsetTop+parseFloat(cs.top);
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const ctx=canvas.getContext('2d',{willReadFrequently:true});let checks=0;
  for(let scene=0;scene<10;scene++)for(let frame=0;frame<=40;frame++){
   const ids=scene===9?art.sectors.map((_,i)=>i):[0,1,2].map(i=>Math.floor(scene/3)*3+i),occupied=new Uint8Array(480*270);
   for(const [j,id] of ids.entries()){
    const part=art.sectors[id],b=part.box,center=[b[0]+b[2]/2,b[1]+b[3]/2],target={center,x:bx+(art.letters[part.letter].x+center[0])*scale,y:by+center[1]*scale,scale};
    const [x,y,sx,sy,a,cx,cy]=pose(scene,j,id,frame/10,target);
    ctx.resetTransform();ctx.clearRect(0,0,480,270);ctx.scale(.25,.25);ctx.translate(x,y);ctx.rotate(a*Math.PI/180);ctx.scale(sx,sy);ctx.translate(-cx,-cy);ctx.fillStyle='#000';ctx.fill(new Path2D(part.region));
    const pixels=ctx.getImageData(0,0,480,270).data;
    for(let i=0;i<occupied.length;i++)if(pixels[i*4+3]>240){if(occupied[i])return {collision:{scene,t:frame/10,sector:id,pixel:i}};occupied[i]=1;}
   }checks++;
  }return {checks};
 },poseSource);
 assert.equal(geometry.collision,undefined,JSON.stringify(geometry));assert.equal(geometry.checks,410);
 const history=[];
 for(let i=0;i<10;i++){
  if(i===9){await at(40050);const start=await p.locator('.film-map').evaluate(x=>x.transform.baseVal.consolidate().matrix.a);assert(start>17.9,'map begins at an unrecognizably large scale');await p.screenshot({path:out+'/map-start.png'});}
  await at(6000+i*4000);const s=await read();history.push(s);assert.equal(s.scene,String(i));assert.equal(s.map,'hidden');assert.equal(s.visible.length,1);
  const v=s.visible[0];assert.equal(v.letter,['К','К','К','О','О','О','Д','Д','Д','КОД'][i]);assert.deepEqual(v.pieces.map(x=>x.sector),i===9?[0,1,2,3,4,5,6,7,8]:[0,1,2].map(j=>Math.floor(i/3)*3+j));
  assert(v.pieces.every(x=>Math.abs(x.image[1])<1e-8&&Math.abs(x.image[2])<1e-8&&Math.abs(x.image[0]-x.image[3])<1e-8),'upright photos');
  if(i<9&&i%3){const first=history[i-i%3].visible[0];assert.deepEqual(v.pieces.map(x=>[x.a,x.b]),first.pieces.map(x=>[x.a,x.b]),'no rapid photo replacements');}
  if(i<9)assert.equal(await p.locator(`.film-scene[data-scene="${i}"] .film-map`).count(),0);
  await p.screenshot({path:out+`/scene-${i+1}.png`});
 }
 // Inspect the entire map arrival, from an unrecognizably large crop to exact size.
 const map=()=>p.locator('.film-map').evaluate(x=>({scale:x.transform.baseVal.consolidate().matrix.a,opacity:Number(x.getAttribute('opacity'))}));
 const mid=await map();assert(mid.scale>1&&mid.scale<18);
 await at(43750);await p.screenshot({path:out+'/map-landed.png'});const end=await map();assert(Math.abs(end.scale-1)<.001);assert.equal(end.opacity,1);
 const landed=await p.evaluate(()=>{const art=COVER_ART,mark=document.querySelector('.poster-wordmark'),sheet=document.querySelector('.poster-sheet'),cs=getComputedStyle(mark),scale=parseFloat(cs.width)/art.width,bx=sheet.offsetLeft+parseFloat(cs.left),by=sheet.offsetTop+parseFloat(cs.top);return [...document.querySelectorAll('.film-scene[data-scene="9"] .film-piece')].map(el=>{const id=Number(el.dataset.sector),part=art.sectors[id],m=document.querySelector(`[data-mask="${el.dataset.key}"]`).transform.baseVal.consolidate().matrix;return Math.max(Math.abs(m.a-scale),Math.abs(m.d-scale),Math.abs(m.b),Math.abs(m.c),Math.abs(m.e-(bx+art.letters[part.letter].x*scale)),Math.abs(m.f-by));});});assert(landed.every(x=>x<2));
 await at(46000);assert.equal((await read()).scene,'poster');assert.equal((await read()).map,'visible');assert.equal(await p.locator('.poster-film').evaluate(x=>Number(getComputedStyle(x).opacity)),0);
 await p.evaluate(()=>document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).forEach(a=>a.finish()));await p.screenshot({path:out+'/poster.png'});
 await at(50000);const again=await read();assert.equal(again.scene,'0');assert.notDeepEqual(again.visible[0].pieces.map(x=>x.a),history[0].visible[0].pieces.map(x=>x.a));
 await p.clock.resume();await p.locator('.cover').click();await p.locator('.stage-sequence').waitFor({timeout:5000});assert.equal((await p.evaluate(()=>CulturalCode.snapshot())).current.screen,'stages');
 await p.keyboard.press('Escape');await p.keyboard.press('m');await p.locator('[data-tab="settings"]').click();await p.locator('[data-preference="reduced"]').check();assert.equal(await p.locator('.poster-film').evaluate(x=>getComputedStyle(x).display),'none');assert.equal(await p.locator('.poster-sheet').getAttribute('data-film-motion'),null);
 await p.keyboard.press('Escape');await p.locator('.cover').click();await p.locator('.stage-sequence').waitFor({timeout:600});assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log('PASS: 10 four-second scenes, three distinct framings per letter; 410 actual mask poses without overlaps, upright photos, final map 18x → 1x, exact assembly, loop, click interruption and reduced motion.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
