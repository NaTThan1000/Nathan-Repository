// 无现役调用的旧辅助函数，仅归档，不加入构建。
function pset(x, y, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}
