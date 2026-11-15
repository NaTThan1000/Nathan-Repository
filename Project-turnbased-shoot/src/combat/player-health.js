// ==================== 血量上限系统 ====================
const MAX_TOTAL_HEARTS = 12;
let shieldCapacity = null;
let runStats = null;
let recordSettlementHistory = () => {};

function newRunStats() {
  return {
    bulletTime:0, interrupts:0, hitsTaken:0, medicalPickups:0, shieldPickups:0,
    keysAcquired:0, keysUsed:0, bombsAcquired:0, bombsUsed:0, coinsPickedUp:0, coinsSpent:0,
  };
}

function recordRunStat(key, amount = 1) {
  if (runStats && !gameOver) runStats[key] += amount;
}
function heartCapacity() {
  return MAX_TOTAL_HEARTS;
}

// 计算当前总心数（红心 + 蓝心，向上取整）
function totalHearts() {
  // 红心是整数，蓝心可能是 0.5，按真实数值统计（不能用 Math.ceil，否则半心会被多算）
  return playerStats.maxHp + (playerResources.blueHearts || 0);
}

// 尝试增加红心上限，可能替换蓝心
function tryAddRedHeart() {
  if (shieldCapacity !== null) return playerStats.maxHp < heartCapacity();
  // 还放得下 1 颗红心 → 直接加
  if (totalHearts() + 1 <= heartCapacity()) return true;
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
  if (shieldCapacity !== null) return playerResources.blueHearts + amount <= shieldCapacity;
  return totalHearts() + amount <= heartCapacity();
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

  const healthBefore = playerStats.hp + playerResources.blueHearts;
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
  if (playerStats.hp + playerResources.blueHearts < healthBefore) recordRunStat('hitsTaken');

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

function renderSettlement(panelId, prefix) {
  const panel = document.getElementById(panelId);
  const values = {kills:monstersKilled, coins:playerResources.coins, bombs:playerResources.bombs,
    keys:playerResources.keys, blue:playerResources.blueHearts};
  for (const [key,value] of Object.entries(values)) document.getElementById(prefix+'-'+key).textContent = value;

  const items = document.getElementById(prefix+'-items');
  const counts = new Map();
  for (const id of itemsCollected) counts.set(id,(counts.get(id) ?? 0)+1);
  items.replaceChildren(...[...counts].map(([id,count]) => {
    const item = ITEMS_DB[id];
    const row = document.createElement('li');
    const icon = document.createElement('span');
    icon.className = 'settlement-item-icon';
    icon.dataset.quality = item?.quality ?? '';
    icon.setAttribute('aria-hidden','true');
    icon.textContent = item?.icon ?? '◇';
    const label = document.createElement('span');
    label.textContent = (item?.name ?? id)+(count>1?' ×'+count:'');
    row.append(icon,label);
    return row;
  }));
  const empty = panel.querySelector('.settlement-items-empty');
  empty.hidden = counts.size > 0;
  items.hidden = counts.size === 0;

  const details = panel.querySelector('.settlement-run-stats');
  details.hidden = !runStats;
  if (!runStats) return;
  const combat = [
    ['子弹时间触发',runStats.bulletTime],['打断',runStats.interrupts],['角色受伤',runStats.hitsTaken],
    ['医疗包拾取',runStats.medicalPickups],['护盾模块拾取',runStats.shieldPickups],
  ];
  const resources = [
    ['钥匙',runStats.keysAcquired+' 次',runStats.keysUsed+' 次'],
    ['炸弹',runStats.bombsAcquired+' 次',runStats.bombsUsed+' 次'],
    ['金币',runStats.coinsPickedUp,runStats.coinsSpent],
  ];
  details.innerHTML = '<dl class="settlement-events">'+combat.map(([label,count]) =>
    '<div><dt>'+label+'</dt><dd>'+count+' 次</dd></div>').join('')+'</dl>'+
    '<table class="settlement-resources"><thead><tr><th scope="col">资源</th><th scope="col">获取</th><th scope="col">使用</th></tr></thead><tbody>'+
    resources.map(([label,acquired,used]) => '<tr><th scope="row">'+label+'</th><td>'+acquired+'</td><td>'+used+'</td></tr>').join('')+
    '</tbody></table>';
}

// ==================== 死亡结算 ====================
function triggerDeathScreen() {
  gameOver = true;
  renderSettlement('death-stats','stat');
  recordSettlementHistory('失败',document.getElementById('death-stats'));
  SFX.death();
  document.getElementById('death-modal').classList.add('show');
}

// ==================== 通关结算 ====================
function triggerVictoryScreen() {
  gameOver = true;
  renderSettlement('victory-stats','vstat');
  recordSettlementHistory('通关',document.getElementById('victory-stats'));
  SFX.victory();
  document.getElementById('victory-modal').classList.add('show');
}
