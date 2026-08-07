# F2S Handoff · bs-20260731-075411-09d248

> Adapter ID: `f2s-handoff`
> Session ID: `bs-20260731-075411-09d248`
> Handoff status: `ready`
> Source brief: `game-concept-brief.md`
> Source gap: `f2s-gap.json`
> External contract: `FromDemoToSpec/01-prototype-input-template.md`
> Contract version: `v1.3`
> Last verified against: `b2793deb266985d69bf25e662d3c342cf1be2682`
> Structural review: `passed`
> Semantic review: `passed`
> External flow started: `false`

## A. Validation Goal

### Core hypothesis

- 核心假设:双面翻牌(揭示/隐藏)+花色/数字/牌型约束推理的核心loop能产生aha乐趣;玩家因理解约束交互而非数值/运气通关 -- Sources: IDEA-012, IDEA-025, IDEA-030, RAW-006, RAW-007
- 可证伪:若试玩3局后玩家无法描述约束怎么交互或觉得无aha,假设不成立 -- Sources: IDEA-012, IDEA-025, IDEA-030, RAW-006, RAW-007

### Success criteria

- 通过判据1:谜题可解(存在至少一种翻面序列使剩余牌面满足目标+保留X约束) -- Sources: RAW-008, IDEA-030, IDEA-032
- 通过判据2:玩家在N步内通关(N为评级阈值,默认S≤10/A≤15/B≤20/C>20) -- Sources: RAW-008, IDEA-030, IDEA-032
- 通过判据3:试玩3局后玩家能自主描述约束怎么交互(aha验证) -- Sources: RAW-008, IDEA-030, IDEA-032
- 失败判据:玩家无法通关或通关后无法描述约束交互逻辑 -- Sources: RAW-008, IDEA-030, IDEA-032

### Excluded scope

- 跨局资源/养成/数值成长/社交/排行榜 / 与NG冲突;单机solo定位 -- Sources: RAW-002, RAW-003, IDEA-033
- 教程主导引导 / aha来自自主发现 -- Sources: RAW-002, RAW-003, IDEA-033
- 程序生成谜题的有趣度过滤 / first-playable阶段处理,原型用手工谜题 -- Sources: RAW-002, RAW-003, IDEA-033
- PVP人机对战 / later阶段 -- Sources: RAW-002, RAW-003, IDEA-033

## B. Core Interaction

### User operations

- 翻面(揭示):点击背面牌→牌面正面显示→受影响约束高亮(信息流反馈)→步数+1 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008
- 翻面(隐藏):点击正面牌→牌面翻回背面→级联影响预览(哪些约束失效/生效)→步数+1 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008
- 切换模式:无需显式操作,翻面方向由当前牌面状态决定(背面→揭示,正面→隐藏) -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008
- 查看约束:点击约束列表项→高亮该约束关联的牌 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008
- 提交目标:点击提交按钮→系统验证→通过则评级,不通过则继续 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008

### System response

- 翻面后:牌面状态改变→约束引擎求值→信息流反馈高亮受影响约束→步数计数器+1 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008
- 提交后:检查剩余正面牌+约束是否满足目标→检查保留约束数≥X(反平凡)→通过则评级,不通过则提示原因 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008
- 评级:按步数计算S/A/B/C,可选硬卡模式未达Y步直接判负 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008
- 级联预览:隐藏牌时预览哪些约束将失效(高亮或灰化) -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008

### Interaction loop

- LOOP-001 观察:玩家看网格+约束+目标+步数→系统显示初始状态 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008
- LOOP-002 翻面:玩家翻牌→系统改变状态+求值+反馈+步数+1→回到LOOP-002或进LOOP-003 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008
- LOOP-003 提交:玩家提交→系统验证目标+反平凡→通过则LOOP-004,不通过则回LOOP-002 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008
- LOOP-004 评级:系统按步数评级→进入下一谜题或重玩 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, RAW-006, RAW-007, RAW-008

## C. Data Objects

### Data objects

- Card: id, suit(花色:黑桃/红桃/梅花/方块), rank(数字1-13), faceUp(bool), constraints[] -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-032, RAW-008
- Constraint: id, type(花色/数字/牌型), rule(规则描述), affectedCardIds[], active(bool,当前是否生效) -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-032, RAW-008
- Puzzle: id, cards[], constraints[], target(目标描述), minRetainedConstraints(X), initialFaceUpRatio -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-032, RAW-008
- GameState: currentPuzzle, stepCount, rating, status(playing/submitted/passed/failed) -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-032, RAW-008

