// ==================== 房间/楼层系统 ====================
const FLOOR_CONFIG = {1:{name:'地牢1层',roomCount:[8,10],bossCount:[1,1],treasureCount:[1,1],shopCount:[0,0]},2:{name:'地牢2层',roomCount:[10,12],bossCount:[1,1],treasureCount:[1,2],shopCount:[0,1]},3:{name:'地牢3层',roomCount:[12,15],bossCount:[1,1],treasureCount:[2,2],shopCount:[1,1]}};
const DOOR_POS = {up:{col:6,row:0},down:{col:6,row:6},left:{col:0,row:3},right:{col:12,row:3}};
const DOOR_FROM_DIR = {up:'down',down:'up',left:'right',right:'left'};

let poolTemplates = {};        // 从 pool.json 加载的模板
let allFloors = {};            // { floorNum: { rooms, edges, layout, startRoomId, bossRoomId, treasureRoomIds } }
let currentFloor = null;       // 当前楼层数据
let currentRoomId = null;      // 当前房间 ID
let currentRoomGrid = null;    // 当前房间 grid[col][row]
let transition = null;         // { active, dir, offset, fromRoom, toRoom, playerEntryPos }
let inCombat = false;          // 当前房间是否有存活怪物
let gameStarted = false;       // 是否已开始游戏（开始菜单期间=false）
let gameOver = false;          // 是否死亡/通关（阻止继续操作）
let monstersKilled = 0;        // 累计击杀怪物数（不受Esc回溯影响）
let itemsCollected = [];       // 累计拾取道具名称列表（不受Esc回溯影响）
let tileData = {};             // { `${col},${row}`: { type, hp, _loot } }  可变瓷砖状态 (_loot: 房间生成时预roll的掉落列表)

function initTileData(){
  tileData={};
  if(!currentRoomGrid)return;
  for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){
    const t=currentRoomGrid[c][r];
    if(t===TILE.POOP)tileData[`${c},${r}`]={type:'poop',hp:4, _loot: rollResourceDrop('resource_drop_terrain_poop')};
    if(t===TILE.ROCK)tileData[`${c},${r}`]={type:'rock',hp:99, _loot: rollResourceDrop('resource_drop_terrain_rock')};
  }
}

function hitTile(col,row,dmg){
  const k=`${col},${row}`;const td=tileData[k];
  if(!td)return false;
  td.hp-=dmg;
  if(td.hp<=0){
    const terrainType = td.type; // 'rock' 或 'poop'
    const preLoot = td._loot;    // 房间生成时预roll的掉落，保证ESC回溯后再次破坏结果一致
    delete tileData[k];
    currentRoomGrid[col][row]=TILE.FLOOR;
    // 刷新 BFS
    if(turnState.phase==='player_select')pendingReachableRefresh=true;
    spawnBloodParticles(gridToPixel(col,row).x,gridToPixel(col,row).y,5);
    // 地形破坏掉落 (优先使用预roll结果)
    rollTerrainDestroyDrop(col, row, terrainType, preLoot);
    // 地形状态改变后保存checkpoint，确保BFS回退时地形保持破坏状态
    saveCheckpoint();
    return true;
  }
  return false;
}

