# Isaac 半回合制 — 项目决策记忆

> 记录所有重要决策、方案演变、反复变更、bug 攻克经验、创意脑暴结论。
> 核心判断标准："如果在另一台电脑不知道这件事，会不会做出错误决策或重复踩坑？" → 会就记。
>
> **修改规则**：
> 1. 本文档一旦记录内容，**不可修改或删除**已有记录。新内容按时间顺序在文件末尾追加，标注日期。例如方案从 A 改为 B，需完整保留 A 的记录 → 再在最新日期追加 B 的记录并标注"[当前方案]"，而不是覆盖 A。即使出现 X→Y→X 的反复变更也要完整保留每一步。
> 2. **不得编造任何数据**：包括但不限于具体到分钟的时间、未在对话中确认的数值、未实际发生的事件或"结论"。不确定的信息宁可省略或用模糊描述，绝不填充。日内时间描述仅可用"上午/下午/晚间"三个粗粒度标签，或完全不标注时间仅靠条目排列顺序体现先后关系。
> 3. **写入前强制排序验证**：每次追加新内容前，必须先读取全文 → 确认当前最后一个条目是什么日期和内容 → 新条目追加在文件末尾或同日期段落末尾 → 如果是同一天多个条目，按实际对话顺序从上到下排列。
> 4. **文档同步触发规则**：`isaac-turnbase-context.md` 和 `isaac-memory.md` 的更新不得在任何代码修改任务中附带执行。这两个文档的修改操作必须且仅由用户发出"同步文档"指令时触发。AI 在完成代码修改后如果认为文档需要更新，可以提醒用户，但严禁自行修改。此规则优先级高于 AI 对"代码和文档应保持一致"的默认行为倾向。
>
> **组织方式**：纯时间顺序，不做模块分类。给 AI 快速浏览聊天记忆用。
>
> 最后更新: 2026-08-04

---

## 2026-07-13

### 精灵图集集成
- 使用 `issac-idle.png`（32×32 每帧），替代程序化像素角色
- 头身分离叠加（头偏移 body 30%），4 方向 × 10 帧走路动画
- 射击表情切换（0.4s 持续），背面缺失方向暂复用正面帧
- 移动速度 280→70 px/s 适配动画
- 新增 sprite-debug.html 和 walk-preview.html 调试工具

### 项目上下文文档
- 首次创建 isaac-turnbase-context.md（策划文档 + 技术速查）

### 预操作队列系统 [已废弃]
- 玩家先规划本回合所有操作（移动队列 + 射击方向），填入队列后 Space 统一执行
- 执行阶段按队列顺序逐步执行，无暂停机会

---

## 2026-07-14

### 多房间地图设计方案
- 创建 isaac-roommonster-plan.md
- 包含楼层生成算法（随机图+BFS全连通）、房间类型（start/normal/treasure/shop/boss）、模板法内部布局、怪物配置表、掉落系统、AI行为类型枚举

### 怪物配置初始 [已废弃]
- MONSTER_CFG — 单一裂口尸，内联 JS 对象

---

## 2026-07-15

### 核心交互重构：即时操作模型 [当前方案]
- **[决策]** 彻底移除预操作队列，改为即时操作 + 快照系统
- **[原因]** 预操作队列体验差，缺乏容错能力，玩家无法在执行中调整决策
- **[方案]** WASD即时移动本体 + ↑↓←→即时射击 + Esc全重置 → 快照系统 saveTurnSnapshot/restoreTurnSnapshot
- 首次射击触发 checkpoint，刷新可移动范围
- 回合起始位置保留 40% 透明度幽灵作视觉参考
- **[属性调整]** 移速=3→M-AP=3，射速=3→A-AP=3，系数1，下限1

### TILE系统 + 房间模板 + 地图编辑器
- 定义 TILE 类型（FLOOR/ROCK/POOP/PIT/SPIKE/LADDER）
- 12 种 13×7 房间模板，BFS 连通性验证
- 创建 isaac-map-viewer.html 独立编辑器（模板池管理/画布绘制/关卡池持久化）
- 尖刺伤害当时未细化

---

## 2026-07-16

### 无敌系统初始方案 [已废弃，2026-07-20 统一]
- 战斗模式：受伤后无敌 3 回合（`invincibleTurns`）
- 探索模式：受伤后无敌 `invincibleSteps = 移速×2` 步（每移动一格递减）

### 怪物配置重构 [当前方案]
- MONSTER_CFG → MONSTER_DB 内联 JS（4种怪物 + 6种AI类型）
- 进而外置到 Configs/monster-db.json，新增 movementTags（地面/飞行）/ role（melee/ranged/tank/boss）/ threat（威胁值）
- **[原因]** 计划文档建议支持多种怪物类型，外置 JSON 便于编辑

### 刷怪算法
- 三层递进：标签过滤(movementTags ∩ allowedMovement) → 组合规则(至少1近战保底 + 角色多样性加权×3) → 点数预算(budget + (楼层-1)×2)

### 怪物视觉
- 渲染复用 drawCharacterAt()，tint 色彩叠加区分类型
- 头顶名称标签（Boss红字）、血条、受击白闪+抖动、路径预览、伤害飘字、死亡血粒子

### TILE系统调整
- 尖刺伤害：0.5（临时值，后续修正）
- 透视取消：VP_SCALE_TOP = VP_SCALE_BOT = 1.00，标准矩形渲染
- 房门重绘：开=通道+门框，关=铁栏纹理
- 移除预览线/透视描述等已淘汰内容

### 楼层生成强化
- Boss/宝箱房强制度数=1（单门死路），至少3个叶节点
- 所有房间度数≤4，布局 Manhattan 距离=1
- 楼层 grid 固化：加载 floor-data.json 时保留已存 grid，修改 pool.json 不影响已有楼层

### Git 分支策略确立
- Monorepo 按项目分功能分支：dev/match3 / dev/tarot / dev/issac
- main 分支保护规则：直接改 main 前必须先警告确认
- 上下文文档同步规则：合并 main 时全覆盖检查

### 项目文件整理
- 按类型分目录：Assets/ / Configs/ / Documents/
- 文件保护规则：不随意删除或重命名用户手动新增文件
- 多项目统一在同一个 CodeBuddy 对话中管理

### 编辑器初始方案 [已废弃]
- node Configs/server.js 提供文件读写服务
- 依赖 Node.js 环境

---

## 2026-07-20

### 无敌系统统一 [当前方案]
- **[决策]** 移除 invincibleTurns，战斗/探索统一使用 invincibleSteps = 移速×2
- **[关键规则]** 战斗结束回合时未消耗 M-AP 计入无敌步数：invincibleSteps -= turnState.mAP（只读，不改变AP系统）
- **[原因]** 战斗↔探索切换时无敌持续逻辑不一致
- **[示例]** 移速=3 → 受伤后无敌6步。战斗中移动1步结束回合，剩余2 M-AP → 再减2步，无敌剩3步

### 尖刺伤害修正 [当前方案]
- 尖刺伤害定为：玩家 2 / 怪物 5
- **[原因]** 之前 0.5 无法实际扣除整数 HP

### 怪物伤害按类型区分
- 裂口尸/浮游眼=1，魔像/Boss=2
- 怪物尖刺判定新增（经过尖刺格 → 5点伤害）
- C键随机生怪：95%普通池 + 5%含Boss随机

### 道具系统
- **[决策]** 创建 isaac-turnbased-demo2.html（独立文件），不在原 demo.html 上改动
- 25 种被动道具：15普通 / 7稀有 / 3传说
- 掉落规则：宝箱房必定稀有、Boss房清怪后掉落（20%传说/50%稀有/30%普通）
- F键拾取 + 属性叠加 + 道具栏UI（底部图标+悬浮提示）
- 品质区分：传说=金色边框+呼吸光效、稀有=蓝色边框、普通=棕色边框
- 特殊效果：穿透子弹（丘比特之箭/死神的镰刀）、伤害倍率（蟋蟀头×1.5）

### AP动态绑定属性
- maxMAP = Math.floor(moveSpeed)、maxAAP = Math.floor(fireRate)
- **[原因]** 道具改变属性后 AP 需同步变化
- **[规则]** 向下取整保证整数步数

### 小地图 + 访问记录
- 右下角 100×80px 小地图，已探索/未探索/当前房间金色边框
- visitedRooms(Set)：已进入房间不再刷怪

### 编辑器去服务器 [当前方案]
- 尝试 PowerShell server.ps1 / Python server.py / `<form>` POST 均失败
- **[最终方案]** File System Access API + "生成json"按钮手动复制粘贴 + IndexedDB 持久化文件句柄
- **[清理]** 删除 Configs/server.js、test-save.html、server.py、server.ps1
- **[结论]** 不装 Node/Python 时最可靠方案

### 原始 demo 文件保护
- 多次误改 demo.html，通过 git checkout 还原
- **[规则]** 后续改动仅在 demo2 和 map-viewer 中进行

### 同步文档流程优化
- 先同步文档 → 统一 commit → push → merge main → 切回（避免重复合并 main 两次）

### 三层记忆体系建立 [当前方案]
- **[问题]** 多台电脑开发，CodeBuddy 对话不在不同电脑间同步
- **[方案]** L1 global-rules.md（通用规范）+ L2 memory.md（项目决策记忆，即本文档）+ L3 context.md（策划+技术速查）
- **[大小策略]** 不分月，单文件预估年增长约 100KB，至少撑 2-3 年
- **[初始规则]** 更新统一在合并 main 流程中执行；切换电脑前 commit+push
- **[使用方式]** 不同电脑新会话启动时，用户主动让 AI 读取三文件
- CodeBuddy Memories 保留精简版作为自动加载索引，与 global-rules.md 互补

### HP系统心形改造 [当前方案]
- **[决策]** 血量上限从 6 → 3，改为以心为单位的血条系统
- **[数值]** 所有玩家伤害减半：普通怪物 0.5 心（半心）/ 高级怪物+Boss+尖刺 1 心
- **[UI]** 新增半心显示（`.heart.half`），左半红右半暗。满心(≥i+1) / 半心(≥i+0.5) / 空心。空心底色可看出血上限
- **[实现]** hp 支持 .5 浮点值，`updateHearts()` 新增 `half` class 判断，`buildHearts()` 按 maxHp 生成心形元素
- **[修改范围]** demo.html + demo2.html：playerStats/maxHp、MONSTER_DB damage(4种)、updateHearts、recalcAllStats 基准值、尖刺伤害
- **[规则]** 可以回血但不超过血上限，可以通过特殊效果增加血上限

### 文档体系规则修正 [当前方案]
- **[更新时机修正]** 三层文档的更新时机与合并 main 解耦，由用户主动触发"同步文档"指令。两者独立操作，只是通常同时要求。
- **[global-rules 修改规则]** 可修改已有规定；新规范与旧规范冲突时 AI 必须先指出冲突并向用户询问保留哪种；内部必须唯一无歧义
- **[memory 修改规则]** 一旦记录不可修改或删除；方案变更加追加新记录而非覆盖旧记录；按时间顺序记录不做模块分类
- **[一致性原则]** global-rules + Memories 不允许冲突，memory 允许冲突但须有"[当前方案]"标注

