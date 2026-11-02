const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'), out=path.join(__dirname,'index.html');
let html=fs.readFileSync(path.join(root,'turnbased-shoot-demo-pack.html'),'utf8').replace(/\r\n/g,'\n');
function replaceOnce(from,to){if(!html.includes(from))throw Error('找不到预期插入点: '+from);html=html.replace(from,to)}
replaceOnce('setInterval(()=>{if(document.visibilityState===\'visible\')loadOrGenerateFloors(true);},3000);','// 测试版使用固定房间，不轮询楼层配置。');
replaceOnce('dangerExecutionSeed = Math.floor(Math.random()*4294967296)>>>0;','dangerExecutionSeed = nextPlaytestSeed();');
replaceOnce('function rollMonsterKillDrop(m) {','function rollMonsterKillDrop(m) { return; // 测试房间不掉落');
replaceOnce('function rollRoomClearDrop() {','function rollRoomClearDrop() { return; // 测试房间不掉落');
replaceOnce('function triggerDeathScreen() {','function triggerDeathScreen() { playtestFinish("失败");');
replaceOnce('function damagePlayer(amount) {','function damagePlayer(amount) {\n  if(player.invincibleSteps <= 0) playtestHits++;');
replaceOnce('    updateRoomCombatState();\n  } else if (turnState.phase', '    updateRoomCombatState();\n    if(!hasMonstersAlive()) playtestFinish("完成");\n  } else if (turnState.phase');
replaceOnce("  if (actionKeys.includes(e.code)) e.preventDefault();", "  if (e.target.closest && e.target.closest('#playtest-panel') && e.target.matches('textarea,select,input')) return;\n  if (['KeyR','KeyE','KeyC'].includes(e.code)) {e.preventDefault();return;}\n  if (actionKeys.includes(e.code)) e.preventDefault();");
replaceOnce('bootGame();','bootGame().then(() => { setupPlaytestPanel(); startPlaytest(0); }).catch(e => { console.error(e); document.getElementById("pt-status").textContent="加载失败："+e.message; });');
replaceOnce("  resetGameToFloor1();\n  document.getElementById('death-modal').classList.remove('show');\n  showStartMenu();", "  startPlaytest(playtestScene);");
const panel=`<section id="playtest-panel" aria-label="核心战斗试玩控制" style="position:fixed;right:12px;top:12px;z-index:9999;width:275px;max-height:90vh;overflow:auto;background:rgba(29,23,22,.96);color:#f8e7c7;border:2px solid #aa8456;border-radius:8px;padding:10px;font:14px/1.4 'Microsoft YaHei',sans-serif;box-shadow:0 4px 18px #0008"><details open><summary style="cursor:pointer;font-weight:bold">核心战斗测试 · 控制面板</summary><p style="margin:6px 0">WASD 移动　方向键射击<br>空格结束回合　Esc 回溯</p><select id="pt-scene" style="width:100%;padding:5px"></select><div style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0"><button id="pt-reset">重置</button><button id="pt-next">下一场景</button><button id="pt-end">结束回合</button><button id="pt-undo">回溯</button><button id="pt-seed">更换种子</button></div><div id="pt-status" role="status">正在加载…</div><p style="margin:6px 0">红色：确定危险；黄色：可能危险。等待提示计算完成后再结束回合。</p><textarea id="pt-feedback" placeholder="完成后可记录：提示清楚吗？受伤原因、回溯和节奏如何？" style="width:100%;height:64px"></textarea><div style="display:flex;flex-wrap:wrap;gap:4px"><button id="pt-save">保存反馈</button><button id="pt-copy">复制记录</button><button id="pt-export">导出记录</button></div></details></section>`;
replaceOnce('<script>',panel+'<script>');
const hooks=`
// 固定战斗场景与本地试玩记录；不改写正式项目文件。
const PT_SCENES=[
 {name:'1 近战：裂口尸',walls:[],enemies:[['crack_maw_i',9,3]]},
 {name:'2 远程与障碍：浮游眼',player:[3,3],walls:[[5,2],[5,3],[5,4]],enemies:[['flying_eye_i',7,3]]},
 {name:'3 随机行动：浮游眼',walls:[],enemies:[['flying_eye_i',6,3]]},
 {name:'4 近战与远程',walls:[[6,1],[6,5]],enemies:[['crack_maw_i',8,2],['flying_eye_i',10,4]]},
 {name:'5 确定与随机组合',walls:[[6,1],[6,5]],enemies:[['crack_maw_i',8,3],['flying_eye_i',10,5]]}
];
let playtestScene=0,playtestSeed=123456789,playtestRng=playtestSeed,playtestHits=0,playtestRewinds=0,playtestStarted=0,playtestFinished=false,playtestLastIndex=-1,playtestRecords=[];
function nextPlaytestSeed(){playtestRng=(Math.imul(playtestRng,1664525)+1013904223)>>>0;return playtestRng}
function ptLoad(){try{return JSON.parse(localStorage.getItem('core-playtest-original-records')||'[]')}catch(e){return playtestRecords}}
function ptSave(r){playtestRecords=r;try{localStorage.setItem('core-playtest-original-records',JSON.stringify(r));return true}catch(e){return false}}
function ptStatus(s){document.getElementById('pt-status').textContent=s}
function playtestFinish(result){if(playtestFinished||!gameStarted)return;playtestFinished=true;const list=ptLoad();list.push({scene:PT_SCENES[playtestScene].name,turns:turnState.turnNumber,hits:playtestHits,rewinds:playtestRewinds,result,seconds:Math.round((Date.now()-playtestStarted)/1000),seed:playtestSeed,feedback:''});playtestLastIndex=list.length-1;let saved=ptSave(list);ptStatus(result+'；'+(saved?'记录已保存在本机':'本地保存受限，请关闭前导出')+'。可重置或进入下一场景。')}
function startPlaytest(i){
  playtestScene=(i+PT_SCENES.length)%PT_SCENES.length;playtestRng=playtestSeed;playtestHits=0;playtestRewinds=0;playtestStarted=Date.now();playtestFinished=false;playtestLastIndex=-1;
  document.getElementById('pt-scene').value=String(playtestScene);document.getElementById('pt-feedback').value='';
  document.getElementById('death-modal').classList.remove('show');document.getElementById('victory-modal').classList.remove('show');document.getElementById('start-menu-modal').classList.remove('show');
  resetGameToFloor1();gameOver=false;gameStarted=true;floorFadeBusy=false;document.getElementById('floor-fade').style.opacity='0';
  const room=currentFloor.rooms.find(r=>r.id===currentRoomId);room.type='normal';room.doors={up:null,down:null,left:null,right:null};room.grid=Array.from({length:COLS},()=>Array(ROWS).fill(TILE.FLOOR));currentRoomGrid=room.grid;
  for(const [c,r] of PT_SCENES[playtestScene].walls)currentRoomGrid[c][r]=TILE.ROCK;
  [player.col,player.row]=PT_SCENES[playtestScene].player||[2,3];let pp=gridToPixel(player.col,player.row);player.px=pp.x;player.py=pp.y;player.targetPx=null;player.targetPy=null;player.invincibleSteps=0;
  monsters=[];bullets=[];particles.length=0;damageNumbers.length=0;bombs=[];resourcesOnGround=[];itemsOnGround=[];tileData={};for(const [c,r] of PT_SCENES[playtestScene].walls)tileData[c+','+r]={type:'rock',hp:99,_loot:[]};
  pendingBossLanding=null;dangerReveal=null;dangerRevealRemaining=0;dangerForecast=null;dangerForecastJob=null;dangerForecastKey=null;monsterExecTimer=0;monsterExecStepIdx=0;rewindAnim.active=false;inCombat=false;
  for(const [id,c,r] of PT_SCENES[playtestScene].enemies){if(!spawnMonsterAtRandomPos(id))throw Error('无法生成 '+id);let m=monsters[monsters.length-1];m.col=c;m.row=r;let p=gridToPixel(c,r);m.px=p.x;m.py=p.y;m._killLoot=[];}
  updateRoomCombatState();updateUI();lastTime=performance.now();ptStatus(PT_SCENES[playtestScene].name+' · 种子 '+playtestSeed+' · 观察危险格后行动');
}
function ptKey(code,key){document.dispatchEvent(new KeyboardEvent('keydown',{key,code,bubbles:true,cancelable:true}));}
function setupPlaytestPanel(){
  const el=id=>document.getElementById(id);document.querySelectorAll('#help-box .help-row').forEach(row=>{if(/放置炸弹|随机位置生成|重置游戏/.test(row.textContent))row.remove()});const note=document.querySelector('#help-box .help-note');if(note)note.textContent='红格表示确定危险，黄格表示可能危险。通过测试面板选择场景、重置和导出记录。';el('minimap').style.display='none';el('pt-scene').innerHTML=PT_SCENES.map((s,i)=>'<option value="'+i+'">'+s.name+'</option>').join('');
  el('pt-scene').onchange=()=>startPlaytest(Number(el('pt-scene').value));el('pt-reset').onclick=()=>startPlaytest(playtestScene);el('pt-next').onclick=()=>startPlaytest(playtestScene+1);el('pt-seed').onclick=()=>{playtestSeed=Date.now()>>>0;startPlaytest(playtestScene)};el('pt-end').onclick=()=>ptKey('Space',' ');el('pt-undo').onclick=()=>ptKey('Escape','Escape');
  el('pt-save').onclick=()=>{let r=ptLoad();if(playtestLastIndex<0||!r[playtestLastIndex]){ptStatus('完成或失败后才能保存反馈。');return}r[playtestLastIndex].feedback=el('pt-feedback').value;ptStatus(ptSave(r)?'反馈已保存。':'本地保存受限，请导出记录。')};
  el('pt-copy').onclick=async()=>{let t=JSON.stringify(ptLoad(),null,2);try{await navigator.clipboard.writeText(t);ptStatus('记录已复制。')}catch(e){ptStatus('复制不可用，请使用导出。')}};
  el('pt-export').onclick=()=>{let a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(ptLoad(),null,2)],{type:'application/json'}));a.href=url;a.download='core-playtest-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  document.addEventListener('keydown',e=>{if(e.code==='Escape'&&turnState.phase==='player_select'&&inCombat&&rewindsRemaining>0&&turnSnapshot&&!(e.target.matches&&e.target.matches('textarea,select,input')))playtestRewinds++},true);
}
`;
replaceOnce('bootGame().then(',hooks+'\nbootGame().then(');
// 测试版规则：不使用接触伤害；预测逐怪归因，按当前脚下威胁选一只显示。
replaceOnce("      case 'Space': {\n        if(!inCombat) return;", "      case 'Space': {\n        if(!inCombat) return;\n        if(!dangerForecast || dangerForecastKey!==getDangerForecastKey() || !dangerForecastJob?.done){ptStatus('危险提示计算中，请稍候再结束回合。');return;}");

