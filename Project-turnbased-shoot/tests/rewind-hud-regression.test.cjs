const fs=require('fs'),vm=require('vm'),assert=require('assert');
let harness=fs.readFileSync(__dirname+'/danger-forecast.test.js','utf8').split('(async()=>{await sandbox.bootPromise;')[0];
harness=harness.replace("const fs=require('fs'),vm=require('vm'),assert=require('assert');",'');
eval(harness.replace('vm.createContext(sandbox);vm.runInContext(code,sandbox);','vm.createContext(sandbox);vm.runInContext(code,sandbox);globalThis.regressionSandbox=sandbox;'));
(async()=>{await regressionSandbox.bootPromise;vm.runInContext(`
 function demand(v,msg){if(!v)throw Error(msg)}
 const row=document.getElementById('scrap-hearts');let heartHTML='',heartWrites=0;
 Object.defineProperty(row,'innerHTML',{configurable:true,get(){return heartHTML},set(v){heartWrites++;heartHTML=v}});
 playerStats.maxHp=3;playerStats.hp=3;playerResources.blueHearts=1.5;scrapHudKey='';
 for(let i=0;i<100;i++)scrapUpdateHUD();
 demand(heartWrites===1,'蓝心静止100次更新应仅重建一次，实际 '+heartWrites);
 demand((heartHTML.match(/<img /g)||[]).length===5,'3红心加1.5蓝心应有5格');
 demand(heartHTML.includes(RES_IMAGES.ui_half_blue_heart.src),'半蓝心未显示');
 let writes=heartWrites;playerStats.hp=2.5;scrapUpdateHUD();demand(heartWrites===writes+1&&heartHTML.includes(SCRAP_ASSETS.halfHeart),'红心受伤未刷新半心');
 writes=heartWrites;playerResources.blueHearts=1;scrapUpdateHUD();demand(heartWrites===writes+1&&!heartHTML.includes(RES_IMAGES.ui_half_blue_heart.src),'半蓝心扣除未刷新');
 playerResources.blueHearts=0;scrapUpdateHUD();demand((heartHTML.match(/<img /g)||[]).length===3&&!heartHTML.includes('蓝心'),'蓝心耗尽未清除');
 playerResources.blueHearts=.5;scrapUpdateHUD();demand(heartHTML.includes(RES_IMAGES.ui_half_blue_heart.src),'拾取半蓝心未刷新');
 playerStats.hp=3;scrapUpdateHUD();demand(!heartHTML.includes(SCRAP_ASSETS.halfHeart),'红心治疗未刷新');
 playerStats.maxHp=12;playerStats.hp=12;playerResources.blueHearts=2;scrapUpdateHUD();demand((heartHTML.match(/<img /g)||[]).length===12&&!heartHTML.includes('蓝心'),'总上限12心');
 writes=heartWrites;for(let i=0;i<100;i++)scrapUpdateHUD();demand(heartWrites===writes,'全满血静止重复更新');
 `,regressionSandbox);console.log('PASS: HUD缓存、红心受伤/治疗、蓝心增减/耗尽、半心及12心上限');
 vm.runInContext(`
 function dukeFixture(){
  resetGameToFloor1();gameStarted=true;gameOver=false;floorFadeBusy=false;transition=null;
  for(const id of ['start-menu-modal','death-modal','victory-modal'])document.getElementById(id).classList.remove('show');
  currentRoomGrid=parseGrid(BUILTIN_TEMPLATES().open.tiles);currentFloor.rooms.find(r=>r.id===currentRoomId).grid=currentRoomGrid;
  tileData={};monsters=[];bullets=[];bombs=[];particles=[];damageNumbers=[];resourcesOnGround=[];itemsOnGround=[];pendingBossLanding=null;
  player.col=10;player.row=5;const p=gridToPixel(10,5);player.px=p.x;player.py=p.y;player.targetPx=null;player.targetPy=null;player.invincibleSteps=99;
  turnState.phase='player_select';turnState.monsterTurnCounter=2;turnState.mAP=3;turnState.aAP=3;
  movementPlanning=false;movementEvents=[];monsterTurnHit=false;pendingMonsterHits=[];fallbackThreatHold=0;monsterAfterEffectsDone=false;dangerReveal=null;dangerRevealRemaining=0;
  for(const [id,c,r]of [['duke_fly',1,1],['duke_floater',3,2]]){demand(spawnMonsterAtRandomPos(id),'生成公爵夹具');const m=monsters.at(-1),q=gridToPixel(c,r);m.col=c;m.row=r;m.px=q.x;m.py=q.y;m._spawnedThisTurn=false;m._killLoot=[];}
  const duke=monsters[0];duke._diagDir={dCol:1,dRow:1};duke._dukeFirstTurn=false;inCombat=true;calcDukePath(duke,2);
  demand(duke._dukeKeyframes.some(k=>k.pushedFloaters.size>0),'必须生成非空真实推移关键帧');
  saveTurnSnapshot();saveCheckpoint();return JSON.stringify(captureDukeKeyframes(duke._dukeKeyframes));
 }
 function checkDukeFrames(expected){const duke=monsters.find(m=>m.cfgId==='duke_fly');demand(JSON.stringify(captureDukeKeyframes(duke._dukeKeyframes))===expected,'关键帧未恢复原编号与坐标');for(const k of duke._dukeKeyframes)for(const [id,pos]of k.pushedFloaters){demand(monsters.some(m=>m.id===id),'恢复后的键不是怪物ID');demand(Number.isFinite(pos.col)&&Number.isFinite(pos.row),'推移坐标无效')}}
 function damageDukeFrames(){const k=monsters[0]._dukeKeyframes.find(k=>k.pushedFloaters.size);k.pushedFloaters.values().next().value.col=12;k.pushedFloaters.set(99999,{col:0,row:0})}
 for(const route of ['turn','checkpoint','withoutBullets','routeSimulation']){
  const expected=dukeFixture();damageDukeFrames();
  if(route==='turn')restoreTurnSnapshot();else if(route==='checkpoint')restoreCheckpoint();else if(route==='withoutBullets')restoreCheckpointWithoutBullets();else simulateFromCheckpoint([{col:10,row:5},{col:10,row:4}]);
  checkDukeFrames(expected);
 }
 function pressEsc(){document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape',bubbles:true,cancelable:true}))}
 function positions(ms,p){return JSON.stringify({monsters:ms.map(m=>[m.id,m.col,m.row,m.hp]).sort((a,b)=>a[0]-b[0]),player:[p.col,p.row]})}
 for(const seed of [1,42,123456789]){
  const expectedFrames=dukeFixture();rewindsRemaining=2;
  const predicted=simulateResolvedDanger(seed),expectedPositions=positions(predicted.monsters,predicted.player);
  for(let i=0;i<2;i++){damageDukeFrames();pressEsc();checkDukeFrames(expectedFrames);demand(rewindsRemaining===1-i,'Esc次数处理变化')}
  const initialHp=playerStats.hp;turnState.phase='monster_turn';monsterTurnRandom=makeMonsterTurnRandom(seed);lockedThreatId=null;monsterTurnHit=false;pendingMonsterHits=[];monsterAfterEffectsDone=false;
  executeMonsterTurnActions();let n=0;
  while(turnState.phase==='monster_turn'&&n++<4000){updateBullets(1/120);animateMonsters(1/120);updateMonsterTurn(1/120);fallbackThreatHold=0;}
  demand(n<4000,'公爵回溯后回合超时');demand(positions(monsters.filter(m=>predicted.monsters.some(p=>p.id===m.id)),player)===expectedPositions,'公爵回溯后行动与预测不一致，种子 '+seed+' expected='+expectedPositions+' actual='+positions(monsters,player));demand(playerStats.hp===initialHp,'原有无敌状态未保留');
  // 现有预测不模拟回合末召唤；对新怪另查合法位置，不把它误当作原有怪物的预测偏差。
  for(const a of monsters){demand(Number.isFinite(a.col)&&Number.isFinite(a.row),'召唤后坐标无效');for(const b of monsters)if(a.id<b.id)demand(!(a.col<b.col+(b.size||1)&&a.col+(a.size||1)>b.col&&a.row<b.row+(b.size||1)&&a.row+(a.size||1)>b.row),'公爵行动后怪物重叠')}
 }
 `,regressionSandbox);console.log('PASS: 四条公爵恢复路径、两次真实Esc回溯、三种种子下公爵推移与预测/执行一致');
})().catch(e=>{console.error(e);process.exitCode=1});
