# 以撒·半回合制战斗 — 项目总览

> 文件: `Project-Issac-turnbase/isaac-turnbased-demo2.html`（v3道具系统版，主开发文件） | 配套: `isaac-map-viewer.html` 房间编辑器 + `Configs/pool.json` 关卡池 + `Configs/floor-data.json` 楼层数据(含roomClearDrop配置) + `Configs/monster-db.json` 怪物配置表(含loot) + `Configs/item-db.json` 道具数据库(含itemDropTables, 9张item_drop_*表) + `Configs/resource-db.json` 资源数据库(定义+11张resource_drop_*掉落表+宝箱loot) + `Configs/spawn-config.json` 楼层刷怪配置(floorBudgets+terrainModifiers运行时计算) + `Configs/squad-templates.json` 怪物小队模板(squad组合+预算+标签+楼层限制) | 文档: `isaac-memory.md` 项目决策记忆 + `isaac-turnbase-context.md` 策划+技术速查 | 编辑器通过 File System Access API 直读直写 JSON 文件，无需服务器 | 状态: 即时操作回合制 + 25种被动道具 + 统一掉落调度器(rollLoot) + 资源掉落系统(mode驱动) + 宝箱/Boss掉落 + 小地图 + 访问记录不刷怪 + AP动态绑定 + DOM文字覆盖层 + 战斗开始交叉剑动画 + Esc时间倒流动画 + 数据外置JSON加载 + 特效注册表 + Boss Jumper 2×2跳跃Boss + 怪物行动系统重构(actionMode+actions[]) + 掉落表命名统一(item_drop_/resource_drop_前缀) + roomClearDrop配置驱动 + 刷怪配置运行时计算(resolveSpawnConfig) + 小队模板系统(squad-templates.json + SQUAD_TEMPLATES + 锚点聚拢生成)

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
| 血量 HP | 3/3 (心形) | 3颗红心，支持半心显示。总红心+蓝心上限=**12**（`MAX_TOTAL_HEARTS`），红心上限增加优先于蓝心（满时可替换蓝心） |
| 移速 | 3 | M-AP 上限 = 移速 → 默认 3 (下限1) |
| 射速 | 3 | A-AP 上限 = 射速 → 默认 3 (下限1) |
| 攻击力 | 3.5 | 每发子弹对怪物伤害 |
| 射程 | 6 | 子弹最远飞行距离（格） |
| 运气 | 0 | 影响掉落/暴击等（未实现） |

### 1.4 设计目标
- 探索将 Roguelike 回合制与 AP 行动点数预操作结合的可行性
- 用纯 Canvas 像素绘制快速验证核心玩法

### 1.5 怪物系统

**怪物配置数据库** `MONSTER_DB`（4种基础类型 × 3等级 = 12只怪物），数据来源 `Configs/monster-db.json` 外部 JSON 配置文件：

| cfgId | 名称(I/II/III) | HP | 伤害 | actionMode | actions[] (type + 核心参数) | 颜色叠加(tint) | 移动标签 | 角色 | 威胁值 | 体型 |
|-------|------|-----|------|------------|------|---------------|:--:|:--:|:--:|:--:|
| `crack_maw` | 裂口尸 | 10/20/30 | 0.5/1/1 | sequence | `chase` steps:[2,2]→[3,3]→[4,4], stepMode:seq, after_effect:attack_adjacent(damage:0.5/1/1,range:1) | 无 | 地面 | melee | 3/5/7 | 1×1 |
| `flying_eye` | 浮游眼 | 6/12/20 | 0.5/0.5/1 | condition | `random_wander` steps:[2,2,2]→[3,3,3]→[4,4,4], cond:out_of_range + `shoot_fan` range:4→5→6, cond:in_range, after_effect:random_wander | 蓝紫半透 | 飞行 | ranged | 2/4/6 | 1×1 |
| `charge_golem` | 蓄力魔像 | 30/45/65 | 1/1/1.5 | sequence | `random_wander` steps:2/3/4 ×2 + `charge_up`(蓄力+感叹号) + `charge_line` steps:[3,13], stepMode:rand | 棕半透 | 地面 | tank | 5/8/12 | 1×1 |
| `boss_jumper` | 跳跃巨兽 | 60/80/105 | 0.5/0.5/1 | sequence | `jump_small` steps:[2/3/3] → `jump_small` steps:[2/3/3], repeatChance:0.5 → `jump_big_land` disappearSteps:1, target:cover_player, after_effect:attack_side(damage:1,range:1) | 紫半透 | 地面,飞行 | boss | 20/22/25 | **2×2** |

**怪物配置字段说明**：
- `actionMode`：行为选择模式 `{ mode, [weights] }`。`mode: "sequence"` 按索引顺序循环执行 actions；`mode: "random"` 按 `weights[]` 加权随机选一个 action；`mode: "condition"` 按顺序逐条评估 action 的 condition，选中第一个满足条件的 action。权重默认 1（均匀随机）
- `actions[]`：行为列表，每行为独立配置对象。通用字段：`type`（行为类型标识）、`steps`（步数池数组）、`stepMode`（sequence按序轮换 / random均匀随机）。每个 action 类型可携带额外专有参数（如 `range`/`condition`/`directMode`/`repeatChance`/`disappearSteps`/`target`/`after_effect` 等）
- `condition`（action 可选字段）：`"in_range"` → 仅当玩家在 action 的 `range`（切比雪夫距离）内时该 action 可选；`"out_of_range"` → 仅当玩家在射程外时可选。无 condition 则始终可选
- `after_effect`（action 可选字段）：主 action 执行完毕后追加执行的附加行为，支持两种格式：①单一对象 `{ type, steps, stepMode }`（浮游眼 shoot_fan→random_wander）；②数组 `[{ type, damage, range }]`（裂口尸 chase→attack_adjacent 十字邻格攻击，上下左右各 range 格；Boss Jumper jump_big_land→attack_side 冲击波范围攻击）
- `aiType`：行为标签（chase/ranged_kite/charge/boss_jumper），保留用于特殊路由（如 boss_jumper 跳过普通 AI 分发进入 `processJumperAction`），但不再携带参数
- `movementTags`：怪物移动特征标签，用于与房间 `allowedMovement` 做标签匹配。`地面` 表示只能在地面行走（无法穿越深坑），`飞行` 表示可无视地形障碍
- `role`：战斗角色定位（melee/ranged/tank/boss），用于组合规则保证类型多样性
- `threat`：威胁值，用于点数预算消耗，控制每房间怪物总体难度

**Action 类型枚举**（8种，替代旧 `movement.mode` + `aiType` 的分离结构）：

