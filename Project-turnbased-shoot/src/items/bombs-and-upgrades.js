// ==================== 炸弹系统 ====================
function placeBomb(col, row) {
  if (playerResources.bombs <= 0) return;
  playerResources.bombs--;
  SFX.bombPlace();

  const bomb = {
    id: ++bombIdCounter,
    col, row,
    timer: RESOURCE_DB['bomb_single']?.detonateTurns ?? 3,
    roomId: currentRoomId,
  };
  bombs.push(bomb);

  // 放置炸弹后进入战斗模式
  if (!inCombat) {
    inCombat = true;
    updateDoorsLocked();
    resetTurnAP(); // 统一用 resetTurnAP，确保快照包含当前资源/道具
    battleStartAnim.active = true;
    battleStartAnim.timer = 0;
  }

  updateResourceUI();
  console.log(`💣 放置炸弹在 (${col},${row})，倒计时 ${bomb.timer}`);
}

// 消耗1个炸弹回合（怪物回合开始时调用）
function tickBombCountdown() {
  const currentBombs = bombs.filter(b => b.roomId === currentRoomId);
  if (currentBombs.length === 0) return;

  for (const bomb of currentBombs) {
    bomb.timer--;
  }

  // 检查是否有炸弹引爆
  const detonated = currentBombs.filter(b => b.timer <= 0);
  for (const bomb of detonated) {
    detonateBomb(bomb);
  }

  // 移除已引爆的炸弹
  bombs = bombs.filter(b => !(b.timer <= 0 && b.roomId === currentRoomId));
}

// 菱形范围 (距离 ≤ radius)
function getDiamondRange(cx, cy, radius) {
  const cells = [];
  for (let c = cx - radius; c <= cx + radius; c++) {
    for (let r = cy - radius; r <= cy + radius; r++) {
      if (Math.abs(c - cx) + Math.abs(r - cy) <= radius) {
        cells.push({ col: c, row: r });
      }
    }
  }
  return cells;
}

function detonateBomb(bomb) {
  const cx = bomb.col, cy = bomb.row;
  const cfg = RESOURCE_DB['bomb_single'] || { damage: 50, radius: 2 };
  const damageRadius = cfg.radius || 2;

  console.log(`💥 炸弹爆炸! (${cx},${cy}) 范围${damageRadius}`);
  SFX.boom();

  // 爆炸粒子特效
  const bp = gridToPixel(cx, cy);
  for (let j = 0; j < 20; j++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 50 + Math.random() * 120;
    particles.push({
      x: bp.x, y: bp.y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 30,
      life: 0.3 + Math.random() * 0.5,
      maxLife: 0.8,
      size: 3 + Math.random() * 3,
      color: Math.random() < 0.5 ? '#ff6622' : '#ffaa44',
    });
  }

  const affected = getDiamondRange(cx, cy, damageRadius);

  for (const {col, row} of affected) {
    // 越界检查
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;

    // 伤害怪物
    for (const m of monsters) {
      if (m.hp <= 0 || m.jumperVanished) continue;
      const sz = m.size || 1;
      // 检查炸弹范围是否与怪物占地区域重叠
      let hitMonster = false;
      for (let dc = 0; dc < sz; dc++) {
        for (let dr = 0; dr < sz; dr++) {
          if (Math.abs((m.col + dc) - cx) + Math.abs((m.row + dr) - cy) <= damageRadius) {
            hitMonster = true;
          }
        }
      }
      if (hitMonster) {
        damageMonster(m, cfg.damage || 50);
      }
    }

    noteDangerCell(col, row, -1, "environment");
    // 伤害玩家
    if (col === player.col && row === player.row) {
      damagePlayer(1);
    }

    // 破坏地形
    if (currentRoomGrid && col < COLS && row < ROWS) {
      const t = currentRoomGrid[col][row];
      if (t === TILE.ROCK || t === TILE.POOP) {
        // 完全破坏
        hitTile(col, row, 99);
      }
    }

    // 破坏门
    const room = currentFloor.rooms.find(r => r.id === currentRoomId);
    if (room) {
      for (const dir of ['up', 'down', 'left', 'right']) {
        const dp = DOOR_POS[dir];
        if (col === dp.col && row === dp.row) {
          if (room.doors[dir] && room.doors[dir].targetRoomId) {
            // 破坏门 (永久打开，不能修复)
            room.doors[dir].destroyed = true;
            room.doors[dir].open = true;
            console.log(`🚪 门 [${dir}] 被炸弹破坏!`);
          }
        }
      }
    }
  }

  // 爆炸飘字
  damageNumbers.push({
    x: bp.x, y: bp.y - 10,
    text: 'BOOM!',
    life: 0.8, maxLife: 0.8,
    vy: -50, vx: 0,
  });
}

