# 以撒·半回合制战斗 — 项目总览

> 文件: `Project-Issac-turnbase/isaac-turnbased-demo.html` | 单文件 ~820 行 | 状态: 原型可玩 + 精灵图集渲染 + Godot 迁移规划

---

# Part 1: 游戏策划文档

## 1. 游戏概述

### 1.1 游戏定位
**类型**: Roguelike 半回合制地牢战斗 | **原型平台**: 网页 Canvas | **目标平台**: Godot 引擎

### 1.2 核心概念
受《以撒的结合》启发，将传统 Roguelike 的"你动我才动"回合制机制与子弹时间射击结合：
- 玩家在网格化房间内移动和射击
- WASD 移动（每次 1 格），方向键向对应方向发射子弹
- 子弹有最大飞行距离，到达后碎裂成粒子
- 透视像素风格渲染（地板梯形、角色和子弹随 Y 坐标缩放）

### 1.3 设计目标
- 探索将 Roguelike 回合制与弹幕射击结合的可行性
- 用纯 Canvas 像素绘制快速验证核心玩法
- 最终迁移到 Godot 引擎实现完整游戏

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

### 2.2 角色移动与精灵动画

- 玩家占据一个网格坐标 (col, row)，初始位置 (6, 3)
- WASD 控制上下左右移动，每次移动 1 格
- 移动有平滑动画（70 像素/秒），动画期间锁定输入
- **走路动画**：移动时播放从精灵图集中提取的 10 帧走路动画循环（100ms/帧），到达目标后重置为站立帧
- 移动受限：网格边界外（墙壁）不可移动
- 朝向跟踪：记录玩家最后移动/射击方向（↑↓←→），决定使用的精灵帧方向

### 2.3 角色精灵渲染

角色使用精灵图集 `issac-idle.png`（32×32 每帧）进行渲染，采用**头身分离**叠加方式：

| 层级 | 内容 | 说明 |
|------|------|------|
| 底层 | 身体走路帧 | 正面 10 帧 / 侧面 10 帧，随移动循环播放 |
| 上层 | 头部 | 3 方向（正面/侧面/背面）× 2 状态（普通/射击），偏移 body 向上 30% |

- **方向映射**：↓=正面、↑=复用正面（背面缺失）、→=侧面、←=侧面水平翻转
- **射击表情**：按方向键射击时头部切换为射击表情，持续 0.4 秒后恢复普通表情
- 精灵未加载时降级为色块占位

### 2.4 子弹系统

| 属性 | 值 |
|------|-----|
| 最大飞行距离 | 3.0 格 |
| 飞行速度 | 280 像素/秒 |
| 提前下落距离 | 0.2 格（距离最大距离还剩 0.2 格时开始下落） |
| 下落水平速度比例 | 7% |
| 下落重力加速度 | 550 像素/秒² |

- 方向键 ↑↓←→ 发射子弹，同时更新角色朝向
- 子弹飞行阶段：匀速直线飞行
- 下落阶段：到达衰减距离后水平速度骤降、垂直加速下落
- 死亡阶段：撞墙 / 到达最大距离 / 落地 → 碎裂为粒子
- 碎裂粒子：10 个，持续 0.25 秒，溅射状随机分布，有重力
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

### 2.7 游戏状态机

```
idle → (按 WASD) → moving → (到达目标) → idle
idle → (按方向键) → shooting → (所有子弹+粒子消失) → idle
```

- `idle`: 等待玩家输入
- `moving`: 角色移动动画中，锁定输入
- `shooting`: 子弹/粒子飞行中，锁定输入

---

## 3. 界面与交互

### 3.1 操作方式

| 按键 | 功能 |
|------|------|
| W / A / S / D | 上下左右移动 1 格 |
| ↑ / ↓ / ← / → | 向对应方向发射子弹 |

### 3.2 UI 面板

| 面板 | 内容 |
|------|------|
| 面朝方向 | 显示当前角色朝向箭头符号 |
| 网格坐标 | 显示当前 (col, row) 坐标 |
| 已发射子弹 | 累计发射子弹计数 |
| 按键提示 | WASD 移动 / 方向键 射击 |

---

## 4. 游戏流程（当前原型）

1. 页面加载 → 初始化画布、角色坐标
2. 进入 `idle` 状态，等待键盘输入
3. 玩家按 WASD → 角色移动 1 格（附带动画）
4. 玩家按方向键 → 发射子弹（直线飞行→下落→碎裂）
5. 子弹/粒子全部消失 → 回到 idle，可继续操作
6. 循环进行，无结束条件（当前为纯移动+射击原型）

---

# Part 2: 技术架构速查

## 1. 架构概览

```
单文件 HTML (isaac-turnbased-demo.html)
├── CSS: 像素风 UI 样式 (Press Start 2P 字体)
├── HTML: 游戏容器 (Canvas) + UI 面板 (DOM)
└── JavaScript (~650 行)
    ├── 渲染配置 (GAME_W, GAME_H, DISPLAY_SCALE)
    ├── SPRITE 精灵图集对象 (加载、帧映射、方向/翻转映射)
    ├── CFG 常量定义
    ├── 透视投影 (vpScale, project)
    ├── 坐标转换 (gridToPixel, pixelToGrid, isWall)
    ├── 像素绘制辅助 (pset, prect)
    ├── 游戏状态 (player, gamePhase, bullets, particles)
    ├── 移动系统 (startMove, updateMove)
    ├── 子弹系统 (spawnBullet, updateBullets, shatterBullet)
    ├── 粒子系统 (updateParticles)
    ├── 渲染系统 (drawWalls, drawFloor, drawGridHighlight, drawPlayer, drawBullets, drawParticles)
    ├── UI 更新 (updateUI)
    ├── 输入处理 (keydown 事件)
    └── 游戏循环 (gameLoop → requestAnimationFrame)
```

