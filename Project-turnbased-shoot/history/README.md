# 历史试玩参考

`core-playtest-legacy.html` 是归档时冻结的旧独立战斗原型，图片和配置已内嵌，可双击查看。保留供比较，不参与当前构建和自动检查。

它与正式版存在历史规则差异，例如末步进入怪物格的输入限制、回合结束挤出的距离计算，以及没有正式掉落／炸弹／跨房流程。请勿将它的代码复制回当前源码。

日常测试使用 `../dist/combat-playtest.html`；该入口与正式版共用一套源码。历史设计记录仍保留在 Documents 中，不以本归档代表当前游戏规则。

`retired-code/weapon-trial-items.json` 是 11 件未转正道具的历史快照。现役定义在 `Configs/item-db.json` 的 `arenaItems` 中，仅用于自定义场摆放。正式掉落和商店从 `singleStepItems` 取道具，更早的 25 件旧道具在 `items` 中供 MP/AP 回溯回归包使用。
