# 以撒·半回合制战斗 — 项目总览

> 文件: `Project-Issac-turnbase/isaac-turnbased-demo.html`（v2基础版）+ `isaac-turnbased-demo2.html`（v3道具系统版） | 单文件 ~4000+ 行 | 配套: `isaac-map-viewer.html` 房间编辑器 + `Configs/pool.json` 关卡池 + `Configs/floor-data.json` 楼层数据 + `Configs/monster-db.json` 怪物配置表 + `Configs/item-db.json` 道具数据库 + `Configs/item-drop-tables.json` 掉落表 | 文档: `isaac-memory.md` 项目决策记忆 + `isaac-turnbase-context.md` 策划+技术速查 | 编辑器通过 File System Access API 直读直写 JSON 文件，无需服务器 | 状态: 即时操作回合制 + 25种被动道具 + 宝箱/Boss掉落 + 小地图 + 访问记录不刷怪 + AP动态绑定 + DOM文字覆盖层(绕过Canvas像素缩放) + 战斗开始交叉剑动画 + Esc时间倒流动画 + 数据外置JSON加载 + 特效注册表系统 + 掉落表机制

---

# Part 1: 游戏策划文档

## 1. 游戏概述

### 1.1 游戏定位
**类型**: Roguelike 半回合制地牢战斗 | **原型平台**: 网页 Canvas | **目标平台**: Godot 引擎

### 1.2 核心概念
受《以撒的结合》启发，Roguelike 半回合制 + AP 行动点数系统（2026-07-15 重构），含探索模式(非战斗)与战斗模式两套操作逻辑：
- 回合开始时计算可移动范围（BFS，考虑墙壁和怪物阻挡），浅蓝色呼吸闪烁标示
- WASD 在可移动范围内**即时移动本体**（非预览），消耗 M-AP
- ↑↓←→ **即时射击**（非预览），立即发射子弹，消耗 A-AP
- 射击后锁定可移动范围从当前位置重新计算（内部 checkpoint，玩家无需感知概念）
- Esc **全重置**本回合所有操作和结果（角色/怪物/环境回到回合开始时），触发时间倒流动画
- Space **直接结束回合** → 切换怪物回合（无二次确认弹窗）
- 操作键：WASD 移动、↑↓←→ 射击、Space 结束回合、Esc 全重置、R 重置游戏
- 标准矩形像素风格渲染，文字通过独立 DOM 覆盖层渲染保证清晰度

### 1.3 玩家属性

| 属性 | 值 | 说明 |
|------|-----|------|
| 血量 HP | 3/3 (心形) | 3颗心，支持半心显示 (0.5伤害=半心) |
| 移速 | 3 | M-AP 上限 = 移速 → 默认 3 (下限1) |
| 射速 | 3 | A-AP 上限 = 射速 → 默认 3 (下限1) |
| 攻击力 | 3.5 | 每发子弹对怪物伤害 |
| 射程 | 6 | 子弹最远飞行距离（格） |
| 运气 | 0 | 影响掉落/暴击等（未实现） |

### 1.4 设计目标
- 探索将 Roguelike 回合制与 AP 行动点数预操作结合的可行性
- 用纯 Canvas 像素绘制快速验证核心玩法

### 1.5 怪物系统

**怪物配置数据库** `MONSTER_DB`（4种怪物），数据来源 `Configs/monster-db.json` 外部 JSON 配置文件：

| cfgId | 名称 | HP | 伤害 | 移速周期 | AI类型 | 颜色叠加(tint) | 移动标签 | 角色 | 威胁值 |
|-------|------|-----|------|----------|--------|---------------|:--:|:--:|:--:|
| `crack_maw` | 裂口尸 | 10 | 0.5 (半心) | [2,1] | chase | 无 | 地面 | melee | 3 |
| `flying_eye` | 浮游眼 | 6 | 0.5 (半心) | [1,1] | ranged_kite | 蓝紫半透 | 飞行 | ranged | 2 |
| `rock_golem` | 岩石魔像 | 20 | 1 (1心) | [1,1] | chase | 棕半透 | 地面 | tank | 5 |
| `boss_maw_king` | 裂口之王 | 45 | 1 (1心) | [3,2] | boss_chase | 红橙半透 | 地面,飞行 | boss | 15 |

**新增字段说明**：
- `movementTags`：怪物移动特征标签，用于与房间 `allowedMovement` 做标签匹配。`地面` 表示只能在地面行走（无法穿越深坑），`飞行` 表示可无视地形障碍
- `role`：战斗角色定位（melee/ranged/tank/boss），用于组合规则保证类型多样性
- `threat`：威胁值，用于点数预算消耗，控制每房间怪物总体难度

**AI 行为类型枚举** `AI_TYPE`（6种）：

| aiType | 行为描述 |
|--------|---------|
| `chase` | 向玩家追踪移动（默认） |
| `ranged_kite` | 保持距离追踪 |
| `charge` | 每3回合双倍移速冲锋（上限4格） |
| `boss_chase` | 追踪 + 每4回合额外+1移速 |
| `patrol` | 5格内感知追击，否则原地 |
| `stationary` | 不移动 |

**生成方式**：
- **自动刷怪**：`spawnRoomMonsters()` — 进入房间/楼层切换时自动调用，三层递进：
  1. **标签过滤**：怪物 `movementTags` 与房间 `allowedMovement` 取交集，仅匹配的怪物可生成
  2. **组合规则**：优先保底 1 只近战（如有），后续按角色多样性加权（未出现的 role ×3 权重）
  3. **点数预算**：总预算 = 房间 `budget` + (楼层-1) × 2，按怪物 `threat` 消耗填充
  - Boss 房固定生成 `boss_maw_king`，起点房不生成怪物
