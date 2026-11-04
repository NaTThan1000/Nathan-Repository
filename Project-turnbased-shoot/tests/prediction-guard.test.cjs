const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const scope=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/combat/danger-prediction.js'),'utf8'),scope);
vm.runInContext(`
 function updateBullets(){if (mBg.col === player.col && mBg.row === player.row) return 1;}
 function helper(){return 2;}
`,scope);
assert.equal(vm.runInContext("buildDangerRuleBody([helper,updateBullets]).includes('if (false)')",scope),true);
for(const expression of [
 'buildDangerRuleBody([helper])',
 'buildDangerRuleBody([updateBullets,updateBullets])',
 'buildDangerRuleBody([helper,helper,updateBullets])',
 'buildDangerRuleBody([null,updateBullets])',
])assert.throws(()=>vm.runInContext(expression,scope),/危险预测/);
vm.runInContext('updateBullets=function updateBullets(){return 1}',scope);
assert.throws(()=>vm.runInContext('buildDangerRuleBody([updateBullets])',scope),/预期1处，实际0处/);
vm.runInContext(`updateBullets=function updateBullets(){if (mBg.col === player.col && mBg.row === player.row) return 1;if (mBg.col === player.col && mBg.row === player.row) return 2;}`,scope);
assert.throws(()=>vm.runInContext('buildDangerRuleBody([updateBullets])',scope),/预期1处，实际2处/);
console.log('PASS: 预测规则缺失/重复/无效及子弹适配0次或多次命中均明确报错');
