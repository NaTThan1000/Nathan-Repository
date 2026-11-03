// 从已审核素材裁切、归一化并内嵌；不运行旧 build.cjs，不覆盖后来修改的战斗逻辑。
const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/Fishy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../Assets/scrap-star-review'),assets={};
const read=f=>fs.readFileSync(path.join(root,f));
async function add(name,file,rect){let p=sharp(read(file));if(rect)p=p.extract({left:rect[0],top:rect[1],width:rect[2],height:rect[3]});assets[name]='data:image/png;base64,'+(await p.png().toBuffer()).toString('base64');}
async function main(){
 const ms={'向下':{top:190,bottom:499,height:310,jumpTop:183,shot:[327,517],hit:[300,498]},'向上':{top:217,bottom:487,height:271,jumpTop:167,shot:[295,501],hit:[263,487]},'向左':{top:242,bottom:487,height:246,jumpTop:200,shot:[252,487],hit:[246,487]},'向右':{top:241,bottom:492,height:252,jumpTop:196,shot:[262,495],hit:[253,492]}};
 for(const [dir,cn] of Object.entries({down:'向下',up:'向上',left:'向左',right:'向右'}))for(const action of ['idle','move1','move2','move3','shoot','hit']){
  const m=ms[cn],move=action.startsWith('move'),file='动作拆分/'+cn+'/'+(action==='idle'?'待机':action==='shoot'?'射击':action==='hit'?'受击':'移动-'+action.slice(-1))+(move&&['up','down'].includes(dir)?'.svg':'.png');
  const raw=await sharp(read(file)).png().toBuffer(),meta=await sharp(raw).metadata();let scale=100/m.height,baseline=m.bottom,offset=0;
  if(action==='shoot'){scale=100/m.shot[0];baseline=m.shot[1]}if(action==='hit'){scale=100/m.hit[0];baseline=m.hit[1]}
  if(action==='move2')offset=m.top-m.jumpTop-(42*.47)/(246*.47/m.height);
  const x=90-meta.width*scale/2,y=150-baseline*scale+offset*scale;
  let layers=`<image href="data:image/png;base64,${raw.toString('base64')}" x="${x}" y="${y}" width="${meta.width*scale}" height="${meta.height*scale}"/>`;
  if(dir==='down'&&action==='hit')for(const sx of [30,224]){const mark=await sharp(read('动作拆分/向上/受击.png')).extract({left:sx,top:237,width:46,height:74}).png().toBuffer();layers+=`<image href="data:image/png;base64,${mark.toString('base64')}" x="${x+sx*scale}" y="${y+211*scale}" width="${46*scale}" height="${74*scale}"/>`}
  assets['hero-'+dir+'-'+action]='data:image/png;base64,'+(await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="190">${layers}</svg>`)).png().toBuffer()).toString('base64');
 }
 const enemies={melee:[[42,246],[296,508],[565,770],[811,1034],[1059,1327],[1379,1581],[1631,1859],[1880,2145]],ranged:[[50,257],[307,506],[556,758],[815,1017,916],[1074,1267,1172],[1382,1591],[1654,1842],[1896,2123]]};
 for(let f=1;f<=6;f++){const png=read('动作拆分/失败/失败-'+f+'.png'),m=await sharp(png).metadata(),s=100/246;assets['defeat'+(f-1)]='data:image/png;base64,'+(await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="190"><image href="data:image/png;base64,${png.toString('base64')}" x="${90-m.width*s/2}" y="${150-510*s}" width="${m.width*s}" height="${m.height*s}"/></svg>`)).png().toBuffer()).toString('base64')}
 for(const [type,ranges]of Object.entries(enemies))for(let i=0;i<ranges.length;i++){
  const [a,b,anchor=(a+b)/2]=ranges[i],png=await sharp(read('enemy-'+type+'.png')).extract({left:a,top:0,width:b-a+1,height:724}).png().toBuffer();
  assets[type+i]='data:image/png;base64,'+(await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="340"><image href="data:image/png;base64,${png.toString('base64')}" x="${150-(anchor-a)*.47}" y="${240-470*.47}" width="${(b-a+1)*.47}" height="${724*.47}"/></svg>`)).png().toBuffer()).toString('base64');
 }
 for(const [i,[a,b]]of [[57,309],[398,657],[743,1005],[1076,1393],[1473,1768],[1867,2095]].entries())await add('crate'+i,'crate-break.png',[a-5,0,b-a+11,724]);
 await add('facility','objects-effects-draft.png',[0,0,250,260]);
 // 使用审核后的四向门（含渐隐阴影），不引用草稿门。
 const room=await sharp(read('room-modules.svg')).png().toBuffer();
 for(const [n,r]of Object.entries({floor:[130,106,140,140],wallH:[338,66,354,63],wallV:[754,20,79,275],cornerTL:[1067,20,131,117],cornerTR:[1258,20,132,117],cornerBL:[1067,180,131,117],cornerBR:[1258,180,132,117],upClosed:[359,343,176,87],upOpen:[1005,343,176,87],downClosed:[359,479,176,79],downOpen:[1005,479,176,79],leftClosed:[203,704,148,177],leftOpen:[483,704,148,177],rightClosed:[909,704,148,177],rightOpen:[1190,704,148,177]}))assets[n]='data:image/png;base64,'+(await sharp(room).extract({left:r[0],top:r[1],width:r[2],height:r[3]}).png().toBuffer()).toString('base64');
 for(const [name,r]of Object.entries({heart:[30,46,104,101],halfHeart:[143,46,104,101],emptyHeart:[254,46,104,101],mp:[371,50,88,91],mpEmpty:[461,50,88,91],ap:[559,50,96,91],apEmpty:[656,50,96,91],attack:[769,46,91,101],range:[862,46,95,101],coin:[960,46,93,101],bomb:[1056,46,94,101],key:[1153,46,87,101],help:[1642,50,103,100],panel:[82,344,630,177],button:[61,717,450,141],slot:[1451,345,198,180],alert:[1443,185,83,129]}))await add(name,'ui-draft.png',r);
 await add('remote','remote-projectile.svg');
 for(const [dir,y]of Object.entries({up:80,down:300,left:510,right:740}))for(let f=0;f<3;f++)await add('bullet-'+dir+f,'bullets-four-directions.png',[[275,645,1013][f],y,250,220]);
 for(let f=0;f<4;f++)await add('impact'+f,'impact-expiration-orange.png',[(f+2)*295,0,295,443]);
 for(let f=0;f<2;f++)await add('expire'+f,'impact-expiration-orange.png',[(f+4)*295,444,295,443]);
 // 仅截取发光方框本身，排除外部光晕留白，使可见边界与地格重合。
 await add('blueGrid','objects-effects-draft.png',[1043,100,136,136]);await add('redGrid','objects-effects-draft.png',[1231,100,136,136]);
 for(let f=0;f<6;f++)await add('rewind'+f,'objects-effects-draft.png',[[50,290,510,750,980,1240][f],810,240,210]);
 const out=path.join(__dirname,'index.html');let html=fs.readFileSync(out,'utf8');
 const runtime=fs.readFileSync(path.join(__dirname,'scrap-star-runtime.js'),'utf8');
 const block='\n// SCRAP_STAR_START\nconst SCRAP_ASSETS='+JSON.stringify(assets)+';\n'+runtime+'\n// SCRAP_STAR_END\n';
 if(html.includes('// SCRAP_STAR_START'))html=html.replace(/\n\/\/ SCRAP_STAR_START[\s\S]*?\/\/ SCRAP_STAR_END\n/,block);else html=html.replace('bootGame().then(',block+'bootGame().then(');
 const css=fs.readFileSync(path.join(__dirname,'scrap-star.css'),'utf8');
 const style='<style id="scrap-star-style">'+css+'</style>';
 if(html.includes('<style id="scrap-star-style">'))html=html.replace(/<style id="scrap-star-style">[\s\S]*?<\/style>/,style);else html=html.replace('</head>',style+'</head>');
 html=html.replace(/<title>.*?<\/title>/,'<title>Scrap Star · 战斗美术试玩</title>');
 // 预测闭包继续序列化原函数，视觉包装不进入规则模拟。
 html=html.replace('getAttackSideCells,resolveAfterEffects,','getAttackSideCells,scrapOriginalResolve,').replace('applyMonsterTurnAfterEffects,spawnMonsterBullet,','applyMonsterTurnAfterEffects,scrapOriginalMonsterBullet,');
 html=html.replace('setupPlaytestPanel(); startPlaytest(0);','setupPlaytestPanel(); startPlaytest(SCRAP_DEMO_SCENE);');
 // 玩家衰减阶段自然消失也属于射程结束；碰撞仍使用命中特效。
 html=html.replace(/(if \(b.distTraveled >= b.maxDist\) b.distTraveled = b.maxDist;\r?\n\s*)shatterBullet\(b\);/,"$1shatterBullet(b, 'expire');");
 new (require('vm').Script)(html.match(/<script>([\s\S]*?)<\/script>/)[1]);fs.writeFileSync(out,html);console.log('已内嵌 '+Object.keys(assets).length+' 个素材，生成独立试玩页 '+(Buffer.byteLength(html)/1048576).toFixed(1)+' MB');
}
main().catch(e=>{console.error(e);process.exitCode=1});
