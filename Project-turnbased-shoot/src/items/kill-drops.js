// ==================== 掉落系统 ====================
// 击杀怪物掉落 (读 monster-db.json > loot 配置)
function rollMonsterKillDrop(m) {
  const firstItem = itemsOnGround.length;
  // 优先使用怪物生成时预 roll 的掉落（保证 Esc 回溯后再次击杀结果一致）
  // _killLoot 可能是 [] (预roll结果=无掉落)，必须用 !==null/undefined 判断而非 truthy check
  if (m._killLoot !== undefined && m._killLoot !== null) {
    if (m._killLoot.length > 0) {
      applyPreRolledLoot(m._killLoot, m.col, m.row);
      relocateSpikeDrops(m,firstItem);
    }
    return;
  }
  const mCfg = MONSTER_DB[m.cfgId];
  if (!mCfg || !mCfg.loot) return;
  rollLoot(mCfg.loot, m.col, m.row);
  relocateSpikeDrops(m,firstItem);
}

function relocateSpikeDrops(m,firstItem){
  if(typeof singleStepSpikeAt!=='function'||!singleStepSpikeAt(m.col,m.row)||firstItem===itemsOnGround.length)return;
  const floors=[];
  for(let col=0;col<COLS;col++)for(let row=0;row<ROWS;row++){
    if(currentRoomGrid[col][row]===TILE.FLOOR)floors.push({col,row});
  }
  const distance=p=>Math.abs(p.col-m.col)+Math.abs(p.row-m.row);
  floors.sort((a,b)=>distance(a)-distance(b));
  for(const item of itemsOnGround.slice(firstItem)){
    const dest=floors.find(p=>!monsters.some(o=>o.hp>0&&isInMonsterFootprint(o,p.col,p.row))&&
      !itemsOnGround.some(i=>i.col===p.col&&i.row===p.row)&&!(player.col===p.col&&player.row===p.row));
    const landing=dest||floors[0];
    if(!landing)continue;
    const {x,y}=gridToPixel(landing.col,landing.row);
    Object.assign(item,landing,{px:x,py:y});
  }
}

/** 预 roll 怪物掉落（生成时调用），返回可重复执行的掉落指令列表 */
function preRollLoot(lootConfig) {
  const results = [];
  const rounds = lootConfig.rounds || (lootConfig.entries ? [lootConfig] : []);
  for (const round of rounds) {
    const mode = round.mode || 'pick_one';
    if (mode === 'roll_all') {
      for (const entry of round.entries) {
        if (Math.random() < (entry.rate ?? 1)) {
          const drop = preRollDropEntry(entry);
          if (drop) results.push(drop);
        }
      }
    } else if (mode === 'pick_one') {
      const totalW = round.entries.reduce((s, e) => s + (e.weight ?? 1), 0);
      if (totalW > 0) {
        let roll = Math.random() * totalW;
        for (const entry of round.entries) {
          roll -= (entry.weight ?? 1);
          if (roll <= 0) {
            if (Math.random() < (entry.rate ?? 1)) {
              const drop = preRollDropEntry(entry);
              if (drop) results.push(drop);
            }
            break;
          }
        }
      }
    } else if (mode === 'pick_first') {
      for (const entry of round.entries) {
        if (Math.random() < (entry.rate ?? 1)) {
          const drop = preRollDropEntry(entry);
          if (drop) { results.push(drop); break; }
        }
      }
    }
  }
  return results;
}

/** 预 roll 单个掉落条目 */
function preRollDropEntry(entry) {
  if (entry.type === 'item') {
    const itemDropTable = entry.itemDropTable || 'item_drop_default';
    const cfgId = rollItem(null, itemDropTable);
    if (cfgId) return { type: 'item', cfgId, itemDropTable };
  } else if (entry.type === 'resource') {
    // 新：支持 minDrop/maxDrop 随机次数抽取（每次独立 pick_one）
    if (entry.minDrop !== undefined && entry.maxDrop !== undefined) {
      const count = entry.minDrop + Math.floor(Math.random() * (entry.maxDrop - entry.minDrop + 1));
      const resIds = [];
      for (let i = 0; i < count; i++) {
        const rid = rollResourceDrop(entry.resourceDropTable || 'resource_drop_monster_default');
        if (rid.length > 0) resIds.push(rid[0]);
      }
      if (resIds.length > 0) return { type: 'resource', resIds, offsetC: 0, offsetR: 0 };
    } else {
      // 直接引用 resourceDropTables 表名，按表自身 mode 处理
      const resIds = rollResourceDrop(entry.resourceDropTable || 'resource_drop_monster_default');
      if (resIds.length > 0) {
        return { type: 'resource', resIds, offsetC: 0, offsetR: 0 };
      }
    }
  } else if (entry.type === 'resource_fixed') {
    if (entry.id) return { type: 'resource_fixed', resId: entry.id };
  }
  return null;
}

/** 执行预 roll 的掉落列表 */
function applyPreRolledLoot(preRolled, col, row) {
  for (const drop of preRolled) {
    if (drop.type === 'item') {
      const cfgId = isEligibleItemDrop(drop.cfgId) ? drop.cfgId : rollItem(null,drop.itemDropTable);
      spawnItemOnGrid(col, row, cfgId);
    } else if (drop.type === 'resource') {
      for (const rid of drop.resIds) {
        if (col >= 0 && col < COLS && row >= 0 && row < ROWS && !isWall(col, row)) {
          spawnResourceOnGrid(col, row, rid);
        }
      }
    } else if (drop.type === 'resource_fixed') {
      spawnResourceOnGrid(col, row, drop.resId);
    }
  }
}