| action type | 行为描述 |
|------------|---------|
| `chase` | 向玩家追踪移动（BFS寻路），步数从 `steps`/`stepMode` 取。支持 after_effect: [attack_adjacent] → 移动结束后对四方向邻格造成伤害 |
| `random_wander` | 随机方向漫步，步数从 `steps`/`stepMode` 取。`stepMode:"random"` + 无 `stepWeights` → 均匀随机（每步等权重） |
| `shoot_fan` | 扇形三连射，`range` 控制射程，`directMode:"toward_player_axis"` 朝玩家主轴向射击。通常配 `condition:"in_range"` 仅射程内可选 |
| `charge_up` | 蓄力：原地不动，头顶红色感叹号提示（闪烁脉动动画），为下一轮 `charge_line` 冲刺做准备 |
| `charge_line` | 蓄力冲刺：选择方向 + 计算路径 + 执行移动一气呵成（不再分两阶段），`steps` 从池中随机取冲刺距离 |
| `jump_small` | Boss Jumper 小跳跃，中心距离判定 × `steps`[0] 步。可选 `repeatChance` 控制重复小跳概率 |
| `jump_big_land` | Boss Jumper 大跳+落地，`disappearSteps`消失回合数、`target`落点选择模式(cover_player)、`after_effect: attack_side`落地范围伤害 |
| (patrol/stationary) | 巡逻/不移动（通过 `aiType` 路由，暂无独立 action 配置） |

**生成方式**：
- **自动刷怪**：`spawnRoomMonsters()` — 进入房间/楼层切换时自动调用：
  - **Boss 房**：从 `spawn-config.json > bossMonsters[楼层]` 取 squad ID 列表，随机选一个 squad，按 squad 的 `monsters[]` 逐个生成（2×2体型 Boss）
  - **普通房**：`filterSquadsByRoom(floorNum, roomType, tpl)` 按 `minFloor`/`movementTags` 过滤可用 squad → 贪心选取（预算上限内随机选 squad 直到超预算）→ 逐个 squad 生成怪物
  - 起点/宝藏/商店房不生成怪物
- **squad 模板系统**（`squad-templates.json` + `SQUAD_TEMPLATES`）：预定义怪物组合，含 `squad.monsters[]`（怪物cfgId列表）、`budget`（消耗预算）、`movementTags`（与房间标签匹配）、`minFloor`（最低楼层限制）
- **squad 锚点聚拢生成**：同一 squad 的怪物聚在一起生成。第一只纯随机选位置作为锚点，后续怪物在锚点距离=1的相邻空格中随机选。若锚点周围无相邻空格则换锚点（重新纯随机选位）重试
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
- `actionMode` + `actions[]`：行动列表 + 选择模式，统一替代旧 `movement`/`aiType`/`aiParams` 分散字段。每个 action 独立配置步数、射程、条件等全部参数
- `damage`：每个怪物独立的碰撞伤害
- `aiType`：行为标签（用于特殊路由，如 boss_jumper 跳过普通 AI 分发）
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
- **Checkpoint 时机**：不在发射子弹时保存，而是在子弹实际产生效果时更新——命中怪物(含非致命)、击杀怪物(含掉落)、命中地形破坏、房间清空。每个操作的结果及时反映到checkpoint
- **Esc 全重置**：恢复完整回合快照（`turnSnapshot`），玩家/怪物/HP/道具/地形/炸弹全部回到回合开始时状态，伴随时间倒流动画
- **回合快照**：`saveTurnSnapshot()` 保存玩家坐标/HP、怪物坐标/HP、道具库存、地上资源道具、可破坏瓷砖(tileData/currentRoomGrid)、炸弹等；`restoreTurnSnapshot()` 恢复
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
| 飞行速度 | 560 像素/秒 |
| 提前下落距离 | 0.2 格 |
| 下落水平速度比例 | 7% |
| 下落重力加速度 | 1100 像素/秒² |

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
| POOP | `P` | 便便 | ❌ | 可破坏(hp=4,每发子弹1伤害→需4次击破)，挡子弹 |
| PIT | `_` | 深渊 | ❌ | 踩上即死或掉落 |
| SPIKE | `^` | 尖刺 | ✅ | 踩上扣 1 心(玩家)/5 HP(怪物) |
| LADDER | `▼` | 梯子 | ✅ | Boss房踩上进入下一层 |

- **便便(POOP)**：hp=4，每发子弹伤害1，需受击4次后破坏。**岩石(ROCK)**：hp=99（不可破坏）。破坏后地形格变为 FLOOR
- 可破坏瓷砖在`initTileData()`中预roll掉落（`_loot` = `rollResourceDrop('resource_drop_terrain_poop'/'resource_drop_terrain_rock')`），保证ESC回溯后再次破坏结果一致
- `hitTile()` 破坏时捕获预roll结果再删除 tileData，调用 `rollTerrainDestroyDrop(col, row, type, preLoot)` 使用预roll掉落，随后 `saveCheckpoint()` 确保BFS回退时地形保持已破坏状态
- 门位：每边正中（上6,0 / 下6,6 / 左0,3 / 右12,3），这些格必须为可通行地面
- `drawTiles()`：使用 `cellRect()` 透视坐标渲染六种瓷砖（岩石叠层/便便棕块/深渊/尖刺菱形/梯子深坑）
- `drawDoors()`：房门渲染（打开=深色通道+门框/关闭=铁栏纹理+横竖铁条），区分上下/左右方向实现

### 2.8 多房间楼层系统

- **楼层结构**：两步法生成 6 层地牢，每层 8~15 个房间，BFS 全连通验证
- **生成算法 [2026-07-22 更新]**：①先布局骨架房（起点+普通房），从所有已放房间的相邻空位扩展；②骨架房全连通后，Boss 从边界最远空位挂载，宝箱从剩余边界随机挂载。Boss/宝箱天然只有 1 个连接（始终在集群外围），无需裁边修复。
- **房间类型**：start(起点)/normal(普通)/treasure(宝箱)/boss(Boss)/shop(商店)
- **模板系统**：每个房间引用 `pool.json` 中的模板(tplKey)，生成时解析 TILE 布局。`BUILTIN_TEMPLATES()` 作为兜底，已与 `pool.json` 对齐
- **门系统**：每房间最多 4 扇门(每个方向一扇)，房间清怪后门自动打开(`updateDoorsLocked()` 只判断怪物，不判断炸弹)
- **探索模式** `inCombat=false`：无怪物且无炸弹时 WASD 自由移动，门前格+方向键切换房间(滑动过渡400px/s)
- **战斗模式** `inCombat=true`：有怪物或有未引爆炸弹时 AP 回合制，炸弹倒计时在每回合怪物行动前执行（最高优先级），清怪+炸弹全爆后门打开
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
| 重力加速度 | 360 像素/秒² |
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
- Esc 全重置本回合 → `restoreTurnSnapshot()` + 时间倒流动画（含地形、炸弹回溯）
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

