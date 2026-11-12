// 正式单步战斗的攻击分型，自定义场也复用此规则。
let stepAttackVariantsEnabled = true;
updateStepCombatHelp(true);
const STEP_RED_ATTACK_CHANCE = .35;
const stepVariantKind = m => {
  const definition = stepEnemyDefinition(m);
  return definition?.arenaStages || definition?.id.replace(/^step_/,'');
};
const stepVariantCellMatches = (a,b) => a.col===b.col && a.row===b.row;

function stepVariantCell(m,dir,depth,lane=0) {
  return {col:m.col+dir.dx*depth-dir.dy*lane,row:m.row+dir.dy*depth+dir.dx*lane};
}

function stepVariantShape(m,dir,shape) {
  if (shape==='swipe') {
    const first = stepVariantCell(m,dir,1);
    if (singleStepBlocksBullet(first.col,first.row)) return [];
    return [first,...[-1,0,1].map(lane=>stepVariantCell(m,dir,2,lane))]
      .filter(cell=>!singleStepBlocksBullet(cell.col,cell.row));
  }
  const cells=[];
  for (let depth=1;depth<=Math.max(COLS,ROWS);depth++) {
    const cell=stepVariantCell(m,dir,depth);
    if (shape==='long-charge' ? isWall(cell.col,cell.row) : singleStepBlocksBullet(cell.col,cell.row)) break;
    cells.push(cell);
  }
  return cells;
}

function stepVariantSpecial(m,dir,shape,nativeType,cells=stepVariantShape(m,dir,shape)) {
  return {
    type:'variant-attack',nativeType,shape,dir,cells,origin:{col:m.col,row:m.row},
    path:shape==='long-charge' ? cells : undefined,
    attackColor:shape==='jab' ? 'yellow' : 'red',
  };
}

const stepVariantPreviousAttack = stepEnemyAttackPlan;
stepEnemyAttackPlan = function(m,target) {
  if (!stepAttackVariantsEnabled) return stepVariantPreviousAttack(m,target);
  const kind=stepVariantKind(m);
  if (!kind || kind==='x' || kind==='cross') return null;
  const basic=stepVariantPreviousAttack(m,target);
  if (!basic) return null;
  let yellow={...basic,attackColor:'yellow'}, red;
  if (kind==='mobile') red=stepVariantSpecial(m,basic.dir,'long-shot','shot');
  if (kind==='fighter') red=stepVariantSpecial(m,basic.dir,'swipe','strike');
  if (kind==='charger') red=stepVariantSpecial(m,basic.dir,'long-charge','charge');
  if (kind==='bomber') {
    red={...basic,attackColor:'red'};
    const jab=stepVariantCell(m,basic.dir,1);
    yellow=(basic.dir.dx&&basic.dir.dy)||!stepVariantCellMatches(jab,target)
      ? null : stepVariantSpecial(m,basic.dir,'jab','strike',[jab]);
  }
  const choices=[yellow,red].filter(plan=>plan?.cells.some(cell=>stepVariantCellMatches(cell,target)));
  if (choices.length<2) return choices[0]||null;
  return monsterActionRandom() >= 1-STEP_RED_ATTACK_CHANCE ? red : yellow;
};

const stepVariantPreviousPlan = stepEnemyPlan;
stepEnemyPlan = function(m,forceChase) {
  const kind=stepVariantKind(m);
  if (!stepAttackVariantsEnabled || (kind!=='x'&&kind!=='cross')) return stepVariantPreviousPlan(m,forceChase);
  const choices=[],fallback=[];
  for (let col=0;col<COLS;col++) for (let row=0;row<ROWS;row++) {
    const cell={col,row};
    if (stepVariantCellMatches(cell,m)||stepVariantCellMatches(cell,player)||!singleStepLegal(m,col,row)) continue;
    fallback.push(cell);
    if (stepEnemyCells({...m,...cell}).some(p=>stepVariantCellMatches(p,player))) choices.push(cell);
  }
  const target=singleStepPick(choices.length ? choices : fallback);
  const distance=Math.max(Math.abs(m.col-player.col),Math.abs(m.row-player.row));
  const chasing=forceChase||distance<=stepEnemyDefinition(m).chase;
  return {type:chasing?'chase':'wander',cells:[],path:target?[target]:[],jump:true,fanHop:true,canLockAfterHop:choices.length>0};
};