- **调试生怪**：C键或"生怪"按钮 → `spawnMonster()` 生成 1 只地面标签随机怪

**移动与碰撞**：
- 所有怪物同时逐步移动 (0.15s/步)，平滑动画插值 170px/s
- 怪物之间不可重叠（occupied Set排队）；撞玩家 → 伤害由怪物类型决定 + 怪物占格共处（无击退/反弹）
- 玩家撞怪物 → 按怪物类型计算伤害（`damagePlayer`），可穿过共格。接触伤害走曼哈顿轨迹回溯。BFS不挡怪物格。（2026-07-21重构：移除击退/反弹系统）
- 尖刺地格：怪物经过 → 受到 5 点伤害；玩家踩上 → 受到 1 心伤害

**视觉**：
- 使用角色精灵+朝向，红色血条 (黑色底槽+百分比填充)，受击白闪+抖动
- 每只怪物通过 `tint` 半透明色彩叠加区分类型（浮游眼蓝紫/魔像棕/Boss红橙）
- 头顶名称标签（Boss红字突出，普通棕色）
- 路径预览：红色粗箭头闪烁 (仅在玩家回合显示)
- 伤害反馈：黄色飘字迸发 + 血条白色延迟扣除动画 + 血雾粒子
- 死亡：18颗血粒子爆浆特效

**每只怪物独立属性**：
- `moveCycle`：每个怪物独立的移速周期数组，不再全局共享
- `damage`：每个怪物独立的碰撞伤害
- `aiType`：AI 行为路由（`calcAllMonsterPaths()` 中 switch 分发）
- `tint`：RGBA 色彩叠加，渲染时传入 `drawCharacterAt()`

**无敌系统**：`invincibleSteps = 移速×2` 步数制，固定时长不刷新。
- 每步移动 → `invincibleSteps--`；未消耗 M-AP 结束时也递减
- 无敌期间可穿过怪物不受伤，`damagePlayer` 内部跳过
- 接触伤害走曼哈顿轨迹回溯：踩怪格扣血+无敌，后退超接触步撤销；离开怪物格不撤销

**接触伤害系统**（2026-07-21重构）：
- 基于移动轨迹 `turnMovePath`，每个节点记录 `invincibleSteps`
- `recalcContactDamage(nx,ny)`：新位置在轨迹中→回溯恢复无敌值；新位置→追加
- `turnContactStepIdx` 标记触发接触的步数；后退超过该步 → 回血+回无敌
- Checkpoint 射击时 commit 接触状态，不再撤回
- 回合开始时调用一次，检测是否已站在怪物上

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
- **射击 Checkpoint**：首次射击时保存位置（`checkpointPos`），之后可移动范围从当前位置重新计算（内部机制，玩家无需认知）
- **Esc 全重置**：恢复完整回合快照（`turnSnapshot`），玩家/怪物/HP 全部回到回合开始时状态，伴随时间倒流动画
- **回合快照**：`saveTurnSnapshot()` 保存玩家坐标/HP、怪物坐标/HP 等；`restoreTurnSnapshot()` 恢复
- **可移动范围计算**：`calcReachableTiles(fromCol, fromRow, maxSteps)` BFS，排除墙壁和怪物占据格

### 2.4 角色移动与精灵动画

- 玩家占据网格坐标 (col, row)，初始位置 (6, 3)
- **探索模式**：WASD 自由移动（无 AP 限制），按方向键切换房间
- **战斗模式**：WASD 在可移动范围(浅蓝呼吸)内即时移动本体，每步消耗 1 M-AP；方向键射击消耗 A-AP；角色右上角黄色圆点实时显示剩余 A-AP
- **走路动画**：移动时播放精灵图集 10 帧走路循环（80ms/帧）
- 移动受限：网格边界外不可移动，墙壁/怪物格不可通行
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

- 即时射击：按方向键立即从角色位置发射子弹
- 子弹三阶段：飞行（匀速）→ 下落（水平减速+垂直加速）→ 碎裂为粒子
- 碎裂粒子：10 个，持续 0.25 秒，溅射随机分布
- 子弹像素绘制：光晕（两层半透明方块）+ 发光核心 + 拖尾像素

### 2.7 TILE 瓷砖系统

房间内部由 13×7 格 TILE 组成，六种类型：

| TILE | 字符 | 名称 | 可行走 | 说明 |
|------|------|------|--------|------|
| FLOOR | `.` | 普通地面 | ✅ | 默认地面 |
| ROCK | `#` | 岩石 | ❌ | 阻挡通行和子弹 |
| POOP | `P` | 便便 | ❌ | 可破坏(受击3次)，挡子弹 |
| PIT | `_` | 深渊 | ❌ | 踩上即死或掉落 |
| SPIKE | `^` | 尖刺 | ✅ | 踩上扣 1 心(玩家)/5 HP(怪物) |
| LADDER | `▼` | 梯子 | ✅ | Boss房踩上进入下一层 |

- 门位：每边正中（上6,0 / 下6,6 / 左0,3 / 右12,3），这些格必须为可通行地面
- `drawTiles()`：使用 `cellRect()` 透视坐标渲染六种瓷砖（岩石叠层/便便棕块/深渊/尖刺菱形/梯子深坑）
- `drawDoors()`：房门渲染（打开=深色通道+门框/关闭=铁栏纹理+横竖铁条），区分上下/左右方向实现

### 2.8 多房间楼层系统

