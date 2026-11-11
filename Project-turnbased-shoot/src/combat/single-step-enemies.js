// 正式版普通怪物复用机制原型规则，Boss继续使用既有分阶段适配。
let STEP_ENEMIES={},stepSplitting=false;
const STEP_CARDINAL=[[0,-1],[0,1],[-1,0],[1,0]],STEP_DIAGONAL=[[1,1],[-1,1],[1,-1],[-1,-1]];
function stepEnemyDefinition(m){return STEP_ENEMIES[m.cfgId?.replace(/^step_/,'')];}
function stepEnemyAlias(id){if(/^crack_maw_/.test(id))return 'step_fighter';if(/^flying_eye_/.test(id)||id==='duke_floater')return 'step_mobile';if(/^charge_golem_/.test(id))return 'step_charger';return id;}
const stepLoadOriginal=stepOldLoadMonsterDB;
loadMonsterDB=async function(){
 const ok=await stepLoadOriginal();if(!ok)return false;
 const response=await fetch('Configs/single-step-enemies.json?'+Date.now());
 if(!response.ok)throw Error('新怪物配置加载失败');
 const config=await response.json();STEP_ENEMIES=config.monsters;window.stepSquads=config.squads;
 for(const d of Object.values(STEP_ENEMIES))MONSTER_DB[d.id]={...d,loot:cloneHistoryValue(MONSTER_DB[d.mode==='shot'||d.mode==='fan'?'flying_eye_i':'crack_maw_i'].loot)};
 MONSTER_POOL_NORMAL=Object.values(STEP_ENEMIES).map(d=>d.id);
 MONSTER_POOL_ALL=[...MONSTER_POOL_NORMAL,...Object.keys(MONSTER_DB).filter(k=>MONSTER_DB[k]?.aiType?.startsWith('boss_'))];
 return true;
};
const stepLoadSquadsOriginal=loadSquadTemplates;
loadSquadTemplates=async function(){const ok=await stepLoadSquadsOriginal();SQUAD_TEMPLATES.squads={...Object.fromEntries(Object.entries(SQUAD_TEMPLATES.squads||{}).filter(([,s])=>s.roomTypes?.includes('boss'))),...window.stepSquads};return ok;};
const stepSpawnOriginal=spawnMonsterAtRandomPos;
spawnMonsterAtRandomPos=function(id,tags,anchor){const mapped=stepEnemyAlias(id);return stepSpawnOriginal(mapped,STEP_ENEMIES[mapped.replace(/^step_/,'')]?['地面']:tags,anchor);};
const stepSummonOriginal=handleDukeSummon;
handleDukeSummon=function(m){if(m._turnAfterAction?.monsterId)m._turnAfterAction.monsterId=stepEnemyAlias(m._turnAfterAction.monsterId);return stepSummonOriginal(m);};
function stepEnemyRay(m,dx,dy,range){
 const d=stepEnemyDefinition(m);
 return singleStepRay(m,dx,dy,range,d.hitsAllies===true&&d.mode!=='charge');
}
function stepEnemyCells(m,target=player){
 const d=stepEnemyDefinition(m),dx=target.col-m.col,dy=target.row-m.row;
 if(d.mode==='blast')return [...STEP_CARDINAL,...STEP_DIAGONAL].map(([x,y])=>({col:m.col+x,row:m.row+y})).filter(p=>p.col>=0&&p.row>=0&&p.col<COLS&&p.row<ROWS);
 if(d.mode==='fan')return (d.diagonal?STEP_DIAGONAL:STEP_CARDINAL).flatMap(([x,y])=>stepEnemyRay(m,x,y,d.range));
 if(dx&&dy||!dx&&!dy||Math.abs(dx)+Math.abs(dy)>d.range)return [];
 return stepEnemyRay(m,Math.sign(dx),Math.sign(dy),d.range);
}
function stepEnemyChaseDirections(m,target=player){
 const dx=target.col-m.col,dy=target.row-m.row,axes=[];
 if(dx)axes.push({col:m.col+Math.sign(dx),row:m.row,distance:Math.abs(dx)});
 if(dy)axes.push({col:m.col,row:m.row+Math.sign(dy),distance:Math.abs(dy)});
 axes.sort((a,b)=>b.distance-a.distance);
 if(axes.length===2&&Math.abs(dx)===Math.abs(dy)&&singleStepPick([false,true]))axes.reverse();
 return axes.map(({col,row})=>({col,row}));
}
function stepEnemyChase(m,target=player){
 // 同长最短路线优先较长轴；绕障允许先远离，无法贴近时走向最近可达位置。
 const preferred=stepEnemyChaseDirections(m,target).map(p=>[p.col-m.col,p.row-m.row]),dirs=[...preferred,...STEP_CARDINAL].filter((p,i,all)=>all.findIndex(o=>o[0]===p[0]&&o[1]===p[1])===i);
 const queue=[{col:m.col,row:m.row,first:null}],seen=new Set([m.col+','+m.row]);let best=Math.abs(m.col-target.col)+Math.abs(m.row-target.row),fallback=null;
 for(let i=0;i<queue.length;i++){
  const p=queue[i],distance=Math.abs(p.col-target.col)+Math.abs(p.row-target.row);if(distance===1)return p.first;
  if(distance<best){best=distance;fallback=p.first;}
  for(const [dx,dy]of dirs){const col=p.col+dx,row=p.row+dy,k=col+','+row;if(seen.has(k)||!singleStepLegal(m,col,row)||col===player.col&&row===player.row)continue;seen.add(k);queue.push({col,row,first:p.first||{col,row}});}
 }return fallback;
}
function stepEnemyPlan(m){
 const d=stepEnemyDefinition(m),dx=player.col-m.col,dy=player.row-m.row,cells=stepEnemyCells(m);
 if(cells.some(p=>p.col===player.col&&p.row===player.row))return {type:d.mode,cells,dir:{dx:Math.sign(dx),dy:Math.sign(dy)}};
 const chase=(d.jump?Math.max(Math.abs(dx),Math.abs(dy)):Math.abs(dx)+Math.abs(dy))<=d.chase;
 let next=null;
 if(d.jump){
  const choices=[];for(let col=0;col<COLS;col++)for(let row=0;row<ROWS;row++){
   if(col===player.col&&row===player.row||col===m.col&&row===m.row||!singleStepLegal(m,col,row))continue;
   // 探针与原单位使用同一id，原位置不会成为假障碍。
   const probe={...m,col,row};if(chase&&!stepEnemyCells(probe).some(p=>p.col===player.col&&p.row===player.row))continue;choices.push({col,row});
  }next=singleStepPick(choices);
 }else if(d.id!=='step_fixed')next=chase?stepEnemyChase(m):singleStepPick(STEP_CARDINAL.map(([x,y])=>({col:m.col+x,row:m.row+y})).filter(p=>singleStepLegal(m,p.col,p.row)&&!(p.col===player.col&&p.row===player.row)));
 return {type:chase?'chase':'wander',cells:[],path:next?[next]:[],jump:d.jump};
}
// 射线探针按id排除自身，兼容跳跃选点。
singleStepRay=function(m,dx,dy,range,hitsAllies=false){
 const out=[];
 for(let n=1;n<=range;n++){
  const col=m.col+dx*n,row=m.row+dy*n;
  if(singleStepBlocksBullet(col,row)||(dx&&dy&&(singleStepBlocksBullet(col-dx,row)||singleStepBlocksBullet(col,row-dy))))break;
  const occupied=monsters.some(o=>o.id!==m.id&&o.hp>0&&isInMonsterFootprint(o,col,row));
  if(!occupied||hitsAllies)out.push({col,row});
  if(occupied)break;
 }
 return out;
};
singleStepPlan=function(){
 for(const id of SINGLE_STEP.plans.keys())if(!monsters.some(m=>m.id===id))SINGLE_STEP.plans.delete(id);
 for(const m of monsters){if(SINGLE_STEP.plans.has(m.id))continue;const d=stepEnemyDefinition(m);SINGLE_STEP.plans.set(m.id,d?stepEnemyPlan(m):singleStepLegacyPlan(m));}
};
function singleStepRecovery(m,p){const d=stepEnemyDefinition(m);return d?d.recover&&['shot','fan','strike','charge'].includes(p.type):singleStepBasic(m)&&['shot','charge'].includes(p.type);}
function singleStepResolvePlan(m,p){
 const d=stepEnemyDefinition(m);if(!d||!['shot','fan','strike','charge'].includes(p.type))return p;
 const dirs=p.type==='fan'?(d.diagonal?STEP_DIAGONAL:STEP_CARDINAL):[[p.dir.dx,p.dir.dy]],valid=new Set(dirs.flatMap(([dx,dy])=>stepEnemyRay(m,dx,dy,d.range)).map(c=>c.col+','+c.row));
 return {...p,cells:p.cells.filter(c=>valid.has(c.col+','+c.row))};
}
const stepApplyOriginal=singleStepApplyPlan;
singleStepApplyPlan=function(m,p){
 const d=stepEnemyDefinition(m);if(!d)return stepApplyOriginal(m,p);
 const from={col:m.col,row:m.row};m._stepAction={type:p.type,at:performance.now(),from,cells:cloneHistoryValue(p.cells),dir:p.dir};
 if(['shot','fan','strike','blast'].includes(p.type)){
  if(p.cells.some(c=>c.col===player.col&&c.row===player.row))damagePlayer(1,m.id);
  if(d.hitsAllies===true)damageMonsterAllies(d,m,new Set(p.cells.map(c=>`${c.col},${c.row}`)),1);
  if(p.type==='shot'||p.type==='fan'){
   const rays=new Map();for(const cell of p.cells){const dx=Math.sign(cell.col-m.col),dy=Math.sign(cell.row-m.row),k=dx+','+dy,old=rays.get(k);if(!old||Math.hypot(cell.col-m.col,cell.row-m.row)>Math.hypot(old.col-m.col,old.row-m.row))rays.set(k,cell);}
   for(const[k,to]of rays){const[dx,dy]=k.split(',').map(Number);singleStepVisualShot(m,to,false,{dx,dy});}
  }
  if(p.type==='blast'){stepVisualEvents.push({type:'blast',col:m.col,row:m.row,at:performance.now()});damageMonster(m,m.hp);}
 }else if(p.type==='charge')stepApplyOriginal(m,p);
 else if(p.jump&&p.path?.length){
  const to=p.path[0];if(singleStepLegal(m,to.col,to.row)&&!(to.col===player.col&&to.row===player.row)){
   m.col=to.col;m.row=to.row;m._visualPath=[];m._stepJump={from,to,at:performance.now(),duration:400};
  }
 }else if(!p.path?.some(c=>c.col===player.col&&c.row===player.row))stepApplyOriginal(m,p);
};
function stepSpawnChild(parent,col,row){
 const cfg=MONSTER_DB.step_small,p=gridToPixel(col,row);
 const child={id:++monsterIdCounter,cfgId:cfg.id,name:cfg.name,col,row,px:parent.px,py:parent.py,hp:cfg.hp,maxHp:cfg.hp,displayHp:cfg.hp,damage:1,aiType:cfg.aiType,size:1,tint:cfg.tint,movementTags:['地面'],predictedPath:[],_visualPath:[],hitFlash:0,shakeX:0,shakeY:0,_spawnedThisTurn:true,_stepJump:{from:{col:parent.col,row:parent.row},to:{col,row},at:performance.now(),duration:300}};
 if(cfg.loot)child._killLoot=preRollLoot(cfg.loot);monsters.push(child);return child;
}
const stepRoomUpdateOriginal=updateRoomCombatState;
updateRoomCombatState=function(){if(stepSplitting)return;return stepRoomUpdateOriginal();};
const stepDamageOriginal=damageMonster;
damageMonster=function(m,amount){
 const d=stepEnemyDefinition(m),alive=m.hp>0;if(!d||!alive)return stepDamageOriginal(m,amount);
 const splitting=m.cfgId==='step_big'&&amount>=m.hp,previous=stepSplitting;if(splitting)stepSplitting=true;
 try{
  stepDamageOriginal(m,amount);
  if(m.hp<=0){stepVisualEvents.push({type:'death',cfgId:m.cfgId,col:m.col,row:m.row,x:m.px,y:m.py,at:performance.now()});
   if(splitting){let count=0;for(let radius=1;radius<COLS+ROWS&&count<2;radius++)for(let row=0;row<ROWS&&count<2;row++)for(let col=0;col<COLS&&count<2;col++){
    if(Math.abs(col-m.col)+Math.abs(row-m.row)!==radius||isWall(col,row)||col===player.col&&row===player.row||monsters.some(o=>isInMonsterFootprint(o,col,row)))continue;stepSpawnChild(m,col,row);count++;
   }}
  }
 }finally{stepSplitting=previous;}
 if(splitting)updateRoomCombatState();
};
