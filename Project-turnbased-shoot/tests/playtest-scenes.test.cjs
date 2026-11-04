const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const script=html=>html.match(/<script>([\s\S]*?)<\/script>/)[1];
const normal=script(fs.readFileSync(path.join(root,'dist/turnbased-shoot-demo-pack.html'),'utf8'));
const test=script(fs.readFileSync(path.join(root,'dist/combat-playtest.html'),'utf8'));
const scenes=fs.readFileSync(path.join(root,'src/playtest/scenarios.js'),'utf8').replace(/\r\n/g,'\n');
assert.equal(test.replace(scenes,''),normal,'测试入口除了场景模块，必须与正式包使用完全相同的代码');
process.env.COMBAT_TEST_HTML=path.join(root,'dist/combat-playtest.html');
let harness=fs.readFileSync(path.join(__dirname,'danger-forecast.test.js'),'utf8').split('(async()=>{await sandbox.bootPromise;')[0];
harness=harness.replace("const fs=require('fs'),vm=require('vm'),assert=require('assert');",'');
eval(harness.replace('vm.createContext(sandbox);vm.runInContext(code,sandbox);','vm.createContext(sandbox);vm.runInContext(code,sandbox);globalThis.sceneSandbox=sandbox;'));
(async()=>{await sceneSandbox.bootPromise;vm.runInContext(`
 function demand(v,msg){if(!v)throw Error(msg)}
 demand(combatPlaytestScene===2&&monsters.length===2,'默认组合场景');
 demand(currentRoomGrid[4][3]===TILE.POOP&&tileData['4,3'].hp===4,'箱子场景');
 for(let i=0;i<4;i++)hitTile(4,3,1);demand(currentRoomGrid[4][3]===TILE.FLOOR,'正式规则破箱');
 startCombatPlaytest(2);demand(tileData['4,3'].hp===4,'重置场景未恢复箱子');
 startCombatPlaytest(0);demand(monsters.length===1&&monsters[0].cfgId==='crack_maw_i','近战场景');
 startCombatPlaytest(1);demand(monsters.length===1&&currentRoomGrid[5][3]===TILE.ROCK,'远程障碍场景');
 document.getElementById('combat-enemy').value='boss_jumper_i';document.getElementById('combat-count').value='8';document.getElementById('combat-custom').onclick();
 demand(monsters.length===8,'自定义Boss组合');
 for(const a of monsters)for(const b of monsters)if(a.id<b.id)demand(!(a.col<b.col+(b.size||1)&&a.col+(a.size||1)>b.col&&a.row<b.row+(b.size||1)&&a.row+(a.size||1)>b.row),'自定义多格怪物重叠');
 updateDangerForecast();demand(dangerForecastJob.done,'正式预测规则在测试入口不可用');
 `,sceneSandbox);console.log('PASS: 测试包共用完整正式代码；场景切换、重置、箱子、自定义多格Boss及预测正常');})().catch(e=>{console.error(e);process.exitCode=1});
