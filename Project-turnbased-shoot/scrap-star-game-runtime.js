// 正式版适配：保留门连接、锁、蓝心、道具栏、工具、小地图及未覆盖内容。
drawDoors=function(){
 if(!currentRoomGrid||transition)return;const room=currentFloor?.rooms.find(r=>r.id===currentRoomId);if(!room)return;
 for(const dir of ['up','down','left','right']){const door=room.doors[dir];if(!door)continue;const p=DOOR_POS[dir],q=cellRect(p.col,p.row),key=dir+(door.open?'Open':'Closed'),im=scrapImages[key];if(!im.complete)continue;
  if(dir==='up'||dir==='down'){const w=CELL*1.32,h=w*im.naturalHeight/im.naturalWidth;scrapDraw(key,q.cx-w/2,dir==='up'?0:GAME_H-h,w,h)}
  else scrapDraw(key,dir==='left'?0:FLOOR_R-5,q.cy-CELL*.66,WALL+5,CELL*1.32);
  const target=currentFloor.rooms.find(r=>r.id===door.targetRoomId);if(target?.locked){ctx.save();ctx.font='7px sans-serif';ctx.textAlign='center';ctx.fillText('🔒',q.cx,q.cy);ctx.restore()}
 }
};
function scrapSetupGameHUD(){
 const column=document.getElementById('main-column'),footer=document.getElementById('scrap-footer'),items=footer.querySelector('.scrap-items');if(items)items.appendChild(document.getElementById('item-bar'));
 const tools=document.createElement('div');tools.id='scrap-tools';tools.appendChild(document.getElementById('top-right'));column.appendChild(tools);
}
const scrapBaseHUD=scrapUpdateHUD;
scrapUpdateHUD=function(){scrapBaseHUD();const blue=Math.min(playerResources.blueHearts||0,12-Math.ceil(playerStats.maxHp));if(blue>0){const row=document.getElementById('scrap-hearts');let content=Array.from({length:Math.ceil(playerStats.maxHp)},(_,i)=>scrapIcon(playerStats.hp>=i+1?'heart':playerStats.hp>i?'halfHeart':'emptyHeart',22)).join('');for(let i=0;i<Math.ceil(blue);i++){const im=RES_IMAGES[blue-i>=1?'ui_blue_heart':'ui_half_blue_heart'];if(im)content+='<img src="'+im.src+'" width="22" height="22" alt="蓝心">'}row.innerHTML=content}};
let scrapLastRoom=null,scrapLastFloor=null;
const scrapBaseDrawTiles=drawTiles;
drawTiles=function(){if(scrapLastRoom!==currentRoomId||scrapLastFloor!==currentFloor){scrapTransient.length=0;scrapMonsterActions.clear();scrapLastRoom=currentRoomId;scrapLastFloor=currentFloor}scrapBaseDrawTiles()};
