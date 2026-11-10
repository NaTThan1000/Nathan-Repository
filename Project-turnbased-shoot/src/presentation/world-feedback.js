// ==================== 楼层进入横幅 ====================
let floorBannerTimer = null;
function showFloorBanner(text) {
  const el = document.getElementById('floor-banner');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(floorBannerTimer);
  floorBannerTimer = setTimeout(() => el.classList.remove('show'), 1400);
}

// ==================== 进入楼层黑场过渡 ====================
let floorFadeTimer = null;
let floorFadeBusy = false;

// 黑场渐隐 → 切层（内部会触发渐现）
function fadeIntoFloor(floorNum) {
  if (floorFadeBusy) return;
  const el = document.getElementById('floor-fade');
  if (!el) { enterFloor(floorNum); return; }
  floorFadeBusy = true;
  clearTimeout(floorFadeTimer);
  el.style.transition = 'opacity 0.18s ease';
  el.style.opacity = '1';
  floorFadeTimer = setTimeout(() => {
    floorFadeBusy = false;
    enterFloor(floorNum);
  }, 200);
}

// 切层完成后的黑场渐现
function playFloorFade() {
  const el = document.getElementById('floor-fade');
  if (!el) return;
  // 先瞬间全黑盖住切层瞬间，再渐现
  el.style.transition = 'none';
  el.style.opacity = '1';
  void el.offsetWidth;
  clearTimeout(floorFadeTimer);
  floorFadeTimer = setTimeout(() => {
    el.style.transition = 'opacity 0.5s ease';
    el.style.opacity = '0';
  }, 80);
}

// ==================== 地面道具说明弹窗 ====================
const TOOLTIP_RANGE = 3;   // 距道具 3 格以内显示
let _tooltipKey = '';
let _tooltipPos = '';
function updateItemTooltip() {
  const el = document.getElementById('item-tooltip');
  if (!el) return;
  const hide = () => {
    if (_tooltipKey === '') return;
    _tooltipKey = '';
    _tooltipPos = '';
    el.classList.remove('show');
  };
  if (!gameStarted || gameOver || (transition && transition.active) || !currentRoomGrid || !itemsOnGround.length) { hide(); return; }

  // 取范围内最近的一个道具
  let best = null, bestDist = 99;
  for (const it of itemsOnGround) {
    const d = Math.max(Math.abs(it.col - player.col), Math.abs(it.row - player.row));
    if (d <= TOOLTIP_RANGE && d < bestDist) { best = it; bestDist = d; }
  }
  if (!best) { hide(); return; }

  const key = `${best.id}:${best.cfgId}`;
  if (key !== _tooltipKey) {
    const cfg = ITEMS_DB[best.cfgId];
    if (!cfg) { hide(); return; }
    const shopSlot = isShopSlotCell(best.col, best.row) ? getShopSlotAt(best.col, best.row) : null;
    const priceLine = shopSlot ? `<div class="tt-price">价格 ${shopSlot.price} 金</div>` : '';
    const ownedLine = canPickupItem(best.cfgId) ? '' : '<div class="tt-desc">（已拥有）</div>';
    el.className = (cfg.quality || 'common') + ' show';
    el.innerHTML = `<div class="tt-name">${cfg.name}</div><div class="tt-desc">${cfg.desc || ''}</div>${priceLine}${ownedLine}`;
    _tooltipKey = key;
  }

  const pp = project(best.px, best.py);
  const pos = `${Math.round(pp.x * DISPLAY_SCALE)},${Math.round(pp.y * DISPLAY_SCALE)}`;
  if (pos !== _tooltipPos) {
    _tooltipPos = pos;
    el.style.left = (pp.x * DISPLAY_SCALE) + 'px';
    el.style.top = (pp.y * DISPLAY_SCALE) + 'px';
  }
}
