# 以撒回合制 Demo — 资源替换完整步骤

本文档记录如何将游戏中纯代码绘制的图案替换为你自己的图片资源。

---

## 第一步：准备好你的图片

把你想要的图片放到 `Project-Issac-turnbase/` 文件夹里（和 `isaac-turnbased-demo.html` 放一起）。

比如你可以准备这些图片：
- `player.png` — 你的角色图
- `bullet.png` — 子弹图
- `floor.png` — 地板图

---

## 第二步：在代码开头"告诉浏览器你的图片在哪"

打开 `isaac-turnbased-demo.html`，找到下面这一行附近（大约第 131 行）：

```html
<script>
```

在 `<script>` 下面，找到这几行（约第 132-136 行）：

```javascript
// ==================== 渲染配置 ====================
const GAME_W  = 318;   // 游戏画布宽度 (低分辨率)
const GAME_H  = 186;   // 游戏画布高度
const DISPLAY_SCALE = 3; // CSS 放大倍数
```

在 `const DISPLAY_SCALE = 3;` 这行**下面**，加上这几行：

```javascript
// ====== 加载图片 ======
const imgPlayer = new Image();
imgPlayer.src = 'player.png';   // ← 改成你的角色图片文件名

const imgBullet = new Image();
imgBullet.src = 'bullet.png';   // ← 改成你的子弹图片文件名

const imgFloor = new Image();
imgFloor.src = 'floor.png';     // ← 改成你的地板图片文件名
// ======================
```

> 翻译成人话：这几行就是"告诉浏览器去文件夹里找到这些图片，准备好随时用"。`player.png` 就是图片文件名，改它就行。

---

## 第三步：替换角色的画法

找到 `drawPlayer()` 这个函数（大约第 594 行），它里面一大段代码是用像素块拼出一个角色。整个函数从头到尾都要改。

把这个函数**整个替换**为下面的简短版：

```javascript
// --- 角色 (用你的图片) ---
function drawPlayer() {
  const pp = project(player.px, player.py);
  const cx = Math.round(pp.x);
  const cy = Math.round(pp.y);
  const s = pp.s;

  // 角色图片的尺寸 (随透视缩放)
  const cw = Math.max(5, Math.round(16 * s));
  const ch = Math.max(6, Math.round(16 * s));

  // 画阴影
  prect(cx - Math.floor(cw * 0.35), cy + Math.floor(ch / 2) - 2, Math.round(cw * 0.7), Math.max(1, Math.round(3 * s)), 'rgba(0,0,0,0.55)');

  // 画图片 (图片居中放在角色位置)
  ctx.drawImage(imgPlayer, cx - Math.floor(cw / 2), cy - Math.floor(ch / 2), cw, ch);
}
```

> 这样，角色就从"像素块拼的"变成了"你的图片"。

---

## 第四步：替换子弹的画法

找到 `drawBullets()` 函数（约第 672 行），全部替换为：

```javascript
// --- 子弹 (用你的图片) ---
function drawBullets() {
  for (const b of bullets) {
    if (b.phase === 'dying') continue;

    const bp = project(b.x, b.y);
    const bx = Math.round(bp.x);
    const by = Math.round(bp.y + b.vOff);
    const s = bp.s;
    const size = Math.max(2, Math.round(6 * s));

    ctx.drawImage(imgBullet, bx - Math.floor(size / 2), by - Math.floor(size / 2), size, size);
  }
}
```

---

## 第五步：替换地板画法

地板比较复杂，因为目前是逐格画梯形来产生透视效果。如果你想换成一张地板图铺满，可以把 `drawFloor()` 函数（约第 465 行）替换为：

```javascript
// --- 地板 (用你的图片铺满) ---
function drawFloor() {
  // 直接把地板图铺满整个地板区域
  ctx.drawImage(imgFloor, FLOOR_L, FLOOR_T, FLOOR_R - FLOOR_L, FLOOR_B - FLOOR_T);
}
```

> ⚠️ 注意：这样会失去透视梯形效果，地板就是一张平铺的图。如果想保留透视而只换纹理，那就复杂很多，需要另做处理。

---

## 总结对照表

| 你想换什么 | 改哪个函数 | 用的图片变量 |
|-----------|-----------|-------------|
| 角色外观 | `drawPlayer()` | `imgPlayer` |
| 子弹外观 | `drawBullets()` | `imgBullet` |
| 地板外观 | `drawFloor()` | `imgFloor` |
| 粒子外观 | `drawParticles()` | 暂不推荐改（碎片很小） |
| 墙壁外观 | `drawWalls()` | 暂不推荐改（复杂） |

---

## 最简单的试水方法

如果你想先试试最简单的：**只换角色**。

1. 准备一张角色图片放进去，比如 `player.png`
2. 在代码里加加载语句（第二步）
3. 替换 `drawPlayer()` 函数（第三步）
4. 用浏览器打开 HTML 文件看看效果
