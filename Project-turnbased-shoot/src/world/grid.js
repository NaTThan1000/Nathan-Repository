// ==================== 游戏常量 ====================
const CFG = {
  WALL: 16,
  CELL: 22,
  COLS: 13,
  ROWS: 7,
  BULLET_MAX_DIST: 6.0,    // 射程=6
  BULLET_SPEED: 560,       // 翻倍: 280→560
  DECAY_START_BEFORE: 0.2,
  DECAY_SPEED_RATIO: 0.07,
  DECAY_GRAVITY: 1100,     // 翻倍配合子弹速度
  MOVE_SPEED: 140,         // 翻倍: 70→140
  GRAVITY: 360,            // 翻倍配合粒子速度
  SHATTER_PARTICLES: 10,
  SHATTER_DURATION: 0.25,
  VP_SCALE_TOP: 1.00,
  VP_SCALE_BOT: 1.00,
  GHOST_ALPHA: 0.4,
  EXEC_MOVE_SPEED: 170,    // 翻倍: 85→170
};

const WALL  = CFG.WALL;
const CELL  = CFG.CELL;
const COLS  = CFG.COLS;
const ROWS  = CFG.ROWS;
const FLOOR_L = WALL;
const FLOOR_T = WALL;
const FLOOR_R = WALL + COLS * CELL;
const FLOOR_B = WALL + ROWS * CELL;
const VP_CX = (FLOOR_L + FLOOR_R) / 2;
const VP_S  = CFG.VP_SCALE_TOP;
const VP_E  = CFG.VP_SCALE_BOT;

// ==================== 方向常量 ====================
const DIR_VEC = {
  up:    { dx:  0, dy: -1, symbol: '↑' },
  down:  { dx:  0, dy:  1, symbol: '↓' },
  left:  { dx: -1, dy:  0, symbol: '←' },
  right: { dx:  1, dy:  0, symbol: '→' },
  'up-right':    { dx:  1, dy: -1, symbol: '↗' },
  'down-right':  { dx:  1, dy:  1, symbol: '↘' },
  'up-left':     { dx: -1, dy: -1, symbol: '↖' },
  'down-left':   { dx: -1, dy:  1, symbol: '↙' },
};

// ==================== TILE 网格系统 ====================
const TILE = { FLOOR:0, ROCK:1, POOP:2, PIT:3, SPIKE:4, LADDER:5 };
const TILE_CHAR = { '.':0, '#':1, 'P':2, 'O':3, '^':4, 'L':5 };
const TILE_COLORS = { 0:'#4a4038', 1:'#6b6058', 2:'#8b7355', 3:'#1a1520', 4:'#8a3030', 5:'#1a1520' };
const TILE_WALKABLE = { 0:true, 1:false, 2:false, 3:false, 4:true, 5:true };
const TILE_BLOCKS_BULLET = { 0:false, 1:true, 2:true, 3:false, 4:false, 5:false };
function parseGrid(tiles){const g=[];for(let c=0;c<COLS;c++){g[c]=[];for(let r=0;r<ROWS;r++)g[c][r]=TILE_CHAR[tiles[r][c]]||0;}return g;}
// 将 row-major grid[row][col] 转置为 col-major grid[col][row] (JSON 存储格式 → 运行时格式)
function transposeGridRowToCol(rowGrid){const g=[];for(let c=0;c<COLS;c++){g[c]=[];for(let r=0;r<ROWS;r++)g[c][r]=rowGrid[r][c];}return g;}
// 将 col-major grid[col][row] 转置为 row-major grid[row][col] (运行时格式 → JSON 存储格式)
function transposeGridColToRow(colGrid){const g=[];for(let r=0;r<ROWS;r++){g[r]=[];for(let c=0;c<COLS;c++)g[r][c]=colGrid[c][r];}return g;}
