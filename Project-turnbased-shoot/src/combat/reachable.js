// ==================== 可移动范围计算 (BFS) ====================
function calcReachableTiles(fromCol, fromRow, maxSteps) {
  const reachable = new Set();
  const visited = new Set();
  const queue = [{ col: fromCol, row: fromRow, steps: 0 }];
  visited.add(`${fromCol},${fromRow}`);
  reachable.add(`${fromCol},${fromRow}`);

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.steps >= maxSteps) continue;

    for (const dir of ['up', 'down', 'left', 'right']) {
      const nc = cur.col + DIR_VEC[dir].dx;
      const nr = cur.row + DIR_VEC[dir].dy;
      const key = `${nc},${nr}`;
      if (visited.has(key)) continue;
      if (isWall(nc, nr)) continue;
      // 怪物格不再阻挡（玩家可牺牲血量穿越）, 仅墙壁阻挡

      visited.add(key);
      reachable.add(key);
      queue.push({ col: nc, row: nr, steps: cur.steps + 1 });
    }
  }
  return reachable;
}

// 刷新可移动范围: 从指定位置以指定步数计算
function refreshReachableTiles() {
  turnState.reachableTiles = calcReachableTiles(player.col, player.row, turnState.mAP);
}

// BFS 最短路径：从 (fromCol,fromRow) 到 (toCol,toRow)，尊重墙壁
// 返回路径数组 [{col,row},...] 从起点到终点，或 null
function bfsShortestPath(fromCol, fromRow, toCol, toRow) {
  if (fromCol === toCol && fromRow === toRow) return [{col: fromCol, row: fromRow}];
  const visited = new Set();
  const parent = new Map();
  const queue = [{col: fromCol, row: fromRow}];
  visited.add(`${fromCol},${fromRow}`);

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.col === toCol && cur.row === toRow) {
      // 回溯路径
      const path = [];
      let c = toCol, r = toRow;
      while (c !== fromCol || r !== fromRow) {
        path.unshift({col: c, row: r});
        const key = `${c},${r}`;
        const prev = parent.get(key);
        c = prev.col; r = prev.row;
      }
      path.unshift({col: fromCol, row: fromRow});
      return path;
    }
    for (const dir of ['up', 'down', 'left', 'right']) {
      const nc = cur.col + DIR_VEC[dir].dx;
      const nr = cur.row + DIR_VEC[dir].dy;
      const key = `${nc},${nr}`;
      if (visited.has(key)) continue;
      if (isWall(nc, nr)) continue;
      visited.add(key);
      parent.set(key, {col: cur.col, row: cur.row});
      queue.push({col: nc, row: nr});
    }
  }
  return null;
}

// 曼哈顿距离
function manhattanDist(c1, r1, c2, r2) {
  return Math.abs(c1 - c2) + Math.abs(r1 - r2);
}
