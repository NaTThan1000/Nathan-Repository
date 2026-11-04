// ==================== 空格执行系统 ====================

// ==================== 回合结束 ====================
function finishPlayerTurn() {
  bullets = [];
  particles = [];
  damageNumbers = [];
  turnState.phase = 'monster_turn';
  document.getElementById('action-bar').innerHTML = '<span class="action-bar-placeholder">-</span>';
  // 未消耗的MP计入无敌步数消耗
  if (player.invincibleSteps > 0 && turnState.mAP > 0) {
    player.invincibleSteps = Math.max(0, player.invincibleSteps - turnState.mAP);
  }
  startMonsterTurn();
  updateUI();
}
