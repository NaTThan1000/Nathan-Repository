// 正式版和自定义场共用的道具效果。限时地格和怪物状态只随正常步推进。
const ARENA_STATUS_CHANCE = .35;
const ARENA_SHIELD_CHARGE = 20;
const arenaEffects = {};
reservedHeartSlots = () => Number(trialPassive('timedShield'));

function arenaResetEffects() {
  Object.assign(arenaEffects,{
    turn:0, ground:new Map(), avoided:new Set(), extended:false,
    moveCredit:0, shootCredit:0, shotRewarded:false, freeAction:false, enemyActing:false,
    armorReady:false, timedCharge:0, rageKills:0, rageReady:false,
    roomsCleared:0, roomClearRecorded:false, roomHadEnemies:false, floorAttack:0, unstableShots:0,
    notice:'',
  });
}
arenaResetEffects();

function arenaEffectNotice(message) {
  arenaEffects.notice = message;
  if (!document.body.classList.contains('custom-arena-page')) {
    damageNumbers.push({x:player.px,y:player.py-8,text:message,life:1.5,maxLife:1.5,vx:0,vy:-12,color:'#b5fbf4'});
  }
}

function resetItemRoomEffects() {
  arenaEffects.ground.clear();
  arenaEffects.avoided.clear();
  arenaEffects.roomClearRecorded = false;
  arenaEffects.roomHadEnemies = hasMonstersAlive();
  arenaEffects.armorReady = trialPassive('backArmor');
  arenaEffects.freeAction = false;
  arenaEffects.notice = '';
}

const resetItemGameBase = resetGameToFloor1;
resetGameToFloor1 = function({preserveItemEffects=false}={}) {
  if (!preserveItemEffects) arenaResetEffects();
  return resetItemGameBase();
};

const enterItemRoomBase = finishTransition;
finishTransition = function() {
  if (!transition) return;
  enterItemRoomBase();
  resetItemRoomEffects();
};

const enterItemFloorBase = enterFloor;
enterFloor = function(floor) {
  if (arenaEffects.floorAttack) {
    arenaEffects.floorAttack = 0;
    recalcAllStats();
  }
  enterItemFloorBase(floor);
  resetItemRoomEffects();
};

const arenaRecalcStatsBase = recalcAllStats;
let arenaBaseMaxHp = playerStats.maxHp;
recalcAllStats = function() {
  arenaRecalcStatsBase(arenaBaseMaxHp);
  playerStats.attack = Math.round((playerStats.attack+arenaEffects.floorAttack)*10)/10;
};

const arenaTrialApplyBase = applyItem;
applyItem = function(id) {
  const effect = ITEMS_DB[id]?.weaponTrial?.effect;
  const hadItem = playerInventory.includes(id);
  const result = arenaTrialApplyBase(id);
  if (!hadItem && playerInventory.includes(id)) {
    if (effect === 'backArmor') arenaEffects.armorReady = true;
    if (effect === 'timedShield') arenaEffects.timedCharge = ARENA_SHIELD_CHARGE;
    if (effect === 'supplyDrone') {
      arenaEffectNotice('补给无人机已启动。累计清空 3 间房后发放补给。');
    }
    if (effect === 'unstable') arenaEffects.unstableShots = 0;
    if (effect === 'luck') arenaEffectNotice('幸运框架：当前有效值 0');
  }
  return result;
};

function arenaRecordKill(monster) {
  if (trialPassive('killPill')) {
    arenaEffects.floorAttack += .2;
    recalcAllStats();
  }
  if (trialPassive('rageShield') && !arenaEffects.rageReady && ++arenaEffects.rageKills === 10) {
    arenaEffects.rageKills = 0;
    arenaEffects.rageReady = true;
    arenaEffectNotice('狂暴护盾已充能');
  }
  if (!arenaEffects.freeAction && trialPassive('killMove')) arenaEffects.moveCredit = 1;
  if (trialPassive('killShot') && !arenaEffects.shotRewarded) {
    arenaEffects.shootCredit++;
    arenaEffects.shotRewarded = true;
  }
  if (SINGLE_STEP.bonus && trialPassive('bulletBonus') && !arenaEffects.extended &&
      arenaEffects.avoided.has(monster.id)) {
    SINGLE_STEP.bonus++;
    arenaEffects.extended = true;
    arenaEffectNotice('额外回合');
  }
}

