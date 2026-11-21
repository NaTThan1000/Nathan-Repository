const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('../tools/runtime-deps.cjs').runtimeDependency('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../custom-arena.html')).href);
 await page.waitForFunction(()=>!document.querySelector('#arena-start').disabled);
 await page.evaluate(()=>{
 const check=(v,msg)=>{if(!v)throw Error(msg);};
 const load=(kind,col=5,row=3)=>{arena.placements=new Map([[col+','+row,{kind:'monster',id:'step_'+kind,col,row,size:1}]]);const old=Math.random;try{Math.random=()=>0;arenaLoad(false);}finally{Math.random=old;}return monsters[0];};
 for(const kind of ['fixed','mobile']){
  let m=load(kind);const hp=playerStats.hp;singleStepAct('shoot','right');check(playerStats.hp===hp-1&&runStats.interrupts===0,kind+'远处射击不能打断');
  m=load(kind,3);singleStepAct('shoot','right');check(runStats.interrupts===1,kind+'最近格射击打断');
 }
 let m=load('fighter',4);singleStepAct('shoot','right');check(runStats.interrupts===1,'近战最远格打断');
 m=load('fighter',3);singleStepAct('shoot','right');check(runStats.interrupts===0,'近战最近格不能打断');
 m=load('big',4);check(SINGLE_STEP.plans.get(m.id).cells.length===2,'大史莱姆锁定两格');singleStepAct('shoot','right');check(m.col===4&&runStats.interrupts===1,'大史莱姆末端打断整个行动');
 m=load('big',4);singleStepAct('move','up');check(m.col===3&&m.row===3,'大史莱姆只冲一格');
 m=load('small',3);singleStepAct('shoot','right');check(runStats.interrupts===0,'小史莱姆不能打断');
 m=load('charger',6);singleStepAct('shoot','right');check(runStats.interrupts===1,'冲锋者站在锁定落点打断');
 m=load('charger',6);singleStepAct('move','up');check(m.col===2&&m.row===3&&SINGLE_STEP.bonus===0,'瞬移到旧位置且黄招不给闪避奖励');
 m=load('bomber',3);check(m.hp===8,'自爆者血量8');singleStepAct('shoot','right');check(runStats.interrupts===0,'自爆者黄招不可打断');
 m=load('bomber',3);m.hp=1;const hp=playerStats.hp;damageMonster(m,1);check(m._stepDetonated&&playerStats.hp===hp-1,'击杀触发死亡爆炸');
 for(const color of ['yellow','red']){
  const d=STEP_ENEMIES.mobile;d.attacks[color].earlyWarningTurns=1;
  const old=Math.random;try{Math.random=()=>color==='red'?.99:0;m=load('mobile');SINGLE_STEP.plans.set(m.id,stepConfigureWarning(m,{type:'shot',attackColor:color,cells:[{col:2,row:3}],dir:{dx:-1,dy:0},origin:{col:5,row:3}}));}finally{Math.random=old;}
  const saved=SINGLE_STEP.plans.get(m.id),cells=JSON.stringify(saved.attack.cells),hp=playerStats.hp;
  let dashed=0;const stroke=ctx.strokeRect;ctx.strokeRect=function(...a){if(ctx.getLineDash().length)dashed++;return stroke.apply(this,a);};try{drawDangerOverlay();}finally{ctx.strokeRect=stroke;}
  check(dashed>0,'虚线预告实际绘制');singleStepAct('shoot','up');
  check(playerStats.hp===hp&&SINGLE_STEP.plans.get(m.id).type==='shot'&&JSON.stringify(SINGLE_STEP.plans.get(m.id).cells)===cells,'虚线升级保持锁定范围且不攻击');
  singleStepAct('shoot','up');check(playerStats.hp===hp-1,'实线后下一步攻击');d.attacks[color].earlyWarningTurns=0;
 }
 });assert.deepEqual(errors,[]);console.log('PASS: 条件打断、两段预告、瞬移、冲刺与死亡爆炸');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
