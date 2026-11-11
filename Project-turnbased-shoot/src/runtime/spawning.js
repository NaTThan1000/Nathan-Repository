// ==================== 混合刷怪系统（标签匹配 + 组合规则 + 点数预算） ====================

/**
 * 在随机可行走位置生成一只怪物
 * @param {string} cfgId - 怪物配置ID
 * @returns {boolean} 是否成功生成
 */
function spawnMonsterAtRandomPos(cfgId, overrideMovementTags, anchorPos, exactPosition, {roomSpawn=false}={}) {
  const cfg = MONSTER_DB[cfgId];
  if (!cfg) return false;

  const sz = cfg.size || 1;
  const flying = roomSpawn && overrideMovementTags?.includes('飞行');
  const occupied = new Set();
  occupied.add(`${player.col},${player.row}`);
  for (const m of monsters) {
    for (const mc of monsterCells(m)) occupied.add(`${mc.col},${mc.row}`);
  }

  const candidates = [];
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++) {
      // 检查sz×sz区域是否完全未被占用且可落脚
      let valid = true;
      for (let dc = 0; dc < sz && valid; dc++)
        for (let dr = 0; dr < sz && valid; dr++) {
          const nc = c + dc, nr = r + dr;
          if (nc >= COLS || nr >= ROWS) { valid = false; break; }
          if (occupied.has(`${nc},${nr}`)) { valid = false; break; }
          const tile = currentRoomGrid[nc][nr];
          if (roomSpawn && (tile===TILE.SPIKE || Math.abs(nc-player.col)+Math.abs(nr-player.row)<=4)) { valid = false; break; }
          if (!flying && !TILE_WALKABLE[tile]) { valid = false; break; }
        }
      if (valid && (flying || isValidLandingZone(c, r, sz))) candidates.push({ col: c, row: r });
    }

  if (candidates.length === 0) return false;

  // 有锚点时，只选距离=1的候选（上下左右相邻），没有则返回false让调用方换锚点
  let pos;
  if (exactPosition) {
    pos = candidates.find(p => p.col === exactPosition.col && p.row === exactPosition.row);
    if (!pos) return false;
  } else if (anchorPos) {
    const adjacent = candidates.filter(c => Math.abs(c.col - anchorPos.col) + Math.abs(c.row - anchorPos.row) === 1);
    if (adjacent.length === 0) return false;
    pos = adjacent[Math.floor(Math.random() * adjacent.length)];
  } else {
    pos = candidates[Math.floor(Math.random() * candidates.length)];
  }
  const pix = gridToPixel(pos.col, pos.row);

  monsters.push({
    id: ++monsterIdCounter,
    cfgId: cfg.id,
    name: cfg.name,
    col: pos.col, row: pos.row,
    px: pix.x, py: pix.y,
    hp: cfg.hp, maxHp: cfg.hp,
    displayHp: cfg.hp,
    damage: cfg.damage,
    aiType: cfg.aiType,
    tint: cfg.tint,
    predictedPath: [], moveSpeed: (cfg.actions?.[0]?.steps || [2, 1])[0],
    hitFlash: 0, shakeX: 0, shakeY: 0,
    size: sz,
    // boss_jumper 状态机
    jumperPhase: (cfg.aiType === 'boss_jumper') ? 1 : undefined,
    jumperRepeatCount: (cfg.aiType === 'boss_jumper') ? 0 : undefined,
    jumperCheckRepeated: (cfg.aiType === 'boss_jumper') ? false : undefined,
    jumperVanished: false,
    jumperJustLanded: false,
    disappearStepsRemaining: 0,
    // boss_duke 状态
    _diagDir: undefined,          // 象限方向（initDukeQuadrant 中初始化）
    _dukeFirstTurn: (cfg.aiType === 'boss_duke') ? true : undefined,
    // charge 冲刺状态
    chargeDir: (cfg.aiType === 'charge') ? null : undefined,
    chargeDistance: (cfg.aiType === 'charge') ? 0 : undefined,
    // 移动标签（地面/飞行），用于路径障碍检查。优先用传入值，否则兜底地面
    movementTags: overrideMovementTags || ['地面'],
  });
  const newMonster = monsters[monsters.length - 1];
  // 怪物生成时预 roll 掉落（保证 Esc 回溯后再次击杀结果一致）
  if (cfg.loot) newMonster._killLoot = preRollLoot(cfg.loot);
  for (const mc of monsterCells(newMonster)) occupied.add(`${mc.col},${mc.row}`);
  return true;
}

/**
 * 运行时计算房间的刷怪配置
 * floorBudgets[楼层] 提供基准值 + terrainModifiers[模板] 提供微调
 * room.spawnConfig 存在时覆盖对应字段（兜底兼容）
 */
function resolveSpawnConfig(room, floorNum) {
  const fb = (SPAWN_CONFIG.floorBudgets || {})[String(floorNum)] || {};
  const tm = (SPAWN_CONFIG.terrainModifiers || {})[room.tplKey] || {};

  const baseBudget = fb.budget || 8;
  const budgetDelta = tm.budget || 0;
  let budget = Math.max(1, baseBudget + budgetDelta);

  // room.spawnConfig 存在时覆盖对应字段（旧数据兜底 / 手动覆盖）
  if (room.spawnConfig) {
    if (room.spawnConfig.budget !== undefined) budget = room.spawnConfig.budget;
  }

  return { budget };
}

