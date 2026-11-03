// 已审核 Scrap Star 素材接入层：绘制与短暂特效独立于战斗预测。
const scrapImages={};
for(const [key,src]of Object.entries(SCRAP_ASSETS)){const im=new Image();im.src=src;scrapImages[key]=im;}
const scrapTransient=[];const scrapMonsterActions=new Map();
function scrapDraw(key,x,y,w,h,alpha=1){const im=scrapImages[key];if(!im||!im.complete)return;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,x,y,w,h);ctx.restore();}
function scrapSprite(key,px,py,alpha=1){const p=project(px,py);scrapDraw(key,p.x-19.8,p.y-24,39.6,41.8,alpha);}
// 提高实际画布分辨率，不改变逻辑坐标、格子或输入换算。
canvas.width=GAME_W*3;canvas.height=GAME_H*3;ctx.setTransform(3,0,0,3,0,0);ctx.imageSmoothingEnabled=true;
drawWalls=function(){
 for(let x=0;x<GAME_W;x+=44){scrapDraw('wallH',x,0,44,WALL);scrapDraw('wallH',x,FLOOR_B,44,WALL)}
 for(let y=WALL;y<FLOOR_B;y+=44){scrapDraw('wallV',0,y,WALL,44);scrapDraw('wallV',FLOOR_R,y,WALL,44)}
 for(const [n,x,y]of [['TL',0,0],['TR',FLOOR_R,0],['BL',0,FLOOR_B],['BR',FLOOR_R,FLOOR_B]])scrapDraw('corner'+n,x,y,WALL,WALL);
};
drawFloor=function(){for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){const q=cellRect(c,r);scrapDraw('floor',q.xL,q.yT,q.w,q.h)}};
function scrapCrateFrame(hp){return hp>=4?0:hp>=2?1:2;}
function scrapCrate(c,r,f){const q=cellRect(c,r),im=scrapImages['crate'+f];if(!im||!im.complete)return;
 // 统一等比缩放，以格子底边对齐；破裂碎片也留在本格内。
 const scale=Math.min(q.w*.94/im.naturalWidth,q.h*.94/300),w=im.naturalWidth*scale,h=300*scale;ctx.drawImage(im,0,200,im.naturalWidth,300,q.cx-w/2,q.yB-h,w,h);
}
drawTiles=function(){if(!currentRoomGrid)return;for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){
 const tile=currentRoomGrid[c][r],q=cellRect(c,r);
 if(tile===TILE.ROCK)scrapDraw('facility',q.xL,q.yT,q.w,q.h);
 if(tile===TILE.POOP)scrapCrate(c,r,scrapCrateFrame(tileData[c+','+r]?.hp??4));
}for(const e of scrapTransient)if(e.kind==='crate'){const f=Math.floor((performance.now()-e.start)/120);if(f<3)scrapCrate(e.col,e.row,3+f)}};
drawDoors=function(){for(const dir of ['up','down','left','right']){const p=DOOR_POS[dir],q=cellRect(p.col,p.row),key=dir+(inCombat?'Closed':'Open');
 if(dir==='up'||dir==='down'){const im=scrapImages[key];if(!im.complete)continue;const w=CELL*1.32,h=w*im.naturalHeight/im.naturalWidth;scrapDraw(key,q.cx-w/2,dir==='up'?0:GAME_H-h,w,h)}
 if(dir==='left')scrapDraw(key,0,q.cy-CELL*.66,WALL+5,CELL*1.32);
 if(dir==='right')scrapDraw(key,FLOOR_R-5,q.cy-CELL*.66,WALL+5,CELL*1.32);
}};
let scrapMoveKey='',scrapMoveStarted=0;
drawCharacterAt=function(px,py,facing,walkFrame,shootTimer,alpha=1){let action='idle';
 const moveKey=player.targetPx===null?'':player.targetPx+','+player.targetPy;if(moveKey!==scrapMoveKey){scrapMoveKey=moveKey;scrapMoveStarted=performance.now()}
 if(player.hitFlash>0)action='hit';else if(shootTimer>0)action='shoot';else if(player.targetPx!==null)action='move'+(1+Math.min(2,Math.floor((performance.now()-scrapMoveStarted)/50)));
 if(action==='idle'&&Math.floor(performance.now()/1000)%2){const p=project(px,py);scrapDraw('hero-'+facing+'-'+action,p.x-19.8,p.y-23.34,39.6,40.964,alpha)}else scrapSprite('hero-'+facing+'-'+action,px,py,alpha);
};
let scrapDefeatStarted=null;
drawPlayer=function(){if(playerStats.hp<=0){if(scrapDefeatStarted===null)scrapDefeatStarted=performance.now();scrapSprite('defeat'+Math.min(5,Math.floor((performance.now()-scrapDefeatStarted)/100)),player.px,player.py);return}scrapDefeatStarted=null;const alpha=player.invincibleSteps>0?.45+.35*Math.sin(performance.now()*.015):1;drawCharacterAt(player.px,player.py,player.facing,player.walkFrame,player.shootTimer,alpha)};
drawGhost=function(){};
drawMonsters=function(){const now=performance.now();for(const m of monsters){const type=m.cfgId==='flying_eye_i'?'ranged':'melee';let f=Math.floor(now/180)%3;const action=scrapMonsterActions.get(m.id);
 if(action&&now-action<240)f=3+Math.min(1,Math.floor((now-action)/120));if(m.hitFlash>0)f=5;
 const p=project(m.px,m.py);scrapDraw(type+f,p.x-30,p.y-38,60,68);
 ctx.save();ctx.fillStyle='#0a151a';ctx.fillRect(p.x-8,p.y+10,16,1.5);ctx.fillStyle='#f18d59';ctx.fillRect(p.x-8,p.y+10,16*Math.max(0,m.hp/m.maxHp),1.5);ctx.restore();
 if((dangerReveal||dangerForecast)?.monsterId===m.id)scrapDraw('alert',p.x+3.2,p.y-10.4,5.6,8.8);
}for(const e of scrapTransient)if(e.kind==='death'){const t=now-e.start;if(t<360){const p=project(e.x,e.y);scrapDraw(e.type+(t<180?6:7),p.x-30,p.y-38,60,68)}}};
drawBullets=function(){const now=performance.now();for(const b of bullets){const p=project(b.x,b.y+b.vOff);
 if(b.phase==='dying'){const elapsed=CFG.SHATTER_DURATION-(b.shatterTimer||0),f=Math.min(3,Math.floor(elapsed/CFG.SHATTER_DURATION*4)),expired=(b.scrapEndEffect|| (b.distTraveled>=b.maxDist?'expire':'impact'))==='expire',scale=b.source==='player'?2:1;scrapDraw((expired?'expire'+Math.min(1,Math.floor(f/2)):'impact'+f),p.x-5*scale,p.y-7.5*scale,10*scale,15*scale);continue}
 if(b.source==='monster'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(b.dirY,b.dirX));scrapDraw('remote',-4.4,-5,8.8,10);ctx.restore()}
 else{const dir=Math.abs(b.dirX)>Math.abs(b.dirY)?(b.dirX<0?'left':'right'):(b.dirY<0?'up':'down');scrapDraw('bullet-'+dir+(Math.floor(now/70)%3),p.x-12,p.y-10.6,24,21.2)}
}};
drawGridOverlay=function(c,r,color,inside,border){const q=cellRect(c,r);scrapDraw(color==='#ff4444'?'redGrid':'blueGrid',q.xL,q.yT,q.w,q.h,Math.min(.8,.38+border))};
drawReachableOverlay=function(){if(turnState.phase!=='player_select')return;for(const key of turnState.reachableTiles){const [c,r]=key.split(',').map(Number);if(c===player.col&&r===player.row)continue;const q=cellRect(c,r);scrapDraw('blueGrid',q.xL,q.yT,q.w,q.h,.28)}};
drawBattleStartSwords=function(){};
drawDamageNumbers=function(){ctx.save();ctx.font='bold 5px Microsoft YaHei';ctx.textAlign='center';for(const d of damageNumbers){const p=project(d.x,d.y);ctx.globalAlpha=Math.max(0,d.life/d.maxLife);ctx.fillStyle='#ffdf96';ctx.strokeStyle='#10212a';ctx.lineWidth=.7;ctx.strokeText(d.text,p.x,p.y);ctx.fillText(d.text,p.x,p.y)}ctx.restore()};
drawParticles=function(){}; // 攻击、破裂均使用审核的独立特效序列。
const scrapOriginalShatter=shatterBullet;
shatterBullet=function(b,reason){b.scrapEndEffect=reason||(b.distTraveled>=b.maxDist?'expire':'impact');return scrapOriginalShatter(b)};
const scrapOriginalHitTile=hitTile;
hitTile=function(c,r,dmg){const td=tileData[c+','+r];const crate=td?.type==='poop',old=td?.hp;const result=scrapOriginalHitTile(c,r,crate?1:dmg);if(crate&&old>0&&!tileData[c+','+r])scrapTransient.push({kind:'crate',col:c,row:r,start:performance.now()});return result};
const scrapOriginalDamageMonster=damageMonster;
damageMonster=function(m,dmg){const x=m.px,y=m.py,type=m.cfgId==='flying_eye_i'?'ranged':'melee';scrapOriginalDamageMonster(m,dmg);if(m.hp<=0)scrapTransient.push({kind:'death',x,y,type,start:performance.now()});};
const scrapOriginalMonsterBullet=spawnMonsterBullet;
spawnMonsterBullet=function(dir,x,y,range,owner){scrapMonsterActions.set(owner,performance.now());return scrapOriginalMonsterBullet(dir,x,y,range,owner)};
const scrapOriginalResolve=resolveAfterEffects;
resolveAfterEffects=function(action,options){if(action?.type==='chase'&&options?.monster)scrapMonsterActions.set(options.monster.id,performance.now());return scrapOriginalResolve(action,options)};
const scrapOriginalStart=startPlaytest;
startPlaytest=function(i){scrapTransient.length=0;scrapMonsterActions.clear();scrapOriginalStart(i);for(const [c,r]of PT_SCENES[playtestScene].crates||[]){currentRoomGrid[c][r]=TILE.POOP;tileData[c+','+r]={type:'poop',hp:4,_loot:[]}}if(PT_SCENES[playtestScene].crates){saveCheckpoint();turnState.reachableTiles=calcReachableTiles(player.col,player.row,turnState.mAP)}scrapUpdateHUD()};
drawRewindEffect=function(){if(!rewindAnim.active)return;scrapTransient.length=0;const t=Math.min(.999,rewindAnim.timer/rewindAnim.duration),p=project(player.px,player.py);scrapDraw('rewind'+Math.floor(t*6),p.x-25,p.y-25,50,50,1-t*.5)};
function scrapIcon(key,w=28,h=w){return '<img src="'+SCRAP_ASSETS[key]+'" width="'+w+'" height="'+h+'" alt="">'}
function scrapSetupHUD(){
 const column=document.getElementById('main-column');const hud=document.createElement('div');hud.id='scrap-hud';
 hud.innerHTML='<div id="scrap-hearts" class="scrap-panel"></div><div class="scrap-panel scrap-stats"><div class="scrap-stat">'+scrapIcon('attack')+'<span id="scrap-atk"></span></div><div class="scrap-stat">'+scrapIcon('range')+'<span id="scrap-range"></span></div></div><div class="scrap-panel scrap-point-panel"><div class="scrap-points" id="scrap-mp"></div><div class="scrap-points" id="scrap-ap"></div></div><div class="scrap-panel scrap-state"><div>回合 <span id="scrap-turn"></span></div><span id="scrap-phase" class="scrap-phase"></span></div><div class="scrap-panel scrap-floor">楼层 B1</div><div class="scrap-res" id="scrap-res"></div>';
 column.insertBefore(hud,column.firstChild);const footer=document.createElement('div');footer.id='scrap-footer';
 footer.innerHTML='<div class="scrap-panel scrap-items" title="拾取道具显示预留"></div><button id="scrap-help" title="操作说明">操作说明</button><button id="scrap-end">结束回合 · 空格</button>';column.appendChild(footer);
 column.style.setProperty('--scrap-panel','url("'+SCRAP_ASSETS.panel+'")');
 document.getElementById('scrap-end').style.backgroundImage='url("'+SCRAP_ASSETS.button+'")';document.getElementById('scrap-help').style.backgroundImage='url("'+SCRAP_ASSETS.help+'")';
 document.getElementById('scrap-end').onclick=()=>ptKey('Space',' ');document.getElementById('scrap-help').onclick=()=>document.getElementById('help-modal').classList.add('open');
}
let scrapHudKey='';
function scrapUpdateHUD(){const el=id=>document.getElementById(id);if(!el('scrap-hearts'))return;
 const key=JSON.stringify([playerStats,turnState.mAP,turnState.aAP,turnState.maxMAP,turnState.maxAAP,turnState.phase,turnState.turnNumber,playerResources]);if(key===scrapHudKey)return;scrapHudKey=key;
 el('scrap-hearts').innerHTML=Array.from({length:Math.min(12,Math.ceil(playerStats.maxHp))},(_,i)=>scrapIcon(playerStats.hp>=i+1?'heart':playerStats.hp>i?'halfHeart':'emptyHeart',22)).join('');
 el('scrap-atk').textContent=playerStats.attack;el('scrap-range').textContent=playerStats.range;
 for(const [id,name,value,max]of [['scrap-mp','MP',turnState.mAP,turnState.maxMAP],['scrap-ap','AP',turnState.aAP,turnState.maxAAP]])el(id).innerHTML='<span>'+name+'</span>'+Array.from({length:Math.max(0,max)},(_,i)=>scrapIcon(i<value?(name==='MP'?'mp':'ap'):(name==='MP'?'mpEmpty':'apEmpty'),17,20)).join('');
 el('scrap-turn').textContent=turnState.turnNumber;el('scrap-phase').textContent=turnState.phase==='monster_turn'?'机器人行动':'你的回合';el('scrap-phase').style.color=turnState.phase==='monster_turn'?'#ff7e72':'#65def6';
 el('scrap-res').innerHTML=[['coin',playerResources.coins??0],['bomb',playerResources.bombs??0],['key',playerResources.keys??0]].map(([k,n])=>'<span class="scrap-panel">'+scrapIcon(k,22,25)+' '+String(n).padStart(2,'0')+'</span>').join('');
}
const scrapOriginalRender=render;
render=function(){scrapOriginalRender();scrapUpdateHUD();for(let i=scrapTransient.length-1;i>=0;i--)if(performance.now()-scrapTransient[i].start>500)scrapTransient.splice(i,1)};
const SCRAP_DEMO_SCENE=PT_SCENES.length;
PT_SCENES.push({name:'Scrap Star · 设施与箱子',player:[2,3],walls:[[5,1],[5,5],[9,2]],crates:[[4,3],[7,4]],enemies:[['crack_maw_i',8,3],['flying_eye_i',10,4]]});
PT_SCENES.push({name:'自定义机器人组合',walls:[],enemies:[['crack_maw_i',8,2],['flying_eye_i',10,4]]});
const scrapOriginalSetup=setupPlaytestPanel;
setupPlaytestPanel=function(){scrapOriginalSetup();scrapSetupHUD();const panel=document.getElementById('playtest-panel');const detail=panel.querySelector('details');if(detail)detail.open=false;};
