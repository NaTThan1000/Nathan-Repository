// ==================== after_effect 系统 ====================
// 计算冲击波范围：从落地区域向外扩展 range 圈
function getAttackSideCells(targetCol, targetRow, size, range) {
  const cells = new Set();
  const minCol = targetCol - range;
  const maxCol = targetCol + size - 1 + range;
  const minRow = targetRow - range;
  const maxRow = targetRow + size - 1 + range;
  for (let c = minCol; c <= maxCol; c++) {
    for (let r = minRow; r <= maxRow; r++) {
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
      // 排除落地区域本体格
      if (c >= targetCol && c < targetCol + size && r >= targetRow && r < targetRow + size) continue;
      cells.add(`${c},${r}`);
    }
  }
  return cells;
}

// 只有攻击配置显式开启时才结算友伤，大体型怪物每次攻击也只受伤一次。
function damageMonsterAllies(attack, attacker, cells, damage) {
  if (attack?.hitsAllies !== true) return;
  for (const target of [...monsters]) {
    if (target.id === attacker.id || target.hp <= 0 || target.jumperVanished) continue;
    if (monsterCells(target).some(({col, row}) => cells.has(`${col},${row}`))) {
      damageMonster(target, damage);
    }
  }
}

// 执行 action 的 after_effect 数组
function resolveAfterEffects(action, context) {
  if (!action || !action.after_effect || action.after_effect.length === 0) return;

  const { monster: m, targetCol, targetRow, sz } = context;

  for (const effect of action.after_effect) {
    if (effect.type === 'attack_side') {
      const damage = effect.damage !== undefined ? effect.damage : 1;
      const range = effect.range !== undefined ? effect.range : 1;

      const sideCells = getAttackSideCells(targetCol, targetRow, sz, range);

      // 玩家可能已被落地碰撞触发无敌。
      let playerHitInSide = false;
      for (const key of sideCells) {
        const [c, r] = key.split(',').map(Number);
        noteDangerCell(c, r, m.id, "move");
        if (!playerHitInSide && c === player.col && r === player.row) {
          damagePlayer(damage, m.id);
          playerHitInSide = true;
        }
      }
      damageMonsterAllies(effect, m, sideCells, damage);
    } else if (effect.type === 'attack_adjacent') {
      const damage = effect.damage !== undefined ? effect.damage : 0.5;
      const range = effect.range !== undefined ? effect.range : 1;

      // 四个方向各向外检查 range 格，遇墙停止
      const allDirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ];
      let playerHit = false;
      const adjacentCells = new Set();
      for (const dir of allDirs) {
        for (let i = 1; i <= range; i++) {
          const ac = m.col + dir.dx * i;
          const ar = m.row + dir.dy * i;
          if (ac < 0 || ac >= COLS || ar < 0 || ar >= ROWS) break;
          if (isWall(ac, ar)) break;
          adjacentCells.add(`${ac},${ar}`);
          noteDangerCell(ac, ar, m.id, "move");
          // 攻击玩家（只扣血一次）
          if (!playerHit && ac === player.col && ar === player.row) {
            damagePlayer(damage, m.id);
            playerHit = true;
            if(movementPlanning)scheduleMovementEvent({type:'melee',monsterId:m.id,dx:dir.dx,dy:dir.dy});else{m.meleeFlash=0.25;m.meleeDir={dx:dir.dx,dy:dir.dy};}
          }
        }
      }
      damageMonsterAllies(effect, m, adjacentCells, damage);
    }
  }
}