**掉落系统** `item-db.json > itemDropTables`（9张品质表，合并原 `item-drop-tables.json`）：
- 品质权重表控制每个掉落场景的 none/common/rare/legendary 分布，所有表名统一以 `item_drop_` 为前缀

| 品质表 | none | common | rare | legendary | 适用场景 |
|--------|------|--------|------|-----------|---------|
| `item_drop_default` | 0% | 60% | 30% | 10% | 通用兜底 |
| `item_drop_common` | **90%** | 5% | 3% | 2% | 裂口尸掉落(已废弃) |
| `item_drop_ranged` | **90%** | 5% | 3% | 2% | 浮游眼掉落(已废弃) |
| `item_drop_heavy` | **90%** | 5% | 3% | 2% | 蓄力魔像掉落(已废弃) |
| `item_drop_boss` | 0% | 20% | 45% | 35% | Boss击杀掉落 |
| `item_drop_treasure_room` | 0% | 0% | 75% | 25% | 宝箱房 / 宝箱开启 |
| `item_drop_boss_room` | 0% | 25% | 45% | 30% | Boss房清空奖励 |
| `item_drop_chest_normal` | 65% | 0% | 25% | 10% | 普通宝箱道具掉落 |
| `item_drop_chest_golden` | 50% | 0% | 30% | 20% | 金宝箱道具掉落 |

- `none` 值控制"不掉任何道具"的概率。`monster_very_rare` 表已移除（原用途被 monster-db.json 中每怪独立的 `loot.entries` 配置覆盖，common/ranged/heavy 三表统一改为高 none 率作为极低概率兜底）
- 怪物旧品质表（common/ranged/heavy）已不再被引用，仅供备份

**拾取与叠加**：
- F 键拾取道具，加入 `playerInventory` 数组
- `recalcAllStats()` 遍历背包，累加 `effects` 数值属性 + 遍历 `specials[]` 调用注册表 handler
- 穿透不叠加（布尔值），伤害倍率可叠加（`damageMultiplier *= mult`）
- HP 上限提升后当前 HP 等比增加

**道具栏 UI**：底部图标横排（品质边框颜色），悬浮显示道具名+描述+来源提示

### 2.13 Boss Jumper — 2×2跳跃Boss系统

Boss房专属怪物，占 2×2=4 格（`size:2`，`col/row` 为左上角），不参与普通移动。行为参数全部配置在 `actions[]` 中（`jump_small` 的小跳步数、`jump_big_land` 的伤害/重复概率/消失步数）。

**行动循环**：`1(小跳) → 2(小跳) → 3(50%重复1+2) → 4(大跳) → 1`

| 行动 | 机制 | 伤害 | 动画 |
|------|------|------|------|
| **小跳跃** | Boss中心与玩家坐标比较 → 横向/纵向选远的走 N 格（`jump_small.steps[0]`，默认3）→ 落点4格内单位0.5伤害。无视岩石/尖刺/深坑，但不能全深坑 | 0.5心(玩家) | 弧线跳跃(sin弧线+ease-in-out+缩放弹跳) |
| **大跳跃** | Boss消失1回合（缩小淡出残影）→ 跳起时判定玩家位置选2×2落点 → 玩家回合结束时落下 → 对12格(目标2×2+8邻格)造成 `after_effect: attack_side` 冲击波伤害（damage:1, range:1） | 1心(12格范围) | 消失:缩小淡出 / 落地:缩放弹出+双圈冲击波 |

**关键设计**：
- `pendingBossLanding`：大跳落点跳起时即确定（不依赖落下时玩家位置），跨回合延迟执行
- `jumperJustLanded`：落地回合Boss休息不行动，下个怪物回合才循环回phase 1
- 无需BFS寻路（`predictedPath` 永久为空），跳跃一次性完成
- 接触伤害0.5心（玩家走入2×2区域），子弹碰撞4格检测
- 第二个 `jump_small.repeatChance`（默认0.5）控制小跳后50%概率重复小跳而非进入大跳

**2×2适配**：`monsterCells()` / `isInMonsterFootprint()` / `isValidLandingZone()` 辅助函数。全系统适配（渲染中心偏移 `CELL*(sz-1)/2`、碰撞、快照、占用、DOM标签）。

### 2.14 炸弹系统

玩家消耗背包中的炸弹资源（`playerResources.bombs`），在当前位置放置炸弹，炸弹爆炸对范围内怪物造成伤害并破坏地形。

| 属性 | 值 |
|------|-----|
| 资源 ID | `bomb_single` |
| 倒计时 | 3 回合（`detonateTurns`） |
| 爆炸伤害 | 50（对怪物） |
| 爆炸范围 | 曼哈顿半径 2（菱形） |
| 爆炸粒子 | 20 个（橙红/橙黄色） |

**核心流程**：
- **放置炸弹** `placeBomb(col, row)`：消耗 1 个炸弹 → 在当前位置生成炸弹对象 → 强制进入战斗模式（如在探索模式中）
- **倒计时** `tickBombCountdown()`：每回合怪物行动前**最高优先级**执行，所有当前房间炸弹的 `timer-1`，计时归零的炸弹立即引爆
- **引爆** `detonateBomb(bomb)`：读取 `RESOURCE_DB['bomb_single']` 的伤害/半径配置，对曼哈顿距离 ≤2 的所有怪物造成 50 伤害，生成 20 个爆炸粒子。爆炸后可破坏范围内的 POOP/ROCK 地形格
- **快照支持**：炸弹纳入 `saveTurnSnapshot()` / `restoreTurnSnapshot()`，ESC 回溯可恢复炸弹状态
- **战斗状态联动**：房间有未引爆的炸弹时 `inCombat=true`（即使怪物已清空），`updateDoorsLocked()` 不判断炸弹只判断怪物

### 2.15 资源与宝箱系统

资源系统（`RESOURCE_DB`，数据来源 `resource-db.json`）管理六类可拾取物品：

| 资源类型 | ID 示例 | 说明 |
|---------|--------|------|
| 金币 | `coin_gold`(1元) / `coin_black`(5元) / `coin_silver`(10元) | 货币，碰触自动拾取 |
| 炸弹 | `bomb_single`(1个) / `bomb_double`(2个) | 收录背包，`playerResources.bombs` |
| 红心 | `heart_half`(半心) / `heart_full`(全心) | 碰触回复 HP |
| 蓝心 | `blue_heart_half` / `blue_heart_full` / `blue_heart_double` | 临时护盾，受伤优先扣除 |
| 钥匙 | `key_single`(1把) / `key_double`(2把) | 开金宝箱消耗，`playerResources.keys` |
| 宝箱 | `chest_normal`(普通) / `chest_golden`(金) | 碰触打开，触发掉落 |

