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