const stepVariantPreviousResolve = singleStepResolvePlan;
singleStepResolvePlan = function(m,plan,options) {
  if (plan.type==='interrupted') return plan;
  const resolved=stepVariantPreviousResolve(m,plan,options);
  if (resolved.type!=='variant-attack') return resolved;
  let cells=resolved.shape==='jab'
    ? singleStepRay(m,resolved.dir.dx,resolved.dir.dy,1)
    : stepVariantShape(m,resolved.dir,resolved.shape);
  if (stepVariantCellMatches(m,resolved.origin)) {
    cells=cells.filter(cell=>resolved.cells.some(saved=>stepVariantCellMatches(cell,saved)));
  }
  return {...resolved,cells,path:resolved.shape==='long-charge'?cells:undefined};
};

const stepVariantPreviousApply = singleStepApplyPlan;
singleStepApplyPlan = function(m,plan) {
  if (plan.type==='interrupted') return;
  if (plan.type!=='variant-attack') return stepVariantPreviousApply(m,plan);
  const cells=plan.shape==='long-charge'
    ? plan.cells.filter(cell=>singleStepLegal(m,cell.col,cell.row)) : plan.cells;
  return stepVariantPreviousApply(m,{...plan,type:plan.nativeType,cells,path:undefined});
};

const stepVariantPreviousIsAttack = stepTestHooks.isArenaAttack;
stepTestHooks.isArenaAttack = plan => plan?.type==='variant-attack'||stepVariantPreviousIsAttack?.(plan);

const stepVariantPreviousNext = stepTestHooks.nextEnemyPlan;
stepTestHooks.nextEnemyPlan = function(m,plan) {
  if (stepAttackVariantsEnabled && m.hp>0) {
    if (plan.type==='interrupted') return {type:'recover',cells:[]};
    if (plan.type==='variant-attack' && stepEnemyDefinition(m).recover) return {type:'recover',cells:[]};
    if (plan.fanHop && plan.canLockAfterHop && plan.type==='chase' && plan.path?.length && m._stepAction?.from &&
        !stepVariantCellMatches(m,m._stepAction.from) && stepVariantCellMatches(m,plan.path[0]) &&
        monsterActionRandom()<.5) {
      const attack=stepVariantPreviousAttack(m,player);
      if (attack) return {...attack,attackColor:'red'};
    }
  }
  return stepVariantPreviousNext?.(m,plan);
};

stepTestHooks.onDirectWeaponHit = function(m,at) {
  if (!stepAttackVariantsEnabled || m.hp<=0 || singleStepAttackPreview(m)?.attackColor!=='yellow') return;
  delete m.arenaDelayedMove;
  SINGLE_STEP.plans.set(m.id,{type:'interrupted',cells:[],attackColor:'yellow'});
  damageNumbers.push({x:m.px,y:m.py-12,text:'打断',life:.65,maxLife:.65,showAt:at,vx:0,vy:-14,color:'#ffe382'});
};

stepTestHooks.drawInterruptThreats = function(cells,redKeys) {
  if (!cells.length) return;
  const seen=new Set();
  ctx.save();
  ctx.fillStyle='rgba(255,194,56,.36)';
  ctx.strokeStyle='#ffdc76';
  ctx.lineWidth=1;
  for (const cell of cells) {
    const key=cell.col+','+cell.row;
    if (seen.has(key)) continue;
    seen.add(key);
    const q=cellRect(cell.col,cell.row);
    if (!redKeys.has(key)) ctx.fillRect(q.xL+1,q.yT+1,q.w-2,q.h-2);
    ctx.strokeRect(q.xL+1,q.yT+1,q.w-2,q.h-2);
  }
  ctx.restore();
};
