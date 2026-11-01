const fs=require('fs'),path=require('path'),cp=require('child_process');
const dir=path.resolve('Project-turnbased-shoot/tests/artifacts');
let html=fs.readFileSync('Project-turnbased-shoot/turnbased-shoot-demo-pack.html','utf8');
html=html.replace('bootGame();','/* browser test starts boot explicitly */');
const script=`
window.requestAnimationFrame=()=>0;
const qaErrors=[];window.addEventListener('error',e=>qaErrors.push(e.message));window.addEventListener('unhandledrejection',e=>qaErrors.push(String(e.reason)));
(async()=>{try{
 await bootGame();startGameFromMenu();
 currentRoomGrid=Array.from({length:COLS},()=>Array(ROWS).fill(TILE.FLOOR));tileData={};bombs=[];monsters=[];pendingBossLanding=null;
 const cfgs=Object.keys(MONSTER_DB).filter(k=>!k.startsWith('_'));
 const ids=[cfgs.find(k=>k.startsWith('crack_maw')),cfgs.find(k=>k.startsWith('flying_eye'))];
 for(const id of ids)spawnMonsterAtRandomPos(id);
 monsters[0].col=3;monsters[0].row=3;monsters[1].col=9;monsters[1].row=2;
 for(const m of monsters){const p=gridToPixel(m.col,m.row);m.px=p.x;m.py=p.y;}
 player.col=6;player.row=3;Object.assign(player,gridToPixel(6,3));const pp=gridToPixel(6,3);player.px=pp.x;player.py=pp.y;player.targetPx=null;player.invincibleSteps=0;
 inCombat=true;gameStarted=true;gameOver=false;resetTurnAP();dangerForecastKey=null;
 for(let i=0;i<10000;i++){updateDangerForecast();if(dangerForecastJob.done)break;}
 if(!dangerForecastJob.done)throw Error('forecast did not finish');
 if(!dangerForecast.red.size||!dangerForecast.yellow.size)throw Error('missing red or yellow layer');
 const layoutIds=['top-resource-bar','top-right-group','status-floor','status-phase','status-turn','sound-btn','debug-btn','help-btn','spawn-monster-btn','game-container'];
 const layout=()=>layoutIds.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,r.x,r.y,r.width,r.height];});
 updateUI();const playerLayout=JSON.stringify(layout());
 dangerForecastJob.done=false;updateUI();if(JSON.stringify(layout())!==playerLayout)throw Error('pending forecast changed UI layout');dangerForecastJob.done=true;
 turnState.phase='monster_turn';updateUI();if(JSON.stringify(layout())!==playerLayout)throw Error('monster phase changed UI layout');
 turnState.phase='player_select';updateUI();
 const resourceRect=document.getElementById('top-resource-bar').getBoundingClientRect(),groupRect=document.getElementById('top-right-group').getBoundingClientRect();
 if(groupRect.top>=resourceRect.bottom)throw Error('top controls wrapped below resources');
 const initialKey=getDangerForecastKey();
 const initialLayer=JSON.stringify({red:[...dangerForecast.red].sort(),yellow:[...dangerForecast.yellow].sort()});
 player.col=5;player.targetPx=null;
 for(let i=0;i<10000;i++){updateDangerForecast();if(dangerForecastJob.done)break;}
 if(getDangerForecastKey()===initialKey)throw Error('movement did not invalidate forecast');
 document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}));
 if(player.col!==6||rewindsRemaining!==1)throw Error('rewind did not restore position or consume one use');
 for(let i=0;i<10000;i++){updateDangerForecast();if(dangerForecastJob.done)break;}
 if(JSON.stringify({red:[...dangerForecast.red].sort(),yellow:[...dangerForecast.yellow].sort()})!==initialLayer)throw Error('rewind forecast differs from initial state');
 rewindAnim.active=false;
 const previous=JSON.stringify({monsters,bombs,hp:playerStats.hp});
 turnState.phase='monster_turn';startMonsterTurn();
 if(JSON.stringify({monsters,bombs,hp:playerStats.hp})!==previous)throw Error('reveal changed game state');
 updateDangerReveal(0.3);
 if(JSON.stringify({monsters,bombs,hp:playerStats.hp})!==previous)throw Error('damage before reveal delay');
 const revealCount=dangerReveal.red.size;
 const revealed=new Set(dangerReveal.red);const actualDanger=new Set();
 const oldNote=noteDangerCell;noteDangerCell=(c,r)=>actualDanger.add(c+','+r);
 updateDangerReveal(0.4);
 if(dangerRevealRemaining!==0||dangerReveal!==null)throw Error('reveal did not execute');
 for(let frame=0;frame<2400&&turnState.phase==='monster_turn';frame++) {updateBullets(1/120);updateDukeAnim(1/120);updateMonsterTurn(1/120);}
 noteDangerCell=oldNote;
 if(turnState.phase==='monster_turn')throw Error('actual monster turn did not finish');
 for(const key of actualDanger)if(!revealed.has(key))throw Error('actual damage cell missing from revealed result: '+key);
 // 恢复测试局面供截图查看红黄格。
 turnState.phase='player_select';dangerForecastKey=null;monsterTurnRandom=null;player.invincibleSteps=0;
 for(let i=0;i<10000;i++){updateDangerForecast();if(dangerForecastJob.done)break;}
 updateUI();render();
 const result={ok:true,layoutStable:true,red:dangerForecast.red.size,yellow:dangerForecast.yellow.size,revealCount,actualDangerCount:actualDanger.size,outcomes:dangerForecastJob.outcomes,errors:qaErrors};
 document.body.setAttribute('data-qa',JSON.stringify(result));
 }catch(e){document.body.setAttribute('data-qa',JSON.stringify({ok:false,error:e.stack,errors:qaErrors}));}})();
`;
html=html.replace('</body>','<script>'+script+'</script></body>');const file=path.join(dir,'danger-browser-qa.html');fs.writeFileSync(file,html);
const chrome='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const args=['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--user-data-dir='+path.join(dir,'chrome-profile'),'--allow-file-access-from-files','--virtual-time-budget=10000','--window-size=1500,1100','--screenshot='+path.join(dir,'danger-browser-qa.png'),'--dump-dom','file:///'+file.replace(/\\/g,'/')];
const result=cp.spawnSync(chrome,args,{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:4*1024*1024});fs.writeFileSync(path.join(dir,'browser-dom.html'),result.stdout||'');
console.log('exit',result.status,'error',result.error?.message);const qa=(result.stdout||'').match(/data-qa="([^"]*)"/)?.[1];console.log(qa||'No QA result');if(!qa||!qa.includes('&quot;ok&quot;:true'))process.exitCode=1;console.log((result.stderr||'').slice(-600));
