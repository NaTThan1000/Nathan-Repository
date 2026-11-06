# 单步怪物资源生成记录

2026-11-06：已接入正式版和单步机制原型。固定状态按准备／射击／冲锋／腾空切换，小史莱姆缩小本体但通用摧毁帧保持同尺寸；原移动射手与近战者继续使用旧审核机器人素材。冻结纹理在 source/time-freeze-board.png，提示词见 time-freeze-prompt.md；正式版按棋盘区域适配此纹理，尚未另生成正式版专用源图。frames/为加工结果，资源审核页为本目录的固定帧审核.html，不属于用户要求清理的dist PNG预览。

内置 imagegen 生成，透明背景。现有近战/远程审核素材只作风格参考，原文件未改动。每张源图为3列状态图；具体切帧和统一尺寸由 tools/build-single-step-art.cjs 维护。

- turret: C:\Users\Fishy\.codex\generated_images\01a1a690-2f90-7b41-a2d1-49f159890fa0\exec-0db149df-bbfa-4aeb-9b8e-9c39fd36ed36.png
- slime: C:\Users\Fishy\.codex\generated_images\01a1a690-2f90-7b41-a2d1-49f159890fa0\exec-812e7e5a-88d0-4b1d-a750-9d160b9bdb86.png
- bomber: C:\Users\Fishy\.codex\generated_images\01a1a690-2f90-7b41-a2d1-49f159890fa0\exec-3cbcb3b2-f65b-434b-a641-7e41c4bf240d.png
- charger: C:\Users\Fishy\.codex\generated_images\01a1a690-2f90-7b41-a2d1-49f159890fa0\exec-93565e4b-7fe5-42d5-8d7b-f0377fbec8a7.png
- x: C:\Users\Fishy\.codex\generated_images\01a1a690-2f90-7b41-a2d1-49f159890fa0\exec-4353bca3-7184-4b82-bd40-7325f1a46b9f.png
- cross: C:\Users\Fishy\.codex\generated_images\01a1a690-2f90-7b41-a2d1-49f159890fa0\exec-873e786f-f4c2-4e98-8785-bcaf221d6e16.png
- effects: C:\Users\Fishy\.codex\generated_images\01a1a690-2f90-7b41-a2d1-49f159890fa0\exec-a496198f-2a9f-4f7d-bace-3a3b5dfe9aa5.png

## 提示词

Game sprite asset, reference the robot sprite sheets already shown in conversation ONLY for art style: hand-painted 2D chunky scrap-metal sci-fi, ivory worn metal with orange seams, thick dark outline, cyan emissive details, soft top-left lighting, orthographic top-down three-quarter camera. TRANSPARENT background, no text, no panel borders, no ground tile. Sprite sheet exactly 3 equal columns and 1 row. Each isolated sprite centered on the SAME baseline, equal scale and generous transparent padding, no overlap.

各图按用户需求分别生成：turret 待机/射击/空；slime 待机/蓄力/冲锋；bomber 待机/红色准备/空；charger 待机/空/空；x 与 cross 待机/射击/腾空；effects 通用摧毁/环形爆炸/冲锋尾迹。所有角色保持同一视角，不生成连续动画。
