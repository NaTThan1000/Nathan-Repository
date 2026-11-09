const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('../tools/runtime-deps.cjs').runtimeDependency('playwright');

(async () => {
  const browser = await chromium.launch({headless:true, channel:'chrome'});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/custom-arena.html')).href);
    await page.waitForFunction(() => !document.querySelector('#arena-start').disabled);
    assert.equal(await page.evaluate(() => Object.hasOwn(ITEMS_DB,'sad_onion')),false);
    assert.equal(await page.evaluate(() => Object.values(ITEMS_DB).filter(item=>item.name==='穿透子弹').length),1);
    const at = async (col,row,button='left') => {
      await page.locator('#game').scrollIntoViewIfNeeded();
      const point = await page.evaluate(([col,row]) => {
        const rect=canvas.getBoundingClientRect(), pixel=gridToPixel(col,row);
        return {x:rect.left+pixel.x*rect.width/GAME_W,y:rect.top+pixel.y*rect.height/GAME_H};
      },[col,row]);
      await page.mouse.click(point.x,point.y,{button});
    };
    const pick = async (kind,id) => {
      await page.locator('#arena-kind').selectOption(kind);
      if(id !== undefined) await page.locator('#arena-entry').selectOption(id);
    };
    await at(7,3);
    await pick('terrain','3'); await at(5,4);
    await pick('item','trial_weapon_dual'); await at(3,3);
    await pick('item','trial_weapon_triple'); await at(4,3);
    await pick('item','trial_weapon_poison'); await at(5,3);
    await pick('monster','step_fixed'); await at(11,5);
    await pick('resource','bomb_single'); await at(3,5);
    await at(3,5,'right');
    assert.equal(await page.evaluate(() => resourcesOnGround.length),0);
    assert.deepEqual(await page.evaluate(() => ({
      terrain:currentRoomGrid[5][4], unit:monsters.find(m=>m.cfgId==='step_fixed')?.col,
      items:itemsOnGround.length, dummy:monsters.filter(m=>m.arenaDummy).length,
    })),{terrain:3,unit:11,items:3,dummy:1});

    await page.locator('#arena-start').click();
    const move = async () => {
      await page.keyboard.press('d');
      await page.waitForFunction(() => player.targetPx===null && performance.now()>=stepInputUntil);
    };
    await move(); await move(); await move();
    assert.deepEqual(await page.evaluate(() => playerInventory),['trial_weapon_triple','trial_weapon_poison']);
    await page.keyboard.press('ArrowRight');
    assert.deepEqual(await page.evaluate(() => [arena.hits,arena.total]),[3,5.25]);
    await page.waitForFunction(() => performance.now()>=stepInputUntil);
    await page.keyboard.press('ArrowUp');
    assert.deepEqual(await page.evaluate(() => [arena.hits,arena.total,monsters.find(m=>m.arenaDummy).hp]),[4,5.69,1]);
    await page.keyboard.press('r');
    assert.deepEqual(await page.evaluate(() => [arena.hits,player.col,itemsOnGround.length,playerInventory.length]),[0,2,3,0]);

    await page.evaluate(() => {
      const equip=(...items)=>items.forEach(effect=>applyItem('trial_weapon_'+effect));
      const check=(condition,message)=>{if(!condition)throw new Error(message);};
      equip('shotgun','laser','twin');
      applyItem('single_step_pierce');
      check(equippedWeaponTrial('shell')==='pierce','正式穿透子弹进入弹壳子类');
      singleStepAct('shoot','right');
      check(equippedWeaponTrial('body')==='laser'&&equippedWeaponTrial('pattern')==='twin'&&
        SINGLE_STEP.shots.filter(shot=>shot.beam).length===2,'枪体覆盖后保留不同子类');
      equip('blast');
      check(!playerInventory.includes('single_step_pierce')&&equippedWeaponTrial('shell')==='blast','原型弹壳能覆盖正式穿透子弹');
      arenaLoad(false);equip('burstCharge','poison');
      for(let i=0;i<3;i++)singleStepAct('shoot','right');
      check(arena.hits===0&&SINGLE_STEP.weaponCharge===3,'蓄力不提前出弹');
      singleStepAct('shoot','right');
      check(arena.hits===3&&SINGLE_STEP.weaponCharge===0,'连击释放三发');
      arenaLoad(false);equip('jet','boots');
      Object.assign(player,{col:4,row:4});
      check(singleStepAct('move','right')&&player.col===6,'喷气背包跨过单格深坑');
      currentRoomGrid[6][5]=TILE.SPIKE;
      const hp=playerStats.hp;
      singleStepAct('move','down');
      check(playerStats.hp===hp,'厚底皮靴抵御尖刺');
      arenaLoad(false);equip('echo');
      const enemy=monsters.find(m=>m.cfgId==='step_fixed');
      Object.assign(enemy,{col:4,row:3});
      singleStepReset();
      singleStepAct('move','up');
      check(SINGLE_STEP.bonus===2&&SINGLE_STEP.echo?.row===3,'成功闪避留下残影');
      singleStepAct('shoot','right');
      check(SINGLE_STEP.shots.filter(shot=>shot.player).length===2,'残影复制射击');
    });
    await page.locator('#arena-edit').click();
    assert.equal(await page.evaluate(() => arena.placements.size),6);
    assert.deepEqual(errors,[]);
    console.log('PASS: 自定义战斗场摆放、拾取覆盖、跨子类命中、木桩统计、重试与试玩道具');
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
