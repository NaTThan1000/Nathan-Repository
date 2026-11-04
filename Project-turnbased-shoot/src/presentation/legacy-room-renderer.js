// ==================== 渲染系统 ====================

// --- 墙壁 ---
function drawWalls() {
  prect(0, 0, GAME_W, GAME_H, '#1a1815');
  const stones = ['#343028', '#383226', '#302c24', '#362e24', '#3a3228', '#2e2a22'];
  for (let rx = 0; rx < GAME_W; rx += 4) {
    for (let ry = 0; ry < WALL; ry += 4) {
      const ci = (Math.floor(rx / 4) + Math.floor(ry / 4)) % stones.length;
      prect(rx, ry, 4, 4, stones[ci]);
      if (Math.floor(rx / 4) % 3 === 0) prect(rx, ry, 1, 4, '#1a1612');
      if (Math.floor(ry / 4) % 3 === 0) prect(rx, ry, 4, 1, '#1a1612');
    }
  }
  for (let rx = 0; rx < GAME_W; rx += 4) {
    for (let ry = FLOOR_B; ry < GAME_H; ry += 4) {
      const ci = (Math.floor(rx / 4) + Math.floor(ry / 4) + 3) % stones.length;
      prect(rx, ry, 4, 4, stones[ci]);
      if (Math.floor(rx / 4) % 3 === 0) prect(rx, ry, 1, 4, '#1a1612');
      if (Math.floor(ry / 4) % 3 === 0) prect(rx, ry, 4, 1, '#1a1612');
    }
  }
  for (let rx = 0; rx < WALL; rx += 4) {
    for (let ry = 0; ry < GAME_H; ry += 4) {
      const ci = (Math.floor(rx / 4) + Math.floor(ry / 4) + 1) % stones.length;
      prect(rx, ry, 4, 4, stones[ci]);
      if (Math.floor(rx / 4) % 2 === 0) prect(rx, ry, 1, 4, '#1a1612');
      if (Math.floor(ry / 4) % 3 === 0) prect(rx, ry, 4, 1, '#1a1612');
    }
  }
  for (let rx = FLOOR_R; rx < GAME_W; rx += 4) {
    for (let ry = 0; ry < GAME_H; ry += 4) {
      const ci = (Math.floor(rx / 4) + Math.floor(ry / 4) + 2) % stones.length;
      prect(rx, ry, 4, 4, stones[ci]);
      if (Math.floor(rx / 4) % 2 === 0) prect(rx, ry, 1, 4, '#1a1612');
      if (Math.floor(ry / 4) % 3 === 0) prect(rx, ry, 4, 1, '#1a1612');
    }
  }
  const ptTL = project(FLOOR_L, FLOOR_T);
  const ptTR = project(FLOOR_R, FLOOR_T);
  const ptBL = project(FLOOR_L, FLOOR_B);
  const ptBR = project(FLOOR_R, FLOOR_B);
  ctx.strokeStyle = '#5a4d3a'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ptTL.x, ptTL.y); ctx.lineTo(ptTR.x, ptTR.y);
  ctx.lineTo(ptBR.x, ptBR.y); ctx.lineTo(ptBL.x, ptBL.y);
  ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = '#1a1510';
  ctx.strokeRect(FLOOR_L + 1, FLOOR_T + 1, FLOOR_R - FLOOR_L - 2, FLOOR_B - FLOOR_T - 2);
}

