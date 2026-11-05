const assert=require('assert'),path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('../tools/runtime-deps.cjs').runtimeDependency('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/bullet-time-playtest.html')).href);
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
  check(btScenes.length===12,'12组固定场景');
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
  btReset(0);btAct('move','up');btAct('shoot','left');check(btPlayback.queue.length===2,'连续输入不截断前一动画');
  clip=btPlayback.queue[0];clip.start=1000;const mid=btVisualView(1000+22/170*500).world.player;check(mid.y<3&&mid.y>2,'正式移速连续插值');
  const logic=JSON.stringify([bt.player,bt.enemies,bt.bonus,bt.rng]);btVisualView(99999);check(JSON.stringify([bt.player,bt.enemies,bt.bonus,bt.rng])===logic,'动画只读规则状态');
  btReset(0);check(btPlayback.queue.length===0,'重置清空旧动画');
 });
 assert.equal(await page.evaluate(()=>Object.values(btImages).every(im=>im instanceof HTMLCanvasElement||im.complete&&im.naturalWidth>0)),true,'正式资源必须全部解码');
 await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>bt.step),0,'空格不执行等待');
 await page.keyboard.press('w');assert.equal(await page.evaluate(()=>bt.bonus),2,'真实键盘触发奖励');
 await page.waitForTimeout(200);
 if(process.argv[2])await page.screenshot({path:path.resolve(process.argv[2]),fullPage:true});
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>bt.bonus),2,'Esc不回溯');
 await page.keyboard.press('r');assert.equal(await page.evaluate(()=>bt.step),0);
 await page.setViewportSize({width:700,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.selectOption('#scene','10');assert.match(await page.locator('#scene-info').innerText(),/8只.*近战4.*远程4/);
 assert.equal(await page.evaluate(()=>bt.enemies.length),8,'下拉框选择八怪场景');
 await page.click('#reset');assert.equal(await page.evaluate(()=>bt.scene),10,'重置保持选中场景');
 await page.setViewportSize({width:1200,height:1000});await page.waitForTimeout(100);
 if(process.argv[2])await page.screenshot({path:path.resolve(process.argv[2]).replace(/\.png$/, '-crowd.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: 单步原型真实Chrome规则、优先级、冻结、输入、重置与窄屏检查');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