function hasMonstersAlive(){return monsters.length>0&&monsters.some(m=>m.hp>0);}
let keepCombatForBombs = true;
function updateRoomCombatState(){
  if(actionHistoryActive()&&!hasMonstersAlive())return;
  const wasInCombat=inCombat;
  inCombat=hasMonstersAlive();
  if(!inCombat&&wasInCombat){// 房间清空：结束战斗
    turnState.phase='player_select';
    turnState.mAP=turnState.maxMAP;turnState.aAP=turnState.maxAAP;
    turnState.hasShot=false;
    pendingReachableRefresh=true;
    monsterExecTimer=0;monsterExecStepIdx=0;
    turnState.monsterTurnCounter=0;

    // 房间清空掉落
    rollRoomClearDrop();
    SFX.door();
    // 战斗模式下清空怪物后如果还有炸弹，保持战斗模式（但门已开）
    if (keepCombatForBombs && bombs.some(b => b.roomId === currentRoomId)) {
      inCombat = true;
      // 保持移动行动力（炸弹房间玩家仍可移动和射击）
      turnState.maxMAP = Math.floor(playerStats.moveSpeed);
      turnState.mAP = turnState.maxMAP;
      turnState.maxAAP = Math.floor(playerStats.fireRate);
      turnState.aAP = turnState.maxAAP;
      turnState.reachableTiles = calcReachableTiles(player.col, player.row, turnState.mAP);
      updateActionBar();
    }
    // Boss房清怪后掉落道具 + 自动生成梯子
    const room=currentFloor.rooms.find(r=>r.id===currentRoomId);
    if(room&&room.type==='boss'){
      spawnBossRoomItem();
      // 自动在从上到下第2行、从左到右第7格放置前往下一层的梯子
      if(!room.bossLadderPlaced){
        currentRoomGrid[6][1]=TILE.LADDER;
        room.bossLadderPlaced=true;
      }
    }

    // === 同步回房间存储（simulateFromCheckpoint / restoreTurnSnapshot 可能打断了引用，房间清空时重建链接） ===
    if (room) {
      room._groundResources = resourcesOnGround;
      room._groundItems = itemsOnGround;
    }

    saveCheckpoint();updateActionBar();updateUI();
  }
  if(inCombat&&!wasInCombat){// 刚进入战斗
    player.invincibleSteps=0; // 清除探索模式无敌步数
    turnState.phase='player_select';
    turnState.turnNumber=0;
    resetTurnAP();
    // 触发交叉剑战斗开始动画
    battleStartAnim.active = true;
    battleStartAnim.timer = 0;
    SFX.battle();
  }
  updateDoorsLocked();
  updateUI(); // 同步 AP 面板显隐
}

function updateDoorsLocked(){
  const room=currentFloor.rooms.find(r=>r.id===currentRoomId);
  if(!room)return;
  const hasLivingMonsters = monsters.filter(m => m.hp > 0 && !m.jumperVanished).length > 0;
  for(const dir of['up','down','left','right']){
    if(room.doors[dir]){
      // 被炸弹破坏的门始终保持打开
      if(room.doors[dir].destroyed) {
        room.doors[dir].open = true;
      } else {
        room.doors[dir].open = !hasLivingMonsters; // 只判断怪物，不判断炸弹
      }
    }
  }
}

// 模板加载
async function loadTemplates(){
  try{const r=await fetch('Configs/pool.json?'+Date.now());if(r.ok){poolTemplates=await r.json();return;}}catch(e){}
  console.log('⚠ 无法加载 pool.json, 使用内置模板');
}
function getTpl(key){
  if(poolTemplates[key])return poolTemplates[key];
  const b=BUILTIN_TEMPLATES();const v=b[key];return v||b['open'];
}
function BUILTIN_TEMPLATES(){
  return {
    'open':{name:'空旷大厅',types:['start','normal','treasure','shop'],tiles:['.............','.............','.............','.............','.............','.............','.............'],allowedMovement:['地面','飞行']},
    'boss_arena':{name:'Boss竞技场',types:['boss'],tiles:['.............','...#.....#...','.............','.......#.....','.............','...#.....#...','.............'],allowedMovement:['地面','飞行']},
    'cross_rocks':{name:'十字岩石',types:['normal','treasure'],tiles:['.............','......#......','......#......','...##.#.##...','......#......','......#......','.............'],allowedMovement:['地面','飞行']},
    'four_corners':{name:'四角岩石',types:['normal','treasure'],tiles:['P##.......##P','.##.......##.','.............','.............','.............','.##.......##.','P##.......##P'],allowedMovement:['地面','飞行']},
    'pillars':{name:'四柱大厅',types:['normal','treasure'],tiles:['.............','...#P...P#...','.............','.....#.#.....','.............','...#P...P#...','.............'],allowedMovement:['地面','飞行']},
    'corridor':{name:'横向窄道',types:['normal'],tiles:['..###...###..','..###...###..','.............','.............','.............','..###...###..','..###...###..'],allowedMovement:['地面','飞行']},
    'corridor_v':{name:'纵向窄道',types:['normal'],tiles:['O..##...##..O','...##...##...','...#.....#...','.....P#P.....','...#.....#...','...##...##...','O..##...##..O'],allowedMovement:['地面','飞行']},
    'scattered':{name:'散落岩石',types:['normal'],tiles:['...........#.','.....#.......','.......#.....','..#..........','.........#...','......#......','...#.........'],allowedMovement:['地面','飞行']},
    'ring':{name:'环形壁垒',types:['normal','treasure'],tiles:['...##...##...','..#.......#..','..#........#.','.............','..#........#.','..#.......#..','...##...##...'],allowedMovement:['地面','飞行']},
    'room_split':{name:'裂半之室',types:['normal'],tiles:['.............','.....#^#.....','....#...^....','...##...##...','....^...#....','.....#^#.....','.............'],allowedMovement:['地面','飞行']},
    'alcoves':{name:'壁龛石室',types:['normal','treasure'],tiles:['..##P...P##..','.............','.#.........#.','.............','.#.........#.','.............','..##P...P##..'],allowedMovement:['地面','飞行']},
    'diagonal':{name:'斜岩通道',types:['normal'],tiles:['##...........','.##..........','..##.........','...##........','....##.......','.....##......','.............'],allowedMovement:['地面','飞行']},
  };
}

