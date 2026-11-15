// 侧边小地图和放大地图共用探索范围。只有放大地图打开时暂停操作。
let worldMapOpen = false;
const floorMapDrawState = new WeakMap();

function toggleWorldMap(open = !worldMapOpen) {
  worldMapOpen = open;
  const modal = document.getElementById('world-map-modal');
  modal.classList.toggle('open', open);
  modal.setAttribute('aria-hidden', String(!open));
  if (open) drawMinimap();
}

function drawMinimap() {
  if (!currentFloor?.layout) return;
  const sidebar = document.getElementById('floor-map-sidebar');
  if (sidebar?.hidden === false) drawFloorMap(document.getElementById('minimap'));
  if (worldMapOpen) {
    const title = document.getElementById('world-map-title');
    const text = '楼层 B' + currentFloor.floorNum + ' · 探索地图';
    if (title.textContent !== text) title.textContent = text;
    drawFloorMap(document.getElementById('world-map'));
  }
}

function drawFloorMap(surface) {
  const previous = floorMapDrawState.get(surface);
  const layout = currentFloor.layout;
  const rooms = new Map(currentFloor.rooms.map(room => [String(room.id), room]));
  const current = String(currentRoomId);
  const visited = new Set([...visitedRooms].map(String));
  visited.add(current);
  const visible = new Set([...visited].filter(id => rooms.has(id) && layout[id]));
  const icons = new Map();
  for (const id of visible) {
    const room=rooms.get(id);
    if(scrapNumericHealth&&['shop','treasure','boss'].includes(room.type)){
      icons.set(id,'room-'+room.type);
      continue;
    }
    const resources = id === current ? resourcesOnGround : room._groundResources;
    for (const resource of resources ?? []) {
      const key = resourceWorldArt(resource) ?? (RESOURCE_DB[resource.cfgId]?.type === 'chest' ? 'crate0' : null);
      if (!key) continue;
      if (scrapWorldIcon(key)) icons.set(id,key);
      break;
    }
  }
  const resourceKey = JSON.stringify([...icons]);
  if (previous?.floor === currentFloor && previous.room === currentRoomId &&
      previous.visited === visitedRooms && previous.count === visitedRooms.size && previous.resourceKey === resourceKey) return;
  const links = new Map();

  for (const [id, room] of rooms) {
    if (!layout[id]) continue;
    for (const door of Object.values(room.doors ?? {})) {
      if (door?.targetRoomId == null) continue;
      const target = String(door.targetRoomId);
      if (!rooms.has(target) || !layout[target] || (!visited.has(id) && !visited.has(target))) continue;
      visible.add(id);
      visible.add(target);
      links.set(JSON.stringify([id, target].sort()), [id, target]);
    }
  }

  const paint = surface.getContext('2d');
  const {width, height} = surface;
  paint.fillStyle = '#0a1b22';
  paint.fillRect(0, 0, width, height);
  const hitBoxes = [];
  floorMapDrawState.set(surface, {
    floor: currentFloor, room: currentRoomId, visited: visitedRooms, count: visitedRooms.size, resourceKey, hitBoxes,
  });
  if (!visible.size) return;

  const xs = [...visible].map(id => layout[id].gx);
  const ys = [...visible].map(id => layout[id].gy);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const columns = Math.max(...xs) - minX + 1, rows = Math.max(...ys) - minY + 1;
  const padding = width > 400 ? 56 : 16;
  const pitch = Math.min(width > 400 ? 92 : 48, (width - padding) / columns, (height - padding) / rows);
  const size = pitch * .72;
  const offsetX = (width - columns * pitch) / 2, offsetY = (height - rows * pitch) / 2;
  const point = ({gx, gy}) => ({
    x: offsetX + (gx - minX + .5) * pitch,
    y: offsetY + (gy - minY + .5) * pitch,
  });

  paint.lineWidth = Math.max(2, pitch * .055);
  for (const [id, target] of links.values()) {
    const from = point(layout[id]), to = point(layout[target]);
    paint.strokeStyle = visited.has(id) && visited.has(target) ? '#537a80' : '#304a56';
    paint.beginPath();
    paint.moveTo(from.x, from.y);
    paint.lineTo(to.x, to.y);
    paint.stroke();
  }

  const colors = {start:'#3375a8', normal:'#3375a8', boss:'#a64546', treasure:'#39805c', shop:'#9d7538'};
  for (const id of visible) {
    const {x, y} = point(layout[id]);
    const known = visited.has(id), active = id === current;
    paint.fillStyle = known ? (colors[rooms.get(id).type] ?? colors.normal) : '#192b35';
    paint.fillRect(x - size / 2, y - size / 2, size, size);
    paint.strokeStyle = active ? '#67e4ec' : known ? '#779da2' : '#344b55';
    paint.lineWidth = active ? 3 : 1.5;
    paint.strokeRect(x - size / 2, y - size / 2, size, size);
    if (known) hitBoxes.push({id,x,y,size});
    const icon = icons.get(id);
    if (icon) {
      const image = scrapWorldIcon(icon), max = size*.68;
      if (icon === 'crate0') {
        paint.drawImage(image,0,200,image.naturalWidth,300,x-max/2,y-max/2,max,max);
      } else {
        const width=image.naturalWidth??image.width,height=image.naturalHeight??image.height;
        const scale = max/Math.max(width,height);
        const w=width*scale,h=height*scale;
        paint.drawImage(image,x-w/2,y-h/2,w,h);
      }
    }
  }
}
