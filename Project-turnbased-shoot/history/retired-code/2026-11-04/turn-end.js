// 已退休代码，仅供追溯，不加入模块清单，不独立运行。
function startExecuteQueue() {
  if (turnState.actionQueue.length === 0) return;
  turnState.phase = 'player_execute';
  turnState.execIndex = 0;
  executeNextAction();
}

function executeNextAction() {
  if (turnState.execIndex >= turnState.actionQueue.length) return; // 等待游戏循环检测完成

  const act = turnState.actionQueue[turnState.execIndex];
  if (act.type === 'move') {
    player.facing = act.dir;
    const vec = DIR_VEC[act.dir];
    const nc = player.col + vec.dx, nr = player.row + vec.dy;
    if (isWall(nc, nr)) { turnState.execIndex++; return; }
    // 移动
    player.col = nc; player.row = nr;
    const t = gridToPixel(nc, nr);
    player.targetPx = t.x; player.targetPy = t.y;
    player.animTime = 0;
    // 接触伤害（执行阶段不可回溯，直接结算）
    if (player.invincibleSteps <= 0) {
      const onMonster = monsters.find(m => !m.jumperVanished && isInMonsterFootprint(m, nc, nr) && m.hp > 0);
      if (onMonster) damagePlayer(onMonster.damage || 1);
    }
    if (player.invincibleSteps > 0) player.invincibleSteps--;
  } else if (act.type === 'shoot') {
    player.facing = act.dir;
    player.shootTimer = 0.4;
    spawnBullet(act.dir, player.px, player.py);
    turnState.execIndex++; // 射击即增量 → 等子弹特效结束后处理下一个
  }
}