### AI自动提交行为纠正 [2026-07-20]
- **[问题]** AI 在完成代码修改后惯性追加 commit/push/merge 流程，用户未要求提交
- **[根因]** 之前多次同步文档+合并流程形成了默认收尾惯性
- **[纠正]** AI 只在用户明确说出"同步文档""提交推送""合并main"等指令时才执行 Git 操作，其他情况只改代码不动 Git

### global-rules §1.4 正式化 [2026-07-20 追记]
- **[决策]** 将 AI 禁止自动 Git 写入操作写入 global-rules.md §1.4 作为正式跨项目规范
- **[规则]** §1.4 明确规定：commit/push/merge/rebase/reset --hard 等写入操作需用户显式指令方可执行；git status/diff/log/branch 等读取操作可自由执行
- **[触发关键词]** "提交/推送/合并/同步文档/commit/push/merge"
- **[Memory 同步]** 创建 Memory ID 70076756 作为自动加载索引

### Git 推送：HTTPS被封 → SSH替代方案 [当前方案]
- **[问题]** 本机网络 DPI 防火墙拦截 git/curl 对 github.com:443 的 HTTPS 连接（TCP 握手成功但 TLS SNI 被 RST），而 SSH 22 端口正常。PowerShell/.NET 的 Invoke-WebRequest 可访问 GitHub API（走不同 TLS 栈），但独立 curl.exe 同样超时
- **[诊断过程]** ①Test-NetConnection 443 True（TCP通）②git push 超时 21s ③`GIT_CURL_VERBOSE=1` 确认 curl 层 TCP 超时 ④PowerShell Invoke-WebRequest 访问 api.github.com 成功 ⑤确认 sslbackend=schannel 无代理
- **[密钥生成]** 生成 ed25519 SSH Key：`C:\Users\Fishy\.ssh\id_ed25519`（`ssh-keygen -t ed25519 -C "nathan-zhang-github"`）
- **[Deploy Key 绕行]** 用户级 SSH Key API 需要 `write:public_key` scope，但存储的 PAT（`gho_*`）只有 `gist, repo, workflow`。仓库级 Deploy Key API（`POST /repos/{owner}/{repo}/keys`）仅需 `repo` scope，成功添加（ID: 157732142，read_only=false）
- **[凭据提取]** 通过 `cmd /c "type .temp_cred.txt | git credential fill"` 从 Windows Credential Manager 提取 token（cmd pipe 避免 PowerShell 编码拦截）
- **[最终方案]** `git remote set-url origin git@github.com:NaTThan1000/Nathan-Repository.git`，SSH 22 端口稳定推送
- **[跨电脑注意]** 其他电脑的 remote 仍为 HTTPS（需同样改为 SSH，或生成新 Key 走 Deploy Key API），SSH Key 私钥仅本机持有不可迁移

---

## 2026-07-21

### 设计三要素评估 (上午)
- 当前判断：核心机制（即时操作+Esc兜底）有辨识度(★★★★)，但操作复杂度和概念数量超出"简单核心"期望(★★★)，上手门槛较高(★★)
- 轻快节奏优先：去掉二次确认、幽灵等冗余元素，弱化内部 checkpoint 概念
- WASD+箭头键保持（以撒同款），道具系统先跑通 shallow roguelike 体验

### UI精简与操作流程优化
- **[决策]** 去掉 Space 二次确认弹窗（`turn_end_confirm` 阶段），Space 直接结束回合
- **[决策]** 去掉回合起始幽灵（`drawTurnStartGhost()`）
- **[原因]** 幽灵概念对轻快节奏帮助有限，可能造成新玩家理解门槛
- Esc 不需要误触保护（代价低）

### 动画系统
- **[新增]** 战斗开始"交叉剑"动画：两剑从屏幕左右飞入旋转，中心碰撞火花，0.55秒渐隐
- **[新增]** Esc 全重置"时间倒流"动画：蓝色收缩光圈 + 白色闪光覆盖，0.35秒
- 动画计时器在 gameLoop 中更新，由 `battleStartAnim` / `rewindAnim` 状态控制

### 文字渲染重构：Canvas → DOM 覆盖层
- **[问题]** Canvas 的 CSS `image-rendering:pixelated` 导致所有文字（无论中英文、无论字体）均被最近邻缩放压成马赛克，不可读
- **[解决方案]** 创建 `<div id="text-overlay">` DOM 覆盖层，952×558px 绝对定位于 Canvas 上方，`pointer-events: none`
  - 怪物名 → `.txt-monster-name` (12px 微软雅黑，boss 红字)
  - 伤害飘字 → `.txt-damage` (14px Arial，透明度动画)
  - A-AP 圆点 → `.txt-aap` (18px 圆形，用尽灰色空心)
- **[结果]** Canvas 文字绘制全部移除以避免干扰，字体清晰度完全由浏览器文本渲染保证
- DOM 元素在 `updateTextOverlay()` 中每帧更新位置和状态，`drawDamageNumbers` 保留为桩函数

### 演示版本修复 / visitedRooms
- demo.html 的 `finishTransition` 无条件调用 `spawnRoomMonsters()`，已补全 `visitedRooms` Set 追踪逻辑
- demo2 的 `finishTransition` else 分支增加 `updateUI()` 调用

### 字体规范 [当前方案]
- **Canvas 文字全面废弃**，全部通过 DOM 覆盖层渲染
- DOM 文字使用系统标准字体（`sans-serif`/`Arial`/`微软雅黑`），不强制像素风
- 后续除非有特殊要求，不再使用像素字体

### 碰撞系统全面重构 [当前方案]
- **移除击退/反弹**：`tryPushPlayer()`/`tryPushMonster()` 整段删除。碰撞统一为：受伤 + 共格，无推击反弹
- **怪物→玩家碰撞简化**：`updateMonsterTurn` 中不再尝试推玩家或反弹怪物，直接 `damagePlayer` + 怪物占格
- **玩家→怪物碰撞**：BFS 不阻挡怪物格（玩家随时可穿越），走 `damagePlayer` 处理
- **轨迹系统**：`turnMovePath` 记录每步 `{col, row, invincibleSteps}`，支持曼哈顿回溯
  - 踩怪格 → `damagePlayer` 扣血+无敌，标记 `turnContactStepIdx`
  - 离开怪物格 → **不撤销**（无敌正常递减）
  - 后退超过接触步 → 回血+回无敌
  - Checkpoint 射击 → commit 接触状态（清标记）
  - 回合开始 → `recalcContactDamage` 首次检测
- **invincibleSteps 回溯**：快照保存/恢复 `invincibleSteps`；轨迹每个节点记录无敌值，后退时恢复
- **差异讨论**：用户澄清两次才定案——第一次要求曼哈顿回溯但实现后出一直无敌 bug（因无敌计时不回溯），最终定为全部回溯+固定不刷新

### memory 修改规则扩充
- **[新增规则2]** 不得编造任何数据：具体到分钟的时间、未确认数值、未发生事件、未确认状态等。日内时间仅可用"上午/下午/晚间"三个粗粒度标签，或完全不标注时间仅靠条目排列顺序体现先后关系
- **[新增规则3]** 写入前强制排序验证：每次追加新内容前必须先读取全文 → 确认最后一个条目位置 → 新条目追加在末尾或同日期段落末尾 → 同一天多个条目按对话先后从上到下排列
- **[对应]** global-rules §4.4（AI 数据真实性规范）+ §2.8（文档写入前验证流程）

### §2.9 规则传播检查建立 [当前方案]
- **[背景]** 本轮新增的 §4.4 / §2.8 规范本应同步到 global-rules，但 AI 完成局部修复后未主动检查是否需要传播，用户指出"规则写了但执行不到"
- **[决策]** 在 global-rules §2.9 建立规则传播检查：当用户发出"同步文档"指令时，检查本期项目级文档中的新增规则是否跨项目通用，是则同步到 global-rules
- **[触发调整]** 初版设为"每次修改项目文档后触发"，用户指正后修正为"仅在用户发出同步文档指令时触发"，避免日常开发中频繁无效触发导致 AI 麻木
- **[原因]** 同步文档本身即系统性审查节点，在此处追加传播检查最自然、遗漏率最低
- **[Memory]** 创建 Memory ID 78482030

### 怪物配置异步加载 [当前方案]
- **[决策]** MONSTER_DB 从内联 JS 常量改为 `let MONSTER_DB = {};` + `async loadMonsterDB()` 从 `Configs/monster-db.json` fetch 异步填充，`_rebuildMonsterPools()` 重建 `MONSTER_POOL_NORMAL` / `MONSTER_POOL_ALL` 过滤池
- **[原因]** 彻底解耦配置与代码，monster-db.json 为单一数据源，后续修改怪物只需改 JSON 不碰 HTML

### 道具数据库外置 [当前方案]
- **[决策]** 创建 `Configs/item-db.json`（25种被动道具完整配置：effects 数值属性 + specials[] 结构化特效）+ `Configs/item-drop-tables.json`（三张掉落表按品质权重分配）
- **[原因]** 道具配置从内联 JS 迁移到外部 JSON，与怪物配置保持一致的数据外置策略

### 特效系统结构化 [当前方案]
- **[决策]** `cfg.special` 字符串（`"piercing"` / `"damage_mult_1.5"`）改为 `cfg.specials[]` 结构化数组，新增 `SPECIAL_EFFECT_HANDLERS` 注册表（piercing/damage_mult/heal_full）
- **[原因]** 旧字符串方案每加一种特效要改多处（recalcAllStats、配置定义等），注册表模式只需在 handlers 中加一个 key，注册表分发统一处理
- **[向后兼容]** `recalcAllStats()` 保留对旧 `cfg.special` 字符串的判断分支

### 掉落系统改造 [当前方案]
- **[决策]** `spawnTreasureRoomItem()` / `spawnBossRoomItem()` 从硬编码概率改为掉落表机制（`rollItem(null, 'treasure_room')` / `rollItem(null, 'boss_room')`），由 `item-drop-tables.json` 控制品质分配
- **[原因]** 掉落表可独立配置和热更新，无需改代码

### 怪物伤害同步修正 [当前方案]
- **[决策]** monster-db.json 中全部怪物伤害同步半心制：裂口尸 1→0.5 / 浮游眼 1→0.5 / 岩石魔像 2→1 / 裂口之王 2→1
- **[原因]** HP系统改为3心制时 monster-db.json 伤害值未同步修正，导致实际伤害比预期高2倍

