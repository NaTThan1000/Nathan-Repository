// 冲刺的执行与模拟共用路径规则。

function getChargePath(m, dir, distance) {
  if(!dir) return [];
  const path=[];let col=m.col,row=m.row;
  for(let i=0;i<distance;i++) {
    const nc=col+dir.dx,nr=row+dir.dy;
    if(isWall(nc,nr)||(dir.dx&&dir.dy&&(isWall(nc,row)||isWall(col,nr)))||isMonsterAt(nc,nr,m.id)) break;
    path.push({fromCol:col,fromRow:row,toCol:nc,toRow:nr});col=nc;row=nr;
  }
  return path;
}