**宝箱类型区分**：
- **普通宝箱** `chest_normal`：`locked: false`，碰触即开，掉落为 `rounds[0]`(pick_first: 优先掉道具) + `rounds[1]`(roll_all: 额外资源)
- **上锁金宝箱** `chest_golden`：`locked: true`，需消耗 1 把钥匙才能打开，掉落品质更高（`itemDropTable: item_drop_chest_golden`），必出 1~4 个道具

**拾取与上限**：
- 资源碰触自动拾取（`autoPickupResources()`），加入 `playerResources`
- 上限约束（`_limits`）：`coinMax`=99 / `bombMax`=9 / `keyMax`=9
- 资源 UI 实时显示当前数量（`updateResourceUI()`）

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
| R | 任意 | 重置游戏 → 回到第1层起点（重置地形/门/掉落物/标记等全部运行时状态） |
| B | 任意 | 放置炸弹（消耗1个炸弹资源，3回合后引爆，50范围伤害） |

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
   - Space → 先处理大跳Boss落地 → 直接结束回合（无弹窗）→ monster_turn
5. `monster_turn` → 跳跃Boss一次性行动（不逐步移动）+ 普通怪逐步移动 + 碰撞(按类型伤害) + 尖刺5伤害 → `updateRoomCombatState()`
   - Boss Jumper状态机：大跳时Boss消失，玩家回合结束后落下（延迟执行）
   - 清怪 → 门打开 → Boss房掉落道具(spawnBossRoomItem) → 回到探索模式
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
    ├── 怪物系统 (MONSTER_DB 配置表 + actionMode/actions[] 行动列表 + resolveMonsterAction 行为选择 + AI行为路由 + calcAllMonsterPaths/startMonsterTurn/updateMonsterTurn/spawnMonster + 2×2怪物辅助函数)
    ├── Boss Jumper系统 (processJumperAction/calcJumperSmallJump/calcJumperBigJump/executeBossLanding — 状态机驱动2×2跳跃Boss)
    ├── 道具系统 (ITEMS_DB 道具数据库 + SPECIAL_EFFECT_HANDLERS 特效注册表 + playerInventory 背包 + recalcAllStats 属性重算)
    ├── 资源系统 (RESOURCE_DB 资源定义 + RES_DROP_TABLES 掉落表(mode/table结构) + playerResources 背包 + rollResourceDrop/rollRoomClearDrop/rollTerrainDestroyDrop)
    ├── 炸弹系统 (placeBomb放置/tickBombCountdown倒计时/detonateBomb引爆 — 纳入快照，最高优先级于怪物行动前执行)
    ├── 宝箱系统 (chest_normal普通碰触开 / chest_golden金宝箱需钥匙，loot通过rollLoot调度)
    ├── 掉落系统 (rollLoot 统一调度器 + executeDropEntry 分发 + rollMonsterKillDrop + chest loot in resource-db.json)
    ├── 数据加载层 (loadMonsterDB/loadItemDB/loadResourceDB/loadSpawnConfig/loadSquadTemplates — 异步fetch JSON配置文件)
    ├── 刷怪配置解析 (resolveSpawnConfig — floorBudgets + terrainModifiers 运行时计算)
    ├── 小队模板系统 (SQUAD_TEMPLATES + filterSquadsByRoom + squad锚点聚拢生成)
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
| `saveTurnSnapshot()` | 保存回合开始时完整快照（玩家/怪物/道具/地形tileData+currentRoomGrid/炸弹） |
| `restoreTurnSnapshot()` | 恢复回合快照，重置所有状态到回合开始（含地形、炸弹） |
| `calcReachableTiles(fromCol, fromRow, maxSteps)` | BFS 计算可移动方格集（排除墙壁和怪物） |
| `refreshReachableTiles()` | 从当前位置以剩余 M-AP 刷新可移动范围 |
| `loadTemplates()` | 加载 `pool.json` 关卡池模板→`poolTemplates` |
| `loadMonsterDB()` | 异步 fetch `monster-db.json` → `MONSTER_DB` + `_rebuildMonsterPools()` |
| `loadSpawnConfig()` | 异步 fetch `spawn-config.json` → `SPAWN_CONFIG` 楼层刷怪配置 |
| `loadSquadTemplates()` | 异步 fetch `squad-templates.json` → `SQUAD_TEMPLATES` 小队模板数据 |
| `loadItemDB()` | 异步 fetch `item-db.json` → `ITEMS_DB` 道具数据库（含掉落表 itemDropTables） |
| `loadResourceDB()` | 异步 fetch `resource-db.json` → `RESOURCE_DB` 资源数据库（含资源定义+掉落表+宝箱loot） |
| `rollItem(quality?, tableKey?)` | 按品质/掉落表权重随机抽取道具配置ID，默认 tableKey=`item_drop_default` |
| `rollLoot(lootConfig, col, row)` | 统一掉落调度器：解析怪物/宝箱的 loot 配置，支持 rounds/entries/mode(pick_one/roll_all/pick_first) |
| `executeDropEntry(entry, col, row)` | 执行单个掉落条目：item→rollItem 生成道具 / resource→rollResourceDrop 生成资源 / resource_fixed→固定资源。fallback 默认表名使用 `item_drop_default` / `resource_drop_monster_default` |
| `rollResourceDrop(tableKey)` | 从 `resource-db.json > resourceDropTables` 按表的 `mode`(pick_one/roll_all/pick_first) 驱动随机生成资源 ID 列表。表名统一 `resource_drop_` 前缀 |
| `rollMonsterKillDrop(m)` | 击杀怪物时读取 `monster-db.json > loot` 配置调用 rollLoot |
| `rollRoomClearDrop()` | 清空房间时读取 `room.roomClearDrop` 配置（resourceDropTable / itemDropTable），纯配置驱动 |
| `rollTerrainDestroyDrop(col, row, type, preLoot)` | 破坏地形掉落：优先使用 room 初始化时预roll的 `preLoot`，保证ESC回溯后再次破坏结果一致。fallback 现场 roll `resource_drop_terrain_rock`/`resource_drop_terrain_poop` 表 |
| `placeBomb(col, row)` | 消耗背包炸弹在当前位置放置，3回合倒计时，强制进入战斗模式 |
| `tickBombCountdown()` | 怪物回合开始前最高优先级：所有炸弹 timer-1，归零即引爆 |
| `detonateBomb(bomb)` | 炸弹引爆：曼哈顿半径2范围内怪物50伤害 + 20爆炸粒子 |
| `handleResourcePickup(res)` | 拾取单个资源实体：金币/炸弹/红心/蓝心/钥匙/宝箱（宝箱触发展开loot），返回是否成功拾取 |
| `autoPickupResources(col, row)` | 检测指定坐标上的资源实体并自动拾取（含 pickup log 用于回溯撤销） |
| `spawnShopItems(room)` | 商店房商品生成，统一调用 `rollResourceDrop('resource_drop_shop_stock')`（mode: roll_all，每种独立判定），最多6个。同时为每个商品分配 `_shopSlots` 记录价格和类型 |
| `tryBuyShopSlot(col, row)` | 商店购买：检测坐标上商品，扣除金币后获得道具/资源，标记售出并移除实体 |
| `drawShopPrices()` | 渲染商店价格标签（未售出=金色，已售出=灰色），在 `render()` 中调用 |
| `resolveAfterEffects(action, context)` | 执行 action 的 after_effect：attack_adjacent(四方向十字攻击)/attack_side(Boss冲击波范围) |
| `spawnItemOnGrid(col, row, cfgId)` | 在指定网格位置生成道具实体 |
| `recalcAllStats()` | 遍历背包重算所有属性（effects 数值累加 + specials[] 注册表分发） |
| `getTpl(key)` | 按 key 获取模板，优先 poolTemplates，回退内置 |
| `generateFloor(floorNum)` | 两步法生成单层地牢：骨架房扩展布局→Boss/宝箱挂载到集群边界→模板填充→边转门 |
| `generateAllFloors()` | 生成全部 6 层地牢 |
| `loadOrGenerateFloors(forceReload)` | 从 `floor-data.json` 加载楼层数据（hash 变化时触发重置），首次加载后深拷贝保存 `_initGrid`/`_initDoors` 供 R 键恢复 |
| `resetGameToFloor1()` | 重置游戏状态回到第1层起点（R键调用），从 `_initGrid`/`_initDoors` 恢复所有房间地形和门状态 |
| `enterFloor(floorNum)` | 进入指定楼层起始房间 |
| `tryWalkIntoDoor(fromCol,fromRow,dir)` | 检测门触发：站在门前格+按方向→切换房间 |
| `updateRoomCombatState()` | 更新战斗/探索状态，触发回合初始化或结束。房间清空时同步 `room._groundResources = resourcesOnGround`（直接引用不再深拷贝，防幽灵资源） |
| `updateDoorsLocked()` | 根据 inCombat 开关门（战斗=锁/探索=开） |
| `damagePlayer(amount)` | 玩家受伤：战斗/探索统一无敌移速×2步（战斗中结束回合时未消耗M-AP也计入） |
| `damageMonster(m, amount)` | 怪物受击：hp>0时保存checkpoint(反映HP降低)，hp≤0时走死亡流程(掉落+保存checkpoint) |
| `drawCharacterAt(px,py,facing,walkFrame,shootTimer,alpha,tint)` | 通用角色渲染，支持透明度/无敌闪烁/tint色彩叠加 |
| `drawReachableOverlay()` | 渲染浅蓝色呼吸闪烁可移动方格 |
| `drawBattleStartSwords()` | 战斗开始交叉剑动画：两剑从左右飞入旋转碰撞火花 |
| `drawRewindEffect()` | Esc全重置时间倒流动画：蓝色收缩光圈 + 白色闪光 |
| `updateTextOverlay()` | 管理 DOM 覆盖层文字（怪物名/伤害飘字/A-AP圆点） |
| `initTileData()` | 初始化可变瓷砖状态：遍历 currentRoomGrid 识别 POOP/ROCK，预roll掉落存 `_loot`，保证ESC回溯后再次破坏结果一致 |
| `hitTile(col, row, dmg)` | 对瓷砖造成伤害：hp≤0时捕获预roll的`_loot`→删除tileData→改grid→`rollTerrainDestroyDrop(预roll)`→`saveCheckpoint()` |
| `drawTiles()` | 渲染六种 TILE（岩/便/坑/刺/梯），使用 `cellRect()` 透视坐标 |
| `drawDoors()` | 房门渲染：开=通道+门框/关=铁栏纹理，区分上下左右 |
| `cellRect(col,row)` | 透视投影后格子中心坐标+尺寸，供 TILE/门渲染 |
| `drawWalls/Floor/GridHighlight/Bullets/Particles` | 各渲染子系统 |
| `spawnBullet(dir,fromPx,fromPy)` / `updateBullets(dt)` / `shatterBullet(b)` | 子弹生命周期 |
| `updateParticles(dt)` | 粒子物理+淡出 |
| `spawnMonster(cfgId?)` | 调试生怪：生成 1 只地面标签随机怪 |
| `spawnMonsterAtRandomPos(cfgId, overrideMovementTags, anchorPos)` | 在随机可行走位置生成指定怪物（支持2×2体型判定 + 锚点距离=1聚拢）。anchorPos 有值时仅在距离=1的相邻空格中选，无相邻空格返回 false 让调用方换锚点重试。返回是否成功 |
| `resolveSpawnConfig(room, floorNum)` | 运行时计算房间刷怪配置：`floorBudgets[楼层]` + `terrainModifiers[模板]`，返回 {minMonsters, maxMonsters, budget} |
| `spawnRoomMonsters()` | 混合刷怪主函数：Boss房→按 `bossMonsters[楼层]` 选 squad 生成、宝藏/起点/商店房无怪、普通房→squad贪心选取生成 |
| `filterSquadsByRoom(floorNum, roomType, tpl)` | 按楼层/房间类型/地形标签过滤可用 squad（minFloor 过滤 + movementTags 匹配） |
| `monsterCells(m)` / `isInMonsterFootprint(m,c,r)` | 2×2怪物辅助：获取占据格列表 / 检测格子是否在怪物范围内 |
| `isValidLandingZone(c,r,size)` | 2×2落脚验证：不越界、不是墙、不能全深坑 |
| `processJumperAction(m)` | Boss Jumper行动分发：phase 1/2→小跳、phase 4→大跳消失、justLanded→跳过 |
| `calcJumperSmallJump(m)` | 小跳跃计算：中心距离判定×3步 → 落点验证 → 移动Boss → 0.5范围伤害 |
| `calcJumperBigJump(m)` | 大跳跃计算：记录玩家位置 → 选2×2落点 → 标记vanished + pendingBossLanding |
| `executeBossLanding()` | 大跳落地执行：Boss出现 → 12格1点伤害 → 重置phase → 标记justLanded |
| `calcAllMonsterPaths()` / `startMonsterTurn()` / `updateMonsterTurn(dt)` | 怪物回合系统：`resolveMonsterAction()` 选择行为（按 actionMode 过滤+加权）→ AI路由分发 → 每怪移动路径计算 + ranged_kite 射程判断 |
| `resolveMonsterAction(cfg, turnIdx, mCol, mRow, pCol, pRow)` | 解析怪物本回合行为：按 action.condition 过滤 eligible → 按 actionMode (sequence/random weight) 选择一个 action → 按 stepMode/stepWeights 解析步数 |
| `updateActionBar()` | 更新底部状态栏（探索模式隐藏 / 战斗模式显示 AP） |
| `updateUI()` / `updateFloorUI()` | 更新所有 DOM UI 面板（含AP面板显隐、楼层信息栏） |
| `gameLoop(timestamp)` | 主循环：动画→输入→子弹→粒子→怪物回合→渲染 |

