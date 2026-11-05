const assert=require('assert'),path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('../tools/runtime-deps.cjs').runtimeDependency('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/turnbased-shoot-demo-pack.html')).href);
 await page.waitForFunction(()=>currentFloor&&Object.keys(MONSTER_DB).length>=14);await page.evaluate(()=>startGameFromMenu());
 await page.evaluate(()=>{
  const check=(v,msg)=>{if(!v)throw Error(msg);};
  window.stepFixture=(id='flying_eye_i',c=5,r=3)=>{
   currentRoomGrid=parseGrid(BUILTIN_TEMPLATES().open.tiles);const room=currentFloor.rooms.find(r=>r.id===currentRoomId);room.grid=currentRoomGrid;room.type='normal';room.bossLadderPlaced=false;
   monsters=[];bombs=[];bullets=[];resourcesOnGround=[];itemsOnGround=[];pendingBossLanding=null;floorFadeBusy=false;transition=null;gameStarted=true;gameOver=false;
   Object.assign(playerStats,{hp:5,maxHp:5,attack:3.5,range:6});Object.assign(player,{col:2,row:3,...(()=>{const p=gridToPixel(2,3);return {px:p.x,py:p.y,targetPx:null,targetPy:null};})(),invincibleSteps:0});playerResources.blueHearts=0;
   document.getElementById('death-modal').classList.remove('show');document.getElementById('floor-fade').style.opacity='0';initTileData();spawnMonsterAtRandomPos(id);const m=monsters.at(-1);Object.assign(m,{col:c,row:r,px:gridToPixel(c,r).x,py:gridToPixel(c,r).y,_spawnedThisTurn:false});inCombat=true;singleStepReset();return m;
  };
  let m=stepFixture();check(SINGLE_STEP.plans.get(m.id).type==='shot','基础射手初始锁定');singleStepAct('move','up');check(SINGLE_STEP.bonus===2&&playerStats.hp===5,'正式版闪避奖励');
  const frozen=JSON.stringify([monsters.map(m=>[m.id,m.col,m.row]),[...SINGLE_STEP.plans],combatRng]);singleStepAct('shoot','left');singleStepAct('shoot','left');check(SINGLE_STEP.bonus===0&&frozen===JSON.stringify([monsters.map(m=>[m.id,m.col,m.row]),[...SINGLE_STEP.plans],combatRng]),'正式版两次额外行动冻结所有阶段');
  singleStepAct('shoot','left');check(SINGLE_STEP.step===4,'恢复普通行动');
  m=stepFixture('crack_maw_i');singleStepAct('shoot','up');check(m.col===2&&playerStats.hp===4&&!(player.col===m.col&&player.row===m.row),'正式版冲刺穿过并挤出 '+JSON.stringify({m:[m.col,m.row],p:[player.col,player.row,playerStats.hp],plan:[...SINGLE_STEP.plans.values()]} ));
  m=stepFixture();singleStepAct('move','up');currentRoomGrid[2][1]=TILE.SPIKE;singleStepAct('move','up');check(SINGLE_STEP.bonus===0&&playerStats.hp===4,'额外行动踩刺立即结束');
  m=stepFixture();currentRoomGrid[4][3]=TILE.ROCK;initTileData();const terrainBefore=JSON.stringify(tileData);singleStepReset();for(let i=0;i<5;i++){SINGLE_STEP.plans.clear();singleStepPlan();}check(JSON.stringify(tileData)===terrainBefore,'攻击规划不能损伤地形');
  m=stepFixture();singleStepAct('move','up');playerResources.bombs=3;placeBomb(10,5);const b=bombs.at(-1),timer=b.timer;singleStepAct('shoot','left');singleStepAct('shoot','left');check(b.timer===timer,'奖励期炸弹倒计时冻结');singleStepAct('shoot','left');check(b.timer===timer-1,'普通步炸弹推进一次');
  m=stepFixture();m.hp=1;singleStepAct('shoot','right');check(!monsters.length&&!inCombat,'瞬发击杀及清房');check(!actionHistoryActive(),'正式版不创建回溯历史');
  m=stepFixture();m.hp=1;currentFloor.rooms.find(r=>r.id===currentRoomId).type='boss';singleStepAct('shoot','right');check(currentRoomGrid[6][1]===TILE.LADDER,'Boss清场保留梯子流程');
  m=stepFixture();const itemId=Object.keys(ITEMS_DB).find(k=>!playerInventory.includes(k)&&ITEMS_DB[k].effects?.attack);if(itemId){spawnItemOnGrid(2,2,itemId);const attack=playerStats.attack;singleStepAct('move','up');check(playerInventory.includes(itemId)&&playerStats.attack>attack,'正式版道具自动拾取与攻击加成');}
  // 每个旧怪物和Boss均能生成并执行锁定计划，不删除原有配置。
  for(const id of Object.keys(MONSTER_DB).filter(k=>!k.startsWith('_'))){
   m=stepFixture(id,8,3);playerStats.hp=playerStats.maxHp=100;
   check(SINGLE_STEP.plans.has(m.id),id+'应有初始计划');
   for(let i=0;i<20&&!gameOver;i++){singleStepAct('shoot','up');check(monsters.every(m=>m.col>=0&&m.row>=0&&m.col+(m.size||1)<=COLS&&m.row+(m.size||1)<=ROWS),id+'落位在房间内');}
  }
  // 使用原始房门触发真正的换房流程，再验证三层入口。
  resetGameToFloor1();gameStarted=true;gameOver=false;
  const room=currentFloor.rooms.find(r=>r.id===currentRoomId),door=Object.entries(room.doors).find(([,d])=>d?.targetRoomId);
  if(door){const [dir,d]=door,pos=DOOR_POS[dir];d.open=true;room.locked=false;monsters=[];inCombat=false;player.col=pos.col;player.row=pos.row;const oldId=currentRoomId;singleStepAct('move',dir);check(transition?.active,'走门触发换房');finishTransition();check(currentRoomId!==oldId&&SINGLE_STEP.room===currentRoomId,'新房生成新计划');check(monsters.every(m=>SINGLE_STEP.plans.has(m.id)),'新房怪物均有计划');}
  for(const n of [2,3,1]){enterFloor(n);check(currentFloor.floorNum===n&&SINGLE_STEP.room===currentRoomId,'楼层切换重置调度');}
  stepFixture();document.getElementById('floor-banner').classList.remove('show');particles=[];damageNumbers=[];
 });
 const before=await page.evaluate(()=>({step:SINGLE_STEP.step,col:player.col,row:player.row}));await page.keyboard.press('Space');await page.keyboard.press('Escape');assert.deepEqual(await page.evaluate(()=>({step:SINGLE_STEP.step,col:player.col,row:player.row})),before,'空格/Esc不推进不回溯');
 await page.keyboard.press('w');assert.equal(await page.evaluate(()=>SINGLE_STEP.bonus),2);
 await page.keyboard.press('m');const paused=await page.evaluate(()=>SINGLE_STEP.step);await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>SINGLE_STEP.step),paused);await page.keyboard.press('Escape');
 if(process.argv[2])await page.screenshot({path:path.resolve(process.argv[2]),fullPage:true});
 assert.deepEqual(errors,[],'正式版浏览器无错误');
 const backup=await browser.newPage();await backup.goto(pathToFileURL(path.resolve(__dirname,'../../backup/Project-turnbased-shoot-rewind-2026-11-05/dist/turnbased-shoot-demo-pack.html')).href);await backup.waitForFunction(()=>currentFloor&&Object.keys(MONSTER_DB).length>=14);assert.equal(await backup.evaluate(()=>typeof SINGLE_STEP),'undefined','完整备份仍为原回溯版');await backup.close();
 console.log('PASS: 子弹时间正式版、14种怪物计划、冻结、环境中断、炸弹、清房/梯子、地图及备份启动');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
