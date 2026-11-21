// Boss 预设使用单步调度、武器与结算。自由布置的数据单独保存。
let arenaBossEncounter = null;
let arenaBossFlash = [];

const arenaBossUnits = {
  turret: {name:'扫射炮台', hp:24, color:'#489dce', symbol:'炮'},
  ram: {name:'破障重机', hp:30, color:'#e38a46', symbol:'冲'},
  guard: {name:'逃生门封锁者', hp:36, color:'#678dcf', symbol:'守'},
  switch: {name:'门锁', hp:4, color:'#54cda5', symbol:'锁', optional:true},
  interceptor: {name:'拦截机', hp:32, color:'#dcb24f', symbol:'截'},
  core: {name:'战车核心', hp:28, color:'#bc83ec', symbol:'核'},
  cannon: {name:'战车主炮', hp:12, color:'#dc7459', symbol:'炮', optional:true},
  drive: {name:'战车驱动', hp:12, color:'#87c267', symbol:'驱', optional:true},
  layer: {name:'布雷指挥机', hp:36, color:'#cf9a4b', symbol:'雷'},
  mine: {name:'定时地雷', hp:4, color:'#ef8056', symbol:'爆', optional:true},
  gunner: {name:'联防炮手', hp:22, color:'#4ca9d0', symbol:'射'},
  hunter: {name:'联防追击机', hp:24, color:'#d46e70', symbol:'追'},
};

const arenaBossPresets = {
  jumper: {
    name:'跳跃巨兽', start:{col:2,row:3}, enemies:[['boss_jumper_i',8,3]],
    help:'2×2 跳跃巨兽：小跳、随机落弹与消失砸地按权重选择，整套行动结束后重选。小跳黄格不可打断；砸地有虚线与实线两段预告。R 重试。',
  },
  fly: {
    name:'飞行巨兽', start:{col:2,row:3}, enemies:[['duke_fly',8,3]],
    help:'2×2 飞行巨兽：每套行动结束后按权重选定下一行动，选定后不随玩家移动改变。选中移动才显示红色路径；黄招仅紧邻 Boss 的两格可打断。R 重试。',
  },
  turret: {
    name:'扫射炮台', start:{col:5,row:4}, enemies:[['turret',8,3]],
    help:'扫射后炮台侧口打开。试着躲到与炮台同一行或列，利用恢复回合开枪。青色「开」表示伤害翻倍。',
  },
  ram: {
    name:'破障重机', start:{col:4,row:3}, enemies:[['ram',8,3]],
    rocks:[[2,3],[10,3],[6,0],[6,6]],
    help:'重机朝你所在的方向锁定冲锋。侧移让它撞碎掩体，撞击后核心暴露。也可以绕开保留掩体。',
  },
  escape: {
    name:'逃生门封锁者', start:{col:2,row:3},
    enemies:[['guard',8,3],['switch',5,1],['switch',8,5]],
    rocks:[[5,2],[5,4],[9,2],[9,4]], exit:{col:11,row:3},
    help:'打碎两枚绿色门锁，走到右侧「出口」格即可撤离。也可以直接击毁封锁者。',
  },
  interceptor: {
    name:'拦截机', start:{col:4,row:3}, enemies:[['interceptor',8,3]],
    help:'黄招可以用普通射击打断。红招要走位躲开，躲掉本来会命中的红招可触发子弹时间。两种起手交替出现。',
  },
  tank: {
    name:'模块化战车', start:{col:3,row:3}, enemies:[['core',7,3],['cannon',5,3],['drive',7,5]],
    items:[['single_step_pierce',3,2],['trial_weapon_shotgun',3,4]],
    help:'拆掉主炮就能永久消除它的扫射，拆掉驱动能让核心无法移动。击毁核心即胜利。起点两侧可拾穿透弹和霰弹枪。',
  },
  mines: {
    name:'布雷指挥机', start:{col:3,row:3}, enemies:[['layer',8,3]], rocks:[[6,1],[6,5]], bombs:2,
    help:'橙色菱形标出将布雷的位置。地雷出现后预告九宫格爆炸，可以开枪排雷、先撤离，或冒险继续打首领。',
  },
  duo: {
    name:'双机联防', start:{col:4,row:3}, enemies:[['gunner',9,5],['hunter',6,2]],
    rocks:[[4,1],[8,5],[8,1]],
    help:'炮手先扫射，追击机随后逼近。炮手的扫射会伤到追击机，试着把它引到同一条火力线上。',
  },
};

