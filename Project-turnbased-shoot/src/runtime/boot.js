// ==================== 启动 ====================
async function bootGame(){
  // 检测 file:// 协议 — fetch 在 file:// 下被浏览器 CORS 策略阻止
  if (window.location.protocol === 'file:') {
    document.body.innerHTML = `<div style="background:#1a0a0a;color:#e44;font-family:sans-serif;padding:40px;text-align:center;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <h2 style="font-size:24px;">⚠️ 无法直接打开此文件</h2>
      <p style="color:#a88;max-width:500px;line-height:1.6;margin:16px 0;">
        浏览器安全策略阻止了 <code style="background:#333;padding:2px 6px;border-radius:3px;">file://</code> 协议下的数据加载。<br>
        请通过以下任一方式打开：
      </p>
      <ol style="text-align:left;color:#ccc;line-height:1.8;">
        <li>在 IDE 中使用 <b>预览功能</b>（推荐）</li>
        <li>或在项目目录下启动本地服务器：<br>
          <code style="background:#333;padding:3px 8px;border-radius:3px;">npx serve .</code>
          然后访问 <code style="background:#333;padding:3px 8px;border-radius:3px;">http://localhost:3000/Project-turnbased-shoot/dist/turnbased-shoot-demo-pack.html</code></li>
      </ol>
    </div>`;
    return;
  }

  await loadTemplates();
  await loadMonsterDB();    // 加载怪物数据库
  await loadSpawnConfig();  // 加载刷怪配置
  await loadSquadTemplates(); // 加载小队模板
  await loadItemDB();       // 加载道具数据库（含道具定义+品质掉落表）
  await loadResourceDB();   // 加载资源数据库
  await loadOrGenerateFloors(false);
  currentRoomGrid=parseGrid(BUILTIN_TEMPLATES()['open'].tiles);

  const startPos = gridToPixel(player.col, player.row);
  player.px = startPos.x;
  player.py = startPos.y;
  enterFloor(1);
  buildHearts(playerStats.maxHp);
  buildBlueHearts();
  buildApDots('ui-aap-row', turnState.maxAAP);
  buildApDots('ui-map-row', turnState.maxMAP);
  updateItemBar();
  updateUI();
  lastTime = performance.now();

  // 不自动启动游戏循环，先显示开始菜单弹窗
  // 但需要先启动 gameLoop 用于渲染背景
  requestAnimationFrame(gameLoop);
}

// 真正开始游戏（从开始菜单触发）
function startGameFromMenu() {
  gameStarted = true;
  gameOver = false;
  document.getElementById('start-menu-modal').classList.remove('show');
  if (currentFloor) showFloorBanner(`第 ${currentFloor.floorNum} 层`);
  lastTime = performance.now();
  // gameLoop 已经在跑了，这里重置时间基准避免 dt 过大
}

// 显示开始菜单
function showStartMenu() {
  gameStarted = false;
  document.getElementById('start-menu-modal').classList.add('show');
}