replaceOnce('function damagePlayer(amount) {\n  if(player.invincibleSteps <= 0) playtestHits++;', 'function damagePlayer(amount) {\n  if (turnState.phase === "monster_turn" && playtestMonsterHitThisTurn) return;\n  if(player.invincibleSteps <= 0) { playtestHits++; if(turnState.phase === "monster_turn") playtestMonsterHitThisTurn=true; }');
replaceOnce('function startMonsterTurn() {', 'function startMonsterTurn() {\n  playtestMonsterHitThisTurn=false;');
replaceOnce('let playtestScene=0,playtestSeed=', 'let playtestMonsterHitThisTurn=false;\nlet playtestScene=0,playtestSeed=');
replaceOnce('playtestScene=(i+PT_SCENES.length)%PT_SCENES.length;playtestRng=', 'playtestMonsterHitThisTurn=false;playtestScene=(i+PT_SCENES.length)%PT_SCENES.length;playtestRng=');
replaceOnce(`    // 接触伤害
    if (player.invincibleSteps <= 0) {
      const om = monsters.find(m => !m.jumperVanished && isInMonsterFootprint(m, step.col, step.row) && m.hp > 0);
      if (om) damagePlayer(om.damage || 1);
    }`, '    // 测试版取消玩家移动时的怪物接触伤害。');
replaceOnce(`  if (player.invincibleSteps <= 0) {
    const onMonster = monsters.find(m => !m.jumperVanished && isInMonsterFootprint(m, player.col, player.row) && m.hp > 0);
    if (onMonster) damagePlayer(onMonster.damage || 1);
  }`, '  // 测试版取消怪物共格接触伤害。');
replaceOnce(`          if (player.invincibleSteps <= 0) {
            const om = monsters.find(m => !m.jumperVanished && isInMonsterFootprint(m, player.col, player.row) && m.hp > 0);
            if (om) damagePlayer(om.damage || 1);
          }`, '          // 测试版取消玩家移动时的怪物接触伤害。');
replaceOnce(`    if (player.invincibleSteps <= 0) {
      const onMonster = monsters.find(m => !m.jumperVanished && isInMonsterFootprint(m, nc, nr) && m.hp > 0);
      if (onMonster) damagePlayer(onMonster.damage || 1);
    }`, '    // 测试版取消接触伤害。');
replaceOnce('    noteDangerCell(p.toCol, p.toRow);\n', '');
replaceOnce('      damagePlayer(m.damage || 1); // 无敌中自动跳过伤害', '      // 怪物共格不再造成接触伤害。');
replaceOnce(`        noteDangerCell(dukeNewC, dukeNewR);
        if (!playerHitThisStep && dukeNewC === player.col && dukeNewR === player.row) {
          damagePlayer(m.damage || 1);
          playerHitThisStep = true;
        }`, '        // 普通移动不造成碰撞伤害。');
