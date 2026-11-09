// 这些配置由自定义场注册，使用同一套正式战斗规则，不进入当前随机掉落池。
const WEAPON_TRIAL_ITEMS = {
  dual: ['双管','pattern','同向发射两发，每发造成65%伤害。','Ⅱ'],
  triple: ['三管','pattern','同向发射三发，每发造成50%伤害。','Ⅲ'],
  fork: ['分叉管','pattern','向正前方两侧各45°发射一发。','⋎'],
  trident: ['三叉管','pattern','向正前方及两侧各45°发射一发。','Ψ'],
  twin: ['双头管','pattern','向正前和正后各发射一发。','↔'],
  random: ['随机枪管','pattern','向前射击，并从其余方向中随机选不同方向追加发射。','※'],
  straight: ['普通枪管','trajectory','恢复普通直线射击，覆盖同类发射方式。','→'],
  burstCharge: ['蓄力枪管（连击）','trajectory','前三次射击行动蓄力，第四次额外连射。移动保留蓄力。','≡'],
  heavyCharge: ['蓄力枪管（合体）','trajectory','前三次射击行动蓄力，第四次射出高伤重弹。移动保留蓄力。','⬤'],
  decay: ['能量衰减枪管','trajectory','近距离伤害更高，远距离衰减。','↘'],
  gain: ['能量增幅枪管','trajectory','近距离伤害较低，远距离伤害增加。','↗'],
  bullet: ['实弹枪','body','恢复普通实弹枪体，覆盖同类枪体。','●'],
  shotgun: ['霰弹枪','body','枪体默认射出五发散射弹。另有发射数量道具时，使用该道具的发射方式。','⋰'],
  laser: ['激光枪','body','发射激光，射程增加2格。','━'],
  energy: ['能量光速枪','body','发射能量射线，射程增加2格并穿透怪物。','═'],
  ghost: ['灵体子弹','shell','穿透怪物和阻挡射击的地形，无法穿出房间。','◇'],
  blast: ['爆炸子弹','shell','每发首次命中敌人或障碍时，对相邻的其他敌人造成范围伤害。','✷'],
  splash: ['溅射子弹','shell','每发首次命中后，向命中点两侧各飞出一发短程碎片。','✣'],
  arc: ['电弧子弹','shell','每发首次命中后，在距离2格内的敌人间最多跳跃两次。','ϟ'],
  tracking: ['追踪子弹','shell','若射线左右45°内有无遮挡的目标，子弹转向最近的一条可命中射线。','⌖'],
  fold: ['空间折叠子弹','shell','同一发子弹最多从房间边界绕回一次，继续使用剩余射程。','↻'],
  poison: ['毒性子弹','ammo','命中施毒，接下来3次正常战斗步各造成少量伤害。再次命中刷新。','◈'],
  shield: ['护盾',null,'拾取时获得1点可耗尽的蓝心。','⬟'],
  jet: ['喷气背包',null,'朝单格深坑移动时，可跨到对面的空地。','⤴'],
  boots: ['厚底皮靴',null,'免疫地刺伤害。','▣'],
  echo: ['残影',null,'成功闪避时在原格留下残影。子弹时间内射击，残影从原格同向补射。','◐'],
};
const WEAPON_TRIAL_PREFIX = 'trial_weapon_';
const loadItemCatalog = loadItemDB;
loadItemDB = () => loadItemCatalog('singleStepItems');
function registerWeaponTrialItems() {
  for (const [effect, [name, slot, desc, icon]] of Object.entries(WEAPON_TRIAL_ITEMS)) {
    const id = WEAPON_TRIAL_PREFIX + effect;
    ITEMS_DB[id] = {id, name, desc, icon, quality: 'rare', effects: {}, specials: [], weaponTrial: {effect, slot}};
  }
}
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
  if (trial.effect === 'shield') {
    playerResources.blueHearts += 1;
    updateResourceUI();
    updateUI();
  }
};

