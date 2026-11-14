# 退役代码归档

来源：本次审计前提交 `9887a31` 的正式源码。`manifest.json` 记录函数、原文件、原行号及原函数内容的 SHA-256。

本目录不在 `src/modules.cjs` 清单中，不加入正式包／测试包，不作为可独立执行的脚本。

归档内容：

- 旧预排队执行：startExecuteQueue、executeNextAction。
- 旧预览：drawMoveArrows、drawShootPreview、accumulateHits、drawShootLine、drawGhost、drawShootGridHighlights、traceBulletCells。
- 无现役引用的辅助函数：getMonsterAt、randomMovableDir、startMove、refreshReachableTiles、manhattanDist、shuffleArray、pset、transposeGridColToRow。
- updateDukeAnim 原函数：首句已有无条件 return，后续旧动画不可达；现役源码保留兼容空函数，避免破坏游戏循环和预测序列化的调用约定。

前17个函数通过当前源码、测试、页面模板和正式适配层的引用检查确认无外部入口。旧队列还依赖已不存在的 actionQueue、calcGhostPos、getShootPreviews 等，不应直接重新启用。

恢复时从 manifest 的 source 定位原模块，检查依赖和当前交互设计，按函数或原提交逐项恢复，并重新构建、验证。不要把整目录加入模块清单，也不要直接覆盖当前源码。尤其不能用恢复旧队列代码的方式改变已确认的回合内即时操作。

完整审计结论见 [2026-11-04 代码审计](../../audits/turnbased-shoot-code-audit-2026-11-04.md)。
