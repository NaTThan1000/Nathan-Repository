// ==================== 移动系统 ====================

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