## 6. 数据流

```
启动:
  loadTemplates() → poolTemplates
  loadMonsterDB() → MONSTER_DB (异步fetch monster-db.json)
  loadSpawnConfig() → SPAWN_CONFIG (异步fetch spawn-config.json，floorBudgets + terrainModifiers + bossMonsters)
  loadSquadTemplates() → SQUAD_TEMPLATES (异步fetch squad-templates.json)
  loadItemDB() → ITEMS_DB (异步fetch item-db.json, 含掉落表itemDropTables)
  loadResourceDB() → RESOURCE_DB (异步fetch resource-db.json, 含资源定义+掉落表+宝箱loot)
  loadOrGenerateFloors() → allFloors (从 floor-data.json / 兜底 generateAllFloors)
  enterFloor(1) → 设置 currentFloor/currentRoomId/currentRoomGrid → spawnRoomMonsters()

探索模式 (inCombat=false):
  WASD → isWall检查 → 自由移动(col/row/px/py)
       → invincibleSteps递减 → 尖刺检测(damagePlayer) → 梯子(enterFloor)
       → B键 → placeBomb → 强制进入战斗模式(如在探索中)
       → tryWalkIntoDoor → 门前格+方向 → 房间切换(滑动过渡) → finishTransition → spawnRoomMonsters()

战斗模式 (inCombat=true):
  resetTurnAP() → 计算可移动范围 → 保存快照(含道具状态)
  WASD → 检查 reachableTiles.has(key) → 移动本体 → M-AP-1 → invincibleSteps-- → recalcContactDamage(含拾取撤销) → autoPickupResources(含pickup log)
  ↑↓←→ → 即时 spawnBullet → A-AP-1 → 首次? 设 hasShot + checkpointPos
  Esc  → restoreTurnSnapshot(含道具/库存/属性/地形/炸弹) → 重置所有状态
  Space → 结束回合 → 未消耗M-AP计入invincibleSteps → monster_turn:
         startMonsterTurn → tickBombCountdown(炸弹倒计时,优先于怪物)
         → calcAllMonsterPaths() → resolveMonsterAction(按condition过滤+actionMode选择)
         → AI路由分发(action type: chase/random_wander/shoot_fan/charge_line)
         → 怪物逐步移动+碰撞+尖刺5 → finishMonsterTurn(检查怪物+炸弹决定战斗结束)
       → updateDoorsLocked(仅判断怪物,不判断炸弹) → 无怪有炸弹:战斗继续/门开

渲染层序:
  gameLoop → render()
           → 墙壁 → 地板 → TILE瓷砖(岩/便/坑/刺/梯) → 房门(开/关)
           → 网格高亮 → 可移动范围(浅蓝呼吸) → 子弹 → 粒子
           → 资源道具(金币/心/炸弹/钥匙/宝箱 图标渲染) → 商店价格标签 → 炸弹(闪烁倒计时) → 怪物 → 角色本体(无敌闪烁)
           → 战斗开始剑动画 → Esc时间倒流动画
           → DOM 覆盖层独立渲染文字(怪物名/伤害飘字/A-AP圆点)
```

