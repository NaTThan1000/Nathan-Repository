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
    assert.deepEqual(await page.evaluate(() => [
      Object.keys(ITEMS_DB).length,ITEM_POOL_ALL.length,Object.hasOwn(ITEMS_DB,'trial_weapon_laser'),
      ITEM_POOL_ALL.includes('trial_weapon_laser'),
    ]),[60,60,true,true]);
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
    assert.equal(await page.locator('#arena-entry option').count(),60);
    await pick('item','trial_weapon_triple'); await at(4,3);
    await pick('item','trial_weapon_poison'); await at(5,3);
    assert.deepEqual(await page.evaluate(() => {
      const labels = [], fillText = ctx.fillText;
      ctx.fillText = text => labels.push(text);
      try { drawItemsOnGround(); } finally { ctx.fillText = fillText; }
      return labels;
    }), ['双管','三管','毒性子','弹']);
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
      equip('shotgun','energy','dual');
      applyItem('single_step_pierce');
      check(equippedWeaponTrial('shell')==='pierce','正式穿透子弹进入弹壳子类');
      singleStepAct('shoot','right');
      check(equippedWeaponTrial('body')==='energy'&&equippedWeaponTrial('pattern')==='dual'&&
        SINGLE_STEP.shots.filter(shot=>shot.beam).length===2,'枪体覆盖后保留不同子类');
      equip('blast');
      check(!playerInventory.includes('single_step_pierce')&&equippedWeaponTrial('shell')==='blast','原型弹壳能覆盖正式穿透子弹');
      arenaLoad(false);equip('burstCharge','poison');
      for(let i=0;i<3;i++)singleStepAct('shoot','right');
      check(arena.hits===0&&SINGLE_STEP.weaponCharge===3,'蓄力不提前出弹');
      singleStepAct('shoot','right');
      check(arena.hits===3&&SINGLE_STEP.weaponCharge===0,'连击释放三发');
      arenaLoad(false);equip('laser','twin');
      singleStepAct('shoot','right');
      check(SINGLE_STEP.shots.filter(shot=>shot.player&&shot.beam).length===2,'激光枪和双头管可以组合');
      arenaLoad(false);equip('jet','boots');
      Object.assign(player,{col:4,row:4});
      check(singleStepAct('move','right')&&player.col===6,'喷气背包跨过单格深坑');
      currentRoomGrid[6][5]=TILE.SPIKE;
      const hp=playerStats.hp;
      singleStepAct('move','down');
      check(playerStats.hp===hp,'厚底皮靴抵御尖刺');
      const original = arena.placements, originalStart = arena.start;
      const dummy = (col,row) => ({kind:'dummy',col,row,size:1});
      const terrain = (col,row,id) => ({kind:'terrain',col,row,id,size:1});
      const load = (placements,...effects) => {
        arena.placements = new Map(placements.map(p=>[arenaKey(p.col,p.row),p]));
        arenaLoad(false);
        equip(...effects);
      };
      const fire = () => {
        check(singleStepAct('shoot','right'),'接受测试射击');
        return SINGLE_STEP.shots.filter(shot=>shot.player);
      };
      const shoot = (placements,...effects) => {
        load(placements,...effects);
        return fire();
      };
      const withRandom = (random,action) => {
        const original = Math.random;
        Math.random = random;
        try { return action(); } finally { Math.random = original; }
      };
      try {
        const attributes = ['attack','attack','range','range','health','health'];
        load(attributes.map((name,index)=>({kind:'item',id:'single_step_'+name,col:3+index,row:3,size:1})));
        for (const name of attributes) check(singleStepAct('move','right'),'走到属性道具上');
        check(playerStats.attack===4.5&&playerStats.range===8&&playerStats.maxHp===5&&
          playerInventory.length===6&&itemsOnGround.length===0,'相同属性道具拾取两次并叠加');

        const shop = currentFloor.rooms.find(room=>room.id===currentRoomId);
        const slot = {type:'item',cfgId:'single_step_attack',col:9,row:3,price:15,sold:false};
        Object.assign(shop,{type:'shop',_shopSlots:[slot]});
        playerResources.coins = 15;
        spawnItemOnGrid(9,3,slot.cfgId);
        check(singleStepAct('move','right')&&slot.sold&&playerStats.attack===5&&playerResources.coins===0,
          '已拾取的属性道具可继续从商店购买并叠加');

        load([3,4].map(col=>({kind:'item',id:'single_step_pierce',col,row:3,size:1})));
        singleStepAct('move','right');
        singleStepAct('move','right');
        check(playerInventory.length===1&&itemsOnGround.length===1,'非属性道具继续按单件处理');

        for (const [pattern, count] of [['dual',2],['triple',3]]) {
          const shots = shoot([dummy(5,3)],pattern);
          check(shots.length===count&&arena.hits===count&&damageNumbers.length===count,'枪管数、命中数及飘字数一致');
          for(let i=1;i<count;i++){
            check(Math.abs(shots[i].start-shots[i-1].start-20)<.01,'同向弹体微量错开发射');
            check(Math.abs(damageNumbers[i].showAt-damageNumbers[i-1].showAt-20)<.01,'飘字微量错开出现');
          }
          check(new Set(damageNumbers.map(number=>number.x)).size===count,'同一木桩的飘字横向分离');
          const realNow = performance.now;
          try {
            for (const [index, number] of damageNumbers.entries()) {
              performance.now = () => number.showAt + 1;
              updateTextOverlay();
              const visible = [...document.querySelectorAll('.txt-damage')].filter(el => el.style.display !== 'none');
              check(visible.length===index+1,'界面随每一发命中逐个显示飘字');
            }
          } finally {
            performance.now = realNow;
          }
        }
        shoot([dummy(5,3)],'dual','burstCharge');
        for(let i=0;i<3;i++) singleStepAct('shoot','right');
        check(arena.hits===6&&new Set(SINGLE_STEP.shots.map(shot=>shot.start)).size===6,'蓄力连击与双管组合时六发依次发射');
        for (const trajectory of ['burstCharge','heavyCharge']) {
          load([],'trident',trajectory);
          const arcs = [], originalArc = ctx.arc;
          ctx.arc = (...args) => { arcs.push(args); originalArc.apply(ctx,args); };
          try {
            for (let step=1;step<=3;step++) {
              fire();
              arcs.length = 0;
              stepDrawChargeRing();
              const [x,y,radius,start,end] = arcs[1];
              const tile = cellRect(player.col,player.row);
              check(radius===2&&x===tile.xR-3.5&&y===tile.yT+3.5&&
                Math.abs((end-start)/(2*Math.PI)-step/3)<.001,'半径减半，圆环在格子右上角且逐次充能三分之一');
            }
            const shots = fire();
            arcs.length = 0;
            stepDrawChargeRing();
            check(arcs.length===1,'蓄力释放后圆环清空');
            const volleys = Map.groupBy(shots,shot=>shot.start);
            check(volleys.size===(trajectory==='burstCharge'?3:1)&&[...volleys.values()].every(group=>
              new Set(group.map(shot=>shot.dir.dy)).size===3),'三叉管每轮保留三条弹道');
            const times = [...volleys.keys()];
            check(times.slice(1).every((at,i)=>Math.abs(at-times[i]-130)<.01),'蓄力连击三轮之间留出130毫秒');
          } finally {
            ctx.arc = originalArc;
          }
        }
        for (const [effect,sign] of [['decay',-1],['gain',1]]) {
          const [shot] = shoot([],effect);
          check(Math.sign(shot.toScale-shot.fromScale)===sign&&Math.sign(shot.fromScale-1)===-sign,
            '能量弹体大小沿飞行方向随伤害衰减或增幅');
          const [beam] = shoot([],effect,'energy');
          check(beam.beam&&Math.sign(beam.toScale-beam.fromScale)===sign,'光束宽度同样随距离变化');
        }

        load([{kind:'item',id:'trial_weapon_shotgun',col:3,row:3,size:1}]);
        applyItem('single_step_range');
        scrapUpdateHUD();
        check(document.querySelector('#scrap-range').textContent==='7','拾取霰弹枪前显示加成后的射程');
        singleStepAct('move','right');
        scrapUpdateHUD();
        check(document.querySelector('#scrap-range').textContent==='3','实际拾取霰弹枪后射程减半并向下取整');
        equip('energy');
        scrapUpdateHUD();
        check(document.querySelector('#scrap-range').textContent==='7','切换枪体后恢复原射程');

        for (const [baseRange,range] of [[6,3],[11,5],[14,6]]) {
          load([],'shotgun');
          playerStats.range = baseRange;
          let pellet = 0;
          const rays = withRandom(()=>[0,.5,.99][pellet++%3],fire);
          const split = 2+Math.floor(range/2);
          const launches = rays.filter(shot=>pixelToGrid(shot.from.x,shot.from.y).col===2);
          const forks = rays.filter(shot=>shot.dir.dy);
          const tails = rays.filter(shot=>pixelToGrid(shot.to.x,shot.to.y).col===2+range);
          check(launches.length===20&&new Set(launches.map(shot=>shot.start)).size===20&&
            launches.every(shot=>pixelToGrid(shot.from.x,shot.from.y).row===3),'20颗弹丸从同一格微量错开发射');
          check(forks.every(shot=>pixelToGrid(shot.from.x,shot.from.y).col===split)&&
            tails.length===20&&new Set(tails.map(shot=>pixelToGrid(shot.to.x,shot.to.y).row)).size===3,
            '奇偶射程在前半程后分流，三列延伸到各自射程末端');
        }
        load([dummy(5,2),dummy(5,3),dummy(5,4)],'shotgun');
        playerStats.range = 10;
        withRandom(()=>.99,fire);
        check(arena.hits===20&&arena.last<playerStats.attack&&Math.abs(arena.total-20*arena.last)<.001&&
          stepVisualEvents.filter(e=>e.type==='weapon-hit').every(e=>e.id===monsters.find(m=>m.row===4).id),
          '霰弹按实际散到下方的颗数逐颗伤害');
        const tridentShotgun = shoot([],'shotgun','trident');
        check(tridentShotgun.length===3&&tridentShotgun.every(shot=>shot.to.x===gridToPixel(5,3).x),
          '发射数量类枪管覆盖默认散射但仍使用霰弹射程');

        const rock = terrain(4,3,TILE.ROCK), crate = terrain(5,3,TILE.POOP);
        const through = shoot([dummy(3,3),rock,crate,dummy(6,3)],'energy');
        check(through.length===1&&through[0].beam&&arena.hits===2,'能量射线穿过木桩、岩石和木箱');
        check(currentRoomGrid[4][3]===TILE.ROCK&&currentRoomGrid[5][3]===TILE.FLOOR,'穿透时岩石承伤，木箱一击摧毁');
        shoot([terrain(3,3,TILE.POOP),dummy(4,3)],'dual');
        check(currentRoomGrid[3][3]===TILE.FLOOR&&arena.hits===1,'双管先破木箱，第二发继续命中木桩');
        load([terrain(3,3,TILE.POOP),{kind:'monster',id:'step_fixed',col:4,row:3,size:1},dummy(5,3)],'triple');
        const weakEnemy = monsters.find(m=>m.cfgId==='step_fixed');
        weakEnemy.hp = 1;
        singleStepAct('shoot','right');
        const endpoints = SINGLE_STEP.shots.filter(shot=>shot.player).map(shot=>shot.to.x);
        check(currentRoomGrid[3][3]===TILE.FLOOR&&!monsters.includes(weakEnemy)&&arena.hits===1&&
          endpoints.every((x,index)=>x===gridToPixel(3+index,3).x),'三管依次破箱、击杀怪物、命中后方木桩');

        shoot([dummy(4,3),dummy(5,4),dummy(6,4),terrain(3,2,TILE.ROCK),terrain(4,4,TILE.POOP)],'blast');
        check(arena.hits===2&&arena.total===5.25,'爆炸命中中心和对角格，范围外不受伤');
        check(currentRoomGrid[3][2]===TILE.FLOOR&&currentRoomGrid[4][4]===TILE.FLOOR,'爆炸一次摧毁周围岩石和木箱');
        shoot([rock,terrain(5,4,TILE.POOP),dummy(5,2)],'blast');
        check(currentRoomGrid[4][3]===TILE.FLOOR&&currentRoomGrid[5][4]===TILE.FLOOR&&arena.hits===1,'直接命中地形也引爆完整范围');
        shoot([dummy(4,3),terrain(6,3,TILE.ROCK),dummy(6,4)],'energy','blast');
        check(arena.hits===1&&stepVisualEvents.filter(e=>e.type==='blast').length===1,'穿透射线只在首次命中引爆');
        arena.start = {col:10,row:3};
        shoot([dummy(11,4),terrain(12,4,TILE.ROCK),dummy(10,4)],'blast');
        const wallBlast = stepVisualEvents.find(e=>e.type==='blast');
        check(wallBlast?.col===12&&wallBlast.row===3&&currentRoomGrid[12][4]===TILE.FLOOR&&arena.hits===1,'撞墙以房内贴墙格引爆');

        arena.start = {col:11,row:3};
        const fold = shoot([dummy(1,3)],'fold');
        check(fold.length===2&&!fold[0].impact&&fold[0].to.x===FLOOR_R&&fold[1].from.x===FLOOR_L&&
          Math.abs(fold[0].start+fold[0].travel-fold[1].start)<.01&&fold[1].impact&&arena.hits===1,'折叠子弹无撞墙特效，从对侧继续飞行并命中');
        arena.start = originalStart;

        const splash = (layout,body,luck=1,range=playerStats.range) => {
          load(layout,...(body?[body]:[]),'splash');
          Object.assign(playerStats,{luck,range});
          return withRandom(()=>0,fire);
        };
        const splashLayout = [dummy(4,3),dummy(4,2),dummy(5,2),dummy(4,1)];
        for (const [body, beam, hits] of [[null,false,3],['energy',true,4]]) {
          const shots = splash(splashLayout,body);
          check(shots.length===3&&shots.every(shot=>shot.beam===beam)&&arena.hits===hits,'随机溅射继承当前枪体的弹体与穿透规则');
        }
        const rockSplash = splash([rock,dummy(4,2),dummy(5,2)],'energy');
        check(rockSplash.length===3&&rockSplash.every(shot=>shot.beam)&&arena.hits===2,'击中岩石后向不同方向溅射光束');
        splash([terrain(4,3,TILE.POOP),dummy(4,2),dummy(5,2)],null);
        check(currentRoomGrid[4][3]===TILE.FLOOR&&arena.hits===2,'击碎木箱仍会触发溅射');
        const minimum = splash([dummy(4,3)],null,-3,5).slice(0,-1);
        check(minimum.length===1&&pixelToGrid(minimum[0].to.x,minimum[0].to.y).row===1,'最低一向，5格射程的溅射为2格');
        const maximum = splash([dummy(4,3)],null,20,10).slice(0,-1);
        check(new Set(maximum.map(shot=>shot.dir.dx+','+shot.dir.dy)).size===8&&
          maximum.find(shot=>shot.dir.dx===1&&shot.dir.dy===0).to.x===gridToPixel(8,3).x,'高幸运八向无重复，10格射程的溅射为4格');

        const arc = shoot([rock,terrain(5,4,TILE.POOP),dummy(7,4)],'arc').filter(shot=>shot.beam);
        check(arc.length===2&&arc[0].to.x===gridToPixel(5,4).x&&arc[1].to.x===gridToPixel(7,4).x&&
          currentRoomGrid[5][4]===TILE.POOP&&arena.hits===1,'电弧可从岩石经木箱接力到达怪物');
        const priority = shoot([dummy(4,3),terrain(4,4,TILE.ROCK),dummy(6,3)],'arc').filter(shot=>shot.beam);
        check(priority[0].to.x===gridToPixel(6,3).x&&arena.hits===2,'有可传导怪物时优先于更近的障碍');
        for(const range of [7,8]){
          load([dummy(4,3),dummy(8,3)],'arc');
          playerStats.range = range;
          fire();
          check(arena.hits===(range===8?2:1),'电弧每跳按当前射程的一半向下取整');
        }
        const longArc = shoot([4,5,6,7,8,9].map(col=>dummy(col,3)),'arc').filter(shot=>shot.beam);
        check(longArc.length===4&&arena.hits===5&&arena.last===1.75&&
          new Set(stepVisualEvents.filter(event=>event.type==='weapon-hit').map(event=>event.id)).size===5,
          '电弧最多四跳，第四跳同样伤害末端怪物');
        const rockEnd = shoot([dummy(4,3),terrain(5,3,TILE.ROCK)],'arc').filter(shot=>shot.beam);
        check(rockEnd.length===1&&tileData['5,3'].hp===99-1.75,'提前停止时末端岩石也受电弧伤害');
        const crateEnd = shoot([4,5,6,7].map(col=>dummy(col,3)).concat(terrain(8,3,TILE.POOP)),'arc')
          .filter(shot=>shot.beam);
        check(crateEnd.length===4&&currentRoomGrid[8][3]===TILE.FLOOR,'第四跳落在木箱时也能击碎木箱');
        const branching = shoot([dummy(4,3),dummy(4,2),...[6,8,10,12].map(col=>dummy(col,4))],'arc')
          .filter(shot=>shot.beam);
        check(branching.length===4&&branching[0].to.x===gridToPixel(6,4).x&&arena.hits===5,
          '跳过最近但走不通的目标，选择能命中四个怪物的路线');
        const equallyGood = random => {
          load([dummy(4,3),dummy(4,2),dummy(4,4)],'arc');
          playerStats.range = 2;
          return withRandom(random,fire).find(shot=>shot.beam).to.y;
        };
        check(equallyGood(()=>0)!==equallyGood(()=>.99),'同样好的两条路线随随机结果切换');
        load([dummy(4,3),dummy(6,2),dummy(8,3)],'arc');
        monsters.find(m=>m.col===6).size = 2;
        const wideArc = fire().filter(shot=>shot.beam);
        check(wideArc.length===2&&arena.hits===3,'多格怪物也只会被同一颗子弹的电弧命中一次');

        const tracking = shoot([dummy(5,2)],'tracking');
        const turn = gridToPixel(4,3);
        check(tracking.length===2&&tracking[0].to.x===turn.x&&tracking[0].to.y===turn.y&&
          tracking[1].from.x===turn.x&&tracking[1].from.y===turn.y&&!tracking[0].impact&&arena.hits===1,'追踪弹飞行途中从当前格转向斜邻怪物');
        shoot([dummy(5,1)],'tracking');
        check(arena.hits===0,'追踪不锁定飞行路径两格以外的目标');

        shoot([dummy(4,3)],'poison');
        const poisoned = monsters.find(m=>m.arenaDummy);
        const applied = poisoned.weaponPoison.appliedAt;
        check(stepPoisonAlpha(poisoned,applied-1)===0&&stepPoisonAlpha(poisoned,applied)>.2,'命中时开启绿色遮罩');
        for(let tick=0;tick<3;tick++){
          singleStepAct('shoot','up');
          check(stepPoisonAlpha(poisoned,poisoned.weaponPoisonFlashAt)>.6,'每次毒伤都会闪绿');
        }
        check(arena.hits===4&&!poisoned.weaponPoison&&stepPoisonAlpha(poisoned,poisoned.weaponPoisonFlashAt+160)===0,
          '三次毒伤结束，最后一次闪烁后清除遮罩');

        shoot([{kind:'monster',id:'step_fixed',col:4,row:3,size:1}],'poison');
        const poisonedMonster = monsters.find(m=>m.cfgId==='step_fixed');
        const realNow = performance.now, maskTime = poisonedMonster.weaponPoison.appliedAt;
        try {
          performance.now = () => maskTime;
          drawMonsters();
          check(stepPoisonMasks.has(stepMonsterArt(poisonedMonster,maskTime)),'真实怪物绘制绿色轮廓遮罩');
        } finally {
          performance.now = realNow;
        }

        const foe = (col,row,id='step_fixed') => ({kind:'monster',id,col,row,size:1});
        load([dummy(5,3)],'runGun','toxicTrail','slimeTrail','luck');
        singleStepAct('move','right');
        check(arena.hits===1&&Object.keys(arenaEffects.ground.get('2,3').effects).length===2&&playerStats.luck===0,
          '移动自动射击，毒血和粘液可共存，幸运值为0');
        load([dummy(4,2)],'runGun');
        singleStepAct('move','right');
        check(!SINGLE_STEP.shots.some(shot=>shot.player),'边跑边射不会选中斜向目标');
        for (const [random,dx,dy] of [[0,0,-1],[.99,1,0]]) {
          load([dummy(3,1),dummy(5,3),dummy(4,2)],'runGun');
          withRandom(()=>random,()=>singleStepAct('move','right'));
          const shots = SINGLE_STEP.shots.filter(shot=>shot.player);
          check(arena.hits===1&&shots.length===1&&shots[0].dir.dx===dx&&shots[0].dir.dy===dy,
            '边跑边射从横竖可命中的方向中随机选一个，只触发一次');
        }
        load([foe(5,3)],'toxicTrail','slimeTrail');
        arenaGroundEffect({col:5,row:3},'toxic',3);
        arenaGroundEffect({col:5,row:3},'slime',3);
        const groundEnemy = monsters[0];
        const groundHp = groundEnemy.hp;
        stepTestHooks.beforeEnemies();
        check(groundEnemy.hp===groundHp-.5&&groundEnemy.arenaSlimeSlow,'毒血扣血，粘液延迟下一次移动');

        load([foe(5,4,'step_fighter')]);
        const slowed=monsters[0], safeHp=playerStats.hp;
        arenaGroundEffect({col:4,row:4},'slime',5);
        singleStepAct('shoot','up');
        check(slowed.col===4&&slowed.row===4,'近战怪走到粘液上');
        const originalMove=SINGLE_STEP.plans.get(slowed.id);
        check(originalMove.type==='chase'&&originalMove.path[0]?.col===3&&originalMove.path[0]?.row===4,
          '踩上粘液后原本要继续追击');
        singleStepAct('move','down');
        check(slowed.col===4&&slowed.row===4&&SINGLE_STEP.plans.get(slowed.id)===originalMove&&playerStats.hp===safeHp,
          '原地停一回合，玩家进入攻击范围也保留原定移动');
        singleStepAct('shoot','up');
        check(slowed.col===3&&slowed.row===4&&playerStats.hp===safeHp&&SINGLE_STEP.plans.get(slowed.id).type==='strike',
          '下一回合先完成原定移动，再锁定近战攻击');

        load([foe(4,3)],'knockback');
        SINGLE_STEP.bonus=1;
        fire();
        check(monsters[0].col===5,'击退改变怪物格位');
        for(const status of ['petrify','ink','short']){
          load([foe(4,3)],status);
          const hp=playerStats.hp;
          withRandom(()=>0,fire);
          check(arenaStatusActive(monsters[0],status)&&playerStats.hp===hp,'状态阻止炮台攻击 '+status);
        }
        load([foe(5,3,'step_fighter')],'fear');
        withRandom(()=>0,fire);
        check(Math.abs(monsters[0].col-2)+Math.abs(monsters[0].row-3)>3,'恐惧使追击怪物实际走远');
        load([foe(4,3)],'dual','sticky');
        withRandom(()=>0,fire);
        check(arenaStatusActive(monsters[0],'rooted'),'双管命中把粘液叠到束缚');
        shoot([dummy(4,3)],'triple','parasite');
        fire();
        check(arena.hits===7&&monsters[0].arenaParasite?.stacks===1,'寄生五层引爆，第六发开始新一轮');
        shoot([dummy(4,3)],'parasite');
        for(let i=0;i<4;i++)singleStepAct('shoot','up');
        check(arena.hits===2&&!monsters[0].arenaParasite,'寄生未满五层时在五步后引爆');
        shoot([dummy(4,3)],'acid');
        for(let i=0;i<5;i++)singleStepAct('shoot','up');
        check(arena.hits===6&&arena.last===1&&!arenaEffects.ground.size,'酸液在五个正常步扣血后消失');

        const lob = shoot([terrain(3,3,TILE.ROCK),dummy(9,3)],'lob');
        check(lob.length===1&&lob[0].arcHeight>0&&arena.hits===1&&tileData['3,3'].hp===99,'抛射越障并能命中延伸射程的怪物');
        load([dummy(4,3)],'unstable');
        for(let i=0;i<4;i++)withRandom(()=>.5,fire);
        check(arena.hits===24&&arenaEffects.unstableShots===0,'不稳定的枪第四发额外发射20颗霰弹');

        load([foe(5,3)],'slipStep','counterTime','bulletBonus');
        monsters[0].hp=1;
        singleStepAct('move','up');
        check(player.row===3&&monsters.length===0&&SINGLE_STEP.bonus===3,'闪身回原位、反击击杀并延长子弹时间可叠加');
        load([foe(6,3,'step_charger')],'brace');
        const braced = monsters[0], braceHp = braced.hp, playerHp=playerStats.hp;
        singleStepAct('shoot','up');
        check(player.col===2&&playerStats.hp===playerHp&&braced.hp===braceHp-playerStats.attack,'防冲挡住挤出和伤害并反伤');

        load([foe(4,3),foe(8,5)],'killMove','killShot','killPill');
        monsters[0].hp=1;
        fire();
        check(arenaEffects.moveCredit===1&&arenaEffects.shootCredit===1&&playerStats.attack===3.7,'击杀返还两类行动并提高本层攻击');
        const normalTurn=arenaEffects.turn;
        singleStepAct('move','down');
        singleStepAct('shoot','left');
        check(arenaEffects.turn===normalTurn&&!arenaEffects.moveCredit&&!arenaEffects.shootCredit,'额外移动和射击不推进正常步');

        load([foe(2,1)],'backArmor','hurtPill');
        const armoredHp=playerStats.hp;
        damagePlayer(1,monsters[0].id);
        check(!arenaEffects.armorReady&&playerStats.hp===armoredHp,'背后攻击消耗背甲');
        damagePlayer(1,monsters[0].id);
        check(playerStats.hp===armoredHp-1&&playerStats.attack===4,'实际受伤才触发浴血药丸');
        arenaLoad(false,'room');
        check(arenaEffects.armorReady&&playerStats.attack===4&&playerStats.hp===armoredHp-1,'下一间恢复背甲并携带生命和本层加成');
        arenaLoad(false,'floor');
        check(arena.floor===2&&playerStats.attack===3.5&&trialPassive('hurtPill'),'下一层保留道具并清除本层攻击加成');
        load([],'timedShield','rageShield');
        const shieldIcon=()=>{scrapUpdateHUD();return document.querySelector('#scrap-hearts > :last-child');};
        check(heartCapacity()===11&&shieldIcon().classList.contains('arena-heart-shield')&&
          shieldIcon().dataset.charge==='20'&&shieldIcon().classList.contains('ready'),'拾取后爱心末尾的护盾立即充满');
        damagePlayer(1);
        check(shieldIcon().dataset.charge==='0'&&playerStats.hp===3,'刚拾到的护盾可以立即挡伤');
        singleStepAct('shoot','up');
        check(arenaEffects.timedCharge===0,'射击不充能');
        for(let i=0;i<20;i++)singleStepAct('move',i%2?'left':'right');
        check(shieldIcon().dataset.charge==='20'&&shieldIcon().classList.contains('ready'),'移动二十格后护盾充满发光');
        damagePlayer(1);
        check(shieldIcon().dataset.charge==='0'&&!shieldIcon().classList.contains('ready')&&playerStats.hp===3,'护盾抵挡一次伤害后清空');
        for(let i=0;i<10;i++){
          stepSpawnOriginal('step_fixed',['地面'],null,{col:9,row:5});
          damageMonster(monsters.at(-1),99);
        }
        damagePlayer(1);
        check(!arenaEffects.rageReady&&arenaEffects.rageKills===0&&playerStats.hp===3,'10次击杀让狂暴护盾抵挡一次伤害');

        load([foe(5,3),{kind:'item',id:'trial_weapon_supplyDrone',col:3,row:3,size:1}]);
        check(singleStepAct('move','right')&&trialPassive('supplyDrone')&&
          arenaControl('effects').textContent.includes('补给无人机已启动'),'踩到补给无人机后显示启动反馈');
        Object.assign(playerResources,{coins:4,bombs:2,keys:0});
        for(let i=0;i<3;i++){
          monsters[0].hp=1; fire();
          if(i<2) {
            check(arenaControl('effects').textContent.includes('清房进度 '+(i+1)+'/3'),'清房后即时显示无人机进度');
            arenaLoad(false,'room');
          }
        }
        check(arena.room===3&&playerResources.keys===1&&arenaEffects.roomsCleared===0,'连清三间房，补给无人机补充最少的钥匙');

        load([dummy(1,3)]);
        playerResources.bombs=1;
        check(singleStepAct('bomb','right')&&bombs[0].timer===5,'放置时显示完整的5回合');
        for(const timer of [4,3,2,1]){
          singleStepAct('move','right');
          check(bombs[0]?.timer===timer&&arena.hits===0,'后续正常行动逐次扣除倒计时');
        }
        singleStepAct('shoot','up');
        check(!bombs.length&&arena.hits>0,'放置后的第5次正常行动实际引爆');

        load([dummy(6,4),dummy(7,3),dummy(1,2),terrain(4,2,TILE.POOP),terrain(5,1,TILE.ROCK)]);
        playerResources.bombs=1;
        singleStepAct('bomb','right');
        singleStepAct('move','left');
        singleStepAct('move','right');
        check(bombs[0]?.col===5&&bombs[0].row===3,'炸弹已推到新位置');
        for(let i=0;i<3;i++)singleStepAct('shoot','down');
        const hitDummies = monsters.filter(m=>m.arenaHitUntil).map(m=>[m.col,m.row]);
        check(!bombs.length&&arena.hits===1&&arena.total===50&&JSON.stringify(hitDummies)==='[[6,4]]'&&
          currentRoomGrid[4][2]===TILE.FLOOR&&currentRoomGrid[5][1]===TILE.ROCK,
          '爆炸以新位置为中心，命中对角格且不命中两格外目标');
        const blast=stepVisualEvents.find(e=>e.type==='bomb-blast');
        check(blast?.col===5&&blast.row===3&&blast.cells.length===9&&
          blast.cells.some(p=>p.col===6&&p.row===4),'爆炸闪光跟随引爆位置覆盖实际九格');

        load([dummy(1,3),dummy(3,2)],'remoteBomb','claymore','bombBaby');
        playerResources.bombs=1;
        check(singleStepAct('bomb','right')&&bombs[0].timer===Infinity&&playerResources.bombs===0,'遥控炸弹放置后停表');
        singleStepAct('move','right');
        withRandom(()=>0,()=>singleStepAct('bomb','right'));
        check(!bombs.length&&arena.hits===1&&resourcesOnGround.some(r=>r.cfgId==='bomb_single'),'零库存也能引爆，阔剑定向且炸弹宝宝掉补给');
        load([foe(6,3,'step_fighter')],'bombDecoy');
        bombs.push({col:8,row:3,roomId:currentRoomId,timer:3});
        singleStepAct('shoot','up');
        check(monsters[0].col===7,'怪物向倒计时炸弹移动');
        load([foe(6,3,'step_charger')]);
        const charger=monsters[0];
        check(singleStepAttackPreview(charger)?.type==='charge','锁定冲锋时有预警');
        charger.arenaSkipMove=true;
        check(!singleStepAttackPreview(charger)&&charger.arenaSkipMove,'跳过冲锋时取消预警，绘制不会消耗跳过状态');
      } finally {
        arena.start = originalStart;
        arena.placements = original;
      }
    });
    await page.locator('#arena-edit').click();
    assert.equal(await page.evaluate(() => arena.placements.size),6);
    await page.locator('#arena-setup summary').click();
    const set = async (key,value) => {
      const input = page.locator('#arena-setup-'+key);
      await input.fill(String(value));
      await input.press('Tab');
    };
    const setupValues = () => page.evaluate(() => arenaCurrentSetup());
    for (const [key,value] of Object.entries({maxHp:8,hp:2.5,blueHearts:1.5,coins:41,bombs:7,keys:4})) {
      await set(key,value);
    }
    const preset = {maxHp:8,hp:2.5,blueHearts:1.5,coins:41,bombs:7,keys:4};
    await page.locator('#arena-start').click();
    assert.deepEqual(await setupValues(),preset,'开局使用布置时的资源和血量');
    assert.equal(await page.locator('#scrap-hearts img').count(),10,'顶栏显示8格红心和两格蓝心');
    await set('hp',5.5);
    await set('maxHp',10);
    await set('bombs',2);
    assert.deepEqual(await setupValues(),{...preset,maxHp:10,hp:5.5,bombs:2},'试玩中可单独调整数值');
    assert.equal(await page.evaluate(()=>SINGLE_STEP.step),0,'配置修改不推进行动');
    await page.evaluate(()=>applyItem('single_step_health'));
    assert.equal((await setupValues()).maxHp,11,'拾取生命+叠加到自定义上限');
    await set('maxHp',4);
    assert.equal((await setupValues()).maxHp,4,'持有生命道具时也可直接指定最终上限');
    await page.locator('#arena-next-room').click();
    assert.equal((await setupValues()).maxHp,4,'下一间携带即时调整后的上限');
    await set('maxHp',40);
    await set('hp',40);
    await set('bombs',200);
    await set('keys',-3);
    assert.deepEqual(await setupValues(),{...preset,maxHp:12,hp:12,blueHearts:0,bombs:99,keys:0},'超界输入按游戏容量归整');
    await page.locator('#arena-restart').click();
    assert.deepEqual(await setupValues(),preset,'重试恢复开局预设');
    await page.locator('#arena-edit').click();
    await pick('monster','boss_jumper_i');
    assert.deepEqual(await page.locator('#arena-entry option').evaluateAll(options=>options.map(option=>option.value)),
      await page.evaluate(()=>[...MONSTER_POOL_NORMAL,'boss_jumper_i','boss_jumper_ii','boss_jumper_iii','duke_fly']),
      '怪物列表使用正式普通怪和两类Boss');
    await at(9,1);
    await pick('monster','duke_fly');
    await at(9,4);
    await pick('monster','step_mobile');
    await at(10,3);
    await page.locator('#arena-start').click();
    assert.match(await page.locator('#arena-status').textContent(),/测试中/);
    assert.deepEqual(await page.evaluate(() => ['boss_jumper_i','duke_fly','step_mobile'].map(id =>
      SINGLE_STEP.plans.has(monsters.find(monster=>monster.cfgId===id)?.id))),[true,true,true]);
    await move();
    assert.equal(await page.evaluate(() => SINGLE_STEP.step),1,'布置两类Boss和正式普通怪后可以开始测试并操作');
    assert.deepEqual(errors,[]);
    console.log('PASS: 自定义战斗场名称卡片、逐发破箱与击杀、墙边爆炸、障碍溅射与导电、追踪、折叠、中毒');
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
