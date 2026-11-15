const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('../tools/runtime-deps.cjs').runtimeDependency('playwright');
const {pathToFileURL}=require('url');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve(__dirname,'../turnbased-shoot-demo-pack.html')).href);await page.waitForFunction(()=>Object.keys(MONSTER_DB).length>=14&&currentFloor?.layout);
const intro=await page.locator('#start-menu-modal').innerText();
for(const line of ['单步射击','敌人随之行动','可打断这次攻击','两次额外行动','右侧显示小地图','踩梯子'])assert.ok(intro.includes(line),'开场说明包含：'+line);
assert.doesNotMatch(intro,/回溯|消耗行动力|3 回合后引爆/);
await page.keyboard.press('Space');
assert.equal(await page.locator('#start-menu-modal').isVisible(),false);
await page.locator('#step-settings-button').press('Space');
assert.ok(await page.locator('#step-settings').isVisible());
const stepBeforeSettings=await page.evaluate(()=>SINGLE_STEP.step);
await page.keyboard.press('ArrowLeft');
assert.equal(await page.evaluate(()=>SINGLE_STEP.step),stepBeforeSettings,'设置打开时不接受战斗输入');
const wasMuted=await page.evaluate(()=>SFX.isMuted());
await page.locator('#step-settings #sound-btn').click();
assert.equal(await page.evaluate(()=>SFX.isMuted()),!wasMuted,'设置里的音效开关生效');
await page.locator('#step-settings #sound-btn').click();
await page.locator('#scrap-help').click();
assert.equal(await page.locator('#step-settings').isVisible(),false);
const help=await page.locator('#help-modal').innerText();
assert.match(help,/隔一道门相连的未进入房间显示暗色/);
assert.doesNotMatch(help,/回溯|消耗 1 AP|3 回合后引爆|结束回合/);
await page.locator('#help-close').click();
await page.locator('#step-settings-button').click();
await page.keyboard.press('Escape');
assert.equal(await page.locator('#step-settings').isVisible(),false,'Esc 关闭设置');
await page.evaluate(()=>{playerStats.hp=3;playerResources.coins=19;});
await page.locator('#step-settings-button').click();
await page.locator('#step-settings').getByRole('button',{name:'重新开始'}).click();
assert.deepEqual(await page.evaluate(()=>[gameStarted,playerStats.hp,playerResources.coins]),[true,10,0],'设置中的重新开始立即开新局');
await page.evaluate(()=>{playerStats.maxHp=12;playerStats.hp=12;playerResources.coins=99;playerResources.keys=99;playerResources.bombs=99;turnState.maxMAP=10;turnState.mAP=10;turnState.maxAAP=10;turnState.aAP=10;scrapHudKey='';scrapUpdateHUD();});await page.waitForTimeout(150);
const bounds=await page.evaluate(()=>[...document.querySelectorAll('#scrap-hud .scrap-panel')].flatMap(panel=>[...panel.querySelectorAll('img,span,small')].filter(el=>el.children.length===0&&el.getClientRects().length).map(el=>{const a=el.getBoundingClientRect(),b=panel.getBoundingClientRect();return {text:el.textContent||el.tagName,overflow:a.left<b.left+5||a.right>b.right-5||a.top<b.top+5||a.bottom>b.bottom-5,a:{left:a.left,right:a.right,top:a.top,bottom:a.bottom},b:{left:b.left,right:b.right,top:b.top,bottom:b.bottom}};})));assert.deepEqual(bounds.filter(x=>x.overflow),[],'顶部内容必须位于展示框安全边距内');
assert.equal(await page.locator('#minimap').isVisible(),true);
assert.equal(await page.locator('#world-map-modal').isVisible(),false);
const gameBounds=await page.locator('#game').boundingBox();
const mapBounds=await page.locator('#minimap').boundingBox();
assert.ok(mapBounds.x>=gameBounds.x+gameBounds.width,'默认小地图位于棋盘右侧');
assert.match(await page.locator('#floor-map-sidebar #scrap-floor').innerText(),/楼层 B1 \[M\]/);
assert.ok(await page.locator('#floor-map-sidebar #item-bar').isVisible());
assert.ok(await page.locator('.step-hud-controls #step-settings-button').isVisible());
assert.equal(await page.locator('#debug-btn, #spawn-monster-btn').count(),0);
await page.locator('#scrap-hud #scrap-res').waitFor({state:'visible'});
const controlsBounds=await page.locator('.step-hud-controls').boundingBox();
assert.ok(Math.abs(controlsBounds.x+controlsBounds.width-gameBounds.x-gameBounds.width)<1,'操作区右端与棋盘右缘对齐');
const assertStableHud=async width=>{
 await page.setViewportSize({width,height:1000});
 await page.locator((width===1280?'#scrap-hud':'#floor-map-sidebar')+' #scrap-res').waitFor({state:'visible'});
 const result=await page.evaluate(()=>{
  const selectors=['#game','#minimap','#scrap-hud','.scrap-stats','.scrap-state','.step-hud-controls','#scrap-res','#scrap-footer'];
  const getBounds=()=>selectors.map(selector=>{
   const {x,y,width,height}=document.querySelector(selector).getBoundingClientRect();
   return [x,y,width,height];
  });
  const original={turn:turnState.turnNumber,attack:playerStats.attack,coins:playerResources.coins};
  const snapshots=[];
  for(const [turn,attack,coins,bonus] of [[9,2,9,0],[10,10.5,10,2],[99,99,99,1],[100,100,0,0],[10000,150,99,0]]){
   turnState.turnNumber=turn;playerStats.attack=attack;playerResources.coins=coins;SINGLE_STEP.bonus=bonus;
   scrapUpdateHUD();
   snapshots.push({turn:Number(document.getElementById('scrap-turn').textContent),bounds:getBounds()});
  }
  turnState.turnNumber=original.turn;playerStats.attack=original.attack;playerResources.coins=original.coins;scrapUpdateHUD();
  return snapshots;
 });
 assert.deepEqual(result.map(sample=>sample.turn),[9,10,99,100,10000],'回合数确实跨位数更新');
 for(const sample of result)assert.deepEqual(sample.bounds,result[0].bounds,'固定视口 '+width+' 下，数字更新不改变棋盘、地图和HUD几何位置');
};
for(const width of [1280,760,390])await assertStableHud(width);
await page.setViewportSize({width:1280,height:1000});
await page.locator('#scrap-hud #scrap-res').waitFor({state:'visible'});
const hudLayout=await page.evaluate(()=>{
 const rect=selector=>document.querySelector(selector).getBoundingClientRect();
 const hpBar=rect('.scrap-health-meter'),label=rect('.scrap-health-label'),shield=rect('.scrap-shield-meter');
 const statLabels=[...document.querySelectorAll('.scrap-stat-name')];
 const twoRows=statLabels.every(el=>el.getBoundingClientRect().bottom<=el.nextElementSibling.getBoundingClientRect().top);
 SINGLE_STEP.bonus=2;scrapUpdateHUD();
 const count=stepBenefitRows.get('额外行动').querySelector('strong');
 const first=count.getAnimations()[0];
 SINGLE_STEP.bonus=1;scrapUpdateHUD();
 const next=count.getAnimations()[0];
 const frames=next?.effect.getKeyframes().map(frame=>frame.transform);
 SINGLE_STEP.bonus=0;scrapUpdateHUD();
 return {health:label.bottom<=hpBar.top&&hpBar.bottom<=shield.top,twoRows,jump:Boolean(first&&next&&first!==next),frames};
});
assert.deepEqual(hudLayout,{health:true,twoRows:true,jump:true,frames:['scale(1.6)','scale(1)']});
const mapStages=await page.evaluate(()=>{
 const surface=document.createElement('canvas');
 surface.width=240;surface.height=208;
 const context=surface.getContext('2d');
 const fill=context.fillRect.bind(context),stroke=context.stroke.bind(context);
 let colors=[],links=0;
 context.fillRect=(...args)=>{colors.push(context.fillStyle);fill(...args);};
 context.stroke=()=>{links++;stroke();};
 const old={floor:currentFloor,room:currentRoomId,visited:visitedRooms};
 try{
  currentFloor={layout:{
   start:{gx:0,gy:0},neighbor:{gx:1,gy:0},beyond:{gx:2,gy:0},noDoor:{gx:0,gy:1},
  },rooms:[
   {id:'start',type:'start',doors:{right:{targetRoomId:'neighbor',locked:true}}},
   {id:'neighbor',type:'normal',doors:{left:{targetRoomId:'start'},right:{targetRoomId:'beyond'}}},
   {id:'beyond',type:'shop',doors:{left:{targetRoomId:'neighbor'}}},
   {id:'noDoor',type:'normal',doors:{}},
  ]};
  currentRoomId='start';visitedRooms=new Set(['start']);
  drawFloorMap(surface);
  const first={colors,links};
  colors=[];links=0;
  visitedRooms.add('neighbor');currentRoomId='neighbor';
  drawFloorMap(surface);
  const explored={colors,links};
  colors=[];links=0;
  visitedRooms=new Set(['start']);currentRoomId='start';
  drawFloorMap(surface);
  return [first,explored,{colors,links}];
 }finally{currentFloor=old.floor;currentRoomId=old.room;visitedRooms=old.visited;}
});
assert.deepEqual(mapStages,[
 {colors:['#0a1b22','#3375a8','#192b35'],links:1},
 {colors:['#0a1b22','#3375a8','#3375a8','#192b35'],links:2},
 {colors:['#0a1b22','#3375a8','#192b35'],links:1},
],'只绘制已访房间、隔门相连的未访房间和相关门；重开时恢复探索范围');
const mapIcons=await page.evaluate(()=>{
 const surface=document.createElement('canvas');surface.width=240;surface.height=208;
 const context=surface.getContext('2d'),drawn=[];
 context.drawImage=image=>drawn.push([...scrapSymbols].find(([,sprite])=>sprite===image)?.[0]);
 const old={floor:currentFloor,room:currentRoomId,visited:visitedRooms,resources:resourcesOnGround};
 const supplies=[{cfgId:'heart_full'},{cfgId:'blue_heart_full'}];
 try{
  const types=['normal','shop','treasure','boss'];
  currentFloor={rooms:types.map(type=>({id:type,type,doors:{},_groundResources:supplies})),
    layout:Object.fromEntries(types.map((id,gx)=>[id,{gx,gy:0}]))};
  currentRoomId='normal';visitedRooms=new Set(types);resourcesOnGround=supplies;
  drawFloorMap(surface);
  return drawn;
 }finally{currentFloor=old.floor;currentRoomId=old.room;visitedRooms=old.visited;resourcesOnGround=old.resources;}
});
assert.deepEqual(mapIcons,['medical-pack','room-shop','room-treasure','room-boss'],'普通房显示一件资源，三类特殊房各显示房型图标');
const shots=await page.evaluate(()=>totalShots);await page.keyboard.press('m');assert.equal(await page.locator('#world-map-modal').isVisible(),true);await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>totalShots),shots,'地图打开时不处理射击');
const destination=process.argv[2];if(destination)await page.screenshot({path:path.join(destination,'world-map-browser.png'),fullPage:true});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>worldMapOpen),false);await page.keyboard.press('m');await page.keyboard.press('m');assert.equal(await page.evaluate(()=>worldMapOpen),false);
const travelTarget=await page.evaluate(()=>{
 const source=currentFloor.rooms.find(room=>room.id===currentRoomId);
 const [dir,door]=Object.entries(source.doors).find(([,door])=>door);
 const target=currentFloor.rooms.find(room=>room.id===door.targetRoomId);
 door.open=true;target.locked=true;floorFadeBusy=false;playerResources.keys=0;
 const from=DOOR_POS[dir];
 if(tryWalkIntoDoor(from.col,from.row,dir)||transition)throw new Error('无钥匙不能穿过锁门');
 playerResources.keys=1;
 if(!tryWalkIntoDoor(from.col,from.row,dir)||target.locked||playerResources.keys!==0)throw new Error('有钥匙时同一步开门并换房');
 const entry={col:transition.playerEntryCol,row:transition.playerEntryRow};
 transition=null;
 visitedRooms.add(target.id);
 drawMinimap();
 const surface=document.getElementById('minimap'),bounds=surface.getBoundingClientRect();
 const cell=floorMapDrawState.get(surface).hitBoxes.find(box=>box.id===String(target.id));
 return {id:target.id,source:source.id,entry,x:bounds.left+cell.x*bounds.width/surface.width,y:bounds.top+cell.y*bounds.height/surface.height};
});
await page.mouse.click(travelTarget.x,travelTarget.y);
assert.equal(await page.evaluate(()=>currentRoomId),travelTarget.source,'已访未清空房间不可传送');
await page.evaluate(id=>{stepClearedRooms.add(currentFloor.rooms.find(room=>room.id===id));inCombat=true;},travelTarget.id);
await page.mouse.click(travelTarget.x,travelTarget.y);
assert.equal(await page.evaluate(()=>transition),null,'战斗中不可快速移动');
await page.evaluate(()=>{inCombat=false;});
await page.mouse.click(travelTarget.x,travelTarget.y);
await page.waitForFunction(id=>currentRoomId===id&&transition===null,travelTarget.id);
assert.notEqual(await page.evaluate(()=>currentRoomId),travelTarget.source,'非战斗时点击已清空房间完成过渡');
assert.deepEqual(await page.evaluate(()=>({col:player.col,row:player.row})),travelTarget.entry,'快速移动复用正常走门的落点');
await page.setViewportSize({width:760,height:1000});await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'窄屏不横向溢出');await page.setViewportSize({width:1280,height:1000});if(destination)await page.screenshot({path:path.join(destination,'world-ui-browser.png'),fullPage:true});await page.evaluate(()=>{
 currentRoomGrid=parseGrid(BUILTIN_TEMPLATES().open.tiles);currentFloor.rooms.find(r=>r.id===currentRoomId).grid=currentRoomGrid;tileData={};monsters=[];bombs=[];bullets=[];resourcesOnGround=[];itemsOnGround=[];pendingBossLanding=null;transition=null;floorFadeBusy=false;
 for(const [id,c,r]of [['crack_maw_ii',1,1],['flying_eye_iii',3,1],['charge_golem_ii',5,1],['boss_jumper_ii',7,1],['duke_fly',10,1],['duke_floater',3,3],['crack_maw_i',1,3],['flying_eye_i',10,4]]){spawnMonsterAtRandomPos(id);const m=monsters.at(-1),p=gridToPixel(c,r);m.col=c;m.row=r;m.px=p.x;m.py=p.y;m._killLoot=[];}
 player.col=6;player.row=5;Object.assign(player,{px:gridToPixel(6,5).x,py:gridToPixel(6,5).y,targetPx:null,targetPy:null});player.invincibleSteps=0;inCombat=true;resetTurnAP();currentRoomGrid[5][3]=TILE.SPIKE;
 for(const [id,c]of [['coin_gold',1],['coin_silver',2],['heart_full',3],['bomb_single',4],['key_single',5]])if(RESOURCE_DB[id])spawnResourceOnGrid(c,5,id);
 // 配置命名独立于显示：补充确实存在的心、炸弹和钥匙条目。
 for(const [type,c]of [['heart',3],['bomb',4],['key',5]]){const cfg=Object.values(RESOURCE_DB).find(x=>x.type===type);if(cfg&&!resourcesOnGround.some(r=>r.cfgId===cfg.id))spawnResourceOnGrid(c,5,cfg.id);}
 const item=Object.keys(ITEMS_DB)[0];if(item)spawnItemOnGrid(9,5,item);document.getElementById('floor-banner').classList.remove('show');render();
 });await page.waitForTimeout(100);if(destination)await page.screenshot({path:path.join(destination,'world-art-browser.png'),fullPage:true});
 const beforeMap=await page.evaluate(()=>({mp:turnState.mAP,ap:turnState.aAP,hp:playerStats.hp,phase:turnState.phase}));await page.keyboard.press('m');await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>({mp:turnState.mAP,ap:turnState.aAP,hp:playerStats.hp,phase:turnState.phase})),beforeMap,'地图弹窗不消耗行动或推进回合');await page.keyboard.press('m');
 assert.deepEqual(errors,[],'浏览器脚本无错误');console.log('PASS: 默认右侧小地图、相邻可见性、HUD安全边距、窄屏无横向溢出、M/Esc弹窗与输入隔离');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
