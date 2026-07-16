# 以撒·半回合制战斗 — 项目总览

> 文件: `Project-Issac-turnbase/isaac-turnbased-demo.html` | 单文件 ~3000+ 行 | 配套: `isaac-map-viewer.html` 房间编辑器 + `Configs/pool.json` 关卡池 + `Configs/server.js` 本地文件读写服务 | 状态: 即时操作回合制 + 怪物AI + 碰撞击退 + ESC全重置 + 多房间楼层切换 + Boss梯子下层 + 场景滑动过渡

---

# Part 1: 游戏策划文档

## 1. 游戏概述

### 1.1 游戏定位
**类型**: Roguelike 半回合制地牢战斗 | **原型平台**: 网页 Canvas | **目标平台**: Godot 引擎

### 1.2 核心概念
受《以撒的结合》启发，Roguelike 半回合制 + AP 行动点数系统（2026-07-15 重构）：
- 回合开始时计算可移动范围（BFS，考虑墙壁和怪物阻挡），浅蓝色呼吸闪烁标示
- WASD 在可移动范围内**即时移动本体**（非预览），消耗 M-AP
- ↑↓←→ **即时射击**（非预览），立即发射子弹，消耗 A-AP
- 首次射击触发 checkpoint：锁定位置 + 刷新可移动范围从当前位置重新计算
- 回合开始位置保留半透明幽灵作视觉参考（非操作体）
- Esc **全重置**本回合所有操作和结果（角色/怪物/环境回到回合开始时）
- Space 结束回合 → 切换怪物回合；有剩余 AP 时弹窗二次确认
- 操作键：WASD 移动、↑↓←→ 射击、Space 结束回合、Esc 全重置、C 生怪
- 透视像素风格渲染

### 1.3 玩家属性

| 属性 | 值 | 说明 |
|------|-----|------|
| 血量 HP | 6/6 | 可被攻击次数 / 上限 |
| 移速 | 3 | M-AP 上限 = 移速 → 默认 3 (下限1) |
| 射速 | 3 | A-AP 上限 = 射速 → 默认 3 (下限1) |
| 攻击力 | 3.5 | 每发子弹对怪物伤害 |
| 射程 | 6 | 子弹最远飞行距离（格） |
| 运气 | 0 | 影响掉落/暴击等（未实现） |

### 1.4 设计目标
- 探索将 Roguelike 回合制与 AP 行动点数预操作结合的可行性
- 用纯 Canvas 像素绘制快速验证核心玩法

### 1.5 怪物系统

**裂口尸** (C键或右上角按钮生成):

| 属性 | 值 |
|------|-----|
| HP | 10 |
| AI 回合1 | 向玩家移动 2 格 |
| AI 回合2 | 向玩家移动 1 格 |
| 移动方式 | 所有怪物同时逐步移动 (0.15s/步)，平滑动画插值 170px/s |
| 碰撞 | 怪物之间不可重叠；撞玩家 → 伤害1 + 击退(怪物移动方向) |
| 视觉 | 使用角色精灵+角色朝向，红色血条 (黑色底槽+百分比填充)，受击白闪+抖动 |
| 路径预览 | 红色粗箭头闪烁 (仅在玩家回合显示) |
| 伤害反馈 | 黄色飘字迸发 + 血条白色延迟扣除动画 + 血雾粒子 |
| 死亡 | 18颗血粒子爆浆特效 |

**玩家→怪物碰撞**: 玩家移动撞怪物 → 自身受伤1 + 击退怪物(移动方向)，失败则玩家反弹。
**无敌**: 受击后 3 回合闪烁无敌(透明)，可穿过怪物不受伤。

---

## 2. 系统设计

### 2.1 房间与网格

| 属性 | 值 |
|------|-----|
| 网格尺寸 | 13 列 × 7 行 |
| 每格大小 | 22 像素 |
| 墙壁厚度 | 16 像素 |
| 画布分辨率 | 318 × 186 (CSS 放大 3 倍 → 954 × 558) |
| 地板区域 | (16, 16) 到 (302, 170) 世界坐标 |

- 墙壁包围地板区域，玩家不可移出网格范围
- 墙壁用像素石头纹理绘制，带内缘高光线和阴影

### 2.2 AP 行动点数系统

**两种 AP 点数**：

