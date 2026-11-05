// 在独立闭包中运行共享规则，预测不会触碰真实游戏对象、DOM、音效或掉落。
let dangerSimulationFactory = null;
function buildDangerRuleBody(shared) {
  const names = new Set();
  if (!Array.isArray(shared) || shared.filter(fn => fn === updateBullets).length !== 1) {
    throw Error('危险预测规则清单必须包含且仅包含一次 updateBullets');
  }
  return shared.map(fn => {
    if (typeof fn !== 'function' || !fn.name || names.has(fn.name)) {
      throw Error('危险预测规则必须是有唯一名称的函数');
    }
    names.add(fn.name);
    const source = Function.prototype.toString.call(fn);
    if (fn !== updateBullets) return source;
    const target = 'if (mBg.col === player.col && mBg.row === player.row)';
    const count = source.split(target).length - 1;
    if (count !== 1) throw Error('危险预测子弹规则匹配失败：预期1处，实际'+count+'处，请同步检查模拟适配');
    return source.replace(target, 'if (false)');
  }).join('\n');
}
function createDangerSimulationFactory() {
  const shared = getDangerSharedRules();
  const body = buildDangerRuleBody(shared);
  return new Function('input','seed','decisions',
    '"use strict";'+
    'const Math=Object.create(globalThis.Math);Math.random=()=>0.5;'+
    'const console={log(){}};'+
    'const {COLS,ROWS,CELL,WALL,FLOOR_L,FLOOR_R,FLOOR_T,FLOOR_B,CFG,TILE,TILE_WALKABLE,TILE_BLOCKS_BULLET,DIR_VEC,MONSTER_DB,RESOURCE_DB,DOOR_POS}=input.constants;'+
    'let {monsters,player,bombs,currentRoomGrid,tileData,currentRoomId,pendingBossLanding}=JSON.parse(JSON.stringify(input.world));'+
    'if(pendingBossLanding)pendingBossLanding.monster=monsters.find(m=>m.id===pendingBossLanding.monster.id);'+
    'let turnState={phase:"monster_turn",monsterTurnCounter:input.counter};'+
    'let currentFloor={rooms:[]},particles=[],damageNumbers=[],bullets=[],inCombat=true;'+
    'const SEQUENTIAL_ACTION={betweenSeconds:0.12};let forcedLandingPending=false;let movementPlanning=false,movementEventMonsterId=null,movementEventStep=0,movementEvents=[];function scheduleMovementEvent(){}function releaseMovementEvents(){}let monsterExecTimer=0,monsterExecStepIdx=0,finished=false,monsterGroupPhase="idle",monsterActionOrder=[];const DUKE_ANIM_SPEED=200;'+
    'const cells=new Set(),bySource=new Map(),byPhase=new Map(),random=makeMonsterTurnRandom(seed);let choiceCursor=0;'+
    'const monsterChoiceOverride=decisions ? weights=>{const n=choiceCursor++;if(n>=decisions.length)throw {dangerBranch:true,weights};return decisions[n];}:null;'+
    'const SFX={boom(){}};'+
    'function monsterActionRandom(){return random();}'+
    'function noteDangerCell(c,r,id=-1,phase="move"){if(c<0||r<0||c>=COLS||r>=ROWS)return;const k=c+","+r;cells.add(k);if(!bySource.has(id))bySource.set(id,new Set());bySource.get(id).add(k);if(!byPhase.has(id))byPhase.set(id,{shoot:new Set(),move:new Set(),environment:new Set()});if(c===player.col&&r===player.row)byPhase.get(id)[phase].add(k);}'+
    'function damagePlayer(){}'+
    'function damageMonster(m,n){m.hp-=n;if(m.hp<=0){const i=monsters.indexOf(m);if(i>=0)monsters.splice(i,1);}}'+
    'function hitTile(c,r,n){const k=c+","+r,t=tileData[k];if(!t)return false;t.hp-=n;if(t.hp<=0){delete tileData[k];currentRoomGrid[c][r]=TILE.FLOOR;return true;}return false;}'+
    'function handleDukeSummon(){}function updateDoorsLocked(){}'+
    'function shatterBullet(b){b.phase="dying";b.shatterTimer=0;}'+
    'function bulletHitMonster(){return null;}'+
    'function finishMonsterTurn(){if(hasPendingMonsterAttack())return;finished=true;}'+
    body+
    '\nexecuteMonsterTurnActions();'+
    'for(let frame=0;frame<2400;frame++){const dt=input.dt||1/120;updateBullets(dt);updateDukeAnim(dt);player.targetPx=null;player.targetPy=null;forcedLandingPending=false;if(!finished)updateMonsterTurn(dt);for(const m of monsters){const p=gridToPixel(m.col,m.row);m.px=p.x;m.py=p.y;m._visualPath=[];}'+
    'for(const m of [...monsters])if(m.jumpAnimTimer>0){m.jumpAnimTimer=Math.max(0,m.jumpAnimTimer-dt);if(m.jumpAnimTimer===0&&m.jumpType==="charge_vanish"&&m._landingPhase===0){m._landingPhase=1;finishBossLandingPhase2(m);}}'+
    'if(finished&&!bullets.some(b=>b.phase==="flying")&&!monsters.some(m=>m.jumpType==="charge_vanish"&&m.jumpAnimTimer>0))break;'+
    'if(frame===2399)throw Error("危险模拟未结束");}'+
    'return {cells,bySource,byPhase,monsters,player,bombs,currentRoomGrid};');
}
function getDangerSimulationInput() {
  return {constants:{COLS,ROWS,CELL,WALL,FLOOR_L,FLOOR_R,FLOOR_T,FLOOR_B,CFG,TILE,TILE_WALKABLE,TILE_BLOCKS_BULLET,DIR_VEC,MONSTER_DB,RESOURCE_DB,DOOR_POS},world:{monsters,player,bombs,currentRoomGrid,tileData,currentRoomId,pendingBossLanding},counter:turnState.monsterTurnCounter,immune:player.invincibleSteps>(turnState.phase==='player_select'?turnState.mAP:0)};
}
function simulateResolvedDanger(seed) {
  if(!dangerSimulationFactory)dangerSimulationFactory=createDangerSimulationFactory();
  return dangerSimulationFactory(getDangerSimulationInput(),seed);
}

