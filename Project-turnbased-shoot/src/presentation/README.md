# 显示层维护入口

| 职责 | 相对项目根目录的源文件 |
|---|---|
| 审核素材裁切与归一化 | tools/build-scrap-assets.cjs |
| 正式绘制、动画和HUD | src/presentation/scrap-star.js |
| 界面排版 | src/presentation/scrap-star.css |
| 临时效果状态及战斗接线 | src/presentation/combat-effects-state.js、combat-effects-hooks.js |
| 正式门连接、蓝心、道具栏等适配 | scrap-star-game-runtime.js |
| 固定测试场景和面板 | src/playtest/scenarios.js |
| 内存组装与资源内嵌 | tools/assemble-game.cjs、tools/inline-resources.cjs |

构建命令与四个试玩入口见[项目指引](../../PROJECTS.md#试玩入口)。主试玩包与自定义场共享单步规则和表现，旧规则回归场用于 MP/AP 回溯。

原始审核素材在 Assets/scrap-star-review，唯一审核页继续原位置更新。修改已确认素材时遵守用户的局部改动边界。历史候选不自动替换运行资源。

生成 HTML 的维护约定见[工程入口](../../PROJECTS.md#工程入口与项目约定)。旧独立原型见[历史归档](../../history/README.md)。