replaceOnce('spawnMonsterBullet(shootDir, gp.x, gp.y, range);','spawnMonsterBullet(shootDir, gp.x, gp.y, range, m.id);');
replaceOnce('spawnMonsterBullet(sd, gp.x, gp.y, range);','spawnMonsterBullet(sd, gp.x, gp.y, range, m.id);');
replaceOnce('spawnMonsterBullet(shootDir2, gp2.x, gp2.y, range2);','spawnMonsterBullet(shootDir2, gp2.x, gp2.y, range2, m.id);');
replaceOnce('function spawnMonsterBullet(dir, fromPx, fromPy, rangeTiles = 4) {','function spawnMonsterBullet(dir, fromPx, fromPy, rangeTiles = 4, ownerId = null) {');
replaceOnce("    source: 'monster',\n", "    source: 'monster', ownerId,\n");
replaceOnce('noteDangerCell(mBg.col, mBg.row);','noteDangerCell(mBg.col, mBg.row, b.ownerId);');
replaceOnce('noteDangerCell(ac, ar);','noteDangerCell(ac, ar, m.id);');
replaceOnce('noteDangerCell(c, r);\n        if (!playerHitInSide','noteDangerCell(c, r, m.id);\n        if (!playerHitInSide');
replaceOnce('noteDangerCell(tc, tr);\n      if (!playerHit &&','noteDangerCell(tc, tr, m.id);\n      if (!playerHit &&');
replaceOnce('noteDangerCell(tc, tr);\n      if (!playerDirectHit','noteDangerCell(tc, tr, m.id);\n      if (!playerDirectHit');
replaceOnce("  const body = shared.map(fn=>fn.toString()).join('\\n');", "  const body = shared.map(fn=>fn===updateBullets ? fn.toString().replace('if (mBg.col === player.col && mBg.row === player.row)', 'if (false)') : fn.toString()).join('\\n');");
replaceOnce("    'const cells=new Set(),random=makeMonsterTurnRandom(seed);let choiceCursor=0;'+", "    'const cells=new Set(),bySource=new Map(),random=makeMonsterTurnRandom(seed);let choiceCursor=0;'+");
replaceOnce("    'function noteDangerCell(c,r){if(!input.immune&&c>=0&&c<COLS&&r>=0&&r<ROWS)cells.add(c+\",\"+r);}'+", "    'function noteDangerCell(c,r,id){if(id!=null&&c>=0&&c<COLS&&r>=0&&r<ROWS){const k=c+\",\"+r;cells.add(k);if(!bySource.has(id))bySource.set(id,new Set());bySource.get(id).add(k);}}'+");
replaceOnce("    'function finishMonsterTurn(){if(hasPendingMonsterAttack())return;applyMonsterTurnAfterEffects();for(const m of monsters)if(!m.jumperVanished)for(const c of monsterCells(m))noteDangerCell(c.col,c.row);finished=true;}'+", "    'function finishMonsterTurn(){if(hasPendingMonsterAttack())return;applyMonsterTurnAfterEffects();finished=true;}'+");
replaceOnce("    'return {cells,monsters,bombs,currentRoomGrid};');", "    'return {cells,bySource,monsters,bombs,currentRoomGrid};');");
replaceOnce('return {input,simulation,pending:[[]],union:new Set(),intersection:null,outcomes:0,done:false};','return {input,simulation,pending:[[]],union:new Set(),intersection:null,outcomes:0,done:false,perMonster:new Map(input.world.monsters.map(m=>[m.id,{union:new Set(),intersection:null}]))};');
replaceOnce('      const {cells}=job.simulation(job.input,0,decisions);','      const {cells,bySource}=job.simulation(job.input,0,decisions);\n      for(const [id,record] of job.perMonster){const source=bySource.get(id)||new Set();for(const cell of source)record.union.add(cell);if(record.intersection===null)record.intersection=new Set(source);else for(const cell of record.intersection)if(!source.has(cell))record.intersection.delete(cell);}');
replaceOnce('    job.result={red,yellow};','    const byMonster=new Map();for(const [id,r] of job.perMonster){const definite=r.intersection||new Set(),possible=new Set(r.union);for(const k of definite)possible.delete(k);byMonster.set(id,{red:definite,yellow:possible});}\n    job.result={red,yellow,byMonster};');
replaceOnce('if(dangerForecastJob.done) {dangerForecast=dangerForecastJob.result;updateUI();}', 'if(dangerForecastJob.done) {dangerForecast=selectPlaytestThreat(dangerForecastJob.result);updateUI();}');
replaceOnce('  dangerReveal = {red:resolved.cells,yellow:new Set()};','  const source=dangerForecast?.monsterId;\n  dangerReveal = {red:new Set(resolved.bySource.get(source)||[]),yellow:new Set(),monsterId:source};');
replaceOnce('  drawMonsters();\n  drawPlayer();','  drawMonsters();\n  drawPlaytestThreat();\n  drawPlayer();');
replaceOnce('// 固定战斗场景与本地试玩记录；不改写正式项目文件。', `// 固定战斗场景与本地试玩记录；不改写正式项目文件。
function selectPlaytestThreat(result){const at=player.col+','+player.row;for(const m of monsters){const threat=result.byMonster.get(m.id);if(threat&&(threat.red.has(at)||threat.yellow.has(at)))return {red:threat.red,yellow:threat.yellow,monsterId:m.id};}return {red:new Set(),yellow:new Set(),monsterId:null};}
function drawPlaytestThreat(){const layer=dangerReveal||(turnState.phase==='player_select'?dangerForecast:null),m=layer&&monsters.find(x=>x.id===layer.monsterId);if(!m)return;const p=project(m.px,m.py);ctx.save();ctx.strokeStyle='#fff1a8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,CELL*0.48,0,Math.PI*2);ctx.stroke();ctx.restore();}`);
replaceOnce('红色：确定危险；黄色：可能危险。等待提示计算完成后再结束回合。','仅显示当前格可能受伤的一只怪物的攻击范围，亮圈标识来源；多只符合时按固定顺序选一只。等待提示计算完成后再结束回合。');

// 裂口尸在攻击位置停下；角色可以穿过彼此，但最终落点必须空闲。
replaceOnce('if (!m.predictedPath || m.predictedPath.length === 0) continue;\n    resolveAfterEffects(chaseAction, { monster: m });', "if (!m._turnAction || m._turnAction.type !== 'chase') continue;\n    resolveAfterEffects(chaseAction, { monster: m });");
replaceOnce("      if (isMonsterAt(nc, nr, m.id)) break;\n      path.push", "      path.push");
replaceOnce('    if (path.length) paths.push(path);\n  }\n  return paths.length ? paths : [[]];', `    while(path.length){const end=path[path.length-1];if((end.toCol!==player.col||end.toRow!==player.row)&&!isMonsterAt(end.toCol,end.toRow,m.id))break;path.pop();}
    if (path.length) paths.push(path);
  }
  return paths.length ? paths : [[]];`);
