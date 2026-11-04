// ==================== 从 Checkpoint 模拟系统 ====================
// 从 currentCheckpoint 还原状态 → 沿路径重放 → 拾取经过的资源/道具
// 返回 { pickedUp: bool } 表示是否在路径中拾取了资源或道具
function simulateFromCheckpoint(path) {
  if (!currentCheckpoint || path.length < 1) return { pickedUp: false };
  const s = currentCheckpoint;

  // --- 1. 从 checkpoint 还原玩家状态 ---
  player.col = s.playerCol; player.row = s.playerRow;
  player.facing = s.playerFacing;
  player.shootTimer = 0;
  playerStats.hp = s.playerHp;
  player.invincibleSteps = s.playerInvincibleSteps || 0;
  playerInventory = [...s.playerInventory];
  playerStats.maxHp    = s.playerMaxHp;
  playerStats.attack   = s.playerAttack;
  playerStats.fireRate = s.playerFireRate;
  playerStats.moveSpeed= s.playerMoveSpeed;
  playerStats.range    = s.playerRange;
  playerStats.luck     = s.playerLuck;
  playerResources.blueHearts = s.playerBlueHearts || 0;
  playerResources.coins = s.playerCoins || 0;
  playerResources.bombs = s.playerBombs || 0;
  playerResources.keys  = s.playerKeys || 0;

  // --- 2. 还原地面资源/道具 (从 checkpoint) ---
  resourcesOnGround = (s.resourcesOnGround || []).map(r => {
    const db = RESOURCE_DB[r.cfgId] || {};
    return {
      id: r.id, cfgId: r.cfgId, col: r.col, row: r.row,
      px: r.px, py: r.py, roomId: r.roomId,
      color: r.color || db.color || '#ffffff',
      icon: r.icon || db.icon || '?',
      liftY: r.liftY || 0, liftDir: r.liftDir || 1,
      sparkTimer: r.sparkTimer || Math.random() * Math.PI * 2,
    };
  });
  itemsOnGround = (s.itemsOnGround || []).map(it => ({
    id: it.id, cfgId: it.cfgId, name: it.name, icon: it.icon,
    quality: it.quality, col: it.col, row: it.row,
    px: it.px, py: it.py, roomId: it.roomId,
    liftY: it.liftY, liftDir: it.liftDir, sparkTimer: it.sparkTimer,
  }));
  monsters = s.monsters.map(restoreMonsterSnapshot);
  for (const rm of monsters) {
    if (rm._dukeKeyframes && rm._dukeKeyframes.length > 0) {
      rm._dukeKeyframes = rm._dukeKeyframes.map(k => ({
        targetCol: k.targetCol, targetRow: k.targetRow,
        pushedFloaters: new Map(k.pushedFloaters || []),
        playerHit: k.playerHit,
      }));
    }
  }
  if (s.pendingBossLanding && s.pendingBossLanding.monsterId) {
    const landingMonster = monsters.find(m2 => m2.id === s.pendingBossLanding.monsterId);
    let landAction = null;
    if (landingMonster) {
      const mCfg = MONSTER_DB[landingMonster.cfgId];
      landAction = (mCfg && mCfg.actions) ? mCfg.actions.find(a => a.type === 'jump_big_land') : null;
    }
    pendingBossLanding = landingMonster ? {
      monster: landingMonster,
      targetCol: s.pendingBossLanding.targetCol,
      targetRow: s.pendingBossLanding.targetRow,
      landAction: landAction,
    } : null;
  } else {
    pendingBossLanding = null;
  }

  // --- 3. 沿路径重放，检测拾取 ---
  let pickedUp = false;
  const finalPos = path[path.length - 1];
  for (let i = 1; i < path.length; i++) {
    const step = path[i];
    player.col = step.col; player.row = step.row;

    // 拾取资源
    for (let j = resourcesOnGround.length - 1; j >= 0; j--) {
      const res = resourcesOnGround[j];
      if (res.col === step.col && res.row === step.row) {
        if (handleResourcePickup(res)) {
          resourcesOnGround.splice(j, 1);
          pickedUp = true;
        }
      }
    }
    // 拾取道具
    for (let j = itemsOnGround.length - 1; j >= 0; j--) {
      const it = itemsOnGround[j];
      if (it.col === step.col && it.row === step.row) {
        if (playerInventory.includes(it.cfgId)) continue;
        applyItem(it.cfgId);
        itemsOnGround.splice(j, 1);
        pickedUp = true;
      }
    }
    // 接触伤害
    if (player.invincibleSteps <= 0) {
      const om = monsters.find(m => !m.jumperVanished && isInMonsterFootprint(m, step.col, step.row) && m.hp > 0);
      if (om) damagePlayer(om.damage || 1);
    }
    if (player.invincibleSteps > 0) player.invincibleSteps--;
    if (!inCombat && currentRoomGrid && currentRoomGrid[step.col][step.row] === TILE.SPIKE) {
      damagePlayer(1);
    }
  }

  // --- 4. 最终位置 + MP (从 checkpoint MAP 扣减) + UI ---
  player.col = finalPos.col; player.row = finalPos.row;
  turnState.mAP = checkpointMAP - (path.length - 1);
  updateHearts();
  updateResourceUI();
  updateItemBar();
  updateUI();
  // 同步 room._groundResources：simulateFromCheckpoint 重建了 resourcesOnGround 数组，
  // 必须让房间存储也指向新数组，否则掉落的资源在离房重进后会丢失
  const room = currentFloor.rooms.find(r => r.id === currentRoomId);
  if (room) { room._groundResources = resourcesOnGround; room._groundItems = itemsOnGround; }
  return { pickedUp };
}