const arenaTrialDamageMonster = damageMonster;
damageMonster = function(monster,damage,...args) {
  const alive = monster.hp > 0 && monsters.includes(monster);
  const result = arenaTrialDamageMonster(monster,damage,...args);
  if (alive && monster.hp <= 0) {
    if (!arenaEffects.enemyActing) arenaRecordKill(monster);
    const {at=performance.now(),lane=0} = args[0] || {};
    arenaParasiteBlast(monster,at,lane);
  }
  return result;
};

function arenaDamageFromBehind(attacker) {
  if (!attacker) return false;
  const facing = DIR_VEC[player.facing];
  const dx = attacker.col + ((attacker.size||1)-1)/2 - player.col;
  const dy = attacker.row + ((attacker.size||1)-1)/2 - player.row;
  return facing.dx*dx+facing.dy*dy < 0;
}

const arenaTrialDamagePlayer = damagePlayer;
damagePlayer = function(amount,attackerId) {
  if (amount > 0 && player.invincibleSteps <= 0) {
    if (trialPassive('backArmor') && arenaEffects.armorReady &&
        arenaDamageFromBehind(monsters.find(m=>m.id===attackerId))) {
      arenaEffects.armorReady = false;
      arenaEffectNotice('充能背甲挡住了背后攻击');
      return;
    }
    if (trialPassive('timedShield') && arenaEffects.timedCharge === ARENA_SHIELD_CHARGE) {
      arenaEffects.timedCharge = 0;
      arenaEffectNotice('充能护盾挡住了伤害');
      return;
    }
    if (trialPassive('rageShield') && arenaEffects.rageReady) {
      arenaEffects.rageReady = false;
      arenaEffectNotice('狂暴护盾挡住了伤害');
      return;
    }
  }
  const hp = playerStats.hp + playerResources.blueHearts;
  const result = arenaTrialDamagePlayer(amount,attackerId);
  if (trialPassive('hurtPill') && playerStats.hp+playerResources.blueHearts < hp) {
    arenaEffects.floorAttack += .5;
    recalcAllStats();
  }
  return result;
};

function arenaRoomCleared() {
  if (!arenaEffects.roomHadEnemies || arenaEffects.roomClearRecorded) return;
  arenaEffects.roomClearRecorded = true;
  if (!trialPassive('supplyDrone')) return;
  if (++arenaEffects.roomsCleared < 3) {
    arenaEffectNotice('清房进度 '+arenaEffects.roomsCleared+'/3'+
      (document.body.classList.contains('custom-arena-page')?'。点击「下一间」继续。':''));
    return;
  }
  arenaEffects.roomsCleared = 0;
  const supplies = [['coins','coin_gold','金币'],['keys','key_single','钥匙'],['bombs','bomb_single','炸弹']];
  const least = Math.min(...supplies.map(([key])=>playerResources[key]));
  const candidates = supplies.filter(([key])=>playerResources[key]===least);
  const [,id,name] = candidates[Math.floor(Math.random()*candidates.length)];
  handleResourcePickup({cfgId:id,col:player.col,row:player.row,px:player.px,py:player.py});
  arenaEffectNotice('补给无人机送来'+name);
}

const arenaTrialRoomCombat = updateRoomCombatState;
updateRoomCombatState = function() {
  const hadEnemies = inCombat;
  const result = arenaTrialRoomCombat();
  if (hadEnemies && !stepSplitting && !hasMonstersAlive()) arenaRoomCleared();
  return result;
};

function arenaCanMoveMonster(m,col,row) {
  return singleStepLegal(m,col,row) && !singleStepFootprint(m,col,row)
    .some(cell=>cell.col===player.col&&cell.row===player.row);
}