replaceOnce('    }\n  }\n}\n\n// BFS自动寻路：从玩家位置扩散距离地图', '    }\n  }\n  sanitizeMonsterPaths();\n}\n\n// BFS自动寻路：从玩家位置扩散距离地图');
const oldPath=html.match(/function calcMonsterPath\(monster, targetCol, targetRow\) \{[\s\S]*?\n\}\n\n\/\/ ==================== 血量上限系统/);
if(!oldPath)throw Error('未找到原追踪寻路');
const newPath=`function canExitMonsterCell(col,row,steps){const q=[[col,row,0]],seen=new Set([col+','+row]);for(let i=0;i<q.length;i++){const [c,r,n]=q[i];if(n>0&&!isMonsterAt(c,r))return true;if(n>=steps)continue;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=c+dx,y=r+dy,k=x+','+y;if(x<0||x>=COLS||y<0||y>=ROWS||isWall(x,y)||seen.has(k))continue;seen.add(k);q.push([x,y,n+1]);}}return false;}
function sanitizeMonsterPaths(){
  const reserved=new Set();
  for(const m of monsters){
    if(m.jumperVanished||!m.predictedPath)continue;
    const blocked=new Set([player.col+','+player.row,...reserved]);
    for(const other of monsters)if(other.id!==m.id&&!other.jumperVanished)for(const c of monsterCells(other))blocked.add(c.col+','+c.row);
    while(m.predictedPath.length){const e=m.predictedPath[m.predictedPath.length-1];if(!blocked.has(e.toCol+','+e.toRow))break;m.predictedPath.pop();}
    const end=m.predictedPath[m.predictedPath.length-1];reserved.add(end?end.toCol+','+end.toRow:m.col+','+m.row);
  }
}
function calcMonsterPath(monster,targetCol,targetRow){
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]], max=Math.max(0,Math.min(2,monster.moveSpeed));
  const dist=Array.from({length:COLS},()=>Array(ROWS).fill(-1)),q=[[targetCol,targetRow]];dist[targetCol][targetRow]=0;
  for(let i=0;i<q.length;i++){const [c,r]=q[i];for(const [dx,dy] of dirs){const x=c+dx,y=r+dy;if(x<0||x>=COLS||y<0||y>=ROWS||dist[x][y]>=0||isWall(x,y))continue;dist[x][y]=dist[c][r]+1;q.push([x,y]);}}
  if(Math.abs(monster.col-targetCol)+Math.abs(monster.row-targetRow)===1)return [];
  let best=null,queue=[{c:monster.col,r:monster.row,path:[]}],seen=new Set([monster.col+','+monster.row]);
  for(let i=0;i<queue.length;i++){let cur=queue[i],d=dist[cur.c][cur.r];
    if(cur.path.length&&d>=1&&!isMonsterAt(cur.c,cur.r,monster.id)&&(cur.c!==targetCol||cur.r!==targetRow)&&(!best||d<best.d||(d===best.d&&cur.path.length<best.path.length)))best={d,path:cur.path};
    if(cur.path.length>=max)continue;
    for(const [dx,dy] of dirs){let c=cur.c+dx,r=cur.r+dy,k=c+','+r;if(c<0||c>=COLS||r<0||r>=ROWS||seen.has(k)||isWall(c,r))continue;seen.add(k);queue.push({c,r,path:[...cur.path,{fromCol:cur.c,fromRow:cur.r,toCol:c,toRow:r}]});}
  }
  return best?best.path:[];
}

// ==================== 血量上限系统`;
html=html.replace(oldPath[0],newPath);
replaceOnce('chooseWanderPath,calcAllMonsterPaths,calcMonsterPath,getChargePath','chooseWanderPath,calcAllMonsterPaths,sanitizeMonsterPaths,calcMonsterPath,getChargePath');
replaceOnce(`    // 检查目标格是否有其他怪物(也在本步移动中)早到
    if (occupied.has(key)) {
      continue; // 被挡住, 不动
    }

    // 检查玩家位置：受伤后共格子，无敌时直接通行
    if (p.toCol === player.col && p.toRow === player.row) {
      // 怪物共格不再造成接触伤害。
      // 无论是否受伤，怪物都占据该格（与玩家共格）
      m.col = p.toCol;
      m.row = p.toRow;
      for (const mc of monsterCells(m)) occupied.add(\x60\${mc.col},\${mc.row}\x60);
      continue;
    }
`, '    // 路径中允许穿过其他角色；落点在规划时预留。\n');
replaceOnce('          if(!turnState.reachableTiles.has(key))return;','          if(!turnState.reachableTiles.has(key))return;\n          if(isMonsterAt(nc,nr)&&!canExitMonsterCell(nc,nr,turnState.mAP-1)){ptStatus("剩余移动点不足以穿过怪物，请选择其他路线。");return;}');
replaceOnce("      case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight': {", "      case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight': {\n        if(isMonsterAt(player.col,player.row)){ptStatus('请先离开怪物所在格，再射击。');return;}");
replaceOnce("      case 'Space': {\n        if(!inCombat) return;", "      case 'Space': {\n        if(!inCombat) return;\n        if(isMonsterAt(player.col,player.row)){ptStatus('不能在怪物所在格结束回合，请先离开。');return;}");
replaceOnce("if(threat&&(threat.red.has(at)||threat.yellow.has(at)))return {red:threat.red,yellow:threat.yellow,monsterId:m.id};", `if(threat&&(threat.red.has(at)||threat.yellow.has(at))){
  if(m.cfgId.startsWith('crack_maw')){const area=new Set();for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++)if(Math.abs(c-m.col)+Math.abs(r-m.row)<=3)area.add(c+','+r);return {red:area,yellow:new Set(),monsterId:m.id};}
  return {red:threat.red,yellow:threat.yellow,monsterId:m.id};}`);

// 仅当前危险提示对应的怪物显示原版红色感叹号。
replaceOnce('  drawMonsters();\n  drawPlaytestThreat();\n  drawPlayer();','  drawMonsters();\n  drawPlayer();');
replaceOnce('if (m.hp <= 0 || m.jumperVanished || !m._showingExclaim) continue;', 'if (m.hp <= 0 || m.jumperVanished || m.id !== playtestThreatId()) continue;');
replaceOnce("function drawPlaytestThreat(){const layer=dangerReveal||(turnState.phase==='player_select'?dangerForecast:null),m=layer&&monsters.find(x=>x.id===layer.monsterId);if(!m)return;const p=project(m.px,m.py);ctx.save();ctx.strokeStyle='#fff1a8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,CELL*0.48,0,Math.PI*2);ctx.stroke();ctx.restore();}", "function playtestThreatId(){if(!inCombat)return null;const layer=dangerReveal||(turnState.phase==='player_select'?dangerForecast:null);return layer?.monsterId??null;}");
replaceOnce('亮圈标识来源','红色感叹号标识来源');

// 对远程怪显示所有可用射击方向的完整射线；只读取阻挡格，不更改地形。
replaceOnce("  return {red:threat.red,yellow:threat.yellow,monsterId:m.id};}", `  const shots=(MONSTER_DB[m.cfgId]?.actions||[]).filter(a=>a.type==='shoot_fan'||a.type==='shoot_single');
  if(shots.length){const area=new Set();for(const shot of shots){const directions=shot.type==='shoot_fan'?['up','down','left','right','up-left','up-right','down-left','down-right']:['up','down','left','right'];for(const name of directions){const d=DIR_VEC[name],range=shot.range||4;for(let step=1;step<=range;step++){const c=m.col+d.dx*step,r=m.row+d.dy*step;if(c<0||c>=COLS||r<0||r>=ROWS)break;const tile=currentRoomGrid?.[c]?.[r];if(tile!==undefined&&TILE_BLOCKS_BULLET[tile])break;area.add(c+','+r);}}}return {red:area,yellow:new Set(),monsterId:m.id};}
  return {red:threat.red,yellow:threat.yellow,monsterId:m.id};}`);


