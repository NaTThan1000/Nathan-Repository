# 塔罗对决「桌游原型 v4」— 项目总览

> 文件: `tarot-battle-project/tarot-battle.html` | 单文件 ~110KB / 3000+ 行 | 状态: v4 可玩 + 调试模式 + 选牌交互

---

# Part 1: 游戏策划文档

## 1. 游戏概述

### 1.1 游戏定位
**类型**: 塔罗主题双人对战桌游 | **平台**: 网页 | **视角**: 人 vs AI

### 1.2 核心概念
双方轮流从牌堆抽牌，将小阿尔卡纳牌打入 4 个元素阵中比拼点数。抽到宫廷牌时额外抽一张大阿尔卡纳牌，大牌可产生强力一次性效果影响场上局势。小牌堆耗尽时终局结算，4 阵逐阵记分，总分高者获胜。

### 1.3 设计目标
- 用塔罗牌的大小牌分离机制创造"稳定出牌 + 突发事件"的策略
- 大牌正/逆位提供 44 种不同的一次性效果，高重玩性
- 单局约 10-15 分钟（56 张小牌轮流打出）

---

## 2. 系统设计

### 2.1 牌组系统

#### 小阿尔卡纳（56 张）— 稳定计分资源

| 花色 | 图标 | 数字牌(点数 1~10) | 宫廷牌(固定 10 点) |
|------|------|-------------------|---------------------|
| 权杖 | 🪄 | 权杖1 ~ 权杖10 | 侍从 / 骑士 / 皇后 / 国王 |
| 圣杯 | 🏆 | 圣杯1 ~ 圣杯10 | 侍从 / 骑士 / 皇后 / 国王 |
| 宝剑 | ⚔️ | 宝剑1 ~ 宝剑10 | 侍从 / 骑士 / 皇后 / 国王 |
| 星币 | 🪙 | 星币1 ~ 星币10 | 侍从 / 骑士 / 皇后 / 国王 |

**打出规则**:
- 数字牌 **必须打入相同花色** 的元素阵
- 宫廷牌 **也必须打入相同花色** 的元素阵，打出时 `playMinorToElement` 内部自动抽一张大牌预览
- 打出后点数加入该阵己方总分
- **`skipCourtTrigger`** 参数控制宫廷牌是否触发大牌抽牌：`false`(默认)触发 / `true`跳过（如"宫廷牌不触发抽大牌效果"的效果）

**弃牌堆规则**:
- 小牌丢弃 → 进入 `minorDiscard`（小牌弃牌堆）
- 大牌丢弃 → 进入 `majorDiscard`（大牌弃牌堆）
- 从弃牌堆抽牌时，**先对弃牌堆洗牌再抽**（教皇正位、审判正位等）
- 小牌堆和大牌堆仅在开局时洗牌，后续顺序固定

#### 大阿尔卡纳（22 张）— 一次性强力效果

每张大牌具有 **正位（upright）和逆位（reversed）** 两种效果，共 44 种效果。**全部为一次性效果**，打出后立即执行并弃入弃牌堆。

**大牌效果速查**:

