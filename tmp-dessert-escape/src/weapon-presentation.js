// Weapon art is independent of the body atlas. Indices refer to the weapon sheet.
const weaponSheet=new Image();
let weaponRects=[];
const WEAPON_LOOK={
  fork:{index:0,length:.57},knife:{index:1,length:.43},spoon:{index:2,length:.60},straw:{index:3,length:.68},
  dual:{index:1,length:.48,off:0},halberd:{index:4,length:.89},lance:{index:3,length:.91},
  breaker:{index:5,length:.73},chain:{index:6,length:.76},gauntlet:{index:7,length:.31,off:7},
};
weaponSheet.onload=()=>{
  weaponRects=readSpriteFrames(weaponSheet,4,2,8,188,5);
  // The gauntlet cell contains a pair. Use one gauntlet per hand.
  if(weaponRects[7])weaponRects[7].w=Math.floor(weaponRects[7].w*.48);
};
weaponSheet.src=WEAPON_URL;

function drawWeaponArt(index,x,y,length,angle,opacity=1){
  const rect=weaponRects[index];
  if(!rect)return;
  const width=rect.w/rect.h*length,grip=index===7?.57:.83;
  ctx.save();
  ctx.globalAlpha*=opacity;
  ctx.translate(x,y);ctx.rotate(angle);
  ctx.drawImage(weaponSheet,rect.x,rect.y,rect.w,rect.h,-width*.5,-length*grip,width,length);
  ctx.restore();
}
function drawHeldWeapon(kit,hand,offHand,size,angle){
  const weapon=WEAPON_LOOK[kit];
  if(!weapon)return;
  if(weapon.off!==undefined&&offHand)
    drawWeaponArt(weapon.off,offHand.x,offHand.y,size*(kit==='gauntlet'?.29:.45),angle-.68);
  drawWeaponArt(weapon.index,hand.x,hand.y,size*weapon.length,angle);
}
