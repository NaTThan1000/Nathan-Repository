(() => {
'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const TAU=Math.PI*2,WORLD=2300,weaponNames=['银叉','餐刀','长柄勺','吸管'],weaponIcons=['♆','╱','◒','≋'];
const stageNames=['奶油荒原','焦糖熔炉','冰霜王庭'],bossNames=['千层暴君','熔心布丁王','冰霜女王'],allyNames=['主厨 · 阿灶','医师 · 小满','工程师 · 阿伏'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rng=(a,b)=>a+Math.random()*(b-a),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const ENCOUNTERS = [
  [
    {name:'奶油巡卫', types:[0,0,3], pressure:1, cue:'J 连击可打断薄荷色前摇'},
    {name:'焦糖先锋', types:[0,1,3,5], pressure:2, cue:'橙色前摇无法打断，按空格闪避'},
    {name:'夹心合围', types:[0,2,4,5,6,6], pressure:2, cue:'快攻怪从两侧来，先打开一边', slots:[[-.7,265],[-.35,300],[.12,295],[.45,325],[-1.95,290],[1.85,290]]},
  ],
  [
    {name:'熔炉巡逻', types:[1,1,4,5], pressure:2, cue:'绕开震地，再回身重击'},
    {name:'双炉冲锋', types:[0,3,5,5,6], pressure:2, cue:'两侧都有冲锋手，横移留出退路', slots:[[-.55,245],[.4,255],[-1.48,285],[1.45,310,.8],[.08,310]]},
    {name:'糖浆封路', types:[1,2,4,5,6,6,7], pressure:3, cue:'侧翼施术者会锁定你的脚下', slots:[[-.36,260],[.36,260],[0,310],[-.7,320],[.95,300],[-1.15,320],[1.55,390]]},
  ],
  [
    {name:'霜糖伏击', types:[2,3,6,6,7], pressure:2, cue:'先逼近施术者，别停在落点圈内'},
    {name:'冰廊夹击', types:[0,2,4,5,6,7], pressure:3, cue:'留体力穿过冲锋与落点'},
    {name:'王庭护卫', types:[1,2,4,5,5,6,6,7], pressure:3, cue:'施术者躲在护卫后方，先打穿一侧', slots:[[-.3,248],[.3,248],[0,300],[-1.48,320],[1.45,320,.8],[-.72,290],[.72,290],[0,400]]},
  ],
];
const BOSS_HEALTH = [650, 800, 950];
const BOSS_PATTERNS = [
  ['sweep','rush','sweep','slam'],
  ['rush','slam','rush','sweep'],
  ['slam','sweep','rush','slam','sweep'],
];
const WAVE_BREAK = 2.5;
const BOSS_OPENING = 2.2;
const SUPPORT = [
  {role:'主厨',label:'主厨追斩',hint:'命中后追加一斩',cooldown:6,color:'#ffd0a0'},
  {role:'医师',label:'医师治疗',hint:'命中后恢复生命',cooldown:8,color:'#b7ffda'},
  {role:'工程师',label:'工程师磁索',hint:'命中后拉怪、削架势',cooldown:6,color:'#b5d9ff'},
];
const RESCUE_SPOTS = [[930,1010],[1460,1250],[1100,1500]];
const PRACTICE = [
  {name:'木桩试招',tip:'练习连段、餐具与合体'},
  {name:'练习打断',tip:'薄荷前摇出现时按 J'},
  {name:'练习闪避',tip:'冲锋条快满时，朝对手闪避，再接 J / L'},
];
const atlas=new Image();atlas.src=ATLAS_URL;
let testManual=false;
let W=innerWidth,H=innerHeight,dpr=1,state='title',s,frame=0,last=0,fps=60,muted=false,audio,choiceList=[],choiceMode='',helpReturn='title';
let keys={},touch=null,crewMarkup='';
const FORMS=[
 {id:'fork',req:[0],name:'银叉刺剑',light:'突刺 → 横扫 → 穿心',heavy:'蓄力长刺，打断一线敌人',dodge:'滑步穿刺',color:'#b5f4d5',shape:'thrust',reach:122,width:.55},
 {id:'knife',req:[1],name:'餐刀短刃',light:'左右快斩 → 回身斩',heavy:'踏步劈斩，快速收招',dodge:'背身切入',color:'#ffb8c9',shape:'sweep',reach:105,width:1.1},
 {id:'spoon',req:[2],name:'白瓷战勺',light:'横抡 → 反抡 → 震地',heavy:'周身砸地，击倒一圈敌人',dodge:'翻身拍击',color:'#ffe1a2',shape:'sweep',reach:130,width:1.3},
 {id:'straw',req:[3],name:'伸缩吸管棍',light:'棍击 → 挑击 → 扫堂',heavy:'伸缩棍勾回敌人',dodge:'绕身鞭击',color:'#b9dcff',shape:'thrust',reach:145,width:.65},
 {id:'dual',req:[0,1],name:'处刑双刃',light:'交叉斩 → 双刺 → 剪切终结',heavy:'连斩后重击：引爆切痕',dodge:'穿身交叉斩',color:'#ffb8d0',shape:'sweep',reach:128,width:1.15},
 {id:'halberd',req:[0,2],name:'翻糖长戟',light:'宽幅横扫，将敌人拨开',heavy:'先勾拢，再延迟砸落',dodge:'长戟回钩',color:'#ffe1a2',shape:'sweep',reach:165,width:1.45},
 {id:'lance',req:[0,3],name:'虹吸长枪',light:'长刺挂上虹吸印记',heavy:'抽回有印记的敌人并汲取生命',dodge:'撑杆穿刺',color:'#a6f4df',shape:'thrust',reach:188,width:.4},
 {id:'breaker',req:[1,2],name:'断层重铲',light:'短促拍击，积累碎甲',heavy:'震地击倒，碎甲敌人延长硬直',dodge:'铲面撞击',color:'#ffcf9f',shape:'sweep',reach:118,width:1.15},
 {id:'chain',req:[1,3],name:'糖丝链刃',light:'长距离鞭斩并轻拉敌人',heavy:'移动回旋，将周身敌人拉入',dodge:'环身链舞',color:'#ceb8ff',shape:'sweep',reach:185,width:.95},
 {id:'gauntlet',req:[2,3],name:'气压拳套',light:'短打三连，终段打飞',heavy:'先吸附再爆发冲拳，击退怪群',dodge:'贴身升龙',color:'#b1e9ff',shape:'sweep',reach:108,width:1},
];
const COMBO_FOLLOW = {
  dual: {name:'穿身回切', kind:'light', air:false, hint:'J → J → L 引爆切痕，命中后按 J 穿身回切'},
  halberd: {name:'扫糖尾', kind:'light', air:false, hint:'L 勾中并砸中后接 J，横扫推开聚到一起的敌人'},
  lance: {name:'退步长刺', kind:'light', air:false, hint:'J 挂印 → L 吸血，命中后按 J 长刺并后退'},
  breaker: {name:'碎甲坠铲', kind:'heavy', air:true, hint:'J 碎甲 → K 跳起 → L 落斩，重创有碎甲印记的目标'},
  chain: {name:'回卷链舞', kind:'heavy', air:false, hint:'空格闪避 → J 命中 → L 回卷两侧敌人'},
  gauntlet: {name:'追空拳', kind:'light', air:true, hint:'L 打飞 → K 跳起 → J 追上浮空敌人'},
};
function activeCombo(){
  const link=s.p.combo;
  return link&&link.until>s.total&&s.ult<=0&&link.kit===s.form?COMBO_FOLLOW[link.kit]:null;
}
function readyCombo(kit){
  s.p.combo={kit,until:s.total+1.45};
}
function stepCombo(distance,angle){
  const p=s.p;
  fx('ghost',p.x,p.y,70,currentKit().color,.19,{face:p.face,z:p.z});
  p.x=clamp(p.x+Math.cos(angle)*distance,30,WORLD-30);
  p.y=clamp(p.y+Math.sin(angle)*distance,30,WORLD-30);
}
function applyComboStrike(action,opt){
  switch(action.combo){
    case 'dual':
      stepCombo(78,action.a);
      action.a+=Math.PI;s.p.aim=action.a;s.p.face*=-1;
      Object.assign(opt,{x:s.p.x,y:s.p.y,a:action.a,shape:'sweep',r:119,width:Math.PI,damage:36,impact:24,knock:24});
      break;
    case 'halberd':
      Object.assign(opt,{shape:'sweep',r:179,width:Math.PI,damage:32,impact:26,knock:62});
      break;
    case 'lance':
      Object.assign(opt,{shape:'line',r:245,lineWidth:22,damage:31,impact:20,knock:10});
      break;
    case 'breaker':
      Object.assign(opt,{shape:'sweep',r:165,width:Math.PI,impact:46,knock:30,fracture:true});
      break;
    case 'chain':
      Object.assign(opt,{shape:'sweep',r:202,width:Math.PI,pull:148,damage:48,impact:36,knock:0});
      break;
    case 'gauntlet':
      stepCombo(68,action.a);
      Object.assign(opt,{x:s.p.x,y:s.p.y,shape:'sweep',r:139,width:1.12,damage:31,impact:30,knock:32});
      break;
  }
}
function openComboAfterHit(action,opt,heavy){
  if(action.fused||action.combo||!opt.enemyHits)return;
  const kit=action.kit;
  if(kit==='dual'&&opt.executed||kit==='lance'&&opt.drained||
    kit==='breaker'&&!heavy&&!action.aerial||kit==='chain'&&!heavy&&action.dodge||
    kit==='gauntlet'&&heavy&&!action.aerial)readyCombo(kit);
}
const FUSIONS={
 silver:{name:'银翼武装',color:'#aafcda',light:'大剑三连',heavy:'跃斩震地',style:'blade'},
 chef:{name:'灶火武者',color:'#ffc080',light:'煎锅横抡',heavy:'翻锅焰击',style:'hammer'},
 medic:{name:'白瓷守卫',color:'#cbffe1',light:'盾面扫击',heavy:'架盾招架 → 反震命中后治疗',style:'shield'},
 engineer:{name:'磁轨猎手',color:'#b5d9ff',light:'磁索勾拉',heavy:'引爆轻击留下的标记',style:'chain'},
 '01':{name:'白瓷圣卫',color:'#d6ffed',light:'盾击蓄护势',heavy:'架盾招架 → 反震命中后治疗',style:'shield'},
 '02':{name:'熔炉机甲',color:'#ffb775',light:'重锤横扫',heavy:'蓄力砸地 → 留下灼烧地带',style:'hammer'},
 '12':{name:'缝合游侠',color:'#b9d6ff',light:'磁索拉近并定身',heavy:'引爆牵引标记 → 连锁震荡',style:'chain'},
};
const FUSION_PARTNERS={silver:[],chef:[0],medic:[1],engineer:[2],'01':[0,1],'02':[0,2],'12':[1,2]};
function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();
function show(id,on){$(id).classList.toggle('visible',on)}
function sound(type){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;o.connect(g);g.connect(audio.destination);let f=220,d=.08,v=.035;o.type='triangle';if(type==='heavy'){f=100;d=.22;v=.09;o.type='sawtooth'}if(type==='hit'){f=210;d=.08;v=.045;o.type='triangle'}if(type==='hitHeavy'){f=128;d=.18;v=.085;o.type='sawtooth'}if(type==='clang'){f=670;d=.14;v=.045}if(type==='dash'){f=300;d=.12}if(type==='jump'){f=390;d=.09;v=.025}if(type==='swing'){f=540;d=.055;v=.024}if(type==='land'){f=95;d=.095;v=.052}if(type==='hurt'){f=85;d=.25;v=.07;o.type='sawtooth'}if(type==='level'||type==='rescue'){f=650;d=.35;v=.065}if(type==='ult'){f=90;d=.65;v=.08;o.type='sawtooth'}o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(type==='level'||type==='rescue'?f*2:45,now+d);g.gain.setValueAtTime(v,now);g.gain.exponentialRampToValueAtTime(.001,now+d);o.start(now);o.stop(now+d)}catch{}}
function toast(text,t=3){if(!s)return;s.toast=t;$('toast').textContent=text;$('toast').style.opacity=1}
function particles(x,y,color,n=10,power=150){for(let i=0;i<n&&s.particles.length<480;i++){const a=rng(0,TAU),v=rng(25,power);s.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rng(.18,.5),max:.5,size:rng(2,5),color})}}
function text(x,y,value,color='#fff1cc',size=16){if(s.texts.length>45)s.texts.shift();s.texts.push({x,y,text:value,color,size,t:.8})}
function fx(type,x,y,r,color,t=.3,extra={}){if(s.effects.length>=180)s.effects.shift();s.effects.push({type,x,y,r,color,t,max:t,...extra})}
function form(){return FORMS.find(f=>f.id===s.form)||FORMS[0]}
function availableForms(){return FORMS.filter(f=>f.req.every(i=>s.weapons[i]))}
function humanTypes(){return s.allies.map(a=>a.type).sort()}
function fusionOptions(){const types=humanTypes(),pairs=[];for(let i=0;i<types.length;i++)for(let j=i+1;j<types.length;j++)pairs.push(''+types[i]+types[j]);return pairs.length?pairs:types.map(i=>['chef','medic','engineer'][i]).concat(types.length?[]:['silver'])}
function fusion(){if(s.ult>0)return FUSIONS[s.fusionKey];const opts=fusionOptions();if(!opts.includes(s.fusionKey))s.fusionKey=opts[0];return FUSIONS[s.fusionKey]}
function fusionPartners(){return FUSION_PARTNERS[s.fusionKey]||FUSION_PARTNERS.silver}
function currentKit(){return s.ult>0?fusion():form()}
function start(){for(const id of ['title','choice','end','pauseScreen','helpScreen','armory'])show(id,false);state='playing';document.body.classList.add('play');keys={};$('toast').textContent='';$('toast').style.opacity=0;s={p:{x:1150,y:1150,hp:100,max:100,stamina:100,speed:245,inv:1,dash:0,dashCD:0,dx:1,dy:0,aim:0,face:1,action:null,chain:0,chainTime:0,dodgeFollow:0,counter:0,perfect:false,guard:0,riposte:0,staminaDelay:0,hurtAnim:0,landAnim:0,rollAnim:0,z:0,vz:0,moving:false},stage:0,time:0,total:0,kills:0,recipeChosen:false,routeSide:Math.random()<.5?-1:1,weapons:[1,0,0,0],form:'fork',mods:new Set(),enemies:[],particles:[],effects:[],texts:[],zones:[],pickups:[],cages:[],allies:[],hostages:[],rescueSet:new Set(),relics:[],wave:0,waveBreak:0,bossReady:false,resonance:0,ult:0,fusionKey:'silver',shake:0,freeze:0,hitStopCD:0,toast:0,boss:null,bossSpawned:false,stagePending:false,metrics:{peak:0,attacks:0,interrupts:0,armorResists:0,perfectDodges:0,parries:0},autospawn:true};stageSetup();sound('level');updateHUD()}
function stageSetup(){
  Object.assign(s,{time:0,wave:0,boss:null,bossSpawned:false,bossReady:false,waveBreak:0,
    enemies:[],zones:[],effects:[],pickups:[],cages:[],stagePending:false,skillBanner:null});
  Object.assign(s.p,{x:1150,y:1150,z:0,vz:0,action:null,buffer:null,chain:0,chainTime:0,
    combo:null,dash:0,dashCD:0,counter:0,dodgeFollow:0,guard:0,riposte:0,staminaDelay:0,hurtAnim:0,landAnim:0,rollAnim:0,inv:1});
  if(s.stage>0)addCages();
  if(s.autospawn)spawnWave();
}
function addCages(count=RESCUE_SPOTS.length){
  for(const [i,[x,y]] of RESCUE_SPOTS.slice(0,count).entries()){
    if(s.rescueSet.has(i)||s.cages.some(c=>c.ally===i))continue;
    s.cages.push({x,y,hp:90,max:90,ally:i,open:false,rescued:false,flash:0});
  }
}
function equip(id){const f=FORMS.find(f=>f.id===id);if(!f||!f.req.every(i=>s.weapons[i]))return false;if(s.p.action||s.p.dash>0){toast('收招后才能更换餐具',1);return false}s.form=id;s.p.combo=null;s.p.chain=0;toast(f.name,1.5);updateHUD();return true}
function cycleForm(){if(state!=='playing')return;const opts=availableForms(),pairs=opts.filter(f=>f.req.length===2),list=pairs.length?pairs:opts;const i=list.findIndex(f=>f.id===s.form);equip(list[(i+1)%list.length].id)}
function cycleFusion(){if(state!=='playing'||s.ult>0)return;const opts=fusionOptions();s.fusionKey=opts[(opts.indexOf(s.fusionKey)+1)%opts.length];toast(fusion().name,1.5);updateHUD()}
function movementInput(){return touch?{x:touch.dx,y:touch.dy}:{x:(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),y:(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)}}
function aimAngle(){const move=movementInput();return Math.hypot(move.x,move.y)>.05?Math.atan2(move.y,move.x):s.p.aim}
function training(){start();s.training=true;s.practice=0;s.autospawn=false;s.weapons=[1,1,1,1];s.enemies=[];s.cages=[];s.pickups=[];s.allies=[0,1,2].map(type=>({type,x:s.p.x-70,y:s.p.y,cd:999}));s.rescueSet=new Set([0,1,2]);s.resonance=100;s.form='dual';s.fusionKey='02';spawnDummies();toast('试招庭院 · X 换餐具 / R 选招式 / C 换搭档 / Q 合体',6);updateHUD()}
function cyclePractice(){
  if(state!=='playing'||!s.training)return;
  s.practice=(s.practice+1)%PRACTICE.length;
  Object.assign(s.p,{x:1150,y:1150,aim:0,face:1,z:0,vz:0,action:null,buffer:null,chain:0,chainTime:0,
    combo:null,dash:0,dashCD:0,counter:0,dodgeFollow:0,guard:0,riposte:0,hurtAnim:0,landAnim:0,rollAnim:0,inv:0,stamina:100,staminaDelay:0});
  s.ult=0;s.resonance=100;s.enemies=[];s.zones=[];s.effects=[];s.particles=[];s.texts=[];
  s.skillBanner=null;s.freeze=0;s.shake=0;
  for(const ally of s.allies){ally.x=s.p.x-70;ally.y=s.p.y;ally.cd=999}
  spawnDummies();
  toast(PRACTICE[s.practice].name+' · '+PRACTICE[s.practice].tip,3);
  updateHUD();
}
function spawnDummies(){
  if(s.practice){
    const p=s.p,charge=s.practice===2;
    const direction=p.x>WORLD/2?-1:1;
    s.enemies.push(makeEnemy(p.x+(charge?228:110)*direction,p.y,charge?5:0,{hp:160,max:160,cooldown:.45}));
    return;
  }
  for(let i=0;i<7;i++){const a=-.8+i*.28,r=145+i%2*55;s.enemies.push(makeEnemy(s.p.x+Math.cos(a)*r,s.p.y+Math.sin(a)*r,i%7,{hp:180,max:180,speed:0,cooldown:999}))}}
