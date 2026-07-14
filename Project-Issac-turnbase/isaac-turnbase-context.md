# 以撒·半回合制战斗 — 项目总览

> 文件: `Project-Issac-turnbase/isaac-turnbased-demo.html` | 单文件 ~2400 行 | 状态: 完整回合制 + 怪物AI + 碰撞击退 + 预览系统

---

# Part 1: 游戏策划文档

## 1. 游戏概述

### 1.1 游戏定位
**类型**: Roguelike 半回合制地牢战斗 | **原型平台**: 网页 Canvas | **目标平台**: Godot 引擎

### 1.2 核心概念
受《以撒的结合》启发，Roguelike 回合制 + AP 行动点数系统：
- 玩家通过消耗 M-AP/A-AP 在预览模式下规划移动和射击
- 所有操作为预览（幽灵复制体、半透明弹道），Esc 倒序撤销返还 AP
- 按 Space 统一执行队列中所有行为（按顺序播放动画）
- 射击方向：↑↓←→ 进入方向选择，再按 ↑↓←→ 切换方向，Space 确认
- 操作键：WASD 移动预览、Space 确认、Esc 撤销、C 生怪
- 0 AP 时 Space 自动结束回合（无弹窗）；有剩余 AP 提前结束则弹窗二次确认
- 透视像素风格渲染

### 1.3 玩家属性

| 属性 | 值 | 说明 |
|------|-----|------|
| 血量 HP | 6/6 | 可被攻击次数 / 上限 |
| 移速 | 1 | M-AP 上限 = 移速 × 2 → 默认 2 |
| 射速 | 2 | A-AP 上限 = 射速 → 默认 2 |
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
| M-AP (移动) | 2 (= 移速 × 2) | 移速属性 | 每移动 1 格消耗 1 点 |
| A-AP (攻击) | 2 (= 射速) | 射速属性 | 每次射击消耗 1 点 |

- 每回合上限固定，可消耗任意点数（不强制用完）
- 回合结束 → AP 重置为满值
- 智能 M-AP 管理：自由移动区（无 checkpoint）内，按相反方向自动撤销移动并返还 M-AP

### 2.3 预操作与行为队列

**行为队列** (`actionQueue`)：玩家先规划行为序列，空格确认后按序执行。

- **移动预操作**：按 WASD → M-AP-1 → 幽灵复制体(40%透明度)移动 → 地面橙色粗箭头指引
- **射击预操作**：按 J 进入方向选择 → WASD 选方向 → K 确认 → A-AP-1
- **射击 checkpoint**：确认射击时锁定之前所有移动行为，之后的移动只能在 checkpoint 后自由撤销
- **L 键撤销**：从队列末尾逐层删除行为，退还 AP
- **空格执行**：按队列顺序依次执行移动动画 → 射击动画 → 子弹飞行/碎裂

**幽灵复制体**：`calcGhostPos()` 遍历所有队列移动，计算最终位置，40%透明度绘制。

**地面箭头**：`calcMoveArrows()` 生成相邻移动间的橙黄色粗箭头（40%透明度），带三角箭头尖端。

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
player_select ←── player_shoot_dir
     │  ↑              │
     │ Space          Space/↑↓←→
     ↓  │              ↓