| ID | 名称 | 正位 | 逆位 |
|----|------|------|------|
| 0 | 愚人 | 选阵双方小牌全弃+各抽2张打出 | 己方最大点数小牌弃+抽2张(无视元素)打出 |
| 1 | 魔术师 | 选2阵，第1阵己方1小牌移第2阵(无视元素) | 选2阵，第1阵敌方1小牌移第2阵敌方(无视元素) |
| 2 | 女祭司 | 选2阵，双方小牌移第2阵(无视元素) | 看小牌堆顶3选1打出(宫廷触发大牌) |
| 3 | 女皇 | 抽3小牌打出(宫廷不触发大牌) | 选阵，双方≤3小牌丢弃 |
| 4 | 皇帝 | 全部阵，不属当前阵小牌丢弃 | 选阵，双方宫廷牌丢弃 |
| 5 | 教皇 | 弃牌堆洗牌抽3张选1打出(宫廷不触发大牌) | 己方选2小牌弃+抽1大牌打出 |
| 6 | 恋人 | 抽2大牌选1打出，另1弃 | 选阵敌方1小牌移己方任意阵 |
| 7 | 战车 | 抽2小牌打出，同元素连锁(可重复) | 选阵双方小牌洗混重分配 |
| 8 | 力量 | 敌方最高点数1张移己方该阵 | 己方≥3全弃+抽到宫廷牌结束 |
| 9 | 隐士 | 抽2小牌选1打，另1可弃/放回堆顶 | 选2阵，第1阵己方小牌移第2阵(无视元素) |
| 10 | 命运之轮 | 全部阵己方小牌右移 | 全部阵己方小牌左移 |
| 11 | 正义 | 高点数方最小牌→对方 | 多牌方最大牌→对方 |
| 12 | 倒吊人 | 己方小牌全弃+抽2大牌选1打出 | 敌方小牌全弃+敌抽2大牌选1打出 |
| 13 | 死神 | 己方小牌全弃+同数量重抽 | 双方奇数小牌丢弃 |
| 14 | 节制 | 双方小牌洗混交替分配 | 选数字1~10，全部阵该数字小牌丢弃 |
| 15 | 恶魔 | 己方小牌全弃+敌方小牌移己方 | 全部阵宫廷牌弃+每弃1抽1小牌 |
| 16 | 塔 | 选阵双方小牌丢弃 | 各自点数之和最高阵小牌弃(并列均生效) |
| 17 | 星星 | 看堆顶5选2打出(宫廷不触发大牌) | 选阵双方小牌互换+敌方抽2小牌 |
| 18 | 月亮 | 抽2小牌背朝上打入己方阵(终局翻开) | 抽牌循环:非当前元素己方打→是则敌方打并停止 |
| 19 | 太阳 | 抽4小牌选2打+2交敌方 | 抽3小牌有宫廷全打无则全弃 |
| 20 | 审判 | 小牌弃牌堆抽2张打出 | 抽3小牌选1打/全弃抽1大牌(宫廷触发大牌) |
| 21 | 世界 | 全部阵含1~10→己方本局胜利 | 选阵双方小牌互换 |

---

### 2.2 元素阵系统

4 个元素阵分别对应 4 个花色，双方各占一边。每阵独立记分。

**阵属性**:
- `cards[]` — 该阵己方打出的小牌
- `score` — 当前总分（小牌点数之和）

**数字牌限定**：数字牌只能打入**对应花色**的元素阵。

### 2.3 回合系统

```
当前玩家回合:
  1. startTurn() → 从小牌堆抽 1 张（不再在抽牌时预览大牌）
  2. 数字牌 → 玩家/AI 选择元素阵打出 → endTurn()
  3. 宫廷牌 → 选阵打出 → playMinorToElement 内部自动抽大牌 → 玩家决定:
     - 打出大牌（选正/逆位+目标阵） → endTurn()
     - 弃掉大牌 → endTurn()
  4. 大牌效果可能触发选牌模式（select_card）→ 抽牌区交互选牌 → 确认后继续
  5. 回合结束 → 切换对手 → 循环
```

**终局触发**：小牌堆 `minorDeck.length === 0` 时立即进入 `endGame()`。

---

## 3. 数值设计

### 3.1 记分规则

| 环节 | 规则 |
|------|------|
| 小牌点数 | 数字牌 = 面值(1-10)，宫廷牌 = 固定 10 点 |
| 阵总分 | 阵中所有小牌点数之和 |
| 终局逐阵 PK | 胜者得 1 分，平局无人得分 |
| 总分平局 | 依次比较阵总点数 → 先手方 A 胜 |

### 3.2 AI 策略参数

| 决策 | 规则 |
|------|------|
| 大牌打出率 | 85% 概率打出，15% 概率弃牌 |
| 正逆位选择 | 70% 正位，30% 逆位 |
| 目标阵选择 | 选己方分数领先最多的阵；全落后则随机 |

---

## 4. 界面与交互

### 4.1 布局结构

战场采用**上下双行分离**设计：敌方区域在上、己方区域在下，每行独立展示 4 个元素阵。v4 移除了持续性大牌双牌堆显示（全部效果即用即弃）。

