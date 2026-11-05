// 无现役调用的旧辅助函数，仅归档，不加入构建。
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