- **楼层结构**：随机图生成 6 层地牢，每层 8~15 个房间，BFS 全连通验证
- **房间类型**：start(起点)/normal(普通)/treasure(宝箱)/boss(Boss)/shop(商店)
- **模板系统**：每个房间引用 `pool.json` 中的模板(tplKey)，生成时解析 TILE 布局
- **门系统**：每房间最多 4 扇门(每个方向一扇)，房间清怪后门自动打开(`updateDoorsLocked()`)
- **探索模式** `inCombat=false`：无怪物时 WASD 自由移动，门前格+方向键切换房间(滑动过渡400px/s)
- **战斗模式** `inCombat=true`：有怪物时 AP 回合制，Space 结束回合，清怪后门打开
- **Boss 梯子**：B 键在 Boss 房当前位置放置 `TILE.LADDER`，踩上自动 `enterFloor()` 进入下一层起始房
- **楼层持久化**：`floor-data.json` 保存楼层结构+房间 grid，加载时保留已存 grid（修改关卡池不影响已有楼层）
- **`cellRect(col,row)`**：返回透视投影后格子中心坐标/尺寸，供 TILE 和门渲染使用

### 2.9 投影系统

```
缩放因子 s(y) = VP_SCALE_TOP + t * (VP_SCALE_BOT - VP_SCALE_TOP)
其中 t = (y - FLOOR_T) / (FLOOR_B - FLOOR_T)，归一化到 [0, 1]
```

| 参数 | 值 | 说明 |
|------|-----|------|
| VP_SCALE_TOP | 1.00 | 画面上端缩放（已取消透视，为标准矩形） |
| VP_SCALE_BOT | 1.00 | 画面下端缩放 |
| VP_CX | 159 | 投影中心 X 坐标 |

- 投影公式：`screenX = VP_CX + (worldX - VP_CX) * s` → 等同 `screenX = worldX`（恒等映射）
- 角色、子弹、粒子均等比例渲染（无 Y 轴缩放变形）
- 地板砖块为标准正方形，网格线为直线

### 2.10 粒子系统

| 属性 | 值 |
|------|-----|
| 重力加速度 | 180 像素/秒² |
| 碎裂粒子数 | 10 个 |
| 持续时间 | 0.25 秒 |

- 子弹死亡时迸发粒子：随机角度、随机速度、两种颜色（金黄/橙）
- 粒子有生命周期，随时间淡出

### 2.11 游戏状态机 (turnState.phase)

```
player_select ──→ monster_turn ──→ player_select
     │    ↑
     │    └── Esc (重置回合 + 时间倒流动画)
     └── Space (直接结束回合)
```

| 阶段 | 说明 |
|------|------|
| `player_select` | 即时操作：WASD移动本体、↑↓←→即时射击、Esc全重置、Space直接结束回合(未消耗M-AP计无敌) |
| `monster_turn` | 怪物AI路由分发→逐步移动(每怪独立移速/dmg)→碰撞+尖刺检测，完成后重置AP |

- 无预操作队列，所有行为即时生效
- `hasShot` 标记首次射击（内部 checkpoint）
- Esc 全重置本回合 → `restoreTurnSnapshot()` + 时间倒流动画
- Space 直接进入 `monster_turn`（无二次确认弹窗）

### 2.12 道具系统

**道具数据库** `ITEMS_DB`（25种被动道具），数据来源 `Configs/item-db.json` 外部 JSON 配置文件，通过 `loadItemDB()` 异步加载。

| 品质 | 数量 | 边框颜色 | 示例 |
|------|------|---------|------|
| 普通(common) | 15 | 棕色 | 伤心洋葱、皮带、耶稣果汁、铁块、铁丝衣架、早餐、午餐、晚餐、甜点、狂暴针、速度针、螺钉、合成针、五芒星、肉！ |
| 稀有(rare) | 7 | 蓝色 | 光环、魔法蘑菇、圣痕、生长激素、丘比特之箭、冠军腰带、印记 |
| 传说(legendary) | 3 | 金色+呼吸光效 | 圣心、蟋蟀的头、死神的镰刀 |

**属性效果** `effects`：
- `maxHp`：HP 上限增加
- `attack`：攻击力增加
- `fireRate`：射速增加（→ 对应 A-AP 上限）
- `moveSpeed`：移速增加（→ 对应 M-AP 上限）
- `range`：射程增加

**特殊效果** `specials[]`（结构化声明，经 `SPECIAL_EFFECT_HANDLERS` 注册表分发）：

| 特效类型 | 效果 | 拥有道具 |
|---------|------|---------|
| `piercing` | 子弹穿透敌人（不销毁，不重复伤害同一目标） | 丘比特之箭、死神的镰刀 |
| `damage_mult` | 伤害倍率（mult 参数） | 蟋蟀的头(×1.5) |
| `heal_full` | 拾取时回复全部 HP | 早餐/午餐/晚餐/甜点/肉！/魔法蘑菇/圣心 |

**掉落系统** `item-drop-tables.json`：
- 三张掉落表按房间类型分配品质权重：

| 掉落表 | common | rare | legendary | 适用场景 |
|--------|--------|------|-----------|---------|
| `default` | 60% | 30% | 10% | 普通房间清怪 |
| `treasure_room` | 0% | 75% | 25% | 宝箱房 |
| `boss_room` | 25% | 45% | 30% | Boss房清怪 |

**拾取与叠加**：
- F 键拾取道具，加入 `playerInventory` 数组
- `recalcAllStats()` 遍历背包，累加 `effects` 数值属性 + 遍历 `specials[]` 调用注册表 handler
- 穿透不叠加（布尔值），伤害倍率可叠加（`damageMultiplier *= mult`）
- HP 上限提升后当前 HP 等比增加

**道具栏 UI**：底部图标横排（品质边框颜色），悬浮显示道具名+描述+来源提示