## 7. 项目文件清单

### 根目录

| 文件 | 类型 | 说明 |
|------|------|------|
| `isaac-turnbased-demo.html` | HTML/JS | ~~已废弃删除~~（功能已合并至 demo2.html） |
| `isaac-map-viewer.html` | HTML/JS | 房间模板编辑器（File System Access API 直读直写，生成json手动复制） |
| `sprite-debug.html` | HTML/JS | 精灵表调试工具（网格叠加查看帧坐标） |
| `walk-preview.html` | HTML/JS | 走路动画预览工具（循环播放各方向帧） |

### Assets/ (美术素材)

| 文件 | 类型 | 说明 |
|------|------|------|
| `issac-idle.png` | 图片 | 角色精灵图集（头+身体走路帧，32×32 每帧） |
| `issac-background.png` | 图片 | 备用地面背景图 |
| `UI-reference1.png` | 图片 | UI 参考图1 |
| `UI_reference2.png` | 图片 | UI 参考图2 |
| `usable_assets/` | 目录 | 资源图标素材（18个PNG：金币×4/炸弹×2/红心×4/蓝心×4/宝箱×2/钥匙×2） |

### Configs/ (配置与服务)

| 文件 | 类型 | 说明 |
|------|------|------|
| `pool.json` | JSON | 关卡池数据文件（模板定义 + allowedMovement 配置，编辑器读写） |
| `floor-data.json` | JSON | 楼层生成数据（房间结构+grid，编辑器/游戏加载，不含 spawnConfig） |
| `monster-db.json` | JSON | 怪物配置数据（12只怪物：4类型×3等级，含 `actionMode`+`actions[]` 行动列表 + `loot` 掉落配置） |
| `item-db.json` | JSON | 道具数据库（25种被动道具 + `itemDropTables` 9张掉落表，全部 `item_drop_` 前缀） |
| `resource-db.json` | JSON | 资源数据库（金币/炸弹/红心/蓝心/宝箱/钥匙定义 + `resourceDropTables` 11张资源掉落表，全部 `resource_drop_` 前缀 + `_limits` 上限配置 + `_schema` 文档） |
| `spawn-config.json` | JSON | 楼层刷怪配置（`floorBudgets` 每层独立 minMonsters/maxMonsters/budget 三元组 + `terrainModifiers` 模板微调 + `bossMonsters` Boss 分配表） |
| `squad-templates.json` | JSON | 怪物小队模板（预定义 squad 组合，含 `monsters[]`/`budget`/`movementTags`/`minFloor`，供 `spawnRoomMonsters()` 贪心选取） |

