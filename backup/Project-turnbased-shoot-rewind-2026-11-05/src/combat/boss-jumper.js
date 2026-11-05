// ==================== Boss Jumper 行动系统 ====================
// 小跳跃：中心距离判定 → 向远方向移动1格 ×3次


function calcJumperSmallJump(m) {
  const cfg = MONSTER_DB[m.cfgId];
  const jumpAction = (cfg.actions || []).find(a => a.type === 'jump_small');
  const sz = m.size || 2;
  let tCol = m.col, tRow = m.row;
  const px = player.col + 0.5, py = player.row + 0.5;
  const steps = (jumpAction && jumpAction.steps && jumpAction.steps.length > 0) ? jumpAction.steps[0] : 3;

  for (let step = 0; step < steps; step++) {
    const cx = tCol + sz / 2, cy = tRow + sz / 2;
    const dx = px - cx, dy = py - cy;
    const adx = Math.abs(dx), ady = Math.abs(dy);

    if (adx > ady) {
      tCol += Math.sign(dx);
    } else if (ady > adx) {
      tRow += Math.sign(dy);
    } else {
      if (monsterActionChoiceIndex([1,1]) === 0) tCol += (Math.sign(dx) || (monsterActionChoiceIndex([1,1]) === 0 ? 1 : -1));
      else tRow += (Math.sign(dy) || (monsterActionChoiceIndex([1,1]) === 0 ? 1 : -1));
    }
  }

  // 边界约束
  tCol = Math.max(0, Math.min(COLS - sz, tCol));
  tRow = Math.max(0, Math.min(ROWS - sz, tRow));

  // 验证落点并微调
  if (!isValidLandingZone(tCol, tRow, sz)) {
    const offsets = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    let found = false;
    for (const [dc, dr] of offsets) {
      const nc = tCol + dc, nr = tRow + dr;
      if (nc >= 0 && nc <= COLS - sz && nr >= 0 && nr <= ROWS - sz && isValidLandingZone(nc, nr, sz)) {
        tCol = nc; tRow = nr; found = true; break;
      }
    }
    if (!found) return false; // 无有效落点，跳过
  }

  // 检查落点是否与其他怪物2×2重叠
  const otherMonsters = monsters.filter(x => x.id !== m.id && !x.jumperVanished);
  for (const om of otherMonsters) {
    const osz = om.size || 1;
    if (tCol < om.col + osz && tCol + sz > om.col && tRow < om.row + osz && tRow + sz > om.row) {
      return false; // 重叠，跳过
    }
  }

  // 跳跃动画记录
  m.jumpFrom = { col: m.col, row: m.row };
  m.jumpTo = { col: tCol, row: tRow };
  m.jumpAnimTimer = 0.4; // 小跳跃动画时长
  m.jumpType = 'small';

  // 对落点区域内单位造成0.5伤害（玩家只扣一次）
  let playerHit = false;
  for (let dc = 0; dc < sz; dc++)
    for (let dr = 0; dr < sz; dr++) {
      const tc = tCol + dc, tr = tRow + dr;
      noteDangerCell(tc, tr, m.id, "move");
      if (!playerHit && tc === player.col && tr === player.row) { damagePlayer(0.5, m.id); playerHit = true; }
    }

  // 小跳撞到玩家时尝试挤出；四邻无空位则保留原位置。
  if(playerHit && !pushPlayerFromMonster(m,tCol,tRow))return false;

  // 移动Boss
  m.col = tCol; m.row = tRow;
  const newPix = gridToPixel(m.col, m.row);
  m.px = newPix.x; m.py = newPix.y;
  return true;
}

// 大跳跃：回合1蓄力颤抖+感叹号 → 回合2砸下（快速过渡动画：原地颤抖→跳起消失→落地）
function calcJumperBigJump(m) {
  const cfg = MONSTER_DB[m.cfgId];
  const landAction = (cfg.actions || []).find(a => a.type === 'jump_big_land');
  const sz = m.size || 2;

  // === 回合1：蓄力颤抖（首次进入 phase 4） ===
  if (!m._charging) {
    // 预计算落点（用于延迟落地和UI显示）
    const target = selectLandingTarget(landAction, m);
    if (!target) {
      // 无有效落点，退化为小跳跃
      return calcJumperSmallJump(m);
    }

    // 设置蓄力状态：原地颤抖 + 感叹号提示（复用 charge_up 样式）
    m._charging = true;
    m._showingExclaim = true;
    m._shaking = true;
    m.chargeStepsRemaining = (landAction && landAction.chargeSteps !== undefined) ? landAction.chargeSteps : 1;

    // 预存延迟落地信息（携带 action 配置供落地时使用）
    pendingBossLanding = {
      monster: m,
      targetCol: target.col,
      targetRow: target.row,
      landAction: landAction,
    };

    m.predictedPath = [];
    return true;
  }

  // === 回合2：砸下（_charging 已为 true，再次进入即为砸下回合） ===
  // 砸下逻辑由 processJumperAction → executeBossLandingNow 处理
  m.predictedPath = [];
  return true;
}

// 执行一次跳跃Boss行动（在startMonsterTurn中调用）
function processJumperAction(m) {
  if (m.jumperVanished) return;

  // 大跳刚落地：本回合休息，下回合开始循环
  if (m.jumperJustLanded) {
    m.jumperJustLanded = false;
    m.predictedPath = [];
    return;
  }

  // === phase 4 蓄力中：执行砸下（回合2） ===
  if (m._charging) {
    executeBossLandingNow(m);
    m.predictedPath = [];
    return;
  }

  const phase = m.jumperPhase || 1;

  if (phase === 1 || phase === 2) {
    // 小跳跃
    calcJumperSmallJump(m);
    if (phase === 1) m.jumperPhase = 2;
    else if (phase === 2) {
      // 进入检查阶段：按repeatChance概率重复1+2，否则进入大跳
      const cfg = MONSTER_DB[m.cfgId];
      const secondSmallJump = (cfg.actions || [])[1];
      const repeatChance = (secondSmallJump && secondSmallJump.repeatChance !== undefined) ? secondSmallJump.repeatChance : 0;
      if (monsterActionRandom() < repeatChance && !m.jumperCheckRepeated) {
        m.jumperPhase = 1;
        m.jumperCheckRepeated = true;
      } else {
        m.jumperPhase = 4;
        m.jumperCheckRepeated = false;
      }
    }
  } else if (phase === 4) {
    // 大跳跃：蓄力（回合1）
    calcJumperBigJump(m);
  }

  // 清除路径（jumper不参与逐步移动）
  m.predictedPath = [];
}
