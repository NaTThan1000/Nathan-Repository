// ==================== 商店系统 ====================

// 楼层价格修正
function applyShopModifier(floorNum, basePrice) {
  const floor = allFloors[floorNum];
  if (!floor || !floor.shopModifier) return basePrice;
  const mod = floor.shopModifier;
  switch (mod.type) {
    case 'none':   return basePrice;
    case 'add':    return basePrice + (mod.value || 0);
    case 'multiply': return Math.round(basePrice * (mod.value || 1));
    case 'halve':  return Math.ceil(basePrice / 2);
    default:       return basePrice;
  }
}

// 为商店房间随机选商品并构造槽位
function rollShopSlots(room, floorNum) {
  if (!room || room.type !== 'shop') return;

  const floor = floorNum || (currentFloor ? currentFloor.floorNum : 1);

  // ——— 道具：用 item_drop_shop_stock 掉落表抽2次不重复 ———
  const pickedItems = [];
  for (let i = 0; i < 2; i++) {
    // 连续抽，最多尝试20次避免死循环
    for (let attempt = 0; attempt < 20; attempt++) {
      const cfgId = rollItem(null, 'item_drop_shop_stock');
      if (cfgId && !pickedItems.includes(cfgId)) {
        pickedItems.push(cfgId);
        break;
      }
    }
    // 如果实在抽不够（道具池太小），跳出
    if (pickedItems.length <= i) break;
  }

  // ——— 资源：用 resource_drop_shop_stock 掉落表抽3次不重复 ———
  const pickedResources = [];
  for (let i = 0; i < 3; i++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const result = rollResourceDrop('resource_drop_shop_stock');
      const cfgId = result.length > 0 ? result[0] : null;
      if (cfgId && !pickedResources.includes(cfgId)) {
        pickedResources.push(cfgId);
        break;
      }
    }
    if (pickedResources.length <= i) break;
  }

  // 构造槽位：道具2个(row=2)，资源3个(row=4)，价格显示在下一行(row+1)
  const slots = [
    { col: 4, row: 2, type: 'item',     cfgId: pickedItems[0],    sold: false, priceCol: 4, priceRow: 3 },
    { col: 8, row: 2, type: 'item',     cfgId: pickedItems[1],    sold: false, priceCol: 8, priceRow: 3 },
    { col: 3, row: 4, type: 'resource', cfgId: pickedResources[0], sold: false, priceCol: 3, priceRow: 5 },
    { col: 6, row: 4, type: 'resource', cfgId: pickedResources[1], sold: false, priceCol: 6, priceRow: 5 },
    { col: 9, row: 4, type: 'resource', cfgId: pickedResources[2], sold: false, priceCol: 9, priceRow: 5 },
  ];

  // 计算每个槽位的最终价格
  for (const slot of slots) {
    if (!slot.cfgId) continue;
    const basePrice = slot.type === 'item'
      ? (ITEMS_DB[slot.cfgId] && ITEMS_DB[slot.cfgId].price != null ? ITEMS_DB[slot.cfgId].price : 15)
      : (RESOURCE_DB[slot.cfgId] && RESOURCE_DB[slot.cfgId].price != null ? RESOURCE_DB[slot.cfgId].price : 5);
    slot.price = applyShopModifier(floor, basePrice);
  }

  room._shopSlots = slots;
}

// 根据槽位生成地面商品实体
function spawnShopGoods(room) {
  if (!room || !room._shopSlots) return;

  for (const slot of room._shopSlots) {
    if (slot.sold) continue;
    if (isWall(slot.col, slot.row)) continue;

    if (slot.type === 'item') {
      spawnItemOnGrid(slot.col, slot.row, slot.cfgId);
    } else {
      spawnResourceOnGrid(slot.col, slot.row, slot.cfgId);
    }
  }
}

// 取商店某格未售出的槽位
function getShopSlotAt(col, row) {
  const room = currentFloor && currentFloor.rooms.find(r => r.id === currentRoomId);
  if (!room || room.type !== 'shop' || !room._shopSlots) return null;
  return room._shopSlots.find(s => s.col === col && s.row === row && !s.sold) || null;
}

// 判断某格是否为商店未售出的商品槽位（商店商品必须购买，禁止被通用拾取逻辑白拿）
function isShopSlotCell(col, row) {
  return !!getShopSlotAt(col, row);
}

// 玩家尝试购买商店商品（移动到时调用）
function tryBuyShopItem(col, row) {
  const room = currentFloor.rooms.find(r => r.id === currentRoomId);
  if (!room || room.type !== 'shop' || !room._shopSlots) return false;

  const slot = room._shopSlots.find(s => s.col === col && s.row === row);
  if (!slot || slot.sold) return false;
  if (slot.type === 'item' && !isEligibleItemDrop(slot.cfgId)) return false;

  // 金币不足 → 静默不购买
  if (playerResources.coins < slot.price) return false;

  // 扣除金币
  playerResources.coins -= slot.price;
  SFX.buy();

  // 获得商品
  if (slot.type === 'item') {
    applyItem(slot.cfgId);
  } else {
    // 资源：模拟一次拾取
    const fakeRes = { cfgId: slot.cfgId, col: col, row: row, px: 0, py: 0 };
    handleResourcePickup(fakeRes);
  }

  // 标记售出，从地面移除商品实体
  slot.sold = true;
  itemsOnGround = itemsOnGround.filter(it => !(it.col === col && it.row === row));
  resourcesOnGround = resourcesOnGround.filter(r => !(r.col === col && r.row === row));
  // 同步到房间持久存储
  if (room._groundItems) room._groundItems = itemsOnGround;
  if (room._groundResources) room._groundResources = resourcesOnGround;

  // 购买后同步属性相关 UI（心形与 AP 上限可能因道具生效而变化）
  turnState.maxMAP = Math.floor(playerStats.moveSpeed);
  turnState.maxAAP = Math.floor(playerStats.fireRate);
  turnState.mAP = Math.min(turnState.mAP, turnState.maxMAP);
  turnState.aAP = Math.min(turnState.aAP, turnState.maxAAP);
  updateItemBar();
  buildHearts(playerStats.maxHp);
  buildBlueHearts();
  buildApDots('ui-aap-row', turnState.maxAAP);
  buildApDots('ui-map-row', turnState.maxMAP);

  updateResourceUI();
  updateUI();
  return true;
}

// 渲染商店价格文字
function drawShopPrices() {
  const room = currentFloor.rooms.find(r => r.id === currentRoomId);
  if (!room || room.type !== 'shop' || !room._shopSlots) return;

  for (const slot of room._shopSlots) {
    const gp = gridToPixel(slot.priceCol, slot.priceRow);
    const pp = project(gp.x, gp.y);
    const cx = Math.round(pp.x), cy = Math.round(pp.y);
    const s = pp.s;

    ctx.save();
    ctx.globalAlpha = 0.85;
    const fontSize = Math.max(3, Math.round(6 * s));
    ctx.font = `bold ${fontSize}px Microsoft YaHei UI`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 已售出：灰色，未售出：金色
    ctx.fillStyle = slot.sold ? '#555555' : '#ffcc44';
    ctx.fillText('$' + slot.price, cx, cy);
    ctx.restore();
  }
}
