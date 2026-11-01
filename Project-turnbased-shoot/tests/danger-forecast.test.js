const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../turnbased-shoot-demo2.html'),'utf8');
function declaration(name) {
 const start=source.indexOf('function '+name+'(');assert(start>=0,name);
 return source.slice(start,source.indexOf('\n}',start)+2);
}
const math=Object.create(Math);math.random=()=>{throw Error('预测不得调用真实随机数');};
const ctx=vm.createContext({Math:math});
for(const name of ['createDangerForecastJob','advanceDangerForecastJob'])vm.runInContext(declaration(name),ctx);
// 使用实际行动、逐步碰撞、炸弹和子弹函数运行独立模拟。
const sharedNames=['gridToPixel','pixelToGrid','isWall','isBlockingBullet','bulletHitWall','isMonsterAt','monsterCells','isValidLandingZone','selectLandingTarget','isInMonsterFootprint','getSpreadDirs','calcDiagonalPathEnd','canMoveMin1','getChargeDirections','pickChargeDir','checkActionCondition','resolveSteps','getEligibleMonsterActions','resolveMonsterAction','getWanderPaths','getMonsterShootDirections','chooseMonsterShootDirection','chooseWanderPath','calcAllMonsterPaths','calcMonsterPath','getChargePath','getDiamondRange','tickBombCountdown','detonateBomb','pushBomb','calcJumperSmallJump','calcJumperBigJump','processJumperAction','getAttackSideCells','resolveAfterEffects','initDukeQuadrant','calcDukePath','updateDukeAnim','executeBossLandingNow','executeBossLanding','doLandingDamage','finishBossLandingPhase2','executeMonsterTurnActions','updateMonsterTurn','applyMonsterTurnAfterEffects','spawnMonsterBullet','updateBullets','makeMonsterTurnRandom','monsterActionChoiceIndex','hasPendingMonsterAttack','createDangerSimulationFactory'];
for(const name of sharedNames)vm.runInContext(declaration(name),ctx);
const simulation=ctx.createDangerSimulationFactory();
const constants={COLS:5,ROWS:5,CELL:32,WALL:16,FLOOR_L:16,FLOOR_R:176,FLOOR_T:16,FLOOR_B:176,CFG:{BULLET_SPEED:200},TILE:{FLOOR:0,ROCK:1,POOP:2,PIT:3,SPIKE:4},TILE_WALKABLE:{0:true,1:false,2:false,3:false,4:true},TILE_BLOCKS_BULLET:{0:false,1:true,2:true},DIR_VEC:{right:{dx:1,dy:0},left:{dx:-1,dy:0},up:{dx:0,dy:-1},down:{dx:0,dy:1}},MONSTER_DB:{walk:{actions:[{type:'random_wander',steps:[2]}]}},RESOURCE_DB:{bomb_single:{radius:2,damage:50}},DOOR_POS:{}};
const world={monsters:[{id:1,hp:5,col:2,row:2,cfgId:'walk',movementTags:['地面']}],player:{col:4,row:4},bombs:[],currentRoomGrid:Array.from({length:5},()=>Array(5).fill(0)),tileData:{},currentRoomId:'room',pendingBossLanding:null};
const frozen=JSON.stringify(world);
const result=simulation({constants,world,counter:0},42);
assert(result.cells.size>0);
assert.equal(JSON.stringify(world),frozen);
assert.deepEqual([...result.cells],[...simulation({constants,world,counter:0},42).cells]);
world.bombs=[{roomId:'room',timer:1,col:2,row:2}];
const blown=simulation({constants,world,counter:0},42);
assert.equal(blown.monsters.length,0);
assert(blown.cells.has('2,2'));
console.log('独立模拟测试通过：实际行动复用、种子结果一致、炸弹先击杀、原始状态不变。');


world.bombs=[];
const enumeration=ctx.createDangerForecastJob({constants,world,counter:0},simulation);
while(!enumeration.done)ctx.advanceDangerForecastJob(enumeration,32);
assert.equal(enumeration.outcomes,4);
assert.equal(enumeration.result.red.size,0);
for(const c of ['2,0','2,4','0,2','4,2'])assert(enumeration.result.yellow.has(c));
for(let seed=0;seed<50;seed++)for(const key of simulation({constants,world,counter:0},seed).cells)assert(enumeration.result.yellow.has(key)||enumeration.result.red.has(key));
world.bombs=[{roomId:'room',timer:1,col:2,row:2}];
const bombJob=ctx.createDangerForecastJob({constants,world,counter:0},simulation);
while(!bombJob.done)ctx.advanceDangerForecastJob(bombJob,32);
assert.equal(bombJob.result.yellow.size,0);
assert(bombJob.result.red.has('2,2'));
console.log('完整分支测试通过：随机游走四分支、50种已揭晓结果均被预警覆盖、炸弹击杀后没有幽灵危险。');