function arenaKnockback(m,dx,dy) {
  if (m.arenaDummy || !arenaCanMoveMonster(m,m.col+dx,m.row+dy)) return;
  singleStepDisplaceMonster(m,m.col+dx,m.row+dy);
}

function arenaStatusUntil(m,key,steps) {
  const statuses = m.arenaStatuses ||= {};
  statuses[key] = Math.max(statuses[key]??0,arenaEffects.turn+steps);
}

function arenaStatusActive(m,key,turn=arenaEffects.turn) {
  return (m.arenaStatuses?.[key]??-1) >= turn;
}

function arenaGroundEffect(cell,key,steps) {
  const id = cell.col+','+cell.row;
  if (!arenaEffects.ground.has(id)) arenaEffects.ground.set(id,{...cell,effects:{}});
  arenaEffects.ground.get(id).effects[key] = arenaEffects.turn+steps;
}

function arenaParasiteBlast(m,at,lane) {
  const charge = m.arenaParasite;
  if (!charge) return;
  delete m.arenaParasite;
  const damage = Math.round(playerStats.attack * charge.stacks * 50) / 100;
  weaponBlast(m.col,m.row,damage,at,lane);
}

stepTestHooks.onWeaponHit = function(m,cell,{dx,dy,at,lane,ammo}) {
  if (ammo === 'acid') arenaGroundEffect(cell,'acid',5);
  if (m.hp <= 0 || !monsters.includes(m)) return;
  if (ammo === 'knockback') {
    arenaKnockback(m,dx,dy);
  } else if (ammo === 'parasite') {
    const charge = m.arenaParasite ||= {stacks:0,expires:arenaEffects.turn+5};
    if (++charge.stacks >= 5) arenaParasiteBlast(m,at,lane);
  } else if (['fear','petrify','sticky','ink','short'].includes(ammo) && Math.random() < ARENA_STATUS_CHANCE) {
    if (ammo === 'sticky') {
      if (arenaStatusActive(m,'sticky')) {
        delete m.arenaStatuses.sticky;
        arenaStatusUntil(m,'rooted',3);
      } else if (!arenaStatusActive(m,'rooted')) {
        arenaStatusUntil(m,'sticky',3);
        m.arenaSkipMove = true;
      }
    } else {
      arenaStatusUntil(m,ammo,2);
    }
  }
};

function arenaApplyGround(m,cells) {
  if (m.hp <= 0 || m.jumperVanished || m.movementTags?.includes('飞行')) return;
  if (m.arenaGroundTurn !== arenaEffects.turn) {
    m.arenaGroundTurn = arenaEffects.turn;
    m.arenaGroundApplied = new Set();
  }
  const slimeContacts = new Set();
  for (const {col,row} of cells) {
    const cell = col+','+row;
    const effects = arenaEffects.ground.get(cell)?.effects;
    for (const [key,expires] of Object.entries(effects||{})) {
      if (expires < arenaEffects.turn || m.hp <= 0) continue;
      if (key === 'slime') {
        if (!m.arenaSlimeContacts?.has(cell)) m.arenaSlimeSlow = true;
        if (isInMonsterFootprint(m,col,row)) slimeContacts.add(cell);
      } else if (!m.arenaGroundApplied.has(key)) {
        m.arenaGroundApplied.add(key);
        damageMonster(m,key==='acid'?1:.5);
      }
    }
  }
  m.arenaSlimeContacts = slimeContacts;
}

stepTestHooks.beforeEnemies = function() {
  arenaEffects.turn++;
  for (const m of [...monsters]) {
    if (m.arenaParasite?.expires <= arenaEffects.turn) arenaParasiteBlast(m,performance.now(),0);
    if (monsters.includes(m)) arenaApplyGround(m,monsterCells(m));
  }
  for (const [id,field] of arenaEffects.ground) {
    if (Object.values(field.effects).every(expires=>expires<arenaEffects.turn)) arenaEffects.ground.delete(id);
  }
};

