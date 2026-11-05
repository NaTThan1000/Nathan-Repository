// ==================== 玩家属性 ====================
const playerStats = {
  hp: 3,        maxHp: 3,
  moveSpeed: 3,    // 移速 → MP上限 = moveSpeed (下限1)
  fireRate: 3,     // 射速 → AP上限 = fireRate (下限1)
  attack: 3.5,
  range: 6,
  luck: 0,
};

// ==================== 玩家运行时状态 ====================
const player = {
  col: 6, row: 3,
  facing: 'down',
  px: WALL + 6 * CELL + CELL / 2,
  py: WALL + 3 * CELL + CELL / 2,
  targetPx: null, targetPy: null,
  walkFrame: 0, animTime: 0,
  shootTimer: 0,
  hitFlash: 0,         // 受击白闪
  shakeX: 0, shakeY: 0, // 受击抖动
  invincibleSteps: 0,  // 无敌步数计数 (战斗/探索通用, =移速×2)
  hasPiercing: false,   // 子弹穿透 (道具效果)
};

// ==================== AP 与回合状态 ====================
let turnState = {
  phase: 'player_select',     // player_select | monster_turn
  mAP: 0, maxMAP: 0,
  aAP: 0, maxAAP: 0,
  hasShot: false,              // 是否已进行过射击(触发checkpoint)
  turnNumber: 1,
  monsterTurnCounter: 0,
  reachableTiles: new Set(),   // 当前可移动方格集 "col,row"
  previewHits: [],             // 保留兼容 (旧渲染引用, 新流程不使用)
};

let bullets       = [];
let particles     = [];
let damageNumbers = [];  // [{x, y, text, life, maxLife, vy}]
let totalShots    = 0;
let turnSnapshot  = null;       // 回合开始时完整快照 (大存档点, Esc回溯)
let currentCheckpoint = null;   // 当前小存档点 (拾取/击杀时保存，BFS从这里读取)
let checkpointMAP = 0;          // 小存档点时的剩余 MP
let checkpointAAP = 0;          // 小存档点时的剩余 AP
let pendingReachableRefresh = false;  // 怪物死亡后需刷新可移动范围


// ==================== 动画/视觉状态 ====================
let battleStartAnim = { active: false, timer: 0, duration: 0.55 };  // 交叉剑战斗开始动画
let rewindAnim = { active: false, timer: 0, duration: 0.35 };     // Esc全重置时间倒流动画
