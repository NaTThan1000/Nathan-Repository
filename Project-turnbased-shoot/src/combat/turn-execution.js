// 行动随机数与粒子、音效及掉落随机数隔离，支持揭晓后按同一结果执行。
let monsterTurnRandom = null;
function makeMonsterTurnRandom(seed) {
  let state=seed>>>0;
  return function() {
    state=(state+0x6D2B79F5)|0;
    let t=Math.imul(state^(state>>>15),1|state);
    t^=t+Math.imul(t^(t>>>7),61|t);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
let monsterChoiceOverride = null;
function monsterActionChoiceIndex(weights) {
  const eligible=weights.map((w,i)=>({w:Math.max(0,w),i})).filter(e=>e.w>0);
  if(!eligible.length) return weights.length-1;
  if(eligible.length===1) return eligible[0].i;
  if(monsterChoiceOverride) return monsterChoiceOverride(weights);
  let roll=monsterActionRandom()*eligible.reduce((n,e)=>n+e.w,0);
  for(const e of eligible) {roll-=e.w;if(roll<0)return e.i;}
  return eligible[eligible.length-1].i;
}

function monsterActionRandom() {
  return monsterTurnRandom ? monsterTurnRandom() : Math.random();
}

// 怪物回合执行
let monsterExecTimer = 0;
let monsterExecStepIdx = 0;
const SEQUENTIAL_ACTION={betweenSeconds:0.12};let combatRng=123456789;
let monsterGroupPhase='idle',monsterActionOrder=[];
let monsterTurnHit=false,lockedThreatId=null,pendingMonsterHits=[],fallbackThreatHold=0,monsterAfterEffectsDone=false;

let dangerRevealRemaining = 0;
let dangerExecutionSeed = null;
function startMonsterTurn() {
 movementPlanning=false;movementEvents=[];
  monsterTurnHit=false;pendingMonsterHits=[];fallbackThreatHold=0;monsterAfterEffectsDone=false;lockedThreatId=dangerForecast?.monsterId??null;
  // 只在玩家正式结束回合时确定随机结果；模拟与执行使用相同的行动种子。
  dangerExecutionSeed = (combatRng=(Math.imul(combatRng,1664525)+1013904223)>>>0);
  dangerReveal = {red:new Set(dangerForecast?.red||[]),yellow:new Set(dangerForecast?.yellow||[]),monsterId:dangerForecast?.monsterId??null};
  dangerRevealRemaining = 0.65;
}
function updateDangerReveal(dt) {
  if(dangerRevealRemaining<=0)return false;
  dangerRevealRemaining=Math.max(0,dangerRevealRemaining-dt);
  monsterFlashTimer+=dt;
  if(dangerRevealRemaining===0) {
    monsterTurnRandom=makeMonsterTurnRandom(dangerExecutionSeed);
    executeMonsterTurnActions();
  }
  return true;
}

function executeMonsterTurnActions() {
  monsterExecStepIdx = 0;
  monsterExecTimer = 0;

  // === 炸弹行动（最高优先级，先于所有怪物） ===
  tickBombCountdown();

  // 统一射击阶段先于跳跃与移动；顺序在怪物回合起点固定。
  monsterGroupPhase='shoot';
  monsterActionOrder=monsters.filter(m=>m.hp>0&&!m.jumperVanished).slice().sort((a,b)=>{
    const da=Math.max(Math.abs(player.col-a.col),Math.abs(player.row-a.row));
    const db=Math.max(Math.abs(player.col-b.col),Math.abs(player.row-b.row));return da-db||a.id-b.id;
  }).map(m=>m.id);

  // 初始化 Boss Duke 象限方向（战斗开始时执行一次）
  for (const m of monsters) {
    if (m.aiType === 'boss_duke' && m._diagDir === undefined) {
      initDukeQuadrant(m);
    }
  }

  calcAllMonsterPaths();  // 怪物回合开始时计算路径, 追踪玩家实时位置
}

function updateMonsterTurn(dt) {
  if(monsterGroupPhase==='shoot'){
    if(bullets.some(b=>b.source==='monster'&&b.phase==='flying'))return;
    // 先按顺序确定位置与命中，再在动画到达时播放碰撞和受伤。
    movementPlanning=true;movementEvents=[];
    for(const id of monsterActionOrder){
      const m=monsters.find(x=>x.id===id&&x.hp>0&&!x.jumperVanished);if(!m)continue;
      movementEventMonsterId=m.id;movementEventStep=0;
      if(m.aiType==='boss_jumper'){const x=m.px,y=m.py;processJumperAction(m);m.px=x;m.py=y;continue;}
      if(m.aiType==='boss_duke'){
       calcDukePath(m,turnState.monsterTurnCounter);m._visualPath=[];m._visualProgress=0;
       for(const k of m._dukeKeyframes||[]){movementEventStep++;let blocked=false;
        for(let dc=0;dc<(m.size||2);dc++)for(let dr=0;dr<(m.size||2);dr++)noteDangerCell(k.targetCol+dc,k.targetRow+dr,m.id,'move');
        if(player.col>=k.targetCol&&player.col<k.targetCol+(m.size||2)&&player.row>=k.targetRow&&player.row<k.targetRow+(m.size||2)){damagePlayer(m.damage||1,m.id);if(!pushPlayerFromMonster(m,k.targetCol,k.targetRow))blocked=true;}
        if(!blocked){for(const other of monsters){if(other.id===m.id||other.hp<=0||other.jumperVanished)continue;const pos=k.pushedFloaters?.get(other.id)||other,sz=other.size||1;if(k.targetCol<pos.col+sz&&k.targetCol+(m.size||2)>pos.col&&k.targetRow<pos.row+sz&&k.targetRow+(m.size||2)>pos.row){blocked=true;break;}}}
        if(blocked)break;m.col=k.targetCol;m.row=k.targetRow;m._visualPath.push({col:m.col,row:m.row});
        for(const [id,pos]of k.pushedFloaters||[]){const f=monsters.find(v=>v.id===id);if(f&&!monsters.some(v=>v.id!==f.id&&!v.jumperVanished&&isInMonsterFootprint(v,pos.col,pos.row))&&(pos.col!==player.col||pos.row!==player.row)){f.col=pos.col;f.row=pos.row;}}
       }m._dukeKeyframes=[];continue;
      }
      if(m._turnAction?.type==='chase')m.predictedPath=calcMonsterPath(m,player.col,player.row);
      const path=m.predictedPath||[];
      while(path.length){const end=path[path.length-1];if(!isMonsterAt(end.toCol,end.toRow,m.id))break;path.pop();}
      let safe={col:m.col,row:m.row};m._visualPath=[];m._visualProgress=0;movementEventMonsterId=m.id;movementEventStep=0;
      for(const step of path){
        movementEventStep++;
        noteDangerCell(step.toCol,step.toRow,m.id,'move');
        if(step.toCol===player.col&&step.toRow===player.row){damagePlayer(m.damage||1,m.id);if(!pushPlayerFromMonster(m,step.toCol,step.toRow)){m._visualPath.push({col:step.toCol,row:step.toRow});m.col=safe.col;m.row=safe.row;m._visualPath.push({col:m.col,row:m.row});break;}}
        const bomb=bombs.find(b=>b.roomId===currentRoomId&&b.col===step.toCol&&b.row===step.toRow);if(bomb)pushBomb(bomb,Math.sign(step.toCol-step.fromCol),Math.sign(step.toRow-step.fromRow));
        m.col=step.toCol;m.row=step.toRow;m._visualPath.push({col:m.col,row:m.row});if(!isMonsterAt(m.col,m.row,m.id))safe={col:m.col,row:m.row};
        if(currentRoomGrid?.[m.col]?.[m.row]===TILE.SPIKE){damageMonster(m,5);if(m.hp<=0)break;}
      }
      if(m.hp>0&&m._turnAction?.type==='chase')resolveAfterEffects(m._turnAction,{monster:m});
    }
    movementPlanning=false;monsterGroupPhase='move';monsterExecTimer=0;
    for(const id of monsterActionOrder){const m=monsters.find(x=>x.id===id);if(m?.aiType!=='boss_jumper')releaseMovementEvents(id,0);}
    return;
  }
  if(monsterGroupPhase==='move'){
    monsterExecTimer+=dt;
    for(const m of monsters)if(m.aiType==='boss_jumper'&&!(m.jumpAnimTimer>0))releaseMovementEvents(m.id,Infinity);
    const moving=monsters.some(m=>(m._visualPath?.length||0)>0||m.jumpAnimTimer>0);
    if(moving||(forcedLandingPending&&player.targetPx!==null))return;
    for(const id of monsterActionOrder)releaseMovementEvents(id,Infinity);
    monsterGroupPhase='settle';monsterExecTimer=0;return;
  }
  if(monsterGroupPhase==='settle'){
    monsterExecTimer+=dt;if(monsterExecTimer<SEQUENTIAL_ACTION.betweenSeconds)return;
    finishMonsterTurn();
  }
}

function applyMonsterTurnAfterEffects() {
  // 同一阶段按回合开始时距离及 ID 稳定结算。
  for (const m of monsters.slice().sort((a,b)=>monsterActionOrder.indexOf(a.id)-monsterActionOrder.indexOf(b.id))) {
    if (m.jumperVanished) continue;
    const mCfg = MONSTER_DB[m.cfgId];
    const chaseAction = mCfg && mCfg.actions ? mCfg.actions.find(a => a.type === 'chase') : null;
    if (!chaseAction || !chaseAction.after_effect || chaseAction.after_effect.length === 0) continue;
    if (!m._turnAction || m._turnAction.type !== 'chase') continue;
    resolveAfterEffects(chaseAction, { monster: m });
  }

  // Boss Duke 移动后的 summon after_effect
  for (const m of monsters) {
    if (m.jumperVanished) continue;
    if (m.aiType !== 'boss_duke') continue;
    if (!m._turnAfterAction || m._turnAfterAction.type !== 'summon') continue;
    handleDukeSummon(m);
  }

}

// 攻击尚未结算完时保持怪物回合，避免揭晓后玩家提前进入下一回合。
function hasPendingMonsterAttack() {
  return bullets.some(b=>b.source==='monster'&&b.phase==='flying') || monsters.some(m=>m.jumpAnimTimer>0);
}

function finishMonsterTurn() {
  if (hasPendingMonsterAttack()) return;
  if(!monsterAfterEffectsDone){monsterAfterEffectsDone=true;for(const m of [...monsters])if(m.hp>0&&m.aiType==='boss_duke'&&m._turnAfterAction?.type==='summon')handleDukeSummon(m);}
  flushMonsterHits();
  if(fallbackThreatHold>0)return;
  monsterTurnRandom = null;
  dangerReveal = null;
  // 清除所有怪物的 _spawnedThisTurn 标记（下回合正常移动）
  for (const m of monsters) m._spawnedThisTurn = false;

  for (const m of monsters) m.predictedPath = [];
  turnState.monsterTurnCounter++;
  turnState.turnNumber++;
  monsterExecTimer = 0;
  monsterExecStepIdx = 0;

  // 检查战斗状态：有存活怪物或有未引爆炸弹则继续战斗
  const livingMonsters = monsters.filter(m => m.hp > 0 && !m.jumperVanished).length;
  const hasRoomBombs = bombs.some(b => b.roomId === currentRoomId);
  // Boss 消失（pendingBossLanding）不算真正清场，保持战斗状态等待落地
  if (livingMonsters === 0 && !hasRoomBombs && !pendingBossLanding) {
    inCombat = false;
    updateDoorsLocked();
  }

  resetTurnAP();
  updateUI();
}
