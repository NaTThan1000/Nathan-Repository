const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

// 模块在没有战斗对象、DOM、Canvas或随机数的环境中也必须可运行。
const scope = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,
  '../src/presentation/combat-effects-state.js'), 'utf8'), scope);
const create = vm.runInContext('createCombatEffects', scope);
let time = 1000;
const effects = create(() => time);
const queue = effects.transient;
const actions = effects.actions;
effects.crateBroken(4, 3);
time = 1100;
effects.monsterDied(80, 90, 'ranged');
effects.monsterActed(7);
time = 1500;
effects.prune();
assert.equal(queue.length, 2, '500ms边界不能提前清除');
time = 1501;
effects.prune();
assert.equal(queue.length, 1, '只清除已过期的效果');
assert.equal(queue[0].kind, 'death');
effects.clearTransient();
assert.equal(queue.length, 0);
assert.equal(actions.get(7), 1100, '回溯清临时特效不改变既有攻击动作计时语义');
effects.reset();
assert.equal(actions.size, 0, '换房清除旧房攻击计时');
assert.strictEqual(effects.transient, queue, '清理不能断开绘制层的队列引用');
assert.strictEqual(effects.actions, actions);
console.log('PASS: 表现状态独立运行；效果过期、回溯清理与换房重置保持原语义');
