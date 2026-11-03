// 使用真实 Canvas 解码所有内嵌图片并渲染；DOM 保持模拟，非浏览器验收。
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const native=require('C:/Users/Fishy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const canvas=native.createCanvas(954,558),real=canvas.getContext('2d'),pending=[];let time=1000;
let harness=fs.readFileSync(__dirname+'/test-ordered.cjs','utf8').split('setImmediate(()=>')[0];
harness=harness.replace("const fs=require('fs'),vm=require('vm'),assert=require('assert');",'');
harness=harness.replace('const ctx=new Proxy(', 'const mockCtx=new Proxy(');
harness=harness.replace('class Img{set src(v){this._src=v;if(this.onload)this.onload()}get src(){return this._src}}',`class Img{set src(v){this._src=v;pending.push(native.loadImage(v).then(im=>{this.native=im;this.complete=true;this.naturalWidth=im.width;this.naturalHeight=im.height;if(this.onload)this.onload()}))}get src(){return this._src}}`);
harness=harness.replace('now:()=>1000','now:()=>time');
const ctx=new Proxy(real,{get(t,k){if(k==='drawImage')return(im,...args)=>{if(!im.native)throw Error('图片未解码');return t.drawImage(im.native,...args)};const v=t[k];return typeof v==='function'?v.bind(t):v},set(t,k,v){t[k]=v;return true}});
eval(harness.replace('vm.createContext(sandbox);vm.runInContext(code,sandbox);','vm.createContext(sandbox);vm.runInContext(code,sandbox);globalThis.scrapSandbox=sandbox;'));
async function run(){await new Promise(r=>setImmediate(r));await Promise.all(pending);const check=s=>vm.runInContext(s,scrapSandbox);
 check(`startPlaytest(SCRAP_DEMO_SCENE);drawMinimap=()=>{};drawDebugOverlay=()=>{};updateDangerForecast();render();`);
 check(`
 const uiCheck=(v,msg)=>{if(!v)throw Error(msg)};
 const oldMax=turnState.maxMAP,oldValue=turnState.mAP;
 turnState.maxMAP=3;turnState.mAP=1;scrapUpdateHUD();uiCheck((document.getElementById('scrap-mp').innerHTML.match(/<img /g)||[]).length===3,'MP不应显示预留空位');
 turnState.maxMAP=6;turnState.mAP=6;scrapUpdateHUD();uiCheck((document.getElementById('scrap-mp').innerHTML.match(/<img /g)||[]).length===6,'MP应随上限增加');
 turnState.maxMAP=oldMax;turnState.mAP=oldValue;scrapUpdateHUD();
 const actualDraw=scrapDraw;let recorded=[];scrapDraw=(...args)=>{recorded.push(args);actualDraw(...args)};
 const q=cellRect(4,2);drawGridOverlay(4,2,'#ff4444',.2,.3);uiCheck(recorded.some(a=>a[0]==='redGrid'&&a[1]===q.xL&&a[2]===q.yT&&a[3]===q.w&&a[4]===q.h),'红格未对齐地格');
 const oldForecast=dangerForecast;dangerForecast={monsterId:monsters[0].id};recorded=[];drawMonsters();const alert=recorded.find(a=>a[0]==='alert'),mp=project(monsters[0].px,monsters[0].py);uiCheck(alert&&alert[1]>mp.x&&alert[2]<mp.y&&alert[1]+alert[3]<mp.x+CELL/2&&alert[2]>mp.y-CELL/2,'感叹号应位于怪物格内右上方');dangerForecast=oldForecast;scrapDraw=actualDraw;
 `);
 console.log('PASS: MP按实际上限显示并可增长；红格贴齐地格；感叹号位于怪物格内右上方');
 const qa=process.argv[2];if(qa)fs.writeFileSync(qa,canvas.toBuffer('image/png'));
 check(`assertCrate=(condition,msg)=>{if(!condition)throw Error(msg)};assertCrate(COLS===13&&ROWS===7,'房间规格');assertCrate(scrapCrateFrame(4)===0&&scrapCrateFrame(3)===1&&scrapCrateFrame(2)===1&&scrapCrateFrame(1)===2,'箱子阶段');for(let i=0;i<3;i++)hitTile(4,3,1);assertCrate(tileData['4,3'].hp===1,'三次攻击');hitTile(4,3,1);assertCrate(currentRoomGrid[4][3]===TILE.FLOOR&&scrapTransient.some(e=>e.kind==='crate'),'第四次破裂');`);
 for(const dt of [0,120,240,360]){time=1000+dt;check('render()')}
 check(`
 startPlaytest(0);monsters=[];spawnBullet('right',player.px,player.py);const flight=bullets[0];
 for(let n=0;n<300&&flight.phase!=='dying';n++)updateBullets(1/120);
 uiCheck(flight.phase==='dying'&&flight.scrapEndEffect==='expire','完整飞行后应播放射程结束特效');
 const drawBefore=scrapDraw;let effectCalls=[];scrapDraw=(...args)=>{effectCalls.push(args);drawBefore(...args)};drawBullets();uiCheck(effectCalls.some(a=>a[0].startsWith('expire')),'射程结束未绘制消失帧');
 bullets=[];spawnBullet('right',player.px,player.py);const decay=bullets[0];decay.phase='decaying';decay.distTraveled=decay.maxDist-10;decay.vOff=CELL*.6;decay.speed=1;updateBullets(1/120);uiCheck(decay.scrapEndEffect==='expire'&&decay.distTraveled<decay.maxDist,'下落先结束时误播命中特效');
 bullets=[];spawnBullet('right',player.px,player.py);shatterBullet(bullets[0]);effectCalls=[];drawBullets();uiCheck(effectCalls.some(a=>a[0].startsWith('impact')&&a[3]===20&&a[4]===30),'玩家命中特效未放大2倍');scrapDraw=drawBefore;
 `);
 console.log('PASS: 子弹完整飞行及衰减提前结束均播放消失特效；玩家命中特效宽高放大2倍');
 check(`startPlaytest(SCRAP_DEMO_SCENE);spawnBullet('right',player.px,player.py);spawnMonsterBullet('left',200,90,4,monsters[1].id);render();shatterBullet(bullets[0]);render();bullets[0].distTraveled=bullets[0].maxDist;render();for(const dir of ['up','down','left','right']){player.facing=dir;player.hitFlash=.1;render();player.hitFlash=0;player.shootTimer=.2;render();player.shootTimer=0;player.targetPx=100;render();player.targetPx=null}damageMonster(monsters[0],100);render();`);
 console.log('PASS: 全部内嵌图片真实解码；13×7房间、四次攻击破箱、机器人独立子弹、四向动作、命中/射程结束及死亡实际Canvas渲染');
}
run().catch(e=>{console.error(e);process.exitCode=1});