const arenaBossId = role => 'step_arena_boss_'+role;
const arenaBossRole = monster => stepEnemyDefinition(monster)?.arenaBossRole;
const arenaBossHas = role => monsters.some(m => m.hp>0 && arenaBossRole(m)===role);
const arenaBossAttackQueued = role => monsters.some(m=>arenaBossRole(m)===role &&
  SINGLE_STEP.plans.get(m.id)?.type==='arena-boss-attack');
const arenaBossSameCell = (a,b) => a.col===b.col && a.row===b.row;

function arenaBossPlacements(preset) {
  return [
    ...(preset.rocks || []).map(([col,row])=>({kind:'terrain',id:TILE.ROCK,col,row})),
    ...preset.enemies.map(([role,col,row])=>({kind:'monster',id:MONSTER_DB[role]?role:arenaBossId(role),col,row})),
    ...(preset.items || []).map(([id,col,row])=>({kind:'item',id,col,row})),
  ];
}

function registerArenaBossEncounters() {
  for (const [role,unit] of Object.entries(arenaBossUnits)) {
    const id=arenaBossId(role);
    const definition={...STEP_ENEMIES.fixed,id,name:unit.name,hp:unit.hp,arenaBossRole:role};
    STEP_ENEMIES[id.slice(5)]=definition;
    MONSTER_DB[id]={...definition,loot:null};
  }
  const picker=arenaControl('boss');
  picker.append(...Object.entries(arenaBossPresets).map(([id,preset])=>new Option(preset.name,id)));
  picker.addEventListener('change',()=>{
    openArenaBossEncounter(picker.value);
    picker.blur();
  });
  picker.disabled=false;
}

function openArenaBossEncounter(id) {
  arenaBossEncounter=arenaBossPresets[id] || null;
  arenaControl('boss').value=id;
  stepAttackVariantsEnabled=Boolean(arenaBossEncounter) || arenaControl('rules').value==='interrupt';
  updateStepCombatHelp(stepAttackVariantsEnabled);
  arenaLoad(!arenaBossEncounter);
}

function arenaBossDirection(m) {
  const col=player.col-m.col, row=player.row-m.row;
  return Math.abs(col)>=Math.abs(row) ? {dx:Math.sign(col),dy:0} : {dx:0,dy:Math.sign(row)};
}

function arenaBossSweep(axis, index) {
  return Array.from({length:axis==='row'?COLS:ROWS},(_,i)=>axis==='row'?{col:i,row:index}:{col:index,row:i})
    .filter(p=>!singleStepBlocksBullet(p.col,p.row));
}

function arenaBossCharge(m,dir,range,breaksCover) {
  const cells=[];
  for (let n=1;n<=range;n++) {
    const cell={col:m.col+dir.dx*n,row:m.row+dir.dy*n};
    if (isWall(cell.col,cell.row)) {
      return {cells,impact:breaksCover && tileData[arenaKey(cell.col,cell.row)] ? cell : null};
    }
    if (monsters.some(other=>other!==m && other.hp>0 && isInMonsterFootprint(other,cell.col,cell.row))) break;
    cells.push(cell);
  }
  return {cells};
}

function arenaBossStepToward(m) {
  const next=stepEnemyChase(m);
  return {type:'arena-boss-move',cells:[],path:next?[next]:[]};
}

function arenaBossAttack(kind,cells,details={}) {
  return {type:'arena-boss-attack',kind,cells,attackColor:'red',...details};
}

