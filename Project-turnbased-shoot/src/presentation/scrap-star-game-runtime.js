// 正式版适配：保留门连接、锁、蓝心、道具栏、工具、小地图及未覆盖内容。
drawDoors=function(){
 if(!currentRoomGrid)return;
 const room=currentFloor?.rooms.find(r=>r.id===currentRoomId);if(!room)return;
 for(const [dir,door] of Object.entries(room.doors)){
  if(!door)continue;
  const locked=currentFloor.rooms.find(r=>r.id===door.targetRoomId)?.locked;
  const p=DOOR_POS[dir],q=cellRect(p.col,p.row),key=dir+(door.open&&!locked?'Open':'Closed'),im=scrapImages[key];
  if(!im?.naturalWidth)continue;
  const vertical=dir==='up'||dir==='down';
  const w=vertical?CELL*1.32:WALL+5,h=vertical?w*im.naturalHeight/im.naturalWidth:CELL*1.32;
  const x=vertical?q.cx-w/2:dir==='left'?0:FLOOR_R-5;
  const y=vertical?(dir==='up'?0:GAME_H-h):q.cy-h/2;
  scrapDraw(key,x,y,w,h);
  if(locked){
   ctx.save();
   ctx.translate(x+w/2,y+h/2);
   ctx.fillStyle='#292421';
   ctx.strokeStyle='#bc8b48';
   ctx.lineWidth=1;
   const barW=vertical?w*.8:4,barH=vertical?4:h*.8;
   ctx.fillRect(-barW/2,-barH/2,barW,barH);
   ctx.strokeRect(-barW/2,-barH/2,barW,barH);
   ctx.strokeStyle='#f6c96a';
   ctx.beginPath();ctx.arc(0,-1.5,2.5,Math.PI,0);ctx.stroke();
   ctx.fillStyle='#f6c96a';ctx.fillRect(-4,-1,8,6);
   ctx.fillStyle='#292421';ctx.fillRect(-.7,1,1.4,2.5);
   ctx.restore();
  }
 }
};
function scrapSetupGameHUD(){
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(()=>{const layer=document.getElementById('text-overlay');layer.style.width=GAME_W*DISPLAY_SCALE+'px';layer.style.height=GAME_H*DISPLAY_SCALE+'px';layer.style.transform='scale('+(canvas.getBoundingClientRect().width/(GAME_W*DISPLAY_SCALE))+')';});observer.observe(canvas);}
 const column=document.getElementById('main-column'),footer=document.getElementById('scrap-footer'),items=footer.querySelector('.scrap-items');if(items)items.appendChild(document.getElementById('item-bar'));
 const tools=document.createElement('div');tools.id='scrap-tools';tools.appendChild(document.getElementById('top-right'));column.appendChild(tools);
}
let scrapLastRoom=null,scrapLastFloor=null;
const scrapBaseDrawTiles=drawTiles;
drawTiles=function(){if(scrapLastRoom!==currentRoomId||scrapLastFloor!==currentFloor){scrapEffects.reset();scrapLastRoom=currentRoomId;scrapLastFloor=currentFloor}scrapBaseDrawTiles()};
