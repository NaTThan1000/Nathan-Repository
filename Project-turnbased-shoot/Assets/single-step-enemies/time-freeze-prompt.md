# 棋盘时间静止遮罩

使用内置 imagegen 生成透明PNG，目标为测试原型720×560棋盘；原图保留在source/time-freeze-board.png，构建仅缩放适配，不修改原图。后续正式版需重新制作对应尺寸资源。

## 最终提示词

Create ONE transparent game overlay texture for an existing 2D sci-fi dungeon board. Target display size exactly 720 by 560 pixels (9 columns x 7 rows, ratio 9:7), a flat front-facing rectangular texture, no perspective. Theme: time is frozen, quiet suspended cold blue glass atmosphere. Very delicate desaturated ice-blue/cyan translucent veil, sparse faint fractured-glass and suspended stardust details concentrated at edges and corners, central 70 percent extremely clear/transparent so floor, red warning tiles and character sprites remain readable. Soft subtle perimeter vignette fading into the empty transparent center, tiny faint abstract clock-like fragments at corners only. NO bright border, NO luminous ring, NO large circle, NO text, NO numbers, NO grid lines, NO checker pattern, NO characters, NO terrain, NO opaque background, NO mockup. Actual alpha transparency. A tasteful subtle compositing overlay asset to place over a 720x560 board, not an image of a board. The entire rectangular texture fits inside the image and has transparent padding zero or minimal.
