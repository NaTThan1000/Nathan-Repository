// ==================== 怪物渲染 ====================
// 怪物平滑动画插值
const MONSTER_ANIM_SPEED = 170; // px/s
function animateMonsters(dt) {
  for (const m of monsters) {
    // 公爵也复用已确定路径的统一动画。
    const waypoint=m._visualPath?.[0];
    const target = waypoint?gridToPixel(waypoint.col,waypoint.row):gridToPixel(m.col, m.row);
    const dx = target.x - m.px, dy = target.y - m.py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) {
      m.px = target.x; m.py = target.y;if(waypoint){m._visualPath.shift();m._visualProgress=(m._visualProgress||0)+1;releaseMovementEvents(m.id,m._visualProgress);}
    } else {
      const step = MONSTER_ANIM_SPEED * dt;
      const r = Math.min(step / dist, 1);
      m.px += dx * r; m.py += dy * r;
    }
  }
}

// 伤害飘字
function updateDamageNumbers(dt) {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const d = damageNumbers[i];
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.life -= dt;
    if (d.life <= 0) damageNumbers.splice(i, 1);
  }
}
function drawDamageNumbers() {
  // 伤害飘字已迁移到 DOM 覆盖层 (updateTextOverlay)，这里保留函数名兼容
}
