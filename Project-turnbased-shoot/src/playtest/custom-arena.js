// 独立测试入口。布置记录与试玩状态分离，每次开测从原布置复原。
const arena = { editing: true, start: {col: 2, row: 3}, placements: new Map(), hits: 0, total: 0, last: 0 };
const arenaRoomId = 'custom-arena';
const arenaKey = (col, row) => col + ',' + row;
const arenaInside = (col, row) => col >= 0 && col < COLS && row >= 0 && row < ROWS;
const arenaPanel = document.createElement('section');
arenaPanel.id = 'arena-tools';
arenaPanel.setAttribute('aria-label', '自定义场布置与测试');
arenaPanel.innerHTML = `
  <h1>自定义战斗场</h1>
  <p>布置时左键点棋盘放置，右键删除。开始测试后，用 WASD 移动、方向键攻击、E 放炸弹。R 从原布置重试。</p>
  <div class="arena-controls">
    <label>类别<select id="arena-kind" disabled>
      <option value="dummy">无限生命木桩</option><option value="item">道具</option><option value="terrain">地形／障碍</option>
      <option value="monster">怪物</option><option value="resource">补给</option><option value="start">玩家起点</option>
      <option value="erase">删除</option>
    </select></label>
    <label id="arena-entry-label" hidden>对象<select id="arena-entry"></select></label>
    <button id="arena-start" disabled>开始测试</button><button id="arena-edit" disabled>返回布置</button>
    <button id="arena-restart" disabled>重试本场</button><button id="arena-clear" disabled>清空布置</button>
    <button id="arena-zero" disabled>清零伤害</button>
  </div>
  <p id="arena-details"></p><p id="arena-status" role="status">正在加载战斗配置…</p>
  <p id="arena-damage">木桩命中 0 次 · 总伤害 0 · 最近一次 0</p>`;
document.body.classList.add('custom-arena-page');
document.getElementById('top-content-row').append(arenaPanel);
const arenaControl = id => document.getElementById('arena-' + id);
const arenaTerrain = new Map([[TILE.ROCK,'岩石'],[TILE.POOP,'可破坏障碍'],[TILE.PIT,'深坑'],[TILE.SPIKE,'尖刺']]);
const arenaStatus = message => { arenaControl('status').textContent = message; };

