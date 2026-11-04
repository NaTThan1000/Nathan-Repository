// ==================== 小地图 ====================
function drawMinimap() {
  if (!currentFloor || !currentFloor.layout) return;

  const mapCanvas = document.getElementById('minimap');
  if (!mapCanvas) return;
  const mctx = mapCanvas.getContext('2d');
  const MW = mapCanvas.width, MH = mapCanvas.height;
  mctx.clearRect(0, 0, MW, MH);
  mctx.imageSmoothingEnabled = false;

  // 收集所有房间的布局坐标
  const positions = [];
  for (const [roomId, pos] of Object.entries(currentFloor.layout)) {
    positions.push({ id: roomId, gx: pos.gx, gy: pos.gy });
  }
  if (positions.length === 0) return;

  // 计算布局边界
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of positions) {
    minX = Math.min(minX, p.gx); maxX = Math.max(maxX, p.gx);
    minY = Math.min(minY, p.gy); maxY = Math.max(maxY, p.gy);
  }
  const spanX = maxX - minX + 1;
  const spanY = maxY - minY + 1;

  // 在100×80画布上计算每个房间格的大小
  const padding = 6;
  const availW = MW - padding * 2;
  const availH = MH - padding * 2;
  const cellSize = Math.floor(Math.min(availW / spanX, availH / spanY));
  const cellGap = 2;

  // 居中偏移
  const offsetX = padding + (availW - spanX * (cellSize + cellGap)) / 2;
  const offsetY = padding + (availH - spanY * (cellSize + cellGap)) / 2;

  // 房间类型
  const room = currentFloor.rooms.find(r => r.id === currentRoomId);

  // 先画连接线
  mctx.strokeStyle = '#332820';
  mctx.lineWidth = 1;
  for (const [roomId, pos] of Object.entries(currentFloor.layout)) {
    const r = currentFloor.rooms.find(r => r.id === roomId);
    if (!r) continue;
    const x1 = offsetX + (pos.gx - minX) * (cellSize + cellGap) + cellSize / 2;
    const y1 = offsetY + (pos.gy - minY) * (cellSize + cellGap) + cellSize / 2;
    // 从 doors 推导连接（替代旧 connections 字段）
    const conns = [];
    for (const d of ['up','down','left','right']) {
      if (r.doors && r.doors[d] && r.doors[d].targetRoomId) {
        conns.push({ targetId: r.doors[d].targetRoomId });
      }
    }
    for (const conn of conns) {
      const tpos = currentFloor.layout[conn.targetId];
      if (!tpos) continue;
      const x2 = offsetX + (tpos.gx - minX) * (cellSize + cellGap) + cellSize / 2;
      const y2 = offsetY + (tpos.gy - minY) * (cellSize + cellGap) + cellSize / 2;
      if (visitedRooms.has(conn.targetId)) {
        mctx.strokeStyle = '#5a4a30';
      } else {
        mctx.strokeStyle = '#1a1510';
      }
      mctx.beginPath();
      mctx.moveTo(x1, y1);
      mctx.lineTo(x2, y2);
      mctx.stroke();
    }
  }

  // 画房间方块
  for (const [roomId, pos] of Object.entries(currentFloor.layout)) {
    const visited = visitedRooms.has(roomId);
    const isCurrent = roomId === currentRoomId;
    const r = currentFloor.rooms.find(rr => rr.id === roomId);
    if (!r) continue;

    const rx = Math.round(offsetX + (pos.gx - minX) * (cellSize + cellGap));
    const ry = Math.round(offsetY + (pos.gy - minY) * (cellSize + cellGap));
    const cs = cellSize;

    if (!visited) {
      // 未探索：深色方块
      mctx.fillStyle = '#0a0806';
      mctx.fillRect(rx, ry, cs, cs);
      mctx.strokeStyle = '#1a1510';
      mctx.strokeRect(rx, ry, cs, cs);
    } else {
      // 已探索：根据房间类型着色
      let fillColor = '#3a3020'; // 普通房
      if (r.type === 'start') fillColor = '#3a4a3a';   // 起点：暗绿
      else if (r.type === 'boss') fillColor = '#4a2020'; // Boss：暗红
      else if (r.type === 'treasure') fillColor = '#3a3a20'; // 宝箱：暗黄
      else if (r.type === 'shop') fillColor = '#3a3040'; // 商店：暗紫

      mctx.fillStyle = fillColor;
      mctx.fillRect(rx, ry, cs, cs);

      // 特殊图标
      mctx.fillStyle = '#8a7a5a';
      mctx.font = `${Math.max(5, cs - 2)}px sans-serif`;
      mctx.textAlign = 'center';
      mctx.textBaseline = 'middle';
      if (r.type === 'start') mctx.fillText('S', rx + cs / 2, ry + cs / 2 + 1);
      else if (r.type === 'boss') mctx.fillText('B', rx + cs / 2, ry + cs / 2 + 1);
      else if (r.type === 'treasure') mctx.fillText('T', rx + cs / 2, ry + cs / 2 + 1);
      else if (r.type === 'shop') mctx.fillText('$', rx + cs / 2, ry + cs / 2 + 1);

      // 玩家当前所在房间加亮框
      if (isCurrent) {
        mctx.strokeStyle = '#ffcc44';
        mctx.lineWidth = 2;
        mctx.strokeRect(rx - 1, ry - 1, cs + 2, cs + 2);
      } else {
        mctx.strokeStyle = '#2a2520';
        mctx.lineWidth = 1;
        mctx.strokeRect(rx, ry, cs, cs);
      }
    }
  }
}
