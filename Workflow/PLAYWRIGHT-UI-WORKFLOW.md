# Playwright CLI UI 调整工作流

> 通过截图 → 标注 → 改代码 → 再截图验证的闭环，高效传递 UI 布局调整细节。

---

## 安装

```bash
npm install -g @playwright/cli@latest
```

PowerShell 环境下如遇执行策略限制，可用 `cmd /c` 绕过：

```powershell
cmd /c "playwright-cli open http://localhost:8765"
```

---

## 三步闭环

```
截图(开发) → 标注(设计) → 实现(开发) → 再截图验证(开发)
```

---

## 常用命令速查

| 命令 | 作用 | 示例 |
|------|------|------|
| `open <url>` | 打开 URL | `playwright-cli open http://localhost:8765` |
| `wait --load <state>` | 等待加载状态 | `playwright-cli wait --load networkidle` |
| `resize <w> <h>` | 调整视口大小 | `playwright-cli resize 375 812` |
| `screenshot` | 截取当前页面 | `playwright-cli screenshot --filename=ui.png` |
| `close` | 关闭浏览器 | `playwright-cli close` |
| `click <selector>` | 点击元素 | `playwright-cli click "button.submit"` |
| `type <selector> <text>` | 输入文本 | `playwright-cli type "#input" "hello"` |
| `eval <js>` | 执行 JS 代码 | `playwright-cli eval "document.title"` |

---

## 标准操作流程

### 1. 启动本地服务器

```bash
# 方式 A: Node.js
node server.js &

# 方式 B: Python
python -m http.server 8765

# 方式 C: npx
npx serve -p 8765
```

### 2. 打开页面 & 截图

```bash
playwright-cli open http://localhost:8765
playwright-cli wait --load networkidle
playwright-cli resize 1280 900          # 按需调整
playwright-cli screenshot --filename=ui-current.png
playwright-cli close
```

### 3. 标注方式

截图后，可选择以下任一方式标注：

#### 方式 A: 外部工具标注（推荐）
- 用任意图片编辑工具在 PNG 上画圈、箭头、标注尺寸
- 将标注图贴回对话中

#### 方式 B: eval 注入标注（无需外部工具）
```bash
# 高亮元素边界
playwright-cli eval "
  document.querySelector('.card-preview').style.outline = '3px solid red';
"

# 标注尺寸信息
playwright-cli eval "
  let el = document.querySelector('.card-preview');
  let badge = document.createElement('div');
  badge.textContent = 'w:' + el.offsetWidth + ' h:' + el.offsetHeight;
  badge.style.cssText = 'position:absolute;top:-20px;right:0;background:red;color:#fff;padding:2px 6px;font-size:11px;border-radius:3px;z-index:9999';
  el.style.position = 'relative';
  el.appendChild(badge);
"
```

### 4. 改代码 + 验证

修改 HTML/CSS 后，重复步骤 2 截图对比，确认效果符合预期。

---

## 关键注意点

1. **不支持 `file://` 协议** — 必须先启动本地 HTTP 服务器
2. **PowerShell 执行策略** — 遇到 `ps1 cannot be loaded` 错误时，用 `cmd /c` 前缀
3. **截图保存位置** — 默认保存到项目中，`.playwright-cli/` 目录下会自动生成页面状态 YAML 文件

---

## 推荐协作姿势

| 你说 | 我做 |
|------|------|
| "截图看看现在的界面" | 打开浏览器 → resize → screenshot → 回传图片 |
| （传回标注图） | 解读标注 → 开始改代码 |
| "把预览区加高 40px" | 改 HTML/CSS → 再截图 → 你确认 |
