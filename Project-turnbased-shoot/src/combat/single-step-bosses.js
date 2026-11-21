// 正式单步 Boss：条件与权重只在整套行动完成后判定。
let STEP_BOSSES={};
const stepBossKind=m=>m.aiType==='boss_jumper'?'jumper':m.aiType==='boss_duke'?'fly':null;
const stepBossKey=c=>c.col+','+c.row;
const stepBossInRoom=c=>c.col>=0&&c.row>=0&&c.col<COLS&&c.row<ROWS;
function stepBossStrip(m) {
 const cx=m.col+.5,cy=m.row+.5,dx=player.col-cx,dy=player.row-cy;
 const dir=Math.abs(dx)>=Math.abs(dy)?{dx:Math.sign(dx)||1,dy:0}:{dx:0,dy:Math.sign(dy)||1};
 const cells=[];
 for(let lane=0;lane<2;lane++)for(let n=1;n<Math.max(COLS,ROWS);n++) {
  const col=dir.dx?(dir.dx>0?m.col+1+n:m.col-n):m.col+lane;
  const row=dir.dy?(dir.dy>0?m.row+1+n:m.row-n):m.row+lane;
  if(!stepBossInRoom({col,row}))break;
  cells.push({col,row});
 }
 return {cells,dir};
}
function stepBossLandingLegal(m,to) {
 return singleStepFootprint(m,to.col,to.row).every(c=>stepBossInRoom(c)&&currentRoomGrid[c.col][c.row]!==TILE.PIT&&
  !monsters.some(o=>o.id!==m.id&&o.hp>0&&(o.size||1)>1&&isInMonsterFootprint(o,c.col,c.row)));
}
function stepBossSmallTarget(m) {
 let to={col:m.col,row:m.row};
 for(let i=0;i<3;i++) {
  const dx=player.col+.5-(to.col+1),dy=player.row+.5-(to.row+1);
  if(Math.abs(dx)<=.5&&Math.abs(dy)<=.5)break;
  const next=Math.abs(dx)>=Math.abs(dy)?{col:to.col+Math.sign(dx),row:to.row}:{col:to.col,row:to.row+Math.sign(dy)};
  if(!stepBossInRoom(next)||next.col+1>=COLS||next.row+1>=ROWS)break;
  to=next;
 }
 if(stepBossLandingLegal(m,to))return to;
 const options=[];
 for(let col=0;col<COLS-1;col++)for(let row=0;row<ROWS-1;row++)if(Math.abs(col-m.col)+Math.abs(row-m.row)<=3&&stepBossLandingLegal(m,{col,row}))options.push({col,row});
 options.sort((a,b)=>Math.abs(a.col-to.col)+Math.abs(a.row-to.row)-Math.abs(b.col-to.col)-Math.abs(b.row-to.row));
 return options[0]||{col:m.col,row:m.row};
}
function stepBossSlam(m) {
 const options=[];
 for(let dc=0;dc<2;dc++)for(let dr=0;dr<2;dr++){const to={col:player.col-dc,row:player.row-dr};if(stepBossLandingLegal(m,to))options.push(to);}
 const to=singleStepPick(options)||stepBossSmallTarget(m),cells=[];
 for(let dr=-1;dr<=2;dr++)for(let dc=-1;dc<=2;dc++) {
  if((dc===-1||dc===2)&&(dr===-1||dr===2))continue;
  const c={col:to.col+dc,row:to.row+dr};if(stepBossInRoom(c))cells.push(c);
 }
 return {to,cells};
}
function stepBossDiagonal(m) {
 const dir={...(m._diagDir||{dCol:m.col+.5>=(COLS-1)/2?-1:1,dRow:m.row+.5>=(ROWS-1)/2?-1:1})},path=[];
 let col=m.col,row=m.row;
 for(let i=0;i<2;i++) {
  if(col+dir.dCol<0||col+dir.dCol+1>=COLS)dir.dCol*=-1;
  if(row+dir.dRow<0||row+dir.dRow+1>=ROWS)dir.dRow*=-1;
  col+=dir.dCol;row+=dir.dRow;path.push({col,row});
 }
 return {path,dir,cells:[...new Map(path.flatMap(c=>singleStepFootprint(m,c.col,c.row)).map(c=>[stepBossKey(c),c])).values()]};
}
function stepBossSequence(m,action) {
 const kind=stepBossKind(m),strip=stepBossStrip(m);
 let phases;
 if(kind==='jumper'&&action==='move') {
  const to=stepBossSmallTarget(m),cells=singleStepFootprint(m,to.col,to.row);
  phases=[{stage:'jump',to,cells,attackColor:'yellow',interrupt:'none',hit:true},{stage:'recover'}];
 } else if(kind==='jumper'&&action==='shot') {
  const cells=[...strip.cells];
  for(let i=cells.length-1;i>0;i--){const j=Math.floor(monsterActionRandom()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
  cells.length=Math.min(10,cells.length);
  phases=[{stage:'lob',cells,dir:strip.dir,attackColor:'red',hit:true},{stage:'recover'}];
 } else if(kind==='jumper') {
  phases=[{stage:'shake'},{stage:'vanish'},{stage:'early',deferSlam:true,attackColor:'red'},{stage:'slam',attackColor:'red',hit:true},{stage:'recover'}];
 } else if(action==='move') {
  phases=[{stage:'diagonal',...stepBossDiagonal(m),attackColor:'red',hit:true}];
 } else if(action==='summon')phases=[{stage:'summon'}];
 else {
  phases=[{stage:'beam',...strip,attackColor:'yellow',interrupt:'nearest',hit:true},{stage:'recover'}];
 }
 return stepBossMakePhase(m,{action,phases,index:0});
}
function stepBossMakePhase(m,sequence) {
 const phase=sequence.phases[sequence.index];
 if(phase.deferSlam) {
  const target=stepBossSlam(m);
  sequence={...sequence,phases:sequence.phases.map((p,i)=>i>=sequence.index&&i<=sequence.index+1?{...p,...target,deferSlam:false}:p)};
 }
 const current=sequence.phases[sequence.index];
 m._shaking=current.stage==='shake';
 if(sequence.action==='slam')m.jumperVanished=['vanish','early','windup','slam'].includes(current.stage);
 return {type:'boss-phase',cells:[],...current,sequence};
}
function stepBossChoose(m) {
 const config=STEP_BOSSES[stepBossKind(m)],strip=stepBossStrip(m);
 const choices=config.actions.filter(a=>(a.condition!=='in_range'||strip.cells.some(c=>stepVariantCellMatches(c,player)))&&
  (a.id!=='summon'||stepBossSummonCount()<(config.summonLimit??6)));
 let roll=monsterActionRandom()*choices.reduce((n,a)=>n+a.weight,0);
 const chosen=choices.find(a=>(roll-=a.weight)<0)||choices.at(-1);
 return stepBossSequence(m,chosen.id);
}
// 先找出所有挤出位置，再提交；小怪和 Boss 互不造成挤压伤害。
function stepBossPlace(m,to,stomp=false) {
 const footprint=singleStepFootprint(m,to.col,to.row),keys=new Set(footprint.map(stepBossKey));
 if(footprint.some(c=>!stepBossInRoom(c)||stomp&&currentRoomGrid[c.col][c.row]===TILE.PIT))return false;
 const overlaps=monsters.filter(o=>o.id!==m.id&&o.hp>0&&!o.jumperVanished&&singleStepFootprint(o).some(c=>keys.has(stepBossKey(c))));
 const pushes=[],reserved=new Set();
 for(const other of overlaps) {
  if((other.size||1)>1)return false;
  const options=[];
  for(let col=0;col<COLS;col++)for(let row=0;row<ROWS;row++){
   const c={col,row};if(keys.has(stepBossKey(c))||reserved.has(stepBossKey(c))||stepVariantCellMatches(c,player)||!singleStepLegal(other,col,row))continue;
   options.push(c);
  }
  options.sort((a,b)=>Math.abs(a.col-other.col)+Math.abs(a.row-other.row)-Math.abs(b.col-other.col)-Math.abs(b.row-other.row));
  if(!options.length)return false;pushes.push({other,to:options[0]});reserved.add(stepBossKey(options[0]));
 }
 if(keys.has(stepBossKey(player))&&!singleStepPush(m,to.col,to.row))return false;
 for(const push of pushes)singleStepDisplaceMonster(push.other,push.to.col,push.to.row);
 if(stomp)for(const c of footprint){
  const tile=currentRoomGrid[c.col][c.row];
  if(tile===TILE.ROCK||tile===TILE.POOP){const data=tileData[stepBossKey(c)];if(data)hitTile(c.col,c.row,data.hp);currentRoomGrid[c.col][c.row]=TILE.FLOOR;delete tileData[stepBossKey(c)];}
  if(tile===TILE.SPIKE)currentRoomGrid[c.col][c.row]=TILE.FLOOR;
 }
 m.col=to.col;m.row=to.row;return true;
}
function stepBossSummonCount(){return monsters.filter(o=>o.hp>0&&o.cfgId==='step_mobile'&&o._bossSummoned).length;}
function stepBossSummon(m) {
 if(stepBossSummonCount()>=(STEP_BOSSES.fly.summonLimit??6))return;
 const choices=[];
 for(let col=m.col-1;col<=m.col+2;col++)for(let row=m.row-1;row<=m.row+2;row++) {
  const c={col,row};if(col!==m.col-1&&col!==m.col+2&&row!==m.row-1&&row!==m.row+2)continue;
  if((col===m.col-1||col===m.col+2)&&(row===m.row-1||row===m.row+2))continue;
  if(stepBossInRoom(c)&&!stepVariantCellMatches(c,player)&&!monsters.some(o=>o.hp>0&&isInMonsterFootprint(o,col,row)))choices.push(c);
 }
 const to=singleStepPick(choices);if(!to)return;
 const child=stepSpawnChild(m,to.col,to.row),cfg=MONSTER_DB.step_mobile;
 Object.assign(child,{cfgId:cfg.id,name:cfg.name,hp:cfg.hp,maxHp:cfg.hp,displayHp:cfg.hp,aiType:cfg.aiType,tint:cfg.tint,movementTags:['飞行'],_bossSummoned:true});
 if(cfg.loot)child._killLoot=preRollLoot(cfg.loot);
}
const stepBossLegacyPlan=singleStepLegacyPlan;
singleStepLegacyPlan=function(m){return stepBossKind(m)?stepBossChoose(m):stepBossLegacyPlan(m);};
const stepBossResolveBase=singleStepResolvePlan;
singleStepResolvePlan=function(m,p,options){
 if(p.type!=='boss-phase')return stepBossResolveBase(m,p,options);
 return p;
};
const stepBossAttackBase=stepTestHooks.isArenaAttack;
stepTestHooks.isArenaAttack=p=>p?.type==='boss-phase'?p.hit===true:stepBossAttackBase?.(p);
const stepBossWindupBase=stepTestHooks.isEnemyWindup;
stepTestHooks.isEnemyWindup=p=>p?.type==='boss-phase'||stepBossWindupBase?.(p);
const stepBossNextBase=stepTestHooks.nextEnemyPlan;
stepTestHooks.nextEnemyPlan=function(m,p) {
 if(!stepBossKind(m))return stepBossNextBase?.(m,p);
 if(m.hp<=0)return;
 if(p.type==='interrupted')return {type:'boss-phase',stage:'recover',cells:[]};
 if(p.type!=='boss-phase')return stepBossNextBase?.(m,p);
 if(p.sequence&&p.sequence.index+1<p.sequence.phases.length)return stepBossMakePhase(m,{...p.sequence,index:p.sequence.index+1});
 return stepBossChoose(m);
};
const stepBossPreviewBase=singleStepAttackPreview;
singleStepAttackPreview=function(m,options={}) {
 const p=SINGLE_STEP.plans.get(m.id);
 if(p?.type!=='boss-phase')return stepBossPreviewBase(m,options);
 if(m.hp<=0||!options.ignorePause&&stepEnemiesPaused()||p.stage==='early'||!p.cells.length)return null;
 return p;
};
const stepBossInterruptBase=stepInterruptCells;
stepInterruptCells=function(m,p) {
 if(p?.type!=='boss-phase')return stepBossInterruptBase(m,p);
 if(p.attackColor!=='yellow'||p.interrupt!=='nearest')return [];
 return p.cells.filter(c=>c.col===m.col-1||c.col===m.col+2||c.row===m.row-1||c.row===m.row+2);
};
const stepBossDrawBase=stepTestHooks.drawEnemyWindups;
stepTestHooks.drawEnemyWindups=function(occupied) {
 stepBossDrawBase?.(occupied);ctx.save();ctx.setLineDash([5,4]);ctx.strokeStyle='#ff7979';ctx.lineWidth=2;
 for(const m of monsters){const p=SINGLE_STEP.plans.get(m.id);if(m.hp<=0||p?.type!=='boss-phase'||p.stage!=='early')continue;
  for(const c of p.cells){const q=cellRect(c.col,c.row);ctx.strokeRect(q.xL+1,q.yT+1,q.w-2,q.h-2);}}
 ctx.restore();
};
const stepBossApplyBase=singleStepApplyPlan;
singleStepApplyPlan=function(m,p) {
 if(p.type!=='boss-phase')return stepBossApplyBase(m,p);
 const from={col:m.col,row:m.row};
 m._stepAction={type:p.stage,from,at:performance.now(),cells:p.cells};
 m._shaking=p.stage==='shake';
 if(p.stage==='vanish')m.jumperVanished=true;
 if(p.hit&&!['jump','slam','diagonal'].includes(p.stage)&&p.cells.some(c=>stepVariantCellMatches(c,player)))damagePlayer(1,m.id);
 if(p.stage==='jump'||p.stage==='slam') {
  m.jumperVanished=false;
  const hit=p.cells.some(c=>stepVariantCellMatches(c,player));
  if(stepBossPlace(m,p.to,true)){if(hit)damagePlayer(1,m.id);m.jumpFrom=from;m.jumpTo={col:m.col,row:m.row};m.jumpType=p.stage==='slam'?'big_land':'small';m.jumpAnimTimer=.4;m._visualPath=[];}
 }
 if(p.stage==='diagonal') {
  for(const to of p.path){const hit=singleStepFootprint(m,to.col,to.row).some(c=>stepVariantCellMatches(c,player));if(stepBossPlace(m,to)){if(hit)damagePlayer(1,m.id);(m._visualPath||=[]).push({...to});}else break;}
  m._diagDir={...p.dir};
 }
 if(p.stage==='summon')stepBossSummon(m);
 if(p.stage==='beam')for(let lane=0;lane<2;lane++){
  const ray=p.cells.filter(c=>p.dir.dx?c.row===m.row+lane:c.col===m.col+lane);
  singleStepVisualShot({...m,col:m.col+(p.dir.dx?0:lane),row:m.row+(p.dir.dy?0:lane)},ray.at(-1),false,p.dir);
 }
 if(p.stage==='lob')for(const to of p.cells)singleStepVisualShot(m,to,false,p.dir,{arcHeight:CELL*1.5});
};

// 消失单位保留生命和行动序列，但不占据地面格子。
const stepVisibleFootprint=isInMonsterFootprint;
isInMonsterFootprint=(m,col,row)=>!m.jumperVanished&&stepVisibleFootprint(m,col,row);
isMonsterAt=(col,row,excludeId=-1)=>monsters.some(m=>m.id!==excludeId&&m.hp>0&&isInMonsterFootprint(m,col,row));
const stepDirectionalApply=singleStepApplyPlan;
singleStepApplyPlan=function(m,p){
 const previous=stepIncomingDirection;
 let dir=null;
 if(['shot','strike','charge'].includes(p.type))dir=p.dir;
 if(p.type==='fan')dir={dx:Math.sign(player.col-m.col),dy:Math.sign(player.row-m.row)};
 if(p.type==='variant-attack'&&!['teleport'].includes(p.shape))dir=p.dir;
 if(p.type==='boss-phase'&&p.stage==='beam')dir=p.dir;
 if(p.type==='boss-phase'&&p.stage==='diagonal')dir={dx:p.dir.dCol,dy:p.dir.dRow};
 stepIncomingDirection=dir||null;
 try{return stepDirectionalApply(m,p);}finally{stepIncomingDirection=previous;}
};

// 临时移动落点提示；只读解析，不重新抽选行动。
function stepDrawMoveDestinations(){ctx.save();ctx.strokeStyle='#7ac5ff';ctx.fillStyle='rgba(55,135,255,.32)';ctx.lineWidth=2;
 for(const m of monsters){
  const saved=SINGLE_STEP.plans.get(m.id);if(m.hp<=0||m.jumperVanished||!saved)continue;
  const p=singleStepResolvePlan(m,saved,{preview:true});
  let to=p.path?.at(-1);
  if(p.type==='charge'||p.shape==='long-charge')to=p.cells?.at(-1);
  if(p.type==='boss-phase'&&p.sequence?.action==='move'&&p.to)to=p.to;
  if(!to||to.col===m.col&&to.row===m.row)continue;
  for(const c of singleStepFootprint(m,to.col,to.row)){if(!stepBossInRoom(c))continue;const q=cellRect(c.col,c.row);ctx.fillRect(q.xL+2,q.yT+2,q.w-4,q.h-4);ctx.strokeRect(q.xL+2,q.yT+2,q.w-4,q.h-4);}
 }
 ctx.restore();
};

const stepMoveOverlayBase=drawDangerOverlay;
drawDangerOverlay=function(){stepMoveOverlayBase();if(gameStarted&&!worldMapOpen&&!stepEnemiesPaused())stepDrawMoveDestinations();};
