# 项目上下文速查

> 换电脑后告诉 AI：「读取 `.codebuddy/project-context.md` 了解项目」

## 项目概览
独立 HTML 游戏原型集（纯前端，零依赖），手机端优先设计。

| 文件 | 类型 | 大小 | 状态 |
|------|------|------|------|
| `match3-rpg.html` | 三消RPG | ~40KB | 可玩 |
| `tarot-battle.html` | 塔罗卡牌桌游 | ~62KB | v2 可玩 |
| `test1` | 空文件 | 0B | 待定 |

---

## match3-rpg.html — 三消RPG「英雄之战」

### 核心机制
- 8×8 棋盘，5色宝石（火/冰/木/雷/光），横竖 3+ 消除
- 4连消 → 火箭（清行+1.5xATK），5连消 → 炸弹（3×3+2.5xATK）
- 5名英雄对应5色，匹配充能 → 点击释放技能（单体/AOE/治疗/暴击/护盾）
- 4波敌人：暗影魔龙 → 冰霜巨人 → 毒蝎女王 → 雷霆之王
- Combo 伤害加成：`1 + (combo-1)×0.2`
- 状态效果：中毒、眩晕、攻防 buff/debuff、护盾

### 架构
- 纯函数 + 全局状态对象，无 class
- 帧动画状态机：`swapping → eliminating → dropping → idle`
- 主循环：`gameLoop(ts)` 每帧检查动画阶段 + 敌人行动计时
- 敌人每 200 帧攻击一次，攻击类型随机

### 关键函数
```
initBoard/swap/getMatches/removeAndDrop     — 棋盘逻辑
startSwapAnimation/startEliminateAnimation/startDropAnimation/finishTurn  — 动画状态机
dealDamageToEnemy/damageHero/enemyAttack/useHeroSkill  — 战斗
gameLoop/drawBoard/renderHeroCards/updateUI  — 渲染
```

---

## tarot-battle.html — 塔罗对决「桌游原型 v2」

### 核心机制
- **小阿尔卡纳(56张)**：权杖/圣杯/宝剑/星币 × 数字1-10 + 4宫廷牌(固定10点)
- **大阿尔卡纳(22张)**：愚人~世界，每张正位/逆位两种效果
- 4元素阵对应4花色，双方各占一边比分数
- 抽到宫廷牌 → 额外抽大牌 → 正逆位选择 → 打出/弃牌
- **延迟效果系统**：战车免疫、皇帝锁死、隐士夺取等持续多回合
- 终局：4阵逐阵比分 → 胜者得1分(审判2分) → 总分定胜负

### 架构
- 单一 `TarotGame` 类管理全部状态
- `MAJOR_DEFS` 对象定义 22×2=44 种效果方法
- `TarotGame.aiAct()` 实现对手 AI（85%打出大牌）
- `continueFlow()` 驱动回合流转（setTimeout 链）

### 游戏流程
```
init → TarotGame.reset → startTurn 抽小牌
  → 数字牌：点阵打出 → endTurn
  → 宫廷牌：选阵 → 预览大牌 → 正逆位+目标阵 → 打出/弃 → endTurn
  → 重复直到小牌堆空 → finalScore → determineWinner
```

### 关键类/方法
```
TarotGame: reset/startTurn/courtSelectElement/majorDecision/playMinorToElement/endTurn
MAJOR_DEFS: effFoolU/effFoolR ... effWorldR (44个效果方法)
延迟系统: hasActiveDelayed/addDelayed/cleanupDelayed/resolveDelayed
AI: aiAct
```
