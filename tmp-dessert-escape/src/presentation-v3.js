// Orthographic three-quarter projection: floor depth is compressed; actors remain upright.
const DEPTH=.49,heroSheet=new Image(),moveSheet=new Image(),attackSheet=new Image(),fusionSheet=new Image();
const stageArt=STAGE_URLS.map(src=>{const art=new Image();art.src=src;return art});
let heroRects=[],moveRects=[],attackRects=[],fusionRects=[],armoryCursor=0;
stageArt[0].onload=()=>{const title=$('title');title.style.backgroundImage='linear-gradient(90deg,#171426f7 5%,#21182bd9 48%,#21182ba6),url("'+STAGE_URLS[0]+'")';title.style.backgroundSize='cover';title.style.backgroundPosition='center'};
function readSpriteFrames(sheet,cols,rows,count,threshold=80,padding=0){
  const tmp=document.createElement('canvas');
  tmp.width=sheet.naturalWidth;tmp.height=sheet.naturalHeight;
  const c=tmp.getContext('2d',{willReadFrequently:true});
  c.drawImage(sheet,0,0);
  const {data}=c.getImageData(0,0,tmp.width,tmp.height);
  const frames=[],cell=tmp.height/rows;
  for(let i=0;i<count;i++){
    const col=i%cols,row=Math.floor(i/cols);
    const ox=Math.floor(col*tmp.width/cols),oy=Math.floor(row*cell);
    const width=Math.floor((col+1)*tmp.width/cols)-ox,height=Math.floor((row+1)*cell)-oy;
    let left=width,right=-1,top=height,bottom=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      if(data[((oy+y)*tmp.width+ox+x)*4+3]<=threshold)continue;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    if(right<left||bottom<top)continue;
    const x=Math.max(0,left-padding),y=Math.max(0,top-padding);
    frames[i]={x:ox+x,y:oy+y,w:Math.min(width,right+1+padding)-x,h:Math.min(height,bottom+1+padding)-y,cell};
  }
  return frames;
}
heroSheet.onload=()=>{heroRects=readSpriteFrames(heroSheet,4,4,16)};
moveSheet.onload=()=>{moveRects=readSpriteFrames(moveSheet,4,4,16)};
attackSheet.onload=()=>{attackRects=readSpriteFrames(attackSheet,4,4,16)};
heroSheet.src=HERO_URL;
moveSheet.src=MOVE_URL;
attackSheet.src=ATTACK_URL;
/*__WEAPON_PRESENTATION__*/
fusionSheet.onload=()=>{
  const tmp=document.createElement('canvas');
  tmp.width=fusionSheet.naturalWidth;tmp.height=fusionSheet.naturalHeight;
  const c=tmp.getContext('2d',{willReadFrequently:true});
  c.drawImage(fusionSheet,0,0);
  const {data}=c.getImageData(0,0,tmp.width,tmp.height);
  const cw=tmp.width/2,ch=tmp.height/2;
  for(let i=0;i<3;i++){
    const ox=i%2*cw,oy=Math.floor(i/2)*ch;
    let left=cw,right=0,top=ch,bottom=0;
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
      if(data[((oy+y)*tmp.width+ox+x)*4+3]<190)continue;
      left=Math.min(left,x);right=Math.max(right,x);
      top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    if(left>=right||top>=bottom)continue;
    const sx=Math.max(0,left-7),sy=Math.max(0,top-7);
    const w=Math.min(cw,right+8)-sx,h=Math.min(ch,bottom+8)-sy;
    fusionRects[i]={x:ox+sx,y:oy+sy,w,h};
  }
};
fusionSheet.src=FUSION_URL;
const FUSION_ART={medic:0,'01':0,chef:1,'02':1,engineer:2,'12':2};
const SKILLS={
 fork:{name:'银翼 · 破晓贯刺',hint:'L 向前贯穿一条直线',icon:'✦'},knife:{name:'弦月 · 回身切',hint:'L 踏步斩开前方',icon:'☽'},spoon:{name:'瓷月 · 坠星',hint:'L 震退身边的怪物',icon:'◒'},straw:{name:'回音 · 伸缩棍',hint:'L 将前方敌人勾回',icon:'⌁'},
 dual:{name:'蔷薇十字 · 千层裁决',hint:'J → J → L：挂切痕，再交叉引爆',icon:'✕'},halberd:{name:'翻宴星坠',hint:'L：先勾拢，再召下巨戟',icon:'♆'},lance:{name:'薄荷鲸落',hint:'J 标记 → L 虹吸：拉回敌人并恢复生命',icon:'◈'},breaker:{name:'布丁断头台',hint:'J 碎甲 → L：巨勺震地，压制怪群',icon:'▰'},chain:{name:'银河糖丝',hint:'L：旋转链刃，把周围敌人卷到身边',icon:'∞'},gauntlet:{name:'苏打升龙',hint:'L：吸气聚怪，再用气泡拳打飞',icon:'✺'},
 silver:{name:'银翼 · 天幕裁断',hint:'J 大剑连斩 / L 跃斩震地',icon:'✦'},chef:{name:'灶火 · 翻天宴',hint:'J 横抡 / L 翻锅焰击',icon:'♨'},medic:{name:'白瓷 · 圣域反震',hint:'L 架盾 → 再按 L → 命中后治疗',icon:'♜'},engineer:{name:'磁轨 · 星索',hint:'J 布索 → L 引爆标记',icon:'⌁'},
 '01':{name:'白瓷圣域 · 守望之翼',hint:'L 架盾 → 挡住近战 → L 命中后治疗',icon:'♜'},'02':{name:'熔炉盛宴 · 天降餐锤',hint:'L 蓄力 → 巨锤砸地 → 烈焰封锁落点',icon:'♨'},'12':{name:'星河缝合 · 万象归席',hint:'J 布索 → L 拉拢并引爆，印记消耗',icon:'✧'},
};
function skillInfo(key){return SKILLS[key]||SKILLS.fork}
function highlightArmory(){
  const cards=$('formCards').children;
  for(const [i,card] of Array.from(cards).entries())card.classList.toggle('kbd-selected',i===armoryCursor);
  cards[armoryCursor]?.scrollIntoView({block:'nearest'});
}
function announceSkill(a){const info=skillInfo(a.kit);s.skillBanner={name:a.combo?COMBO_FOLLOW[a.combo].name:a.aerial?'落斩':a.riposte?'反震':info.name,sub:'',color:currentKit().color,t:1.35};}
function zoom(){return clamp(W/1280,.76,1.08)}
function project(x,y,z=0){const k=zoom();return{x:W*.5+(x-s.p.x)*k,y:H*.625+(y-s.p.y)*DEPTH*k-z*k}}
function ellipse(x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function circle(x,y,r,fill,stroke){ellipse(x,y,r,r,fill,stroke)}
function glow(x,y,r,color,alpha=.7){ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.25,color+'aa');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore()}
function star(x,y,r,color,rotation=0,thin=.18){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*thin:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.restore()}
function sprite(c,index,x,y,size,flip=false,alpha=1,rotation=0,squash=1){c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(rotation);c.scale(flip?-1:1,squash);if(atlas.complete&&atlas.naturalWidth){const cw=atlas.naturalWidth/4,ch=atlas.naturalHeight/4;c.drawImage(atlas,index%4*cw,Math.floor(index/4)*ch,cw,ch,-size*.5,-size*.5,size,size)}c.restore()}
function motionPose(p){
  const a=p.action;
  if(p.hurtAnim>0)return 8+Math.min(3,Math.floor((.24-p.hurtAnim)/.06));
  if(a?.dive){
    if(!a.fired)return a.elapsed<.045?12:13;
    return a.elapsed<a.wind+a.active?14:15;
  }
  if(p.rollAnim>0&&(!a||p.dash>0)){
    if(p.rollAnim>.235)return 4;
    if(p.rollAnim>.155)return 5;
    return p.rollAnim>.09?6:7;
  }
  if(!a&&p.z>0){
    if(p.z<13&&p.vz>0)return 0;
    return p.vz>150?1:2;
  }
  return !a&&p.landAnim>0?3:null;
}
// Fist centers in the authored 1254px body atlas. The second pair is the off hand.
const ATTACK_GRIPS=[
  [211,191,102,194],[473,165,518,191],[879,139,820,189],[1155,191,1085,193],
  [208,501,140,499],[567,471,460,490],[902,473,771,510],[1160,510,1111,493],
  [197,689,225,706],[499,823,528,827],[812,863,842,860],[1142,813,1074,814],
  [144,993,203,1093],[520,1157,413,1114],[768,1222,798,1193],[1140,1167,1086,1155],
];
const WEAPON_ANGLES=[
  [-.95,.88,2.13,.65],[.87,1.38,1.55,.64],[-.52,1.54,2.15,.60],[-.42,1.45,2.33,.63],
];
function attackPose(action){
  if(!action)return null;
  if(action.dive){
    if(!action.fired)return action.elapsed<.045?12:13;
    return action.elapsed-action.impactAt<action.active?14:15;
  }
  if(action.followUp){
    if(action.followUp.impact!==undefined)return action.elapsed-action.followUp.impact<.11?10:11;
    return action.elapsed-action.followUp.elapsed<.10?2:8;
  }
  if(action.kind==='heavy'&&action.kit==='halberd')
    return action.elapsed<action.wind*.55?0:1;
  const thrust=['fork','straw','lance'].includes(action.kit)||action.kit==='dual'&&action.chain===2;
  const row=action.combo==='gauntlet'?1:action.combo==='chain'||action.combo==='halberd'||action.combo==='dual'?0:
    action.kind==='heavy'?(thrust?1:2):thrust?1:action.chain===3?2:0;
  if(!action.fired)return row*4+(action.elapsed<action.wind*.65?0:1);
  if(action.elapsed-action.impactAt<action.active)return row*4+2;
  return row*4+3;
}
function drawBodyFrame(sheet,rect,scale){
  ctx.drawImage(sheet,rect.x,rect.y,rect.w,rect.h,-rect.w*scale*.5,-rect.h*scale,rect.w*scale,rect.h*scale);
}
function drawHero(p,screen,alpha=1){
  const k=zoom(),a=p.action,motion=motionPose(p);
  const attack=attackPose(a),attackRect=attack===null?null:attackRects[attack];
  const moveRect=motion===null||motion>=12?null:moveRects[motion];
  const movement=p.moving||p.dash>0;
  const baseIndex=movement?4+Math.floor(s.total*12)%4:Math.floor(s.total*3)%4;
  const rect=attackRect||moveRect||heroRects[baseIndex],sheet=attackRect?attackSheet:moveRect?moveSheet:heroSheet;
  const size=(s.ult>0?151:136)*k;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(screen.x,screen.y-(p.z||0)*k);
  ctx.scale(p.face<0?-1:1,1);
  if(s.ult>0)drawFusionSprite(p,size);
  else if(rect){
    const scale=size/(rect.cell*.91);
    drawBodyFrame(sheet,rect,scale);
    if(attackRect){
      const unit=attackSheet.naturalWidth/1254,grip=ATTACK_GRIPS[attack];
      const at=(x,y)=>({x:(x*unit-rect.x-rect.w*.5)*scale,y:(y*unit-rect.y-rect.h)*scale});
      const hand=at(grip[0],grip[1]),off=at(grip[2],grip[3]);
      let angle=WEAPON_ANGLES[Math.floor(attack/4)][attack%4];
      if(a.kind==='light'&&a.chain===2&&Math.floor(attack/4)===0)angle-=.63;
      drawHeldWeapon(a.kit,hand,off,size,angle);
      // Keep the fist in front of the grip.
      ctx.save();ctx.beginPath();ctx.arc(hand.x,hand.y,size*.036,0,TAU);ctx.clip();drawBodyFrame(sheet,rect,scale);ctx.restore();
    }else if(!moveRect){
      drawHeldWeapon(s.form,{x:size*.21,y:-size*.39},{x:-size*.2,y:-size*.39},size,.65);
    }
  }else sprite(ctx,0,0,-size*.46,size,false,1);
  ctx.restore();
  if(s.ult>0){
    const col=fusion().color;
    ctx.save();ctx.globalAlpha=.65;
    ellipse(screen.x,screen.y+2,50*k,14*k,p.guard>0?col+'33':'transparent',col);
    ctx.restore();
  }
  if(a&&a.elapsed<a.wind){
    const charge=a.elapsed/Math.max(.01,a.wind);
    glow(screen.x+p.face*31*k,screen.y-65*k,(a.kind==='heavy'?22+charge*15:22)*k,currentKit().color,.25+charge*.25);
  }
}
function drawFusionSprite(p,size){
  const key=s.fusionKey,rect=fusionRects[FUSION_ART[key]];
  ctx.shadowColor=fusion().color;
  ctx.shadowBlur=12;
  if(!rect){
    const cw=atlas.naturalWidth/4,ch=atlas.naturalHeight/4;
    if(cw)ctx.drawImage(atlas,3*cw,3*ch,cw,ch,-size*.52,-size,size*1.04,size*1.04);
    return;
  }
  const height=size*(fusion().style==='hammer'?1.02:.94),width=rect.w/rect.h*height;
  const lean=p.action?(p.action.fired?.12:-.06):p.moving?.05:0;
  ctx.rotate(lean);
  const bob=p.moving?Math.abs(Math.sin(s.total*17))*3:0;
  ctx.drawImage(fusionSheet,rect.x,rect.y,rect.w,rect.h,-width*.5,-height-bob,width,height);
}
function groundRing(x,y,r,color,progress=1,thick=2){const pt=project(x,y),k=zoom();ctx.save();ctx.lineWidth=thick;ellipse(pt.x,pt.y,r*k,r*DEPTH*k,null,color);if(progress<1){ctx.beginPath();ctx.ellipse(pt.x,pt.y,r*k*progress,r*DEPTH*k*progress,0,0,TAU);ctx.stroke()}ctx.restore()}
function drawStage(){const k=zoom(),art=stageArt[s.stage];ctx.fillStyle='#30212d';ctx.fillRect(0,0,W,H);if(art.complete&&art.naturalWidth){const px=(s.p.x-1150)*.045,py=(s.p.y-1150)*.012;ctx.drawImage(art,-60-px,-30-py,W+120,H+70)}
 const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#140d25b8');shade.addColorStop(.38,'#241b3022');shade.addColorStop(.7,'#18152222');shade.addColorStop(1,'#100e23bb');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
 // Ground ornaments move with the actual world, unlike the slower distant architecture.
 ctx.save();ctx.beginPath();ctx.rect(0,H*.36,W,H*.64);ctx.clip();for(let i=0;i<44;i++){const wx=(i*419+91)%WORLD,wy=(i*677+120)%WORLD,pt=project(wx,wy);if(pt.x<-70||pt.x>W+70||pt.y<H*.38||pt.y>H+50)continue;ctx.save();ctx.translate(pt.x,pt.y);ctx.scale(k,k*DEPTH);ctx.rotate(i*1.7);ctx.fillStyle=['#d3b88a44','#f2c0c044','#a9e1cb44'][i%3];ctx.beginPath();ctx.ellipse(0,0,10+i%3*5,5,0,0,TAU);ctx.fill();ctx.strokeStyle='#6c3d4433';ctx.lineWidth=2;ctx.stroke();ctx.restore()}
 for(let side of [30,WORLD-30]){const a=project(side,0),b=project(side,WORLD);ctx.strokeStyle='#edcb9f88';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}ctx.restore();
 // Atmospheric sugar motes remain sparse, leaving attack silhouettes readable.
 for(let i=0;i<20;i++){const x=(i*153.3+s.total*7)%W,y=H*.2+((i*81+s.total*(8+i%3))%(H*.7));star(x,y,1.5+(i%2),'#ffe5c455',s.total*.1)}
}
function drawThreatPath(path,color,progress,armored){
  ctx.fillStyle=color+(progress===1?'55':'28');
  ctx.fill(path);
  ctx.lineJoin='round';
  ctx.lineWidth=5;
  ctx.strokeStyle='#201529dd';
  ctx.stroke(path);
  ctx.lineWidth=2.5;
  ctx.strokeStyle=color;
  if(armored&&progress<1)ctx.setLineDash([9,5]);
  ctx.stroke(path);
  ctx.setLineDash([]);
}
function drawTelegraph(e){
  if(!e.attack||!['windup','active'].includes(e.state)||e.attack.hit)return;
  const at=e.attack,progress=e.state==='windup'?clamp(1-e.timer/at.wind,0,1):1;
  const color=e.armored?'#ffba76':'#9bffdc',k=zoom(),pt=project(e.x,e.y);
  const outline=new Path2D(),fill=new Path2D(),padding=23;
  ctx.save();
  if(at.kind==='lob'){
    const target=project(at.targetX,at.targetY);
    ctx.translate(target.x,target.y);
    ctx.scale(k,k*DEPTH);
    outline.arc(0,0,at.r,0,TAU);
    fill.arc(0,0,at.r*progress,0,TAU);
  }else{
    ctx.translate(pt.x,pt.y);
    ctx.scale(k,k*DEPTH);
    ctx.rotate(at.a);
    if(at.kind==='rush'){
      const runTime=e.state==='windup'?at.active:Math.max(0,e.timer);
      const length=runTime*(e.boss?620:400)+at.r+padding;
      const halfWidth=(e.boss?50:30)+padding;
      outline.roundRect(-padding,-halfWidth,length+padding,2*halfWidth,halfWidth*.65);
      fill.rect(0,-halfWidth,length*progress,2*halfWidth);
    }else{
      const radius=at.r+padding,width=Math.min(Math.PI,at.width+padding/radius);
      for(const [path,r] of [[outline,radius],[fill,radius*progress]]){
        if(width<Math.PI)path.moveTo(0,0);
        path.arc(0,0,r,-width,width);
        path.closePath();
      }
    }
  }
  drawThreatPath(outline,color,progress,e.armored);
  if(progress<1){
    ctx.save();
    ctx.clip(outline);
    ctx.fillStyle=color+(progress>.82?'88':'55');
    ctx.fill(fill);
    ctx.restore();
  }
  ctx.restore();
}
function drawAttackLabel(e){
  if(e.state!=='windup'||!e.attack)return;
  const at=e.attack,p=project(e.x,e.y),k=zoom();
  const label=at.kind==='rush'?'◆ 冲锋 · 闪避':e.armored?'◆ 震地 · 跳跃 / 闪避':e.boss?'横扫 · 闪避':at.kind==='lob'?'落点 · 可打断':'可打断';
  const y=p.y-(e.boss?174:90)*k;
  ctx.save();
  ctx.font='700 12px Microsoft YaHei';
  ctx.textAlign='center';
  ctx.fillStyle='#211729ee';
  const width=ctx.measureText(label).width+16;
  ctx.beginPath();
  ctx.roundRect(p.x-width/2,y-15,width,22,5);
  ctx.fill();
  ctx.fillStyle=e.armored?'#ffcb8f':'#aaffdf';
  ctx.fillText(label,p.x,y);
  ctx.restore();
}
function drawHazard(z,color){
  const outline=new Path2D();
  outline.arc(0,0,z.r,0,TAU);
  const progress=z.fired?1:clamp(1-(z.t-z.linger)/z.warning,0,1);
  drawThreatPath(outline,color,progress,false);
  if(progress<1){
    const fill=new Path2D();
    fill.arc(0,0,z.r*progress,0,TAU);
    ctx.fillStyle=color+'77';
    ctx.fill(fill);
  }
  if(z.theme==='frost'){
    ctx.lineWidth=3;
    ctx.strokeStyle='#dcf5ff';
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,reach=z.r*(.28+.53*progress);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*8,Math.sin(a)*8);
      ctx.lineTo(Math.cos(a)*reach,Math.sin(a)*reach);
      ctx.stroke();
    }
  }else if(z.theme==='caramel'){
    for(let i=0;i<5;i++){
      const a=i*2.4,x=Math.cos(a)*z.r*.63,y=Math.sin(a)*z.r*.63;
      const pulse=.5+.5*Math.sin(s.total*9+i);
      circle(x,y,3+4*pulse,z.fired?'#ffda99':'#ffaf7a66');
    }
  }
}
function drawZone(z){const p=project(z.x,z.y),k=zoom(),col=z.kind==='enemy'?(z.theme==='frost'?'#a6dcff':z.theme==='caramel'?'#ff9368':'#ff8da8'):z.kind==='fire'?'#ffad70':z.kind==='heal'?'#b5ffe3':'#ffe0a6';ctx.save();ctx.globalAlpha=.75;groundRing(z.x,z.y,z.r,col+'88',1,1.5);ellipse(p.x,p.y,z.r*k,z.r*DEPTH*k,col+'16');
 if(z.kind==='fire'){ctx.globalCompositeOperation='lighter';for(let i=0;i<9;i++){let a=i*2.4,r=z.r*(.3+i%3*.23),x=p.x+Math.cos(a)*r*k,y=p.y+Math.sin(a)*r*DEPTH*k,h=(18+Math.sin(s.total*9+i)*12)*k;ctx.fillStyle=i%2?'#ff6c3766':'#ffda8977';ctx.beginPath();ctx.moveTo(x-8*k,y);ctx.quadraticCurveTo(x-11*k,y-h*.6,x+3*k,y-h);ctx.quadraticCurveTo(x+12*k,y-h*.25,x+8*k,y);ctx.fill()}}
 if(z.kind==='heal'){glow(p.x,p.y-8,z.r*k,'#9fffd2',.15);star(p.x,p.y-17,12*k,'#ddffec')}
 if(z.followAction&&!z.fired){const charge=clamp(1-z.tick/.38,0,1);groundRing(z.x,z.y,z.r*(.18+charge*.82),'#ffe0a5',1,2+charge*2);}
 if(z.kind==='enemy'){ctx.globalAlpha=1;ctx.translate(p.x,p.y);ctx.scale(k,k*DEPTH);drawHazard(z,col)}ctx.restore()}
