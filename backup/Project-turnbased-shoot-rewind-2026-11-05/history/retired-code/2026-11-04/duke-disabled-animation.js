// 原函数已无条件return，后续代码不可达；此文件不加入构建。
function updateDukeAnim(dt) {
  return; // 关键帧已转换为统一视觉路径。
  if (turnState.phase !== 'monster_turn' || monsterGroupPhase !== 'move') return;
  for (const m of monsters) {
    if (m.aiType !== 'boss_duke') continue;
    if (!m._dukeKeyframes || m._dukeKeyframes.length === 0) continue;
    if (m._dukeKeyframeIdx >= m._dukeKeyframes.length) continue;

    const kf = m._dukeKeyframes[m._dukeKeyframeIdx];
    const targetPix = gridToPixel(kf.targetCol, kf.targetRow);
    const sz = m.size || 2;
    // 用 4 格体积中心点计算距离
    const centerTargetX = targetPix.x + CELL * (sz - 1) / 2;
    const centerTargetY = targetPix.y + CELL * (sz - 1) / 2;
    const centerCurX = m.px + CELL * (sz - 1) / 2;
    const centerCurY = m.py + CELL * (sz - 1) / 2;

    const dx = centerTargetX - centerCurX;
    const dy = centerTargetY - centerCurY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      // 按本步实际位置结算碰撞；无法挤出时双方保持原位置。
      for(let dc=0;dc<sz;dc++)for(let dr=0;dr<sz;dr++)noteDangerCell(kf.targetCol+dc,kf.targetRow+dr,m.id,"move");
      const overlaps=player.col>=kf.targetCol&&player.col<kf.targetCol+sz&&player.row>=kf.targetRow&&player.row<kf.targetRow+sz;
      if(overlaps){damagePlayer(m.damage||1,m.id);if(!pushPlayerFromMonster(m,kf.targetCol,kf.targetRow)){
        const old=gridToPixel(m.col,m.row);m.px=old.x;m.py=old.y;m._dukeKeyframes=[];m._dukeKeyframeIdx=0;continue;
      }}
      // 到达当前关键帧 → 更新 col/row 和 px/py
      m.col = kf.targetCol;
      m.row = kf.targetRow;
      m.px = targetPix.x;
      m.py = targetPix.y;

      // 执行浮游眼推移（同步更新 col/row 和 px/py）
      if (kf.pushedFloaters) {
        for (const [fId, newPos] of kf.pushedFloaters) {
          const floater = monsters.find(om => om.id === fId);
          if (floater) {
            floater.col = newPos.col;
            floater.row = newPos.row;
            const fpix = gridToPixel(newPos.col, newPos.row);
            floater.px = fpix.x; floater.py = fpix.y;
          }
        }
      }

      m._dukeKeyframeIdx++;
    } else {
      // 沿对角线方向平滑移动 px/py（只移 px/py，col/row 不变直到到达）
      const step = DUKE_ANIM_SPEED * dt;
      const r = Math.min(step / dist, 1);
      m.px += dx * r;
      m.py += dy * r;
    }
  }
}
