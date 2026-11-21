const assert=require('node:assert/strict'),path=require('node:path');const {pathToFileURL}=require('node:url');const {chromium}=require('../tools/runtime-deps.cjs').runtimeDependency('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{const page=await browser.newPage({viewport:{width:1280,height:1000}});await page.goto(pathToFileURL(path.resolve(__dirname,'../custom-arena.html')).href);await page.waitForFunction(()=>!document.querySelector('#arena-start').disabled);await page.evaluate(()=>{
 const check=(v,msg)=>{if(!v)throw Error(msg);};
 const load=(...effects)=>{arena.placements=new Map();arenaLoad(false);playerInventory=[];for(const e of effects)applyItem('trial_weapon_'+e);playerStats.fireRate=1;playerStats.range=6;playerStats.attack=2;};
 const enemy=(col,row,kind='step_mobile')=>{const cfg=MONSTER_DB[kind],p=gridToPixel(col,row);const m={...cfg,cfgId:kind,id:++monsterIdCounter,col,row,px:p.x,py:p.y,hp:100,maxHp:100,size:cfg.size||1,movementTags:kind==='step_mobile'?['飞行']:['地面']};monsters.push(m);return m;};
 check(!ITEMS_DB.trial_weapon_shield&&RESOURCE_DB.blue_heart_full,'一次护盾只保留蓝心资源');
 for(const effect of ['slimeTrail','toxicTrail']){load(effect);const turn=arenaEffects.turn;singleStepAct('move','up');check(arenaEffects.ground.get('2,3').effects[effect==='slimeTrail'?'slime':'toxic']===turn+6,'地面持续6回合');}
 load();const boss=enemy(3,3,'boss_jumper_i');boss.jumperVanished=true;check(!isMonsterAt(3,3)&&!isInMonsterFootprint(boss,3,3),'隐藏Boss不占格');check(singleStepAct('move','right')&&player.col===3,'可走入消失Boss原位置');
 load('backArmor');player.facing='right';const shooter=enemy(5,3);
 const hp=playerStats.hp;
 singleStepApplyPlan(shooter,{type:'shot',cells:[{col:player.col,row:player.row}],dir:{dx:1,dy:0}});check(playerStats.hp===hp&&!arenaEffects.armorReady,'背甲按实际来向，忽略怪物位于正面');
 for(const shape of ['teleport','lob','slam']){load('backArmor');const m=enemy(1,1,'boss_jumper_i');const p={type:'boss-phase',stage:shape==='teleport'?'slam':shape,cells:[{col:2,row:3}],hit:true,to:{col:2,row:3},dir:{dx:1,dy:0}};singleStepApplyPlan(m,p);check(arenaEffects.armorReady&&playerStats.hp<STEP_STARTING_HP,'无方向攻击不被背甲防御');}
 for(const tile of [TILE.ROCK,TILE.POOP])for(const [effect,body]of [['arc',null],['blast',null],['ghost',null],['lob',null],[null,'energy']]){
  load(...[effect,body].filter(Boolean));const m=enemy(4,3);currentRoomGrid[4][3]=tile;initTileData();SINGLE_STEP.bonus=2;singleStepAct('shoot','right');check(m.hp<100,'特殊子弹命中障碍上飞行怪 '+effect+body+tile);
 }
 load();spawnItemOnGrid(5,3,'single_step_attack');updateItemTooltip();check(!document.getElementById('item-tooltip').classList.contains('show'),'3格不弹窗');player.col=3;updateItemTooltip();check(document.getElementById('item-tooltip').classList.contains('show'),'2格弹窗');
 for(const pattern of ['dual','triple','trident','fork','twin','random'])for(const trajectory of ['decay','gain','lob','burstCharge','heavyCharge']){
  load(pattern,trajectory);const calls=[],ray=weaponShootRay;weaponShootRay=(o,dx,dy,d,r,options)=>calls.push({dx,dy,d,options});
  try{fireSingleStepWeapon(player,{dx:1,dy:0},trajectory==='burstCharge'?{repetitions:3,scale:2}:trajectory==='heavyCharge'?{repetitions:1,scale:6}:{repetitions:1,scale:1});}finally{weaponShootRay=ray;}
  check(calls.length>=2&&calls.every(c=>c.options.trajectory===trajectory),'所有枪管继承发射类型 '+pattern+trajectory);
 }
 // 实际支路伤害与缩放同时验证，避免只检查参数传递。
 load('trident','decay');const targets=[enemy(4,3),enemy(4,1),enemy(4,5)];SINGLE_STEP.bonus=2;singleStepAct('shoot','right');check(targets.every(m=>m.hp===targets[0].hp)&&targets.every(m=>m.hp<100),'三叉三路衰减伤害一致');check(SINGLE_STEP.shots.every(s=>s.fromScale>s.toScale),'三路弹体均显示缩小');
 load('slipStep');const red=enemy(5,3);SINGLE_STEP.plans.set(red.id,{type:'shot',attackColor:'red',dir:{dx:-1,dy:0},cells:[{col:2,row:3}]});const nativeNext=stepTestHooks.nextEnemyPlan;let observed;
 stepTestHooks.nextEnemyPlan=(m,p)=>{observed={col:player.col,row:player.row};return nativeNext(m,p);};try{singleStepAct('move','up');}finally{stepTestHooks.nextEnemyPlan=nativeNext;}check(player.row===3&&observed.row===3,'返回原位后才选择敌人下一行动');
 load();let pushed=enemy(3,3,'step_fixed');SINGLE_STEP.bonus=1;const hpPush=playerStats.hp;
 check(singleStepAct('move','right')&&player.col===3&&pushed.col===4&&pushed.row===3&&playerStats.hp===hpPush-1&&pushed.hp===100,'玩家主动挤怪仅自身受伤');
 load();pushed=enemy(3,3,'step_fixed');for(const [c,r]of [[4,3],[3,2],[3,4]])currentRoomGrid[c][r]=TILE.ROCK;initTileData();SINGLE_STEP.bonus=1;
 check(singleStepAct('move','right')&&player.col===3&&pushed.col===2&&pushed.row===3&&pushed.hp===100,'无空位交换玩家与怪物位置');
 load();arenaEffects.moveCredit=1;let turn=arenaEffects.turn;check(singleStepAct('shoot','right')&&!arenaEffects.moveCredit&&arenaEffects.turn===turn+1,'放弃额外移动按普通射击推进');
 arenaEffects.shootCredit=1;turn=arenaEffects.turn;check(singleStepAct('move','up')&&!arenaEffects.shootCredit&&arenaEffects.turn===turn+1,'放弃额外射击按普通移动推进');
 arenaEffects.moveCredit=1;currentRoomGrid[player.col+1][player.row]=TILE.ROCK;check(!singleStepAct('move','right')&&arenaEffects.moveCredit===1,'无效移动保留奖励');
 load();const mover=enemy(5,3);SINGLE_STEP.plans.set(mover.id,{type:'chase',cells:[],path:[{col:4,row:3}]});
 let blue=0;const oldStroke=ctx.strokeRect;ctx.strokeRect=function(...a){if(ctx.strokeStyle==='#7ac5ff')blue++;return oldStroke.apply(this,a);};try{drawDangerOverlay();}finally{ctx.strokeRect=oldStroke;}check(blue===1,'普通怪移动落点蓝框');
 load();const bigMover=enemy(8,3,'boss_jumper_i');SINGLE_STEP.plans.set(bigMover.id,stepBossSequence(bigMover,'move'));blue=0;ctx.strokeRect=function(...a){if(ctx.strokeStyle==='#7ac5ff')blue++;return oldStroke.apply(this,a);};try{drawDangerOverlay();}finally{ctx.strokeRect=oldStroke;}check(blue===4,'大体积Boss落点按四格显示');
 });console.log('PASS: 地面持续、回位判定、隐藏占位、背甲方向、资源护盾、提示距离、障碍飞行与枪管组合矩阵');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
