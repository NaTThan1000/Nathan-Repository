// ==================== 统一掉落调度器 ====================
/**
 * 执行 loot 配置，支持多轮次、三种模式
 * @param {object} lootConfig - 怪物 loot 字段 (含 rounds[] 或顶层直接是 entries)
 * @param {number} col - 掉落基准列
 * @param {number} row - 掉落基准行
 */
function rollLoot(lootConfig, col, row) {
  // 兼容两种写法：顶层有 entries → 单轮；有 rounds → 多轮
  const rounds = lootConfig.rounds || (lootConfig.entries ? [lootConfig] : []);
  for (const round of rounds) {
    const mode = round.mode || 'pick_one';

    if (mode === 'roll_all') {
      for (const entry of round.entries) {
        if (Math.random() < (entry.rate ?? 1)) {
          executeDropEntry(entry, col, row);
        }
      }
    } else if (mode === 'pick_one') {
      // 按权重抽一个条目，再校验 rate
      const totalW = round.entries.reduce((s, e) => s + (e.weight ?? 1), 0);
      if (totalW <= 0) continue;
      let roll = Math.random() * totalW;
      for (const entry of round.entries) {
        roll -= (entry.weight ?? 1);
        if (roll <= 0) {
          if (Math.random() < (entry.rate ?? 1)) {
            executeDropEntry(entry, col, row);
          }
          break;
        }
      }
    } else if (mode === 'pick_first') {
      for (const entry of round.entries) {
        if (Math.random() < (entry.rate ?? 1)) {
          executeDropEntry(entry, col, row);
          break;
        }
      }
    }
  }
}

/**
 * 执行单个掉落条目
 */
function executeDropEntry(entry, col, row) {
  if (entry.type === 'item') {
    const itemDropTable = entry.itemDropTable || 'item_drop_default';
    const cfgId = rollItem(null, itemDropTable);
    if (cfgId) spawnItemOnGrid(col, row, cfgId);

  } else if (entry.type === 'resource') {
    // 新：支持 minDrop/maxDrop 随机次数抽取（每次独立 pick_one）
    if (entry.minDrop !== undefined && entry.maxDrop !== undefined) {
      const count = entry.minDrop + Math.floor(Math.random() * (entry.maxDrop - entry.minDrop + 1));
      for (let i = 0; i < count; i++) {
        const rid = rollResourceDrop(entry.resourceDropTable || 'resource_drop_monster_default');
        if (rid.length > 0 && col >= 0 && col < COLS && row >= 0 && row < ROWS && !isWall(col, row)) {
          spawnResourceOnGrid(col, row, rid[0]);
        }
      }
    } else {
      // 直接引用 resourceDropTables 表名，按表自身 mode 处理
      const resIds = rollResourceDrop(entry.resourceDropTable || 'resource_drop_monster_default');
      for (const rid of resIds) {
        if (col >= 0 && col < COLS && row >= 0 && row < ROWS && !isWall(col, row)) {
          spawnResourceOnGrid(col, row, rid);
        }
      }
    }

  } else if (entry.type === 'resource_fixed') {
    if (entry.id) spawnResourceOnGrid(col, row, entry.id);

  }
  // type === 'nothing' → 什么都不生成
}

// 清空房间掉落 (根据房间 roomClearDrop 配置读取，纯配置驱动)
function rollRoomClearDrop() {
  const room = currentFloor.rooms.find(r => r.id === currentRoomId);
  if (!room) return;

  const dropCfg = room.roomClearDrop;
  if (!dropCfg || !dropCfg.resourceDropTable) return;

  const resIds = rollResourceDrop(dropCfg.resourceDropTable);
  if (resIds.length > 0) {
    spawnResourcesInRoom(resIds);
  }
}

// 破坏地形掉落 (preLoot: 房间生成时预roll的结果，保证ESC回溯后再次破坏结果一致)
function rollTerrainDestroyDrop(col, row, terrainType, preLoot) {
  const resIds = (preLoot !== undefined) ? preLoot : rollResourceDrop(terrainType === 'rock' ? 'resource_drop_terrain_rock' : 'resource_drop_terrain_poop');
  for (const rid of resIds) {
    spawnResourceOnGrid(col, row, rid);
  }
}

// 血雾粒子
function spawnBloodParticles(cx, cy, count) {
  for (let j = 0; j < count; j++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 40 + Math.random() * 80;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 20,
      life: 0.3 + Math.random() * 0.35,
      maxLife: 0.3 + Math.random() * 0.35,
      size: 1 + Math.random() * 2,
      color: Math.random() < 0.6 ? '#cc2222' : '#881111',
    });
  }
}

