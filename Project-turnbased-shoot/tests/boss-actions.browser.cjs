const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('../tools/runtime-deps.cjs').runtimeDependency('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 for(const file of ['turnbased-shoot-demo-pack.html','custom-arena.html']){
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../'+file)).href);
 await page.waitForFunction(()=>currentFloor&&STEP_BOSSES.jumper&&MONSTER_DB.step_mobile);
 await page.evaluate(()=>{
 const check=(v,msg)=>{if(!v)throw Error(msg);};
 const load=(kind='jumper',col=8,row=3)=>{
  currentRoomGrid=parseGrid(BUILTIN_TEMPLATES().open.tiles);currentFloor.rooms.find(r=>r.id===currentRoomId).grid=currentRoomGrid;
  monsters=[];bombs=[];bullets=[];resourcesOnGround=[];itemsOnGround=[];tileData={};gameStarted=true;gameOver=false;transition=null;floorFadeBusy=false;
  Object.assign(player,{col:2,row:3,...gridToPixel(2,3),invincibleSteps:0,targetPx:null,targetPy:null});const q=gridToPixel(2,3);player.px=q.x;player.py=q.y;
  Object.assign(playerStats,{hp:100,maxHp:100,attack:1,range:1,fireRate:1});playerResources.blueHearts=0;
  const cfg=MONSTER_DB[kind==='jumper'?'boss_jumper_i':'duke_fly'];
  const m={...cfg,id:++monsterIdCounter,cfgId:cfg.id,col,row,px:gridToPixel(col,row).x,py:gridToPixel(col,row).y,hp:1000,maxHp:1000,displayHp:1000,predictedPath:[],_visualPath:[],movementTags:kind==='fly'?['飞行']:['地面']};
  monsters.push(m);singleStepReset();return m;
 };
 const plan=m=>SINGLE_STEP.plans.get(m.id);
 const force=(m,action)=>SINGLE_STEP.plans.set(m.id,stepBossSequence(m,action));
 const advance=()=>check(singleStepAct('shoot','up'),'正常推进');
 let m=load();
 const random=monsterActionRandom;
 try {
  for(const [value,action]of [[0,'move'],[.6,'shot'],[.99,'slam']]){monsterActionRandom=()=>value;check(stepBossChoose(m).sequence.action===action,'按300/200/100选行动');}
  player.row=0;monsterActionRandom=()=>.8;check(stepBossChoose(m).sequence.action!=='shot','不在两格宽射程内不选射击');
 } finally {monsterActionRandom=random;}
 m=load();force(m,'shot');const selected=JSON.stringify(plan(m).cells);check(plan(m).cells.length===10,'抛射选10格');
 drawDangerOverlay();check(plan(m).stage==='lob','抛射预告后下一步直接出手');player.row=1;advance();check(plan(m).stage==='recover'&&SINGLE_STEP.shots.filter(s=>s.owner===m.id).length===10,'同批抛射10个目标后停顿');
 m=load('jumper',2,0);player.col=0;player.row=0;force(m,'shot');check(plan(m).cells.length===4,'候选不足10格全选');
 m=load('jumper',6,3);const to=stepBossSmallTarget(m);currentRoomGrid[to.col][to.row]=TILE.ROCK;currentRoomGrid[to.col+1][to.row]=TILE.POOP;currentRoomGrid[to.col][to.row+1]=TILE.SPIKE;initTileData();
 force(m,'move');check(plan(m).attackColor==='yellow'&&!stepInterruptCells(m,plan(m)).length,'跳跃黄招不可打断');
 check(plan(m).stage==='jump','黄格期间已准备跳跃');advance();
 check(m.col===to.col&&m.row===to.row&&plan(m).stage==='recover','一次跳到目标后恢复');
 check(currentRoomGrid[to.col][to.row]===TILE.FLOOR&&currentRoomGrid[to.col+1][to.row]===TILE.FLOOR&&currentRoomGrid[to.col][to.row+1]===TILE.FLOOR,'践踏岩石木箱地刺');
 currentRoomGrid[to.col][to.row]=TILE.PIT;check(!stepBossPlace(m,to,true)&&currentRoomGrid[to.col][to.row]===TILE.PIT,'深坑保留且不落入');
 m=load();force(m,'slam');check(m._shaking&&plan(m).stage==='shake','震动准备');advance();check(m.jumperVanished&&plan(m).stage==='vanish','消失阶段');
 advance();check(plan(m).stage==='early'&&plan(m).cells.length===12,'12格虚线预告');
 const locked=JSON.stringify(plan(m).cells),target={...plan(m).to};check(singleStepFootprint(m,target.col,target.row).some(c=>stepVariantCellMatches(c,player)),'玩家位于中心四格');
 let dashed=0;const stroke=ctx.strokeRect;ctx.strokeRect=function(...args){if(ctx.getLineDash().length)dashed++;return stroke.apply(this,args);};try{drawDangerOverlay();}finally{ctx.strokeRect=stroke;}check(dashed===12,'消失时仍绘制12格虚框');
 player.col=0;player.row=0;advance();check(plan(m).stage==='slam'&&JSON.stringify(plan(m).cells)===locked,'虚线转实线不跟踪玩家');advance();check(!m.jumperVanished&&m.col===target.col&&m.row===target.row&&plan(m).stage==='recover','瞬移落地后恢复');
 m=load('fly',10,5);force(m,'move');const expected=plan(m).path.at(-1);check(plan(m).path.length===2&&plan(m).path[0].col===9&&plan(m).path[0].row===4,'首次朝相对象限移动');
 try{monsterActionRandom=()=>0;advance();}finally{monsterActionRandom=random;}
 check(m.col===expected.col&&m.row===expected.row,'一次移动两格');
 const lockedMove=plan(m),moveTarget=lockedMove.path.at(-1),moveCells=JSON.stringify(lockedMove.cells);
 check(lockedMove.stage==='diagonal'&&moveCells===JSON.stringify(stepBossDiagonal(m).cells),'行动结束已抽选并锁定下一次移动路径');
 try{monsterActionRandom=()=>.99;check(singleStepAct('move','left'),'玩家移动');}finally{monsterActionRandom=random;}
 check(m.col===moveTarget.col&&m.row===moveTarget.row&&m._stepAction.type==='diagonal'&&!monsters.some(o=>o.cfgId==='step_mobile'),'红色预告后的移动不会因玩家移动或随机值改变被替换');
 m=load('fly',8,3);player.row=1;force(m,'move');
 try{monsterActionRandom=()=>.3;advance();}finally{monsterActionRandom=random;}
 check(plan(m).stage==='summon'&&!singleStepAttackPreview(m),'行动结束选中召唤不显示移动红格');
 const beforeSummon={col:m.col,row:m.row};
 try{monsterActionRandom=()=>0;check(singleStepAct('move','left'),'召唤前玩家移动');}finally{monsterActionRandom=random;}
 check(m.col===beforeSummon.col&&m.row===beforeSummon.row&&monsters.some(o=>o._bossSummoned),'已选召唤仍执行召唤');
 m._diagDir={dCol:1,dRow:1};m.col=COLS-2;m.row=ROWS-2;const bounce=stepBossDiagonal(m);check(bounce.path[0].col===COLS-3&&bounce.path[0].row===ROWS-3,'碰墙对角反弹');
 m=load('fly',6,3);force(m,'summon');advance();const child=monsters.find(o=>o.cfgId==='step_mobile');check(child&&child.size===1,'独立行动召唤移动射手');
 const hp=child.hp,bhp=m.hp;check(stepBossPlace(m,{col:child.col,row:child.row}), 'Boss可挤开小怪');check(child.hp===hp&&m.hp===bhp&&!singleStepFootprint(m).some(c=>isInMonsterFootprint(child,c.col,c.row)),'挤出互不伤害且不重叠');
 m=load('fly',6,3);
 for(let i=0;i<6;i++){const cfg=MONSTER_DB.step_mobile;monsters.push({...cfg,cfgId:cfg.id,id:++monsterIdCounter,col:i,row:0,hp:cfg.hp,_bossSummoned:true,size:1});}
 check(stepBossSummonCount()===6,'六只存活召唤物计数');
 const total=monsters.length;stepBossSummon(m);check(monsters.length===total,'执行时也禁止第七只');
 try{monsterActionRandom=()=>.3;check(stepBossChoose(m).sequence.action!=='summon','达到六只移除召唤候选');}finally{monsterActionRandom=random;}
 monsters.find(o=>o._bossSummoned).hp=0;
 try{monsterActionRandom=()=>.3;check(stepBossChoose(m).sequence.action==='summon','死亡一只后召唤恢复参与抽选');}finally{monsterActionRandom=random;}
 stepBossSummon(m);check(stepBossSummonCount()===6&&monsters.length===total+1,'只补至六只');
 m=load('fly',8,3);player.row=1;force(m,'move');
 try{monsterActionRandom=()=>.99;advance();}finally{monsterActionRandom=random;}
 check(plan(m).stage==='beam'&&plan(m).attackColor==='yellow','移动结束抽中射击立即显示黄色预告');
 const lockedBeam=JSON.stringify(plan(m).cells);player.row=0;
 check(JSON.stringify(singleStepAttackPreview(m).cells)===lockedBeam,'玩家离开射程不改变已锁定射击范围');
 advance();check(m._stepAction.type==='beam'&&plan(m).stage==='recover','玩家离开射程仍按原计划射击且无额外等待');
 m=load('fly',6,3);currentRoomGrid[4][3]=TILE.ROCK;initTileData();force(m,'shot');check(plan(m).cells.some(c=>c.col===2&&c.row===3),'双线穿障预告');
 check(stepInterruptCells(m,plan(m)).length===2,'最近两格可打断');
 Object.assign(player,{col:5,row:3});stepTestHooks.onDirectWeaponHit(m,performance.now());check(plan(m).type==='interrupted','最近格命中可打断');advance();check(plan(m).stage==='recover','打断后跳过射击进入恢复');
 m=load('fly',6,3);force(m,'shot');const hpBefore=playerStats.hp;advance();check(playerStats.hp===hpBefore-1&&plan(m).stage==='recover','穿障射击造成伤害后恢复');
 });
 if(file==='custom-arena.html'){
  await page.waitForFunction(()=>!document.querySelector('#arena-boss').disabled);
  for(const [value,id,label] of [['jumper','boss_jumper_i','跳跃巨兽'],['fly','duke_fly','飞行巨兽']]){
   await page.locator('#arena-boss').selectOption({label});
   assert.deepEqual(await page.evaluate(()=>monsters.map(m=>[m.cfgId,m.size,SINGLE_STEP.plans.get(m.id)?.type])),[[id,2,'boss-phase']]);
   assert.equal(await page.locator('#arena-boss').inputValue(),value);
   await page.keyboard.press('r');
   assert.equal(await page.evaluate(()=>SINGLE_STEP.step),0);
   assert.equal(await page.evaluate(()=>monsters[0].cfgId),id);
  }
  await page.locator('#arena-boss').selectOption('');
  assert.equal(await page.evaluate(()=>arena.editing),true);
 }
 assert.deepEqual(errors,[],file+'无页面错误');await page.close();console.log('PASS: '+file+' Boss权重、整套行动、预告、锁定、践踏、反弹、召唤与打断');
 }
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
