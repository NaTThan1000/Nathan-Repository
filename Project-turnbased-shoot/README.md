# Turnbased Shoot

## 试玩入口

- 正式版：双击 `dist/turnbased-shoot-demo-pack.html`。
- 固定战斗测试：双击 `dist/combat-playtest.html`，可选场景、重置、换种子、测试指定怪物组合。

这两份HTML都可以独立运行，无需服务器或安装开发依赖。测试入口与正式版共用游戏代码、配置和美术，只额外加入场景面板；炸弹、掉落、挤出、预测与回溯均使用正式规则。测试场景不提供房间切换，不替代正式版闯关测试。

## 开发维护

修改 `src/` 源代码、`Configs/` 配置或 `Assets/` 素材后，在本目录运行：

```powershell
node build.cjs
node verify.cjs
```

构建直接在内存中组装并内嵌资源，生成 `dist/` 内的两个最终文件，不再生成 `demo2.html`。只更新测试入口可运行 `npm run build:prototype`。开发依赖通过 `npm ci` 按锁文件安装，当前环境也兼容已有缓存依赖。

`Configs` 和 `tools` 是仍在使用的源数据和构建工具；`tests` 是现役检查，不按文件名删除。完整职责表见 `src/README.md`。生成的HTML不要直接修改。

## 历史与清理

旧独立原型仅保留 `history/core-playtest-legacy.html`，它有历史规则差异，不再维护或纳入自动检查。旧 `core-playtest` 源码、旧测试／补丁构建脚本、过时浏览器检查脚本及其临时产物已退出维护。当前主入口和路径以本文件为准；Documents 中历史记录的旧路径只用于追溯。
