// ==================== UI 更新 ====================
function updateActionBar() {
  const bar = document.getElementById('action-bar');
  bar.innerHTML = '';
  if (!inCombat) {
    // 非战斗模式不显示 AP 信息
    bar.innerHTML = '<span class="action-bar-placeholder"></span>';
  } else if (turnState.phase === 'player_select') {
    const lockedTag = turnState.hasShot ? '<span style="color:#ee6644;">[已锁定]</span>' : '<span style="color:#88ccff;">[自由]</span>';
    const bombInfo = bombs.filter(b => b.roomId === currentRoomId).map(b => `💣${b.timer}`).join(' ');
    const bombPart = bombInfo ? `<span style="color:#ff8844;"> ${bombInfo}</span>` : '';
    bar.innerHTML = `<span class="action-bar-placeholder">${lockedTag} MP:${turnState.mAP}/${turnState.maxMAP} AP:${turnState.aAP}/${turnState.maxAAP}${bombPart}</span>`;
  } else {
    bar.innerHTML = '<span class="action-bar-placeholder">-</span>';
  }
}

// 心形图标辅助 — 红心 + 蓝心同一行 (使用真实素材图片)
function buildHearts(maxHp) {
  const row = document.getElementById('ui-hearts-row');
  if (!row) return;
  row.innerHTML = '';
  for (let i = 0; i < Math.ceil(maxHp); i++) {
    const img = document.createElement('img');
    img.className = 'heart-img empty';
    img.dataset.heartType = 'red';
    img.src = RES_IMAGES['ui_heart'].src;
    row.appendChild(img);
  }
  updateHearts();
}

function buildBlueHearts() {
  const row = document.getElementById('ui-hearts-row');
  if (!row) return;
  row.querySelectorAll('.heart-img[data-heart-type="blue"]').forEach(e => e.remove());
  const count = Math.ceil(playerResources.blueHearts);
  for (let i = 0; i < Math.max(0, count); i++) {
    const img = document.createElement('img');
    img.className = 'heart-img empty';
    img.dataset.heartType = 'blue';
    img.src = RES_IMAGES['ui_blue_heart'].src;
    row.appendChild(img);
  }
  updateHearts();
}

function updateHearts() {
  const hp = playerStats.hp;
  const bh = playerResources.blueHearts;
  let redIdx = 0, blueIdx = 0;

  const allHearts = document.querySelectorAll('#ui-hearts-row .heart-img');
  for (const img of allHearts) {
    const isBlue = img.dataset.heartType === 'blue';

    if (isBlue) {
      if (bh >= blueIdx + 1) {
        img.className = 'heart-img';
        img.src = RES_IMAGES['ui_blue_heart'].src;
      } else if (bh >= blueIdx + 0.5) {
        img.className = 'heart-img';
        img.src = RES_IMAGES['ui_half_blue_heart'].src;
      } else {
        img.className = 'heart-img empty';
        img.src = RES_IMAGES['ui_blue_heart'].src;
      }
      blueIdx++;
    } else {
      if (hp >= redIdx + 1) {
        img.className = 'heart-img';
        img.src = RES_IMAGES['ui_heart'].src;
      } else if (hp >= redIdx + 0.5) {
        img.className = 'heart-img';
        img.src = RES_IMAGES['ui_half_heart'].src;
      } else {
        img.className = 'heart-img empty';
        img.src = RES_IMAGES['ui_heart'].src;
      }
      redIdx++;
    }
  }
}

// AP 圆点辅助 — 左上角紧凑版
function buildApDots(rowId, max) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const d = document.createElement('div');
    d.className = 'ap-dot-compact empty';
    row.appendChild(d);
  }
}
function updateApDots(rowId, current, max, type) {
  const dots = document.querySelectorAll(`#${rowId} .ap-dot-compact`);
  dots.forEach((d, i) => {
    d.classList.remove('full-aap', 'full-map', 'empty');
    if (i < current) {
      d.classList.add(type === 'aap' ? 'full-aap' : 'full-map');
    } else {
      d.classList.add('empty');
    }
  });
}

function updateUI() {
  // 回合数
  document.getElementById('ui-turn').textContent = turnState.turnNumber;

  // 阶段
  const phaseEl = document.getElementById('ui-phase');
  phaseEl.className = 'pill-value';
  const rewindInfo = document.getElementById('ui-rewind-info');
  rewindInfo.textContent = `回溯 ${rewindsRemaining}/2${turnState.phase === 'player_select' && dangerForecastJob && !dangerForecastJob.done ? ' · 计算中' : ''}`;
  switch (turnState.phase) {
    case 'player_select':
      phaseEl.textContent = '行为选择';
      phaseEl.classList.add('phase-player');
      break;
    case 'monster_turn':     phaseEl.textContent = '怪物行动'; phaseEl.classList.add('phase-monster'); break;
  }

  // 资源UI
  updateResourceUI();

  // HP 心形
  updateHearts();

  // AP 圆点（始终在左上角显示）
  updateApDots('ui-aap-row', turnState.aAP, turnState.maxAAP, 'aap');
  updateApDots('ui-map-row', turnState.mAP, turnState.maxMAP, 'map');

  // 更新属性显示 (已移至顶部资源栏)
  const elAtk = document.getElementById('ui-attack');
  const elRng = document.getElementById('ui-range');
  if (elAtk) elAtk.textContent = playerStats.attack;
  if (elRng) elRng.textContent = playerStats.range;
}