// 自定义组合保留在独立测试场景中，重置时复用已应用的配置。
replaceOnce('<select id="pt-scene" style="width:100%;padding:5px"></select>', '<select id="pt-scene" style="width:100%;padding:5px"></select><fieldset style="margin:8px 0;padding:6px;border:1px solid #aa8456"><legend>自定义怪物组合</legend><label>裂口尸 <input id="pt-maw-count" type="number" min="0" max="8" step="1" value="2" style="width:52px"></label> <label>浮游眼 <input id="pt-eye-count" type="number" min="0" max="4" step="1" value="1" style="width:52px"></label><p style="margin:4px 0;font-size:12px">合计 1–8 只；浮游眼最多 4 只。固定位置生成，重置保留组合。</p><button id="pt-custom-start" type="button">开始自定义组合</button></fieldset>');
replaceOnce(" {name:'5 确定与随机组合',walls:[[6,1],[6,5]],enemies:[['crack_maw_i',8,3],['flying_eye_i',10,5]]}\n];", " {name:'5 确定与随机组合',walls:[[6,1],[6,5]],enemies:[['crack_maw_i',8,3],['flying_eye_i',10,5]]},\n {name:'自定义：裂口尸×2、浮游眼×1',walls:[],enemies:[['crack_maw_i',8,1],['crack_maw_i',8,5],['flying_eye_i',10,3]]}\n];");
replaceOnce("  el('pt-scene').onchange=", `  el('pt-maw-count').value='2';el('pt-eye-count').value='1';
  el('pt-custom-start').onclick=()=>{
    const a=el('pt-maw-count').value.trim(),b=el('pt-eye-count').value.trim(),maw=Number(a),eye=Number(b);
    if(!a||!b||!Number.isInteger(maw)||!Number.isInteger(eye)||maw<0||eye<0||eye>4||maw+eye<1||maw+eye>8){ptStatus('请输入有效数量：合计 1–8 只，浮游眼最多 4 只。');return;}
    const positions=[[8,1],[8,5],[10,3],[6,1],[6,5],[10,1],[10,5],[7,3]],enemies=[];
    for(let i=0;i<maw+eye;i++){const pos=positions[i];enemies.push([i<maw?'crack_maw_i':'flying_eye_i',pos[0],pos[1]]);}
    const slot=PT_SCENES.length-1;PT_SCENES[slot]={name:'自定义：裂口尸×'+maw+'、浮游眼×'+eye,walls:[],enemies};
    el('pt-scene').innerHTML=PT_SCENES.map((scene,i)=>'<option value="'+i+'">'+scene.name+'</option>').join('');startPlaytest(slot);
  };
  el('pt-scene').onchange=`);


// 锁定回合结束前的危险范围与来源，只由该怪物的攻击对玩家结算伤害。
replaceOnce('let playtestMonsterHitThisTurn=false;', 'let playtestMonsterHitThisTurn=false,playtestLockedThreatId=null;');
replaceOnce('playtestMonsterHitThisTurn=false;playtestScene=', 'playtestMonsterHitThisTurn=false;playtestLockedThreatId=null;playtestScene=');
replaceOnce('function startMonsterTurn() {\n  playtestMonsterHitThisTurn=false;', 'function startMonsterTurn() {\n  playtestMonsterHitThisTurn=false;playtestLockedThreatId=dangerForecast?.monsterId??null;');
replaceOnce('  const resolved = simulateResolvedDanger(dangerExecutionSeed);\n  const source=dangerForecast?.monsterId;\n  dangerReveal = {red:new Set(resolved.bySource.get(source)||[]),yellow:new Set(),monsterId:source};', '  dangerReveal = {red:new Set(dangerForecast?.red||[]),yellow:new Set(dangerForecast?.yellow||[]),monsterId:playtestLockedThreatId};');
replaceOnce('function damagePlayer(amount) {\n  if (turnState.phase === "monster_turn" && playtestMonsterHitThisTurn) return;', 'function damagePlayer(amount, attackerId = null) {\n  if (turnState.phase === "monster_turn" && (attackerId !== playtestLockedThreatId || playtestLockedThreatId === null || playtestMonsterHitThisTurn)) return;');
replaceOnce('damagePlayer(0.5);\n          shatterBullet(b); continue;', 'damagePlayer(0.5, b.ownerId);\n          shatterBullet(b); continue;');
replaceOnce('damagePlayer(damage);\n          playerHitInSide = true;', 'damagePlayer(damage, m.id);\n          playerHitInSide = true;');
replaceOnce('damagePlayer(damage);\n            playerHit = true;', 'damagePlayer(damage, m.id);\n            playerHit = true;');
replaceOnce('if (!playerHit && tc === player.col && tr === player.row) { damagePlayer(0.5); playerHit = true; }', 'if (!playerHit && tc === player.col && tr === player.row) { damagePlayer(0.5, m.id); playerHit = true; }');
replaceOnce('damagePlayer(collisionDmg);', 'damagePlayer(collisionDmg, m.id);');

// 危险显示一直保持到怪物回合结束。
replaceOnce('    executeMonsterTurnActions();\n    dangerReveal=null;\n  }\n  return true;', '    executeMonsterTurnActions();\n  }\n  return true;');


// 多来源命中按预告怪物优先；其他实际命中保留，预告怪物死亡或未命中时回退结算。
replaceOnce('let playtestMonsterHitThisTurn=false,playtestLockedThreatId=null;', 'let playtestMonsterHitThisTurn=false,playtestLockedThreatId=null,playtestPendingHits=[];');
replaceOnce('playtestMonsterHitThisTurn=false;playtestLockedThreatId=null;playtestScene=', 'playtestMonsterHitThisTurn=false;playtestLockedThreatId=null;playtestPendingHits=[];playtestScene=');
replaceOnce('playtestMonsterHitThisTurn=false;playtestLockedThreatId=dangerForecast?.monsterId??null;', 'playtestMonsterHitThisTurn=false;playtestPendingHits=[];playtestLockedThreatId=dangerForecast?.monsterId??null;');
replaceOnce('function damagePlayer(amount, attackerId = null) {\n  if (turnState.phase === "monster_turn" && (attackerId !== playtestLockedThreatId || playtestLockedThreatId === null || playtestMonsterHitThisTurn)) return;\n  if(player.invincibleSteps <= 0) { playtestHits++; if(turnState.phase === "monster_turn") playtestMonsterHitThisTurn=true; }', `function damagePlayer(amount, attackerId = null) {
  if (player.invincibleSteps > 0) return;
  if (turnState.phase === 'monster_turn' && attackerId !== null) {
    if (playtestMonsterHitThisTurn) return;
    if (attackerId !== playtestLockedThreatId) {
      if (playtestLockedThreatId !== null && monsters.some(m=>m.id===playtestLockedThreatId&&m.hp>0&&!m.jumperVanished)) {
        if (!playtestPendingHits.some(h=>h.attackerId===attackerId)) playtestPendingHits.push({amount,attackerId});
        return;
      }
      promotePlaytestThreat(attackerId);
    }
    playtestMonsterHitThisTurn=true;
    playtestPendingHits=[];
  }
  playtestHits++;`);
replaceOnce('    if (idx !== -1) monsters.splice(idx, 1);\n    // 玩家回合中击杀怪物', '    if (idx !== -1) monsters.splice(idx, 1);\n    if(turnState.phase==="monster_turn" && m.id===playtestLockedThreatId) flushPlaytestHits();\n    // 玩家回合中击杀怪物');
replaceOnce('  applyMonsterTurnAfterEffects();\n  monsterTurnRandom = null;', '  applyMonsterTurnAfterEffects();\n  flushPlaytestHits();\n  monsterTurnRandom = null;');
replaceOnce('function selectPlaytestThreat(result){const at=player.col+', 'function selectPlaytestThreat(result, forcedId=null){const at=player.col+');
replaceOnce('for(const m of monsters){const threat=result.byMonster.get(m.id);', 'for(const m of monsters){if(forcedId!==null&&m.id!==forcedId)continue;const threat=result.byMonster.get(m.id);');
replaceOnce('function playtestThreatId(){', `function promotePlaytestThreat(id){
  playtestLockedThreatId=id;
  const result=dangerForecastJob?.result;
  const display=result?selectPlaytestThreat(result,id):null;
  if(dangerReveal)dangerReveal=display&&display.monsterId===id?{...display}:{red:new Set(),yellow:new Set(),monsterId:id};
}
function flushPlaytestHits(){
  if(playtestMonsterHitThisTurn||!playtestPendingHits.length)return;
  const hit=playtestPendingHits.shift();promotePlaytestThreat(hit.attackerId);damagePlayer(hit.amount,hit.attackerId);
}
function playtestThreatId(){`);


