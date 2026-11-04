// 地图仅在M弹窗中绘制；打开时暂停回合计时，不改变探索可见性。
let worldMapOpen=false;
function toggleWorldMap(open=!worldMapOpen){
 worldMapOpen=open;const modal=document.getElementById('world-map-modal');
 modal.classList.toggle('open',open);modal.setAttribute('aria-hidden',String(!open));
 if(open)drawMinimap();
}
function drawMinimap(){
 if(!worldMapOpen||!currentFloor?.layout)return;
 document.getElementById('world-map-title').textContent='楼层 B'+currentFloor.floorNum+' · 探索地图';
 const surface=document.getElementById('world-map'),paint=surface.getContext('2d'),W=surface.width,H=surface.height;
 paint.clearRect(0,0,W,H);paint.fillStyle='#0a1b22';paint.fillRect(0,0,W,H);
 paint.strokeStyle='#17313a';paint.lineWidth=1;
 for(let x=0;x<W;x+=30){paint.beginPath();paint.moveTo(x,0);paint.lineTo(x,H);paint.stroke();}
 for(let y=0;y<H;y+=30){paint.beginPath();paint.moveTo(0,y);paint.lineTo(W,y);paint.stroke();}
 const entries=Object.entries(currentFloor.layout);if(!entries.length)return;
 const xs=entries.map(([,p])=>p.gx),ys=entries.map(([,p])=>p.gy),minX=Math.min(...xs),minY=Math.min(...ys),spanX=Math.max(...xs)-minX+1,spanY=Math.max(...ys)-minY+1;
 const pitch=Math.min(92,(W-72)/spanX,(H-64)/spanY),size=pitch*.70,ox=(W-spanX*pitch)/2,oy=(H-spanY*pitch)/2;
 const visited=new Set([...visitedRooms].map(String));visited.add(String(currentRoomId));
 const point=p=>({x:ox+(p.gx-minX+.5)*pitch,y:oy+(p.gy-minY+.5)*pitch});
 const roomFor=id=>currentFloor.rooms.find(r=>String(r.id)===String(id));
 const connected=new Set();
 for(const [id,p]of entries){const room=roomFor(id);if(!room)continue;
  for(const door of Object.values(room.doors||{})){if(!door||door.targetRoomId==null)continue;const target=String(door.targetRoomId),other=currentFloor.layout[target],edge=[id,target].sort().join(':');if(!other||connected.has(edge))continue;connected.add(edge);
   const a=point(p),b=point(other);paint.strokeStyle=visited.has(id)&&visited.has(target)?'#537a80':'#233840';paint.lineWidth=5;paint.beginPath();paint.moveTo(a.x,a.y);paint.lineTo(b.x,b.y);paint.stroke();
  }
 }
 const labels={start:'起点',normal:'战斗',boss:'首领',treasure:'宝藏',shop:'商店'};
 for(const [id,p]of entries){const room=roomFor(id);if(!room)continue;const q=point(p),known=visited.has(id),current=String(id)===String(currentRoomId),x=q.x-size/2,y=q.y-size/2;
  paint.fillStyle=known?'#203d46':'#101f27';paint.fillRect(x,y,size,size);paint.strokeStyle=current?'#67e4ec':known?'#68868a':'#34474c';paint.lineWidth=current?3:2;paint.strokeRect(x,y,size,size);
  paint.fillStyle=current?'#efb34e':'#3c646c';paint.fillRect(x+4,y+4,5,3);paint.fillRect(x+size-9,y+size-7,5,3);
  paint.fillStyle=known?'#e3d5ad':'#536670';paint.font='600 '+Math.max(9,Math.min(17,size*.26))+'px Microsoft YaHei UI';paint.textAlign='center';paint.textBaseline='middle';paint.fillText(known?(labels[room.type]||'房间'):'?',q.x,q.y);
  if(current){paint.fillStyle='#67e4ec';paint.beginPath();paint.moveTo(q.x,y-5);paint.lineTo(q.x-5,y-12);paint.lineTo(q.x+5,y-12);paint.closePath();paint.fill();}
 }
}
