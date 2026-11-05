// 规则与表现的接线层：先保持原调用顺序，再记录视觉通知。
// 预测器仍序列化 scrapOriginalResolve / scrapOriginalMonsterBullet，不包含本层。
const scrapOriginalShatter=shatterBullet;
shatterBullet=function(b,reason){b.scrapEndEffect=reason||(b.distTraveled>=b.maxDist?'expire':'impact');return scrapOriginalShatter(b)};
const scrapOriginalHitTile=hitTile;
hitTile=function(c,r,dmg){const td=tileData[c+','+r];const crate=td?.type==='poop',old=td?.hp;const result=scrapOriginalHitTile(c,r,dmg);if(crate&&old>0&&!tileData[c+','+r])scrapEffects.crateBroken(c,r);return result};
const scrapOriginalDamageMonster=damageMonster;
damageMonster=function(m,dmg){const x=m.px,y=m.py,type=m.cfgId==='flying_eye_i'?'ranged':'melee';scrapOriginalDamageMonster(m,dmg);if(m.hp<=0&&scrapCoveredMonster(m)&&!actionHistoryActive())scrapEffects.monsterDied(x,y,type);};
const scrapOriginalMonsterBullet=spawnMonsterBullet;
spawnMonsterBullet=function(dir,x,y,range,owner){scrapEffects.monsterActed(owner);const result=scrapOriginalMonsterBullet(dir,x,y,range,owner);if(scrapCoveredMonster(monsters.find(m=>m.id===owner)))bullets[bullets.length-1].scrapCovered=true;return result};
const scrapOriginalResolve=resolveAfterEffects;
resolveAfterEffects=function(action,options){if(action?.type==='chase'&&options?.monster)scrapEffects.monsterActed(options.monster.id);return scrapOriginalResolve(action,options)};
