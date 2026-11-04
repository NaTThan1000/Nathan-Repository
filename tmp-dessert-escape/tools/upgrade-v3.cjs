const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const gamePath=path.join(root,'src/action-game.js');let g=fs.readFileSync(gamePath,'utf8');
function replace(a,b){if(!g.includes(a))throw Error('未找到运行代码锚点: '+a.slice(0,65));g=g.replace(a,b)}
if(g.includes('/*__PRESENTATION_V3__*/'))throw Error('V3 已接入，无需重复迁移');
replace("let keys={},pointer={x:0,y:0,active:false},touch=null;","let keys={},touch=null;");
replace("keys={};pointer.active=false;s=", "keys={};s=");
replace("staminaDelay:0},stage:","staminaDelay:0,z:0,vz:0,moving:false},stage:");
replace("鼠标左键 / J 轻击 · 右键 / K 重击 · 空格闪避","方向键 / WASD 移动朝向 · J 普攻 · K 重击 · L 跳跃");
replace("function fx(type,x,y,r,color,t=.3,extra={}){s.effects.push", "function fx(type,x,y,r,color,t=.3,extra={}){if(s.effects.length>=180)s.effects.shift();s.effects.push");
replace("function aimAngle(){return pointer.active?Math.atan2(pointer.y-H/2,pointer.x-W/2):s.p.aim}",`function movementInput(){return touch?{x:touch.dx,y:touch.dy}:{x:(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),y:(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)}}
function aimAngle(){const move=movementInput();return Math.hypot(move.x,move.y)>.05?Math.atan2(move.y,move.x):s.p.aim}
function jump(){if(state!=='playing'||s.p.z>0||s.p.stamina<10)return false;const p=s.p;p.stamina-=10;p.staminaDelay=.3;p.z=1;p.vz=400;p.action=null;p.buffer=null;fx('ring',p.x,p.y,38,'#d3f5e1',.25);sound('dash');return true}`);
replace("cost=heavy?24:5;", "cost=heavy?24:5;");
replace("dodge,counter,kit:s.ult>0?", "dodge,counter,aerial:p.z>10,dive:heavy&&p.z>10,kit:s.ult>0?");
replace("p.aim=p.action.a;p.face=Math.cos(p.aim)>=0?1:-1;", "p.aim=p.action.a;if(Math.abs(Math.cos(p.aim))>.1)p.face=Math.cos(p.aim)>=0?1:-1;if(p.action.dive){p.vz=-520;p.action.wind=.08}if(heavy)announceSkill(p.action);");
replace("function receiveAttack(damage,source){const p=s.p;", "function receiveAttack(damage,source){const p=s.p;if(p.z>36&&!(source?.boss&&source.attack?.kind==='sweep'))return;");
replace("e.hp-=damage;e.flash=.14;", "e.hp-=damage;e.flash=.14;fx('hitburst',e.x,e.y,35,options.color||'#ffe4c0',.25,{a});");
replace("e.vx=Math.cos(a)*knock*7;e.vy=Math.sin(a)*knock*7", "e.vx=Math.cos(a)*knock*7;e.vy=Math.sin(a)*knock*7;if(impact>=22){e.vz=impact>=30?280:170;e.z=Math.max(e.z||0,1)}");
replace("if(e.hp<=0){e.dead=true;s.kills++;", "if(e.hp<=0){fx('defeat',e.x,e.y,85,e.color||'#f9b9cd',.45,{index:e.boss?e.type:e.type+4,a});e.dead=true;s.kills++;");
replace("phase:rng(0,TAU),flash:0", "phase:rng(0,TAU),z:0,vz:0,flash:0");
replace("e.phase+=dt;e.flash=", "e.phase+=dt;if(e.z>0||e.vz>0){e.vz-=1000*dt;e.z=Math.max(0,e.z+e.vz*dt);if(e.z===0)e.vz=0}e.flash=");
replace("s.p.x=1150;s.p.y=1150;s.p.action=null", "s.p.x=1150;s.p.y=1150;s.p.z=0;s.p.vz=0;s.p.action=null");
replace("a.elapsed+=dt;if(!a.fired&&a.elapsed>=a.wind)", "a.elapsed+=dt;if(a.dive&&!a.fired){p.vz=-520;a.duration=Math.max(a.duration,a.elapsed+.28)}if(!a.fired&&a.elapsed>=a.wind&&(!a.dive||p.z<12))");
replace("{a:opt.a,width:opt.width,reverse:action.chain===2,heavy}","{a:opt.a,width:opt.width,reverse:action.chain===2,heavy,kit:action.kit,aerial:action.aerial}");
replace("color,heavy?.38:.23", "color,heavy?.72:.29");
replace("if(action.dodge&&s.mods.has('chase'))", "if(action.aerial){opt.r+=25;opt.impact=Math.max(opt.impact,35);opt.knock+=15;fx('impact',p.x,p.y,140,color,.55)}if(action.dodge&&s.mods.has('chase'))");
replace("s.hitStopCD=Math.max(0,s.hitStopCD-dt);", "if(s.skillBanner)s.skillBanner.t-=dt;s.hitStopCD=Math.max(0,s.hitStopCD-dt);");
replace("s.time+=dt;s.total+=dt;s.toast-=dt;", "s.time+=dt;s.total+=dt;s.toast-=dt;if(p.z>0||p.vz>0){p.vz-=1100*dt;p.z=Math.max(0,p.z+p.vz*dt);if(p.z===0){p.vz=0;fx('ring',p.x,p.y,48,'#ffe0b7',.26)}}");
const moveStart=g.indexOf('let mx=(keys.KeyD',g.indexOf('function update(dt)')),moveEnd=g.indexOf('\nlet speed=p.speed;',moveStart);
if(moveStart<0||moveEnd<0)throw Error('移动段缺失');
g=g.slice(0,moveStart)+`const input=movementInput();let mx=input.x,my=input.y;const len=Math.hypot(mx,my);p.moving=len>.05;if(len>.05){mx/=Math.max(1,len);my/=Math.max(1,len);p.dx=mx;p.dy=my;if(!p.action)p.aim=Math.atan2(my,mx);if(Math.abs(mx)>.1&&!p.action)p.face=mx>0?1:-1}`+g.slice(moveEnd);
replace("{a:p.aim})", "{a:p.aim,z:p.z})");
replace("'鼠标瞄准 · 点按出招'", "'移动确定朝向 · J 普攻 / K 重击'");
replace("$('objective').innerHTML=", "updateSkillHUD();$('objective').innerHTML=");
replace("b.className='form-card '+", "b.dataset.form=f.id;b.className='form-card '+");
replace("show('armory',true)}", "show('armory',true);armoryCursor=FORMS.findIndex(f=>f.id===s.form);highlightArmory()}");
const renderStart=g.indexOf('function sprite('),renderEnd=g.indexOf('function tick(',renderStart);
if(renderStart<0||renderEnd<0)throw Error('绘制段缺失');g=g.slice(0,renderStart)+'/*__PRESENTATION_V3__*/\n'+g.slice(renderEnd);
const inputStart=g.indexOf("addEventListener('keydown'"),inputEnd=g.indexOf("$('start').onclick",inputStart);
if(inputStart<0||inputEnd<0)throw Error('输入段缺失');
g=g.slice(0,inputStart)+`addEventListener('keydown',e=>{
 if(['Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.repeat)return;
 if(e.code==='KeyM'){toggleSound();return}if(e.code==='KeyH'){help();return}
 if(state==='title'||state==='dead'||state==='victory'){if(e.code==='Enter')start();return}
 if(state==='help'){if(e.code==='Enter'||e.code==='Escape')help();return}
 if(state==='paused'){if(['Enter','Escape','KeyP'].includes(e.code))pause();return}
 if(state==='armory'){if(e.code==='KeyR'||e.code==='Escape'){armory();return}const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3}[e.code];if(delta){armoryCursor=clamp(armoryCursor+delta,0,FORMS.length-1);highlightArmory()}if(e.code==='Enter'){const card=$('formCards').children[armoryCursor];if(card&&!card.disabled)card.click()}return}
 if(state==='choice'){if(/^Digit[123]$/.test(e.code))selectChoice(+e.code.slice(-1)-1);return}
 if(e.code==='KeyJ')requestAttack('light');if(e.code==='KeyK')requestAttack('heavy');if(e.code==='KeyL')jump();if(e.code==='Space')dash();if(e.code==='KeyQ')activateUlt();if(e.code==='KeyX')cycleForm();if(e.code==='KeyC')cycleFusion();if(e.code==='KeyR')armory();if(e.code==='Escape'||e.code==='KeyP')pause();
});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{keys={};touch=null;$('joystick').style.display='none';if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
// Mouse input deliberately has no combat bindings. Optional touch controls remain separate.
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{if(state!=='playing'||e.pointerType==='mouse')return;canvas.setPointerCapture(e.pointerId);touch={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0};$('joystick').style.cssText='display:block;left:'+(e.clientX-50)+'px;top:'+(e.clientY-50)+'px'});
canvas.addEventListener('pointermove',e=>{if(!touch||e.pointerType==='mouse'||touch.id!==e.pointerId)return;touch.dx=clamp((e.clientX-touch.x)/45,-1,1);touch.dy=clamp((e.clientY-touch.y)/45,-1,1);$('joystick').firstElementChild.style.transform='translate('+touch.dx*28+'px,'+touch.dy*28+'px)'});
function release(){touch=null;$('joystick').style.display='none'}canvas.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')release()});canvas.addEventListener('pointercancel',release);
`+g.slice(inputEnd);
replace("version:'manual-melee-2'", "version:'oblique-keyboard-3',aim:s.p.aim,face:s.p.face,z:s.p.z,projection:DEPTH,heroAtlas:heroSheet.naturalWidth,stageArt:stageArt.naturalWidth");
replace("chain:s.p.action.chain,dodge", "chain:s.p.action.chain,a:s.p.action.a,aerial:s.p.action.aerial,dodge");
replace("attack:requestAttack,dash,ult:", "attack:requestAttack,dash,jump,project,ult:");
replace("aim:a=>{pointer.active=false;s.p.aim=a}", "aim:a=>{s.p.aim=a}");
fs.writeFileSync(gamePath,g);
const buildPath=path.join(root,'build.cjs');let b=fs.readFileSync(buildPath,'utf8');b=b.replace("fs.readFileSync(path.join(root, 'src/action-game.js'), 'utf8')", "fs.readFileSync(path.join(root, 'src/action-game.js'), 'utf8').replace('/*__PRESENTATION_V3__*/', () => fs.readFileSync(path.join(root, 'src/presentation-v3.js'), 'utf8'))");b=b.replace("fs.writeFileSync(path.join(root, '甜界逃生.html'), html);",`for (const [token, name] of [['__HERO_DATA__','hero-motion-v3.png'],['__STAGE_DATA__','promenade-v3.png']]) html=html.replace(token,()=> 'data:image/png;base64,'+fs.readFileSync(path.join(root,'assets',name)).toString('base64'));
fs.writeFileSync(path.join(root, '甜界逃生.html'), html);`);fs.writeFileSync(buildPath,b);
const uiPath=path.join(root,'src/index.html');let h=fs.readFileSync(uiPath,'utf8');
h=h.replace("<script>const ATLAS_URL='__ATLAS_DATA__';", "<script>const ATLAS_URL='__ATLAS_DATA__',HERO_URL='__HERO_DATA__',STAGE_URL='__STAGE_DATA__';");
h=h.replace('甜界逃生 · 手动近战版','甜界逃生 · 斜俯视动作版');
h=h.replace('手动近战版 DEMO · 左轻 / 右重 / 空格闪避','斜俯视动作版 · ENTER 开始 · J 普攻 / K 重击 / L 跳跃');
h=h.replace('MANUAL MELEE / EVERY STRIKE IS YOURS','SUGAR BREAK / A CONFECTIONERY BEAT ’EM UP');
h=h.replace('拿起叉子，开始逃生　↗','ENTER　拿起餐具，杀出糖围');
h=h.replace('<kbd>WASD</kbd> 移动 · 鼠标瞄准<br><kbd>左键 / J</kbd> 轻击 · <kbd>右键 / K</kbd> 重击 · <kbd>空格</kbd> 闪避','<kbd>方向键 / WASD</kbd> 移动与朝向<br><kbd>J</kbd> 普攻 · <kbd>K</kbd> 重击 · <kbd>L</kbd> 跳跃 · <kbd>空格</kbd> 闪避');
h=h.replace('WASD 移动，鼠标指定攻击方向。点左键 / J 轻击，连续点按可接三段；右键 / K 重击。','方向键 / WASD 移动并决定攻击朝向；松开后保持最后朝向。J 普攻，可连按衔接三段；K 重击，L 跳跃，空中 K 使出落斩。');
h=h.replace('无鼠标时向移动方向出招。','本次攻击中锁定出招方向，下一次攻击按最新移动朝向。');
h=h.replace('点击卡片或按 1 / 2 / 3','按 1 / 2 / 3');
h=h.replace('单持与双餐具互斥装备 · X 快速轮换搭配 · 战斗已暂停','方向键选择 · ENTER 装备 · R 返回 · X 快速轮换');
h=h.replace('<div id="toast"></div>', '<div id="toast"></div><div id="skillBanner"><span>— SPECIAL RECIPE —</span><strong id="skillName"></strong><small id="skillHint"></small></div><div class="action-deck"><div><kbd>J</kbd><b>普攻连段</b><small>点按三段 / 接 K</small></div><div class="special"><kbd>K</kbd><b id="skillLabel">破晓贯刺</b><small id="skillRecipe">向前贯穿一条直线</small></div><div><kbd>空格</kbd><b>闪避反击</b><small>闪避 → J / K</small></div><div><kbd>L</kbd><b>跳跃落斩</b><small>跳跃 → K</small></div></div>');
h=h.replace('</style>',`\n#title{background:linear-gradient(90deg,#171426f5 10%,#20172cc4 58%,#261c2a99)}.title-copy h1{font-size:clamp(60px,6.5vw,92px)}.top{top:20px}.health{background:#201a2ada;border:1px solid #9e788044;padding:9px 12px;border-radius:8px;width:245px}.brand{font-size:17px}.objective{top:154px;background:#21192ca8;border-left:2px solid #b7d8bb66;padding:7px 12px;border-radius:0 8px 8px 0;line-height:1.8}.utility{top:78px}.stance-panel{left:24px;bottom:150px;max-width:275px;background:#1f192ce8}.stance-panel strong{font-size:15px}.stance-panel p{font-size:10px}.controls{display:none}.bottom{bottom:17px;left:24px;right:24px}.slot{width:46px;height:46px;border-radius:8px}.slot .icon{font-size:22px}.crew{font-size:10px;gap:4px}.crew span{padding:4px 6px}.crew-button{padding:3px 7px}.ult{width:277px;min-height:84px;border-color:#c9b78b88}.ult strong{font-size:12px}.ult small{font-size:9px}.action-deck{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:6px;pointer-events:none}.action-deck>div{width:91px;min-height:84px;background:linear-gradient(145deg,#3b2d42f2,#211b30f2);border:1px solid #a3898c66;border-radius:9px;padding:10px 9px 7px;display:flex;flex-direction:column}.action-deck>div.special{width:145px;border-color:#efcc9aaa}.action-deck kbd{font:900 14px Georgia;color:#fbe4b4;margin-bottom:7px}.action-deck b{font-size:11px;white-space:nowrap;color:#f0e2da}.action-deck small{font-size:9px;color:#c6afb7;line-height:1.5;margin-top:4px}.action-deck .special small{max-width:125px}#skillBanner{position:absolute;top:24%;left:50%;transform:translateX(-50%);text-align:center;opacity:0;transition:opacity .12s;white-space:nowrap;filter:drop-shadow(0 3px 5px #160d24)}#skillBanner span{display:block;letter-spacing:5px;color:var(--skill-color,#ffe2ba);font-size:9px}#skillBanner strong{display:block;font-size:32px;letter-spacing:3px;color:#fff3dc;font-weight:900;margin:7px 0;text-shadow:0 0 20px var(--skill-color,#fbd)}#skillBanner small{font-size:12px;color:#e9d6cd}.form-card{min-height:180px;position:relative;overflow:hidden}.form-card:before{content:attr(data-glyph);position:absolute;right:9px;top:10px;font-size:60px;opacity:.13;color:var(--form-color,#bff);font-family:Georgia}.form-card.kbd-selected{outline:2px solid #f7deab;outline-offset:-3px;background:linear-gradient(135deg,#50404f,#2c263a)}.form-card h3{font-size:17px}.form-card p{font-size:11px}.form-card .cast-name{color:#ffe5b6;font-weight:800;margin:5px 0;display:block;font-size:12px}.form-card small{font-size:10px}.stats{gap:18px;font-size:11px}.stats b{font-size:22px}#toast{top:18%;font-size:14px;color:#f0e2c3}.overlay{background:#151322cc}.panel h2{font-size:35px}.eyebrow{letter-spacing:3px}@media(max-width:1100px){.action-deck{left:53%;gap:4px}.action-deck>div{width:66px;padding:7px}.action-deck>div.special{width:120px}.action-deck small{font-size:8px}.action-deck>div:last-child{display:none}.ult{width:235px}.stance-panel{max-width:240px}.stats{gap:9px}}@media(max-width:850px){.action-deck{left:auto;right:15px;transform:none;bottom:113px}.action-deck>div{min-height:72px}.action-deck>div:nth-child(3){display:none}.stance-panel{bottom:160px}.health{width:205px}.objective{top:151px;font-size:10px}.ult{width:210px}#skillBanner strong{font-size:22px}.title-copy h1{font-size:62px}.stats .kill{display:none}}\n</style>`);
fs.writeFileSync(uiPath,h);console.log('已接入纯键盘控制、跳跃、斜俯视渲染与新界面');
