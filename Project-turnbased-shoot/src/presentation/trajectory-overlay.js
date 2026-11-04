// --- 地面方格高亮辅助 ---
function drawGridOverlay(col, row, innerColor, innerAlpha, borderAlpha) {
  const xL = FLOOR_L + col * CELL, xR = FLOOR_L + (col + 1) * CELL;
  const yT = FLOOR_T + row * CELL, yB = FLOOR_T + (row + 1) * CELL;
  const tl = project(xL, yT), tr = project(xR, yT);
  const bl = project(xL, yB), br = project(xR, yB);
  ctx.save();
  ctx.globalAlpha = innerAlpha;
  ctx.fillStyle = innerColor;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = borderAlpha;
  ctx.strokeStyle = innerColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// --- 射击弹道方格 (蓝色呼吸) ---
function drawShootGridHighlights() {
  if (turnState.phase === 'player_execute' || turnState.phase === 'monster_turn') return;
  const breath = 0.12 + 0.08 * Math.sin(monsterFlashTimer * 5);
  // 队列中所有射击
  const previews = getShootPreviews();
  for (const pv of previews) traceBulletCells(pv.origin.col, pv.origin.row, pv.dir, breath);
  // 当前方向选择
  if (turnState.phase === 'player_shoot_dir' && turnState.pendingShootDir) {
    const ghost = calcGhostPos();
    traceBulletCells(ghost.col, ghost.row, turnState.pendingShootDir, breath);
  }
}
function traceBulletCells(originCol, originRow, dir, breath) {
  const vec = DIR_VEC[dir];
  let cx = originCol, cy = originRow;
  for (let step = 0; step < CFG.BULLET_MAX_DIST; step++) {
    cx += vec.dx; cy += vec.dy;
    if (isWall(cx, cy)) break;
    drawGridOverlay(cx, cy, '#4488ff', breath * 1.3, breath * 0.6);
    if (monsters.some(m => !m.jumperVanished && isInMonsterFootprint(m, cx, cy))) break; // 命中怪物停止
  }
}
