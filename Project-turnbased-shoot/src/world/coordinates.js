// ==================== 透视投影 ====================
function vpScale(wy) {
  const t = Math.max(0, Math.min(1, (wy - FLOOR_T) / (FLOOR_B - FLOOR_T)));
  return VP_S + t * (VP_E - VP_S);
}
function project(wx, wy) {
  const s = vpScale(wy);
  return { x: VP_CX + (wx - VP_CX) * s, y: wy, s };
}

// ==================== 坐标转换 ====================
function gridToPixel(col, row) {
  return { x: WALL + col * CELL + CELL / 2, y: WALL + row * CELL + CELL / 2 };
}
function pixelToGrid(px, py) {
  return {
    col: Math.round((px - WALL - CELL / 2) / CELL),
    row: Math.round((py - WALL - CELL / 2) / CELL),
  };
}
function isWall(col, row) {
  if(col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
  if(currentRoomGrid && currentRoomGrid[col] && currentRoomGrid[col][row]!==undefined){
    return !TILE_WALKABLE[currentRoomGrid[col][row]];
  }
  return false;
}
function isBlockingBullet(col,row){
  if(col<0||col>=COLS||row<0||row>=ROWS)return true;
  if(currentRoomGrid&&currentRoomGrid[col]&&currentRoomGrid[col][row]!==undefined){
    const t=currentRoomGrid[col][row];
    // ROCK 完全阻挡；POOP 也让子弹击中的效果在 updateBullets 中处理
    if(t===TILE.ROCK||t===TILE.POOP){hitTile(col,row,1);return true;}
    return TILE_BLOCKS_BULLET[t]||false;
  }
  return false;
}
function bulletHitWall(bx, by) {
  const r = 2;
  if(bx - r < FLOOR_L || bx + r > FLOOR_R || by - r < FLOOR_T || by + r > FLOOR_B) return true;
  const g = pixelToGrid(bx, by);
  return isBlockingBullet(g.col, g.row);
}

// ==================== 像素绘制辅助 ====================
function pset(x, y, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}
function prect(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
