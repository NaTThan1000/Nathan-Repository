# Scrap Star 静态美术扩展

本目录为正式版新增素材。使用内置 image_gen 工具生成，透明背景；参考 `style-reference.png` 的机器人、粗轮廓、橙铜与青蓝配色。未覆盖或改写既有审核素材。

源图存放在 `source/`，分别为蓄力机器人 golem、跳跃首领 jumper、飞行首领 duke、辅助无人机 floater 和地刺 spikes。构建仅按透明边界裁切并等比缩放，内嵌进最终 HTML。金币、爱心、炸弹、钥匙复用现有审核 UI 图标，银币、黑币、蓝心由同一图标派生着色。高等级近战／远程机器人使用已有对应机器人静态帧，并以等级标记区分。

生成提示模板（每个主体单独调用一次，透明背景）：

> Use case: stylized-concept. Create ONE isolated static game sprite: {subject}. Reference image is STYLE ONLY, not an edit target. Match the existing Scrap Star game's outlined chunky pixel-art robot sprites: crisp dark thick outlines, small expressive readable forms, warm copper orange and teal highlights, restrained pixel clusters, top-down dungeon camera with front faces visible. Single centered full-body sprite, transparent background, ample transparent margin, no text, no UI, no ground or cast shadow, no animation frames, no additional characters. Must read clearly when scaled down to 40px. Do not include anything from reference other than the visual style.

主体：

- golem: a bulky squat scrapyard charge robot, heavy copper armor, powerful shoulder plates, two short heavy legs, glowing orange furnace chest
- jumper: a large boss hopping robot, broad round orange armored body, huge piston feet, intimidating but playful junkyard machine
- duke: a boss flying drone mothership, round rusty orange steel body, two cyan thrusters, two side turbines, dark faceplate with orange eyes
- floater: a small hovering assistant drone, round blue teal shell, one glowing orange optical lens, tiny side wings, cyan exhaust below
- spikes: a square floor trap tile consisting of a rusty dark steel base plate and five pointed silver metal spikes angled upward, top down three quarter view
