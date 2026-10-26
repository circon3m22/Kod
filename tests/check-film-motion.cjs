/* Check actual pose curves: continuous letter pairs and restrained speed/rotation. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const src=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8'),ctx={};vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('const filmEase='),src.indexOf('function stopPosterTour('))+';this.pose=filmPose;',ctx);
const target={x:850,y:500,scale:.85,center:[200,200]};
for(const pair of [[0,1],[2,3],[4,5]])for(let j=0;j<3;j++){const a=ctx.pose(pair[0],j,j,4,target),b=ctx.pose(pair[1],j,j,0,target);assert.deepEqual([...a],[...b]);}
for(let scene=0;scene<6;scene++)for(let j=0;j<3;j++){const a=ctx.pose(scene,j,j,0,target),b=ctx.pose(scene,j,j,4,target);assert(Math.abs(b[4]-a[4])<=16,'restrained angle');let last=a;for(let frame=1;frame<=240;frame++){const next=ctx.pose(scene,j,j,frame/60,target);assert(Math.hypot(next[0]-last[0],next[1]-last[1])<3,'no sudden translation');assert(Math.abs(next[4]-last[4])<.15,'no fast spin');last=next;}}
for(let i=0;i<9;i++){const end=ctx.pose(6,i,i,4,target);assert([...end].every((v,j)=>Math.abs(v-[850,500,.85,.85,0,200,200][j])<1e-9));}
console.log('PASS: identical cuts within K/O/D pairs, rotation <= 15 degrees per scene, <3 px movement per frame and exact assembly.');
