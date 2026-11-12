// 仅随自定义战斗场打包的两阶段攻击试验。
const arenaStageVariants = [
  {base:'fighter', key:'fighter2', name:'近战者2', sprite:'melee'},
  {base:'mobile', key:'mobile2', name:'移动射手2', sprite:'ranged'},
];

function registerArenaStageEnemies() {
  for (const {base,key,name,sprite} of arenaStageVariants) {
    const id = 'step_'+key;
    STEP_ENEMIES[key] = {...STEP_ENEMIES[base],id,name,sprite,arenaStages:base};
    MONSTER_DB[id] = {...MONSTER_DB['step_'+base],...STEP_ENEMIES[key]};
    MONSTER_POOL_ALL.push(id);
  }
}

function arenaStageCell(m,dir,depth,lane=0) {
  return {col:m.col+dir.dx*depth-dir.dy*lane,row:m.row+dir.dy*depth+dir.dx*lane};
}

function arenaStageWarning(m,dir,kind) {
  const lanes = kind==='mobile' ? [-1,0,1] : [0];
  return lanes.flatMap(lane=>[1,2,3].map(depth=>arenaStageCell(m,dir,depth,lane)))
    .filter(p=>arenaInside(p.col,p.row));
}

function arenaStageAttackCells(m,plan) {
  const {dir,variant} = plan;
  if (variant==='burrow') {
    const dest=arenaStageCell(m,dir,3);
    return singleStepLegal(m,dest.col,dest.row) ? [dest] : [];
  }
  const lanes = variant==='side-shot' ? [-1,1] : [0];
  const range = variant==='sweep' ? 2 : 3;
  return lanes.flatMap(lane=>{
    const start=arenaStageCell(m,dir,0,lane);
    return singleStepRay({...m,...start},dir.dx,dir.dy,range);
  });
}

const arenaOriginalAttackPlan = stepEnemyAttackPlan;
stepEnemyAttackPlan = function(m,target) {
  const kind=stepEnemyDefinition(m)?.arenaStages;
  if (!kind || stepAttackVariantsEnabled) return arenaOriginalAttackPlan(m,target);
  const dx=target.col-m.col,dy=target.row-m.row;
  if ((!dx&&!dy)||(kind==='fighter'&&dx&&dy)) return null;
  const dir=Math.abs(dx)>=Math.abs(dy) ? {dx:Math.sign(dx),dy:0} : {dx:0,dy:Math.sign(dy)};
  const warning=arenaStageWarning(m,dir,kind);
  if (!warning.some(p=>p.col===target.col&&p.row===target.row)) return null;
  const variants=kind==='fighter' ? ['sweep','burrow'] : ['center-shot','side-shot'];
  if (!variants.some(variant=>arenaStageAttackCells(m,{dir,variant}).length)) return null;
  return {type:'arena-windup',cells:[],dir,kind};
};

stepTestHooks.isEnemyWindup = plan => plan?.type==='arena-windup';
stepTestHooks.isArenaAttack = plan => plan?.type==='arena-locked';
stepTestHooks.nextEnemyPlan = function(m,plan) {
  if (plan.type==='arena-locked') return stepEnemyDefinition(m).recover ? {type:'recover',cells:[]} : null;
  if (plan.type!=='arena-windup') return null;
  const variants=plan.kind==='fighter' ? ['sweep','burrow'] : ['center-shot','side-shot'];
  const choices=variants.map(variant=>({
    type:'arena-locked',dir:plan.dir,variant,origin:{col:m.col,row:m.row},
    cells:arenaStageAttackCells(m,{dir:plan.dir,variant}),
  })).filter(attack=>attack.cells.length);
  return singleStepPick(choices) || {type:'recover',cells:[]};
};

const arenaOriginalStageResolve = singleStepResolvePlan;
singleStepResolvePlan = function(m,plan,options) {
  const resolved=arenaOriginalStageResolve(m,plan,options);
  if (resolved.type!=='arena-locked') return resolved;
  let cells=arenaStageAttackCells(m,resolved);
  if (m.col===resolved.origin.col&&m.row===resolved.origin.row) {
    cells=cells.filter(p=>resolved.cells.some(saved=>saved.col===p.col&&saved.row===p.row));
  }
  return {...resolved,cells};
};