| AP 类型 | 默认上限 | 来源 | 消耗方式 |
|---------|---------|------|---------|
| M-AP (移动) | 3 (= 移速) | 移速属性 | 每移动 1 格消耗 1 点，移动后在原位置留半透明幽灵 |
| A-AP (攻击) | 3 (= 射速) | 射速属性 | 每次射击消耗 1 点，即时发射子弹 |

- 每回合上限固定，可消耗任意点数（不强制用完）
- 回合结束 → AP 重置为满值
- **可移动范围**：通过 BFS 从当前位置计算，考虑墙壁/怪物阻挡，浅蓝色呼吸闪烁标示

### 2.3 即时操作与 Checkpoint 系统

**全新交互模型**（替代旧预览队列系统）：

- **移动**：WASD 在可移动范围内即时移动本体，M-AP-1，范围动态刷新
- **射击**：↑↓←→ 立即发射子弹，A-AP-1
- **射击 Checkpoint**：首次射击时保存位置（`checkpointPos`），之后可移动范围从当前位置重新计算
- **回合起始幽灵**：回合开始位置留 40% 透明度幽灵，作为视觉参考（非操作体）
- **Esc 全重置**：恢复完整回合快照（`turnSnapshot`），玩家/怪物/HP 全部回到回合开始时状态
- **回合快照**：`saveTurnSnapshot()` 保存玩家坐标/HP、怪物坐标/HP 等；`restoreTurnSnapshot()` 恢复
- **可移动范围计算**：`calcReachableTiles(fromCol, fromRow, maxSteps)` BFS，排除墙壁和怪物占据格

### 2.4 角色移动与精灵动画

- 玩家占据网格坐标 (col, row)，初始位置 (6, 3)
- 预操作阶段：本体不动，幽灵复制体(40%透明度)表示规划终点
- 执行阶段：按队列顺序播放移动动画（85 像素/秒），到达后触发下一行为
- **走路动画**：执行移动时播放精灵图集 10 帧走路循环（80ms/帧）
- 移动受限：网格边界外不可移动
- 朝向跟踪：记录最后移动/射击方向，决定精灵帧方向

### 2.5 角色精灵渲染

角色使用精灵图集 `issac-idle.png`（32×32 每帧）进行渲染，采用**头身分离**叠加方式，通过 `drawCharacterAt()` 统一绘制（本体和幽灵复制体共用）：

| 层级 | 内容 | 说明 |
|------|------|------|
| 底层 | 身体走路帧 | 正面 10 帧 / 侧面 10 帧，随移动循环播放 |
| 上层 | 头部 | 3 方向（正面/侧面/背面）× 2 状态（普通/射击），偏移 body 向上 30% |

- **方向映射**：↓=正面、↑=复用正面（背面缺失）、→=侧面、←=侧面水平翻转
- **射击表情**：按方向键射击时头部切换为射击表情，持续 0.4 秒后恢复普通表情
- 精灵未加载时降级为色块占位

### 2.6 子弹系统

| 属性 | 值 |
|------|-----|
| 最大飞行距离 | 6.0 格 (对应射程属性) |
| 飞行速度 | 280 像素/秒 |
| 提前下落距离 | 0.2 格 |
| 下落水平速度比例 | 7% |
| 下落重力加速度 | 550 像素/秒² |

- 执行阶段按队列中的射击行为发射子弹，从当前角色位置射出
- 射击方向选择阶段预览线从幽灵复制体位置出发
- 子弹三阶段：飞行（匀速）→ 下落（水平减速+垂直加速）→ 碎裂为粒子
- 碎裂粒子：10 个，持续 0.25 秒，溅射随机分布
- 子弹像素绘制：光晕（两层半透明方块）+ 发光核心 + 拖尾像素

### 2.5 透视投影

```
缩放因子 s(y) = VP_SCALE_TOP + t * (VP_SCALE_BOT - VP_SCALE_TOP)
其中 t = (y - FLOOR_T) / (FLOOR_B - FLOOR_T)，归一化到 [0, 1]
```

| 参数 | 值 | 说明 |
|------|-----|------|
| VP_SCALE_TOP | 0.90 | 画面上端（远处）缩放 |
| VP_SCALE_BOT | 1.00 | 画面下端（近处）缩放 |
| VP_CX | 159 | 透视中心 X 坐标 |

- 投影公式：`screenX = VP_CX + (worldX - VP_CX) * s`
- 角色、子弹、粒子的尺寸和位置都随 Y 坐标缩放
- 地板砖块绘制为透视梯形（近大远小）
- 网格线透视汇聚（竖线上方收缩向中心）

### 2.6 粒子系统

