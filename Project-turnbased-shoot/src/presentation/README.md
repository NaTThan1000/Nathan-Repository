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

在项目目录运行 node build.cjs 生成 dist/turnbased-shoot-demo-pack.html 与 dist/combat-playtest.html，再运行 node verify.cjs 检查。正式与测试入口共享全部显示和规则代码，不维护第二份原型显示代码；只增加固定测试场景。

原始审核素材在 Assets/scrap-star-review，唯一审核页继续原位置更新。修改已确认素材时遵守用户的局部改动边界。历史候选不自动替换运行资源。

HTML是生成结果，不直接修改。构建校验模块路径、插入点和脚本语法；开发依赖优先使用项目安装，兼容当前环境缓存。完整目录和保留限制见 src/README.md。旧独立原型仅在 history 中冻结，不能作为当前显示源码。