> **已删除文件**：`item-drop-tables.json` — 品质表已合并至 `item-db.json > itemDropTables` | `isaac-room-pool - original backup.json` — 原始关卡池备份（已清理）

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
| 2026-08-05(下午) | **小队模板系统 + 锚点聚拢生成优化**。①新增 `Configs/squad-templates.json`：预定义怪物小队模板（squad组合+预算+标签+楼层限制）。②`demo2.html` 新增 `loadSquadTemplates()` / `filterSquadsByRoom()`，`spawnRoomMonsters()` 改为 squad 贪心选取生成（Boss房按楼层选 squad，普通房按预算+标签过滤）。③锚点聚拢生成优化：`spawnMonsterAtRandomPos` 去掉 `topN` 退路，距离=1 无空格直接返回 false，调用方换锚点纯随机重试，确保 squad 怪物严格相邻聚拢。 |
| 2026-08-05 | **刷怪配置架构重构：spawnConfig 从 floor-data 移至运行时计算**。①`spawn-config.json` 重构：删除 `baseSpawnConfig` 公式层，`floorBudgets` 改为 `{minMonsters, maxMonsters, budget}` 完整三元组每层独立配置，`terrainModifiers` 扩展为 `{budget, minDelta, maxDelta}` 支持对 min/max 怪物数做微调。②`floor-data.json` 移除全部 67 个 room 的 `spawnConfig` 字段（不再硬编码在生成产物中）。③`demo2.html` 新增 `resolveSpawnConfig(room, floorNum)` 函数，运行时计算 `floorBudgets[楼层] + terrainModifiers[模板]`，`room.spawnConfig` 存在时覆盖兜底。④`map-viewer.html` 删除硬编码 terrainModifiers 和 spawnConfig 计算循环，`saveFloorToFile` 增加 `delete r.spawnConfig`。⑤修复编辑器选择 pool.json 时报错：4个加载入口统一 `delete loaded._schema` 过滤元数据 key。 |
| 2026-08-04(晚) | **R键重置完整性修复 + 商店购买系统 + AP视觉修复**。①`loadOrGenerateFloors` 首次加载后深拷贝保存 `_initGrid`/`_initDoors`，R键重置时从备份恢复所有房间的地形破坏、门状态、Boss梯子、道具标记等，彻底修复R键后大便/岩石未恢复的问题。②合并原来分散的两个清理循环为一个统一循环。③`buildApDots`/`buildHearts`/`buildBlueHearts` 移到 `updateUI` 之前执行，修复因 `buildApDots` 在 `updateApDots` 之后调用导致 AP 圆点视觉未更新的 bug。④新增商店购买系统：`tryBuyShopSlot(col,row)` 检测商品→扣金币→获得道具/资源→标记售出；`drawShopPrices()` 渲染价格标签(金色/灰色)。⑤商店房进入时不调用 `spawnShopItems`（已在 `finishTransition` 中处理）。 |
| 2026-08-04 | **掉落表命名统一 + roomClearDrop配置驱动化**。①`itemDropTables` 9张表全部加 `item_drop_` 前缀，`resourceDropTables` 11张表全部加 `resource_drop_` 前缀，宝箱资源对象名不变以消除歧义。②全项目 6 文件同步更新所有引用（monster-db/floor-data/map-viewer/demo2）。③`rollRoomClearDrop()` 从硬编码 roomType→tableKey 映射改为读取 `room.roomClearDrop` 配置。④修复地图编辑器 `floorFileInput` 缺少 grid 转置导致显示不正确。 |
| 2026-07-31(晚2) | **context.md Boss Jumper 文档不实描述批量修正**。①怪物表概览行展开为 3 个 action 完整描述（steps:[2/3/3]、repeatChance:0.5 在第二个 jump_small、落地伤害由 after_effect:attack_side 实现）。②字段说明范例 landDamage→target。③Action 类型枚举 jump_small 补 repeatChance、jump_big_land 移除 landDamage/repeatChance 改 target+after_effect。④§2.13 大跳跃行 landDamage→after_effect:attack_side。⑤§2.13 关键设计 jump_big_land.repeatChance→第二个 jump_small.repeatChance。⑥历史记录 2026-07-27 参数迁移路径修正。⑦global-rules §2.2 追加「同步前回溯本轮所有待修条目」硬性步骤。 |
| 2026-07-31(晚) | **JSON尾随逗号修复 + AI JSON编辑后校验规范确立**。①修复 `item-db.json` 中 `boss_room` 尾部多余逗号（删除 `monster_very_rare` 表后 `boss_room` 变成末位，逗号未联动清理导致 JSON 解析失败）。②确立规范：每次编辑 JSON 文件后主动调用 `read_lints` 校验，增删成员时联动检查尾部逗号。③context.md 品质表同步修正（8张→7张，移除 monster_very_rare 行，common/ranged/heavy 数值修正为 90/5/3/2）。④文件清单移除 `isaac-room-pool - original backup.json`（已删除）。 |
| 2026-07-31 | **满血拾取修复 + 幽灵资源修复 + checkpoint时机修正**。①`simulateFromCheckpoint` BFS路径重放中资源拾取改为判断`handleResourcePickup`返回值后再splice，修复满血走过红心被无条件消耗的bug。②`updateRoomCombatState` 中 `room._groundResources` 从深拷贝改为直接引用，消除因引用断裂导致离房再回房时已拾取资源幽灵重现。③移除子弹发射时的过早 `saveCheckpoint`，改为在`damageMonster`中怪物受击(含非致命)时更新，确保checkpoint始终反映操作的实际结果而非操作瞬间。 |
| 2026-07-30 | **地形掉落预roll + liftDir修复 + ESC回溯补全**。①`initTileData()` 房间初始化时为每个 POOP/ROCK 预roll掉落(`_loot`)，`hitTile()` 破坏时捕获预roll传给 `rollTerrainDestroyDrop(preLoot)`，保证ESC回溯后再次破坏同一地形掉落一致。②6处资源保存/恢复（`saveTurnSnapshot`/`saveCheckpoint`/`restoreCheckpoint`/`restoreCheckpointWithoutBullets`/`restoreTurnSnapshot`/`simulateFromCheckpoint`）补上 `liftDir`，修复资源在BFS触发checkpoint恢复后因 `liftDir=undefined→liftY=NaN` 导致视觉消失但可拾取的bug。③`saveTurnSnapshot`/`restoreTurnSnapshot` 新增 `tileData`/`currentRoomGrid`/`bombs` 快照，ESC回溯覆盖可破坏地形和炸弹状态。④`hitTile()` 破坏后调用 `saveCheckpoint()` 确保BFS回退时地形保持已破坏。 |
| 2026-07-29 | **资源掉落表 mode 统一 + attack_adjacent 十字化**。①`resource-db.json` resourceDropTables 全部升级为 `{ mode, table }` 结构，每表统一 15 种资源条目(不掉落的权重=0)，新增 `room_clear_treasure` 表。②`rollResourceDrop()` 重构支持三种 mode(pick_one/roll_all/pick_first)，向下兼容旧格式。③`rollRoomClearDrop()` 移除硬编码(宝藏/Boss房不掉的 if 判断)，改为 roomType→tableKey 纯配置驱动映射。④`spawnShopItems()` 改用统一 `rollResourceDrop('shop_stock')`。⑤`resolveAfterEffects()` 中 `attack_adjacent` 从面朝方向单向攻击改为四方向十字范围攻击(上下左右各 range 格)。⑥`finishMonsterTurn()` 简化移除 dirX/dirY 计算。 |
| 2026-07-28(晚) | **浮游眼行为模式重构**。①新增 `condition` actionMode：按顺序逐条评估 condition，选中第一个满足的 action（替代旧 random 权重随机）。②新增 `out_of_range` 条件（与 `in_range` 互补）。③新增 `after_effect` 机制：主 action 执行完毕后追加执行附加行为（shoot_fan→after_effect:random_wander → 射击后立刻移动）。④玩家回合动态感叹号：WASD移动时实时检测与浮游眼切比雪夫距离，进入射程显示"!"，移出消失。⑤抽出 `checkActionCondition` + `resolveSteps` 辅助函数。 |
| 2026-07-28(晚) | **蓄力魔像行为优化**。①蓄力魔像 actions 从单一 `charge_line` 改为 4 步 sequence：`random_wander`(2步) → `random_wander`(2步) → `charge_up`(蓄力+感叹号) → `charge_line`(冲刺)。I/II/III级 wander 步数分别为 2/3/4。②新增 `charge_up` action 类型：原地不动+头顶红色闪烁感叹号(!)脉动动画（DOM覆盖层渲染）。③`charge_line` 简化为单步执行（选方向+直接冲刺，不再分两阶段）。④感叹号状态纳入回合快照。⑤action 类型枚举从 7 种增至 8 种。⑥感叹号样式优化：56px Courier New大号像素风，8方向黑色像素描边+3层红色光晕脉动（0.5s，0.85→1.25缩放）。 |
| 2026-07-28(晚) | **掉落系统全面重构 + 资源系统建立**。①新建 `resource-db.json`：15种资源定义 + 11张资源掉落表(含新增 room_clear_treasure) + 宝箱loot配置。②怪物loot全面重配：所有非Boss怪改为极少道具 + 小概率资源；Boss纯道具无资源。③宝箱改为必掉1~4个道具(roll_all模式)。④删除 `item-drop-tables.json`，品质表合并至 `item-db.json > itemDropTables`。⑤新增统一掉落调度器 rollLoot/executeDropEntry 及资源掉落 rollResourceDrop。 |
| 2026-07-28 | **文档体系补充：代码-文档不一致处理约定**。①确立约定：AI 发现实际代码和项目文档不一致时，必须主动提醒用户，列出具体差异清单让用户决策（①以代码为准更新文档 / ②以文档为准修正代码 / ③两者都保留（设计变更过渡期）），不得在用户未表态的情况下擅自修改代码或修改文档。②确认 Ask/Craft 模式分工边界：Ask 模式只分析/提醒差异，不动文件；文档更新需用户明确指令。③文件清单修正：monster-db.json 描述从旧 `movement`+`aiParams` 更新为 `actionMode`+`actions[]`。 |
| 2026-07-27 | **怪物行动系统重构：actionMode + actions[]**。①移除旧 `movement`/`aiParams`/`aiRange` 分散字段，统一为 `actionMode`（行为选择模式：sequence按序/random加权随机）+ `actions[]`（行为列表，每个 action 独立携带 type + steps/stepMode/range/condition 等全部参数）。②新增 `resolveMonsterAction()` 函数：按 condition 过滤 eligible → actionMode 挑选 → stepMode/stepWeights 解析步数。stepWeights 未配时默认均匀随机。③5种怪物12条全部迁移。裂口尸→chase、浮游眼→random_wander+shoot_fan（actionMode.random + condition.in_range）、蓄力魔像→charge_line、Boss Jumper→jump_small+jump_big_land。④Boss Jumper 参数从 `aiParams` 移至 `actions[]`：`jump_small`（steps/repeatChance）、`jump_big_land`（disappearSteps/target/after_effect:attack_side）。⑤context.md 全覆盖交叉比对：怪物表重写、AI类型表→Action类型表、配置字段说明重写、Boss Jumper 参数来源更新、架构概览/函数索引/数据流更新。 |
| 2026-07-24 | **怪物移动配置统一重构 + 浮游眼AI行为优化**。①新增统一 `movement` 结构（`mode`/`steps`/`stepMode`/`weight`），替代旧 `moveCycle`/`moveDistMin-Max`/`chargeDistMin-Max` 等分散字段。12只怪物全部迁移，同一概念（步数）不再各自为政。②浮游眼 AI 新增切比雪夫距离射程判断：射程内按权重射击/移动，射程外强制只移动，不走无意义的远程对射。③巡逻怪硬编码 5 格 → `aiParams.patrolRange` 可配置。④context.md 全文交叉比对：怪物表重写（boss_maw_king 移除、I/II/III 三级标注、移动列重写）、AI类型表更新、文件清单新增 spawn-config.json + demo.html 标记废弃、函数索引/独立属性描述更新。 |
| 2026-07-23 | **AI行为参数外置 + 配置外置审计标准 + global-rules 规范扩充**。①monster-db.json 新增 `aiParams` 字段，5种怪物AI参数全部外置消除硬编码。②系统性审计6个JSON+2个HTML，确立分类标准：策划数据→JSON、引擎/渲染/算法内部调参→代码（渲染常量/动画时长/刷怪算法明确保留代码不挪JSON）。③建立双HTML同步策略（demo.html内联 + demo2.html JSON加载双轨维护）。④global-rules 新增 §2.10 Memory记录完整性要求（不遗漏讨论深度）+ §4.5 疑问句与指令区分（只建议不抢先执行）。⑤context.md全覆盖交叉比对：8处过时常量修正（怪物名/HP/子弹速度/重力）。 |
| 2026-07-22 | **楼层生成两步法重构**。`generateFloor()` 改为骨架房优先扩展布局 → Boss/宝箱从集群边界空位挂载。Boss选距离起点最远的边界位置，宝箱从剩余边界随机选。Boss/宝箱始终在集群外围且天然只有1个连接，彻底消除旧方案的裁边+连通性修复逻辑。 |
| 2026-07-21(晚) | **Boss Jumper 2×2跳跃Boss系统**。①新增 `boss_jumper` 怪物（size:2占据4格），替代旧boss为每层Boss房唯一Boss。②行动循环：小跳×2（中心距离判定+3步目标+弧线动画）→50%重复判定→大跳（消失淡出+延迟落地+12格范围1心伤害+冲击波动画）。③2×2全系统适配：渲染（中心偏移公式修正）、碰撞（子弹4格检测）、接触伤害（0.5心）、快照/占用/标签。④`pendingBossLanding` 跨回合延迟执行 + `jumperJustLanded` 落地休息。⑤宝藏房不刷怪。⑥新增 §2.13 Boss Jumper 章节 + AI类型表。 |
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

> **下一步方向**：掉落参数微调（概率和数值）、更多Boss类型、商店房间交易功能、Sound/FX 音效系统、patrol/stationary 迁移到 actions[] 体系。后续可迁移到 Godot 引擎。参考 `godot-setup-checklist.md` 中的实现思路。
