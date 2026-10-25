/* Regression checks run the actual application scoring functions, not a duplicate implementation. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(root,'app.js'),'utf8');
const data={window:{}};vm.createContext(data);vm.runInContext(fs.readFileSync(path.join(root,'quiz-data.js'),'utf8'),data);
let sequence=0;
const ctx={D:data.window.QUIZ_DATA,state:{current:{screen:'question',questionId:'c1-600',warmIndex:0,bonusIndex:0,captainIndex:0},teams:[{id:'a',name:'Север',score:0},{id:'b',name:'Юг',score:0}],history:[],pendingAward:null},modal:null,id:()=>String(++sequence),save:()=>{},renderScores:()=>{},toast:()=>{},closeModal:()=>{},flashDot:()=>{},refreshSelection:()=>{}};
vm.createContext(ctx);
const names=['taskKey','alreadyAwarded','scoreDefaults','record','selectTeam','commitSelection','clearSelection','quietUndo'];
const definitions=names.map(name=>{const line=src.split('\n').find(s=>s.startsWith('function '+name+'('));assert(line,name);return line;}).join('\n');
vm.runInContext('const qById=id=>D.questions.find(q=>q.id===id);\n'+definitions,ctx);
for(let i=0;i<50;i++)ctx.selectTeam(i%2);ctx.selectTeam(1);
assert.deepEqual(ctx.state.teams.map(t=>t.score),[0,0]);assert.equal(ctx.state.history.length,0);assert.equal(ctx.state.pendingAward.teamId,'b');
ctx.state.current.answer=true;assert.equal(ctx.state.history.length,0);
assert(ctx.commitSelection());assert.deepEqual(ctx.state.teams.map(t=>t.score),[0,600]);assert.equal(ctx.state.history.length,1);
for(let i=0;i<20;i++){ctx.selectTeam(0);ctx.commitSelection();}
assert.deepEqual(ctx.state.teams.map(t=>t.score),[0,600]);assert.equal(ctx.state.history.length,1);
ctx.quietUndo();assert.deepEqual(ctx.state.teams.map(t=>t.score),[0,0]);ctx.selectTeam(0);ctx.commitSelection();assert.deepEqual(ctx.state.teams.map(t=>t.score),[600,0]);
ctx.state.current={screen:'warmup',warmIndex:0};ctx.selectTeam(1);ctx.clearSelection();ctx.commitSelection();assert.equal(ctx.state.teams[1].score,0);
ctx.selectTeam(1);ctx.state.current.warmIndex=1;ctx.commitSelection();assert.equal(ctx.state.teams[1].score,0);
ctx.selectTeam(1);ctx.commitSelection();assert.equal(ctx.state.teams[1].score,10);
ctx.state.current={screen:'board'};ctx.selectTeam(0);ctx.commitSelection();assert.equal(ctx.state.teams[0].score,600);
ctx.state.current={screen:'bonus',bonusIndex:0};ctx.selectTeam(0);ctx.selectTeam(1);ctx.commitSelection();ctx.commitSelection();assert.equal(ctx.state.teams[1].score,210);
ctx.state.current={screen:'captains',captainIndex:0};ctx.selectTeam(0);ctx.commitSelection();ctx.commitSelection();assert.equal(ctx.state.teams[0].score,700);
ctx.state.current={screen:'question',questionId:'c1-200'};ctx.selectTeam(1);ctx.state.teams.pop();ctx.commitSelection();assert.equal(ctx.state.teams[0].score,700);
console.log('PASS: 50 repeated selections do not score; last choice wins; one commit per task; reopen protection; undo; clear; stale selection; bonus/captains; deleted team.');
