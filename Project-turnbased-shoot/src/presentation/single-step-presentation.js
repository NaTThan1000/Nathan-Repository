// 正式版单步表现：规则立即生效，输入只等实际动作到位，余效独立消散。
const stepVisualEvents=[],stepTimeFx={active:false,enter:null,release:null};
let stepInputUntil=0;
function stepSetTimeEffect(active,now=performance.now()){
 if(active===stepTimeFx.active)return;stepTimeFx.active=active;
 if(active){stepTimeFx.enter={at:now};stepTimeFx.release=null;}else{stepTimeFx.enter=null;stepTimeFx.release={at:now};}
}
const stepResetOriginal=singleStepReset;
singleStepReset=function(){stepResetOriginal();stepInputUntil=0;stepVisualEvents.length=0;stepTimeFx.active=false;stepTimeFx.enter=null;stepTimeFx.release=null;};
function singleStepInputAction(type,dir){
 if(performance.now()<stepInputUntil||player.targetPx!==null||monsters.some(m=>m._visualPath?.length||m._stepJump))return false;
 return singleStepAct(type,dir);
}
const stepActOriginal=singleStepAct;
singleStepAct=function(type,dir){
 const now=performance.now(),room=currentRoomId,old={col:player.col,row:player.row,px:player.px,py:player.py},bonus=SINGLE_STEP.bonus,shots=SINGLE_STEP.shots.length,eventStart=stepVisualEvents.length;
 const positions=new Map(monsters.map(m=>[m.id,{col:m.col,row:m.row}]));
 const accepted=stepActOriginal(type,dir);if(!accepted||room!==currentRoomId||transition?.active)return accepted;
 let duration=type==='move'?CELL/CFG.EXEC_MOVE_SPEED*1000:100;
 const ownShot=SINGLE_STEP.shots.slice(shots).find(s=>s.player),delay=ownShot?.travel||0;
 for(const s of SINGLE_STEP.shots.slice(shots))duration=Math.max(duration,s.travel);
 for(const m of monsters){
  const hit=ownShot?.hitIds.includes(m.id),wait=hit||!positions.has(m.id)?delay:0;
  if(hit){m._stepMoveAfter=now+delay;m._stepHitAt=now+delay;if(m._stepAction)m._stepAction.at+=delay;}
  if(m._stepJump){m._stepJump.at+=wait;duration=Math.max(duration,m._stepJump.duration+wait);}
  else{let previous=positions.get(m.id)||{col:m.col,row:m.row},distance=0;for(const p of m._visualPath||[]){distance+=Math.hypot(p.col-previous.col,p.row-previous.row)*CELL;previous=p;}duration=Math.max(duration,wait+distance/MONSTER_ANIM_SPEED*1000);}
 }
 duration=Math.max(duration,Math.hypot((player.targetPx??player.px)-player.px,(player.targetPy??player.py)-player.py)/CFG.EXEC_MOVE_SPEED*1000);
 for(const e of stepVisualEvents.slice(eventStart))if(e.type==='death')e.at+=delay;
 for(const e of stepVisualEvents.slice(eventStart))if(e.type==='hurt'){
  const shot=SINGLE_STEP.shots.slice(shots).find(s=>!s.player&&s.owner===e.attackerId),target=gridToPixel(e.col,e.row);
  if(shot)e.at=shot.start+Math.hypot(target.x-shot.from.x,target.y-shot.from.y)/(CFG.BULLET_SPEED*.6)*1000;
  else{const m=monsters.find(m=>m.id===e.attackerId),a=m?._stepAction;if(a?.type==='charge')e.at=a.at+Math.hypot(e.col-a.from.col,e.row-a.from.row)*CELL/MONSTER_ANIM_SPEED*1000;}
 }
 stepInputUntil=now+duration;
 stepSetTimeEffect(SINGLE_STEP.bonus>0,now);
 if(type==='move'&&!bonus&&SINGLE_STEP.bonus>0)stepVisualEvents.push({type:'dodge',at:now,from:old,to:{col:old.col+DIR_VEC[dir].dx,row:old.row+DIR_VEC[dir].dy},dir,duration:CELL/CFG.EXEC_MOVE_SPEED*1000});
 return accepted;
};
// 跳跃使用固定腾空帧与抛物线，不沿长路径逐格走动。
const stepAnimateOriginal=animateMonsters;
animateMonsters=function(dt){
 const now=performance.now(),jumpers=monsters.filter(m=>m._stepJump),saved=monsters;
 try{monsters=monsters.filter(m=>!m._stepJump&&!(m._stepMoveAfter>now));stepAnimateOriginal(dt);}finally{monsters=saved;}
 for(const m of jumpers){const j=m._stepJump,t=Math.max(0,Math.min(1,(now-j.at)/j.duration)),a=gridToPixel(j.from.col,j.from.row),b=gridToPixel(j.to.col,j.to.row);m.px=a.x+(b.x-a.x)*t;m.py=a.y+(b.y-a.y)*t-Math.sin(Math.PI*t)*CELL*.65;if(t>=1)delete m._stepJump;}
};
function stepDrawTimeField(now=performance.now()){
 const image=scrapImages['time-freeze-board'],fx=stepTimeFx;if(!image?.complete||!fx.active&&!fx.release)return;
 const w=FLOOR_R-FLOOR_L,h=FLOOR_B-FLOOR_T,cx=w/2,cy=h/2,surface=fx.surface||(fx.surface=document.createElement('canvas'));
 if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;}
 const c=surface.getContext('2d');c.clearRect(0,0,w,h);c.globalCompositeOperation='source-over';c.globalAlpha=1;
 if(fx.active){
  const t=fx.enter?Math.min(1,(now-fx.enter.at)/360):1;
  ctx.save();ctx.globalAlpha=.25;ctx.drawImage(image,FLOOR_L,FLOOR_T,w,h);ctx.restore();c.globalAlpha=.5;c.drawImage(image,0,0,w,h);
  if(t<1){const feather=w*150/720,outer=Math.max(.01,t*(Math.hypot(cx,cy)+feather)),inner=Math.max(0,outer-feather),g=c.createRadialGradient(cx,cy,inner,cx,cy,outer);g.addColorStop(0,'#000');g.addColorStop(1,'#0000');c.globalAlpha=1;c.globalCompositeOperation='destination-in';c.fillStyle=g;c.fillRect(0,0,w,h);}else fx.enter=null;
 }else{
  const t=Math.max(0,(now-fx.release.at)/320);if(t>=1){fx.release=null;return;}
  c.globalAlpha=.625*(1-t*.65);c.drawImage(image,0,0,w,h);
  if(t>0){const feather=w*180/720,outer=t*(Math.hypot(cx,cy)+feather),inner=Math.max(0,outer-feather),g=c.createRadialGradient(cx,cy,inner,cx,cy,Math.max(inner+.01,outer));g.addColorStop(0,'#000');g.addColorStop(1,'#0000');c.globalAlpha=1;c.globalCompositeOperation='destination-out';c.fillStyle=g;c.fillRect(0,0,w,h);}
 }
 c.globalAlpha=1;c.globalCompositeOperation='source-over';ctx.drawImage(surface,FLOOR_L,FLOOR_T);
}
const stepTilesOriginal=drawTiles;
drawTiles=function(){stepTilesOriginal();stepDrawTimeField();};
scrapCoveredMonster=function(m){return !!stepEnemyDefinition(m);};
function stepMonsterArt(m,now){
 const kind=m.cfgId.replace('step_',''),sheet={fixed:'turret',big:'slime',small:'slime',bomber:'bomber',charger:'charger',x:'x',cross:'cross'}[kind];if(!sheet)return null;
 const action=m._stepAction,acting=action&&now>=action.at&&now-action.at<240,p=SINGLE_STEP.plans.get(m.id);
 if(m._stepJump&&(kind==='x'||kind==='cross'))return 'unit-'+sheet+'-jump';
 if(acting&&['shot','fan'].includes(action.type))return 'unit-'+sheet+'-shoot';
 if(acting&&action.type==='charge'&&['big','small'].includes(kind))return 'unit-slime-charge';
 if(p?.cells.length&&['big','small','bomber'].includes(kind))return 'unit-'+sheet+'-ready';
 return 'unit-'+sheet+'-idle';
}
drawMonsters=function(){
 scrapDrawLegacyMonsters();const now=performance.now();
 for(const m of monsters){const d=stepEnemyDefinition(m);if(!d)continue;const p=project(m.px,m.py),key=stepMonsterArt(m,now),action=m._stepAction,plan=SINGLE_STEP.plans.get(m.id);
  if(key){const size=CELL*(m.cfgId==='step_small'?.55:m.cfgId==='step_big'?1.05:.95),shake=m.cfgId==='step_charger'&&plan?.cells.length&&!SINGLE_STEP.bonus?Math.sin(now*.09)*CELL*.025:0;scrapDraw(key,p.x-size/2+shake,p.y-size*.66,size,size);}
  else{const kind=m.cfgId==='step_mobile'?'ranged':'melee';let frame=SINGLE_STEP.bonus?0:Math.floor(now/180)%3;if(action&&now>=action.at&&now-action.at<240&&['shot','strike'].includes(action.type))frame=3+Math.min(1,Math.floor((now-action.at)/120));if(!(m._stepHitAt>now)&&(m.hitFlash>0||now-m._stepHitAt<120))frame=5;scrapDraw(kind+frame,p.x-30,p.y-38,60,68);}
  if(m.cfgId==='step_charger'&&action?.type==='charge'&&now>=action.at&&now-action.at<400){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(action.dir.dy,action.dir.dx));scrapDraw('unit-effects-charge',-CELL*1.375,-CELL*.375,CELL*1.5,CELL*.75);ctx.restore();}
  drawMonsterHealthPreview(m,p.x-10,p.y+10,20,3);
 }
 // 所有准备攻击的单位（含Boss）均显示正式版约定位置的感叹号。
 for(const m of monsters)if(SINGLE_STEP.plans.get(m.id)?.cells.length&&!m.jumperVanished){const p=project(m.px,m.py);scrapDraw('alert',p.x+3.2,p.y-10.4,5.6,8.8);}
 for(const e of stepVisualEvents){const age=now-e.at;if(e.type==='death'&&age<360){const p=project(e.x,e.y),kind=e.cfgId==='step_mobile'?'ranged':e.cfgId==='step_fighter'?'melee':null;
   if(age<0){const m={cfgId:e.cfgId},key=stepMonsterArt(m,now);if(key){const size=CELL*(e.cfgId==='step_small'?.55:e.cfgId==='step_big'?1.05:.95);scrapDraw(key,p.x-size/2,p.y-size*.66,size,size);}else scrapDraw(kind+'0',p.x-30,p.y-38,60,68);}
   else if(kind)scrapDraw(kind+(age<180?6:7),p.x-30,p.y-38,60,68);
   else scrapDraw('unit-effects-destroy',p.x-CELL*.6,p.y-CELL*.792,CELL*1.2,CELL*1.2);
  }else if(e.type==='blast'&&age>=0&&age<360){const q=gridToPixel(e.col,e.row),p=project(q.x,q.y);scrapDraw('unit-effects-blast',p.x-CELL*1.5,p.y-CELL*1.5,CELL*3,CELL*3);}
 }
};
const stepDangerOriginal=drawDangerOverlay;
drawDangerOverlay=function(){stepDangerOriginal();if(!gameStarted||worldMapOpen)return;for(const m of monsters){const p=SINGLE_STEP.plans.get(m.id);if(stepEnemyDefinition(m)&&!p?.jump)for(const cell of p?.path||[]){const q=cellRect(cell.col,cell.row);scrapDraw('blueGrid',q.xL,q.yT,q.w,q.h,.28);}}};
function stepDrawDodge(now=performance.now()){
 for(const e of stepVisualEvents){if(e.type!=='dodge')continue;const age=now-e.at,ms=e.duration,a=gridToPixel(e.from.col,e.from.row),b=gridToPixel(e.to.col,e.to.row);
  if(age<ms+360){ctx.save();ctx.globalCompositeOperation='screen';ctx.filter='brightness(1.8)';for(let i=5;i>=1;i--){const sample=ms*(5-i)/5,life=age-sample;if(life<0||life>=360)continue;const t=sample/ms,p=project(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);scrapDraw('hero-'+e.dir+'-move'+(1+Math.min(2,Math.floor(sample/50))),p.x-19.8,p.y-24,39.6,41.8,.68*(1-Math.max(0,life-80)/280));}ctx.restore();}
  if(age>=0&&age<260){const t=age/260,size=CELL*(.9+1.6*t),p=project(a.x,a.y-CELL*.15);ctx.save();ctx.globalCompositeOperation='screen';ctx.filter='hue-rotate(155deg) saturate(.7) brightness(1.8)';scrapDraw('unit-effects-blast',p.x-size/2,p.y-size/2,size,size,Math.pow(1-t,1.2));ctx.restore();}
 }
}
const stepPlayerOriginal=drawPlayer;
drawPlayer=function(){
 stepDrawDodge();const now=performance.now(),hurt=stepVisualEvents.filter(e=>e.type==='hurt').at(-1),flash=player.hitFlash;
 // 规则即时扣血，受击帧等弹体或冲锋画面到达后播放；不延长输入锁定。
 if(hurt)player.hitFlash=now>=hurt.at&&now<hurt.at+240?1:0;
 try{stepPlayerOriginal();}finally{player.hitFlash=flash;}
 for(let i=stepVisualEvents.length-1;i>=0;i--)if(now-stepVisualEvents[i].at>1000)stepVisualEvents.splice(i,1);
};
// 受伤导致的提前解除同样立即反馈，不等本次动画结束。
const stepDamagePlayerOriginal=damagePlayer;
damagePlayer=function(amount,id){
 const hp=playerStats.hp+(playerResources.blueHearts||0);stepDamagePlayerOriginal(amount,id);
 if(playerStats.hp+(playerResources.blueHearts||0)<hp){stepSetTimeEffect(false);stepVisualEvents.push({type:'hurt',attackerId:id,col:player.col,row:player.row,at:performance.now()});}
};
