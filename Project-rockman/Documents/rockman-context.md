# Rockman X4 操作原型 - 策划文档 & 技术速查

> 最后更新: 2026-08-19 (会话 #12)

---

## Part 1: 游戏策划文档

### 1. 项目概述

Rockman X4 风格操作原型，聚焦于 X（艾克斯）的核心移动和射击机制验证。单文件 HTML Canvas 实现，无需外部依赖。

### 2. 操作键位

| 按键 | 功能 |
|------|------|
| `A` / `D` | 左右移动（下蹲时仅转向，不移动） |
| `K` | 跳跃 / 二段跳 / 墙跳 |
| `W` | 上攻击方向键（Zero 地面按住 `W`+`J` 触发上攻击） |
| `J` | X：射击 + 蓄力；Zero：近战挥砍（三段连击，地面按住 `W`+`J` = 上攻击） |
| `L` | Dash（冲刺，下蹲时可用） |
| `S` | 下蹲（按住） |
| `P` | 切换碰撞盒可视化 |
| `空格` | 重置角色 |
| `E` | 切换编辑模式（游玩 ↔ 编辑） |
| `Ctrl+S` | 编辑模式下导出关卡 JSON |
| 状态面板按钮 | 点击切换角色 X / Zero |
| 鼠标左键（编辑模式） | 砖块/敌人：放置（长按快速连续放置）；玩家出生点：拖动移动 |
| 鼠标右键（编辑模式） | 删除砖块/敌人（长按快速连续删除） |
| 鼠标中键拖动（编辑模式） | 自由平移摄像机查看关卡 |
| 鼠标滚轮（编辑模式） | 缩放视口（0.2x ~ 4.0x） |

### 3. 核心机制

#### 3.0 双角色系统（X / Zero）

- 两名角色：**X**（远程射击 + 蓄力）和 **Zero**（近战挥砍），通过状态面板按钮点击切换
- 两角色状态独立（HP、位置、蓄力等各自保存，切换时互不干扰）；切换时清空子弹/特效残留
- 切换后 Zero 出现在 X 当前位置（首次切换 Zero 则初始化为出生点）
- X 攻击 = J 键射击 + 三区间蓄力（见 §3.1）；Zero 攻击 = J 键近战挥砍三段连击（见 §3.8）
- 两角色共用同一套序列帧素材（`idle-*`），视觉上暂靠 UI 角色名区分

#### 3.1 J 键：射击 + 三区间蓄力（X）

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
- 以 1.75 倍速度朝面朝方向冲刺
- 最大时长 21 帧 = 0.35s（`DASH_TIME`，固定时长，不再按距离换算）
- 中止条件：时长结束 / 松 L 且不按前进方向键 / 按反方向键 / 撞墙
- 冲刺阶段中起跳 → 获得空中 Dash 资格
- Dash 消费 L 键，同一次按住只能触发一次 Dash

**阶段 2：Dash 就绪状态**（`dashReady = true`）
- 冲刺结束后 L 还按着时进入
- 不影响移动速度（走普通速度）
- 此状态下起跳 → 获得空中 Dash 资格
- 松 L → 退出就绪状态

**空中 Dash 资格**（`dashAirborne = true`）
- 从 Dash 触发起跳开始，松 L 也保持
- 输入方向键 → 1.75 倍速移动；不按 → 静止
- 输入方向键同时改变面朝方向（与普通跳跃一致）
- 有残影效果
- 落地或贴墙 → 清除资格
- 碰撞盒为跳跃盒（= 碰撞盒 A，站立盒），从地面冲刺转空中冲刺跳时自动从冲刺低矮盒恢复

**Dash 权限刷新**：落地即刷新（无冷却时间），L 键消费落地时也需松手再按

**残影系统**：冲刺阶段 + 空中 Dash 资格期间，每 3 帧记录一次位置，产生多个渐隐残影（生命周期 12 帧）

#### 3.3 跳跃 & 墙跳

- K 键按住只触发一次跳跃（消费机制）
- 地面跳跃：普通速度起跳（`jumpCount = 1`）
- **二段跳**：空中再按 K → 再跳一次（`jumpCount = 2`），高度为原跳高的 0.8（`P.JUMP * 0.8`），重新播放起跳动画；落地重置 `jumpCount = 0`
- **墙跳不消耗二段跳次数**：墙跳时 `jumpCount` 保持不变，墙跳后空中仍可再接二段跳
- 贴墙 + K = 墙跳，弹向反方向
- 墙跳后 0.1s（6 帧）方向锁定：强制向反方向移动，忽略玩家输入（方向由蹬墙瞬间保存的 `wjDir` 决定，不依赖逐帧重算的 `onWall`）
- 按住 L 时墙跳 → 获得空中 Dash 资格 + 加速墙跳速度

#### 3.4 贴墙滑落

- 必须按住面向墙的方向键（左墙按 A，右墙按 D）
- 松手 → 自由下落，不减速
- 贴墙滑落时射击方向为远离墙的反方向

#### 3.5 射击方向

- 正常状态：朝面朝方向射击
- 贴墙滑落时：朝远离墙的方向射击（例：左墙贴滑 → 向右射击）
- 子弹从角色手炮口（碰撞盒前缘中部）发射，非碰撞盒中心：面朝右从右边缘、面朝左从左边缘发出，各类动作（站立/跑步/冲刺/跳跃射击 + 蓄力弹）统一从炮口发射

#### 3.6 角色动画系统

角色已从 `fillRect` 占位美术替换为序列帧精灵动画（10 个动画状态）：

| 动画 key | 资源前缀 | 帧数 |
|---------|---------|------|
| `stand` | idle-stand | 4 |
| `shoot` | idle-shoot | 2 |
| `running` | idle-running | 10 |
| `jump` | idle-jump | 7 |
| `dash` | idle-dash | 2 |
| `climb` | idle-climb | 3 |
| `crouch` | idle-crouch | 1 |
| `runShoot` | idle-running&shoot | 10 |
| `jumpShoot` | idle-jump&shoot | 7 |
| `dashShoot` | idle-dash&shoot | 2 |

**动画选择规则**（`playerAnimKey`）：
- 冲刺阶段（`isDash`）→ `dash`/`dashShoot`（优先级最高）
- 下蹲（`crouch`，非冲刺时）→ `crouch`
- 空中（含落地收尾期间）→ 正在贴墙滑行（`wallSlide`，按住方向键）为 `climb`，否则 `jump`/`jumpShoot`
- 地面移动 → `running`/`runShoot`
- 站立 → `stand`/`shoot`

> 注：空中 `climb` 判定用 `wallSlide`（是否正在贴墙滑行）而非 `onWall`（是否贴墙）——松开方向键自由下落时不播 climb，走 jump。

**帧对应机制**：同帧数的成对动画（`jump`↔`jumpShoot` 各 7 帧、`running`↔`runShoot` 各 10 帧）切换时保留当前帧索引，保证逐帧一一对应（如跳跃播到第 3 帧按下射击键，jumpShoot 从第 4 帧继续）。

**跳跃三段式播放**：跳跃动画分三段——起跳先播前 4 帧（索引 0~3）→ 空中定格在第 4 帧（索引 3）→ 落地瞬间播尾段（索引 4~6）后切回站立。跳跃射击同理。**落地尾段未播完又立即起跳时，舍弃剩余尾段，重新从起跳段（索引 0）播放**。**从贴墙滑行（climb）松开方向键自由下落时，直接定格在跳跃空中帧（索引 3），不从头播起跳段**。

**射击缓冲**：松开射击键后，射击类动画（`shoot`/`runShoot`/`jumpShoot`/`dashShoot`）保留 0.25 秒再切回对应非射击动画。

**射击帧重置**：仅站立不动射击（`shoot`，`grounded && !landing && mx===0`）发射瞬间重置帧到第二帧（索引 1）；空中（jumpShoot）/移动（runShoot）/冲刺（dashShoot）射击不重置，保持与移动动画帧同步（由 `KEEP_FRAME_PAIRS` 保证切换时保留帧索引）。

**镜像规则**：普通动画资源默认面向右（`facing>0` 不翻，`facing<0` 翻）；`climb` 资源默认面向左（`facing>0` 翻，`facing<0` 不翻）。

**播放速度**：所有动画帧时长除以 1.5，即播放速度 1.5 倍。

#### 3.7 下蹲机制

- **触发**：按住 `S` 下蹲，松开站起（地面且非冲刺/空中 Dash 期间才处理）
- **下蹲锁位移**：下蹲状态下（无论是否强制）锁死位移（`vx=0`），只能左右转向（`facing` 跟随 A/D 键）、可 Dash，不能移动
- **碰撞盒切换**：下蹲切换到碰撞盒 B（38×27），站起切回碰撞盒 A（30×35）
- **强制下蹲**（`forcedCrouch`）：冲刺结束或站立空间不足时自动蹲下，锁死位移（`vx=0`，仅允许 Dash 逃出），每帧检测头顶空间，能站起则自动恢复
- **冲突检测**：`boxFitsTerrain()` 在切换碰撞盒前检测新碰撞盒是否与地形重叠，重叠则拒绝切换（下蹲拒绝 / 站起拒绝 / Dash 禁止）
- **跳跃交互**：下蹲时起跳会先恢复站立碰撞盒再起跳（跳跃碰撞盒 = 碰撞盒 A）
- **空中冲刺跳碰撞盒**：从地面冲刺（低矮碰撞盒 B）转空中冲刺跳时，自动恢复为跳跃碰撞盒 A（含下蹲冲刺跳场景，跳起后站直）
- **动画**：下蹲时播放 `crouch` 动画（1 帧，非冲刺时）

#### 3.8 Zero 近战挥砍三段连击

- **触发**：Zero 按 `J` 键，前方挥砍（扇形/矩形判定，刀光用 `blade.png`）；**地面按住 `W` + 按 `J` = 上攻击**（`p.upAtk`，仅第 3 段向上斩）
- **攻击范围**：blade.png 逆时针旋转 90° 后的矩形；旋转后高度 = 角色高度（`P.PH`），宽度按 blade 真实宽高比例缩放
- **三段连击**（仅地面）：第 1 段 → 第 2 段 → 第 3 段，范围逐渐变大（倍率 1.0 / 1.33 / 1.83），伤害 2 / 3 / 5
- **上攻击**（`W`+`J`，仅地面）：从第三段向上挥砍，**角色同时向上跃起**（`P.JUMP * 0.8`，且计入二段跳次数 `jumpCount = 1`，落地前仍可再接二段跳）；刀光 **175° 旋转**（面朝右 -175° / 面朝左 +175°），判定框重做（锚点移至头顶上方，`P.PH * 0.6` 处，垂直矩形覆盖刀光两端）；命中击退向上（见下文「受击击退」）
- **空中攻击**：固定第 2 段（范围中等），不推进地面连击段数
- **挥砍朝向 `meleeDir`**：贴墙滑行时朝墙的反方向（与 X 贴墙射击一致，`-onWall`），否则跟随 `facing`；水平挥砍击退沿 `meleeDir` 弹开
- **时间规则**：
  - 段间冷却 0.15s（`MELEE_CD` = 9 帧，攻击频率上限）
  - 空中挥砍独立间隔 0.33s（`MELEE_AIR_CD` = 20 帧，跳跃挥砍后需等待，落地后剩余冷却继续生效）
  - 连击重置 0.3s（`MELEE_RESET` = 18 帧，超过未攻击则重置回第 1 段）
  - 第三段后硬直 0.4s（`MELEE_FINAL_LOCK` = 24 帧，期间不能攻击）
  - 命中冷却 6 帧（怪物 `meleeLock`）：挥砍动画 12 帧内每段攻击对同一怪物最多命中 2 次（第 1/7 帧）；命中触发 hitstop 全冻结 3 帧（`HITSTOP`），同帧多目标合并为一次停顿
- **受击击退 `knockEnemy(en, dirX, dirY, power)`**：命中怪物时施加方向性弹开速度，持续 8 帧（`knockT`）每帧衰减 0.85，**击退期间怪物 AI 暂停、物理跳过**；强度约定：X 子弹 1.5（水平）、Zero 水平挥砍 2.0（沿 `meleeDir`）、Zero 上攻击 2.5（向上）
- **触发方式**：攻击键 J 按下沿触发（`jPressed`），**长按不连挥**——每次挥砍都需要重新按一次 J（X 的射击不受影响，按住可蓄力）
- **刀光表现**：blade.png 不转动，仅随挥砍进度渐隐消失（`alpha` 从 1 线性降到 0）；刀光中心向前偏移半个刀光宽，避免压住角色身体；上攻击刀光带 175° 旋转
- **方向**：面朝右刀光尖端指向右（blade 逆时针旋转 90°），面朝左镜像；上攻击刀光朝上

### 4. 玩家属性

| 属性 | 值 | 说明 |
|------|-----|------|
| 碰撞盒 A（站立/跳跃） | 30×35 | 站立素材最大宽高 × `SPRITE_SCALE`(1.0) |
| 碰撞盒 B（下蹲/冲刺） | 38×27 | 宽=dash 素材最大宽(38)、高=crouch 素材最大高(27) |
| 移速 | 1.75 px/帧 | 普通移动速度 |
| 跳跃力 | -5.2 | 初始向上速度 |
| 二段跳力 | -4.16 | = 跳跃力 × 0.8（`P.JUMP × 0.8`，上攻击跃起同值） |
| 重力 | 0.24 | 每帧加速度 |
| 最大下落速度 | 5.2 | |
| Dash 倍率 | 1.75× | Dash 速度 = 3.0625 |
| Dash 时长 | 21 帧 (0.35s) | 固定时长（`DASH_TIME`） |
| 子弹速度 | 6.1 | |
| 墙滑速度 | 0.65 | 贴墙滑落速度上限 |
| 墙跳 X | 2.4 | |
| 墙跳 Y | -4.4 | |

> 注：碰撞盒由素材加载后通过 `updateHitboxTable()` 根据各动画素材实际 `maxW`/`maxH` × `SPRITE_SCALE`(1.0) 动态计算。玩家素材直接以「原始像素」作为世界坐标，不再额外放大；缩放统一由渲染层 `VIEW_SCALE`(2.3) 负责。`SPRITE_SCALE = 1.0`（素材原始像素即世界坐标）。

### 5. 关卡配置

- **网格对齐单位**：`TILE = 28`（素材像素），所有砖块对齐到 28 的整数倍坐标
- **两种规格砖块**：
  - 小砖块：28×28（= 1 个网格格子，map 值 1）
  - 大砖块：56×56（`TILE_BIG = TILE * 2`，编辑器一次性放置 2×2 个相邻 28 小砖，数据层面仍是 4 个值 1 的格子，无独立"大砖"标记）
- **大砖放置对齐**：鼠标格 = 大砖正中心，放置时向左上偏移 1 格写 2×2；右键删除按 28 格删（大砖可被部分删除）
- **编辑器砖块规格**：工具栏新增"砖块规格"下拉框（小砖块 28×28 / 大砖块 56×56），切到砖块工具时显示
- 关卡尺寸：`level.json` 当前网格 70×38 Tile（1960×1064 素材像素），**实际砖块只覆盖 col 9~67、row 0~34**（左侧/顶部/底部留有空白网格），支持动态扩展（编辑模式下在边界外放置砖块自动扩大地图）
- 数据格式：一维数组，1=砖块 0=空（所有砖块统一为 28 网格，无大砖特殊值）
- 关卡地图：当前为单区域长地图（70×38，多段平台 + 墙壁结构），旧 4 区域地图已废弃
- 外部配置文件：`level.json`（含 `playerSpawn`、tiles 规则描述，`enemies` 恒为空数组），支持 fetch 加载；内联 `DEFAULT_LEVEL` 作为 fallback
- 玩家出生点：`playerSpawn: { x, y }` 可配置（当前 (1085,890)），编辑器支持自由拖动设置（像素级，不受 tile 网格约束），退出编辑模式时自动验证不与地形/敌人重合
- **敌人自动生成**：游玩模式不再读取关卡敌人，改为自动生成——每 60 帧（`ENEMY_SPAWN_CD`）在地图砖块包围盒内随机找空位生成 1 只 `floater`（`ENEMY_SPAWN_TYPES` 当前仅 floater），场上上限 100 只（`ENEMY_MAX`）；进入编辑模式清空敌人并重置生成计时，导出 JSON 时 `enemies` 写空数组
- **怪物自由放置（仅编辑模式）**：编辑模式下怪物仍可手动放在任意像素位置（中心对齐鼠标，不按格子），放置前检测不与已有怪物、不与地形矩形重叠（仅用于编辑预览，不写入导出数据）
- **怪物尺寸**：普通怪高度统一为角色高度（35），宽度按类型（soldier 16 / bee 22 / floater 20）；**floater 改圆形碰撞 20×20（r=10）**；Boss 50×50（2 倍宽高）
- **怪物数值**：soldier hp 13 / bee hp 8 / floater hp 11（spd 0.45，直线追踪玩家）/ boss hp 107
- **怪物 AI**：floater 从正弦浮动改为**直线追踪玩家**（水平+垂直均朝玩家移动）；bee 保持水平追击 + 垂直正弦浮动
- 摄像机：支持水平+垂直居中跟随；**边界限制以「已放置砖块的包围盒」为准**（`MAP_BOUNDS` 由 `updateMapBounds()` 扫描重算），镜头永不平移到砖块范围之外（地图比视口窄/矮时居中），避免露出无砖块空白区；**游玩模式默认缩放 0.7**（`camera.zoom`，视野更大）

---

## Part 2: 技术架构速查

### 6. 文件清单

| 文件 | 说明 |
|------|------|
| `prototype.html` | 主文件，包含全部代码（游玩+编辑模式） |
| `preview.html` | 序列帧预览工具（Spritesheet 切分验证 + 动画预览） |
| `level.json` | 关卡配置文件（tiles 规则 + `playerSpawn`，`enemies` 恒为空数组——敌人改为自动生成） |
| `Assets/` | 素材目录（角色序列帧 PNG + 子弹素材 + 预览用 GIF） |
| `Assets/blade.png` | Zero 近战挥砍刀光素材（逆时针旋转 90° 使用，尖端指向怪物方向） |
| `Assets/sprite-cutter.html` | 序列帧切割工具（绿幕去除 + 框选 + 分割线 + 导出等宽条带/JSON） |
| `Assets/sprite-build.js` | 本地序列帧生成脚本（读取参数 JSON，零依赖生成 clean/strip/frames 产物） |
| `Assets/Assets-Clean/` | 切割产物目录（去绿幕后条带 PNG + 每帧坐标 JSON） |
| `Assets/Assets-Clean/idle-*.json` | 角色 10 个动画的每帧坐标元数据（stand/shoot/running/jump/dash/climb/crouch/runShoot/jumpShoot/dashShoot） |
| `Assets/Assets-Clean/idle-*_strip.png` | 角色 10 个动画的等宽条带 PNG |
| `Assets/Assets-Clean/*-bullet-*.json/png` | 子弹（small/middle/big）的 flying/hit/out 三态序列帧 |

### 7. 核心数据结构

#### 玩家状态

```javascript
player = {
  x, y, vx, vy, w, h,          // 位置/速度/尺寸（w/h 随碰撞盒切换动态变化）
  facing: 1|-1,                 // 面朝方向
  grounded: bool,               // 是否在地面
  onWall: 0|-1|1,              // 贴墙状态
  wallSlide: bool,              // 是否贴墙滑落中
  isDash: bool,                 // Dash 阶段1
  dashT: int,                   // 冲刺剩余帧数
  dashDir: 1|-1,                // 冲刺方向
  dashReady: bool,              // Dash 阶段2 就绪状态
  dashAir: bool,                // 空中 Dash 资格
  dashEndLock: int,             // 冲刺结束锁（2 帧，避免碰撞盒切换临界帧误入 airborne 闪 jump）
  crouch: bool,                 // 是否下蹲
  forcedCrouch: bool,           // 是否强制下蹲（锁位移）
  chgT: int,                    // 蓄力帧数
  isChg: bool,                  // 是否蓄力中
  shootHold: int,               // 射击结束后保留射击动画的剩余帧数（0.25s = 15 帧）
  wjLock: int,                  // 墙跳方向锁定剩余帧
  wjDir: 1|-1,                  // 墙跳方向（蹬墙瞬间保存，wjLock 期间据此强制位移）
  kCon: bool,                   // K 键消费标记
  lCon: bool,                   // L 键消费标记
  invT: int,                    // 受伤无敌帧
  hp: int,                      // 血量
  landing: bool,                // 落地收尾阶段标记（跳跃动画播尾段）
  animF: int,                   // 当前动画帧索引
  animT: int,                   // 当前帧内计时器
  animKey: string,              // 当前动画 key（见 PLAYER_ANIMS）
  // 近战（Zero 专用）
  melee: int,                   // 近战挥砍剩余帧（>0 表示正在挥砍，渐隐消失）
  meleeCd: int,                 // 段间攻击冷却剩余帧（0.15s；空中挥砍用独立 MELEE_AIR_CD）
  meleeCombo: int,              // 当前连击段数（0=无, 1/2/3，地面连击用）
  meleeReset: int,              // 连击重置倒计时（0.3s 未攻击则归零）
  meleeFinalLock: int,          // 第三段后的硬直倒计时（0.3s）
  meleeCurStage: int,           // 当前这次挥砍的段数（供绘制/范围显示，空中固定第 2 段）
  meleeDir: 1|-1,               // 挥砍朝向（贴墙滑行时 = -onWall 朝墙反方向，否则 = facing）
  upAtk: bool,                  // 是否上攻击（地面按住 W + J 触发，第三段向上斩）
  jumpCount: int,               // 已跳次数（0=未跳, 1=首跳, 2=二段跳已用；墙跳不消耗，落地重置 0）
}
```

#### 全局列表

- `bullets[]` — 玩家子弹列表
- `eBullets[]` — 敌人子弹列表
- `particles[]` — 粒子效果列表
- `afterimages[]` — Dash 残影列表
- `enemies[]` — 怪物列表（每只含 `meleeLock`：近战命中冷却帧，>0 时挥砍跳过该怪，仅 Zero 近战使用；`knockT/knockVx/knockVy`：受击击退剩余帧+速度，>0 时 AI 暂停、物理跳过；`hurtT`：受击闪白帧；`r`：圆形碰撞半径，仅 floater 用）
- `map[]` — 关卡 tile 数据（一维数组，`let` 可动态替换）

#### 子弹对象

```javascript
bullet = {
  x, y, vx, vy,          // 位置/速度
  dir: 1|-1,             // 面朝方向（用于 sprite 镜像）
  w, h,                  // 碰撞体积（power 0/1/2 = 16×11 / 24×16 / 40×27，普通×1.5/×2.5）
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

- 子弹 sprite 动画渲染（flying 循环 + hit 瞬时 + out 枪口瞬时），替换原纯色矩形
- 显示尺寸以资源真实尺寸 × `displayScale`(1.0) 映射；`dir < 0` 时水平镜像
- 图片未加载完成时回退到原纯色矩形绘制
- 命中特效（hit 动画）播放速度翻倍（`animT += 2`，帧切换速度 ×2），枪口发射特效（out）正常速度播放

#### 角色 Sprite 资源

```javascript
PLAYER_ANIMS = {           // 动画 key → 资源文件前缀
  stand: 'idle-stand', shoot: 'idle-shoot',
  running: 'idle-running', jump: 'idle-jump',
  dash: 'idle-dash', climb: 'idle-climb',
  crouch: 'idle-crouch',
  runShoot: 'idle-running&shoot', jumpShoot: 'idle-jump&shoot',
  dashShoot: 'idle-dash&shoot',
}
PLAYER_SPRITES = {}        // key -> { img, frames: [{x,y,w,h}], fps, loaded, maxW, maxH }
SPRITE_SCALE = 1.0         // 素材原始像素即世界坐标，不再额外放大（缩放由渲染层 VIEW_SCALE 负责）
```

- `loadPlayerSprites()` 在启动时 fetch 各动画的 `_frames.json` 与 `_strip.png`
- 帧坐标由 JSON 的 `frames` 数组提供，统一以最大宽高对齐（每帧水平居中、底部对齐）
- 绘制时按 `SPRITE_SCALE` 等比缩放（不跟随碰撞盒缩放），脚底对齐碰撞盒底部、水平中心对齐
- 精灵未加载完成时回退到手绘小人 `drawX()`

#### 碰撞盒系统

```javascript
HITBOX = {
  stand:  { w, h },   // 碰撞盒 A（站立/跳跃）= stand 素材 maxW/maxH × SPRITE_SCALE(1.0) = 30×35
  jump:   { w, h },   // 跳跃：与站立相同（碰撞盒 A）
  dash:   { w, h },   // 碰撞盒 B（定制）= 宽取 dash 素材 maxW(38)、高取 crouch 素材 maxH(27) = 38×27
  crouch: { w, h },   // 下蹲：碰撞盒 B（与 dash 同宽高）
}
```

- `updateHitboxTable()` 在素材加载完成后根据各动画实际 `maxW`/`maxH` × `SPRITE_SCALE` 计算各状态碰撞盒，并同步 `P.PW`/`P.PH`/`P.PC`
- `setPlayerBox(w, h)` 切换碰撞盒时保持脚底 `y+h` 与水平中心 `cx` 不变
- `boxFitsTerrain(w, h)` 检测目标碰撞盒是否与地形重叠，重叠则拒绝切换
- 碰撞盒可视化开关（`P` 键），调试面板 `showHitboxes` 控制 `drawHitboxes()` 绘制

#### 摄像机

```javascript
camera = {
  x: number,       // 水平偏移（世界坐标）
  y: number,       // 垂直偏移（世界坐标）
  zoom: 0.7,       // 默认缩放（游玩模式 0.7 视野更大；编辑模式可滚轮 0.2x~4.0x）
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
VW: 800, VH: 500             // 视口大小（屏幕像素，不参与世界缩放）
VIEW_SCALE: 2.3              // 世界缩放系数：素材原始像素 → 屏幕像素（唯一世界尺寸缩放口径）
TILE: 28                     // 网格对齐单位 = 小砖块尺寸（素材像素）
TILE_BIG: 56                 // 大砖块尺寸 = TILE * 2（编辑器 2×2 批量放置）
let LW: 70, LH: 38          // 当前关卡网格尺寸（动态可扩展）
let MAP_W = LW * TILE       // 1960px，扩展后同步更新
GRAVITY: 0.24, MAX_FALL: 5.2
SPEED: 1.75                 // 普通移速
JUMP: -5.2                  // 跳跃力
WALL_SLIDE: 0.65, WALL_JUMP_X: 2.4, WALL_JUMP_Y: -4.4
CHG1: 6 (0.1s), CHG2: 60 (1s)
WALL_LOCK: 6 (0.1s)
DASH_TIME: 21 (0.35s)      // Dash 固定时长（不再按距离换算）
DASH_MULT: 1.75
BULLET: 6.1
INV: 30 (无敌帧)
MAX_HP: 28
SPRITE_SCALE: 1.0           // 素材原始像素即世界坐标（不再额外放大）
ANIM_SPEED: 1.5             // 动画播放加速倍率（frameDur = 60/fps/1.5）
SHOOT_HOLD: 15 (0.25s)      // 射击结束后保留射击动画帧数
DASH_END_LOCK: 2            // 冲刺结束锁帧数（避免碰撞盒切换临界帧误入 airborne）
// 近战（Zero）
MELEE_ACTIVE: 12            // 挥砍动画/判定持续帧（渐隐消失）
MELEE_CD: 9 (0.15s)         // 段间攻击冷却（攻击频率上限）
MELEE_AIR_CD: 20 (0.33s)    // 空中挥砍独立间隔（跳跃挥砍后需等待，落地后剩余冷却继续生效）
MELEE_RESET: 18 (0.3s)      // 连击重置窗口（超过未攻击则重置回第 1 段）
MELEE_FINAL_LOCK: 24 (0.4s) // 第三段后的硬直（期间不能攻击）
HITSTOP: 3 (0.05s)          // 挥砍命中全冻结帧数（仅 Zero 近战触发，同帧多目标合并一次停顿）
MELEE_LOCK: 6               // 怪物命中冷却帧：12 帧动画内每段最多命中同一怪物 2 次（第 1/7 帧）
// 受击击退（knockEnemy 内字面量，无命名常量）
// knockT = 8 帧，每帧速度 ×0.85 衰减，期间怪物 AI 暂停/物理跳过
// 强度约定：X 子弹 1.5（水平）/ Zero 水平挥砍 2.0（沿 meleeDir）/ Zero 上攻击 2.5（向上）
// 敌人自动生成（游玩模式）
ENEMY_SPAWN_CD: 60          // 生成间隔帧数（约 1s 一只）
ENEMY_MAX: 100              // 场上怪物上限
ENEMY_SPAWN_TYPES: ['floater']  // 自动生成类型池（当前仅 floater）
```

### 9. 更新流程（每帧）

**游玩模式**：
1. 冷却计时（无敌、墙跳锁定）
2. 读取输入（处理 K/L 消费机制）
3. 墙面检测 + 贴墙滑落判定
4. J 键：X 射击 + 三区间蓄力 / Zero 近战挥砍（按下沿触发，消费 `jPressed`）
5. Dash 阶段 1：冲刺 + 中止条件
6. Dash 阶段 2：就绪状态（松 L 退出 + 起跳）
7. 普通移动（非冲刺、无 Dash 资格时）
8. Dash 触发（地面）
9. K 键跳跃 + 二段跳 + 墙跳（L 按住时设置 Dash 资格；二段跳 `jumpCount < 2` 时触发）
10. 空中 Dash 资格加速
11. 重力
12. X/Y 轴碰撞
13. 落地/贴墙清除 Dash 资格 + L 消费
14. 更新摄像机（居中跟随 + 边界限制）
15. 下蹲处理（S 键下蹲/站起 + 强制下蹲每帧检测能否站起）
16. Zero 挥砍逐帧命中判定（`doMeleeHit`，怪物 `meleeLock` 6 帧冷却 + hitstop 全冻结 + 命中施加 `knockEnemy` 击退）
17. 更新怪物 AI（`ai()`：floater 直线追踪 / bee 水平追击+正弦；击退期间 AI 暂停）+ 怪物物理（`enPhys()`，击退期间跳过）+ `meleeLock/hurtT` 递减
18. 敌人自动生成（`spawnTimer` 到 60 帧且场上 < 100 → 在地图砖块包围盒内随机生成 1 只 floater）
19. 玩家子弹 vs 怪物/墙碰撞
20. 敌人子弹 vs 玩家碰撞
21. 玩家碰怪物伤害
22. 更新粒子/残影
23. 重置检测
24. 角色动画状态机（`playerAnimKey` 选 key → 帧对应保留 → 跳跃三段式 → 帧推进）

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
11. 屏幕外怪物方向指示（`drawOffscreenIndicators()`：视野外怪物在屏幕边缘画三角箭头提示）
12. UI（HP 条、蓄力条、调试面板）

### 11. 关键函数索引

| 函数 | 说明 |
|------|------|
| `buildMapFromData(data)` | 从 JSON 数据构建 tile 地图 |
| `parseTileRule(rule, map, lw, lh)` | 解析单条 tile 规则 |
| `spawnEnemiesFromData(data)` | 从 JSON 数据生成敌人列表（旧逻辑，已不再被 loadLevel 调用——敌人改为自动生成） |
| `loadLevel(jsonData)` | 从外部 JSON 加载关卡数据（tiles + playerSpawn，忽略 enemies） |
| `expandMap(newCol, newRow)` | 动态扩展地图（偏移所有敌人+摄像机，扩展后重算砖块包围盒） |
| `updateMapBounds()` | 扫描地图重算砖块包围盒（`MAP_BOUNDS`）；地图初始化/加载/扩展/编辑放置删除砖块后调用 |
| `mkEnemy(type, x, y)` | 创建怪物对象（含 hp/meleeLock/knockT/knockVx/knockVy/hurtT 等字段） |
| `spawnAll()` | 清空敌人列表并重置自动生成计时器 |
| `findSpawnPos(w, h)` | 在地图砖块包围盒内随机找不与砖块/玩家/敌人重叠的生成位置 |
| `ai(en)` | 怪物 AI（floater 直线追踪玩家 / bee 水平追击+垂直正弦；击退期间暂停） |
| `enPhys(en)` | 怪物物理（重力/地面碰撞；击退期间跳过） |
| `dmgEnemy(en, d)` | 怪物受击（扣血 + 受击闪白 2 帧） |
| `knockEnemy(en, dirX, dirY, power)` | 受击击退（8 帧 0.85 衰减，AI/物理暂停；X 子弹 1.5 / 挥砍 2.0 / 上攻击 2.5） |
| `collide(a, b)` | 通用碰撞（矩形 {x,y,w,h} 与圆形 {cx,cy,r} 任意组合） |
| `circleRect(c, r)` | 圆形 vs 矩形：圆到矩形最近点距离平方比较 |
| `enShape(en)` | 怪物命中形状：floater 返回圆形 {cx,cy,r}，其余返回矩形 {x,y,w,h} |
| `compressTiles(rawTiles)` | 压缩 tile 数据为规则格式 |
| `getPlayerSpawn()` | 从关卡数据读取玩家出生点 |
| `isSpawnValid(sx, sy)` | 检测出生点是否与地形/敌人重合 |
| `setEditMode(on)` | 切换编辑/游玩模式 |
| `doEditAction()` | 执行编辑操作（放置/删除砖块或敌人） |
| `drawEditorOverlay()` | 渲染编辑器高亮/预览 |
| `spawnBullet(x, y, dir, power)` | 生成玩家子弹（含 dir/animT sprite 字段） |
| `drawBullets()` | 渲染玩家/敌人子弹（power=1 用 sprite 动画） |
| `loadPlayerSprites()` | 加载角色各动画的 `_frames.json` 与 `_strip.png` |
| `updateHitboxTable()` | 根据素材 maxW/maxH 计算各状态碰撞盒并同步 P 常量 |
| `setPlayerBox(w, h)` | 切换碰撞盒（保持脚底与水平中心不变） |
| `boxFitsTerrain(w, h)` | 检测目标碰撞盒是否与地形重叠 |
| `hasGroundBelow()` | 检测脚下是否有地面 |
| `canStandUp()` | 检测能否站起（头顶是否有空间） |
| `setCrouch(on, forced)` | 统一下蹲/站起状态切换（含冲突检测） |
| `endDash()` | Dash 结束：恢复高度或转为强制下蹲 |
| `switchCharacter(name)` | 切换角色 X / Zero（保存/恢复独立状态快照） |
| `snapshotPlayer()` / `restorePlayer(s)` | 保存/恢复玩家状态快照（角色切换用） |
| `doMelee(stage)` | Zero 近战触发帧：仅播放刀光特效（伤害判定交给 doMeleeHit 逐帧判定） |
| `doMeleeHit(stage)` | Zero 近战逐帧命中判定（怪物 `meleeLock` 6 帧冷却，命中触发 hitstop 全冻结） |
| `spawnMeleeHitEffect(x, y, dir)` | 生成近战受击特效（通用 hit 动画，画在怪物上层） |
| `meleeRect(stage)` | 计算近战攻击矩形（blade 旋转 90° 后范围；上攻击锚点移至头顶上方，判定框重做） |
| `meleeStageMult(stage)` | 近战三段范围放大倍率 |
| `drawMeleeEffect(p, cx, cy)` | 绘制近战刀光（blade.png，渐隐消失；上攻击刀光 175° 旋转、扇形朝上） |
| `drawEnemy(en)` | 渲染怪物（按类型绘制，floater 圆形） |
| `drawOffscreenIndicators()` | 屏幕外怪物方向指示（视野外怪物在屏幕边缘画三角箭头，随怪物移动实时更新） |
| `drawHitboxes()` | 碰撞盒可视化绘制（P 键开关） |
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
| 2026-08-19 (会话#12) | **Zero 上攻击 + 二段跳 + 怪物受击击退**。① 上攻击：Zero 地面按住 `W`+`J` 触发，第三段向上斩且角色向上跃起（`P.JUMP×0.8`，计入二段跳次数 `jumpCount=1`），刀光 175° 旋转、判定框重做（锚点移至头顶上方）；② 二段跳：空中再按 K 再跳一次（`P.JUMP×0.8`），墙跳不消耗二段跳次数，落地重置 `jumpCount`；③ 受击击退 `knockEnemy(en, dirX, dirY, power)`：X 子弹 1.5（水平）/ Zero 水平挥砍 2.0（沿 `meleeDir`）/ 上攻击 2.5（向上），持续 8 帧每帧 ×0.85 衰减，击退期间怪物 AI 暂停、物理跳过；④ **同步此前积累未记录改动**：Dash 改为固定时长 21 帧 + 1.75 倍速（`DASH_TIME`/`DASH_MULT`，弃用 `DASH_DIST`）、游玩模式镜头默认缩放 0.7、敌人自动生成（`ENEMY_SPAWN_CD`=60、`ENEMY_MAX`=100、仅 floater，level.json 的 enemies 恒为空数组）、通用碰撞 `collide()/circleRect()/enShape()`（floater 改圆形碰撞 20×20 r=10）、怪物数值全量修正（soldier hp 13 / bee hp 8 / floater hp 11 / boss hp 107）、floater AI 改直线追踪玩家、空中挥砍 CD 30→20 帧（0.5s→0.33s）、屏幕外怪物方向指示 `drawOffscreenIndicators()`、挥砍朝向 `meleeDir`、level.json 地图 63×18→70×38、出生点 (335,351)→(1085,890)。 |
| 2026-08-18 (会话#11) | **地图边界以砖块包围盒为准 + 近战手感调整**。① 镜头边界改为以「已放置砖块的包围盒」为准（新增 `MAP_BOUNDS`/`updateMapBounds()`，加载/扩展/编辑砖块后重算），修复 level.json 网格声明 63×18 但实际砖块仅覆盖 col 9~62/row 0~14 时镜头露出空白区的问题；② 空中挥砍独立间隔 CD 0.5s（`MELEE_AIR_CD`=30，地面段间冷却保持 0.15s），跳跃挥砍后需等待，落地后剩余冷却继续生效；③ 长按攻击键不再连挥（新增 `jPressed` 按下沿，每次挥砍需重新按 J）；④ 怪物命中冷却 `meleeLock` 4→6 帧，每段攻击对同一怪物最多命中 2 次（第 1/7 帧）。 |
| 2026-08-18 (会话#10) | **双角色系统 + Zero 近战三段斩 + 怪物调整**。① 新增双角色系统：X（远程射击+蓄力）/ Zero（近战挥砍），状态面板按钮切换，两角色状态独立；② Zero 近战三段连击（地面 1→2→3 段范围递增，空中固定第 2 段），段间冷却 0.2s、连击重置 0.3s、第三段硬直 0.3s；③ 刀光用 `blade.png`（逆时针旋转 90° 使用，尖端指向怪物，随挥砍渐隐消失）；④ 普通怪物高度统一为 35（角色高度），宽度按类型（soldier 16 / bee 22 / floater 20），Boss 50×50；⑤ 怪物编辑改为自由放置（中心对齐鼠标，不按格子），放置前检测不与怪物/地形重叠；⑥ level.json 用户手动放置怪物 + 调整出生点。 |
| 2026-08-17 (会话#9) | **砖块规格改造 + 数值体系修正 + 下蹲机制调整**。① `TILE` 14→28，新增 `TILE_BIG`=56，引入双规格砖块（小砖 28×28、大砖 56×56 = 编辑器一次性放置 2×2 小砖，数据层面仍是 28 网格值 1）；② 编辑器工具栏新增"砖块规格"下拉框（`tile-size`），大砖以鼠标格为中心向左上偏移 1 格放置，右键按 28 格删；③ DEFAULT_LEVEL/level.json 重置为最小空地图（50×8，底部地板+出生点，无敌人），旧 4 区域地图废弃待重画；④ 移除 STAGE CLEAR 通关机制（未完成，暂去掉）；⑤ 下蹲锁位移（`crouch || forcedCrouch` 时 `vx=0`），仅可左右转向 + 可 Dash；⑥ **文档数值体系全量修正**：碰撞盒 A 30×35 / B 38×27、SPRITE_SCALE 1.0、VIEW_SCALE 2.3、移速 1.75、重力 0.24、跳跃 -5.2、子弹 6.1、Dash 距离 56px 等（此前单位体系重构后文档未跟上，本次一并修正为代码实际值）。 |
| 2026-08-15 | **提交信息乱码修复说明**。集中补充说明 dev/rockman 分支历史提交中 3 条乱码 commit message 的真实内容（不动历史提交）：① `26551d7`(08-14)「射击发射点修复 + 空中冲刺跳细节修复 + 文档同步」；② `8dc11b7`(08-13)「序列帧切割工具链 + 小蓄力子弹 sprite 接入」；③ `2d48c85`(08-11)「文档同步收尾（关卡编辑系统）」。详见对应 commit message。 |
| 2026-08-14 (会话#8) | **射击发射点 + 空中冲刺跳细节修复**。① 子弹发射点从碰撞盒水平中心改为手炮口（碰撞盒前缘 `p.x + (sd>0 ? p.w : 0)`，面朝右从右边缘、面朝左从左边缘），各类动作统一从炮口发射；② 空中冲刺跳（Dash air）恢复跳跃碰撞盒 A，从地面冲刺转空中冲刺跳时不再停留在低矮冲刺盒 B（含下蹲冲刺跳场景）；③ 跳跃落地尾段未播完又起跳时，舍弃剩余尾段、从起跳段（索引 0）重新播放；④ 空中冲刺跳期间输入方向键时面朝方向跟随方向键（与普通跳跃统一）。 |
| 2026-08-14 (会话#7) | **下蹲系统 + 碰撞盒重构 + 蹬墙方向修复**。① 新增 `S` 键下蹲系统（`idle-crouch` 动画 1 帧、`setCrouch`/`forcedCrouch`/`canStandUp`/`boxFitsTerrain`/`endDash`/`drawHitboxes` 等函数，P 键碰撞盒可视化）；② 碰撞盒从固定 28×80 重构为动态双碰撞盒 A（站立 69×80）/B（下蹲冲刺 87×62），由 `updateHitboxTable()` 依据素材 `maxW`/`maxH` × `SPRITE_SCALE`(≈2.286) 计算；③ **修复蹬墙强制位移 bug**：新增 `wjDir` 字段在蹬墙瞬间保存方向，`wjLock` 期间据此强制位移，不再依赖逐帧重算的 `onWall`（原 bug：普通蹬墙后 `onWall` 归零导致强制位移立即失效）；④ 墙跳锁定时长 `WALL_LOCK` 由 12 帧(0.2s) 调整为 6 帧(0.1s)；⑤ `level.json` 地图扩展至 100×30、出生点移至 (55,333)、新增 col 66 墙列、删除 soldier 敌人。 |
| 2026-08-13 (会话#6) | **角色序列帧动画系统接入 + 动画细节打磨**。① 角色从 `fillRect` 占位美术替换为 9 个序列帧精灵动画（`PLAYER_ANIMS`/`loadPlayerSprites`/`drawPlayerSprite`，等比缩放对齐碰撞盒高度 80px，未加载回退手绘小人）；② 修正 `climb` 动画镜像基准（该资源默认面向左，与其他动画相反）；③ 同帧数成对动画（jump↔jumpShoot、running↔runShoot）切换时保留帧索引，逐帧对应；④ 射击动画缓冲：松开射击键后保留 0.25s 再切回；⑤ 跳跃三段式播放（起跳前4帧→空中定格第4帧→落地播尾段3帧）；⑥ 动画播放速度加速 1.5 倍（frameDur = 60/fps/1.5）。 |
| 2026-08-13 | **序列帧切割工具链 + 小蓄力子弹 sprite 接入**。① 新增 `sprite-cutter.html`（绿幕去除 + 框选动画行 + 分割线 + 导出等宽条带/JSON）和 `sprite-build.js`（零依赖本地生成脚本）；② 修复去绿幕算法：从「宽泛阈值删绿」改为「精确删纯绿(0,255,0)」，避免误删前景绿色描边；③ `resetView()` 不再默认选整图，自动选第一行；④ `prototype.html` 接入小蓄力子弹 sprite 动画（`middle-bullet-flying_strip (1).png`，5帧×40×19，显示 54×36 匹配碰撞体积，支持镜像）。 |
| 2026-08-10 | **项目初始化**。创建 Rockman X4 操作原型，实现 X 核心移动+射击机制。单文件 `prototype.html` 实现。 |
| 2026-08-11 (上午) | **文档同步**。修正 §5 关卡尺寸，全量交叉比对。 |
| 2026-08-11 (下午) | **关卡编辑系统**。新增 JSON 关卡配置系统（level.json + DEFAULT_LEVEL fallback）、可视化编辑模式（E 键切换）、长按放置/删除砖块和敌人、中键拖拽平移摄像机、滚轮缩放（0.2x~4.0x）、Ctrl+S 导出 JSON、动态地图扩展（边界外放置自动扩大地图+偏移敌人坐标）、摄像机居中跟随（水平+垂直）。文档全覆盖同步。 |
| 2026-08-12 | **玩家出生点可编辑**。level.json / DEFAULT_LEVEL 新增 `playerSpawn` 字段；新增 `getPlayerSpawn()` / `isSpawnValid()` 函数；编辑器新增"玩家出生点"工具（自由拖动、像素级放置，不受 tile 网格约束）；退出编辑模式时自动验证出生点不与地形/敌人重合，不合法时弹出提示并阻止退出；覆盖层显示青色 SPAWN / 红色 INVALID! 标记。 |
| 2026-08-12 (下午) | **序列帧处理讨论**。讨论了游戏开发中 Spritesheet 的标准工作流（Aseprite 导出 JSON vs 手工硬编码）；确认当前素材来源无配套 JSON，需要工具辅助测量帧参数；计划改造 `preview.html` 为双轨对比展示（自动检测边界线 vs 手动参数边界线），支持帧宽不统一时的手动调参。实际代码改动待后续执行。 |
