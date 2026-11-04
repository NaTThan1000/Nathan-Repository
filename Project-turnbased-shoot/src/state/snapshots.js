// 存档只保存条目数组，运行时恢复为Map；两侧的位置对象都独立复制。
function copyDukePushEntries(pushes) {
  return Array.from(pushes || [], ([id, pos]) => [id, {col: pos.col, row: pos.row}]);
}
function captureDukeKeyframes(frames) {
  return (frames || []).map(k => ({targetCol:k.targetCol,targetRow:k.targetRow,
    pushedFloaters:copyDukePushEntries(k.pushedFloaters),playerHit:k.playerHit}));
}
function restoreDukeKeyframes(frames) {
  return (frames || []).map(k => ({targetCol:k.targetCol,targetRow:k.targetRow,
    pushedFloaters:new Map(copyDukePushEntries(k.pushedFloaters)),playerHit:k.playerHit}));
}
// 四条恢复路径共用怪物恢复格式；保留原有瞬时受击状态重置。
function restoreMonsterSnapshot(m) {return {
    id: m.id, cfgId: m.cfgId, name: m.name,
    col: m.col, row: m.row, hp: m.hp, maxHp: m.maxHp,
    px: m.px, py: m.py, displayHp: m.displayHp,
    damage: m.damage, aiType: m.aiType, tint: m.tint,
    predictedPath: (m.predictedPath || []).map(p => ({ fromCol: p.fromCol, fromRow: p.fromRow, toCol: p.toCol, toRow: p.toRow })),
    moveSpeed: m.moveSpeed,
    hitFlash: 0, shakeX: 0, shakeY: 0,
    size: m.size || 1,
    jumperPhase: m.jumperPhase, jumperRepeatCount: m.jumperRepeatCount,
    jumperCheckRepeated: m.jumperCheckRepeated, jumperVanished: m.jumperVanished || false,
    jumperJustLanded: m.jumperJustLanded || false,
    _showingExclaim: m._showingExclaim || false,
    _charging: m._charging || false,
    _shaking: m._shaking || false,
    _landingPhase: m._landingPhase !== undefined ? m._landingPhase : null,
    _killLoot: m._killLoot ? [...m._killLoot] : null,
    _diagDir: m._diagDir ? { dCol: m._diagDir.dCol, dRow: m._diagDir.dRow } : undefined,
    _dukeFirstTurn: m._dukeFirstTurn,
    _spawnedThisTurn: m._spawnedThisTurn || false,
    _dukeKeyframes: restoreDukeKeyframes(m._dukeKeyframes),
    _dukeKeyframeIdx: m._dukeKeyframeIdx || 0,
  };}