/**
 * Squad 贪心随机生成系统：
 *   1. 按楼层 + 房间类型 + 移动标签过滤可用 squad
 *   2. 贪心随机选取 squad（完全随机，不去重），直到 budget 不够任何 squad
 *   3. 每个 squad 的怪物逐一生成到房间内
 */
function spawnRoomMonsters() {
  // 清除当前房间怪物
  monsters.length = 0;

  const room = currentFloor.rooms.find(r => r.id === currentRoomId);
  if (!room) return;

  const roomType = room.type;
  const floorNum = currentFloor.floorNum;
  const tpl = getTpl(room.tplKey);
  const spawnCfg = resolveSpawnConfig(room, floorNum);

    // Boss 房间：从 SPAWN_CONFIG.bossMonsters 按楼层读取 squad ID 列表
    if (roomType === 'boss') {
      const bossSquadIds = SPAWN_CONFIG.bossMonsters && SPAWN_CONFIG.bossMonsters[floorNum];
      if (bossSquadIds && bossSquadIds.length > 0) {
        const allSquads = SQUAD_TEMPLATES.squads || {};
        const pickedId = bossSquadIds[Math.floor(Math.random() * bossSquadIds.length)];
        const squad = allSquads[pickedId];
        if (squad) {
          let squadAnchor = null;
          for (const cfgId of squad.monsters) {
            let spawned = spawnMonsterAtRandomPos(cfgId, squad.movementTags, squadAnchor);
            if (!spawned && squadAnchor) {
              squadAnchor = null;
              spawned = spawnMonsterAtRandomPos(cfgId, squad.movementTags, squadAnchor);
            }
            if (spawned && !squadAnchor) {
              squadAnchor = { col: monsters[monsters.length - 1].col, row: monsters[monsters.length - 1].row };
            }
          }
        }
      }
    calcAllMonsterPaths();
    updateRoomCombatState();
    return;
  }

  // 起点/宝藏/商店房间：不生成怪物
  if (roomType === 'start' || roomType === 'treasure' || roomType === 'shop') {
    updateRoomCombatState();
    return;
  }

  // ============ 过滤可用 squad ============
  const availableSquads = filterSquadsByRoom(floorNum, roomType, tpl);
  if (availableSquads.length === 0) {
    updateRoomCombatState();
    return;
  }

  // ============ 贪心随机选取 squad ============
  const totalBudget = spawnCfg.budget || 8;
  let remainingBudget = totalBudget;
  const selectedSquads = [];

  for (let i = 0; i < 50; i++) {
    // 过滤 budget ≤ 剩余 budget 的 squad
    const affordable = availableSquads.filter(s => s.budget <= remainingBudget);
    if (affordable.length === 0) break;

    // 完全随机选一个
    const squad = affordable[Math.floor(Math.random() * affordable.length)];
    selectedSquads.push(squad);
    remainingBudget -= squad.budget;
  }

  // ============ 生成怪物 ============
  for (const squad of selectedSquads) {
    let squadAnchor = null;
    for (const cfgId of squad.monsters) {
      let spawned = spawnMonsterAtRandomPos(cfgId, squad.movementTags, squadAnchor);
      if (!spawned && squadAnchor) {
        squadAnchor = null;
        spawned = spawnMonsterAtRandomPos(cfgId, squad.movementTags, squadAnchor);
      }
      if (spawned && !squadAnchor) {
        squadAnchor = { col: monsters[monsters.length - 1].col, row: monsters[monsters.length - 1].row };
      }
    }
  }

  calcAllMonsterPaths();
  updateRoomCombatState();
}

/**
 * 根据楼层、房间类型、地形标签过滤可用 squad
 */
function filterSquadsByRoom(floorNum, roomType, tpl) {
  const allSquads = SQUAD_TEMPLATES.squads || {};
  const allowedMovement = (tpl && tpl.allowedMovement) ? tpl.allowedMovement : ['地面', '飞行'];

  return Object.entries(allSquads).filter(([id, squad]) => {
    // minFloor 过滤
    if (squad.minFloor !== undefined && squad.minFloor > floorNum) return false;
    // roomTypes 过滤
    if (squad.roomTypes && !squad.roomTypes.includes(roomType)) return false;
    // movementTags 过滤：squad 的 movementTags 必须与房间 allowedMovement 有交集
    if (squad.movementTags && squad.movementTags.length > 0) {
      if (!squad.movementTags.some(tag => allowedMovement.includes(tag))) return false;
    }
    return true;
  }).map(([id, squad]) => {
    squad.id = id;
    return squad;
  });
}

// 保留旧接口兼容调试按钮
function spawnMonster(cfgId = null) {
  if (!cfgId) {
    const keys = Object.keys(MONSTER_DB).filter(k => !k.startsWith('_'));
    cfgId = keys[Math.floor(Math.random() * keys.length)];
  }
  spawnMonsterAtRandomPos(cfgId);
  calcAllMonsterPaths();
  updateRoomCombatState();
}
document.getElementById('spawn-monster-btn').addEventListener('click', spawnMonster);
