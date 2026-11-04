// 测试入口只设置场景与控制面板，游戏规则、显示、预测和回溯全部使用正式源码。
const COMBAT_SCENES=[
 {name:'近战机器人',enemies:[['crack_maw_i',8,3]]},
 {name:'远程与设施',walls:[[5,2],[5,3],[5,4]],enemies:[['flying_eye_i',8,3]]},
 {name:'美术组合',walls:[[5,1],[5,5]],crates:[[4,3],[7,4]],enemies:[['crack_maw_i',8,3],['flying_eye_i',10,4]]},
];
let combatPlaytestScene=2,combatPlaytestSeed=123456789;
function startCombatPlaytest(index){
 combatPlaytestScene=index;const scene=COMBAT_SCENES[index];
 resetGameToFloor1();gameStarted=true;gameOver=false;floorFadeBusy=false;
 for(const id of ['start-menu-modal','death-modal','victory-modal'])document.getElementById(id).classList.remove('show');
 document.getElementById('floor-fade').style.opacity='0';
 const room=currentFloor.rooms.find(r=>r.id===currentRoomId);
 room.grid=Array.from({length:COLS},()=>Array(ROWS).fill(TILE.FLOOR));room.doors={up:null,down:null,left:null,right:null};room.type='normal';
 currentRoomGrid=room.grid;monsters=[];bullets=[];particles=[];damageNumbers=[];bombs=[];resourcesOnGround=[];itemsOnGround=[];
 for(const [c,r]of scene.walls||[])currentRoomGrid[c][r]=TILE.ROCK;
 for(const [c,r]of scene.crates||[])currentRoomGrid[c][r]=TILE.POOP;
 initTileData();combatRng=combatPlaytestSeed;
 player.col=2;player.row=3;const p=gridToPixel(2,3);player.px=p.x;player.py=p.y;player.targetPx=null;player.targetPy=null;player.invincibleSteps=0;
 movementPlanning=false;movementEvents=[];pendingBossLanding=null;forcedLandingPending=false;
 dangerForecast=null;dangerReveal=null;dangerForecastJob=null;dangerForecastKey=null;dangerRevealRemaining=0;
 monsterTurnHit=false;lockedThreatId=null;pendingMonsterHits=[];fallbackThreatHold=0;monsterAfterEffectsDone=false;
 monsterGroupPhase='idle';monsterActionOrder=[];scrapEffects.reset();rewindAnim.active=false;inCombat=false;
 for(const [id,c,r]of scene.enemies){if(!spawnMonsterAtRandomPos(id))throw Error('测试场景无法生成 '+id);const m=monsters.at(-1),p=gridToPixel(c,r);m.col=c;m.row=r;m.px=p.x;m.py=p.y;m._spawnedThisTurn=false;}
 updateRoomCombatState();resetTurnAP();updateUI();lastTime=performance.now();
 document.getElementById('combat-scene').value=String(index);
 document.getElementById('combat-status').textContent=scene.name+' · 种子 '+combatPlaytestSeed+' · 使用正式版规则，掉落与炸弹可正常测试';
}
function setupCombatPlaytest(){
 const panel=document.createElement('section');panel.id='combat-playtest';
 panel.style.cssText='max-width:930px;margin:16px auto;padding:12px;background:#10242b;color:#d6edf0;border:1px solid #34515b;font:14px Microsoft YaHei';
 const ids=Object.keys(MONSTER_DB).filter(k=>!k.startsWith('_'));
 panel.innerHTML='<strong>正式规则 · 固定战斗测试</strong><p>WASD移动，方向键射击，空格结束回合，Esc回溯。此入口固定单房间，不测试跨房与通关。</p><select id="combat-scene">'+COMBAT_SCENES.map((s,i)=>'<option value="'+i+'">'+s.name+'</option>').join('')+'</select> <button id="combat-reset">重置场景</button> <button id="combat-seed">更换种子</button><p><select id="combat-enemy">'+ids.map(id=>'<option value="'+id+'">'+MONSTER_DB[id].name+'</option>').join('')+'</select> 数量 <input id="combat-count" type="number" min="1" max="8" value="1" style="width:50px"> <button id="combat-custom">测试指定怪物</button></p><p id="combat-status"></p>';
 document.body.appendChild(panel);panel.addEventListener('keydown',e=>e.stopPropagation());
 document.getElementById('combat-scene').onchange=e=>startCombatPlaytest(Number(e.target.value));
 document.getElementById('combat-reset').onclick=()=>startCombatPlaytest(combatPlaytestScene);
 document.getElementById('combat-seed').onclick=()=>{combatPlaytestSeed=(Math.imul(combatPlaytestSeed,1664525)+1013904223)>>>0;startCombatPlaytest(combatPlaytestScene)};
 document.getElementById('combat-custom').onclick=()=>{
  const id=document.getElementById('combat-enemy').value,count=Math.max(1,Math.min(8,Number(document.getElementById('combat-count').value)||1));
  // 多格Boss也按完整占地布局；不允许8只大体型怪物在有限房间重叠。
  const size=MONSTER_DB[id]?.size||1,positions=[];
  for(let r=0;r+size<=ROWS;r+=size)for(let c=5;c+size<=COLS;c+=size)positions.push([c,r]);
  const enemies=positions.slice(0,count).map(([c,r])=>[id,c,r]);
  COMBAT_SCENES[3]={name:'自定义 '+id+' × '+enemies.length,enemies};
  document.getElementById('combat-scene').innerHTML=COMBAT_SCENES.map((s,i)=>'<option value="'+i+'">'+s.name+'</option>').join('');startCombatPlaytest(3);
 };
}
const combatPlaytestBoot=bootGame;
bootGame=async function(){await combatPlaytestBoot();setupCombatPlaytest();startCombatPlaytest(2)};
