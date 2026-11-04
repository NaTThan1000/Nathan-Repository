// ==================== 资源UI更新 ====================
function updateResourceUI() {
  const elCoins = document.getElementById('ui-res-coins');
  const elBombs = document.getElementById('ui-res-bombs');
  const elKeys = document.getElementById('ui-res-keys');
  if (elCoins) elCoins.textContent = playerResources.coins;
  if (elBombs) elBombs.textContent = playerResources.bombs;
  if (elKeys) elKeys.textContent = playerResources.keys;
  buildBlueHearts(); // 蓝心接在红心后面
  updatePlayerStatsUI(); // 更新角色属性显示
}

function updatePlayerStatsUI() {
  const elAtk = document.getElementById('ui-stat-atk');
  const elRng = document.getElementById('ui-stat-rng');
  const elLck = document.getElementById('ui-stat-lck');
  if (elAtk) elAtk.textContent = playerStats.attack;
  if (elRng) elRng.textContent = playerStats.range;
  if (elLck) elLck.textContent = playerStats.luck;
}
