const assert=require('node:assert/strict'),path=require('node:path');const {pathToFileURL}=require('node:url');
const {chromium}=require('../tools/runtime-deps.cjs').runtimeDependency('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{for(const file of ['turnbased-shoot-demo-pack.html','custom-arena.html']){
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../'+file)).href);await page.waitForFunction(()=>currentFloor&&ITEMS_DB.single_step_agility);
 await page.evaluate(()=>{
 const check=(v,msg)=>{if(!v)throw Error(msg);};
 check(!ITEMS_DB.trial_weapon_straight&&!ITEMS_DB.trial_weapon_bullet,'测试枪管不在目录');
 check(ITEMS_DB.single_step_agility.quality==='legendary'&&ITEMS_DB.single_step_fire_rate.quality==='common','新品质');
 playerInventory=[];recalcAllStats();applyItem('single_step_fire_rate');check(playerStats.fireRate===2.5&&canPickupItem('single_step_fire_rate'),'射速可叠加');applyItem('single_step_fire_rate');recalcAllStats();check(playerStats.fireRate===3,'重算保留射速');
 applyItem('single_step_agility');applyItem('single_step_agility');check(singleStepAgility()===4&&canPickupItem('single_step_agility'),'敏捷可重复叠加');scrapUpdateHUD();check(document.getElementById('step-agility').textContent==='4','敏捷HUD');
 currentRoomGrid=parseGrid(BUILTIN_TEMPLATES().open.tiles);currentFloor.rooms.find(r=>r.id===currentRoomId).grid=currentRoomGrid;tileData={};monsters=[];bombs=[];resourcesOnGround=[];itemsOnGround=[];gameStarted=true;gameOver=false;transition=null;floorFadeBusy=false;
 Object.assign(player,{col:2,row:3,invincibleSteps:0,targetPx:null,targetPy:null});playerStats.hp=10;playerStats.range=4;singleStepReset();
 const m={...MONSTER_DB.step_mobile,id:++monsterIdCounter,cfgId:'step_mobile',col:5,row:3,hp:7,maxHp:7,size:1};monsters=[m];SINGLE_STEP.plans.set(m.id,{type:'shot',cells:[{col:2,row:3}],origin:{col:5,row:3},dir:{dx:-1,dy:0},attackColor:'red'});
 check(singleStepAct('move','up')&&SINGLE_STEP.bonus===4,'实际闪避给予4次行动');monsters=[];SINGLE_STEP.bonus=0;SINGLE_STEP.plans.clear();
 playerInventory=[];playerStats.fireRate=2.5;SINGLE_STEP.shotRemainder=0;
 const counts=[];for(let i=0;i<4;i++){const shot=weaponPrepareShot();counts.push(shot.shotsPerFire);if(i===0)singleStepAct('move','left');}
 check(counts.join(',')==='2,3,2,3','移动不影响2/3交替');
 playerStats.fireRate=3;check(weaponPrepareShot().shotsPerFire===3,'整数射速');
 // 一次指令产生的出弹数由主身与残影共用，不各自计算余量。
 playerStats.fireRate=2.5;SINGLE_STEP.shotRemainder=0;const prepared=weaponPrepareShot(),baseRay=weaponShootRay;const damage=[];
 try{weaponShootRay=(origin,dx,dy,value)=>damage.push(value);fireSingleStepWeapon(player,{dx:1,dy:0},prepared);fireSingleStepWeapon(player,{dx:1,dy:0},prepared);}finally{weaponShootRay=baseRay;}
 check(damage.length===4&&SINGLE_STEP.shotRemainder===.5,'残影复制同一批次');
 for(const effect of ['burstCharge','heavyCharge']){
  playerInventory=['trial_weapon_'+effect];SINGLE_STEP.weaponCharge=0;playerStats.fireRate=2.5;
  for(let i=0;i<3;i++)check(weaponPrepareShot()===null,'未释放充能');check(SINGLE_STEP.weaponCharge===7.5,'满后仍不自动释放');
  const release=weaponPrepareShot();check(SINGLE_STEP.weaponCharge===1.5&&release.repetitions===(effect==='burstCharge'?3:1)&&release.scale===(effect==='burstCharge'?2:6),'倍率及余量');
  check(weaponPrepareShot()===null&&weaponPrepareShot()===null&&SINGLE_STEP.weaponCharge===6.5,'余量加速下一轮');check(weaponPrepareShot()&&SINGLE_STEP.weaponCharge===.5,'下一轮再按一次释放');
  SINGLE_STEP.weaponCharge=0;playerStats.fireRate=3;check(!weaponPrepareShot()&&!weaponPrepareShot()&&SINGLE_STEP.weaponCharge===6,'射速3两次充满');check(weaponPrepareShot(),'第三次释放');
 }
 playerInventory=[];SINGLE_STEP.shotRemainder=.5;resetGameToFloor1();check(SINGLE_STEP.shotRemainder===0&&singleStepAgility()===2,'新局清空小数余量和属性成长');
 });assert.deepEqual(errors,[]);await page.close();console.log('PASS: '+file+' 射速叠加、小数出弹、残影、充能余量与敏捷实际奖励');}
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
