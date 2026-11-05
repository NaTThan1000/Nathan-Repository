// ==================== 通用 Action 解析引擎 ====================
// 从怪物配置的 actions + actionMode 中，根据当前游戏状态解析出本回合应执行的动作和步数
// 辅助：检查 action 的 condition 是否满足
function checkActionCondition(a, pCol, pRow, mCol, mRow) {
  if (!a.condition) return true;
  const range = a.range ?? 5;
  const dist = Math.max(Math.abs(pCol - mCol), Math.abs(pRow - mRow));
  if (a.condition === 'in_range') return dist <= range;
  if (a.condition === 'out_of_range') return dist > range;
  return true; // 未知 condition → 默认通过
}

// 辅助：从 action 的 steps 配置中解析步数
function resolveSteps(stepsArr, stepMode, stepWeights, turnIdx) {
  if (!stepsArr || !stepsArr.length) return 0;
  if (stepMode !== 'random') return stepsArr[turnIdx % stepsArr.length];
  const weights=stepWeights?.length===stepsArr.length?stepWeights:stepsArr.map(()=>1);
  const combined=new Map();
  stepsArr.forEach((n,i)=>combined.set(n,(combined.get(n)||0)+weights[i]));
  const values=[...combined.keys()];
  return values[monsterActionChoiceIndex([...combined.values()])];
}

// 不抽取随机数：预测与实际行动共用同一套条件过滤。
function getEligibleMonsterActions(cfg, turnIdx, mCol, mRow, pCol, pRow) {
  const actions = cfg.actions || [];
  const eligible = [];
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    if (a.once && turnIdx > 0) continue;
    if (checkActionCondition(a, pCol, pRow, mCol, mRow)) eligible.push({ action: a, idx: i });
  }
  return eligible;
}

function resolveMonsterAction(cfg, turnIdx, mCol, mRow, pCol, pRow) {
  const actionMode = cfg.actionMode || { mode: 'sequence' };
  const origWeights = actionMode.mode === 'random' ? (actionMode.weights || []) : [];
  const eligible = getEligibleMonsterActions(cfg, turnIdx, mCol, mRow, pCol, pRow);

  if (eligible.length === 0) return { action: null, steps: 0, afterAction: null };

  // 按 actionMode 选择一个 action
  let selected;
  if (actionMode.mode === 'random') {
    const pool = eligible.map(e => ({
      action: e.action,
      weight: origWeights[e.idx] !== undefined ? origWeights[e.idx] : 1
    }));
    selected = pool[monsterActionChoiceIndex(pool.map(p=>p.weight))].action;
  } else if (actionMode.mode === 'condition') {
    // condition 模式：按顺序选中第一个满足条件的 action
    selected = eligible[0].action;
  } else {
    // sequence 模式：按 turnIdx 循环
    selected = eligible[turnIdx % eligible.length].action;
  }

  // 解析步数
  const steps = resolveSteps(selected.steps, selected.stepMode, selected.stepWeights, turnIdx);

  return { action: selected, steps, afterAction: selected.after_effect || null };
}

// 共享随机游走规则：列举路径不抽随机数，只有实际行动选择一个分支。
function getWanderPaths(m, steps) {
  const dirs = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}];
  const paths = [];
  for (const d of dirs) {
    const path = [];
    let col = m.col, row = m.row;
    for (let i = 0; i < steps; i++) {
      const nc = col + d.dx, nr = row + d.dy;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;
      if ((m.movementTags || ['地面']).includes('地面') && isWall(nc, nr)) break;
      if (isMonsterAt(nc, nr, m.id)) break;
      path.push({fromCol:col, fromRow:row, toCol:nc, toRow:nr});
      col = nc; row = nr;
    }
    if (path.length) paths.push(path);
  }
  return paths.length ? paths : [[]];
}
// 主轴同距时两种方向均有可能；预测列举，执行时才选择。
function canMonsterShotHitPlayer(m,action){
  const directions=getMonsterShootDirections(m.col,m.row,player.col,player.row),range=action.range||4;
  for(const base of directions){
    const rays=action.type==='shoot_fan'?[base,...getSpreadDirs(base)]:[base];
    for(const name of rays){const v=DIR_VEC[name];for(let n=1;n<=range;n++){
      const c=m.col+v.dx*n,r=m.row+v.dy*n;
      if(c<0||c>=COLS||r<0||r>=ROWS)break;
      const tile=currentRoomGrid?.[c]?.[r];if((tile!==undefined&&TILE_BLOCKS_BULLET[tile])||bombs.some(b=>b.roomId===currentRoomId&&b.col===c&&b.row===r))break;
      if(c===player.col&&r===player.row)return true;
    }}
  }
  return false;
}