function resetGameToFloor1(){
  pendingPlayerTurnEnd=false;forcedLandingPending=false;movementEvents=[];movementPlanning=false;
  monsters=[];bullets.length=0;particles.length=0;damageNumbers.length=0;transition=null;
  monstersKilled = 0; itemsCollected = []; gameOver = false;
  player.col=6;player.row=3;const p=gridToPixel(6,3);player.px=p.x;player.py=p.y;
  player.targetPx=null;player.targetPy=null;player.animTime=0;player.facing='down';player.walkFrame=0;
  player.shootTimer=0;player.hitFlash=0;player.shakeX=0;player.shakeY=0;player.invincibleSteps=0;
  clearInventory();
  // 重置 playerStats 到初始值（clearInventory已调用recalcAllStats，但这里确保一下）
  playerStats.moveSpeed = 3; playerStats.fireRate = 3;
  // 清空资源
  resourcesOnGround = []; itemsOnGround = []; bombs = [];
  playerResources.coins = 0; playerResources.bombs = 0; playerResources.keys = 0;
  playerResources.blueHearts = 0;
  // 重置所有房间的运行时状态（地形、门、掉落物、标记等）
  for(let f=1;f<=3;f++){if(allFloors[f])allFloors[f].rooms.forEach(r=>{r.grid=r._initGrid?r._initGrid.map(col=>[...col]):r.grid;r.doors=r._initDoors?{up:r._initDoors.up?{...r._initDoors.up}:null,down:r._initDoors.down?{...r._initDoors.down}:null,left:r._initDoors.left?{...r._initDoors.left}:null,right:r._initDoors.right?{...r._initDoors.right}:null}:r.doors;r.bossLadderPlaced=false;r.itemSpawned=false;r.itemDropped=false;r.locked=r._initLocked||false;r._shopSlots=null;r._groundResources=[];r._groundItems=[];});}
  updateResourceUI();
  visitedRooms = new Set(); // 重置已访问记录
  playerStats.hp=playerStats.maxHp;
  currentFloor=allFloors[1];currentRoomId=currentFloor.startRoomId;
  visitedRooms.add(currentRoomId); // 起始房间已访问
  const room=currentFloor.rooms.find(r=>r.id===currentRoomId);currentRoomGrid=room.grid;
  initTileData();inCombat=false;
  turnState.phase='player_select';turnState.turnNumber=0;turnState.monsterTurnCounter=0;resetTurnAP();turnState.reachableTiles=new Set();
  buildHearts(playerStats.maxHp);buildBlueHearts();buildApDots('ui-aap-row',turnState.maxAAP);buildApDots('ui-map-row',turnState.maxMAP);
  updateDoorsLocked();updateUI();updateFloorUI();
  updateItemBar();
}
let _lastFloorHash='';
async function loadOrGenerateFloors(forceReload){
  try{
    const resp=await fetch('Configs/floor-data.json?'+Date.now());
    if(resp.ok){
      const text=await resp.text();
      // 若已有数据且内容未变且非强制，跳过重新加载
      if(_lastFloorHash===text&&Object.keys(allFloors).length>0)return false;
      _lastFloorHash=text;
      const data=JSON.parse(text);
      for(let f=1;f<=3;f++){allFloors[f]=data[f];allFloors[f].rooms.forEach(r=>{r.grid=r.grid&&r.grid.length>0?(Array.isArray(r.grid[0])&&r.grid.length===ROWS?transposeGridRowToCol(r.grid):r.grid):parseGrid(r.tplKey?getTpl(r.tplKey).tiles:BUILTIN_TEMPLATES()['open'].tiles);r.doors=r.doors||{up:null,down:null,left:null,right:null};r.bossLadderPlaced=r.bossLadderPlaced||false;r.locked=r.locked||false;r.type=r.type||'normal';r._initLocked=r.locked;r._shopSlots=null;r._groundResources=r._groundResources||[];r._groundItems=r._groundItems||[];r._initGrid=r.grid.map(col=>[...col]);r._initDoors={up:r.doors.up?{...r.doors.up}:null,down:r.doors.down?{...r.doors.down}:null,left:r.doors.left?{...r.doors.left}:null,right:r.doors.right?{...r.doors.right}:null};});}
      if(forceReload){console.log('🔄 检测到楼层更新，已重新加载');resetGameToFloor1();}
      return true;
    }
  }catch(e){}
  console.error('❌ 无法加载 floor-data.json，请先在地图编辑器中生成并导出楼层数据。');
  return false;
}
// 每隔3秒检测楼层文件变化
setInterval(()=>{if(document.visibilityState==='visible')loadOrGenerateFloors(true);},3000);

