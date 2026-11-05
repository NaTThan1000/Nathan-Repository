// ==================== 血量上限系统 ====================
const MAX_TOTAL_HEARTS = 12;

// 计算当前总心数（红心 + 蓝心，向上取整）
function totalHearts() {
  // 红心是整数，蓝心可能是 0.5，按真实数值统计（不能用 Math.ceil，否则半心会被多算）
  return playerStats.maxHp + (playerResources.blueHearts || 0);
}

// 尝试增加红心上限，可能替换蓝心
function tryAddRedHeart() {
  // 还放得下 1 颗红心 → 直接加
  if (totalHearts() + 1 <= MAX_TOTAL_HEARTS) return true;
  // 已到上限：牺牲 1 颗蓝心换红心（红心优先）
  if (playerResources.blueHearts > 0) {
    playerResources.blueHearts = Math.max(0, playerResources.blueHearts - 1);
    return true;
  }
  // 无蓝心可替换，无法增加
  return false;
}

// 尝试增加蓝心（按数量精确判定是否放得下，红心优先）
function tryAddBlueHeart(amount = 1) {
  return totalHearts() + amount <= MAX_TOTAL_HEARTS;
}

// 站在尖刺格且非无敌 → 掉血并进入无敌状态（无敌期内不重复结算）
function checkSpikeUnderPlayer() {
  if (!currentRoomGrid) return;
  if (player.invincibleSteps > 0) return;
  if (currentRoomGrid[player.col] && currentRoomGrid[player.col][player.row] === TILE.SPIKE) {
    damagePlayer(1);
  }
}

// ==================== 玩家受伤系统 ====================
function noteDangerCell(col, row) {}

function damagePlayer(amount, attackerId = null) {
  if(movementPlanning&&turnState.phase==='monster_turn'&&attackerId!==null){scheduleMovementEvent({type:'hit',amount,attackerId});return;}
  if (player.invincibleSteps > 0) return;
  if (turnState.phase === 'monster_turn' && attackerId !== null) {
    if (monsterTurnHit) return;
    if (attackerId !== lockedThreatId) {
      if (lockedThreatId !== null && monsters.some(m=>m.id===lockedThreatId&&m.hp>0)) {
        if (!pendingMonsterHits.some(h=>h.attackerId===attackerId)) pendingMonsterHits.push({amount,attackerId});
        return;
      }
      promoteMonsterThreat(attackerId);
    }
    monsterTurnHit=true;
    pendingMonsterHits=[];
  }

  if (player.invincibleSteps > 0) return; // 无敌中

  // 优先扣除蓝心
  let remaining = amount;
  if (playerResources.blueHearts > 0) {
    const blueDeduct = Math.min(playerResources.blueHearts, remaining);
    playerResources.blueHearts = Math.max(0, playerResources.blueHearts - remaining);
    remaining -= blueDeduct;
  }

  // 剩余伤害扣除红心
  if (remaining > 0) {
    playerStats.hp = Math.max(0, playerStats.hp - remaining);
  }

  SFX.hurt();
  player.hitFlash = 0.12;
  player.shakeX = (Math.random() - 0.5) * 5;
  player.shakeY = (Math.random() - 0.5) * 4;
  player.invincibleSteps = Math.floor(playerStats.moveSpeed) * 2; // 无敌=移速×2步(向下取整)
  updateHearts();
  updateResourceUI();
  updateUI();

  // 死亡检测
  if (playerStats.hp <= 0) {
    if(!actionHistoryActive())triggerDeathScreen();
  }
}

// ==================== 死亡结算 ====================
function triggerDeathScreen() {
  gameOver = true;
  // 填充统计数据
  document.getElementById('stat-kills').textContent = monstersKilled;
  document.getElementById('stat-items').textContent = itemsCollected.length > 0 ? itemsCollected.join(', ') : '无';
  document.getElementById('stat-coins').textContent = playerResources.coins;
  document.getElementById('stat-bombs').textContent = playerResources.bombs;
  document.getElementById('stat-keys').textContent = playerResources.keys;
  document.getElementById('stat-blue').textContent = playerResources.blueHearts;
  SFX.death();
  document.getElementById('death-modal').classList.add('show');
}

// ==================== 通关结算 ====================
function triggerVictoryScreen() {
  gameOver = true;
  document.getElementById('vstat-kills').textContent = monstersKilled;
  document.getElementById('vstat-items').textContent = itemsCollected.length > 0 ? itemsCollected.join(', ') : '无';
  document.getElementById('vstat-coins').textContent = playerResources.coins;
  document.getElementById('vstat-bombs').textContent = playerResources.bombs;
  document.getElementById('vstat-keys').textContent = playerResources.keys;
  document.getElementById('vstat-blue').textContent = playerResources.blueHearts;
  SFX.victory();
  document.getElementById('victory-modal').classList.add('show');
}
