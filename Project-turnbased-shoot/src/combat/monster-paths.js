// ==================== 怪物系统辅助 ====================
// 返回占用指定格子的怪物（支持2×2怪物）
// 碰撞挤出辅助：怪物回合使用与预测共用的行动随机数。

// 玩家结束回合仍与怪物重叠时，选择距离怪物轮廓最近的可用格。
let forcedLandingPending=false;
function resolveForcedLanding(){checkSpikeUnderPlayer();autoPickupResources();for(let i=itemsOnGround.length-1;i>=0;i--){const item=itemsOnGround[i];if(item.col===player.col&&item.row===player.row){if(isShopSlotCell(item.col,item.row))tryBuyShopItem(item.col,item.row);else if(!playerInventory.includes(item.cfgId)){applyItem(item.cfgId);itemsOnGround.splice(i,1);updateItemBar();}}}updateUI();}
let pendingPlayerTurnEnd=false;
function getPlayerEndPushCandidates(monster){const q=[{col:player.col,row:player.row,d:0}],seen=new Set([player.col+','+player.row]),out=[];let best=Infinity;for(let i=0;i<q.length;i++){const p=q[i];if(p.d>best)break;const occupied=monsters.some(m=>m.hp>0&&!m.jumperVanished&&isInMonsterFootprint(m,p.col,p.row));const bomb=bombs.some(b=>b.roomId===currentRoomId&&b.col===p.col&&b.row===p.row);if(p.d>0&&!occupied&&!bomb){best=p.d;out.push({col:p.col,row:p.row});continue;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const c=p.col+dx,r=p.row+dy,k=c+','+r;if(isWall(c,r)||seen.has(k)||bombs.some(b=>b.roomId===currentRoomId&&b.col===c&&b.row===r))continue;seen.add(k);q.push({col:c,row:r,d:p.d+1});}}return out;}
function preparePlayerTurnEnd(){
 bullets.length=0;particles.length=0;damageNumbers.length=0;
 const overlap=monsters.find(m=>m.hp>0&&!m.jumperVanished&&isInMonsterFootprint(m,player.col,player.row));
 if(overlap){const options=getPlayerEndPushCandidates(overlap);if(!options.length){showFloorBanner('挤出异常：房间内没有可到达的合法空格，请移动或回溯');return false;}
  const dest=options[Math.floor(Math.random()*options.length)];player.col=dest.col;player.row=dest.row;const pixel=gridToPixel(dest.col,dest.row);player.targetPx=pixel.x;player.targetPy=pixel.y;player.animTime=0;dangerForecastKey=null;dangerForecast=null;dangerForecastJob=null;
 }
 pendingPlayerTurnEnd=true;return true;
}

function getPlayerPushCandidates(m,targetCol,targetRow){
 const size=m.size||1,out=[];
 for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){const col=player.col+dx,row=player.row+dy;
  if(isWall(col,row)||(col>=targetCol&&col<targetCol+size&&row>=targetRow&&row<targetRow+size))continue;
  if(monsters.some(x=>x.id!==m.id&&x.hp>0&&!x.jumperVanished&&isInMonsterFootprint(x,col,row)))continue;
  if(bombs.some(b=>b.col===col&&b.row===row&&b.roomId===currentRoomId))continue;out.push({col,row});
 }return out;
}
function pushPlayerFromMonster(m,col,row){const choices=getPlayerPushCandidates(m,col,row);if(!choices.length)return false;const dest=choices[monsterActionChoiceIndex(choices.map(()=>1))];player.col=dest.col;player.row=dest.row;const p=gridToPixel(dest.col,dest.row);if(movementPlanning)scheduleMovementEvent({type:'push',x:p.x,y:p.y});else{player.targetPx=p.x;player.targetPy=p.y;player.animTime=0;forcedLandingPending=true;}return true;}

function isMonsterAt(col, row, excludeId = -1) {
  return monsters.some(m => {
    if (m.id === excludeId) return false;
    const sz = m.size || 1;
    return col >= m.col && col < m.col + sz && row >= m.row && row < m.row + sz;
  });
}

// 返回指定格子上的怪物对象（支持2×2）
function getMonsterAt(col, row) {
  return monsters.find(m => {
    const sz = m.size || 1;
    return col >= m.col && col < m.col + sz && row >= m.row && row < m.row + sz;
  });
}

