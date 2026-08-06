/**
 * 打包脚本：将 isaac-turnbased-demo2.html 打包为单文件 isaac-turnbased-demo-pack.html
 * 
 * 处理内容：
 *   1. 将 Configs/*.json 的 fetch 调用替换为内联 JSON 数据
 *   2. 将 Assets/*.png 的引用替换为 base64 data URI
 *   3. 移除 Google Fonts 外部链接，改用系统回退字体
 * 
 * 用法：node build-pack.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = __dirname;
const SRC_HTML = path.join(PROJECT_DIR, 'isaac-turnbased-demo2.html');
const OUT_HTML = path.join(PROJECT_DIR, 'isaac-turnbased-demo-pack.html');
const CONFIGS_DIR = path.join(PROJECT_DIR, 'Configs');
const ASSETS_DIR = path.join(PROJECT_DIR, 'Assets');

// ============ 1. 读取源 HTML ============
console.log('📄 读取源文件:', SRC_HTML);
let html = fs.readFileSync(SRC_HTML, 'utf-8');

// ============ 2. 移除 Google Fonts，替换为系统回退字体 ============
console.log('🔤 移除 Google Fonts 外部链接...');
html = html.replace(
  /<link[^>]*fonts\.googleapis\.com[^>]*>/g,
  '<!-- Google Fonts removed for standalone build; using system fallback fonts -->'
);

// 替换 CSS 中的 ZCOOL KuaiLe 和 VT323 字体声明
html = html.replace(
  /--font-cn:\s*'ZCOOL KuaiLe',\s*'PingFang SC',\s*'Microsoft YaHei',\s*sans-serif;/g,
  "--font-cn: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;"
);
html = html.replace(
  /--font-mono:\s*'VT323',\s*'Courier New',\s*monospace;/g,
  "--font-mono: 'Courier New', 'Consolas', monospace;"
);

// ============ 3. 内联 JSON 文件 ============
console.log('📦 内联 JSON 配置文件...');

const jsonFiles = fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json'));

for (const jsonFile of jsonFiles) {
  const jsonPath = path.join(CONFIGS_DIR, jsonFile);
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  // 使用 JSON.stringify 确保安全转义，同时保持可读性
  const escaped = JSON.stringify(jsonContent);
  
  // 匹配模式：fetch('Configs/xxx.json' + ...) 或 fetch("Configs/xxx.json" + ...)
  // 策略：把整个 fetch + await 替换为一个返回模拟 fetch 响应的 async IIFE
  const fetchPattern = new RegExp(
    `(const\\s+\\w+\\s*=\\s*)?await\\s+fetch\\(['"\`]Configs/${escapeRegex(jsonFile)}['"\`]\\s*\\+\\s*Date\\.now\\(\\)\\)`,
    'g'
  );
  
  // 匹配 await fetch('Configs/xxx.json?'+Date.now()) 并替换为内联数据
  // 正则匹配的是 "await fetch(...)" 整段，替换时在前面补回 await
  html = html.replace(
    new RegExp(`await fetch\\(['"\`]Configs/${escapeRegex(jsonFile)}\\?['"\`]\\s*\\+\\s*Date\\.now\\(\\)\\)`, 'g'),
    `await (async () => { const d = ${escaped}; return { ok: true, json: async () => JSON.parse(d), text: async () => d }; })()`
  );
}

console.log(`  ✅ 已内联 ${jsonFiles.length} 个 JSON 文件`);

// ============ 4. 内联图片为 base64 ============
console.log('🖼️  内联图片资源...');

function collectImageFiles(dir, basePath = '') {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results = results.concat(collectImageFiles(fullPath, relPath));
    } else if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(entry.name)) {
      results.push({ fullPath, relPath: relPath.replace(/\\/g, '/') });
    }
  }
  return results;
}

const imageFiles = collectImageFiles(ASSETS_DIR);

for (const { fullPath, relPath } of imageFiles) {
  const imgBuffer = fs.readFileSync(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
  const mime = mimeMap[ext] || 'image/png';
  const dataUri = `data:${mime};base64,${imgBuffer.toString('base64')}`;
  
  // 替换 Assets/xxx/yyy.png 的所有引用
  const escapedPath = escapeRegex(`Assets/${relPath}`);
  html = html.replace(new RegExp(escapedPath, 'g'), dataUri);
}

console.log(`  ✅ 已内联 ${imageFiles.length} 个图片文件`);

// ============ 5. 移除 file:// 协议检测代码（打包后不需要） ============
console.log('🔧 移除 file:// 协议检测代码...');
// 匹配从 "if (window.location.protocol === 'file:')" 到 "return; }" 的整个代码块
// 这个检测在 bootGame 函数内部，打包后所有数据已内联，不需要阻止 file:// 打开
html = html.replace(
  /\/\/ 检测 file:\/\/ 协议[^\n]*\n\s*if\s*\(window\.location\.protocol\s*===\s*['"]file:['"]\)\s*\{[\s\S]*?return;\s*\}/,
  '// file:// protocol check removed for standalone build'
);
console.log('  ✅ 已移除 file:// 检测代码');

// ============ 6. 写入输出文件 ============
fs.writeFileSync(OUT_HTML, html, 'utf-8');
const sizeMB = (fs.statSync(OUT_HTML).size / (1024 * 1024)).toFixed(2);
console.log(`\n✅ 打包完成: ${OUT_HTML} (${sizeMB} MB)`);

// ============ 工具函数 ============
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
