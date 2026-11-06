# 项目源码与构建

当前正式包在共享源码末尾追加 `combat/single-step-mode.js`、`combat/single-step-enemies.js` 与 `presentation/single-step-presentation.js`，采用单格移动／瞬发射击和固定2次额外行动的子弹时间规则。它保留房间、楼层、道具、掉落和资源系统；旧MP/AP调度不在正式版执行。普通怪物和小队使用 `Configs/single-step-enemies.json`，Boss继续用既有配置适配。`playtest/scenarios.js`对应的旧测试包仍使用回溯规则；`playtest/bullet-time*.js/html`维护12对照＋8连战房间与独立表现播放。以下历史整理说明中的“两个输出”“两包规则相同”不再适用于当前版本。

构建现在输出三个HTML；`verify.cjs`分别检查新正式版、子弹时间原型和旧规则测试包。完整回溯版已冻结在仓库根 `backup/Project-turnbased-shoot-rewind-2026-11-05/`，不要在新规则开发中覆盖。

`tools/build-single-step-art.cjs`加工新怪物固定帧和冻结纹理，正式版与原型共用美术；动作到位后释放输入、余效独立播放，不缓存忙时按键。正式伤害保持原步数制无敌，受击帧按画面命中时刻播放。按用户要求，日常回归不再生成PNG预览，dist只保留HTML；不要重新向dist输出截图。

正式游戏改动在 `src/` 对应职责模块中完成，`dist/turnbased-shoot-demo-pack.html` 与 `dist/combat-playtest.html` 都是最终构建产物；不要直接修改生成 HTML。`src/game.html` 维护页面结构及旧样式，`src/modules.cjs` 明确运行顺序，`src/presentation/scrap-star.css` 维护新界面样式。

## 日常命令

在项目目录运行 `node build.cjs`（或 `npm run build`），直接生成可双击运行的正式包和固定战斗测试包，不落地中间HTML。运行 `node verify.cjs`（或 `npm test`）检查正式包、共享规则测试包及表现／快照状态。只需更新测试入口时运行 `npm run build:prototype`。

另一台机器可先执行 `npm ci`，按 `package-lock.json` 安装锁定的构建与 Canvas 检查依赖；当前环境也兼容 Codex 已缓存依赖。锁文件已生成并核对直接依赖、下载地址和完整性字段，通过离线锁文件一致性解析；尚未在另一台机器完成全新安装验收。运行游戏本身不需要 Node 或依赖安装，正式包仍可独立双击。

保存／恢复字段与检查边界见 `tests/STATE-COVERAGE.md`。新增玩家属性或资源字段时，需要更新覆盖清单、保存和各恢复路径；新增特殊能力也要明确其撤销规则。预测规则的子弹源码适配必须恰好匹配一次，规则函数必须具备唯一名称，否则构建后的相关检查会明确报错。

## 职责与调用关系

| 目录／入口 | 维护内容 |
|---|---|
| `runtime/` | 初始化、主循环、启动与刷怪组装 |
| `world/` | 地格常量、坐标、房间和楼层 |
| `data/` | 数据库加载与特殊效果注册 |
| `state/action-history.js` | 玩家输入历史、完整状态恢复、暂时死亡及累计伤害预览；MP耗尽回退和无限Esc |
| `presentation/world-art.js` | 静态怪物／Boss／地刺、资源与机械拾取效果 |
| `presentation/minimap.js` | M地图弹窗、探索可见性与暂停开关 |
| `state/` | 运行状态、存档点、回合快照与路线回退模拟 |
| `combat/` | 行动解析、寻路、Boss、子弹、回合调度与危险预测 |
| `combat/movement-events.js` | 按动画实际抵达节点释放既定伤害与推移的同步桥 |
| `combat/prediction-rules.js` | 预测闭包所用的原规则函数清单 |
| `presentation/` | 新旧绘制、动画、DOM界面、提示和小地图 |
| `input/` | 键盘、调试及菜单事件 |
| `tools/build-scrap-assets.cjs` | 两端共享的审核素材裁切与归一化 |

编译为同一个经典脚本，保留原初始化顺序、函数名和共享作用域。这是为兼容现有预测器的函数序列化及双击运行方式；不是全面改为 ES Modules。新增源文件必须明确登记在模块清单中，构建会检查重复路径、插入点和整体脚本语法。

## 本轮分阶段整理结果

1. **资源与画面**：资源构建共用；正式显示源码独立，不再从原型成品取资源，不再靠多处字符串替换转换原型代码。
2. **规则与表现**：视觉通知接线、临时动画状态、旧渲染与动画抵达事件桥分开维护。后者必须保留既有伤害释放时点，不能为了让绘制“纯粹”而提前结算。仍有旧函数读写共享状态，不能声称所有绘制均为纯函数。
3. **预测与回溯**：预测规则清单集中；两处怪物保存和四处恢复共用格式函数，减少新增字段时遗漏。坐标对齐、瞬时状态重置和公爵关键帧的既有中间编码／后处理保留。玩家、道具等保存规则没有擅自改成通用深拷贝，不推断所有快照字段均可自动维护。
4. **结构与验证**：页面模板与职责模块是维护源，HTML 是构建输出；统一构建、验证入口和依赖声明已建立，正式及原型分别检查。

拆分阶段已比较组装 HTML 与拆分前逐字节一致；随后快照去重有专门字段隔离检查，并复用完整战斗回归。自动检查不等于完整浏览器交互、连续闯关和视觉布局验收。

本轮是保持行为的代码组织整理；不包含引擎迁移、玩法优化或把所有遗留函数重写为完全无全局状态的系统。后续出现具体维护需要时再深化接口，避免一次性重写引入行为变化。旧独立原型已冻结在 `history/core-playtest-legacy.html`；旧构建与测试脚本已删除，当前固定场景在 `playtest/scenarios.js`，共用正式源码。

## 输出与测试入口

`tools/assemble-game.cjs` 在内存中组合源码，`tools/inline-resources.cjs` 内嵌配置与图片，`build.cjs` 只写出 dist 最终成品。已取消 demo2 中间文件及旧的两阶段根目录脚本。`src/playtest/scenarios.js` 只增加场景和面板；自动检查要求去掉该模块后测试包脚本与正式包逐字节相同。

历史原型、测试结果与浏览器临时配置已退出当前构建。Documents 里的历史路径不自动改写，当前入口以项目根 README 为准。

新增静态素材原图和生成提示见 `Assets/scrap-star-extension/README.md`。真实Chrome界面检查可运行 `node tests/world-ui.browser.cjs`（需Playwright和Chrome），与模拟DOM／Canvas检查分开报告；不能替代完整闯关。
