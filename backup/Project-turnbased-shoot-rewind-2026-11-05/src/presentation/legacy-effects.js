// --- 交叉剑战斗开始动画 ---
// 阶段: 0→0.4s 两剑从左右飞入旋转 | 0.38→0.45s 碰撞火花 | 0.43→0.55s 渐隐
function drawBattleStartSwords() {
  if (!battleStartAnim.active) return;
  const t = battleStartAnim.timer / battleStartAnim.duration; // 0→1
  const flyT = Math.min(1, t / 0.72);            // 飞入阶段 0→1
  const hitT = Math.max(0, Math.min(1, (t - 0.69) / 0.12)); // 碰撞阶段
  const fadeT = Math.max(0, Math.min(1, (t - 0.78) / 0.22)); // 渐隐阶段
  const alpha = fadeT > 0 ? 1 - fadeT : (flyT < 1 ? 1 : Math.max(0, 1 - (t - 0.72) * 2));
  if (alpha <= 0) return;

  const cx = Math.round(GAME_W / 2), cy = Math.round(GAME_H / 2);

  ctx.save();
  ctx.globalAlpha = alpha;

  // 碰撞火花 (hitT: 0→1)
  if (hitT > 0) {
    const sa = Math.min(1, hitT * 2);
    ctx.globalAlpha = sa;
    // 放射光芒
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const ln = 12 + sa * 20 + Math.sin(t * 30 + i) * 3;
      const color = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#ffcc44' : '#ff6622';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(Math.round(cx + Math.cos(angle) * ln), Math.round(cy + Math.sin(angle) * ln));
      ctx.stroke();
    }
    // 中心爆点
    const br = 2 + sa * 5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, br, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcc44';
    ctx.beginPath(); ctx.arc(cx, cy, br * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha;
  }

  // 画单把剑 (水平指向右边，原点在剑格)
  const drawSwordRaw = (bladeC, hiltC) => {
    // 剑身三角
    ctx.fillStyle = bladeC;
    ctx.beginPath();
    ctx.moveTo(34, 0);           // 剑尖
    ctx.lineTo(4, -3);           // 剑根 上
    ctx.lineTo(4, 3);            // 剑根 下
    ctx.closePath(); ctx.fill();
    // 剑脊高光
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(33, 0); ctx.lineTo(5, 0); ctx.stroke();
    // 剑格
    ctx.strokeStyle = hiltC;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(2, -5); ctx.lineTo(2, 5); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillRect(1, -1, 2, 2);
    // 剑柄
    ctx.strokeStyle = '#665544';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(-18, 0); ctx.stroke();
    ctx.strokeStyle = hiltC;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(-17, 0); ctx.stroke();
    // 剑柄缠绕纹
    ctx.strokeStyle = '#443322';
    ctx.lineWidth = 1;
    for (let w = 0; w < 3; w++) {
      const wx = -4 - w * 5;
      ctx.beginPath(); ctx.moveTo(wx, -2); ctx.lineTo(wx, 2); ctx.stroke();
    }
    // 剑首
    ctx.fillStyle = hiltC;
    ctx.beginPath(); ctx.arc(-18, 0, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-19, -1, 1, 1);
  };

  // 左剑: 从左边飞入, 顺时针旋转, 剑尖朝右(喷入)
  {
    const startX = -25;
    const posX = startX + (cx - startX) * flyT;
    const spin = flyT * Math.PI * 3; // 1.5圈旋转
    ctx.save();
    ctx.translate(posX, cy);
    ctx.rotate(spin);
    drawSwordRaw('#ee5544', '#884433');
    ctx.restore();
  }

  // 右剑: 从右边飞入, 逆时针旋转, 剑尖朝左(需翻转)
  {
    const startX = GAME_W + 25;
    const posX = startX - (startX - cx) * flyT;
    const spin = -flyT * Math.PI * 3; // 反向1.5圈
    ctx.save();
    ctx.translate(posX, cy);
    ctx.rotate(spin - Math.PI); // 多转180度让剑尖朝左
    drawSwordRaw('#eecc44', '#997722');
    ctx.restore();
  }

  ctx.restore();
}

// --- Esc全重置时间倒流动画 ---
function drawRewindEffect() {
  if (!rewindAnim.active) return;
  const t = rewindAnim.timer / rewindAnim.duration; // 0→1
  const alpha = 1 - t; // 淡出
  if (alpha <= 0) { rewindAnim.active = false; return; }

  ctx.save();
  ctx.globalAlpha = alpha * 0.5;

  // 屏幕边缘收缩光圈
  const margin = GAME_W * 0.05 + t * GAME_W * 0.15;
  ctx.strokeStyle = '#aaccff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(margin, margin, GAME_W - margin * 2, GAME_H - margin * 2);
  ctx.stroke();

  // 白色闪光覆盖
  ctx.globalAlpha = alpha * 0.12;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  ctx.restore();
}

// --- 调试渲染 ---
function drawDebugOverlay() {
  if (!debugMode) return;

  const STEP = 10; // 像素网格步长

  ctx.save();

  // --- 像素网格线 (淡色) ---
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.5;
  for (let x = STEP; x < GAME_W; x += STEP) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, GAME_H);
    ctx.stroke();
  }
  for (let y = STEP; y < GAME_H; y += STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(GAME_W, y + 0.5);
    ctx.stroke();
  }

  // --- 坐标数字标注 (每 20px) ---
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = '4px Microsoft YaHei UI';
  ctx.textBaseline = 'top';
  for (let x = 0; x < GAME_W; x += 20) {
    ctx.fillText(x, x + 1, 1);
  }
  for (let y = 20; y < GAME_H; y += 20) {
    ctx.fillText(y, 1, y + 1);
  }

  // --- 鼠标十字线 ---
  if (debugMouseIn && debugMouseX >= 0 && debugMouseX < GAME_W && debugMouseY >= 0 && debugMouseY < GAME_H) {
    const mx = Math.round(debugMouseX);
    const my = Math.round(debugMouseY);

    // 垂直虚线
    ctx.strokeStyle = 'rgba(255,200,80,0.55)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(mx + 0.5, 0);
    ctx.lineTo(mx + 0.5, GAME_H);
    ctx.stroke();

    // 水平虚线
    ctx.beginPath();
    ctx.moveTo(0, my + 0.5);
    ctx.lineTo(GAME_W, my + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // 交叉点小方块
    ctx.fillStyle = '#ffcc44';
    ctx.fillRect(mx - 2, my - 2, 5, 5);
    ctx.fillStyle = '#ff6644';
    ctx.fillRect(mx - 1, my - 1, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx, my, 1, 1);
  }

  ctx.restore();
}
