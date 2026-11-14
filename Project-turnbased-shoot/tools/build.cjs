// 日常构建只写项目根目录的两个可双击试玩包。
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {assembleGame}=require('./assemble-game.cjs');
const {inlineResources}=require('./inline-resources.cjs');
const {buildScrapAssets}=require('./build-scrap-assets.cjs');
const {buildSingleStepArt}=require('./build-single-step-art.cjs');

const projectRoot=path.resolve(__dirname,'..');

function writeHtml(directory,name,html){
  new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  const file=path.join(directory,name);
  fs.writeFileSync(file,html);
  return file;
}

async function buildPlayable(){
  const assets=await buildScrapAssets();
  for(const [name,sandbox] of [['turnbased-shoot-demo-pack.html',false],['custom-arena.html',true]]){
    writeHtml(projectRoot,name,inlineResources(await assembleGame({assets,sandbox})));
    console.log('已生成 '+name);
  }
}

async function buildRegressionFixtures(directory){
  const assets=await buildScrapAssets();
  const legacy=writeHtml(directory,'combat-playtest.html',
    inlineResources(await assembleGame({assets,playtest:true})));
  const prototypeAssets=Object.fromEntries(Object.entries(assets).filter(([key])=>
    key.startsWith('hero-') ||
    /^(melee|ranged)[0-7]$/.test(key) ||
    /^bullet-(up|down|left|right)[0-2]$/.test(key) ||
    /^(impact[0-3]|expire[0-1]|defeat[0-5])$/.test(key) ||
    ['floor','facility','redGrid','heart','emptyHeart','remote','leftOpen','leftClosed','rightOpen','rightClosed'].includes(key)
  ));
  Object.assign(prototypeAssets,await buildSingleStepArt(),{alert:assets.alert,blueGrid:assets.blueGrid});
  const source=name=>fs.readFileSync(path.join(projectRoot,'src/playtest',name),'utf8');
  const scripts=['bullet-time-presentation.js','bullet-time-art.js','bullet-time.js','bullet-time-rooms.js'];
  const html=source('bullet-time.html').replace('/* BULLET_TIME_RUNTIME */',()=>
    'const BT_ASSETS='+JSON.stringify(prototypeAssets)+';\n'+scripts.map(source).join('\n'));
  return {legacy,prototype:writeHtml(directory,'bullet-time-playtest.html',html)};
}

if(require.main===module){
  buildPlayable().catch(error=>{
    console.error(error);
    process.exitCode=1;
  });
}
module.exports={buildRegressionFixtures};
