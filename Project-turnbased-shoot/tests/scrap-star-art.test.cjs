// 正式版真实图片解码/Canvas检查；DOM为模拟，不替代浏览器试玩。
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const native=require('../tools/runtime-deps.cjs').runtimeDependency('@napi-rs/canvas');
function createImageSurface(){const canvas=native.createCanvas(1,1),original=canvas.getContext.bind(canvas);canvas.getContext=(...args)=>{const paint=original(...args);return new Proxy(paint,{get(t,k){if(k==='drawImage')return(im,...rest)=>t.drawImage(im.native||im,...rest);const v=t[k];return typeof v==='function'?v.bind(t):v},set(t,k,v){t[k]=v;return true}})};return canvas;}
const artHtml=fs.readFileSync(process.env.COMBAT_TEST_HTML||require('path').join(__dirname,'../dist/turnbased-shoot-demo-pack.html'),'utf8');
const surface=native.createCanvas(954,artHtml.includes('const COMBAT_PLAYTEST_PROFILE=')?690:558),real=surface.getContext('2d'),pending=[],renderedImages=new Set();let time=1000;
let harness=fs.readFileSync(__dirname+'/danger-forecast.test.js','utf8').split('(async()=>{await sandbox.bootPromise;')[0];
harness=harness.replace("const fs=require('fs'),vm=require('vm'),assert=require('assert');",'').replace('const ctx=new Proxy(','const mockCtx=new Proxy(');
harness=harness.replace('class Img{set src(v){this._src=v;if(this.onload)this.onload()}get src(){return this._src}}',`class Img{set src(v){this._src=v;pending.push(native.loadImage(v.startsWith('data:')?v:path.join(project,v)).then(im=>{this.native=im;this.complete=true;this.naturalWidth=im.width;this.naturalHeight=im.height;if(this.onload)this.onload()}))}get src(){return this._src}}`);
harness=harness.replace('now:()=>1000','now:()=>time');
harness=harness.replace("createElement:()=>el('created'+Math.random())","createElement:(tag)=>tag==='canvas'?createImageSurface():el('created'+Math.random())");
const ctx=new Proxy(real,{get(t,k){if(k==='drawImage')return(im,...args)=>{if(!im.native&&typeof im.getContext!=='function')throw Error('图片未解码');if(im.src)renderedImages.add(im.src);return t.drawImage(im.native||im,...args)};const v=t[k];return typeof v==='function'?v.bind(t):v},set(t,k,v){t[k]=v;return true}});
eval(harness.replace('vm.createContext(sandbox);vm.runInContext(code,sandbox);','vm.createContext(sandbox);vm.runInContext(code,sandbox);globalThis.artSandbox=sandbox;'));
async function run(){await artSandbox.bootPromise;await Promise.all(pending);artSandbox.renderedImages=renderedImages;const check=s=>vm.runInContext(s,artSandbox);
 check(`
 function demand(v,msg){if(!v)throw Error(msg)}
 startGameFromMenu();currentRoomGrid=parseGrid(BUILTIN_TEMPLATES().open.tiles);monsters=[];bombs=[];resourcesOnGround=[];itemsOnGround=[];tileData={};pendingBossLanding=null;inCombat=true;
 // 所有怪物都使用新的正式美术，静态Boss仍保留原逻辑表现位置。
 for(const id of Object.keys(MONSTER_DB).filter(k=>!k.startsWith('_'))){monsters=[];demand(spawnMonsterAtRandomPos(id),'生成失败 '+id);renderedImages.clear();drawMonsters();if(!scrapCoveredMonster(monsters[0]))demand(renderedImages.has(SCRAP_ASSETS[staticWorldMonsterKey(monsters[0])]),'静态怪物未使用新素材 '+id)}
 monsters=[];for(const [id,c,r]of [['crack_maw_i',8,3],['flying_eye_i',10,4],['crack_maw_ii',9,1]]){spawnMonsterAtRandomPos(id);const m=monsters.at(-1);m.col=c;m.row=r;const p=gridToPixel(c,r);m.px=p.x;m.py=p.y}
 currentRoomGrid[4][3]=TILE.POOP;tileData['4,3']={type:'poop',hp:4,_loot:[]};currentRoomGrid[5][1]=TILE.ROCK;tileData['5,1']={type:'rock',hp:99,_loot:[]};currentRoomGrid[3][1]=TILE.SPIKE;currentRoomGrid[3][5]=TILE.LADDER;currentRoomGrid[9][5]=TILE.PIT;
 const room=currentFloor.rooms.find(r=>r.id===currentRoomId),oldDoors=room.doors;room.doors={up:{open:true,targetRoomId:-1},left:{open:false,targetRoomId:-1},down:null,right:null};
 let calls=[];const originalDraw=scrapDraw;scrapDraw=(...a)=>{calls.push(a);originalDraw(...a)};drawDoors();demand(calls.some(a=>a[0]==='upOpen')&&calls.some(a=>a[0]==='leftClosed')&&calls.length===2,'不存在的门不应被绘制');const top=calls.find(a=>a[0]==='upOpen');demand(Math.abs(top[3]/top[4]-scrapImages.upOpen.naturalWidth/scrapImages.upOpen.naturalHeight)<.001,'上下门比例');scrapDraw=originalDraw;room.doors=oldDoors;
 player.col=2;player.row=3;const pp=gridToPixel(2,3);player.px=pp.x;player.py=pp.y;player.targetPx=null;resetTurnAP();dangerForecast=null;dangerReveal=null;drawMinimap=()=>{};render();
 `);
 if(process.argv[2])fs.writeFileSync(process.argv[2],surface.toBuffer('image/png'));
 check(`
 for(let i=0;i<4;i++)hitTile(4,3,1);demand(currentRoomGrid[4][3]===TILE.FLOOR,'四次攻击未破箱');
 hitTile(5,1,99);demand(currentRoomGrid[5][1]===TILE.FLOOR,'原有障碍伤害行为被改变');
 playerResources.blueHearts=1.5;scrapUpdateHUD();demand(document.getElementById('scrap-hearts').innerHTML.includes('蓝心'),'蓝心显示丢失');
 spawnMonsterBullet('left',200,100,4,monsters[1].id);demand(bullets.at(-1).scrapCovered,'远程机器人子弹没有分离');
 spawnMonsterBullet('left',200,100,4,monsters[2].id);demand(!bullets.at(-1).scrapCovered,'未覆盖怪物子弹被替换');
 spawnBullet('right',player.px,player.py);const b=bullets.at(-1);b.phase='decaying';b.distTraveled=b.maxDist-10;b.vOff=CELL*.6;b.speed=1;updateBullets(1/120);demand(b.scrapEndEffect==='expire','玩家射程消失效果');render();
 `);
 check(`
 bullets=[];particles=[];scrapEffects.clearTransient();inCombat=true;turnState.phase='player_select';resetTurnAP();
 const selected=monsters.find(m=>m.cfgId==='crack_maw_i');damageMonster(selected,999);syncActionHistory();
 demand(provisionalDefeats.length===1&&!scrapTransient.some(e=>e.kind==='death'),'击杀应保留失能状态而非提前破碎');
 const fallen=provisionalDefeats[0];const injured=monsters.find(m=>m.cfgId==='flying_eye_i');damageMonster(injured,injured.hp*.4);syncActionHistory();renderedImages.clear();drawMonsters();demand(renderedImages.has(SCRAP_ASSETS.melee5),'失能机器人必须显示实际受击素材');
 processHistoryKey({code:'KeyD',preventDefault(){}});processHistoryKey({code:'KeyD',preventDefault(){}});processHistoryKey({code:'ArrowUp',preventDefault(){}});syncActionHistory();const hero=gridToPixel(player.col,player.row);player.px=hero.x;player.py=hero.y;render();
 demand(historyMaximumRange().size>turnState.reachableTiles.size,'双层移动范围应有差异');
 `);
 if(process.argv[2])fs.writeFileSync(process.argv[2],surface.toBuffer('image/png'));
 console.log('PASS: 双层范围、行动标记和失能机器人真实素材渲染；确认前无破碎动画');
 console.log('PASS: 正式版全部素材解码；14种怪物渲染；未覆盖怪物/特殊地形保留；实际门连接/比例、四次破箱、原障碍伤害、蓝心和独立子弹检查');
}
run().catch(e=>{console.error(e);process.exitCode=1});