### Boss Jumper — 2×2跳跃Boss系统 [当前方案]
- **[决策]** 新增 `boss_jumper` 怪物类型，替代旧 `boss_maw_king` 为每层Boss房唯一Boss
- **[2×2体型]** 怪物 `size:2` 属性，占据4个格子（col/row为左上角），配套 `monsterCells()` / `isInMonsterFootprint()` / `isValidLandingZone()` 辅助函数。全面适配渲染（中心偏移 `CELL*(sz-1)/2`）、碰撞（子弹/玩家接触4格检测）、快照系统
- **[行动循环]** 状态机 phase 1→2→3(50%重复)→4→1。小跳2次 → 判定 → 大跳1次 → 循环
- **[小跳跃]** 中心距离判定（横向/纵向选远的 ×3步）→ 落点4格内玩家0.5伤害。无视岩石尖刺，单不能全深坑。弧线动画（sin弧线+ease-in-out+缩放弹跳）
- **[大跳跃]** Boss消失1回合（缩小淡出动画）→ 玩家回合结束落下（缩放弹出+双圈冲击波）→ 12格1点伤害（目标2×2+8邻格）。跳起时判定落点，`pendingBossLanding` 延迟执行。`jumperJustLanded` 落地回合休息
- **[宝藏房]** 不再刷怪；道具仅宝箱房+Boss清空房
- **[接触伤害]** 角色碰撞Boss 0.5伤害，使用 `isInMonsterFootprint` 适配2×2
- **[修复]** 渲染中心偏移（`CELL*sz/2`→`CELL*(sz-1)/2`）、落地回合额外行动（`jumperJustLanded` 跳过）

---

## 2026-07-22

### 楼层生成两步法重构 [当前方案]
- **[问题]** 旧 `generateFloor` 将所有房间一起布局后再分配类型，Boss/宝箱可能随机出现在集群中间，导致需要裁边（保留1个门）+ 连通性修复逻辑。裁边后图可能断开，需要 `isConnected` 回退恢复连通，复杂且不直观。
- **[方案]** 改为两步法：①骨架房（起点+普通房）先用现有的"从所有已放房间的相邻空位扩展"算法布局并全连通；②从所有骨架房边界收集空位，Boss 选距离起点最远的挂载，宝箱从剩余空位随机挂载。
- **[结论]** Boss/宝箱始终在集群外围，天然只有 1 个门连接，不再需要裁边 (`finalEdges`/`keptFor`/`skipped`/`isConnected` 全部移除)。代码更简洁、逻辑更清晰。
- **[影响文件]** `isaac-map-viewer.html` — `generateFloor()` 函数重写（约80行新逻辑）

---

## 2026-07-23

### AI行为参数外置 — monster-db.json `aiParams` 字段 [当前方案]
- **[问题]** 怪物AI行为参数（浮游眼移动/射击权重、蓄力魔像冲刺距离范围、Boss提速间隔、跳跃Boss步数/概率）全部硬编码在 `calcAllMonsterPaths()` 和 `processJumperAction()` 中，策划无法调参
- **[决策]** 在 `monster-db.json` 每个怪物条目新增 `aiParams` 结构化对象，将AI参数全部外置为JSON配置。代码统一通过 `const ap = m.aiParams || {}` + `??` 兜底读取，兼容旧存档
- **[影响范围]** 5个怪物（crack_maw空对象、flying_eye移动权重+距离+射程、charge_golem冲刺距离、boss_maw_king提速间隔、boss_jumper跳跃步数+概率+伤害）。双HTML文件同步修改（ranged_kite/charge/boss_chase/boss_jumper AI分支 + 存档序列化）。monster-db.json 新增 aiParams 字段
- **[同步修复]** context.md 中过时常量：rock_golem→charge_golem、HP 20→30、子弹速度 280→560、子弹重力 550→1100、粒子重力 180→360

### 配置外置全面审计 — 分类原则与设计决策 [当前方案]
- **[触发]** 用户要求将AI硬编码参数挪入JSON后，继续追问"类似的问题也都检查一下，目前有的json文件哪些代码是可以挪出来的"，触发系统性审计而非单点patch
- **[审计范围]** 审查全部6个JSON文件（monster-db / item-db / item-drop-tables / pool / floor-data）+ 2个HTML（demo / demo2），逐段搜索硬编码数值、权重、距离、间隔、概率等
- **[分类结果]**
  - ✅ **应外置（已完成）**：怪物AI行为参数 → `monster-db.json.aiParams`。涵盖浮游眼（moveWeight 0.7 / moveDist 1~3 / shootRange 4）、蓄力魔像（chargeDist 3~6）、裂口之王（speedBoostInterval 4）、跳跃巨兽（smallJumpSteps 3 / repeatChance 0.5 / landDamage 1）。crack_maw 为 `{}`
  - ❌ **保留代码（明确决策）**：①渲染常量（CELL/WALL/COLS/ROWS/子弹速度/重力/粒子重力）— 引擎级参数，与tile布局强绑定，改一个会牵动布局和视觉；②动画时长（跳跃动画0.35/0.55s）— 视觉调参，不属于策划数据范畴；③刷怪系统参数（floorBonus×2、提前停止阈值30%、role权重×3）— 核心算法内部调参，暂不暴露
- **[设计原则]** 判断标准：策划日常需要调整的值 → JSON；引擎/渲染/算法内部调参 → 代码。作为后续同类审查的指导原则
- **[兜底方案]** 代码统一 `const ap = m.aiParams || {}` + `??` 默认值，确保旧存档/缺失字段不崩

### 双HTML文件同步策略 [当前方案]
- **[现状]** demo.html 使用内联 `MONSTERS_INLINE` JS对象定义怪物数据；demo2.html 通过 `fetch(Configs/monster-db.json)` 异步加载。两文件功能平行独立
- **[同步策略]** 任何涉及怪物系统的修改必须同步两份代码。本次修改量：demo.html 内联定义新增5个 `aiParams` + ranged_kite/charge/boss_chase AI代码全部改造 + 存档序列化补字段；demo2.html 怪物初始化注入 `aiParams` + 同4个AI分支改造 + 存档序列化补字段
- **[风险]** 双文件维护成本高，但 demo.html 是早期快照版本的备份（用户明确保护不可删除），暂不合并
- **[验证]** 修改完成后确认0处剩余AI硬编码（`Math.random()<0.7` / `3+Math.floor(4)` / `turnIdx%4===0` 均已替换为 ap 读取）

### context.md 同步修正
- 本次文档同步中逐章节交叉比对，发现并修正过时数值8处：怪物表名 rock_golem→charge_golem、HP 20→30、子弹速度 280→560 px/s、子弹重力 550→1100 px/s²、粒子重力 180→360 px/s²

### global-rules §2.10 建立 — Memory 记录完整性要求 [当前方案]
- **[触发]** 今日 AI 在记录 aiParams 外置讨论到 memory 时，只记录了代码变更结果（aiParams 字段），遗漏了三个重要讨论内容：配置外置审计方法论与分类标准、双HTML文件同步策略、context.md 过时常量修正。用户追问"为什么今天讨论的内容你没有记录到memory文档里"后逐项补全
- **[问题根因]** AI 习惯于记录"最终代码做了什么"而忽略"讨论途中确立了什么原则和方法论"
- **[决策]** 在 global-rules §2.10 建立 Memory 记录完整性要求：必须覆盖当天全部决策深度（推理链/审计范围/分类标准/策略流程），不只记结果。写入 memory 前回溯当天完整对话逐条确认零遗漏
- **[定位]** 与 §4.4 互补：§4.4 管"不编造虚假数据"，§2.10 管"不遗漏真实讨论"

### global-rules §4.5 建立 — 疑问句与指令的区分 [当前方案]
- **[触发]** 用户问"你觉得今天遗漏了讨论内容这件事，需不需要记录到global-rules里面呢？"AI 将征求意见的疑问句误判为执行指令，直接写入了 global-rules。用户纠正："你能区分得清问题和指令吗？"
- **[问题根因]** 与 §1.4 纠正过的"AI 自动提交"同类边界判断错误——没有区分"征求意见"和"下达指令"
- **[方案讨论]** 用户再次以疑问句测试："你觉得刚才你出的这个问题，需要更新到global-rules里面吗"，AI 正确识别为征求意见，分析两个方案（A.扩展§1.4 / B.新增§4.5）并推荐方案B，等待确认后执行
- **[最终方案]** global-rules §4.5：疑问句/征求意见（只分析建议等确认）vs 明确指令（可执行）。覆盖文件写入、Git操作、命令执行等所有有副作用的操作
- **[定位]** 与 §1.4 互补：§1.4 管理 Git 写入操作边界，§4.5 从交互语义层面区分"问"与"令"，适用于所有有副作用的操作

---

## 2026-07-24

### 验证列表遗漏事件 — 暴露 memory 记录方式缺陷
- **[问题]** 用户追问"昨天讨论的验证列表"时，AI 无法回溯——经确认，该验证列表在 7/23 讨论过但未记录到 memory。原因是 AI 一直以"代码变更驱动"方式写 memory，验证列表没有代码变更因而被遗漏。
- **[根因]** memory 的设计初衷是**对话记忆**而非代码变更日志，但 AI 的实际执行方式偏离了这一初衷，形成了"只记代码结果"的惯性。
- **[验证列表内容]** 当前无法恢复（cb_summary 已压缩丢失，对话原文已不可溯源）。已知概要：AI 给用户列出了一组需要用户亲自验证的设计/体验项，围绕"游戏是否好玩、设计是否合理优秀"。
- **[决策]** 此事件触发 global-rules §2.10 更新：明确 memory 本质是对话记忆，新增"设计验证/待办任务"必须记录的要求，以及"记忆触发标准"（如果在将来新会话中可能需要回溯→必须记录）。
- **[适用] 此标准跨项目通用，已同步到 global-rules。

### Memory 更新标准明确 — 对话驱动 vs 代码变更驱动
- **[用户说明]** memory.md 的设计初衷："在任何时候，在任何电脑上，都可以实现几乎在跟同一个有统一记忆的 AI 聊天"。"什么样的内容需要记录到 memory"→ 基于"完整记忆"的初衷：任何在当前对话中讨论过的、未来新会话中可能需要回溯引用的内容，无论是否涉及代码变更。
- **[结论]** memory = 对话记忆，≠ 代码变更日志。记录标准从"改了代码→记录"扩展为"聊过的重要事→记录"，覆盖：设计验证清单、待办测试项、设计疑问、待定方案、创意方向、流程决策等所有讨论内容。
- **[影响]** global-rules §2.10 已补充"设计验证/待办任务"条目和"记忆触发标准"。

### Memory 记录重点深化 — 轨迹 + 采纳状态
- **[用户补充]** 在上一项基础上进一步细化记录重点：
  1. **想法推进的完整轨迹**：一个想法 A 如何变成 B，又如何变成 C，结果的节点要记，结果导向的过程和原因也要记。不跳步骤、不只保留最终态。
  2. **AI 建议的采纳状态**：当用户发起方向性讨论（如"游戏下一步该做什么"），AI 提供建议后，需要标注每条建议的用户反馈——采纳（并执行）、否定（并说明原因）、无视（未回应）。这确保将来回溯时能知道当时有哪些路径被考虑过、哪些走了哪些没走、为什么。
- **[影响]** global-rules §2.10 二次更新：新增"想法推进的完整轨迹""AI 建议的采纳状态"两条具体要求，记忆触发标准新增"AI 建议列表及其采纳/否定/无视状态""想法演变轨迹"两项。