function updateBullets(dt) {
  if(dt>0.012){const count=Math.ceil(dt/0.012);for(let i=0;i<count;i++)updateBullets(dt/count);return;}
  if(turnState.phase==='monster_turn'&&monsterActionOrder.length){const rank=id=>{const i=monsterActionOrder.indexOf(id);return i<0?Number.MAX_SAFE_INTEGER:i;};bullets.sort((a,b)=>rank(b.ownerId)-rank(a.ownerId));}
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    // --- 怪物子弹处理 ---
    if (b.source === 'monster') {
      if (b.phase === 'flying') {
        const s = b.speed * dt;
        b.x += b.dirX * s; b.y += b.dirY * s;
        b.distTraveled += s;
        if (bulletHitWall(b.x, b.y)) { shatterBullet(b); continue; }
        // 怪物子弹击中炸弹：推移炸弹
        const mBg = pixelToGrid(b.x, b.y);
        const mHitBomb = bombs.find(bomb => bomb.col === mBg.col && bomb.row === mBg.row && bomb.roomId === currentRoomId);
        if (mHitBomb) {
          pushBomb(mHitBomb, b.dirX, b.dirY);
          shatterBullet(b); continue;
        }
        noteDangerCell(mBg.col, mBg.row, b.ownerId, "shoot");
        // 击中玩家
        if (mBg.col === player.col && mBg.row === player.row) {
          damagePlayer(0.5, b.ownerId);
          shatterBullet(b); continue;
        }
        // 到达最大射程消失（无衰减）
        if (b.distTraveled >= b.maxDist) {
          b.distTraveled = b.maxDist;
          shatterBullet(b);
        }
      } else if (b.phase === 'dying') {
        b.shatterTimer -= dt;
        if (b.shatterTimer <= 0) bullets.splice(i, 1);
      }
      continue;
    }
    // --- 玩家子弹处理（原有逻辑） ---
    if (b.phase === 'flying') {
      const s = b.speed * dt;
      b.x += b.dirX * s; b.y += b.dirY * s;
      b.distTraveled += s;
      if (bulletHitWall(b.x, b.y)) { shatterBullet(b); continue; }
      // 子弹击中炸弹：推移炸弹
      const bg = pixelToGrid(b.x, b.y);
      const hitBomb = bombs.find(bomb => bomb.col === bg.col && bomb.row === bg.row && bomb.roomId === currentRoomId);
      if (hitBomb) {
        pushBomb(hitBomb, b.dirX, b.dirY);
        shatterBullet(b); continue;
      }
      // 子弹碰撞怪物
      const hitMon = bulletHitMonster(b.x, b.y, b);
      if (hitMon) {
        damageMonster(hitMon, playerStats.attack);
        if (player.hasPiercing) {
          b.hitMonsters = b.hitMonsters || new Set();
          b.hitMonsters.add(hitMon.id);
        } else {
          shatterBullet(b); continue;
        }
      }
      const decayDist = b.maxDist - CFG.DECAY_START_BEFORE * CELL;
      if (b.distTraveled >= decayDist) {
        b.phase = 'decaying'; b.speed = CFG.BULLET_SPEED * CFG.DECAY_SPEED_RATIO;
        b.vVel = 0; b.decayTimer = 0;
      }
    } else if (b.phase === 'decaying') {
      b.decayTimer += dt;
      const s = b.speed * dt;
      b.x += b.dirX * s; b.y += b.dirY * s;
      b.distTraveled += s;
      b.vVel += CFG.DECAY_GRAVITY * dt;
      b.vOff += b.vVel * dt;
      if (bulletHitWall(b.x, b.y)) { shatterBullet(b); continue; }
      const hitMon2 = bulletHitMonster(b.x, b.y, b);
      if (hitMon2) {
        damageMonster(hitMon2, playerStats.attack);
        if (player.hasPiercing) {
          b.hitMonsters = b.hitMonsters || new Set();
          b.hitMonsters.add(hitMon2.id);
        } else {
          shatterBullet(b); continue;
        }
      }
      if (b.distTraveled >= b.maxDist || b.vOff > CELL * 0.6) {
        if (b.distTraveled >= b.maxDist) b.distTraveled = b.maxDist;
        shatterBullet(b, 'expire');
      }
    } else if (b.phase === 'dying') {
      b.shatterTimer -= dt;
      if (b.shatterTimer <= 0) bullets.splice(i, 1);
    }
  }
}

function shatterBullet(b) {
  b.phase = 'dying'; b.shatterTimer = CFG.SHATTER_DURATION;
  if(scrapCoveredBullet(b))return;
  const n = CFG.SHATTER_PARTICLES;
  const isMonster = b.source === 'monster';
  for (let j = 0; j < n; j++) {
    const angle = (Math.PI * 2 * j) / n + (Math.random() - 0.5) * 0.8;
    const spd = 30 + Math.random() * 60;
    particles.push({
      x: b.x, y: b.y + b.vOff,
      vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 15,
      life: CFG.SHATTER_DURATION + Math.random() * 0.25,
      maxLife: CFG.SHATTER_DURATION + Math.random() * 0.25,
      size: 1,
      color: isMonster
        ? (Math.random() < 0.5 ? '#ff6666' : '#cc4444')
        : (Math.random() < 0.5 ? '#ffdd88' : '#ff9944'),
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += CFG.GRAVITY * 0.5 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
