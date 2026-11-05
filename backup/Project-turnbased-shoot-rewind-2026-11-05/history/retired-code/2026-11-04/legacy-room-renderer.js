// 已退休代码，仅供追溯，不加入模块清单，不独立运行。
function drawMoveArrows() {
  if (turnState.phase !== 'player_select' && turnState.phase !== 'player_shoot_dir') return;
  const arrows = calcMoveArrows();
  if (arrows.length === 0) return;
  ctx.save();
  ctx.globalAlpha = CFG.GHOST_ALPHA;

  for (const arr of arrows) {
    const fromPx = gridToPixel(arr.fromCol, arr.fromRow);
    const toPx   = gridToPixel(arr.toCol, arr.toRow);
    const fp = project(fromPx.x, fromPx.y);
    const tp = project(toPx.x, toPx.y);
    const dx = tp.x - fp.x;
    const dy = tp.y - fp.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) continue;
    const ux = dx / len, uy = dy / len;

    // 画箭头线 (粗像素)
    const s = fp.s;
    const thick = Math.max(2, Math.round(3 * s));
    const headLen = Math.max(4, Math.round(5 * s));

    // 主线
    const startX = fp.x + ux * (CELL * 0.18 * fp.s);
    const endX = tp.x - ux * (headLen);
    const startY = fp.y + uy * (CELL * 0.18 * fp.s);
    const endY = tp.y - uy * (headLen);

    // 粗线
    for (let i = -Math.floor(thick / 2); i <= Math.floor(thick / 2); i++) {
      const px = uy * i;
      const py = -ux * i;
      ctx.strokeStyle = '#ffcc44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(startX + px), Math.round(startY + py));
      ctx.lineTo(Math.round(endX + px), Math.round(endY + py));
      ctx.stroke();
    }

    // 箭头尖端 (三角)
    ctx.fillStyle = '#ffcc44';
    const tipX = tp.x - ux * (CELL * 0.06 * fp.s);
    const tipY = tp.y - uy * (CELL * 0.06 * fp.s);
    ctx.beginPath();
    ctx.moveTo(Math.round(tipX), Math.round(tipY));
    ctx.lineTo(Math.round(endX + uy * headLen * 0.5), Math.round(endY - ux * headLen * 0.5));
    ctx.lineTo(Math.round(endX - uy * headLen * 0.5), Math.round(endY + ux * headLen * 0.5));
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawShootPreview() {
  // 执行阶段不显示预览线
  if (turnState.phase === 'player_execute' || turnState.phase === 'monster_turn') return;
  turnState.previewHits = [];
  // 累计：先算队列中所有射击的命中
  const previews = getShootPreviews();
  for (const pv of previews) {
    drawShootLine(pv.origin.col, pv.origin.row, pv.dir, 0.3);
    accumulateHits(pv.origin.col, pv.origin.row, pv.dir);
  }

  // 当前方向选择
  if (turnState.phase === 'player_shoot_dir' && turnState.pendingShootDir) {
    const ghost = calcGhostPos();
    drawShootLine(ghost.col, ghost.row, turnState.pendingShootDir, 0.5);
    accumulateHits(ghost.col, ghost.row, turnState.pendingShootDir);
  }
}

function accumulateHits(originCol, originRow, dir) {
  const vec = DIR_VEC[dir];
  let cx = originCol, cy = originRow;
  for (let step = 0; step < CFG.BULLET_MAX_DIST; step++) {
    cx += vec.dx; cy += vec.dy;
    if (isWall(cx, cy)) break;
    for (const m of monsters) {
      if (m.col === cx && m.row === cy) {
        const existing = turnState.previewHits.find(h => h.monster.id === m.id);
        const dmg = playerStats.attack;
        if (existing) {
          existing.dmg += dmg;
          existing.lethal = m.hp <= existing.dmg;
        } else {
          turnState.previewHits.push({ monster: m, dmg, lethal: m.hp <= dmg });
        }
        return; // 子弹被怪物阻挡
      }
    }
  }
}

function drawShootLine(originCol, originRow, dir, alpha) {
  const vec = DIR_VEC[dir];
  const gp = gridToPixel(originCol, originRow);
  const pp = project(gp.x, gp.y);
  const s = pp.s;
  const lineLen = CFG.BULLET_MAX_DIST * CELL * s;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#ff6644';
  ctx.lineWidth = Math.max(1, Math.round(1.5 * s));
  ctx.setLineDash([4 * s, 3 * s]);
  ctx.beginPath();
  ctx.moveTo(Math.round(pp.x), Math.round(pp.y));
  ctx.lineTo(Math.round(pp.x + vec.dx * lineLen), Math.round(pp.y + vec.dy * lineLen));
  ctx.stroke();
  ctx.setLineDash([]);

  // 终点碎裂光点 (半透明)
  const endPx = pp.x + vec.dx * lineLen;
  const endPy = pp.y + vec.dy * lineLen;
  ctx.fillStyle = '#ff6644';
  prect(Math.round(endPx) - 2, Math.round(endPy) - 2, 5, 5, 'rgba(255,100,60,0.5)');
  prect(Math.round(endPx) - 1, Math.round(endPy) - 1, 3, 3, 'rgba(255,180,100,0.7)');
  ctx.restore();
}

function drawGhost() {
  if (turnState.phase !== 'player_select' && turnState.phase !== 'player_shoot_dir') return;
  const ghost = calcGhostPos();
  if (ghost.col === player.col && ghost.row === player.row) return;
  const gp = gridToPixel(ghost.col, ghost.row);
  // 幽灵朝向：队列最后一个移动的方向
  let ghostFacing = player.facing;
  const lastMove = [...turnState.actionQueue].reverse().find(a => a.type === 'move');
  if (lastMove) ghostFacing = lastMove.dir;
  drawCharacterAt(gp.x, gp.y, ghostFacing, 0, 0, CFG.GHOST_ALPHA);

  // 幽灵坐标标签
  const gpp = project(gp.x, gp.y);
  const s = gpp.s;
  ctx.save();
  ctx.globalAlpha = CFG.GHOST_ALPHA;
  ctx.fillStyle = '#ffcc88';
  ctx.font = `${Math.max(5, Math.round(6 * s))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`(${ghost.col},${ghost.row})`, Math.round(gpp.x), Math.round(gpp.y - SPRITE.BASE_SIZE * s * 0.5 - 6 * s));
  ctx.restore();
}