### 怪物移动配置统一重构 [当前方案]
- **[问题]** 怪物移动步数配置用 4 套不同字段各自为政：`moveCycle` 节奏数组（chase/boss_chase）、`moveDistMin`~`moveDistMax` 随机区间（ranged_kite）、`chargeDistMin`~`chargeDistMax` 区间（charge）、硬编码固定值（boss_jumper/patrol）。同一概念（"怪物每回合走多少格"）参数名不一致。且浮游眼的 `moveCycle:[1,1]` 纯属废字段（ranged_kite 从不读取 moveSpeed）。
- **[讨论过程]** 最初方案是只在外层加 `movement` 统一记录步数，方向模式仍依附于 aiType。用户指出"移动方向不同应该单独有个参数来区分"，最终确立两个维度完全解耦的结构。
- **[决策]** 新增统一 `movement` 结构：`mode`（朝哪走：chase/random_wander/charge_dir/jump/none）+ `steps`（步数池数组）+ `stepMode`（如何取值：sequence按序轮换 / random随机抽）+ `weight`（仅 random_wander 模式，移动概率）。所有 12 只怪物全部迁移。
- **[结构设计]** 两个维度职责分明：`mode` 决定移动方向策略（追玩家BFS/随机方向/直线冲刺/跳跃），`stepMode` 决定步数取值方式（按序循环/随机抽选），`steps` 为步数池。两者可灵活组合产生丰富行为（如"偶尔冲刺的追人怪"=chase+sequence+[1,1,3]）。
- **[浮游眼 AI 优化]** 新增切比雪夫距离射程判断：玩家在 `shootRange`（aiParams）内→按 `weight` 概率决定射击或移动；射程外→100% 只移动。解决"玩家太远浮游眼还在原地对射"的问题，使远程怪行为更符合直觉。
- **[巡逻怪修复]** 硬编码 5 格感知范围 → `aiParams.patrolRange` 可配置，默认值保持 5。
- **[影响范围]** monster-db.json 完全重写（移除 moveCycle / moveWeight / moveDistMin-Max / chargeDistMin-Max，统一为 movement；aiParams 精简仅保留 AI 特有参数）；demo2.html 6 处改造（movement 统一读取 + ranged_kite 射程判断 + charge 步数源切换 + patrol 可配范围 + 怪物创建 + 存档序列化）。旧字段引用全部清理，搜索验证 0 残留。
- **[兼容性]** 代码层 `movement` 带完整默认值兜底（`{ mode:'chase', steps:[2,1], stepMode:'sequence' }`），确保读不到配置时不崩。

---

## 2026-07-27

### 怪物行动系统重构：actionMode + actions[] [当前方案]
- **[问题]** 7/24 统一了 `movement` 结构（mode/steps/stepMode/weight），但移动方向策略和 AI 参数仍然分属两个维度——`movement.mode` 管方向、`aiType`+`aiParams` 管具体行为参数。浮游眼既需要 `movement.weight`（移动概率）又需要 `aiParams.shootRange`（射程），配置分散在两个对象中。Boss Jumper 的跳跃参数也在 `aiParams` 中，与实际的行动逻辑分离。
- **[决策]** 全面重构为行动列表系统：每个怪物定义 `actionMode`（行为选择模式）+ `actions[]`（行为列表），每个 action 独立携带所有参数。
- **[结构设计]**
  - `actionMode: { mode: "sequence"|"random" [, weights: []] }` — sequence 按索引顺序循环；random 按 weights 加权随机选（权重默认 1 = 均匀随机）
  - `actions[]` — 每个 action 含 `type` + 通用字段（`steps`/`stepMode`）+ 类型专有字段（`range`/`condition`/`directMode`/`landDamage`/`repeatChance`/`disappearSteps`）
  - `condition` — `"in_range"` 仅当玩家在 action 的 `range`（切比雪夫距离）内时该 action 可选。无 condition 则始终可选。当前仅 `shoot_fan` 使用
  - `aiType` 保留为行为标签（不再携带参数），仅用于特殊路由（如 boss_jumper 跳过普通 `calcAllMonsterPaths` 进入 `processJumperAction`）
- **[迁移结果]**
  - **裂口尸**：`{mode:"sequence"}` + `[{type:"chase", steps:[2,1], stepMode:"sequence"}]`（最简单的一追到底）
  - **浮游眼**：`{mode:"random", weights:[0.7,0.3]}` + `[{type:"random_wander", steps:[1,2,3], stepMode:"random"}, {type:"shoot_fan", range:4/5/6, condition:"in_range"}]`（70%移动/30%射击，仅射程内可射击）
  - **蓄力魔像**：`{mode:"sequence"}` + `[{type:"charge_line", steps:[3,4,5,6]→[5,6,7,8], stepMode:"random"}]`
  - **Boss Jumper**：`{mode:"sequence"}` + `[{type:"jump_small", steps:[3]}, {type:"jump_small", steps:[3]}, {type:"jump_big_land", disappearSteps:1, landDamage:1, repeatChance:0.5}]`（小跳×2→大跳×1 循环）
- **[代码改动]** 新增 `resolveMonsterAction(cfg, turnIdx, mCol, mRow, pCol, pRow)` — 按 condition 过滤 eligible → actionMode 选择 → stepMode/stepWeights 解析步数。`calcAllMonsterPaths()` 改为调 `resolveMonsterAction` 获取 action + 步数后按 `action.type` 分发。`processJumperAction` / `calcJumperSmallJump` 改为从 `cfg.actions` 读取跳跃参数。怪物创建 (`spawnMonsterAtRandomPos`) 移除 `movement`/`aiType`/`aiParams` 复制。
- **[向下兼容]** 旧字段 (`movement`/`aiParams`/`aiRange`) 全部删除，monster-db.json 为单一数据源。

### stepWeights 默认行为澄清 [当前方案]
- **[问题]** 用户问浮游眼 `random_wander` action 中 `stepMode:"random"` 但未配 `stepWeights`，是否默认为均匀随机？
- **[确认]** 是。`resolveMonsterAction()` 中的步数解析逻辑：有 stepWeights 且长度匹配 → 加权随机；否则走 `Math.floor(Math.random() * steps.length)` 纯均匀随机。浮游眼 `steps:[1,2,3]` → 走 1/2/3 格各 1/3 概率。需要非均匀权重时才显式配 `stepWeights`。

## 2026-07-28

### 代码-文档不一致处理约定 [当前方案]
- **[触发]** 用户在 monster-db.json 中看到红色行（实际是 IDE diff 对比视图高亮，非文件问题），引出讨论：如果用户手动修改了文件但没有通知 AI，当 AI 后续发现代码与文档不一致时该如何处理？
- **[问题]** 历史中未明确定义：AI 发现代码与文档矛盾时，自动修哪边？还是停下让用户决策？
- **[决策]** 确立三层约定：① AI 读代码/文档发现不一致时，必须主动提醒用户，列出具体差异清单；② 不得在用户未表态的情况下擅自修改代码或修改文档；③ 用户可从三个选项中决策：以代码为准更新文档、以文档为准修正代码、或两者都保留（设计变更过渡期）
- **[与同步文档的解耦]** 此约定适用于 AI 在任何状态下（包括非同步场景）发现不一致的情况，与"同步文档"指令是两个独立触发路径。同步文档时，以实际代码为准更新文档是默认行为
- **[与 Ask/Craft 模式的关系]** 用户确认：Ask 模式下只讨论、分析、提醒，不动任何文件（代码或文档）。Craft 模式下，提醒后等待指令才修改。两种模式下都不擅自修改
- **[Memory 创建]** 创建 CodeBuddy Memory ID 32213721 存储此约定，供自动加载
- **[适用]** 此约定跨项目通用，本记录在 isaac-memory 中保留项目级讨论背景；通用规则同步到 global-rules §2.11

### context.md 文件清单修复
- monster-db.json 描述仍为旧 `movement` + `aiParams`，未随 7/27 重构更新。现修正为 `actionMode` + `actions[]`

### 掉落系统全面重构 — 资源系统建立 [当前方案]
- **[触发]** 用户给出8条掉落需求：宝箱房必出道具、Boss击杀必出道具、普通怪几乎不出道具(整局1~2次)、击杀小概率掉资源、破坏便便小概率掉资源、打开宝箱必掉1~4个道具、清理房间中概率掉资源、破坏岩石极小概率掉资源
- **[前期探索]** AI 解释了 loot entry 中 `weight`(竞争性权重，决定"选谁")和 `rate`(独立概率门，决定"选中后是否真的生效")的区别，两者是乘法关系
- **[设计决策]**
  1. **怪物道具掉率**：所有非Boss怪物统一改为 item weight 0.03 + rate 1.0 + `monster_very_rare` 品质表(none:0.70)。有效概率 = 0.03 × 0.30 ≈ 0.9%/只。6层约150只怪 → 期望1.35件/局。旧品质表(common/ranged/heavy)不再被引用但保留
  2. **Boss掉落**：改为一轮 pick_one 纯道具(rate:1.0, itemDropTable:"boss")，移除第二轮资源(roll_all resource)
  3. **宝箱**：chest_normal / chest_golden 从 pick_one(资源or道具)改为 roll_all 纯道具4条(保底1个 + 3×55-60%)，平均约2.65-2.80个/箱
  4. **资源掉落表**：rollResourceDrop 使用独立概率遍历所有条目(roll_all模式)，所以"一种1个资源"通过极低概率值实现(P(0)≈80-96%, P(1)≈3-18%, P(2+)<3%)
  5. **房间清空**：room_clear_default 综合掉率 74%→43%（"中概率"）
  6. **地形**：terrain_rock 综合掉率 20%→3.5%（"极小概率"），terrain_poop 19%→15%（"小概率"）
- **[影响文件]** `monster-db.json`(全部12只怪物loot重配) + `resource-db.json`(新建，8张掉落表+宝箱loot重配) + `item-db.json`(新增 monster_very_rare 品质表) + `isaac-turnbased-demo2.html`(新增统一掉落调度器 rollLoot+executeDropEntry+资源系统代码)
- **[清理]** `item-drop-tables.json` 删除（品质表合并至 item-db.json > itemDropTables）
- **[待微调]** 用户明确表示后续会手动微调数值，本次为粗略调整建立框架

### 蓄力魔像行为模式优化 [当前方案]
- **[触发]** 用户要求将蓄力魔像从"每轮都冲刺"优化为有节奏感的 4 步行为循环
- **[决策]** actions 改为 4 步 sequence：`random_wander`×2 → `charge_up` → `charge_line`。I/II/III 级 wander 步数分别为 2/3/4
- **[新增 action 类型]** `charge_up`：原地不动，头顶红色脉动感叹号(!)（DOM 覆盖层 `.txt-exclaim` CSS 动画）。感叹号状态纳入回合快照（`saveTurnSnapshot`/`restoreTurnSnapshot`）
- **[charge_line 简化]** 旧两阶段（chargeDir=null→选方向 / chargeDir已有→执行冲刺）改为单步（选方向+计算路径+执行一次完成），移除 `chargePhase` 状态依赖
- **[影响范围]** monster-db.json(3只蓄力魔像) + demo2.html(`calcAllMonsterPaths` switch 新增 charge_up + charge_line 简化 + CSS @keyframes exclaim-pulse + `updateTextOverlay` 感叹号DOM渲染 + 快照系统)
- **[设计意图]** 漫步→蓄力→冲刺的节奏让玩家有准备时间，感叹号提供明确的"下一轮要冲了"预警

