const cp=require('child_process'),path=require('path');
function run(file,playtest=false){const env={...process.env};env.COMBAT_TEST_HTML=path.join(__dirname,'dist',playtest?'combat-playtest.html':'turnbased-shoot-demo-pack.html');const r=cp.spawnSync(process.execPath,[path.join(__dirname,file)],{cwd:__dirname,env,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1)}
for(const file of ['tests/map-editor.test.cjs','tests/combat-effects-state.test.cjs','tests/snapshot-codec.test.cjs','tests/playtest-scenes.test.cjs','tests/prediction-guard.test.cjs','tests/inline-resources.test.cjs'])run(file);
for(const playtest of [false,true])for(const file of ['tests/danger-forecast.test.js','tests/scrap-star-art.test.cjs','tests/rewind-hud-regression.test.cjs','tests/state-prediction-regression.test.cjs'])run(file,playtest);
console.log('PASS: 正式包、共享规则测试入口及状态检查全部通过');
