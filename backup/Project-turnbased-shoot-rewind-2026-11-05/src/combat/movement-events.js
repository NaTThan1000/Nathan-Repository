// 规则与动画抵达节点之间的同步桥：顺序释放伤害、挤出、近战表现。
let movementPlanning=false,movementEventMonsterId=null,movementEventStep=0,movementEvents=[];
function scheduleMovementEvent(event){movementEvents.push({...event,actorId:movementEventMonsterId,step:movementEventStep,ready:false});}
function releaseMovementEvents(actorId,step){
 for(const event of movementEvents)if(event.actorId===actorId&&event.step<=step)event.ready=true;
 while(movementEvents.length&&movementEvents[0].ready){const event=movementEvents.shift();
  if(event.type==='hit')damagePlayer(event.amount,event.attackerId);
  else if(event.type==='push'){player.targetPx=event.x;player.targetPy=event.y;player.animTime=0;forcedLandingPending=true;}
  else if(event.type==='melee'){const m=monsters.find(x=>x.id===event.monsterId);if(m){m.meleeFlash=0.25;m.meleeDir={dx:event.dx,dy:event.dy};}}
 }
}