function getMonsterShootDirections(mCol, mRow, pCol, pRow) {
  const dx = pCol - mCol, dy = pRow - mRow;
  const h = dx > 0 ? 'right' : 'left', v = dy > 0 ? 'down' : 'up';
  if (Math.abs(dx) > Math.abs(dy)) return [h];
  if (Math.abs(dy) > Math.abs(dx)) return [v];
  return [h, v];
}
function chooseMonsterShootDirection(m) {
  const dirs = getMonsterShootDirections(m.col, m.row, player.col, player.row);
  return dirs.length === 1 ? dirs[0] : dirs[monsterActionChoiceIndex([1,1])];
}

function chooseWanderPath(m, steps) {
  const paths = getWanderPaths(m, steps);
  return paths[monsterActionChoiceIndex(paths.map(()=>1))];
}

// 怪物回合开始时: 所有怪物计算向玩家实时位置的移动路径
function calcAllMonsterPaths() {
  const turnIdx = turnState.monsterTurnCounter;

  // ===== 第0遍：Boss Duke 优先计算路径（判定层先于其他小怪） =====
  const dukes = [];
  for (const m of dukes) {
    calcDukePath(m, turnIdx);
  }

  for (const m of monsters.slice().sort((a,b)=>monsterActionOrder.indexOf(a.id)-monsterActionOrder.indexOf(b.id))) {
    // Boss Jumper 的移动由 processJumperAction 单独处理，此处只清空路径
    if (m.aiType === 'boss_jumper') {
      m.predictedPath = [];
      continue;
    }
    // Boss Duke 已在上面的循环中处理
    if (m.aiType === 'boss_duke') continue;

    // 本回合刚生成的怪物（如公爵浮游眼）不移动
    if (m._spawnedThisTurn) {
      m.predictedPath = [];
      continue;
    }

    const cfg = MONSTER_DB[m.cfgId];
    const resolved = resolveMonsterAction(cfg, turnIdx, m.col, m.row, player.col, player.row);
    const selectedAction = resolved.action;
    const stepCount = resolved.steps;
    const afterAction = resolved.afterAction;

    m.moveSpeed = stepCount;
    m._turnAction = selectedAction;
    m._turnAfterAction = afterAction;  // 存储 after_effect 供 shoot_fan 等处理

    if (!selectedAction) {
      m.predictedPath = [];
      continue;
    }

    // 只在射线能够到达玩家时射击；否则保留原有游走行为。
    if((selectedAction.type==='shoot_fan'||selectedAction.type==='shoot_single')&&!canMonsterShotHitPlayer(m,selectedAction)){
      const wander=(cfg.actions||[]).find(a=>a.type==='random_wander')||selectedAction.after_effect;
      if(wander&&wander.type==='random_wander'){
        const steps=resolveSteps(wander.steps,wander.stepMode,wander.stepWeights,turnIdx);
        m.moveSpeed=steps;m._turnAction=wander;m._turnAfterAction=null;m.predictedPath=chooseWanderPath(m,steps);
      }else{m._turnAction=null;m._turnAfterAction=null;m.predictedPath=[];}
      continue;
    }
    // 按 actionType 分发执行
    switch (selectedAction.type) {
      case 'chase':
        m.predictedPath = calcMonsterPath(m, player.col, player.row);
        break;

      case 'random_wander': {
        m.predictedPath = chooseWanderPath(m, stepCount);
        break;
      }

      case 'shoot_fan': {
        m.predictedPath = [];
        const shootDir = chooseMonsterShootDirection(m);
        const range = selectedAction.range || 4;
        const gp = gridToPixel(m.col, m.row);
        if (turnState.phase === 'monster_turn') {
          spawnMonsterBullet(shootDir, gp.x, gp.y, range, m.id);
          const spread = getSpreadDirs(shootDir);
          for (const sd of spread) {
            spawnMonsterBullet(sd, gp.x, gp.y, range, m.id);
          }
        }

        // after_effect: 射击后执行附加行为（如随机移动）
        const ae = m._turnAfterAction;
        if (ae && ae.type === 'random_wander') {
          const aeSteps = resolveSteps(ae.steps, ae.stepMode, ae.stepWeights, turnIdx);
          m.predictedPath = chooseWanderPath(m, aeSteps);
          m._showingExclaim = false; // after_effect 执行后清除感叹号
        }
        break;
      }

      case 'shoot_single': {
        // 单发直射：与 shoot_fan 相同的主轴向判定，但只射 1 发（不扩散）
        m.predictedPath = [];
        const shootDir2 = chooseMonsterShootDirection(m);
        const range2 = selectedAction.range || 4;
        const gp2 = gridToPixel(m.col, m.row);
        if (turnState.phase === 'monster_turn') {
          spawnMonsterBullet(shootDir2, gp2.x, gp2.y, range2, m.id);
        }

        // after_effect: 射击后执行附加行为（如随机移动）
        const ae2 = m._turnAfterAction;
        if (ae2 && ae2.type === 'random_wander') {
          const aeSteps2 = resolveSteps(ae2.steps, ae2.stepMode, ae2.stepWeights, turnIdx);
          m.predictedPath = chooseWanderPath(m, aeSteps2);
          m._showingExclaim = false;
        }
        break;
      }

      case 'charge_line': {
        // 冲刺：本回合选择方向并直接执行（无两阶段）
        const chargeSteps = selectedAction.steps || [3, 13];
        const cd = chargeSteps[monsterActionChoiceIndex(chargeSteps.map(()=>1))];
        const dir = pickChargeDir(m.col, m.row, player.col, player.row, cd);
        m.chargeDir = dir;
        m.chargeDistance = dir ? cd : 0;
        m._showingExclaim = false;m._shaking=false; // 冲刺结束蓄力抖动

        m.predictedPath = getChargePath(m, dir, m.chargeDistance);
        break;
      }

      case 'charge_up':
        // 蓄力：原地不动，感叹号提示
        m.predictedPath = [];
        m._showingExclaim = false;m._shaking=true;
        break;

      case 'stationary':
        m.predictedPath = [];
        break;

      default:
        m.predictedPath = calcMonsterPath(m, player.col, player.row);
        break;
    }
  }
}