const arenaBossPreviousPlan=stepEnemyPlan;
stepEnemyPlan=function(m,forceChase) {
  const role=arenaBossRole(m);
  if (!role) return arenaBossPreviousPlan(m,forceChase);
  const phase=m.arenaBossAttacks || 0;
  const dir=arenaBossDirection(m);
  const axis=phase%2?'col':'row';
  const sweep=()=>arenaBossAttack('sweep',arenaBossSweep(axis,player[axis]));
  switch(role) {
    case 'switch':
      return {type:'wait',cells:[]};
    case 'mine':
      return arenaBossAttack('mine',bombBlastCells(m.col,m.row));
    case 'ram':
    case 'hunter': {
      if (role==='hunter' && arenaBossAttackQueued('gunner')) return {type:'arena-boss-prepare',cells:[]};
      const {cells,impact}=arenaBossCharge(m,dir,COLS,role==='ram');
      return cells.some(p=>arenaBossSameCell(p,player))
        ? arenaBossAttack('charge',cells,{dir,impact}) : arenaBossStepToward(m);
    }
    case 'guard':
      return phase%2===0 ? sweep() : arenaBossAttack('pulse',bombBlastCells(m.col,m.row));
    case 'interceptor':
      return phase%2===0
        ? arenaBossAttack('sweep',arenaBossSweep('row',player.row),{attackColor:'yellow'}) : sweep();
    case 'core':
      return arenaBossAttack('pulse',arenaBossSweep('col',player.col));
    case 'drive':
      return {type:'wait',cells:[]};
    case 'cannon':
      return arenaBossAttackQueued('core') ? {type:'arena-boss-prepare',cells:[]} :
        arenaBossAttack('sweep',arenaBossSweep('row',player.row));
    case 'layer': {
      if (phase%2===0 && monsters.filter(m=>arenaBossRole(m)==='mine').length<2) {
        const cells=STEP_CARDINAL.map(([dx,dy])=>({col:player.col+dx*2,row:player.row+dy*2}))
          .filter(p=>arenaInside(p.col,p.row) && currentRoomGrid[p.col][p.row]===TILE.FLOOR &&
            !monsters.some(other=>isInMonsterFootprint(other,p.col,p.row)));
        const target=cells.sort((a,b)=>Math.abs(a.col-m.col)+Math.abs(a.row-m.row)-Math.abs(b.col-m.col)-Math.abs(b.row-m.row))[0];
        if (target) return arenaBossAttack('deploy',[],{target});
      }
      return sweep();
    }
    default:
      return sweep();
  }
};

const arenaBossPreviousIsAttack=stepTestHooks.isArenaAttack;
stepTestHooks.isArenaAttack=plan=>plan?.type==='arena-boss-attack' || arenaBossPreviousIsAttack?.(plan);

const arenaBossPreviousNext=stepTestHooks.nextEnemyPlan;
stepTestHooks.nextEnemyPlan=function(m,plan) {
  const role=arenaBossRole(m);
  if (!role) return arenaBossPreviousNext?.(m,plan);
  if (plan.type==='arena-boss-attack' || plan.type==='interrupted') {
    m.arenaBossAttacks=(m.arenaBossAttacks || 0)+1;
    return {type:'arena-boss-recover',cells:[]};
  }
  if (plan.type==='arena-boss-recover') {
    if (role==='core' && arenaBossHas('drive')) return arenaBossStepToward(m);
    return {type:'arena-boss-prepare',cells:[]};
  }
  return null;
};

const arenaBossPreviousApply=singleStepApplyPlan;
singleStepApplyPlan=function(m,plan) {
  const role=arenaBossRole(m);
  if (role==='core' && plan.type==='arena-boss-move' && !arenaBossHas('drive')) return;
  if (plan.type!=='arena-boss-attack') return arenaBossPreviousApply(m,plan);
  if (!hasMonstersAlive()) return;
  const {kind,cells,dir,impact,target}=plan;
  const at=performance.now();
  const hit=cells.some(p=>arenaBossSameCell(p,player));
  arenaBossFlash.push({cells,at});
  if (hit) damagePlayer(1,m.id);
  m.arenaBossBreach=false;
  if (kind==='charge') {
    let end=m;
    for (const cell of cells) {
      if (isWall(cell.col,cell.row) || monsters.some(other=>other!==m && isInMonsterFootprint(other,cell.col,cell.row))) break;
      if (arenaBossSameCell(cell,player) && !singleStepPush(m,cell.col,cell.row,dir)) break;
      end=cell;
    }
    if (end!==m) {
      Object.assign(m,end);
      (m._visualPath ||= []).push(end);
    }
    const cover=impact && tileData[arenaKey(impact.col,impact.row)];
    if (cover && Math.abs(m.col-impact.col)+Math.abs(m.row-impact.row)===1) {
      m.arenaBossBreach=hitTile(impact.col,impact.row,cover.hp);
    }
  } else if (kind==='deploy') {
    stepSpawnOriginal(arenaBossId('mine'),null,null,target);
  } else if (kind==='mine') {
    m.hp=0;
    monsters.splice(monsters.indexOf(m),1);
  }
  if (role==='gunner') {
    const ally=monsters.find(other=>arenaBossRole(other)==='hunter');
    if (ally && cells.some(p=>arenaBossSameCell(p,ally))) {
      const enemyActing=arenaEffects.enemyActing;
      arenaEffects.enemyActing=true;
      try { damageMonster(ally,6); } finally { arenaEffects.enemyActing=enemyActing; }
    }
  }
};