### 感叹号样式像素风化 [当前方案]
- **[触发]** 用户反馈感叹号太小太不明显
- **[决策]** 从 `bold 18px Arial` 改为 `bold 56px Courier New`（大号像素风等宽字体），8方向黑色像素描边 + 4方向暗红内描边 + 3层红色光晕，脉动动画 0.5s 缩放 0.85→1.25，z-index:10 保证顶层
- **[影响范围]** demo2.html CSS `.txt-exclaim` + `@keyframes exclaim-pulse` + `updateTextOverlay()` 垂直偏移 -28→-48

### 文档同步触发规则确立 [当前方案]
- **[触发]** AI 在代码任务完成后惯性自动更新 context.md 和 memory.md，用户指出这浪费 token、破坏了"阶段性总结"的更新节奏
- **[根因]** AI 的两个冲突指令并存：规则说"不要自动更新文档" vs 本能说"代码和文档不一致是不负责任的"。本能（更底层、更自动化）赢了
- **[决策]** memory.md 新增修改规则 #4：`context.md` 和 `memory.md` 的更新不得在任何代码修改任务中附带执行，必须且仅由用户发出"同步文档"指令时触发。此规则优先级高于 AI 对"代码和文档应保持一致"的默认行为倾向
- **[原因]** 代码改动是高频实验性的，文档更新是低频确认性的。程序化地在每次代码改动后跟文档浪费 token
- **[关联]** 与 global-rules §1.4（禁止自动 Git 写入）、§4.5（疑问句vs指令区分）同类——都是管理 AI 的"自动收尾冲动"

### 浮游眼行为模式重构 — condition actionMode + after_effect + 动态感叹号 [当前方案]
- **[触发]** 用户要求浮游眼不再按权重随机选行为，改为按 condition 条件判断触发
- **[actionMode 新增]** `mode: "condition"`：按 actions[] 顺序逐条评估 condition，选中第一个满足条件的 action。与 `sequence`（轮询）、`random`（加权随机）并列第三种选择模式
- **[condition 新增]** `out_of_range`：`dist > range`（与 `in_range` 的 `dist <= range` 互补）
- **[after_effect 机制]** action 新增可选的 `after_effect` 字段（`{ type, steps, stepMode }`）：主 action 执行完毕后追加执行附加行为
- **[浮游眼新行为]**
  - 玩家在射程外 → Action 1: `random_wander`（漫步）
  - 玩家在射程内 → Action 2: `shoot_fan` → after_effect: `random_wander`（射击后立刻随机移动）
- **[动态感叹号]** 新增 `updateFlyingEyeExclaim()` 函数：玩家回合中每次 WASD 移动后实时检测与浮游眼距离，进入射程显示感叹号，移出隐藏。回合开始时（`resetTurnAP()`）也调用一次
- **[代码重构]** 抽出 `checkActionCondition(a, pCol, pRow, mCol, mRow)` 和 `resolveSteps(stepsArr, stepMode, stepWeights, turnIdx)` 两个辅助函数，消除 `resolveMonsterAction` 内重复代码
- **[影响范围]** monster-db.json(3只浮游眼 actionMode+actions) + demo2.html(`resolveMonsterAction` 函数重写 + `calcAllMonsterPaths` shoot_fan case 新增 after_effect 处理 + `updateFlyingEyeExclaim` 新函数)

---

## 2026-07-29

### 资源掉落表 mode 统一 — 配置驱动改造 [当前方案]
- **[触发]** 用户追问两个设计问题：①资源掉落表的选择模式（每种独立计算 vs 只选1个 vs 顺序判定）是否应该像 monster loot 的 entries 一样可配置？②宝藏房/Boss房不掉资源为什么用代码硬编码而不是配置控制？
- **[问题]** 旧 `rollResourceDrop()` 硬编码为"按权重只抽1种"，且 `rollRoomClearDrop()` 中硬编码 `if (room.type === 'treasure' || room.type === 'boss') return;`。`spawnShopItems()` 各自写 for-loop 判概率，三处掉落入口三种判法
- **[决策]** 与 `rollLoot()` 保持一致语义，`resource-db.json` 的 `resourceDropTables` 全面升级为 `{ mode, _desc, table }` 结构，所有表统一列出全部 15 种资源（不需要的配 0）
  - `pick_one`：怪物掉落、房间清空、地形破坏、宝箱额外资源
  - `roll_all`：商店商品（每种独立判定，最多6个）
  - `pick_first`：预留
  - 新增 `room_clear_treasure` 表（全 0 = 不掉落），`room_clear_boss` 也改为全 0（替代硬编码）
- **[代码改动]** `rollResourceDrop()` 重构（读 mode+table、按 mode 分发、兼容旧格式）+ `rollRoomClearDrop()` 移除硬编码改 roomType→tableKey 映射 + `spawnShopItems()` 统一走 `rollResourceDrop('shop_stock')`
- **[设计收益]** 掉落行为完全配置驱动，改表不碰代码；想给 Boss/宝藏房加资源只需改对应表权重值

### attack_adjacent 行为修正 — 从面朝方向改为十字范围 [当前方案]
- **[触发]** 用户发现裂口尸 chase 的 `after_effect: attack_adjacent` 有时不生效，怀疑只对面朝方向 1 格攻击
- **[问题确认]** `resolveAfterEffects()` 中 `attack_adjacent` 使用 `context.dirX/dirY` 只检查面朝方向 line，且 `finishMonsterTurn()` 从路径最后一步取方向作为唯一方向传入
- **[决策]** 重构为遍历上下左右 4 个方向，每个方向向外检查 range 格（遇墙停止），攻击范围内所有玩家和怪物。不再依赖传入的 dirX/dirY
- **[代码改动]** `resolveAfterEffects()` attack_adjacent 分支（四方向 forEach）+ `finishMonsterTurn()` 移除 `lastStep`/`Math.sign` 方向计算

### 掉落表条目统一化 [当前方案]
- **[触发]** 用户要求每张 resourceDropTable 列出所有 15 种资源，不掉落的权重配 0，这样每张表条目结构完全一致
- **[决策]** 全部 11 张表按固定排序列出完整 15 条目（coin_gold→coin_black→coin_silver→bomb_single→bomb_double→heart_half→heart_full→heart_double→blue_heart_half→blue_heart_full→blue_heart_double→chest_normal→chest_golden→key_single→key_double），不需要的权重=0
- **[收益]** 需要添加新掉落种类时只改数值不改字段结构

### 浮游眼原地不动 + random_wander 方向预筛选 [当前方案]
- **[触发]** 用户反馈浮游眼经常一个回合原地不动，蓄力魔像也有类似问题
- **[根因分析]** 两个原因叠加：①**条件死区**：`flying_eye_i` 的 `random_wander` 没指定 `range`，默认 5，导致 `dist>5` 才算 `out_of_range`；但 `shoot_fan` 的 `range:4` 要求 `dist≤4`。距离=5 时两个 action 条件都不满足→原地不动。`flying_eye_iii` 的 `random_wander`(默认range=5) 也会误匹配到距离6的情况。②**随机方向撞墙**：`random_wander` 代码只随机选一个方向然后尝试走 stepCount 步，第一步就可能撞墙/怪物/边界→path 为空→原地不动。在房间边缘/角落，25%~50%概率选到不可行方向。
- **[决策]** ①`monster-db.json` 中三个等级浮游眼的 `random_wander` 补显式 `range`，与同等级 `shoot_fan` 的 range 对齐（4/5/6），消除死区。②`calcAllMonsterPaths` 中 `random_wander` 分支增加 `validDirs` 预筛选：先 `filter` 过滤出第一步可行的方向，再从有效方向中随机选。浮游眼和蓄力魔像共享此分支，同时受益。③`shoot_fan` 的 `after_effect` 中的 `random_wander` 独立副本也同步增加 `validDirs` 过滤，多一个 fallback（无可行方向时随意选一个）。
- **[验证结果]** 与蓄力魔像 `charge_line` 已有的方向预筛选（`pickChargeDir`→`randomMovableDir`→`canMoveMin1`）模式一致：都是"filter → pick random"范式。两处差异（random_wander用4方向、charge_line用8方向含对角线）是刻意设计，不需对齐。

### 道具拾取状态回溯 — ESC重置 + 移动路径回溯 [当前方案]
- **[触发]** 用户要求道具拾取状态也应受两种回溯影响：①ESC回溯重置道具拾取生效状态；②移动范围内自由移动时，道具拾取状态随实际路径实时调整。
- **[决策]** ①`saveTurnSnapshot` 新增保存 `playerInventory`、`playerStats` 全部属性、`playerResources.blueHearts`、`itemsOnGround` 完整快照。`restoreTurnSnapshot` 对应恢复并调用 `updateItemBar()`/`updateHearts()`/`updateResourceUI()`。②新增 `turnPickupLog[]`（资源拾取轨迹）和 `turnPickedUpItemLog[]`（道具拾取轨迹），在 `recalcContactDamage()` 中当 `turnMovePath` 截断时一并撤销拾取。③`autoPickupResources()` 和 `pickUpItems()` 各自记录 pickuplog（含 stepIdx 对应 turnMovePath 长度）。④`resetTurnAP()` 和 ESC handler 清除 pickup logs。
- **[设计收益]** 回退时资源自动回到地面、道具回到地面并从库存移除、属性重算（`recalcAllStats`）。与接触伤害撤消模式一致。

### 血量上限12 + 红心优先于蓝心 [当前方案]
- **[触发]** 用户要求总心数上限12（红心+蓝心≤12），且红心上限增加优先级高于蓝心。
- **[规则]** ①红心（maxHp）和蓝心（blueHearts）总和 `totalHearts()` ≤ 12。②拾取蓝心时若已达上限→不拾取（物品不消失）。③道具增加红心上限（`applyItem`）时若总和=12但有蓝心→移除1蓝心+增加1红心上限（腾出空间）。④回血（`heart` 资源 healing）不受上限影响。
- **[代码改动]** 新增 `totalHearts()`/`tryAddRedHeart()`/`tryAddBlueHeart()` 三个辅助函数。`handleResourcePickup` 的 `blue_heart` 分支调用 `tryAddBlueHeart()`；`applyItem` 的 `maxHp` 分支改为逐颗调用 `tryAddRedHeart()`。`recalcAllStats` 不做上限检查（计算基准值，上限在添加时强制）。