```
┌─────────────────── 顶部栏 ───────────────────┐
│ 行动次数 │ 🔵玩家A - 出小牌 │ 小:56 大:22  📋│
├─────────────────── 日志 ─────────────────────┤
│ 最近 3 条出牌记录...                          │
├─────────── 战场：上排 敌方(B) ────────────────┤
│ ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐     │
│ │🪄权杖│  │🏆圣杯│  │⚔️宝剑│  │🪙星币│     │
│ │[敌]  │  │[敌]  │  │[敌]  │  │[敌]  │     │
│ │迷你牌│  │迷你牌│  │迷你牌│  │迷你牌│     │
│ │B得分 │  │B得分 │  │B得分 │  │B得分 │     │
│ └──────┘  └──────┘  └──────┘  └──────┘     │
├─────────── 战场：下排 己方(A) ────────────────┤
│ ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐     │
│ │🪄权杖│  │🏆圣杯│  │⚔️宝剑│  │🪙星币│     │
│ │[己]  │  │[己]  │  │[己]  │  │[己]  │     │
│ │🂡🂢🂣 │  │🂱🂲🂳 │  │🂡🂢🂣 │  │🂱🂲🂳 │ ← 塔罗卡牌样式
│ │A得分 │  │A得分 │  │A得分 │  │A得分 │     │
│ └──────┘  └──────┘  └──────┘  └──────┘     │
├──────────────── 抽牌区 ──────────────────────┤
│  ┌──────────┐    ┌──────────────────┐       │
│  │🪄 权杖5  │    │🌟 愚人           │       │
│  │数字牌·5点│    │☀️正位：效果描述  │       │
│  │仅可打入  │    │↔ 切换正逆位     │       │
│  │权杖阵    │    └──────────────────┘       │
│  └──────────┘                               │
├──────────────── 操作栏 ──────────────────────┤
│               [🗑️弃大牌]  [🔄重新开始]        │
├─────────── 调试操控台 (🔧模式) ───────────────┤
│  🃏随机抽小牌 │ ⚡随机抽/出小牌 │ 🌟随机抽大牌 │ 🃏选抽牌  │
└──────────────────────────────────────────────┘
```

### 4.2 交互流程

1. 启动 → A 自动抽第一张小牌
2. 玩家仅可点击**己方(A)**元素阵（下排蓝色高亮区域）
3. 数字牌必须打入对应花色阵，禁用阵灰色不可点
4. 宫廷牌 → 选阵打出 → 自动预览大牌 → 可点击☀️/🌑切换正逆位 → 再点元素阵打出大牌
5. AI 回合自动执行（setTimeout 链），抽牌区显示"AI思考中"
6. 终局 → 弹窗展示 4 阵对决结果 → 宣布胜者

### 4.3 辅助功能

| 功能 | 操作 |
|------|------|
| 日志查看 | 点击顶部 📋 按钮弹窗 |
| 调试模式 | 点击顶部 🔧 按钮进入，双方均由玩家操控、AI 暂停 |
| 调试操控台 | 调试模式开启后显示4个按钮：🃏随机抽小牌、⚡一键出小牌、🌟随机抽大牌、🃏选抽牌 |
| 防重复打出 | 调试模式下追踪 `debugUsedCardIds`（Set），已打出/弃掉的牌 ID 不可再次选出 |
| 正逆位预览 | 宫廷牌抽到大牌后，点击☀️/🌑切换预览 |

---

## 5. 游戏完整流程

```
init() → TarotGame.reset() → 洗牌两副牌堆

┌─ 回合循环 ──────────────────────────────────┐
│ startTurn() → 抽小牌                         │
│   ├─ 数字牌: 点击阵出牌 → playMinorToElement  │
│   └─ 宫廷牌: courtSelectElement → 抽大牌       │
│       └─ majorDecision(打出/弃牌)             │
│ endTurn() → 切换玩家 (A↔B)                    │
│ 小牌堆空? → endGame()                        │
└──────────────────────────────────────────────┘

endGame() → finalScore()
  → 月亮正位翻开 → 4阵逐阵PK → determineWinner() → 展示结果
```

---

# Part 2: 技术架构速查

## 6. 架构概览

