// 正式版单步表现：规则立即生效，输入只等实际动作到位，余效独立消散。
const stepVisualEvents=[],stepTimeFx={active:false,enter:null,release:null};
const stepDetonateBombBase = detonateBomb;
function stepDetonateBomb(bomb,affected,{source=null}={}) {
 const cells = stepDetonateBombBase(bomb,affected,{terrainFirst:true,source});
 stepVisualEvents.push({type:'bomb-blast',col:bomb.col,row:bomb.row,cells,directional:!!affected&&!source,at:performance.now()});
 return cells;
}
detonateBomb=stepDetonateBomb;
const stepDrawBombsBase = drawBombs;
drawBombs = function() {
 stepDrawBombsBase();
 const now = performance.now();
 for (const event of stepVisualEvents) {
  const age = now-event.at;
  if (event.type !== 'bomb-blast' || age < 0 || age >= 480 || !event.cells.length) continue;
  const alpha = Math.min(1,(480-age)/300);
  const tiles = event.cells.map(({col,row}) => cellRect(col,row));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#f77b2666';
  ctx.strokeStyle = '#ffcd86b3';
  ctx.lineWidth = .8;
  for (const tile of tiles) {
   ctx.fillRect(tile.xL,tile.yT,tile.w,tile.h);
   ctx.strokeRect(tile.xL+.5,tile.yT+.5,tile.w-1,tile.h-1);
  }
  if (!event.directional) {
   const {cx,cy} = cellRect(event.col,event.row), size = CELL*3;
   ctx.beginPath();
   for (const tile of tiles) ctx.rect(tile.xL,tile.yT,tile.w,tile.h);
   ctx.clip();
   scrapDraw('unit-effects-blast',cx-size/2,cy-size/2,size,size,alpha);
  }
  ctx.restore();
 }
};
let stepInputUntil=0;
function stepSetTimeEffect(active,now=performance.now()){
 if(active===stepTimeFx.active)return;stepTimeFx.active=active;
 if(active){stepTimeFx.enter={at:now};stepTimeFx.release=null;}else{stepTimeFx.enter=null;stepTimeFx.release={at:now};}
}
const stepResetOriginal=singleStepReset;
singleStepReset=function(){stepResetOriginal();stepInputUntil=0;stepVisualEvents.length=0;stepTimeFx.active=false;stepTimeFx.enter=null;stepTimeFx.release=null;};
function singleStepInputAction(type,dir){
 const freeMove=type==='move'&&!hasMonstersAlive()&&!SINGLE_STEP.bonus;
 if(freeMove){
  const remaining=Math.hypot((player.targetPx??player.px)-player.px,(player.targetPy??player.py)-player.py);
  if(remaining>CELL*.5)return false;
 }else if(performance.now()<stepInputUntil||player.targetPx!==null||monsters.some(m=>m._visualPath?.length||m._stepJump))return false;
 return singleStepAct(type,dir);
}
const stepActOriginal=singleStepAct;
singleStepAct=function(type,dir){
 const now=performance.now(),room=currentRoomId,old={col:player.col,row:player.row,px:player.px,py:player.py},bonus=SINGLE_STEP.bonus,shots=SINGLE_STEP.shots.length,eventStart=stepVisualEvents.length;
 const positions=new Map(monsters.map(m=>[m.id,{col:m.col,row:m.row}]));
 const accepted=stepActOriginal(type,dir);if(!accepted||room!==currentRoomId||transition?.active)return accepted;
 const moveSpeed=singleStepMoveSpeed();
 let duration=type==='move'?CELL/moveSpeed*1000:100;
 const newShots=SINGLE_STEP.shots.slice(shots),events=stepVisualEvents.slice(eventStart);
 const delay=newShots.find(s=>s.player)?.travel||0,hitTimes=new Map();
 for(const s of newShots)duration=Math.max(duration,s.start-now+s.travel);
 for(const e of events)if(e.type==='weapon-hit')hitTimes.set(e.id,Math.min(hitTimes.get(e.id)??Infinity,e.at));
 for(const m of monsters){
  const hitAt=hitTimes.get(m.id),wait=hitAt!==undefined?Math.max(0,hitAt-now):!positions.has(m.id)?delay:0;
  if(hitAt!==undefined){m._stepMoveAfter=hitAt;m._stepHitAt=hitAt;if(m._stepAction)m._stepAction.at+=wait;}
  if(m._stepJump){m._stepJump.at+=wait;duration=Math.max(duration,m._stepJump.duration+wait);}
  else{let previous=positions.get(m.id)||{col:m.col,row:m.row},distance=0;for(const p of m._visualPath||[]){distance+=Math.hypot(p.col-previous.col,p.row-previous.row)*CELL;previous=p;}duration=Math.max(duration,wait+distance/MONSTER_ANIM_SPEED*1000);}
 }
 duration=Math.max(duration,Math.hypot((player.targetPx??player.px)-player.px,(player.targetPy??player.py)-player.py)/moveSpeed*1000);
 for(const e of events)if(e.type==='death'&&!e.weaponHit)e.at+=delay;
 for(const e of events)if(e.type==='hurt'){
  const shot=newShots.find(s=>!s.player&&s.owner===e.attackerId),target=gridToPixel(e.col,e.row);
  if(shot)e.at=shot.start+Math.hypot(target.x-shot.from.x,target.y-shot.from.y)/(CFG.BULLET_SPEED*.6)*1000;
  else{const m=monsters.find(m=>m.id===e.attackerId),a=m?._stepAction;
   if(m?._stepJump?.burrow)e.at=m._stepJump.at+m._stepJump.duration*.65;
   else if(a?.type==='charge')e.at=a.at+Math.hypot(e.col-a.from.col,e.row-a.from.row)*CELL/MONSTER_ANIM_SPEED*1000;
  }
 }
 stepInputUntil=now+duration;
 stepSetTimeEffect(SINGLE_STEP.bonus>0,now);
 if(type==='move'&&!bonus&&SINGLE_STEP.bonus>0)stepVisualEvents.push({type:'dodge',at:now,from:old,to:{col:old.col+DIR_VEC[dir].dx,row:old.row+DIR_VEC[dir].dy},dir,duration:CELL/moveSpeed*1000});
 return accepted;
};
// 跳跃使用固定腾空帧与抛物线，不沿长路径逐格走动。
const stepAnimateOriginal=animateMonsters;
animateMonsters=function(dt){
 const now=performance.now(),jumpers=monsters.filter(m=>m._stepJump),saved=monsters;
 try{monsters=monsters.filter(m=>!m._stepJump&&!(m._stepMoveAfter>now));stepAnimateOriginal(dt);}finally{monsters=saved;}
 for(const m of jumpers){const j=m._stepJump,t=Math.max(0,Math.min(1,(now-j.at)/j.duration)),a=gridToPixel(j.from.col,j.from.row),b=gridToPixel(j.to.col,j.to.row);if(j.burrow){
  const p=t<.5?a:b;m.px=p.x;m.py=p.y;
 }else{m.px=a.x+(b.x-a.x)*t;m.py=a.y+(b.y-a.y)*t-Math.sin(Math.PI*t)*CELL*.65;}if(t>=1)delete m._stepJump;}
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
drawItemsOnGround = function() {
  ctx.save();
  ctx.font = 'bold 6px "Microsoft YaHei UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const item of itemsOnGround) {
    const {cx, cy, w} = cellRect(item.col, item.row);
    const lines = item.name.match(/.{1,3}/gu);
    const width = w - 2, height = lines.length * 6 + 2;
    const x = cx - width / 2, y = cy - height / 2;
    ctx.fillStyle = '#122d37';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#68929b';
    ctx.lineWidth = .65;
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = '#f1f8f9';
    lines.forEach((line, index) => ctx.fillText(line, cx, y + 4 + index * 6, width - 2));
    const slot = getShopSlotAt(item.col,item.row);
    if (slot && item.col === player.col && item.row === player.row && playerResources.coins < slot.price) {
      ctx.fillStyle = '#ffb17b';
      ctx.fillText('金币不足',cx,y-3);
    }
  }
  ctx.restore();
};
const stepTilesOriginal=drawTiles;
drawTiles=function(){stepTilesOriginal();stepDrawTimeField();};
scrapCoveredMonster=function(m){return !!stepEnemyDefinition(m);};
function stepMonsterArt(m,now,ready=!!singleStepAttackPreview(m)){
 const kind=m.cfgId.replace('step_',''),sheet={fixed:'turret',big:'slime',small:'slime',bomber:'bomber',charger:'charger',x:'x',cross:'cross'}[kind];if(!sheet)return null;
 const action=m._stepAction,acting=action&&now>=action.at&&now-action.at<240;
 if(m._stepJump&&(kind==='x'||kind==='cross'))return 'unit-'+sheet+'-jump';
 if(acting&&['shot','fan'].includes(action.type))return 'unit-'+sheet+'-shoot';
 if(acting&&action.type==='charge'&&['big','small'].includes(kind))return 'unit-slime-charge';
 if(ready&&['big','small','bomber'].includes(kind))return 'unit-'+sheet+'-ready';
 return 'unit-'+sheet+'-idle';
}
function stepPoisonAlpha(m, now) {
 const age = now - m.weaponPoisonFlashAt;
 if(age >= 0 && age < 160) return .72 - age / 160 * .46;
 return m.weaponPoison?.appliedAt <= now ? .26 : 0;
}
const stepPoisonMasks = new Map();
function stepDrawMonsterSprite(key,x,y,w,h,alpha) {
 scrapDraw(key,x,y,w,h);
 const image = scrapImages[key];
 if(!alpha || !image?.complete || !image.naturalWidth) return;
 let mask = stepPoisonMasks.get(key);
 if(!mask) {
  mask = document.createElement('canvas');
  mask.width = image.naturalWidth;
  mask.height = image.naturalHeight;
  const paint = mask.getContext('2d');
  paint.drawImage(image,0,0);
  paint.globalCompositeOperation = 'source-in';
  paint.fillStyle = '#68e742';
  paint.fillRect(0,0,mask.width,mask.height);
  stepPoisonMasks.set(key,mask);
 }
 ctx.save();
 ctx.globalAlpha *= alpha;
 ctx.drawImage(mask,x,y,w,h);
 ctx.restore();
}
const stepStaticMonsterOriginal = drawStaticWorldMonster;
drawStaticWorldMonster = function(m,x,y,size,scale) {
 const poison = m.jumperVanished ? 0 : stepPoisonAlpha(m,performance.now());
 return stepStaticMonsterOriginal(m,x,y,size,scale,
  (key,sx,sy,w,h) => stepDrawMonsterSprite(key,sx,sy,w,h,poison));
};
drawMonsters=function(){
 scrapDrawLegacyMonsters();const now=performance.now(),threats=[];
 for(const m of monsters){
  const ready=!!singleStepAttackPreview(m);
  if(ready)threats.push(m);
  if(SINGLE_STEP.bonus&&arenaEffects.avoided.has(m.id)){
   const p=project(m.px,m.py), radius=CELL*(m.size||1)*.37;
   ctx.save();ctx.strokeStyle='#7ae7ec';ctx.lineWidth=1;
   ctx.beginPath();ctx.ellipse(p.x,p.y+3,radius,radius*.52,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if(!stepEnemyDefinition(m))continue;
  const p=project(m.px,m.py),key=stepMonsterArt(m,now,ready),action=m._stepAction;
  const poison=stepPoisonAlpha(m,now);
  if(key){const size=CELL*(m.cfgId==='step_small'?.55:m.cfgId==='step_big'?1.05:.95),shake=m.cfgId==='step_charger'&&ready&&!SINGLE_STEP.bonus?Math.sin(now*.09)*CELL*.025:0;stepDrawMonsterSprite(key,p.x-size/2+shake,p.y-size*.66,size,size,poison);}
  else{const kind=stepEnemyDefinition(m)?.sprite==='ranged'||m.cfgId==='step_mobile'?'ranged':'melee';let frame=SINGLE_STEP.bonus?0:Math.floor(now/180)%3;if(action&&now>=action.at&&now-action.at<240&&['shot','strike'].includes(action.type))frame=3+Math.min(1,Math.floor((now-action.at)/120));if(!(m._stepHitAt>now)&&(m.hitFlash>0||now-m._stepHitAt<120))frame=5;if(!stepTestHooks.drawArenaMonster?.(m,p,now,kind,poison))stepDrawMonsterSprite(kind+frame,p.x-30,p.y-38,60,68,poison);}
  if(m.cfgId==='step_charger'&&action?.type==='charge'&&now>=action.at&&now-action.at<400){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(action.dir.dy,action.dir.dx));scrapDraw('unit-effects-charge',-CELL*1.375,-CELL*.375,CELL*1.5,CELL*.75);ctx.restore();}
  drawMonsterHealthPreview(m,p.x-10,p.y+10,20,3);
  if(m.weaponPoison?.appliedAt<=now){
   ctx.save();ctx.fillStyle='#9bea74';ctx.font='bold 12px sans-serif';ctx.textAlign='center';
   ctx.fillText('毒 '+m.weaponPoison.steps,p.x,p.y-20);ctx.restore();
  }
 }
 for(const m of monsters)if(m.arenaParasite&&!m.jumperVanished)arenaDrawParasite(m);
 if(STEP_SPIKE_CYCLE[SINGLE_STEP.spikeTurn]==='warning'){
  for(let col=0;col<COLS;col++)for(let row=0;row<ROWS;row++){
   if(singleStepSpikeAt(col,row)!=='warning')continue;
   const q=cellRect(col,row);
   scrapDraw('alert',q.xR-6,q.yT+1,5.6,8.8);
  }
 }
 for(const m of threats){const p=project(m.px,m.py);scrapDraw('alert',p.x+3.2,p.y-10.4,5.6,8.8);}
 for(const e of stepVisualEvents){const age=now-e.at;if(e.type==='death'&&age<360){const p=project(e.x,e.y),kind=stepEnemyDefinition(e)?.sprite||(e.cfgId==='step_mobile'?'ranged':e.cfgId==='step_fighter'?'melee':null);
   if(age<0){const m={cfgId:e.cfgId},key=stepMonsterArt(m,now);if(key){const size=CELL*(e.cfgId==='step_small'?.55:e.cfgId==='step_big'?1.05:.95);scrapDraw(key,p.x-size/2,p.y-size*.66,size,size);}else scrapDraw(kind+'0',p.x-30,p.y-38,60,68);}
   else if(kind)scrapDraw(kind+(age<180?6:7),p.x-30,p.y-38,60,68);
   else scrapDraw('unit-effects-destroy',p.x-CELL*.6,p.y-CELL*.792,CELL*1.2,CELL*1.2);
  }else if(e.type==='blast'&&age>=0&&age<360){const q=gridToPixel(e.col,e.row),p=project(q.x,q.y);scrapDraw('unit-effects-blast',p.x-CELL*1.5,p.y-CELL*1.5,CELL*3,CELL*3);}
 }
};
function stepDrawDodge(now=performance.now()){
 for(const e of stepVisualEvents){if(e.type!=='dodge')continue;const age=now-e.at,ms=e.duration,a=gridToPixel(e.from.col,e.from.row),b=gridToPixel(e.to.col,e.to.row);
  if(age<ms+360){ctx.save();ctx.globalCompositeOperation='screen';ctx.filter='brightness(1.8)';for(let i=5;i>=1;i--){const sample=ms*(5-i)/5,life=age-sample;if(life<0||life>=360)continue;const t=sample/ms,p=project(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);scrapDraw('hero-'+e.dir+'-move'+(1+Math.min(2,Math.floor(sample/50))),p.x-19.8,p.y-24,39.6,41.8,.68*(1-Math.max(0,life-80)/280));}ctx.restore();}
  if(age>=0&&age<260){const t=age/260,size=CELL*(.9+1.6*t),p=project(a.x,a.y-CELL*.15);ctx.save();ctx.globalCompositeOperation='screen';ctx.filter='hue-rotate(155deg) saturate(.7) brightness(1.8)';scrapDraw('unit-effects-blast',p.x-size/2,p.y-size/2,size,size,Math.pow(1-t,1.2));ctx.restore();}
 }
}
const stepPlayerOriginal=drawPlayer;
function stepDrawChargeRing() {
 const trajectory = equippedWeaponTrial('trajectory');
 if (playerStats.hp <= 0 || (trajectory !== 'burstCharge' && trajectory !== 'heavyCharge')) return;
 const {col,row} = pixelToGrid(player.px,player.py);
 const tile = cellRect(col,row), radius = 2;
 const cx = tile.xR-3.5, cy = tile.yT+3.5;
 const top = -Math.PI/2;
 ctx.save();
 ctx.lineWidth = 1;
 ctx.strokeStyle = '#15303b';
 ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
 if (SINGLE_STEP.weaponCharge > 0) {
  ctx.strokeStyle = '#78efff';
  ctx.beginPath();ctx.arc(cx,cy,radius,top,top+Math.PI*2*SINGLE_STEP.weaponCharge/3);ctx.stroke();
 }
 ctx.restore();
}
drawPlayer=function(){
 stepDrawDodge();const now=performance.now(),hurt=stepVisualEvents.filter(e=>e.type==='hurt').at(-1),flash=player.hitFlash;
 if(SINGLE_STEP.bonus&&SINGLE_STEP.echo){
  const q=gridToPixel(SINGLE_STEP.echo.col,SINGLE_STEP.echo.row),p=project(q.x,q.y);
  scrapDraw('hero-'+player.facing+'-move1',p.x-19.8,p.y-24,39.6,41.8,.38);
 }
 // 规则即时扣血，受击帧等弹体或冲锋画面到达后播放；不延长输入锁定。
 if(hurt)player.hitFlash=now>=hurt.at&&now<hurt.at+240?1:0;
 const recoil=stepVisualEvents.findLast(e=>e.type==='unstable-recoil');
 const age=recoil ? now-recoil.at : -1;
 const shake=age>=0&&age<165 ? Math.sin(age*.15)*(1-age/165)*2.4 : 0;
 ctx.save();
 try{ctx.translate(shake,0);stepPlayerOriginal();}finally{ctx.restore();player.hitFlash=flash;}
 stepDrawChargeRing();
 for(let i=stepVisualEvents.length-1;i>=0;i--)if(now-stepVisualEvents[i].at>1000)stepVisualEvents.splice(i,1);
};
// 受伤导致的提前解除同样立即反馈，不等本次动画结束。
const stepDamagePlayerOriginal=damagePlayer;
damagePlayer=function(amount,id){
 const hp=playerStats.hp+(playerResources.blueHearts||0);stepDamagePlayerOriginal(amount,id);
 if(playerStats.hp+(playerResources.blueHearts||0)<hp){stepSetTimeEffect(false);stepVisualEvents.push({type:'hurt',attackerId:id,col:player.col,row:player.row,at:performance.now()});}
};
