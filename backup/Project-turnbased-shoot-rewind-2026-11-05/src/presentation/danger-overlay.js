// 危险层使用与蓝色移动范围相同的投影格子，单格只绘制一次。
let dangerForecast = null;
let dangerReveal = null;
function drawDangerOverlay() {
  if (!inCombat) return;
  const layer = dangerReveal || (turnState.phase === 'player_select' ? dangerForecast : null);
  if (!layer) return;
  const breath = 0.20 + 0.06 * Math.sin(monsterFlashTimer * 3.5);
  for (const key of layer.yellow) {
    if (layer.red.has(key)) continue;
    const [col,row] = key.split(',').map(Number);
    drawGridOverlay(col,row,'#ffcc44',breath,breath*1.7);
  }
  for (const key of layer.red) {
    const [col,row] = key.split(',').map(Number);
    drawGridOverlay(col,row,'#ff4444',breath+0.06,breath*1.9);
  }
}

// --- 可移动范围渲染 (浅蓝色呼吸闪烁) ---
function drawReachableOverlay() {
  if (turnState.phase !== 'player_select') return;
  const breath = 0.10 + 0.06 * Math.sin(monsterFlashTimer * 3.5);
  for (const key of turnState.reachableTiles) {
    const [col, row] = key.split(',').map(Number);
    // 跳过玩家当前位置 (由 drawGridHighlight 处理)
    if (col === player.col && row === player.row) continue;
    const xL = FLOOR_L + col * CELL, xR = FLOOR_L + (col + 1) * CELL;
    const yT = FLOOR_T + row * CELL, yB = FLOOR_T + (row + 1) * CELL;
    const tl = project(xL, yT), tr = project(xR, yT);
    const bl = project(xL, yB), br = project(xR, yB);

    ctx.save();
    ctx.globalAlpha = breath;
    ctx.fillStyle = '#55aadd';
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
    ctx.closePath(); ctx.fill();

    ctx.globalAlpha = breath * 0.7;
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}