function arenaOptions() {
  const kind = arenaControl('kind').value, entry = arenaControl('entry');
  const entries = kind === 'terrain' ? [...arenaTerrain] :
    Object.entries({item: ITEMS_DB, monster: MONSTER_DB, resource: RESOURCE_DB}[kind] || {})
      .filter(([id, cfg]) => !id.startsWith('_') && cfg?.name).map(([id, cfg]) => [id, cfg.name]);
  entry.replaceChildren(...entries.map(([id, name]) => new Option(name, id)));
  arenaControl('entry-label').hidden = !entries.length;
  arenaDescribe();
}
function arenaDescribe() {
  const id = arenaControl('entry').value, kind = arenaControl('kind').value;
  arenaControl('details').textContent = kind === 'item' ? (ITEMS_DB[id]?.desc || '') :
    kind === 'monster' ? (MONSTER_DB[id]?.size > 1 ? '多格单位以点击格为左上角。' : '') :
    kind === 'dummy' ? '木桩保持原地，记录每次收到的伤害。' : '';
}
function arenaDamageText() {
  const format = n => n.toLocaleString('zh-CN', {maximumFractionDigits: 2});
  arenaControl('damage').textContent = '木桩命中 '+arena.hits+' 次 · 总伤害 '+format(arena.total)+' · 最近一次 '+format(arena.last);
}
function arenaResetDamage() {
  arena.hits = arena.total = arena.last = 0;
  arenaDamageText();
}
function arenaOccupant(col, row) {
  return [...arena.placements.values()].find(p =>
    col >= p.col && col < p.col + p.size && row >= p.row && row < p.row + p.size);
}
function arenaPlace(col, row, remove = false) {
  const kind = remove ? 'erase' : arenaControl('kind').value, id = arenaControl('entry').value;
  if (!arenaInside(col, row)) return;
  const occupant = arenaOccupant(col, row);
  if (kind === 'erase') {
    if (!occupant) return;
    arena.placements.delete(arenaKey(occupant.col, occupant.row));
  } else if (kind === 'start') {
    if (occupant) return arenaStatus('请把玩家起点放到空格。');
    arena.start = {col, row};
  } else {
    const size = kind === 'monster' ? (MONSTER_DB[id]?.size || 1) : 1;
    for (let x = col; x < col + size; x++) for (let y = row; y < row + size; y++) {
      if (!arenaInside(x, y) || arenaOccupant(x, y) || (arena.start.col === x && arena.start.row === y)) {
        return arenaStatus('位置越界或已被占用。请选空格，或先删除原对象。');
      }
    }
    arena.placements.set(arenaKey(col, row), {kind, id, col, row, size});
  }
  arenaLoad(true);
}
function arenaLoad(editing) {
  arena.editing = editing;
  document.body.classList.toggle('arena-editing', editing);
  const grid = Array.from({length: COLS}, () => Array(ROWS).fill(TILE.FLOOR));
  for (const p of arena.placements.values()) if (p.kind === 'terrain') grid[p.col][p.row] = Number(p.id);
  const room = {id: arenaRoomId, type: 'start', tplKey: '自定义场', grid, doors: {}};
  allFloors[1] = {floorNum: 1, name: '战斗测试', rooms: [room], startRoomId: room.id, layout: {[room.id]: {gx: 0, gy: 0}}};
  resetGameToFloor1();
  pendingBossLanding = null;
  floorFadeBusy = false;
  document.getElementById('floor-fade').style.opacity = '0';
  document.getElementById('floor-banner').classList.remove('show');
  for (const id of ['start-menu-modal', 'death-modal', 'victory-modal']) document.getElementById(id).classList.remove('show');
  if (worldMapOpen) toggleWorldMap(false);
  const {col, row} = arena.start, q = gridToPixel(col, row);
  Object.assign(player, {col, row, px: q.x, py: q.y});
  for (const p of arena.placements.values()) {
    if (p.kind === 'item') spawnItemOnGrid(p.col, p.row, p.id);
    if (p.kind === 'resource') spawnResourceOnGrid(p.col, p.row, p.id);
    if (p.kind === 'monster') stepSpawnOriginal(p.id, MONSTER_DB[p.id].movementTags, null, p);
    if (p.kind === 'dummy') {
      const pos = gridToPixel(p.col, p.row);
      monsters.push({id: ++monsterIdCounter, cfgId: 'arena-dummy', arenaDummy: true, name: '训练木桩',
        col: p.col, row: p.row, px: pos.x, py: pos.y, hp: 1, maxHp: 1, displayHp: 1, size: 1,
        hitFlash: 0, shakeX: 0, shakeY: 0});
    }
  }
  gameStarted = true;
  inCombat = monsters.some(m => !m.arenaDummy);
  singleStepReset();
  updateUI();
  updateActionBar();
  arenaResetDamage();
  for (const id of ['kind', 'entry', 'clear', 'start']) arenaControl(id).disabled = !editing;
  for (const id of ['edit', 'restart', 'zero']) arenaControl(id).disabled = editing;
  arenaStatus(editing ? '布置中 · 已放置 '+arena.placements.size+' 个对象' : '测试中 · 返回布置可继续修改原场景');
}

