// ==================== 道具系统 ====================
// 在指定格子生成一个可拾取道具实体
function spawnItemOnGrid(col, row, cfgId) {
  const cfg = ITEMS_DB[cfgId];
  if (!cfg) return null;
  const pix = gridToPixel(col, row);
  const item = {
    id: ++itemIdCounter,
    cfgId: cfg.id,
    name: cfg.name,
    icon: cfg.icon,
    quality: cfg.quality,
    col, row,
    px: pix.x, py: pix.y,
    roomId: currentRoomId, // 绑定生成房间
    liftY: 0,         // 上下浮动动画
    liftDir: 1,
    sparkTimer: Math.random() * Math.PI * 2,
  };
  itemsOnGround.push(item);
  pickupHintTimer = 2.0; // 显示提示
  return item;
}

// ==================== 资源拾取系统 ====================
// 自动拾取玩家脚下的资源 (移动时自动触发)
function autoPickupResources() {
  let pickedAny = false;

  // 先检查脚下是否有商店商品（需要购买）
  const room = currentFloor.rooms.find(r => r.id === currentRoomId);
  if (room && room.type === 'shop' && room._shopSlots) {
    const slot = room._shopSlots.find(s => s.col === player.col && s.row === player.row && !s.sold);
    if (slot) {
      tryBuyShopItem(player.col, player.row);
      return pickedAny; // 购买处理后返回，不管成功与否
    }
  }

  for (let i = resourcesOnGround.length - 1; i >= 0; i--) {
    const res = resourcesOnGround[i];
    if (res.col === player.col && res.row === player.row) {
      const wasPicked = handleResourcePickup(res);
      if (wasPicked) {
        resourcesOnGround.splice(i, 1);
        pickedAny = true;
      }
    }
  }
  return pickedAny;
}

function handleResourcePickup(res) {
  const cfg = RESOURCE_DB[res.cfgId];
  if (!cfg) return false;

  switch (cfg.type) {
    case 'coin': {
      const newTotal = playerResources.coins + cfg.value;
      if (newTotal > (RES_LIMITS.coinMax || 99)) {
        playerResources.coins = RES_LIMITS.coinMax || 99;
      } else {
        playerResources.coins = newTotal;
      }
      break;
    }
    case 'bomb': {
      const newTotal = playerResources.bombs + cfg.amount;
      playerResources.bombs = Math.min(newTotal, RES_LIMITS.bombMax || 99);
      break;
    }
    case 'key': {
      const newTotal = playerResources.keys + cfg.amount;
      playerResources.keys = Math.min(newTotal, RES_LIMITS.keyMax || 99);
      break;
    }
    case 'heart': {
      if (playerStats.hp >= playerStats.maxHp) return false; // 满血不拾取
      const newHp = Math.min(playerStats.hp + cfg.heal, playerStats.maxHp);
      if (newHp === playerStats.hp) return false;
      playerStats.hp = newHp;
      break;
    }
    case 'blue_heart': {
      if (!tryAddBlueHeart(cfg.amount)) return false; // 心数已达上限12，不拾取但不消失
      playerResources.blueHearts += cfg.amount;
      break;
    }
    case 'chest': {
      return openChest(res);
    }
    default: return false;
  }

  // 拾取特效
  spawnPickupEffect(res.px, res.py, cfg.color);
  damageNumbers.push({
    x: res.px, y: res.py - 8,
    text: '+' + cfg.name,
    life: 0.9, maxLife: 0.9,
    vy: -35 - Math.random() * 15,
    vx: 0,
  });

  SFX.pickupRes();
  updateHearts();
  updateResourceUI();
  updateUI();
  return true;
}

function openChest(res) {
  const cfg = RESOURCE_DB[res.cfgId];
  if (!cfg || cfg.type !== 'chest') return false;

  // 上锁宝箱需要钥匙
  if (cfg.locked) {
    if (playerResources.keys <= 0) { SFX.locked(); return false; } // 没钥匙打不开
    playerResources.keys--;
  }
  SFX.chest();

  // === 如果配置了 loot 字段，走统一掉落系统（支持道具+资源混合掉落）===
  if (cfg.loot) {
    rollLoot(cfg.loot, res.col, res.row);
  } else {
    // === 旧逻辑：按 resourceDropTable 纯资源掉落 ===
    const dropIds = rollResourceDrop(cfg.resourceDropTable);
    const room = currentFloor.rooms.find(r => r.id === currentRoomId);

    // 在附近可行走格子生成资源
    for (const rid of dropIds) {
      for (let attempt = 0; attempt < 15; attempt++) {
        const range = 2;
        const c = res.col + Math.floor(Math.random() * (range * 2 + 1)) - range;
        const r = res.row + Math.floor(Math.random() * (range * 2 + 1)) - range;
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS && !isWall(c, r)
          && !resourcesOnGround.some(rr => rr.col === c && rr.row === r)
          && !itemsOnGround.some(it => it.col === c && it.row === r)) {
          spawnResourceOnGrid(c, r, rid);
          break;
        }
      }
    }
  }

  // 开箱特效
  spawnPickupEffect(res.px, res.py, '#ffcc44');
  damageNumbers.push({
    x: res.px, y: res.py - 8,
    text: '开箱!',
    life: 1.0, maxLife: 1.0,
    vy: -45, vx: 0,
  });
  updateResourceUI();
  return true;
}

function spawnPickupEffect(px, py, color) {
  for (let j = 0; j < 6; j++) {
    particles.push({
      x: px, y: py,
      vx: (Math.random() - 0.5) * 70,
      vy: (Math.random() - 0.5) * 70 - 25,
      life: 0.3 + Math.random() * 0.3,
      maxLife: 0.6,
      size: 2 + Math.random() * 2,
      color: color,
    });
  }
}