function drawPickup(item){
  const pt=project(item.x,item.y),k=zoom(),bob=Math.sin(s.total*3+item.x)*4;
  ctx.save();ctx.globalCompositeOperation='lighter';
  glow(pt.x,pt.y-18*k,34*k,'#aaffd3',.24);
  ctx.restore();
  groundRing(item.x,item.y,22,'#baffd380');
  ctx.save();ctx.translate(pt.x,pt.y);
  ctx.fillStyle='#253630ec';ctx.strokeStyle='#baffd3';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(-17*k,-42*k+bob,34*k,34*k,8*k);ctx.fill();ctx.stroke();
  ctx.fillStyle='#c9ffdf';ctx.font='bold '+23*k+'px Segoe UI';ctx.textAlign='center';
  ctx.fillText('✚',0,-17*k+bob);
  ctx.restore();
}
function drawCage(c){const pt=project(c.x,c.y),k=zoom();sprite(ctx,c.ally+1,pt.x,pt.y-43*k,94*k);if(!c.open){ctx.save();ctx.translate(pt.x,pt.y);ctx.strokeStyle=c.flash>0?'#fff8e2':'#edb7c4';ctx.lineWidth=3;ctx.shadowColor='#f5adc8';ctx.shadowBlur=5;ctx.beginPath();ctx.moveTo(-37*k,0);ctx.lineTo(-37*k,-86*k);ctx.quadraticCurveTo(0,-115*k,37*k,-86*k);ctx.lineTo(37*k,0);ctx.closePath();ctx.stroke();for(let i=-24;i<=24;i+=16){ctx.beginPath();ctx.moveTo(i*k,-91*k);ctx.lineTo(i*k,0);ctx.stroke()}ellipse(0,0,37*k,10*k,'#562d4366','#f4bbd5');ctx.shadowBlur=0;ctx.fillStyle='#231e30';ctx.fillRect(-36*k,-113*k,72*k,4);ctx.fillStyle='#f5b5cd';ctx.fillRect(-36*k,-113*k,72*k*c.hp/c.max,4);ctx.restore()}ctx.fillStyle=c.open?'#bcffdf':'#fff0cf';ctx.textAlign='center';ctx.font='11px Microsoft YaHei';ctx.fillText(c.open?'走近加入队伍':SUPPORT[c.ally].role+' · '+SUPPORT[c.ally].hint,pt.x,pt.y+28*k)}
function drawFacing(player,pt,k){
  ctx.save();
  ctx.translate(pt.x,pt.y);
  ctx.scale(k,k*DEPTH);
  ctx.rotate(player.action?.a??player.aim);
  ctx.fillStyle='#fff1c4';
  ctx.strokeStyle='#25192d';
  ctx.lineWidth=2.8;
  ctx.beginPath();
  ctx.moveTo(48,0);ctx.lineTo(33,-9);ctx.lineTo(36,0);ctx.lineTo(33,9);ctx.closePath();
  ctx.stroke();ctx.fill();
  ctx.restore();
}
function drawEnemyMark(e,pt,h,z){
  const color=e.markType==='tether'?'#b8d9ff':e.markType==='siphon'?'#b9ffdc':'#f7b7ff';
  groundRing(e.x,e.y,30,color+'aa',1,2);
  const y=pt.y-h-z-9;
  if(e.markType==='tether'){
    circle(pt.x,y,11,'#211c39ef',color);
    star(pt.x,y,7,color,Math.PI/4);
  }else{
    star(pt.x,y,e.markType==='cut'?9:7,color,Math.PI/4);
  }
}
function drawEntity(e){const k=zoom(),pt=project(e.x,e.y),player=!!e.isPlayer,ally=!!e.isAlly,h=(player?136:ally?84:e.boss?202:e.type===5?111:96)*k,z=(e.z||0)*k;ctx.save();ctx.globalAlpha=.4;ellipse(pt.x+9*k,pt.y+5*k,h*.31,h*.075,'#17101f');ctx.restore();
 if(player){groundRing(e.x,e.y,28,'#a4f8d866');drawHero(e,pt,e.inv>0&&e.dash<=0&&Math.floor(s.total*18)%2?.75:1);drawFacing(e,pt,k);return}
 if(e.mark>0)drawEnemyMark(e,pt,h,z);
 const stagger=e.state==='stagger',wind=e.state==='windup',active=e.state==='active';
 const facing=(s.p.x-e.x)<0?-1:1,windProgress=wind&&e.attack?clamp(1-e.timer/e.attack.wind,0,1):0;
 const recoil=e.flash>0&&!ally?clamp(e.flash/.19,0,1):0;
 const rotation=stagger?Math.sin(e.timer*24)*.06+Math.cos(e.hitAngle||0)*recoil*.13:wind?-facing*windProgress*.14:active?facing*.16:0;
 const squash=wind?1-.12*windProgress:active?1.08:1-recoil*.16;
 const bob=Math.sin((ally?s.total:e.phase)*5)*1.7;
 sprite(ctx,ally?e.type+1:e.boss?e.type:e.type+4,pt.x,pt.y-h*.47-z+bob,h,e.boss?false:(s.p.x-e.x)<0,1,rotation,squash);
 if(e.flash>0){ctx.save();ctx.globalCompositeOperation='screen';sprite(ctx,e.boss?e.type:e.type+4,pt.x,pt.y-h*.47-z,h,e.boss?false:facing<0,recoil*.45,rotation,squash);ctx.restore()}
 if(!ally&&!e.boss&&e.hp<e.max){ctx.fillStyle='#21192c';ctx.fillRect(pt.x-19*k,pt.y-h-7-z,38*k,3);ctx.fillStyle=stagger?'#b5ffe4':'#f4b2cb';ctx.fillRect(pt.x-19*k,pt.y-h-7-z,38*k*e.hp/e.max,3)}
}
// Filled tapered ribbons with a white cutting edge, a colored body and layered afterimages.
function bladeRibbon(x,y,a,r,width,color,progress=1,reverse=false,heavy=false,lift=42){const k=zoom(),pt=project(x,y),sign=reverse?-1:1,start=a-sign*width,end=start+sign*width*2*progress,n=40,points=[];for(let i=0;i<=n;i++){const t=i/n,ang=start+(end-start)*t,rr=r*(.93+.07*Math.sin(t*Math.PI));points.push({x:pt.x+Math.cos(ang)*rr*k,y:pt.y+Math.sin(ang)*rr*DEPTH*k-lift*k-Math.sin(t*Math.PI)*r*.22*k,tx:Math.cos(ang),ty:Math.sin(ang)*DEPTH,t})}
 for(let layer=0;layer<3;layer++){const breadth=(heavy?40:25)*(layer===0?1.6:layer===1?1:.22)*k;ctx.save();ctx.globalAlpha=layer===0?.13:layer===1?.76:1;ctx.fillStyle=layer===2?'#fff9e9':color;ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i],w=Math.sin(Math.PI*p.t)**.65*breadth;ctx.lineTo(p.x+p.tx*w*.35,p.y+p.ty*w*.35)}for(let i=points.length-1;i>=0;i--){const p=points[i],w=Math.sin(Math.PI*p.t)**.65*breadth;ctx.lineTo(p.x-p.tx*w,p.y-p.ty*w)}ctx.closePath();ctx.fill();ctx.restore()}
 ctx.strokeStyle='#fff4dfbb';ctx.lineWidth=1.3;ctx.beginPath();for(const p of points)ctx.lineTo(p.x,p.y);ctx.stroke();const tip=points[points.length-1];star(tip.x,tip.y,heavy?14*k:8*k,'#fff5e2',a,.12);
}
function spearTrail(e,alpha){const k=zoom(),p=project(e.x,e.y),end=project(e.x+Math.cos(e.a)*e.r,e.y+Math.sin(e.a)*e.r),dy=-46*k;ctx.save();ctx.globalCompositeOperation='lighter';const a=Math.atan2(end.y-p.y,end.x-p.x),len=Math.hypot(end.x-p.x,end.y-p.y),g=ctx.createLinearGradient(p.x,p.y,end.x,end.y);g.addColorStop(0,e.color+'00');g.addColorStop(.7,e.color+'aa');g.addColorStop(1,'#fff7de');ctx.translate(p.x,p.y+dy);ctx.rotate(a);ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-15,-2);ctx.lineTo(len-35,-(e.heavy?18:10)*k);ctx.lineTo(len+16*k,0);ctx.lineTo(len-35,(e.heavy?18:10)*k);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff8e8';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(len,0);ctx.stroke();ctx.restore();star(end.x,end.y+dy,17*k*alpha,e.color,e.a);glow(end.x,end.y+dy,35*k,e.color,.3*alpha)}
function groundBurst(e,f){const k=zoom(),p=project(e.x,e.y),r=e.r*k,q=1-f;ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=f*.8;ctx.lineWidth=3+f*5;ellipse(p.x,p.y,r*(.3+.7*q),r*DEPTH*(.3+.7*q),null,e.color);ctx.lineWidth=1;ellipse(p.x,p.y,r*(.45+.7*q),r*DEPTH*(.45+.7*q),null,'#fff0c9');for(let i=0;i<14;i++){const a=i*TAU/14+e.x*.01,d=r*(.4+.6*q),x=p.x+Math.cos(a)*d,y=p.y+Math.sin(a)*d*DEPTH;ctx.strokeStyle=i%2?e.color:'#ffe9c9';ctx.lineWidth=i%3===0?3:1;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*r*.12,p.y+Math.sin(a)*r*.12*DEPTH);ctx.lineTo(x,y);ctx.lineTo(x+Math.cos(a+.45)*15*k,y+Math.sin(a+.45)*15*DEPTH*k);ctx.stroke();if(i%2===0)star(x,y,5*k*f,e.color,a)}glow(p.x,p.y-8*k,r*.6,e.color,.18*f);ctx.restore()}
function giantUtensil(x,y,type,color,scale=1,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.shadowColor=color;ctx.shadowBlur=18;ctx.strokeStyle=color;ctx.fillStyle=color+'bb';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-138);ctx.stroke();if(type==='hammer'){ctx.beginPath();ctx.roundRect(-42,-178,84,48,10);ctx.fill();ctx.strokeStyle='#fff1bd';ctx.lineWidth=2;ctx.stroke()}else if(type==='spoon'){ctx.beginPath();ctx.ellipse(0,-172,32,44,0,0,TAU);ctx.fill();ctx.strokeStyle='#fff6d4';ctx.lineWidth=3;ctx.stroke()}else{ctx.beginPath();ctx.moveTo(-25,-194);ctx.lineTo(-25,-150);ctx.quadraticCurveTo(0,-118,25,-150);ctx.lineTo(25,-194);ctx.moveTo(0,-198);ctx.lineTo(0,-147);ctx.stroke()}ctx.shadowBlur=0;ctx.strokeStyle='#fff5df';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-2,-10);ctx.lineTo(-2,-125);ctx.stroke();ctx.restore()}
function whale(e,f){const p=project(e.x+Math.cos(e.a)*e.r*.45,e.y+Math.sin(e.a)*e.r*.45),k=zoom();ctx.save();ctx.translate(p.x,p.y-78*k);if(Math.cos(e.a)<0)ctx.scale(-1,1);ctx.scale(k,k);ctx.globalAlpha=f*.8;ctx.fillStyle='#97ffdf2a';ctx.strokeStyle='#b5ffe7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-125,10);ctx.bezierCurveTo(-65,-100,90,-75,145,-5);ctx.bezierCurveTo(100,53,-24,48,-80,20);ctx.lineTo(-135,55);ctx.lineTo(-118,10);ctx.lineTo(-151,-17);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(18,27);ctx.quadraticCurveTo(-16,76,-27,27);ctx.stroke();circle(101,-14,4,'#f3fff4');for(let i=0;i<8;i++)star(-130+i*35,Math.sin(i+s.total*4)*20,3,'#c7ffe9',i);ctx.restore()}
function specialHeavy(e,f){const p=project(e.x,e.y),k=zoom(),key=e.kit,q=1-f,col=e.color,center=project(e.x+Math.cos(e.a)*70,e.y+Math.sin(e.a)*70);ctx.save();ctx.globalCompositeOperation='lighter';
 if(key==='dual'){bladeRibbon(e.x,e.y,e.a+.45,e.r*1.13,1.4,col,clamp(q*4,.2,1),false,true,54);bladeRibbon(e.x,e.y,e.a-.45,e.r,1.4,'#ffe6f1',clamp(q*4,.2,1),true,true,55);star(center.x,center.y-55*k,50*k*f,'#ffc6df',Math.PI/4,.06)}
 else if(key==='breaker'||key==='02'||key==='chef'){const type=key==='breaker'?'spoon':key==='02'||key==='chef'?'hammer':'fork',fall=clamp(q*3,0,1);ctx.globalAlpha=f*.85;giantUtensil(center.x,center.y-(1-fall)*130*k,type,col,(key==='02'?1.15:.85)*k,Math.sin(e.a)*.2);groundBurst({...e,x:e.x+Math.cos(e.a)*70,y:e.y+Math.sin(e.a)*70,r:e.r*.8},f);if(key==='02'){for(let i=0;i<7;i++){const x=center.x+(i-3)*30*k,y=center.y+Math.sin(i)*12*k;ctx.fillStyle=i%2?'#ff8c4444':'#ffdd9b88';ctx.beginPath();ctx.moveTo(x-13*k,y);ctx.quadraticCurveTo(x-28*k,y-45*k,x+8*k,y-(80+Math.sin(i)*35)*k*f);ctx.quadraticCurveTo(x+27*k,y-25*k,x+13*k,y);ctx.fill()}}}
 else if(key==='lance'){whale(e,f);spearTrail({...e,r:e.r*1.12,heavy:true},f);for(let i=0;i<9;i++){const d=(i/9+q)%1,pt=project(e.x+Math.cos(e.a)*e.r*d,e.y+Math.sin(e.a)*e.r*d);circle(pt.x,pt.y-35*k-Math.sin(d*Math.PI)*35*k,3+(i%3),'#d8ffed88')}}
 else if(key==='chain'||key==='12'||key==='engineer'){const r=e.r*k,turn=q*TAU*1.4;for(let j=0;j<3;j++){ctx.strokeStyle=j===0?'#fff2ff':col;ctx.globalAlpha=f*(j===0?.8:.45);ctx.lineWidth=j===0?2:5;ctx.beginPath();for(let i=0;i<70;i++){const a=i/69*TAU+turn+j*.4,rr=r*(.55+j*.18),x=p.x+Math.cos(a)*rr,y=p.y+Math.sin(a)*rr*DEPTH-45*k-Math.sin(a*2+turn)*35*k;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}for(let i=0;i<10;i++){const a=i*TAU/10+turn;star(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*DEPTH-45*k,8*k*f,i%2?'#fff2ff':col,a)}if(key==='12'){glow(p.x,p.y-125*k,60*k,col,.25*f);circle(p.x,p.y-125*k,19*k,'#c8dbff33','#e6f1ff');star(p.x,p.y-125*k,25*k,'#e5edff',q)}}
 else if(key==='gauntlet'){ctx.translate(center.x,center.y);ctx.globalAlpha=f*.8;for(let i=0;i<10;i++){const t=i/10,a=t*TAU*2+q*4,x=Math.cos(a)*(15+40*t)*k,y=-t*170*k;circle(x,y,(5+10*t)*k,'#d5faff22',i%2?'#e6fcff':'#a3e9ff')}ctx.strokeStyle='#dcfaff';ctx.lineWidth=8*k;ctx.beginPath();for(let i=0;i<50;i++){const t=i/49,x=Math.sin(t*11+q*5)*35*k,y=-t*170*k;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.fillStyle='#b5efff88';ctx.beginPath();ctx.roundRect(-31*k,-190*k,65*k,55*k,18*k);ctx.fill();ctx.strokeStyle='#efffff';ctx.lineWidth=2;ctx.stroke();for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo((-14+i*15)*k,-190*k);ctx.lineTo((-14+i*15)*k,-168*k);ctx.stroke()}}
 else if(key==='01'||key==='medic'){ctx.globalAlpha=f*.8;ctx.translate(p.x,p.y);const r=155*k;ctx.strokeStyle='#d6ffed';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-20*k,r,r*.78,0,Math.PI,TAU);ctx.stroke();ctx.fillStyle='#b1ffe318';ctx.fill();for(let j=-1;j<=1;j+=2){ctx.beginPath();ctx.moveTo(j*22*k,-58*k);ctx.bezierCurveTo(j*72*k,-150*k,j*120*k,-143*k,j*154*k,-81*k);ctx.bezierCurveTo(j*103*k,-101*k,j*86*k,-25*k,j*22*k,-58*k);ctx.stroke();ctx.fill()}ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,-140*k);ctx.lineTo(0,-70*k);ctx.moveTo(-24*k,-115*k);ctx.lineTo(24*k,-115*k);ctx.stroke();glow(0,-100*k,90*k,'#d7ffdf',.2*f)}
 ctx.restore();}