---

## 3. 界面与交互

### 3.1 操作方式

| 按键 | 阶段 | 功能 |
|------|------|------|
| W / A / S / D | 探索/战斗 | 探索模式自由移动；战斗模式在可移动范围(浅蓝呼吸)内即时移动本体 |
| W/A/S/D + 门前格 | 探索 | 站在门前格+按门方向键 → 切换房间(带滑动过渡动画) |
| ↑ / ↓ / ← / → | 战斗 | 即时射击（按即发射） |
| 空格 | 战斗 | 直接结束回合 → 进入怪物回合（无二次确认弹窗） |
| Esc | 战斗 | 全重置本回合 + 时间倒流动画（角色/怪物/HP 全部回到回合开始时） |
| F | 任意 | 拾取道具（demo2） |
| R | 任意 | 重置游戏 → 回到第1层起点 |

### 3.2 UI 面板

| 面板 | 内容 |
|------|------|
| HP | 当前血量/上限 (3心形制，支持.5半心) |
| A-AP | 剩余攻击点数/上限 (橙色圆点) |
| M-AP | 剩余移动点数/上限 (蓝色圆点) |
| A-AP 圆点 | 战斗时角色右上角黄色圆点 + 数字，用尽变灰色空心 |
| 阶段 | 当前回合阶段文字 + 颜色标记 |
| 回合 | 当前回合编号 |
| 属性 | 攻击力3.5 射程6 运气0 |
| **状态栏** | 棋盘下方，显示 [自由]/[已锁定] + 当前 M-AP, A-AP 剩余/上限（探索模式隐藏） |
| **楼层信息** | 左上角显示当前楼层名+房间类型+tplKey |
| **可移动范围** | BFS 计算的浅蓝色呼吸闪烁方格（仅战斗模式） |
| **DOM 覆盖层** | Canvas 上方独立的 HTML 文字层，绕过 `image-rendering:pixelated` 渲染清晰文字 |

---

## 4. 游戏流程（当前原型）

1. 页面加载 → `loadTemplates()` 加载关卡池 → `loadOrGenerateFloors()` 加载/生成6层地牢
2. `enterFloor(1)` → 进入第1层起始房间 → 探索模式(`inCombat=false`)
3. **探索模式**：
   - WASD 自由移动，不受 AP 限制
   - 走到门前格+按方向键 → 滑动过渡切换房间
   - 进入新房间 → `updateRoomCombatState()`：已访问过且清空则不刷怪，有怪则进入战斗
   - 踩到梯子 → `enterFloor()` 进入下一层
   - 踩到尖刺 → `damagePlayer(1心)`；无敌保护：移速×2步
   - AP 面板在探索模式下隐藏
4. **战斗模式** `player_select`：
   - 进入战斗触发"交叉剑"动画（两剑从左右飞入旋转碰撞）
   - WASD 在浅蓝可移动范围内即时移动本体，每步 -1 M-AP
   - ↑↓←→ 即时射击，-1 A-AP，角色右上角黄色圆点实时显示 A-AP
   - Esc → 时间倒流动画 + 恢复回合快照
   - Space → 直接结束回合（无弹窗）→ monster_turn
5. `monster_turn` → 每怪独立移速/AI路由 → 怪物逐步移动 + 碰撞(按类型伤害) + 尖刺5伤害 → `updateRoomCombatState()`
   - 清怪 → 门打开 → 回到探索模式
   - 有怪 → 继续战斗，回合数+1
6. 6层通关后游戏结束（当前无通关处理）

---

# Part 2: 技术架构速查

## 1. 架构概览

```
单文件 HTML (isaac-turnbased-demo.html ~2400行, demo2.html ~3900行)
├── CSS: UI 样式 + DOM 文字覆盖层样式 (.txt-monster-name/.txt-damage/.txt-aap)
├── HTML: Canvas 游戏容器 + #text-overlay 覆盖层 + 状态栏 (#action-bar) + UI 面板
└── JavaScript
    ├── 渲染配置 & 精灵图集 (SPRITE)
    ├── 投影系统 & 坐标转换
    ├── TILE 瓷砖系统 (FLOOR/ROCK/POOP/PIT/SPIKE/LADDER 六种)
    ├── 玩家属性 (playerStats: HP/移速/射速/攻击/射程/运气)
    ├── 运行时状态 (player pos/animation/invincibleSteps)
    ├── 回合状态 (turnState: phase/AP/hasShot/reachableTiles/turnNumber)
    ├── 快照系统 (saveTurnSnapshot, restoreTurnSnapshot — 支撑Esc全重置)
    ├── 可移动范围 (calcReachableTiles BFS, refreshReachableTiles)
    ├── AP 管理 (resetTurnAP)
    ├── 动画系统 (battleStartAnim 交叉剑 / rewindAnim 时间倒流)
    ├── 房间/楼层系统 (loadTemplates/generateFloor/enterFloor/updateDoorsLocked/tryWalkIntoDoor)
    ├── 渲染系统 (drawWalls/Floor/Tiles/Doors/Grid/ReachableOverlay/Player/Bullets/Particles/Monsters)
    ├── 角色渲染 (drawCharacterAt — 统一角色绘制)
    ├── DOM 文字覆盖层 (updateTextOverlay — 怪物名/伤害飘字/A-AP圆点，绕过Canvas像素缩放)
    ├── 移动系统 (探索自由移动 + 战斗AP移动 + 场景过渡动画)
    ├── 子弹系统 (spawnBullet, updateBullets, shatterBullet)
    ├── 粒子系统 (updateParticles) & 受伤系统 (damagePlayer)
    ├── 怪物系统 (MONSTER_DB 配置表 + AI_TYPE 枚举 + AI行为路由 + calcAllMonsterPaths/startMonsterTurn/updateMonsterTurn/spawnMonster)
    ├── 道具系统 (ITEMS_DB 道具数据库 + SPECIAL_EFFECT_HANDLERS 特效注册表 + playerInventory 背包 + recalcAllStats 属性重算)
    ├── 掉落系统 (item-drop-tables.json 掉落表 + rollItem 按品质权重随机)
    ├── 数据加载层 (loadMonsterDB/loadItemDB/loadDropTables — 异步fetch JSON配置文件)
    ├── UI 更新 (updateUI, updateActionBar, updateFloorUI)
    ├── 输入处理 (keydown — WASD移动/箭头射击/Esc重置/Space结束/R重置/F拾取)
    └── 游戏循环 (gameLoop → requestAnimationFrame)
```