// ==================== DOM 文字覆盖层（绕过 Canvas pixelated 缩放） ====================
function updateTextOverlay() {
  const overlay = document.getElementById('text-overlay');
  if (!overlay) return;

  // --- 怪物名称 ---
  let nameIdx = 0;
  const existingNames = overlay.querySelectorAll('.txt-monster-name');
  for (const m of monsters) {
    if (m.hp <= 0 || m.jumperVanished) continue;
    const sz = m.size || 1;
    // gridToPixel返回格子中心，4格区域中心需偏移 CELL*(sz-1)/2
    const centerPx = sz > 1 ? m.px + CELL * (sz - 1) / 2 : m.px;
    const centerPy = sz > 1 ? m.py + CELL * (sz - 1) / 2 : m.py;
    const pp = project(centerPx, centerPy);
    const sx = Math.round(pp.x * DISPLAY_SCALE);
    const cy2 = Math.round(pp.y * DISPLAY_SCALE);
    const half = Math.round(SPRITE.BASE_SIZE * pp.s * DISPLAY_SCALE / 2);
    const sy = cy2 - half - 12;

    let el = existingNames[nameIdx];
    if (!el) { el = document.createElement('div'); el.className = 'txt-monster-name'; overlay.appendChild(el); }
    if (m.aiType === 'boss_chase' || m.aiType === 'boss_jumper' || m.aiType === 'boss_duke') { el.className = 'txt-monster-name boss'; } else { el.className = 'txt-monster-name'; }
    el.textContent = m.name;
    el.style.left = sx + 'px';
    el.style.top = sy + 'px';
    el.style.display = '';
    nameIdx++;
  }
  for (let i = nameIdx; i < existingNames.length; i++) existingNames[i].style.display = 'none';

  // --- 蓄力感叹号 ---
  let exclaimIdx = 0;
  const existingExclaims = overlay.querySelectorAll('.txt-exclaim');
  for (const m of monsters) {
    if (m.hp <= 0 || m.jumperVanished || m.id!==currentThreatId()||scrapCoveredMonster(m)) continue;
    const sz = m.size || 1;
    const centerPx = sz > 1 ? m.px + CELL * (sz - 1) / 2 : m.px;
    const centerPy = sz > 1 ? m.py + CELL * (sz - 1) / 2 : m.py;
    const pp = project(centerPx, centerPy);
    const sx = Math.round(pp.x * DISPLAY_SCALE);
    const cy2 = Math.round(pp.y * DISPLAY_SCALE);
    const half = Math.round(SPRITE.BASE_SIZE * pp.s * DISPLAY_SCALE / 2);
    const sy = cy2 - half - 48;

    let el = existingExclaims[exclaimIdx];
    if (!el) { el = document.createElement('div'); el.className = 'txt-exclaim'; overlay.appendChild(el); }
    el.className = 'txt-exclaim';
    el.textContent = '!';
    el.style.left = sx + 'px';
    el.style.top = sy + 'px';
    el.style.display = '';
    exclaimIdx++;
  }
  for (let i = exclaimIdx; i < existingExclaims.length; i++) existingExclaims[i].style.display = 'none';

  // --- 伤害飘字 ---
  let dmgIdx = 0;
  const existingDmgs = overlay.querySelectorAll('.txt-damage');
  for (const d of damageNumbers) {
    const pp = project(d.x, d.y);
    const alpha = Math.max(0, d.life / d.maxLife);
    const sx = Math.round(pp.x * DISPLAY_SCALE);
    const sy = Math.round(pp.y * DISPLAY_SCALE);

    let el = existingDmgs[dmgIdx];
    if (!el) { el = document.createElement('div'); el.className = 'txt-damage'; overlay.appendChild(el); }
    el.textContent = d.text;
    el.style.left = sx + 'px';
    el.style.top = sy + 'px';
    el.style.opacity = alpha;
    el.style.display = '';
    dmgIdx++;
  }
  for (let i = dmgIdx; i < existingDmgs.length; i++) existingDmgs[i].style.display = 'none';

  // --- AP 圆点 (角色右上角，仅战斗模式) ---
  const aapEl = overlay.querySelector('.txt-aap') || (() => { const e = document.createElement('div'); e.className = 'txt-aap'; overlay.appendChild(e); return e; })();
  if (inCombat && turnState.phase === 'player_select') {
    const pp = project(player.px, player.py);
    const sx = Math.round(pp.x * DISPLAY_SCALE + SPRITE.BASE_SIZE * pp.s * DISPLAY_SCALE * 0.45);
    const sy = Math.round(pp.y * DISPLAY_SCALE - SPRITE.BASE_SIZE * pp.s * DISPLAY_SCALE * 0.5);
    aapEl.style.left = sx + 'px';
    aapEl.style.top = sy + 'px';
    aapEl.style.display = '';
    if (turnState.aAP > 0) {
      aapEl.className = 'txt-aap';
      aapEl.textContent = turnState.aAP;
    } else {
      aapEl.className = 'txt-aap empty';
      aapEl.textContent = '';
    }
  } else {
    aapEl.style.display = 'none';
  }
}

function updateItemBar() {
  const bar = document.getElementById('item-bar');
  const empty = document.getElementById('item-bar-empty');
  if (playerInventory.length === 0) {
    if (empty) empty.style.display = 'inline';
    // 移除旧的道具槽
    bar.querySelectorAll('.item-slot').forEach(el => el.remove());
    return;
  }
  if (empty) empty.style.display = 'none';

  // 重建道具槽
  bar.querySelectorAll('.item-slot').forEach(el => el.remove());

  for (const cfgId of playerInventory) {
    const cfg = ITEMS_DB[cfgId];
    if (!cfg) continue;
    const slot = document.createElement('span');
    slot.className = 'item-slot ' + cfg.quality;
    slot.textContent = cfg.icon;
    const tooltip = document.createElement('span');
    tooltip.className = 'item-tooltip';
    tooltip.textContent = cfg.name + ': ' + cfg.desc;
    slot.appendChild(tooltip);
    bar.appendChild(slot);
  }
}
