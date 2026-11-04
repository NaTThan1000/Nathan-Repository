// ==================== 道具系统状态 ====================
let itemsOnGround = [];     // [{id, cfgId, col, row, px, py, name, icon, quality, ...}]
let playerInventory = [];   // 已拾取道具的 cfgId 列表
let itemIdCounter = 0;
let pickupHintTimer = 0;    // 拾取提示计时器

// Fisher-Yates 洗牌
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ==================== 资源系统状态 ====================
let resourcesOnGround = [];  // 地面资源实体 [{id, cfgId, type, col, row, ...}]
let resourceIdCounter = 0;

// ==================== 炸弹系统状态 ====================
let bombs = [];         // 已放置的炸弹 [{id, col, row, timer, roomId}]
let bombIdCounter = 0;
// 炸弹已是战斗模式的一部分，不再需要独立 bombMode

// ==================== 调试模式 ====================
let debugMode     = false;
let debugMouseX   = -1;       // 鼠标在游戏像素坐标中的 X
let debugMouseY   = -1;       // 鼠标在游戏像素坐标中的 Y
let debugMouseIn  = false;    // 鼠标是否在 canvas 内
