// 独立机制试玩；不复用正式版 MP/AP、回溯、掉落及预测规则。
'use strict';
const BT_COLS=9,BT_ROWS=7,BT_CELL=80,BT_BONUS=2;
const BT_DIR={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
let bt;
const btCanvas=document.getElementById('board'),btCtx=btCanvas.getContext('2d');
const btImages={};
const btAssetsReady=Promise.all(Object.entries(BT_ASSETS).map(async([key,src])=>{const im=new Image();im.src=src;await im.decode();btImages[key]=im;})).then(()=>{
 // 与正式版相同的暖灰褐地板加工，原始审核素材保持不变。
 const im=btImages.floor,surface=document.createElement('canvas');surface.width=im.naturalWidth;surface.height=im.naturalHeight;
 const paint=surface.getContext('2d');paint.drawImage(im,0,0);const pixels=paint.getImageData(0,0,surface.width,surface.height);
 for(let i=0;i<pixels.data.length;i+=4){const y=pixels.data[i]*.2126+pixels.data[i+1]*.7152+pixels.data[i+2]*.0722;pixels.data[i]=y*.95+12;pixels.data[i+1]=y*.80+9;pixels.data[i+2]=y*.64+8;}
 paint.putImageData(pixels,0,0);btImages.floor=surface;btDraw();
});
function btImage(key,x,y,w,h){const im=btImages[key];if(im)btCtx.drawImage(im,x,y,w,h);}
const btScenes=[
 {name:'锁定后侧移',note:'单射手，观察攻击、闪避与恢复的基础节奏。',player:[2,3],enemies:[['ranged',5,3]],walls:[]},
 {name:'近战的攻防间隔',note:'单近战，观察冲刺、挤出与原地恢复。',player:[2,3],enemies:[['melee',5,3]],walls:[]},
 {name:'近远交错',note:'两怪配合，观察移动后新产生的攻击预告。',player:[2,3],enemies:[['ranged',6,3],['melee',5,5]],walls:[[4,2],[4,4]]},
 {name:'掩体与双射手',note:'三怪配合，比较掩体保护与绕行成本。',player:[2,3],enemies:[['ranged',6,3],['ranged',2,0],['melee',6,5]],walls:[[4,2],[4,4],[1,1]]},
 {name:'四怪 · 开阔夹击',note:'2近战＋2远程，从左右与斜线接敌；作为下一场的无障碍对照。',player:[4,3],enemies:[['melee',0,3],['melee',8,3],['ranged',1,0],['ranged',7,6]],walls:[]},
 {name:'四怪 · 错位掩体',note:'与上一场完全相同的出生位置和敌人；只增加两块掩体，观察安全格与绕路的变化。',player:[4,3],enemies:[['melee',0,3],['melee',8,3],['ranged',1,0],['ranged',7,6]],walls:[[3,2],[5,4]]},
 {name:'四射手 · 对角封锁',note:'四角射手，初始形成对角射线；观察横竖移动后如何重新选择进攻位置。',player:[4,3],enemies:[['ranged',1,0],['ranged',7,0],['ranged',1,6],['ranged',7,6]],walls:[]},
 {name:'四近战 · 冲刺接力',note:'上下近战已锁定，左右近战仍在追击；观察冲刺落位与恢复窗口交错。',player:[4,3],enemies:[['melee',0,3],['melee',8,3],['melee',4,0],['melee',4,6]],walls:[]},
 {name:'六怪 · 开阔合围',note:'2近战＋4远程；与四射手场景相比增加两侧追击，观察奖励行动能否用于突围。',player:[4,3],enemies:[['melee',0,3],['melee',8,3],['ranged',1,0],['ranged',7,0],['ranged',1,6],['ranged',7,6]],walls:[]},
 {name:'六怪 · 掩体合围',note:'与上一场同怪物同出生点；只增加错位掩体，比较遮挡收益与可走空间。',player:[4,3],enemies:[['melee',0,3],['melee',8,3],['ranged',1,0],['ranged',7,0],['ranged',1,6],['ranged',7,6]],walls:[[3,2],[5,4],[2,4],[6,2]]},
 {name:'八怪 · 外圈压力',note:'4近战＋4远程，近战从外圈逐步接近；用于观察拥挤、路线阻挡与多威胁读图。',player:[4,3],enemies:[['melee',0,2],['melee',8,4],['melee',0,4],['melee',8,2],['ranged',1,0],['ranged',7,0],['ranged',1,6],['ranged',7,6]],walls:[]},
 {name:'六怪 · 侧翼突围',note:'3近战＋3远程，玩家从左下方出发，结合不对称掩体测试接敌与优先击杀。',player:[1,5],enemies:[['melee',4,5],['melee',7,5],['melee',6,3],['ranged',1,1],['ranged',4,2],['ranged',7,0]],walls:[[3,4],[3,3],[5,2],[5,4],[2,1],[6,1]]}
];
function btReset(index=Number(document.getElementById('scene').value)||0){
 const s=btScenes[index];bt={scene:index,player:{x:s.player[0],y:s.player[1],hp:5,facing:'down'},enemies:s.enemies.map(([kind,x,y],id)=>({id,kind,x,y,hp:kind==='ranged'?2:3,phase:'idle',cells:[],candidates:[],next:null})),rng:123456789,hazards:[],damagedThisAction:false,walls:s.walls.map(([x,y])=>({x,y})),step:0,bonus:0,dodges:0,shots:0,hits:0,fx:[],message:'观察准备范围；锁定变红后，在生效的那一步侧移。',ended:false};
 document.getElementById('scene').selectedIndex=index;
 const melee=s.enemies.filter(([kind])=>kind==='melee').length;
 document.getElementById('scene-info').textContent=s.enemies.length+'只 · 近战'+melee+' / 远程'+(s.enemies.length-melee)+'。'+s.note+' 难度待试玩，非通关保证。';
 btPlan();btVisualReset();btDraw();
}
function btInside(x,y){return x>=0&&y>=0&&x<BT_COLS&&y<BT_ROWS;}
function btWall(x,y){return !btInside(x,y)||bt.walls.some(c=>c.x===x&&c.y===y);}
function btAt(c,x,y){return c.x===x&&c.y===y;}
function btRay(x,y,dx,dy){const cells=[];for(let n=1;n<=8;n++){const c={x:x+dx*n,y:y+dy*n};if(btWall(c.x,c.y))break;cells.push(c);}return cells;}
function btEnemyBlocked(e,x,y){return btWall(x,y)||bt.enemies.some(o=>o.id!==e.id&&btAt(o,x,y));}
function btAttackRay(e,dx,dy){
 const cells=[];for(let n=1;n<=3;n++){const x=e.x+dx*n,y=e.y+dy*n;
  if(btEnemyBlocked(e,x,y))break;
  // 斜向射击不能从两侧障碍之间穿角。
  if(dx&&dy&&(btWall(x-dx,y)||btWall(x,y-dy)))break;
  cells.push({x,y});
 }return cells;
}
function btChaseDirections(e){
 const dx=bt.player.x-e.x,dy=bt.player.y-e.y,axes=[];
 if(dx)axes.push({x:e.x+Math.sign(dx),y:e.y,distance:Math.abs(dx)});
 if(dy)axes.push({x:e.x,y:e.y+Math.sign(dy),distance:Math.abs(dy)});
 axes.sort((a,b)=>b.distance-a.distance);
 if(axes.length===2&&Math.abs(dx)===Math.abs(dy)){bt.rng=(Math.imul(bt.rng,1664525)+1013904223)>>>0;if(bt.rng%2)axes.reverse();}
 return axes.map(({x,y})=>({x,y}));
}
function btChase(e){
 // BFS保证最短可达路线；首步顺序使同长路线优先较长轴，等轴随机。
 const preferred=btChaseDirections(e).map(p=>[p.x-e.x,p.y-e.y]),dirs=[...preferred,...Object.values(BT_DIR)].filter((p,i,all)=>all.findIndex(o=>o[0]===p[0]&&o[1]===p[1])===i);
 const q=[{x:e.x,y:e.y,first:null}],seen=new Set([e.x+','+e.y]);let best=Math.abs(e.x-bt.player.x)+Math.abs(e.y-bt.player.y),fallback=null;
 for(let i=0;i<q.length;i++){const p=q[i],distance=Math.abs(p.x-bt.player.x)+Math.abs(p.y-bt.player.y);if(distance===1)return p.first;
  if(distance<best){best=distance;fallback=p.first;}
  for(const [dx,dy]of dirs){const x=p.x+dx,y=p.y+dy,key=x+','+y;if(seen.has(key)||btEnemyBlocked(e,x,y)||btAt(bt.player,x,y))continue;seen.add(key);q.push({x,y,first:p.first||{x,y}});}
 }return fallback;
}
function btRandomStep(e){
 const cells=Object.values(BT_DIR).map(([dx,dy])=>({x:e.x+dx,y:e.y+dy})).filter(p=>!btEnemyBlocked(e,p.x,p.y)&&!btAt(bt.player,p.x,p.y));
 if(!cells.length)return null;
 bt.rng=(Math.imul(bt.rng,1664525)+1013904223)>>>0;return cells[bt.rng%cells.length];
}
function btPlan(){
 for(const e of bt.enemies){
  // 锁定攻击及攻击后恢复都是已保存的行动，不能被步末重新规划覆盖。
  if(e.phase==='locked'||e.phase==='recover')continue;
  e.next=null;e.cells=[];e.candidates=[];
  const dx=bt.player.x-e.x,dy=bt.player.y-e.y,ax=Math.abs(dx),ay=Math.abs(dy);
  const aligned=(dx===0||dy===0||(e.kind==='ranged'&&ax===ay))&&(ax+ay>0);
  if(aligned&&Math.max(ax,ay)<=3){
   const direction={dx:Math.sign(dx),dy:Math.sign(dy)},cells=btAttackRay(e,direction.dx,direction.dy);
   if(cells.some(p=>btAt(p,bt.player.x,bt.player.y))){e.phase='locked';e.direction=direction;e.cells=cells;continue;}
  }
  // 沿用原型的四方向最短路追击与曼哈顿距离判定。
  if(ax+ay<=(e.kind==='melee'?4:5)){e.phase='chase';e.next=btChase(e);}
  else{e.phase='default';e.next=btRandomStep(e);}
 }
}
function btDamagePlayer(amount){if(amount<=0)return;bt.damagedThisAction=true;bt.player.hp=Math.max(0,bt.player.hp-amount);}
function btLandingDamage(){for(const h of bt.hazards)if(btAt(h,bt.player.x,bt.player.y))btDamagePlayer(h.damage||1);}
function btPushFromCharge(e){
 // 相对冲刺方向：两侧 > 冲刺前方（玩家后退方向）> 怪物来向。
 // 冲刺怪的旧位置即将腾空，可以落脚；其余怪物仍然阻挡。
 const {dx,dy}=e.direction;
 for(const offsets of [[[-dy,dx],[dy,-dx]],[[dx,dy]],[[-dx,-dy]]]){
  const options=offsets.map(([x,y])=>({x:bt.player.x+x,y:bt.player.y+y})).filter(p=>!btEnemyBlocked(e,p.x,p.y));
  if(!options.length)continue;
  if(options.length>1)bt.rng=(Math.imul(bt.rng,1664525)+1013904223)>>>0;
  const dest=options[options.length>1?bt.rng%options.length:0];
  bt.visualPushes?.push({id:e.id,progress:e.chargeProgress||1,from:{x:bt.player.x,y:bt.player.y},to:{...dest}});bt.player.x=dest.x;bt.player.y=dest.y;
  btLandingDamage();return true;
 }
 bt.pushBlocked=true;return false;
}
function btAct(type,dir){
 if(bt.ended||!['move','shoot'].includes(type))return false;
 const before=btSnapshot();
 const old={x:bt.player.x,y:bt.player.y},frozen=bt.bonus>0;
 bt.fx=[];bt.visualPushes=[];bt.damagedThisAction=false;bt.pushBlocked=false;let moved=false,shotHit=false,target=null;
 if(type==='move'){
  const [dx,dy]=BT_DIR[dir],x=old.x+dx,y=old.y+dy;
  if(btWall(x,y)||bt.enemies.some(e=>btAt(e,x,y))){bt.message='该格不可进入，本次不消耗行动。';btDraw();return false;}
  bt.player.x=x;bt.player.y=y;moved=true;
 }else if(type==='shoot'){
  const [dx,dy]=BT_DIR[dir],ray=btRay(old.x,old.y,dx,dy);let end=ray.at(-1)||old;
  for(const c of ray){const e=bt.enemies.find(e=>btAt(e,c.x,c.y));if(e){target=e.id;e.hp--;shotHit=true;end=c;break;}}
  bt.shots++;if(shotHit)bt.hits++;bt.enemies=bt.enemies.filter(e=>e.hp>0);
  bt.fx.push({kind:'shot',from:old,to:end,dir,hit:shotHit,target});
 }
 bt.voluntaryEnd={x:bt.player.x,y:bt.player.y};bt.step++;let dodged=false,damage=0;
 btLandingDamage();
 if(frozen){bt.bonus=bt.damagedThisAction?0:bt.bonus-1;bt.message=bt.damagedThisAction?'受到伤害，子弹时间立即结束。':'子弹时间：敌方停止。'+(shotHit?'命中！':'');}
 else{
  // 移动先改变落点；锁定攻击保持原目标，所有敌方行为结算后才发奖励。
  for(const e of bt.enemies){
   if(e.phase==='locked'){
    const cells=btAttackRay(e,e.direction.dx,e.direction.dy).filter(p=>e.cells.some(saved=>btAt(saved,p.x,p.y)));
    const oldHit=cells.some(c=>btAt(c,old.x,old.y)),newHit=cells.some(c=>btAt(c,bt.player.x,bt.player.y));
    if(moved&&oldHit&&!newHit)dodged=true;
    if(e.kind==='ranged'&&newHit)damage++;
    bt.fx.push({kind:'attack',id:e.id,cells:cells.map(c=>({...c})),hitPlayer:e.kind==='ranged'&&newHit,hitPosition:{x:bt.player.x,y:bt.player.y}});
    if(e.kind==='melee'){
     let hit=false;
     for(const [index,p] of cells.entries()){
      e.chargeProgress=index+1;
      if(btAt(bt.player,p.x,p.y)){
       // 沿途每格处理挤出，同一冲刺对玩家只造成一次攻击伤害。
       if(!hit){damage++;hit=true;}
       if(!btPushFromCharge(e))break;
      }
      e.x=p.x;e.y=p.y;
     }
    }
    delete e.chargeProgress;e.cells=[];e.next=null;e.phase='recover';
   }else if(e.phase==='default'||e.phase==='chase'){
    if(e.next&&!btAt(bt.player,e.next.x,e.next.y)&&!bt.enemies.some(o=>o!==e&&btAt(o,e.next.x,e.next.y))){e.x=e.next.x;e.y=e.next.y;}
    e.phase='idle';
   }else if(e.phase==='recover'){e.phase='idle';e.next=null;}
  }
  btDamagePlayer(damage);
  if(dodged&&!bt.damagedThisAction&&bt.player.hp>0){bt.bonus=BT_BONUS;bt.dodges++;bt.message='精准闪避！子弹时间：获得 '+BT_BONUS+' 次连续行动。';}
  else bt.message=bt.damagedThisAction?'受到伤害，本步不触发子弹时间。':shotHit?'瞬发命中，敌人推进一步。':'敌人执行已保存的行动；步末重新判定，攻击后原地恢复。';
  btPlan();
  if(bt.pushBlocked)bt.message='冲刺造成伤害；玩家四邻均无合法落点，怪物停在碰撞前，未强行重叠。';
 }
 if(!bt.enemies.length){bt.ended=true;bt.message='清场成功！可以切换场景继续体验。';}
 if(bt.player.hp<=0){bt.ended=true;bt.bonus=0;bt.message='本次失败。按 R 重试，或切换教学场景。';}
 bt.player.facing=dir;
 btVisualEnqueue(before,type,dir);btDraw();return true;
}
function btDraw(){
 const view=btVisualView(),world=view.world;
 const c=btCtx,S=BT_CELL;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,btCanvas.width,btCanvas.height);c.translate(0,32);
 for(let y=0;y<BT_ROWS;y++)for(let x=0;x<BT_COLS;x++)btImage('floor',x*S,y*S,S,S);
 for(const w of world.walls)btImage('facility',w.x*S,w.y*S,S,S);
 btDrawTimeField(view);
 const tile=(p,color)=>{c.fillStyle=color;c.fillRect(p.x*S+4,p.y*S+4,S-8,S-8);};
 for(const e of world.enemies){
  for(const cells of e.candidates)for(const p of cells){c.strokeStyle='#c6a65d';c.setLineDash([5,6]);c.strokeRect(p.x*S+10,p.y*S+10,S-20,S-20);c.setLineDash([]);}
  for(const p of e.cells){tile(p,'#b8404244');btImage('redGrid',p.x*S,p.y*S,S,S);}
  if(e.next&&!btDefinition(e).jump){c.save();c.globalAlpha=.28;btImage('blueGrid',e.next.x*S,e.next.y*S,S,S);c.restore();}
 }
 for(const e of world.enemies){
  const x=e.x*S+40,y=e.y*S+40;
  const frame=e.visualFrame??(world.bonus?0:Math.floor(performance.now()/180)%3);
  const def=btDefinition(e),scale=e.kind==='small'?.65:e.kind==='big'?1.12:1;
  const art=btArtState(e,view);
  if(art){const size=e.hp<=0?96:e.kind==='small'?44:e.kind==='big'?84:76,shake=!world.bonus&&e.kind==='charger'&&e.phase==='locked'&&!view.clip?.effects.some(f=>f.kind==='attack'&&f.id===e.id)?Math.sin(performance.now()*.09)*2:0;btImage(art,x-size/2+shake,y-size*.66,size,size);}
  else btImage(def.art+frame,x-30*S/22*scale,y-38*S/22*scale,60*S/22*scale,68*S/22*scale);
  c.font='12px Microsoft YaHei UI';c.textAlign='center';
  c.fillStyle='#182a30';c.fillRect(x-22,y+22,44,5);c.fillStyle=def.color;c.fillRect(x-22,y+22,44*e.hp/def.hp,5);
  c.fillStyle=e.phase==='locked'?'#ff9a8a':def.color;c.fillText(def.name,x,y-48);
  c.fillText(({locked:'攻击！',recover:'恢复',chase:def.jump?'跳跃':'追击',default:def.jump?'跳跃':'游走',idle:'待命'})[e.phase],x,y-34);
 }
 btDrawUnitEffects(view);
 btDrawDodgeEffects();
 const p=world.player,x=p.x*S+40,y=p.y*S+40;
 if(world.bonus){c.strokeStyle='#8effdc';c.lineWidth=3;c.beginPath();c.ellipse(x,y+23,25,10,0,0,Math.PI*2);c.stroke();}
 const clip=view.clip,moving=clip&&clip.type==='move'&&view.elapsed<btMoveMs(clip.before.player,clip.voluntaryEnd);
 const action=view.hurtAge!==null&&view.hurtAge<120?'hit':clip&&clip.type==='shoot'&&view.elapsed<400?'shoot':moving?'move'+(1+Math.min(2,Math.floor(view.elapsed/50))):'idle';
 const breath=action==='idle'&&Math.floor(performance.now()/1000)%2?0.98:1;
 if(p.hp<=0)btImage('defeat'+Math.min(5,Math.floor((view.hurtAge??600)/100)),x-19.8*S/22,y-24*S/22,39.6*S/22,41.8*S/22);
 else btImage('hero-'+p.facing+'-'+action,x-19.8*S/22,y-24*S/22+(1-breath)*70,39.6*S/22,41.8*S/22*breath);
 btDrawVisualEffects(view);
 btDrawPlaybackTails();
 if(world.scene>=12){const open=!world.enemies.length;if(world.scene>btRoomStart)btImage(open?'leftOpen':'leftClosed',0,3*S-4,35,88);if(world.scene<btScenes.length-1)btImage(open?'rightOpen':'rightClosed',720-35,3*S-4,35,88);}
 btCanvas.style.borderColor='#47616c';btCanvas.style.boxShadow='none';
 const status=document.getElementById('status');status.replaceChildren();
 for(let i=0;i<5;i++){const icon=document.createElement('img');icon.src=BT_ASSETS[i<p.hp?'heart':'emptyHeart'];icon.alt=i<p.hp?'生命':'失去的生命';icon.width=24;icon.height=24;icon.style.verticalAlign='middle';status.appendChild(icon);}
 status.append('　行动 '+world.step+'　'+(world.bonus?'子弹时间 · 剩余 '+world.bonus+' 次':'普通行动 · 敌我同步推进'));
 document.getElementById('log').textContent=world.message;
 document.getElementById('result').textContent='成功闪避 '+world.dodges+' 次　射击命中 '+world.hits+'/'+world.shots+'　剩余敌人 '+world.enemies.length;
}
document.getElementById('scene').replaceChildren(...btScenes.map((s,i)=>{const option=document.createElement('option');option.value=i;option.textContent=String(i+1).padStart(2,'0')+' · '+s.name;return option;}));
document.getElementById('scene').onchange=()=>btReset();document.getElementById('reset').onclick=()=>btReset();
for(const [id,type]of [['move','move'],['shoot','shoot']])document.getElementById(id).onclick=e=>{const dir=e.target.dataset.dir;if(dir){btInputAction(type,dir);e.target.blur();}};
document.addEventListener('keydown',e=>{
 if(['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName))return;
 const keys={KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right',ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
 if(keys[e.code]||['Space','KeyR','Escape'].includes(e.code))e.preventDefault();
 if(e.repeat)return;
 if(e.code==='KeyR'){btReset();return;}
 if(keys[e.code])btInputAction(e.code.startsWith('Arrow')?'shoot':'move',keys[e.code]);
});
btReset(0);
