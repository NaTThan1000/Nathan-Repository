const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const script=html=>html.match(/<script>([\s\S]*?)<\/script>/)[1];
const scenes=fs.readFileSync(path.join(root,'src/playtest/scenarios.js'),'utf8').replace(/\r\n/g,'\n');
const profile=fs.readFileSync(path.join(root,'src/playtest/profile.js'),'utf8').replace(/\r\n/g,'\n');
process.env.COMBAT_TEST_HTML ||= path.join(root,'history/playtest-builds/combat-playtest.html');
let harness=fs.readFileSync(path.join(__dirname,'danger-forecast.test.js'),'utf8').split('(async()=>{await sandbox.bootPromise;')[0];
harness=harness.replace("const fs=require('fs'),vm=require('vm'),assert=require('assert');",'');
eval(harness.replace('vm.createContext(sandbox);vm.runInContext(code,sandbox);','vm.createContext(sandbox);vm.runInContext(code,sandbox);globalThis.sceneSandbox=sandbox;'));
(async()=>{
 const {assembleGame}=require('../tools/assemble-game.cjs');
 const regular=script(await assembleGame({legacy:true}));
 const prototype=script(await assembleGame({playtest:true}));
 assert.equal(prototype.replace(profile,'').replace(scenes,''),regular,'原型除配置和场景外复用正式源码');
 await sceneSandbox.bootPromise;vm.runInContext(`
 function demand(v,msg){if(!v)throw Error(msg)}
 demand(COLS===13&&ROWS===9&&GAME_H===230,'原型尺寸');
 demand(COMBAT_SCENES.length===9&&COMBAT_LAYOUTS.length===9,'三类各三个房间');
 demand(turnState.maxMAP===3&&turnState.maxAAP===3&&playerStats.range===5,'初始参数');
 for(let i=0;i<9;i++)for(let j=0;j<9;j++){
  startCombatPlaytest(i,j);
  demand(monsters.length===COMBAT_SCENES[i].enemies.length,'怪物数量');
  for(const m of monsters)demand(currentRoomGrid[m.col][m.row]===TILE.FLOOR,'出生点被障碍覆盖');
  demand(monsters.every(m=>m.hp===MONSTER_DB[m.cfgId].hp),'临时生命');
  updateDangerForecast();demand(dangerForecastJob.done,'预测未完成');
 }
 startCombatPlaytest(2);demand(tileData['4,2'].hp===1,'捷径箱子耐久');
 hitTile(4,2,1);demand(currentRoomGrid[4][2]===TILE.FLOOR,'一发破箱');
 startCombatPlaytest(2);demand(tileData['4,2'].hp===1,'重置恢复箱子');
 document.getElementById('combat-layout').onchange({target:{value:'7'}});
 demand(combatPlaytestLayout===7&&combatPlaytestScene===2,'独立障碍切换');
 document.getElementById('combat-reset').onclick();demand(combatPlaytestLayout===7,'重置应保留交叉搭配');
  document.getElementById('combat-enemy').value='boss_jumper_i';document.getElementById('combat-count').value='8';document.getElementById('combat-custom').onclick();
 demand(monsters.length===8,'自定义Boss组合');
 for(const a of monsters)for(const b of monsters)if(a.id<b.id)demand(!(a.col<b.col+(b.size||1)&&a.col+(a.size||1)>b.col&&a.row<b.row+(b.size||1)&&a.row+(a.size||1)>b.row),'自定义多格怪物重叠');
 updateDangerForecast();demand(dangerForecastJob.done,'正式预测规则在测试入口不可用');
 `,sceneSandbox);console.log('PASS: 13×9九房间、81组交叉配置、临时数值、独立障碍切换、重置、一发破箱、多格Boss及预测');})().catch(e=>{console.error(e);process.exitCode=1});