- 单一 `TarotGame` class 管理全部状态
- `MAJOR_DEFS` 内联数组定义 22 张牌效果（数据驱动），全部 type='instant'
- v4 核心简化：**所有44个效果均为一次性**，打出即执行+弃牌，无持续性/触发性机制
- 回合驱动：`continueFlow()` → setTimeout 链（异步，非帧循环）
- UI 渲染：`render()` 全量 innerHTML 重绘

## 7. TarotGame 核心属性

```js
minorDeck / majorDeck          // 牌堆（已洗牌）
minorDiscard / majorDiscard    // 弃牌堆（智能数组，push 时自动附加元数据）
currentPlayer                  // 'A' | 'B'
phase                          // 'play_minor' | 'play_major' | 'select_card' | 'game_over'
drawnMinor / drawnMajor        // 当前待处理的牌
majorOrientation               // 'upright' | 'reversed'
players.A/B.elements[suit]     // { cards[], score }
// 特殊状态标记
moonHiddenCards[]              // 月亮正位隐藏牌 [{player, element, cards}]
_pendingDrawnMajor             // 倒吊人/教皇逆位：待选大牌
_deferredMajor                 // 倒吊人逆位(12R)：敌方待选大牌（延迟至敌方回合）
// 选牌交互模式
_selMode                       // 'pick1Major' | 'pick1Minor' | 'pick2Minor' | 'pick1MinorOrSkip'
_selCards[]                    // 候选牌数组
_selContext{}                  // {effectName, player, element, onConfirm, onSkip}
_selIndex / _selIndices        // 选中索引（单选/多选）
```

## 8. 关键方法索引

```
TarotGame 回合流程:
  reset / startTurn / courtSelectElement / majorDecision / endTurn

效果引擎:
  _execEffect (处理 22×2=44 种一次性效果)

选牌交互:
  _enterSelectMode / selectCard / confirmSelection / skipSelection
  _aiSelectCards (AI 自动选牌逻辑)
  renderSelectionArea (选牌 UI 渲染)

终局:
  finalScore (含月亮翻开→4阵PK)
  determineWinner

AI:
  aiAct (85%打出大牌 + 分数领先阵选择)

辅助:
  playMinorToElement (内含宫廷牌触发大牌逻辑，受 skipCourtTrigger 控制)
  createMinorDeck / createMajorDeck / shuffle
  MAJOR_DEFS[22] (大牌定义数组)

UI:
  render / renderElementContent / renderDrawArea
  onElementClick / toggleOrientation / onDiscardMajor
  buildZonePreview / showLogViewer / showGameOver
  showCardSelector / forceEndGame
  debugToggleOrient / endDebugPlay / onDebugSelectCard / toggleDebugMode
  debugRandomMinor / debugRandomMajor / debugQuickPlayMinor
  continueFlow / runAITurn
```

## 9. 数据流

```
startTurn()
  → 小牌堆 pop()（不再在此处预览大牌）
  → AI/玩家选择元素阵

playMinorToElement(p, card, element, skipCourtTrigger=false)
  → 推入 element.cards[] + 更新 score
  → 宫廷牌且 !skipCourtTrigger → 大牌堆 pop() → 设置 drawnMajor + phase='play_major'

majorDecision(play, element, orientation)
  → _execEffect() + majorDiscard.push(card)
  → 清除幽灵引用（drawnMajor === card 时置 null）
  → 检测 _selMode / _pendingDrawnMajor / drawnMajor 决定后续流程

_enterSelectMode(mode, cards, context)
  → 设置 phase='select_card' → 人类等待点击 / AI 同步 auto-select
  → confirmSelection() → onConfirm 回调 → 清理状态 → continueFlow

endTurn() → 切换玩家 → 小牌堆空? → endGame → finalScore
```

## 10. 项目文件

```
tarot-battle-project/
├── tarot-battle.html             ← 主游戏 (~70KB，2300+ 行)
├── tarotEffect.csv               ← 大牌效果参考文档 (46 行)
├── tarot-battle-context.md       ← 项目上下文文档
├── major-arcana-viewer.html      ← 大牌效果速查工具（手机竖版）
├── tarot-card-redesign.csv       ← 效果重设计对比文档
└── archive/                      ← 旧版备份 (.gitignore)
```