// 穷举独立模拟中的有效随机分支；并集为可能危险，交集为确定危险。
function createDangerForecastJob(input,simulation){return {input,simulation,seed:(Math.imul(combatRng,1664525)+1013904223)>>>0,done:false,outcomes:0};}
function advanceDangerForecastJob(job){
 if(job.done)return true;const result=job.simulation(job.input,job.seed),byMonster=new Map();
 for(const m of job.input.world.monsters){const cells=new Set(result.bySource.get(m.id)||[]);byMonster.set(m.id,{red:cells,yellow:new Set()});}
 job.result={red:new Set(result.cells),yellow:new Set(),byMonster,byPhase:result.byPhase};job.outcomes=1;job.done=true;return true;
}
let dangerForecastJob=null;
let dangerForecastKey=null;
function getDangerForecastKey() {
  return JSON.stringify({room:currentRoomId,counter:turnState.monsterTurnCounter,p:[player.col,player.row,player.invincibleSteps,turnState.mAP],monsters:monsters.map(m=>[m.id,m.cfgId,m.col,m.row,m.hp,m.size,m.movementTags,m._diagDir,m._spawnedThisTurn,m.jumperVanished,m.jumperPhase,m.jumperJustLanded,m._charging,m.jumperCheckRepeated]),bombs:bombs.map(b=>[b.id,b.col,b.row,b.timer,b.roomId]),grid:currentRoomGrid,tiles:tileData,landing:pendingBossLanding&&[pendingBossLanding.monster.id,pendingBossLanding.targetCol,pendingBossLanding.targetRow,pendingBossLanding.landAction]});
}
// 危险来源优先级与完整范围（炸弹环境提示单独保留）。
function getMonsterDisplayArea(m,threat){
 const cfg=MONSTER_DB[m.cfgId]||{},actions=cfg.actions||[],cells=new Set([...threat.red,...threat.yellow]);
 if((cfg.aiType==='chase')&&actions.some(a=>a.type==='chase')){
  const a=actions.find(x=>x.type==='chase'),movement=Math.max(0,...(a.steps||[0])),attack=Math.max(0,...(Array.isArray(a.after_effect)?a.after_effect:[]).filter(e=>e.type==='attack_adjacent').map(e=>e.range??1)),radius=movement+attack;
  for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++)if(Math.abs(c-m.col)+Math.abs(r-m.row)<=radius)cells.add(c+','+r);
  return cells;
 }
 const shots=actions.filter(a=>a.type==='shoot_fan'||a.type==='shoot_single');
 if(shots.length){for(const a of shots){const dirs=a.type==='shoot_fan'?['up','down','left','right','up-left','up-right','down-left','down-right']:['up','down','left','right'];for(const d of dirs){const v=DIR_VEC[d];for(let n=1;n<=(a.range||4);n++){let c=m.col+v.dx*n,r=m.row+v.dy*n;if(c<0||c>=COLS||r<0||r>=ROWS)break;const tile=currentRoomGrid?.[c]?.[r];if(tile!==undefined&&TILE_BLOCKS_BULLET[tile])break;cells.add(c+','+r);}}}return cells;}
 if(cfg.aiType==='charge'){
  const a=actions.find(x=>x.type==='charge_line'),range=Math.max(0,...(a?.steps||[]));
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){let c=m.col,r=m.row;for(let n=0;n<range;n++){const nc=c+dx,nr=r+dy;if(isWall(nc,nr)||(dx&&dy&&(isWall(nc,r)||isWall(c,nr))))break;cells.add(nc+','+nr);c=nc;r=nr;}}return cells;
 }
 if(cfg.aiType==='boss_jumper'){
  const sz=m.size||2;
  if(m._charging&&pendingBossLanding?.monster?.id===m.id){const target=pendingBossLanding,land=target.landAction||actions.find(a=>a.type==='jump_big_land'),range=Math.max(0,...(Array.isArray(land?.after_effect)?land.after_effect:[]).filter(e=>e.type==='attack_side').map(e=>e.range??1));for(let c=target.targetCol-range;c<target.targetCol+sz+range;c++)for(let r=target.targetRow-range;r<target.targetRow+sz+range;r++)if(c>=0&&c<COLS&&r>=0&&r<ROWS)cells.add(c+','+r);return cells;}
  const steps=Math.max(0,...actions.filter(a=>a.type==='jump_small').flatMap(a=>a.steps||[]));
  for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){const dc=Math.max(m.col-c,0,c-(m.col+sz-1)),dr=Math.max(m.row-r,0,r-(m.row+sz-1));if(dc+dr<=steps)cells.add(c+','+r);}return cells;
 }
 for(const k of threat.red)cells.add(k);for(const k of threat.yellow)cells.add(k);return cells;
}
function selectMonsterThreat(result,forcedId=null){
 const at=player.col+','+player.row,env=result.byMonster.get(-1),envRed=new Set(env?.red||[]),envYellow=new Set(env?.yellow||[]);
 const ordered=monsters.filter(m=>m.hp>0&&!m.jumperVanished).slice().sort((a,b)=>Math.max(Math.abs(player.col-a.col),Math.abs(player.row-a.row))-Math.max(Math.abs(player.col-b.col),Math.abs(player.row-b.row))||a.id-b.id);
 for(const phase of ['shoot','move'])for(const m of ordered){if(forcedId!==null&&forcedId!==m.id)continue;const threat=result.byMonster.get(m.id),by=result.byPhase.get(m.id);if(!threat||!by||!by[phase].size)continue;
  const red=getMonsterDisplayArea(m,threat);for(const k of envRed)red.add(k);for(const k of red)envYellow.delete(k);return {red,yellow:envYellow,monsterId:m.id};}
 for(const k of envRed)envYellow.delete(k);return {red:envRed,yellow:envYellow,monsterId:null};
}
function promoteMonsterThreat(id){
 if(lockedThreatId!==id)fallbackThreatHold=0.65;lockedThreatId=id;
 const result=dangerForecastJob?.result,display=result?selectMonsterThreat(result,id):null;
 if(dangerReveal)dangerReveal=display&&display.monsterId===id?display:{red:new Set(),yellow:new Set(),monsterId:id};
}
function flushMonsterHits(){if(monsterTurnHit||!pendingMonsterHits.length)return;const hit=pendingMonsterHits.shift();promoteMonsterThreat(hit.attackerId);damagePlayer(hit.amount,hit.attackerId);}
function reselectMonsterAfterDeath(){
 if(monsterTurnHit)return;flushMonsterHits();if(monsterTurnHit)return;
 const next=dangerForecastJob?.result?selectMonsterThreat(dangerForecastJob.result):null;
 if(next&&next.monsterId!==null)promoteMonsterThreat(next.monsterId);else{lockedThreatId=null;if(dangerReveal)dangerReveal={red:new Set(next?.red||[]),yellow:new Set(next?.yellow||[]),monsterId:null};}
}

function currentThreatId(){if(!inCombat)return null;const layer=dangerReveal||(turnState.phase==='player_select'?dangerForecast:null);return layer?.monsterId??null;}

function updateDangerForecast() {
  if(!inCombat||turnState.phase!=='player_select')return;
  const key=getDangerForecastKey();
  if(key!==dangerForecastKey) {
    dangerForecastKey=key;dangerForecast=null;
    if(!dangerSimulationFactory)dangerSimulationFactory=createDangerSimulationFactory();
    const input=getDangerSimulationInput();
    input.world=JSON.parse(JSON.stringify(input.world));
    dangerForecastJob=createDangerForecastJob(input,dangerSimulationFactory);
    updateUI();
  }
  if(dangerForecastJob&&!dangerForecastJob.done) {
    const deadline=performance.now()+8;
    do {advanceDangerForecastJob(dangerForecastJob,1);} while(!dangerForecastJob.done&&performance.now()<deadline);
    if(dangerForecastJob.done) {dangerForecast=selectMonsterThreat(dangerForecastJob.result);updateUI();}
  }
}