// 回合快照与Checkpoint共用怪物保存格式；坐标仍按网格对齐。
function captureMonsterSnapshot(m) {
      const gp = gridToPixel(m.col, m.row);
      return {
        id: m.id, cfgId: m.cfgId, name: m.name,
        col: m.col, row: m.row, hp: m.hp, maxHp: m.maxHp,
        px: gp.x, py: gp.y,                      // 对齐网格 (静止状态)
        displayHp: m.displayHp,
        damage: m.damage, aiType: m.aiType, tint: m.tint,
        predictedPath: m.predictedPath ? m.predictedPath.map(s => ({ fromCol: s.fromCol, fromRow: s.fromRow, toCol: s.toCol, toRow: s.toRow })) : [],
        moveSpeed: m.moveSpeed,
        hitFlash: m.hitFlash, shakeX: m.shakeX, shakeY: m.shakeY,
        size: m.size || 1,
        jumperPhase: m.jumperPhase, jumperRepeatCount: m.jumperRepeatCount,
        jumperCheckRepeated: m.jumperCheckRepeated, jumperVanished: m.jumperVanished,
        jumperJustLanded: m.jumperJustLanded || false,
        _showingExclaim: m._showingExclaim || false,
        _charging: m._charging || false,
        _shaking: m._shaking || false,
        _landingPhase: m._landingPhase !== undefined ? m._landingPhase : null,
        _killLoot: m._killLoot ? [...m._killLoot] : null,
        _diagDir: m._diagDir ? { dCol: m._diagDir.dCol, dRow: m._diagDir.dRow } : undefined,
        _dukeFirstTurn: m._dukeFirstTurn,
        _spawnedThisTurn: m._spawnedThisTurn || false,
        _dukeKeyframes: captureDukeKeyframes(m._dukeKeyframes),
        _dukeKeyframeIdx: m._dukeKeyframeIdx || 0,
      };
}
// ==================== 回合快照系统 ====================
function saveTurnSnapshot() {
  const sp = gridToPixel(player.col, player.row);
  turnSnapshot = {
    playerCol: player.col, playerRow: player.row,
    playerPx: sp.x, playerPy: sp.y,              // 对齐网格
    playerFacing: player.facing,
    playerHp: playerStats.hp,
    playerInvincibleSteps: player.invincibleSteps,
    playerHasPiercing: !!player.hasPiercing,
    // 道具/属性状态快照（用于 ESC 回溯）
    playerInventory: [...playerInventory],
    playerMaxHp: playerStats.maxHp,
    playerAttack: playerStats.attack,
    playerFireRate: playerStats.fireRate,
    playerMoveSpeed: playerStats.moveSpeed,
    playerRange: playerStats.range,
    playerLuck: playerStats.luck,
    playerCoins: playerResources.coins,
    playerBombs: playerResources.bombs,
    playerKeys: playerResources.keys,
    playerBlueHearts: playerResources.blueHearts,
    resourcesOnGround: resourcesOnGround.map(r => ({
      id: r.id, cfgId: r.cfgId, col: r.col, row: r.row,
      px: r.px, py: r.py, roomId: r.roomId,
      color: r.color, icon: r.icon,
      liftY: r.liftY || 0, liftDir: r.liftDir || 1, sparkTimer: r.sparkTimer || 0,
    })),
    itemsOnGround: itemsOnGround.map(it => ({
      id: it.id, cfgId: it.cfgId, name: it.name, icon: it.icon,
      quality: it.quality, col: it.col, row: it.row,
      px: it.px, py: it.py, roomId: it.roomId,
      liftY: it.liftY, liftDir: it.liftDir, sparkTimer: it.sparkTimer,
    })),
    monsters: monsters.map(captureMonsterSnapshot),
    pendingBossLanding: pendingBossLanding ? {
      monsterId: pendingBossLanding.monster ? pendingBossLanding.monster.id : null,
      monsterCfgId: pendingBossLanding.monster ? pendingBossLanding.monster.cfgId : null,
      targetCol: pendingBossLanding.targetCol,
      targetRow: pendingBossLanding.targetRow,
    } : null,
    // 地形与炸弹状态（ESC 回溯需要）
    tileData: JSON.parse(JSON.stringify(tileData)),
    currentRoomGrid: currentRoomGrid ? currentRoomGrid.map(col => [...col]) : null,
    bombs: bombs.map(b => ({ id: b.id, col: b.col, row: b.row, timer: b.timer, roomId: b.roomId })),
  };
}

