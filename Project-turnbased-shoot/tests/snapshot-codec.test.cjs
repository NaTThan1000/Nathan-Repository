const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const scope=vm.createContext({gridToPixel:(col,row)=>({x:col*22+27,y:row*22+27})});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/state/snapshots.js'),'utf8'),scope);
const capture=vm.runInContext('captureMonsterSnapshot',scope);
const restore=vm.runInContext('restoreMonsterSnapshot',scope);
const actor={id:7,cfgId:'boss_duke',col:3,row:2,px:999,py:999,hp:10,maxHp:20,
 hitFlash:.12,shakeX:2,shakeY:3,predictedPath:[{fromCol:3,fromRow:2,toCol:4,toRow:2}],
 _killLoot:['coin_gold'],_diagDir:{dCol:1,dRow:-1},_dukeFirstTurn:false,
 _dukeKeyframes:[{targetCol:4,targetRow:2,pushedFloaters:new Map([[9,{col:5,row:2}]]),playerHit:true}],
 _dukeKeyframeIdx:1,_charging:true,_landingPhase:1,jumperVanished:true};
const saved=capture(actor);
assert.equal(saved.px,93);assert.equal(saved.py,71);
assert.deepEqual(Array.from(saved._dukeKeyframes[0].pushedFloaters.keys()),[0]);
actor.predictedPath[0].toCol=10;actor._killLoot.push('bomb');actor._diagDir.dCol=-1;
assert.equal(saved.predictedPath[0].toCol,4);assert.equal(saved._killLoot.length,1);assert.equal(saved._diagDir.dCol,1);
const recovered=restore(saved);
assert.equal(recovered.hp,10);assert.equal(recovered.hitFlash,0);assert.equal(recovered.shakeX,0);assert.equal(recovered.shakeY,0);
assert.equal(recovered._dukeKeyframes[0].pushedFloaters[0][1][0],9); // 保留既有中间编码，Map由恢复路径后处理。
assert.equal(recovered._dukeKeyframeIdx,1);assert.equal(recovered._charging,true);
assert.equal(recovered._landingPhase,1);assert.equal(recovered.jumperVanished,true);
recovered.predictedPath[0].toRow=6;recovered._killLoot.push('key');
assert.equal(saved.predictedPath[0].toRow,2);assert.equal(saved._killLoot.length,1);
console.log('PASS: 快照坐标对齐、路径/掉落/方向隔离、公爵关键帧编码复制与瞬时受击状态重置');
