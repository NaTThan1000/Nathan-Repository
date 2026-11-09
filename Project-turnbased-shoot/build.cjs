// 源码在内存中组装并内嵌资源，只写出可直接试玩的最终HTML。
const fs=require('fs'),path=require('path'),vm=require('vm');
const {assembleGame}=require('./tools/assemble-game.cjs');
const {inlineResources}=require('./tools/inline-resources.cjs');
const {buildScrapAssets}=require('./tools/build-scrap-assets.cjs');
const {buildSingleStepArt}=require('./tools/build-single-step-art.cjs');
async function main(){
 const assets=await buildScrapAssets(),out=path.join(__dirname,'dist');fs.mkdirSync(out,{recursive:true});
 const targets=process.argv.includes('--playtest-only')?[[true,'combat-playtest.html']]:[[false,'turnbased-shoot-demo-pack.html'],[true,'combat-playtest.html']];
 for(const [playtest,name]of targets){const html=inlineResources(await assembleGame({assets,playtest}));new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);fs.writeFileSync(path.join(out,name),html);console.log('已生成 dist/'+name)}
 const arena=inlineResources(await assembleGame({assets,sandbox:true}));
 new vm.Script(arena.match(/<script>([\s\S]*?)<\/script>/)[1]);
 fs.writeFileSync(path.join(out,'custom-arena.html'),arena);console.log('已生成 dist/custom-arena.html');
 const prototypeAssets=Object.fromEntries(Object.entries(assets).filter(([key])=>key.startsWith('hero-')||/^(melee|ranged)[0-7]$/.test(key)||/^bullet-(up|down|left|right)[0-2]$/.test(key)||/^(impact[0-3]|expire[0-1]|defeat[0-5])$/.test(key)||['floor','facility','redGrid','heart','emptyHeart','remote','leftOpen','leftClosed','rightOpen','rightClosed'].includes(key)));
 Object.assign(prototypeAssets,await buildSingleStepArt());prototypeAssets.alert=assets.alert;prototypeAssets.blueGrid=assets.blueGrid;
 const prototype=fs.readFileSync(path.join(__dirname,'src/playtest/bullet-time.html'),'utf8').replace('/* BULLET_TIME_RUNTIME */',()=> 'const BT_ASSETS='+JSON.stringify(prototypeAssets)+';\n'+['bullet-time-presentation.js','bullet-time-art.js','bullet-time.js','bullet-time-rooms.js'].map(file=>fs.readFileSync(path.join(__dirname,'src/playtest',file),'utf8')).join('\n'));
 new vm.Script(prototype.match(/<script>([\s\S]*?)<\/script>/)[1]);
 fs.writeFileSync(path.join(out,'bullet-time-playtest.html'),prototype);console.log('已生成 dist/bullet-time-playtest.html');
}
main().catch(e=>{console.error(e);process.exitCode=1});