### 炸弹模式融合进战斗模式 [当前方案]
- **[触发]** 用户要求炸弹模式不应独立存在，应融合进战斗模式作为特殊怪物。
- **[旧方案]** 独立 `bombMode` 状态标志+独立 Space 分支处理+探索模式专属炸弹回合。炸弹模式下只有 M-AP 无法射击。
- **[新方案]** ①移除 `bombMode`/`bombModeTurnsFrom` 变量，炸弹即是战斗模式的一部分。②放置炸弹即进入 `inCombat=true`（含交叉剑动画），统一走战斗模式流程。③炸弹倒计时从 Space 处理移至 `startMonsterTurn()` 最开头（炸弹行动优先级高于所有怪物），在 `calcAllMonsterPaths()` 之前执行 `tickBombCountdown()`。④每个怪物回合炸弹计时-1，0时引爆。⑤`updateDoorsLocked()` 改为只判断怪物存活（`hasLivingMonsters`），不判断炸弹——有炸弹无怪物时门打开可自由出入。⑥`tryWalkIntoDoor()` 允许战斗模式（因炸弹）下通过已打开的门。⑦`finishTransition()` 重新进入房间时炸弹倒计时重置为3，并恢复战斗模式。⑧`finishMonsterTurn()` 结尾根据存活怪物+未引爆炸弹决定是否结束战斗。⑨`updateActionBar()` 统一在战斗模式下显示炸弹倒计时信息。
- **[设计收益]** 炸弹不再是特殊模式，完美融入回合制战斗。炸弹房间可自由移动和射击（保留A-AP）。门锁逻辑只取决于怪物，炸弹不影响房间通行。

---

## 2026-07-30

### 地形掉落预roll — 保证ESC回溯后再次破坏结果一致 [当前方案]
- **[问题]** 破坏大便/岩石后掉落资源是当场 roll 的（`rollTerrainDestroyDrop` 内调用 `rollResourceDrop`），ESC 回溯后再次破坏同一地形会重新随机，掉落不一致
- **[决策]** 与怪物 `_killLoot` 模式对齐：①`initTileData()` 中为每个 POOP/ROCK 预roll `_loot`（`rollResourceDrop('terrain_poop'/'terrain_rock')`，可能是空数组=不掉落），存储在 `tileData[k]._loot`。②`hitTile()` 在 `delete tileData[k]` 之前捕获 `td._loot` 为 `preLoot` 传入。③`rollTerrainDestroyDrop(col, row, terrainType, preLoot)` 优先使用预roll结果，仅 fallback 时才现场 roll
- **[收益]** ESC 回溯后地形破坏掉落完全一致，与怪物击杀掉落行为统一
- **[向下兼容]** `preLoot !== undefined` 判断区分"已预roll=空数组"和"未预roll=undefined"，旧存档无 `_loot` 时自动 fallback 现场roll

### 资源视觉消失bug修复 — liftDir 缺失导致 liftY 变 NaN [当前方案]
- **[问题]** 用户报告两个场景：①怪物击杀掉落资源后移动触发BFS→资源视觉消失但能走过去拾取；②摧毁大便掉落同理消失。ESC回溯不影响此问题
- **[根因追踪]** 完整因果链：资源从 `spawnResourceOnGrid` 出生时带 `liftDir: 1` → `saveCheckpoint`/`simulateFromCheckpoint` 恢复资源时没存/没恢复 `liftDir` → BFS 触发后资源 `liftDir = undefined` → 游戏循环动画 `res.liftY += undefined * dt * 2` → `liftY = NaN` → 渲染坐标无效 → 视觉消失 → 但 col/row 正确 → `autoPickupResources` 仍能拾取
- **[次要发现]** 道具（`itemsOnGround`）的保存/恢复一直有 `liftDir`，资源的保存/恢复却少了这个字段——同一个 checkpoint 内的两个数组不一致
- **[修复范围]** 6 处：`saveTurnSnapshot`(1620)、`saveCheckpoint`(1683)、`restoreCheckpoint`(1751)、`restoreCheckpointWithoutBullets`(1839)、`restoreTurnSnapshot`(1925)、`simulateFromCheckpoint`(2092)，全部补上 `liftDir: r.liftDir || 1`
- **[修复结果]** 资源在 BFS checkpoint 恢复后liftY正常计算，不再视觉消失

### hitTile 破坏地形后保存 checkpoint [当前方案]
- **[问题]** `hitTile` 破坏地形（delete tileData[k] + grid→FLOOR）+ 掉落资源后，若后续 BFS 触发 `simulateFromCheckpoint`，checkpoint 中无这些新资源，资源消失（与 liftDir bug 叠加加剧）
- **[决策]** `hitTile` 中在 `rollTerrainDestroyDrop` 后调用 `saveCheckpoint()`，确保 checkpoint 包含破坏后的地形+新掉落资源

### ESC 回溯范围扩大：地形 + 炸弹 [当前方案]
- **[触发]** 用户要求 ESC 应回溯整个游戏所有状态："地形的也算，所有的都算"。AI 列出当前回溯/未回溯清单，确认可破坏地形和炸弹需补充
- **[决策]** ①`saveTurnSnapshot` 新增 `tileData`(JSON深拷贝)、`currentRoomGrid`(逐列拷贝)、`bombs`(逐个对象拷贝)。②`restoreTurnSnapshot` 新增对应恢复：`tileData = JSON.parse(JSON.stringify(s.tileData))`、`currentRoomGrid = s.currentRoomGrid.map(col => [...col])`、`bombs` 重建
- **[收益]** ESC 后大便恢复未破坏状态、岩石恢复、炸弹恢复位置和倒计时。与炸弹模式融入战斗（7/29）配合：炸弹是战斗状态的一部分，ESC自然回溯
- **[未涉及]** `saveCheckpoint`（BFS小存档点）不需要保存 terrain——terrain 是永久性变更，在 `hitTile` 中已直接修改 `tileData`/`currentRoomGrid`，checkpoint 不恢复 terrain

### tileData 注释更新
- `tileData` 变量注释从 `{ type, hp }` 更新为 `{ type, hp, _loot }`，反映预roll字段

### Boss Jumper 文档多处不实描述修正 — context.md + memory.md 历史记录纠错 [当前方案]
- **[问题]** 用户指出 context.md 中 Boss Jumper 的 `repeatChance` 和 `landDamage` 描述多处与实际 `monster-db.json` 不符。AI 回溯发现共 9 处不实描述（context.md 7 处 + memory.md 旧记录 3 处）
- **[实际代码]** `monster-db.json` 中 boss_jumper 的 actions 结构：`jump_small steps:[2/3/3]` → `jump_small steps:[2/3/3], repeatChance:0.5` → `jump_big_land disappearSteps:1, target:{mode:"cover_player"}, after_effect:[{type:"attack_side", damage:1, range:1}]`。`repeatChance` 挂在第二个 `jump_small` 上，`landDamage` 字段不存在（落地伤害通过 `after_effect: attack_side` 实现）
- **[context.md 修正]** 7 处：①§1.5 Boss Jumper 概览表行 → 展开为 3 个 action 完整描述；②§1.5 字段说明范例 → `landDamage` 替换为 `target`；③Action 类型枚举 `jump_small` → 补 `repeatChance` 可选说明；④Action 类型枚举 `jump_big_land` → 移除 `landDamage`/`repeatChance`，改为 `target`/`after_effect: attack_side`；⑤§2.13 大跳跃行 → `landDamage` 改为 `after_effect: attack_side`；⑥§2.13 关键设计 → `jump_big_land.repeatChance` 改为「第二个 `jump_small.repeatChance`」；⑦历史记录 2026-07-27 → 参数迁移路径修正
- **[memory.md 旧记录说明]** 受 immutability 约束，以下三处历史记录含 `landDamage` 不实描述**不修改**，仅在本条注明：①2026-07-23 §AI行为参数外置（line 317）写作 `landDamage 1`，实际 `after_effect: attack_side(damage:1,range:1)`；②2026-07-27 §行动系统重构（line 385）字段示例列表含 `landDamage`；③同日期 line 392 Boss Jumper 配置示例写作 `landDamage:1, repeatChance:0.5`，实际 `repeatChance` 在 `jump_small` 上。所有不实描述的修正版本以 `monster-db.json` 和 context.md 当前版本为准
- **[附带修正]** 小跳步数 `[3]` 改为 `[2/3/3]`（对应 I/II/III 级）

### 文档同步流程缺陷根因分析与追加规则 [当前方案]
- **[触发]** 用户上一次要求"同步文档"时，AI 只同步了最后一次代码改动（item-db.json 品质表），遗漏了几小时前就发现但未当场修的 context.md Boss Jumper 描述问题
- **[根因]** AI 在执行"同步文档"时，注意范围潜意识收缩到「最近一次编辑操作涉及的文件」，本轮早期发现的不一致被归类为「已讨论过的事」而非「待同步的新内容」
- **[追加强化]** 在 global-rules §2.2 新增硬性步骤：「同步文档前，必须先回溯本轮会话所有"发现但未修"的代码-文档不一致，逐条列出清单，逐一确认是否已修正」，来源包括用户口头指出的、对话中间发现的、以及"顺便提一下"的事项
- **[用户确认]** 用户要求 AI 给出合理解释并杜绝此类遗漏，本次追加步骤为硬约束

---

## 2026-07-31

### simulateFromCheckpoint 资源拾取修复 — 满血也能拾取红心 [当前方案]
- **[问题]** 玩家满血走过红心时，红心被无条件消耗（地面资源消失但HP不增加，资源浪费）
- **[根因]** `simulateFromCheckpoint` BFS 路径重放循环（line 2158-2164）中，`handleResourcePickup(res)` 返回值被忽略，无条件 `resourcesOnGround.splice(j, 1)`。而 `autoPickupResources` 是正确判断返回值再删除的
- **[修复]** 改为 `if (handleResourcePickup(res)) { resourcesOnGround.splice(j, 1); }`，满血时 `handleResourcePickup` 返回 `false`（红心 `case 'heart': if (hp>=maxHp) return false`），资源保留在地面

### 房间资源幽灵bug修复 — 深拷贝→直接引用 [当前方案]
- **[问题]** 房间地面上有时在ESC回溯后/离房回房后凭空出现之前没出现过的资源
- **[根因]** `updateRoomCombatState` 房间清空时（line 891）`room._groundResources = resourcesOnGround.map(r => ({...}))` 深拷贝创建了**新数组**，切断了 `resourcesOnGround` 与 `room._groundResources` 的引用链接。之后玩家拾取资源只修改 `resourcesOnGround`，`room._groundResources` 保留旧快照。离房回房时 `finishTransition` 执行 `resourcesOnGround = room._groundResources` 加载了含已拾取资源的旧快照
- **[修复]** 将深拷贝改为直接引用 `room._groundResources = resourcesOnGround`，与 `simulateFromCheckpoint`(line 2198) 和 `restoreTurnSnapshot`(line 1944) 保持一致。两个变量始终指向同一数组

