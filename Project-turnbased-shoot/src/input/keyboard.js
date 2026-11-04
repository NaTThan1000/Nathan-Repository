// ==================== 输入处理 ====================
function handlePlayerKey(e) {
  const actionKeys = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Escape','KeyC','KeyR','KeyE'];
  if (actionKeys.includes(e.code)) e.preventDefault();

  // ---- 弹窗期间：拦截 Space 触发对应按钮，拦截其他所有游戏操作键 ----
  const startMenu = document.getElementById('start-menu-modal');
  const deathMenu = document.getElementById('death-modal');
  const victoryMenu = document.getElementById('victory-modal');
  if (startMenu.classList.contains('show')) {
    if (e.code === 'Space') { startGameFromMenu(); }
    return;
  }
  if (deathMenu.classList.contains('show')) {
    if (e.code === 'Space') {
      resetGameToFloor1();
      deathMenu.classList.remove('show');
      showStartMenu();
    }
    return;
  }
  if (victoryMenu.classList.contains('show')) {
    if (e.code === 'Space') {
      resetGameToFloor1();
      victoryMenu.classList.remove('show');
      showStartMenu();
    }
    return;
  }

  if(e.code==='KeyM'&&gameStarted&&!gameOver){e.preventDefault();if(!e.repeat)toggleWorldMap();return;}
  if(worldMapOpen){e.preventDefault();if(e.code==='Escape')toggleWorldMap(false);return;}
  // ---- 场景过渡/楼层黑场中禁止操作 ----
  if(transition&&transition.active)return;
  if(floorFadeBusy)return;

  // ---- 阶段：怪物回合或等待挤出完成时禁止操作 ----
  if (turnState.phase === 'monster_turn' || pendingPlayerTurnEnd) return;

  // ---- 阶段：行为选择 ----
  if (turnState.phase === 'player_select') {
    switch (e.code) {
      case 'KeyW': case 'KeyS': case 'KeyA': case 'KeyD': {
        const dirMap = { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
        const dir = dirMap[e.code];
        if (!dir) return;
        // 先检测门触发：站在门前格+朝门方向按=切换房间（不执行移动）
        if(!actionHistoryActive()&&tryWalkIntoDoor(player.col,player.row,dir))return;

        const vec = DIR_VEC[dir];
        const nc = player.col + vec.dx;
        const nr = player.row + vec.dy;
        if(inCombat&&turnState.mAP<=0){if(!e.repeat)rewindHistoryTo(nc,nr);return;}
        if(isWall(nc,nr))return;


        if(inCombat){
          if (turnState.mAP <= 0) { if(!e.repeat)rewindHistoryTo(nc,nr); return; }
          turnState.mAP--;

        }

        // 碰撞炸弹：推移炸弹
        const pushB = bombs.find(b => b.col === nc && b.row === nr && b.roomId === currentRoomId);
        if (pushB) pushBomb(pushB, vec.dx, vec.dy);

        player.facing=dir;player.col=nc;player.row=nr;
        const t=gridToPixel(nc,nr);player.targetPx=t.x;player.targetPy=t.y;player.animTime=0;

        if(!inCombat){
          // 探索模式：直接结算 + 自动拾取道具和资源
          if(player.invincibleSteps>0)player.invincibleSteps--;
          checkSpikeUnderPlayer();
          autoPickupResources();
          // 自动拾取脚下道具
          let itemPickedExplore = false;
          for (let j = itemsOnGround.length - 1; j >= 0; j--) {
            const it = itemsOnGround[j];
            if (it.col === player.col && it.row === player.row) {
              if (isShopSlotCell(it.col, it.row)) {
                tryBuyShopItem(it.col, it.row); // 金币足够则自动购买
                break;
              }
              if (!playerInventory.includes(it.cfgId)) {
                applyItem(it.cfgId);
                itemsOnGround.splice(j, 1);
                itemPickedExplore = true;
              }
            }
          }
          if (itemPickedExplore) {
            updateItemBar();
            updateUI();
            buildHearts(playerStats.maxHp);
            buildBlueHearts();
          }
        } else {
          // 战斗模式：自动拾取 + 接触伤害
          const resPicked = autoPickupResources();
          let itemPicked = false;
          for (let j = itemsOnGround.length - 1; j >= 0; j--) {
            const it = itemsOnGround[j];
            if (it.col === player.col && it.row === player.row) {
              if (isShopSlotCell(it.col, it.row)) {
                tryBuyShopItem(it.col, it.row); // 金币足够则自动购买
                break;
              }
              if (!playerInventory.includes(it.cfgId)) {
                applyItem(it.cfgId);
                itemsOnGround.splice(j, 1);
                itemPicked = true;
              }
            }
          }
          if (resPicked || itemPicked) {
            saveCheckpoint();
            const cp = currentCheckpoint;
            turnState.reachableTiles = calcReachableTiles(cp.playerCol, cp.playerRow, checkpointMAP);
            if (itemPicked) {
              updateItemBar();
              turnState.maxMAP = Math.floor(playerStats.moveSpeed);
              turnState.maxAAP = Math.floor(playerStats.fireRate);
              turnState.mAP = Math.min(turnState.mAP, turnState.maxMAP);
              turnState.aAP = Math.min(turnState.aAP, turnState.maxAAP);
              updateUI();
              buildHearts(playerStats.maxHp);
              buildBlueHearts();
              buildApDots('ui-aap-row', turnState.maxAAP);
              buildApDots('ui-map-row', turnState.maxMAP);
            }
          }
          if (player.invincibleSteps <= 0) {
            const om = monsters.find(m => !m.jumperVanished && isInMonsterFootprint(m, player.col, player.row) && m.hp > 0);
            if (om) damagePlayer(om.damage || 1);
          }
          if (player.invincibleSteps > 0) player.invincibleSteps--;
          checkSpikeUnderPlayer();
        }
        if(currentRoomGrid&&currentRoomGrid[nc][nr]===TILE.LADDER){
          const nextF=currentFloor.floorNum+1;
          if(allFloors[nextF]){fadeIntoFloor(nextF);return;}
          else if (nextF > 3) { triggerVictoryScreen(); return; }
        }
        updateActionBar();updateUI();
        updateFlyingEyeExclaim();  // 动态更新浮游眼感叹号
        return;
      }

      case 'KeyE': {
        // 放置炸弹
        if(playerResources.bombs <= 0) return;
        placeBomb(player.col, player.row);
        return;
      }

      case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight': {
        // 战斗模式：需有 AP 才可射击
        if(inCombat&&turnState.aAP<=0)return;
        const dirMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
        const dir = dirMap[e.code];
        if(!dir)return;

        player.facing=dir;player.shootTimer=0.4;
        spawnBullet(dir,player.px,player.py);

        if(inCombat){
          turnState.aAP--;
          // 不在这里 saveCheckpoint — 等子弹实际命中/击杀时才更新（延迟到真实效果发生）
          turnState.reachableTiles=calcReachableTiles(player.col,player.row,turnState.mAP);
          if(!turnState.hasShot)turnState.hasShot=true;
        }
        updateActionBar();updateUI();
        return;
      }

      case 'Space': {
        if(!inCombat)return;
        preparePlayerTurnEnd();
        return;
      }

      case 'Escape': {
        if(!inCombat)return; // 探索状态下 Esc 无效
        if(actionHistoryActive()){resetActionHistory();return;}
        if (turnSnapshot) {
          restoreTurnSnapshot();
          // 从恢复的属性重算AP上限（避免拾取+移速/射速道具后ESC上限不还原）
          turnState.maxMAP = Math.floor(playerStats.moveSpeed);
          turnState.maxAAP = Math.floor(playerStats.fireRate);
          turnState.mAP = turnState.maxMAP;
          turnState.aAP = turnState.maxAAP;
          turnState.hasShot = false;
          // 属性回退后必须重建心形/AP 圆点 DOM（update* 只能改状态，不能增删元素）
          buildHearts(playerStats.maxHp);
          buildBlueHearts();
          buildApDots('ui-aap-row', turnState.maxAAP);
          buildApDots('ui-map-row', turnState.maxMAP);
          currentCheckpoint = null;
          turnState.phase = 'player_select';
          turnState.reachableTiles = calcReachableTiles(player.col, player.row, turnState.mAP);
          saveTurnSnapshot();
          saveCheckpoint();  // checkpoint 同时重置为回合初始状态
          // 触发时间倒流动画
          rewindAnim.active = true;
          rewindAnim.timer = 0;
          SFX.rewind();
          updateActionBar();
          updateUI();
        }
        return;
      }

      case 'KeyR': {
        resetGameToFloor1();
        showStartMenu();
        break;
      }
      case 'KeyC': {
        spawnMonster();
        break;
      }
    }
    return;
  }
}
document.addEventListener('keydown', processHistoryKey);
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const cssY = e.clientY - rect.top;
  // 将 CSS 坐标换算为游戏像素坐标
  debugMouseX = cssX / DISPLAY_SCALE;
  debugMouseY = cssY / DISPLAY_SCALE;
  debugMouseIn = true;

  if (debugMode) {
    // 更新调试信息面板
    const gx = Math.floor(debugMouseX);
    const gy = Math.floor(debugMouseY);
    document.getElementById('debug-px').textContent = gx;
    document.getElementById('debug-py').textContent = gy;
    // 计算网格坐标
    const col = Math.max(0, Math.min(COLS - 1, Math.floor((gx - WALL) / CELL)));
    const row = Math.max(0, Math.min(ROWS - 1, Math.floor((gy - WALL) / CELL)));
    document.getElementById('debug-col').textContent = col;
    document.getElementById('debug-row').textContent = row;
  }
});

canvas.addEventListener('mouseleave', () => {
  debugMouseIn = false;
});

canvas.addEventListener('mouseenter', () => {
  debugMouseIn = true;
});
