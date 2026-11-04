// ==================== 子弹系统 ====================
function spawnBullet(dir, fromPx, fromPy) {
  SFX.shoot();
  const vec = DIR_VEC[dir];
  bullets.push({
    x: fromPx, y: fromPy,
    dirX: vec.dx, dirY: vec.dy,
    speed: CFG.BULLET_SPEED,
    distTraveled: 0,
    phase: 'flying',
    decayTimer: 0, vOff: 0, vVel: 0,
    maxDist: CFG.BULLET_MAX_DIST * CELL,
    source: 'player',
  });
  totalShots++;
}

// 怪物发射子弹（射程可指定，默认=4格）
function spawnMonsterBullet(dir, fromPx, fromPy, rangeTiles = 4, ownerId = null) {
  const vec = DIR_VEC[dir];
  bullets.push({
    x: fromPx, y: fromPy,
    dirX: vec.dx, dirY: vec.dy,
    speed: CFG.BULLET_SPEED * 0.6,   // 怪物子弹稍慢
    distTraveled: 0,
    phase: 'flying',
    decayTimer: 0, vOff: 0, vVel: 0,
    maxDist: rangeTiles * CELL,       // 可自定义射程
    source: 'monster', ownerId,
  });
}

function bulletHitMonster(bx, by, bullet) {
  const g = pixelToGrid(bx, by);
  for (const m of monsters) {
    if (m.jumperVanished) continue; // 跳跃Boss消失中
    if (isInMonsterFootprint(m, g.col, g.row)) {
      // 穿透子弹：跳过已经命中过的怪物
      if (bullet && bullet.hitMonsters && bullet.hitMonsters.has(m.id)) continue;
      return m;
    }
  }
  return null;
}

function damageMonster(m, dmg) {
  m.hp = Math.max(0, m.hp - dmg);
  if (m.hp <= 0) SFX.kill(); else SFX.hit();
  // 受击闪烁 + 抖动
  m.hitFlash = 0.12;
  m.shakeX = (Math.random() - 0.5) * 4;
  m.shakeY = (Math.random() - 0.5) * 3;

  // 伤害飘字 (黄色)
  damageNumbers.push({
    x: m.px, y: m.py - 5,
    text: '-' + dmg,
    life: 0.65, maxLife: 0.65,
    vy: -35 - Math.random() * 25,
    vx: (Math.random() - 0.5) * 20,
  });

  // 受击血雾粒子
  spawnBloodParticles(m.px, m.py, 3);

  if (m.hp <= 0) {
    // 累计击杀计数（不受Esc回溯影响）
    monstersKilled++;
    // 玩家回合保留失能残影，空格确认后退场。
    if(actionHistoryActive())provisionalDefeats.push(cloneHistoryValue(m));
    else spawnBloodParticles(m.px, m.py, 18);
    // 怪物击杀掉落
    if(!actionHistoryActive())rollMonsterKillDrop(m);
    if (turnState.phase === 'player_select') pendingReachableRefresh = true;
    const idx = monsters.indexOf(m);
    if (idx !== -1) monsters.splice(idx, 1);
    if(turnState.phase==='monster_turn'&&m.id===lockedThreatId)reselectMonsterAfterDeath();
    // 玩家回合中击杀怪物 → 保存 checkpoint（含掉落物）
    // 放在 updateRoomCombatState 之前，避免最后一只怪死后 inCombat 变 false 导致跳过
    if (turnState.phase === 'player_select') {
      saveCheckpoint();
      turnState.reachableTiles = calcReachableTiles(currentCheckpoint.playerCol, currentCheckpoint.playerRow, checkpointMAP);
    }
    updateRoomCombatState();
  } else if (turnState.phase === 'player_select') {
    // 子弹命中但未击杀：更新 checkpoint 以反映怪物受击后 HP（AP 已在射击时扣除）
    saveCheckpoint();
  }
}
