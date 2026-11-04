// ==================== 苍蝇公爵 (Duke Fly) 系统 ====================

// 战斗开始时判定公爵初始对角方向（仅执行一次）
function initDukeQuadrant(m) {
  // 计算公爵 4 格中心点
  const centerCol = m.col + (m.size || 2) / 2 - 0.5;
  const centerRow = m.row + (m.size || 2) / 2 - 0.5;
  // 房间中心点
  const roomCenterCol = (COLS - 1) / 2;
  const roomCenterRow = (ROWS - 1) / 2;

  const relCol = centerCol - roomCenterCol;
  const relRow = centerRow - roomCenterRow;

  if (relCol >= 0 && relRow < 0) {
    // 右上象限 → 左下
    m._diagDir = { dCol: -1, dRow: 1 };
  } else if (relCol < 0 && relRow < 0) {
    // 左上象限 → 右下
    m._diagDir = { dCol: 1, dRow: 1 };
  } else if (relCol < 0 && relRow >= 0) {
    // 左下象限 → 右上
    m._diagDir = { dCol: 1, dRow: -1 };
  } else {
    // 右下象限 → 左上
    m._diagDir = { dCol: -1, dRow: -1 };
  }
  m._dukeFirstTurn = true;
}

// 计算公爵本回合的完整路径（含对角移动、碰壁反弹、浮游眼推移、玩家碰撞）
// 使用关键帧动画系统：路径存储在 _dukeKeyframes，由 updateDukeAnim 逐帧驱动 px/py
function calcDukePath(m, turnIdx) {
  const cfg = MONSTER_DB[m.cfgId];
  if (!cfg) { m.predictedPath = []; m._dukeKeyframes = []; return; }

  const resolved = resolveMonsterAction(cfg, turnIdx, m.col, m.row, player.col, player.row);
  const selectedAction = resolved.action;
  const stepCount = resolved.steps;
  const afterAction = resolved.afterAction;

  m.moveSpeed = stepCount;
  m._turnAction = selectedAction;
  m._turnAfterAction = afterAction;

  if (!selectedAction || selectedAction.type !== 'duke_diagonal_move') {
    m.predictedPath = []; m._dukeKeyframes = []; return;
  }

  const dir = m._diagDir || { dCol: 1, dRow: 1 };
  const keyframes = [];
  let curCol = m.col, curRow = m.row;

  for (let step = 0; step < stepCount; step++) {
    const targetCol = curCol + dir.dCol;
    const targetRow = curRow + dir.dRow;

    // 检查 4 格体积是否出界 → 碰壁反弹
    const sz = m.size || 2;
    let blockedH = false, blockedV = false;
    if (targetCol < 0 || targetCol + sz - 1 >= COLS) blockedH = true;
    if (targetRow < 0 || targetRow + sz - 1 >= ROWS) blockedV = true;

    if (blockedH) dir.dCol *= -1;
    if (blockedV) dir.dRow *= -1;

    const finalTargetCol = curCol + dir.dCol;
    const finalTargetRow = curRow + dir.dRow;

    if (finalTargetCol < 0 || finalTargetCol + sz - 1 >= COLS) break;
    if (finalTargetRow < 0 || finalTargetRow + sz - 1 >= ROWS) break;

    // === 检查路径上是否有其他怪物（非公爵浮游眼） ===
    // 其他Boss → 视为墙壁反弹；其他小怪 → 视为浮游眼推移/挤走
    const otherMonsters = monsters.filter(om =>
      om.id !== m.id && om.hp > 0 && !om.jumperVanished && om.cfgId !== 'duke_floater'
    );

    let pushedFloaters = new Map();  // 提前声明（浮游眼 + 小怪共用）
    let blockedByBoss = false;
    for (const om of otherMonsters) {
      const isBoss = om.aiType === 'boss_jumper' || om.aiType === 'boss_chase' || om.aiType === 'boss_duke';
      const omSz = om.size || 1;
      // 检查 Duke 移动后的 4 格体积是否和该怪物重叠
      for (let ddc = 0; ddc < sz; ddc++) {
        for (let ddr = 0; ddr < sz; ddr++) {
          const dukeNewC = finalTargetCol + ddc;
          const dukeNewR = finalTargetRow + ddr;
          if (dukeNewC >= om.col && dukeNewC < om.col + omSz && dukeNewR >= om.row && dukeNewR < om.row + omSz) {
            if (isBoss) {
              // 其他Boss → 视为墙壁反弹
              blockedByBoss = true;
            } else {
              // 小怪 → 推移/挤走（同浮游眼逻辑）
              let pushedCol = om.col + dir.dCol;
              let pushedRow = om.row + dir.dRow;
              if (pushedCol < 0 || pushedCol >= COLS) pushedCol = om.col;
              if (pushedRow < 0 || pushedRow >= ROWS) pushedRow = om.row;
              const pushedOccupied = monsters.some(om2 => {
                if (om2.id === om.id) return false;
                if (om2.id === m.id) return false;
                const osz2 = om2.size || 1;
                return pushedCol >= om2.col && pushedCol < om2.col + osz2 && pushedRow >= om2.row && pushedRow < om2.row + osz2;
              });
              if (!pushedOccupied && pushedCol >= 0 && pushedCol < COLS && pushedRow >= 0 && pushedRow < ROWS) {
                if (!pushedFloaters.has(om.id)) {
                  pushedFloaters.set(om.id, { col: pushedCol, row: pushedRow });
                }
              }
            }
            break;
          }
        }
      }
      if (blockedByBoss) break;
    }

    // 被其他Boss阻挡 → 反弹方向，本步不走
    if (blockedByBoss) {
      dir.dCol *= -1;
      dir.dRow *= -1;
      // 检查反弹后是否出界
      const reboundCol = curCol + dir.dCol;
      const reboundRow = curRow + dir.dRow;
      if (reboundCol < 0 || reboundCol + sz - 1 >= COLS) break;
      if (reboundRow < 0 || reboundRow + sz - 1 >= ROWS) break;
      // 反弹后跳过本步（不产生关键帧），下一步用新方向
      continue;
    }

    // === 检查路径上的浮游眼：整体推移 ===
    const dukeFloaters = monsters.filter(om =>
      om.id !== m.id && om.cfgId === 'duke_floater' && om.hp > 0 && !om.jumperVanished
    );

    for (const df of dukeFloaters) {
      const dfCells = monsterCells(df);
      for (const dc of dfCells) {
        for (let ddc = 0; ddc < sz; ddc++) {
          for (let ddr = 0; ddr < sz; ddr++) {
            const dukeNewC = finalTargetCol + ddc;
            const dukeNewR = finalTargetRow + ddr;
            if (dc.col === dukeNewC && dc.row === dukeNewR) {
              let pushedCol = df.col + dir.dCol;
              let pushedRow = df.row + dir.dRow;
              if (pushedCol < 0 || pushedCol >= COLS) pushedCol = df.col;
              if (pushedRow < 0 || pushedRow >= ROWS) pushedRow = df.row;
              // 检查推移目标是否被其他怪物占据（排除浮游眼自身和 Duke）
              const pushedOccupied = monsters.some(om => {
                if (om.id === df.id) return false;  // 排除浮游眼自身
                if (om.id === m.id) return false;   // 排除 Duke（Duke 正在移动到这个位置附近）
                const osz = om.size || 1;
                return pushedCol >= om.col && pushedCol < om.col + osz && pushedRow >= om.row && pushedRow < om.row + osz;
              });
              if (!pushedOccupied && pushedCol >= 0 && pushedCol < COLS && pushedRow >= 0 && pushedRow < ROWS) {
                if (!pushedFloaters.has(df.id)) {
                  pushedFloaters.set(df.id, { col: pushedCol, row: pushedRow });
                }
              }
              break;
            }
          }
        }
      }
    }

    // 玩家碰撞在关键帧实际抵达时处理，规划阶段不更改玩家状态。
    let playerHitThisStep = false;

    // 记录关键帧（目标格子坐标）
    keyframes.push({
      targetCol: finalTargetCol,
      targetRow: finalTargetRow,
      pushedFloaters: pushedFloaters,
      playerHit: playerHitThisStep,
    });
    curCol = finalTargetCol;
    curRow = finalTargetRow;
  }

  m._dukeKeyframes = keyframes;
  m._dukeKeyframeIdx = 0;
  m.predictedPath = []; // Duke 不走逐帧机制
}

