// ==================== 资源掉落系统 (通用) ====================
/**
 * 按掉落表随机一批资源ID，支持三种 mode：
 *   pick_one  - 按权重抽1种资源
 *   roll_all  - 每种资源独立判定 .random() < prob
 *   pick_first - 顺序判定，命中第一个即停止
 * 兼容旧格式 { resId: prob } 自动视为 pick_one
 * @param {string} tableKey - 掉落表key
 * @returns {string[]} 资源cfgId数组 (可能为空)
 */
function rollResourceDrop(tableKey) {
  const entry = RES_DROP_TABLES[tableKey];
  if (!entry) return [];

  // 兼容旧格式：{ resId: prob } → 自动视为 pick_one
  let mode, table;
  if (entry.table !== undefined && entry.mode !== undefined) {
    mode = entry.mode;
    table = entry.table;
  } else {
    // 旧格式：扁平 { resId: prob }，按 pick_one 处理
    mode = 'pick_one';
    table = entry;
  }

  // 过滤掉 none key（不掉落）和权重为0的条目
  const entries = Object.entries(table).filter(([key, val]) => key !== 'none' && val > 0);
  if (entries.length === 0) return [];

  if (mode === 'roll_all') {
    // 每种资源独立判定概率
    const results = [];
    for (const [resId, prob] of entries) {
      if (Math.random() < prob) results.push(resId);
    }
    return results;

  } else   if (mode === 'pick_one') {
    // 按权重随机抽1种（none 参与总权重计算，抽中则返回空）
    const totalWeight = Object.values(table).reduce((sum, v) => sum + v, 0);
    if (totalWeight <= 0) return [];
    let roll = Math.random() * totalWeight;
    for (const [resId, prob] of Object.entries(table)) {
      if (prob <= 0) continue;
      roll -= prob;
      if (roll <= 0) return resId === 'none' ? [] : [resId];
    }
    return [];

  } else if (mode === 'pick_first') {
    // 顺序判定，命中第一个即停
    for (const [resId, prob] of entries) {
      if (Math.random() < prob) return [resId];
    }
    return [];
  }

  return [];
}

/**
 * 在指定格子生成一个资源实体 (可拾取物)
 */
function spawnResourceOnGrid(col, row, resCfgId) {
  const cfg = RESOURCE_DB[resCfgId];
  if (!cfg) return null;
  // 检查该格子是否已有资源或道具
  const occupied = resourcesOnGround.some(r => r.col === col && r.row === row)
    || itemsOnGround.some(it => it.col === col && it.row === row);
  if (occupied) return null;
  const pix = gridToPixel(col, row);
  const res = {
    id: ++resourceIdCounter,
    cfgId: resCfgId,
    type: cfg.type,
    name: cfg.name,
    icon: cfg.icon,
    color: cfg.color || '#ffffff',
    col, row,
    px: pix.x, py: pix.y,
    roomId: currentRoomId,
    liftY: 0,
    liftDir: 1,
    sparkTimer: Math.random() * Math.PI * 2,
  };
  resourcesOnGround.push(res);
  return res;
}

/**
 * 在房间正中心普通平地格子附近生成多个资源
 * 优先正中心格子，若该格非普通平地则 BFS 找最近的普通平地作为锚点
 */
function spawnResourcesInRoom(resIds) {
  const centerC = Math.floor(COLS / 2);
  const centerR = Math.floor(ROWS / 2);

  // 找锚点：正中心若是普通平地直接用，否则 BFS 找最近普通平地
  let anchorC = centerC, anchorR = centerR;
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
          anchorC = nc; anchorR = nr;
          found = true;
          break;
        }
        queue.push({ c: nc, r: nr });
      }
    }
  }

  // 从锚点按曼哈顿距离向外扩展，逐个放置资源
  const occupied = new Set();
  for (const rid of resIds) {
    let placed = false;
    for (let dist = 0; dist < Math.max(COLS, ROWS) && !placed; dist++) {
      const candidates = [];
      for (let dc = -dist; dc <= dist; dc++) {
        for (let dr = -dist; dr <= dist; dr++) {
          if (Math.abs(dc) + Math.abs(dr) !== dist) continue;
          const nc = anchorC + dc, nr = anchorR + dr;
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
          if (currentRoomGrid[nc][nr] !== TILE.FLOOR) continue;
          if (occupied.has(`${nc},${nr}`)) continue;
          if (isMonsterAt(nc, nr)) continue;
          if (nc === player.col && nr === player.row) continue;
          if (resourcesOnGround.some(res => res.col === nc && res.row === nr)) continue;
          if (itemsOnGround.some(it => it.col === nc && it.row === nr)) continue;
          candidates.push({ c: nc, r: nr });
        }
      }
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        spawnResourceOnGrid(pick.c, pick.r, rid);
        occupied.add(`${pick.c},${pick.r}`);
        placed = true;
      }
    }
  }
}

let isEligibleItemDrop = () => true;

/**
 * 按掉落表或品质覆盖随机一个道具 cfgId
 * @param {string|null} qualityOverride - 强制品质 (common/rare/legendary)，传 null 则用掉落表随机
 * @param {string} itemDropTable - 掉落表名，对应 ITEM_DROP_TABLES 的 key
 * @returns {string} 道具 cfgId
 */
function rollItem(qualityOverride, itemDropTable = 'item_drop_default') {
  let quality;
  if (qualityOverride) {
    quality = qualityOverride;
  } else {
    const entry = ITEM_DROP_TABLES[itemDropTable] || ITEM_DROP_TABLES['item_drop_default'];
    if (!entry) return null;

    // 新格式：{ mode, table: { none, common, rare, legendary } }
    // 旧格式兼容：扁平 { none, common, rare, legendary }
    let table;
    if (entry.table !== undefined && entry.mode !== undefined) {
      table = entry.table;
    } else {
      // 旧格式兼容：直接读取扁平结构，概率 ×100 转权重
      table = entry;
    }

    const n = table.none || 0;
    const L = table.legendary || 0;
    const R = table.rare || 0;
    const C = table.common || 0;
    const total = n + L + R + C;

    if (total <= 0) return null;

    const roll = Math.random() * total;
    if (roll < n) return null;
    if (roll < n + L) quality = 'legendary';
    else if (roll < n + L + R) quality = 'rare';
    else quality = 'common';
  }

  const pool = quality === 'legendary' ? ITEM_POOL_LEGENDARY
    : quality === 'rare' ? ITEM_POOL_RARE
    : ITEM_POOL_COMMON;

  const eligible = pool.filter(isEligibleItemDrop);
  const candidates = eligible.length ? eligible : ITEM_POOL_ALL.filter(isEligibleItemDrop);
  return candidates[Math.floor(Math.random() * candidates.length)] || null;
}

let monsters = [];  // [{id, cfgId, name, col, row, hp, maxHp, predictedPath, moveSpeed, movement, damage, aiType, tint, ...}]
let monsterIdCounter = 0;
let monsterFlashTimer = 0;  // 路径箭头闪烁计时器
let visitedRooms = new Set(); // 已进入过的房间ID集合
// 跳跃Boss大跳延迟落地数据 { monster, targetCol, targetRow, targetPlayerCol, targetPlayerRow }
let pendingBossLanding = null;
