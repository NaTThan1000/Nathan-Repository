// 正式版与自定义场共用 Configs/item-db.json 的单步道具池。
const WEAPON_TRIAL_PREFIX = 'trial_weapon_';
const loadItemCatalog = loadItemDB;
loadItemDB = () => loadItemCatalog('singleStepItems');
isEligibleItemDrop = canPickupItem;
const stepTestHooks = {};
function trialPassive(effect) {
  return playerInventory.includes(WEAPON_TRIAL_PREFIX + effect);
}
function equippedWeaponTrial(slot) {
  return playerInventory.map(id => ITEMS_DB[id]?.weaponTrial).find(item => item?.slot === slot)?.effect;
}
const trialApplyItemBase = applyItem;
applyItem = function(cfgId) {
  const trial = ITEMS_DB[cfgId]?.weaponTrial;
  if (!trial) return trialApplyItemBase(cfgId);
  if (playerInventory.includes(cfgId)) return;
  if (trial.slot) playerInventory = playerInventory.filter(id => ITEMS_DB[id]?.weaponTrial?.slot !== trial.slot);
  if (trial.slot === 'trajectory') SINGLE_STEP.weaponCharge = 0;
  trialApplyItemBase(cfgId);
  if (trial.effect === 'shield' && tryAddBlueHeart()) {
    playerResources.blueHearts += 1;
    updateResourceUI();
    updateUI();
  }
};

