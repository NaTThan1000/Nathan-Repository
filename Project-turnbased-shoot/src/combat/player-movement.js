// ==================== 移动系统 ====================
function startMove(dir, speedOverride) {
  const spd = speedOverride || CFG.MOVE_SPEED;
  player.facing = dir;
  const vec = DIR_VEC[dir];
  const nc = player.col + vec.dx;
  const nr = player.row + vec.dy;
  if (isWall(nc, nr)) return false;
  player.col = nc;
  player.row = nr;
  const t = gridToPixel(nc, nr);
  player.targetPx = t.x;
  player.targetPy = t.y;
  player.animTime = 0;
  return true;
}

function updateMove(dt) {
  if (player.targetPx === null) return;
  const dx = player.targetPx - player.px;
  const dy = player.targetPy - player.py;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) {
    player.px = player.targetPx;
    player.py = player.targetPy;
    player.targetPx = null;
    player.targetPy = null;
    player.walkFrame = 0;
    player.animTime = 0;
    return true; // 移动完成
  }
  player.animTime += dt;
  const fd = SPRITE.maxFrame(SPRITE.getWalkDir(player.facing));
  player.walkFrame = Math.floor(player.animTime / SPRITE.ANIM_SPEED) % fd;
  const step = CFG.EXEC_MOVE_SPEED * dt;
  const r = Math.min(step / dist, 1);
  player.px += dx * r;
  player.py += dy * r;
  return false; // 移动中
}
