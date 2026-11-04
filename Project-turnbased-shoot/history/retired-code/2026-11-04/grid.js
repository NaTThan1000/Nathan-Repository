// 无现役调用的旧辅助函数，仅归档，不加入构建。
function transposeGridColToRow(colGrid){const g=[];for(let r=0;r<ROWS;r++){g[r]=[];for(let c=0;c<COLS;c++)g[r][c]=colGrid[c][r];}return g;}
