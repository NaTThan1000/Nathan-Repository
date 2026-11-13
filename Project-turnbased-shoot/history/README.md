# 历史试玩参考

`core-playtest-legacy.html` 是归档时冻结的旧独立战斗原型，图片和配置已内嵌，可双击查看。保留供比较，不参与当前构建和自动检查。

它与正式版存在历史规则差异，例如末步进入怪物格的输入限制、回合结束挤出的距离计算，以及没有正式掉落／炸弹／跨房流程。请勿将它的代码复制回当前源码。

旧 MP/AP 规则回归使用 [combat-playtest.html](../dist/combat-playtest.html)。日常试玩与构建入口见[项目指引](../PROJECTS.md)。

[旧设计文档](design-docs-2026-11-13/)保留项目上下文、设计纲要、四层设计原稿和决策索引。当前设计见 [GDD](../Documents/turnbased-shoot-gdd.md)，历史决定与原索引主题见[项目记忆](../Documents/turnbased-shoot-memory.md)。

`retired-code/weapon-trial-items.json` 是 11 件未转正道具的历史快照。现役定义在 `Configs/item-db.json` 的 `arenaItems` 中，仅用于自定义场摆放。正式掉落和商店从 `singleStepItems` 取道具，更早的 25 件旧道具在 `items` 中供 MP/AP 回溯回归包使用。