function arenaDefaultEnemyPlan(m) {
  const config = stepEnemyDefinition(m);
  if (!config || config.id === 'step_fixed') return {type:'wait',cells:[]};
  const choices = config.jump
    ? Array.from({length:COLS*ROWS},(_,i)=>({col:i%COLS,row:Math.floor(i/COLS)}))
    : STEP_CARDINAL.map(([dx,dy])=>({col:m.col+dx,row:m.row+dy}));
  const next = singleStepPick(choices.filter(({col,row})=>
    (col!==m.col||row!==m.row)&&arenaCanMoveMonster(m,col,row)));
  return {type:'wander',cells:[],path:next?[next]:[],jump:config.jump};
}

const arenaTrialResolvePlan = singleStepResolvePlan;
const itemEffectPlanBase = singleStepPlan;
singleStepPlan = function() {
  for (const m of monsters) {
    if (m.arenaDelayedMove) SINGLE_STEP.plans.set(m.id,m.arenaDelayedMove);
  }
  itemEffectPlanBase();
};

singleStepResolvePlan = function(m,plan,{preview=false,turn=arenaEffects.turn+Number(preview)}={}) {
  if (m.arenaDummy || plan.type==='displaced-wait') return plan;
  // 实际行动前会先推进场内回合。绘制预警时只读取这一步的状态。
  if (arenaStatusActive(m,'petrify',turn)) return {type:'wait',cells:[]};
  if (m.arenaDelayedMove) {
    if (arenaStatusActive(m,'rooted',turn)) return {type:'wait',cells:[]};
    const saved = m.arenaDelayedMove;
    if (!preview) {
      delete m.arenaDelayedMove;
      if (arenaStatusActive(m,'sticky',turn)) m.arenaSkipMove = true;
    }
    return {...arenaTrialResolvePlan(m,saved),delayedMove:true};
  }
  const attack = stepTestHooks.isEnemyWindup?.(plan) || (plan.cells.length && !['wander','chase','legacy-move'].includes(plan.type));
  if (arenaStatusActive(m,'ink',turn) || (attack && arenaStatusActive(m,'short',turn))) {
    if (preview) return {type:'wait',cells:[]};
    plan = arenaDefaultEnemyPlan(m);
  } else if (!attack && plan.type !== 'recover') {
    if (arenaStatusActive(m,'fear',turn)) {
      if (preview) return {type:'wait',cells:[]};
      const dist = (col,row)=>Math.abs(col-player.col)+Math.abs(row-player.row);
      const away = STEP_CARDINAL.map(([x,y])=>({col:m.col+x,row:m.row+y}))
        .filter(({col,row})=>arenaCanMoveMonster(m,col,row)&&dist(col,row)>dist(m.col,m.row));
      const next = singleStepPick(away);
      plan = {type:'wander',cells:[],path:next?[next]:[]};
    } else if (!preview && trialPassive('bombDecoy') && stepEnemyDefinition(m)?.id !== 'step_fixed') {
      const dist = b=>Math.abs(b.col-m.col)+Math.abs(b.row-m.row);
      const range = stepEnemyDefinition(m)?.chase ?? 0;
      const decoy = bombs.filter(b=>b.roomId===currentRoomId&&Number.isFinite(b.timer)&&dist(b)<=range)
        .sort((a,b)=>dist(a)-dist(b))[0];
      if (decoy) {
        const next = stepEnemyChase(m,decoy);
        plan = {type:'chase',cells:[],path:next?[next]:[]};
      }
    }
  }
  const moves = plan.path?.length || plan.type === 'charge';
  if (moves && m.arenaSlimeSlow) {
    if (!preview) {
      m.arenaSlimeSlow = false;
      m.arenaDelayedMove = plan;
    }
    return {type:'wait',cells:[]};
  }
  if (moves && (m.arenaSkipMove || arenaStatusActive(m,'rooted',turn))) {
    if (!preview) m.arenaSkipMove = false;
    return {type:'wait',cells:[]};
  }
  if (!preview && moves && arenaStatusActive(m,'sticky')) m.arenaSkipMove = true;
  return arenaTrialResolvePlan(m,plan);
};