function enterFloor(floorNum){
  currentFloor=allFloors[floorNum];currentRoomId=currentFloor.startRoomId;
  const room=currentFloor.rooms.find(r=>r.id===currentRoomId);
  currentRoomGrid=room.grid;
  monsters.length=0;
  // 清空当前楼层所有炸弹和地面资源
  bombs = [];
  // 重置所有房间的地面资源和道具
  for (const r of currentFloor.rooms) { r._groundResources = []; r._groundItems = []; }
  resourcesOnGround = room._groundResources || [];
  itemsOnGround = room._groundItems || [];
  // 预初始化所有商店房间的槽位（进入新楼层时固定商品）
  const shopIds = currentFloor.shopRoomIds || [];
  for (const sid of shopIds) {
    const sroom = currentFloor.rooms.find(r => r.id === sid);
    if (sroom && !sroom._shopSlots) {
      rollShopSlots(sroom, floorNum);
    }
  }
  player.col=6;player.row=3;
  const p=gridToPixel(6,3);player.px=p.x;player.py=p.y;player.facing='down';
  player.targetPx=null;player.targetPy=null;player.animTime=0; // 防残留滑动
  player.invincibleSteps = 0; // 进入新楼层立刻结束无敌状态
  initTileData();
  visitedRooms.add(currentRoomId); // 起始房间标记已访问
  turnState.turnNumber=0;resetTurnAP();
  spawnRoomMonsters();  // 混合刷怪（仅首次进起始房间）
  updateUI();updateFloorUI();
  showFloorBanner(`第 ${floorNum} 层`);
  playFloorFade();
  if(gameStarted)SFX.floor();
}

function switchRoom(dir, fromPos){
  const room=currentFloor.rooms.find(r=>r.id===currentRoomId);
  const door=room.doors[dir];
  if(!door||!door.open)return false;
  // 被炸弹破坏的门：直接通过
  if(door.destroyed){/* 已破坏的门永久开启，do nothing */}
  const targetRoom=currentFloor.rooms.find(r=>r.id===door.targetRoomId);
  if(!targetRoom)return false;
  // 检查目标房间是否需要钥匙
  if(targetRoom.locked && playerResources.keys > 0) {
    playerResources.keys--;
    targetRoom.locked = false; // 永久解锁
    updateResourceUI();
    console.log('🔑 用钥匙打开了上锁的房间!');
  } else if(targetRoom.locked && playerResources.keys <= 0) {
    return false; // 需要钥匙但没有
  }
  // 计算玩家在新房间的入口位置
  const oppDir=DOOR_FROM_DIR[dir];
  const dp=DOOR_POS[oppDir];
  let entryCol=dp.col,entryRow=dp.row;
  // 放到门前相邻格
  if(oppDir==='up')entryRow=dp.row-1;
  else if(oppDir==='down')entryRow=dp.row+1;
  else if(oppDir==='left')entryCol=dp.col-1;
  else if(oppDir==='right')entryCol=dp.col+1;
  entryCol=Math.max(0,Math.min(12,entryCol));entryRow=Math.max(0,Math.min(6,entryRow));
  // 如果门前格不可行走，则找最近的可行走格
  if(!TILE_WALKABLE[targetRoom.grid[entryCol][entryRow]]){for(let r=0;r<7;r++)for(let c=0;c<13;c++)if(TILE_WALKABLE[targetRoom.grid[c][r]]){entryCol=c;entryRow=r;r=99;c=99;}}
  // 启动切换过渡
  transition={active:true,dir:dir,offset:0,fromRoom:currentRoomId,toRoom:door.targetRoomId,playerEntryCol:entryCol,playerEntryRow:entryRow};
  return true;
}