const WEAPON_DIRECTIONS = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
function weaponVolley(pattern, body) {
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
  if (body === 'shotgun') return [[0,.55],[-1,.55],[1,.55],[0,.55],[0,.55]];
  return [[0,1]];
}
function weaponShotDamage(base, trajectory, n, range) {
  const progress = (n - 1) / Math.max(1, range - 1);
  if (trajectory === 'decay') return Math.round(base * (1.45 - .9 * progress) * 100) / 100;
  if (trajectory === 'gain') return Math.round(base * (.55 + .9 * progress) * 100) / 100;
  return base;
}
function weaponBlast(col, row, damage, direct) {
  const q = gridToPixel(col,row);
  particles.push({x:q.x,y:q.y,vx:0,vy:0,life:.18,maxLife:.18,size:8,color:'#ffc371'});
  for (const m of [...monsters]) {
    if (m === direct || m.hp <= 0 || m.jumperVanished || !monsters.includes(m)) continue;
    if (monsterCells(m).some(p => Math.abs(p.col-col)+Math.abs(p.row-row)<=1)) damageMonster(m, Math.round(damage * 50) / 100);
  }
}
function weaponFirstTarget(origin, dx, dy, range) {
  for (let n=1;n<=range;n++) {
    const col=origin.col+dx*n,row=origin.row+dy*n;
    if (singleStepBlocksBullet(col,row) || (dx && dy &&
      (singleStepBlocksBullet(col-dx,row) || singleStepBlocksBullet(col,row-dy)))) break;
    if (monsters.some(m => !m.jumperVanished && isInMonsterFootprint(m,col,row))) return n;
  }
  return Infinity;
}
function weaponArc(origin, damage, direct) {
  const visited=new Set([direct.id]);
  let from=origin;
  for (let jump=0;jump<2;jump++) {
    const next=monsters.filter(m=>!visited.has(m.id)&&!m.jumperVanished)
      .map(m=>({m,distance:Math.abs(m.col-from.col)+Math.abs(m.row-from.row)}))
      .filter(p=>p.distance<=2).sort((a,b)=>a.distance-b.distance||a.m.id-b.m.id)[0]?.m;
    if(!next)break;
    visited.add(next.id);
    singleStepVisualShot(from,next,true,{dx:0,dy:0},[next.id],true);
    damageMonster(next,Math.round(damage*50)/100);
    from=next;
  }
}
function weaponShootRay(origin, dx, dy, base, range, trajectory, shell, body, ammo) {
  const ignoresTerrain = shell === 'ghost';
  const pierces = shell === 'pierce' || ignoresTerrain || body === 'energy' || (!shell && player.hasPiercing);
  const hit = new Set();
  let segment = origin, end = origin, col = origin.col, row = origin.row, wrapped = false, exploded = false;
  const beam = body === 'laser' || body === 'energy';
  for (let n = 1; n <= range; n++) {
    const prevCol = col, prevRow = row;
    col += dx; row += dy;
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) {
      if (shell !== 'fold' || wrapped) break;
      singleStepVisualShot(segment,end,true,{dx,dy},[...hit],beam);
      col = (col + COLS) % COLS; row = (row + ROWS) % ROWS;
      segment = {col,row};
      wrapped = true;
    } else if (dx && dy && !ignoresTerrain && (singleStepBlocksBullet(prevCol,row) || singleStepBlocksBullet(col,prevRow))) break;
    end = {col,row};
    const damage = weaponShotDamage(base,trajectory,n,range);
    if (!ignoresTerrain && singleStepBlocksBullet(col,row)) {
      if (tileData[col+','+row]) hitTile(col,row,damage);
      if (shell === 'blast' && !exploded) weaponBlast(col,row,damage,null);
      break;
    }
    const m = monsters.find(unit => !unit.jumperVanished && !hit.has(unit.id) && isInMonsterFootprint(unit,col,row));
    if (!m) continue;
    hit.add(m.id);
    damageMonster(m,damage);
    if (ammo === 'poison' && m.hp > 0 && monsters.includes(m)) {
      m.weaponPoison = {steps:3, firstStep:m.weaponPoison?.firstStep ?? SINGLE_STEP.step+1,
        damage:Math.max(.25,Math.round(damage*.25*100)/100)};
    }
    if (shell === 'blast' && !exploded) { exploded = true; weaponBlast(col,row,damage,m); }
    if (shell === 'splash' && !exploded) {
      exploded = true;
      for (const side of [-1,1]) weaponShootRay(end,-dy*side,dx*side,Math.round(damage*50)/100,2,null,'fragment',null,null);
    }
    if (shell === 'arc' && !exploded) { exploded = true; weaponArc(end,damage,m); }
    if (!pierces) break;
  }
  singleStepVisualShot(segment,end,true,{dx,dy},[...hit],beam);
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
function fireSingleStepWeapon(origin, direction, charge) {
  const pattern = equippedWeaponTrial('pattern'), body = equippedWeaponTrial('body'),
    trajectory = equippedWeaponTrial('trajectory'), shell = equippedWeaponTrial('shell'), ammo = equippedWeaponTrial('ammo');
  const start = WEAPON_DIRECTIONS.findIndex(([dx,dy]) => direction.dx === dx && direction.dy === dy);
  const range = Math.floor(playerStats.range) + (['laser','energy'].includes(body) ? 2 : 0);
  for (let i=0;i<charge.repetitions;i++) for (const [offset, scale] of weaponVolley(pattern,body)) {
    const aim=(start+offset+8)%8;
    let [dx,dy] = WEAPON_DIRECTIONS[aim];
    if(shell==='tracking'){
      let distance=weaponFirstTarget(origin,dx,dy,range);
      for(const side of [-1,1]){
        const [x,y]=WEAPON_DIRECTIONS[(aim+side+8)%8], n=weaponFirstTarget(origin,x,y,range);
        if(n<distance){distance=n;dx=x;dy=y;}
      }
    }
    const damage=playerStats.attack*scale*charge.scale;
    weaponShootRay(origin,dx,dy,scale===1&&charge.scale===1?damage:Math.round(damage*100)/100,range,trajectory,shell,body,ammo);
  }
}
function tickWeaponPoison() {
  for (const m of [...monsters]) {
    const poison = m.weaponPoison;
    if (!poison || SINGLE_STEP.step<poison.firstStep || m.hp <= 0 || m.jumperVanished || !monsters.includes(m)) continue;
    if (--poison.steps === 0) delete m.weaponPoison;
    damageMonster(m,poison.damage);
  }
}
