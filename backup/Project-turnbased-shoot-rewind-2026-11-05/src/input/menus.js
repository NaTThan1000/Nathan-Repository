// ==================== 操作弹窗 ====================
document.getElementById('help-btn').addEventListener('click', () => {
  document.getElementById('help-modal').classList.add('open');
});
document.getElementById('help-close').addEventListener('click', () => {
  document.getElementById('help-modal').classList.remove('open');
});
// 点击弹窗外区域也关闭
document.getElementById('help-modal').addEventListener('click', (e) => {
  if (e.target.id === 'help-modal') {
    document.getElementById('help-modal').classList.remove('open');
  }
});

// ==================== 游戏菜单弹窗事件 ====================
// 开始游戏按钮
document.getElementById('btn-start-game').addEventListener('click', () => {
  startGameFromMenu();
});

// 死亡重试按钮
document.getElementById('btn-retry-death').addEventListener('click', () => {
  resetGameToFloor1();
  document.getElementById('death-modal').classList.remove('show');
  showStartMenu();
});

// 通关重试按钮
document.getElementById('btn-retry-victory').addEventListener('click', () => {
  resetGameToFloor1();
  document.getElementById('victory-modal').classList.remove('show');
  showStartMenu();
});

console.log('⚔ Turnbased Shoot — 道具+资源系统 已就绪');
console.log('  WASD = 移动  |  ↑↓←→ = 射击  |  Space = 结束回合  |  Esc = 全重置');
console.log('  E = 放置炸弹  |  道具与资源踩上自动拾取（商店金币足够时自动购买）');
console.log(`  房间: ${COLS}×${ROWS} 格子  |  射程: ${CFG.BULLET_MAX_DIST} 格`);
console.log(`  道具库: ${ITEM_POOL_ALL.length} 个被动道具 (${ITEM_POOL_COMMON.length}C/${ITEM_POOL_RARE.length}R/${ITEM_POOL_LEGENDARY.length}L)`);
console.log(`  资源库: ${Object.keys(RESOURCE_DB).length} 种资源 (金币/炸弹/红心/蓝心/宝箱/钥匙)`);
console.log(`  AP=${playerStats.fireRate}  MP=${playerStats.moveSpeed}  HP=${playerStats.hp}/${playerStats.maxHp}`);