// 每帧更新 Duke 关键帧动画（在 animateMonsters 之后调用，直接控制 px/py）
// Duke 走独立动画轨道，animateMonsters 跳过 Duke
const DUKE_ANIM_SPEED = 200; // px/s
function updateDukeAnim(dt) {
  return; // 关键帧已转换为统一视觉路径。
  if (turnState.phase !== 'monster_turn' || monsterGroupPhase !== 'move') return;
  for (const m of monsters) {
    if (m.aiType !== 'boss_duke') continue;
    if (!m._dukeKeyframes || m._dukeKeyframes.length === 0) continue;
    if (m._dukeKeyframeIdx >= m._dukeKeyframes.length) continue;

    const kf = m._dukeKeyframes[m._dukeKeyframeIdx];
    const targetPix = gridToPixel(kf.targetCol, kf.targetRow);
    const sz = m.size || 2;
    // 用 4 格体积中心点计算距离
    const centerTargetX = targetPix.x + CELL * (sz - 1) / 2;
    const centerTargetY = targetPix.y + CELL * (sz - 1) / 2;
    const centerCurX = m.px + CELL * (sz - 1) / 2;
    const centerCurY = m.py + CELL * (sz - 1) / 2;

    const dx = centerTargetX - centerCurX;
    const dy = centerTargetY - centerCurY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      // 按本步实际位置结算碰撞；无法挤出时双方保持原位置。
      for(let dc=0;dc<sz;dc++)for(let dr=0;dr<sz;dr++)noteDangerCell(kf.targetCol+dc,kf.targetRow+dr,m.id,"move");
      const overlaps=player.col>=kf.targetCol&&player.col<kf.targetCol+sz&&player.row>=kf.targetRow&&player.row<kf.targetRow+sz;
      if(overlaps){damagePlayer(m.damage||1,m.id);if(!pushPlayerFromMonster(m,kf.targetCol,kf.targetRow)){
        const old=gridToPixel(m.col,m.row);m.px=old.x;m.py=old.y;m._dukeKeyframes=[];m._dukeKeyframeIdx=0;continue;
      }}
      // 到达当前关键帧 → 更新 col/row 和 px/py
      m.col = kf.targetCol;
      m.row = kf.targetRow;
      m.px = targetPix.x;
      m.py = targetPix.y;

      // 执行浮游眼推移（同步更新 col/row 和 px/py）
      if (kf.pushedFloaters) {
        for (const [fId, newPos] of kf.pushedFloaters) {
          const floater = monsters.find(om => om.id === fId);
          if (floater) {
            floater.col = newPos.col;
            floater.row = newPos.row;
            const fpix = gridToPixel(newPos.col, newPos.row);
            floater.px = fpix.x; floater.py = fpix.y;
          }
        }
      }

      m._dukeKeyframeIdx++;
    } else {
      // 沿对角线方向平滑移动 px/py（只移 px/py，col/row 不变直到到达）
      const step = DUKE_ANIM_SPEED * dt;
      const r = Math.min(step / dist, 1);
      m.px += dx * r;
      m.py += dy * r;
    }
  }
}

