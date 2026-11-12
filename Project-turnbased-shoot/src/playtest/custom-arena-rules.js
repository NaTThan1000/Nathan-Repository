// 切换正式规则与旧版对照，沿用当前场地布置。
function selectArenaAttackRules() {
  stepAttackVariantsEnabled = arenaControl('rules').value === 'interrupt';
  updateStepCombatHelp(stepAttackVariantsEnabled);
  arenaLoad(arena.editing);
}