## D. State and Flow

### States and transitions

- initial: 谜题加载,牌面按initialFaceUpRatio随机设置正背面,步数=0 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-032, RAW-008
- playing: 玩家可翻面/查看约束/提交;翻面→步数+1+约束求值 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-032, RAW-008
- submitted: 系统验证目标满足+保留约束数≥X -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-032, RAW-008
- passed: 展示评级(S/A/B/C),可选重玩或下一谜题 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-032, RAW-008
- failed: 提示不通过原因(目标未满足/保留约束不足),回playing -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-032, RAW-008
- 转换触发:翻面(playing内循环),提交(playing→submitted),验证结果(submitted→passed/failed) -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-032, RAW-008

## E. Core Rules and Boundaries

### Core rules and boundaries

- 规则1:翻面改变牌面状态,背面→正面(揭示)或正面→背面(隐藏) -- Sources: IDEA-007, IDEA-030, IDEA-032, IDEA-033, RAW-002, RAW-005, RAW-008
- 规则2:约束仅在关联牌全部正面时生效;隐藏任一关联牌→约束失效 -- Sources: IDEA-007, IDEA-030, IDEA-032, IDEA-033, RAW-002, RAW-005, RAW-008
- 规则3:目标=剩余正面牌+生效约束满足特定条件(如花色同色/数字连续/牌型成立) -- Sources: IDEA-007, IDEA-030, IDEA-032, IDEA-033, RAW-002, RAW-005, RAW-008
- 规则4:反平凡解=提交时保留约束数(生效约束)≥X,否则判负 -- Sources: IDEA-007, IDEA-030, IDEA-032, IDEA-033, RAW-002, RAW-005, RAW-008
- 规则5:步数=翻面操作累计次数,不硬卡,作评级用 -- Sources: IDEA-007, IDEA-030, IDEA-032, IDEA-033, RAW-002, RAW-005, RAW-008
- 边界1:每局必须保留X约束(反平凡) -- Sources: IDEA-007, IDEA-030, IDEA-032, IDEA-033, RAW-002, RAW-005, RAW-008
- 边界2:不限定操作次数(除非可选硬卡模式Y步) -- Sources: IDEA-007, IDEA-030, IDEA-032, IDEA-033, RAW-002, RAW-005, RAW-008
- 边界3:无跨局资源/养成/数值成长 -- Sources: IDEA-007, IDEA-030, IDEA-032, IDEA-033, RAW-002, RAW-005, RAW-008

## F. UI Skeleton

### UI skeleton

- 主区:扑克牌网格(默认3x3),牌面正/背显示,点击翻面 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, RAW-008
- 侧栏左:约束列表(当前生效/失效状态)+目标显示 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, RAW-008
- 顶栏:步数计数器+评级预览(当前步数对应评级) -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, RAW-008
- 底栏:提交按钮+模式提示(当前可用操作:揭示/隐藏) -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, RAW-008
- 反馈层:翻面后高亮受影响约束(信息流反馈),隐藏时预览级联影响 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, RAW-008
- 信息优先级:牌面状态>约束状态>步数>评级 -- Sources: IDEA-012, IDEA-025, IDEA-030, IDEA-031, RAW-008

## G. Tunable Parameters

| Parameter ID | Name | Default | Range | Source IDs |
|---|---|---|---|---|
| F2S-PARAM-001 | gridSize | 3x3 | 2x2~5x5 | RAW-008 |
| F2S-PARAM-002 | minRetainedConstraints | 2 | 1~约束总数-1 | RAW-008, IDEA-032 |
| F2S-PARAM-003 | stepRatingThresholds | S≤10/A≤15/B≤20/C>20 | 可调 | RAW-008 |
| F2S-PARAM-004 | initialFaceUpRatio | 0.5 | 0.0~1.0 | IDEA-030 |

## Provenance

| Reviewer | Decision IDs | Brainstorm source IDs |
|---|---|---|
| user | DEC-001, DEC-002 | IDEA-007, IDEA-012, IDEA-025, IDEA-030, IDEA-031, IDEA-032, IDEA-033, RAW-002, RAW-003, RAW-005, RAW-006, RAW-007, RAW-008 |

> This package does not start FromDemoToSpec. Use the F2S entry command separately after reviewing this handoff.
