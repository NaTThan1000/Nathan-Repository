// 正式版单步调度：保留楼层、配置、掉落与道具；不再进入旧 MP/AP 与回溯循环。
// 普通怪物由 single-step-enemies 接入新规则；Boss通过旧规则模拟获得锁定行动。
const SINGLE_STEP={bonus:0,step:0,room:null,plans:new Map(),legacy:new Map(),damaged:false,busy:false,shots:[],error:null};
const stepOldLoadMonsterDB=loadMonsterDB;
function singleStepBasic(m){return m.cfgId==='crack_maw_i'?'melee':m.cfgId==='flying_eye_i'?'ranged':null;}
function singleStepBlocksBullet(col,row){return col<0||row<0||col>=COLS||row>=ROWS||!!TILE_BLOCKS_BULLET[currentRoomGrid?.[col]?.[row]];}
function singleStepFootprint(m,col=m.col,row=m.row){const out=[];for(let x=0;x<(m.size||1);x++)for(let y=0;y<(m.size||1);y++)out.push({col:col+x,row:row+y});return out;}
function singleStepLegal(m,col,row){return singleStepFootprint(m,col,row).every(p=>!isWall(p.col,p.row)&&!monsters.some(o=>o!==m&&o.hp>0&&isInMonsterFootprint(o,p.col,p.row)));}
function singleStepRay(m,dx,dy,range){const out=[];for(let n=1;n<=range;n++){const col=m.col+dx*n,row=m.row+dy*n;if(singleStepBlocksBullet(col,row)||(dx&&dy&&(singleStepBlocksBullet(col-dx,row)||singleStepBlocksBullet(col,row-dy))))break;if(monsters.some(o=>o!==m&&isInMonsterFootprint(o,col,row)))break;out.push({col,row});}return out;}
function singleStepPick(cells){return cells.length?cells[Math.floor(monsterActionRandom()*cells.length)]:null;}
function singleStepBasicPlan(m,kind){
 const dx=player.col-m.col,dy=player.row-m.row,ax=Math.abs(dx),ay=Math.abs(dy);
 if((dx===0||dy===0||(kind==='ranged'&&ax===ay))&&ax+ay>0&&Math.max(ax,ay)<=3){const dir={dx:Math.sign(dx),dy:Math.sign(dy)},cells=singleStepRay(m,dir.dx,dir.dy,3);if(cells.some(p=>p.col===player.col&&p.row===player.row))return {type:kind==='melee'?'charge':'shot',cells,dir};}
 let next=null,type='wander';
 if(ax+ay<=(kind==='melee'?4:5)){
  type='chase';const queue=[{col:m.col,row:m.row,first:null}],seen=new Set([m.col+','+m.row]);
  for(let i=0;i<queue.length;i++){const p=queue[i];if(Math.abs(p.col-player.col)+Math.abs(p.row-player.row)===1){next=p.first;break;}for(const [dc,dr]of [[0,-1],[0,1],[-1,0],[1,0]]){const col=p.col+dc,row=p.row+dr,k=col+','+row;if(seen.has(k)||!singleStepLegal(m,col,row)||(col===player.col&&row===player.row))continue;seen.add(k);queue.push({col,row,first:p.first||{col,row}});}}
 }else next=singleStepPick([[0,-1],[0,1],[-1,0],[1,0]].map(([dc,dr])=>({col:m.col+dc,row:m.row+dr})).filter(p=>singleStepLegal(m,p.col,p.row)&&!(p.col===player.col&&p.row===player.row)));
 return {type,cells:[],path:next?[next]:[]};
}
function singleStepLegacyPlan(m){
 let state=SINGLE_STEP.legacy.get(m.id);if(state?.queue.length)return state.queue.shift();
 const clone=cloneHistoryValue(m);delete clone._stepPlan;clone._visualPath=[];clone._spawnedThisTurn=false;
 const input=getDangerSimulationInput();input.counter=state?.counter||0;
 const configs={...MONSTER_DB},blockers=monsters.filter(o=>o!==m).map(o=>{const b=cloneHistoryValue(o),key='step-blocker-'+o.id;configs[key]={...MONSTER_DB[o.cfgId],id:key,actions:[{type:'stationary'}],actionMode:{mode:'sequence'}};b.cfgId=key;b.aiType=(o.size||1)>1?'boss_chase':'stationary';b.predictedPath=[];b._visualPath=[];return b;});
 input.constants={...input.constants,MONSTER_DB:configs};
 input.world=JSON.parse(JSON.stringify({monsters:[clone,...blockers],player:{...player},bombs:[],currentRoomGrid,tileData,currentRoomId,pendingBossLanding:state?.landing||null}));
 if(input.world.pendingBossLanding)input.world.pendingBossLanding.monster=input.world.monsters[0];
 if(!dangerSimulationFactory)dangerSimulationFactory=createDangerSimulationFactory();
 const result=dangerSimulationFactory(input,(combatRng=(Math.imul(combatRng,1664525)+1013904223)>>>0));
 const end=result.monsters.find(o=>o.id===m.id)||clone;
 const cells=[...(result.bySource.get(m.id)||[])].map(k=>{const [col,row]=k.split(',').map(Number);return {col,row};});
 const path=result.dukeFrames.get(m.id)?.length?result.dukeFrames.get(m.id):result.trace.get(m.id)||end.predictedPath?.map(p=>({col:p.toCol,row:p.toRow}))||[];
 const jump=m.aiType==='boss_jumper',burst=m.aiType==='charge'&&end._turnAction?.type==='charge_line',queue=[];
 // 普通移动拆成每步一格；冲刺和跳跃保留为一次有预告的特殊动作。
 if(jump||burst)queue.push({type:jump?'legacy-jump':'legacy-charge',path:path.length?path:[{col:end.col,row:end.row}],cells,friendly:jump&&!!state?.landing});
 else{
  const shoot=[...(result.areasByPhase.get(m.id)?.shoot||[])].map(k=>{const [col,row]=k.split(',').map(Number);return {col,row};});
  if(shoot.length)queue.push({type:'legacy-attack',path:[],cells:shoot});
  for(const p of path)queue.push({type:'legacy-move',path:[p],cells:singleStepFootprint(m,p.col,p.row)});
  for(const effect of Array.isArray(end._turnAction?.after_effect)?end._turnAction.after_effect:[]){
   if(effect.type!=='attack_adjacent')continue;const area=[];
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])for(let n=1;n<=(effect.range??1);n++){const col=end.col+dx*n,row=end.row+dy*n;if(isWall(col,row))break;area.push({col,row});}
   queue.push({type:'legacy-attack',cells:area,path:[],damage:effect.damage??.5,friendly:true});
  }
  if(!queue.length)queue.push({type:'legacy-action',path:[],cells:[]});
 }
 const last=queue.at(-1);last.commit=end;last.landing=result.pendingBossLanding;last.complete=true;
 state={queue,counter:(state?.counter||0)+1,landing:state?.landing||null};SINGLE_STEP.legacy.set(m.id,state);
 return queue.shift();
}
function singleStepPlan(){
 for(const id of SINGLE_STEP.plans.keys())if(!monsters.some(m=>m.id===id))SINGLE_STEP.plans.delete(id);
 for(const m of monsters){if(SINGLE_STEP.plans.has(m.id))continue;const kind=singleStepBasic(m);const plan=kind?singleStepBasicPlan(m,kind):singleStepLegacyPlan(m);SINGLE_STEP.plans.set(m.id,plan);}
}
function singleStepReset(){SINGLE_STEP.bonus=0;SINGLE_STEP.step=0;SINGLE_STEP.room=currentRoomId;SINGLE_STEP.plans.clear();SINGLE_STEP.legacy.clear();SINGLE_STEP.shots=[];SINGLE_STEP.error=null;historyOpen=false;actionHistory=[];provisionalDefeats=[];turnState.phase='player_select';pendingPlayerTurnEnd=false;dangerForecast=null;dangerForecastJob=null;dangerReveal=null;singleStepPlan();}
function singleStepPush(m,col,row,dir){
 const sz=m.size||1;let groups;
 if(sz===1&&dir)groups=[[[-dir.dy,dir.dx],[dir.dy,-dir.dx]],[[dir.dx,dir.dy]],[[-dir.dx,-dir.dy]]];else groups=[[[0,-1],[0,1],[-1,0],[1,0]]];
 for(const dirs of groups){const options=dirs.map(([dx,dy])=>({col:player.col+dx,row:player.row+dy})).filter(p=>!isWall(p.col,p.row)&&!(p.col>=col&&p.col<col+sz&&p.row>=row&&p.row<row+sz)&&!monsters.some(o=>o!==m&&isInMonsterFootprint(o,p.col,p.row)));const p=singleStepPick(options);if(p){player.col=p.col;player.row=p.row;const q=gridToPixel(p.col,p.row);player.targetPx=q.x;player.targetPy=q.y;checkSpikeUnderPlayer();return true;}}
 SINGLE_STEP.error='挤出无合法落点';return false;
}
function singleStepApplyPlan(m,p){
 const before={col:player.col,row:player.row},origin={col:m.col,row:m.row};let hit=false;
 if(p.type==='shot'||p.type==='legacy-attack'||p.type==='legacy-action'||p.type==='legacy-jump'){
  if(p.cells.some(c=>c.col===player.col&&c.row===player.row)){damagePlayer(p.damage??(m.damage||1),m.id);hit=true;}
  if(p.friendly)for(const other of [...monsters])if(other!==m&&p.cells.some(c=>isInMonsterFootprint(other,c.col,c.row)))damageMonster(other,p.damage??.5);
  if(p.type==='shot'){scrapEffects.monsterActed(m.id);singleStepVisualShot(m,p.cells.at(-1),false,p.dir);}
  if(p.type==='legacy-attack'&&!p.friendly){const rays=new Map();for(const cell of p.cells){const dx=Math.sign(cell.col-m.col),dy=Math.sign(cell.row-m.row),key=dx+','+dy;if(!dx&&!dy)continue;const old=rays.get(key);if(!old||Math.hypot(cell.col-m.col,cell.row-m.row)>Math.hypot(old.col-m.col,old.row-m.row))rays.set(key,cell);}for(const [key,to]of rays){const [dx,dy]=key.split(',').map(Number);singleStepVisualShot(m,to,false,{dx,dy});}scrapEffects.monsterActed(m.id);}
 }
 for(const dest of p.path||[]){
  for(const push of dest.pushed||[]){const other=monsters.find(o=>o.id===push.id);if(!other||!singleStepLegal(other,push.col,push.row)||(push.col===player.col&&push.row===player.row))continue;other.col=push.col;other.row=push.row;(other._visualPath||(other._visualPath=[])).push({col:push.col,row:push.row});}
  const legal=p.type==='legacy-jump'?isValidLandingZone(dest.col,dest.row,m.size||1)&&!singleStepFootprint(m,dest.col,dest.row).some(c=>monsters.some(o=>o!==m&&isInMonsterFootprint(o,c.col,c.row))):singleStepLegal(m,dest.col,dest.row);
  if(!legal)break;
  const overlap=singleStepFootprint(m,dest.col,dest.row).some(c=>c.col===player.col&&c.row===player.row);
  if(overlap){if(!hit){damagePlayer(m.damage||1,m.id);hit=true;}if(!singleStepPush(m,dest.col,dest.row,p.dir))break;}
  m.col=dest.col;m.row=dest.row;(m._visualPath||(m._visualPath=[])).push({col:m.col,row:m.row});
  if(currentRoomGrid[m.col]?.[m.row]===TILE.SPIKE&&!m.movementTags?.includes('飞行'))damageMonster(m,5);
 }
 if(p.type==='charge'){
  for(const dest of p.cells){if(!singleStepLegal(m,dest.col,dest.row))break;if(dest.col===player.col&&dest.row===player.row){if(!hit){damagePlayer(m.damage||1,m.id);hit=true;}if(!singleStepPush(m,dest.col,dest.row,p.dir))break;}m.col=dest.col;m.row=dest.row;(m._visualPath||(m._visualPath=[])).push({...dest});}
 }
  if(p.complete){
  const state=SINGLE_STEP.legacy.get(m.id);if(state)state.landing=p.landing;
  // 只提交旧行为的内部阶段，位置与生命由本步真实碰撞结算维护。
  for(const [key,value]of Object.entries(p.commit||{}))if(key.startsWith('jumper')||['_charging','_shaking','_diagDir','_dukeFirstTurn','_turnAction','_turnAfterAction','_landingPhase'].includes(key))m[key]=cloneHistoryValue(value);
  if(m.aiType==='boss_duke'&&m._turnAfterAction?.type==='summon')handleDukeSummon(m);
 }
 if(p.type==='legacy-jump'&&(origin.col!==m.col||origin.row!==m.row)){m.jumpFrom=origin;m.jumpTo={col:m.col,row:m.row};m.jumpType=p.commit?.jumpType||'small';m.jumpAnimTimer=m.jumpType==='big_land'?.55:.4;m._visualPath=[];}
 return before;
}
function singleStepVisualShot(source,to,playerShot,dir,hitIds=[]){if(!to)return;const a=gridToPixel(source.col,source.row),b=gridToPixel(to.col,to.row);SINGLE_STEP.shots.push({from:a,to:b,start:performance.now(),player:playerShot,owner:playerShot?null:source.id,dir,hitIds,travel:Math.hypot(b.x-a.x,b.y-a.y)/(CFG.BULLET_SPEED*(playerShot?1:.6))*1000});}
function singleStepPickup(){autoPickupResources();for(let i=itemsOnGround.length-1;i>=0;i--){const item=itemsOnGround[i];if(item.col!==player.col||item.row!==player.row)continue;if(isShopSlotCell(item.col,item.row)){tryBuyShopItem(item.col,item.row);continue;}if(!playerInventory.includes(item.cfgId)){applyItem(item.cfgId);itemsOnGround.splice(i,1);updateItemBar();}}}
function singleStepAct(type,dir){
 if(!gameStarted||gameOver||worldMapOpen||transition?.active||floorFadeBusy||SINGLE_STEP.busy)return false;
 if(SINGLE_STEP.room!==currentRoomId)singleStepReset();
 const old={col:player.col,row:player.row},frozen=SINGLE_STEP.bonus>0;SINGLE_STEP.damaged=false;const v=DIR_VEC[dir];
 if(type==='move'){
  if(tryWalkIntoDoor(player.col,player.row,dir))return true;
  const col=player.col+v.dx,row=player.row+v.dy;if(isWall(col,row)||monsters.some(m=>isInMonsterFootprint(m,col,row)))return false;
  const bomb=bombs.find(b=>b.roomId===currentRoomId&&b.col===col&&b.row===row);if(bomb)pushBomb(bomb,v.dx,v.dy);
  player.col=col;player.row=row;const q=gridToPixel(col,row);player.targetPx=q.x;player.targetPy=q.y;player.animTime=0;player.shootTimer=0;
 }else if(type==='shoot'){
  SFX.shoot();totalShots++;let end=old;const hit=new Set();
  for(let n=1;n<=Math.floor(playerStats.range);n++){const col=old.col+v.dx*n,row=old.row+v.dy*n;if(col<0||row<0||col>=COLS||row>=ROWS)break;end={col,row};
   if(singleStepBlocksBullet(col,row)){if(tileData[col+','+row])hitTile(col,row,playerStats.attack);break;}
   const m=monsters.find(m=>!m.jumperVanished&&!hit.has(m.id)&&isInMonsterFootprint(m,col,row));if(m){hit.add(m.id);damageMonster(m,playerStats.attack);if(!player.hasPiercing)break;}
  }singleStepVisualShot(old,end,true,{dx:v.dx,dy:v.dy},[...hit]);player.shootTimer=.4;
 }else if(type==='bomb'){if(playerResources.bombs<=0)return false;placeBomb(player.col,player.row);}
 else return false;
 player.facing=dir||player.facing;
 SINGLE_STEP.busy=true;
 try{
  if(player.invincibleSteps>0)player.invincibleSteps--;
  checkSpikeUnderPlayer();let dodged=false;
  if(!frozen){
   tickBombCountdown();
   for(const m of [...monsters]){if(!monsters.includes(m))continue;const saved=SINGLE_STEP.plans.get(m.id);if(!saved)continue;const plan=singleStepResolvePlan(m,saved);
    const wasHit=plan.cells.some(p=>p.col===old.col&&p.row===old.row),nowHit=plan.cells.some(p=>p.col===player.col&&p.row===player.row);
    if(type==='move'&&wasHit&&!nowHit)dodged=true;
    singleStepApplyPlan(m,plan);SINGLE_STEP.plans.delete(m.id);
    if(singleStepRecovery(m,plan))SINGLE_STEP.plans.set(m.id,{type:'recover',cells:[]});
   }
  }
  singleStepPickup();updateRoomCombatState();SINGLE_STEP.step++;turnState.turnNumber=SINGLE_STEP.step;
  if(frozen)SINGLE_STEP.bonus=SINGLE_STEP.damaged?0:SINGLE_STEP.bonus-1;
  else if(dodged&&!SINGLE_STEP.damaged&&!gameOver)SINGLE_STEP.bonus=2;
  singleStepPlan();
  if(currentRoomGrid[player.col]?.[player.row]===TILE.LADDER){const next=currentFloor.floorNum+1;if(next>Object.keys(FLOOR_CONFIG).length)triggerVictoryScreen();else enterFloor(next);}
  updateDoorsLocked();updateUI();updateActionBar();return true;
 }finally{SINGLE_STEP.busy=false;}
}
// 开始、换房和重置复用原有流程，入口处生成首个已锁定行动。
resetTurnAP=function(){historyOpen=false;turnState.phase='player_select';turnState.mAP=turnState.aAP=1;turnState.maxMAP=turnState.maxAAP=1;turnState.reachableTiles=new Set();if(!SINGLE_STEP.busy)singleStepReset();};
actionHistoryActive=function(){return false;};syncActionHistory=function(){};saveCheckpoint=function(){currentCheckpoint={playerCol:player.col,playerRow:player.row};checkpointMAP=1;checkpointAAP=1;};
updateDangerForecast=function(){};updateFlyingEyeExclaim=function(){};
const stepOldDamage=damagePlayer;
damagePlayer=function(amount,id=null){const hp=playerStats.hp+(playerResources.blueHearts||0);stepOldDamage(amount,id);if(playerStats.hp+(playerResources.blueHearts||0)<hp){SINGLE_STEP.damaged=true;SINGLE_STEP.bonus=0;}};
const stepOldRoomUpdate=updateRoomCombatState;
updateRoomCombatState=function(){stepOldRoomUpdate();if(!SINGLE_STEP.busy&&SINGLE_STEP.room!==currentRoomId)singleStepReset();};
const stepOldFinishTransition=finishTransition;
finishTransition=function(){stepOldFinishTransition();singleStepReset();};
const stepOldEnterFloor=enterFloor;
enterFloor=function(n){stepOldEnterFloor(n);singleStepReset();};
document.removeEventListener('keydown',processHistoryKey);
document.addEventListener('keydown',e=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
 if(!gameStarted||gameOver||document.getElementById('start-menu-modal').classList.contains('show')){handlePlayerKey(e);return;}
 if(e.code==='KeyM'){e.preventDefault();if(!e.repeat)toggleWorldMap();return;}
 if(worldMapOpen){if(e.code==='Escape')toggleWorldMap(false);return;}
 const dirs={KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right',ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
 if(dirs[e.code]||['Space','Escape','KeyE','KeyR'].includes(e.code))e.preventDefault();if(e.repeat)return;
 if(dirs[e.code])singleStepInputAction(e.code.startsWith('Arrow')?'shoot':'move',dirs[e.code]);
 else if(e.code==='KeyE')singleStepInputAction('bomb',player.facing);
   else if(e.code==='KeyR'){resetGameToFloor1();showStartMenu();}
});
drawReachableOverlay=function(){};
drawDangerOverlay=function(){if(!gameStarted||worldMapOpen)return;const seen=new Set();for(const m of monsters){const p=SINGLE_STEP.plans.get(m.id);for(const cell of p?.cells||[]){const k=cell.col+','+cell.row;if(seen.has(k))continue;seen.add(k);const q=cellRect(cell.col,cell.row);scrapDraw('redGrid',q.xL,q.yT,q.w,q.h,.55);}}};
drawBullets=function(){const now=performance.now();SINGLE_STEP.shots=SINGLE_STEP.shots.filter(s=>now-s.start<s.travel+250);for(const s of SINGLE_STEP.shots){const age=now-s.start,t=Math.min(1,age/Math.max(1,s.travel)),x=s.from.x+(s.to.x-s.from.x)*t,y=s.from.y+(s.to.y-s.from.y)*t;if(age<s.travel){if(s.player){const dir=Math.abs(s.dir.dx)>Math.abs(s.dir.dy)?s.dir.dx<0?'left':'right':s.dir.dy<0?'up':'down';scrapDraw('bullet-'+dir+Math.floor(age/70)%3,x-12,y-10.6,24,21.2);}else{ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(s.dir.dy,s.dir.dx));scrapDraw('remote',-4.4,-5,8.8,10);ctx.restore();}}else scrapDraw('impact'+Math.min(3,Math.floor((age-s.travel)/250*4)),x-10,y-15,20,30);}};
const stepOldHUD=scrapUpdateHUD;
scrapUpdateHUD=function(){stepOldHUD();const ap=document.getElementById('scrap-ap'),mp=document.getElementById('scrap-mp');if(ap)ap.textContent=SINGLE_STEP.bonus?'额外行动 '+SINGLE_STEP.bonus+'/2':'单步行动';if(mp)mp.textContent=SINGLE_STEP.bonus?'子弹时间':'移动 / 射击';const phase=document.getElementById('scrap-phase');if(phase)phase.textContent=SINGLE_STEP.bonus?'子弹时间':'自由思考';const rewind=document.getElementById('ui-rewind-info');if(rewind)rewind.style.display='none';};
const stepOldTextOverlay=updateTextOverlay;
updateTextOverlay=function(){stepOldTextOverlay();for(const badge of document.querySelectorAll('.txt-aap'))badge.style.display='none';};
updateActionBar=function(){const bar=document.getElementById('action-bar');bar.textContent=SINGLE_STEP.error||'WASD移动一格 · 方向键射击 · E炸弹 · M地图'+(SINGLE_STEP.bonus?' · 子弹时间剩余 '+SINGLE_STEP.bonus+' 次':'');};
const stepOldGameLoop=gameLoop;
gameLoop=function(timestamp){
 if(transition?.active){stepOldGameLoop(timestamp);return;}
 const dt=Math.min(.1,Math.max(0,(timestamp-lastTime)/1000));lastTime=timestamp;
 if(gameStarted&&!gameOver&&!worldMapOpen){updateMove(dt);animateMonsters(dt);updateParticles(dt);updateDamageNumbers(dt);player.shootTimer=Math.max(0,player.shootTimer-dt);player.hitFlash=Math.max(0,player.hitFlash-dt);for(const m of monsters){m.hitFlash=Math.max(0,(m.hitFlash||0)-dt);m.jumpAnimTimer=Math.max(0,(m.jumpAnimTimer||0)-dt);}battleStartAnim.active=false;updateTextOverlay();}
 render();requestAnimationFrame(gameLoop);
};
// 旧说明只在新正式包中替换；配置中的移速/射速仍保留，但不再增加行动次数。
for(const el of document.querySelectorAll('p,li,small,.help-text'))if(el.childElementCount===0&&/Esc.*(回溯|重置)|空格.*(回合|结束)|Space.*回合/.test(el.textContent))el.textContent='WASD移动一格，方向键射击；安全闪避获得2次额外行动。E炸弹，M地图，R重新开始。';
const stepEnd=document.getElementById('scrap-end');if(stepEnd)stepEnd.style.display='none';
for(const row of document.querySelectorAll('.help-row')){const keys=row.querySelector('.help-keys')?.textContent||'',desc=row.querySelector('.help-desc');if(!desc)continue;if(/Space/.test(keys)){row.style.display='none';continue;}if(/Esc/.test(keys))desc.textContent='关闭地图；战斗操作不可回溯';else if(/[↑↓←→]/.test(keys))desc.textContent='瞬发射击一次；普通行动时场景推进一步';else if(/W|A|S|D/.test(keys))desc.textContent='移动一格；安全闪避确定攻击获得2次额外行动';}
