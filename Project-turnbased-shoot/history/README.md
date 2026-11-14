# Turnbased Shoot 历史归档

| 归档位置 | 内容 |
|---|---|
| [旧设计文档](design-docs-2026-11-13/) | 原上下文、设计纲要、四层设计原稿、决策索引、早期房间与刷怪方案和素材替换说明 |
| [历史审计](audits/) | 2026-11-04 的[代码审计](audits/turnbased-shoot-code-audit-2026-11-04.md)和[地图编辑器审计](audits/map-editor-audit-2026-11-04.md) |
| [美术历史](art-review/) | 旧审核包、未采用的姿势与动作候选、早期界面和背景参考图 |
| [旧精灵工具](sprite-tools/) | [精灵表网格调试](sprite-tools/sprite-debug.html)与[行走帧预览](sprite-tools/walk-preview.html)，共用现有旧图集 |
| [旧独立战斗原型](core-playtest-legacy.html) | 冻结的可玩 HTML |
| [旧规则回归场](playtest-builds/combat-playtest.html) | 固定场景、自选怪物和种子的 MP/AP 回溯规则对照 |
| [子弹时间机制原型](playtest-builds/bullet-time-playtest.html) | 早期单步规则的 12 组对照和 8 间连战房 |
| [退役代码](retired-code/) | 已移出的源码和历史配置快照 |

完整的旧回溯工程见[迁移前备份](../../backup/Project-turnbased-shoot-rewind-2026-11-05/)。当前入口见[项目指引](../PROJECTS.md)，美术审核仍从 [Scrap Star 审核页](../Assets/scrap-star-review/审核预览.html)和[单步怪物固定帧审核](../Assets/single-step-enemies/固定帧审核.html)打开。

`core-playtest-legacy.html` 是归档时冻结的旧独立战斗原型，图片和配置已内嵌，可双击查看。保留供比较，不参与当前构建和自动检查。

它与正式版存在历史规则差异，例如末步进入怪物格的输入限制、回合结束挤出的距离计算，以及没有正式掉落／炸弹／跨房流程。请勿将它的代码复制回当前源码。

两份 `playtest-builds/` HTML 为冻结快照，可双击体验当时规则。当前源码的自动回归自行生成临时测试包。日常试玩与构建入口见[项目指引](../PROJECTS.md)。

当前设计见 [GDD](../Documents/turnbased-shoot-gdd.md)，历史决定与原索引主题见[项目记忆](../Documents/turnbased-shoot-memory.md)。

`retired-code/weapon-trial-items.json` 是 11 件未转正道具的历史快照。现役定义在 `Configs/item-db.json` 的 `arenaItems` 中，仅用于自定义场摆放。正式掉落和商店从 `singleStepItems` 取道具，更早的 25 件旧道具在 `items` 中供 MP/AP 回溯回归包使用。