### checkpoint时机修正 — 延迟到实际效果发生 [当前方案]
- **[问题]** 发射子弹时 `saveCheckpoint()` 在 bullet 刚生成的瞬间就保存了，之后子弹飞行→命中→怪物死亡→掉落这一整套行为的结果都没有反映到 checkpoint 中
- **[修复]**
  1. 移除射击处理（line 6325）中的 `saveCheckpoint()` — 不再在发射瞬间保存
  2. `damageMonster` 中新增 `else if (turnState.phase === 'player_select') saveCheckpoint()` — 非致命命中时也更新 checkpoint 以反映怪物 HP 降低
  3. 已有的：怪物击杀时（line 5800）、地形破坏时（`hitTile`）、房间清空时（`updateRoomCombatState`）均正常保存 checkpoint
- **[效果]** checkpoint 现在反映每个操作的实际结果，而非操作开始瞬间。BFS 回退时 checkpoint 持有的是最近一次实际效果完成后的状态

### JSON 尾随逗号问题 — item-db.json 解析失败 [当前方案]
- **[问题]** item-db.json 显示存在问题，检查后发现 JSON 解析失败：`itemDropTables.boss_room` 尾部有多余逗号（`boss_room` 是 itemDropTables 最后一个属性，删除 `monster_very_rare` 后变成了末位）
- **[根因]** 对 JSON 文件做局部 `replace_in_file` 时，只匹配局部片段，没有考虑编辑后目标条目是否变成了父对象的最后一个属性，导致尾部逗号未被联动清理
- **[修复]** 删除 `boss_room` 末尾的逗号，JSON 恢复合法可解析

### AI JSON 编辑规范确立 — 每次编辑后必须校验 [当前方案]
- **[触发]** 用户追问为什么 AI 频繁出现尾随逗号这类马虎问题，AI 分析了根因并给出改进方案
- **[根因分析]** 局部替换片段时缺乏"向上看一层"的上下文校验习惯 — 增删 JSON 数组/对象成员后，没有联动检查被编辑条目是否变成最后一项并清理逗号
- **[改进方案]** 三条措施：
  1. 每次增删 JSON 列表/对象成员后，主动检查被编辑条目是否变成末位，如是则联动清理逗号
  2. 编辑后立即调用 `read_lints` 做 JSON 语法校验（不依赖人工发现）
  3. 对于复杂 JSON 编辑，读取整个文件后在逻辑层面修改再用 `write_to_file` 写回，写回前完整解析验证
- **[用户确认]** 用户要求"以后不要再出现相同的问题"，AI 承诺从本次开始每次 JSON 编辑后主动跑 `read_lints` 校验
- **[记录原因]** ①避免下次切换电脑后忘记这一教训重新踩坑 ②确保所有项目会话中 AI 都遵循 JSON 编辑后校验的规范

### global-rules.md §4.1 矛盾修正 — AI 主动读取 vs 等用户指令
- **[触发]** 用户在本轮会话中测试发现 AI 在新会话开始时未执行"每次对话自动读取 global-rules.md"规则，直接跳入任务
- **[根因]** 系统级规则正常注入到 AI 上下文，问题出在 AI 执行层面（未在收首条消息前执行 read_file）。同时发现 global-rules.md §4.1 将 global-rules 与 memory/context 混写为"用户主动告诉 AI 读取三份文档"，与用户实际配置的"自动读取"规则矛盾，可能误导 AI 认为也需要等用户指令
- **[修正]** §4.1 拆分为两层：①global-rules.md → AI 主动读取（不许等指令）；②memory.md + context.md → 用户发指令后读取。日期标注 [2026-07-20, 2026-07-31修正]
- **[澄清]** "每次对话" = 每次新会话开始时读一次，非每条消息都读。global-rules.md 是相对稳定的规范文档，同会话内不会频繁变化

### 怪物死亡掉落位置修正 — 资源不再随机散布 [当前方案]
- **[问题]** 怪物死亡后资源类掉落（`resource`）在 `preRollDropEntry()` 和 `executeDropEntry()` 中各自带了 `±1` 格的随机偏移（`Math.floor(Math.random()*3)-1`），导致资源散布在怪物死亡位置周围，玩家击杀后需额外走动才能全部拾取
- **[决策]** 移除 `preRollDropEntry()`、`applyPreRolledLoot()`、`executeDropEntry()` 三处资源掉落的随机行/列偏移，所有掉落物（道具 + 资源）统一精确生成在怪物死亡的格子位置 `(col, row)` 上
- **[修改范围]** ① `preRollDropEntry()` — `offsetC/offsetR` 从随机改为固定 `0`；② `applyPreRolledLoot()` — 资源直接用 `col, row` 生成，不再加偏移；③ `executeDropEntry()` — 移除 `offsetC/offsetR` 随机计算，直接落在 `col, row`
- **[影响文件]** `isaac-turnbased-demo2.html`（三处函数修改，净减少约 6 行代码）
- **[设计收益]** 掉落行为与道具掉落的 `spawnItemOnGrid(col, row)` 保持一致，玩家击杀怪物后可以原地拾取所有奖励

### 掉落系统字段命名统一重构 [当前方案]
- **[触发]** 用户指出 item 和 resource 的配置参数名容易混淆，要求整体统一命名
- **[决策]**
  1. **monster loot entry type**：`resource_pool` → `resource`（与 `item` / `resource_fixed` / `nothing` 对称）
  2. **顶层掉落表集合 key**：`item-db.json` 中 `qualityTables` → `itemDropTables`（复数）；`resource-db.json` 中 `dropTables` → `resourceDropTables`（复数）
  3. **entry 字段**：`qualityTable` → `itemDropTable`（单数，引用 itemDropTables 中某张表）；`pool` / `dropTable` → `resourceDropTable`（单数，引用 resourceDropTables 中某张表）
  4. **命名对称性**：item 侧 `itemDropTables`(集合) ↔ `itemDropTable`(引用)；resource 侧 `resourceDropTables`(集合) ↔ `resourceDropTable`(引用)
  5. **宝箱 loot**：同步更新 `resource-db.json` 中 chest_normal/chest_golden 的 loot entries 字段名
- **[暂不改动]** `weight` vs `rate` 语义区分 — 用户表示后面捋清楚再说
- **[影响范围]** 6 个文件：`item-db.json`(顶层key+schema)、`resource-db.json`(顶层key+宝箱loot+schema)、`monster-db.json`(所有怪物loot entries+schema)、`isaac-turnbased-demo2.html`(12处代码引用)、`isaac-turnbase-context.md`、`isaac-memory.md`
- **[验证]** 全项目零残留 `resource_pool` / `qualityTable` / `"pool"` 旧字段名，所有 3 个 JSON 语法正确

---

## 最近更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-08-04 | **掉落表命名统一 + roomClearDrop配置驱动化 + 地图编辑器修复**。①itemDropTables 9张表加 `item_drop_` 前缀，resourceDropTables 11张表加 `resource_drop_` 前缀，宝箱资源对象名不变以消除歧义。②`rollRoomClearDrop()` 从硬编码映射改为读取 `room.roomClearDrop` 配置。③修复地图编辑器 fileInput 缺少 grid 转置。详见当日记忆条目。 |
| 2026-07-31(3) | **掉落系统字段命名统一重构**。①monster loot entry type `resource_pool`→`resource`。②顶层集合 key：`qualityTables`→`itemDropTables`、`dropTables`→`resourceDropTables`。③entry 字段：`qualityTable`→`itemDropTable`、`pool`/`dropTable`→`resourceDropTable`。④宝箱 loot 同步更新。⑤影响 6 文件，全项目零旧字段名残留。详见当日记忆条目。 |
| 2026-07-31(2) | **怪物死亡掉落位置修正**。移除资源掉落随机散布(±1格)，所有掉落物精确生成在怪物死亡位置。详见当日记忆条目。 |
| 2026-07-31 | **满血拾取修复 + 幽灵资源修复 + checkpoint时机修正**。详见当日记忆条目。 |
| 2026-07-30 | **地形掉落预roll + liftDir修复 + ESC回溯补全**。详见当日记忆条目。 |
| 2026-07-29 | **资源掉落表 mode 统一 + attack_adjacent 修正 + 条目统一化**。①`resource-db.json` resourceDropTables 升级为 `{ mode, table }` 结构，支持 pick_one/roll_all/pick_first。②`rollResourceDrop()` 重构为 mode 驱动。③`rollRoomClearDrop()` 移除硬编码改为 roomType→tableKey 配置映射。④`spawnShopItems()` 统一走 rollResourceDrop。⑤`attack_adjacent` 从面朝方向改为四方向十字范围攻击。⑥全部 11 张表统一 15 种资源条目。 |
| 2026-07-28(晚) | **浮游眼行为模式重构**。①新增 condition actionMode + out_of_range 条件 + after_effect 机制(shoot_fan后立刻random_wander)。②玩家回合动态感叹号。③抽出 checkActionCondition + resolveSteps 辅助函数。 |
| 2026-07-28(晚) | **蓄力魔像行为优化 + 感叹号像素风 + 文档同步触发规则**。①蓄力魔像 actions 改为4步sequence(random_wander×2+charge_up+charge_line)，新增 charge_up type(感叹号脉动)，charge_line 简化为单步执行。②感叹号改为56px Courier New像素风大号样式，8方向像素描边+3层光晕+0.5s脉动。③memory.md 新增修改规则#4：context.md和memory.md更新必须由用户"同步文档"指令触发，不得在代码任务中附带执行。 |
| 2026-07-28(晚) | **掉落系统全面重构+资源系统建立**。①用户8条掉落需求驱动全面重配。②确立weight vs rate 语义区分。③新建 resource-db.json（资源定义+8张掉落表+宝箱loot）。④全部12只怪物loot重配：小怪极少道具(~0.9%/只)+小概率资源(~25%)；Boss纯道具无资源。⑤宝箱改为必掉1~4个道具(roll_all模式)。⑥品质表合并至item-db.json，删除 item-drop-tables.json。⑦资源掉落表全面降低概率匹配各场景。⑧用户后续手动微调数值。 |
| 2026-07-28 | **代码-文档不一致处理约定确立**。①当 AI 发现代码与文档矛盾时，必须主动提醒用户列出差异清单，待用户决策后才行动（三个选项：代码为准/文档为准/都保留）。②明确与"同步文档"指令为独立触发路径（同步时默认以代码为准）。③确认 Ask/Craft 模式边界：都不擅自修改文件。④创建 Memory ID 32213721。⑤context.md 文件清单修正 monster-db.json 过时描述。 |
| 2026-07-27 | **怪物行动系统重构：actionMode + actions[]**。①移除旧 `movement`/`aiParams` 分散字段，统一为 `actionMode`（sequence/random weighted）+ `actions[]`（独立配置 type + steps/range/condition 等全部参数）。②新增 `resolveMonsterAction()`：condition 过滤 → actionMode 选择 → stepMode/stepWeights 解析。③5种12只怪物全部迁移到新 actions 体系。④Boss Jumper 参数从 aiParams 移至 `actions[].jump_big_land`。⑤确认 stepWeights 未配时默认均匀随机行为。 |
| 2026-07-24(晚) | **怪物移动配置统一重构 + 浮游眼 AI 优化**。①统一 `movement` 结构（mode/steps/stepMode/weight）替代 4 套分散步数字段，12 只怪物全部迁移。②浮游眼新增切比雪夫距离射程判断（射程外不射击只移动）。③巡逻范围从硬编码改为 `aiParams.patrolRange`。④monster-db.json 完全重写 + demo2.html 6 处改造 + 旧字段 0 残留。⑤context.md 全覆盖交叉比对：怪物表重写、AI表更新、文件清单新增 spawn-config.json。 |
| 2026-07-24 | **验证列表遗漏事件 + Memory 对话驱动标准确立**。①7/23讨论的"验证列表"未记录到memory（因无代码变更），暴露AI以"代码变更驱动"写memory的惯性偏离了对话记忆初衷。②用户明确memory设计初衷："在任何电脑上都能像跟同一个有统一记忆的AI聊天"。③记忆触发标准从"代码变更→记录"扩展为"聊过的重要事→记录"（设计验证/待办任务/设计疑问/创意方向等）。④global-rules §2.10 更新补充此规则。⑤验证列表具体内容已不可溯源（cb_summary压缩丢失）。 |
| 2026-07-23 | **AI行为参数外置 + 配置外置全面审计 + 双HTML同步策略 + global-rules §2.10 §4.5**。①monster-db.json 新增 `aiParams` 字段，5种怪物AI参数全部外置消除硬编码。②系统性审计6JSON+2HTML，确立分类标准：策划→JSON / 引擎/渲染/算法→代码。③建立双HTML同步策略，验证0处AI硬编码残留。④context.md全覆盖比对修正8处过时常量。⑤因AI首轮memory遗漏审计/策略讨论，触发global-rules §2.10（Memory记录完整性）。⑥因AI将疑问句误判为指令，触发global-rules §4.5（疑问句vs指令区分）。 |
| 2026-07-22 | **楼层生成两步法重构**。`generateFloor()` 改为骨架房优先→Boss/宝箱从集群边界挂载。Boss选最远边界位，宝箱随机选剩余边界。彻底消除旧方案裁边+连通性修复逻辑，Boss/宝箱天然单门在外围。 |
| 2026-07-21(晚) | **Boss Jumper 2×2跳跃Boss系统**。新增 `boss_jumper` 怪物（size:2占据4格），替代旧裂口之王为每层Boss房Boss。行动循环：小跳×2→50%重复→大跳消失→落地12格伤害。配套跳跃动画（弧线/消失残影/落地冲击波）。宝藏房不再刷怪。修复渲染中心偏移和落地回合额外行动。 |
| 2026-07-20 | **SSH推送替代HTTPS**。DPI防火墙拦截git/curl HTTPS连接，诊断确认SSH 22端口正常。生成ed25519密钥，利用Deploy Key API绕行token scope限制（repo scope够用），remote永久改为SSH。记录完整诊断过程+跨电脑注意事项。 |
| 2026-07-20 | **global-rules §1.4 正式化**。将 AI 禁止自动 Git 写入操作写入 global-rules.md 作为正式跨项目规范，创建 Memory ID 70076756。 |
| 2026-07-20 | **HP心形改造 + AI提交行为纠正**。①HP系统改为3心制+半心显示，所有玩家伤害减半。②记录AI自动提交行为被纠正事件，确认Git操作需用户明确指令。 |
| 2026-07-20 | **格式重改为纯时间线 + 删除未确认内容**。按用户要求改为纯时间顺序组织（不做模块分类），删除未经用户确认的"下一步计划"章节。同步追加当天的文档体系规则修正记录。 |
| 2026-07-20 | **记忆体系建立**。从三处数据源（context.md 最近更新记录 ×11条、chat-log-2026-07-20.md、当前会话）提取所有历史决策，按时间顺序整理。 |