| 属性 | 值 |
|------|-----|
| 重力加速度 | 180 像素/秒² |
| 碎裂粒子数 | 10 个 |
| 持续时间 | 0.25 秒 |

- 子弹死亡时迸发粒子：随机角度、随机速度、两种颜色（金黄/橙）
- 粒子有生命周期，随时间淡出
- 带透视缩放

### 2.8 游戏状态机 (turnState.phase)

```
player_select ──→ monster_turn ──→ player_select
     │    ↑
     │    └── Esc (重置回合)
     └── Space (结束回合)
```

| 阶段 | 说明 |
|------|------|
| `player_select` | 即时操作：WASD移动本体、↑↓←→即时射击、Esc全重置、Space结束回合、C生怪 |
| `turn_end_confirm` | 弹窗确认结束回合（仅剩余AP时触发） |
| `monster_turn` | 怪物同时移动，碰撞检测，完成后重置AP |

- 无预操作队列，所有行为即时生效
- `hasShot` 标记首次射击（触发 checkpoint，`checkpointPos` 保存位置）
- Esc 全重置本回合 → `restoreTurnSnapshot()` 恢复回合开始时状态
- 0AP 时 Space 直接进入 `monster_turn`（无弹窗）

---

## 3. 界面与交互

### 3.1 操作方式

| 按键 | 阶段 | 功能 |
|------|------|------|
| W / A / S / D | 行为选择 | 在可移动范围(浅蓝呼吸)内即时移动本体 |
| ↑ / ↓ / ← / → | 行为选择 | 即时射击（按即发射），首次射击触发 checkpoint |
| 空格 | 行为选择 | 结束回合（有剩余 AP 时弹窗确认，无剩余直接进入怪物回合） |
| Esc | 行为选择 | 全重置本回合 → 恢复回合快照（角色/怪物/HP 全部回到回合开始时） |
| C | 行为选择 | 生成怪物 |

### 3.2 UI 面板

| 面板 | 内容 |
|------|------|
| HP | 当前血量/上限 (6/6) |
| A-AP | 剩余攻击点数/上限 (高亮橙色圆点) |
| M-AP | 剩余移动点数/上限 (高亮蓝色圆点) |
| 阶段 | 当前回合阶段文字 + 颜色标记 |
| 回合 | 当前回合编号 |
| 属性 | 攻击力3.5 射程6 运气0 |
| **状态栏** | 棋盘下方，显示 [自由]/[已锁定] + 当前 M-AP, A-AP 剩余/上限 |
| **可移动范围** | BFS 计算的浅蓝色呼吸闪烁方格 |
| **回合起始幽灵** | 40% 透明度角色，标示回合开始位置 |

---

## 4. 游戏流程（当前原型）

1. 页面加载 → 初始化画布、角色坐标
2. `resetTurnAP()` → 计算初始可移动范围 → 保存回合快照
3. 进入 `player_select` 阶段：
   - WASD 在浅蓝可移动范围内即时移动本体，每步 -1 M-AP，范围动态刷新
   - ↑↓←→ 即时射击，发射子弹，-1 A-AP，首次射击触发 checkpoint
   - Esc → 恢复回合快照（角色/怪物/HP 全部重置）
   - Space → 结束确认 → monster_turn（0AP 跳过确认）
4. `monster_turn` → 怪物同时移动 + 碰撞检测
5. 回合数+1，AP 重置 → 重新计算可移动范围 + 保存新快照 → 回到 `player_select`
6. 循环进行，无结束条件

---

# Part 2: 技术架构速查

## 1. 架构概览

```
单文件 HTML (isaac-turnbased-demo.html) ~2400 行
├── CSS: 像素风 UI (Press Start 2P 字体)
├── HTML: Canvas 游戏容器 + 状态栏 (#action-bar) + UI 面板
└── JavaScript
    ├── 渲染配置 & 精灵图集 (SPRITE)
    ├── 透视投影 & 坐标转换
    ├── 玩家属性 (playerStats: HP/移速/射速/攻击/射程/运气)
    ├── 运行时状态 (player pos/animation)
    ├── 回合状态 (turnState: phase/AP/hasShot/reachableTiles/turnNumber)
    ├── 快照系统 (saveTurnSnapshot, restoreTurnSnapshot — 支撑Esc全重置)
    ├── 可移动范围 (calcReachableTiles BFS, refreshReachableTiles)
    ├── AP 管理 (resetTurnAP)
    ├── 渲染系统 (drawWalls/Floor/Grid/ReachableOverlay/Ghost/Player/Bullets/Particles/Monsters)
    ├── 角色渲染 (drawCharacterAt — 本体和幽灵复用)
    ├── 移动系统 (startMove, updateMove)
    ├── 子弹系统 (spawnBullet, updateBullets, shatterBullet)
    ├── 粒子系统 (updateParticles)
    ├── 怪物系统 (calcAllMonsterPaths, startMonsterTurn, updateMonsterTurn)
    ├── UI 更新 (updateUI, updateActionBar)
    ├── 输入处理 (keydown — WASD移动/箭头射击/Esc重置/Space结束)
    └── 游戏循环 (gameLoop → requestAnimationFrame)
```

