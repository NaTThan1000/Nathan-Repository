// 只播放已经结算的行动，不调用规则、不抽随机数、不推进战场。
// 时长、比例、帧序沿用正式版：CELL22、移动170px/s、玩家弹560px/s、怪物弹0.6倍。
const btPlayback={queue:[],tails:[],settled:null,running:false};
// 操作入口不保留缓冲：上一行动尚在播放时的新输入直接丢弃。
// btAct保留为同步规则接口，供场景回归检查使用。
function btInputAction(type,dir){btAdvancePlayback(performance.now());if(btPlayback.queue.length)return false;return btAct(type,dir);}
function btSnapshot(){return structuredClone({scene:bt.scene,player:bt.player,enemies:bt.enemies,walls:bt.walls,bonus:bt.bonus,step:bt.step,message:bt.message,dodges:bt.dodges,hits:bt.hits,shots:bt.shots});}
const btDistance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const btMoveMs=(a,b)=>btDistance(a,b)*22/170*1000;
function btVisualReset(){btPlayback.queue=[];btPlayback.tails=[];btPlayback.settled=btSnapshot();btTimeArt.active=!!bt.bonus;btTimeArt.enter=null;btTimeArt.release=null;btVisualRun();}
function btVisualEnqueue(before,type,dir){
 const after=btSnapshot(),effects=structuredClone(bt.fx),pushes=structuredClone(bt.visualPushes||[]);
 let actionDuration=type==='move'?btMoveMs(before.player,bt.voluntaryEnd):100;
 let duration=Math.max(actionDuration,400);
 for(const f of effects){
  f.at=f.kind==='shot'?btDistance(f.from,f.to)*22/560*1000:0;
  if(f.kind==='attack'){
   const e=before.enemies.find(e=>e.id===f.id);f.from={x:e.x,y:e.y};f.to=f.hitPlayer?f.hitPosition:f.cells.at(-1)||f.from;f.enemyKind=e.kind;f.direction=e.direction;
   f.projectile=f.projectile??e.kind==='ranged';
   f.at=f.projectile?btDistance(f.from,f.to)*22/(560*.6)*1000:btMoveMs(f.from,after.enemies.find(m=>m.id===e.id)||f.from);
   if(f.projectile){const rays=new Map();for(const p of f.cells){const dx=Math.sign(p.x-e.x),dy=Math.sign(p.y-e.y),key=dx+','+dy,prev=rays.get(key);if(!prev||btDistance(e,p)>btDistance(e,prev))rays.set(key,p);}f.rays=[...rays.values()];}
  }
  duration=Math.max(duration,f.at+(f.kind==='death'||f.kind==='shot'&&f.hit?360:250));
  actionDuration=Math.max(actionDuration,f.at);
 }
 for(const e of before.enemies){const next=after.enemies.find(m=>m.id===e.id),shot=effects.find(f=>f.kind==='shot'&&f.target===e.id);if(next)actionDuration=Math.max(actionDuration,(shot?.at||0)+(btDefinition(e).jump&&btDistance(e,next)>0?400:btMoveMs(e,next)));}
 for(const p of pushes){p.at=p.progress*22/170*1000;actionDuration=Math.max(actionDuration,p.at+btMoveMs(p.from,p.to));}
 if(after.enemies.some(e=>!before.enemies.some(o=>o.id===e.id)))actionDuration=Math.max(actionDuration,(effects.find(f=>f.kind==='shot'&&f.hit)?.at||0)+300);
 duration=Math.max(duration,actionDuration);
 if(type==='move'&&after.dodges>before.dodges)duration=Math.max(duration,btMoveMs(before.player,bt.voluntaryEnd)+360);
 // 状态特效与输入接受发生在同一次同步结算中，不等动画世界追上规则世界。
 btSetTimeState(!!after.bonus);
 btPlayback.queue.push({before,after,effects,pushes,type,dir,duration,actionDuration,start:btPlayback.queue.length?null:performance.now(),voluntaryEnd:{...bt.voluntaryEnd}});btVisualRun();
}
function btVisualRun(){if(btPlayback.running)return;btPlayback.running=true;requestAnimationFrame(btVisualTick);}
function btAdvancePlayback(now){
 const q=btPlayback.queue;
 if(q.length){if(q[0].start===null)q[0].start=now;while(q.length&&now-q[0].start>=q[0].actionDuration){const clip=q.shift(),end=clip.start+clip.actionDuration;btPlayback.settled=clip.after;if(now<clip.start+clip.duration)btPlayback.tails.push(clip);if(q.length)q[0].start=end;}}
 btPlayback.tails=btPlayback.tails.filter(clip=>now<clip.start+clip.duration);
}
function btVisualTick(now){
 btAdvancePlayback(now);
 btDraw();requestAnimationFrame(btVisualTick);
}
function btDrawPlaybackTails(){
 const now=performance.now(),S=BT_CELL;
 for(const clip of btPlayback.tails){const elapsed=now-clip.start,view={clip,elapsed,world:{enemies:[]},hurtAge:null};
  for(const f of clip.effects){if(!((f.kind==='shot'&&f.hit)||f.kind==='death')||elapsed<f.at||elapsed>=f.at+360)continue;
   const e=clip.before.enemies.find(e=>e.id===f.target);if(!e||clip.after.enemies.some(m=>m.id===e.id))continue;
   const ghost={...e,hp:0},art=btArtState(ghost,view),x=e.x*S+40,y=e.y*S+40;
   if(art)btImage(art,x-48,y-96*.66,96,96);else btImage(btDefinition(e).art+(elapsed-f.at<180?6:7),x-30*S/22,y-38*S/22,60*S/22,68*S/22);
  }
  btDrawVisualEffects(view);btDrawUnitEffects(view);
 }
}
function btVisualPosition(from,to,elapsed,duration){const t=Math.max(0,Math.min(1,elapsed/Math.max(1,duration)));return {x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t};}
function btVisualView(now=performance.now()){
 const clip=btPlayback.queue[0];if(!clip)return {world:btPlayback.settled||btSnapshot(),elapsed:0,clip:null};
 const elapsed=Math.max(0,now-(clip.start??now)),world=structuredClone(clip.before);world.player.facing=clip.dir;
 const pos=btVisualPosition(clip.before.player,clip.voluntaryEnd,elapsed,btMoveMs(clip.before.player,clip.voluntaryEnd));Object.assign(world.player,pos);
 for(const push of clip.pushes)if(elapsed>=push.at)Object.assign(world.player,btVisualPosition(push.from,push.to,elapsed-push.at,btMoveMs(push.from,push.to)));
 let hurtAt=clip.type==='move'?btMoveMs(clip.before.player,clip.voluntaryEnd):0;
 if(clip.before.player.hp>clip.after.player.hp){
  const attacks=clip.effects.filter(f=>f.kind==='attack'&&(f.hitPlayer||clip.pushes.some(p=>p.id===f.id)));if(attacks.length)hurtAt=Math.min(...attacks.map(f=>f.enemyKind==='melee'?(clip.pushes.find(p=>p.id===f.id)?.at??f.at):f.at));
  if(elapsed>=hurtAt)world.player.hp=clip.after.player.hp;
 }
 world.enemies=world.enemies.filter(e=>{
  const next=clip.after.enemies.find(m=>m.id===e.id),shot=clip.effects.find(f=>(f.kind==='shot'||f.kind==='death')&&f.target===e.id);
  e.visualFrame=clip.before.bonus?0:Math.floor(now/180)%3;
  const attack=clip.effects.find(f=>f.kind==='attack'&&f.id===e.id);if(attack&&elapsed<240)e.visualFrame=3+Math.min(1,Math.floor(elapsed/120));
  if(next){const jump=btDefinition(e).jump&&btDistance(e,next)>0,ms=jump?400:btMoveMs(e,next);Object.assign(e,btVisualPosition(e,next,elapsed-(shot?.at||0),ms));if(jump&&elapsed<ms)e.y-=Math.sin(Math.PI*elapsed/ms)*.6;}
  if(shot&&elapsed>=shot.at){e.hp=next?.hp||0;e.hitAge=elapsed-shot.at;if(!next){e.visualFrame=e.hitAge<180?6:7;if(e.hitAge>=360)return false;}else if(e.hitAge<120)e.visualFrame=5;}
  return true;
 });
 const birthAt=clip.effects.find(f=>f.kind==='shot'&&f.hit)?.at??0;
 if(elapsed>=birthAt)for(const e of clip.after.enemies)if(!clip.before.enemies.some(old=>old.id===e.id)){const child={...e,visualFrame:0},t=Math.min(1,(elapsed-birthAt)/300);if(e.birthOrigin&&t<1){Object.assign(child,btVisualPosition(e.birthOrigin,e,elapsed-birthAt,300));child.y-=Math.sin(Math.PI*t)*.65;}world.enemies.push(child);}
 return {world,clip,elapsed,hurtAge:world.player.hp<clip.before.player.hp?elapsed-hurtAt:null};
}
function btDrawVisualEffects(view){
 if(!view.clip)return;const c=btCtx,S=BT_CELL,{elapsed}=view;
 for(const f of view.clip.effects){
  if(f.kind==='attack'&&!f.projectile&&elapsed<220){c.save();c.globalAlpha=.5*(1-elapsed/220);c.fillStyle='#ffb46b';for(const p of f.cells)c.fillRect(p.x*S+6,p.y*S+6,S-12,S-12);c.restore();}
  if(f.kind!=='shot'&&!(f.kind==='attack'&&f.projectile))continue;
  for(const to of f.rays||[f.to]){const from=f.from,travel=f.kind==='shot'?f.at:btDistance(from,to)*22/(560*.6)*1000;if(elapsed<travel){
   const p=btVisualPosition(from,to,elapsed,travel),x=p.x*S+40,y=p.y*S+40;
   if(f.kind==='shot')btImage('bullet-'+f.dir+Math.floor(elapsed/70)%3,x-12*S/22,y-10.6*S/22,24*S/22,21.2*S/22);
   else{c.save();c.translate(x,y);c.rotate(Math.atan2(to.y-from.y,to.x-from.x));btImage('remote',-4.4*S/22,-5*S/22,8.8*S/22,10*S/22);c.restore();}
  }else if(elapsed<travel+250){
   const frame=Math.min(3,Math.floor((elapsed-travel)/250*4)),scale=f.kind==='shot'?2:1,key=(f.kind==='shot'?!f.hit:!f.hitPlayer)?'expire'+Math.min(1,Math.floor(frame/2)):'impact'+frame;
   btImage(key,to.x*S+40-5*scale*S/22,to.y*S+40-7.5*scale*S/22,10*scale*S/22,15*scale*S/22);
  }}
 }
 c.font='bold 18px Microsoft YaHei UI';c.textAlign='center';
 for(const e of view.world.enemies)if(e.hitAge>=0&&e.hitAge<650){c.fillStyle='#ffda69';c.fillText('-1',e.x*S+40,e.y*S+10-e.hitAge*.055);}
 if(view.hurtAge!==null&&view.hurtAge>=0&&view.hurtAge<650){c.fillStyle='#ff8f86';c.fillText('-'+(view.clip.before.player.hp-view.clip.after.player.hp),view.world.player.x*S+40,view.world.player.y*S+5-view.hurtAge*.055);}
}
