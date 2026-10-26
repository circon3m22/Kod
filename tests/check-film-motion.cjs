/* The actual camera curves share a rigid transform; no independent section turns. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8'),ctx={};vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('const filmEase='),src.indexOf('function stopPosterTour('))+';this.pose=filmPose;',ctx);
const target={x:850,y:500,scale:.85,center:[200,200]};
for(const first of [0,3,6])for(let shot=0;shot<2;shot++)for(let j=0;j<3;j++){
 const sector=first+j,a=ctx.pose(first+shot,j,sector,4,target),b=ctx.pose(first+shot+1,j,sector,0,target);assert.deepEqual([...a],[...b],'each camera cut is continuous');
}
for(let scene=0;scene<9;scene++)for(let j=0;j<3;j++){
 const sector=Math.floor(scene/3)*3+j;let last=ctx.pose(scene,j,sector,0,target);
 for(let f=1;f<=240;f++){const p=ctx.pose(scene,j,sector,f/60,target);assert.equal(p[2],p[3],'no individual stretching');assert(Math.hypot(p[0]-last[0],p[1]-last[1])<4,'slow movement');assert(Math.abs(p[4]-last[4])<.35,'smooth turn');last=p;}
}
for(let i=0;i<9;i++){const end=ctx.pose(9,i,i,4,target);const [x,y,sx,sy,a,cx,cy]=end;assert(Math.abs(x-sx*cx-(850-.85*200))<1e-9);assert(Math.abs(y-sy*cy-(500-.85*200))<1e-9);assert.equal(a,0);}
console.log('PASS: three continuous camera shots per letter; rigid uniform transforms and exact final assembly.');
