// 行动记录保存完整局面；旧检查点仅供既有预测/兼容检查使用。
let actionHistory=[], historyRoom=null, historyOpen=false, historyRestoring=false;
let provisionalDefeats=[],historyRevision=0,historyConfirmRequested=false;
function cloneHistoryValue(v){
 if(v===null||typeof v!=='object')return v;
 if(v instanceof Map)return new Map([...v].map(([k,x])=>[k,cloneHistoryValue(x)]));
 if(v instanceof Set)return new Set([...v].map(cloneHistoryValue));
 if(Array.isArray(v))return v.map(cloneHistoryValue);
 const out={};for(const k of Object.keys(v))out[k]=cloneHistoryValue(v[k]);return out;
}
function actionHistoryActive(){return historyOpen&&historyRoom===currentRoomId&&inCombat&&turnState.phase==='player_select';}
function captureActionState(){
 const baseline=turnSnapshot;saveTurnSnapshot();const snapshot=cloneHistoryValue(turnSnapshot);turnSnapshot=baseline;
 const room=currentFloor?.rooms.find(r=>r.id===currentRoomId);
 return {snapshot,player:cloneHistoryValue(player),stats:cloneHistoryValue(playerStats),resources:cloneHistoryValue(playerResources),
  monsters:cloneHistoryValue(monsters),bullets:cloneHistoryValue(bullets),bombs:cloneHistoryValue(bombs),
  turn:cloneHistoryValue(turnState),defeats:cloneHistoryValue(provisionalDefeats),
  room:room?{bossLadderPlaced:room.bossLadderPlaced,_shopSlots:cloneHistoryValue(room._shopSlots)}:null,
  counters:{monsterIdCounter,itemIdCounter,resourceIdCounter,bombIdCounter,monstersKilled,totalShots,itemsCollected:cloneHistoryValue(itemsCollected)},inCombat};
}
function beginActionHistory(){
 historyRoom=currentRoomId;historyOpen=true;provisionalDefeats=[];historyConfirmRequested=false;
 actionHistory=[{code:null,state:captureActionState()}];
}
function syncActionHistory(){
 if(!actionHistoryActive()||historyRestoring)return;
 turnState.reachableTiles=calcReachableTiles(player.col,player.row,Math.max(0,turnState.mAP));
 // 弹体延迟命中等异步结果归入最近输入后的状态，不改写更早的记录。
 if(actionHistory.length>1)actionHistory.at(-1).state=captureActionState();
 // 最后一怪已失能时自动确认，既有炸弹仍按原回合结束流程处理。
 if(provisionalDefeats.length&&!hasMonstersAlive()){historyConfirmRequested=false;preparePlayerTurnEnd(true);return;}
 if(historyConfirmRequested&&!bullets.some(b=>b.source==='player'&&b.phase!=='dying')){historyConfirmRequested=false;preparePlayerTurnEnd();}
}
function restoreActionState(state){
 historyRestoring=true;
 try{
 const baseline=turnSnapshot;turnSnapshot=cloneHistoryValue(state.snapshot);restoreTurnSnapshot();turnSnapshot=baseline;
 Object.assign(player,cloneHistoryValue(state.player));
 Object.assign(playerStats,cloneHistoryValue(state.stats));Object.assign(playerResources,cloneHistoryValue(state.resources));
 monsters=cloneHistoryValue(state.monsters);bullets=cloneHistoryValue(state.bullets);bombs=cloneHistoryValue(state.bombs);
 Object.assign(turnState,cloneHistoryValue(state.turn));provisionalDefeats=cloneHistoryValue(state.defeats);inCombat=state.inCombat;
 const room=currentFloor?.rooms.find(r=>r.id===currentRoomId);if(room&&state.room)Object.assign(room,cloneHistoryValue(state.room));
 ({monsterIdCounter,itemIdCounter,resourceIdCounter,bombIdCounter,monstersKilled,totalShots}=state.counters);itemsCollected=cloneHistoryValue(state.counters.itemsCollected);
 if(state.snapshot.pendingBossLanding&&pendingBossLanding)pendingBossLanding.monster=monsters.find(m=>m.id===state.snapshot.pendingBossLanding.monsterId);
 historyConfirmRequested=false;pendingPlayerTurnEnd=false;forcedLandingPending=false;pendingReachableRefresh=false;
 dangerForecast=null;dangerForecastJob=null;dangerForecastKey=null;dangerReveal=null;dangerRevealRemaining=0;
 movementEvents=[];particles=[];damageNumbers=[];gameOver=false;
 if(typeof scrapEffects!=='undefined')scrapEffects.clearTransient();
 saveCheckpoint();turnState.reachableTiles=calcReachableTiles(player.col,player.row,turnState.mAP);
 buildHearts(playerStats.maxHp);buildBlueHearts();buildApDots('ui-aap-row',turnState.maxAAP);buildApDots('ui-map-row',turnState.maxMAP);
 updateActionBar();updateUI();updateFlyingEyeExclaim();rewindAnim.active=true;rewindAnim.timer=0;
 }finally{historyRestoring=false;}
}
function resetActionHistory(){
 historyRevision++;restoreActionState(actionHistory[0].state);actionHistory=actionHistory.slice(0,1);SFX.rewind();
}
function pathInHistory(state,c,r){
 const live=currentRoomGrid;currentRoomGrid=state.snapshot.currentRoomGrid;
 try{return bfsShortestPath(state.snapshot.playerCol,state.snapshot.playerRow,c,r);}finally{currentRoomGrid=live;}
}
function snapHistoryPosition(){
 const p=gridToPixel(player.col,player.row);player.px=p.x;player.py=p.y;
 player.targetPx=null;player.targetPy=null;player.walkFrame=0;player.animTime=0;
}
function rewindHistoryTo(c,r){
 syncActionHistory();let index=-1,path=null;
 // 相同坐标优先，采用最近状态。
 for(let i=actionHistory.length-2;i>=0;i--){const s=actionHistory[i].state;if(s.snapshot.playerCol===c&&s.snapshot.playerRow===r){index=i;path=[{col:c,row:r}];break;}}
 if(index<0)for(let i=actionHistory.length-2;i>=0;i--){const s=actionHistory[i].state,p=pathInHistory(s,c,r);if(p&&p.length-1<=s.turn.mAP){index=i;path=p;break;}}
 if(index<0)return false;
 historyRevision++;
 restoreActionState(actionHistory[index].state);snapHistoryPosition();actionHistory=actionHistory.slice(0,index+1);
 for(let j=1;j<path.length;j++){
  const next=path[j],dc=next.col-player.col,dr=next.row-player.row;
  const code=dc>0?'KeyD':dc<0?'KeyA':dr>0?'KeyS':'KeyW';
  handlePlayerKey({code,repeat:false,preventDefault(){}});
  if(player.col!==next.col||player.row!==next.row)throw Error('历史重放路径执行失败');
  snapHistoryPosition();
  actionHistory.push({code,state:captureActionState()});
 }
 syncActionHistory();updateActionBar();updateUI();return true;
}
function historyMaximumRange(){
 const out=new Set(turnState.reachableTiles);if(!actionHistoryActive())return out;
 const live=currentRoomGrid;
 try{for(const record of actionHistory){const s=record.state;currentRoomGrid=s.snapshot.currentRoomGrid;for(const key of calcReachableTiles(s.snapshot.playerCol,s.snapshot.playerRow,s.turn.mAP))out.add(key);}}
 finally{currentRoomGrid=live;}return out;
}
function processHistoryKey(e){
 if(e.code!=='Space')historyConfirmRequested=false;
 const track=actionHistoryActive()&&!pendingPlayerTurnEnd&&!transition?.active&&!floorFadeBusy&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE'].includes(e.code);
 if(track)syncActionHistory();
 const revision=historyRevision,n=actionHistory.length,before=track?captureActionState():null;
 handlePlayerKey(e);
 if(track&&actionHistoryActive()&&historyRevision===revision&&actionHistory.length===n){
  const after=captureActionState();
  if(JSON.stringify(before)!==JSON.stringify(after))actionHistory.push({code:e.code,state:after});
 }
 syncActionHistory();
}
function commitActionHistory(){
 if(!historyOpen)return;historyOpen=false;
 for(const m of provisionalDefeats){rollMonsterKillDrop(m);spawnBloodParticles(m.px,m.py,18);if(scrapCoveredMonster(m))scrapEffects.monsterDied(m.px,m.py,m.cfgId==='flying_eye_i'?'ranged':'melee');}
 provisionalDefeats=[];actionHistory=[];
}
// 只绘制移动轨迹：格心相连，同向移动自然延长，拐弯保留折线，末端一个大箭头。
function historyMovementPoints(){
 if(!actionHistoryActive()||!actionHistory.length)return [];
 const start=actionHistory[0].state.snapshot,points=[{col:start.playerCol,row:start.playerRow}];
 for(const entry of actionHistory){if(!['KeyW','KeyA','KeyS','KeyD'].includes(entry.code))continue;
  const s=entry.state.snapshot,last=points.at(-1);if(last.col!==s.playerCol||last.row!==s.playerRow)points.push({col:s.playerCol,row:s.playerRow});
 }return points;
}
function drawActionHistory(){
 const points=historyMovementPoints();if(points.length<2)return;
 const pixels=points.map(p=>{const q=cellRect(p.col,p.row);return {x:q.cx,y:q.cy};});
 const tip=pixels.at(-1),previous=pixels.at(-2),angle=Math.atan2(tip.y-previous.y,tip.x-previous.x);
 ctx.save();ctx.globalAlpha=.5;ctx.lineJoin='round';ctx.lineCap='butt';
 ctx.strokeStyle='#efcf83';ctx.fillStyle='#efcf83';ctx.lineWidth=CELL*.5;
 ctx.beginPath();ctx.moveTo(pixels[0].x,pixels[0].y);
 for(let i=1;i<pixels.length;i++)ctx.lineTo(pixels[i].x,pixels[i].y);ctx.stroke();
 ctx.translate(tip.x,tip.y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-CELL*.45,-CELL*.375);ctx.lineTo(-CELL*.45,CELL*.375);ctx.closePath();ctx.fill();ctx.restore();
}
// 本回合累计损失以回合起始快照为基准，历史恢复自动恢复预览长度。
function monsterHealthPreview(m){
 const hp=Math.max(0,m.hp),max=Math.max(1,m.maxHp);
 if(turnState.phase!=='player_select')return {hp,max,before:hp,damage:0};
 if(!actionHistoryActive())return null;
 const initial=actionHistory[0]?.state.monsters.find(x=>x.id===m.id);
 const before=Math.min(max,Math.max(hp,initial?.hp??max)),damage=before-hp;
 return damage>0?{hp,max,before,damage}:null;
}
function drawMonsterHealthPreview(m,x,y,w,h){
 const info=monsterHealthPreview(m);if(!info)return;
 const inset=.6,inner=w-inset*2,height=h-inset*2;
 ctx.save();ctx.globalAlpha=1;ctx.fillStyle='#101619';ctx.fillRect(x,y,w,h);
 ctx.strokeStyle='#b7aaa0';ctx.lineWidth=.5;ctx.strokeRect(x,y,w,h);
 ctx.fillStyle='#f18d59';ctx.fillRect(x+inset,y+inset,inner*info.hp/info.max,height);
 if(info.damage>0){ctx.globalAlpha=.28+.62*(.5+.5*Math.sin(performance.now()*.009));ctx.fillStyle='#ffe2a1';ctx.fillRect(x+inset+inner*info.hp/info.max,y+inset,inner*info.damage/info.max,height);}
 ctx.restore();
}
function drawProvisionalSkull(x,y){
 // 像素骷髅使用几何绘制，避免字体缺字；宽约三分之二格。
 const unit=CELL*.65/12;ctx.save();ctx.translate(x-6*unit,y-6.5*unit);ctx.scale(unit,unit);
 ctx.globalAlpha=.7+.3*(.5+.5*Math.sin(performance.now()*.007));
 ctx.fillStyle='#191b21';ctx.fillRect(1,0,10,9);ctx.fillRect(0,2,12,6);ctx.fillRect(2,8,8,5);
 ctx.fillStyle='#f3e5c8';ctx.fillRect(2,1,8,8);ctx.fillRect(1,3,10,4);ctx.fillRect(3,8,6,4);
 ctx.fillStyle='#24272c';ctx.fillRect(2,4,3,3);ctx.fillRect(7,4,3,3);ctx.fillRect(5,7,2,2);
 ctx.fillRect(4,10,1,2);ctx.fillRect(7,10,1,2);ctx.restore();
}
function drawProvisionalDefeats(){
 if(!actionHistoryActive())return;
 for(const m of provisionalDefeats){const offset=CELL*((m.size||1)-1)/2,pt=project(m.px+offset,m.py+offset);
 ctx.save();ctx.globalAlpha=.4+.15*Math.sin(performance.now()*.008);
 if(scrapCoveredMonster(m)){const p=project(m.px,m.py);scrapDraw((m.cfgId==='flying_eye_i'?'ranged':'melee')+'5',p.x-30,p.y-38,60,68,.6);}
 else{const live=monsters;try{monsters=[m];scrapDrawLegacyMonsters();}finally{monsters=live;}}
 ctx.restore();
 if(scrapCoveredMonster(m))drawMonsterHealthPreview(m,pt.x-10,pt.y+10,20,3);
 drawProvisionalSkull(pt.x,pt.y);
 }
}
