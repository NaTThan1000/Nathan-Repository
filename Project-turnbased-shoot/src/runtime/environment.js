
console.log('✅ Turnbased Shoot 已加载 - 门在门前格+方向键触发');
// ==================== 渲染配置 ====================
const GAME_W  = 318;
const GAME_H  = typeof COMBAT_PLAYTEST_PROFILE==='undefined'?186:230;
const DISPLAY_SCALE = 3;

// ==================== 画布初始化 ====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width  = GAME_W;
canvas.height = GAME_H;

// ==================== 音效系统（WebAudio 合成，无外部素材） ====================
const SFX = (() => {
  let actx = null;
  let muted = false;
  let unlocked = false;
  const lastAt = {};

  function ac() {
    if (!unlocked || document.hidden) return null;
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    return actx;
  }
  function unlock(event) {
    if (!event.isTrusted) return;
    unlocked = true;
    const audio = ac();
    if (audio?.state === 'suspended') audio.resume().catch(() => {});
  }

  // 单音：type 波形 / vol 音量 / throttle 同种音效最小间隔(ms)
  function tone(key, freq, opts = {}) {
    const { to = null, dur = 0.08, type = 'square', vol = 0.12, throttle = 40 } = opts;
    if (muted) return;
    const now = performance.now();
    if (lastAt[key] && now - lastAt[key] < throttle) return;
    lastAt[key] = now;
    const a = ac();
    if (a?.state !== 'running') return;
    const t = a.currentTime;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // 噪声（爆炸）
  function noise(dur = 0.3, vol = 0.18) {
    if (muted) return;
    const a = ac();
    if (a?.state !== 'running') return;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const gain = a.createGain();
    gain.gain.setValueAtTime(vol, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    src.connect(gain).connect(a.destination);
    src.start();
  }

  function toggle() {
    muted = !muted;
    const btn = document.getElementById('sound-btn');
    if (btn) btn.textContent = muted ? '🔇' : '🔊';
    return muted;
  }
  function isMuted() { return muted; }

  // ===== 音效预设 =====
  const P = {
    shoot:      () => tone('shoot', 880, { to: 440, dur: 0.06, vol: 0.08, throttle: 30 }),
    hit:        () => tone('hit', 300, { to: 140, dur: 0.07, type: 'triangle', vol: 0.10, throttle: 30 }),
    kill:       () => tone('kill', 180, { to: 55, dur: 0.20, type: 'sawtooth', vol: 0.14 }),
    hurt:       () => tone('hurt', 150, { to: 70, dur: 0.22, vol: 0.16 }),
    pickupItem: () => {
      tone('pickupItem1', 523, { dur: 0.07, type: 'triangle', vol: 0.10 });
      setTimeout(() => tone('pickupItem2', 784, { dur: 0.10, type: 'triangle', vol: 0.10 }), 60);
    },
    pickupRes:  () => tone('pickupRes', 1046, { dur: 0.05, vol: 0.07, throttle: 50 }),
    chest:      () => {
      tone('chest1', 659, { dur: 0.07, type: 'triangle', vol: 0.10 });
      setTimeout(() => tone('chest2', 988, { dur: 0.12, type: 'triangle', vol: 0.10 }), 70);
    },
    locked:     () => tone('locked', 220, { dur: 0.09, vol: 0.10, throttle: 120 }),
    bombPlace:  () => tone('bombPlace', 260, { to: 180, dur: 0.09, vol: 0.10 }),
    boom:       () => { noise(0.35, 0.20); tone('boom', 70, { to: 35, dur: 0.35, type: 'sine', vol: 0.20 }); },
    door:       () => tone('door', 320, { to: 520, dur: 0.10, vol: 0.08, throttle: 150 }),
    battle:     () => {
      tone('battle1', 1046, { to: 523, dur: 0.12, vol: 0.12 });
      setTimeout(() => tone('battle2', 660, { to: 330, dur: 0.18, vol: 0.10 }), 90);
    },
    rewind:     () => tone('rewind', 523, { to: 1309, dur: 0.28, type: 'sine', vol: 0.12, throttle: 200 }),
    floor:      () => { [523, 659, 784].forEach((f, i) => setTimeout(() => tone('floor' + i, f, { dur: 0.12, type: 'triangle', vol: 0.10 }), i * 80)); },
    victory:    () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone('vi' + i, f, { dur: 0.18, type: 'triangle', vol: 0.12 }), i * 110)); },
    death:      () => { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone('de' + i, f, { dur: 0.22, type: 'sawtooth', vol: 0.12 }), i * 130)); },
    buy:        () => {
      tone('buy1', 784, { dur: 0.06, vol: 0.09 });
      setTimeout(() => tone('buy2', 1046, { dur: 0.09, vol: 0.09 }), 55);
    },
  };

  return { unlock, toggle, isMuted, ...P };
})();

