const fs=require('fs'),vm=require('vm'),assert=require('assert');
let harness=fs.readFileSync(__dirname+'/danger-forecast.test.js','utf8').split('(async()=>{await sandbox.bootPromise;')[0];
harness=harness.replace("const fs=require('fs'),vm=require('vm'),assert=require('assert');",'');
eval(harness.replace('vm.createContext(sandbox);vm.runInContext(code,sandbox);','vm.createContext(sandbox);vm.runInContext(code,sandbox);globalThis.stateSandbox=sandbox;'));
(async()=>{await stateSandbox.bootPromise;vm.runInContext(`
 function demand(v,msg){if(!v)throw Error(msg)}
 const statFields=['attack','fireRate','hp','luck','maxHp','moveSpeed','range'];
 const resourceFields=['blueHearts','bombs','coins','keys'];
 demand(JSON.stringify(Object.keys(playerStats).sort())===JSON.stringify(statFields),'新增玩家属性需更新回溯覆盖清单');
 demand(JSON.stringify(Object.keys(playerResources).sort())===JSON.stringify(resourceFields),'新增资源字段需更新回溯覆盖清单');
 function stateFixture(){
  resetGameToFloor1();gameStarted=true;gameOver=false;floorFadeBusy=false;transition=null;
  currentRoomGrid=parseGrid(BUILTIN_TEMPLATES().open.tiles);const room=currentFloor.rooms.find(r=>r.id===currentRoomId);room.grid=currentRoomGrid;
  monsters=[];bullets=[];particles=[];damageNumbers=[];bombs=[];resourcesOnGround=[];itemsOnGround=[];pendingBossLanding=null;movementEvents=[];movementPlanning=false;
  player.col=6;player.row=3;const p=gridToPixel(6,3);player.px=p.x;player.py=p.y;player.targetPx=null;player.targetPy=null;player.facing='left';player.invincibleSteps=5;player.hasPiercing=false;
  Object.assign(playerStats,{hp:2.5,maxHp:4,attack:7.2,fireRate:5,moveSpeed:4,range:8,luck:2});
  Object.assign(playerResources,{coins:17,bombs:3,keys:2,blueHearts:1.5});
  playerInventory=['snapshot-test-marker'];
  resourcesOnGround=[{id:71,cfgId:'coin_gold',col:9,row:5,px:225,py:137,roomId:currentRoomId,color:'#ffcc44',icon:'coin',liftY:2,liftDir:-1,sparkTimer:1.2}];
  itemsOnGround=[{id:72,cfgId:'snapshot-test-item',name:'test',icon:'test',quality:'rare',col:10,row:5,px:247,py:137,roomId:currentRoomId,liftY:1,liftDir:1,sparkTimer:2.2}];
  room._groundResources=resourcesOnGround;room._groundItems=itemsOnGround;
  currentRoomGrid[2][2]=TILE.POOP;tileData={'2,2':{type:'poop',hp:3,_loot:[]}};
  bombs=[{id:73,col:1,row:1,timer:2,roomId:currentRoomId}];
  turnState.phase='player_select';turnState.mAP=4;turnState.aAP=5;turnState.maxMAP=4;turnState.maxAAP=5;inCombat=true;
  return room;
 }
 function durable(){return JSON.stringify({stats:playerStats,res:playerResources,inventory:playerInventory,ground:resourcesOnGround,items:itemsOnGround,p:[player.col,player.row,player.facing,player.invincibleSteps,player.hasPiercing]})}
 function scramble(){for(const k of statFields)playerStats[k]=99;for(const k of resourceFields)playerResources[k]=0;playerInventory.push('not-saved');resourcesOnGround[0].col=0;itemsOnGround[0].row=0;player.col=0;player.row=0;player.facing='up';player.invincibleSteps=0;player.hasPiercing=true;}
 for(const route of ['turn','checkpoint','withoutBullets','routeSimulation'])for(const piercing of [false,true]){
  const room=stateFixture();player.hasPiercing=piercing;const expected=durable();saveTurnSnapshot();saveCheckpoint();scramble();player.hasPiercing=!piercing;
  if(route==='turn')restoreTurnSnapshot();else if(route==='checkpoint')restoreCheckpoint();else if(route==='withoutBullets')restoreCheckpointWithoutBullets();else simulateFromCheckpoint([{col:6,row:3}]);
  demand(durable()===expected,'玩家/资源/道具恢复不完整：'+route+' expected='+expected+' actual='+durable());
  demand(room._groundResources===resourcesOnGround&&room._groundItems===itemsOnGround,'房间数组引用未同步：'+route);
  resourcesOnGround[0].col=0;itemsOnGround[0].row=0;playerInventory.push('changed-again');
  demand(currentCheckpoint.resourcesOnGround[0].col===9&&currentCheckpoint.itemsOnGround[0].row===5&&currentCheckpoint.playerInventory.length===1,'运行数组污染快照：'+route);
 }
 stateFixture();saveTurnSnapshot();const room=currentFloor.rooms.find(r=>r.id===currentRoomId);const grid=room.grid;
 currentRoomGrid[2][2]=TILE.FLOOR;delete tileData['2,2'];bombs[0].timer=0;bombs=[];restoreTurnSnapshot();
 demand(currentRoomGrid===grid&&room.grid===grid&&currentRoomGrid[2][2]===TILE.POOP,'地形内容或房间引用未恢复');
 demand(tileData['2,2'].hp===3&&Array.isArray(tileData['2,2']._loot)&&tileData['2,2']._loot.length===0,'空掉落结果未恢复');
 demand(bombs.length===1&&bombs[0].timer===2,'炸弹倒计时未恢复');
 const piercingItem=Object.keys(ITEMS_DB).find(id=>(ITEMS_DB[id].specials||[]).some(s=>s.type==='piercing'));
 demand(piercingItem,'缺少实际穿透道具夹具');stateFixture();rewindsRemaining=2;saveTurnSnapshot();if(typeof beginActionHistory==='function')beginActionHistory();applyItem(piercingItem);demand(player.hasPiercing,'实际穿透道具未生效');
 document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape',bubbles:true,cancelable:true}));
 demand(!player.hasPiercing&&!playerInventory.includes(piercingItem),'Esc后已撤销道具的穿透效果仍残留');
 `,stateSandbox);console.log('PASS: 玩家属性/资源字段覆盖、四条恢复路径、对象隔离、房间引用、半心、空掉落、地形与炸弹恢复');
 vm.runInContext(`
 function freezeTree(obj){if(obj&&typeof obj==='object'&&!Object.isFrozen(obj)){Object.freeze(obj);for(const v of Object.values(obj))freezeTree(v)}return obj}
 function realWorld(){return JSON.stringify({input:getDangerSimulationInput(),stats:playerStats,res:playerResources,inventory:playerInventory,bullets,particles,damageNumbers,resourcesOnGround,itemsOnGround,turnSnapshot,currentCheckpoint,combatRng,turnState},(_,v)=>v instanceof Map?[...v]:v instanceof Set?[...v]:v)}
 for(const id of ['crack_maw_iii','flying_eye_iii','boss_jumper_i','duke_fly']){
  stateFixture();monsters=[];spawnMonsterAtRandomPos(id);const m=monsters[0],p=gridToPixel(3,2);m.col=3;m.row=2;m.px=p.x;m.py=p.y;m._spawnedThisTurn=false;m._killLoot=[];
  player.invincibleSteps=0;turnState.monsterTurnCounter=2;saveTurnSnapshot();saveCheckpoint();
  const input=JSON.parse(JSON.stringify(getDangerSimulationInput()));freezeTree(input);
  const factory=createDangerSimulationFactory(),before=realWorld(),beforeInput=JSON.stringify(input);
  const originalRandom=Math.random;let randomCalls=0,fxCalls=0;const fx={};for(const k of Object.keys(SFX))if(typeof SFX[k]==='function'){fx[k]=SFX[k];SFX[k]=()=>{fxCalls++}}
  let first,second;
  try{Math.random=()=>{randomCalls++;return .123};first=factory(input,42);second=factory(input,42)}finally{Math.random=originalRandom;for(const [k,v]of Object.entries(fx))SFX[k]=v}
  const encode=v=>JSON.stringify(v,(_,x)=>x instanceof Map?[...x]:x instanceof Set?[...x]:x);
  demand(encode(first)===encode(second),'同输入种子预测不稳定：'+id);
  demand(realWorld()===before&&JSON.stringify(input)===beforeInput,'预测污染真实局面或输入：'+id);
  demand(randomCalls===0&&fxCalls===0,'预测消耗真实随机或播放真实效果：'+id);
  if(first.monsters.length)first.monsters[0].hp=-999;first.currentRoomGrid[0][0]=TILE.ROCK;first.player.col=0;
  demand(realWorld()===before&&JSON.stringify(input)===beforeInput,'预测结果对象与真实状态共享引用：'+id);
 }
 `,stateSandbox);console.log('PASS: 四类怪物预测在冻结输入下稳定运行，不修改真实局面/快照、不消耗真实随机/音效，返回对象独立');
})().catch(e=>{console.error(e);process.exitCode=1});
