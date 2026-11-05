// 已退休代码，仅供追溯，不加入模块清单，不独立运行。
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
