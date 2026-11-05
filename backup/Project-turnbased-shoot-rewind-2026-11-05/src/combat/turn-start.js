// ==================== 回合AP初始化 ====================
let rewindsRemaining = Infinity;
function resetTurnAP() {
  dangerRevealRemaining = 0; dangerReveal = null; dangerExecutionSeed = null;
  monsterTurnRandom = null; dangerForecastKey = null; dangerForecastJob = null; dangerForecast = null;
  rewindsRemaining = Infinity;
  turnState.maxMAP = Math.floor(playerStats.moveSpeed);
  turnState.maxAAP = Math.floor(playerStats.fireRate);
  turnState.mAP = turnState.maxMAP;
  turnState.aAP = turnState.maxAAP;
  turnState.hasShot = false;
  turnState.phase = 'player_select';
  turnSnapshot = null;
  currentCheckpoint = null;
  turnState.reachableTiles = calcReachableTiles(player.col, player.row, turnState.mAP);
  saveTurnSnapshot();
  saveCheckpoint();  // 小存档点初始 = 大存档点
  // 回合开始检查是否已站在怪物上
  if (player.invincibleSteps <= 0) {
    const onMonster = monsters.find(m => !m.jumperVanished && isInMonsterFootprint(m, player.col, player.row) && m.hp > 0);
    if (onMonster) damagePlayer(onMonster.damage || 1);
  }
  checkSpikeUnderPlayer();   // 回合开始时站在尖刺上也要结算
  updateFlyingEyeExclaim();  // 回合开始时更新浮游眼感叹号
  beginActionHistory();
  updateActionBar();
}
