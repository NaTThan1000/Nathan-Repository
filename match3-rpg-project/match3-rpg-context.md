# 三消RPG「英雄之战」— 项目总览

> 文件: `match3-rpg.html` | 单文件 ~40KB | 状态: 可玩

> 数值来源：本项目当前没有独立数值 JSON；英雄、敌人、棋盘、伤害和动画参数以 `match3-rpg.html` 中的定义及执行代码为准。本文记录规则与索引，历史版本记录不代表当前值。

---

# Part 1: 游戏策划文档

## 1. 游戏概述

### 1.1 游戏定位
**类型**: 三消 + RPG 回合制战斗 | **平台**: 网页（手机端优先） | **视角**: 单人 PvE

### 1.2 核心概念
玩家交换相邻宝石形成连线消除，为对应颜色的英雄充能；充满后可释放技能攻击敌人，击败全部敌人后通关。棋盘和波次规模查 `ROWS`、`COLS`、`ENEMIES`。

### 1.3 设计目标
- 消除 → 充能 → 技能的反馈循环，让消除有战术目的
- 5 色 5 英雄对应，每种颜色消除都有意义
- 短局制（4波），适合手机碎片时间

---

## 2. 系统设计

### 2.1 棋盘系统

棋盘尺寸与颜色查 `match3-rpg.html` 的 `ROWS`、`COLS`、`COLORS`；连线条件和特殊宝石生成查 `getMatches()`、`createSpecials()`；范围效果查 `processMatchesAnimated()`。初始棋盘避免预生成匹配。

**操作方式**：支持鼠标拖拽和触摸滑动交换相邻宝石。无效交换自动回弹。

### 2.2 英雄系统

每位英雄对应一种宝石颜色，消除该色宝石为对应英雄充能。

英雄名称、颜色、生命、攻击和充能需求查 `match3-rpg.html > HEROES`；技能效果及数值查 `useHeroSkill()` 和英雄定义。

**充能规则**：每消除 1 颗宝石为该颜色英雄充能 1 点。特殊宝石（火箭/炸弹）范围消除的宝石同样计入充能。

**释放时机**：充能满后英雄卡片闪烁提示，玩家可在 idle 动画阶段随时点击释放，不消耗回合。

### 2.3 敌人系统（4波）

敌人波次、属性及技能池查 `match3-rpg.html > ENEMIES`；具体技能结算查 `enemyAttack()`。

**AI 行为**：敌人计时到达攻击间隔时从技能池随机选择行动；间隔查 `ENEMY_ATK_INTERVAL`，具体结算查 `gameLoop()` 和 `enemyAttack()`。

### 2.4 状态效果系统

| 效果 | 适用对象 | 机制 |
|------|----------|------|
| 眩晕（⚡） | 敌人 | 持续 N 帧，期间跳过攻击 |
| 中毒（☠） | 英雄/敌人 | 每 30 帧扣除固定伤害，持续 N 帧 |
| 攻击↑（⚔） | 敌人 | 临时提升敌人伤害倍率，持续 N 帧 |
| 防御↑（🛡） | 敌人 | 临时降低受到伤害，持续 N 帧 |
| 攻击↓（⬇） | 敌人 | 临时降低敌人伤害倍率，持续 N 帧 |
| 护盾 | 全体英雄 | 吸收伤害，剩余值显示在界面上 |

---

## 3. 数值设计

### 3.1 伤害公式

消除、特殊宝石伤害与连击计算查 `processMatchesAnimated()`、`dealDamageToEnemy()`；当前系数以源码为准。

### 3.2 得分公式

消除得分查 `processMatchesAnimated()`，波次奖励查 `continueToNextWave()`。

### 3.3 英雄生存曲线

角色分别承担护盾、单体输出、群体输出、治疗等职责；数值及技能实际效果查 `HEROES` 和 `useHeroSkill()`，生存表现需试玩验证。

---

## 4. 界面与交互

### 4.1 布局结构（手机 420px 宽）

```
┌──────────────────────┐
│ 状态栏装饰（刘海）      │
│           [⏸ 暂停]    │
│  🐉 敌方面板           │
│  ├ 头像 + 名称 + 波次  │
│  ├ HP 血条             │
│  └ 状态标签            │
│ ┌─ 8×8 棋盘 ────────┐ │
│ │ 48px/cell 八边形宝石 │ │
│ └────────────────────┘ │
│  得分:0    回合:1      │
│      COMBO!            │
│     消息区             │
│ [英雄1][英雄2]...[英雄5]│
│  HP条 / 充能条 / 技能  │
└──────────────────────┘
```