## 2. 渲染配置与常量

```javascript
GAME_W = 318, GAME_H = 186, DISPLAY_SCALE = 3
WALL = 16, CELL = 22, COLS = 13, ROWS = 7
BULLET_MAX_DIST = 3.0, BULLET_SPEED = 280
MOVE_SPEED = 70, GRAVITY = 180
SHATTER_PARTICLES = 10, SHATTER_DURATION = 0.25
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

| 函数 | 行 | 职责 |
|------|-----|------|
| `vpScale(wy)` | 189 | 根据世界 Y 坐标计算透视缩放因子 |
| `project(wx, wy)` | 195 | 世界坐标 → 屏幕坐标透视投影 |
| `gridToPixel(col, row)` | 228 | 网格坐标 → 世界像素坐标（格子中心） |
| `pixelToGrid(px, py)` | 235 | 世界像素坐标 → 最近的网格坐标 |
| `isWall(col, row)` | 242 | 判断网格坐标是否在墙壁外 |
| `bulletHitWall(bx, by)` | 246 | 判断子弹世界坐标是否撞墙 |
| `pset(x, y, c)` | 253 | 绘制 1 像素点 |
| `prect(x, y, w, h, c)` | 258 | 绘制像素矩形 |
| `startMove(dir)` | 264 | 开始向 dir 方向移动 1 格 |
| `updateMove(dt)` | 280 | 每帧更新移动动画，到达目标后切回 idle |
| `spawnBullet(dir)` | 300 | 向 dir 方向发射一枚子弹 |
| `updateBullets(dt)` | 321 | 每帧更新所有子弹状态 |
| `shatterBullet(b)` | 362 | 子弹碎裂，生成粒子 |
| `updateParticles(dt)` | 381 | 每帧更新粒子（物理+生命周期） |
| `drawWalls()` | 398 | 渲染墙壁石头纹理 |
| `drawFloor()` | 465 | 渲染透视梯形地板砖块 |
| `drawGridHighlight()` | 553 | 渲染玩家所在格子的高亮框 |
| `drawPlayer()` | - | 精灵图集角色渲染（身体走路帧 → 头部叠加 → 方向三角），支持头身分离和射击表情切换 |
| `drawBullets()` | 672 | 像素风子弹绘制（光晕+核心+拖尾） |
| `drawParticles()` | 705 | 像素风粒子绘制（随生命淡出） |
| `render()` | 726 | 主渲染入口（按图层顺序调用） |
| `updateUI()` | 737 | 更新 DOM UI 面板数据 |
| `gameLoop(timestamp)` | 763 | 游戏主循环（dt 计算 + update + render） |

## 6. 数据流

```
键盘输入 (keydown)
  → 如 idle: startMove(dir) 或 spawnBullet(dir)
  → spawnBullet: 设置 player.shootTimer = 0.4 (射击表情)
  → 更新 player 状态 / 推入 bullets[]

gameLoop (每帧)
  → player.shootTimer -= dt (射击表情倒计时)
  → updateMove(dt) → 更新 player.px/py + 推进 walkFrame/animTime → 到达后切回 idle
  → updateBullets(dt) → 飞行/下落/撞墙 → shatterBullet → 生成 particles[]
  → updateParticles(dt) → 粒子运动+淡出 → 全消失且无子弹 → 切回 idle
  → render() → 按层序: 墙壁 → 地板 → 高亮 → 子弹 → 粒子 → 角色
```

## 7. 项目文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `isaac-turnbased-demo.html` | HTML/JS | 游戏原型主文件（浏览器直接打开即可运行） |
| `issac-idle.png` | 图片 | 角色精灵图集（头+身体走路帧，32×32 每帧） |
| `issac-background.png` | 图片 | 备用地面背景图 |
| `sprite-debug.html` | HTML/JS | 精灵表调试工具（网格叠加查看帧坐标） |
| `walk-preview.html` | HTML/JS | 走路动画预览工具（循环播放各方向帧） |
| `isaac-turnbase-context.md` | 文档 | 本文档：策划+技术架构速查 |
| `isaac-asset-desc.md` | 文档 | 资源替换步骤指南 |
| `godot-setup-checklist.md` | 文档 | Godot 引擎安装与上手清单 |

---

## 最近更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-07-13 | 集成精灵图集渲染：使用 `issac-idle.png`（32×32 每帧）替代程序化像素角色。实现头身分离叠加（头偏移 body 30%）、4 方向 × 10 帧走路动画、射击表情切换（0.4s 持续）。背面缺失方向暂复用正面帧。移动速度从 280 → 70 px/s 以适配动画播放。新增 `sprite-debug.html` 和 `walk-preview.html` 调试工具。更新文档各节编号（新增 2.3 角色精灵渲染、Part 2 第 3 节 SPRITE 配置），修正函数索引、数据流和文件清单。 |
| 2026-07-13 | 首次创建项目上下文文档（isaac-turnbase-context.md），记录 HTML Canvas 原型的技术架构、核心系统（移动/子弹/透视/粒子）、关键函数索引与数据流。同步纳入已有的资产替换指南和 Godot 搭建清单。 |

---

> **下一步方向**：在 Godot 中重建半回合制核心循环（行动点数 → 玩家回合 → 敌人行动 → 回归玩家），迁移房间网格、子弹系统和透视渲染。参考 `godot-setup-checklist.md` 中的实现思路。