function drawHitSpark(e,f,point,k){
  const progress=1-f;
  const y=point.y-38*k-(e.z||0)*k;
  const axis=Math.atan2(Math.sin(e.a)*DEPTH,Math.cos(e.a));
  const reach=e.r*k;
  ctx.save();ctx.translate(point.x,y);ctx.rotate(axis);
  ctx.globalCompositeOperation='lighter';
  glow(0,0,reach,e.color,(e.heavy?.35:.2)*f);
  ctx.globalAlpha=f;
  const count=e.heavy?8:4;
  for(let i=0;i<count;i++){
    const spread=(i/(count-1)-.5)*1.75;
    ctx.save();ctx.rotate(spread);
    const distance=reach*(.12+progress*.95)*(i%2?.8:1);
    const length=reach*(e.heavy?.64:.45)*f;
    const width=(e.heavy?5:3)*k*f;
    ctx.fillStyle=i%2?e.color:'#fff1c4';
    ctx.beginPath();ctx.moveTo(distance,-width);ctx.lineTo(distance+length,0);
    ctx.lineTo(distance,width);ctx.lineTo(distance-length*.25,0);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  if(progress<.48)star(0,0,(e.heavy?24:13)*k*f,'#fff8e1',0,.12);
  ctx.restore();
}
function drawHalberdSlam(e,f,k,point){
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  const reach=e.r*k;
  const beam=ctx.createLinearGradient(point.x,point.y-175*k,point.x,point.y);
  beam.addColorStop(0,'#ffeec500');beam.addColorStop(.8,'#ffe19f9c');beam.addColorStop(1,'#fff4d1');
  ctx.globalAlpha=f*.8;ctx.fillStyle=beam;
  ctx.beginPath();ctx.moveTo(point.x-12*k,point.y-175*k);
  ctx.lineTo(point.x+14*k,point.y-175*k);
  ctx.lineTo(point.x+38*k,point.y);ctx.lineTo(point.x-38*k,point.y);ctx.fill();
  ctx.restore();
  groundBurst(e,f);
  if(e.phantom&&f>.4)drawWeaponArt(4,point.x-5*k,point.y-28*k,139*k,2.66,(f-.4)*1.2);
  if(f>.65)star(point.x,point.y-5*k,reach*.32*f,'#fff1c0',.12);
}
function drawCrossHit(e,f,k,point){
  ctx.save();ctx.translate(point.x,point.y-44*k-e.z*k);
  ctx.globalCompositeOperation='lighter';
  const length=e.r*k*(.6+(1-f)*.55);
  for(const angle of [-.6,.6]){
    ctx.save();ctx.rotate(angle);
    ctx.fillStyle=e.color;ctx.globalAlpha=f*.8;
    ctx.beginPath();ctx.moveTo(-length,0);ctx.quadraticCurveTo(0,-13*k*f,length,0);
    ctx.quadraticCurveTo(0,9*k*f,-length,0);ctx.fill();ctx.restore();
  }
  star(0,0,16*k*f,'#fff5df',0,.13);
  ctx.restore();
}
function drawEffects(){for(const e of s.effects){const f=clamp(e.t/e.max,0,1),q=1-f,k=zoom(),p=project(e.x,e.y);ctx.save();ctx.globalAlpha=Math.min(1,f*2);if(e.type==='slash'){ctx.globalCompositeOperation='lighter';bladeRibbon(e.x,e.y,e.a,e.r,e.width||1.2,e.color,clamp(q*4,.15,1),e.reverse,e.heavy);if(e.heavy)specialHeavy(e,f)}else if(e.type==='thrust'){spearTrail(e,f);if(e.heavy)specialHeavy(e,f)}else if(['impact','ring','slam','shield'].includes(e.type)){groundBurst(e,f);if(e.heavy)specialHeavy(e,f);if(e.type==='slam'){ctx.globalAlpha=f*.45;giantUtensil(p.x,p.y-(f*.6)*75*k,'fork',e.color,.65*k)}}else if(e.type==='hitburst'){drawHitSpark(e,f,p,k)}else if(e.type==='crossHit'){drawCrossHit(e,f,k,p)}else if(e.type==='halberdSlam'){drawHalberdSlam(e,f,k,p)}else if(e.type==='link'){const end=project(e.tx,e.ty);ctx.globalCompositeOperation='lighter';ctx.strokeStyle=e.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x,p.y-45*k);ctx.quadraticCurveTo((p.x+end.x)/2,(p.y+end.y)/2-90*k,end.x,end.y-45*k);ctx.stroke();star(end.x,end.y-45*k,10*k*f,'#f8f4ff')}else if(e.type==='ghost'){ctx.globalAlpha=f*.25;drawHero({...s.p,action:null,hurtAnim:0,rollAnim:.2,face:e.face,z:e.z||0},p,.4)}else if(e.type==='defeat'){sprite(ctx,e.index,p.x+Math.cos(e.a)*q*50*k,p.y-45*k-q*70*k,85*k*(.7+.3*f),false,f,e.a*.3+q*.6)}ctx.restore()}
}
function draw(){ctx.setTransform(dpr,0,0,dpr,0,0);if(!s){ctx.fillStyle='#221a2c';ctx.fillRect(0,0,W,H);return}ctx.save();if(s.shake)ctx.translate(rng(-s.shake,s.shake),rng(-s.shake*.6,s.shake*.6));drawStage();for(const z of s.zones)drawZone(z);
 for(const item of s.pickups)drawPickup(item);const visible=s.enemies.filter(e=>{const p=project(e.x,e.y);return p.x>-180&&p.x<W+180&&p.y>-45&&p.y<H+200});for(const e of visible)drawTelegraph(e);
 const joined=s.ult>0?fusionPartners():[];
 const allies=s.training&&s.practice?[]:s.allies.filter(a=>!joined.includes(a.type)).map(a=>({...a,isAlly:true}));
 const entities=[...visible,...allies,...s.cages.filter(c=>!c.rescued).map(c=>({...c,isCage:true})),{...s.p,isPlayer:true}].sort((a,b)=>a.y-b.y);for(const e of entities){if(e.isCage)drawCage(e);else drawEntity(e)}drawEffects();for(const e of visible)drawAttackLabel(e);
 for(const pt of s.particles){const p=project(pt.x,pt.y,20+pt.life*26);ctx.save();ctx.globalAlpha=clamp(pt.life/pt.max,0,1);ctx.globalCompositeOperation='lighter';if(pt.size>4)star(p.x,p.y,pt.size,pt.color,pt.life*4);else{ctx.strokeStyle=pt.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-pt.vx*.025,p.y-pt.vy*.012-4);ctx.stroke()}ctx.restore()}
 for(const t of s.texts){const p=project(t.x,t.y,38);ctx.save();ctx.globalAlpha=Math.min(1,t.t*3);ctx.font='800 '+t.size+'px Microsoft YaHei';ctx.textAlign='center';ctx.strokeStyle='#20172b';ctx.lineWidth=4;ctx.strokeText(t.text,p.x,p.y);ctx.fillStyle=t.color;ctx.fillText(t.text,p.x,p.y);ctx.restore()}ctx.restore();
 for(const cage of s.cages)if(!cage.rescued)drawEdgeMarker(cage,'♡','#b8ffdf');
 if(!s.training&&s.enemies.length===1)drawEdgeMarker(s.enemies[0],'!','#ffc09f',true);
 const banner=s.skillBanner,el=$('skillBanner');if(banner&&banner.t>0){el.style.opacity=String(Math.min(1,banner.t*3));el.style.setProperty('--skill-color',banner.color);$('skillName').textContent=banner.name;$('skillHint').textContent=banner.sub}else el.style.opacity='0';
}
function drawEdgeMarker(target,glyph,color,enemy=false){
  const p=project(target.x,target.y);
  const top=enemy?48:Math.min(220,H*.35),bottom=H-(enemy?52:135);
  if(p.x>35&&p.x<W-35&&p.y>top&&p.y<bottom)return;
  const x=clamp(p.x,34,W-34),y=clamp(p.y,top,bottom);
  const a=Math.atan2(p.y-y,p.x-x);
  ctx.save();
  ctx.translate(x,y);
  ctx.fillStyle=color;
  ctx.save();
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(23,0);ctx.lineTo(12,-6);ctx.lineTo(12,6);ctx.closePath();
  ctx.fill();ctx.restore();
  circle(0,0,15,'#261b33ee',color);
  ctx.fillStyle=color;
  ctx.textAlign='center';
  ctx.font='bold 16px Segoe UI';
  ctx.fillText(glyph,0,5);
  ctx.restore();
}
function drawTitle(t){const c=$('art').getContext('2d');c.clearRect(0,0,620,620);c.save();c.translate(310,320);for(let i=0;i<4;i++){c.strokeStyle=i%2?'#d995ae44':'#b9f3ce33';c.beginPath();c.ellipse(0,90,140+i*30,65+i*16,0,0,TAU);c.stroke()}c.restore();for(const [i,x,y,z] of [[12,310,180,250],[5,130,310,140],[4,470,330,150],[6,410,485,140],[8,160,485,140],[0,300,360,190]])sprite(c,i,x,y+Math.sin(t*.0015+i)*8,z);c.textAlign='center';c.font='11px Segoe UI';c.fillStyle='#d9aaa9';c.fillText('MOVE. STRIKE. BREAK THE SWEET WORLD.',310,595)}