function arenaBossExposed(m) {
  return SINGLE_STEP.plans.get(m.id)?.type==='arena-boss-recover' &&
    (arenaBossRole(m)==='turret' || m.arenaBossBreach);
}

const arenaBossPreviousDamage=damageMonster;
damageMonster=function(m,amount,...args) {
  return arenaBossPreviousDamage(m,arenaBossExposed(m)?amount*2:amount,...args);
};

function arenaBossExitOpen() {
  return !arenaBossHas('switch');
}

const arenaBossPreviousAlive=hasMonstersAlive;
hasMonstersAlive=function() {
  if (!arenaBossEncounter) return arenaBossPreviousAlive();
  return monsters.some(m=>m.hp>0 && !arenaBossUnits[arenaBossRole(m)]?.optional && !m.arenaDummy);
};

const arenaBossPreviousAct=singleStepAct;
singleStepAct=function(type,dir) {
  const result=arenaBossPreviousAct(type,dir);
  if (result && arenaBossEncounter && !gameOver) {
    const exit=arenaBossEncounter.exit;
    if (!hasMonstersAlive() || (exit && arenaBossExitOpen() && arenaBossSameCell(player,exit))) triggerVictoryScreen();
  }
  return result;
};

const arenaBossPreviousDraw=stepTestHooks.drawArenaMonster;
stepTestHooks.drawArenaMonster=function(m,p,now,kind,poison) {
  const unit=arenaBossUnits[arenaBossRole(m)];
  if (!unit) return arenaBossPreviousDraw?.(m,p,now,kind,poison);
  const plan=SINGLE_STEP.plans.get(m.id), size=CELL*(unit.optional ? .54 : .79);
  const exposed=arenaBossExposed(m);
  ctx.save();
  ctx.translate(p.x,p.y-size*.12);
  ctx.fillStyle='#111d28';
  ctx.strokeStyle=exposed?'#76f0c1':unit.color;
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.roundRect(-size/2,-size*.61,size,size*.92,4);
  ctx.fill();ctx.stroke();
  ctx.fillStyle=exposed?'#76f0c1':unit.color;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold '+Math.round(size*.52)+'px sans-serif';
  ctx.fillText(exposed?'开':unit.symbol,0,-size*.14);
  ctx.fillStyle='#14161a';ctx.fillRect(-size/2,size*.36,size,4);
  ctx.fillStyle=unit.color;ctx.fillRect(-size/2,size*.36,size*m.hp/m.maxHp,4);
  if (plan?.type==='arena-boss-recover') {
    ctx.fillStyle='#eff9fc';ctx.font='bold 11px sans-serif';ctx.fillText('恢复',0,-size*.86);
  }
  ctx.restore();
  return true;
};

const arenaBossPreviousOverlay=drawDangerOverlay;
drawDangerOverlay=function() {
  arenaBossPreviousOverlay();
  if (!arenaBossEncounter || worldMapOpen) return;
  const now=performance.now();
  arenaBossFlash=arenaBossFlash.filter(event=>now-event.at<250);
  ctx.save();
  for (const {cells,at} of arenaBossFlash) {
    ctx.fillStyle='rgba(255,168,106,'+(.55*(1-(now-at)/250))+')';
    for (const cell of cells) {
      const q=cellRect(cell.col,cell.row);
      ctx.fillRect(q.xL+2,q.yT+2,q.w-4,q.h-4);
    }
  }
  if (!stepEnemiesPaused()) {
    for (const m of monsters) {
      const plan=singleStepAttackPreview(m);
      const marker=plan?.target || plan?.impact;
      if (marker) arenaBossMarkCell(marker,plan.target?'◆':'×','#ffbf6d');
    }
  }
  const exit=arenaBossEncounter.exit;
  if (exit) arenaBossMarkCell(exit,'出口',arenaBossExitOpen()?'#75f2b9':'#b6c6d0');
  ctx.restore();
};

function arenaBossMarkCell(cell,label,color) {
  const q=cellRect(cell.col,cell.row);
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(q.xL+2,q.yT+2,q.w-4,q.h-4);
  ctx.fillStyle=color;ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(label,q.xL+q.w/2,q.yT+q.h/2);
}

document.getElementById('btn-retry-victory').addEventListener('click',event=>{
  if (!arenaBossEncounter) return;
  event.stopImmediatePropagation();
  arenaLoad(false);
},true);