// --- 地板 ---
function drawFloor() {
  prect(FLOOR_L, FLOOR_T, FLOOR_R - FLOOR_L, FLOOR_B - FLOOR_T, '#2a2520');
  for (let row = 0; row < ROWS; row++) {
    const yTop = FLOOR_T + row * CELL;
    const yBot = FLOOR_T + (row + 1) * CELL;
    for (let col = 0; col < COLS; col++) {
      const xL = FLOOR_L + col * CELL;
      const xR = FLOOR_L + (col + 1) * CELL;
      const tl = project(xL, yTop); const tr = project(xR, yTop);
      const bl = project(xL, yBot); const br = project(xR, yBot);
      const shade = ((col + row) % 2 === 0) ? '#2e2822' : '#27231e';
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
      ctx.closePath(); ctx.fill();
      const shade2 = ((col + row) % 2 === 0) ? '#322c26' : '#2b2620';
      const inset = 3;
      const itl = project(xL + inset, yTop + inset);
      const itr = project(xR - inset, yTop + inset);
      const ibl = project(xL + inset, yBot - inset);
      const ibr = project(xR - inset, yBot - inset);
      ctx.fillStyle = shade2;
      ctx.beginPath();
      ctx.moveTo(itl.x, itl.y); ctx.lineTo(itr.x, itr.y);
      ctx.lineTo(ibr.x, ibr.y); ctx.lineTo(ibl.x, ibl.y);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.strokeStyle = '#1f1b17'; ctx.lineWidth = 1;
  for (let col = 1; col < COLS; col++) {
    const x = FLOOR_L + col * CELL;
    const ptTop = project(x, FLOOR_T); const ptBot = project(x, FLOOR_B);
    ctx.beginPath(); ctx.moveTo(ptTop.x, ptTop.y); ctx.lineTo(ptBot.x, ptBot.y); ctx.stroke();
  }
  for (let row = 1; row < ROWS; row++) {
    const y = FLOOR_T + row * CELL;
    const ptL = project(FLOOR_L, y); const ptR = project(FLOOR_R, y);
    ctx.beginPath(); ctx.moveTo(ptL.x, ptL.y); ctx.lineTo(ptR.x, ptR.y); ctx.stroke();
  }
  const cornerMark = (wx, wy, dx, dy) => {
    const p = project(wx, wy); const s = p.s;
    const len = Math.round(4 * s);
    prect(p.x + dx, p.y + dy, len, 1, 'rgba(255,200,100,0.6)');
    prect(p.x + dx, p.y + dy, 1, len, 'rgba(255,200,100,0.6)');
  };
  cornerMark(FLOOR_L + 2, FLOOR_T + 2, 0, 0);
  cornerMark(FLOOR_R - 2, FLOOR_T + 2, -4, 0);
  cornerMark(FLOOR_L + 2, FLOOR_B - 2, 0, -4);
  cornerMark(FLOOR_R - 2, FLOOR_B - 2, -4, -4);
}

// --- 网格高亮 ---
function drawGridHighlight() {
  const { col, row } = player;
  const xL = FLOOR_L + col * CELL, xR = FLOOR_L + (col + 1) * CELL;
  const yT = FLOOR_T + row * CELL, yB = FLOOR_T + (row + 1) * CELL;
  const tl = project(xL, yT), tr = project(xR, yT);
  const bl = project(xL, yB), br = project(xR, yB);
  ctx.strokeStyle = 'rgba(255,200,100,0.45)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
  ctx.closePath(); ctx.stroke();
  const s = vpScale((yT + yB) / 2);
  const cSize = Math.max(2, Math.round(3 * s));
  const c = 'rgba(255,200,100,0.6)';
  prect(Math.round(tl.x + 1), Math.round(tl.y + 1), cSize, 1, c);
  prect(Math.round(tl.x + 1), Math.round(tl.y + 1), 1, cSize, c);
  prect(Math.round(tr.x - 1 - cSize), Math.round(tr.y + 1), cSize, 1, c);
  prect(Math.round(tr.x - 1), Math.round(tr.y + 1), 1, cSize, c);
  prect(Math.round(bl.x + 1), Math.round(bl.y - 1 - cSize), cSize, 1, c);
  prect(Math.round(bl.x + 1), Math.round(bl.y - 1), 1, cSize, c);
  prect(Math.round(br.x - 1 - cSize), Math.round(br.y - 1 - cSize), cSize, 1, c);
  prect(Math.round(br.x - 1), Math.round(br.y - 1), 1, cSize, c);
}

// --- 地面移动箭头 (40%透明度) ---

// --- 射击预览 (队列所有射击 + 当前方向选择) ---

// 累加子弹命中结果到 turnState.previewHits

// --- 角色渲染 (通用，支持透明度参数和色彩叠加) ---
function drawCharacterAt(px, py, facing, walkFrame, shootTimer, alpha, tint) {
  if (alpha === undefined) alpha = 1;

  const pp = project(px, py);
  const cx = Math.round(pp.x), cy = Math.round(pp.y);
  const s = pp.s;
  const vec = DIR_VEC[facing];
  const size = Math.round(SPRITE.BASE_SIZE * s);
  const half = Math.floor(size / 2);
  const drawX = cx - half, drawY = cy - half;

  // 阴影
  const shadowW = Math.round(size * 0.7);
  const shadowH = Math.max(1, Math.round(3 * s));
  ctx.save();
  ctx.globalAlpha = alpha * 0.55;
  prect(cx - Math.floor(shadowW / 2), cy + half - 2, shadowW, shadowH, 'rgba(0,0,0,0.55)');
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;

  if (!SPRITE.loaded) {
    prect(cx - half + 1, cy - half + 2, size - 2, size - 4, '#5a8a9e');
    prect(cx - half + 1, cy - half, size - 2, Math.round(size * 0.38), '#7aaab8');
  } else {
    const walkDir = SPRITE.getWalkDir(facing);
    const frames = SPRITE.WALK[walkDir];
    const fi = Math.min(walkFrame, frames.length - 1);
    const [bodyRow, bodyCol] = frames[fi];
    const bodySX = bodyCol * SPRITE.FW;
    const bodySY = bodyRow * SPRITE.FH;

    const headInfo = SPRITE.HEAD[facing];
    const headState = shootTimer > 0 ? 'shooting' : 'normal';
    const [headRow, headCol] = headInfo[headState];
    const headSX = headCol * SPRITE.FW;
    const headSY = headRow * SPRITE.FH;
    const headY = drawY - Math.round(size * 0.30);

    if (SPRITE.needsFlipX(facing)) {
      ctx.save();
      ctx.translate(cx + half, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(SPRITE.img, bodySX, bodySY, SPRITE.FW, SPRITE.FH, 0, drawY, size, size);
      ctx.drawImage(SPRITE.img, headSX, headSY, SPRITE.FW, SPRITE.FH, 0, headY, size, size);
      ctx.restore();
    } else {
      ctx.drawImage(SPRITE.img, bodySX, bodySY, SPRITE.FW, SPRITE.FH, drawX, drawY, size, size);
      ctx.drawImage(SPRITE.img, headSX, headSY, SPRITE.FW, SPRITE.FH, drawX, headY, size, size);
    }
  }

  // 方向三角
  const triSize = Math.max(2, Math.round(3 * s));
  const triDist = Math.round(half * 1.1);
  const tx = cx + vec.dx * triDist;
  const ty = cy + vec.dy * triDist;
  prect(tx, ty, 1, 1, '#ffcc88');
  for (let i = 1; i <= triSize; i++) {
    prect(tx + vec.dx * (-i) + vec.dy * i, ty + vec.dy * (-i) - vec.dx * i, 1, 1, '#ffcc88');
    prect(tx + vec.dx * (-i) - vec.dy * i, ty + vec.dy * (-i) + vec.dx * i, 1, 1, '#ffcc88');
  }

  // 色彩叠加 (怪物类型区分)
  if (tint) {
    prect(drawX, drawY, size, size, tint);
  }

  ctx.restore();
}

// --- 幽灵复制体 (40%透明度) ---

// --- 玩家渲染 ---
function drawPlayer() {
  // 无敌闪烁
  let alpha = 1;
  if (player.invincibleSteps > 0) {
    alpha = 0.3 + 0.35 * Math.sin(performance.now() * 0.015);
  }
  // 抖动偏移
  const sx = player.hitFlash > 0 ? player.shakeX : 0;
  const sy = player.hitFlash > 0 ? player.shakeY : 0;

  if (alpha < 0.05) return; // 闪烁全透明时跳过渲染

  drawCharacterAt(player.px + sx, player.py + sy, player.facing, player.walkFrame, player.shootTimer, alpha);

  // 受击白闪
  if (player.hitFlash > 0 && player.invincibleSteps <= 0) {
    const pp = project(player.px + sx, player.py + sy);
    const s = pp.s;
    const size = Math.round(SPRITE.BASE_SIZE * s);
    const half = Math.floor(size / 2);
    ctx.save();
    ctx.globalAlpha = player.hitFlash * 5;
    prect(Math.round(pp.x) - half, Math.round(pp.y) - half, size, size, '#ffffff');
    ctx.restore();
  }

  // AP 圆点已迁移到 DOM 覆盖层 (updateTextOverlay)
}

// --- 像素风子弹 ---
function drawBullets() {
  for (const b of bullets) {
    if(scrapCoveredBullet(b))continue;
    if (b.phase === 'dying') continue;
    const bp = project(b.x, b.y);
    const bx = Math.round(bp.x), by = Math.round(bp.y + b.vOff);
    const s = bp.s;
    const size = Math.max(1, Math.round(2 * s));
    const isMonster = b.source === 'monster';
    // 怪物子弹：红色系；玩家子弹：黄色系
    const cOuter = isMonster ? 'rgba(255,80,60,0.35)'  : 'rgba(255,200,60,0.35)';
    const cMid   = isMonster ? 'rgba(255,120,80,0.55)' : 'rgba(255,220,100,0.55)';
    const cCore  = isMonster ? '#ff9988'               : '#ffeebb';
    const cTrail = isMonster ? 'rgba(255,90,60,0.5)'   : 'rgba(255,200,80,0.5)';
    const cTrail2= isMonster ? 'rgba(255,70,40,0.3)'   : 'rgba(255,180,60,0.3)';
    prect(bx - size * 2, by - size * 2, size * 4, size * 4, cOuter);
    prect(bx - size, by - size, size * 2, size * 2, cMid);
    prect(bx - Math.floor(size / 2), by - Math.floor(size / 2), size, size, cCore);
    prect(bx - Math.floor(size / 2), by - Math.floor(size / 2), 1, 1, '#ffffff');
    if (b.distTraveled > 2) {
      const tx = bx - b.dirX * Math.round(3 * s);
      const ty = by - b.dirY * Math.round(3 * s);
      prect(tx, ty, 1, 1, cTrail);
      const tx2 = bx - b.dirX * Math.round(5 * s);
      const ty2 = by - b.dirY * Math.round(5 * s);
      prect(tx2, ty2, 1, 1, cTrail2);
    }
  }
}

// --- 地面资源渲染 (使用真实素材图片) ---
let _dbgResDrawCount = 0;
function drawResourcesOnGround() {
  if (resourcesOnGround.length === 0) return;
  if (++_dbgResDrawCount % 60 === 1) {
    console.log('🎨 渲染资源:', resourcesOnGround.length, '个 →', resourcesOnGround.map(r => `${r.cfgId}@(${r.col},${r.row}) color=${r.color} icon=${r.icon}`));
  }

  for (const res of resourcesOnGround) {
    // 用 grid col/row 重算世界坐标再投影，而非依赖可能过期的 px/py
    const gp = gridToPixel(res.col, res.row);
    const pp = project(gp.x, gp.y + res.liftY);
    const cx = Math.round(pp.x), cy = Math.round(pp.y);
    const s = pp.s;
    const imgSize = Math.max(10, Math.round(14 * s));
    const half = Math.round(imgSize / 2);

    const img = RES_IMAGES[res.cfgId];
    const imgReady = img && img.complete && img.naturalWidth > 0;

    ctx.save();

    // 光晕
    const sparkR = 0.5 + 0.5 * Math.sin(res.sparkTimer);
    const glowAlpha = 0.08 + sparkR * 0.1;
    ctx.globalAlpha = glowAlpha;
    ctx.fillStyle = res.color;
    ctx.beginPath(); ctx.arc(cx, cy, imgSize * 1.3, 0, Math.PI * 2); ctx.fill();

    if (imgReady) {
      // 使用真实素材图片
      ctx.globalAlpha = 0.9;
      ctx.drawImage(img, cx - half, cy - half, imgSize, imgSize);
    } else {
      // 回落：彩色方块 + 文字
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = res.color;
      ctx.fillRect(cx - half, cy - half, imgSize, imgSize);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.strokeRect(cx - half, cy - half, imgSize, imgSize);

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      const fontSize = Math.max(4, Math.round(7 * s));
      ctx.font = `${fontSize}px Microsoft YaHei UI`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (res.icon.length <= 2) {
        ctx.fillText(res.icon, cx, cy);
      } else {
        ctx.fillText(res.icon.charAt(0), cx, cy);
      }
    }

    ctx.restore();
  }
}

// --- 炸弹渲染 ---
function drawBombs() {
  if (bombs.length === 0) return;

  for (const bomb of bombs) {
    if (bomb.roomId !== currentRoomId) continue;
    const bp = gridToPixel(bomb.col, bomb.row);
    const pp = project(bp.x, bp.y);
    const cx = Math.round(pp.x), cy = Math.round(pp.y);
    const s = pp.s;
    const size = Math.max(7, Math.round(9 * s));
    const half = Math.round(size / 2);

    ctx.save();

    // 主体 - 深色圆形
    ctx.fillStyle = '#332211';
    ctx.beginPath(); ctx.arc(cx, cy, half, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#665544';
    ctx.lineWidth = Math.max(1, Math.round(1.5 * s));
    ctx.stroke();

    // 引信 (小竖线)
    ctx.strokeStyle = '#cc8844';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx, cy - half - Math.round(3 * s));
    ctx.stroke();

    // 倒计时数字
    const pulse = 1 + 0.15 * Math.sin(bomb.timer * 2 + performance.now() * 0.005);
    ctx.fillStyle = bomb.timer <= 1 ? '#ff2222' : '#ffdd44';
    const fontSize = Math.max(5, Math.round(8 * s * pulse));
    ctx.font = `bold ${fontSize}px Microsoft YaHei UI`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bomb.timer, cx, cy + 1);

    ctx.restore();
  }
}

// --- 像素风粒子 ---
function drawParticles() {
  for (const p of particles) {
    const pp = project(p.x, p.y);
    const alpha = Math.max(0, p.life / p.maxLife);
    const s = pp.s;
    const sz = Math.max(1, Math.round(p.size * alpha * s));
    ctx.globalAlpha = alpha;
    prect(Math.round(pp.x) - sz, Math.round(pp.y) - sz, sz * 2, sz * 2, p.color);
    if (alpha > 0.4) {
      ctx.globalAlpha = alpha * 0.6;
      prect(Math.round(pp.x), Math.round(pp.y), 1, 1,
        p.color === '#ffdd88' ? '#ffffdd' : '#ffddaa');
    }
    ctx.globalAlpha = 1;
  }
}

// --- 地上道具渲染 ---
function drawItemsOnGround() {
  if (itemsOnGround.length === 0) return;

  for (const it of itemsOnGround) {
    const gp = gridToPixel(it.col, it.row);
    const pp = project(gp.x, gp.y + it.liftY);
    const cx = Math.round(pp.x), cy = Math.round(pp.y);
    const s = pp.s;
    const size = Math.max(8, Math.round(12 * s));

    ctx.save();

    // 底部光晕
    const sparkR = 0.5 + 0.5 * Math.sin(it.sparkTimer);
    const isLegendary = it.quality === 'legendary';
    const isRare = it.quality === 'rare';
    const glowColor = isLegendary ? `rgba(255,200,40,${0.15 + sparkR * 0.2})`
                     : isRare ? `rgba(130,180,255,${0.1 + sparkR * 0.15})`
                     : `rgba(180,200,200,${0.08 + sparkR * 0.1})`;
    ctx.globalAlpha = 1;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 2, 0, Math.PI * 2);
    ctx.fill();

    // 底座
    const baseW = Math.round(size * 1.2), baseH = Math.max(2, Math.round(2 * s));
    prect(cx - Math.floor(baseW / 2), cy - baseH, baseW, baseH, '#2a2010');

    // 道具图标 + 边框
    const frameColor = isLegendary ? '#cc8833' : isRare ? '#6688bb' : '#6b5e44';
    const fillColor = isLegendary ? '#3a2a10' : isRare ? '#1a2840' : '#1a1814';

    ctx.fillStyle = fillColor;
    ctx.fillRect(cx - size, cy - size - Math.round(8 * s), size * 2, size * 2 + Math.round(8 * s));
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = Math.max(1, Math.round(2 * s));
    ctx.strokeRect(cx - size, cy - size - Math.round(8 * s), size * 2, size * 2 + Math.round(8 * s));

    // 图标文字
    ctx.fillStyle = '#ffcc44';
    ctx.font = `${Math.max(6, Math.round(7 * s))}px Microsoft YaHei UI`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.icon, cx, cy - Math.round(3 * s));

    // 品质标记 (顶部小三角)
    if (isLegendary) {
      ctx.fillStyle = '#ffcc44';
      ctx.beginPath();
      ctx.moveTo(cx, cy - size - Math.round(10 * s));
      ctx.lineTo(cx - Math.round(4 * s), cy - size - Math.round(6 * s));
      ctx.lineTo(cx + Math.round(4 * s), cy - size - Math.round(6 * s));
      ctx.closePath();
      ctx.fill();
    }

    // 站在商店商品上但金币不足时的提示（普通道具踩上即自动拾取）
    if (it.col === player.col && it.row === player.row) {
      const shopSlot = getShopSlotAt(it.col, it.row);
      if (shopSlot && playerResources.coins < shopSlot.price) {
        const blink = 0.5 + 0.5 * Math.sin(performance.now() * 0.006);
        ctx.globalAlpha = 0.5 + blink * 0.5;
        ctx.fillStyle = '#ee6644';
        ctx.font = `${Math.max(5, Math.round(6 * s))}px Microsoft YaHei UI`;
        ctx.fillText('金币不足', cx, cy - size - Math.round(16 * s));
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  }
}

// --- 瓷砖渲染 (透视投影适配) ---
function cellRect(col,row){
  const xL=FLOOR_L+col*CELL,xR=FLOOR_L+(col+1)*CELL,yT=FLOOR_T+row*CELL,yB=FLOOR_T+(row+1)*CELL;
  const tl=project(xL,yT),tr=project(xR,yT),bl=project(xL,yB),br=project(xR,yB);
  return{cx:(tl.x+tr.x+bl.x+br.x)/4,cy:(tl.y+tr.y+bl.y+br.y)/4,
    w:(tr.x-tl.x+br.x-bl.x)/2,h:(bl.y-tl.y+br.y-tr.y)/2,
    xL:tl.x,yT:tl.y,xR:tr.x,yB:br.y};
}
function drawTiles(){
  if(!currentRoomGrid)return;
  for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){
    const t=currentRoomGrid[c][r];if(t===TILE.FLOOR||t===TILE.ROCK||t===TILE.POOP)continue;
    const cr=cellRect(c,r);const cx=cr.cx,cy=cr.cy,cw=cr.w,ch=cr.h,m=Math.max(1,cw*0.08);
    if(t===TILE.ROCK){
      prect(cx-cw*0.42,cy-ch*0.42,cw*0.84,ch*0.84,'#6b6058');
      prect(cx-cw*0.36,cy-ch*0.44,cw*0.72,ch*0.80,'#7a6e64');
      prect(cx-cw*0.24,cy-ch*0.30,cw*0.48,ch*0.52,'#595048');
      prect(cx-cw*0.14,cy-ch*0.18,cw*0.28,ch*0.28,'#4a423a');
    }else if(t===TILE.POOP){
      prect(cx-cw*0.46,cy-ch*0.46,cw*0.92,ch*0.92,'#8b7355');
      prect(cx-cw*0.42,cy-ch*0.48,cw*0.84,ch*0.88,'#9a8060');
      prect(cx-cw*0.32,cy-ch*0.32,cw*0.64,ch*0.52,'#7a6348');
      prect(cx-cw*0.28,cy-ch*0.38,3,2,'#6b5530');prect(cx+cw*0.12,cy-ch*0.30,4,2,'#6b5530');
    }else if(t===TILE.PIT){
      prect(cx-cw*0.48,cy-ch*0.48,cw*0.96,ch*0.96,'#1a1520');
      prect(cx-cw*0.44,cy-ch*0.44,cw*0.88,ch*0.88,'#120d18');
      prect(cx-cw*0.36,cy-ch*0.36,cw*0.72,ch*0.72,'#0a0610');
    }else if(t===TILE.SPIKE){
      // 统一由正式静态美术层绘制地刺。
    }else if(t===TILE.LADDER){
      prect(cx-cw*0.48,cy-ch*0.48,cw*0.96,ch*0.96,'#1a1520');
      prect(cx-cw*0.44,cy-ch*0.44,cw*0.88,ch*0.88,'#120d18');
      ctx.fillStyle='#6b5a3e';ctx.fillRect(cx-cw*0.20,cy-ch*0.30,3,ch*0.55);
      ctx.fillRect(cx+cw*0.12,cy-ch*0.30,3,ch*0.55);
      for(let ly=cy-ch*0.25;ly<cy+ch*0.32;ly+=4){ctx.fillStyle='#4a3a2e';ctx.fillRect(cx-cw*0.15,ly,cw*0.30,2);}
      ctx.fillStyle='#ffcc44';ctx.font='8px Microsoft YaHei UI';ctx.textAlign='center';ctx.fillText('▼',cx,cy+ch*0.38);
    }
  }
}
function drawDoors(){
  if(!currentRoomGrid || transition)return;
  const room=currentFloor.rooms.find(r=>r.id===currentRoomId);
  if(!room)return;
  for(const dir of['up','down','left','right']){
    if(!room.doors[dir])continue;
    const dp=DOOR_POS[dir];
    const cr=cellRect(dp.col,dp.row);
    const cx=cr.cx,cy=cr.cy,cw=cr.w,ch=cr.h;
    const open=room.doors[dir].open;
    const m=Math.max(1,cw*0.08);

    // 检查目标房间是否上锁
    const targetRoom=currentFloor.rooms.find(r=>r.id===room.doors[dir].targetRoomId);
    const isLocked=targetRoom&&targetRoom.locked;

    // 覆盖原有瓷砖，用地面色打底
    prect(cr.xL,cr.yT,cr.xR-cr.xL,cr.yB-cr.yT,'#2a2520');

    if(dir==='up'||dir==='down'){
      const dw=cw*0.44,dh=ch*0.36;
      const dx=cx-dw/2;
      const dy=dir==='up'?cr.yT-dh*0.20:cy+ch*0.12;
      if(open){
        prect(dx,dy,dw,dh,'#0a0705');
        prect(dx+dw*0.22,dy+dh*0.22,dw*0.56,dh*0.56,'#18120c');
        const borderColor=isLocked?'#ffcc44':'#4a3a28';
        ctx.strokeStyle=borderColor;ctx.lineWidth=isLocked?Math.max(2,m*1.5):m;
        ctx.strokeRect(dx-m*0.5,dy-m*0.5,dw+m,dh+m);
        // 锁标记
        if(isLocked){
          ctx.fillStyle='#ffcc44';ctx.font=`bold ${Math.round(cw*0.4)}px Microsoft YaHei UI`;
          ctx.textAlign='center';ctx.textBaseline='middle';
          ctx.fillText('🔒',cx,dir==='up'?dy+dh*0.5:dy+dh*0.5);
        }
      }else{
        prect(dx,dy,dw,dh,'#5a4a3a');
        for(let i=1;i<4;i++)prect(dx+dw*i/4,dy,Math.max(1,m*0.6),dh,'#332211');
        prect(dx,dy+dh*0.30,dw,Math.max(1,m*0.6),'#332211');
        prect(dx,dy+dh*0.65,dw,Math.max(1,m*0.6),'#332211');
        ctx.strokeStyle='#332211';ctx.lineWidth=m;
        ctx.strokeRect(dx,dy,dw,dh);
      }
    }else{
      const dw=cw*0.36,dh=ch*0.44;
      const dx=dir==='left'?cr.xL-dw*0.20:cx+cw*0.12;
      const dy=cy-dh/2;
      if(open){
        prect(dx,dy,dw,dh,'#0a0705');
        prect(dx+dw*0.22,dy+dh*0.22,dw*0.56,dh*0.56,'#18120c');
        const borderColor=isLocked?'#ffcc44':'#4a3a28';
        ctx.strokeStyle=borderColor;ctx.lineWidth=isLocked?Math.max(2,m*1.5):m;
        ctx.strokeRect(dx-m*0.5,dy-m*0.5,dw+m,dh+m);
        // 锁标记
        if(isLocked){
          ctx.fillStyle='#ffcc44';ctx.font=`bold ${Math.round(cw*0.4)}px Microsoft YaHei UI`;
          ctx.textAlign='center';ctx.textBaseline='middle';
          ctx.fillText('🔒',dir==='left'?dx+dw*0.5:dx+dw*0.5,cy);
        }
      }else{
        prect(dx,dy,dw,dh,'#5a4a3a');
        for(let i=1;i<3;i++)prect(dx,dy+dh*i/3,dw,Math.max(1,m*0.6),'#332211');
        prect(dx+dw*0.35,dy,Math.max(1,m*0.6),dh,'#332211');
        prect(dx+dw*0.60,dy,Math.max(1,m*0.6),dh,'#332211');
        ctx.strokeStyle='#332211';ctx.lineWidth=m;
        ctx.strokeRect(dx,dy,dw,dh);
      }
    }
  }
}

// --- 主渲染 ---
function render() {
  ctx.clearRect(0, 0, GAME_W, GAME_H);
  drawWalls();
  drawFloor();
  drawTiles();
  drawDoors();
  // 移除玩家实际位置的黄色方框。
  if(inCombat)drawReachableOverlay(); // 战斗模式显示可移动范围
  drawDangerOverlay();
  drawActionHistory();
  drawItemsOnGround(); // 地上道具
  drawResourcesOnGround(); // 地上资源
  drawShopPrices(); // 商店价格标签
  drawBombs(); // 炸弹
  drawBullets();
  drawParticles();
  drawMonsters();
  drawPlayer();
  drawDamageNumbers();
  drawBattleStartSwords();  // 战斗开始交叉剑
  drawRewindEffect();       // Esc全重置时间倒流
  drawDebugOverlay();
  drawMinimap(); // 小地图
  updateItemTooltip(); // 地面道具说明弹窗
}