// 预告怪物失效时，让切换后的提示保留短暂时间；后续攻击效果只执行一次。
replaceOnce('let playtestMonsterHitThisTurn=false,playtestLockedThreatId=null,playtestPendingHits=[];', 'let playtestMonsterHitThisTurn=false,playtestLockedThreatId=null,playtestPendingHits=[],playtestFallbackHold=0,playtestAfterEffectsDone=false;');
replaceOnce('playtestMonsterHitThisTurn=false;playtestLockedThreatId=null;playtestPendingHits=[];playtestScene=', 'playtestMonsterHitThisTurn=false;playtestLockedThreatId=null;playtestPendingHits=[];playtestFallbackHold=0;playtestAfterEffectsDone=false;playtestScene=');
replaceOnce('playtestMonsterHitThisTurn=false;playtestPendingHits=[];playtestLockedThreatId=dangerForecast?.monsterId??null;', 'playtestMonsterHitThisTurn=false;playtestPendingHits=[];playtestFallbackHold=0;playtestAfterEffectsDone=false;playtestLockedThreatId=dangerForecast?.monsterId??null;');
replaceOnce('function promotePlaytestThreat(id){\n  playtestLockedThreatId=id;', 'function promotePlaytestThreat(id){\n  if(playtestLockedThreatId!==id)playtestFallbackHold=0.65;\n  playtestLockedThreatId=id;');
replaceOnce('  applyMonsterTurnAfterEffects();\n  flushPlaytestHits();\n  monsterTurnRandom = null;', '  if(!playtestAfterEffectsDone){playtestAfterEffectsDone=true;applyMonsterTurnAfterEffects();}\n  flushPlaytestHits();\n  if(playtestFallbackHold>0)return;\n  monsterTurnRandom = null;');
replaceOnce('  if (updateDangerReveal(dt)) {', '  if(playtestFallbackHold>0){playtestFallbackHold=Math.max(0,playtestFallbackHold-dt);render();requestAnimationFrame(gameLoop);return;}\n\n  if (updateDangerReveal(dt)) {');
// 优先预告必然命中的怪物；没有时才选择可能命中的怪物。
replaceOnce("for(const m of monsters){if(forcedId!==null&&m.id!==forcedId)continue;const threat=result.byMonster.get(m.id);if(threat&&(threat.red.has(at)||threat.yellow.has(at))){", "for(const pass of ['red','yellow'])for(const m of monsters){if(forcedId!==null&&m.id!==forcedId)continue;const threat=result.byMonster.get(m.id);if(threat&&threat[pass].has(at)){");


// 预告怪物在命中前死亡时，立即从仍存活怪物的预测中重新选择。
replaceOnce('if(turnState.phase==="monster_turn" && m.id===playtestLockedThreatId) flushPlaytestHits();', 'if(turnState.phase==="monster_turn" && m.id===playtestLockedThreatId) reselectPlaytestThreatAfterDeath();');
replaceOnce('function flushPlaytestHits(){', `function reselectPlaytestThreatAfterDeath(){
  if(playtestMonsterHitThisTurn)return;
  flushPlaytestHits();
  if(playtestMonsterHitThisTurn)return;
  const next=dangerForecastJob?.result?selectPlaytestThreat(dangerForecastJob.result):null;
  if(next&&next.monsterId!==null)promotePlaytestThreat(next.monsterId);
  else {playtestLockedThreatId=null;if(dangerReveal)dangerReveal={red:new Set(),yellow:new Set(),monsterId:null};}
}
function flushPlaytestHits(){`);