// ==================== 小存档点 (Checkpoint) 系统 ====================
// 用于 BFS 重新规划路线时回退
function saveCheckpoint() {
  const sp = gridToPixel(player.col, player.row);
  currentCheckpoint = {
    playerCol: player.col, playerRow: player.row,
    playerPx: sp.x, playerPy: sp.y,
    playerFacing: player.facing,
    playerHp: playerStats.hp,
    playerInvincibleSteps: player.invincibleSteps,
    playerHasPiercing: !!player.hasPiercing,
    playerInventory: [...playerInventory],
    playerMaxHp: playerStats.maxHp,
    playerAttack: playerStats.attack,
    playerFireRate: playerStats.fireRate,
    playerMoveSpeed: playerStats.moveSpeed,
    playerRange: playerStats.range,
    playerLuck: playerStats.luck,
    playerCoins: playerResources.coins,
    playerBombs: playerResources.bombs,
    playerKeys: playerResources.keys,
    playerBlueHearts: playerResources.blueHearts,
    mAP: turnState.mAP,
    aAP: turnState.aAP,
    resourcesOnGround: resourcesOnGround.map(r => ({
      id: r.id, cfgId: r.cfgId, col: r.col, row: r.row,
      px: r.px, py: r.py, roomId: r.roomId,
      color: r.color, icon: r.icon,
      liftY: r.liftY || 0, liftDir: r.liftDir || 1, sparkTimer: r.sparkTimer || 0,
    })),
    itemsOnGround: itemsOnGround.map(it => ({
      id: it.id, cfgId: it.cfgId, name: it.name, icon: it.icon,
      quality: it.quality, col: it.col, row: it.row,
      px: it.px, py: it.py, roomId: it.roomId,
      liftY: it.liftY, liftDir: it.liftDir, sparkTimer: it.sparkTimer,
    })),
    monsters: monsters.map(captureMonsterSnapshot),
    pendingBossLanding: pendingBossLanding ? {
      monsterId: pendingBossLanding.monster ? pendingBossLanding.monster.id : null,
      monsterCfgId: pendingBossLanding.monster ? pendingBossLanding.monster.cfgId : null,
      targetCol: pendingBossLanding.targetCol,
      targetRow: pendingBossLanding.targetRow,
    } : null,
  };
  checkpointMAP = turnState.mAP;
  checkpointAAP = turnState.aAP;
}

function restoreCheckpoint() {
  if (!currentCheckpoint) return;
  const s = currentCheckpoint;
  player.col = s.playerCol; player.row = s.playerRow;
  player.px = s.playerPx; player.py = s.playerPy;
  player.facing = s.playerFacing;
  player.targetPx = null; player.targetPy = null;
  player.walkFrame = 0; player.animTime = 0;
  player.shootTimer = 0;
  playerStats.hp = s.playerHp;
  player.invincibleSteps = s.playerInvincibleSteps || 0;
  player.hasPiercing = !!s.playerHasPiercing;
  if (s.playerInventory !== undefined) {
    playerInventory = [...s.playerInventory];
    playerStats.maxHp = s.playerMaxHp;
    playerStats.attack = s.playerAttack;
    playerStats.fireRate = s.playerFireRate;
    playerStats.moveSpeed = s.playerMoveSpeed;
    playerStats.range = s.playerRange;
    playerStats.luck = s.playerLuck;
    playerResources.blueHearts = s.playerBlueHearts || 0;
    playerResources.coins = s.playerCoins || 0;
    playerResources.bombs = s.playerBombs || 0;
    playerResources.keys = s.playerKeys || 0;
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
    // 同步 room._groundResources/_groundItems：数组被重建后必须让房间存储也指向新数组
    const room = currentFloor.rooms.find(r => r.id === currentRoomId);
    if (room) { room._groundResources = resourcesOnGround; room._groundItems = itemsOnGround; }
    updateItemBar();
    updateHearts();
    updateResourceUI();
  }
  monsters = s.monsters.map(restoreMonsterSnapshot);
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
  bullets = [];
  particles = [];
  damageNumbers = [];
  turnState.mAP = s.mAP !== undefined ? s.mAP : checkpointMAP;
  turnState.aAP = s.aAP !== undefined ? s.aAP : checkpointAAP;
  updateHearts();
  updateUI();
}