player_execute ──→ monster_turn ──→ player_select
```

| 阶段 | 说明 |
|------|------|
| `player_select` | 预览模式：WASD移动、↑↓←→进入射击、Esc撤销、Space确认队列、C生怪 |
| `player_shoot_dir` | 射击方向选择：↑↓←→改方向、Space确认入队、Esc取消 |
| `player_execute` | 执行阶段：按队列顺序执行移动动画→射击→子弹特效 |
| `turn_end_confirm` | 弹窗确认结束回合（仅剩余AP时触发） |
| `monster_turn` | 怪物同时移动，碰撞检测，完成后重置AP |

- 所有预览操作累积在 `actionQueue`，AP 预扣除
- 0AP 时执行完毕自动进入 `monster_turn`（无弹窗）

---

## 3. 界面与交互

### 3.1 操作方式

| 按键 | 阶段 | 功能 |
|------|------|------|
| W / A / S / D | 行为选择 | 预移动 1 格（自由移动区可自动抵消折返） |
| J | 行为选择 | 进入射击方向选择模式 |
| K | 射击方向选择 | 确认射击，消耗 A-AP，锁定 checkpoint |
| L | 行为选择/方向选择 | 撤销最后一个行为 / 取消射击选择 |
| 空格 | 行为选择 | 按队列顺序执行所有行为 |

### 3.2 UI 面板

| 面板 | 内容 |
|------|------|
| HP | 当前血量/上限 (6/6) |
| A-AP | 剩余攻击点数/上限 (高亮黄色) |
| M-AP | 剩余移动点数/上限 (高亮黄色) |
| 阶段 | 当前回合阶段文字 + 颜色标记 |
| 回合 | 当前回合编号 |
| 按键提示 | WASD/J/K/L/空格 操作说明 |
| 属性 | 攻击力3.5 射程6 运气0 |
| **行为序列栏** | 棋盘下方，左→右排列行为块（↑←↓→=移动 / ⊕↑=射击），含 checkpoint 标记 |

---

## 4. 游戏流程（当前原型）

1. 页面加载 → 初始化画布、角色坐标，重置 AP
2. 进入 `player_select` 阶段，玩家用 WASD/J/K/L 规划行为序列
3. 幽灵复制体和地面箭头实时预览移动结果
4. 行为块在棋盘下方从左到右排列显示
5. 按空格 → 进入 `player_execute`，按队列顺序播放动画
6. 全部执行完毕 → `monster_turn` (占位 600ms)
7. 回合数+1，AP 重置 → 回到 `player_select`
8. 循环进行，无结束条件

---

# Part 2: 技术架构速查

## 1. 架构概览

```
单文件 HTML (isaac-turnbased-demo.html) ~1100 行
├── CSS: 像素风 UI + 行为块样式 (Press Start 2P 字体)
├── HTML: Canvas 游戏容器 + 行为序列栏 (#action-bar) + UI 面板
└── JavaScript
    ├── 渲染配置 & 精灵图集 (SPRITE)
    ├── 透视投影 & 坐标转换
    ├── 玩家属性 (playerStats: HP/移速/射速/攻击/射程/运气)
    ├── 运行时状态 (player pos/animation)
    ├── 回合状态 (turnState: phase/AP/actionQueue/lastCheckpointIndex/execIndex)
    ├── AP 管理 (resetTurnAP, calcGhostPos, calcMoveArrows)
    ├── 渲染系统 (drawWalls/Floor/GridHighlight/MoveArrows/ShootPreview/Ghost/Player/Bullets/Particles)
    ├── 角色渲染 (drawCharacterAt — 本体和幽灵复用)
    ├── 移动系统 (startMove, updateMove)
    ├── 子弹系统 (spawnBullet, updateBullets, shatterBullet)
    ├── 粒子系统 (updateParticles)
    ├── 行为队列执行 (isExecIdle, startExecuteQueue, executeNextAction)
    ├── 回合管理 (endPlayerTurn)
    ├── UI 更新 (updateUI, updateActionBar)
    ├── 输入处理 (keydown — 智能M-AP/checkpoint/撤销)
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
| `resetTurnAP()` | 初始化回合 AP (maxMAP/maxAAP)，清空队列和 checkpoint |
| `calcGhostPos()` | 遍历 actionQueue 中的移动，计算幽灵最终网格位置 |
| `calcMoveArrows()` | 生成所有移动步骤的起止坐标对，用于地面箭头渲染 |
| `drawCharacterAt(px,py,facing,walkFrame,shootTimer,alpha)` | 通用角色渲染（本体和幽灵复用），支持透明度 |
| `drawGhost()` | 渲染 40% 透明度幽灵复制体和坐标标签 |
| `drawMoveArrows()` | 渲染地面橙黄色粗箭头路径指引（40% 透明度） |
| `drawShootPreview()` | 射击方向选择阶段的红色虚线预览（从幽灵位置出发） |
| `drawWalls/Floor/GridHighlight/Bullets/Particles` | 各渲染子系统 |
| `startMove(dir)` / `updateMove(dt)` | 执行阶段移动动画 |
| `spawnBullet(dir,fromPx,fromPy)` / `updateBullets(dt)` / `shatterBullet(b)` | 子弹生命周期 |
| `updateParticles(dt)` | 粒子物理+淡出 |
| `isExecIdle()` | 检查执行阶段是否空闲（无子弹/粒子/移动动画） |
| `startExecuteQueue()` | 开始按队列顺序执行行为 |
| `executeNextAction()` | 消费队列中下一个行为（移动/射击） |
| `endPlayerTurn()` | 切换怪物回合，延迟后重置 AP |
| `undoLastAction()` | L 键撤销最后一个行为，处理 checkpoint 回溯 |
| `updateActionBar()` | 重建 DOM 行为块序列（↑←↓→ / ⊕↑等） |
| `updateUI()` | 更新所有 DOM UI 面板数据 |
| `gameLoop(timestamp)` | 主循环：移动动画→子弹→粒子→执行调度→渲染 |

## 6. 数据流

```
玩家回合开始 (player_select)
  键盘输入 → WASD: actionQueue.push(move) + M-AP-1 + 智能折返检测
           → J: 进入 player_shoot_dir → K: actionQueue.push(shoot) + A-AP-1 + 设checkpoint
           → L: undoLastAction → actionQueue.pop + AP++
           → 空格: startExecuteQueue → player_execute

执行阶段 (player_execute)
  gameLoop → if isExecIdle(): executeNextAction()
           → move: 设置 targetPx/targetPy → updateMove 动画
           →    动画完成 → execIndex++
           → shoot: spawnBullet → execIndex++
           →    子弹飞行/碎裂/粒子消亡 → isExecIdle()=true → 下一行为
           → execIndex >= queue.length → endPlayerTurn

渲染层序:
  gameLoop → render()
           → 墙壁 → 地板 → 网格高亮 → 移动箭头 → 射击预览线
           → 子弹 → 粒子 → 幽灵(40%透明度) → 角色本体
```

## 7. 项目文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `isaac-turnbased-demo.html` | HTML/JS | 游戏原型主文件（~2400行，浏览器直接运行） |
| `issac-idle.png` | 图片 | 角色精灵图集（头+身体走路帧，32×32 每帧） |
| `issac-background.png` | 图片 | 备用地面背景图 |
| `sprite-debug.html` | HTML/JS | 精灵表调试工具（网格叠加查看帧坐标） |
| `walk-preview.html` | HTML/JS | 走路动画预览工具（循环播放各方向帧） |
| `isaac-turnbase-context.md` | 文档 | 本文档：策划+技术架构速查 |
| `isaac-asset-desc.md` | 文档 | 资源替换步骤指南 |
| `godot-setup-checklist.md` | 文档 | Godot 引擎安装与上手清单 |
| `isaac-roommonster-plan.md` | 文档 | 多房间地图+怪物配置+掉落系统设计方案 |

---

## 最近更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-07-14 | **多房间地图设计方案**：创建 `isaac-roommonster-plan.md`，包含楼层生成算法（随机图生成 + BFS 全连通检查，采用以撒模式无走廊）、房间类型分配（start/normal/treasure/shop/boss）、模板法内部布局、怪物配置表（MONSTER_DB 内联 JS 对象）、掉落系统（权重随机 + DROP_TABLES）、AI 行为类型枚举、道具被动能力提升。方案基于现有 13×7 单房间框架扩充为 Roguelike 多房间系统。 |
| 2026-07-13 | 集成精灵图集渲染：使用 `issac-idle.png`（32×32 每帧）替代程序化像素角色。实现头身分离叠加（头偏移 body 30%）、4 方向 × 10 帧走路动画、射击表情切换（0.4s 持续）。背面缺失方向暂复用正面帧。移动速度从 280 → 70 px/s 以适配动画播放。新增 `sprite-debug.html` 和 `walk-preview.html` 调试工具。更新文档各节编号，修正函数索引、数据流和文件清单。 |
| 2026-07-13 | 首次创建项目上下文文档（isaac-turnbase-context.md），记录 HTML Canvas 原型的技术架构、核心系统、关键函数索引与数据流。 |

---

> **下一步方向**：实现怪物 AI 回合逻辑（移动/攻击/索敌），完善伤害计算系统（攻击力×子弹命中），添加道具系统和关卡生成。后续可迁移到 Godot 引擎。参考 `godot-setup-checklist.md` 中的实现思路。