// 获取怪物占据的所有格子坐标
function monsterCells(m) {
  const sz = m.size || 1;
  const cells = [];
  for (let dc = 0; dc < sz; dc++)
    for (let dr = 0; dr < sz; dr++)
      cells.push({ col: m.col + dc, row: m.row + dr });
  return cells;
}

// 检查2×2落脚区域是否有效（不能全深坑，单格怪物检查该格是否可行走）
function isValidLandingZone(topLeftCol, topLeftRow, size = 1) {
  let pitCount = 0, totalCells = size * size;
  for (let dc = 0; dc < size; dc++) {
    for (let dr = 0; dr < size; dr++) {
      const c = topLeftCol + dc, r = topLeftRow + dr;
      // 越界
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
      // 墙壁不可落
      if (isWall(c, r)) return false;
      // 统计深坑
      if (currentRoomGrid && currentRoomGrid[c][r] === TILE.PIT) pitCount++;
    }
  }
  // 不能全是深坑
  return pitCount < totalCells;
}

// 根据 action.target.mode 选择大跳落点
function selectLandingTarget(action, m) {
  const targetCfg = (action && action.target) || {};
  const mode = targetCfg.mode || 'cover_player';
  const sz = m.size || 2;
  const pCol = player.col, pRow = player.row;

  if (mode === 'cover_player') {
    // 找到所有包含玩家位置的合法 2×2 方格
    const candidates = [];
    for (let dc = -(sz - 1); dc <= 0; dc++) {
      for (let dr = -(sz - 1); dr <= 0; dr++) {
        const tc = pCol + dc, tr = pRow + dr;
        if (tc >= 0 && tc + sz - 1 < COLS && tr >= 0 && tr + sz - 1 < ROWS) {
          if (isValidLandingZone(tc, tr, sz)) candidates.push({ col: tc, row: tr });
        }
      }
    }
    if (candidates.length === 0) return null;
    return candidates[monsterActionChoiceIndex(candidates.map(()=>1))];
  }

  if (mode === 'nearest_player') {
    // 找全图所有合法落点，选离玩家最近的
    let best = null, bestDist = Infinity;
    for (let c = 0; c <= COLS - sz; c++) {
      for (let r = 0; r <= ROWS - sz; r++) {
        if (!isValidLandingZone(c, r, sz)) continue;
        const cx = c + sz / 2, cy = r + sz / 2;
        const px = pCol + 0.5, py = pRow + 0.5;
        const dist = Math.abs(cx - px) + Math.abs(cy - py); // 曼哈顿距离
        if (dist < bestDist) { bestDist = dist; best = { col: c, row: r }; }
      }
    }
    return best;
  }

  if (mode === 'random_area') {
    // 全图合法落点随机选
    const candidates = [];
    for (let c = 0; c <= COLS - sz; c++) {
      for (let r = 0; r <= ROWS - sz; r++) {
        if (isValidLandingZone(c, r, sz)) candidates.push({ col: c, row: r });
      }
    }
    if (candidates.length === 0) return null;
    return candidates[monsterActionChoiceIndex(candidates.map(()=>1))];
  }

  // 未知 mode，fallback 到 cover_player
  const candidates = [];
  for (let dc = -(sz - 1); dc <= 0; dc++) {
    for (let dr = -(sz - 1); dr <= 0; dr++) {
      const tc = pCol + dc, tr = pRow + dr;
      if (tc >= 0 && tc + sz - 1 < COLS && tr >= 0 && tr + sz - 1 < ROWS) {
        if (isValidLandingZone(tc, tr, sz)) candidates.push({ col: tc, row: tr });
      }
    }
  }
  if (candidates.length === 0) return null;
  return candidates[monsterActionChoiceIndex(candidates.map(()=>1))];
}

// 检查格子是否在怪物占据范围内
function isInMonsterFootprint(m, col, row) {
  const sz = m.size || 1;
  return col >= m.col && col < m.col + sz && row >= m.row && row < m.row + sz;
}

// 根据主方向返回两个对角线方向（供扇形三连射使用）
function getSpreadDirs(cardinalDir) {
  const map = {
    'right': ['up-right', 'down-right'],
    'left':  ['up-left', 'down-left'],
    'down':  ['down-right', 'down-left'],
    'up':    ['up-right', 'up-left'],
  };
  return map[cardinalDir] || [];
}

