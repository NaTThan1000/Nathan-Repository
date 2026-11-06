const fs=require('fs'),path=require('path');
const sharp=require('./runtime-deps.cjs').runtimeDependency('sharp');
const root=path.resolve(__dirname,'../Assets/single-step-enemies');
const sheets={turret:['idle','shoot'],slime:['idle','ready','charge'],bomber:['idle','ready'],charger:['idle'],x:['idle','shoot','jump'],cross:['idle','shoot','jump'],effects:['destroy','blast','charge']};
async function buildSingleStepArt(){
 const assets={},out=path.join(root,'frames');fs.mkdirSync(out,{recursive:true});
 for(const [sheet,states]of Object.entries(sheets)){
  const source=path.join(root,'source',sheet+'.png'),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),width=Math.floor(info.width/3);
  let left=width,top=info.height,right=0,bottom=0;
  for(let frame=0;frame<states.length;frame++)for(let y=0;y<info.height;y++)for(let x=0;x<width;x++)if(data[(y*info.width+frame*width+x)*4+3]>64){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(left>right)throw Error('资源透明或无有效像素：'+sheet);
  left=Math.max(0,left-4);top=Math.max(0,top-4);right=Math.min(width-1,right+4);bottom=Math.min(info.height-1,bottom+4);
  for(let frame=0;frame<states.length;frame++){
   // 同一角色使用各帧联合边界及同一缩放，保留状态间尺寸关系。
   const image=await sharp(source).extract({left:frame*width+left,top,width:right-left+1,height:bottom-top+1}).resize(256,256,{fit:'contain',background:'#00000000'}).png().toBuffer();
   const key='unit-'+sheet+'-'+states[frame];fs.writeFileSync(path.join(out,key+'.png'),image);assets[key]='data:image/png;base64,'+image.toString('base64');
  }
 }
 const freeze=await sharp(path.join(root,'source/time-freeze-board.png')).resize(720,560,{fit:'fill'}).png().toBuffer();
 fs.writeFileSync(path.join(out,'time-freeze-board.png'),freeze);assets['time-freeze-board']='data:image/png;base64,'+freeze.toString('base64');
 const labels={turret:'固定炮台',slime:'史莱姆',bomber:'背弹自爆者',charger:'履带冲锋者',x:'X跳跃射手',cross:'十字跳跃射手',effects:'通用特效'};
 const review='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>单步怪物固定帧审核</title><style>body{background:#12222a;color:#dfedef;font:16px Microsoft YaHei UI;padding:24px}section{display:flex;gap:20px;flex-wrap:wrap;border-bottom:1px solid #3c5964;padding:12px}figure{margin:0;text-align:center;background:#263b43;border-radius:8px;padding:12px}img{width:180px;height:180px;object-fit:contain}h1{color:#f8d386}</style><h1>新怪物固定状态帧</h1><p>移动射手、近战者沿用既有审核素材；小史莱姆复用缩小的史莱姆本体，摧毁特效不随体型缩小。无连续动画序列。</p>'+Object.entries(sheets).map(([name,states])=>'<h2>'+labels[name]+'</h2><section>'+states.map(state=>'<figure><img src="'+assets['unit-'+name+'-'+state]+'"><figcaption>'+state+'</figcaption></figure>').join('')+'</section>').join('')+'</html>';
 fs.writeFileSync(path.join(root,'固定帧审核.html'),review);
 return assets;
}
module.exports={buildSingleStepArt};
