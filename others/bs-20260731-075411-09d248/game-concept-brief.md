# Game Concept Brief · bs-20260731-075411-09d248

> Playbook ID: `game-concept`
> Session ID: `bs-20260731-075411-09d248`
> Session title: 新游戏·涌现式知识锁机制脑暴
> Created: 2026-07-31T13:45:13.5157250Z
> Selected package ID: `PKG-003`
> Semantic review: `required`

> Format help: use `LOOP-001`, `PILLAR-001`, `ANTI-001`, and `CHECK-001` row IDs. `Source IDs` accepts only existing `RAW-*` / `IDEA-*`; put `DEC-*` only in Decision and Handoff.

## Concept Frame

| Concept | Target player / context | Emotional promise | Source IDs |
|---|---|---|---|
| 扑克牌知识锁解谜:玩家在扑克牌网格上翻面(揭示或隐藏),通过理解花色/数字/牌型约束的交互,让剩余牌面满足目标;步数评分,自由试错 | 喜欢解谜/逻辑推理的solo玩家;碎片时间场景(微信小游戏) | 弄懂规则怎么相互作用的洞察aha;做减法/做加法的双向掌控感 | RAW-002,RAW-003,RAW-005,RAW-006,RAW-007,RAW-008,IDEA-030 |

## Player Fantasy

| Fantasy | Player identity | Desired feeling | Source IDs |
|---|---|---|---|
| 成为看透牌局约束结构的解谜者 | 独自面对扑克牌网格的思考者 | 洞察aha(憋住的局突然解开);连锁爽感(一动改变全局);拼图美感(补全/秩序) | RAW-005,RAW-006,RAW-007,IDEA-003,IDEA-030 |

## Core Verbs

| Verb | Player intent | Feedback / consequence | Source IDs |
|---|---|---|---|
| 翻面(揭示) | 获取隐藏的牌面信息(花色/数字)用于推理 | 牌面正面显示;受影响约束高亮(信息流反馈) | RAW-006,IDEA-012,IDEA-031 |
| 翻面(隐藏) | 藏掉牌面让剩余约束收敛到目标 | 牌面翻回背面;级联影响预览(哪些约束因此失效/生效) | RAW-007,IDEA-025,IDEA-031 |
| 切换模式 | 自由选择加法/减法方向,随时调整策略 | 当前可用模式提示;无惩罚切换 | RAW-008,IDEA-030 |
| 查看约束 | 理解当前局面的约束规则(花色/数字/牌型) | 约束列表/可视化展示 | IDEA-012,IDEA-025 |
| 提交目标 | 验证当前牌面状态是否满足目标 | 通过=通关+步数评级;不通过=可继续操作 | RAW-008,IDEA-032 |

## Core Loop

| Step ID | Player action | System response | Return / progression | Source IDs |
|---|---|---|---|---|
| LOOP-001 | 观察初始牌面状态(部分正面/部分背面)与目标约束 | 显示网格+约束+目标+步数计数器(初始0) | 进入推理 | RAW-006,RAW-007,IDEA-030 |
| LOOP-002 | 翻面(揭示或隐藏)某张牌 | 牌面状态改变;约束求值;信息流反馈高亮受影响约束;步数+1 | 回到LOOP-002继续或进LOOP-003 | RAW-006,RAW-007,RAW-008,IDEA-012,IDEA-025,IDEA-031 |
| LOOP-003 | 提交目标验证 | 检查:剩余正面牌+约束满足目标?保留约束数≥X(反平凡)? | 通过则评级;不通过则回LOOP-002 | RAW-008,IDEA-032 |
| LOOP-004 | 通关评级 | 按步数评级(如S/A/B/C);可选硬卡模式=未达Y步直接判负 | 进入下一谜题或重玩优化步数 | RAW-008 |

## Design Pillars

