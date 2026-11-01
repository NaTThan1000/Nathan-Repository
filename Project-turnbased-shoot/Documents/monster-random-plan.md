# 怪物随机生成方案：混合标签匹配 + 组合规则 + 点数预算

## 概述

采用**三层递进式混合方案**，替代原有简单的房间类型匹配（`roomTypes`）生怪逻辑。

```
┌─────────────────────────────────────────────────────┐
│  第一层：标签过滤（地形适配）                         │
│  monster.movementTags ∩ room.allowedMovement        │
│  → 确保怪物能在该房间正常移动                         │
├─────────────────────────────────────────────────────┤
│  第二层：组合规则（体验质量）                         │
│  「至少1近战」 + 「角色多样性加权×3」                │
│  → 避免极端组合，保证战斗趣味性                       │
├─────────────────────────────────────────────────────┤
│  第三层：点数预算（难度递进）                         │
│  总预算 = 房间基础budget + (楼层数-1) × 2           │
│  → 深层更难，保持 Roguelike 节奏                    │
└─────────────────────────────────────────────────────┘
```

---

## 一、怪物配置（monster-db.json）

### 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `movementTags` | `string[]` | 怪物移动特征标签，如 `["地面"]`、`["飞行"]`、`["地面","飞行"]` |
| `role` | `string` | 战斗角色定位：`melee` / `ranged` / `tank` / `boss` |
| `threat` | `number` | 威胁值，用于点数预算消耗 |

### 当前怪物数据

| ID | 名称 | HP | 移速周期 | 伤害 | AI | movementTags | role | threat |
|----|------|----|----------|------|----|:--:|:--:|:--:|
| `crack_maw` | 裂口尸 | 10 | [2,1] | 1 | chase | 地面 | melee | 3 |
| `flying_eye` | 浮游眼 | 6 | [1,1] | 1 | ranged_kite | 飞行 | ranged | 2 |
| `rock_golem` | 岩石魔像 | 20 | [1,1] | 2 | chase | 地面 | tank | 5 |
| `boss_maw_king` | 裂口之王 | 45 | [3,2] | 2 | boss_chase | 地面, 飞行 | boss | 15 |

---

## 二、房间模板配置（pool.json）

### 新增字段 `spawnConfig`

| 字段 | 类型 | 说明 |
|------|------|------|
| `allowedMovement` | `string[]` | 此房间允许的怪物移动类型标签 |
| `minMonsters` | `number` | 最少生成怪物数量 |
| `maxMonsters` | `number` | 最多生成怪物数量 |
| `budget` | `number` | 基础威胁值预算 |

### 当前房间配置清单

| 模板 Key | 名称 | 特殊地形 | allowedMovement | min | max | budget |
|----------|------|----------|:--:|:--:|:--:|:--:|
| `open` | 空旷大厅 | 无 | 地面, 飞行 | 1 | 3 | 8 |
| `cross_rocks` | 十字岩石 | 岩石 | 地面, 飞行 | 1 | 3 | 7 |
| `four_corners` | 四角岩石 | 岩石, 便便 | 地面, 飞行 | 2 | 4 | 9 |
| `pillars` | 四柱大厅 | 岩石, 便便, 尖刺 | 地面, 飞行 | 1 | 3 | 8 |
| `corridor` | 横向窄道 | 岩石 | 地面, 飞行 | 1 | 2 | 5 |
| `corridor_v` | 纵向窄道 | 岩石, 深坑, 尖刺, 便便 | 地面, 飞行 | 1 | 2 | 5 |
| `scattered` | 散落岩石 | 岩石 | 地面, 飞行 | 1 | 3 | 6 |
| `ring` | 环形壁垒 | 岩石 | 地面, 飞行 | 1 | 3 | 8 |
| `room_split` | 裂半之室 | 岩石, 尖刺 | 地面, 飞行 | 2 | 4 | 9 |
| `alcoves` | 壁龛石室 | 岩石, 便便, 尖刺 | 地面, 飞行 | 1 | 3 | 8 |
| `diagonal` | 斜岩通道 | 岩石 | 地面, 飞行 | 1 | 3 | 7 |
| `boss_arena` | Boss竞技场 | 岩石 | 地面, 飞行 | 1 | 1 | 0 |
| `custom_1` | 角岩 | 岩石 | 地面, 飞行 | 1 | 3 | 7 |

> **注意**：当前所有房间 `allowedMovement` 均为 `["地面", "飞行"]`，因为现有模板的深坑数量较少，地面怪仍可绕行。后续可手动将深坑密集的房间更改为 `["飞行"]`。

---

## 三、生成算法详解

### 入口