const arenaPlanOriginal = singleStepPlan;
hasMonstersAlive = () => monsters.some(m => !m.arenaDummy && m.hp > 0);
singleStepPlan = function() {
  for (const m of monsters) if (m.arenaDummy) SINGLE_STEP.plans.set(m.id, {type: 'wait', cells: []});
  arenaPlanOriginal();
};
const arenaDamageOriginal = damageMonster;
damageMonster = function(m, amount, ...args) {
  if (!m.arenaDummy) return arenaDamageOriginal(m, amount, ...args);
  if (!Number.isFinite(amount) || amount <= 0) return;
  arena.hits++;
  arena.last = amount;
  arena.total += amount;
  m.arenaHitUntil = performance.now() + 180;
  damageNumbers.push({x: m.px, y: m.py, text: '-'+amount, color: '#f4c96c', life: .65, maxLife: .65, vx: 0, vy: -30});
  SFX.hit();
  arenaDamageText();
};
const arenaDrawOriginal = drawMonsters;
drawMonsters = function() {
  const all = monsters, dummies = all.filter(m => m.arenaDummy);
  monsters = all.filter(m => !m.arenaDummy);
  try { arenaDrawOriginal(); } finally { monsters = all; }
  ctx.save();
  for (const m of dummies) {
    const p = project(m.px, m.py), s = CELL, hit = m.arenaHitUntil > performance.now();
    ctx.fillStyle = '#38271f';ctx.fillRect(p.x-s*.24,p.y+s*.12,s*.48,s*.16);
    ctx.fillStyle = '#855233';ctx.fillRect(p.x-s*.10,p.y-s*.19,s*.20,s*.36);
    ctx.fillStyle = hit ? '#ffdf95' : '#be874d';ctx.fillRect(p.x-s*.22,p.y-s*.28,s*.44,s*.31);
    ctx.font = 'bold '+Math.round(s*.28)+'px sans-serif';
    ctx.textAlign = 'center';ctx.fillStyle = '#fff3cc';ctx.fillText('∞',p.x,p.y-s*.34);
  }
  ctx.restore();
};

arenaControl('kind').addEventListener('change', arenaOptions);
arenaControl('entry').addEventListener('change', arenaDescribe);
arenaControl('start').addEventListener('click', () => arenaLoad(false));
arenaControl('restart').addEventListener('click', () => arenaLoad(false));
arenaControl('edit').addEventListener('click', () => arenaLoad(true));
arenaControl('clear').addEventListener('click', () => {
  arena.placements.clear();
  arenaLoad(true);
});
arenaControl('zero').addEventListener('click', arenaResetDamage);
function arenaBoardClick(event, remove) {
  if (!arena.editing || arenaControl('kind').disabled) return;
  event.preventDefault();
  const bounds = canvas.getBoundingClientRect();
  const p = pixelToGrid((event.clientX-bounds.left)*GAME_W/bounds.width, (event.clientY-bounds.top)*GAME_H/bounds.height);
  arenaPlace(p.col, p.row, remove);
}
canvas.addEventListener('click', event => arenaBoardClick(event, false));
canvas.addEventListener('contextmenu', event => arenaBoardClick(event, true));
window.addEventListener('keydown', event => {
  if (event.target.closest?.('input,select,textarea')) return;
  const gameplayKey = /^(Key[WASDERM]|Arrow(Up|Down|Left|Right))$/.test(event.code);
  if (!gameplayKey || (!arena.editing && event.code !== 'KeyR')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.code === 'KeyR' && !event.repeat && !arena.editing) arenaLoad(false);
}, true);
document.getElementById('btn-retry-death').addEventListener('click', event => {
  event.stopImmediatePropagation();
  arenaLoad(false);
}, true);

// 正式入口异步加载内嵌配置；使用原入口完成后再替换场地。
function arenaReady() {
  if (!currentFloor || !MONSTER_DB.step_fixed || !Object.keys(ITEMS_DB).length) {
    requestAnimationFrame(arenaReady);
    return;
  }
  registerWeaponTrialItems();
  arenaOptions();
  arenaLoad(true);
}
requestAnimationFrame(arenaReady);
