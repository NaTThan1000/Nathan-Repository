// 新怪物与连续房间仅用于机制原型。旧12组场景保留原规则供对照。
const btTypes={
 fixed:{name:'固定射手',hp:2,chase:0,range:3,mode:'shot',art:'ranged',color:'#ecd273'},
 mobile:{name:'移动射手',hp:2,chase:5,range:3,mode:'shot',art:'ranged',color:'#74caec'},
 big:{name:'大史莱姆',hp:3,chase:3,range:1,mode:'charge',recover:false,art:'melee',color:'#83d877'},
 small:{name:'小史莱姆',hp:1,chase:3,range:1,mode:'charge',recover:false,art:'melee',color:'#bbef87'},
 fighter:{name:'近战者',hp:3,chase:4,range:2,mode:'strike',art:'melee',color:'#f1b374'},
 bomber:{name:'自爆者',hp:1,chase:3,range:1,mode:'blast',recover:false,art:'melee',color:'#ff7272'},
 charger:{name:'冲锋者',hp:3,chase:5,range:4,mode:'charge',art:'melee',color:'#d594f0'},
 x:{name:'X射手',hp:2,chase:5,range:5,mode:'fan',jump:true,diagonal:true,art:'ranged',color:'#d8a5ec'},
 cross:{name:'十字射手',hp:2,chase:5,range:5,mode:'fan',jump:true,art:'ranged',color:'#ffcb8b'}
};
function btDefinition(e){if(e.kind==='melee'||e.kind==='ranged')return {name:e.kind==='melee'?'冲刺':'射手',hp:e.kind==='melee'?3:2,art:e.kind,color:'#f7e8ca'};return btTypes[e.kind];}
const btRoomStart=btScenes.length;
btScenes.push(
 {name:'连战1 · 射手与掩体',note:'固定射手与移动射手，绕过短掩体建立射线。',player:[1,3],enemies:[['fixed',7,3],['mobile',5,1]],walls:[[4,2],[4,3]]},
 {name:'连战2 · 近身间隔',note:'史莱姆无恢复，近战者攻击后恢复；比较进攻窗口。',player:[1,3],enemies:[['small',5,2],['small',6,5],['fighter',7,3]],walls:[[4,2],[4,4]]},
 {name:'连战3 · 分裂与减员',note:'先后击杀大史莱姆和射手，观察分裂后空间压力。',player:[1,3],enemies:[['big',5,3],['big',7,5],['fixed',7,1]],walls:[[3,1],[3,5],[6,2]]},
 {name:'连战4 · 冲锋与自爆',note:'冲锋改变站位，自爆封锁周围8格；利用上下两条通路。',player:[1,3],enemies:[['charger',6,3],['bomber',5,1],['bomber',6,5]],walls:[[4,2],[4,3],[4,4]]},
 {name:'连战5 · 跳跃交叉',note:'X与十字射手跳跃换位，落地后才准备射击。',player:[1,3],enemies:[['x',6,1],['cross',6,5]],walls:[]},
 {name:'连战6 · 交叉与遮挡',note:'与上房同敌人同出生位置，只改变障碍。',player:[1,3],enemies:[['x',6,1],['cross',6,5]],walls:[[3,2],[3,4],[5,3]]},
 {name:'连战7 · 混合推进',note:'4种敌人从不同距离接近，观察威胁的自然交错。',player:[1,3],enemies:[['mobile',6,1],['fighter',7,3],['big',6,5],['bomber',4,5]],walls:[[3,2],[3,4],[5,2]]},
 {name:'连战8 · 多方向压力',note:'6只混编，观察减员顺序与分裂后的包围；不是保证无伤的关卡。',player:[1,3],enemies:[['fixed',7,0],['mobile',7,6],['big',5,1],['fighter',6,3],['charger',6,5],['x',8,4]],walls:[[3,2],[3,4],[5,3]]}
);
const btTrip={rooms:new Map()};
function btMakeEnemy(kind,x,y,id){const d=btTypes[kind];return {id,kind,x,y,hp:d.hp,phase:'idle',cells:[],candidates:[],next:null};}
const btOriginalReset=btReset;
btReset=function(index=Number(document.getElementById('scene').value)||0,travel=false){
 const hp=bt?.player.hp??5,totals=bt?{step:bt.step,dodges:bt.dodges,shots:bt.shots,hits:bt.hits}:{};
 if(!travel)btTrip.rooms.clear();
 if(travel&&btTrip.rooms.has(index)){bt=structuredClone(btTrip.rooms.get(index));document.getElementById('scene').selectedIndex=index;}
 else{
  btOriginalReset(index);
  if(index>=btRoomStart){bt.enemies=btScenes[index].enemies.map(([kind,x,y],id)=>btMakeEnemy(kind,x,y,id));bt.nextId=bt.enemies.length;bt.cleared=false;btPlan();}
 }
 if(travel){bt.player.hp=document.getElementById('room-heal').checked?5:hp;Object.assign(bt,totals);bt.bonus=0;}
 const s=btScenes[index];document.getElementById('scene-info').textContent=s.enemies.length+'只。'+s.note+(index>=btRoomStart?' 清场后从左右门进出；生命默认连续保留。':' 原两怪规则对照。');
 btVisualReset();btDraw();
};
function btTravel(direction){
 if(bt.scene<btRoomStart||bt.enemies.length||bt.player.y!==3)return false;
 const target=bt.scene+(direction==='right'?1:-1);if(target<btRoomStart||target>=btScenes.length)return false;
 btTrip.rooms.set(bt.scene,structuredClone(bt));btReset(target,true);bt.player.x=direction==='right'?0:8;bt.player.y=3;bt.player.facing=direction;btVisualReset();return true;
}
function btNewRay(e,dx,dy,range){const cells=[];for(let n=1;n<=range;n++){const x=e.x+dx*n,y=e.y+dy*n;if(btEnemyBlocked(e,x,y))break;if(dx&&dy&&(btWall(x-dx,y)||btWall(x,y-dy)))break;cells.push({x,y});}return cells;}
function btAttackCells(e){const d=btTypes[e.kind],dx=bt.player.x-e.x,dy=bt.player.y-e.y;
 if(d.mode==='blast')return [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]].map(([a,b])=>({x:e.x+a,y:e.y+b})).filter(p=>btInside(p.x,p.y));
 if(d.mode==='fan')return (d.diagonal?[[1,1],[-1,1],[1,-1],[-1,-1]]:Object.values(BT_DIR)).flatMap(([a,b])=>btNewRay(e,a,b,d.range));
 if((dx!==0&&dy!==0)||Math.abs(dx)+Math.abs(dy)>d.range||dx===0&&dy===0)return [];
 e.direction={dx:Math.sign(dx),dy:Math.sign(dy)};return btNewRay(e,e.direction.dx,e.direction.dy,d.range);
}
function btChooseNewPlan(e){const d=btTypes[e.kind];e.cells=[];e.next=null;e.candidates=[];
 const cells=btAttackCells(e);if(cells.some(p=>btAt(p,bt.player.x,bt.player.y))){e.phase='locked';e.cells=cells;return;}
 // 跳跃射手按横/纵最大距离判断5格区域，包含斜向；步行单位保留曼哈顿距离。
 const chase=(d.jump?Math.max(Math.abs(e.x-bt.player.x),Math.abs(e.y-bt.player.y)):Math.abs(e.x-bt.player.x)+Math.abs(e.y-bt.player.y))<=d.chase;e.phase=chase?'chase':'default';
 if(d.jump){
  let choices=[];for(let y=0;y<BT_ROWS;y++)for(let x=0;x<BT_COLS;x++)if(!btEnemyBlocked(e,x,y)&&!btAt(bt.player,x,y)&&!btAt(e,x,y))choices.push({x,y});
  if(chase)choices=choices.filter(p=>{const probe={...e,...p},area=btAttackCells(probe);return area.some(c=>btAt(c,bt.player.x,bt.player.y));});
  if(choices.length){bt.rng=(Math.imul(bt.rng,1664525)+1013904223)>>>0;e.next=choices[bt.rng%choices.length];}return;
 }
 if(e.kind!=='fixed')e.next=chase?btChase(e):btRandomStep(e);
}
const btOriginalPlan=btPlan;
btPlan=function(){if(bt.scene<btRoomStart)return btOriginalPlan();for(const e of bt.enemies)if(e.phase!=='locked'&&e.phase!=='recover')btChooseNewPlan(e);};
function btSplit(e){
 // 按离死亡点的曼哈顿距离逐圈搜索，不局限四邻。
 const children=[];for(let r=1;r<BT_COLS+BT_ROWS&&children.length<2;r++)for(let y=0;y<BT_ROWS&&children.length<2;y++)for(let x=0;x<BT_COLS&&children.length<2;x++){
  if(Math.abs(x-e.x)+Math.abs(y-e.y)!==r||btWall(x,y)||btAt(bt.player,x,y)||bt.enemies.some(o=>btAt(o,x,y)))continue;
  const child=btMakeEnemy('small',x,y,bt.nextId++);child.birthOrigin={x:e.x,y:e.y};bt.enemies.push(child);children.push(child);
 }return children;
}
const btOriginalAct=btAct;
btAct=function(type,dir){
 if(bt.scene<btRoomStart)return btOriginalAct(type,dir);
 if(bt.player.hp<=0||!['move','shoot'].includes(type))return false;
 if(type==='move'&&bt.player.y===3&&((dir==='left'&&bt.player.x===0)||(dir==='right'&&bt.player.x===8)))return btTravel(dir);
 const before=btSnapshot(),old={x:bt.player.x,y:bt.player.y},frozen=bt.bonus>0,active=new Set(bt.enemies.map(e=>e.id)),newborn=[];
 bt.fx=[];bt.visualPushes=[];bt.damagedThisAction=false;bt.pushBlocked=false;
 let moved=false;
 if(type==='move'){const [dx,dy]=BT_DIR[dir],x=old.x+dx,y=old.y+dy;if(btWall(x,y)||bt.enemies.some(e=>btAt(e,x,y)))return false;Object.assign(bt.player,{x,y});moved=true;}
 else{
  const [dx,dy]=BT_DIR[dir],ray=btRay(old.x,old.y,dx,dy);let to=ray.at(-1)||old,target=null;
  for(const p of ray){const e=bt.enemies.find(e=>btAt(e,p.x,p.y));if(!e)continue;e.hp--;target=e.id;to=p;if(e.hp<=0){bt.enemies=bt.enemies.filter(o=>o!==e);if(e.kind==='big')newborn.push(...btSplit(e));}break;}
  bt.shots++;if(target!==null)bt.hits++;bt.fx.push({kind:'shot',from:old,to,dir,target,hit:target!==null});
 }
 bt.voluntaryEnd={x:bt.player.x,y:bt.player.y};bt.step++;btLandingDamage();let dodged=false;
 if(!frozen)for(const e of [...bt.enemies]){
  if(!active.has(e.id))continue;const d=btTypes[e.kind];
  if(e.phase==='locked'){
   // 使用已锁定的格子；只裁剪被新占位阻挡的射线，不重新追踪玩家。
   let cells=e.cells;
   if(d.mode!=='blast'){
    const dirs=d.mode==='fan'?(d.diagonal?[[1,1],[-1,1],[1,-1],[-1,-1]]:Object.values(BT_DIR)):[[e.direction.dx,e.direction.dy]];
    const valid=dirs.flatMap(([dx,dy])=>btNewRay(e,dx,dy,d.range));cells=cells.filter(p=>valid.some(c=>btAt(c,p.x,p.y)));
   }
   const oldHit=cells.some(p=>btAt(p,old.x,old.y)),hit=cells.some(p=>btAt(p,bt.player.x,bt.player.y));if(moved&&oldHit&&!hit)dodged=true;
   if(d.mode!=='charge'&&hit)btDamagePlayer(1);
   bt.fx.push({kind:'attack',id:e.id,cells:structuredClone(cells),hitPlayer:d.mode!=='charge'&&hit,hitPosition:{x:bt.player.x,y:bt.player.y},projectile:d.mode==='shot'||d.mode==='fan'});
   if(d.mode==='charge'){let hurt=false;for(const [i,p]of cells.entries()){e.chargeProgress=i+1;if(btAt(bt.player,p.x,p.y)){if(!hurt){btDamagePlayer(1);hurt=true;}if(!btPushFromCharge(e))break;}e.x=p.x;e.y=p.y;}delete e.chargeProgress;}
   if(d.mode==='blast'){bt.enemies=bt.enemies.filter(o=>o!==e);bt.fx.push({kind:'death',target:e.id,at:0});}
   else{e.cells=[];e.next=null;e.phase=d.recover===false?'idle':'recover';}
  }else if(e.phase==='recover'){e.phase='idle';e.next=null;}
  else{if(e.next&&!btEnemyBlocked(e,e.next.x,e.next.y)&&!btAt(bt.player,e.next.x,e.next.y)){e.x=e.next.x;e.y=e.next.y;}e.phase='idle';}
 }
 if(frozen){bt.bonus=bt.damagedThisAction?0:bt.bonus-1;for(const e of newborn)btChooseNewPlan(e);}
 else{if(dodged&&!bt.damagedThisAction&&bt.player.hp>0){bt.bonus=2;bt.dodges++;}btPlan();}
 bt.cleared=!bt.enemies.length;bt.ended=bt.player.hp<=0;bt.player.facing=dir;
 bt.message=bt.ended?'本次失败，按R重试当前房间。':bt.cleared?'清场！走到左右边门并向外移动进入相邻房间。':bt.damagedThisAction?'受到伤害，子弹时间未触发或已结束。':bt.bonus?'子弹时间：剩余'+bt.bonus+'次额外行动。':'敌人执行已保存行为，步末确定下一步。';
 btVisualEnqueue(before,type,dir);btDraw();return true;
};
// 重建列表，保留旧12组对照，新8间连续房默认从第一间开始。
document.getElementById('scene').replaceChildren(...btScenes.map((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i<btRoomStart?'旧对照 '+(i+1):'房间 '+(i-btRoomStart+1))+' · '+s.name;return o;}));
document.getElementById('scene').onchange=e=>{btReset(Number(e.target.value));e.target.blur();};
document.getElementById('reset').onclick=e=>{btReset();e.target.blur();};
document.getElementById('room-heal').onchange=e=>e.target.blur();
btReset(btRoomStart);
