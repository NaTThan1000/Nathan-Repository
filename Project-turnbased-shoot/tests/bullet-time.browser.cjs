// 浏览器回归只验证功能，不生成PNG预览文件。
const assert=require('assert'),path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('../tools/runtime-deps.cjs').runtimeDependency('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(process.env.BULLET_TIME_TEST_HTML || path.resolve(__dirname,'../history/playtest-builds/bullet-time-playtest.html')).href);
 const result=await page.evaluate(()=>{
  const check=(v,msg)=>{if(!v)throw Error(msg);};
  btReset(0);check(bt.enemies[0].phase==='locked','初始射程内必须立即锁定');
  const locked=JSON.stringify(bt.enemies[0].cells);btAct('move','up');
  check(bt.bonus===2&&bt.dodges===1&&bt.player.hp===5,'锁定攻击当步侧移应无伤并奖励2次');
  const snapshot=JSON.stringify(bt.enemies);btAct('shoot','right');btAct('move','down');
  check(bt.bonus===0&&JSON.stringify(bt.enemies)===snapshot,'额外行动期间敌方必须完全停止且不再次奖励');
  btReset(0);btAct('shoot','up');check(bt.player.hp===4&&bt.bonus===0,'原地承受锁定攻击');
  btReset(0);bt.enemies[0].phase='recover';bt.enemies[0].cells=[];btAct('move','up');check(bt.bonus===0,'恢复步不会提供闪避奖励');
  btReset(0);bt.player.x=0;bt.player.y=0;const tick=bt.step;btAct('move','left');check(bt.step===tick,'无效移动不推进');
  btReset(1);const e=bt.enemies[0];e.hp=1;e.next={x:5,y:2};btAct('shoot','right');check(bt.enemies.length===0&&bt.ended,'瞬发射击必须在怪物移动前击杀');
  btReset(2);bt.player.x=3;bt.player.y=2;btAct('shoot','right');check(bt.hits===0,'掩体必须阻挡瞬发攻击');
  btReset(1);btAct('move','up');check(bt.bonus===2&&bt.enemies[0].x===2,'近战沿锁定方向冲刺3格并奖励闪避');
  btReset(0);bt.player.hp=1;btAct('shoot','up');check(bt.ended&&bt.player.hp===0,'死亡停止');const n=bt.step;btAct('shoot','up');check(bt.step===n,'死亡后不行动');
  // 触发步所有单位正常行动；奖励期冻结全体和随机状态，最后一次不推进敌方。
  btReset(0);bt.enemies.push({id:8,kind:'melee',x:8,y:6,hp:3,phase:'idle',cells:[],candidates:[],next:null});btPlan();
  const roam=bt.enemies[1],dest={...roam.next};btAct('move','up');check(btAt(roam,dest.x,dest.y),'触发步其他怪物照常移动');
  const frozenAll=JSON.stringify([bt.enemies,bt.rng]);btAct('shoot','left');btAct('shoot','left');check(bt.bonus===0&&JSON.stringify([bt.enemies,bt.rng])===frozenAll,'两次额外行动结束仍冻结全场');
  btAct('shoot','left');check(JSON.stringify([bt.enemies,bt.rng])!==frozenAll,'下一次普通行动恢复推进');
  btReset(0);bt.hazards=[{x:2,y:2,damage:1}];btAct('move','up');check(bt.bonus===0&&bt.player.hp===4,'落点受伤不得奖励');
  btReset(0);btAct('move','up');const freezeOnDamage=JSON.stringify([bt.enemies,bt.rng]);bt.hazards=[{x:2,y:1,damage:1}];btAct('move','up');check(bt.bonus===0&&bt.player.hp===4&&JSON.stringify([bt.enemies,bt.rng])===freezeOnDamage,'奖励期受伤立即结束但不推进场景');
  // 恢复必须原地一步，结束后才重新锁定。
  btReset(0);btAct('shoot','up');const rpos=[bt.enemies[0].x,bt.enemies[0].y];check(bt.enemies[0].phase==='recover','攻击后进入恢复');btAct('shoot','up');check(bt.enemies[0].phase==='locked'&&String(rpos)===String([bt.enemies[0].x,bt.enemies[0].y]),'恢复原地且步末重判');
  for(const [kind,range]of [['melee',4],['ranged',5]]){
   btReset(0);const m=bt.enemies[0];Object.assign(m,{kind,x:0,y:0,phase:'idle'});Object.assign(bt.player,{x:range-1,y:1});btPlan();check(m.phase==='chase','追击范围边界包含');
   m.phase='idle';bt.player.x=range;btPlan();check(m.phase==='default'&&m.next&&Math.abs(m.next.x-m.x)+Math.abs(m.next.y-m.y)===1,'范围外随机合法移动1格');
  }
  // 八方向3格边界、超距、遮挡与锁定后不追踪。
  for(const [dx,dy]of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]){
   btReset(0);const m=bt.enemies[0];Object.assign(m,{x:4,y:3,phase:'idle'});Object.assign(bt.player,{x:4+dx*3,y:3+dy*3});btPlan();check(m.phase==='locked','八向3格应锁定');
  }
  btReset(0);bt.enemies[0].x=6;bt.enemies[0].phase='idle';btPlan();check(bt.enemies[0].phase==='chase','4格不能射击');
  btReset(0);bt.walls.push({x:4,y:3});bt.enemies[0].phase='idle';btPlan();check(bt.enemies[0].phase!=='locked','攻击不能穿墙');
  btReset(1);bt.walls.push({x:4,y:3});bt.enemies[0].phase='idle';btPlan();check(bt.enemies[0].phase!=='locked','冲刺不能穿墙');
  btReset(1);btAct('shoot','up');check(bt.player.hp===4&&!btAt(bt.enemies[0],bt.player.x,bt.player.y),'冲刺命中不共格');
  // 命中在途中也必须挤出，怪物继续到终点；同一次冲刺只扣一次攻击伤害。
  btReset(1);bt.player.x=4;btAct('shoot','up');check(bt.enemies[0].x===2&&bt.player.hp===4&&!btAt(bt.player,4,3)&&!btAt(bt.enemies[0],bt.player.x,bt.player.y),'途中碰撞挤开玩家后继续冲刺');
  // 四方向都按冲刺轴分层挑选：侧方、前方、来向。
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const setup=()=>{btReset(1);bt.walls=[];Object.assign(bt.player,{x:4,y:3});const m=bt.enemies[0];Object.assign(m,{x:4-dx,y:3-dy,direction:{dx,dy}});return m;};
   let m=setup();btPushFromCharge(m);check((bt.player.x-4)*dx+(bt.player.y-3)*dy===0,'优先侧方');
   m=setup();bt.walls=[{x:4-dy,y:3+dx}];btPushFromCharge(m);check(bt.player.x===4+dy&&bt.player.y===3-dx,'仅一侧合法时不选前后');
   m=setup();bt.walls=[{x:4-dy,y:3+dx},{x:4+dy,y:3-dx}];btPushFromCharge(m);check(bt.player.x===4+dx&&bt.player.y===3+dy,'两侧堵住优先前方');
   m=setup();bt.walls=[{x:4-dy,y:3+dx},{x:4+dy,y:3-dx},{x:4+dx,y:3+dy}];btPushFromCharge(m);check(bt.player.x===4-dx&&bt.player.y===3-dy,'最后才选怪物来向');
   m=setup();bt.enemies.push({id:99,x:4-dy,y:3+dx,kind:'ranged',hp:2});btPushFromCharge(m);check(bt.player.x===4+dy&&bt.player.y===3-dx,'侧方怪物占位不允许挤入');
  }
  // 将所有可能挤出位置设为伤害格，验证挤出落脚也结算环境伤害。
  btReset(1);bt.player.x=4;bt.hazards=[{x:4,y:2},{x:4,y:4},{x:3,y:3},{x:5,y:3}];btAct('shoot','up');check(bt.player.hp<=3&&bt.bonus===0,'挤出落点受伤不得提供子弹时间');
  btReset(1);bt.player.x=4;bt.walls.push({x:4,y:2},{x:4,y:4},{x:3,y:3},{x:5,y:3});btAct('shoot','up');check(bt.player.hp===4&&bt.pushBlocked&&!btAt(bt.enemies[0],bt.player.x,bt.player.y),'无合法挤出格不共格、不穿墙');
  check(btScenes.length===20,'旧12场景及新8房间');
  for(let s=0;s<btScenes.length;s++){
   btReset(s);const scene=btScenes[s],occupied=[scene.player,...scene.enemies.map(([,x,y])=>[x,y])];
   check(new Set(occupied.map(p=>p.join(','))).size===occupied.length,'出生点不能重叠');
   check(occupied.every(([x,y])=>btInside(x,y)&&!btWall(x,y)),'出生点必须在合法地格');
   const visited=new Set([bt.player.x+','+bt.player.y]),q=[{...bt.player}];
   for(let n=0;n<q.length;n++)for(const [dx,dy]of Object.values(BT_DIR)){const x=q[n].x+dx,y=q[n].y+dy,k=x+','+y;if(!btWall(x,y)&&!visited.has(k)){visited.add(k);q.push({x,y});}}
   check(bt.enemies.every(e=>visited.has(e.x+','+e.y)),'场景不存在隔绝的敌人区域');
   let safeOpening=false;
   for(const dir of Object.keys(BT_DIR)){btReset(s);const [dx,dy]=BT_DIR[dir],x=bt.player.x+dx,y=bt.player.y+dy;if(!btWall(x,y)&&!bt.enemies.some(e=>btAt(e,x,y))){btAct('move',dir);if(bt.player.hp===5)safeOpening=true;}}
   check(safeOpening,'初始局面至少存在一个无伤移动，不制造开局必伤');
   btReset(s);for(let i=0;i<80&&!bt.ended;i++)btAct(i%2?'shoot':'move',['up','right','down','left'][i%4]);check(bt.enemies.every(e=>btInside(e.x,e.y)&&!btWall(e.x,e.y)),'怪物不能出界或进墙');
  }
  btReset(0);return {locked};
 });
 await page.evaluate(()=>btAssetsReady);
 await page.evaluate(()=>{
  const check=(v,msg)=>{if(!v)throw Error(msg);};
  btReset(0);bt.enemies[0].hp=1;btAct('shoot','right');check(bt.enemies.length===0,'规则当次击杀');
  let clip=btPlayback.queue[0];clip.start=1000;
  check(btVisualView(1000).world.enemies.length===1,'画面保留尚未命中的怪物');
  const shot=clip.effects.find(f=>f.kind==='shot'),hit=btVisualView(1000+shot.at+20).world.enemies[0];check(hit.visualFrame===6&&hit.hp===0,'视觉命中后播放死亡前帧');
  check(btVisualView(1000+shot.at+200).world.enemies[0].visualFrame===7,'死亡后帧');
  check(btVisualView(1000+shot.at+361).world.enemies.length===0,'死亡动画完成才移除画面');
  btReset(0);check(btInputAction('move','up'),'空闲时接受输入');check(!btInputAction('shoot','left')&&bt.step===1&&bt.shots===0&&btPlayback.queue.length===1,'动画期间直接丢弃新操作、不缓冲');
  clip=btPlayback.queue[0];clip.start=1000;const mid=btVisualView(1000+22/170*500).world.player;check(mid.y<3&&mid.y>2,'正式移速连续插值');
  const logic=JSON.stringify([bt.player,bt.enemies,bt.bonus,bt.rng]);btVisualView(99999);check(JSON.stringify([bt.player,bt.enemies,bt.bonus,bt.rng])===logic,'动画只读规则状态');
  btReset(0);check(btPlayback.queue.length===0,'重置清空旧动画');
 });
 assert.equal(await page.evaluate(()=>Object.values(btImages).every(im=>im instanceof HTMLCanvasElement||im.complete&&im.naturalWidth>0)),true,'正式资源必须全部解码');
 await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>bt.step),0,'空格不执行等待');
 await page.keyboard.press('w');assert.equal(await page.evaluate(()=>bt.bonus),2,'真实键盘触发奖励');
 await page.waitForTimeout(200);
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>bt.bonus),2,'Esc不回溯');
 await page.keyboard.press('r');assert.equal(await page.evaluate(()=>bt.step),0);
 await page.setViewportSize({width:700,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.selectOption('#scene','10');assert.match(await page.locator('#scene-info').innerText(),/8只.*4近战.*4远程/);
 assert.equal(await page.evaluate(()=>bt.enemies.length),8,'下拉框选择八怪场景');
 await page.click('#reset');assert.equal(await page.evaluate(()=>bt.scene),10,'重置保持选中场景');
 await page.evaluate(()=>{
  const check=(v,msg)=>{if(!v)throw Error(msg);};
  const fixture=(kind,x=5,y=3)=>{btReset(btRoomStart);bt.walls=[];bt.enemies=[btMakeEnemy(kind,x,y,0)];bt.nextId=1;Object.assign(bt.player,{x:2,y:3,hp:5});btPlan();return bt.enemies[0];};
  let e=fixture('fixed');check(e.phase==='locked','固定射手四向3格锁定');
  e=fixture('fixed',5,4);check(e.phase==='default'&&e.next===null,'固定射手不追击且不斜射');
  e=fixture('mobile',5,4);check(e.phase==='chase'&&e.next,'移动射手五格内追击');
  e=fixture('mobile',5,5);check(JSON.stringify(btChase(e))===JSON.stringify({x:4,y:5}),'横向距离更大时先横向靠近');
  e=fixture('mobile',3,6);check(JSON.stringify(btChase(e))===JSON.stringify({x:3,y:5}),'纵向距离更大时先纵向靠近');
  e=fixture('mobile',2,2);Object.assign(bt.player,{x:5,y:4});check(JSON.stringify(btChase(e))===JSON.stringify({x:3,y:2}),'正方向同样优先较长轴');
  Object.assign(bt.player,{x:4,y:4});const tieDirs=new Set();for(const seed of [0,1]){bt.rng=seed;tieDirs.add(JSON.stringify(btChase(e)));}check(tieDirs.size===2&&tieDirs.has(JSON.stringify({x:3,y:2}))&&tieDirs.has(JSON.stringify({x:2,y:3})),'距离相等时两条靠近轴均可随机选中');
  e=fixture('mobile',5,5);bt.walls=[{x:4,y:5}];check(JSON.stringify(btChase(e))===JSON.stringify({x:5,y:4}),'较长轴被挡时改走另一条靠近轴');
  e=fixture('mobile',4,4);bt.walls=[{x:3,y:4},{x:4,y:3}];check(JSON.stringify(btChase(e))===JSON.stringify({x:4,y:5}),'两条靠近轴被挡时先远离绕路');
  const visited=new Set([e.x+','+e.y]);for(let i=0;i<8&&Math.abs(e.x-bt.player.x)+Math.abs(e.y-bt.player.y)>1;i++){const next=btChase(e);check(next&&!visited.has(next.x+','+next.y),'绕路不得来回折返');Object.assign(e,next);visited.add(e.x+','+e.y);}check(Math.abs(e.x-bt.player.x)+Math.abs(e.y-bt.player.y)===1,'连续绕路最终到达玩家邻格');
  e=fixture('mobile',6,3);bt.walls=[{x:1,y:3},{x:3,y:3},{x:2,y:2},{x:2,y:4}];check(JSON.stringify(btChase(e))===JSON.stringify({x:5,y:3}),'玩家邻格全堵仍向最近可达格靠近');e.x=4;check(btChase(e)===null,'已到最近可达位置才等待');
  e=fixture('mobile',4,4);bt.walls=[{x:3,y:4},{x:5,y:4},{x:4,y:3},{x:4,y:5}];check(btChase(e)===null,'真正被围住时不能穿墙');
  e=fixture('fighter',4,3);btAct('shoot','up');check(e.x===4&&e.y===3&&e.phase==='recover'&&bt.player.hp===4,'近战者攻击2格但不位移并恢复');
  e=fixture('small',3,3);btAct('move','up');check(e.x===2&&e.phase==='locked'&&bt.bonus===2,'史莱姆冲锋1格、无恢复、下步可立即准备攻击');
  e=fixture('charger',6,3);btAct('move','up');check(e.x===2&&e.phase==='recover','冲锋者冲锋4格');
  fixture('bomber',3,3);btAct('shoot','up');check(bt.player.hp===4&&!bt.enemies.length,'自爆攻击八邻格并自杀');
  fixture('bomber',3,3);btAct('shoot','right');check(bt.player.hp===5&&!bt.fx.some(f=>f.kind==='attack'),'提前击杀自爆者不爆炸');
  e=fixture('big',4,3);e.hp=1;bt.bonus=2;btAct('shoot','right');check(bt.enemies.length===2&&bt.enemies.every(e=>e.kind==='small'),'大史莱姆分裂两只');
  const babies=JSON.stringify(bt.enemies);btAct('shoot','left');check(JSON.stringify(bt.enemies)===babies,'奖励期出生的孩子继续冻结');
  e=fixture('big',4,3);bt.enemies=[];bt.walls=[{x:4,y:2},{x:5,y:3},{x:4,y:4},{x:3,y:3}];const children=btSplit(e);check(children.length===2&&children.every(e=>Math.abs(e.x-4)+Math.abs(e.y-3)>=2),'邻格堵住继续向外搜索分裂位置');
  e=fixture('x',4,3);check(e.next&&btTypes[e.kind].jump&&!btAt(bt.player,e.next.x,e.next.y),'追击跳跃选择合法射程落点');btAct('shoot','up');check(e.phase==='locked'&&bt.player.hp===5,'跳跃后预告下步攻击，不同时射击');
  for(const kind of ['x','cross'])for(let seed=0;seed<50;seed++){
   e=fixture(kind,7,1);bt.rng=seed;e.phase='idle';btPlan();check(e.phase==='chase'&&e.next,'斜向五格内应进入追击而非随机跳跃');
   const probe={...e,...e.next};check(btAttackCells(probe).some(c=>btAt(c,bt.player.x,bt.player.y)),'每个追击落点都有通往玩家的真实射线');
  }
  e=fixture('x',4,3);const probe={...e,x:3,y:2};check(!btEnemyBlocked(probe,e.x,e.y),'候选位置模拟不把本体旧位置当另一只怪');
  e=fixture('x',4,3);for(let y=0;y<BT_ROWS;y++)for(let x=0;x<BT_COLS;x++)if(Math.abs(x-bt.player.x)===Math.abs(y-bt.player.y)&&!btAt(bt.player,x,y))bt.walls.push({x,y});e.phase='idle';btChooseNewPlan(e);check(e.phase==='chase'&&e.next===null,'没有合法射击落点时不退回随机跳跃');
  e=fixture('cross',5,3);check(e.cells.some(c=>c.x===5&&c.y===0)&&e.cells.some(c=>c.x===0&&c.y===3),'十字射手四条5格射线');
  // 每房一次清场后进出，返回不重新刷怪；保留生命与可选恢复。
  btReset(btRoomStart);bt.enemies=[];bt.cleared=true;Object.assign(bt.player,{x:8,y:3,hp:3});check(btAct('move','right')&&bt.scene===btRoomStart+1&&bt.player.hp===3,'穿门保留生命');
  bt.enemies=[];bt.player.x=0;check(btAct('move','left')&&bt.scene===btRoomStart&&!bt.enemies.length,'返回已清房间不刷怪');
  document.getElementById('room-heal').checked=true;bt.player.x=8;btAct('move','right');check(bt.player.hp===5,'每房恢复选项');document.getElementById('room-heal').checked=false;
  btReset(btRoomStart+7);check(bt.scene===btRoomStart+7&&btTrip.rooms.size===0,'直接切换重置路线进度');
 });
 await page.selectOption('#scene','19');await page.waitForTimeout(100);
 await page.evaluate(()=>{btReset(btRoomStart);bt.enemies=[];bt.walls=[];Object.assign(bt.player,{x:4,y:3});btVisualReset();});
 await page.keyboard.press('w');await page.keyboard.press('w');await page.keyboard.press('ArrowUp');
 assert.deepEqual(await page.evaluate(()=>[bt.step,bt.player.x,bt.player.y,bt.shots,btPlayback.queue.length]),[1,4,2,0,1],'快速连按移动和射击只执行第一个动作');
 await page.waitForFunction(()=>!btPlayback.queue.length);await page.waitForTimeout(250);
 assert.deepEqual(await page.evaluate(()=>[bt.step,bt.player.y]),[1,2],'停止输入后不继续自动执行历史');
 await page.keyboard.press('w');assert.equal(await page.evaluate(()=>bt.step),2,'动画结束后新按键正常接受');await page.waitForFunction(()=>!btPlayback.queue.length);
 await page.click('#shoot button[data-dir="right"]');await page.click('#shoot button[data-dir="left"]');assert.equal(await page.evaluate(()=>bt.shots),1,'鼠标按钮同样不缓存');await page.waitForFunction(()=>!btPlayback.queue.length);
 await page.evaluate(()=>{
  const check=(v,msg)=>{if(!v)throw Error(msg);};
  check(Object.keys(BT_ASSETS).filter(k=>k.startsWith('unit-')).length===17,'17张新固定状态帧');
  for(const kind of ['fixed','big','small','bomber','charger','x','cross']){
   const e=btMakeEnemy(kind,4,3,88);e.phase='locked';const before={...e},after={...e,x:5};
   const view={elapsed:100,world:{enemies:[e]},clip:null};check(BT_ASSETS[btArtState(e,view)],kind+'准备态资源存在');
   e.hp=0;check(btArtState(e,view)==='unit-effects-destroy',kind+'使用同一摧毁资源');e.hp=1;
   if(kind==='x'||kind==='cross'){view.clip={before:{enemies:[before]},after:{enemies:[after]},effects:[]};check(btArtState(e,view)==='unit-'+kind+'-jump','空中切换固定腾空帧');}
  }
  btReset(btRoomStart+2);bt.walls=[];bt.enemies=[btMakeEnemy('big',4,3,0)];bt.enemies[0].hp=1;bt.nextId=1;Object.assign(bt.player,{x:2,y:3});btPlan();btVisualReset();btAct('shoot','right');const clip=btPlayback.queue[0];clip.start=1000;const hit=clip.effects.find(f=>f.kind==='shot').at;
  const mid=btVisualView(1000+hit+150);const child=mid.world.enemies.find(e=>e.kind==='small');check(child&&child.birthOrigin&&child.y!==bt.enemies.find(e=>e.id===child.id).y,'分裂小史莱姆从死亡点跳向目标');
  const world=structuredClone(bt),view={world:{...bt,bonus:2}};btSetTimeState(true);btDrawTimeField(view);check(btTimeArt.active,'冻结棋盘覆盖层');btSetTimeState(false);btDrawTimeField({world:{...bt,bonus:0}});check(btTimeArt.release,'解除触发向外渐隐');check(JSON.stringify(bt)===JSON.stringify(world),'棋盘效果不改变规则状态');
  btReset(0);check(btInputAction('move','up'),'接受闪避操作');check(btTimeArt.active&&btTimeArt.enter&&btVisualView().world.bonus===0,'输入接受时立即展开冻结效果，不等视觉行动结束');
  const finish=()=>{const clip=btPlayback.queue[0],now=performance.now();clip.start=now-clip.actionDuration-1;btAdvancePlayback(now);};
  finish();check(btInputAction('shoot','left'),'接受额外行动');finish();check(btInputAction('shoot','left'),'接受最后额外行动');check(!btTimeArt.active&&btTimeArt.release&&btVisualView().world.bonus===1,'最后额外行动键入时立即解除效果');
  btDraw();check(btCanvas.style.boxShadow==='none'&&btCanvas.style.borderColor==='rgb(71, 97, 108)','取消子弹时间棋盘外蓝框');
  btReset(btRoomStart);bt.enemies=[];bt.walls=[];Object.assign(bt.player,{x:4,y:3});btVisualReset();btInputAction('shoot','left');
  check(btPlayback.queue[0].actionDuration<btPlayback.queue[0].duration,'命中与装饰余效分开计时');finish();check(!btPlayback.queue.length&&btPlayback.tails.length===1,'余效播放时已解除输入锁定');
  check(btInputAction('move','up')&&bt.step===2,'无需等待上一动作余效结束即可执行下一动作');check(!btInputAction('move','up')&&bt.step===2,'动作未到位前仍丢弃连按、不累积');
  btReset(btRoomStart);bt.walls=[];bt.enemies=[btMakeEnemy('fixed',4,3,0),btMakeEnemy('bomber',2,4,1)];bt.nextId=2;Object.assign(bt.player,{x:2,y:3});btPlan();btVisualReset();
  const draw=btImage,calls=[];btImage=function(...args){calls.push(args);return draw(...args);};try{btDraw();}finally{btImage=draw;}
  check(calls.filter(c=>c[0]==='alert').length===2,'两个准备攻击怪物都显示红色感叹号');
  btReset(btRoomStart+7);
 });
 await page.setViewportSize({width:1200,height:1000});await page.waitForTimeout(100);
 assert.deepEqual(errors,[]);console.log('PASS: 单步原型真实Chrome规则、优先级、冻结、输入、重置与窄屏检查');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
