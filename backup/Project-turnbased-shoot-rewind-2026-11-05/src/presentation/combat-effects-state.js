// 纯表现状态：不依赖玩家、怪物、地图、DOM、随机数或战斗规则。
// 时钟由调用方传入；这些临时效果不作为回溯保存的游戏状态。
function createCombatEffects(now) {
  const transient = [];
  const actions = new Map();

  return {
    transient,
    actions,
    crateBroken(col, row) {
      transient.push({kind: 'crate', col, row, start: now()});
    },
    monsterDied(x, y, type) {
      transient.push({kind: 'death', x, y, type, start: now()});
    },
    monsterActed(id) {
      actions.set(id, now());
    },
    clearTransient() {
      transient.length = 0;
    },
    reset() {
      transient.length = 0;
      actions.clear();
    },
    prune() {
      const time = now();
      for (let i = transient.length - 1; i >= 0; i--) {
        if (time - transient[i].start > 500) transient.splice(i, 1);
      }
    },
  };
}