// 音效开关 + 首次交互解锁 AudioContext（浏览器自动播放策略）
document.getElementById('sound-btn')?.addEventListener('click', () => SFX.toggle());
document.addEventListener('keydown', SFX.unlock, { capture: true });
document.addEventListener('pointerdown', SFX.unlock, { capture: true });
canvas.style.width  = (GAME_W * DISPLAY_SCALE) + 'px';
canvas.style.height = (GAME_H * DISPLAY_SCALE) + 'px';
ctx.imageSmoothingEnabled = false;

// ==================== 精灵图集加载 ====================
const SPRITE = {
  FW: 32, FH: 32,
  img: new Image(),
  loaded: false,
  BASE_SIZE: 24,
  ANIM_SPEED: 0.08,
  HEAD: {
    down:  { normal: [0,0], shooting: [0,1] },
    right: { normal: [0,2], shooting: [0,3] },
    left:  { normal: [0,2], shooting: [0,3] },
    up:    { normal: [0,4], shooting: [0,5] },
  },
  WALK: {
    down:  [[0,6],[0,7],[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7]],
    right: [[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[3,0],[3,1]],
  },
  maxFrame(dir) { return (this.WALK[dir] || this.WALK.down).length; },
  needsFlipX(dir) { return dir === 'left'; },
  getWalkDir(dir) {
    if (dir === 'down')  return 'down';
    if (dir === 'right') return 'right';
    if (dir === 'left')  return 'right';
    if (dir === 'up')    return 'down';
    return 'down';
  },
};
SPRITE.img.onload = () => { SPRITE.loaded = true; };
SPRITE.img.src = 'Assets/turnbased-shoot-idle.png';

// ==================== 掉落资源图片预加载 ====================
const RES_IMG_MAP = {
  coin_gold:       'Assets/usable_assets/one_coin.png',
  coin_black:      'Assets/usable_assets/five_coin.png',
  coin_silver:     'Assets/usable_assets/ten_coin.png',
  bomb_single:     'Assets/usable_assets/one_bomb.png',
  bomb_double:     'Assets/usable_assets/double_bomb.png',
  key_single:      'Assets/usable_assets/one_key.png',
  key_double:      'Assets/usable_assets/double_key.png',
  heart_half:      'Assets/usable_assets/half_red_heart.png',
  heart_full:      'Assets/usable_assets/one_red_heart.png',
  heart_double:    'Assets/usable_assets/double_red_heart.png',
  blue_heart_half: 'Assets/usable_assets/half_blue_heart.png',
  blue_heart_full: 'Assets/usable_assets/one_blue_heart.png',
  chest_normal:    'Assets/usable_assets/normal_box.png',
  chest_golden:    'Assets/usable_assets/golden_box.png',
  ui_heart:        'Assets/usable_assets/UI_heart.png',
  ui_half_heart:   'Assets/usable_assets/UI_half_heart.png',
  ui_blue_heart:   'Assets/usable_assets/UI_blue_heart.png',
  ui_half_blue_heart: 'Assets/usable_assets/UI_half_blue_heart.png',
};
const RES_IMAGES = {};      // { cfgId: Image }
let RES_IMAGES_LOADED = 0;
let RES_IMAGES_TOTAL = Object.keys(RES_IMG_MAP).length;

for (const [cfgId, src] of Object.entries(RES_IMG_MAP)) {
  const img = new Image();
  img.src = src;
  img.onload = () => { RES_IMAGES_LOADED++; };
  img.onerror = () => { RES_IMAGES_LOADED++; }; // 加载失败也计数，避免永久等待
  RES_IMAGES[cfgId] = img;
}
