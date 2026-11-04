const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),p=path.join(root,'试玩说明.md');let h=fs.readFileSync(p,'utf8');
h=h.replace('# 甜界逃生 · 手动近战版 v2','# 甜界逃生 · 斜俯视键盘动作版 v3');
h=h.replace('| 移动 | WASD / 方向键 |','| 移动与朝向 | WASD / 方向键，支持八方向；松开后保持最后朝向 |');
h=h.replace('| 攻击方向 | 鼠标指向；不使用鼠标时沿移动方向 |','| 攻击方向 | 由移动方向决定，单次攻击中锁定，鼠标不参与战斗 |');
h=h.replace('| 轻攻击 | 点左键 / J，可连续衔接三段 |','| 普通攻击 | J，可连续衔接三段 |').replace('| 重攻击 | 点右键 / K，有蓄力前摇与收招 |','| 重攻击 | K，有前摇与收招；空中 K 是落斩 |\n| 跳跃 | L，消耗 10 体力，可接空中普攻或落斩 |');
h=h.replace('| 更换餐具搭配 | X 循环搭配；R 打开餐具工坊；点击底部餐具可切回单持 |','| 更换餐具搭配 | X 循环搭配；R 工坊内用方向键选择、Enter 装备、R 返回 |');
h=h.replace('| 选择人类合体 | C；也可点击左下方按钮 |','| 选择人类合体 | C |').replace('| 发动合体 | Q / 右下能量面板，共鸣满后可用 |','| 发动合体 | Q，共鸣满后可用 |').replace('| 三选一 | 点击 / 1 / 2 / 3 |','| 三选一 | 1 / 2 / 3 |');
h=h.replace('主要面向桌面键鼠操作。','主要面向桌面纯键盘操作。开始界面 Enter 进入关卡，T 进入试招庭院；暂停后 Enter 继续，结算后 Enter 重开。');
h=h.replace('命中反馈包括轻重不同的停顿、近战挥动动画、刀光、碎屑、受击变形、击退、震屏及合成音效。','命中反馈包括角色待机 / 奔跑 / 普攻 / 重击动作帧，带白色刃口和多层残影的渐变弧光，穿刺流光、星芒爆闪、碎屑、受击变形、浮空击飞、击退、震屏与轻重不同的停顿及合成音效。');
h=h.replace('- 当前运行逻辑：src/action-game.js；src/index.html 是页面和界面。','- 当前运行逻辑：src/action-game.js；src/presentation-v3.js 负责斜俯视投影、动作帧和技能特效；src/index.html 是页面和界面。');
h=h.replace('- 美术继续使用 assets/characters.png 图集，来源与生成提示词见 assets/art-generation.txt；本次主要通过程序动画和特效改造战斗表现。','- 美术：assets/characters.png 是原角色与怪物图集；assets/hero-motion-v3.png 是新增 4 × 4 主角动作图集；assets/promenade-v3.png 是新增甜品城场景。均通过内置 imagegen 生成。提示词见 assets/art-generation.txt 与 assets/art-generation-v3.txt。');
h=h.replace('node tests/action-check.cjs 或 node tests/browser-check.cjs','node tests/v3-check.cjs 或 node tests/browser-check.cjs').replace('tests/action-report.json，当前版截图前缀为 action-','tests/v3-report.json，当前版截图前缀为 v3-');
h=h.replace('角色为静态图集配合程序动作，尚未制作逐帧骨骼或精灵动作资源。','主角已接入待机、奔跑、普攻、重击动作图集；怪物仍以原图集配合程序受击与浮空动作呈现。场景采用二维斜俯视投影、直立精灵、前后遮挡与背景视差。');
h+=`

## v3 视角、技能与试招庭院

地面纵深按 0.49 系数压缩，人物与怪物保持直立比例，并按脚下位置作前后遮挡。场景由有远近层次的甜品城画作、较慢的背景视差、脚底投影与动态地面物件构成。攻击在地面坐标判定，视觉特效另有离地高度。

技能栏始终显示 J、K、空格与 L 的用途；当前 K 技能带具体操作提示。施放重击会显示技能名和连段提示。R 工坊同时显示搭配、技能名与按键顺序。

| 餐具 | K 技能与演出 | 怎么用 |
| --- | --- | --- |
| 叉＋刀 | 蔷薇十字 · 千层裁决：双重交叉斩光与切痕爆闪 | J → J → K |
| 叉＋勺 | 翻宴星坠：黄金巨戟坠落、地面裂纹与冲击环 | K 勾拢后延迟砸落 |
| 叉＋吸管 | 薄荷鲸落：薄荷鲸影、贯刺流光与虹吸气泡 | J 标记 → K 拉回并治疗 |
| 刀＋勺 | 布丁断头台：巨大瓷勺砸落与碎地冲击 | J 碎甲 → K 长硬直 |
| 刀＋吸管 | 银河糖丝：星屑链刃绕身，拉拢怪群 | K 周身回旋 |
| 勺＋吸管 | 苏打升龙：气泡螺旋升腾、巨型气压拳 | K 吸附后击飞 |

合体同样有独立演出：主厨＋工程师的「熔炉盛宴 · 天降餐锤」呈现巨大焰锤；主厨＋医师的「白瓷圣域 · 守望之翼」呈现圣盾、双翼与反震；医师＋工程师的「星河缝合 · 万象归席」呈现星环、磁索与标记连锁。

开始界面按 **T** 进入试招庭院：四种餐具和三名人类直接开放，木桩怪物不主动攻击，生命保持恢复，合体结束后共鸣自动填满。可以用 X / R 比较六种搭配，用 C / Q 比较三种合体。剩余木桩不足三只时重新布置，便于反复试招。

当前回归还覆盖鼠标完全不干预战斗、按键移动朝向、斜向输入立即出招、单次攻击方向锁定、跳跃落斩、斜俯视投影和纯键盘工坊装备。原 tests/action-check.cjs 保留为 v2 测试参考，标准入口已切换到 v3。
`;
fs.writeFileSync(p,h);fs.writeFileSync(path.join(root,'tests/browser-check.cjs'),"// 当前斜俯视纯键盘版回归入口。\nrequire('./v3-check.cjs');\n");console.log('已更新 v3 试玩说明与标准验证入口');