// 子弹/怪物碰撞炸弹推移 (向射击方向推3格)
function pushBomb(bomb, dirX, dirY) {
  let col = bomb.col, row = bomb.row;
  let remainingDist = 3;

  for (let step = 1; step <= 3; step++) {
    const nc = col + dirX, nr = row + dirY;
    // 超出边界或遇到墙壁/大便/深坑 → 反弹，继续剩余距离
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) {
      dirX *= -1; dirY *= -1;
      continue;
    }
    const t = currentRoomGrid ? currentRoomGrid[nc][nr] : TILE.FLOOR;
    if (t === TILE.ROCK || t === TILE.POOP || t === TILE.PIT) {
      dirX *= -1; dirY *= -1; // 反弹
      continue;
    }
    // 遇到怪物或玩家 → 立刻停止
    if (isMonsterAt(nc, nr) || (nc === player.col && nr === player.row)) {
      break;
    }
    // 遇到普通平地或尖刺 → 继续移动
    col = nc; row = nr;
    remainingDist--;
  }

  bomb.col = col; bomb.row = row;
  console.log(`💣 炸弹被推移到 (${col},${row})`);
}

function applyItem(cfgId) {
  const cfg = ITEMS_DB[cfgId];
  if (!cfg) return;
  if (playerInventory.includes(cfgId)) return; // 已拥有

  playerInventory.push(cfgId);

  // 累计道具拾取记录（不受Esc回溯影响）
  itemsCollected.push(cfg.name);
  SFX.pickupItem();

  // 记录改变前的HP百分比（防除零）
  const hpRatio = playerStats.maxHp > 0 ? playerStats.hp / playerStats.maxHp : 0;

  // 应用数值属性
  if (cfg.effects.maxHp) {
    // 红心上限增加需检查总心数上限（12），满时替换蓝心
    for (let i = 0; i < (cfg.effects.maxHp || 0); i++) {
      if (!tryAddRedHeart()) break;
      playerStats.maxHp++;
    }
  }
  if (cfg.effects.attack) playerStats.attack = Math.round((playerStats.attack + cfg.effects.attack) * 10) / 10;
  if (cfg.effects.fireRate) playerStats.fireRate += cfg.effects.fireRate;
  if (cfg.effects.moveSpeed) playerStats.moveSpeed += cfg.effects.moveSpeed;
  if (cfg.effects.range) playerStats.range += cfg.effects.range;

  // 处理特殊效果：heal_full（拾取时立即回满血）
  if (cfg.specials && Array.isArray(cfg.specials)) {
    for (const sp of cfg.specials) {
      if (sp.type === 'heal_full') {
        playerStats.hp = playerStats.maxHp;
      }
    }
  }
  // 向后兼容旧格式 special 字符串
  if (cfg.special) {
    if (cfg.special === 'heal_full') playerStats.hp = playerStats.maxHp;
  }

  // HP上限增加时按比例恢复（未在 specials 中声明 heal_full 时的默认行为）
  if (cfg.effects.maxHp && !_hasHealFull(cfg)) {
    playerStats.hp = Math.max(1, Math.min(playerStats.maxHp, Math.ceil(playerStats.maxHp * hpRatio) + 1));
  }

  // 确保属性不小于下限
  playerStats.fireRate = Math.max(1, playerStats.fireRate);
  playerStats.moveSpeed = Math.max(1, playerStats.moveSpeed);
  playerStats.range = Math.max(3, playerStats.range);

  // 重新应用所有道具以计算最终属性（处理特殊效果如 piercing / damage_mult）
  recalcAllStats();

  console.log(`✅ 拾取道具: ${cfg.name} (${cfg.quality}) - ${cfg.desc}`);
}

// 检查道具配置中是否声明了 heal_full 效果
function _hasHealFull(cfg) {
  if (cfg.specials && Array.isArray(cfg.specials)) {
    return cfg.specials.some(sp => sp.type === 'heal_full');
  }
  return cfg.special === 'heal_full';
}