// 回合2砸下：怪物回合中调用，先播跳起消失动画 → 然后落地
function executeBossLandingNow(m) {
  if (!pendingBossLanding || pendingBossLanding.monster.id !== m.id) return;

  const { targetCol, targetRow } = pendingBossLanding;
  let { landAction } = pendingBossLanding;

  if (!landAction) {
    const mCfg = MONSTER_DB[m.cfgId];
    landAction = (mCfg && mCfg.actions) ? mCfg.actions.find(a => a.type === 'jump_big_land') : null;
  }

  const sz = m.size || 2;

  // === 第1阶段：跳起消失动画（原地颤抖→缩小消失，0.2s） ===
  m._charging = false;
  m._shaking = false;
  m._showingExclaim = false;
  m.jumperVanished = true;
  m.jumpFrom = { col: m.col, row: m.row };
  m.jumpTo = { col: m.col, row: m.row };
  m.jumpAnimTimer = 0.2;
  m.jumpType = 'charge_vanish';
  // 记录落地参数（动画结束后在 update 循环中触发第二阶段）
  m._pendingLandCol = targetCol;
  m._pendingLandRow = targetRow;
  m._pendingLandAction = landAction;
  m._landingPhase = 0; // 0=vanish中, 1=等待big_land
}

// 处理大跳跃延迟落地（在玩家回合结束时调用 — 仅旧版 vanish 流程，新流程已不再走此路径）
function executeBossLanding() {
  if (!pendingBossLanding) return;

  // 检查是否是新流程的蓄力中Boss（新流程在怪物回合中直接处理）
  const m = pendingBossLanding.monster;
  if (m && m._charging) return; // 新流程：不在玩家回合结束时处理，等怪物回合处理

  // 旧版兼容：直接落地
  const { targetCol, targetRow } = pendingBossLanding;
  let { landAction } = pendingBossLanding;
  if (!landAction) {
    const mCfg = MONSTER_DB[m.cfgId];
    landAction = (mCfg && mCfg.actions) ? mCfg.actions.find(a => a.type === 'jump_big_land') : null;
  }
  const sz = m.size || 2;

  const oldBossPos={col:m.col,row:m.row};
  // === 第1步：Boss出现在目标位置 ===
  m.col = targetCol; m.row = targetRow;
  const newPix = gridToPixel(m.col, m.row);
  m.px = newPix.x; m.py = newPix.y;
  m.jumperVanished = false;
  m.jumperPhase = 1;
  m.jumperJustLanded = true;
  m.jumpFrom = { col: targetCol, row: targetRow };
  m.jumpTo = { col: targetCol, row: targetRow };
  m.jumpAnimTimer = 0.55;
  m.jumpType = 'big_land';

  doLandingDamage(m, targetCol, targetRow, sz, landAction, oldBossPos);

  inCombat = true;
  updateDoorsLocked();
  pendingBossLanding = null;
}