const arenaOriginalStageApply = singleStepApplyPlan;
singleStepApplyPlan = function(m,plan) {
  if (plan.type==='arena-windup') return;
  if (plan.type!=='arena-locked') return arenaOriginalStageApply(m,plan);
  const {variant,cells,dir}=plan;
  const at=performance.now(), from={col:m.col,row:m.row};
  const hit=cells.some(p=>p.col===player.col&&p.row===player.row);
  m._stepAction={type:variant.endsWith('shot')?'shot':'strike',at,from,cells,dir};
  if (variant==='burrow') {
    const to=cells[0];
    if (!to) return;
    if (hit) {
      if (stepTestHooks.blockPush?.(m)) return;
      damagePlayer(m.damage,m.id);
      if (!singleStepPush(m,to.col,to.row,dir)) return;
    }
    m.col=to.col;
    m.row=to.row;
    m._visualPath=[];
    m._stepJump={from,to,at,duration:300,burrow:true};
    return;
  }
  if (hit) damagePlayer(m.damage,m.id);
  if (variant==='sweep') return;
  for (const lane of variant==='side-shot'?[-1,1]:[0]) {
    const start=arenaStageCell(m,dir,0,lane);
    const end=cells.findLast(p=>(p.row-m.row)*dir.dx-(p.col-m.col)*dir.dy===lane);
    if (end) singleStepVisualShot({...start,id:m.id},end,false,dir,{start:at});
  }
};

stepTestHooks.drawEnemyWindups = function(redCells) {
  const painted=new Set(redCells.map(p=>arenaKey(p.col,p.row)));
  ctx.save();
  ctx.fillStyle='rgba(255,208,64,.20)';
  ctx.strokeStyle='rgba(255,216,90,.80)';
  for (const m of monsters) {
    const saved=SINGLE_STEP.plans.get(m.id);
    if (!stepTestHooks.isEnemyWindup(saved)||singleStepResolvePlan(m,saved,{preview:true}).type!=='arena-windup') continue;
    for (const p of arenaStageWarning(m,saved.dir,saved.kind)) {
      const key=arenaKey(p.col,p.row);
      if (painted.has(key)) continue;
      painted.add(key);
      const q=cellRect(p.col,p.row);
      ctx.fillRect(q.xL+1,q.yT+1,q.w-2,q.h-2);
      ctx.strokeRect(q.xL+1,q.yT+1,q.w-2,q.h-2);
    }
  }
  ctx.restore();
};

stepTestHooks.drawArenaMonster = function(m,p,now,kind,poison) {
  const motion=m._stepJump;
  if (motion?.burrow) {
    const progress=Math.max(0,Math.min(1,(now-motion.at)/motion.duration));
    const visible=Math.max(0,1-progress*4,(progress-.58)/.42);
    ctx.save();
    ctx.fillStyle='rgba(125,86,48,.65)';
    ctx.beginPath();
    ctx.ellipse(p.x,p.y+5,CELL*.33,CELL*.15,0,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(p.x-30,p.y-40,60,49);
    ctx.clip();
    if (visible>0) stepDrawMonsterSprite(kind+'3',p.x-30,p.y-38+(1-visible)*54,60,68,poison);
    ctx.restore();
    return true;
  }
  const plan=SINGLE_STEP.plans.get(m.id);
  const preparing=stepTestHooks.isEnemyWindup(plan);
  if (!preparing&&!stepTestHooks.isArenaAttack(plan)) return false;
  const frame=preparing ? 3 : 4;
  const crouch=plan.variant==='burrow' ? 6 : kind==='melee' ? 3 : 0;
  stepDrawMonsterSprite(kind+frame,p.x-30,p.y-38+crouch,60,68,poison);
  return true;
};
