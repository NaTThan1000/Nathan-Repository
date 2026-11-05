// 无现役调用的旧辅助函数，仅归档，不加入构建。
function getMonsterAt(col, row) {
  return monsters.find(m => {
    const sz = m.size || 1;
    return col >= m.col && col < m.col + sz && row >= m.row && row < m.row + sz;
  });
}

function randomMovableDir(col, row, steps, exclude) {
  const all = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    { dx: 1, dy: 1 }, { dx: 1, dy: -1 },
    { dx: -1, dy: 1 }, { dx: -1, dy: -1 },
  ];
  const viable = all.filter(d => {
    if (exclude && d.dx === exclude.dx && d.dy === exclude.dy) return false;
    return canMoveMin1(col, row, d.dx, d.dy, steps);
  });
  if (viable.length === 0) return null;
  return viable[Math.floor(Math.random() * viable.length)];
}