function finishTransition(){
  if(!transition)return;

  // 保存当前房间的地上道具(引用已绑定，自动保存)
  const oldRoom=currentFloor.rooms.find(r=>r.id===currentRoomId);

  currentRoomId=transition.toRoom;
  const room=currentFloor.rooms.find(r=>r.id===currentRoomId);
  currentRoomGrid=room.grid;
  player.col=transition.playerEntryCol;player.row=transition.playerEntryRow;
  const p=gridToPixel(player.col,player.row);player.px=p.x;player.py=p.y;
  // 清除移动残留状态，防止过渡后自动滑动
  player.targetPx=null;player.targetPy=null;player.animTime=0;
  player.facing='down';player.walkFrame=0;
  // 进入新房间立刻结束无敌状态，防止跨房间无敌残留
  player.invincibleSteps = 0;
  initTileData();
  transition=null;

  // 恢复/初始化新房间的地上道具和资源(每个房间独立保存)
  if(!room._groundItems)room._groundItems=[];
  itemsOnGround=room._groundItems;
  if(!room._groundResources)room._groundResources=[];
  resourcesOnGround=room._groundResources;

  // 切换房间：检查是否需要重置炸弹倒计时
  const roomBombs = bombs.filter(b => b.roomId === currentRoomId);
  if (roomBombs.length > 0) {
    // 重新进房时，定时炸弹恢复到完整倒计时。
    for (const b of roomBombs) if (Number.isFinite(b.timer)) b.timer = bombFuseTurns();
  }

  const alreadyVisited = visitedRooms.has(currentRoomId);
  visitedRooms.add(currentRoomId); // 标记为已访问

  if (!alreadyVisited) {
    // 首次进入：刷怪 + 宝箱房生成道具 + 商店生成商品
    spawnRoomMonsters();
    if(room.type==='treasure'){
      spawnTreasureRoomItem();
    }
    if(room.type==='shop'){
      // 如果槽位未初始化（理论上 enterFloor 已初始化），在此兜底
      if(!room._shopSlots) rollShopSlots(room, currentFloor.floorNum);
      spawnShopGoods(room);
    }
  } else {
    // 再次进入：不刷怪，但有炸弹则重新进入战斗模式
    monsters.length = 0;
    const hasBombs = bombs.filter(b => b.roomId === currentRoomId).length > 0;
    inCombat = hasBombs;
    updateDoorsLocked();
    updateUI(); // 同步AP面板
    if (hasBombs) {
      // 有炸弹：重置回合和AP
      turnState.phase = 'player_select';
      resetTurnAP();
      updateActionBar();
    }
  }
  updateFloorUI();
}

function tryWalkIntoDoor(fromCol,fromRow,moveDir){
  const room=currentFloor.rooms.find(r=>r.id===currentRoomId);
  if(!room||!room.doors[moveDir]||!room.doors[moveDir].open)return false;
  // 门已打开（被破坏或怪物已清空）→ 允许通过，即使战斗模式因炸弹仍活跃
  if(inCombat && !room.doors[moveDir].destroyed) {
    // 战斗中且门未破坏 → 检查是否只是炸弹无怪物（允许通过）
    const hasLivingMonsters = monsters.filter(m => m.hp > 0 && !m.jumperVanished).length > 0;
    if(hasLivingMonsters) return false; // 有怪物，不能通过
  }
  // 触发条件：玩家站在墙边格，且按的方向正对着该方向的门
  const dp=DOOR_POS[moveDir];
  const vec=DIR_VEC[moveDir];
  const nc=fromCol+vec.dx, nr=fromRow+vec.dy;
  // 下一步会走到格子外(撞墙)，且玩家当前列/行与门对齐
  if(nc<0||nc>=COLS||nr<0||nr>=ROWS){
    if(moveDir==='up'||moveDir==='down'){if(fromCol===dp.col){switchRoom(moveDir,{col:dp.col,row:dp.row});return true;}}
    else{if(fromRow===dp.row){switchRoom(moveDir,{col:dp.col,row:dp.row});return true;}}
  }
  return false;
}

// 更新楼层 UI
function updateFloorUI(){
  const el=document.getElementById('ui-floor-info');
  if(!el)return;
  const room=currentFloor.rooms.find(r=>r.id===currentRoomId);
  const tn={start:'起点',normal:'普通',treasure:'宝箱',boss:'Boss',shop:'商店'};
  el.textContent=`${currentFloor.name} | [${tn[room.type]}] ${room.tplKey}`;
}