### 4.2 交互流程

1. **开始界面** → 点击"开始战斗"
2. **游戏中** → 拖拽/点击交换宝石 → 自动消除 → 充能满了点英雄放技能
3. **波次通关** → 弹窗显示成绩 → 点击"继续下一关"
4. **游戏结束** → 弹窗显示总分/存活数 → 点击"重新挑战"

### 4.3 覆盖层系统

| 覆盖层 | 用途 |
|--------|------|
| `overlay-start` | 开始界面，展示规则说明 |
| `overlay-wave` | 波次通关，显示成绩和下一关预告 |
| `overlay-pause` | 暂停，可继续或重新开始 |
| `overlay-end` | 终局，显示总分和再来一局 |

---

## 5. 游戏流程

```
启动 → 初始化棋盘 → requestAnimationFrame 主循环

每回合:
  玩家操作（交换宝石）
  → 消除判定（匹配或不匹配回弹）
  → 伤害计算 + 英雄充能
  → 特殊宝石展开（火箭/炸弹）
  → 下落填充
  → 连环消除检测
  → 回合结束
  → 敌人计时器累加 → 满 → 敌人攻击
  → 英雄死亡检测 → 团灭 → 失败

波次结束:
  → 敌人 HP=0 → 波次通关弹窗
  → 下一波敌人登场 / 全部击败 → 胜利
```

---

# Part 2: 技术架构速查

## 6. 架构概览

- **编程范式**: 无 class，纯函数 + 全局状态对象
- **渲染方案**: Canvas（棋盘）+ DOM 面板（敌人/英雄/覆盖层）
- **驱动方式**: `requestAnimationFrame(gameLoop)` 帧循环

## 7. 全局状态

```js
board[8][8]           // 棋盘宝石值 0~4，-1=空
specials[8][8]        // 0=普通, 1=火箭, 2=炸弹
anim                  // 动画状态对象 {phase, elapsed, elimSet, dropCols, ...}
heroStates[]          // 英雄运行时（含 poisoned/poisonedDmg）
// 敌人战斗状态
enemyHP/enemyMaxHP/shield/score/turnCount/waveCount/comboCount
enemyStunned/enemyPoison/enemyPoisonDmg/enemyAtkDown/enemyDefUp
currentEnemyIdx/enemyTimer/frameCount
```

## 8. 动画状态机

```
idle → swapping → eliminating → dropping → idle
         ↕ swappingBack（交换无效时）       ↑ 连环消除时重回 eliminating
```

动画时长查主文件 `ANIM_SWAP`、`ANIM_SWAP_BACK`、`ANIM_ELIM_FLASH`、`ANIM_ELIM_SHRINK`、`ANIM_DROP`。

## 9. 关键函数索引

**棋盘**: `initBoard` / `getMatches` / `createSpecials` / `removeAndDrop` / `swap` / `isAdjacent`

**动画**: `startSwapAnimation` → `startSwapBackAnimation` → `startEliminateAnimation` → `startDropAnimation` → `finishTurn`

**战斗**: `processMatchesAnimated` / `dealDamageToEnemy` / `damageHero` / `enemyAttack` / `useHeroSkill`

**渲染**: `drawBoard`（Canvas 宝石+粒子+浮字）/ `renderHeroCards` / `updateHeroUI` / `updateUI`

**输入**: `cellFromEvent`（坐标转换）/ `handleDragEnd`（拖拽结算，含斜向容错）

**流程**: `startGame` / `restartGame` / `initGameState` / `togglePause`

## 10. gameLoop 核心逻辑

```js
gameLoop(ts):
  if paused → skip
  anim.elapsed += dt → switch phase (swapping/eliminating/dropping)
  粒子和浮动文字逐帧更新
  frameCount++ → 处理中毒与状态持续时间
  idle阶段 → enemyTimer++ / 达到 ENEMY_ATK_INTERVAL → enemyAttack()
  存活检测 → 团灭 → onPlayerDefeated
  drawBoard()
```

## 11. 版本记录

- **初始版**: 8×8消除 + 5英雄 + 3波敌人
- **当前版**: 4波敌人 + 6种状态效果 + 护盾系统 + 动画粒子 + 手机端适配