function jump(){if(state!=='playing'||s.p.z>0||s.p.stamina<10)return false;const p=s.p;p.stamina-=10;p.staminaDelay=.3;p.z=1;p.vz=400;p.landAnim=0;p.hurtAnim=0;p.action=null;p.buffer=null;fx('ring',p.x,p.y,38,'#d3f5e1',.25);sound('jump');return true}
function requestAttack(kind){
  if(state!=='playing')return false;
  const p=s.p;
  if(p.dash>0){p.buffer={kind,t:.45};return true}
  if(!p.action)return beginAttack(kind);
  const a=p.action;
  if(kind==='heavy'&&a.kind==='light'&&a.fired&&p.z<=10&&p.stamina>=24&&s.ult>0&&fusion().style==='shield'){
    p.buffer=null;
    return beginAttack(kind);
  }
  if(a.duration-a.elapsed<.25){p.buffer={kind,t:.32};return true}
  return false;
}
function beginAttack(kind){const p=s.p,kit=currentKit(),heavy=kind==='heavy',counter=p.counter>0,dodge=p.dodgeFollow>0,chain=p.chainTime>0?p.chain:0,cost=heavy?24:0;if(p.stamina<cost){toast('体力不足，稍退一步恢复',1);return false}p.stamina-=cost;if(cost)p.staminaDelay=.4;p.hurtAnim=0;const fusionStyle=s.ult>0?kit.style:null;
const follow=activeCombo(),combo=follow?.kind===kind&&follow.air===(p.z>10)?s.form:null;
p.combo=null;let wind=heavy?.29:.065,active=heavy?.17:.12,recover=heavy?.32:.16;
if(!heavy&&s.form==='knife'&&s.ult<=0){wind=.04;recover=.11}if(heavy&&s.form==='knife'&&s.ult<=0){wind=.2;recover=.22}if(heavy&&fusionStyle==='hammer'){wind=.5;active=.22;recover=.4}const riposte=heavy&&fusionStyle==='shield'&&p.riposte>0;
if(heavy&&fusionStyle==='shield'){
  wind=riposte?.055:.46;active=.16;recover=.24;
  if(riposte)p.riposte=0;else p.guard=.48;
}else{
  if(counter){wind=.045;recover=.2}
  if(dodge){wind=.04;recover=.18}
}
if(combo){wind=Math.min(wind,.09);recover=Math.min(recover,.22)}
p.action={kind,combo,elapsed:0,duration:wind+active+recover,wind,active,recover,fired:false,a:aimAngle(),chain:heavy?chain:(chain%3)+1,dodge,counter,riposte,aerial:p.z>10,dive:heavy&&p.z>10,kit:s.ult>0?s.fusionKey:s.form,fused:s.ult>0,hits:new Set()};p.aim=p.action.a;if(Math.abs(Math.cos(p.aim))>.1)p.face=Math.cos(p.aim)>=0?1:-1;if(p.action.dive){p.vz=-520;p.action.wind=.08;p.guard=0}if(p.action.dive||riposte||combo)announceSkill(p.action);p.dodgeFollow=0;p.counter=0;if(heavy){p.chain=0;p.chainTime=0}else{p.chain=p.action.chain;p.chainTime=1.15}s.metrics.attacks++;if(heavy)sound('heavy');else sound('swing');return true}
function dash(){
  if(state!=='playing'||s.p.dashCD>0||s.p.stamina<22)return false;
  const p=s.p;
  p.stamina-=22;p.staminaDelay=.35;p.action=null;p.buffer=null;p.guard=0;
  p.dash=.18;p.combo=null;p.rollAnim=.28;p.hurtAnim=0;p.inv=.23;p.dashCD=.65;p.dodgeFollow=.65;p.perfect=false;
  p.aim=aimAngle();
  p.dashX=Math.cos(p.aim);p.dashY=Math.sin(p.aim);
  if(Math.abs(p.dashX)>.1)p.face=p.dashX>0?1:-1;
  particles(p.x,p.y,'#b6f9dd',16,110);sound('dash');return true;
}
function perfectDodge(){const p=s.p;if(p.dash<=0||p.perfect)return;p.perfect=true;p.counter=1.25;s.resonance=clamp(s.resonance+12,0,100);s.metrics.perfectDodges++;text(p.x,p.y-55,'精准闪避 · 可反击','#b1ffe5',20);fx('ring',p.x,p.y,65,'#b7ffe4',.35)}
function receiveAttack(damage,source){
  const p=s.p;
  if(p.z>36&&!(source?.boss&&source.attack?.kind==='sweep'))return;
  if(p.guard>0&&source&&!source.armored&&source.attack?.kind!=='slam'){
    p.guard=0;p.counter=1.2;p.action=null;
    const shield=s.ult>0&&fusion().style==='shield';
    if(shield)p.riposte=1.2;
    p.stamina=Math.min(100,p.stamina+15);
    s.resonance=clamp(s.resonance+12,0,100);
    s.metrics.parries++;
    source.state=source.boss?'recover':'stagger';
    source.timer=source.boss?.5:.9;
    text(p.x,p.y-52,shield?'招架！再按 L 反震':'招架！接攻击反击','#d4ffec',22);
    fx('ring',p.x,p.y,105,'#e9fff2',.3);sound('clang');return;
  }
  if(p.inv>0){perfectDodge();return}
  if(s.sugarShield){
    s.sugarShield=false;p.inv=.3;fx('ring',p.x,p.y,80,'#ffe6aa',.4);
    text(p.x,p.y-50,'糖衣护盾','#ffe6aa',17);sound('clang');return;
  }
  p.hp-=damage;p.combo=null;p.inv=.6;p.hurtAnim=.24;p.action=null;p.chain=0;p.buffer=null;p.guard=0;s.shake=7;
  particles(p.x,p.y,'#ff8fab',20,190);text(p.x,p.y-45,'受击','#ff9cb4',19);sound('hurt');
  if(p.hp<=0)finish(false);
}
function hitEnemy(e,damage,impact,knock,a,options={}){
  if(e.dead)return;
  const armored=e.armored&&(e.state==='windup'||e.state==='active');
  e.hp-=e.boss&&e.state==='stagger'?Math.round(damage*1.4):damage;
  e.flash=options.damageOnly?.09:(impact>=22?.19:.12);
  e.hitAngle=a;
  if(!options.damageOnly){
    const edge=Math.min(e.r*.72,28);
    fx('hitburst',e.x-Math.cos(a)*edge,e.y-Math.sin(a)*edge,impact>=22?65:36,options.color||'#ffe4c0',impact>=22?.36:.24,{a,heavy:impact>=22,z:e.z+(e.boss?45:0)});
    if(e.boss){
      if(e.state!=='stagger')e.poise-=impact;
      if(e.poise<=0){
        e.poise=e.poiseMax;e.state='stagger';e.timer=BOSS_OPENING;e.armored=false;
        text(e.x,e.y-90,'破势！趁机追击','#b8ffe2',23);
      }
    }else if(!armored){
      if(e.state==='windup'||e.state==='active'){
        s.metrics.interrupts++;
        text(e.x,e.y-48,'打断','#c0ffe5',13);
      }
      e.state='stagger';e.timer=options.longStun||((impact>=22)?.55:.25);
      e.vx=Math.cos(a)*knock*7;e.vy=Math.sin(a)*knock*7;
      if(impact>=22){e.vz=impact>=30?280:170;e.z=Math.max(e.z||0,1)}
    }else{
      s.metrics.armorResists++;
      if(e.armorTextCD<=0){text(e.x,e.y-45,'霸体','#ffd28f',14);e.armorTextCD=.8}
    }
    if(!armored||e.boss)particles(e.x,e.y,options.color||'#ffe8b6',impact>=22?12:6,impact>=22?210:130);
    else particles(e.x,e.y,'#ffbd72',5,100);
    s.resonance=clamp(s.resonance+(impact>=22?2:1),0,100);
    s.shake=Math.max(s.shake,impact>=22?5:2);
    if(s.hitStopCD<=0){s.freeze=impact>=22?.060:.024;s.hitStopCD=.12;sound(armored?'clang':impact>=22?'hitHeavy':'hit')}
  }
  if(e.hp>0)return;
  fx('defeat',e.x,e.y,85,e.color||'#f9b9cd',.45,{index:e.boss?e.type:e.type+4,a});
  e.dead=true;s.kills++;s.resonance=clamp(s.resonance+3,0,100);

  if(Math.random()<.035)s.pickups.push({x:e.x,y:e.y,type:'heal'});
  particles(e.x,e.y,'#ffc4cd',20,200);
  if(e.boss){s.stagePending=true;s.shake=14;s.zones=[];for(const m of s.enemies)m.dead=true}
}
function cageHit(c,damage){if(c.open)return;c.hp-=damage;c.flash=.15;if(c.hp<=0){c.open=true;particles(c.x,c.y,'#b8f4d5',25);toast('糖笼破了！靠近即可救援。')}}
function inStrike(target,opt){const dx=target.x-opt.x,dy=target.y-opt.y,d=Math.hypot(dx,dy),padding=target.r||23;if(d>opt.r+padding)return false;if(opt.shape==='line'){const forward=dx*Math.cos(opt.a)+dy*Math.sin(opt.a),side=Math.abs(-dx*Math.sin(opt.a)+dy*Math.cos(opt.a));return forward>-padding&&forward<opt.r+padding&&side<(opt.lineWidth||26)+padding}return d<28||Math.abs(angleDiff(Math.atan2(dy,dx),opt.a))<=opt.width+padding/Math.max(30,d)}
function strike(opt){let hits=0;const hitset=opt.hitset||new Set();for(const e of s.enemies){if(e.dead||hitset.has(e)||!inStrike(e,opt))continue;hitset.add(e);hits++;opt.enemyHits=(opt.enemyHits||0)+1;const a=Math.atan2(e.y-opt.y,e.x-opt.x);let damage=opt.damage;if(opt.execute&&e.mark>0&&e.markType==='cut'){damage+=28;e.mark=0;opt.executed=true;fx('crossHit',e.x,e.y,53,'#ffb5cf',.33,{a,z:e.z});text(e.x,e.y-55,'切痕爆裂','#ffd4db',16)}if(opt.siphon){e.mark=3;e.markType='siphon'}if(opt.mark){e.mark=opt.markTime??3;e.markType=opt.mark}if(opt.drain&&e.mark>0&&e.markType==='siphon'){s.p.hp=Math.min(s.p.max,s.p.hp+2);e.mark=0;opt.drained=true}if(opt.fracture&&e.markType==='crack'&&e.mark>0){damage+=30;e.mark=0;fx('crossHit',e.x,e.y,61,'#ffdaaf',.34,{a,z:e.z})}pullEnemy(e,opt,a,opt.pull);const stun=opt.crack?(e.markType==='crack'&&e.mark>0?1.2:.55):0;hitEnemy(e,damage,opt.impact,opt.knock,a,stun?{...opt,longStun:stun}:opt)}for(const c of s.cages)if(!c.open&&!hitset.has(c)&&inStrike(c,opt)){hitset.add(c);cageHit(c,opt.damage);hits++}return hits}
function pullEnemy(e,origin,angle,amount){
  if(!amount||e.boss||e.armored)return;
  const move=Math.min(Math.max(0,dist(e,origin)-50),amount);
  e.x-=Math.cos(angle)*move;e.y-=Math.sin(angle)*move;
}
function pullWave(opt,r,width,amount){
  const area={...opt,r,width,shape:'sweep'};
  for(const e of s.enemies){
    if(e.dead||!inStrike(e,area))continue;
    pullEnemy(e,area,Math.atan2(e.y-area.y,e.x-area.x),amount);
  }
}
function burstTethers(opt){
  let linked=0;
  for(const e of s.enemies){
    if(e.dead||e.markType!=='tether'||e.mark<=0||dist(e,opt)>410)continue;
    const angle=Math.atan2(e.y-opt.y,e.x-opt.x);
    e.mark=0;
    opt.hitset.add(e);
    fx('link',opt.x,opt.y,0,opt.color,.35,{tx:e.x,ty:e.y});
    pullEnemy(e,opt,angle,110);
    hitEnemy(e,82,50,0,angle,{color:opt.color});
    linked++;
  }
  if(linked)text(opt.x,opt.y-65,'星索引爆 ×'+linked,opt.color,16);
  return linked;
}
function fusionAttack(opt,action,style){
  const heavy=action.kind==='heavy';
  Object.assign(opt,{shape:'sweep',r:160,width:1.5,damage:heavy?76:38,impact:heavy?55:22});
  if(style==='chain'){
    if(!heavy){
      Object.assign(opt,{r:210,width:.85,pull:48,mark:'tether',markTime:4,damage:33});
      return 0;
    }
    Object.assign(opt,{r:148,width:Math.PI,pull:85,damage:46,impact:34});
    return burstTethers(opt);
  }
  if(style==='shield'&&heavy){
    Object.assign(opt,{r:action.riposte?185:135,width:Math.PI,
      damage:action.riposte?102:42,impact:action.riposte?66:26,knock:action.riposte?65:30});
    if(action.riposte)fx('shield',opt.x,opt.y,150,opt.color,.45);
  }
  if(style==='hammer'){
    opt.r=heavy?175:155;
    if(heavy){
      opt.width=Math.PI;opt.knock=48;
      s.zones.push({x:opt.x+Math.cos(opt.a)*65,y:opt.y+Math.sin(opt.a)*65,
        r:100,t:2.8,tick:.45,kind:'fire'});
    }
  }
  return 0;
}
function attackImpact(action){const p=s.p,heavy=action.kind==='heavy',third=!heavy&&action.chain===3,f=FORMS.find(f=>f.id===action.kit)||form(),fu=action.fused?FUSIONS[action.kit]:null,color=fu?fu.color:f.color;
let opt={x:p.x,y:p.y,a:action.a,r:f.reach,width:f.width,shape:f.shape,damage:heavy?51:third?38:23,impact:heavy?30:third?22:10,knock:heavy?35:third?23:9,color,hitset:action.hits};
if(action.dodge){opt.r+=30;opt.damage=heavy?54:34;opt.impact=26;opt.knock=28;p.x=clamp(p.x+Math.cos(action.a)*32,25,WORLD-25);p.y=clamp(p.y+Math.sin(action.a)*32,25,WORLD-25);text(p.x,p.y-65,'闪避派生',color,14)}if(action.counter){opt.damage=heavy?65:42;opt.impact=60;opt.r+=35;text(p.x,p.y-65,'闪避反击',color,17)}
let linked=0;
if(fu)linked=fusionAttack(opt,action,fu.style);
else switch(f.id){
 case 'fork':if(heavy){opt.shape='line';opt.r=210;opt.lineWidth=23}else if(action.chain===2){opt.shape='sweep';opt.r=115;opt.width=1.15}else if(third){opt.shape='line';opt.r=165}break;
 case 'knife':if(heavy){p.x=clamp(p.x+Math.cos(action.a)*40,25,WORLD-25);p.y=clamp(p.y+Math.sin(action.a)*40,25,WORLD-25);opt.x=p.x;opt.y=p.y}else if(third)opt.width=Math.PI;break;
 case 'spoon':if(heavy||third){opt.shape='sweep';opt.width=Math.PI;opt.r=145}break;
 case 'straw':if(heavy){opt.shape='sweep';opt.r=190;opt.pull=110;opt.knock=0}else if(action.chain>=2){opt.shape='sweep';opt.width=third?Math.PI:1.1;opt.r=third?165:135}break;
 case 'dual':if(heavy){opt.execute=action.chain>=2;opt.r=155;opt.width=1.2}else{opt.mark='cut';if(action.chain===2){opt.shape='line';opt.r=165;opt.lineWidth=25}}break;
 case 'halberd':if(heavy){
   opt.pull=95;opt.knock=0;opt.damage=18;
   action.followUp={delay:.38,elapsed:action.elapsed};
   action.duration=Math.max(action.duration,action.elapsed+.63);
   s.zones.push({x:p.x+Math.cos(action.a)*85,y:p.y+Math.sin(action.a)*85,r:100,t:.58,tick:.38,kind:'slam',damage:48,followAction:action,color});
 }break;
 case 'lance':opt.shape='line';opt.lineWidth=24;if(heavy){opt.r=240;opt.pull=120;opt.drain=true;opt.knock=0}else opt.siphon=true;break;
 case 'breaker':if(heavy){opt.width=Math.PI;opt.r=145;opt.crack=true;opt.knock=22;opt.shape='sweep'}else opt.mark='crack';break;
 case 'chain':if(heavy){opt.width=Math.PI;opt.r=180;opt.pull=95;opt.knock=0;action.duration+=.13}else{opt.pull=22;if(action.chain===2){opt.shape='line';opt.r=215;opt.lineWidth=24}else if(third)opt.width=Math.PI}break;
 case 'gauntlet':if(heavy){pullWave(opt,145,opt.width,70);opt.r=155;opt.knock=95;opt.width=1.1}else if(third)opt.knock=85;break;
 }
if(action.dodge&&!fu){
 const dodgeRules={fork:{shape:'line',r:220},knife:{shape:'sweep',width:1.6,r:125},spoon:{shape:'sweep',width:Math.PI,r:145},straw:{shape:'sweep',width:Math.PI,r:170},dual:{shape:'sweep',width:1.6,r:160},halberd:{shape:'sweep',width:1.6,r:185,pull:100,knock:0},lance:{shape:'line',r:265,lineWidth:24},breaker:{shape:'line',r:135,lineWidth:45,impact:50,knock:55},chain:{shape:'sweep',width:Math.PI,r:190,pull:45},gauntlet:{shape:'sweep',width:.9,r:135,impact:45,knock:100}};
 Object.assign(opt,dodgeRules[f.id]);
}if(action.counter&&fu&&fu.style!=='shield'){opt.damage=heavy?92:50;opt.impact=75}
if(action.aerial){opt.r+=25;opt.impact=Math.max(opt.impact,35);opt.knock+=15;fx('impact',p.x,p.y,140,color,.55)}
if(action.combo)applyComboStrike(action,opt);
const hits=strike(opt)+linked;
if(action.followUp)action.followUp.hooked=!!opt.enemyHits;
if(action.combo==='lance'&&opt.enemyHits)stepCombo(64,opt.a+Math.PI);
openComboAfterHit(action,opt,heavy);
if(action.riposte&&s.enemies.some(e=>action.hits.has(e))){p.hp=Math.min(p.max,p.hp+10);text(p.x,p.y-58,'反震治疗','#c9ffdf',16)}
if(hits>0&&heavy&&s.mods.has('cancel'))p.dashCD=0;
if(heavy&&hits&&s.mods.has('echo'))s.zones.push({x:p.x+Math.cos(action.a)*70,y:p.y+Math.sin(action.a)*70,r:85,t:.65,tick:.5,kind:'slam',damage:25});
fx(opt.shape==='line'?'thrust':heavy&&opt.width>=Math.PI&&action.combo!=='chain'?'impact':'slash',opt.x,opt.y,opt.r,color,heavy?.72:.29,{a:opt.a,width:opt.width,reverse:action.chain===2,heavy,kit:action.kit,aerial:action.aerial});if(f.id==='dual'&&!fu)fx('slash',opt.x,opt.y,opt.r*.85,'#fff5dd',.24,{a:opt.a+.35,width:1.15,reverse:action.chain!==2,heavy});
}
function updateAction(dt){const p=s.p;if(p.buffer){p.buffer.t-=dt;if(p.buffer.t<=0)p.buffer=null}if(!p.action){if(p.buffer&&p.dash<=0){const kind=p.buffer.kind;p.buffer=null;beginAttack(kind)}return}const a=p.action;a.elapsed+=dt;if(a.dive&&!a.fired){p.vz=-520;a.duration=Math.max(a.duration,a.elapsed+.28)}if(!a.fired&&a.elapsed>=a.wind&&(!a.dive||p.z<12)){a.fired=true;a.impactAt=a.elapsed;attackImpact(a)}if(a.elapsed>=a.duration){p.action=null;if(p.buffer){const k=p.buffer.kind;p.buffer=null;beginAttack(k)}}}
function activateUlt(){if(state!=='playing'||s.resonance<100||s.ult>0)return false;const fu=fusion();s.resonance=0;s.ult=12;s.p.inv=.7;s.p.action=null;s.p.buffer=null;s.p.combo=null;s.p.guard=0;s.p.riposte=0;s.p.stamina=100;s.shake=9;particles(s.p.x,s.p.y,fu.color,50,300);fx('ring',s.p.x,s.p.y,190,fu.color,.6);toast(fu.name,1.5);sound('ult');updateHUD();return true}
function rescue(c){
  if(c.rescued)return;
  c.rescued=true;s.rescueSet.add(c.ally);
  s.allies.push({type:c.ally,x:c.x,y:c.y,cd:0});
  const restored=Math.min(15,s.p.max-s.p.hp);
  s.p.hp+=restored;s.resonance=clamp(s.resonance+25,0,100);
  fusion();particles(c.x,c.y,'#baffdc',30);
  toast(SUPPORT[c.ally].role+'加入 · '+SUPPORT[c.ally].hint+(restored?' · 生命 +'+restored:''),3.5);
  sound('rescue');
}
function makeEnemy(x,y,type=0,extra={}){const hp=[48,58,55,50,62,84,44,52][type%8];return {x,y,type,hp,max:hp,r:type===5?24:20,speed:type===6?122:type===5?70:95,phase:rng(0,TAU),z:0,vz:0,flash:0,state:'approach',timer:0,cooldown:rng(.2,1),armored:false,attack:null,vx:0,vy:0,mark:0,markType:'',armorTextCD:0,dead:false,boss:false,poise:100,poiseMax:100,...extra}}
function encounter(){return ENCOUNTERS[s.stage][s.wave]}
function spawnWave(){
  const wave=encounter(),p=s.p;
  // Reinforcements approach from the arena side with room, even if the player ended at an edge.
  const nearEdge=Math.min(p.x,p.y,WORLD-p.x,WORLD-p.y)<410;
  const direction=nearEdge?Math.atan2(1150-p.y,1150-p.x):-.4+s.wave*1.9;
  const spread=s.stage===0&&s.wave===0 ? .52 : 2.2;
  const edgeSpread=nearEdge ? .62 : 1;
  for(const [i,type] of wave.types.entries()){
    const slot=wave.slots?.[i];
    const offset=slot?slot[0]*s.routeSide:(i/(wave.types.length-1)-.5)*spread;
    const a=direction+offset*edgeSpread;
    const r=slot?.[1]??(245+i%3*45+(type===7?90:0));
    const x=clamp(p.x+Math.cos(a)*r,55,WORLD-55),y=clamp(p.y+Math.sin(a)*r,55,WORLD-55);
    const enemy=makeEnemy(x,y,type);
    enemy.cooldown+=slot?.[2]??0;
    s.enemies.push(enemy);
    if(s.wave>0)fx('ring',x,y,42,'#ffe8b1',.5);
  }
  if(s.stage===0&&s.wave===1)toast('橙色攻击 · 按空格躲开',2);
}
function updateEncounter(dt){
  if(!s.autospawn||s.bossSpawned||s.bossReady||s.enemies.length)return;
  if(s.stage===0&&s.wave===1&&!s.recipeChosen){
    s.waveBreak=WAVE_BREAK;
    const offers=recipeCards();
    presentChoices(s.routeSide<0?offers.slice(0,2):offers.slice(1,3),'recipe');
    return;
  }
  if(s.wave===ENCOUNTERS[s.stage].length-1){
    if(s.stage===0)addCages();
    s.bossReady=true;
    toast('护卫已清空 · 准备好后按 Enter 挑战领主',4);
    return;
  }
  if(!s.waveBreak){
    s.waveBreak=WAVE_BREAK;
    toast('本波清空 · 收集补给，准备迎击',2);
    return;
  }
  s.waveBreak=Math.max(0,s.waveBreak-dt);
  if(s.waveBreak===0){
    s.wave++;
    spawnWave();
  }
}
function challengeBoss(){
  if(state==='playing'&&s.bossReady)bossSpawn();
}
function bossSpawn(){if(s.bossSpawned)return;s.bossSpawned=true;s.bossReady=false;const hp=BOSS_HEALTH[s.stage],e=makeEnemy(s.p.x,s.p.y>375?s.p.y-300:s.p.y+300,12+s.stage,{hp,max:hp,boss:true,r:58,speed:90,poise:130,poiseMax:130,cooldown:1,attackCount:0});s.boss=e;s.enemies.push(e);toast(s.stage===1?'留意冲锋后留下的焦糖烫痕':s.stage===2?'震地后脚下还会出现霜圈':'领主登场 · 重击削减架势，失衡后追击',4);sound('ult')}
function startEnemyAttack(e){const p=s.p,a=Math.atan2(p.y-e.y,p.x-e.x);let kind='claw',armored=false,wind=.58,active=.17,recovery=.8,r=78,width=1,damage=10;
if(e.boss){e.attackCount++;kind=BOSS_PATTERNS[s.stage][(e.attackCount-1)%BOSS_PATTERNS[s.stage].length];armored=kind!=='sweep';wind=kind==='slam'?1:kind==='rush'?.85:.68;active=kind==='rush'?.48:.24;recovery=kind==='slam'?1.15:.85;r=kind==='sweep'?170:kind==='slam'?150:90;width=kind==='slam'?Math.PI:1.4;damage=kind==='sweep'?16:22}
else if(e.type===5){kind='rush';armored=true;wind=.85;active=.43;recovery=1.1;r=65;damage=15}
else if(e.type===4){kind='slam';wind=.8;active=.2;recovery=1;r=95;width=Math.PI;damage=13}
else if(e.type===7){kind='lob';wind=.9;active=.12;recovery=1.5;r=62;damage=12}
e.state='windup';e.timer=wind;e.armored=armored;e.attack={kind,a,wind,active,recovery,r,width,damage,hit:false,targetX:p.x,targetY:p.y,trailStep:0};}
function enemyZone(x,y,r,warning,damage,theme='candy',linger=.35){
  s.zones.push({x,y,r,theme,warning,t:warning+linger,kind:'enemy',damage,linger,fired:false,tick:0});
}
function releaseEnemyAttack(e){
  const at=e.attack;
  if(at.kind==='lob'){
    enemyZone(at.targetX,at.targetY,at.r,.7,at.damage);
    at.hit=true;
  }
  if(e.boss&&s.stage===2&&at.kind==='slam'){
    enemyZone(at.targetX,at.targetY,86,.85,16,'frost');
  }
}
function threatHits(e){const a=e.attack,p=s.p;if(!a||a.hit)return false;return inStrike(p,{x:e.x,y:e.y,a:a.a,r:a.r,width:a.width,shape:a.kind==='rush'?'line':'sweep',lineWidth:e.boss?50:30})}
function updateEnemies(dt){let attacking=s.enemies.filter(e=>!e.dead&&(e.state==='windup'||e.state==='active')).length;const limit=encounter().pressure;
const grid=new Map();for(const e of s.enemies){if(e.dead)continue;const k=Math.floor(e.x/80)+','+Math.floor(e.y/80);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(e)}
for(const e of s.enemies){if(e.dead)continue;e.phase+=dt;if(e.z>0||e.vz>0){e.vz-=1000*dt;e.z=Math.max(0,e.z+e.vz*dt);if(e.z===0)e.vz=0}e.flash=Math.max(0,e.flash-dt);e.mark=Math.max(0,e.mark-dt);e.armorTextCD-=dt;e.cooldown-=dt;e.timer-=dt;const p=s.p,d=dist(e,p),a=Math.atan2(p.y-e.y,p.x-e.x);
if(e.state==='stagger'){e.x+=e.vx*dt;e.y+=e.vy*dt;e.vx*=Math.exp(-dt*12);e.vy*=Math.exp(-dt*12);if(e.timer<=0){e.state='approach';e.cooldown=.2;e.armored=false}}
else if(e.state==='windup'){if(e.timer<=0){e.state='active';e.timer=e.attack.active;releaseEnemyAttack(e)}}
else if(e.state==='active'){const at=e.attack;if(at.kind==='rush'){e.x+=Math.cos(at.a)*(e.boss?620:400)*dt;e.y+=Math.sin(at.a)*(e.boss?620:400)*dt;if(e.boss&&s.stage===1){const step=Math.min(2,Math.floor((at.active-e.timer)/.17));if(step>=at.trailStep){at.trailStep++;enemyZone(e.x,e.y,64,.45,12,'caramel',1.2)}}}if(at.kind!=='lob'&&threatHits(e)){receiveAttack(at.damage,e);at.hit=true}if(e.timer<=0){e.state='recover';e.timer=at.recovery;e.armored=false}}
else if(e.state==='recover'){if(e.timer<=0){e.state='approach';e.cooldown=.25}}
else {const desired=e.boss?145:e.type===7?310:e.type===5?230:63;
if(e.cooldown<=0&&d<desired+20&&(attacking<limit||e.boss)){startEnemyAttack(e);attacking++}else{let vx=Math.cos(a),vy=Math.sin(a);if(e.type===7&&d<240){vx=-vx;vy=-vy}else if(d<desired-8){vx=0;vy=0}let gx=Math.floor(e.x/80),gy=Math.floor(e.y/80);for(let ix=-1;ix<=1;ix++)for(let iy=-1;iy<=1;iy++)for(const o of grid.get((gx+ix)+','+(gy+iy))||[]){if(e===o)continue;const dx=e.x-o.x,dy=e.y-o.y,dd=Math.hypot(dx,dy),rr=e.r+o.r+5;if(dd>0&&dd<rr){vx+=dx/dd*(rr-dd)/rr*2;vy+=dy/dd*(rr-dd)/rr*2}}const speed=d<desired+50?e.speed*.7:e.speed;e.x+=vx*speed*dt;e.y+=vy*speed*dt}}
e.x=clamp(e.x,30,WORLD-30);e.y=clamp(e.y,30,WORLD-30);
}}
function updateZones(dt){for(const z of s.zones){z.t-=dt;z.tick-=dt;if(z.kind==='enemy'){
  if(z.t<=z.linger&&!z.fired){
    z.fired=true;
    fx('impact',z.x,z.y,z.r,z.theme==='frost'?'#aedcff':z.theme==='caramel'?'#ffb57d':'#ff9ab5',.3);
    if(s.p.z<=36&&dist(s.p,z)<z.r){receiveAttack(z.damage,null);z.hit=true}
  }else if(z.fired&&z.theme==='caramel'&&!z.hit&&dist(s.p,z)<z.r&&s.p.z<=36){
    receiveAttack(z.damage,null);z.hit=true;
  }
}else if(z.kind==='slam'){if(z.tick<=0&&!z.fired){z.fired=true;
    const slam={x:z.x,y:z.y,a:0,r:z.r,width:Math.PI,damage:z.damage,impact:28,knock:23,color:'#ffe0ac'};
    strike(slam);
    if(z.followAction?.followUp.hooked&&z.followAction===s.p.action&&slam.enemyHits&&!z.followAction.aerial)readyCombo('halberd');
    if(z.followAction)z.followAction.followUp.impact=z.followAction.elapsed;
    fx(z.followAction?'halberdSlam':'impact',z.x,z.y,z.r,z.color||'#ffe0ac',.38,{a:z.followAction?.a??0,phantom:s.p.action!==z.followAction});
  }}else if(z.tick<=0){z.tick=.55;if(z.kind==='heal'){if(dist(s.p,z)<z.r)s.p.hp=Math.min(s.p.max,s.p.hp+2)}else if(strike({x:z.x,y:z.y,a:0,r:z.r,width:Math.PI,damage:8,impact:0,knock:0,color:'#ffb07d',damageOnly:true}))fx('ring',z.x,z.y,z.r*.62,'#ffa667',.18)}}s.zones=s.zones.filter(z=>z.t>0)}
