# Turnbased Shoot 项目指引

## 开工资料

- [通用开发流程](../Workflow/GAME-DEVELOPMENT-WORKFLOW.md)定义 A–E 阶段、拆任务与返工规则。[项目计划](project-plan.json)是工作台和 AI 共用的进度数据。现有顺序可按实际结果调整，体验和阶段验收由用户确认。
- 双击[工作台 HTML](../Workflow/Project-Workbench/workbench.html)，点「打开项目计划」选择本目录的 `project-plan.json`。在 Chrome 或 Edge 里同意浏览器的写入授权后，可以直接保存到原文件。聊天或编辑器更新计划后，点「重新读取文件」。开工概况及数据校验可在仓库根运行 `node Workflow/Project-Workbench/server.cjs --check Project-turnbased-shoot`。
- 在任务的「具体内容」中查看或打开旧版任务。重做时选「创建下一版本」，审核子任务的复用依据后保存。美术候选、预览和审阅都在美术任务详情中。
- [现行 GDD](Documents/turnbased-shoot-gdd.md)维护设计与系统框架。开工先读「设计总览」，有具体任务时查相关章节。
- [项目记忆](Documents/turnbased-shoot-memory.md)保存决定、取舍和验证记录。开工先读最近一条有实质内容的记录，再按任务检索主题。
- 通用协作规则由 Codex 加载的 AGENTS.md 提供。跨电脑可从 [codex-setup 的规则编辑源](../codex-setup/AGENTS.md)和其中的安装说明恢复。

## 试玩入口

| 入口 | 用途 |
|---|---|
| [主试玩包](dist/turnbased-shoot-demo-pack.html) | 正式单步规则、楼层和构筑体验 |
| [自定义战斗场](dist/custom-arena.html) | 摆放怪物、道具、地形、补给、起点和无限生命木桩，R 恢复原布置 |
| [子弹时间机制场](dist/bullet-time-playtest.html) | 12 组对照和 8 间连战房，可直接切换场景 |
| [旧规则回归场](dist/combat-playtest.html) | 固定场景、自选怪物和种子，验证旧 MP/AP 回溯规则 |

四个 HTML 均可独立双击运行。未指定入口时，游戏改动默认面向主试玩包。完整旧回溯版在 [迁移前备份](../backup/Project-turnbased-shoot-rewind-2026-11-05/)，旧独立原型见 [历史归档](history/README.md)。

## 工程入口与项目约定

- 项目目录内运行 `node build.cjs` 和 `node verify.cjs`。构建内嵌资源并生成四个 HTML。只更新测试入口可用 `npm run build:prototype`，安装依赖用 `npm ci`。
- 修改 [源码模板](src/game.html)、[模块清单](src/modules.cjs)、对应源码、配置或素材。构建入口为 [assemble-game.cjs](tools/assemble-game.cjs) 与 [inline-resources.cjs](tools/inline-resources.cjs)。`dist/` 只保存最终 HTML，日常验证不生成 PNG 预览。源素材保存在 `Assets/`。
- `src/runtime/` 管启动、主循环和刷怪组装，`src/world/` 管地形、房间与楼层，`src/combat/` 管行动、伤害、怪物与武器，`src/items/` 和 `src/data/` 管道具、资源和配置接入，`src/state/` 管快照与恢复，`src/presentation/` 管绘制与表现，`src/input/` 管输入，`src/playtest/` 管开发测试入口。
- 主包与自定义场共用单步调度、武器和表现。普通敌人与小队见 [单步敌人配置](Configs/single-step-enemies.json)。主包和自定义场使用 `item-db.json` 的 `singleStepItems`，旧回溯包使用 `items`。规则与数值从对应源码和配置核对。
- 新增源码要登记在模块清单中。改玩家属性或资源字段时核对 [状态覆盖说明](tests/STATE-COVERAGE.md) 及保存和恢复路径。旧预测的函数名必须唯一，子弹源码适配必须恰好匹配一次。
- 表现资源采用现有审核入口。只展示实际选用素材，已确认部分按用户指出的范围修改。源图、加工工具和动态表现入口见 [怪物素材说明](Assets/single-step-enemies/README.md) 与 [显示层入口](src/presentation/README.md)。浏览器验证与规则回归分别记录，整局体验由实际试玩判断。

## AgentWorkSpace 按需查阅

外部参考仓库为 `E:\AgentWorkSpace`。命中下列情况时读当时可用的本地版本，结合项目现状使用。该仓库按只读方式查阅，讨论结论、测试和项目记录写回 Turnbased Shoot。运行工具或安装模块按具体任务处理。

| 遇到什么情况 | 相对 AgentWorkSpace 根目录查什么 |
|---|---|
| 多怪预告看不清，原因不明 | `packages/game-analysis-decision/agents/procedures/PRO-COM-001-combat-readability-window-audit.md` |
| 有几个玩法方向值得比较 | `packages/brainstorm/README.md` |
| 准备机制对照、原型或集中试玩 | `packages/fromdemotospec/protocols/prototype-workflow.md` |
| 做美术样件、审阅、返修或接入 | `packages/game-presentation/workflow.md` |

外部路径不可用时，按项目现有规则继续，并说明缺少哪项参考。
