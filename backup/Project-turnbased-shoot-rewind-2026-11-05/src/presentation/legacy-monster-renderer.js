function drawMonsters() {
  for (const m of monsters) {
    if(scrapCoveredMonster(m))continue;
    // 跳跃Boss消失中：渲染残影动画
    if (m.jumperVanished) {
      if (m.jumpAnimTimer > 0 && (m.jumpType === 'vanish' || m.jumpType === 'charge_vanish') && m.jumpFrom) {
        const vanishDur = m.jumpType === 'charge_vanish' ? 0.2 : 0.35;
        const vanishT = 1 - m.jumpAnimTimer / vanishDur; // 0→1 消失进度
        const fromPix = gridToPixel(m.jumpFrom.col, m.jumpFrom.row);
        const centerPx = fromPix.x + CELL * ((m.size || 1) - 1) / 2;
        const centerPy = fromPix.y + CELL * ((m.size || 1) - 1) / 2;
        const pp = project(centerPx, centerPy);
        const scaledSize = Math.round(CELL * (m.size || 1) * pp.s * (1 - vanishT * 0.6));
        const vcx = Math.round(pp.x), vcy = Math.round(pp.y);
        const vhalf = Math.floor(scaledSize / 2);
        ctx.save();
        ctx.globalAlpha = 1 - vanishT; // 渐渐透明
        // 缩小的紫色块
        drawStaticWorldMonster(m,vcx,vcy,scaledSize);
        ctx.restore();
      }
      continue;
    }

    // 蓄力颤抖：大幅随机偏移（±3~4px），每帧刷新
    let shakeOffX = 0, shakeOffY = 0;
    if (m._shaking) {
      shakeOffX = (Math.random() - 0.5) * 7; // ±3.5px
      shakeOffY = (Math.random() - 0.5) * 7;
    }

    // 跳跃动画插值（jumpAnimTimer 从初始值递减到0，progress 0→1）
    let drawPx = m.px, drawPy = m.py;
    let jumpScale = 1.0; // 缩放系数（大跳落地用）
    if (m.jumpAnimTimer > 0 && m.jumpFrom && m.jumpTo) {
      const totalDur = m.jumpType === 'big_land' ? 0.55 : 0.4;
      const t = 1 - m.jumpAnimTimer / totalDur; // progress: 0→1
      const fromPix = gridToPixel(m.jumpFrom.col, m.jumpFrom.row);
      const toPix = gridToPixel(m.jumpTo.col, m.jumpTo.row);

      if (m.jumpType === 'big_land') {
        // 大跳落地：从0.25缩放到1.05再弹回1.0
        const landT = Math.min(1, t * 1.4); // 加速
        jumpScale = 0.25 + 0.8 * (1 - Math.pow(1 - landT, 3)); // ease-out cubic
        if (t > 0.8) jumpScale = 1.0 + 0.1 * Math.sin((t - 0.8) / 0.2 * Math.PI); // 过弹回弹
        drawPx = toPix.x;
        drawPy = toPix.y;
      } else {
        // 小跳跃：弧线效果
        const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out
        const arcY = -25 * Math.sin(t * Math.PI); // 跳跃弧线
        drawPx = fromPix.x + (toPix.x - fromPix.x) * easeT;
        drawPy = fromPix.y + (toPix.y - fromPix.y) * easeT + arcY;
        // 轻微缩放弹跳（跳起时缩小，落地时正常）
        jumpScale = 1.0 + 0.12 * Math.sin(t * Math.PI);
      }
    }

    // 2×2怪物：渲染4格区域底色（从左上角开始）
    const sz = m.size || 1;
    if (sz > 1) {
      const footprintX = drawPx - CELL / 2; // gridToPixel返回格子中心，回到左上角
      const footprintY = drawPy - CELL / 2;
      const tl = project(footprintX, footprintY);
      const br = project(footprintX + CELL * sz, footprintY + CELL * sz);
      const bw = br.x - tl.x, bh = br.y - tl.y;
      // 半透明紫色底色表示占地区域
      ctx.save();
      ctx.globalAlpha = 0.2 + 0.08 * Math.sin(Date.now() / 400);
      prect(Math.round(tl.x), Math.round(tl.y), Math.round(bw), Math.round(bh), 'rgba(70,162,172,0.3)');
      ctx.restore();
    }

    // 大跳落地冲击波环
    if (m.jumpAnimTimer > 0 && m.jumpType === 'big_land' && m.jumpFrom) {
      const totalDur = 0.55;
      const t = 1 - m.jumpAnimTimer / totalDur; // progress: 0→1
      if (t < 0.5) {
        const shockT = t / 0.5;
        const ringR = shockT * CELL * 3; // 扩散半径
        const centerPx = drawPx + CELL * (sz - 1) / 2;
        const centerPy = drawPy + CELL * (sz - 1) / 2;
        const ppRing = project(centerPx, centerPy);
        const rx = Math.round(ppRing.x), ry = Math.round(ppRing.y);
        ctx.save();
        ctx.globalAlpha = 0.5 * (1 - shockT);
        ctx.strokeStyle = '#c060e0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(rx, ry, ringR, 0, Math.PI * 2);
        ctx.stroke();
        // 第二圈
        ctx.globalAlpha = 0.25 * (1 - shockT);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rx, ry, ringR * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    // 血条动画: displayHp 平滑追赶真实 hp
    if (m.displayHp !== m.hp) {
      const diff = m.hp - m.displayHp;
      if (Math.abs(diff) < 0.05) { m.displayHp = m.hp; }
      else { m.displayHp += diff * 0.08; }
    }

    // 抖动偏移 (渐弱)
    if (m.hitFlash > 0) {
      m.shakeX *= 0.85; m.shakeY *= 0.85;
    }

    // 2×2怪物：渲染位置为中心点（gridToPixel返回格子中心，4格中心需偏移 CELL*(sz-1)/2）
    const szRender = m.size || 1;
    const renderPx = szRender > 1 ? drawPx + CELL * (szRender - 1) / 2 : drawPx;
    const renderPy = szRender > 1 ? drawPy + CELL * (szRender - 1) / 2 : drawPy;
    const pp = project(renderPx + m.shakeX + shakeOffX, renderPy + m.shakeY + shakeOffY);
    const cx = Math.round(pp.x), cy = Math.round(pp.y);
    const s = pp.s;
    const baseSize = szRender > 1 ? Math.round(CELL * szRender * s) : Math.round(SPRITE.BASE_SIZE * s * 1.1);
    const size = Math.round(baseSize);
    const half = Math.floor(size / 2);

    // 怪物名已迁移到 DOM 覆盖层 (updateTextOverlay)

    // --- HP 条 ---
    let barW = Math.max(16, Math.round(size * 1.0));
    if (szRender > 1) barW = Math.max(28, Math.round(size * 1.2));
    const barH = Math.max(3, Math.round(5 * s));
    const barY = cy - half - Math.round(9 * s);
    const barX = cx - Math.floor(barW / 2);
    const displayRatio = Math.max(0, m.displayHp / m.maxHp);
    const realRatio = Math.max(0, m.hp / m.maxHp);
    const fillW = Math.max(0, Math.round((barW - 2) * realRatio));
    drawMonsterHealthPreview(m,barX,barY,barW,barH);

    // 阴影
    const shadowW = Math.round(size * 0.9);
    const shadowH = Math.max(1, Math.round(4 * s));
    ctx.save();ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(cx,cy+half,shadowW/2,shadowH/2,0,0,Math.PI*2);ctx.fill();ctx.restore();

    drawStaticWorldMonster(m,cx,cy,size,jumpScale);

    // 白闪覆盖 (受击瞬间)
    if (m.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = m.hitFlash * 4;
      prect(cx - half, cy - half, size, size, '#ffffff');
      ctx.restore();
    }

    // 近战攻击斩击表现
    if (m.meleeFlash > 0) {
      const slashDur = 0.25;
      const slashT = 1 - m.meleeFlash / slashDur; // progress 0→1
      const alpha = 0.85 * (1 - slashT);
      const dd = m.meleeDir || { dx: 0, dy: 1 };
      const angle = Math.atan2(dd.dy, dd.dx);
      const slashDist = half * 0.6 + half * 1.4 * slashT; // 向外扩展
      ctx.save();
      ctx.globalAlpha = alpha;
      for (let i = 0; i < 3; i++) {
        const a = angle + (i - 1) * 0.35; // 三条线微偏角度
        const ex = cx + Math.cos(a) * slashDist;
        const ey = cy + Math.sin(a) * slashDist;
        ctx.strokeStyle = i === 1 ? '#ffffff' : '#ff5533';
        ctx.lineWidth = i === 1 ? Math.max(1.5, Math.round(3.5 * s * (1 - slashT * 0.5)))
                                 : Math.max(1, Math.round(2.5 * s * (1 - slashT * 0.5)));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 射击预览命中效果 (常驻显示, 所有预览阶段)
    if (turnState.phase === 'player_select' || turnState.phase === 'player_shoot_dir') {
      const hit = turnState.previewHits.find(h => h.monster.id === m.id);
      if (hit) {
        // 血条预伤害闪烁 (白色闪烁段)
        const previewW = Math.min(barW - 2, Math.round((barW - 2) * Math.min(1, hit.dmg / m.maxHp)));
        const flashA = 0.3 + 0.2 * Math.sin(monsterFlashTimer * 8);
        ctx.save();
        ctx.globalAlpha = flashA;
        prect(barX + 1 + Math.max(0, fillW - previewW), barY + 1, previewW, barH - 2, '#ffffff');
        ctx.restore();

        // 骷髅头 (致死判定) — 重新设计
        if (hit.lethal) {
          const skFlash = 0.35 + 0.25 * Math.sin(monsterFlashTimer * 6);
          ctx.save();
          ctx.globalAlpha = skFlash;
          const skX = cx - Math.round(10 * s), skY = cy - half - Math.round(18 * s);
          const S = Math.max(1, Math.round(1.5 * s));
          // 颅骨主体 (上宽下窄)
          prect(skX, skY, Math.round(20 * s), Math.round(18 * s), '#e8e8e0');
          prect(skX + S, skY + S, Math.round(18 * s), Math.round(16 * s), '#1a1a1a');
          // 颅骨顶部圆弧 (近似)
          prect(skX + Math.round(3 * s), skY - S, Math.round(14 * s), S, '#e8e8e0');
          // 颧骨 (两侧突出)
          prect(skX - S, skY + Math.round(10 * s), S * 2, Math.round(4 * s), '#e8e8e0');
          prect(skX + Math.round(18 * s), skY + Math.round(10 * s), S * 2, Math.round(4 * s), '#e8e8e0');
          // 眼洞 (大黑洞)
          prect(skX + Math.round(3 * s), skY + Math.round(4 * s), Math.round(5 * s), Math.round(4 * s), '#e8e8e0');
          prect(skX + Math.round(12 * s), skY + Math.round(4 * s), Math.round(5 * s), Math.round(4 * s), '#e8e8e0');
          // 鼻洞
          prect(skX + Math.round(9 * s), skY + Math.round(9 * s), Math.round(2 * s), Math.round(2 * s), '#e8e8e0');
          // 牙齿 (上排)
          for (let t = 0; t < 4; t++) {
            prect(skX + Math.round((3 + t * 4) * s), skY + Math.round(12 * s), Math.round(3 * s), Math.round(3 * s), '#e8e8e0');
          }
          // 下颌骨
          prect(skX + Math.round(4 * s), skY + Math.round(15 * s), Math.round(12 * s), Math.round(2 * s), '#ccc8c0');
          ctx.restore();
        }
      }
    }
  }
}