function updateAllies(dt){
  const p=s.p,action=p.action,joined=s.ult>0?fusionPartners():[];
  const targets=action?.fired?s.enemies.filter(e=>action.hits.has(e)):[];
  for(const [i,ally] of s.allies.entries()){
    const a=s.total*.4+i*TAU/3;
    ally.x+=(p.x+Math.cos(a)*70-ally.x)*Math.min(1,dt*5);
    ally.y+=(p.y+Math.sin(a)*70-ally.y)*Math.min(1,dt*5);
    ally.cd-=dt;
    if(ally.cd>0||joined.includes(ally.type))continue;
    const support=SUPPORT[ally.type],target=targets.find(e=>!e.dead);
    if(ally.type===1){
      if(!targets.length||p.hp>=p.max)continue;
      const healed=Math.min(6,p.max-p.hp);
      p.hp+=healed;
      text(p.x,p.y-50,'医师治疗 +'+healed,support.color,16);
      fx('ring',p.x,p.y,64,support.color,.5);
    }else if(target){
      const a=Math.atan2(target.y-p.y,target.x-p.x);
      if(ally.type===0){
        hitEnemy(target,18,13,8,a,{color:support.color,damageOnly:true});
        fx('slash',target.x-Math.cos(a)*52,target.y-Math.sin(a)*52,100,support.color,.24,{a,width:1});
      }else{
        fx('link',ally.x,ally.y,0,support.color,.32,{tx:target.x,ty:target.y});
        pullWave({x:p.x,y:p.y,a},190,Math.PI,55);
        hitEnemy(target,8,22,0,a,{color:support.color});
      }
      text(target.x,target.y-65,support.label,support.color,15);
    }else continue;
    ally.cd=support.cooldown;
  }
}
function update(dt){if(state!=='playing')return;if(s.skillBanner)s.skillBanner.t-=dt;s.hitStopCD=Math.max(0,s.hitStopCD-dt);if(s.freeze>0){s.freeze-=dt;return}const p=s.p;p.hurtAnim=Math.max(0,p.hurtAnim-dt);p.landAnim=Math.max(0,p.landAnim-dt);p.rollAnim=Math.max(0,p.rollAnim-dt);s.time+=dt;s.total+=dt;s.toast-=dt;if(p.z>0||p.vz>0){p.vz-=1100*dt;p.z=Math.max(0,p.z+p.vz*dt);if(p.z===0){p.vz=0;p.landAnim=.16;fx('ring',p.x,p.y,42,'#ffe0b7',.24);particles(p.x,p.y,'#e5caa3',6,95);sound('land')}}if(s.toast<=0)$('toast').style.opacity=0;s.shake=Math.max(0,s.shake-dt*38);p.inv-=dt;p.dashCD-=dt;p.dodgeFollow-=dt;p.counter-=dt;p.guard-=dt;p.riposte-=dt;p.chainTime-=dt;p.staminaDelay-=dt;if(p.chainTime<=0&&!p.action)p.chain=0;if(p.staminaDelay<=0)p.stamina=Math.min(100,p.stamina+30*dt);const oldUlt=s.ult;s.ult=Math.max(0,s.ult-dt);if(oldUlt>0&&s.ult===0){p.action=null;p.guard=0;p.riposte=0;toast('合体结束 · 餐具招式恢复',2)}
const input=movementInput();let mx=input.x,my=input.y;const len=Math.hypot(mx,my);p.moving=len>.05;if(len>.05){mx/=Math.max(1,len);my/=Math.max(1,len);p.dx=mx;p.dy=my;if(!p.action)p.aim=Math.atan2(my,mx);if(Math.abs(mx)>.1&&!p.action)p.face=mx>0?1:-1}
let speed=p.speed;if(p.action){const a=p.action;if(a.elapsed<a.wind)speed*=a.kind==='heavy'?.2:.55;else speed*=a.kind==='heavy'&&a.kit!=='chain'&&a.kit!=='12'?.3:.7}if(p.dash>0){p.dash-=dt;mx=p.dashX;my=p.dashY;speed=850;if(frame%2===0)fx('ghost',p.x,p.y,70,currentKit().color,.18,{a:p.aim,z:p.z,face:p.face,dash:p.dash})}p.x=clamp(p.x+mx*speed*dt,30,WORLD-30);p.y=clamp(p.y+my*speed*dt,30,WORLD-30);
updateAction(dt);if(state!=='playing')return;updateEnemies(dt);if(state!=='playing')return;updateZones(dt);if(state!=='playing')return;updateAllies(dt);
if(s.training){p.hp=100;if(s.ult<=0)s.resonance=100;if(s.enemies.filter(e=>!e.dead).length<(s.practice?1:3)){s.enemies=[];spawnDummies()}}
for(const c of s.cages){c.flash=Math.max(0,c.flash-dt);if(c.open&&!c.rescued&&dist(p,c)<65)rescue(c)}for(const item of s.pickups){if(dist(p,item)<36){item.dead=true;p.hp=Math.min(p.max,p.hp+15);text(p.x,p.y-40,'治疗','#c6ffdc');particles(item.x,item.y,'#c6ffdc',15)}}
s.enemies=s.enemies.filter(e=>!e.dead);updateEncounter(dt);s.pickups=s.pickups.filter(i=>!i.dead);for(const e of s.effects)e.t-=dt;s.effects=s.effects.filter(e=>e.t>0);for(const q of s.particles){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=Math.exp(-dt*7);q.vy*=Math.exp(-dt*7)}s.particles=s.particles.filter(q=>q.life>0);for(const t of s.texts){t.t-=dt;t.y-=dt*25}s.texts=s.texts.filter(t=>t.t>0);s.metrics.peak=Math.max(s.metrics.peak,s.enemies.length);if(s.stagePending){s.stagePending=false;stageClear()}if(frame%4===0)updateHUD()}
const RECIPE_TIPS={
  dual:'连斩两次，再用重击引爆。',
  halberd:'重击把怪勾到一起砸下。',
  lance:'轻击标记，重击拉回并吸血。',
};
const RELICS=[
  {name:'重击余震',icon:'♧',mod:'echo',desc:'重击命中后，落点再震一次。'},
  {name:'重击接闪避',icon:'∞',mod:'cancel',desc:'重击命中后，可以立刻再次闪避。'},
];
function recipeCards(){
  return weaponNames.flatMap((name,i)=>{
    if(s.weapons[i])return [];
    const kit=FORMS.find(f=>f.req.length===2&&f.req.includes(0)&&f.req.includes(i));
    return [{
      name:'找到'+name,type:'餐具',icon:weaponIcons[i],color:kit.color,
      headline:kit.name,weapon:i,desc:RECIPE_TIPS[kit.id],
      apply:()=>{
        s.weapons[i]=1;
        s.form=kit.id;s.recipeChosen=true;
        Object.assign(s.p,{action:null,buffer:null,chain:0,chainTime:0});
      },
    }];
  });
}
function recipeIcon(weapon){
  const fork='<path d="M20 48V26m-7-13v9q0 4 4 4h6q4 0 4-4v-9m-7 0v10"/>';
  const tools={
    1:'<path d="M20 48V32h-4V18q0-7 8-7v21h-4"/>',
    2:'<path d="M20 48V28"/><ellipse cx="20" cy="20" rx="6" ry="9"/>',
    3:'<path d="M18 48V18l9-7m-5 37V20l8-6"/>',
  };
  return '<svg class="recipe-icon" viewBox="0 0 58 55" aria-hidden="true" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
    +'<g stroke="#efdbc0" transform="translate(4 1) rotate(29 20 29)">'+fork+'</g>'
    +'<g stroke="currentColor" transform="translate(12 1) rotate(-30 20 29)">'+tools[weapon]+'</g></svg>';
}
function presentChoices(list,mode){
  choiceList=list;choiceMode=mode;state='choice';keys={};
  $('choiceTag').textContent=mode==='relic'?'领主已击破':'第二波已清空';
  $('choiceTitle').textContent=mode==='relic'?'带一项奖励去下一关':'选择一把武器';
  $('choiceSub').textContent='点击卡片或按 '+list.map((_,i)=>i+1).join(' / ');
  const cards=$('cards');
  cards.innerHTML='';
  list.forEach((card,i)=>{
    const button=document.createElement('button');
    button.className='card';
    if(card.color)button.style.setProperty('--reward-color',card.color);
    button.innerHTML='<span class="bigicon">'+(card.weapon?recipeIcon(card.weapon):card.icon)+'</span><h3>'+(card.headline||card.name)+'</h3>'
      +'<p>'+card.desc+'</p><span class="key">'+(i+1)+' / 选择 →</span>';
    button.onclick=()=>selectChoice(i);
    cards.appendChild(button);
  });
  show('choice',true);sound('level');
}
function selectChoice(i){
  if(state!=='choice'||!choiceList[i])return;
  const reward=choiceList[i],mode=choiceMode;
  reward.apply();show('choice',false);state='playing';
  if(mode==='relic'){
    s.relics.push(reward.name);s.stage++;stageSetup();
  }else{
    toast(mode==='recipe'?'已装备 '+form().name:'获得 '+reward.name,2.5);
  }
  if(mode==='recipe')addCages(1);
  updateHUD();
}
function relicCards(){
  const list=RELICS.filter(relic=>!s.mods.has(relic.mod)).map(relic=>({...relic,apply:()=>s.mods.add(relic.mod)}));
  const gear=recipeCards();
  if(gear.length)list.push(gear[(s.stage+(s.routeSide===1?1:0))%gear.length]);
  if(list.length<2)list.push({name:'护行糖衣',icon:'◇',desc:'下一关自动抵挡一次伤害。',apply:()=>s.sugarShield=true});
  if(gear.length&&list.length>2)return [list[s.stage%2],list.at(-1)];
  return list.slice(0,2);
}
function stageClear(){
  s.p.hp=s.p.max;s.p.stamina=100;s.resonance=100;s.p.action=null;s.ult=0;s.sugarShield=false;
  if(s.stage===2){s.relics.push('归途之匙');finish(true);return}
  presentChoices(relicCards(),'relic');
}
function finish(win){state=win?'victory':'dead';keys={};show('choice',false);$('endTag').textContent=win?'THE EXIT IS REAL / 人类胜利':'ANOTHER TRY / 逃生失败';$('endTitle').textContent=win?'放下餐具。我们回家。':'记住前摇，下次接得更漂亮。';$('endSummary').innerHTML='存活 '+formatTime(s.total)+'　·　击破 '+s.kills+'　·　打断 '+s.metrics.interrupts+' 次<br>精准闪避 '+s.metrics.perfectDodges+' 次　·　招架 '+s.metrics.parries+' 次<br>救援 '+s.rescueSet.size+'/3 位人类　·　圣物 '+s.relics.length+' 件';show('end',true);sound(win?'rescue':'hurt')}
function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0')}
function fusionHint(fu){
  if(fu.style==='shield'){
    if(s.p.riposte>0)return '反震就绪 · L 命中后治疗';
    if(s.p.guard>0)return '架盾中 · 可挡普通近战';
    return 'L 架盾 · 挡住近战后再按 L';
  }
  if(fu.style==='chain'){
    const linked=s.enemies.filter(e=>e.markType==='tether'&&e.mark>0&&dist(e,s.p)<=410).length;
    return '可引爆 '+linked+' 个印记 · J 布索 / L 引爆';
  }
  return fu.heavy;
}
function updateHUD(){if(!s)return;const p=s.p,kit=currentKit(),fu=fusion();
const opening=!s.training&&s.stage===0&&s.wave===0&&!s.recipeChosen&&!s.bossSpawned;
$('hud').classList.toggle('opening',opening);
$('equipment').hidden=opening;
$('ult').hidden=opening||(!s.rescueSet.size&&s.resonance<100&&!s.ult);
$('cycleFusion').hidden=fusionOptions().length<2||s.ult>0;$('hptext').textContent=Math.ceil(Math.max(0,p.hp))+' / 100';$('hpfill').style.width=Math.max(0,p.hp)+'%';$('staminafill').style.width=p.stamina+'%';$('stage').textContent=s.training?'练习庭院':stageNames[s.stage];$('boss').style.display=s.boss&&!s.boss.dead?'block':'none';if(s.boss){
  const opening=s.boss.state==='stagger';
  $('boss').classList.toggle('opening',opening);
  $('bossname').textContent=bossNames[s.stage]+' · '+(opening?'破势！趁现在进攻':'架势');
  $('bossfill').style.width=Math.max(0,s.boss.hp/s.boss.max*100)+'%';
  $('poisefill').style.width=(opening?clamp(s.boss.timer/BOSS_OPENING,0,1):s.boss.poise/s.boss.poiseMax)*100+'%';
}
const equipped=form().req;
loadoutSlots.forEach((button,i)=>{
  const locked=!s.weapons[i],active=equipped.includes(i);
  button.disabled=locked;
  button.classList.toggle('locked',locked);
  button.classList.toggle('equipped',active);
  if(button.getAttribute('aria-pressed')!==String(active))button.setAttribute('aria-pressed',String(active));
});
const partners=fusionPartners();
const nextCrew=s.allies.map(a=>{
  const tag=partners.includes(a.type)?'<span class="linked" title="'+SUPPORT[a.type].hint+'">':'<span title="'+SUPPORT[a.type].hint+'">';
  return tag+SUPPORT[a.type].label+'</span>';
}).join('')||'<span>救出人类，解锁合体打法</span>';
if(nextCrew!==crewMarkup){$('crew').innerHTML=nextCrew;crewMarkup=nextCrew}
$('ultname').textContent=(s.ult>0?'合体中 · ':'Q · ')+fu.name;$('ulttext').textContent=s.ult>0?s.ult.toFixed(1)+'s':Math.floor(s.resonance)+'%';$('ultfill').style.width=(s.ult>0?s.ult/12*100:s.resonance)+'%';$('ult').classList.toggle('ready',s.resonance>=100||s.ult>0);$('ulthint').textContent=s.ult>0?fusionHint(fu):s.resonance>=100?'按 Q 合体':'';
$('stanceName').textContent=kit.name;
const follow=activeCombo(),air=s.p.z>10;
$('comboCue').hidden=!follow;
if(follow){
  const button=follow.kind==='heavy'?'L':'J';
  $('comboCue').textContent=(follow.air&&!air?'K → ':'')+button+' · '+follow.name;
}
$('objectiveTitle').textContent=s.training?PRACTICE[s.practice].name:s.bossSpawned?'击败领主':s.bossReady?'护卫已清空':s.waveBreak>0?'准备下一波':'第 '+(s.wave+1)+' 波 / 3';
$('objectiveDetail').textContent=s.training?PRACTICE[s.practice].tip:opening?'方向键 / WASD 移动 · J 轻击':s.bossSpawned?(s.boss?.state==='stagger'?'趁现在进攻':'L 重击可以打破架势'):s.bossReady?'可先救援同伴':s.waveBreak>0?'':'剩余 '+s.enemies.length+' 只';
$('challengeBoss').hidden=!s.bossReady;
$('cyclePractice').hidden=!s.training;
}
function armory(){
  if(state==='armory'){show('armory',false);state='playing';return}
  if(state!=='playing')return;
  if(s.p.action||s.p.dash>0){toast('收招后再换武器',1);return}
  state='armory';keys={};
  const box=$('formCards'),forms=availableForms();
  box.replaceChildren();
  for(const weapon of forms){
    const card=document.createElement('button'),info=skillInfo(weapon.id);
    card.className='form-card'+(s.form===weapon.id?' selected':'');
    card.style.setProperty('--form-color',weapon.color);
    card.dataset.glyph=info.icon;
    card.innerHTML='<h3>'+weapon.name+'</h3><p>'+info.hint+'</p>'+(COMBO_FOLLOW[weapon.id]?'<small>'+COMBO_FOLLOW[weapon.id].hint+'</small>':'');
    card.onclick=()=>{state='playing';equip(weapon.id);show('armory',false)};
    box.appendChild(card);
  }
  armoryCursor=Math.max(0,forms.findIndex(weapon=>weapon.id===s.form));
  show('armory',true);highlightArmory();
}
function pause(){if(state==='playing'){state='paused';show('pauseScreen',true)}else if(state==='paused'){state='playing';show('pauseScreen',false)}keys={}}
function help(){if(state==='help'){show('helpScreen',false);state=helpReturn;return}helpReturn=state;state='help';keys={};show('helpScreen',true)}
function toggleSound(){muted=!muted;$('sound').textContent='声音：'+(muted?'关':'开')}
/*__PRESENTATION_V3__*/
function tick(now){const raw=(now-last)/1000||.016;last=now;frame++;fps=fps*.95+.05/Math.max(.001,raw);if(!testManual)update(Math.min(.035,raw));draw();if(state==='title')drawTitle(now);requestAnimationFrame(tick)}
addEventListener('keydown',e=>{
 if(['Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.repeat)return;
 if(e.code==='KeyM'){toggleSound();return}if(e.code==='KeyH'){help();return}
 if(state==='title'||state==='dead'||state==='victory'){if(e.code==='Enter')start();if(e.code==='KeyT')training();return}
 if(state==='help'){if(e.code==='Enter'||e.code==='Escape')help();return}
 if(state==='paused'){if(['Enter','Escape','KeyP'].includes(e.code))pause();return}
 if(state==='armory'){if(e.code==='KeyR'||e.code==='Escape'){armory();return}const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3}[e.code];if(delta){armoryCursor=clamp(armoryCursor+delta,0,$('formCards').children.length-1);highlightArmory()}if(e.code==='Enter'){const card=$('formCards').children[armoryCursor];if(card&&!card.disabled)card.click()}return}
 if(state==='choice'){if(/^Digit[12]$/.test(e.code))selectChoice(+e.code.slice(-1)-1);return}
 if(e.code==='Enter'){challengeBoss();return}
 if(e.code==='KeyB'){cyclePractice();return}
 if(e.code==='KeyJ')requestAttack('light');if(e.code==='KeyL')requestAttack('heavy');if(e.code==='KeyK')jump();if(e.code==='Space')dash();if(e.code==='KeyQ')activateUlt();if(e.code==='KeyX')cycleForm();if(e.code==='KeyC')cycleFusion();if(e.code==='KeyR')armory();if(e.code==='Escape'||e.code==='KeyP')pause();
});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{keys={};touch=null;$('joystick').style.display='none';if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
// Mouse input deliberately has no combat bindings. Optional touch controls remain separate.
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{if(state!=='playing'||e.pointerType==='mouse')return;canvas.setPointerCapture(e.pointerId);touch={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0};$('joystick').style.cssText='display:block;left:'+(e.clientX-50)+'px;top:'+(e.clientY-50)+'px'});
canvas.addEventListener('pointermove',e=>{if(!touch||e.pointerType==='mouse'||touch.id!==e.pointerId)return;touch.dx=clamp((e.clientX-touch.x)/45,-1,1);touch.dy=clamp((e.clientY-touch.y)/45,-1,1);$('joystick').firstElementChild.style.transform='translate('+touch.dx*28+'px,'+touch.dy*28+'px)'});
function release(){touch=null;$('joystick').style.display='none'}canvas.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')release()});canvas.addEventListener('pointercancel',release);
$('loadout').innerHTML=weaponNames.map((name,i)=>'<button type="button" class="slot" data-weapon="'+i+'"><span class="icon" aria-hidden="true">'+weaponIcons[i]+'</span><small>'+name+'</small></button>').join('');
const loadoutSlots=$('loadout').querySelectorAll('.slot');
loadoutSlots.forEach((button,i)=>button.onclick=()=>{if(state==='playing'&&s.weapons[i])equip(FORMS[i].id)});
$('challengeBoss').onclick=challengeBoss;$('cyclePractice').onclick=cyclePractice;$('start').onclick=start;$('again').onclick=start;$('restartPause').onclick=start;$('resume').onclick=pause;$('pause').onclick=pause;$('help').onclick=help;$('closeHelp').onclick=help;$('sound').onclick=toggleSound;$('ult').onclick=activateUlt;$('ultTouch').onclick=activateUlt;$('dashTouch').onclick=dash;$('lightTouch').onclick=()=>requestAttack('light');$('heavyTouch').onclick=()=>requestAttack('heavy');$('jumpTouch').onclick=jump;$('openArmory').onclick=armory;$('closeArmory').onclick=armory;$('cycleFusion').onclick=cycleFusion;
window.SugarBreak={snapshot:()=>s?{version:'oblique-keyboard-3',aim:s.p.aim,face:s.p.face,z:s.p.z,projection:DEPTH,heroAtlas:heroSheet.naturalWidth,motionFrames:moveRects.filter(Boolean).length,attackFrames:attackRects.filter(Boolean).length,weaponSprites:weaponRects.filter(Boolean).length,attackPose:attackPose(s.p.action),comboReady:activeCombo()?.name??null,motionPose:motionPose(s.p),fusionSprites:fusionRects.filter(Boolean).length,stageArt:stageArt[s.stage].naturalWidth,state,training:!!s.training,practice:s.practice,stage:s.stage,wave:s.wave,waveBreak:s.waveBreak,bossReady:s.bossReady,time:s.time,total:s.total,hp:s.p.hp,stamina:s.p.stamina,kills:s.kills,enemies:s.enemies.length,weapons:[...s.weapons],form:s.form,mods:[...s.mods],action:s.p.action?{kind:s.p.action.kind,combo:s.p.action.combo,chain:s.p.action.chain,a:s.p.action.a,aerial:s.p.action.aerial,followUp:s.p.action.followUp?{impact:s.p.action.followUp.impact??null}:null,dodge:s.p.action.dodge,riposte:s.p.action.riposte,counter:s.p.action.counter,fired:s.p.action.fired}:null,chain:s.p.chain,allies:s.allies.map(a=>a.type),hostages:s.hostages.map(a=>a.type),fusionKey:s.fusionKey,fusion:fusion().name,resonance:s.resonance,ult:s.ult,boss:s.boss?{hp:s.boss.hp,poise:s.boss.poise,state:s.boss.state}:null,metrics:{...s.metrics},fps,atlas:atlas.naturalWidth}: {state,atlas:atlas.naturalWidth}};
if(new URLSearchParams(location.search).get('test')==='1')Object.assign(window.SugarBreak,{manual:v=>testManual=v,start,training,step:(dt,n=1)=>{for(let i=0;i<n;i++)update(dt);draw();updateHUD()},set:v=>Object.assign(s,v),player:v=>Object.assign(s.p,v),position:()=>({x:s.p.x,y:s.p.y}),attack:requestAttack,dash,jump,project,ult:activateUlt,equip,cycleForm,cycleFusion,bossSpawn,killBoss:()=>{if(s.boss){s.boss.hp=0;s.boss.dead=true;s.stagePending=true}},choose:selectChoice,rescue:(i)=>{addCages();for(const c of s.cages)if(i===undefined||c.ally===i){c.open=true;rescue(c)}},enemy:(x,y,type=0,extra={})=>{const e=makeEnemy(x,y,type,extra);s.enemies.push(e);return s.enemies.length-1},enemyInfo:i=>{const e=s.enemies[i];return e?{hp:e.hp,state:e.state,timer:e.timer,armored:e.armored,type:e.type,mark:e.mark,markType:e.markType,x:e.x,y:e.y}:null},setEnemy:(i,v)=>Object.assign(s.enemies[i],v),enemyAttack:i=>startEnemyAttack(s.enemies[i]),hazards:()=>s.zones.filter(z=>z.kind==='enemy').map(z=>({theme:z.theme,fired:z.fired,x:z.x,y:z.y})),receive:(d,i)=>receiveAttack(d,s.enemies[i]),fusionOptions,availableForms:()=>availableForms().map(f=>f.id),choices:()=>choiceList.map(u=>({name:u.name,type:u.type,desc:u.desc,headline:u.headline})),pause,help,armory,aim:a=>{s.p.aim=a}});
requestAnimationFrame(tick);
})();
