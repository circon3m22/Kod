/* Exercise the actual import validator without a browser or dependencies. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(root,'app.js'),'utf8');
const dataCtx={window:{}};vm.createContext(dataCtx);vm.runInContext(fs.readFileSync(path.join(root,'quiz-data.js'),'utf8'),dataCtx);
const context={D:dataCtx.window.QUIZ_DATA};vm.createContext(context);
const helpers=src.slice(src.indexOf('function taskKey('),src.indexOf('function fresh()'));
const fresh=src.slice(src.indexOf('function fresh()'),src.indexOf('\nlet state='));
const validator=src.slice(src.indexOf('function validateState('),src.indexOf('\ntry{const raw'));
const screens=src.match(/const screens = .*?;/)[0];
vm.runInContext(screens+'\nconst qById=id=>D.questions.find(q=>q.id===id);\n'+helpers+'\n'+fresh+'\n'+validator+'\nthis.validate=validateState;this.freshState=fresh;',context);
const good=context.freshState();good.started=true;good.teams=[{id:'t1',name:'<b>Север</b>',score:-25},{id:'t2',name:'Восток',score:600}];good.used=['c1-200'];good.current={screen:'warmup',warmIndex:6,questionId:null,answer:true};
good.history=[{id:'h1',time:new Date().toISOString(),reason:'Разминка',entries:[{teamId:'t1',teamName:'Север',delta:-25}]}];good.timers={'social-prepare':{duration:300,remaining:280,running:false,deadline:0}};
const restored=context.validate(JSON.parse(JSON.stringify(good)));assert.equal(restored.teams[0].score,-25);assert.equal(restored.current.warmIndex,6);assert.equal(restored.current.answer,true);assert.equal(restored.history[0].entries[0].delta,-25);assert.equal(restored.timers['social-prepare'].remaining,280);
for(const mutate of [s=>s.schema=9,s=>s.teams.push({...s.teams[0]}),s=>s.teams[0].score=Infinity,s=>s.teams[0].score='25',s=>s.current.screen='javascript:alert(1)',s=>s.history[0].entries[0].delta=1.2]){let x=JSON.parse(JSON.stringify(good));mutate(x);assert.throws(()=>context.validate(x));}
let x=JSON.parse(JSON.stringify(good));x.current={screen:'question',questionId:'c5-200'};assert.equal(context.validate(x).current.screen,'board');x.current.questionId='unknown';assert.equal(context.validate(x).current.screen,'board');x.used=['unknown','c1-200','c1-200'];assert.deepEqual([...context.validate(x).used],['c1-200']);
// Validate the actual exported file if its path was supplied.
if(process.argv[2]){const exported=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const imported=context.validate(exported);assert.equal(imported.teams.length,exported.teams.length);assert.equal(imported.history.length,exported.history.length);console.log('PASS: exported browser JSON accepted, teams/history preserved.');}
console.log('PASS: state round-trip, timer preservation, invalid formats, duplicate IDs, unsafe scores, unavailable questions.');

const pending=JSON.parse(JSON.stringify(good));pending.pendingAward={taskKey:'warmup:w7',teamId:'t2'};assert.equal(context.validate(pending).pendingAward.teamId,'t2');pending.pendingAward.taskKey='main:c1-200';assert.equal(context.validate(pending).pendingAward,null);pending.pendingAward={taskKey:'warmup:w7',teamId:'unknown'};assert.equal(context.validate(pending).pendingAward,null);
const legacy=JSON.parse(JSON.stringify(good));legacy.history[0].reason='Разминка 7';assert.equal(context.validate(legacy).history[0].taskKey,'warmup:w7');legacy.history[0].reason='Русь матушка · 200 · слайд 3';assert.equal(context.validate(legacy).history[0].taskKey,'main:c1-200');
console.log('PASS: pending selection round-trip, invalid selection rejection, legacy scoring identity.');

for(const qid of ['c5-photo-200','c6-order-1000']){const next=JSON.parse(JSON.stringify(good));next.current={screen:'question',questionId:qid,answer:true};next.used=[qid,'c5-200'];next.pendingAward={taskKey:'main:'+qid,teamId:'t2'};const n=context.validate(next);assert.equal(n.current.questionId,qid);assert.equal(n.current.screen,'question');assert.equal(n.current.answer,true);assert.equal(n.pendingAward.teamId,'t2');assert.deepEqual([...n.used],[qid]);}
console.log('PASS: photo/timeline question, answer and selection round-trip; archived video IDs cannot block new tasks.');
