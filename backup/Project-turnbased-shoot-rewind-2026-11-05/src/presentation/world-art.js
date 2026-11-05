// 新静态美术只负责绘制；怪物行动、碰撞、快照和掉落仍使用正式规则。
function staticWorldMonsterKey(m){
 if(m.cfgId.startsWith('crack_maw_'))return 'melee0';
 if(m.cfgId.startsWith('flying_eye_'))return 'ranged0';
 if(m.cfgId.startsWith('charge_golem_'))return 'static-golem';
 if(m.cfgId.startsWith('boss_jumper_'))return 'static-jumper';
 if(m.cfgId==='duke_fly')return 'static-duke';
 if(m.cfgId==='duke_floater')return 'static-floater';
 return null;
}
function drawStaticWorldMonster(m,x,y,size,scale=1){
 const key=staticWorldMonsterKey(m);if(!key)return;
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 if(key==='melee0'||key==='ranged0')scrapDraw(key,-30,-38,60,68);
 else{const w=size*((m.size||1)>1?1.15:1.45);scrapDraw(key,-w/2,-w*.58,w,w);}
 const tier=m.cfgId.endsWith('_iii')?3:m.cfgId.endsWith('_ii')?2:0;
 ctx.fillStyle=tier===3?'#f49067':'#74e1e7';for(let i=0;i<tier;i++)ctx.fillRect(-tier*2+i*4,size*.48,2.5,1.8);
 ctx.restore();
}
const worldBaseTiles=drawTiles;
drawTiles=function(){worldBaseTiles();if(!currentRoomGrid)return;for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++)if(currentRoomGrid[c][r]===TILE.SPIKE){const q=cellRect(c,r);scrapDraw('static-spikes',q.xL,q.yT-2,q.w,q.h+2);}};
function resourceWorldArt(res){
 const cfg=RESOURCE_DB[res.cfgId];if(!cfg)return null;
 if(cfg.type==='coin')return res.cfgId.includes('silver')?'coin-silver':res.cfgId.includes('black')?'coin-black':'coin';
 if(cfg.type==='heart')return cfg.heal<1?'halfHeart':'heart';
 if(cfg.type==='blue_heart')return cfg.amount<1?'halfBlueHeart':'blueHeart';
 if(cfg.type==='bomb')return 'bomb';if(cfg.type==='key')return 'key';return null;
}
function drawPickupBeacon(x,y,quality='common',seed=0){
 const accent=quality==='legendary'?'#e6b65b':quality==='rare'?'#79c9ee':'#66c3c9';
 ctx.save();ctx.fillStyle='#142a31';ctx.fillRect(x-7,y+5,14,3);ctx.strokeStyle='#62767a';ctx.lineWidth=.65;ctx.strokeRect(x-7,y+5,14,3);
 ctx.strokeStyle=accent;ctx.lineWidth=.8;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*8,y+3);ctx.lineTo(x+side*8,y-4);ctx.lineTo(x+side*5,y-4);ctx.stroke();}
 // 短扫描光点，替代覆盖地面的单色呼吸光晕。
 const scan=(performance.now()*.002+seed*.7)%1;ctx.fillStyle=accent;ctx.globalAlpha=.5;ctx.fillRect(x-4+scan*7,y+6,2,1);
 ctx.restore();
}
drawResourcesOnGround=function(){
 for(const res of resourcesOnGround){const gp=gridToPixel(res.col,res.row),p=project(gp.x,gp.y+(res.liftY||0)),key=resourceWorldArt(res);
  if(key){drawPickupBeacon(p.x,p.y,'common',res.id||0);scrapDraw(key,p.x-6,p.y-8,12,14);}
  else if(RESOURCE_DB[res.cfgId]?.type==='chest'){scrapCrate(res.col,res.row,0);}
 }
};
drawBombs=function(){for(const bomb of bombs){if(bomb.roomId!==currentRoomId)continue;const p=gridToPixel(bomb.col,bomb.row),q=project(p.x,p.y);scrapDraw('bomb',q.x-6,q.y-8,12,14);ctx.save();ctx.font='bold 6px Microsoft YaHei UI';ctx.textAlign='center';ctx.fillStyle='#fff0b4';ctx.strokeStyle='#17242a';ctx.lineWidth=2;ctx.strokeText(String(bomb.timer),q.x,q.y+3);ctx.fillText(String(bomb.timer),q.x,q.y+3);ctx.restore();}};
function itemWorldArt(item){const cfg=ITEMS_DB[item.cfgId]||{},effects=cfg.effects||{};return effects.maxHp||effects.hp?'heart':effects.moveSpeed?'mp':effects.fireRate?'ap':effects.range?'range':'attack';}
drawItemsOnGround=function(){for(const it of itemsOnGround){const gp=gridToPixel(it.col,it.row),p=project(gp.x,gp.y+(it.liftY||0));drawPickupBeacon(p.x,p.y,it.quality,it.id||0);scrapDraw(itemWorldArt(it),p.x-6,p.y-9,12,13);
 if(it.col===player.col&&it.row===player.row){const slot=getShopSlotAt(it.col,it.row);if(slot&&playerResources.coins<slot.price){ctx.save();ctx.fillStyle='#ffb17b';ctx.font='6px Microsoft YaHei UI';ctx.textAlign='center';ctx.fillText('金币不足',p.x,p.y-12);ctx.restore();}}
}};