// 落地伤害+效果（抽成共用函数）
function doLandingDamage(m, targetCol, targetRow, sz, landAction, oldBossPos = null) {
  // 本体落地碰撞
  let playerDirectHit = false;
  for (let dc = 0; dc < sz; dc++) {
    for (let dr = 0; dr < sz; dr++) {
      const tc = targetCol + dc, tr = targetRow + dr;
      noteDangerCell(tc, tr, m.id, "move");
      if (!playerDirectHit && tc === player.col && tr === player.row) {
        const collisionDmg = m.damage || 0.5;
        damagePlayer(collisionDmg, m.id);
        playerDirectHit = true;
      }
      for (const om of monsters) {
        if (om.id === m.id || om.jumperVanished) continue;
        if (isInMonsterFootprint(om, tc, tr)) {
          damageMonster(om, 1);
        }
      }
    }
  }

  // after_effect（冲击波等）
  resolveAfterEffects(landAction, { monster: m, targetCol, targetRow, sz });
  // 落点命中先结算原位置的伤害，再平移挤出；无空位则 Boss 返回原位置。
  if(playerDirectHit&&!pushPlayerFromMonster(m,targetCol,targetRow)&&oldBossPos){
    m.col=oldBossPos.col;m.row=oldBossPos.row;const oldPixel=gridToPixel(m.col,m.row);m.px=oldPixel.x;m.py=oldPixel.y;
  }
}

