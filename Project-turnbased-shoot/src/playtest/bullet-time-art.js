// 固定状态帧与棋盘特效只影响表现，不改变战斗规则。
const btTimeArt={active:false,enter:null,release:null};
function btSetTimeState(active,now=performance.now()){
 if(active===btTimeArt.active)return;
 btTimeArt.active=active;
 if(active){btTimeArt.enter={at:now};btTimeArt.release=null;}
 else{btTimeArt.release={at:now,x:360,y:280};btTimeArt.enter=null;}
}
function btArtState(e,view){
 if(!['fixed','big','small','bomber','charger','x','cross'].includes(e.kind))return null;
 const sheet={fixed:'turret',big:'slime',small:'slime',bomber:'bomber',charger:'charger',x:'x',cross:'cross'}[e.kind];
 if(e.hp<=0)return 'unit-effects-destroy';
 const attack=view.clip?.effects.find(f=>f.kind==='attack'&&f.id===e.id),old=view.clip?.before.enemies.find(m=>m.id===e.id),next=view.clip?.after.enemies.find(m=>m.id===e.id);
 if((e.kind==='x'||e.kind==='cross')&&old&&next&&btDistance(old,next)>0&&view.elapsed<400)return 'unit-'+sheet+'-jump';
 if(attack&&view.elapsed<240){if(e.kind==='fixed'||e.kind==='x'||e.kind==='cross')return 'unit-'+sheet+'-shoot';if(e.kind==='big'||e.kind==='small')return 'unit-slime-charge';}
 if(e.phase==='locked'&&(e.kind==='big'||e.kind==='small'||e.kind==='bomber'))return 'unit-'+sheet+'-ready';
 return 'unit-'+sheet+'-idle';
}
function btDrawTimeField(view){
 const now=performance.now(),image=btImages['time-freeze-board'];if(!image)return;
 const active=btTimeArt.active,enter=btTimeArt.enter,r=btTimeArt.release;
 if(!active&&!r)return;
 const surface=btTimeArt.surface||(btTimeArt.surface=document.createElement('canvas'));
 if(surface.width!==720||surface.height!==560){surface.width=720;surface.height=560;}
 const paint=surface.getContext('2d');paint.clearRect(0,0,720,560);paint.globalCompositeOperation='source-over';paint.globalAlpha=1;
 if(active){
  const t=enter?Math.min(1,(now-enter.at)/360):1;
  // 首帧即有基础覆盖，较重的一层从中心柔和向外展开。
  btCtx.save();btCtx.globalAlpha=.25;btCtx.drawImage(image,0,0,720,560);btCtx.restore();
  paint.globalAlpha=.5;paint.drawImage(image,0,0,720,560);
  if(t<1){const outer=Math.max(1,t*(Math.hypot(360,280)+150)),inner=Math.max(0,outer-150),mask=paint.createRadialGradient(360,280,inner,360,280,outer);mask.addColorStop(0,'rgba(0,0,0,1)');mask.addColorStop(1,'rgba(0,0,0,0)');paint.globalCompositeOperation='destination-in';paint.globalAlpha=1;paint.fillStyle=mask;paint.fillRect(0,0,720,560);}else btTimeArt.enter=null;
 }else{
  const t=Math.max(0,(now-r.at)/320);if(t>=1){btTimeArt.release=null;return;}
  // .25与.5两层合成的最终透明度为.625，解除从相同强度连续开始。
  paint.globalAlpha=.625*(1-t*.65);paint.drawImage(image,0,0,720,560);
  if(t>0){const outer=t*(Math.hypot(360,280)+180),inner=Math.max(0,outer-180),mask=paint.createRadialGradient(360,280,inner,360,280,Math.max(inner+1,outer));mask.addColorStop(0,'rgba(0,0,0,1)');mask.addColorStop(1,'rgba(0,0,0,0)');paint.globalAlpha=1;paint.globalCompositeOperation='destination-out';paint.fillStyle=mask;paint.fillRect(0,0,720,560);}
 }
 paint.globalCompositeOperation='source-over';paint.globalAlpha=1;btCtx.drawImage(surface,0,0);
}
// 复用角色帧与爆炸资源，只为真正触发奖励的那次移动播放。
// 独立于输入锁定，短暂残影与光爆可在下一行动开始后自然消散。
function btDrawDodgeEffects(now=performance.now()){
 const c=btCtx,S=BT_CELL;
 for(const clip of [btPlayback.queue[0],...btPlayback.tails]){
  if(!clip||clip.type!=='move'||clip.after.dodges<=clip.before.dodges)continue;
  const elapsed=now-(clip.start??now),ms=btMoveMs(clip.before.player,clip.voluntaryEnd);
  if(elapsed<0)continue;
  if(elapsed<ms+360){
   c.save();c.globalCompositeOperation='screen';c.filter='brightness(1.8)';
   // 沿路径留下固定残影，每道先短暂停留再淡出，移动完成后仍可看见。
   for(let i=5;i>=1;i--){const sample=ms*(5-i)/5,age=elapsed-sample;if(age<0||age>=360)continue;
    const p=btVisualPosition(clip.before.player,clip.voluntaryEnd,sample,ms);
    c.globalAlpha=.68*(1-Math.max(0,age-80)/280);
    btImage('hero-'+clip.dir+'-move'+(1+Math.min(2,Math.floor(sample/50))),p.x*S+40-19.8*S/22,p.y*S+40-24*S/22,39.6*S/22,41.8*S/22);
   }
   c.restore();
  }
  if(elapsed<260){
   const t=elapsed/260,size=S*(.9+1.6*t),p=clip.before.player;
   c.save();c.globalCompositeOperation='screen';c.globalAlpha=Math.pow(1-t,1.2);c.filter='hue-rotate(155deg) saturate(.7) brightness(1.8)';
   btImage('unit-effects-blast',p.x*S+40-size/2,p.y*S+28-size/2,size,size);c.restore();
  }
 }
}
function btDrawUnitEffects(view){
 const c=btCtx,S=BT_CELL;
 for(const e of view.world.enemies){
  const attack=view.clip?.effects.find(f=>f.kind==='attack'&&f.id===e.id),art=btArtState(e,view);
  if(e.kind==='charger'&&attack&&view.elapsed<400){const angle=Math.atan2(e.direction?.dy||0,e.direction?.dx||1);c.save();c.translate(e.x*S+40,e.y*S+40);c.rotate(angle);btImage('unit-effects-charge',-110,-30,120,60);c.restore();}
  // 正式版约定：怪物格内偏右上，使用原感叹号资源。
  if(e.phase==='locked'&&e.hp>0&&!attack)btImage('alert',e.x*S+40+3.2*S/22,e.y*S+40-10.4*S/22,5.6*S/22,8.8*S/22);
 }
 for(const f of view.clip?.effects||[])if(f.kind==='attack'&&f.enemyKind==='bomber'&&view.elapsed<360){const size=BT_CELL*3;btImage('unit-effects-blast',f.from.x*S+40-size/2,f.from.y*S+40-size/2,size,size);}
}