function restoreCheckpointWithoutBullets() {
  // 同上但保留子弹（子弹还在飞行中时用于中间恢复）
  if (!currentCheckpoint) return;
  const s = currentCheckpoint;
  player.col = s.playerCol; player.row = s.playerRow;
  player.px = s.playerPx; player.py = s.playerPy;
  player.facing = s.playerFacing;
  player.targetPx = null; player.targetPy = null;
  player.walkFrame = 0; player.animTime = 0;
  player.shootTimer = 0;
  playerStats.hp = s.playerHp;
  player.invincibleSteps = s.playerInvincibleSteps || 0;
  player.hasPiercing = !!s.playerHasPiercing;
  if (s.playerInventory !== undefined) {
    playerInventory = [...s.playerInventory];
    playerStats.maxHp = s.playerMaxHp;
    playerStats.attack = s.playerAttack;
    playerStats.fireRate = s.playerFireRate;
    playerStats.moveSpeed = s.playerMoveSpeed;
    playerStats.range = s.playerRange;
    playerStats.luck = s.playerLuck;
    playerResources.blueHearts = s.playerBlueHearts || 0;
    playerResources.coins = s.playerCoins || 0;
    playerResources.bombs = s.playerBombs || 0;
    playerResources.keys = s.playerKeys || 0;
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
    // 同步 room._groundResources/_groundItems：数组被重建后必须让房间存储也指向新数组
    const room = currentFloor.rooms.find(r => r.id === currentRoomId);
    if (room) { room._groundResources = resourcesOnGround; room._groundItems = itemsOnGround; }
    updateItemBar();
    updateHearts();
    updateResourceUI();
  }
  monsters = s.monsters.map(restoreMonsterSnapshot);
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
  // 不清理子弹
  turnState.mAP = s.mAP !== undefined ? s.mAP : checkpointMAP;
  turnState.aAP = s.aAP !== undefined ? s.aAP : checkpointAAP;
  updateHearts();
  updateUI();
}

function restoreTurnSnapshot() {
  if (!turnSnapshot) return;
  const s = turnSnapshot;
  player.col = s.playerCol; player.row = s.playerRow;
  player.px = s.playerPx; player.py = s.playerPy;
  player.facing = s.playerFacing;
  player.targetPx = null; player.targetPy = null;
  player.walkFrame = 0; player.animTime = 0;
  player.shootTimer = 0;
  playerStats.hp = s.playerHp;
  player.invincibleSteps = s.playerInvincibleSteps || 0;
  player.hasPiercing = !!s.playerHasPiercing;
  // 恢复道具/属性状态
  if (s.playerInventory !== undefined) {
    playerInventory = [...s.playerInventory];
    playerStats.maxHp = s.playerMaxHp;
    playerStats.attack = s.playerAttack;
    playerStats.fireRate = s.playerFireRate;
    playerStats.moveSpeed = s.playerMoveSpeed;
    playerStats.range = s.playerRange;
    playerStats.luck = s.playerLuck;
    playerResources.blueHearts = s.playerBlueHearts || 0;
    playerResources.coins = s.playerCoins || 0;
    playerResources.bombs = s.playerBombs || 0;
    playerResources.keys = s.playerKeys || 0;
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
    // 同步 room._groundResources/_groundItems：数组被重建后必须让房间存储也指向新数组
    const room = currentFloor.rooms.find(r => r.id === currentRoomId);
    if (room) { room._groundResources = resourcesOnGround; room._groundItems = itemsOnGround; }
    updateItemBar();
    updateHearts();
    updateResourceUI();
  }
  monsters = s.monsters.map(restoreMonsterSnapshot);
  // 恢复pendingBossLanding
  if (s.pendingBossLanding && s.pendingBossLanding.monsterId) {
    const landingMonster = monsters.find(m2 => m2.id === s.pendingBossLanding.monsterId);
    // 从怪物配置重建 landAction
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
  // 恢复地形状态（大便、岩石等可破坏瓷砖）
  if (s.tileData) {
    tileData = JSON.parse(JSON.stringify(s.tileData));
  }
  if (s.currentRoomGrid) {
    // 原地写回，保持 currentRoomGrid 与 room.grid 是同一个数组引用
    // （整体替换数组会让 room.grid 仍停留在"已破坏"状态，ESC 回溯等于失效）
    const curRoom = currentFloor && currentFloor.rooms.find(r => r.id === currentRoomId);
    if (curRoom && curRoom.grid) currentRoomGrid = curRoom.grid;
    if (currentRoomGrid) {
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) currentRoomGrid[c][r] = s.currentRoomGrid[c][r];
      }
    }
  }
  // 恢复炸弹
  bombs = (s.bombs || []).map(b => ({ id: b.id, col: b.col, row: b.row, timer: b.timer, roomId: b.roomId }));
  bullets = [];
  particles = [];
  damageNumbers = [];
  turnSnapshot = null;
  updateHearts();
  updateUI();
}
