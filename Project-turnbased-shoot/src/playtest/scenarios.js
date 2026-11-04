// 测试入口只设置场景与控制面板，游戏规则、显示、预测和回溯全部使用正式源码。
const COMBAT_LAYOUTS=[
{name:'教学1 · 开阔接敌'},
{name:'教学2 · 短掩体',walls:[[6,3],[6,4]]},
{name:'教学3 · 捷径箱',walls:[[6,3]],crates:[[4,2],[4,6]]},
{name:'普通1 · 错位掩体',walls:[[6,3],[6,5],[9,2]]},
{name:'普通2 · 中央绕行',walls:[[6,3],[6,4],[6,5]],crates:[[4,6]]},
{name:'普通3 · 上下射击口',walls:[[4,3],[4,5],[8,3],[8,5]]},
{name:'压力1 · 双侧进攻',walls:[[6,3],[6,5]],crates:[[4,2],[4,6]]},
{name:'压力2 · 交错推进',walls:[[4,3],[6,5],[8,3],[10,5]]},
{name:'压力3 · 掩体与捷径',walls:[[6,3],[6,4],[6,5],[9,2],[9,6]],crates:[[4,2],[4,6]]}];
const COMBAT_GROUPS=[
['教学1 · 双脆弱远程','1～2',['flying_eye_i','flying_eye_i']],
['教学2 · 近远配合','1～2',['crack_maw_i','flying_eye_i']],
['教学3 · 双近战','1～2',['crack_maw_i','crack_maw_i']],
['普通1 · 近战加双远程','2～3',['crack_maw_i','flying_eye_i','flying_eye_ii']],
['普通2 · 双近战加远程','2～3',['crack_maw_i','crack_maw_i','flying_eye_ii']],
['普通3 · 快速包夹','2～3',['crack_maw_ii','crack_maw_i','flying_eye_i','flying_eye_ii']],
['压力1 · 四怪混编','3～4',['crack_maw_i','crack_maw_i','flying_eye_i','flying_eye_ii']],
['压力2 · 重装带队','3～4',['crack_maw_iii','crack_maw_i','flying_eye_i','flying_eye_ii']],
['压力3 · 五怪交叉','3～4',['crack_maw_i','crack_maw_ii','flying_eye_ii','crack_maw_i','flying_eye_ii']]];
const COMBAT_POSITIONS=[[5,4],[7,2],[7,6],[9,4],[10,2]];
const COMBAT_SCENES=COMBAT_GROUPS.map(([name,target,ids],i)=>({name,target,layout:i,enemies:ids.map((id,j)=>[id,...COMBAT_POSITIONS[j]])}));
let combatPlaytestScene=0,combatPlaytestLayout=0,combatPlaytestSeed=123456789;
function configureCombatPlaytest(){
 for(const [id,hp]of Object.entries({crack_maw_i:7,crack_maw_ii:3.5,crack_maw_iii:10.5,flying_eye_i:3.5,flying_eye_ii:7}))MONSTER_DB[id].hp=hp;
 for(const id of ['crack_maw_i','crack_maw_ii','crack_maw_iii'])MONSTER_DB[id].actions[0].steps=[id==='crack_maw_ii'?3:2];
 for(const id of ['flying_eye_i','flying_eye_ii'])for(const a of MONSTER_DB[id].actions)if(a.after_effect?.type==='random_wander')a.after_effect.steps=[1];
}
function startCombatPlaytest(index,layoutIndex=COMBAT_SCENES[index].layout??0){
 combatPlaytestScene=index;combatPlaytestLayout=layoutIndex;const scene=COMBAT_SCENES[index],layout=COMBAT_LAYOUTS[layoutIndex];
 resetGameToFloor1();gameStarted=true;gameOver=false;floorFadeBusy=false;
 Object.assign(playerStats,{moveSpeed:3,fireRate:3,range:5,attack:3.5});
 for(const id of ['start-menu-modal','death-modal','victory-modal'])document.getElementById(id).classList.remove('show');
 document.getElementById('floor-fade').style.opacity='0';
 const room=currentFloor.rooms.find(r=>r.id===currentRoomId);
 room.grid=Array.from({length:COLS},()=>Array(ROWS).fill(TILE.FLOOR));room.doors={up:null,down:null,left:null,right:null};room.type='normal';
 currentRoomGrid=room.grid;monsters=[];bullets=[];particles=[];damageNumbers=[];bombs=[];resourcesOnGround=[];itemsOnGround=[];
 for(const [c,r]of layout.walls||[])currentRoomGrid[c][r]=TILE.ROCK;
 for(const [c,r]of layout.crates||[])currentRoomGrid[c][r]=TILE.POOP;
 initTileData();for(const td of Object.values(tileData))if(td.type==='poop')td.hp=1;
 player.col=2;player.row=4;const p=gridToPixel(2,4);player.px=p.x;player.py=p.y;player.targetPx=null;player.targetPy=null;player.invincibleSteps=0;
 movementPlanning=false;movementEvents=[];pendingBossLanding=null;forcedLandingPending=false;
 dangerForecast=null;dangerReveal=null;dangerForecastJob=null;dangerForecastKey=null;dangerRevealRemaining=0;
 monsterTurnHit=false;lockedThreatId=null;pendingMonsterHits=[];fallbackThreatHold=0;monsterAfterEffectsDone=false;
 monsterGroupPhase='idle';monsterActionOrder=[];scrapEffects.reset();rewindAnim.active=false;inCombat=false;
 monsterIdCounter=0;
 for(const [id,c,r]of scene.enemies){if(!spawnMonsterAtRandomPos(id))throw Error('测试场景无法生成 '+id);const m=monsters.at(-1),p=gridToPixel(c,r);m.col=c;m.row=r;m.px=p.x;m.py=p.y;m._spawnedThisTurn=false;}
 combatRng=combatPlaytestSeed;updateRoomCombatState();resetTurnAP();updateUI();lastTime=performance.now();
 document.getElementById('combat-scene').value=String(index);
 document.getElementById('combat-group').value=String(index);
 document.getElementById('combat-layout').value=String(layoutIndex);
 const hits=scene.enemies.reduce((n,[id])=>n+Math.ceil(MONSTER_DB[id].hp/playerStats.attack),0);
 document.getElementById('combat-status').textContent=scene.name+' ｜ '+layout.name+' ｜ '+scene.enemies.length+'只 / '+hits+'次基础命中 ｜ 目标'+(scene.target||'自定')+'回合（待试玩） ｜ 种子 '+combatPlaytestSeed;
}
function setupCombatPlaytest(){
 const panel=document.createElement('section');panel.id='combat-playtest';
 const style=document.createElement('style');
 style.textContent=`
 #top-content-row.combat-testing{max-width:1290px;gap:16px!important}
 #combat-playtest{box-sizing:border-box;flex:0 0 320px;width:320px;min-width:0;margin:0;padding:16px;background:#10242b;color:#d6edf0;border:1px solid #34515b;border-radius:6px;font-size:14px;line-height:1.7;position:sticky;top:14px;max-height:calc(100vh - 28px);overflow-y:auto}
 #combat-playtest strong{display:block;font-size:16px;color:#ffdc86}
 #combat-playtest p{margin:12px 0;color:#abc7cc}
 #combat-playtest select,#combat-playtest button,#combat-playtest input{box-sizing:border-box;background:#19333c;color:#e1f1f3;border:1px solid #47616a;border-radius:4px;padding:8px;font-size:14px}
 #combat-playtest select{display:block;width:100%;margin:5px 0 12px}
 #combat-playtest button{margin:4px 4px 4px 0;cursor:pointer}
 #combat-playtest button:hover{background:#284b56;border-color:#83b8c3}
 #combat-status{border-top:1px solid #34515b;padding-top:12px;overflow-wrap:anywhere}
 @media(max-width:1319px){#top-content-row.combat-testing{flex-direction:column;align-items:center}#combat-playtest{position:static;flex:0 0 auto;width:954px;max-width:100%;max-height:none}}
 `;
 document.body.appendChild(style);
 const ids=Object.keys(MONSTER_DB).filter(k=>!k.startsWith('_'));
 panel.innerHTML='<strong>爽快节奏 · 13×9 · MP3 / AP3 · 射程5</strong><p>WASD移动，方向键射击，空格结束回合，Esc回溯。房间选择会恢复推荐障碍；怪物组与障碍也可独立搭配。切换均重置战斗。临时耐久：近战I/II/III为2/1/3发，远程I/II为1/2发，捷径箱子1发。</p><select id="combat-scene">'+COMBAT_SCENES.map((s,i)=>'<option value="'+i+'">'+s.name+'</option>').join('')+'</select> 仅换怪物组 <select id="combat-group">'+COMBAT_SCENES.map((s,i)=>'<option value="'+i+'">'+s.name+'</option>').join('')+'</select> 障碍 <select id="combat-layout">'+COMBAT_LAYOUTS.map((s,i)=>'<option value="'+i+'">'+s.name+'</option>').join('')+'</select> <button id="combat-reset">重置场景</button> <button id="combat-seed">更换种子</button><p><select id="combat-enemy">'+ids.map(id=>'<option value="'+id+'">'+MONSTER_DB[id].name+'</option>').join('')+'</select> 数量 <input id="combat-count" type="number" min="1" max="8" value="1" style="width:50px"> <button id="combat-custom">测试指定怪物</button></p><p id="combat-status"></p>';
 const layout=document.getElementById('top-content-row');layout.classList.add('combat-testing');layout.appendChild(panel);
 panel.addEventListener('keydown',e=>e.stopPropagation());
 document.getElementById('combat-scene').onchange=e=>startCombatPlaytest(Number(e.target.value));
 document.getElementById('combat-group').onchange=e=>startCombatPlaytest(Number(e.target.value),combatPlaytestLayout);
 document.getElementById('combat-layout').onchange=e=>startCombatPlaytest(combatPlaytestScene,Number(e.target.value));
 document.getElementById('combat-reset').onclick=()=>startCombatPlaytest(combatPlaytestScene,combatPlaytestLayout);
 document.getElementById('combat-seed').onclick=()=>{combatPlaytestSeed=(Math.imul(combatPlaytestSeed,1664525)+1013904223)>>>0;startCombatPlaytest(combatPlaytestScene,combatPlaytestLayout)};
 document.getElementById('combat-custom').onclick=()=>{
  const id=document.getElementById('combat-enemy').value,count=Math.max(1,Math.min(8,Number(document.getElementById('combat-count').value)||1));
  // 多格Boss也按完整占地布局；不允许8只大体型怪物在有限房间重叠。
  const size=MONSTER_DB[id]?.size||1,positions=[];
  for(let r=0;r+size<=ROWS;r+=size)for(let c=5;c+size<=COLS;c+=size)positions.push([c,r]);
  const enemies=positions.slice(0,count).map(([c,r])=>[id,c,r]);
  COMBAT_SCENES[9]={layout:0,name:'自定义 '+id+' × '+enemies.length,enemies};
  document.getElementById('combat-group').innerHTML=COMBAT_SCENES.map((s,i)=>'<option value="'+i+'">'+s.name+'</option>').join('');
  document.getElementById('combat-scene').innerHTML=COMBAT_SCENES.map((s,i)=>'<option value="'+i+'">'+s.name+'</option>').join('');startCombatPlaytest(9);
 };
}
const combatPlaytestBoot=bootGame;
bootGame=async function(){await combatPlaytestBoot();configureCombatPlaytest();setupCombatPlaytest();startCombatPlaytest(0)};
