# Turnbased Shoot

## 试玩入口

- 正式版：双击 `dist/turnbased-shoot-demo-pack.html`。
- 自定义战斗场：双击 `dist/custom-arena.html`。右侧操作台可摆放道具、地形、怪物、补给、玩家起点和无限生命木桩。开始测试后按 R 恢复原布置，窄屏操作台位于棋盘下方。
- 子弹时间机制测试：双击 `dist/bullet-time-playtest.html`，旧12组对照＋8间可连战房间，也可直接切换场景。
- 固定战斗测试：双击 `dist/combat-playtest.html`，可选场景、重置、换种子、测试指定怪物组合。

以上HTML都可以独立运行，无需服务器或安装开发依赖。正式版现为子弹时间玩法；`combat-playtest.html`保留旧 MP/AP 回溯规则，供兼容回归。`bullet-time-playtest.html`用于新机制的固定场景比较，不替代正式版完整闯关验证。

## 当前操作

正式版：WASD每次移动一格，方向键瞬发射击一次；有效普通行动推进场景一步。安全闪避确定攻击获得2次额外行动，期间冻结所有非玩家单位的自主推进；受伤立即结束，恢复后下次普通输入才推进场景。E放炸弹、M开关地图、Esc关闭地图、R重开；空格不结束回合，Esc不再回溯。普通怪物已换成固定／移动射手、大小史莱姆、近战者、自爆者、冲锋者、X／十字射手，Boss保留原行为适配。动作未到位的新输入直接丢弃，余效不阻塞后续操作；受击保留步数制无敌和闪烁。

完整旧版目录备份位于仓库根 `backup/Project-turnbased-shoot-rewind-2026-11-05/`。源码、资源及原双击成品均保留；不要用新构建覆盖该备份。

## 开发维护

修改 `src/` 源代码、`Configs/` 配置或 `Assets/` 素材后，在本目录运行：

```powershell
node build.cjs
node verify.cjs
```

构建直接在内存中组装并内嵌资源，生成 `dist/` 内的四个最终 HTML。只更新测试入口可运行 `npm run build:prototype`。正式包与自定义场共用单步战斗、武器结算和表现；新怪物和普通小队配置在 `Configs/single-step-enemies.json`。开发依赖通过 `npm ci` 按锁文件安装，当前环境也兼容已有缓存依赖。

按用户要求，`dist/` 不保存或生成日常PNG预览图；正式版及机制原型的浏览器回归只做验证，不输出预览图片。游戏所需图片仍保留在 `Assets/`，新怪物固定帧及冻结纹理由 `tools/build-single-step-art.cjs` 加工，资源审核页位于 `Assets/single-step-enemies/`。

`Configs` 和 `tools` 是仍在使用的源数据和构建工具；`tests` 是现役检查，不按文件名删除。完整职责表见 `src/README.md`。生成的HTML不要直接修改。

## 历史与清理

旧独立原型仅保留 `history/core-playtest-legacy.html`，它有历史规则差异，不再维护或纳入自动检查。旧 `core-playtest` 源码、旧测试／补丁构建脚本、过时浏览器检查脚本及其临时产物已退出维护。当前主入口和路径以本文件为准；Documents 中历史记录的旧路径只用于追溯。