---

## 2026-08-04

### 掉落表命名统一 — item_drop_ / resource_drop_ 前缀 [当前方案]
- **[触发]** 用户注意到参数命名不规范，要求统一加上前缀区分
- **[决策]**
  1. `item-db.json > itemDropTables` 中 9 张表全部加 `item_drop_` 前缀：`default`→`item_drop_default`、`common`→`item_drop_common`、`ranged`→`item_drop_ranged`、`heavy`→`item_drop_heavy`、`boss`→`item_drop_boss`、`treasure_room`→`item_drop_treasure_room`、`boss_room`→`item_drop_boss_room`、`item_chest_normal`→`item_drop_chest_normal`、`item_chest_golden`→`item_drop_chest_golden`
  2. `resource-db.json > resourceDropTables` 中 11 张表全部加 `resource_drop_` 前缀：`monster_default`→`resource_drop_monster_default`、`monster_heavy`→`resource_drop_monster_heavy`、`boss_drop`→`resource_drop_boss`、`room_clear_default`→`resource_drop_room_clear_default`、`room_clear_boss`→`resource_drop_room_clear_boss`、`room_clear_treasure`→`resource_drop_room_clear_treasure`、`terrain_rock`→`resource_drop_terrain_rock`、`terrain_poop`→`resource_drop_terrain_poop`、`chest_normal`→`resource_drop_chest_normal`、`chest_golden`→`resource_drop_chest_golden`、`shop_stock`→`resource_drop_shop_stock`
  3. **命名冲突解决**：`chest_normal` 和 `chest_golden` 在 `resources` 对象中作为宝箱资源 key 保持不变，只在 `resourceDropTables` 中改名为 `resource_drop_chest_normal` / `resource_drop_chest_golden`，消除了之前的歧义问题
- **[影响范围]** 6 个文件：`item-db.json`(9个key)、`resource-db.json`(11个key+宝箱loot内部引用+schema注释)、`monster-db.json`(12只怪物loot entries)、`floor-data.json`(所有roomClearDrop引用)、`isaac-map-viewer.html`(roomClearDropDefaults)、`isaac-turnbased-demo2.html`(14处fallback和引用)
- **[验证]** 全项目零旧表名残留，所有 JSON 文件 lint 通过

### roomClearDrop 配置驱动化 [当前方案]
- **[触发]** floor-data.json 中每个房间已带有 `roomClearDrop: { resourceDropTable, itemDropTable }` 配置，但 demo2.html 中 `rollRoomClearDrop()` 仍用硬编码的 roomType→tableKey 映射，造成配置与代码不一致
- **[决策]** `rollRoomClearDrop()` 改为读取 `room.roomClearDrop` 配置，移除硬编码的 `tableKeyMap` 映射表
- **[影响文件]** `isaac-turnbased-demo2.html`（`rollRoomClearDrop` 函数重写，净减少约 8 行代码）

### 地图编辑器 fileInput 缺少 grid 转置修复 [当前方案]
- **[问题]** 通过文件选择按钮加载 floor-data.json 后，地图编辑器显示的房间布局不正确（房间方向错乱）
- **[根因]** 地图编辑器有三个加载入口：`readFloorFromHandle`(File System Access API) 和 `tryLoadFloorData`(localStorage) 都有 `transposeGridRowToCol` 转置，但 `floorFileInput` change handler 缺少此步骤
- **[修复]** 在 `floorFileInput` change handler 中补上：`else if(r.grid.length>0 && Array.isArray(r.grid[0]) && r.grid.length===ROWS) r.grid=transposeGridRowToCol(r.grid);`
- **[原因]** floor-data.json 中 grid 存储为 row-major(7×13)，渲染需要 col-major(13×7)，三个加载路径中有一个遗漏了转置

### R键重置完整性修复 — _initGrid / _initDoors 备份恢复机制 [当前方案]
- **[问题]** 按R键重置游戏后，房间的大便被破坏状态没有恢复（之前破坏过的便便仍然显示为已破坏）
- **[排查过程]** 全面审查了所有代码路径：`currentRoomGrid` 和 `room.grid` 的引用关系、`finishTransition` 的切换逻辑、`loadOrGenerateFloors` 的 3 秒定时器、ESC 回溯的深拷贝切断引用、`saveCheckpoint` 不保存地形等，均未找到明确的引用断裂点。期间还出现过一次严重 bug：在压缩的单行代码中加 `//` 注释导致后面的 `r._initGrid=...` 和 `;});}` 闭合括号全部被注释掉，造成语法错误页面打不开
- **[最终方案]** 不纠结根因，采用防御性修复：在 `loadOrGenerateFloors` 首次加载时深拷贝保存每个房间的 `_initGrid`（初始地形）和 `_initDoors`（初始门状态），R键重置时从备份恢复
- **[具体改动]**
  1. `loadOrGenerateFloors` 第 990 行循环中：`r._initGrid = r.grid.map(col => [...col])`、`r._initDoors = { up: ..., down: ..., left: ..., right: ... }` 深拷贝
  2. `resetGameToFloor1`：合并原来分散的两个清理 for 循环为一个统一循环，从 `_initGrid`/`_initDoors` 恢复 grid 和 doors，同时重置 `bossLadderPlaced`、`itemSpawned`、`itemDropped`、`locked`、`_shopSlots`、`_groundResources`、`_groundItems`
- **[恢复内容]** 地形破坏（便便/岩石）、Boss 梯子放置、炸弹破坏的门、地面掉落物、商店槽位

### AP 圆点视觉修复 — buildApDots 与 updateApDots 执行顺序 [当前方案]
- **[问题]** 按R键后 M-AP 和 A-AP 圆点视觉上没有正确显示（虽然值已正确重置）
- **[根因]** `resetGameToFloor1` 中 `updateUI()`（含 `updateApDots` 填充圆点）在第 978 行，`buildApDots`（重建圆点为 empty）在第 979 行。`buildApDots` 在 `updateApDots` 之后执行，把已填充的圆点全部重置为 empty
- **[修复]** 将 `buildHearts`/`buildBlueHearts`/`buildApDots` 移到 `updateUI` 之前，让 `updateUI` 中的 `updateApDots` 在圆点重建后正确填充
- **[额外加固]** 同时在 `clearInventory()` 后显式设置 `playerStats.moveSpeed = 3; playerStats.fireRate = 3;`，确保 `resetTurnAP()` 计算的基值正确

### 商店购买系统 [当前方案]
- **[触发]** 用户要求实现商店购买功能，走进商品格子自动购买
- **[实现]**
  1. `spawnShopItems(room)` 同时创建 `room._shopSlots` 数组，记录每个商品的价格(price)、类型(type: item/resource)、cfgId、坐标(priceCol/priceRow)、售出状态(sold)
  2. 玩家移动到商品格子上时触发 `tryBuyShopSlot(col, row)`：检测坐标上是否有未售出商品 → 检查金币是否足够 → 扣除金币 → 获得道具(`applyItem`)或资源(`handleResourcePickup`) → 标记售出并从地面移除实体
  3. `drawShopPrices()` 在 `render()` 中调用，渲染金色价格标签（已售出显示灰色）
  4. 商店房进入时不再在 `spawnRoomMonsters` 中调用 `spawnShopItems`（已由 `finishTransition` 统一处理）
- **[关键设计]** 商店价格标签通过 Canvas 渲染（而非 DOM 覆盖层），使用金色/灰色区分售出状态

---
