const fs=require('fs'),vm=require('vm'),assert=require('assert');
let harness=fs.readFileSync(__dirname+'/danger-forecast.test.js','utf8').split('(async()=>{await sandbox.bootPromise;')[0];
harness=harness.replace("const fs=require('fs'),vm=require('vm'),assert=require('assert');",'');
eval(harness.replace('vm.createContext(sandbox);vm.runInContext(code,sandbox);','vm.createContext(sandbox);vm.runInContext(code,sandbox);globalThis.historySandbox=sandbox;'));
(async()=>{await historySandbox.bootPromise;vm.runInContext(`
function demand(v,msg){if(!v)throw Error(msg)}
function fixture(extra=false){
 resetGameToFloor1();gameStarted=true;gameOver=false;floorFadeBusy=false;transition=null;pendingPlayerTurnEnd=false;
 currentRoomGrid=parseGrid(BUILTIN_TEMPLATES().open.tiles);currentFloor.rooms.find(r=>r.id===currentRoomId).grid=currentRoomGrid;
 tileData={};monsters=[];bullets=[];bombs=[];particles=[];damageNumbers=[];resourcesOnGround=[];itemsOnGround=[];pendingBossLanding=null;
 player.col=4;player.row=3;const p=gridToPixel(4,3);player.px=p.x;player.py=p.y;player.targetPx=null;player.targetPy=null;player.invincibleSteps=99;
 playerStats.moveSpeed=3;playerStats.fireRate=3;playerStats.hp=3;playerStats.maxHp=3;
 spawnMonsterAtRandomPos('crack_maw_i');const m=monsters[0];m.col=11;m.row=5;Object.assign(m,gridToPixel(11,5));m._killLoot=[];
 if(extra){spawnMonsterAtRandomPos('crack_maw_i');const sentinel=monsters.at(-1),p=gridToPixel(11,1);sentinel.col=11;sentinel.row=1;sentinel.px=p.x;sentinel.py=p.y;sentinel._killLoot=[];}
 inCombat=true;resetTurnAP();return m;
}
function press(code,repeat=false){processHistoryKey({code,repeat,preventDefault(){}})}
fixture();press('KeyD');press('KeyD');press('KeyD');press('ArrowUp');
demand(turnState.mAP===0&&turnState.aAP===2,'三格加射击正常消费');
press('KeyA');demand(player.col===6&&player.row===3&&turnState.mAP===1&&turnState.aAP===3,'回到第二步并返还射击AP');demand(bullets.length===0&&actionHistory.length===3,'删除后续射击和子弹');
fixture();press('KeyD');press('ArrowUp');press('KeyA');demand(player.col===4&&turnState.mAP===1&&turnState.aAP===2&&bullets.length===1,'有MP时保留射击正常退回');
fixture();press('KeyD');press('KeyA');press('KeyD');demand(historyMaximumRange().has('5,2'),'整体范围包含未访问格');press('KeyW');demand(player.col===5&&player.row===2&&turnState.mAP===1,'无相同坐标时恢复最近可达历史再补走');
fixture();press('KeyD');press('KeyD');press('KeyD');const n=actionHistory.length;press('KeyA',true);demand(actionHistory.length===n&&player.col===7,'按键连发不意外触发撤销');
fixture();press('ArrowUp');const saved=cloneHistoryValue(bullets);press('KeyD');press('KeyD');press('KeyD');press('KeyA');demand(turnState.aAP===2&&bullets.length===1,'恢复点之前射出的在途子弹保留');demand(JSON.stringify(bullets)===JSON.stringify(saved),'弹体状态完整恢复');
let m=fixture(true);press('KeyD');press('KeyD');press('KeyD');press('ArrowRight');
const beforeKillHp=m.hp;damageMonster(m,999);syncActionHistory();demand(monsters.length===1&&provisionalDefeats.length===1&&inCombat,'还有活怪时保留失能状态供回退');
turnState.mAP+=2;turnState.aAP+=1;playerResources.coins+=3;syncActionHistory();
press('Escape');demand(monsters.length===2&&monsters[0].hp===beforeKillHp&&provisionalDefeats.length===0,'撤销击杀和失能表现');demand(turnState.mAP===3&&turnState.aAP===3,'撤销击杀资源收益');
for(let i=0;i<5;i++){press('KeyD');press('ArrowUp');press('Escape');demand(player.col===4&&turnState.mAP===3&&turnState.aAP===3,'无限次Esc '+i)}
fixture();press('KeyD');press('KeyD');press('KeyD');press('ArrowUp');bombs.push({id:99,col:7,row:3,timer:2,roomId:currentRoomId});tileData['9,1']={hp:1};currentRoomGrid[9][1]=TILE.ROCK;syncActionHistory();press('KeyA');demand(bombs.length===0&&!tileData['9,1']&&currentRoomGrid[9][1]===TILE.FLOOR,'炸弹地形状态整体回退');
fixture();press('ArrowUp');demand(preparePlayerTurnEnd()===false&&actionHistoryActive(),'未命中子弹不能被空格吞掉');bullets=[];damageMonster(monsters[0],999);syncActionHistory();demand(!inCombat&&!historyOpen&&provisionalDefeats.length===0,'最后击杀自动确认并清房');
fixture();press('KeyD');press('KeyD');press('KeyD');const prior=JSON.stringify([player.col,player.row,turnState.mAP,actionHistory.length]);demand(!rewindHistoryTo(-1,-1),'不可达目标拒绝');demand(prior===JSON.stringify([player.col,player.row,turnState.mAP,actionHistory.length]),'拒绝不改变实际状态');
// 确认前绝不生成掉落；回退取消；确认只执行一次。
m=fixture(true);const coin=Object.keys(RESOURCE_DB).find(k=>RESOURCE_DB[k].type==='coin');m._killLoot=[{type:'resource_fixed',resId:coin}];beginActionHistory();
press('KeyD');damageMonster(m,999);syncActionHistory();demand(resourcesOnGround.length===0,'暂时击杀不提前掉落');press('Escape');demand(resourcesOnGround.length===0&&monsters.length===2,'撤销暂时击杀不生成掉落');
m=monsters[0];damageMonster(m,999);syncActionHistory();demand(resourcesOnGround.length===0,'确认前无战利品');commitActionHistory();demand(resourcesOnGround.filter(x=>x.cfgId===coin).length===1,'确认死亡后生成预抽掉落');commitActionHistory();demand(resourcesOnGround.filter(x=>x.cfgId===coin).length===1,'不能重复生成掉落');
fixture();press('KeyD');press('KeyD');let points=historyMovementPoints();demand(points.length===3&&points[0].col===4&&points[2].col===6,'连线从原格延长到最新格');press('ArrowUp');demand(historyMovementPoints().length===3,'射击不增加地图印记');press('KeyW');demand(historyMovementPoints().at(-1).row===2,'移动轨迹保留拐弯');press('KeyS');demand(historyMovementPoints().length===3,'回退时轨迹同步缩短');press('Escape');demand(historyMovementPoints().length===1,'重置清除轨迹');
m=fixture();m._killLoot=[{type:'resource_fixed',resId:coin}];press('ArrowUp');damageMonster(m,999);syncActionHistory();demand(!inCombat&&!historyOpen&&provisionalDefeats.length===0&&bullets.length===0,'最后击杀自动结束回合且清理剩余子弹');demand(resourcesOnGround.some(r=>r.cfgId===coin),'最后击杀自动生成掉落');
fixture();press('KeyD');press('KeyD');press('KeyD');press('KeyA');let landed=gridToPixel(player.col,player.row);demand(player.px===landed.x&&player.py===landed.y&&player.targetPx===null&&player.targetPy===null,'相同坐标回退直接落位');
fixture();press('KeyD');press('KeyA');press('KeyD');press('KeyW');landed=gridToPixel(5,2);demand(player.px===landed.x&&player.py===landed.y&&player.targetPx===null&&player.targetPy===null,'历史补走仅结算逻辑，不播放移动动画');
m=fixture(true);m.hp=100;m.maxHp=100;beginActionHistory();demand(monsterHealthPreview(m)===null,'玩家回合未受伤隐藏血条');
press('KeyD');damageMonster(m,10);syncActionHistory();let health=monsterHealthPreview(m);demand(health.hp===90&&health.damage===10&&health.before===100,'首次伤害预览比例');
press('KeyD');damageMonster(m,20);syncActionHistory();health=monsterHealthPreview(m);demand(health.hp===70&&health.damage===30,'连续伤害累计预览');
press('KeyD');press('KeyA');health=monsterHealthPreview(monsters.find(x=>x.id===m.id));demand(health.damage===30,'保留恢复点之前的伤害预览');press('Escape');demand(monsterHealthPreview(monsters.find(x=>x.id===m.id))===null,'回合重置隐藏恢复的血条');
m=monsters.find(x=>x.id===m.id);damageMonster(m,999);syncActionHistory();health=monsterHealthPreview(provisionalDefeats[0]);demand(health.hp===0&&health.damage===100,'暂时死亡保留整段扣血预览');commitActionHistory();demand(provisionalDefeats.length===0,'确认死亡清除血条和骷髅载体');
console.log('PASS: 未受伤隐藏、累计伤害比例、回退预览、暂时死亡及确认后清除');
console.log('PASS: 部分回溯瞬时落位、最后击杀自动结束与掉落');
console.log('PASS: 延迟掉落、取消/确认/不重复掉落、连续移动箭头及撤销轨迹');
console.log('PASS: 行动历史、两种撤退、分支补走、按键连发、在途子弹、击杀/收益/炸弹/地形恢复、无限Esc和空格确认');
`,historySandbox);})().catch(e=>{console.error(e);process.exitCode=1});
