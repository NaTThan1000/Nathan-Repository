const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),delay=ms=>new Promise(r=>setTimeout(r,ms));
const output=process.env.SUGAR_BREAK_TEST_OUTPUT||__dirname;
fs.mkdirSync(output,{recursive:true});
const {launchQaChrome}=require('./qa-chrome.cjs');
const {chrome,close}=launchQaChrome();
let ws,id=0,pending=new Map(),errors=[],checks=[];
function send(method,params={}){return new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});ws.send(JSON.stringify({id:i,method,params}));setTimeout(()=>{if(pending.has(i)){pending.delete(i);reject(Error('CDP timeout '+method))}},25000).unref()})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const run=code=>evaluate(code),snap=()=>run('SugarBreak.snapshot()');
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,'v3-'+name+'.png'),Buffer.from(r.data,'base64'))}
async function clean(){await run(`SugarBreak.start();SugarBreak.set({autospawn:false,enemies:[],recipeChosen:true});SugarBreak.player({inv:0});SugarBreak.aim(0)`)}
async function advance(seconds){await run(`SugarBreak.step(.02,${Math.ceil(seconds/.02)})`)}
async function settle(){await run('for(let i=0;i<100&&SugarBreak.snapshot().action;i++)SugarBreak.step(.02)')}
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name)}
(async()=>{let log='';const port=await new Promise((resolve,reject)=>{chrome.stderr.on('data',b=>{log+=b;const m=log.match(/DevTools listening on ws:\/\/127.0.0.1:(\d+)/);if(m)resolve(+m[1])});chrome.once('error',reject);chrome.once('exit',c=>reject(Error('Chrome '+c+' '+log)));setTimeout(()=>reject(Error('startup timeout '+log)),20000).unref()});
const target=await fetch('http://127.0.0.1:'+port+'/json/new?'+encodeURIComponent(pathToFileURL(path.join(root,'甜界逃生.html')).href+'?test=1'),{method:'PUT'}).then(r=>r.json());ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails)};await send('Runtime.enable');await send('Page.enable');for(let i=0;i<60;i++){if(await run("typeof SugarBreak!=='undefined'"))break;await delay(100)}await run('SugarBreak.manual(true)');for(let n=0;n<80;n++){if(await run('SugarBreak.snapshot().atlas>0 && document.images.length>=0 && typeof HERO_URL==="string"')){await delay(200);break}await delay(100)}
await check('离线单文件与图集加载',async()=>{assert.equal((await snap()).state,'title');assert.ok((await snap()).atlas>0);await delay(500);await shot('01-title')});
await check('纯键盘开始、试招庭院和工坊选择装备',async()=>{await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyT',key:'t'});await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyT'});assert.equal((await snap()).training,true);assert.deepEqual((await snap()).weapons,[1,1,1,1]);assert.deepEqual((await snap()).allies,[0,1,2]);await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyR',key:'r'});await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyR'});assert.equal((await snap()).state,'armory');await send('Input.dispatchKeyEvent',{type:'keyDown',code:'ArrowRight',key:'ArrowRight'});await send('Input.dispatchKeyEvent',{type:'keyUp',code:'ArrowRight'});await send('Input.dispatchKeyEvent',{type:'keyDown',code:'Enter',key:'Enter'});await send('Input.dispatchKeyEvent',{type:'keyUp',code:'Enter'});assert.equal((await snap()).state,'playing');assert.equal((await snap()).form,'halberd');await run('SugarBreak.step(.02,10)');assert.equal((await snap()).resonance,100);await shot('00-training')});
await check('庭院切换木桩、打断与闪避陪练，并保留装备',async()=>{
  const b=async()=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,code:'KeyB',key:'b'})};
  assert.equal((await snap()).form,'halberd');
  await b();
  assert.equal((await snap()).practice,1);
  assert.equal((await snap()).enemies,1);
  await advance(.8);
  assert.equal(await run('SugarBreak.enemyInfo(0).state'),'windup');
  await run('SugarBreak.attack("light")');
  await advance(.12);
  assert.equal((await snap()).metrics.interrupts,1);
  await b();
  assert.equal((await snap()).practice,2);
  await advance(.65);
  assert.equal(await run('SugarBreak.enemyInfo(0).armored'),true);
  await shot('practice-charge');
  await advance(.58);
  await run('SugarBreak.dash()');
  await advance(.22);
  assert.equal((await snap()).metrics.perfectDodges,1);
  await b();
  assert.equal((await snap()).practice,0);
  assert.equal((await snap()).enemies,7);
  assert.equal((await snap()).form,'halberd');
});
await check('餐具快捷按钮在 HUD 刷新时保留焦点和点击目标',async()=>{
  await clean();
  const at=await run(`SugarBreak.set({weapons:[1,1,0,0]});SugarBreak.step(.02);
    window.activeSlot=document.querySelector('[data-weapon="1"]');
    activeSlot.focus();
    const r=activeSlot.getBoundingClientRect();
    ({x:r.left+r.width/2,y:r.top+r.height/2})`);
  assert.equal(await run('document.activeElement===activeSlot'),true);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...at,button:'left',clickCount:1});
  await advance(.25);
  assert.equal(await run("document.querySelector('[data-weapon=\"1\"]')===activeSlot"),true);
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',...at,button:'left',clickCount:1});
  assert.equal((await snap()).form,'knife');
});
await check('完全手动：静止不出招、不造成接触伤害',async()=>{await clean();await run('SugarBreak.enemy(1230,1150,0,{hp:500,max:500,speed:0,cooldown:999})');await advance(3);assert.equal((await snap()).metrics.attacks,0);assert.equal(await run('SugarBreak.enemyInfo(0).hp'),500);assert.equal((await snap()).hp,100)});
await check('鼠标移动与点击均不影响攻击，J 按移动朝向出招',async()=>{await clean();await run('SugarBreak.enemy(1230,1150,0,{hp:500,max:500,speed:0,cooldown:999})');await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:50,y:50});await send('Input.dispatchMouseEvent',{type:'mousePressed',x:50,y:50,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:50,y:50,button:'left',clickCount:1});await advance(.3);assert.equal((await snap()).metrics.attacks,0);assert.equal((await snap()).aim,0);await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyJ',key:'j'});await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyJ',key:'j'});await advance(.45);assert.ok(await run('SugarBreak.enemyInfo(0).hp<500'));await settle();await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyA',key:'a'});await advance(.04);await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyA',key:'a'});assert.ok(Math.abs((await snap()).aim-Math.PI)<.001);const hp=await run('SugarBreak.enemyInfo(0).hp');await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyJ',key:'j'});await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyJ',key:'j'});await advance(.45);assert.equal(await run('SugarBreak.enemyInfo(0).hp'),hp)});
await check('八方向朝向、原地保持朝向与出招中锁定方向',async()=>{await clean();await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyW',key:'w'});await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyD',key:'d'});await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyL',key:'l'});assert.ok(Math.abs((await snap()).action.a+Math.PI/4)<.001);for(const code of ['KeyW','KeyD','KeyL'])await send('Input.dispatchKeyEvent',{type:'keyUp',code});await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyA',key:'a'});await advance(.1);assert.ok(Math.abs((await snap()).action.a+Math.PI/4)<.001);await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyA'});await settle()});
await check('跳跃、空中 L 落斩与落地恢复',async()=>{await clean();await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyK',key:'k'});await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyK'});await advance(.2);assert.ok((await snap()).z>25);assert.equal((await snap()).motionFrames,16);assert.equal((await snap()).motionPose,1);await advance(.06);assert.equal((await snap()).motionPose,2);await shot("airborne");await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyL',key:'l'});await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyL'});assert.equal((await snap()).action.aerial,true);assert.equal((await snap()).motionPose,12);await advance(1);assert.equal((await snap()).z,0);assert.equal((await snap()).hp,100)});
await check('真实闪避输入驱动翻滚姿势，受击切换到后仰',async()=>{
  await clean();
  for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,code:'Space',key:' '});
  assert.equal((await snap()).motionPose,4);
  await advance(.08);
  assert.equal((await snap()).motionPose,5);
  await shot('roll');
  await advance(.25);
  await run('SugarBreak.receive(10,0)');
  assert.equal((await snap()).motionPose,8);
  await advance(.08);
  assert.equal((await snap()).motionPose,9);
  await shot('hurt');
});
await check('斜俯视投影保持角色站立，并压缩地面纵深',async()=>{const p=await run('SugarBreak.position()'),center=await run('SugarBreak.project('+p.x+','+p.y+')'),x=await run('SugarBreak.project('+(p.x+100)+','+p.y+')'),y=await run('SugarBreak.project('+p.x+','+(p.y+100)+')');assert.ok(Math.abs((y.y-center.y)/(x.x-center.x)-.49)<.001);assert.ok((await snap()).heroAtlas>0);assert.ok((await snap()).stageArt>0);assert.equal((await snap()).fusionSprites,3)});
await check('同帧松开方向，闪避派生仍朝向闪避方向',async()=>{
  await clean();
  const key=(type,code)=>send('Input.dispatchKeyEvent',{type,code});
  await key('keyDown','KeyW');
  await key('keyDown','Space');
  await key('keyUp','Space');
  await key('keyUp','KeyW');
  await key('keyDown','KeyJ');
  await key('keyUp','KeyJ');
  await advance(.22);
  const a=(await snap()).action;
  assert.ok(a.dodge);
  assert.ok(Math.abs(a.a+Math.PI/2)<.001);
});
await check('三段轻击与轻轻重衔接',async()=>{await clean();await run('SugarBreak.enemy(1240,1150,0,{hp:1000,max:1000,speed:0,cooldown:999});SugarBreak.attack("light")');await settle();await run('SugarBreak.attack("light")');assert.equal((await snap()).action.chain,2);await settle();await run('SugarBreak.attack("light")');assert.equal((await snap()).action.chain,3);await settle();await run('SugarBreak.attack("heavy")');assert.equal((await snap()).action.kind,'heavy')});
await check('普通近战前摇可被打断并进入硬直',async()=>{await clean();await run('SugarBreak.enemy(1220,1150,0,{hp:1000,max:1000});SugarBreak.enemyAttack(0);SugarBreak.attack("light")');await advance(.12);assert.equal(await run('SugarBreak.enemyInfo(0).state'),'stagger');assert.ok((await snap()).metrics.interrupts>0);await advance(.3);assert.equal((await snap()).hp,100)});
await check('敌人攻击实际碰撞：不躲会受伤，及时闪避可穿过攻击',async()=>{await clean();await run('SugarBreak.enemy(1205,1150,0,{hp:500,max:500,speed:0});SugarBreak.enemyAttack(0)');await advance(.8);assert.equal((await snap()).hp,90);await clean();await run('SugarBreak.enemy(1205,1150,0,{hp:500,max:500,speed:0});SugarBreak.enemyAttack(0)');await advance(.54);await run('SugarBreak.dash()');await advance(.16);assert.equal((await snap()).hp,100);assert.equal((await snap()).metrics.perfectDodges,1)});
await check('橙色霸体攻击承受命中仍继续，无法招架',async()=>{await clean();await run('SugarBreak.enemy(1210,1150,5,{hp:1000,max:1000});SugarBreak.enemyAttack(0);SugarBreak.attack("heavy")');await advance(.4);assert.equal(await run('SugarBreak.enemyInfo(0).state'),'windup');assert.equal(await run('SugarBreak.enemyInfo(0).armored'),true);assert.ok((await snap()).metrics.armorResists>0);await run('SugarBreak.player({guard:1,inv:0});SugarBreak.receive(15,0)');assert.equal((await snap()).hp,85);assert.equal((await snap()).metrics.parries,0)});
await check('闪避穿过攻击触发精准回避与手动反击',async()=>{await clean();await run('SugarBreak.enemy(1210,1150,0,{hp:1000,max:1000});SugarBreak.enemyAttack(0);SugarBreak.dash();SugarBreak.receive(10,0)');assert.equal((await snap()).hp,100);assert.equal((await snap()).metrics.perfectDodges,1);await advance(.21);await run('SugarBreak.attack("heavy")');assert.equal((await snap()).action.counter,true);assert.equal((await snap()).action.dodge,true)});
await check('六种餐具组合全部可装备，具备不同命中与效果',async()=>{const results={};for(const name of ['dual','halberd','lance','breaker','chain','gauntlet']){await clean();await run(`SugarBreak.set({weapons:[1,1,1,1]});SugarBreak.equip('${name}');SugarBreak.enemy(1240,1150,0,{hp:1000,max:1000,speed:0,cooldown:999});SugarBreak.attack('light')`);await advance(.42);await run('SugarBreak.player({stamina:100});SugarBreak.attack("heavy")');await advance(1);assert.ok(await run('SugarBreak.enemyInfo(0).hp<1000'));results[name]=await run('SugarBreak.enemyInfo(0)')}assert.notEqual(results.lance.x,results.gauntlet.x);assert.notEqual(results.halberd.hp,results.dual.hp);assert.ok(results.breaker.timer>0);await shot('02-combat')});
await check('长戟勾拢和砸地分别命中，并有独立动作',async()=>{
  await clean();
  await run('SugarBreak.set({weapons:[1,1,1,1]});SugarBreak.equip("halberd");SugarBreak.enemy(1245,1150,0,{hp:500,max:500,speed:0,cooldown:999});SugarBreak.attack("heavy")');
  await advance(.34);
  assert.equal(await run('SugarBreak.enemyInfo(0).hp'),482);
  assert.equal((await snap()).attackFrames,16);
  assert.equal((await snap()).weaponSprites,8);
  assert.equal((await snap()).attackPose,2);
  await shot('halberd-hook');
  await advance(.23);
  assert.equal((await snap()).attackPose,8);
  assert.equal(await run('SugarBreak.enemyInfo(0).hp'),482);
  await advance(.19);
  assert.equal(await run('SugarBreak.enemyInfo(0).hp'),434);
  assert.equal((await snap()).attackPose,10);
  await shot('halberd-impact');
});
await check('救下的同伴在领主战命中后追斩、治疗、削架势',async()=>{
  await clean();
  await run('SugarBreak.rescue();SugarBreak.bossSpawn();SugarBreak.player({hp:60});SugarBreak.setEnemy(0,{x:1220,y:1150,cooldown:999});SugarBreak.attack("light")');
  await advance(.25);
  const s=await snap();
  assert.equal(s.hp,66);
  assert.equal(s.boss.hp,601);
  assert.equal(s.boss.poise,98);
  assert.deepEqual(s.allies,[0,1,2]);
  const crew=await run('document.getElementById("crew").textContent');
  assert.ok(['主厨追斩','医师治疗','工程师磁索'].every(label=>crew.includes(label)));
  await shot('ally-support');
});
await check('六套武器各有命中接招，落空和超时不能触发',async()=>{
  const prepare=async(kit,x=1218)=>{
    await clean();
    await run(`SugarBreak.set({weapons:[1,1,1,1]});SugarBreak.equip('${kit}');SugarBreak.enemy(${x},1150,0,{hp:1000,max:1000,speed:0,cooldown:999})`);
  };
  const strike=async(kind)=>{await run(`SugarBreak.attack('${kind}')`);await settle()};
  const next=async(kind,kit)=>{
    await run(`SugarBreak.attack('${kind}')`);
    assert.equal((await snap()).action.combo,kit);
    await settle();
  };
  const hop=async()=>{await run('SugarBreak.jump()');await advance(.18)};

  await prepare('dual');
  await strike('light');await strike('light');await strike('heavy');
  assert.equal((await snap()).comboReady,'穿身回切');
  await next('light','dual');
  assert.ok((await run('SugarBreak.position()')).x>1215);

  await prepare('halberd',1245);
  await strike('heavy');
  assert.equal((await snap()).comboReady,'扫糖尾');
  await next('light','halberd');

  await prepare('lance',1260);
  await strike('light');await strike('heavy');
  assert.equal((await snap()).comboReady,'退步长刺');
  await next('light','lance');
  assert.ok((await run('SugarBreak.position()')).x<1100);

  await prepare('breaker');
  await strike('light');
  assert.equal((await snap()).comboReady,'碎甲坠铲');
  await hop();
  const crackedHp=await run('SugarBreak.enemyInfo(0).hp');
  await next('heavy','breaker');
  assert.equal(crackedHp-await run('SugarBreak.enemyInfo(0).hp'),81);
  await shot('combo-breaker');

  await prepare('chain',1380);
  await run('SugarBreak.dash()');
  await advance(.22);await strike('light');
  assert.equal((await snap()).comboReady,'回卷链舞');
  await next('heavy','chain');

  await prepare('gauntlet');
  await strike('heavy');await hop();
  assert.equal((await snap()).comboReady,'追空拳');
  const launchX=(await run('SugarBreak.position()')).x;
  await next('light','gauntlet');
  assert.ok((await run('SugarBreak.position()')).x>launchX+60);

  await prepare('breaker',1700);
  await strike('light');
  assert.equal((await snap()).comboReady,null);
  await prepare('breaker');
  await strike('light');await advance(1.6);
  assert.equal((await snap()).comboReady,null);
});
await check('三种双人合体由玩家选择；不输入就不释放攻击',async()=>{await clean();await run('SugarBreak.rescue();SugarBreak.set({resonance:100})');assert.deepEqual(await run('SugarBreak.fusionOptions()'),['01','02','12']);for(const key of ['01','02','12']){await run(`SugarBreak.set({ult:0,fusionKey:'${key}',resonance:100});SugarBreak.ult()`);assert.equal((await snap()).fusionKey,key);assert.ok((await snap()).ult>0);const count=(await snap()).metrics.attacks;await advance(.3);assert.equal((await snap()).metrics.attacks,count);await run('SugarBreak.player({stamina:100});SugarBreak.attack("heavy")');assert.equal((await snap()).action.kind,'heavy');await advance(1.3)}await shot('03-fusion')});
await check('盾反合体具有招架窗口和反击',async()=>{await clean();await run('SugarBreak.rescue();SugarBreak.set({fusionKey:"01",resonance:100});SugarBreak.ult();SugarBreak.player({inv:0});SugarBreak.enemy(1210,1150,0,{hp:500,max:500});SugarBreak.enemyAttack(0);SugarBreak.attack("heavy");SugarBreak.receive(10,0)');assert.equal((await snap()).hp,100);assert.equal((await snap()).metrics.parries,1);await run('SugarBreak.attack("heavy")');assert.equal((await snap()).action.counter,true)});
await check('白瓷圣卫只有招架后反震命中才治疗',async()=>{
  await clean();
  await run('SugarBreak.rescue(0);SugarBreak.rescue(1);SugarBreak.set({fusionKey:"01",resonance:100});SugarBreak.ult();SugarBreak.player({hp:60,inv:0});SugarBreak.attack("heavy")');
  await advance(1);
  assert.equal((await snap()).hp,60);
  await run('SugarBreak.enemy(1210,1150,0,{hp:500,max:500,speed:0});SugarBreak.enemyAttack(0)');
  await advance(.18);
  await run('SugarBreak.aim(Math.PI);SugarBreak.attack("light")');
  await advance(.1);
  assert.equal((await snap()).action.fired,true);
  await run('SugarBreak.aim(0);SugarBreak.attack("heavy")');
  assert.equal((await snap()).action.kind,'heavy');
  await advance(.37);
  assert.equal((await snap()).metrics.parries,1);
  assert.equal((await snap()).hp,60);
  assert.ok((await run('document.getElementById("ulthint").textContent')).includes('反震就绪'));
  await run('SugarBreak.attack("heavy")');
  assert.equal((await snap()).action.riposte,true);
  await advance(.18);
  assert.equal((await snap()).hp,70);
  assert.equal((await run('SugarBreak.enemyInfo(0)')).hp,398);
});
await check('缝合游侠 J 布索，K 可远程引爆一次且不会重新挂标',async()=>{
  await clean();
  await run('SugarBreak.rescue(1);SugarBreak.rescue(2);SugarBreak.set({fusionKey:"12",resonance:100});SugarBreak.ult();SugarBreak.enemy(1350,1150,0,{hp:500,max:500,speed:0,cooldown:999});SugarBreak.attack("light")');
  await settle();
  assert.equal((await run('SugarBreak.enemyInfo(0)')).markType,'tether');
  assert.ok((await run('SugarBreak.enemyInfo(0)')).mark>0);
  await run('SugarBreak.setEnemy(0,{x:1460,y:1150});SugarBreak.attack("heavy")');
  await advance(.38);
  let target=await run('SugarBreak.enemyInfo(0)');
  assert.equal(target.hp,385);
  assert.ok(target.mark<=0);
  assert.ok(target.x<1460);
  await settle();
  await run('SugarBreak.setEnemy(0,{x:1210,y:1150});SugarBreak.attack("heavy")');
  await advance(.38);
  target=await run('SugarBreak.enemyInfo(0)');
  assert.equal(target.hp,339);
  assert.ok(target.mark<=0);
});
await check('熔炉机甲火区持续伤害，灼烧不反复打断',async()=>{
  await clean();
  await run('SugarBreak.rescue();SugarBreak.set({fusionKey:"02",resonance:100});SugarBreak.ult();SugarBreak.enemy(1220,1150,0,{hp:500,max:500,speed:0,cooldown:999});SugarBreak.attack("heavy")');
  await advance(.61);
  assert.equal((await run('SugarBreak.enemyInfo(0)')).hp,424);
  await run('SugarBreak.setEnemy(0,{x:1215,y:1150,state:"approach",timer:10,shock:0,cooldown:999})');
  await advance(.44);
  const target=await run('SugarBreak.enemyInfo(0)');
  assert.equal(target.hp,416);
  assert.equal(target.state,'approach');
});
await check('医师在实际命中后支援，等待和空挥不会治疗',async()=>{
  await clean();
  await run('SugarBreak.rescue(1);SugarBreak.player({hp:60})');
  await advance(12);
  assert.equal((await snap()).hp,60);
  await run('SugarBreak.attack("light")');
  await settle();
  assert.equal((await snap()).hp,60);
  await run('SugarBreak.enemy(1210,1150,0,{hp:500,max:500,speed:0,cooldown:999});SugarBreak.attack("light")');
  await advance(.2);
  assert.equal((await snap()).hp,66);
});
await check('HUD 高亮选中的搭档，合体结束后同伴恢复支援',async()=>{
  await clean();
  await run('SugarBreak.rescue();SugarBreak.set({fusionKey:"01",resonance:100});SugarBreak.ult();SugarBreak.player({hp:60})');
  assert.equal(await run('document.querySelectorAll("#crew .linked").length'),2);
  await advance(3.2);
  await run('SugarBreak.enemy(1210,1150,0,{hp:500,max:500,speed:0,cooldown:999});SugarBreak.attack("light")');
  await advance(.24);
  assert.equal((await snap()).hp,60);
  await run('SugarBreak.set({enemies:[]})');
  await advance(9.2);
  assert.equal((await snap()).ult,0);
  await run('SugarBreak.enemy(1210,1150,0,{hp:500,max:500,speed:0,cooldown:999});SugarBreak.attack("light")');
  await advance(.24);
  assert.equal((await snap()).hp,66);
});
await check('首波不弹窗，第二波打完才二选一',async()=>{
  await run('SugarBreak.start();SugarBreak.set({routeSide:-1});SugarBreak.player({inv:999})');
  assert.equal(await run('document.getElementById("equipment").hidden'),true);
  assert.equal(await run('document.getElementById("ult").hidden'),true);
  await run('for(let i=0;i<3;i++)SugarBreak.setEnemy(i,{x:1210+i*12,y:1150,hp:1,speed:0,cooldown:999});SugarBreak.attack("light")');
  await advance(.22);
  assert.equal((await snap()).state,'playing');
  await advance(2.6);
  assert.equal((await snap()).enemies,4);
  await run('for(let i=0;i<4;i++)SugarBreak.setEnemy(i,{x:1210+i*12,y:1150,hp:1,speed:0,cooldown:999});SugarBreak.aim(0);SugarBreak.attack("light")');
  await advance(.28);
  assert.equal((await snap()).state,'choice');
  assert.deepEqual((await run('SugarBreak.choices()')).map(c=>c.headline),['处刑双刃','翻糖长戟']);
  await shot('two-choices');
  for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,code:'Digit2',key:'2'});
  assert.equal((await snap()).form,'halberd');
  assert.deepEqual((await snap()).weapons,[1,0,1,0]);
  await advance(2.6);
  assert.equal((await snap()).wave,2);
  assert.equal((await snap()).enemies,6);
});
await check('圣物只显示新效果，糖衣挡下一次实际伤害',async()=>{
  await clean();
  await run('SugarBreak.set({weapons:[1,1,1,1],mods:new Set(["echo"])});SugarBreak.bossSpawn();SugarBreak.killBoss()');
  await advance(.06);
  assert.equal((await snap()).state,'choice');
  const cards=await run('SugarBreak.choices()');
  assert.deepEqual(cards.map(c=>c.name),['重击接闪避','护行糖衣']);
  await run('SugarBreak.player({dash:.16,dashX:1,dashY:0,buffer:{kind:"heavy",t:2}});SugarBreak.choose(1);SugarBreak.player({inv:0});SugarBreak.receive(15,0)');
  assert.equal((await snap()).stage,1);
  assert.equal((await snap()).hp,100);
  await advance(.4);
  assert.deepEqual(await run('SugarBreak.position()'),{x:1150,y:1150});
  assert.equal((await snap()).action,null);
  await run('SugarBreak.receive(15,0)');
  assert.equal((await snap()).hp,85);
});
await check('救出第二名同伴时保留正在使用的合体招式',async()=>{
  await clean();
  await run('SugarBreak.rescue(0);SugarBreak.set({resonance:100});SugarBreak.ult();SugarBreak.rescue(1)');
  assert.equal((await snap()).fusionKey,'chef');
  assert.equal((await snap()).fusion,'灶火武者');
  await advance(12.1);
  assert.equal((await snap()).fusionKey,'01');
  assert.equal((await snap()).fusion,'白瓷圣卫');
});
await clean();
await check('暂停、图鉴和餐具工坊恢复状态',async()=>{await run('SugarBreak.pause()');assert.equal((await snap()).state,'paused');await run('SugarBreak.pause();SugarBreak.help()');assert.equal((await snap()).state,'help');await run('SugarBreak.help();SugarBreak.armory()');assert.equal((await snap()).state,'armory');assert.equal(await run('document.querySelectorAll("#formCards button").length'),1);await shot('05-armory');await run('SugarBreak.armory()');assert.equal((await snap()).state,'playing')});
await check('清空护卫才推进波次，最后由 Enter 挑战领主',async()=>{
  await run('SugarBreak.start();SugarBreak.set({recipeChosen:true});SugarBreak.player({inv:999})');
  assert.equal((await snap()).enemies,3);
  const enter=async()=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,code:'Enter',key:'Enter'})};
  await enter();
  await advance(75);
  assert.equal((await snap()).wave,0);
  assert.equal((await snap()).boss,null);
  const clear=async()=>{await run('for(let i=0;i<SugarBreak.snapshot().enemies;i++)SugarBreak.setEnemy(i,{dead:true})');await advance(.02)};
  for(const [wave,count] of [[1,4],[2,6]]){
    await clear();
    assert.ok((await snap()).waveBreak>0);
    await advance(2.6);
    assert.equal((await snap()).wave,wave);
    assert.equal((await snap()).enemies,count);
  }
  await clear();
  assert.equal((await snap()).bossReady,true);
  assert.equal(await run('document.getElementById("challengeBoss").hidden'),false);
  await advance(4);
  assert.equal((await snap()).boss,null);
  await enter();
  assert.equal((await snap()).boss.hp,650);
  assert.equal((await snap()).bossReady,false);
  await advance(18);
  assert.equal((await snap()).enemies,1);
});
await check('夹击波会从两侧进场，贴近边界也有交战距离',async()=>{
  const spawnFlanks=async(side,edge=false)=>{
    await run(`SugarBreak.start();SugarBreak.set({wave:1,routeSide:${side},recipeChosen:true});for(let i=0;i<3;i++)SugarBreak.setEnemy(i,{dead:true})`);
    if(edge)await run('SugarBreak.player({x:32,y:34})');
    await advance(.02);
    await run('SugarBreak.step(2.5)');
    const result=await snap();
    assert.equal(result.wave,2);
    assert.equal(result.enemies,6);
    return run('Array.from({length:6},(_,i)=>SugarBreak.enemyInfo(i))');
  };
  const right=await spawnFlanks(1),left=await spawnFlanks(-1);
  const theta=3.4;
  const perpendicular=e=>-(e.x-1150)*Math.sin(theta)+(e.y-1150)*Math.cos(theta);
  assert.ok(perpendicular(right[4]) < -190);
  assert.ok(perpendicular(right[5]) > 190);
  assert.ok(perpendicular(left[4]) > 190);
  assert.ok(perpendicular(left[5]) < -190);
  const corner=await spawnFlanks(1,true);
  assert.ok(corner.every(e=>e.x>=55&&e.y>=55&&Math.hypot(e.x-32,e.y-34)>185));
});
await check('各关场景独立加载，领主破势有明确的追击收益',async()=>{
  await clean();
  await run('SugarBreak.bossSpawn();SugarBreak.setEnemy(0,{x:1220,y:1150,poise:10,cooldown:999})');
  await run('SugarBreak.attack("heavy")');await settle();
  assert.equal((await snap()).boss.state,'stagger');
  const before=(await snap()).boss.hp;
  await run('SugarBreak.attack("light")');await settle();
  const boosted=before-(await snap()).boss.hp;
  await clean();
  await run('SugarBreak.bossSpawn();SugarBreak.setEnemy(0,{x:1220,y:1150,cooldown:999});SugarBreak.attack("light")');
  await settle();
  assert.equal(boosted,Math.round((650-(await snap()).boss.hp)*1.4));
  for(const [stage,name] of [[1,'foundry'],[2,'court']]){
    await clean();
    await run(`SugarBreak.set({stage:${stage},toast:0});SugarBreak.enemy(1305,1190,5,{hp:80});SugarBreak.enemyAttack(0);SugarBreak.enemy(1250,930,0);SugarBreak.enemyAttack(1);SugarBreak.step(.02,23)`);
    assert.ok((await snap()).stageArt>0);
    await shot('arena-'+name);
  }
});
await check('熔炉冲锋留下烫痕，王庭震地锁定霜圈',async()=>{
  await clean();
  await run('SugarBreak.set({stage:1});SugarBreak.bossSpawn();SugarBreak.setEnemy(0,{x:1320,y:1150});SugarBreak.enemyAttack(0);SugarBreak.player({inv:999});');
  await advance(1.26);
  const trail=await run('SugarBreak.hazards()');
  assert.equal(trail.length,3);
  assert.ok(trail.every(z=>z.theme==='caramel'));
  assert.ok(trail[0].x>trail[2].x);
  await shot('foundry-caramel');
  await advance(2);
  assert.equal(await run('SugarBreak.hazards().length'),0);
  await clean();
  await run('SugarBreak.set({stage:2});SugarBreak.bossSpawn();SugarBreak.setEnemy(0,{x:1370,y:1150});SugarBreak.enemyAttack(0);SugarBreak.player({x:1160,y:1010});');
  await advance(1.1);
  const [frost]=await run('SugarBreak.hazards()');
  assert.deepEqual(frost,{theme:'frost',fired:false,x:1150,y:1150});
  await shot('court-frost');
  await advance(.8);
  assert.equal((await snap()).hp,100);
});
await check('Boss 破势可硬直，三关圣物与胜利流程',async()=>{await clean();await run('SugarBreak.rescue();SugarBreak.bossSpawn();SugarBreak.player({inv:0});SugarBreak.setEnemy(0,{x:1220,y:1150,poise:10});SugarBreak.attack("heavy")');await advance(.4);assert.equal((await snap()).boss.state,'stagger');await shot('06-boss');for(let stage=0;stage<3;stage++){await run('SugarBreak.killBoss()');await advance(.1);if(stage<2){assert.equal((await snap()).state,'choice');await run('SugarBreak.choose(0);SugarBreak.bossSpawn()')}else assert.equal((await snap()).state,'victory')}assert.deepEqual((await snap()).allies,[0,1,2]);await shot('07-victory')});
await check('真实键盘移动、死亡与重开',async()=>{await clean();await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyD',key:'d'});await advance(.3);await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyD',key:'d'});assert.ok((await run('SugarBreak.position()')).x>1200);await run('SugarBreak.player({hp:1,inv:0});SugarBreak.receive(12,0)');assert.equal((await snap()).state,'dead');await run('document.getElementById("again").click()');assert.equal((await snap()).state,'playing')});
await check('80 敌人前摇 / 硬直 / 手动组合战斗渲染',async()=>{await clean();await run(`SugarBreak.set({weapons:[1,1,1,1],recipeChosen:true});SugarBreak.equip('halberd');SugarBreak.rescue();for(let i=0;i<80;i++){const a=i*2.4,r=95+i%9*33;SugarBreak.enemy(1150+Math.cos(a)*r,1150+Math.sin(a)*r,i%8,{hp:500,max:500})}SugarBreak.player({inv:100});SugarBreak.manual(false)`);for(let i=0;i<6;i++){await run(`SugarBreak.player({stamina:100});SugarBreak.attack('${i%3===2?'heavy':'light'}')`);await delay(480)}await shot('08-melee');await run('SugarBreak.manual(true)')});
const crowded=await snap();await send('Emulation.setDeviceMetricsOverride',{width:960,height:720,deviceScaleFactor:1,mobile:false});await delay(100);await shot('09-small-window');
// A readable, normal-health skirmish screenshot, separate from the stress scene.
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:940,deviceScaleFactor:1,mobile:false});await clean();await run(`SugarBreak.set({weapons:[1,1,1,1],toast:0});SugarBreak.equip('dual');SugarBreak.set({toast:0});for(let i=0;i<12;i++){const a=-1.6+i*.34,r=155+i%3*65;SugarBreak.enemy(1150+Math.cos(a)*r,1150+Math.sin(a)*r,i%7,{cooldown:999})}SugarBreak.enemy(1245,1170,0,{hp:90,max:90});SugarBreak.enemyAttack(12);SugarBreak.enemy(1070,1360,5,{hp:90,max:90});SugarBreak.enemyAttack(13);SugarBreak.attack('light');SugarBreak.step(.02,8)`);await delay(80);await shot('10-skirmish');
for(const [key,idx]of [['dual',0],['halberd',1],['lance',2],['breaker',3],['chain',4],['gauntlet',5]]){await clean();await run(`SugarBreak.set({weapons:[1,1,1,1],toast:0});SugarBreak.equip('${key}');SugarBreak.set({toast:0});for(let i=0;i<8;i++){const a=-1+i*.3,r=125+i%3*35;SugarBreak.enemy(1150+Math.cos(a)*r,1150+Math.sin(a)*r,i%7,{hp:300,max:300,cooldown:999})}SugarBreak.attack('heavy');SugarBreak.step(.02,28)`);await delay(80);await shot('skill-'+key)}
for(const key of ['01','02','12']){await clean();await run(`SugarBreak.rescue();SugarBreak.set({fusionKey:'${key}',resonance:100,toast:0});SugarBreak.ult();SugarBreak.set({toast:0});for(let i=0;i<6;i++)SugarBreak.enemy(1280+(i%2)*35,1060+i*35,i%7,{hp:300,max:300,cooldown:999});SugarBreak.attack('heavy');SugarBreak.step(.02,37)`);await delay(80);await shot('fusion-'+key)}

assert.equal(errors.length,0,JSON.stringify(errors));const report={passed:true,version:'oblique-keyboard-3',checks,crowdedSnapshot:crowded,errors};for(const name of ['v3-report.json','report.json'])fs.writeFileSync(path.join(output,name),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(async e=>{console.error(e);if(ws?.readyState===1){try{await shot('failure');console.error(JSON.stringify(await snap()))}catch{}}process.exitCode=1}).finally(()=>close(ws)).catch(e=>{console.error(e);process.exitCode=1});
