# Scrap Star 资源审核与正式接入

## 2026-11-03 当前状态

唯一审核入口为 审核预览.html；用户已审核并授权接入核心试玩和正式版。当前资源选择以审核页、core-playtest/build-scrap-star.cjs 及正式 build-scrap-star-art.cjs 为准；以下候选说明是历史制作记录，不能据此判定当前尚未切片或未接入。审核页及审核包继续原位置更新，不再创建重复审核版本。

原型：core-playtest/index.html；正式可双击入口：turnbased-shoot-demo-pack.html（相对于项目根目录）。未覆盖资源维持原表现，完整浏览器及连续闯关验收尚待完成。未经用户指出的素材与像素不改，整项上下不对称站姿实验已撤回。

## 历史候选记录（不代表当前状态）

这些是生成的候选图，尚非可直接导入游戏的完整资源包。现有试玩与正式游戏没有引用它们。

- hero-down.png：正面向下，背包隐藏，含待机、喷气和受击候选；射击动作和逐帧对齐仍待修整。
- hero-up.png：背面向上，中间双喷气罐，枪口隐藏；射击动作需进一步制作。
- hero-left.png：左向动作候选；需验证帧边界和透明边缘。
- hero-right-draft.png：右向草稿，射击帧存在多余枪支。
- hero-right-revision.png：射击方向已改善，受击帧枪口方向错误且背景边缘待处理。
- enemy-melee.png、enemy-ranged.png：两种试玩怪物动作候选；方向与逐帧尺寸待检查。
- room-modules-draft.png：房间模块候选；尺寸、拼接与四向门需按格子重新裁切和验证。
- objects-effects-draft.png：箱子、设施、子弹和特效候选；透明背景、帧隔离及实际占格需处理。
- ui-draft.png：UI 部件候选；图标需拆分，文字和数字应动态显示。

尚未完成：全套四方向射击和移动动作、命中及消失动画逐帧整理、无敌闪烁和飘字呈现、各素材的独立文件与尺寸规范、透明边缘检查、完整审核索引和动态预览。所有素材均需与 13×7 网格和实际占格匹配后再接入。

## 后续补充

双击 `审核预览.html` 查看当前候选，部分序列可粗略播放；播放按图像等分，仅供动作方向参考，不代表已裁好帧。该页面未做完整浏览器视觉验收。

- hero-right-candidate.png：右向重新生成，射击和受击帧枪口朝右；待验证帧对齐。
- hero-down-shoot-draft.png、hero-up-shoot-draft.png：上下射击动作候选，带半透明白色底雾，不可直接接入。
- bullets-four-directions.png：四方向弹体候选，需分帧与检查透明光晕。
- impact-expiration-orange.png：橙色弹体命中和消失效果候选，待分帧。
- crate-break.png：箱子破坏序列候选，待校准单格占地。
- floor-tile-draft.png：单格地板候选，平铺无缝性待验证。

## 本次更新

- 已补四方向独立射击候选：hero-down-shoot-candidate.png、hero-up-shoot-candidate.png、hero-left-shoot-candidate.png、hero-right-shoot-candidate.png。前两者角落像素透明；左向第三帧表情类似受击，仍待修。子弹方向以 bullets-four-directions.png 单独表达。
- hero-right-candidate.png 已调整，右向射击与受击姿态的枪口向右。
- 审核预览.html 的脚本和资源链接通过静态检查；浏览器截图尝试未生成文件，视觉验收未完成。
- 资源尚未按统一尺寸切片；门、墙、地板拼接，13×7 占格，透明边缘，动作连贯性，以及运行时效果仍待验证。

## 审核说明

按用户要求停止自行反复生成或调优；现有候选供用户集中审核，后续根据用户指出的问题调整。审核页包含四方向角色与射击、两种敌人、四方向子弹、命中与消失、箱子、房间部件、地板、UI、提示格及回溯等候选。图中的动作是审核候选，并非已经切帧、通过拼接和运行验证的正式游戏资产。无敌采用角色闪烁，伤害数字为动态文字表现，未另做独立序列。

补充：ui-turn-and-status.png 为回合提示框、状态条与道具槽；hero-defeat.png 为主角失败表现。
