// 无现役调用的旧辅助函数，仅归档，不加入构建。
function refreshReachableTiles() {
  turnState.reachableTiles = calcReachableTiles(player.col, player.row, turnState.mAP);
}

function manhattanDist(c1, r1, c2, r2) {
  return Math.abs(c1 - c2) + Math.abs(r1 - r2);
}
