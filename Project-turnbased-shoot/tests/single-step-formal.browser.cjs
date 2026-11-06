// 浏览器回归只验证功能，不生成PNG预览文件。
const assert=require('assert'),path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('../tools/runtime-deps.cjs').runtimeDependency('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/turnbased-shoot-demo-pack.html')).href);
 await page.waitForFunction(()=>currentFloor&&MONSTER_DB.step_mobile&&Object.keys(RESOURCE_DB).length);await page.evaluate(()=>startGameFromMenu());
 await page.evaluate(()=>{
  const check=(v,msg)=>{if(!v)throw Error(msg);};
  window.stepFixture=(id='flying_eye_i',c=5,r=3)=>{
   currentRoomGrid=parseGrid(BUILTIN_TEMPLATES().open.tiles);const room=currentFloor.rooms.find(r=>r.id===currentRoomId);room.grid=currentRoomGrid;room.type='normal';room.bossLadderPlaced=false;
   monsters=[];bombs=[];bullets=[];resourcesOnGround=[];itemsOnGround=[];pendingBossLanding=null;floorFadeBusy=false;transition=null;gameStarted=true;gameOver=false;
   Object.assign(playerStats,{hp:5,maxHp:5,attack:3.5,range:6});Object.assign(player,{col:2,row:3,...(()=>{const p=gridToPixel(2,3);return {px:p.x,py:p.y,targetPx:null,targetPy:null};})(),invincibleSteps:0,hitFlash:0,shootTimer:0});playerResources.blueHearts=0;
   document.getElementById('death-modal').classList.remove('show');document.getElementById('floor-fade').style.opacity='0';initTileData();spawnMonsterAtRandomPos(id);const m=monsters.at(-1);Object.assign(m,{col:c,row:r,px:gridToPixel(c,r).x,py:gridToPixel(c,r).y,_spawnedThisTurn:false});inCombat=true;singleStepReset();return m;
  };
  let m=stepFixture();check(SINGLE_STEP.plans.get(m.id).type==='shot','基础射手初始锁定');singleStepAct('move','up');check(SINGLE_STEP.bonus===2&&playerStats.hp===5,'正式版闪避奖励');
  const frozen=JSON.stringify([monsters.map(m=>[m.id,m.col,m.row]),[...SINGLE_STEP.plans],combatRng]);singleStepAct('shoot','left');singleStepAct('shoot','left');check(SINGLE_STEP.bonus===0&&frozen===JSON.stringify([monsters.map(m=>[m.id,m.col,m.row]),[...SINGLE_STEP.plans],combatRng]),'正式版两次额外行动冻结所有阶段');
  singleStepAct('shoot','left');check(SINGLE_STEP.step===4,'恢复普通行动');
  m=stepFixture('step_charger',5,3);singleStepAct('shoot','up');check(m.col===1&&playerStats.hp===4&&!(player.col===m.col&&player.row===m.row),'正式版冲刺穿过并挤出 '+JSON.stringify({m:[m.col,m.row],p:[player.col,player.row,playerStats.hp],plan:[...SINGLE_STEP.plans.values()]} ));
  m=stepFixture();singleStepAct('shoot','up');const hurt=stepVisualEvents.find(e=>e.type==='hurt');check(playerStats.hp===4&&player.invincibleSteps===Math.floor(playerStats.moveSpeed)*2,'战斗受伤保留原步数制无敌');check(hurt&&hurt.at>performance.now(),'受击帧等待敌方弹体画面命中');
  const spriteDraw=scrapDraw,spriteCalls=[];scrapDraw=function(...args){spriteCalls.push(args);return spriteDraw(...args);};try{drawPlayer();check(!spriteCalls.some(c=>/^hero-.*-hit$/.test(c[0])),'子弹未到达时不提前播放受击帧');spriteCalls.length=0;hurt.at=performance.now()-40;drawPlayer();check(spriteCalls.some(c=>/^hero-.*-hit$/.test(c[0])&&c[5]<1),'视觉命中后播放受击帧并保留无敌闪烁');}finally{scrapDraw=spriteDraw;}
  const immuneSteps=player.invincibleSteps;damagePlayer(1,m.id);check(playerStats.hp===4&&player.invincibleSteps===immuneSteps&&stepVisualEvents.filter(e=>e.type==='hurt').length===1,'无敌期间不重复扣血、不刷新无敌或受击动作');
  m=stepFixture('step_fixed',8,3);damagePlayer(1,m.id);const protection=player.invincibleSteps;currentRoomGrid[1][3]=TILE.ROCK;check(!singleStepAct('move','left')&&player.invincibleSteps===protection,'无效操作不消耗无敌步数');
  for(let i=1;i<protection;i++){singleStepAct('shoot','left');damagePlayer(1,m.id);check(playerStats.hp===4&&player.invincibleSteps===protection-i,'有效行动递减无敌且期间继续免伤');}singleStepAct('shoot','left');damagePlayer(1,m.id);check(playerStats.hp===3&&player.invincibleSteps===protection,'保护结束后正常受伤并重新获得无敌');
  m=stepFixture();singleStepAct('move','up');currentRoomGrid[2][1]=TILE.SPIKE;singleStepAct('move','up');check(SINGLE_STEP.bonus===0&&playerStats.hp===4,'额外行动踩刺立即结束');
  m=stepFixture();currentRoomGrid[4][3]=TILE.ROCK;initTileData();const terrainBefore=JSON.stringify(tileData);singleStepReset();for(let i=0;i<5;i++){SINGLE_STEP.plans.clear();singleStepPlan();}check(JSON.stringify(tileData)===terrainBefore,'攻击规划不能损伤地形');
  m=stepFixture();singleStepAct('move','up');playerResources.bombs=3;placeBomb(10,5);const b=bombs.at(-1),timer=b.timer;singleStepAct('shoot','left');singleStepAct('shoot','left');check(b.timer===timer,'奖励期炸弹倒计时冻结');singleStepAct('shoot','left');check(b.timer===timer-1,'普通步炸弹推进一次');
  m=stepFixture();m.hp=1;singleStepAct('shoot','right');check(!monsters.length&&!inCombat,'瞬发击杀及清房');check(!actionHistoryActive(),'正式版不创建回溯历史');
  m=stepFixture();m.hp=1;currentFloor.rooms.find(r=>r.id===currentRoomId).type='boss';singleStepAct('shoot','right');check(currentRoomGrid[6][1]===TILE.LADDER,'Boss清场保留梯子流程');
  m=stepFixture();const itemId=Object.keys(ITEMS_DB).find(k=>!playerInventory.includes(k)&&ITEMS_DB[k].effects?.attack);if(itemId){spawnItemOnGrid(2,2,itemId);const attack=playerStats.attack;singleStepAct('move','up');check(playerInventory.includes(itemId)&&playerStats.attack>attack,'正式版道具自动拾取与攻击加成');}
  check(Object.keys(STEP_ENEMIES).length===9,'九种新怪物配置');
  check(Object.values(SQUAD_TEMPLATES.squads).filter(s=>s.roomTypes.includes('normal')).every(s=>s.monsters.every(id=>id.startsWith('step_'))),'普通房间小队全部替换');
  m=stepFixture('step_mobile',3,4);check(SINGLE_STEP.plans.get(m.id).type==='chase','射手暂定四方向，不在对角攻击');
  m=stepFixture('step_mobile',5,5);check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:4,row:5}),'横向距离较大先沿横轴靠近');
  m=stepFixture('step_mobile',3,6);check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:3,row:5}),'纵向距离较大先沿纵轴靠近');
  m=stepFixture('step_mobile',2,2);Object.assign(player,{col:5,row:4});check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:3,row:2}),'正方向按较长轴靠近');
  Object.assign(player,{col:4,row:4});const random=monsterActionRandom;try{monsterActionRandom=()=>.1;const a=stepEnemyChase(m);monsterActionRandom=()=>.9;const b=stepEnemyChase(m);check(a.col!==b.col&&a.row!==b.row,'相等距离随机选择不同轴');}finally{monsterActionRandom=random;}
  m=stepFixture('step_mobile',5,5);currentRoomGrid[4][5]=TILE.ROCK;check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:5,row:4}),'较长轴被墙挡住时尝试另一个靠近方向');
  m=stepFixture('step_mobile',5,5);spawnMonsterAtRandomPos('step_small');Object.assign(monsters.at(-1),{col:4,row:5});check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:5,row:4}),'其他怪物同样作为寻路障碍');
  m=stepFixture('step_mobile',4,4);currentRoomGrid[3][4]=currentRoomGrid[4][3]=TILE.ROCK;check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:4,row:5}),'两条靠近方向受阻时允许先远离绕路');
  const visited=new Set([m.col+','+m.row]);for(let i=0;i<8&&Math.abs(m.col-player.col)+Math.abs(m.row-player.row)>1;i++){const next=stepEnemyChase(m);check(next&&!visited.has(next.col+','+next.row),'寻路持续推进，不折返振荡');Object.assign(m,next);visited.add(m.col+','+m.row);}check(Math.abs(m.col-player.col)+Math.abs(m.row-player.row)===1,'绕过拐角最终到达玩家邻格');
  m=stepFixture('step_mobile',6,3);for(const[c,r]of [[1,3],[3,3],[2,2],[2,4]])currentRoomGrid[c][r]=TILE.ROCK;check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:5,row:3}),'暂时无法接触玩家时接近最近可达位置');m.col=4;check(stepEnemyChase(m)===null,'已在最近可达位置时才等待');
  m=stepFixture('step_mobile',6,3);const shotOrigin=m.px;singleStepAct('shoot','right');animateMonsters(.05);check(m.hp===3.5&&m.px===shotOrigin&&m.col===5,'玩家射击先命中，怪物表现等弹体到达后再移动');
  m=stepFixture('step_fighter',4,3);check(SINGLE_STEP.plans.get(m.id).type==='strike','近战两格攻击');singleStepAct('move','up');check(m.col===4&&SINGLE_STEP.plans.get(m.id).type==='recover','近战原地攻击后恢复一回合');
  m=stepFixture('step_fixed',8,3);check(!SINGLE_STEP.plans.get(m.id).path.length,'固定炮台射程外原地不动');
  for(const id of ['step_x','step_cross']){m=stepFixture(id,4,6);const plan=SINGLE_STEP.plans.get(m.id);check(plan.jump&&plan.path.length===1,id+'追击跳跃');const probe={...m,...plan.path[0]};check(stepEnemyCells(probe).some(p=>p.col===player.col&&p.row===player.row),id+'追击落点能够射到玩家');singleStepAct('shoot','left');check(m._stepJump&&SINGLE_STEP.plans.get(m.id).type==='fan',id+'落地后锁定攻击');}
  m=stepFixture('step_big',4,3);m.hp=1;SINGLE_STEP.bonus=2;singleStepAct('shoot','right');check(monsters.length===2&&monsters.every(m=>m.cfgId==='step_small'&&m._stepJump),'击杀最后一只大史莱姆先分裂再判清房');check(inCombat&&SINGLE_STEP.bonus===1,'分裂不能提前清房或中止子弹时间');const children=JSON.stringify(monsters.map(m=>[m.col,m.row]));singleStepAct('shoot','left');check(children===JSON.stringify(monsters.map(m=>[m.col,m.row])),'奖励期间新生小史莱姆冻结');
  m=stepFixture('step_bomber',3,3);singleStepAct('move','left');check(!monsters.length&&playerStats.hp===5&&SINGLE_STEP.bonus===2,'自爆八格锁定、闪避与自身死亡');
  // 旧普通怪物入口兼容映射为新怪物，Boss保留原配置并执行锁定计划。
  for(const id of Object.keys(MONSTER_DB).filter(k=>!k.startsWith('_'))){
   m=stepFixture(id,8,3);playerStats.hp=playerStats.maxHp=100;
   check(SINGLE_STEP.plans.has(m.id),id+'应有初始计划');
   for(let i=0;i<20&&!gameOver;i++){singleStepAct('shoot','up');check(monsters.every(m=>m.col>=0&&m.row>=0&&m.col+(m.size||1)<=COLS&&m.row+(m.size||1)<=ROWS),id+'落位在房间内');}
  }
  const initialFloorNum=currentFloor.floorNum;
  for(const floorNum of [1,2,3]){currentFloor.floorNum=floorNum;for(let trial=0;trial<4;trial++){stepFixture();currentFloor.floorNum=floorNum;spawnRoomMonsters();singleStepReset();check(monsters.length>0&&monsters.every(m=>stepEnemyDefinition(m)),'各层普通房间仅刷新怪物');check(monsters.every(m=>SINGLE_STEP.plans.has(m.id)),'刷怪后计划完整');}}currentFloor.floorNum=initialFloorNum;
  // 使用原始房门触发真正的换房流程，再验证三层入口。
  resetGameToFloor1();gameStarted=true;gameOver=false;
  const room=currentFloor.rooms.find(r=>r.id===currentRoomId),door=Object.entries(room.doors).find(([,d])=>d?.targetRoomId);
  if(door){const [dir,d]=door,pos=DOOR_POS[dir];d.open=true;room.locked=false;monsters=[];inCombat=false;player.col=pos.col;player.row=pos.row;const oldId=currentRoomId;singleStepAct('move',dir);check(transition?.active,'走门触发换房');finishTransition();check(currentRoomId!==oldId&&SINGLE_STEP.room===currentRoomId,'新房生成新计划');check(monsters.every(m=>SINGLE_STEP.plans.has(m.id)),'新房怪物均有计划');}
  for(const n of [2,3,1]){enterFloor(n);check(currentFloor.floorNum===n&&SINGLE_STEP.room===currentRoomId,'楼层切换重置调度');}
  stepFixture();document.getElementById('floor-banner').classList.remove('show');particles=[];damageNumbers=[];
 });
 const before=await page.evaluate(()=>({step:SINGLE_STEP.step,col:player.col,row:player.row}));await page.keyboard.press('Space');await page.keyboard.press('Escape');assert.deepEqual(await page.evaluate(()=>({step:SINGLE_STEP.step,col:player.col,row:player.row})),before,'空格/Esc不推进不回溯');
 await page.keyboard.press('w');assert.equal(await page.evaluate(()=>SINGLE_STEP.bonus),2);
 assert.equal(await page.evaluate(()=>stepTimeFx.active&&!!stepTimeFx.enter),true,'触发输入立即启动冻结效果');
 await page.keyboard.press('w');assert.equal(await page.evaluate(()=>SINGLE_STEP.step),1,'实际动作未完成时丢弃连按');
 await page.waitForFunction(()=>performance.now()>=stepInputUntil&&player.targetPx===null&&!monsters.some(m=>m._visualPath?.length||m._stepJump));
 await page.keyboard.press('ArrowLeft');await page.waitForFunction(()=>performance.now()>=stepInputUntil);await page.keyboard.press('ArrowLeft');
 assert.equal(await page.evaluate(()=>SINGLE_STEP.bonus===0&&!stepTimeFx.active&&!!stepTimeFx.release),true,'最后额外行动键入时立即解除');
 await page.waitForTimeout(370);assert.equal(await page.evaluate(()=>stepTimeFx.release),null,'解除在320毫秒内完成');
 assert.equal(await page.evaluate(()=>SINGLE_STEP.step),3,'停手后无历史输入自动行动');
 await page.keyboard.press('m');const paused=await page.evaluate(()=>SINGLE_STEP.step);await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>SINGLE_STEP.step),paused);await page.keyboard.press('Escape');
 assert.deepEqual(errors,[],'正式版浏览器无错误');
 const backup=await browser.newPage();await backup.goto(pathToFileURL(path.resolve(__dirname,'../../backup/Project-turnbased-shoot-rewind-2026-11-05/dist/turnbased-shoot-demo-pack.html')).href);await backup.waitForFunction(()=>currentFloor&&Object.keys(MONSTER_DB).length>=14);assert.equal(await backup.evaluate(()=>typeof SINGLE_STEP),'undefined','完整备份仍为原回溯版');await backup.close();
 console.log('PASS: 正式版新怪物与各层刷怪、原Boss、分裂/自爆/跳跃、输入不积压、即时冻结特效、清房/梯子、地图及备份启动');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