## 11. v3 → v4 变更

| 方面 | v3 | v4 |
|------|-----|-----|
| 效果类型 | instant / persistent / trigger 三种 | 全部 instant 一次性 |
| 持续性大牌 | activeMajor 置阵中持续生效 | 无，打出即弃 |
| 效果检查链 | playMinorToElement 12步检查 | 无，直接打牌 |
| 辅助方法 | _chkPersistent/_hasPriestessBlock 等 | 全部移除 |
| 元素阵属性 | cards+activeMajor+majorHistory+lockedScore | cards+score |
| 终局结算 | 皇帝锁分+太阳判定+世界判定+皇帝加分 | 简化为逐阵PK |
| 代码量 | ~2740行/109KB | ~2100行/70KB |
| 效果内容 | 旧版44效果 | 全新44效果（基于 tarotEffect.csv） |

---

## 12. 最近更新记录

> 每次合并分支并同步本文档时，在本节顶部新增一条更新记录。

| 日期 | 分支/提交 | 修改内容 |
|------|-----------|----------|
| 2026-07-10 | `dev/tarot-update` | **选牌交互模式 + 宫廷牌触发机制重构 + 幽灵引用修复**：①新增 `_enterSelectMode` / `confirmSelection` / `selectCard` / `_aiSelectCards` 等选牌框架，支持 `pick1Major`/`pick1Minor`/`pick2Minor`/`pick1MinorOrSkip` 四种选牌模式；②10个大牌效果（12U/12R/6U/2R/5U/9U/17U/19U/20R）从自动选牌改为交互选牌，在抽牌区展示候选牌，玩家点击选择后确认；③`playMinorToElement` 内部接管宫廷牌触发大牌逻辑（受 `skipCourtTrigger` 参数控制），移除 `startTurn` 中的大牌预览；④修复 `majorDecision` 中效果未触发新大牌时旧 `drawnMajor` 幽灵引用导致误判"效果触发新大牌"的 bug；⑤新增 `renderSelectionArea` 选牌 UI 及 `.card-selected` CSS 样式 |
| 2026-07-10 | `dev/tarot-update` | **弃牌堆规则明确 + 教皇正位修复 + 宫廷牌规则调整**：①明确弃牌堆体系：`minorDiscard`(小牌弃牌堆)与 `majorDiscard`(大牌弃牌堆)分离，弃牌堆抽牌前先洗牌；②修复教皇正位(5U)与审判正位效果重复：教皇正位改为"弃牌堆抽3张选1张打出"；③宫廷牌规则改为必须在相同花色元素阵打出（与数字牌规则一致），修改 `onElementClick`、`aiAct`、`renderDrawArea` 等处代码 |
| 2026-07-10 | `dev/tarot-update` | **v4 大牌效果全面重做**：①全部44个大牌效果替换为新版（基于 `tarotEffect.csv`）；②所有效果统一为一次性(instant)，彻底移除持续性/触发性机制；③删除 `_setupActiveMajor`、`_chkPersistent`、`_hasPriestessBlock`、`_checkTowerTrigger` 等旧辅助方法；④元素阵数据简化为 `{cards,score}`；⑤简化终局结算；⑥移除大牌双牌堆显示 |
| 2026-07-10 | `dev/tarot-update` → `main` | **元素阵空阵对齐修复**：修复 `renderElementContent()` 中元素阵为空时「—— 暂无卡牌 ——」占位区域的 `min-height` 从 `50px` 调整为 `74px` |新增 `major-arcana-viewer.html` |
| 2026-07-09 | `dev/tarot-update` → `main` | **三张大牌效果重做 + CSV描述精确化 + 倒吊人大牌选择交互修复 + 调试模式增强 + UI优化** |
| 2026-07-08 | `dev/tarot-update` | **调试模式 + 卡牌叠放 + 大牌双牌堆 + UI 双行布局重构** |
| 2026-07-07 | `bf206bf` | **项目结构重组 + GitHub 仓库初始化** |
| 2026-07-06 | `v3.0-csv-rewrite` | **大牌效果引擎 v3 重构** |
