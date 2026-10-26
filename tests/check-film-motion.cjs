/* Simultaneous tracks: every letter turns throughout its shrink/converge/grow. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8'),ctx={};vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('const filmEase='),src.indexOf('function stopPosterTour('))+';this.pose=filmPose;',ctx);
const target={x:850,y:500,scale:.85,center:[200,200]};
for(let scene=0;scene<3;scene++){
 const pose=(j,t)=>ctx.pose(scene,j,scene*3+j,t,target),gap=t=>{const a=pose(0,t),b=pose(1,t);return Math.hypot(a[0]-b[0],a[1]-b[1])/a[2];},start=pose(0,0),middle=pose(0,2),end=pose(0,4);
 assert(start[2]>middle[2]*1.6&&end[2]>middle[2]*1.8,'large → normal → large in one shot');
 for(const t of [.2,.6,1,1.4]){const a=pose(0,t),b=pose(0,t+.1);assert(b[2]<a[2],'shrink starts together with rotation');assert(Math.abs(b[4]-a[4])>1,'continuous turn');assert(gap(t+.1)<gap(t),'simultaneous convergence');}
 for(const t of [2.4,2.8,3.2,3.6]){const a=pose(0,t),b=pose(0,t+.1);assert(b[2]>a[2],'assembled letter grows');assert(Math.abs(b[4]-a[4])>1,'turn continues during growth');assert(Math.hypot(a[0]-pose(1,t)[0],a[1]-pose(1,t)[1])<1e-9,'sections remain closed');}
 for(let j=0;j<3;j++)for(let f=0;f<=240;f++){const p=pose(j,f/60);assert.equal(p[2],p[3]);assert(Number.isFinite(p[0]+p[1]+p[4]));}
}
for(let i=0;i<9;i++){const first=ctx.pose(3,i,i,0,target),end=ctx.pose(3,i,i,4,target);assert(first[2]>end[2]*1.4,'final assembly opens with a broad composition');assert.equal(first[4],0);const [x,y,sx,sy,a,cx,cy]=end;assert(Math.abs(x-sx*cx-(850-.85*200))<1e-9);assert(Math.abs(y-sy*cy-(500-.85*200))<1e-9);assert.equal(a,0);}
console.log('PASS: three uninterrupted concurrent rotation/convergence/scale tracks; final assembly shrinks without rotation.');

// End-point velocity and acceleration stay near zero: no visible snap at landing.
for(let sector=0;sector<9;sector++){
 const pose=t=>ctx.pose(3,sector%3,sector,t,target),last=pose(3.65),end=pose(4);
 for(const i of [0,1,2]){assert(Math.abs(last[i]-end[i])<1e-8);assert(Math.abs(pose(3.65-.001)[i]-last[i])<.00001);}
 const start=pose(0),after=pose(.001);assert(Math.hypot(after[0]-start[0],after[1]-start[1])<.00001);
}
console.log('PASS: wider final formation, independent letter arrivals and zero-speed start/landing.');