// BFS自动寻路：从玩家位置扩散距离地图，怪物沿梯度走最短路径（不绕尖刺）
function calcMonsterPath(monster,targetCol,targetRow){
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]], max=Math.max(0,monster.moveSpeed);
  const dist=Array.from({length:COLS},()=>Array(ROWS).fill(-1)),q=[[targetCol,targetRow]];dist[targetCol][targetRow]=0;
  for(let i=0;i<q.length;i++){const [c,r]=q[i];for(const [dx,dy] of dirs){const x=c+dx,y=r+dy;if(x<0||x>=COLS||y<0||y>=ROWS||dist[x][y]>=0||isWall(x,y))continue;dist[x][y]=dist[c][r]+1;q.push([x,y]);}}
  if(Math.abs(monster.col-targetCol)+Math.abs(monster.row-targetRow)===1)return [];
  let best=null,queue=[{c:monster.col,r:monster.row,path:[]}],seen=new Set([monster.col+','+monster.row]);
  for(let i=0;i<queue.length;i++){let cur=queue[i],d=dist[cur.c][cur.r];
    if(cur.path.length&&d>=1&&!isMonsterAt(cur.c,cur.r,monster.id)&&(cur.c!==targetCol||cur.r!==targetRow)&&(!best||d<best.d||(d===best.d&&cur.path.length<best.path.length)))best={d,path:cur.path};
    if(cur.path.length>=max)continue;
    for(const [dx,dy] of dirs){let c=cur.c+dx,r=cur.r+dy,k=c+','+r;if(c<0||c>=COLS||r<0||r>=ROWS||seen.has(k)||isWall(c,r))continue;seen.add(k);queue.push({c,r,path:[...cur.path,{fromCol:cur.c,fromRow:cur.r,toCol:c,toRow:r}]});}
  }
  return best?best.path:[];
}
