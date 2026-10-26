/* Four compositions, simultaneous letter tracks, hard cuts and a feathered map reveal. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const out=process.env.QUIZ_CHECK_OUTPUT||'/tmp/kod-film-check';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const p=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],failed=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failed.push(r.url()));
 // Use the timer fallback so the virtual clock can deterministically drain prep tasks.
 await p.addInitScript(()=>{window.requestIdleCallback=undefined;window.cancelIdleCallback=undefined;});
 await p.clock.install();await p.goto(process.env.QUIZ_URL||'http://127.0.0.1:8770');await p.evaluate(()=>document.fonts.ready);await p.waitForLoadState('networkidle');await p.clock.pauseAt(await p.evaluate(()=>Date.now()+1000));
 const epoch=await p.locator('.poster-film').evaluate(x=>Number(x.dataset.startedAt));
 const at=async ms=>{const now=await p.evaluate(()=>performance.now());await p.clock.runFor(Math.max(0,epoch+ms*2-now));};
 const read=()=>p.evaluate(()=>({scene:document.querySelector('.poster-film').dataset.scene,map:getComputedStyle(document.querySelector('.poster-sheet'),'::before').visibility,visible:[...document.querySelectorAll('.film-scene')].filter(x=>getComputedStyle(x).display!=='none').map(el=>({id:Number(el.dataset.scene),letter:el.dataset.letter,pieces:[...el.querySelectorAll('.film-piece')].map(piece=>{const mask=document.querySelector(`[data-mask="${piece.dataset.key}"]`),a=piece.querySelector('.film-photo-a'),b=piece.querySelector('.film-photo-b'),m=mask.transform.baseVal.consolidate().matrix,photo=a.transform.baseVal.consolidate().matrix;return {sector:Number(piece.dataset.sector),mask:[m.a,m.b,m.c,m.d,m.e,m.f],image:[photo.a,photo.b,photo.c,photo.d,photo.e,photo.f],a:a.getAttribute('href'),b:b.getAttribute('href'),blend:Number(b.getAttribute('opacity'))};})}))}));
 assert.equal(await p.locator('.film-scene').count(),4);assert.equal(await p.evaluate(()=>COVER_FILM.sceneSeconds),8);
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
 const finalState=()=>p.locator('.poster-film-final').evaluate(el=>({visible:Number(el.style.opacity)>0,ready:el.dataset.ready,landed:el.dataset.landed,map:new DOMMatrixReadOnly(getComputedStyle(el.querySelector('.final-map')).transform).a,front:new DOMMatrixReadOnly(getComputedStyle(el.querySelector('.final-map-curtain')).transform).e+220,pieces:[...el.querySelectorAll('.final-piece')].map(piece=>{const m=new DOMMatrixReadOnly(getComputedStyle(piece).transform);return {sector:Number(piece.dataset.sector),transform:[m.a,m.b,m.c,m.d,m.e,m.f]};})}));
 for(let i=0;i<4;i++){
  for(const [k,local] of [.08,1,2,3,3.85].entries()){
   await at(4000+i*4000+local*1000);
   if(i===3)await p.locator('.poster-film-final').evaluate((el,time)=>el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=time;}),local*2000);
   const s=await read();assert.equal(s.scene,String(i));assert.equal(s.map,'hidden');
   if(i<3){
    assert.equal(s.visible.length,1,'direct cuts: exactly one composition');const v=s.visible[0];assert.equal(v.letter,['К','О','Д'][i]);assert.deepEqual(v.pieces.map(x=>x.sector),[0,1,2].map(j=>i*3+j));
    assert(v.pieces.every(x=>Math.abs(x.image[1])<1e-8&&Math.abs(x.image[2])<1e-8&&Math.abs(x.image[0]-x.image[3])<1e-8),'upright photos');
    assert.equal(await p.locator(`.film-scene[data-scene="${i}"] .film-map`).count(),0);if(k===2)history.push(s);
   }else{
    assert.equal(s.visible.length,0,'SVG stacks are not repainted during the cached finale');const final=await finalState();assert(final.visible&&final.ready==='true');assert(await p.locator('.poster-film-final').evaluate(el=>el.getAnimations({subtree:true}).every(a=>a.effect.getTiming().duration===8000)),'all compositor tracks are twice as long');assert.deepEqual(final.pieces.map(x=>x.sector),[0,1,2,3,4,5,6,7,8]);assert(final.pieces.every(x=>x.transform[1]===0&&x.transform[2]===0&&x.transform[0]===x.transform[3]),'upright, uniformly shrinking sections');
    if(k===0){assert(final.front+220<0,'final shot starts on a fully white background');await p.evaluate(()=>{window.finalSVGChanges=0;window.finalObserver=new MutationObserver(changes=>window.finalSVGChanges+=changes.length);finalObserver.observe(document.querySelector('.poster-film'),{subtree:true,attributes:true,attributeFilter:['transform','href','opacity','x1','x2']});});}
    if(k>0)assert(final.map<previous.map&&final.front>previous.front,'map shrinks while its soft reveal travels left to right');
    if(k===4){assert(Math.abs(final.map-1)<.001);assert(final.front-220>1920);assert.equal(final.landed,'true');}
    var previous=final;
   }
   await p.screenshot({path:out+`/scene-${i+1}-${k}.png`});
  }
 }
 assert.equal(await p.evaluate(()=>{finalObserver.disconnect();return finalSVGChanges;}),0,'no SVG mask/image/gradient writes throughout the finale');
 const textures=await p.locator('.final-texture').evaluateAll(xs=>xs.map(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let filled=0;for(let i=3;i<data.length;i+=4)if(data[i]>200)filled++;return filled;}));assert.equal(textures.length,27);assert(textures.every(x=>x>1000),'all prepared photographs are nonempty');
 const landed=await p.evaluate(()=>{const art=COVER_ART,mark=document.querySelector('.poster-wordmark'),sheet=document.querySelector('.poster-sheet'),cs=getComputedStyle(mark),scale=parseFloat(cs.width)/art.width,bx=sheet.offsetLeft+parseFloat(cs.left),by=sheet.offsetTop+parseFloat(cs.top);return [...document.querySelectorAll('.final-piece')].map(el=>{const id=Number(el.dataset.sector),part=art.sectors[id],box=document.querySelector(`[data-mask="film-3-${id}"]`).getBBox(),r=el.getBoundingClientRect();return Math.max(Math.abs(r.x-(bx+(art.letters[part.letter].x+box.x)*scale-2)),Math.abs(r.y-(by+box.y*scale-2)),Math.abs(r.width-(box.width*scale+4)),Math.abs(r.height-(box.height*scale+4)));});});assert(landed.every(x=>x<1),'all nine cached sections land exactly on the poster geometry');
 // Compare the final prepared photos against the actual paused live poster.
 await p.locator('.poster-film-final').evaluate(el=>el.style.opacity='1');await p.screenshot({path:out+'/final-photos.png'});
 const mask=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=1920;c.height=1080;const g=c.getContext('2d');g.fillStyle='#fff';for(const [i,part] of COVER_ART.sectors.entries()){const m=document.querySelector(`.kod-sector[data-sector="${i}"]`).getScreenCTM();g.save();g.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);g.clip(new Path2D(COVER_ART.letters[part.letter].path),'evenodd');g.fill(new Path2D(part.region));g.restore();}return c.toDataURL('image/png').split(',')[1];});fs.writeFileSync(out+'/photo-mask.png',Buffer.from(mask,'base64'));
 await p.addStyleTag({content:'.poster-film-final,.poster-film{opacity:0!important}.poster-kicker,.poster-title,.poster-details{opacity:0!important}'}).then(async style=>{await p.screenshot({path:out+'/original-photos.png'});await style.evaluate(el=>el.remove());});
 const compare=require('node:child_process').execFileSync('python3',['-c',`from PIL import Image, ImageFilter, ImageChops, ImageStat
import sys
p=sys.argv[1]
# Prepared bitmaps add one resampling pass; ignore subpixel sampling differences.
a=Image.open(p+'/final-photos.png').convert('RGB').filter(ImageFilter.GaussianBlur(.5)); b=Image.open(p+'/original-photos.png').convert('RGB').filter(ImageFilter.GaussianBlur(.5)); mask=Image.open(p+'/photo-mask.png').getchannel('A').filter(ImageFilter.MinFilter(7))
error=sum(ImageStat.Stat(ImageChops.difference(a,b),mask).mean)/3
print('Final photo mean channel error:',round(error,3))
assert error<4,error`,out],{encoding:'utf8'});console.log(compare.trim());
 await at(22000);assert.equal((await read()).scene,'poster');assert.equal((await read()).map,'visible');assert.equal(await p.locator('.poster-film').evaluate(x=>Number(getComputedStyle(x).opacity)),0);assert.equal(await p.locator('.poster-film-final').evaluate(x=>Number(getComputedStyle(x).opacity)),0);
 await p.evaluate(()=>document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).forEach(a=>a.finish()));await p.screenshot({path:out+'/poster.png'});
 await at(26000);const again=await read();assert.equal(again.scene,'0');assert.notDeepEqual(again.visible[0].pieces.map(x=>x.a),history[0].visible[0].pieces.map(x=>x.a));
 await at(37000);assert.equal((await read()).scene,'3');assert((await finalState()).visible);await p.locator('.poster-film-final').evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=2000;}));
 await p.clock.resume();await p.locator('.cover').click();await p.locator('.stage-sequence').waitFor({timeout:5000});assert.equal((await p.evaluate(()=>CulturalCode.snapshot())).current.screen,'stages');
 await p.keyboard.press('Escape');await p.keyboard.press('m');await p.locator('[data-tab="settings"]').click();await p.locator('[data-preference="reduced"]').check();assert.equal(await p.locator('.poster-film').evaluate(x=>getComputedStyle(x).display),'none');assert.equal(await p.locator('.poster-film-final').evaluate(x=>getComputedStyle(x).display),'none');assert.equal(await p.locator('.poster-sheet').getAttribute('data-film-motion'),null);
 await p.keyboard.press('Escape');await p.locator('.cover').click();await p.locator('.stage-sequence').waitFor({timeout:600});assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log('PASS: four uninterrupted compositions; simultaneous tracks, 324 mask poses without overlaps, direct cuts, upright photos, prepared finale with zero SVG redraw writes, nonempty textures, exact final photo crops/geometry, soft map reveal, loop, click interruption and reduced motion.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