const arenaTrialEnemyAction = singleStepApplyPlan;
singleStepApplyPlan = function(m,plan) {
  const from = {col:m.col,row:m.row};
  const pathLength = m._visualPath?.length ?? 0;
  arenaEffects.enemyActing = true;
  let result;
  try { result = arenaTrialEnemyAction(m,plan); }
  finally { arenaEffects.enemyActing = false; }
  if (monsters.includes(m) && (m.col!==from.col || m.row!==from.row)) {
    const traversed = [...(m._visualPath||[]).slice(pathLength),m];
    arenaApplyGround(m,traversed.flatMap(p=>singleStepFootprint(m,p.col,p.row)));
  }
  return result;
};

stepTestHooks.blockPush = function(m) {
  if (!trialPassive('brace')) return false;
  const wasEnemy = arenaEffects.enemyActing;
  arenaEffects.enemyActing = false;
  try { damageMonster(m,playerStats.attack); }
  finally { arenaEffects.enemyActing = wasEnemy; }
  arenaEffectNotice('防冲姿态挡住挤出并反伤');
  return true;
};

stepTestHooks.beginAction = () => { arenaEffects.freeAction = false; arenaEffects.shotRewarded = false; };
stepTestHooks.consumeExtra = function(type) {
  const key = type==='move'?'moveCredit':'shootCredit';
  if (!arenaEffects[key]) return false;
  arenaEffects[key]--;
  arenaEffects.freeAction = true;
  return true;
};

stepTestHooks.rangeBonus = trajectory => trajectory==='lob'?2:0;
stepTestHooks.lobTarget = function(origin,dx,dy,range) {
  let last = 0, crate = 0, rock = 0;
  for (let steps=1;steps<=range;steps++) {
    const col=origin.col+dx*steps,row=origin.row+dy*steps;
    if (col<0||col>=COLS||row<0||row>=ROWS) break;
    last = steps;
    if (monsters.some(m=>m.hp>0&&!m.jumperVanished&&isInMonsterFootprint(m,col,row))) return {steps,monster:true};
    const tile = currentRoomGrid[col][row];
    if (!crate&&tile===TILE.POOP) crate=steps;
    if (!rock&&tile===TILE.ROCK) rock=steps;
  }
  return {steps:crate||rock||last};
};

function arenaAutoTarget(origin,dx,dy,range,lob) {
  if (lob) return !!stepTestHooks.lobTarget(origin,dx,dy,range).monster;
  const body = equippedWeaponTrial('body'), shell = equippedWeaponTrial('shell');
  const piercesTerrain = body==='energy'||shell==='ghost';
  for (let steps=1;steps<=range;steps++) {
    const col=origin.col+dx*steps,row=origin.row+dy*steps;
    if (!piercesTerrain && singleStepBlocksBullet(col,row)) return false;
    if (monsters.some(m=>m.hp>0&&!m.jumperVanished&&isInMonsterFootprint(m,col,row))) return true;
  }
  return false;
}

stepTestHooks.onMove = function(old,{dx,dy}) {
  if (trialPassive('timedShield')) {
    const distance = Math.abs(player.col-old.col)+Math.abs(player.row-old.row);
    arenaEffects.timedCharge = Math.min(ARENA_SHIELD_CHARGE,arenaEffects.timedCharge+distance);
  }
  if (trialPassive('toxicTrail')) arenaGroundEffect(old,'toxic',3);
  if (trialPassive('slimeTrail')) arenaGroundEffect(old,'slime',3);
  for (const bomb of bombs) {
    if (bomb.roomId===currentRoomId&&bomb.claymore&&bomb.awaitDeparture&&bomb.col===old.col&&bomb.row===old.row) {
      bomb.claymore = {dx:-dx,dy:-dy};
      bomb.awaitDeparture = false;
    }
  }
  if (!trialPassive('runGun')) return;
  const body=equippedWeaponTrial('body'), trajectory=equippedWeaponTrial('trajectory');
  const lob=trajectory==='lob', bonus=lob?2:0;
  const range=body==='shotgun'?Math.min(6,weaponShotgunRange()+bonus)
    :Math.floor(playerStats.range)+bonus+(['energy','laser'].includes(body)?2:0);
  const choices=STEP_CARDINAL.filter(([x,y])=>arenaAutoTarget(player,x,y,range,lob));
  if (choices.length) {
    const [x,y] = choices[Math.floor(Math.random()*choices.length)];
    SFX.shoot();
    fireSingleStepWeapon(player,{dx:x,dy:y},{repetitions:1,scale:1});
  }
};