// 斜向路径终点计算：含对角线间隙障碍物检查
function calcDiagonalPathEnd(col, row, dx, dy, steps) {
  for (let step = 1; step <= steps; step++) {
    const tc = col + dx, tr = row + dy;
    if (isWall(tc, tr)) return { col, row };              // 目标格本身是墙→停在上一步
    if (dx !== 0 && dy !== 0) {
      if (isWall(tc, row)) return { col, row };            // 横向间隙格有障碍→停
      if (isWall(col, tr)) return { col, row };            // 纵向间隙格有障碍→停
    }
    col = tc; row = tr;
  }
  return { col, row };
}

// 检测某方向冲刺能否移动 ≥1 格
function canMoveMin1(col, row, dx, dy, steps) {
  const end = calcDiagonalPathEnd(col, row, dx, dy, steps);
  return !(end.col === col && end.row === row);
}

// 从8个方向中随机选一个能移动 ≥1 格的方向
function randomMovableDir(col, row, steps, exclude) {
  const all = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    { dx: 1, dy: 1 }, { dx: 1, dy: -1 },
    { dx: -1, dy: 1 }, { dx: -1, dy: -1 },
  ];
  const viable = all.filter(d => {
    if (exclude && d.dx === exclude.dx && d.dy === exclude.dy) return false;
    return canMoveMin1(col, row, d.dx, d.dy, steps);
  });
  if (viable.length === 0) return null;
  return viable[Math.floor(Math.random() * viable.length)];
}

// 蓄力魔像方向选择（5步规则）
// 列举冲刺方向；执行和危险预测共用，随机只在调用方选择时发生。
function getChargeDirections(fromCol, fromRow, playerCol, playerRow, chargeDist = 4) {
  const dx = playerCol - fromCol, dy = playerRow - fromRow;
  const all = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:1},{dx:1,dy:-1},{dx:-1,dy:1},{dx:-1,dy:-1}];
  const viable = dirs => dirs.filter(d => canMoveMin1(fromCol, fromRow, d.dx, d.dy, chargeDist));
  if (dx === 0 || dy === 0) {
    const dir = {dx:Math.sign(dx),dy:Math.sign(dy)};
    if (!dir.dx && !dir.dy) return [null];
    return canMoveMin1(fromCol,fromRow,dir.dx,dir.dy,chargeDist) ? [dir] : (viable(all).length ? viable(all) : [null]);
  }
  if (Math.abs(dx) === Math.abs(dy)) {
    const dir = {dx:Math.sign(dx),dy:Math.sign(dy)};
    if (canMoveMin1(fromCol,fromRow,dir.dx,dir.dy,chargeDist)) return [dir];
    const axes = viable([{dx:dir.dx,dy:0},{dx:0,dy:dir.dy}]);
    return axes.length ? axes : (viable(all).length ? viable(all) : [null]);
  }
  const scored = [{dx:Math.sign(dx),dy:0},{dx:0,dy:Math.sign(dy)},{dx:Math.sign(dx),dy:Math.sign(dy)}].map(d => {
    const end = calcDiagonalPathEnd(fromCol,fromRow,d.dx,d.dy,chargeDist);
    return {d, moved:end.col!==fromCol || end.row!==fromRow, dist:(end.col-playerCol)**2+(end.row-playerRow)**2};
  }).sort((a,b)=>a.dist-b.dist);
  const best = scored.find(s=>s.moved);
  return [best ? best.d : null];
}
function pickChargeDir(fromCol, fromRow, playerCol, playerRow, chargeDist = 4) {
  const dirs = getChargeDirections(fromCol,fromRow,playerCol,playerRow,chargeDist);
  return dirs.length === 1 ? dirs[0] : dirs[monsterActionChoiceIndex(dirs.map(()=>1))];
}

// ==================== 浮游眼动态感叹号 ====================
// 在玩家回合中，根据角色与浮游眼的距离实时显示/隐藏感叹号
function updateFlyingEyeExclaim() {
  for (const m of monsters) {
    if (m.hp <= 0 || m.jumperVanished) continue;
    // 仅处理浮游眼类型（actionMode.mode === 'condition' 且有 in_range 条件）
    const cfg = MONSTER_DB[m.cfgId];
    if (!cfg) continue;
    const am = cfg.actionMode;
    if (!am || am.mode !== 'condition') continue;
    // 查找有 in_range 条件的 action
    const inRangeAction = (cfg.actions || []).find(a => a.condition === 'in_range');
    if (!inRangeAction) continue;
    const range = inRangeAction.range ?? 5;
    const dist = Math.max(Math.abs(player.col - m.col), Math.abs(player.row - m.row));
    if (dist <= range) {
      m._showingExclaim = true;
    } else {
      m._showingExclaim = false;
    }
  }
}
