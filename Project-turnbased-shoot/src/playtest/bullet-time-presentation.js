// 只播放已经结算的行动，不调用规则、不抽随机数、不推进战场。
// 时长、比例、帧序沿用正式版：CELL22、移动170px/s、玩家弹560px/s、怪物弹0.6倍。
const btPlayback={queue:[],settled:null,running:false};
function btSnapshot(){return structuredClone({player:bt.player,enemies:bt.enemies,walls:bt.walls,bonus:bt.bonus,step:bt.step,message:bt.message,dodges:bt.dodges,hits:bt.hits,shots:bt.shots});}
const btDistance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const btMoveMs=(a,b)=>btDistance(a,b)*22/170*1000;
function btVisualReset(){btPlayback.queue=[];btPlayback.settled=btSnapshot();btVisualRun();}
function btVisualEnqueue(before,type,dir){
 const after=btSnapshot(),effects=structuredClone(bt.fx),pushes=structuredClone(bt.visualPushes||[]);
 let duration=type==='move'?btMoveMs(before.player,bt.voluntaryEnd):400;
 for(const f of effects){
  f.at=f.kind==='shot'?btDistance(f.from,f.to)*22/560*1000:0;
  if(f.kind==='attack'){
   const e=before.enemies.find(e=>e.id===f.id);f.from={x:e.x,y:e.y};f.to=f.hitPlayer?f.hitPosition:f.cells.at(-1)||f.from;f.enemyKind=e.kind;f.direction=e.direction;
   f.at=e.kind==='ranged'?btDistance(f.from,f.to)*22/(560*.6)*1000:btMoveMs(f.from,after.enemies.find(m=>m.id===e.id)||f.from);
  }
  duration=Math.max(duration,f.at+(f.kind==='shot'&&f.hit?360:250));
 }
 for(const e of before.enemies){const next=after.enemies.find(m=>m.id===e.id),shot=effects.find(f=>f.kind==='shot'&&f.target===e.id);if(next)duration=Math.max(duration,(shot?.at||0)+btMoveMs(e,next));}
 for(const p of pushes){p.at=p.progress*22/170*1000;duration=Math.max(duration,p.at+btMoveMs(p.from,p.to));}
 btPlayback.queue.push({before,after,effects,pushes,type,dir,duration,start:null,voluntaryEnd:{...bt.voluntaryEnd}});btVisualRun();
}
function btVisualRun(){if(btPlayback.running)return;btPlayback.running=true;requestAnimationFrame(btVisualTick);}
function btVisualTick(now){
 const q=btPlayback.queue;
 if(q.length){if(q[0].start===null)q[0].start=now;while(q.length&&now-q[0].start>=q[0].duration){const end=q[0].start+q[0].duration;btPlayback.settled=q.shift().after;if(q.length)q[0].start=end;}}
 btDraw();requestAnimationFrame(btVisualTick);
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
  const next=clip.after.enemies.find(m=>m.id===e.id),shot=clip.effects.find(f=>f.kind==='shot'&&f.target===e.id);
  e.visualFrame=clip.before.bonus?0:Math.floor(now/180)%3;
  const attack=clip.effects.find(f=>f.kind==='attack'&&f.id===e.id);if(attack&&elapsed<240)e.visualFrame=3+Math.min(1,Math.floor(elapsed/120));
  if(next)Object.assign(e,btVisualPosition(e,next,elapsed-(shot?.at||0),btMoveMs(e,next)));
  if(shot&&elapsed>=shot.at){e.hp=next?.hp||0;e.hitAge=elapsed-shot.at;if(!next){e.visualFrame=e.hitAge<180?6:7;if(e.hitAge>=360)return false;}else if(e.hitAge<120)e.visualFrame=5;}
  return true;
 });
 return {world,clip,elapsed,hurtAge:world.player.hp<clip.before.player.hp?elapsed-hurtAt:null};
}
function btDrawVisualEffects(view){
 if(!view.clip)return;const c=btCtx,S=BT_CELL,{elapsed}=view;
 for(const f of view.clip.effects){
  if(f.kind!=='shot'&&!(f.kind==='attack'&&f.enemyKind==='ranged'))continue;
  const from=f.from,to=f.to,travel=f.at;if(elapsed<travel){
   const p=btVisualPosition(from,to,elapsed,travel),x=p.x*S+40,y=p.y*S+40;
   if(f.kind==='shot')btImage('bullet-'+f.dir+Math.floor(elapsed/70)%3,x-12*S/22,y-10.6*S/22,24*S/22,21.2*S/22);
   else{c.save();c.translate(x,y);c.rotate(Math.atan2(f.direction.dy,f.direction.dx));btImage('remote',-4.4*S/22,-5*S/22,8.8*S/22,10*S/22);c.restore();}
  }else if(elapsed<travel+250){
   const frame=Math.min(3,Math.floor((elapsed-travel)/250*4)),scale=f.kind==='shot'?2:1,key=(f.kind==='shot'?!f.hit:!f.hitPlayer)?'expire'+Math.min(1,Math.floor(frame/2)):'impact'+frame;
   btImage(key,to.x*S+40-5*scale*S/22,to.y*S+40-7.5*scale*S/22,10*scale*S/22,15*scale*S/22);
  }
 }
 c.font='bold 18px Microsoft YaHei UI';c.textAlign='center';
 for(const e of view.world.enemies)if(e.hitAge>=0&&e.hitAge<650){c.fillStyle='#ffda69';c.fillText('-1',e.x*S+40,e.y*S+10-e.hitAge*.055);}
 if(view.hurtAge!==null&&view.hurtAge>=0&&view.hurtAge<650){c.fillStyle='#ff8f86';c.fillText('-'+(view.clip.before.player.hp-view.clip.after.player.hp),view.world.player.x*S+40,view.world.player.y*S+5-view.hurtAge*.055);}
}