// 公爵召唤浮游眼（概率判定 + 上限检查 + 相邻格随机空格生成）
function handleDukeSummon(m) {
  const ae = m._turnAfterAction;
  if (!ae) return;
  const chance = ae.chance !== undefined ? ae.chance : 0.3;
  const maxCount = ae.maxCount !== undefined ? ae.maxCount : 3;
  const monsterId = ae.monsterId || 'duke_floater';

  // 概率判定
  if (monsterActionRandom() >= chance) return;

  // 检查场上公爵浮游眼数量
  const currentFloaters = monsters.filter(om =>
    om.cfgId === monsterId && om.hp > 0 && !om.jumperVanished
  ).length;
  if (currentFloaters >= maxCount) return;

  // 公爵 12 个相邻格（4 格体积外围），随机选一个空格召唤
  const sz = m.size || 2;
  const adjacentCandidates = [];
  for (let dc = -1; dc <= sz; dc++) {
    for (let dr = -1; dr <= sz; dr++) {
      // 跳过公爵本体格子
      if (dc >= 0 && dc < sz && dr >= 0 && dr < sz) continue;
      const nc = m.col + dc, nr = m.row + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      if (isMonsterAt(nc, nr)) continue;
      if (nc === player.col && nr === player.row) continue;
      // 飞行单位：不检查地形，但检查是否是墙壁
      if (!TILE_WALKABLE[currentRoomGrid[nc][nr]]) continue;
      adjacentCandidates.push({ col: nc, row: nr });
    }
  }

  if (adjacentCandidates.length === 0) return;

  const spawnPos = adjacentCandidates[monsterActionChoiceIndex(adjacentCandidates.map(()=>1))];
  const spawnCfg = MONSTER_DB[monsterId];
  if (!spawnCfg) return;

  const pix = gridToPixel(spawnPos.col, spawnPos.row);
  const newMonster = {
    id: ++monsterIdCounter,
    cfgId: spawnCfg.id,
    name: spawnCfg.name,
    col: spawnPos.col, row: spawnPos.row,
    px: pix.x, py: pix.y,
    hp: spawnCfg.hp, maxHp: spawnCfg.hp,
    displayHp: spawnCfg.hp,
    damage: spawnCfg.damage,
    aiType: spawnCfg.aiType,
    tint: spawnCfg.tint,
    predictedPath: [], moveSpeed: 2,
    hitFlash: 0, shakeX: 0, shakeY: 0,
    size: spawnCfg.size || 1,
    jumperVanished: false,
    disappearStepsRemaining: 0,
    movementTags: ['飞行'],
    _spawnedThisTurn: true,  // 本回合生成，不参与当前回合的路径计算
  };
  if (spawnCfg.loot) newMonster._killLoot = preRollLoot(spawnCfg.loot);
  monsters.push(newMonster);
}

// 砸下第二阶段：vanish动画结束后在目标位置播 big_land
function resolveBossLandingPosition(m,c,r){let best=Infinity,out=null;const size=m.size||2;for(let x=0;x<=COLS-size;x++)for(let y=0;y<=ROWS-size;y++){if(!isValidLandingZone(x,y,size)||monsters.some(o=>o.id!==m.id&&o.hp>0&&!o.jumperVanished&&x<o.col+(o.size||1)&&x+size>o.col&&y<o.row+(o.size||1)&&y+size>o.row))continue;const d=Math.abs(x-c)+Math.abs(y-r);if(d<best){best=d;out={col:x,row:y};}}return out||{col:m.col,row:m.row};}

function finishBossLandingPhase2(m) {
  const landing=resolveBossLandingPosition(m,m._pendingLandCol,m._pendingLandRow);
  const targetCol=landing.col,targetRow=landing.row;
  const landAction = m._pendingLandAction;
  const sz = m.size || 2;
  const oldBossPos={col:m.col,row:m.row};

  m.col = targetCol; m.row = targetRow;
  const newPix = gridToPixel(m.col, m.row);
  m.px = newPix.x; m.py = newPix.y;
  m.jumperVanished = false;
  m.jumperPhase = 1;
  m.jumperJustLanded = true;
  m.jumpFrom = { col: targetCol, row: targetRow };
  m.jumpTo = { col: targetCol, row: targetRow };
  m.jumpAnimTimer = 0.55;
  m.jumpType = 'big_land';

  doLandingDamage(m, targetCol, targetRow, sz, landAction, oldBossPos);

  inCombat = true;
  updateDoorsLocked();
  pendingBossLanding = null;

  // 清理过渡状态
  m._landingPhase = null;
  m._pendingLandCol = null;
  m._pendingLandRow = null;
  m._pendingLandAction = null;
}