// 固定回合开始时的距离顺序，逐只执行完整行动；预测和实际共用同一套调度。
replaceOnce('let monsterExecStepIdx = 0;', 'let monsterExecStepIdx = 0;\nconst SEQUENTIAL_ACTION={stepSeconds:0.16,betweenSeconds:0.12};\nlet monsterActionOrder=[],monsterActionIndex=0,activeMonsterId=null,activeMonsterAttackDone=false;');
replaceOnce("    'let monsterExecTimer=0,monsterExecStepIdx=0,finished=false;const DUKE_ANIM_SPEED=200;'+", "    'let monsterExecTimer=0,monsterExecStepIdx=0,finished=false,monsterActionOrder=[],monsterActionIndex=0,activeMonsterId=null,activeMonsterAttackDone=false;const SEQUENTIAL_ACTION={stepSeconds:0.16,betweenSeconds:0.12},DUKE_ANIM_SPEED=200;'+");
replaceOnce('function calcAllMonsterPaths() {', 'function calcAllMonsterPaths(onlyId=null) {');
replaceOnce("  for (const m of monsters) {\n    // Boss Jumper 的移动由 processJumperAction", "  for (const m of monsters) {\n    if(onlyId!==null && m.id!==onlyId)continue;\n    // Boss Jumper 的移动由 processJumperAction");
replaceOnce('  sanitizeMonsterPaths();\n}', '  sanitizeMonsterPaths(onlyId);\n}');
replaceOnce('function sanitizeMonsterPaths(){', 'function sanitizeMonsterPaths(onlyId=null){');
replaceOnce('    if(m.jumperVanished||!m.predictedPath)continue;\n    const blocked=', '    if(m.jumperVanished||!m.predictedPath||(onlyId!==null&&m.id!==onlyId))continue;\n    const blocked=');
const seqBlock=html.match(/function executeMonsterTurnActions\(\) \{[\s\S]*?\n\}\n\nfunction applyMonsterTurnAfterEffects\(\) \{/);
if(!seqBlock)throw Error('未找到怪物回合调度');
html=html.replace(seqBlock[0], `function executeMonsterTurnActions() {
  monsterExecStepIdx=0;monsterExecTimer=0;monsterActionIndex=0;activeMonsterId=null;activeMonsterAttackDone=false;
  monsterActionOrder=monsters.filter(m=>m.hp>0&&!m.jumperVanished).slice().sort((a,b)=>{
    const da=Math.max(Math.abs(player.col-a.col),Math.abs(player.row-a.row));
    const db=Math.max(Math.abs(player.col-b.col),Math.abs(player.row-b.row));return da-db||a.id-b.id;
  }).map(m=>m.id);
  for(const m of monsters){m.predictedPath=[];m._turnAction=null;}
}
function updateMonsterTurn(dt) {
  if(activeMonsterId===null){
    let m=null;while(monsterActionIndex<monsterActionOrder.length&&!m){const id=monsterActionOrder[monsterActionIndex++];m=monsters.find(x=>x.id===id&&x.hp>0&&!x.jumperVanished)||null;}
    if(!m){finishMonsterTurn();return;}
    activeMonsterId=m.id;activeMonsterAttackDone=false;monsterExecStepIdx=0;monsterExecTimer=0;
    calcAllMonsterPaths(m.id);return;
  }
  const m=monsters.find(x=>x.id===activeMonsterId&&x.hp>0&&!x.jumperVanished);
  if(!m){activeMonsterId=null;return;}
  if(bullets.some(b=>b.source==='monster'&&b.ownerId===m.id&&b.phase==='flying'))return;
  monsterExecTimer+=dt;
  if(monsterExecStepIdx<(m.predictedPath||[]).length){
    if(monsterExecTimer<SEQUENTIAL_ACTION.stepSeconds)return;monsterExecTimer=0;
    const step=m.predictedPath[monsterExecStepIdx++];m.col=step.toCol;m.row=step.toRow;
    if(currentRoomGrid&&currentRoomGrid[m.col][m.row]===TILE.SPIKE)damageMonster(m,5);
    return;
  }
  if(!activeMonsterAttackDone){
    if(monsterExecTimer<SEQUENTIAL_ACTION.stepSeconds)return;monsterExecTimer=0;activeMonsterAttackDone=true;
    if(m._turnAction&&m._turnAction.type==='chase')resolveAfterEffects(m._turnAction,{monster:m});
    return;
  }
  if(monsterExecTimer<SEQUENTIAL_ACTION.betweenSeconds)return;
  activeMonsterId=null;monsterExecTimer=0;
}

function applyMonsterTurnAfterEffects() {`);
replaceOnce('if(!playtestAfterEffectsDone){playtestAfterEffectsDone=true;applyMonsterTurnAfterEffects();}', 'if(!playtestAfterEffectsDone)playtestAfterEffectsDone=true;');
replaceOnce("    'function finishMonsterTurn(){if(hasPendingMonsterAttack())return;applyMonsterTurnAfterEffects();finished=true;}'+", "    'function finishMonsterTurn(){if(hasPendingMonsterAttack())return;finished=true;}'+");
replaceOnce('for(const pass of [\'red\',\'yellow\'])for(const m of monsters)', '  for(const pass of [\'red\',\'yellow\'])for(const m of monsters.slice().sort((a,b)=>Math.max(Math.abs(player.col-a.col),Math.abs(player.row-a.row))-Math.max(Math.abs(player.col-b.col),Math.abs(player.row-b.row))||a.id-b.id))');


// 缩短逐只行动时间；子弹按小步推进，避免加速时跨过碰撞格。
const oldTiming='SEQUENTIAL_ACTION={stepSeconds:0.16,betweenSeconds:0.12}';
const newTiming='SEQUENTIAL_ACTION={stepSeconds:0.09,betweenSeconds:0.025,projectileScale:1.2,bulletMaxStepSeconds:0.012}';
if(html.split(oldTiming).length!==3)throw Error('逐只行动参数数量异常');html=html.split(oldTiming).join(newTiming);
replaceOnce('const MONSTER_ANIM_SPEED = 170;', 'const MONSTER_ANIM_SPEED = 300;');
replaceOnce('speed: CFG.BULLET_SPEED * 0.6,   // 怪物子弹稍慢', 'speed: CFG.BULLET_SPEED * SEQUENTIAL_ACTION.projectileScale,   // 测试版快速播放');
replaceOnce('function updateBullets(dt) {', 'function updateBullets(dt) {\n  if(dt>SEQUENTIAL_ACTION.bulletMaxStepSeconds){const count=Math.ceil(dt/SEQUENTIAL_ACTION.bulletMaxStepSeconds);for(let i=0;i<count;i++)updateBullets(dt/count);return;}');
replaceOnce('  dangerRevealRemaining = 0.65;', '  dangerRevealRemaining = 0.15;');
replaceOnce('if(playtestLockedThreatId!==id)playtestFallbackHold=0.65;', 'if(playtestLockedThreatId!==id)playtestFallbackHold=0.30;');

// 恢复此前速度；射击与移动分阶段并行显示，逻辑按怪物回合起点的顺序结算。
const faster='SEQUENTIAL_ACTION={stepSeconds:0.09,betweenSeconds:0.025,projectileScale:1.2,bulletMaxStepSeconds:0.012}';
const restored='SEQUENTIAL_ACTION={stepSeconds:0.16,betweenSeconds:0.12,projectileScale:0.6,bulletMaxStepSeconds:0.012}';
if(html.split(faster).length!==3)throw Error('速度参数数量异常');html=html.split(faster).join(restored);
replaceOnce('const MONSTER_ANIM_SPEED = 300;', 'const MONSTER_ANIM_SPEED = 170;');
replaceOnce('  dangerRevealRemaining = 0.15;', '  dangerRevealRemaining = 0.65;');
replaceOnce('if(playtestLockedThreatId!==id)playtestFallbackHold=0.30;', 'if(playtestLockedThreatId!==id)playtestFallbackHold=0.65;');
replaceOnce('let monsterActionOrder=[],monsterActionIndex=0,activeMonsterId=null,activeMonsterAttackDone=false;', "let monsterActionOrder=[],monsterActionIndex=0,activeMonsterId=null,activeMonsterAttackDone=false,monsterGroupPhase='idle';");
replaceOnce("finished=false,monsterActionOrder=[],monsterActionIndex=0,activeMonsterId=null,activeMonsterAttackDone=false;const SEQUENTIAL_ACTION", "finished=false,monsterActionOrder=[],monsterActionIndex=0,activeMonsterId=null,activeMonsterAttackDone=false,monsterGroupPhase=\"idle\";const SEQUENTIAL_ACTION");
const oldScheduler=html.match(/function executeMonsterTurnActions\(\) \{[\s\S]*?\n\}\n\nfunction applyMonsterTurnAfterEffects\(\) \{/);
if(!oldScheduler)throw Error('没有找到逐只调度器');
html=html.replace(oldScheduler[0], `function executeMonsterTurnActions() {
  monsterExecStepIdx=0;monsterExecTimer=0;monsterActionIndex=0;activeMonsterId=null;activeMonsterAttackDone=false;monsterGroupPhase='shoot';
  monsterActionOrder=monsters.filter(m=>m.hp>0&&!m.jumperVanished).slice().sort((a,b)=>{
    const da=Math.max(Math.abs(player.col-a.col),Math.abs(player.row-a.row));
    const db=Math.max(Math.abs(player.col-b.col),Math.abs(player.row-b.row));return da-db||a.id-b.id;
  }).map(m=>m.id);
  for(const m of monsters){m.predictedPath=[];m._turnAction=null;}
  // 各怪按固定顺序选定意图并发射，画面中的子弹会同时前进。
  for(const id of monsterActionOrder){const m=monsters.find(x=>x.id===id&&x.hp>0&&!x.jumperVanished);if(m)calcAllMonsterPaths(id);}
}
function updateMonsterTurn(dt) {
  if(monsterGroupPhase==='shoot'){
    if(bullets.some(b=>b.source==='monster'&&b.phase==='flying'))return;
    // 依次预留各怪的最终落点，确保可以穿越但不会停在同一格。
    const starts=new Map(monsters.map(m=>[m.id,{col:m.col,row:m.row}]));
    for(const id of monsterActionOrder){
      const m=monsters.find(x=>x.id===id&&x.hp>0&&!x.jumperVanished);if(!m)continue;
      if(m._turnAction&&m._turnAction.type==='chase')m.predictedPath=calcMonsterPath(m,player.col,player.row);
      const path=m.predictedPath||[];
      while(path.length){const end=path[path.length-1];if((end.toCol!==player.col||end.toRow!==player.row)&&!isMonsterAt(end.toCol,end.toRow,m.id))break;path.pop();}
      if(path.length){const end=path[path.length-1];m.col=end.toCol;m.row=end.toRow;}
    }
    for(const m of monsters){const p=starts.get(m.id);if(p){m.col=p.col;m.row=p.row;}}
    monsterGroupPhase='move';monsterExecTimer=0;monsterExecStepIdx=0;return;
  }
  if(monsterGroupPhase==='move'){
    monsterExecTimer+=dt;if(monsterExecTimer<SEQUENTIAL_ACTION.stepSeconds)return;monsterExecTimer=0;
    let moved=false;
    for(const id of monsterActionOrder){
      const m=monsters.find(x=>x.id===id&&x.hp>0&&!x.jumperVanished);if(!m)continue;
      const step=(m.predictedPath||[])[monsterExecStepIdx];if(!step)continue;moved=true;m.col=step.toCol;m.row=step.toRow;
      if(currentRoomGrid&&currentRoomGrid[m.col][m.row]===TILE.SPIKE)damageMonster(m,5);
    }
    if(moved){monsterExecStepIdx++;return;}
    // 移动完成后按同一顺序执行相邻攻击。
    for(const id of monsterActionOrder){const m=monsters.find(x=>x.id===id&&x.hp>0&&!x.jumperVanished);if(m&&m._turnAction&&m._turnAction.type==='chase')resolveAfterEffects(m._turnAction,{monster:m});}
    monsterGroupPhase='settle';monsterExecTimer=0;return;
  }
  if(monsterGroupPhase==='settle'){
    monsterExecTimer+=dt;if(monsterExecTimer<SEQUENTIAL_ACTION.betweenSeconds)return;
    finishMonsterTurn();
  }
}

function applyMonsterTurnAfterEffects() {`);
replaceOnce('function updateBullets(dt) {\n  if(dt>SEQUENTIAL_ACTION.bulletMaxStepSeconds)', 'function updateBullets(dt) {\n  if(turnState.phase===\'monster_turn\'&&monsterActionOrder.length){const rank=id=>{const i=monsterActionOrder.indexOf(id);return i<0?Number.MAX_SAFE_INTEGER:i;};bullets.sort((a,b)=>rank(b.ownerId)-rank(a.ownerId));}\n  if(dt>SEQUENTIAL_ACTION.bulletMaxStepSeconds)');


// 浮游眼只有当前扇形弹道确实覆盖玩家时射击；否则沿用随机移动。
replaceOnce('function getMonsterShootDirections(mCol, mRow, pCol, pRow) {', `function canMonsterShotHitPlayer(m,action){
  const directions=getMonsterShootDirections(m.col,m.row,player.col,player.row),range=action.range||4;
  for(const base of directions){
    const rays=action.type==='shoot_fan'?[base,...getSpreadDirs(base)]:[base];
    for(const name of rays){const v=DIR_VEC[name];for(let n=1;n<=range;n++){
      const c=m.col+v.dx*n,r=m.row+v.dy*n;
      if(c<0||c>=COLS||r<0||r>=ROWS)break;
      const tile=currentRoomGrid?.[c]?.[r];if(tile!==undefined&&TILE_BLOCKS_BULLET[tile])break;
      if(c===player.col&&r===player.row)return true;
    }}
  }
  return false;
}
function getMonsterShootDirections(mCol, mRow, pCol, pRow) {`);
replaceOnce('    // 按 actionType 分发执行\n    switch (selectedAction.type) {', `    // 只在射线能够到达玩家时射击；否则保留原有游走行为。
    if((selectedAction.type==='shoot_fan'||selectedAction.type==='shoot_single')&&!canMonsterShotHitPlayer(m,selectedAction)){
      const wander=(cfg.actions||[]).find(a=>a.type==='random_wander')||selectedAction.after_effect;
      if(wander&&wander.type==='random_wander'){
        const steps=resolveSteps(wander.steps,wander.stepMode,wander.stepWeights,turnIdx);
        m.moveSpeed=steps;m._turnAction=wander;m._turnAfterAction=null;m.predictedPath=chooseWanderPath(m,steps);
      }else{m._turnAction=null;m._turnAfterAction=null;m.predictedPath=[];}
      continue;
    }
    // 按 actionType 分发执行
    switch (selectedAction.type) {`);
replaceOnce('getWanderPaths,getMonsterShootDirections,chooseMonsterShootDirection', 'getWanderPaths,canMonsterShotHitPlayer,getMonsterShootDirections,chooseMonsterShootDirection');


// 威胁预测记录攻击所属阶段：射击优先，其次移动后的攻击。
replaceOnce('noteDangerCell(mBg.col, mBg.row, b.ownerId);', 'noteDangerCell(mBg.col, mBg.row, b.ownerId, "shoot");');
replaceOnce("    'const cells=new Set(),bySource=new Map(),random=makeMonsterTurnRandom(seed);let choiceCursor=0;'+", "    'const cells=new Set(),bySource=new Map(),byPhase=new Map(),random=makeMonsterTurnRandom(seed);let choiceCursor=0;'+");
replaceOnce(`    'function noteDangerCell(c,r,id){if(id!=null&&c>=0&&c<COLS&&r>=0&&r<ROWS){const k=c+","+r;cells.add(k);if(!bySource.has(id))bySource.set(id,new Set());bySource.get(id).add(k);}}'+`, `    'function noteDangerCell(c,r,id,phase="move"){if(id!=null&&c>=0&&c<COLS&&r>=0&&r<ROWS){const k=c+","+r;cells.add(k);if(!bySource.has(id))bySource.set(id,new Set());bySource.get(id).add(k);if(!byPhase.has(id))byPhase.set(id,{shoot:new Set(),move:new Set()});byPhase.get(id)[phase].add(k);}}'+`);
replaceOnce("    'return {cells,bySource,monsters,bombs,currentRoomGrid};');", "    'return {cells,bySource,byPhase,monsters,bombs,currentRoomGrid};');");
replaceOnce('done:false,perMonster:new Map(input.world.monsters.map(m=>[m.id,{union:new Set(),intersection:null}]))', 'done:false,perPhase:new Map(input.world.monsters.map(m=>[m.id,{shoot:new Set(),move:new Set()}])),perMonster:new Map(input.world.monsters.map(m=>[m.id,{union:new Set(),intersection:null}]))');
replaceOnce('      const {cells,bySource}=job.simulation(job.input,0,decisions);', '      const {cells,bySource,byPhase}=job.simulation(job.input,0,decisions);\n      for(const [id,record] of job.perPhase){const source=byPhase.get(id);if(source){for(const cell of source.shoot)record.shoot.add(cell);for(const cell of source.move)record.move.add(cell);}}');
replaceOnce('    job.result={red,yellow,byMonster};', '    job.result={red,yellow,byMonster,byPhase:job.perPhase};');
replaceOnce("for(const pass of ['red','yellow'])for(const m of monsters.slice().sort((a,b)=>Math.max(Math.abs(player.col-a.col),Math.abs(player.row-a.row))-Math.max(Math.abs(player.col-b.col),Math.abs(player.row-b.row))||a.id-b.id)){if(forcedId!==null&&m.id!==forcedId)continue;const threat=result.byMonster.get(m.id);if(threat&&threat[pass].has(at)){", "for(const phase of ['shoot','move'])for(const m of monsters.slice().sort((a,b)=>Math.max(Math.abs(player.col-a.col),Math.abs(player.row-a.row))-Math.max(Math.abs(player.col-b.col),Math.abs(player.row-b.row))||a.id-b.id)){if(forcedId!==null&&m.id!==forcedId)continue;const threat=result.byMonster.get(m.id),phaseThreat=result.byPhase?.get(m.id);if(threat&&phaseThreat&&phaseThreat[phase].has(at)){");

if(/fetch\s*\(\s*['"\x60]Configs\//.test(html)||/https?:\/\//.test(html.replace(/\/\/[^\n]*/g,'')))console.warn('请检查是否残留外部引用');
fs.writeFileSync(out,html,'utf8');console.log('生成独立入口',out,html.length);