// 重新计算所有属性（遍历所有已拥有道具，同时处理特效注册表）
function recalcAllStats() {
  // 从基准值开始
  playerStats.attack = 3.5;
  playerStats.fireRate = 3;
  playerStats.moveSpeed = 3;
  playerStats.range = 6;
  playerStats.luck = 0;
  playerStats.maxHp = 3;

  // 初始化特效状态
  const effectState = { hasPiercing: false, damageMultiplier: 1.0 };

  for (const cfgId of playerInventory) {
    const cfg = ITEMS_DB[cfgId];
    if (!cfg) continue;

    // 累加数值属性
    if (cfg.effects.maxHp) playerStats.maxHp += cfg.effects.maxHp;
    if (cfg.effects.attack) playerStats.attack += cfg.effects.attack;
    if (cfg.effects.fireRate) playerStats.fireRate += cfg.effects.fireRate;
    if (cfg.effects.moveSpeed) playerStats.moveSpeed += cfg.effects.moveSpeed;
    if (cfg.effects.range) playerStats.range += cfg.effects.range;

    // 处理 specials[] 结构化特效
    if (cfg.specials && Array.isArray(cfg.specials)) {
      for (const sp of cfg.specials) {
        const handler = SPECIAL_EFFECT_HANDLERS[sp.type];
        if (handler && handler.apply) handler.apply(effectState, sp);
      }
    }

    // 向后兼容旧格式 special 字符串
    if (cfg.special) {
      if (cfg.special === 'piercing') SPECIAL_EFFECT_HANDLERS['piercing'].apply(effectState, {});
      else if (cfg.special === 'damage_mult_1.5') SPECIAL_EFFECT_HANDLERS['damage_mult'].apply(effectState, { mult: 1.5 });
    }
  }

  // 应用伤害倍率
  playerStats.attack = Math.round(playerStats.attack * effectState.damageMultiplier * 10) / 10;

  // 穿透标识 (存储在player对象上)
  player.hasPiercing = effectState.hasPiercing;

  // 确保下限 + 上限
  playerStats.fireRate = Math.max(1, playerStats.fireRate);
  playerStats.moveSpeed = Math.max(1, playerStats.moveSpeed);
  playerStats.range = Math.max(3, playerStats.range);
  playerStats.maxHp = Math.max(1, Math.min(MAX_TOTAL_HEARTS, playerStats.maxHp));
  // 红+蓝总心数不得超过上限：超出部分优先削蓝心（红心优先）
  const heartOverflow = playerStats.maxHp + playerResources.blueHearts - MAX_TOTAL_HEARTS;
  if (heartOverflow > 0) {
    playerResources.blueHearts = Math.max(0, playerResources.blueHearts - heartOverflow);
  }
  if (playerStats.hp > playerStats.maxHp) playerStats.hp = playerStats.maxHp;

  updatePlayerStatsUI(); // 同步攻击力/射程/运气到侧边栏
}

// 清理不在当前房间的道具实体
// 清除所有道具
function clearInventory() {
  playerInventory = [];
  // 清除所有房间的地上道具引用
  if (currentFloor) {
    for (const r of currentFloor.rooms) r._groundItems = [];
  }
  const room = currentFloor ? currentFloor.rooms.find(r => r.id === currentRoomId) : null;
  itemsOnGround = room ? room._groundItems : [];
  player.hasPiercing = false;
  recalcAllStats();
  playerStats.hp = playerStats.maxHp;
}

// 在房间中生成宝箱房道具（房间正中心普通平地优先）
function spawnTreasureRoomItem() {
  const room = currentFloor.rooms.find(r => r.id === currentRoomId);
  if (!room || room.type !== 'treasure') return;
  if (room.itemSpawned) return; // 已经生成过

  const centerC = Math.floor(COLS / 2);
  const centerR = Math.floor(ROWS / 2);

  // 找锚点：正中心若是普通平地直接用，否则 BFS 找最近普通平地
  let col = centerC, row = centerR;
  if (currentRoomGrid[centerC][centerR] !== TILE.FLOOR) {
    const visited = new Set();
    const queue = [{ c: centerC, r: centerR }];
    visited.add(`${centerC},${centerR}`);
    let found = false;
    while (queue.length > 0 && !found) {
      const { c, r } = queue.shift();
      const dirs = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }];
      for (const { dc, dr } of dirs) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        const key = `${nc},${nr}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (currentRoomGrid[nc][nr] === TILE.FLOOR) {
          col = nc; row = nr;
          found = true;
          break;
        }
        queue.push({ c: nc, r: nr });
      }
    }
  }

  const cfgId = rollItem(null, 'item_drop_treasure_room'); // 宝箱房按掉落表
  spawnItemOnGrid(col, row, cfgId);
  room.itemSpawned = true;
}

// 在Boss房掉落道具 (根据房间 roomClearDrop.itemDropTable 配置读取)
function spawnBossRoomItem() {
  const room = currentFloor.rooms.find(r => r.id === currentRoomId);
  if (!room || room.type !== 'boss') return;
  if (room.itemDropped) return;

  const dropCfg = room.roomClearDrop;
  if (!dropCfg || !dropCfg.itemDropTable) return;

  const cfgId = rollItem(null, dropCfg.itemDropTable);

  // 在Boss房中央生成道具
  let col = 6, row = 3;
  if (!isWall(col, row)) {
    spawnItemOnGrid(col, row, cfgId);
    room.itemDropped = true;
    pickupHintTimer = 3.0;
  }
}