stepTestHooks.onShot = function(origin,dir,charge) {
  if (equippedWeaponTrial('body')!=='unstable' || ++arenaEffects.unstableShots<4) return;
  arenaEffects.unstableShots = 0;
  const range = weaponShotgunRange();
  const shell = equippedWeaponTrial('shell'), ammo = equippedWeaponTrial('ammo');
  weaponShotgunVolley(origin,dir,playerStats.attack*charge.scale,range,{shell,ammo,body:'shotgun'},performance.now()+45);
  stepVisualEvents.push({type:'unstable-recoil',at:performance.now()+45});
};

stepTestHooks.onDodge = function(old,avoided) {
  arenaEffects.avoided = new Set(avoided.map(m=>m.id));
  arenaEffects.extended = false;
  if (trialPassive('slipStep') && !isWall(old.col,old.row) && !isMonsterAt(old.col,old.row)) {
    const pos = gridToPixel(old.col,old.row);
    Object.assign(player,{...old,targetPx:pos.x,targetPy:pos.y});
    if (!trialPassive('boots')) checkSpikeUnderPlayer();
    singleStepPickup();
  }
  if (SINGLE_STEP.damaged || !trialPassive('counterTime')) return;
  const target = avoided.find(m=>monsters.includes(m)&&m.hp>0&&!m.jumperVanished);
  if (!target) return;
  const start = performance.now();
  const dir = {dx:Math.sign(target.col-player.col),dy:Math.sign(target.row-player.row)};
  const travel = Math.hypot(target.col-player.col,target.row-player.row)*CELL/CFG.BULLET_SPEED*1000;
  singleStepVisualShot(player,target,true,dir,{start});
  weaponDamageMonster(target,playerStats.attack,start+travel,0);
};

const arenaTrialPlaceBomb = placeBomb;
placeBomb = function(col,row) {
  const bomb = arenaTrialPlaceBomb(col,row);
  if (!bomb) return;
  if (trialPassive('claymore')) {
    const {dx,dy} = DIR_VEC[player.facing];
    bomb.claymore = {dx:-dx,dy:-dy};
    bomb.awaitDeparture = true;
  }
  if (trialPassive('remoteBomb')) {
    bomb.remote = true;
    bomb.timer = Infinity;
  }
  return bomb;
};

const arenaTrialPushBomb = pushBomb;
pushBomb = function(bomb,dx,dy) {
  const {col,row} = bomb;
  const result = arenaTrialPushBomb(bomb,dx,dy);
  if (bomb.claymore && (bomb.col!==col || bomb.row!==row)) {
    bomb.claymore = {dx:Math.sign(bomb.col-col),dy:Math.sign(bomb.row-row)};
    bomb.awaitDeparture = false;
  }
  return result;
};

const arenaTrialDetonate = detonateBomb;
detonateBomb = function(bomb) {
  const claymoreRadius = 2;
  const affected = bomb.claymore && getDiamondRange(bomb.col,bomb.row,claymoreRadius).filter(({col,row})=>{
    if (col<0||col>=COLS||row<0||row>=ROWS) return false;
    const dx=col-bomb.col,dy=row-bomb.row;
    const {dx:fx,dy:fy}=bomb.claymore;
    const forward=dx*fx+dy*fy;
    return forward>0 && forward>=Math.abs(dx*fy-dy*fx);
  });
  arenaTrialDetonate(bomb,affected);
  if (trialPassive('bombBaby') && Math.random()<.25) {
    spawnResourceOnGrid(bomb.col,bomb.row,'bomb_single');
    arenaEffectNotice('炸弹宝宝掉落了一个炸弹');
  }
};