| Pillar ID | Commitment | In-scope signal | Exclusion signal | Source IDs |
|---|---|---|---|---|
| PILLAR-001 | 知识锁:推进靠理解不靠刷 | 玩家因懂了而通关,非因数值/养成 | 出现需刷数值/等级才能解的局 | RAW-005,RAW-002 |
| PILLAR-002 | 涌现:规则简单但交互产生深度 | 少数约束规则组合产生复杂局面 | 规则数量堆叠代替交互深度 | RAW-005,IDEA-007 |
| PILLAR-003 | 双面统一:加法减法共享引擎 | 同一局可随时切换揭示/隐藏 | 加法减法分两套独立系统 | RAW-008,IDEA-030 |
| PILLAR-004 | 自由试错+步数评级:不硬卡操作 | 玩家可自由翻开/合上,步数作评级 | 限定操作次数硬卡(除非可选模式) | RAW-008 |
| PILLAR-005 | 反平凡解:每局保留X约束 | 目标设计排除全藏/全翻的平凡解 | 存在全藏=无约束=通关的漏洞 | RAW-008,IDEA-032 |

## Anti-goals

| Anti-goal ID | Avoid | Why | Source IDs |
|---|---|---|---|
| ANTI-001 | 重数值/养成 | 与知识锁主题冲突;推进靠理解不靠刷 | RAW-002 |
| ANTI-002 | 重商业化 | 约束排除;不做付费数值/抽卡/体力 | RAW-002 |
| ANTI-003 | 重内容消耗(手工排谜) | 谜题消耗>>手工产能;需程序生成 | RAW-002,IDEA-032 |
| ANTI-004 | 教程主导的引导 | 知识锁的aha来自自主发现,非教程灌输 | RAW-005,IDEA-033 |
| ANTI-005 | 单方向锁定 | 双面统一是核心;锁定加法或减法违背合一决策 | IDEA-030 |

## Scope

| Bucket | Included / excluded | Rationale | Source IDs |
|---|---|---|---|
| prototype | 扑克牌网格+双向翻面+约束引擎+目标验证+步数计数+反平凡解(保留X约束)+信息流反馈 | 原型验证核心loop:双面翻牌+约束推理+步数评级是否好玩 | RAW-006,RAW-007,RAW-008,IDEA-012,IDEA-025,IDEA-030,IDEA-031,IDEA-032 |
| first-playable | 级联可视化(翻面预览连带影响)+难度曲线(首关脚手架)+多谜题程序生成 | 首个可玩版需引导新手+多谜题验证可重玩 | IDEA-031,IDEA-033 |
| later | 可选硬卡模式(Y步以下)+PVP人机对战+主题皮肤扩展(符文/古迹等) | 延伸玩法,非核心验证所需 | RAW-003,RAW-008 |
| excluded | 跨局资源/养成/数值成长/社交/排行榜 | 与NG(重数值/养成/商业化)冲突;单机solo定位 | RAW-002,RAW-003 |

## Validation and Open Questions

| Item ID | Type | Statement | Source IDs | Next action |
|---|---|---|---|---|
| CHECK-001 | hypothesis | 双面翻牌+约束推理的核心loop有aha乐趣 | IDEA-012,IDEA-025,IDEA-030 | F2S原型验证:做1个谜题试玩 |
| CHECK-002 | risk | 平凡解:全藏或全翻可能绕过约束 | RAW-008,IDEA-032 | 原型需验证反平凡解(保留X约束)是否有效 |
| CHECK-003 | risk | 级联失效难预判:藏一张牌连带多约束失效,玩家挫败 | IDEA-031 | first-playable需级联可视化预览 |
| CHECK-004 | risk | 程序生成谜题有趣度难保证 | IDEA-032 | first-playable需结构化生成+有趣度过滤 |
| CHECK-005 | question | 步数评级阈值如何设计才既有挑战又不挫败 | RAW-008 | 原型后根据试玩数据调参 |
| CHECK-006 | question | 新手第一次aha在何处?无先验如何引导 | IDEA-033 | first-playable设计首关脚手架 |

## Decision and Handoff

| Brief status | Selected package ID | Decision IDs | F2S intent | Missing |
|---|---|---|---|---|
| accepted | PKG-003 | DEC-001,DEC-002 | requested | - |