## 2. 渲染配置与常量

```javascript
GAME_W = 318, GAME_H = 186, DISPLAY_SCALE = 3
WALL = 16, CELL = 22, COLS = 13, ROWS = 7
BULLET_MAX_DIST = 6.0, BULLET_SPEED = 560
MOVE_SPEED = 140, EXEC_MOVE_SPEED = 170, GRAVITY = 360
SHATTER_PARTICLES = 10, SHATTER_DURATION = 0.25
VP_SCALE_TOP = 1.00, VP_SCALE_BOT = 1.00
// 动画常量
BATTLE_START_DURATION = 0.55, REWIND_DURATION = 0.35
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

## 4. 投影公式

```javascript
// vpScale(wy) → 返回缩放因子 s = 1.00（恒等，无透视变形）
function vpScale(wy) {
  const t = clamp((wy - FLOOR_T) / (FLOOR_B - FLOOR_T), 0, 1);
  return VP_S + t * (VP_E - VP_S);  // 1.00 + t * 0.00 = 1.00
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
| `loadTemplates()` | 加载 `pool.json` 关卡池模板→`poolTemplates` |
| `loadMonsterDB()` | 异步 fetch `monster-db.json` → `MONSTER_DB` + `_rebuildMonsterPools()` |
| `loadItemDB()` | 异步 fetch `item-db.json` → `ITEMS_DB` 道具数据库 |
| `loadDropTables()` | 异步 fetch `item-drop-tables.json` → `DROP_TABLES` 掉落表 |
| `rollItem(quality?, tableKey?)` | 按品质/掉落表权重随机抽取道具配置ID |
| `spawnItemOnGrid(col, row, cfgId)` | 在指定网格位置生成道具实体 |
| `recalcAllStats()` | 遍历背包重算所有属性（effects 数值累加 + specials[] 注册表分发） |
| `getTpl(key)` | 按 key 获取模板，优先 poolTemplates，回退内置 |
| `generateFloor(floorNum)` | 随机生成单层地牢：图生成+BFS连通+布局+门分配+模板填充 |
| `generateAllFloors()` | 生成全部 6 层地牢 |
| `loadOrGenerateFloors(forceReload)` | 从 `floor-data.json` 加载楼层数据（hash 变化时触发重置） |
| `resetGameToFloor1()` | 重置游戏状态回到第1层起点（R键调用） |
| `enterFloor(floorNum)` | 进入指定楼层起始房间 |
| `tryWalkIntoDoor(fromCol,fromRow,dir)` | 检测门触发：站在门前格+按方向→切换房间 |
| `updateRoomCombatState()` | 更新战斗/探索状态，触发回合初始化或结束 |
| `updateDoorsLocked()` | 根据 inCombat 开关门（战斗=锁/探索=开） |
| `damagePlayer(amount)` | 玩家受伤：战斗/探索统一无敌移速×2步（战斗中结束回合时未消耗M-AP也计入） |
| `drawCharacterAt(px,py,facing,walkFrame,shootTimer,alpha,tint)` | 通用角色渲染，支持透明度/无敌闪烁/tint色彩叠加 |
| `drawReachableOverlay()` | 渲染浅蓝色呼吸闪烁可移动方格 |
| `drawBattleStartSwords()` | 战斗开始交叉剑动画：两剑从左右飞入旋转碰撞火花 |
| `drawRewindEffect()` | Esc全重置时间倒流动画：蓝色收缩光圈 + 白色闪光 |
| `updateTextOverlay()` | 管理 DOM 覆盖层文字（怪物名/伤害飘字/A-AP圆点） |
| `drawTiles()` | 渲染六种 TILE（岩/便/坑/刺/梯），使用 `cellRect()` 透视坐标 |
| `drawDoors()` | 房门渲染：开=通道+门框/关=铁栏纹理，区分上下左右 |
| `cellRect(col,row)` | 透视投影后格子中心坐标+尺寸，供 TILE/门渲染 |
| `drawWalls/Floor/GridHighlight/Bullets/Particles` | 各渲染子系统 |
| `spawnBullet(dir,fromPx,fromPy)` / `updateBullets(dt)` / `shatterBullet(b)` | 子弹生命周期 |
| `updateParticles(dt)` | 粒子物理+淡出 |
| `spawnMonster(cfgId?)` | 调试生怪：生成 1 只地面标签随机怪 |
| `spawnMonsterAtRandomPos(cfgId)` | 在随机可行走位置生成指定怪物，返回是否成功 |
| `spawnRoomMonsters()` | 混合刷怪主函数：标签过滤+组合规则+点数预算，进入房间/楼层时自动调用 |
| `calcAllMonsterPaths()` / `startMonsterTurn()` / `updateMonsterTurn(dt)` | 怪物回合系统：AI路由分发+每怪独立移速/移动路径计算 |
| `updateActionBar()` | 更新底部状态栏（探索模式隐藏 / 战斗模式显示 AP） |
| `updateUI()` / `updateFloorUI()` | 更新所有 DOM UI 面板（含AP面板显隐、楼层信息栏） |
| `gameLoop(timestamp)` | 主循环：动画→输入→子弹→粒子→怪物回合→渲染 |

## 6. 数据流

```
启动:
  loadTemplates() → poolTemplates
  loadMonsterDB() → MONSTER_DB (异步fetch monster-db.json)
  loadItemDB() → ITEMS_DB (异步fetch item-db.json)
  loadDropTables() → DROP_TABLES (异步fetch item-drop-tables.json)
  loadOrGenerateFloors() → allFloors (从 floor-data.json / 兜底 generateAllFloors)
  enterFloor(1) → 设置 currentFloor/currentRoomId/currentRoomGrid → spawnRoomMonsters()

探索模式 (inCombat=false):
  WASD → isWall检查 → 自由移动(col/row/px/py)
       → invincibleSteps递减 → 尖刺检测(damagePlayer) → 梯子(enterFloor)
       → tryWalkIntoDoor → 门前格+方向 → 房间切换(滑动过渡) → finishTransition → spawnRoomMonsters()

战斗模式 (inCombat=true):
  resetTurnAP() → 计算可移动范围 → 保存快照
  WASD → 检查 reachableTiles.has(key) → 移动本体 → M-AP-1 → invincibleSteps-- → refreshReachableTiles()
  ↑↓←→ → 即时 spawnBullet → A-AP-1 → 首次? 设 hasShot + checkpointPos
  Esc  → restoreTurnSnapshot() → 重置所有状态
  Space → 结束回合 → 未消耗M-AP计入invincibleSteps → monster_turn:
         calcAllMonsterPaths() → AI路由分发(每怪独立移速+dmg) → 怪物逐步移动+碰撞+尖刺5 → finishMonsterTurn
       → updateRoomCombatState (清怪则门开+切回探索)

渲染层序:
  gameLoop → render()
           → 墙壁 → 地板 → TILE瓷砖(岩/便/坑/刺/梯) → 房门(开/关)
           → 网格高亮 → 可移动范围(浅蓝呼吸) → 子弹 → 粒子
           → 怪物 → 角色本体(无敌闪烁)
           → 战斗开始剑动画 → Esc时间倒流动画
           → DOM 覆盖层独立渲染文字(怪物名/伤害飘字/A-AP圆点)
```

## 7. 项目文件清单

### 根目录

| 文件 | 类型 | 说明 |
|------|------|------|
| `isaac-turnbased-demo.html` | HTML/JS | 游戏原型主文件（~2400行，浏览器直接运行） |
| `isaac-map-viewer.html` | HTML/JS | 房间模板编辑器（File System Access API 直读直写，生成json手动复制） |
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
| `pool.json` | JSON | 关卡池数据文件（模板定义 + spawnConfig 刷怪配置，编辑器读写） |
| `floor-data.json` | JSON | 楼层生成数据（房间结构+grid，编辑器/游戏加载） |
| `monster-db.json` | JSON | 怪物配置数据（4种怪物 + movementTags/role/threat 混合刷怪字段） |
| `item-db.json` | JSON | 道具数据库（25种被动道具：effects 数值属性 + specials[] 结构化特效） |
| `item-drop-tables.json` | JSON | 道具掉落表（三张表：default/treasure_room/boss_room 按品质权重） |
| `isaac-room-pool - original backup.json` | JSON | 原始关卡池备份 |

### Documents/ (文档)

| 文件 | 类型 | 说明 |
|------|------|------|
| `isaac-turnbase-context.md` | 文档 | 本文档：策划+技术架构速查 |
| `isaac-memory.md` | 文档 | 项目决策记忆：所有重要决策演变、方案变更、问题攻克记录 |
| `isaac-roommonster-plan.md` | 文档 | 多房间地图+怪物配置+掉落系统设计方案 |
| `monster-random-plan.md` | 文档 | 混合刷怪系统方案（标签匹配+组合规则+点数预算实现文档） |
| `isaac-asset-desc.md` | 文档 | 资源替换步骤指南 |

---

## 最近更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-07-21(晚) | **数据外置 + 特效系统结构化 + 掉落表机制**。①MONSTER_DB 从内联 JS 改为 `loadMonsterDB()` 异步 fetch `monster-db.json`，新增 `_rebuildMonsterPools()`。②创建 `Configs/item-db.json`（25种道具完整配置）+ `Configs/item-drop-tables.json`（三张掉落表）。③`cfg.special` 字符串改为 `cfg.specials[]` 结构化数组，新增 `SPECIAL_EFFECT_HANDLERS` 注册表（piercing/damage_mult/heal_full），向后兼容旧格式。④`spawnTreasureRoomItem()` / `spawnBossRoomItem()` 改用掉落表机制。⑤monster-db.json 伤害值全面同步半心制。⑥新增 §2.12 道具系统策划章节。 |
| 2026-07-20 | **godot-setup-checklist.md 移至根目录 Documents/**。文件从项目专属文档升级为跨项目通用参考文档，从 context.md 文件清单中移除引用。 |
| 2026-07-20 | **三层记忆体系建立**。①新增 `Documents/isaac-memory.md`：从 context.md 全部历史记录 + chat-log + 当前会话三个数据源提取所有重要决策，按功能领域系统化整理（AP演变/无敌X→Y/怪物三次重构/尖刺调整/编辑器去服务器/道具系统等）。②新增根目录 `Documents/global-rules.md`：从 6 条 CodeBuddy Memories 迁移跨项目通用规范，补充时间戳和详细说明。③文件清单新增 isaac-memory.md 引用。④删除 `chat-log-2026-07-20.md`（内容已迁移到 memory.md）。⑤CodeBuddy Memories 新增"多端开发记忆同步"规则。 |
| 2026-07-20 | **道具系统 + 小地图 + 访问记录 + AP动态 + 编辑器文件直读 + demo2 + 服务器彻底移除**。①创建 `isaac-turnbased-demo2.html`（v3道具版），新增 25 种被动道具（15普通/7稀有/3传说），宝箱房必定掉落稀有道具、Boss房清怪后掉落。②道具属性叠加系统：攻击/射速/移速/射程/HP上限，其中射速→A-AP、移速→M-AP（Math.floor 向下取整），拾取道具后动态调整 AP。③特殊道具效果：穿透子弹（丘比特之箭/死神的镰刀）、伤害倍率（蟋蟀头 ×1.5）。④道具栏 UI（底部图标+悬浮提示）+ 拾取交互（F键）+ 品质区分（金/蓝/棕边框）。⑤右下角小地图（100×80px）：根据 floor.layout 绘制已探索房间（起点S/BossB/宝箱T），当前房间金色边框，未探索深色方块。⑥已进入房间不再刷怪：visitedRooms(Set) 追踪，finishTransition 检测重复进入。⑦编辑器彻底移除 server.js 依赖：模板池/楼层数据改用 File System Access API 直读直写（showOpenFilePicker + IndexedDB 记住句柄），"生成json"按钮弹出文本框供手动复制覆盖。⑧demo.html/demo2.html/map-viewer.html 三文件统一清理所有服务器相关代码（localhost:8080/BroadcastChannel），`loadTemplates` 和 `loadOrGenerateFloors` 改为直接 fetch `Configs/pool.json` 和 `Configs/floor-data.json`。⑨删除 `Configs/server.js`、`test-save.html`、`server.py`、`server.ps1`。 |
| 2026-07-16 | **混合刷怪系统（标签匹配+组合规则+点数预算）**。①怪物配置新增 3 字段：`movementTags`（移动特征标签：地面/飞行）、`role`（战斗角色：melee/ranged/tank/boss）、`threat`（威胁值点数）。②`pool.json` 每个房间模板新增 `spawnConfig`（`allowedMovement`/`minMonsters`/`maxMonsters`/`budget`），手动配置房间地形与怪物标签的匹配关系。③实现三层递进刷怪算法：标签过滤（怪物 movementTags ∩ 房间 allowedMovement）→ 组合规则（至少1近战保底 + 角色多样性加权×3）→ 点数预算（基础budget + (楼层-1)×2 递进）。④`enterFloor()` 和 `finishTransition()` 接入 `spawnRoomMonsters()` 自动刷怪；Boss房固定生成、起点房无怪。⑤生成 `Documents/monster-random-plan.md` 方案文档。⑥同步更新上下文文档相关章节。 |
| 2026-07-16 | **怪物配置表外置 + 参数文档化**。①创建 `Configs/monster-db.json` 外部 JSON 配置文件，将怪物配置从内联 JS 对象迁移为独立数据文件，便于编辑和维护。②文档化所有怪物参数字段含义：`id`（标识符）、`name`（显示名）、`hp`（生命值）、`damage`（碰撞伤害）、`moveCycle`（移动周期数组）、`aiType`（AI类型：chase/ranged_kite/boss_chase）、`aiRange`（远程AI距离）、`tint`（颜色叠加）、`dropTable`/`dropRate`（掉落表与概率，待后续系统确认）、`roomTypes`（出现房间类型）。③同步更新上下文文档相关章节。 |
| 2026-07-16 | **怪物配置表接入+无敌统一+尖刺伤害修正**。①`MONSTER_CFG` 替换为 `MONSTER_DB` 怪物配置数据库：4种怪物（裂口尸/浮游眼/岩石魔像/Boss裂口之王），每怪独立 `moveCycle`/`damage`/`aiType`/`tint`。②`AI_TYPE` 枚举 6 种 AI 行为类型（chase/ranged_kite/patrol/charge/stationary/boss_chase），`calcAllMonsterPaths()` 新增 AI 路由分发。③C键/生怪按钮改为随机生成怪物（95%普通池+5%含Boss），`spawnMonster(cfgId?)` 支持指定类型。④怪物渲染增加 tint 色彩叠加区分类型 + 头顶名称标签（Boss红字）。⑤无敌系统统一：移除 `invincibleTurns`，战斗/探索均使用 `invincibleSteps = 移速×2` 步数制；战斗模式结束回合时未消耗 M-AP 计入无敌步数消耗（只读，不影响 AP 系统）。⑥尖刺伤害修正：玩家 2 点、怪物 5 点（新增怪物尖刺判定）。⑦怪物碰撞伤害按类型区分（裂口尸/浮游眼=1，魔像/Boss=2）。 |
| 2026-07-16 | **探索模式无敌+房门重绘+透视取消+编辑器验证+楼层grid固化+清理**。①探索模式受伤触发步数制无敌：`invincibleSteps=移速×2`（移速=3→6步），每移动一格递减，受伤格为第1步，到0消失；战斗模式保持回合制无敌3回合。②`drawDoors()` 重绘：移除绿色提示块，使用 `cellRect()` 透视坐标渲染房门（打开=深色通道+门框/关闭=铁栏纹理+横竖铁条），区分上下/左右方向。③取消房间透视变形：`VP_SCALE_TOP` 改为 1.00，`project()` 变为恒等映射，地板网格/瓷砖/门全部恢复标准矩形。④R键直接用 `resetGameToFloor1()` 重置，不再经过 `loadOrGenerateFloors()`。⑤编辑器 `closeEditor(true)` 保存前强制 `validateTiles()` 验证，门阻塞或不连通时拒绝保存。⑥楼层 grid 固化：加载 `floor-data.json` 时保留已存 grid（仅缺失时模板兜底），修改 `pool.json` 不再影响已生成楼层。⑦删除无用的根目录 `pool.json`（已迁移至 `Configs/`）。同步更新设计文档。 |
| 2026-07-16 | **楼层生成规则强化 + 布局/门系统修复**。①房间类型约束：Boss 房和宝箱房强制度数=1（单门死路），图生成阶段保证至少 3 个叶节点（start/boss/treasure 各一）。②所有房间度数 ≤4（每方向最多一扇门），生成树构建时跳过已满节点，额外边也做度数上限检查，杜绝一门连多个房间。③布局强制相邻：连接房间必须 Manhattan 距离=1，采用随机顺序重试机制（最多 30 次）确保相邻放置可行；渲染层兜底 L 形线绝不画斜线。④门一致性校验：分配时检测方向覆盖冲突，分配后验证每个房间门数=边数。⑤`isaac-map-viewer.html` 新增 `CACHE_KEY` 机制：手动选择/同步文件后缓存到 localStorage，启动时优先读取，无需每次重新选文件。同步更新 `isaac-roommonster-plan.md` 设计文档。 |
| 2026-07-16 | **项目文件分类整理 + 编辑器保存机制重构**。项目文件按类型重组到子目录：`Assets/`（图片素材）、`Configs/`（pool.json 关卡池 + server.js 文件读写服务 + 原始备份）、`Documents/`（全部 md 文档）。清理冗余文件：删除失败的 server.py、cgi-bin/、err.log、out.log。`isaac-map-viewer.html` 编辑器保存机制改用 `<form>` POST + 隐藏 `<iframe>` 绕过 IDE 代理拦截，通过 `server.js` (Node.js) 实现可靠的 pool.json 文件读写。新增文件管理规则：不随意删除或重命名用户手动新增文件，操作前需经用户同意。 |
| 2026-07-15 | **房间框架实现：TILE 系统 + 12 种模板 + 地图编辑器**。定义 5 种 TILE 类型（FLOOR/ROCK/POOP/PIT/SPIKE）及行为属性表，确定门系统（每边正中一个门前格，不占格子）。设计 12 种 13×7 房间模板（含便便/尖刺），全部通过自动化 BFS 连通性验证（4门位在曼哈顿移动下全连通）。创建 `isaac-map-viewer.html` 独立编辑器：模板池管理（查看/编辑/复制/删除）、13×7 画布绘制（5色调色板+撤销）、6 种 Isaac 风格自动生成图案（角岩/十字/石墙/石柱/斜线/中柱）、双模式关卡池持久化（File System Access API 直读直写 + 文件选择器/下载回退）、`isaac-room-pool.json` 数据文件、楼层生成预览。更新 `isaac-roommonster-plan.md` 同步设计方案为已实现状态。 |
| 2026-07-15 | **核心交互重构：即时操作 + ESC 全重置**。彻底移除预操作队列系统（`actionQueue`/`player_shoot_dir`/`player_execute`），改为即时操作模型：WASD 在 BFS 可移动范围(浅蓝呼吸)内即时移动本体、↑↓←→ 即时射击发射子弹。新增回合快照系统 (`saveTurnSnapshot`/`restoreTurnSnapshot`) 支撑 Esc 全重置（角色/怪物/环境全部回到回合开始时）。射击后触发 checkpoint (`hasShot`/`checkpointPos`) 并刷新可移动范围。回合起始位置保留半透明幽灵作视觉参考。同步调整初始属性 (移速3→M-AP=3, 射速3→A-AP=3, 均系数1下限1)。更新上下文文档全部相关章节。 |
| 2026-07-14 | **多房间地图设计方案**：创建 `isaac-roommonster-plan.md`，包含楼层生成算法（随机图生成 + BFS 全连通检查，采用以撒模式无走廊）、房间类型分配（start/normal/treasure/shop/boss）、模板法内部布局、怪物配置表（MONSTER_DB 内联 JS 对象）、掉落系统（权重随机 + DROP_TABLES）、AI 行为类型枚举、道具被动能力提升。方案基于现有 13×7 单房间框架扩充为 Roguelike 多房间系统。 |
| 2026-07-13 | 集成精灵图集渲染：使用 `issac-idle.png`（32×32 每帧）替代程序化像素角色。实现头身分离叠加（头偏移 body 30%）、4 方向 × 10 帧走路动画、射击表情切换（0.4s 持续）。背面缺失方向暂复用正面帧。移动速度从 280 → 70 px/s 以适配动画播放。新增 `sprite-debug.html` 和 `walk-preview.html` 调试工具。更新文档各节编号，修正函数索引、数据流和文件清单。 |
| 2026-07-13 | 首次创建项目上下文文档（isaac-turnbase-context.md），记录 HTML Canvas 原型的技术架构、核心系统、关键函数索引与数据流。 |

---

> **下一步方向**：完善 AI 行为（ranged_kite 远程射击 / stationary 远程攻击需子弹系统）、掉落系统扩展（消耗品/饰品）、商店房间交易功能、Sound/FX 音效系统。后续可迁移到 Godot 引擎。参考 `godot-setup-checklist.md` 中的实现思路。物品掉落基础已完成（道具掉落表 + 品质权重分配）。
