const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../turnbased-shoot-map-viewer.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(code);
const storage = new Map(), elements = new Map();
const canvas = new Proxy({}, {get: () => () => {}});
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    value: '', textContent: '', style: {}, classList: {add(){}, remove(){}},
    addEventListener(type, fn) { this[type] = fn; },
    getContext() { return canvas; }, appendChild() {},
  });
  return elements.get(id);
}
const ctx = vm.createContext({
  document: {getElementById: element, querySelector: element, querySelectorAll: () => [],
    createElement: () => element(Symbol()), body: element('body'), addEventListener(){}},
  window: {addEventListener(){}}, console,
  localStorage: {getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k)},
  alert: msg => {throw new Error(msg);}, confirm: () => true, setTimeout(){},
});
vm.runInContext(code.split('(async function init(){')[0], ctx);
const run = s => vm.runInContext(s, ctx);
async function main() {
  assert.equal(run('validateTiles(["."]).pass'), false);
  assert.equal(run('validateTiles(Array(7).fill("?".repeat(13))).pass'), false);
  assert.equal(run('analyzeTiles(Array(7).fill(".".repeat(13))).maxDoorDistance'), 12);
  assert.equal(run('analyzeTiles(Array(7).fill(".".repeat(13))).isolated'), 0);
  // 四个门仍连通，但中心地面封闭：门位检查通过，诊断必须指出孤岛。
  assert.equal(run(`analyzeTiles(['.............','.............','......#......','.....#.#.....','......#......','.............','.............']).isolated`), 1);
  storage.set('turnbased-shoot-cached-pool', '{}');
  storage.set('turnbased-shoot-room-templates-v2', '{"draft":{}}');
  await run('autoLoadPool()');
  assert.ok(storage.has('turnbased-shoot-room-templates-v2'), '启动不得删除草稿');
  storage.delete('turnbased-shoot-room-templates-v2');
  run('refreshTemplates = () => {};');
  for (const profile of ['combat', 'exploration']) {
    element('generation-profile').value = profile;
    for (let i=0; i<100; i++) {
      run('autoGenerate()');
      const metric = run('analyzeTiles(Object.values(loadCustomTemplates()).at(-1).tiles)');
      assert.equal(metric.isolated, 0);
      assert.ok(metric.blocked >= 8 && metric.blocked <= 23);
      assert.ok(metric.spikes <= 4 && metric.maxDoorDistance <= 20);
      if (profile === 'combat') assert.ok(metric.deadEnds <= 2);
    }
  }
  run(`allFloors={1:{floorNum:1,name:'test',rooms:[{id:'a',grid:parseGrid(Array(7).fill('.'.repeat(13))),spawnConfig:{keep:true}}],edges:[],layout:{},startRoomId:'a'}}`);
  await run('saveFloorToFile()');
  let saved = JSON.parse(storage.get('turnbased-shoot-floor-data-cache-v2'));
  assert.equal(saved[1].rooms[0].grid.length, 7);
  assert.equal(saved[1].rooms[0].grid[0].length, 13);
  assert.equal(saved[1].rooms[0].spawnConfig.keep, true);
  assert.match(element('tool-status').textContent, /缓存/);
  run(`floorFileHandle={createWritable:async()=>{throw new Error('denied')}}`);
  await run('saveFloorToFile()');
  assert.ok([...elements.values()].some(e => /文件写入失败/.test(e.textContent)));
  run('floorFileHandle=null; buildFloorNav=()=>{}; renderFloor=()=>{};');
  const floors=JSON.parse(fs.readFileSync(path.join(__dirname,'../Configs/floor-data.json'),'utf8'));
  ctx.importText=JSON.stringify(floors);
  run('floorFileInput.files=[{text:async()=>importText}]');
  await run('floorFileInput.change()');
  assert.match(element('tool-status').textContent, /已加载/);
  assert.equal(run('allFloors[3].rooms.length'), floors[3].rooms.length);
  await run('saveFloorToFile()');
  saved=JSON.parse(storage.get('turnbased-shoot-floor-data-cache-v2'));
  for(const floor of Object.values(saved))for(const room of floor.rooms){
    ctx.exportGrid=room.grid;
    const preview=run('transposeGridRowToCol(exportGrid)');
    assert.equal(JSON.stringify(preview),run(`JSON.stringify(allFloors[${floor.floorNum}].rooms.find(r=>r.id===${JSON.stringify(room.id)}).grid)`));
  }
  console.log('地图编辑器：脚本、孤岛诊断、草稿恢复、200次生成筛选、快照导出及写入失败提示通过');
}
main().catch(e => {console.error(e);process.exitCode=1;});