## 2. 渲染配置与常量

```javascript
GAME_W = 318, GAME_H = 186, DISPLAY_SCALE = 3
WALL = 16, CELL = 22, COLS = 13, ROWS = 7
BULLET_MAX_DIST = 6.0, BULLET_SPEED = 280
MOVE_SPEED = 70, EXEC_MOVE_SPEED = 85, GRAVITY = 180
SHATTER_PARTICLES = 10, SHATTER_DURATION = 0.25
GHOST_ALPHA = 0.4
VP_SCALE_TOP = 0.90, VP_SCALE_BOT = 1.00
```

## 3. SPRITE 精灵图集配置

```javascript
SPRITE = {
  FW: 32, FH: 32,                    // 每帧像素尺寸
  BASE_SIZE: 24,                     // 角色基础渲染尺寸 (游戏像素)
  ANIM_SPEED: 0.08,                  // 走路动画帧间隔 (秒)
  // HEAD: { down/right/left/up: { normal, shooting } }  6个头像帧, 第0行列0-5
  // WALK.down:  [[0,6],[0,7],[1,0]...[1,7]]  10帧正面走路
  // WALK.right: [[2,0],[2,1]...[3,1]]        10帧侧面走路
  // needsFlipX(dir): left 朝向时水平翻转侧面帧
  // getWalkDir(dir): ↑ 复用 ↓ (背面缺失), ← 复用 → (翻转)
}
```

## 4. 透视投影公式

```javascript
// vpScale(wy) → 返回透视缩放因子 s ∈ [0.90, 1.00]
function vpScale(wy) {
  const t = clamp((wy - FLOOR_T) / (FLOOR_B - FLOOR_T), 0, 1);
  return VP_S + t * (VP_E - VP_S);  // 0.90 + t * 0.10
}

// project(wx, wy) → { x, y, s }  屏幕坐标 + 缩放因子
function project(wx, wy) {
  const s = vpScale(wy);
  return { x: VP_CX + (wx - VP_CX) * s, y: wy, s };
}
```

## 5. 关键函数索引

| 函数 | 职责 |
|------|------|
| `resetTurnAP()` | 初始化回合 AP，计算可移动范围，保存回合快照 |
| `saveTurnSnapshot()` | 保存回合开始时完整快照（玩家/怪物状态） |
| `restoreTurnSnapshot()` | 恢复回合快照，重置所有状态到回合开始 |
| `calcReachableTiles(fromCol, fromRow, maxSteps)` | BFS 计算可移动方格集（排除墙壁和怪物） |
| `refreshReachableTiles()` | 从当前位置以剩余 M-AP 刷新可移动范围 |
| `drawCharacterAt(px,py,facing,walkFrame,shootTimer,alpha)` | 通用角色渲染（本体和幽灵复用），支持透明度 |
| `drawTurnStartGhost()` | 渲染 40% 透明度回合起始位置幽灵 |
| `drawReachableOverlay()` | 渲染浅蓝色呼吸闪烁可移动方格 |
| `drawWalls/Floor/GridHighlight/Bullets/Particles` | 各渲染子系统 |
| `startMove(dir)` / `updateMove(dt)` | 移动动画系统 |
| `spawnBullet(dir,fromPx,fromPy)` / `updateBullets(dt)` / `shatterBullet(b)` | 子弹生命周期 |
| `updateParticles(dt)` | 粒子物理+淡出 |
| `calcAllMonsterPaths()` / `startMonsterTurn()` / `updateMonsterTurn(dt)` | 怪物回合系统 |
| `updateActionBar()` | 更新底部状态栏（自由/锁定 + AP 剩余） |
| `updateUI()` | 更新所有 DOM UI 面板数据 |
| `gameLoop(timestamp)` | 主循环：移动动画→子弹→粒子→怪物回合→渲染 |

