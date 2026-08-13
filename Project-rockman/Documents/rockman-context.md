# Rockman X4 操作原型 - 策划文档 & 技术速查

> 最后更新: 2026-08-13 (会话 #6)

---

## Part 1: 游戏策划文档

### 1. 项目概述

Rockman X4 风格操作原型，聚焦于 X（艾克斯）的核心移动和射击机制验证。单文件 HTML Canvas 实现，无需外部依赖。

### 2. 操作键位

| 按键 | 功能 |
|------|------|
| `A` / `D` | 左右移动 |
| `K` | 跳跃 / 墙跳 |
| `J` | 射击 + 蓄力（合并） |
| `L` | Dash（冲刺） |
| `空格` | 重置角色 |
| `E` | 切换编辑模式（游玩 ↔ 编辑） |
| `Ctrl+S` | 编辑模式下导出关卡 JSON |
| 鼠标左键（编辑模式） | 砖块/敌人：放置（长按快速连续放置）；玩家出生点：拖动移动 |
| 鼠标右键（编辑模式） | 删除砖块/敌人（长按快速连续删除） |
| 鼠标中键拖动（编辑模式） | 自由平移摄像机查看关卡 |
| 鼠标滚轮（编辑模式） | 缩放视口（0.2x ~ 4.0x） |

### 3. 核心机制

#### 3.1 J 键：射击 + 三区间蓄力

| 区间 | 时长 | 行为 |
|------|------|------|
| 按下瞬间 | 0 | 发射普通子弹 |
| 0~0.1s | 6 帧 | 松手不发射蓄力弹 |
| 0.1~1s | 6~60 帧 | 松手发射小型蓄力炮 |
| 1s+ | 60 帧 | 蓄力满，松手发射大型蓄力炮 |

- 蓄力期间可自由移动和跳跃
- 贴墙滑落时射击方向为远离墙的方向

#### 3.2 Dash 机制

**触发**：地面 + 按 L（仅地面可用，空中不能 Dash）

**阶段 1：冲刺阶段**（`isDashing = true`）
- 以 1.5 倍速度朝面朝方向冲刺
- 最大距离 = 4 Tile = 128px，持续时间 ≈ 21 帧
- 中止条件：到达最大距离 / 松 L 且不按前进方向键 / 按反方向键 / 撞墙
- 冲刺阶段中起跳 → 获得空中 Dash 资格
- Dash 消费 L 键，同一次按住只能触发一次 Dash

**阶段 2：Dash 就绪状态**（`dashReady = true`）
- 冲刺结束后 L 还按着时进入
- 不影响移动速度（走普通速度）
- 此状态下起跳 → 获得空中 Dash 资格
- 松 L → 退出就绪状态

**空中 Dash 资格**（`dashAirborne = true`）
- 从 Dash 触发起跳开始，松 L 也保持
- 输入方向键 → 1.5 倍速移动；不按 → 静止
- 有残影效果
- 落地或贴墙 → 清除资格

**Dash 权限刷新**：落地即刷新（无冷却时间），L 键消费落地时也需松手再按

**残影系统**：冲刺阶段 + 空中 Dash 资格期间，每 3 帧记录一次位置，产生多个渐隐残影（生命周期 12 帧）

#### 3.3 跳跃 & 墙跳

- K 键按住只触发一次跳跃（消费机制）
- 地面跳跃：普通速度起跳
- 贴墙 + K = 墙跳，弹向反方向
- 墙跳后 0.1s（6 帧）方向锁定：强制向反方向移动，忽略玩家输入
- 按住 L 时墙跳 → 获得空中 Dash 资格 + 加速墙跳速度

#### 3.4 贴墙滑落

- 必须按住面向墙的方向键（左墙按 A，右墙按 D）
- 松手 → 自由下落，不减速
- 贴墙滑落时射击方向为远离墙的反方向

#### 3.5 射击方向

- 正常状态：朝面朝方向射击
- 贴墙滑落时：朝远离墙的方向射击（例：左墙贴滑 → 向右射击）

#### 3.6 角色动画系统

角色已从 `fillRect` 占位美术替换为序列帧精灵动画（9 个动画状态）：

| 动画 key | 资源前缀 | 帧数 |
|---------|---------|------|
| `stand` | idle-stand | 4 |
| `shoot` | idle-shoot | 2 |
| `running` | idle-running | 10 |
| `jump` | idle-jump | 7 |
| `dash` | idle-dash | 2 |
| `climb` | idle-climb | 3 |
| `runShoot` | idle-running&shoot | 10 |
| `jumpShoot` | idle-jump&shoot | 7 |
| `dashShoot` | idle-dash&shoot | 2 |

**动画选择规则**（`playerAnimKey`）：
- 冲刺阶段 → `dash`/`dashShoot`
- 空中（含落地收尾期间）→ 贴墙为 `climb`，否则 `jump`/`jumpShoot`
- 地面移动 → `running`/`runShoot`
- 站立 → `stand`/`shoot`

**帧对应机制**：同帧数的成对动画（`jump`↔`jumpShoot` 各 7 帧、`running`↔`runShoot` 各 10 帧）切换时保留当前帧索引，保证逐帧一一对应（如跳跃播到第 3 帧按下射击键，jumpShoot 从第 4 帧继续）。

**跳跃三段式播放**：跳跃动画分三段——起跳先播前 4 帧（索引 0~3）→ 空中定格在第 4 帧（索引 3）→ 落地瞬间播尾段（索引 4~6）后切回站立。跳跃射击同理。

**射击缓冲**：松开射击键后，射击类动画（`shoot`/`runShoot`/`jumpShoot`/`dashShoot`）保留 0.25 秒再切回对应非射击动画。

**镜像规则**：普通动画资源默认面向右（`facing>0` 不翻，`facing<0` 翻）；`climb` 资源默认面向左（`facing>0` 翻，`facing<0` 不翻）。

**播放速度**：所有动画帧时长除以 1.5，即播放速度 1.5 倍。

### 4. 玩家属性

| 属性 | 值 | 说明 |
|------|-----|------|
| 尺寸 | 28×80 | 宽×高（高度为原始 40px 的 2 倍） |
| 移速 | 4.0 px/帧 | 普通移动速度 |
| 跳跃力 | -12.0 | 初始向上速度 |
| 重力 | 0.55 | 每帧加速度 |
| 最大下落速度 | 12 | |
| Dash 倍率 | 1.5× | Dash 速度 = 6.0 |
| Dash 距离 | 128px | 4 Tile |
| 子弹速度 | 14.0 | |
| 墙滑速度 | 1.5 | 贴墙滑落速度上限 |
| 墙跳 X | 5.5 | |
| 墙跳 Y | -10.0 | |

### 5. 关卡配置

- Tile 大小：32×32
- 关卡尺寸：100×16 Tile（3200×512），支持动态扩展（编辑模式下在边界外放置砖块自动扩大地图）
- 数据格式：一维数组，1=砖块 0=空
- 关卡分 4 个区域：起始峡谷(col 1~24) → 瀑布攀爬(col 25~49) → 中层丛林(col 50~74) → Boss巢穴(col 75~99)
- 外部配置文件：`level.json`（含 `playerSpawn`、tiles 规则描述 + enemies 列表），支持 fetch 加载；内联 `DEFAULT_LEVEL` 作为 fallback
- 玩家出生点：`playerSpawn: { x, y }` 可配置，编辑器支持自由拖动设置（像素级，不受 tile 网格约束），退出编辑模式时自动验证不与地形/敌人重合
- 摄像机：支持水平+垂直居中跟随，边界限制（走到地图边缘时镜头停止）

---

## Part 2: 技术架构速查

### 6. 文件清单

| 文件 | 说明 |
|------|------|
| `prototype.html` | 主文件，包含全部代码（游玩+编辑模式） |
| `preview.html` | 序列帧预览工具（Spritesheet 切分验证 + 动画预览） |
| `level.json` | 关卡配置文件（tiles 规则 + 敌人列表） |
| `Assets/` | 素材目录（角色序列帧 PNG + 子弹素材 + 预览用 GIF） |
| `Assets/sprite-cutter.html` | 序列帧切割工具（绿幕去除 + 框选 + 分割线 + 导出等宽条带/JSON） |
| `Assets/sprite-build.js` | 本地序列帧生成脚本（读取参数 JSON，零依赖生成 clean/strip/frames 产物） |
| `Assets/Assets-Clean/` | 切割产物目录（去绿幕后条带 PNG + 每帧坐标 JSON） |
| `Assets/Assets-Clean/idle-*.json` | 角色 9 个动画的每帧坐标元数据（stand/shoot/running/jump/dash/climb/runShoot/jumpShoot/dashShoot） |
| `Assets/Assets-Clean/idle-*_strip.png` | 角色 9 个动画的等宽条带 PNG |
| `Assets/Assets-Clean/*-bullet-*.json/png` | 子弹（small/middle/big）的 flying/hit/out 三态序列帧 |

### 7. 核心数据结构

#### 玩家状态

```javascript
player = {
  x, y, vx, vy, w, h,          // 位置/速度/尺寸
  facing: 1|-1,                 // 面朝方向
  grounded: bool,               // 是否在地面
  onWall: 0|-1|1,              // 贴墙状态
  wallSlide: bool,              // 是否贴墙滑落中
  isDash: bool,                 // Dash 阶段1
  dashT: int,                   // 冲刺剩余帧数
  dashDir: 1|-1,                // 冲刺方向
  dashReady: bool,              // Dash 阶段2 就绪状态
  dashAir: bool,                // 空中 Dash 资格
  chgT: int,                    // 蓄力帧数
  isChg: bool,                  // 是否蓄力中
  shootHold: int,               // 射击结束后保留射击动画的剩余帧数（0.25s = 15 帧）
  wjLock: int,                  // 墙跳方向锁定剩余帧
  kCon: bool,                   // K 键消费标记
  lCon: bool,                   // L 键消费标记
  invT: int,                    // 受伤无敌帧
  hp: int,                      // 血量
  landing: bool,                // 落地收尾阶段标记（跳跃动画播尾段）
  animF: int,                   // 当前动画帧索引
  animT: int,                   // 当前帧内计时器
  animKey: string,              // 当前动画 key（见 PLAYER_ANIMS）
}
```

#### 全局列表

- `bullets[]` — 玩家子弹列表
- `eBullets[]` — 敌人子弹列表
- `particles[]` — 粒子效果列表
- `afterimages[]` — Dash 残影列表
- `enemies[]` — 怪物列表
- `map[]` — 关卡 tile 数据（一维数组，`let` 可动态替换）

#### 子弹对象

```javascript
bullet = {
  x, y, vx, vy,          // 位置/速度
  dir: 1|-1,             // 面朝方向（用于 sprite 镜像）
  w, h,                  // 碰撞体积（power 0/1/2 = 18×12 / 54×36 / 90×60）
  power: 0|1|2,          // 子弹等级（普通/小蓄力/满蓄力）
  dmg, life,             // 伤害 / 存活帧数
  color,                 // 纯色 fallback 颜色
  animT,                 // sprite 动画计时器
}
```

#### 子弹 Sprite 资源

```javascript
BULLET_SPRITE = {
  src: 'Assets/Assets-Clean/middle-bullet-flying_strip (1).png',
  frames: 5,             // 帧数
  frameW: 40, frameH: 19, // 单帧尺寸（等宽条带）
  fps: 10,               // 动画帧率
  displayW: 54, displayH: 36, // 显示尺寸（匹配 power=1 碰撞体积）
  img, loaded,           // Image 对象 / 加载状态
}
```

- 小蓄力子弹（power=1）用 sprite 动画渲染（5 帧循环），替换原纯色矩形
- 显示尺寸 54×36 匹配碰撞体积；`dir < 0` 时水平镜像
- 图片未加载完成时回退到原纯色矩形绘制

#### 角色 Sprite 资源

```javascript
PLAYER_ANIMS = {           // 动画 key → 资源文件前缀
  stand: 'idle-stand', shoot: 'idle-shoot',
  running: 'idle-running', jump: 'idle-jump',
  dash: 'idle-dash', climb: 'idle-climb',
  runShoot: 'idle-running&shoot', jumpShoot: 'idle-jump&shoot',
  dashShoot: 'idle-dash&shoot',
}
PLAYER_SPRITES = {}        // key -> { img, frames: [{x,y,w,h}], fps, loaded }
PLAYER_TARGET_H = 80       // 站立时精灵显示高度（对齐碰撞盒 PH）
```

- `loadPlayerSprites()` 在启动时 fetch 各动画的 `_frames.json` 与 `_strip.png`
- 帧坐标由 JSON 的 `frames` 数组提供，统一以最大宽高对齐（每帧水平居中、底部对齐）
- 绘制时按 `PLAYER_TARGET_H / 帧高` 等比缩放，脚底对齐碰撞盒底部、水平中心对齐
- 精灵未加载完成时回退到手绘小人 `drawX()`

#### 摄像机

```javascript
camera = {
  x: number,       // 水平偏移（世界坐标）
  y: number,       // 垂直偏移（世界坐标）
  zoom: 1.0,       // 缩放倍率（编辑模式，0.2x~4.0x）
}
```

#### 编辑模式

```javascript
editMode: bool              // 是否编辑模式
editTool: 'tile'|'enemy'|'player'  // 当前编辑工具
mouseDown: 0|1|2           // 0=无, 1=左键, 2=右键
mouseWorldX/Y: number      // 鼠标世界坐标（已考虑 zoom）
isPanning: bool            // 是否中键拖拽中
isDraggingPlayer: bool     // 是否正在拖拽玩家出生点
dragPlayerOffX/Y: number   // 拖拽时鼠标相对出生点偏移
```

### 8. 关键常量

```javascript
VW: 800, VH: 500
TILE: 32
let LW: 100, LH: 16  (动态可扩展)
let MAP_W = LW * TILE  (3200px，扩展后同步更新)
GRAVITY: 0.55, MAX_FALL: 12
CHG1: 6 (0.1s), CHG2: 60 (1s)
WALL_LOCK: 6 (0.1s)
DASH_DIST: 128 (4 Tile)
DASH_MULT: 1.5
BULLET: 14.0
INV: 30 (无敌帧)
MAX_HP: 28
PLAYER_TARGET_H: 80         // 角色精灵显示高度
ANIM_SPEED: 1.5             // 动画播放加速倍率（frameDur = 60/fps/1.5）
SHOOT_HOLD: 15 (0.25s)      // 射击结束后保留射击动画帧数
```

### 9. 更新流程（每帧）

**游玩模式**：
1. 冷却计时（无敌、墙跳锁定）
2. 读取输入（处理 K/L 消费机制）
3. 墙面检测 + 贴墙滑落判定
4. J 键射击 + 三区间蓄力
5. Dash 阶段 1：冲刺 + 中止条件
6. Dash 阶段 2：就绪状态（松 L 退出 + 起跳）
7. 普通移动（非冲刺、无 Dash 资格时）
8. Dash 触发（地面）
9. K 键跳跃 + 墙跳（L 按住时设置 Dash 资格）
10. 空中 Dash 资格加速
11. 重力
12. X/Y 轴碰撞
13. 落地/贴墙清除 Dash 资格 + L 消费
14. 更新摄像机（居中跟随 + 边界限制）
15. 更新怪物 AI + 物理
16. 玩家子弹 vs 怪物/墙碰撞
17. 敌人子弹 vs 玩家碰撞
18. 玩家碰怪物伤害
19. 更新粒子/残影
20. 重置检测
21. 角色动画状态机（`playerAnimKey` 选 key → 帧对应保留 → 跳跃三段式 → 帧推进）

**编辑模式**：跳过所有游戏逻辑（`update()` 直接 return），仅响应鼠标操作。

### 10. 渲染流程

1. 清屏 + 背景渐变
2. 瀑布背景线（不受缩放影响）
3. **世界变换**：`ctx.translate(-camera.x * zoom, -camera.y * zoom)` + `ctx.scale(zoom, zoom)`
4. 关卡砖块（仅渲染可见范围）
5. 粒子
6. 子弹
7. 怪物（仅渲染可见范围）
8. 玩家（序列帧精灵 + 残影 + 蓄力光环，编辑模式不渲染；精灵未加载时回退手绘小人）
9. 编辑器 overlay（编辑模式下高亮当前 tile / 敌人预览）
10. **恢复变换**：`ctx.restore()`
11. UI（HP 条、蓄力条、调试面板）

### 11. 关键函数索引

| 函数 | 说明 |
|------|------|
| `buildMapFromData(data)` | 从 JSON 数据构建 tile 地图 |
| `parseTileRule(rule, map, lw, lh)` | 解析单条 tile 规则 |
| `spawnEnemiesFromData(data)` | 从 JSON 数据生成敌人列表 |
| `loadLevel(jsonData)` | 从外部 JSON 加载关卡数据 |
| `expandMap(newCol, newRow)` | 动态扩展地图（偏移所有敌人+摄像机） |
| `exportLevelJSON()` | 导出当前地图为 JSON |
| `compressTiles(rawTiles)` | 压缩 tile 数据为规则格式 |
| `getPlayerSpawn()` | 从关卡数据读取玩家出生点 |
| `isSpawnValid(sx, sy)` | 检测出生点是否与地形/敌人重合 |
| `setEditMode(on)` | 切换编辑/游玩模式 |
| `doEditAction()` | 执行编辑操作（放置/删除砖块或敌人） |
| `drawEditorOverlay()` | 渲染编辑器高亮/预览 |
| `spawnBullet(x, y, dir, power)` | 生成玩家子弹（含 dir/animT sprite 字段） |
| `drawBullets()` | 渲染玩家/敌人子弹（power=1 用 sprite 动画） |
| `loadPlayerSprites()` | 加载角色各动画的 `_frames.json` 与 `_strip.png` |
| `playerAnimKey(p, mx)` | 根据玩家状态返回当前应播放的动画 key |
| `drawPlayerSprite(p, cx, cy)` | 用精灵绘制角色（等比缩放 + 镜像） |
| `drawPlayer()` | 渲染玩家（含残影、蓄力光环） |
| `drawX(cx, cy, f)` | 手绘小人 fallback 绘制 |

**sprite-cutter.html / sprite-build.js 关键函数**：

| 函数 | 说明 |
|------|------|
| `processGreenScreen()` | 网页端去绿幕处理（精确删纯绿） |
| `removeGreenExact(d, w, h, tol)` | 精确去绿幕：只删纯绿(0,255,0)及抗锯齿过渡，保留前景绿色描边 |
| `getContentBBox(sx, y0, w, h)` | 计算帧内容包围盒 |
| `exportStripPNG()` | 导出等宽条带 PNG（含多行选区警告） |
| `exportJSONData()` / `copyJSONData()` | 导出/复制每帧坐标 JSON |
| `resetView()` | 重置视图（自动选第一行，不再默认整图） |
| `decodePNG(buf)` / `encodePNG(w, h, rgba)` | sprite-build.js 内置 PNG 编解码（零依赖） |
| `removeGreen(data, tol, w, h)` | sprite-build.js 精确去绿幕（与网页一致） |

### 12. 输入消费机制

- **K 键**：松手重置 `kConsumed`，按 K 跳跃后设为 true，按住只触发一次
- **L 键**：松手重置 `lConsumed`，触发 Dash 时设为 true，落地时若 L 还按着也设为 true
- 冲刺阶段内的中止条件判断使用 `lRaw`（原始按键状态），不受消费机制影响

---

## 最近更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-08-13 (会话#6) | **角色序列帧动画系统接入 + 动画细节打磨**。① 角色从 `fillRect` 占位美术替换为 9 个序列帧精灵动画（`PLAYER_ANIMS`/`loadPlayerSprites`/`drawPlayerSprite`，等比缩放对齐碰撞盒高度 80px，未加载回退手绘小人）；② 修正 `climb` 动画镜像基准（该资源默认面向左，与其他动画相反）；③ 同帧数成对动画（jump↔jumpShoot、running↔runShoot）切换时保留帧索引，逐帧对应；④ 射击动画缓冲：松开射击键后保留 0.25s 再切回；⑤ 跳跃三段式播放（起跳前4帧→空中定格第4帧→落地播尾段3帧）；⑥ 动画播放速度加速 1.5 倍（frameDur = 60/fps/1.5）。 |
| 2026-08-13 | **序列帧切割工具链 + 小蓄力子弹 sprite 接入**。① 新增 `sprite-cutter.html`（绿幕去除 + 框选动画行 + 分割线 + 导出等宽条带/JSON）和 `sprite-build.js`（零依赖本地生成脚本）；② 修复去绿幕算法：从「宽泛阈值删绿」改为「精确删纯绿(0,255,0)」，避免误删前景绿色描边；③ `resetView()` 不再默认选整图，自动选第一行；④ `prototype.html` 接入小蓄力子弹 sprite 动画（`middle-bullet-flying_strip (1).png`，5帧×40×19，显示 54×36 匹配碰撞体积，支持镜像）。 |
| 2026-08-10 | **项目初始化**。创建 Rockman X4 操作原型，实现 X 核心移动+射击机制。单文件 `prototype.html` 实现。 |
| 2026-08-11 (上午) | **文档同步**。修正 §5 关卡尺寸，全量交叉比对。 |
| 2026-08-11 (下午) | **关卡编辑系统**。新增 JSON 关卡配置系统（level.json + DEFAULT_LEVEL fallback）、可视化编辑模式（E 键切换）、长按放置/删除砖块和敌人、中键拖拽平移摄像机、滚轮缩放（0.2x~4.0x）、Ctrl+S 导出 JSON、动态地图扩展（边界外放置自动扩大地图+偏移敌人坐标）、摄像机居中跟随（水平+垂直）。文档全覆盖同步。 |
| 2026-08-12 | **玩家出生点可编辑**。level.json / DEFAULT_LEVEL 新增 `playerSpawn` 字段；新增 `getPlayerSpawn()` / `isSpawnValid()` 函数；编辑器新增"玩家出生点"工具（自由拖动、像素级放置，不受 tile 网格约束）；退出编辑模式时自动验证出生点不与地形/敌人重合，不合法时弹出提示并阻止退出；覆盖层显示青色 SPAWN / 红色 INVALID! 标记。 |
| 2026-08-12 (下午) | **序列帧处理讨论**。讨论了游戏开发中 Spritesheet 的标准工作流（Aseprite 导出 JSON vs 手工硬编码）；确认当前素材来源无配套 JSON，需要工具辅助测量帧参数；计划改造 `preview.html` 为双轨对比展示（自动检测边界线 vs 手动参数边界线），支持帧宽不统一时的手动调参。实际代码改动待后续执行。 |
