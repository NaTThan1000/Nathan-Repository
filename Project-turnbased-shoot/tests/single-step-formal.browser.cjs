// 浏览器回归只验证功能，不生成PNG预览文件。
const assert=require('assert'),path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('../tools/runtime-deps.cjs').runtimeDependency('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/turnbased-shoot-demo-pack.html')).href);
 await page.waitForFunction(()=>currentFloor&&MONSTER_DB.step_mobile&&Object.keys(RESOURCE_DB).length);
 const floorSounds=await page.evaluate(()=>{
  const playFloorSound=SFX.floor;
  let menuSounds=0,playingSounds=0;
  try{
   SFX.floor=()=>{if(gameStarted)playingSounds++;else menuSounds++;};
   enterFloor(1);
   startGameFromMenu();
   enterFloor(2);
   enterFloor(1);
   return {menuSounds,playingSounds};
  }finally{SFX.floor=playFloorSound;}
 });
 assert.deepEqual(floorSounds,{menuSounds:0,playingSounds:2},'菜单初始化静音，游戏内切层正常播放');
 await page.evaluate(singleStepItems=>{
  const check=(v,msg)=>{if(!v)throw Error(msg);};
  const approved=new Set(Object.keys(singleStepItems));
  check(approved.size===60&&Object.keys(ITEMS_DB).length===60&&Object.keys(ITEMS_DB).every(id=>approved.has(id)),'正式版加载全部60件道具');
  check(ITEM_POOL_ALL.length===60&&ITEM_POOL_ALL.every(id=>approved.has(id)),'正式掉落池覆盖全部60件道具');
  const baseRandom=Math.random;
  try{
   for(const quality of ['common','rare','legendary']){
    const items=Object.values(singleStepItems).filter(item=>item.quality===quality);
    items.forEach((item,index)=>{
     Math.random=()=>(index+.5)/items.length;
     check(rollItem(quality)===item.id,'正式版可从对应品质抽到 '+item.name);
    });
   }
   Math.random=()=>.3;
   check(ITEMS_DB[rollItem(null,'item_drop_treasure_room')].quality==='rare'&&
     ITEMS_DB[rollItem(null,'item_drop_boss_room')].quality==='legendary','宝物房和Boss房使用各自的品质权重');
   applyItem('trial_weapon_blast');
   Math.random=()=>.5;
   check(rollItem('legendary')!=='trial_weapon_blast','正式抽取跳过已经装备的同款武器');
   applyPreRolledLoot([{type:'item',cfgId:'trial_weapon_blast',itemDropTable:'item_drop_boss_room'}],3,3);
   check(itemsOnGround.length===1&&itemsOnGround[0].cfgId!=='trial_weapon_blast','预抽后才拾到的同款会重新选道具');
  }finally{
   Math.random=baseRandom;playerInventory=[];recalcAllStats();itemsOnGround.length=0;
  }
  window.stepFixture=(id='flying_eye_i',c=5,r=3)=>{
   currentRoomGrid=parseGrid(BUILTIN_TEMPLATES().open.tiles);const room=currentFloor.rooms.find(r=>r.id===currentRoomId);room.grid=currentRoomGrid;room.type='normal';room.bossLadderPlaced=false;
   monsters=[];bombs=[];bullets=[];resourcesOnGround=[];itemsOnGround=[];pendingBossLanding=null;floorFadeBusy=false;transition=null;gameStarted=true;gameOver=false;
   Object.assign(playerStats,{hp:5,maxHp:5,attack:3.5,range:6});Object.assign(player,{col:2,row:3,...(()=>{const p=gridToPixel(2,3);return {px:p.x,py:p.y,targetPx:null,targetPy:null};})(),invincibleSteps:0,hitFlash:0,shootTimer:0});playerResources.blueHearts=0;
   document.getElementById('death-modal').classList.remove('show');document.getElementById('floor-fade').style.opacity='0';initTileData();spawnMonsterAtRandomPos(id);const m=monsters.at(-1);Object.assign(m,{col:c,row:r,px:gridToPixel(c,r).x,py:gridToPixel(c,r).y,_spawnedThisTurn:false});inCombat=true;singleStepReset();return m;
  };
  const itemRoom=currentFloor.rooms.find(r=>r.id===currentRoomId);
  stepFixture('step_fixed',10,5);
  itemRoom.type='treasure';itemRoom.itemSpawned=false;
  spawnTreasureRoomItem();
  check(itemsOnGround.length===1&&ITEMS_DB[itemsOnGround[0].cfgId].weaponTrial,'正式宝物房生成一件武器道具');
  itemsOnGround.length=0;itemRoom.itemSpawned=false;
  spawnItemOnGrid(2,2,'trial_weapon_dual');
  singleStepAct('move','up');
  check(equippedWeaponTrial('pattern')==='dual'&&itemsOnGround.length===0,'正式版走到道具卡片上装配枪管');
  singleStepAct('shoot','right');
  check(SINGLE_STEP.shots.filter(shot=>shot.player).length===2,'正式版用拾到的双管实际射出两发');
  playerInventory=[];recalcAllStats();updateItemBar();
  itemRoom.type='shop';
  rollShopSlots(itemRoom,currentFloor.floorNum);
  const goods=itemRoom._shopSlots.filter(slot=>slot.type==='item');
  check(goods.length===2&&goods.every(slot=>approved.has(slot.cfgId)&&slot.price>0)&&goods[0].cfgId!==goods[1].cfgId,
   '正式商店生成两件不同的正式池商品');
  itemRoom._shopSlots=null;
  stepFixture('step_fixed',10,5);
  spawnItemOnGrid(3,3,'trial_weapon_timedShield');
  singleStepAct('move','right');scrapUpdateHUD();
  check(trialPassive('timedShield')&&document.querySelector('#scrap-hearts .arena-heart-shield.ready'),'正式版踩格拾取护盾后立即发光');
  const shieldHp=playerStats.hp;
  damagePlayer(1);
  check(arenaEffects.timedCharge===0&&playerStats.hp===shieldHp,'正式版护盾可实际挡伤');
  singleStepAct('move','left');
  check(arenaEffects.timedCharge===1,'正式版移动一格充能一点');
  playerInventory=[];recalcAllStats();updateItemBar();
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
  m=stepFixture();m.hp=1;m._killLoot=[];
  itemRoom.type='boss';itemRoom.itemDropped=false;
  const originalClearDrop=itemRoom.roomClearDrop;
  itemRoom.roomClearDrop={itemDropTable:'item_drop_boss_room'};
  singleStepAct('shoot','right');
  check(currentRoomGrid[6][1]===TILE.LADDER&&itemsOnGround.length===1&&ITEMS_DB[itemsOnGround[0].cfgId].weaponTrial,'Boss清场生成梯子和正式武器奖励');
  itemRoom.roomClearDrop=originalClearDrop;itemRoom.itemDropped=false;
  m=stepFixture();const itemId=Object.keys(ITEMS_DB).find(k=>!playerInventory.includes(k)&&ITEMS_DB[k].effects?.attack);if(itemId){spawnItemOnGrid(2,2,itemId);const attack=playerStats.attack;singleStepAct('move','up');check(playerInventory.includes(itemId)&&playerStats.attack>attack,'正式版道具自动拾取与攻击加成');}
  check(Object.keys(STEP_ENEMIES).length===9,'九种新怪物配置');
  check(Object.values(SQUAD_TEMPLATES.squads).filter(s=>s.roomTypes.includes('normal')).every(s=>s.monsters.every(id=>id.startsWith('step_'))),'普通房间小队全部替换');
  m=stepFixture('step_mobile',3,4);check(SINGLE_STEP.plans.get(m.id).type==='chase','射手暂定四方向，不在对角攻击');
  m=stepFixture('step_mobile',5,5);check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:4,row:5}),'横向距离较大先沿横轴靠近');
  m=stepFixture('step_mobile',3,6);check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:3,row:5}),'纵向距离较大先沿纵轴靠近');
  m=stepFixture('step_mobile',2,2);Object.assign(player,{col:5,row:4});check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:3,row:2}),'正方向按较长轴靠近');
  Object.assign(player,{col:4,row:4});const random=monsterActionRandom;try{monsterActionRandom=()=>.1;const a=stepEnemyChase(m);monsterActionRandom=()=>.9;const b=stepEnemyChase(m);check(a.col!==b.col&&a.row!==b.row,'相等距离随机选择不同轴');}finally{monsterActionRandom=random;}
  m=stepFixture('step_mobile',5,5);currentRoomGrid[4][5]=TILE.ROCK;check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:4,row:5}),'飞行射手沿较长轴越过障碍');
  m=stepFixture('step_fighter',5,5);currentRoomGrid[4][5]=TILE.ROCK;check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:5,row:4}),'地面怪较长轴被墙挡住时尝试另一个方向');
  m=stepFixture('step_mobile',5,5);spawnMonsterAtRandomPos('step_small');Object.assign(monsters.at(-1),{col:4,row:5});check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:5,row:4}),'其他怪物同样作为寻路障碍');
  m=stepFixture('step_fighter',4,4);currentRoomGrid[3][4]=currentRoomGrid[4][3]=TILE.ROCK;check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:4,row:5}),'两条靠近方向受阻时允许先远离绕路');
  const visited=new Set([m.col+','+m.row]);for(let i=0;i<8&&Math.abs(m.col-player.col)+Math.abs(m.row-player.row)>1;i++){const next=stepEnemyChase(m);check(next&&!visited.has(next.col+','+next.row),'寻路持续推进，不折返振荡');Object.assign(m,next);visited.add(m.col+','+m.row);}check(Math.abs(m.col-player.col)+Math.abs(m.row-player.row)===1,'绕过拐角最终到达玩家邻格');
  m=stepFixture('step_fighter',6,3);for(const[c,r]of [[1,3],[3,3],[2,2],[2,4]])currentRoomGrid[c][r]=TILE.ROCK;check(JSON.stringify(stepEnemyChase(m))===JSON.stringify({col:5,row:3}),'暂时无法接触玩家时接近最近可达位置');m.col=4;check(stepEnemyChase(m)===null,'已在最近可达位置时才等待');
  m=stepFixture('step_mobile',6,3);const shotOrigin=m.px;singleStepAct('shoot','right');animateMonsters(.05);check(m.hp===3.5&&m.px===shotOrigin&&m.col===5,'玩家射击先命中，怪物表现等弹体到达后再移动');
  m=stepFixture('step_fighter',4,3);check(SINGLE_STEP.plans.get(m.id).type==='strike','近战两格攻击');singleStepAct('move','up');check(m.col===4&&SINGLE_STEP.plans.get(m.id).type==='recover','近战原地攻击后恢复一回合');
  m=stepFixture('step_fixed',8,3);check(!SINGLE_STEP.plans.get(m.id).path.length,'固定炮台射程外原地不动');
  for(const id of ['step_x','step_cross']){m=stepFixture(id,4,6);const plan=SINGLE_STEP.plans.get(m.id);check(plan.jump&&plan.path.length===1,id+'追击跳跃');const probe={...m,...plan.path[0]};check(stepEnemyCells(probe).some(p=>p.col===player.col&&p.row===player.row),id+'追击落点能够射到玩家');singleStepAct('shoot','left');check(m._stepJump&&SINGLE_STEP.plans.get(m.id).type==='fan',id+'落地后锁定攻击');}
  m=stepFixture('step_big',4,3);m.hp=1;SINGLE_STEP.bonus=2;singleStepAct('shoot','right');check(monsters.length===2&&monsters.every(m=>m.cfgId==='step_small'&&m._stepJump),'击杀最后一只大史莱姆先分裂再判清房');check(inCombat&&SINGLE_STEP.bonus===1,'分裂不能提前清房或中止子弹时间');const children=JSON.stringify(monsters.map(m=>[m.col,m.row]));singleStepAct('shoot','left');check(children===JSON.stringify(monsters.map(m=>[m.col,m.row])),'奖励期间新生小史莱姆冻结');
  m=stepFixture('step_bomber',3,3);singleStepAct('move','left');check(!monsters.length&&playerStats.hp===5&&SINGLE_STEP.bonus===0,'躲开最后一只怪物的自爆后清房取消子弹时间');
  const placeAlly=(col,row)=>{
   spawnMonsterAtRandomPos('step_fixed');
   const ally=monsters.at(-1);
   return Object.assign(ally,{col,row,_spawnedThisTurn:false});
  };
  m=stepFixture('step_mobile',5,5);placeAlly(4,5);
  check(stepEnemyPlan(m).type!=='shot','射手不因射程内有其他怪物而锁定攻击');
  m=stepFixture('step_bomber',3,3);const blastAlly=placeAlly(3,4),outside=placeAlly(5,4);
  const outsideHp=outside.hp;
  currentRoomGrid[4][2]=TILE.ROCK;initTileData();
  singleStepAct('shoot','up');
  check(playerStats.hp===4&&!monsters.includes(m)&&!monsters.includes(blastAlly)&&outside.hp===outsideHp&&
   currentRoomGrid[4][2]===TILE.FLOOR&&stepVisualEvents.some(e=>e.type==='bomb-blast'&&e.cells.length===9),
   '自爆复用九格炸弹伤害与表现，摧毁障碍并伤到其他怪物');
  m=stepFixture('step_fixed',4,3);const meleeAlly=placeAlly(5,3),meleeAllyHp=meleeAlly.hp;
  const adjacent={type:'attack_adjacent',range:2,damage:1};
  const context={monster:m,targetCol:m.col,targetRow:m.row,sz:1};
  Object.assign(meleeAlly,{size:2});
  resolveAfterEffects({after_effect:[adjacent]},context);
  check(playerStats.hp===4&&meleeAlly.hp===meleeAllyHp,'旧版范围近战默认只伤害玩家');
  resolveAfterEffects({after_effect:[{...adjacent,hitsAllies:true}]},context);
  check(meleeAlly.hp===meleeAllyHp-1,'显式开启友伤时，多格怪物同一次近战只扣血一次');
  const threatArt=()=>{
   const draw=scrapDraw,calls=[];
   scrapDraw=(key,...args)=>{if(['redGrid','blueGrid','alert'].includes(key))calls.push(key);return draw(key,...args);};
   try{drawDangerOverlay();drawMonsters();return calls;}
   finally{scrapDraw=draw;}
  };
  m=stepFixture('step_fixed',5,2);
  singleStepAct('move','up');
  check(playerStats.hp===5&&m.col===5&&m.row===2&&SINGLE_STEP.plans.get(m.id).type==='shot','移动进射程时怪物留在原格预告攻击');
  singleStepAct('shoot','left');
  check(playerStats.hp===4,'预告的攻击在下一次正常行动结算');

  m=stepFixture('step_fixed',5,3);
  const opposite=placeAlly(0,3);
  SINGLE_STEP.plans.set(opposite.id,stepEnemyPlan(opposite));
  singleStepAct('move','up');
  check(SINGLE_STEP.bonus===2&&arenaEffects.avoided.size===2&&arenaEffects.avoided.has(m.id)&&arenaEffects.avoided.has(opposite.id),'同一步闪避的怪物全部标记');
  damageMonster(opposite,opposite.hp);
  m.hp=1;Object.assign(player,{col:2,row:3});
  singleStepAct('shoot','right');
  check(!hasMonstersAlive()&&SINGLE_STEP.bonus===0,'冻结期间击杀最后一只怪立即结束子弹时间');

  m=stepFixture('step_fixed',10,5);
  currentRoomGrid[2][3]=TILE.SPIKE;
  SINGLE_STEP.spikeTurn=1;
  const spikeImage=()=>{
   ctx.clearRect(0,0,GAME_W,GAME_H);
   const q=cellRect(2,3);
   drawWorldSpike(q,2,3);
   const scale=ctx.getTransform().a;
   return Array.from(ctx.getImageData(q.xL*scale,q.yT*scale,q.w*scale,q.h*scale).data).join(',');
  };
  const extendedArt=spikeImage(),phases=[],images=[];
  for(let i=0;i<3;i++){
   singleStepAct('shoot','left');phases.push(singleStepSpikeAt(2,3));images.push(spikeImage());
  }
  check(images[0]===images[1]&&images[0]!==images[2]&&images[0]!==extendedArt,'地刺缩回两步使用稳定孔板，预警和伸出显示不同画面');
  check(phases.join(',')==='retracted,retracted,warning'&&playerStats.hp===5&&threatArt().join(',')==='redGrid,alert','缩回两步，准备伸出时脚下显示红格和感叹号');
  singleStepAct('move','up');
  check(SINGLE_STEP.bonus===2&&playerStats.hp===5&&singleStepSpikeAt(2,3)==='extended'&&threatArt().length===0,'离开即将伸出的尖刺触发子弹时间');
  singleStepAct('shoot','left');
  check(SINGLE_STEP.spikeTurn===0,'子弹时间冻结尖刺');

  m=stepFixture('step_mobile',5,3);
  currentRoomGrid[5][3]=TILE.ROCK;initTileData();
  const rockHp=tileData['5,3'].hp;
  SINGLE_STEP.bonus=2;singleStepAct('shoot','right');
  check(m.hp===m.maxHp&&tileData['5,3'].hp===rockHp,'岩石挡住对同格飞行怪的射击，自身不受伤');
  currentRoomGrid[5][3]=TILE.SPIKE;
  m._killLoot=[{type:'item',cfgId:'trial_weapon_dual'}];damageMonster(m,m.hp);
  check(itemsOnGround.some(i=>i.cfgId==='trial_weapon_dual'&&Math.abs(i.col-5)+Math.abs(i.row-3)===1&&currentRoomGrid[i.col][i.row]===TILE.FLOOR),'尖刺上的怪物死亡时道具移到邻近空地');
  monsters=[];
  for(let i=0;i<12;i++)spawnMonsterAtRandomPos(i%2?'step_mobile':'step_fighter');
  check(monsters.length===12&&monsters.every(o=>Math.abs(o.col-player.col)+Math.abs(o.row-player.row)>4&&currentRoomGrid[o.col][o.row]!==TILE.SPIKE),'随机刷怪避开入口四格及尖刺');

  m=stepFixture('duke_fly',8,3);
  for(let c=7;c<=10;c++)for(let r=2;r<=5;r++)currentRoomGrid[c][r]=TILE.ROCK;
  initTileData();
  const dukeNext={col:9,row:3};
  SINGLE_STEP.plans.set(m.id,{type:'legacy-move',path:[dukeNext],cells:singleStepFootprint(m,dukeNext.col,dukeNext.row)});
  check(m.movementTags.includes('飞行')&&threatArt().filter(k=>k==='redGrid').length===4,'飞行公爵在障碍上仍预告整个移动伤害范围');
  singleStepAct('shoot','left');
  check(m.col===9&&currentRoomGrid[m.col][m.row]===TILE.ROCK,'公爵可移动到障碍物上');
  for(let c=8;c<=11;c++)for(let r=2;r<=5;r++)currentRoomGrid[c][r]=TILE.ROCK;
  m._turnAfterAction={type:'summon',monsterId:'duke_floater',chance:1};
  handleDukeSummon(m);
  const summoned=monsters.find(o=>o!==m);
  check(summoned?.movementTags.includes('飞行')&&currentRoomGrid[summoned.col][summoned.row]===TILE.ROCK,'公爵召唤物能落在障碍物上');

  m=stepFixture('step_fixed',4,3);
  m.hp=1;placeBomb(10,5);
  const doorSound=SFX.door;let doorSounds=0;
  SFX.door=()=>{doorSounds++;};
  try{
   singleStepAct('shoot','right');
   updateRoomCombatState();updateRoomCombatState();
   check(!inCombat&&bombs.length===1&&doorSounds===1,'留有未爆炸弹的清房只播放一次开门音效');
   check(singleStepInputAction('move','right'),'清房移动不受上一发子弹余效阻塞');
   updateMove(CELL*.6/singleStepMoveSpeed(),singleStepMoveSpeed());
   check(player.targetPx!==null&&singleStepInputAction('move','right')&&player.col===4,'探索移动可以衔接尚未完全播放的步伐');
  }finally{SFX.door=doorSound;}

  m=stepFixture('boss_jumper_i',8,4);
  const smallJump=SINGLE_STEP.plans.get(m.id);
  check(smallJump.type==='legacy-jump'&&smallJump.cells.length>0&&threatArt().includes('redGrid')&&threatArt().includes('alert'),'Boss普通跳跃显示落点红格和感叹号');
  const shockwaveAlly=placeAlly(7,3);
  const landAction=MONSTER_DB[m.cfgId].actions.find(action=>action.type==='jump_big_land');
  Object.assign(player,{col:5,row:3});
  m._charging=true;
  SINGLE_STEP.legacy.set(m.id,{queue:[],counter:0,landing:{monster:m,targetCol:5,targetRow:3,landAction}});
  const shockwave=singleStepLegacyPlan(m);
  SINGLE_STEP.plans.set(m.id,shockwave);
  check(shockwave.cells.some(cell=>cell.col===shockwaveAlly.col&&cell.row===shockwaveAlly.row),'其他怪物在砸地范围内');
  Object.assign(player,{col:2,row:3});
  const warnings=threatArt();
  check(warnings.filter(key=>key==='alert').length===1&&warnings.filter(key=>key==='redGrid').length===shockwave.cells.length,'玩家离开已锁定的砸地区域后仍显示预警');
  m=stepFixture('step_mobile',5,3);
  const shotWarning=threatArt();
  Object.assign(player,{col:2,row:2});
  check(shotWarning.includes('alert')&&JSON.stringify(threatArt())===JSON.stringify(shotWarning),'玩家离开已锁定的射线后仍显示预警');
  placeAlly(4,3);
  check(threatArt().join(',')==='alert','贴身怪物挡住整条射线，射手仍准备开枪');
  m=stepFixture('step_mobile',5,5);
  placeAlly(4,5);
  SINGLE_STEP.plans.set(m.id,stepEnemyPlan(m));
  check(threatArt().length===0,'只有其他怪物在射程内时不会锁定射击或显示预警');
  for(const [col,row] of [[4,5],[9,5]]){
   m=stepFixture('step_mobile',col,row);
   const movement=SINGLE_STEP.plans.get(m.id);
   check(movement.type==='chase'&&movement.path.length===1&&threatArt().length===0,'唯一可移动的怪物会追击，普通移动不显示蓝格');
  }
  m=stepFixture('step_fighter',5,3);
  spawnMonsterAtRandomPos('step_fighter');
  const replacement=Object.assign(monsters.at(-1),{col:10,row:5});
  singleStepPlan();
  check(SINGLE_STEP.plans.get(replacement.id).type==='wander','已有追击者时保留其他怪物的游走');
  m.hp=1;SINGLE_STEP.bonus=2;singleStepAct('shoot','right');
  check(SINGLE_STEP.plans.get(replacement.id).type==='chase'&&replacement.col===10&&replacement.row===5,
   '追击者死亡后补选追击计划，子弹时间内仍保持冻结');

  m=stepFixture('step_fighter',5,3);
  spawnMonsterAtRandomPos('step_fighter');
  const nextChaser=Object.assign(monsters.at(-1),{col:10,row:5});
  singleStepPlan();
  m.hp=1;singleStepAct('shoot','right');
  check(nextChaser.col===9&&nextChaser.row===5,'普通步中击杀唯一追击者后，候补当步接替追击');

  m=stepFixture('step_fighter',5,3);
  applyItem('trial_weapon_knockback');
  singleStepAct('shoot','right');
  check(m.col===6&&m.row===3,'击退后跳过本步原定追击');
  playerInventory=[];recalcAllStats();updateItemBar();

  m=stepFixture('step_fighter',4,3);
  Object.assign(player,{col:6,row:3});
  const strike=stepEnemyAttackPlan(m,player);
  SINGLE_STEP.plans.set(m.id,strike);
  SINGLE_STEP.bonus=1;
  arenaKnockback(m,1,0);
  check(singleStepAttackPreview(m).cells.map(p=>p.col).join(',')==='6,7','位移后按原方向和两格射程更新近战红格');
  Object.assign(player,{col:7,row:3});
  singleStepAct('shoot','up');
  check(playerStats.hp===5,'最后一次子弹时间行动不执行位移后的攻击');
  singleStepAct('shoot','up');
  check(playerStats.hp===4&&m.col===5,'恢复后从新位置向原方向执行近战');

  m=stepFixture('duke_fly',7,3);
  SINGLE_STEP.plans.set(m.id,{type:'legacy-move',path:[{col:8,row:3}],cells:singleStepFootprint(m,8,3)});
  SINGLE_STEP.bonus=1;arenaKnockback(m,1,0);
  check(singleStepAttackPreview(m).cells.every(c=>c.col===9||c.col===10),'苍蝇公爵移动红格跟随位移');
  singleStepAct('shoot','left');singleStepAct('shoot','left');
  check(m.col===9,'公爵恢复后执行同方向移动');

  m=stepFixture('boss_jumper_i',6,3);
  SINGLE_STEP.plans.set(m.id,{type:'legacy-jump',path:[{col:5,row:3}],cells:singleStepFootprint(m,5,3),attackCells:[]});
  SINGLE_STEP.bonus=1;arenaKnockback(m,0,1);
  check(singleStepAttackPreview(m).cells.every(c=>c.row===4||c.row===5),'跳跃 Boss 的落地红格跟随位移');
  singleStepAct('shoot','left');singleStepAct('shoot','left');
  check(m.col===5&&m.row===4,'跳跃 Boss 实际落点跟随位移');
  for(const hitsAllies of [false,true]){
   m=stepFixture('boss_jumper_i',8,4);
   const shockwaveAlly=placeAlly(7,3),shockwaveAllyHp=shockwaveAlly.hp;
   Object.assign(player,{col:4,row:3});
   const landAction={after_effect:[{type:'attack_side',range:1,damage:1,hitsAllies}]};
   m._charging=true;
   SINGLE_STEP.legacy.set(m.id,{queue:[],counter:0,landing:{monster:m,targetCol:5,targetRow:3,landAction}});
   const landing=singleStepLegacyPlan(m);
   singleStepApplyPlan(m,landing);
   check(m.col===5&&m.row===3&&playerStats.hp<5&&shockwaveAlly.hp===shockwaveAllyHp-Number(hitsAllies),'Boss冲击波伤害玩家，只按配置伤害怪物');
  }
  m=stepFixture('boss_jumper_i',8,4);
  const landingAlly=placeAlly(5,3),landingAllyHp=landingAlly.hp;
  pendingBossLanding={monster:m,targetCol:5,targetRow:3};
  executeBossLanding();
  check(!isInMonsterFootprint(m,landingAlly.col,landingAlly.row)&&landingAlly.hp===landingAllyHp,'旧版Boss落地避开怪物占位');
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
  if(door){
   const [dir,d]=door,pos=DOOR_POS[dir];d.open=true;room.locked=false;monsters=[];inCombat=false;player.col=pos.col;player.row=pos.row;
   applyItem('trial_weapon_backArmor');arenaEffects.armorReady=false;
   arenaGroundEffect({col:3,row:3},'slime',3);
   const oldId=currentRoomId;singleStepAct('move',dir);check(transition?.active,'走门触发换房');finishTransition();
   check(currentRoomId!==oldId&&SINGLE_STEP.room===currentRoomId,'新房生成新计划');
   check(monsters.every(m=>SINGLE_STEP.plans.has(m.id)),'新房怪物均有计划');
   check(arenaEffects.armorReady&&arenaEffects.ground.size===0&&arenaEffects.roomHadEnemies===hasMonstersAlive(),'正式换房恢复背甲、清除液体并跟踪清房');
  }
  arenaEffects.floorAttack=1;recalcAllStats();
  for(const n of [2,3,1]){enterFloor(n);check(currentFloor.floorNum===n&&SINGLE_STEP.room===currentRoomId,'楼层切换重置调度');}
  check(arenaEffects.floorAttack===0&&playerStats.attack===3.5,'正式换层清除本层攻击加成');
  stepFixture();document.getElementById('floor-banner').classList.remove('show');particles=[];damageNumbers=[];
 },require('../Configs/item-db.json').singleStepItems);
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