## 6. 数据流

```
回合开始 (player_select)
  resetTurnAP() → 计算可移动范围 → 保存快照

玩家操作:
  WASD → 检查 reachableTiles.has(key) → 移动本体(col/row/px/py) → M-AP-1 → refreshReachableTiles()
  ↑↓←→ → 即时 spawnBullet → A-AP-1 → 首次? 设 hasShot + checkpointPos + refreshReachableTiles()
  Esc  → restoreTurnSnapshot() → 重置 mAP/aAP/hasShot/checkpointPos → 重新计算范围 + 保存新快照
  Space → 有剩余AP? showEndTurnConfirm : 直接 enter monster_turn

怪物回合 (monster_turn)
  updateMonsterTurn(dt) → 同时逐步移动怪物 → 碰撞检测 → finishMonsterTurn → AP重置

渲染层序:
  gameLoop → render()
           → 墙壁 → 地板 → 网格高亮 → 可移动范围(浅蓝呼吸) → 怪物危险区
           → 怪物路径 → 子弹 → 粒子 → 怪物 → 起始幽灵(40%透明度) → 角色本体 → 飘字
```

## 7. 项目文件清单

### 根目录

| 文件 | 类型 | 说明 |
|------|------|------|
| `isaac-turnbased-demo.html` | HTML/JS | 游戏原型主文件（~2400行，浏览器直接运行） |
| `isaac-map-viewer.html` | HTML/JS | 房间模板编辑器（通过 server.js 读写 pool.json） |
| `sprite-debug.html` | HTML/JS | 精灵表调试工具（网格叠加查看帧坐标） |
| `walk-preview.html` | HTML/JS | 走路动画预览工具（循环播放各方向帧） |

### Assets/ (美术素材)

| 文件 | 类型 | 说明 |
|------|------|------|
| `issac-idle.png` | 图片 | 角色精灵图集（头+身体走路帧，32×32 每帧） |
| `issac-background.png` | 图片 | 备用地面背景图 |
| `UI-reference1.png` | 图片 | UI 参考图 |

### Configs/ (配置与服务)

| 文件 | 类型 | 说明 |
|------|------|------|
| `pool.json` | JSON | 关卡池数据文件（原 `isaac-room-pool.json`） |
| `server.js` | Node.js | 本地文件读写服务器（端口 8080） |
| `isaac-room-pool - original backup.json` | JSON | 原始关卡池备份 |

### Documents/ (文档)

| 文件 | 类型 | 说明 |
|------|------|------|
| `isaac-turnbase-context.md` | 文档 | 本文档：策划+技术架构速查 |
| `isaac-roommonster-plan.md` | 文档 | 多房间地图+怪物配置+掉落系统设计方案 |
| `isaac-asset-desc.md` | 文档 | 资源替换步骤指南 |
| `godot-setup-checklist.md` | 文档 | Godot 引擎安装与上手清单 |

---

