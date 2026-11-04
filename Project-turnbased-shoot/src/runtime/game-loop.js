// ==================== 游戏循环 ====================
let lastTime = performance.now();

function gameLoop(timestamp) {
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (dt > 0.1) dt = 0.1;

  // 游戏未开始或已结束：只渲染不更新逻辑
  if (!gameStarted || gameOver) {
    render();
    requestAnimationFrame(gameLoop);
    return;
  }

  if(fallbackThreatHold>0){fallbackThreatHold=Math.max(0,fallbackThreatHold-dt);render();requestAnimationFrame(gameLoop);return;}

  if (updateDangerReveal(dt)) {
    render();
    requestAnimationFrame(gameLoop);
    return;
  }

  // 场景过渡动画
  if(transition&&transition.active){
    transition.offset+=dt*400; // 400 px/s
    if(transition.offset>=GAME_W){
      finishTransition();
    } else {
      // 渲染过渡效果
      ctx.clearRect(0,0,GAME_W,GAME_H);
      const ox=transition.dir==='right'?-transition.offset:transition.dir==='left'?transition.offset:0;
      const oy=transition.dir==='down'?-transition.offset:transition.dir==='up'?transition.offset:0;
      ctx.save();ctx.translate(ox,oy);
      // 简单渲染当前房间
      if(transition.offset<GAME_W/2){render();}
      else{/* 新房间渲染等下帧完成 */ render();}
      ctx.restore();
      requestAnimationFrame(gameLoop);
      return;
    }
  }

  // 战斗开始剑动画
  if (battleStartAnim.active) {
    battleStartAnim.timer += dt;
    if (battleStartAnim.timer >= battleStartAnim.duration) battleStartAnim.active = false;
  }
  // Esc倒流动画
  if (rewindAnim.active) {
    rewindAnim.timer += dt;
    if (rewindAnim.timer >= rewindAnim.duration) rewindAnim.active = false;
  }

  // 更新移动动画 (本体移动)
  if (player.targetPx !== null) {
    updateMove(dt);
  }

  if(forcedLandingPending&&player.targetPx===null){forcedLandingPending=false;resolveForcedLanding();}

  // 更新子弹 & 粒子
  updateBullets(dt);
  updateParticles(dt);

  // 怪物死亡后刷新可移动范围 (新增空白格)
  if (turnState.phase === 'player_select' && pendingReachableRefresh && currentCheckpoint) {
    turnState.reachableTiles = calcReachableTiles(currentCheckpoint.playerCol, currentCheckpoint.playerRow, checkpointMAP);
    pendingReachableRefresh = false;
  }

  // 射击表情倒计时
  player.shootTimer = Math.max(0, player.shootTimer - dt);
  // 玩家受击效果衰减
  if (player.hitFlash > 0) {
    player.hitFlash = Math.max(0, player.hitFlash - dt);
    player.shakeX *= 0.85; player.shakeY *= 0.85;
  }

  // 怪物平滑动画 (插值 px/py → 网格坐标)
  animateMonsters(dt);
  // 公爵关键帧动画（独立于逐帧机制，按路径逐格移动 px/py）
  updateDukeAnim(dt);
  // 怪物受击效果衰减
  for (const m of monsters) {
    if (m.hitFlash > 0) m.hitFlash = Math.max(0, m.hitFlash - dt);
    if (m.meleeFlash > 0) m.meleeFlash = Math.max(0, m.meleeFlash - dt);
  }

  // 怪物回合执行
  if (turnState.phase === 'monster_turn') {
    updateMonsterTurn(dt);
  }

  // 闪烁计时器 (可移动范围 / 怪物路径)
  if (turnState.phase === 'player_select') {
    monsterFlashTimer += dt;
  }

  // 跳跃Boss动画计时器
  for (const m of monsters) {
    if (m.jumpAnimTimer > 0) {
      m.jumpAnimTimer = Math.max(0, m.jumpAnimTimer - dt);
      // charge_vanish 动画结束后，切换到 big_land 第二阶段
      if (m.jumpAnimTimer <= 0 && m.jumpType === 'charge_vanish' && m._landingPhase === 0) {
        m._landingPhase = 1;
        finishBossLandingPhase2(m);
      }
    }

  }

  // 伤害飘字更新
  updateDamageNumbers(dt);

  // 地上道具动画
  for (const it of itemsOnGround) {
    it.sparkTimer += dt * 3;
    it.liftY += it.liftDir * dt * 2;
    if (it.liftY > 2) it.liftDir = -1;
    if (it.liftY < -1) it.liftDir = 1;
  }

  // 地上资源动画
  for (const res of resourcesOnGround) {
    res.sparkTimer += dt * 3;
    res.liftY += res.liftDir * dt * 2;
    if (res.liftY > 2) res.liftDir = -1;
    if (res.liftY < -1) res.liftDir = 1;
  }

  // 拾取提示计时器
  if (pickupHintTimer > 0) pickupHintTimer -= dt;

  updateDangerForecast();
  if(pendingPlayerTurnEnd&&player.targetPx===null&&dangerForecastJob?.done&&dangerForecastKey===getDangerForecastKey()){
    pendingPlayerTurnEnd=false;checkSpikeUnderPlayer();autoPickupResources();for(let i=itemsOnGround.length-1;i>=0;i--){const item=itemsOnGround[i];if(item.col===player.col&&item.row===player.row){if(isShopSlotCell(item.col,item.row))tryBuyShopItem(item.col,item.row);else if(!playerInventory.includes(item.cfgId)){applyItem(item.cfgId);itemsOnGround.splice(i,1);updateItemBar();}}}updateRoomCombatState();if(inCombat&&!gameOver){updateDangerForecast();if(dangerForecastJob?.done)finishPlayerTurn();}
  }

  // DOM 文字覆盖层 (绕过 canvas pixelated 缩放)
  updateTextOverlay();

  render();
  requestAnimationFrame(gameLoop);
}
