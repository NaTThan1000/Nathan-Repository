// 正式显示层构建；资源、正式显示代码与样式分别维护，不依赖试玩产物。
const fs=require('fs'),path=require('path'),vm=require('vm');
const {buildScrapAssets}=require('./build-scrap-assets.cjs');
const {buildSingleStepArt}=require('./build-single-step-art.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
async function assembleGame(options={}){
 const assets={...(options.assets||await buildScrapAssets())};
 if(!options.playtest&&!options.legacy)Object.assign(assets,await buildSingleStepArt());
 let runtime=read('src/presentation/scrap-star.js');
 for(const [marker,file] of [
  ['// SCRAP_COMBAT_EFFECTS_STATE','src/presentation/combat-effects-state.js'],
  ['// SCRAP_COMBAT_EFFECTS_HOOKS','src/presentation/combat-effects-hooks.js'],
  ['// SCRAP_WORLD_ART','src/presentation/world-art.js'],
 ]){
  if(runtime.split(marker).length!==2)throw Error('表现模块插入点必须唯一：'+marker);
  runtime=runtime.replace(marker,()=>read(file).trimEnd());
 }
 if(runtime.split('// SCRAP_GAME_ADAPTER').length!==2)throw Error('正式适配插入点必须唯一');
 runtime=runtime.replace('// SCRAP_GAME_ADAPTER',()=>read('scrap-star-game-runtime.js').trimEnd());
 const block='// SCRAP_STAR_GAME_START\nconst SCRAP_ASSETS='+JSON.stringify(assets)+';\n'+runtime+'// SCRAP_STAR_GAME_END';
 const modules=require('../src/modules.cjs');
 if(new Set(modules).size!==modules.length||modules.filter(p=>p==='@presentation').length!==1)throw Error('模块清单重复或显示入口不唯一');
 const script=(options.playtest?read('src/playtest/profile.js'):'')+modules.map(file=>{
  if(file==='@presentation')return block+'\n';
  if(file.includes('..')||path.isAbsolute(file)||!file.endsWith('.js'))throw Error('模块路径非法：'+file);
  if(options.playtest&&file==='runtime/start.js')return read('src/playtest/scenarios.js')+read('src/'+file);
  return read('src/'+file);
 }).join('')+(!options.playtest&&!options.legacy?'\n// SINGLE_STEP_FORMAL_START\n'+['combat/weapon-upgrades.js','combat/single-step-mode.js','combat/single-step-enemies.js','presentation/single-step-presentation.js','combat/single-step-item-effects.js'].map(f=>read('src/'+f)).join('\n')+'\n'+(options.sandbox?read('src/playtest/custom-arena-enemies.js')+'\n':'')+read('src/combat/single-step-attack-variants.js')+'\n// SINGLE_STEP_FORMAL_END\n':'');
 let html=read('src/game.html');
 if(options.sandbox)html=html.replace('</head>',()=>'<style>'+read('src/playtest/custom-arena.css')+'</style></head>').replace('/* GAME_SCRIPT */',()=> '/* GAME_SCRIPT */\n'+read('src/playtest/custom-arena-rules.js')+'\n'+read('src/playtest/custom-arena.js'));
 if(html.split('/* GAME_SCRIPT */').length!==2||html.split('<!-- GAME_PRESENTATION_STYLE -->').length!==2)throw Error('页面模板插入点必须唯一');
 html=html.replace('/* GAME_SCRIPT */',()=>script).replace('<!-- GAME_PRESENTATION_STYLE -->',()=>'<style id="scrap-star-game-style">'+read('src/presentation/scrap-star.css')+'</style>');
 new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 return html;
}
module.exports={assembleGame};