const WEAPON_DIRECTIONS = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
const SHOTGUN_PELLETS = 20;
const BURST_INTERVAL = 130;
function weaponShotgunRange() {
  return Math.max(1,Math.min(6,Math.floor(playerStats.range*.5)));
}
function weaponVolley(pattern) {
  if (pattern === 'dual') return [[0,.65],[0,.65]];
  if (pattern === 'triple') return [[0,.5],[0,.5],[0,.5]];
  if (pattern === 'fork') return [[-1,1],[1,1]];
  if (pattern === 'trident') return [[0,1],[-1,1],[1,1]];
  if (pattern === 'twin') return [[0,1],[4,1]];
  if (pattern === 'random') {
    const pool = [1,2,3,4,5,6,7], rays = [[0,1]], count = Math.max(1, Math.min(7, 1 + Math.floor(playerStats.luck)));
    for (let i=0;i<count;i++) rays.push([pool.splice(Math.floor(Math.random()*pool.length),1)[0],1]);
    return rays;
  }
  return [[0,1]];
}
function weaponEnergyScale(trajectory, distance, range) {
  const progress = Math.max(0, Math.min(1, (distance - 1) / Math.max(1, range - 1)));
  if (trajectory === 'decay') return 1.45 - .9 * progress;
  if (trajectory === 'gain') return .55 + .9 * progress;
  return 1;
}
function weaponDamageMonster(m, damage, at, lane) {
  const firstNumber = damageNumbers.length, firstEvent = stepVisualEvents.length;
  damageMonster(m, damage, {at,lane});
  for (const number of damageNumbers.slice(firstNumber)) {
    number.showAt = at;
    if (lane) {
      number.x += lane * 3;
      number.vx = lane * 2;
    }
  }
  for (const event of stepVisualEvents.slice(firstEvent)) {
    if (event.type === 'death') {
      event.at = at;
      event.weaponHit = true;
    }
  }
  stepVisualEvents.push({type: 'weapon-hit', id: m.id, at});
}
function weaponDamageTerrain(col, row) {
  const terrain = tileData[col+','+row];
  if (terrain?.type === 'poop') hitTile(col,row,terrain.hp);
}
function weaponBlast(col, row, damage, at, lane, {breakRock=false,hurtPlayer=false}={}) {
  const blocked = new Set();
  const inBlast = p => Math.max(Math.abs(p.col-col), Math.abs(p.row-row)) <= 1 && !blocked.has(p.col+','+p.row);
  stepVisualEvents.push({type: 'blast', col, row, at});
  for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
    const terrain = tileData[(col + dc) + ',' + (row + dr)];
    if (terrain) {
      blocked.add((col+dc)+','+(row+dr));
      if (terrain.type !== 'rock' || breakRock) hitTile(col+dc,row+dr,terrain.hp);
    }
  }
  for (const m of [...monsters]) {
    if (m.hp <= 0 || m.jumperVanished || !monsters.includes(m)) continue;
    if (monsterCells(m).some(inBlast)) {
      weaponDamageMonster(m, damage, at, lane);
    }
  }
  if (hurtPlayer && inBlast(player)) damagePlayer(1);
}
function weaponTrackingDirection(cell, dx, dy, passesTerrain, hit) {
  const forward = WEAPON_DIRECTIONS.findIndex(([x,y]) => x === dx && y === dy);
  // 正交邻格优先，再按与当前方向的夹角排序。
  for (const diagonal of [false,true]) for (const offset of [0,-1,1,-2,2,-3,3,4]) {
    const [x,y] = WEAPON_DIRECTIONS[(forward+offset+8)%8];
    if (Boolean(x && y) !== diagonal) continue;
    const col = cell.col+x, row = cell.row+y;
    if (!passesTerrain && singleStepBlocksBullet(col,row)) continue;
    if (monsters.some(m => m.hp > 0 && !m.jumperVanished && !hit.has(m.id) && isInMonsterFootprint(m,col,row))) {
      return [x,y];
    }
  }
  return [dx,dy];
}
function weaponArcRoute(origin, direct, range) {
  const targets = monsters.filter(m => m !== direct && m.hp > 0 && !m.jumperVanished);
  const terrain = Object.keys(tileData).filter(key => key !== origin.col+','+origin.row).map(key => {
    const [col,row] = key.split(',').map(Number);
    return {col,row,key};
  });
  const nodes = targets.flatMap(m => monsterCells(m).map(cell => ({...cell,m,key:m.id}))).concat(terrain);
  for (let i = nodes.length-1; i > 0; i--) {
    const pick = Math.floor(Math.random()*(i+1));
    [nodes[i],nodes[pick]] = [nodes[pick],nodes[i]];
  }
  const neighbors = new Map(), visited = new Set(), route = [];
  let best = [], bestScore = 0;

  function search(from, hits) {
    const endsOnTerrain = route.length > 0 && !from.m;
    const score = hits*2 + Number(endsOnTerrain);
    if (score > bestScore) {
      bestScore = score;
      best = [...route];
    }
    const remaining = 4-route.length;
    const moreHits = Math.min(remaining,targets.length-hits);
    // 优先命中更多不同怪物；命中数相同时，可以再传到末端障碍。
    const upperBound = (hits+moreHits)*2 + Number(terrain.length > 0 && remaining > moreHits);
    if (!remaining || upperBound <= bestScore) return;
    if (!neighbors.has(from)) {
      neighbors.set(from,nodes.filter(node => Math.abs(node.col-from.col)+Math.abs(node.row-from.row) <= range));
    }
    for (const next of neighbors.get(from)) {
      if (visited.has(next.key)) continue;
      visited.add(next.key);
      route.push(next);
      search(next,hits+Number(!!next.m));
      route.pop();
      visited.delete(next.key);
      if (bestScore >= upperBound) break;
    }
  }
  search(origin,0);
  return best;
}
function weaponArc(origin, damage, direct, at, lane, range) {
  const route = weaponArcRoute(origin,direct,range);
  const arcDamage = Math.round(damage*50)/100;
  let from = origin;
  for (const next of route) {
    singleStepVisualShot(from,next,true,{dx:0,dy:0},{beam:true,start:at});
    if (next.m?.hp > 0) {
      if (tileData[next.col+','+next.row]) weaponDamageTerrain(next.col,next.row);
      else weaponDamageMonster(next.m,arcDamage,at,lane);
    }
    from = next;
  }
  if (route.length && !from.m) weaponDamageTerrain(from.col,from.row);
}
function weaponShootRay(origin, dx, dy, base, range, {
  trajectory, shell, body, ammo, start, lane, size = 1, spreadStep, spreadSide = 0,
}) {
  const ignoresTerrain = shell === 'ghost';
  const passesTerrain = ignoresTerrain || body === 'energy';
  const pierces = shell === 'pierce' || passesTerrain || (!shell && player.hasPiercing);
  const hit = new Set();
  const lob = trajectory === 'lob' && stepTestHooks.lobTarget?.(origin,dx,dy,range);
  const beam = !lob && (body === 'laser' || body === 'energy');
  const forwardDx = dx, forwardDy = dy;
  let segment = origin, cell = origin, at = start, wrapped = false, triggered = false;
  let segmentDistance = 0, distance = 0;
  const emit = (end, impact = true, endDistance = distance) => {
    singleStepVisualShot(segment,end,true,{dx,dy},{
      beam,start,lane,impact,arcHeight:lob ? CELL : 0,
      fromScale:size*weaponEnergyScale(trajectory,segmentDistance,range),
      toScale:size*weaponEnergyScale(trajectory,endDistance,range),
    });
  };
  const trigger = (damage, direct, impactAt = at) => {
    if (triggered) return;
    triggered = true;
    if (shell === 'blast') weaponBlast(cell.col,cell.row,Math.round(damage*150)/100,impactAt,lane,{breakRock:true,hurtPlayer:true});
    if (shell === 'arc') weaponArc(cell,damage,direct,impactAt,lane,range*.5);
    if (shell === 'splash') {
      const pool = [...WEAPON_DIRECTIONS];
      const count = Math.max(1,Math.min(8,1+Math.floor(playerStats.luck)));
      const splashRange = Math.max(1,Math.floor(range*.4));
      for (let i = 0; i < count; i++) {
        const [x,y] = pool.splice(Math.floor(Math.random()*pool.length),1)[0];
        weaponShootRay(cell,x,y,Math.round(damage*50)/100,splashRange,{shell:'fragment',body,start:impactAt,lane,size});
      }
    }
  };
  const burstsOnExpiry = shell === 'blast' || shell === 'splash';
  const damageAt = n => trajectory === 'decay' || trajectory === 'gain'
    ? Math.round(base*weaponEnergyScale(trajectory,n,range)*100)/100 : base;
  const flightRange = lob ? lob.steps : range;
  for (let n = 1; n <= flightRange; n++) {
    let nextDx = dx, nextDy = dy;
    if (!lob && spreadStep !== undefined) {
      const side = n === spreadStep ? spreadSide : 0;
      nextDx = forwardDx-forwardDy*side;
      nextDy = forwardDy+forwardDx*side;
    }
    if (!lob && shell === 'tracking' && n > 1) {
      [nextDx,nextDy] = weaponTrackingDirection(cell,nextDx,nextDy,passesTerrain,hit);
    }
    if (dx !== nextDx || dy !== nextDy) {
      if (distance > segmentDistance) emit(cell,false);
      segment = cell;
      segmentDistance = distance;
      start = at;
      dx = nextDx;
      dy = nextDy;
    }
    const travel = beam ? 0 : Math.hypot(dx,dy) * CELL / CFG.BULLET_SPEED * 1000;
    const damage = damageAt(n);
    let col = cell.col+dx, row = cell.row+dy;
    const wall = col < 0 || col >= COLS || row < 0 || row >= ROWS;
    if (wall) {
      const edge = {col:cell.col+dx/2,row:cell.row+dy/2};
      if (burstsOnExpiry) {
        trigger(damageAt(Math.max(1,distance)),null,at+travel/2);
        emit(edge,false,n-.5);
        return;
      }
      if (shell !== 'fold') break;
      emit(edge,false,n-.5);
      if (wrapped) return;
      col = (col + COLS) % COLS;
      row = (row + ROWS) % ROWS;
      segment = {col:col-dx/2,row:row-dy/2};
      segmentDistance = n-.5;
      start = at+travel/2;
      wrapped = true;
    }
    cell = {col,row};
    distance = n;
    at += travel;
    if (lob && n < flightRange) continue;
    if (!ignoresTerrain && singleStepBlocksBullet(col,row)) {
      if (shell !== 'blast' || triggered) weaponDamageTerrain(col,row);
      trigger(damage,null);
      if (lob || !passesTerrain) {
        emit(cell);
        return;
      }
      continue;
    }
    const m = monsters.find(unit => unit.hp > 0 && !unit.jumperVanished && !hit.has(unit.id) && isInMonsterFootprint(unit,col,row));
    if (!m) continue;
    if (tileData[col+','+row]) {
      weaponDamageTerrain(col,row);
      continue;
    }
    hit.add(m.id);
    weaponDamageMonster(m,damage,at,lane);
    stepTestHooks.onDirectWeaponHit?.(m,at);
    if (ammo === 'poison' && m.hp > 0 && monsters.includes(m)) {
      m.weaponPoison = {steps:3, firstStep:m.weaponPoison?.firstStep ?? SINGLE_STEP.step+1,
        damage:Math.max(.25,Math.round(damage*.25*100)/100), appliedAt:at};
    }
    trigger(damage,m);
    stepTestHooks.onWeaponHit?.(m,cell,{dx,dy,damage,at,lane,ammo});
    if (lob || !pierces) {
      emit(cell);
      return;
    }
  }
  if (burstsOnExpiry && distance) trigger(damageAt(distance),null);
  emit(cell,shell !== 'fold');
}
function weaponPrepareShot() {
  const trajectory = equippedWeaponTrial('trajectory');
  if (trajectory !== 'burstCharge' && trajectory !== 'heavyCharge') return {repetitions:1, scale:1};
  if (SINGLE_STEP.weaponCharge < 3) {
    SINGLE_STEP.weaponCharge++;
    SINGLE_STEP.error='蓄力 '+SINGLE_STEP.weaponCharge+'/3';
    return null;
  }
  SINGLE_STEP.weaponCharge=0;
  return trajectory==='burstCharge' ? {repetitions:3,scale:1} : {repetitions:1,scale:3};
}
function weaponShotgunVolley(origin, {dx,dy}, damage, range, options, start) {
  const pelletDamage = Math.round(damage*(2.75/SHOTGUN_PELLETS)*100)/100;
  for (let pellet = 0; pellet < SHOTGUN_PELLETS; pellet++) {
    weaponShootRay(origin,dx,dy,pelletDamage,range,{
      ...options,size:.3,spreadStep:Math.floor(range/2)+1,spreadSide:Math.floor(Math.random()*3)-1,
      start:start+pellet*2,lane:(pellet%5-2)*1.1,
    });
  }
}
function fireSingleStepWeapon(origin, direction, charge) {
  const pattern = equippedWeaponTrial('pattern'), body = equippedWeaponTrial('body'),
    trajectory = equippedWeaponTrial('trajectory'), shell = equippedWeaponTrial('shell'), ammo = equippedWeaponTrial('ammo');
  const start = WEAPON_DIRECTIONS.findIndex(([dx,dy]) => direction.dx === dx && direction.dy === dy);
  const extraRange = stepTestHooks.rangeBonus?.(trajectory) ?? 0;
  const range = body === 'shotgun' ? Math.min(6,weaponShotgunRange()+extraRange)
    : Math.floor(playerStats.range) + (['laser','energy'].includes(body) ? 2 : 0) + extraRange;
  const firedAt = performance.now();
  const stagger = pattern === 'dual' || pattern === 'triple';
  for (let i=0;i<charge.repetitions;i++) {
    const volleyStart = firedAt+i*BURST_INTERVAL;
    const options = {trajectory,shell,body,ammo};
    if (body === 'shotgun' && !pattern) {
      weaponShotgunVolley(origin,direction,playerStats.attack*charge.scale,range,options,volleyStart);
      continue;
    }
    for (const [index, [offset, scale]] of weaponVolley(pattern).entries()) {
      const aim = (start+offset+8)%8;
      const [dx,dy] = WEAPON_DIRECTIONS[aim];
      const damage = playerStats.attack*scale*charge.scale;
      const lane = stagger ? (index - (pattern === 'dual' ? .5 : 1)) * 4 : 0;
      weaponShootRay(origin,dx,dy,scale===1&&charge.scale===1?damage:Math.round(damage*100)/100,range,
        {...options,start:volleyStart+(stagger ? index*20 : 0),lane});
    }
  }
}
function tickWeaponPoison() {
  for (const m of [...monsters]) {
    const poison = m.weaponPoison;
    if (!poison || SINGLE_STEP.step<poison.firstStep || m.hp <= 0 || m.jumperVanished || !monsters.includes(m)) continue;
    m.weaponPoisonFlashAt = performance.now();
    if (--poison.steps === 0) delete m.weaponPoison;
    damageMonster(m,poison.damage);
  }
}
