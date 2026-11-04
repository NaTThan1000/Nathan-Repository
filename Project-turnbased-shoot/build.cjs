// 源码在内存中组装并内嵌资源，只写出可直接试玩的最终HTML。
const fs=require('fs'),path=require('path'),vm=require('vm');
const {assembleGame}=require('./tools/assemble-game.cjs');
const {inlineResources}=require('./tools/inline-resources.cjs');
const {buildScrapAssets}=require('./tools/build-scrap-assets.cjs');
async function main(){
 const assets=await buildScrapAssets(),out=path.join(__dirname,'dist');fs.mkdirSync(out,{recursive:true});
 const targets=process.argv.includes('--playtest-only')?[[true,'combat-playtest.html']]:[[false,'turnbased-shoot-demo-pack.html'],[true,'combat-playtest.html']];
 for(const [playtest,name]of targets){const html=inlineResources(await assembleGame({assets,playtest}));new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);fs.writeFileSync(path.join(out,name),html);console.log('已生成 dist/'+name)}
}
main().catch(e=>{console.error(e);process.exitCode=1});
