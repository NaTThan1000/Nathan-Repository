const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {buildRegressionFixtures}=require('../tools/build.cjs');

const projectRoot=path.resolve(__dirname,'..');

function run(file,fixtures={}){
  const result=spawnSync(process.execPath,[path.join(projectRoot,file)],{
    cwd:projectRoot,env:{...process.env,...fixtures},stdio:'inherit'
  });
  if(result.error) throw result.error;
  if(result.status!==0) throw Error('检查未通过：'+file);
}

async function verify(){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'turnbased-shoot-regression-'));
  try{
    const {legacy,prototype}=await buildRegressionFixtures(directory);
    for(const file of [
      'tests/map-editor.test.cjs','tests/combat-effects-state.test.cjs','tests/snapshot-codec.test.cjs',
      'tests/prediction-guard.test.cjs','tests/inline-resources.test.cjs'
    ]) run(file);
    for(const file of [
      'tests/playtest-scenes.test.cjs','tests/action-history.test.cjs','tests/danger-forecast.test.js',
      'tests/scrap-star-art.test.cjs','tests/rewind-hud-regression.test.cjs','tests/state-prediction-regression.test.cjs'
    ]) run(file,{COMBAT_TEST_HTML:legacy});
    run('tests/single-step-formal.browser.cjs');
    run('tests/bullet-time.browser.cjs',{BULLET_TIME_TEST_HTML:prototype});
    run('tests/custom-arena.browser.cjs');
    console.log('PASS: 正式版、自定义场、机制原型与旧规则回归检查通过');
  }finally{
    for(const name of ['combat-playtest.html','bullet-time-playtest.html']){
      fs.rmSync(path.join(directory,name),{force:true});
    }
    fs.rmdirSync(directory);
  }
}
verify().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