stepTestHooks.bombAction = function() {
  const remote = bombs.filter(b=>b.roomId===currentRoomId&&b.remote);
  if (!remote.length) return undefined;
  bombs = bombs.filter(b=>!remote.includes(b));
  for (const bomb of remote) detonateBomb(bomb);
  arenaEffectNotice('遥控炸弹已引爆');
  return true;
};

const arenaLiquidColors = {
  toxic:{dark:'#163e23',base:'#43b84f',rim:'#8ce982',shine:'#d5ffbb'},
  slime:{dark:'#a2b1b5',base:'#e8f0ed',rim:'#ffffff',shine:'#ffffff'},
  acid:{dark:'#65501c',base:'#d6ac23',rim:'#ffe65d',shine:'#fff8b2'},
};

function arenaDrawPuddle(tile,colors,index,count,seed) {
  const width = tile.w*(count===1 ? .9 : .52), height = tile.h*.51;
  const centerX = tile.cx + (index-(count-1)/2)*tile.w*.23;
  const centerY = tile.cy+tile.h*(.14+index*.045);
  ctx.save();
  ctx.translate(centerX,centerY);
  ctx.scale(seed%2 ? width : -width,height);
  const depth = ctx.createLinearGradient(0,-.5,0,.5);
  depth.addColorStop(0,colors.rim);
  depth.addColorStop(.32,colors.base);
  depth.addColorStop(1,colors.dark);
  ctx.beginPath();
  ctx.moveTo(-.46,.03);
  ctx.bezierCurveTo(-.49,-.21,-.30,-.31,-.20,-.30);
  ctx.bezierCurveTo(-.06,-.30,-.03,-.48,.14,-.43);
  ctx.bezierCurveTo(.29,-.39,.25,-.18,.40,-.13);
  ctx.bezierCurveTo(.54,-.07,.47,.26,.30,.32);
  ctx.bezierCurveTo(.15,.39,.06,.29,-.08,.36);
  ctx.bezierCurveTo(-.24,.44,-.43,.29,-.46,.03);
  ctx.closePath();
  ctx.fillStyle = depth;
  ctx.globalAlpha = .9;
  ctx.fill();
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = .055;
  ctx.stroke();
  ctx.globalAlpha = .7;
  ctx.strokeStyle = colors.shine;
  ctx.lineWidth = .044;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-.36,-.06);
  ctx.quadraticCurveTo(-.28,-.21,-.12,-.19);
  ctx.moveTo(.06,-.31);
  ctx.quadraticCurveTo(.14,-.37,.20,-.27);
  ctx.stroke();
  ctx.fillStyle = colors.rim;
  for (const [x,y,rx,ry] of [[.36,.06,.045,.068],[-.11,.11,.036,.059],[-.34,.43,.044,.055]]) {
    ctx.beginPath();
    ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

const arenaTrialDrawTiles = drawTiles;
drawTiles = function() {
  arenaTrialDrawTiles();
  for (const {col,row,effects} of arenaEffects.ground.values()) {
    const tile = cellRect(col,row);
    const active = Object.keys(arenaLiquidColors).filter(key=>effects[key]>=arenaEffects.turn);
    active.forEach((key,index)=>arenaDrawPuddle(tile,arenaLiquidColors[key],index,active.length,col+row));
  }
};

const arenaTrialDrawPlayer = drawPlayer;
drawPlayer = function() {
  arenaTrialDrawPlayer();
  if (playerStats.hp<=0 || !arenaEffects.armorReady || !trialPassive('backArmor')) return;
  const {dx,dy} = DIR_VEC[player.facing];
  const {x,y} = project(player.px,player.py);
  ctx.save();
  ctx.translate(x-dx*CELL*.65,y-5-dy*CELL*.72);
  ctx.rotate(Math.atan2(-dy,-dx));
  ctx.beginPath();
  ctx.moveTo(-2,-9);
  ctx.quadraticCurveTo(9,0,-2,9);
  ctx.quadraticCurveTo(4,0,-2,-9);
  ctx.closePath();
  ctx.shadowColor = '#5af8f4';
  ctx.shadowBlur = 5;
  ctx.fillStyle = '#2ebdcca8';
  ctx.fill();
  ctx.strokeStyle = '#bcfffa';
  ctx.lineWidth = 1.15;
  ctx.stroke();
  ctx.restore();
};

function arenaDrawParasite(m) {
  const center = CELL*((m.size||1)-1)/2;
  const {x,y} = project(m.px+center,m.py+center);
  const r = CELL*(.08+.055*m.arenaParasite.stacks);
  ctx.save();
  ctx.fillStyle = '#141019';
  ctx.strokeStyle = '#6f607d';
  ctx.lineWidth = .8;
  ctx.beginPath();
  ctx.moveTo(x-r,y);
  ctx.bezierCurveTo(x-r*1.1,y-r*.8,x-r*.12,y-r,x+r*.48,y-r*.64);
  ctx.bezierCurveTo(x+r*1.25,y-r*.85,x+r*1.18,y+r*.55,x+r*.46,y+r*.68);
  ctx.bezierCurveTo(x-r*.4,y+r,x-r*1.15,y+r*.62,x-r,y);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function arenaDrawTrialStatuses() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 5px "Microsoft YaHei UI", sans-serif';
  ctx.fillStyle = '#f6d98b';
  const names = {fear:'恐',petrify:'石',sticky:'缓',rooted:'缚',ink:'盲',short:'断'};
  for (const m of monsters) {
    if (m.jumperVanished) continue;
    const tags = Object.keys(names).filter(key=>arenaStatusActive(m,key)).map(key=>names[key]);
    if (m.arenaDummy && m.arenaParasite) arenaDrawParasite(m);
    if (tags.length) {
      const {x,y} = project(m.px,m.py);
      ctx.fillText(tags.join(' '),x,y-15);
    }
  }
  for (const b of bombs) {
    if (b.roomId!==currentRoomId || !b.claymore && !b.remote) continue;
    const {x,y} = gridToPixel(b.col,b.row);
    if (b.remote) ctx.fillText('遥控',x,y+10);
    if (b.claymore) {
      ctx.strokeStyle='#ffc36d';
      ctx.lineWidth=1.6;
      ctx.beginPath();ctx.moveTo(x+b.claymore.dx*7,y+b.claymore.dy*7);
      ctx.lineTo(x+b.claymore.dx*12,y+b.claymore.dy*12);ctx.stroke();
    }
  }
  ctx.restore();
}

const arenaScrapHUD = scrapUpdateHUD;
scrapUpdateHUD = function() {
  arenaScrapHUD();
  if (!trialPassive('timedShield')) return;
  const hearts = document.getElementById('scrap-hearts');
  if (!hearts) return;
  let shield = hearts.querySelector('.arena-heart-shield');
  if (!shield) {
    shield = document.createElement('span');
    shield.className = 'arena-heart-shield';
    shield.setAttribute('role','img');
    const shape = 'M11 2 L19 5 V10 C19 15 15 18.5 11 21 C7 18.5 3 15 3 10 V5 Z';
    shield.innerHTML = '<svg viewBox="0 0 22 22" aria-hidden="true">'+
      '<defs><clipPath id="arena-shield-clip"><path d="'+shape+'"/></clipPath></defs>'+
      '<path d="'+shape+'" fill="#0c252f"/><rect class="arena-shield-energy" x="3" width="16" clip-path="url(#arena-shield-clip)"/>'+
      '<path d="'+shape+'" fill="none" stroke="#9ee9f4" stroke-width="1.3"/></svg>';
    hearts.append(shield);
  }
  const charge = arenaEffects.timedCharge;
  if (shield.dataset.charge === String(charge)) return;
  shield.dataset.charge = charge;
  shield.classList.toggle('ready',charge===ARENA_SHIELD_CHARGE);
  const fill = shield.querySelector('.arena-shield-energy');
  const height = 19*charge/ARENA_SHIELD_CHARGE;
  fill.setAttribute('y',21-height);
  fill.setAttribute('height',height);
  shield.title = '充能护盾 '+charge+'/'+ARENA_SHIELD_CHARGE;
  shield.setAttribute('aria-label',shield.title);
};