- `enterFloor(floorNum)` — 进入楼层时自动调用 `spawnRoomMonsters()`
- `finishTransition()` — 切换房间完成时自动调用 `spawnRoomMonsters()`
- 调试按钮"C"保留旧的 `spawnMonster()` 接口（仅生成 1 只地面标签的随机怪）

### 步骤

#### 第一步：特殊房间处理

```
if 房间类型 == 'boss'  → 固定生成 boss_maw_king（1只）
if 房间类型 == 'start' → 不生成怪物
```

#### 第二步：标签过滤（第一层）

```js
eligiblePool = 所有普通怪物.filter(cfg =>
  cfg.movementTags.some(tag => room.allowedMovement.includes(tag))
)
```

只有 `movementTags` 与房间 `allowedMovement` 有交集的怪物才能被生成。

#### 第三步：近战保底（第二层）

```js
if 近战池非空 && 未达数量上限:
    随机选1只近战怪，扣除对应 threat
```

确保玩家在每个战斗房间至少面对 1 只近战怪物，避免纯远程风筝的单调体验。

#### 第四步：预算填充（第二层 + 第三层）

```js
总预算 = room.budget + (当前楼层 - 1) × 2

while 剩余预算 > 0 && 当前数量 < maxMonsters:
    if 当前数量 >= minMonsters && random() < 0.3:
        break  // 30%概率提前停止，增加随机性

    可负担池 = eligiblePool.filter(cfg => cfg.threat <= 剩余预算)
    if 可负担池为空: break

    // 类型多样性加权：未出现的 role ×3 权重
    加权随机选择 → 生成怪物 → 扣除 threat
```

#### 楼层递进效果

| 楼层 | 楼层加成 | 空旷大厅(8) 实际预算 | 裂半之室(9) 实际预算 |
|:--:|:--:|:--:|:--:|
| 1 | 0 | 8 | 9 |
| 2 | 2 | 10 | 11 |
| 3 | 4 | 12 | 13 |
| 4 | 6 | 14 | 15 |
| 5 | 8 | 16 | 17 |
| 6 | 10 | 18 | 19 |

### 刷怪结果示例

| 场景 | 预算 | 可能结果 |
|------|:--:|------|
| 第1层 横向窄道 | 5 | 裂口尸(3) 或 浮游眼×2(4) |
| 第3层 空旷大厅 | 12 | 岩石魔像(5)+裂口尸(3)+浮游眼(2)=10, 3只 |
| 第5层 裂半之室 | 17 | 岩石魔像×2(10)+裂口尸×2(6)=16, 4只（上限） |
| 第6层 四角岩石 | 19 | 岩石魔像×3(15)+浮游眼(2)=17, 4只（上限） |

---

## 四、修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `Configs/monster-db.json` | 新增 `movementTags`、`role`、`threat` 字段 |
| `Configs/pool.json` | 每个房间模板新增 `spawnConfig`（`allowedMovement`, `minMonsters`, `maxMonsters`, `budget`） |
| `isaac-turnbased-demo.html` | `MONSTER_DB` 和 `BUILTIN_TEMPLATES` 同步更新；新增 `spawnMonsterAtRandomPos()`、`spawnRoomMonsters()`；`enterFloor()` / `finishTransition()` 接入自动刷怪 |

---

## 五、后续扩展指南

### 新增怪物

只需在 `monster-db.json` 中配置即可，无需修改房间模板：

```json
{
  "new_monster": {
    "movementTags": ["地面"],
    "role": "melee",
    "threat": 4
  }
}
```

系统自动根据标签匹配所有兼容房间。

### 新增房间模板

在 `pool.json` 中配置 `spawnConfig` 即可：

```json
{
  "pit_room": {
    "tiles": [...],
    "spawnConfig": {
      "allowedMovement": ["飞行"],
      "minMonsters": 2,
      "maxMonsters": 3,
      "budget": 7
    }
  }
}
```

深坑密集的房间可设为 `["飞行"]`，地面怪不会在此房间出现。

### 调整难度

- **全局难度**：修改 `(floorNum - 1) × 2` 中的系数 `2`
- **单个房间**：修改 `pool.json` 中对应模板的 `budget` 值
- **单个怪物**：修改 `monster-db.json` 中对应怪物的 `threat` 值

### 未来：自动分析地形

当前 `spawnConfig.allowedMovement` 为手动配置。后续可根据房间 tile 布局自动推算：

```
深坑(O) 占比 > 30% → allowedMovement = ["飞行"]
尖刺(^) 占比 > 20% → 降低 budget（对地面怪不友好）
岩石(#) + 便便(P) 占比 > 50% → 降低 maxMonsters（容量受限）
```

此功能留待后续迭代实现。