const database=JSON.parse(fs.readFileSync(path.join(__dirname,'../Configs/monster-db.json'),'utf8'));
constants.MONSTER_DB=database;
constants.DIR_VEC['up-right']={dx:1,dy:-1};constants.DIR_VEC['up-left']={dx:-1,dy:-1};constants.DIR_VEC['down-right']={dx:1,dy:1};constants.DIR_VEC['down-left']={dx:-1,dy:1};
constants.COLS=13;constants.ROWS=7;constants.FLOOR_R=16+13*32;constants.FLOOR_B=16+7*32;
let checked=0;
for(const [id,cfg] of Object.entries(database)) {
 if(id.startsWith('_'))continue;
 for(const counter of [0,1,2,3]) {
  const m={id:1,cfgId:id,hp:cfg.hp,col:1,row:1,size:cfg.size||1,aiType:cfg.aiType,damage:cfg.damage,movementTags:['地面'],px:64,py:64,jumperPhase:counter===3?4:1};
  const w={...world,monsters:[m],player:{col:8,row:4},bombs:[],currentRoomGrid:Array.from({length:13},()=>Array(7).fill(0)),tileData:{},pendingBossLanding:null};
  const job=ctx.createDangerForecastJob({constants,world:w,counter},simulation);
  let runs=0;while(!job.done){ctx.advanceDangerForecastJob(job,64);assert(++runs<10000,id+' branch explosion');}
  for(let seed=0;seed<8;seed++)for(const key of simulation({constants,world:w,counter},seed).cells)assert(job.result.red.has(key)||job.result.yellow.has(key),id+': uncovered '+key);
  checked++;
 }
}
console.log('数据库覆盖测试通过：'+checked+'种怪物/行动阶段组合，所有抽样揭晓范围均在完整预警中。');

assert.equal(simulation({constants,world,counter:0,immune:true},1).cells.size,0);
// 多怪抢占格子：必须以逐步移动结算后的结果取交并集。
constants.MONSTER_DB.walk={actions:[{type:'random_wander',steps:[2]}]};
world.bombs=[];world.currentRoomGrid=Array.from({length:13},()=>Array(7).fill(0));world.monsters=[{id:1,hp:5,col:4,row:3,cfgId:'walk',movementTags:['地面']},{id:2,hp:5,col:6,row:3,cfgId:'walk',movementTags:['地面']}];
const mixed=ctx.createDangerForecastJob({constants,world,counter:0},simulation);
while(!mixed.done)ctx.advanceDangerForecastJob(mixed,64);
assert.equal(mixed.outcomes,16);
for(let seed=0;seed<100;seed++)for(const key of simulation({constants,world,counter:0},seed).cells)assert(mixed.result.red.has(key)||mixed.result.yellow.has(key));
console.log('联动测试通过：无敌期间不提示伤害、多怪16分支与100种揭晓结果一致覆盖。');

const jumperId=Object.keys(database).find(k=>database[k].aiType==='boss_jumper');
const jumpCfg=database[jumperId];
const boss={id:5,cfgId:jumperId,aiType:'boss_jumper',hp:jumpCfg.hp,col:1,row:1,size:2,_charging:true,jumperPhase:4,px:64,py:64};
const landing={...world,monsters:[boss],bombs:[],pendingBossLanding:{monster:boss,targetCol:7,targetRow:3,landAction:jumpCfg.actions.find(a=>a.type==='jump_big_land')}};
const landingJob=ctx.createDangerForecastJob({constants,world:landing,counter:3},simulation);
while(!landingJob.done)ctx.advanceDangerForecastJob(landingJob,32);
assert(landingJob.result.red.has('7,3')&&landingJob.result.red.has('8,4'));
assert.equal(landingJob.result.yellow.size,0);
assert.equal(JSON.stringify(landing.pendingBossLanding.monster),JSON.stringify(boss));
const draws=[];Object.assign(ctx,{inCombat:true,turnState:{phase:'player_select'},monsterFlashTimer:0,drawGridOverlay:(...v)=>draws.push(v)});
vm.runInContext('let dangerForecast={red:new Set(["1,1"]),yellow:new Set(["1,1","2,2"])};let dangerReveal=null;'+declaration('drawDangerOverlay'),ctx);
ctx.drawDangerOverlay();assert.equal(draws.length,2);assert.equal(draws.find(v=>v[0]===1)[2],'#ff4444');
console.log('Boss落地和渲染测试通过：锁定落点及冲击波为红色，同格只画一次且红色优先。');

// 不同渲染帧率下，揭晓的危险格应保持一致。
for(const [id,cfg] of Object.entries(database)) {
 if(id.startsWith('_'))continue;
 const m={id:1,cfgId:id,hp:cfg.hp,col:1,row:1,size:cfg.size||1,aiType:cfg.aiType,damage:cfg.damage,movementTags:['地面'],px:64,py:64,jumperPhase:1};
 const w={...world,monsters:[m],player:{col:8,row:4},bombs:[],pendingBossLanding:null};
 for(const counter of [0,3])for(const seed of [1,2]) {
  const a=[...simulation({constants,world:w,counter},seed).cells].sort();
  const b=[...simulation({constants,world:w,counter,dt:1/30},seed).cells].sort();
  assert.deepEqual(a,b,id+' frame-rate dependent danger');
 }
}
console.log('帧率回归通过：数据库怪物在30/120步进下的危险格一致。');

const spikeWorld={...world,monsters:[],bombs:[],pendingBossLanding:null,currentRoomGrid:Array.from({length:13},()=>Array(7).fill(0))};
spikeWorld.currentRoomGrid[2][2]=constants.TILE.SPIKE;
assert.equal(simulation({constants,world:spikeWorld,counter:0},1).cells.size,0,'尖刺自身不应生成危险格');
constants.MONSTER_DB.still={actions:[{type:'stationary'}]};
spikeWorld.monsters=[{id:1,hp:5,col:2,row:2,cfgId:'still'}];
assert(simulation({constants,world:spikeWorld,counter:0},1).cells.has('2,2'),'尖刺格上的怪物危险仍应显示');
console.log('尖刺提示回归通过：尖刺自身不显示危险，同格怪物危险保留。');
