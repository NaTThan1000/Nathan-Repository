// ==================== 怪物系统 ====================
// AI 行为类型枚举
const AI_TYPE = {
  CHASE:        'chase',         // 向玩家追踪移动
  RANGED_KITE:  'ranged_kite',   // 保持距离远程射击
  PATROL:       'patrol',        // 巡逻+感知追击
  CHARGE:       'charge',        // 周期性冲刺
  STATIONARY:   'stationary',    // 不动但远程射击
  BOSS_CHASE:   'boss_chase',    // 追踪+特殊攻击
  BOSS_JUMPER:  'boss_jumper',   // 2×2跳跃Boss (小跳/大跳循环)
  BOSS_DUKE:    'boss_duke',     // 2×2苍蝇公爵 (对角移动+反弹+召唤浮游眼)
};

// 怪物配置数据库 (异步从 JSON 加载)
let MONSTER_DB = {};
let MONSTER_POOL_NORMAL = [];
let MONSTER_POOL_ALL = [];

function _rebuildMonsterPools() {
  // skip meta keys like _schema, _comment etc.
  const keys = Object.keys(MONSTER_DB).filter(k => !k.startsWith('_'));
  MONSTER_POOL_NORMAL = keys.filter(k => MONSTER_DB[k].aiType !== 'boss_chase' && MONSTER_DB[k].aiType !== 'boss_jumper' && MONSTER_DB[k].aiType !== 'boss_duke');
  MONSTER_POOL_ALL = keys;
}

let SPAWN_CONFIG = {};
let SQUAD_TEMPLATES = {};

async function loadSpawnConfig() {
  try {
    const r = await fetch('Configs/spawn-config.json?' + Date.now());
    if (r.ok) {
      SPAWN_CONFIG = await r.json();
      console.log('✅ 已加载刷怪配置');
      return true;
    }
  } catch(e) { console.warn('⚠ 刷怪配置加载失败，使用默认值'); }
  return false;
}

async function loadSquadTemplates() {
  try {
    const r = await fetch('Configs/squad-templates.json?' + Date.now());
    if (r.ok) {
      SQUAD_TEMPLATES = await r.json();
      console.log('✅ 已加载小队模板 (' + Object.keys(SQUAD_TEMPLATES.squads || {}).length + ' 个 squad)');
      return true;
    }
  } catch(e) { console.warn('⚠ 小队模板加载失败，使用默认值'); }
  return false;
}

async function loadMonsterDB() {
  try {
    const r = await fetch('Configs/monster-db.json?' + Date.now());
    if (r.ok) {
      MONSTER_DB = await r.json();
      _rebuildMonsterPools();
      console.log('✅ 已从 JSON 加载怪物数据库 (' + MONSTER_POOL_ALL.length + ' 种)');
      return true;
    }
  } catch(e) {
    console.warn('⚠ 无法加载 monster-db.json:', e.message);
  }
  return false;
}

// ==================== 道具数据库 (异步加载) ====================
let ITEMS_DB = {};
let ITEM_DROP_TABLES = {};
let ITEM_POOL_COMMON = [];
let ITEM_POOL_RARE = [];
let ITEM_POOL_LEGENDARY = [];
let ITEM_POOL_ALL = [];

// ==================== 特殊效果注册表 ====================
const SPECIAL_EFFECT_HANDLERS = {
  'piercing': {
    apply(state) { state.hasPiercing = true; },
    reset(state) { state.hasPiercing = false; },
  },
  'damage_mult': {
    apply(state, params) { state.damageMultiplier *= (params.mult || 1.0); },
    reset(state) { state.damageMultiplier = 1.0; },
  },
  'heal_full': {
    // 在 applyItem 中处理，此处仅标记
    apply() {},
    reset() {},
  },
};

function _rebuildItemPools() {
  const keys = Object.keys(ITEMS_DB);
  ITEM_POOL_COMMON = keys.filter(k => ITEMS_DB[k].quality === 'common');
  ITEM_POOL_RARE = keys.filter(k => ITEMS_DB[k].quality === 'rare');
  ITEM_POOL_LEGENDARY = keys.filter(k => ITEMS_DB[k].quality === 'legendary');
  ITEM_POOL_ALL = keys;
}

async function loadItemDB(catalog = 'items') {
  try {
    const r = await fetch('Configs/item-db.json?' + Date.now());
    if (r.ok) {
      const data = await r.json();
      ITEMS_DB = data[catalog] || {};
      ITEM_DROP_TABLES = {...data.itemDropTables,
        ...(catalog === 'singleStepItems' ? data.singleStepItemDropTables : {})};
      _rebuildItemPools();
      console.log('✅ 已从 JSON 加载道具数据库 (' + ITEM_POOL_ALL.length + ' 件 + ' + Object.keys(ITEM_DROP_TABLES).length + ' 张品质表)');
      return true;
    }
  } catch(e) {
    console.warn('⚠ 无法加载 item-db.json:', e.message);
  }
  return false;
}

// ==================== 资源数据库 (异步加载) ====================
let RESOURCE_DB = {};       // 资源定义 { coin_gold: {...}, ... }
let RES_DROP_TABLES = {};   // 资源掉落表
let RES_LIMITS = {};        // 上限配置
let playerResources = {
  coins: 0,          // 金币数
  bombs: 0,          // 炸弹数
  keys: 0,           // 钥匙数
  blueHearts: 0,     // 蓝心HP
};

async function loadResourceDB({singleStep=false}={}) {
  try {
    const r = await fetch('Configs/resource-db.json?' + Date.now());
    if (r.ok) {
      const data = await r.json();
      RESOURCE_DB = data.resources || {};
      RES_DROP_TABLES = data.resourceDropTables || {};
      if (singleStep) {
        for (const [id,weights] of Object.entries(data.singleStepResourceDropWeights || {})) {
          const base=RES_DROP_TABLES[id];
          RES_DROP_TABLES[id]={...base,table:{...base.table,...weights}};
        }
      }
      RES_LIMITS = data._limits || { coinMax: 99, bombMax: 99, keyMax: 99 };
      console.log('✅ 已加载资源数据库 (' + Object.keys(RESOURCE_DB).length + ' 种资源)');
      return true;
    }
  } catch(e) { console.warn('⚠ 无法加载 resource-db.json:', e.message); }
  return false;
}