## 最近更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-07-16 | **游戏集成多房间楼层系统 + Boss梯子 + 场景过渡**。①`isaac-turnbased-demo.html` 集成 TILE 网格系统（FLOOR/ROCK/POOP/PIT/SPIKE/LADDER 六种），`isWall()` 改为基于房间格子数据判断。②接入 `pool.json` 关卡池，启动时自动加载模板并生成 6 层地牢（移植地图编辑器的 `generateFloor()`）。③房间切换系统：走到门前格触发切换，带滑动过渡动画（根据方向左/右/上/下滑动 400px/s），新房间出现时 `resetTurnAP()` 刷新状态。④Boss 梯子格：B 键在 BOSS 房间当前格放置，视觉上深坑+梯子+▼箭头，踩上后自动进入下一层起始房间。⑤新增 `drawTiles()` 渲染六种瓷砖、`drawDoors()` 渲染绿色房门标记。⑥UI 新增楼层信息栏，帮助弹窗更新操作说明。同步更新设计文档。 |
| 2026-07-16 | **楼层生成规则强化 + 布局/门系统修复**。①房间类型约束：Boss 房和宝箱房强制度数=1（单门死路），图生成阶段保证至少 3 个叶节点（start/boss/treasure 各一）。②所有房间度数 ≤4（每方向最多一扇门），生成树构建时跳过已满节点，额外边也做度数上限检查，杜绝一门连多个房间。③布局强制相邻：连接房间必须 Manhattan 距离=1，采用随机顺序重试机制（最多 30 次）确保相邻放置可行；渲染层兜底 L 形线绝不画斜线。④门一致性校验：分配时检测方向覆盖冲突，分配后验证每个房间门数=边数。⑤`isaac-map-viewer.html` 新增 `CACHE_KEY` 机制：手动选择/同步文件后缓存到 localStorage，启动时优先读取，无需每次重新选文件。同步更新 `isaac-roommonster-plan.md` 设计文档。 |
| 2026-07-16 | **项目文件分类整理 + 编辑器保存机制重构**。项目文件按类型重组到子目录：`Assets/`（图片素材）、`Configs/`（pool.json 关卡池 + server.js 文件读写服务 + 原始备份）、`Documents/`（全部 md 文档）。清理冗余文件：删除失败的 server.py、cgi-bin/、err.log、out.log。`isaac-map-viewer.html` 编辑器保存机制改用 `<form>` POST + 隐藏 `<iframe>` 绕过 IDE 代理拦截，通过 `server.js` (Node.js) 实现可靠的 pool.json 文件读写。新增文件管理规则：不随意删除或重命名用户手动新增文件，操作前需经用户同意。 |
| 2026-07-15 | **房间框架实现：TILE 系统 + 12 种模板 + 地图编辑器**。定义 5 种 TILE 类型（FLOOR/ROCK/POOP/PIT/SPIKE）及行为属性表，确定门系统（每边正中一个门前格，不占格子）。设计 12 种 13×7 房间模板（含便便/尖刺），全部通过自动化 BFS 连通性验证（4门位在曼哈顿移动下全连通）。创建 `isaac-map-viewer.html` 独立编辑器：模板池管理（查看/编辑/复制/删除）、13×7 画布绘制（5色调色板+撤销）、6 种 Isaac 风格自动生成图案（角岩/十字/石墙/石柱/斜线/中柱）、双模式关卡池持久化（File System Access API 直读直写 + 文件选择器/下载回退）、`isaac-room-pool.json` 数据文件、楼层生成预览。更新 `isaac-roommonster-plan.md` 同步设计方案为已实现状态。 |
| 2026-07-15 | **核心交互重构：即时操作 + ESC 全重置**。彻底移除预操作队列系统（`actionQueue`/`player_shoot_dir`/`player_execute`），改为即时操作模型：WASD 在 BFS 可移动范围(浅蓝呼吸)内即时移动本体、↑↓←→ 即时射击发射子弹。新增回合快照系统 (`saveTurnSnapshot`/`restoreTurnSnapshot`) 支撑 Esc 全重置（角色/怪物/环境全部回到回合开始时）。射击后触发 checkpoint (`hasShot`/`checkpointPos`) 并刷新可移动范围。回合起始位置保留半透明幽灵作视觉参考。同步调整初始属性 (移速3→M-AP=3, 射速3→A-AP=3, 均系数1下限1)。更新上下文文档全部相关章节。 |
| 2026-07-14 | **多房间地图设计方案**：创建 `isaac-roommonster-plan.md`，包含楼层生成算法（随机图生成 + BFS 全连通检查，采用以撒模式无走廊）、房间类型分配（start/normal/treasure/shop/boss）、模板法内部布局、怪物配置表（MONSTER_DB 内联 JS 对象）、掉落系统（权重随机 + DROP_TABLES）、AI 行为类型枚举、道具被动能力提升。方案基于现有 13×7 单房间框架扩充为 Roguelike 多房间系统。 |
| 2026-07-13 | 集成精灵图集渲染：使用 `issac-idle.png`（32×32 每帧）替代程序化像素角色。实现头身分离叠加（头偏移 body 30%）、4 方向 × 10 帧走路动画、射击表情切换（0.4s 持续）。背面缺失方向暂复用正面帧。移动速度从 280 → 70 px/s 以适配动画播放。新增 `sprite-debug.html` 和 `walk-preview.html` 调试工具。更新文档各节编号，修正函数索引、数据流和文件清单。 |
| 2026-07-13 | 首次创建项目上下文文档（isaac-turnbase-context.md），记录 HTML Canvas 原型的技术架构、核心系统、关键函数索引与数据流。 |

---

> **下一步方向**：将 TILE 系统集成到主游戏 `isaac-turnbased-demo.html`（改造 isWall/bulletHitWall/BFS/怪物寻路感知障碍物），实现楼层生成 + 房间切换 + 模板对接。后续可迁移到 Godot 引擎。参考 `godot-setup-checklist.md` 中的实现思路。
