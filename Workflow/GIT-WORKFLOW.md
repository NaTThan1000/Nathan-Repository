# 🔖 塔罗对决项目 — Git 工作流规范 v1.0

---

## 一、分支体系

```
main (稳定主线)
│
├── develop              ← 开发集成分支（可选，单人项目可省略）
│
├── feat/xxx             ← 功能/试验分支
├── fix/xxx              ← 修复分支
└── experiment/xxx       ← 高风险试验分支
```

### 分支命名规则

| 类型 | 前缀 | 示例 | 说明 |
|------|------|------|------|
| 功能开发 | `feat/` | `feat/v3-effect-tuning` | 新功能或效果调整 |
| Bug修复 | `fix/` | `fix/hermit-not-triggering` | 问题修复 |
| 试验性 | `experiment/` | `experiment/new-scoring-system` | 不确定是否保留的大改动 |
| 发布准备 | `release/` | `release/v3.0` | 发布前最终调整 |

### 分支生命周期

```
创建 → 开发(多次commit) → 测试 → 合并到main → 打tag → 删除分支(可选)
```

---

## 二、标签体系 (Tag)

### 格式：`v<大版本>.<小版本>-<描述>`

```
v1.0-initial          ← 最初版本
v2.0-deck-separate    ← v2：大小牌分离
v2.1-manual-play      ← v2.1：手动出牌
v2.2-ui-improve       ← v2.2：UI优化
v3.0-csv-rewrite      ← v3：基于CSV重写全部22张大牌效果
v3.1-xxx              ← 后续稳定版本
```

### 关键规则：
- **每次合并到 `main` 后必须打 tag**，tag 就是你的"存档点"
- tag 不可删除/移动（除非真的打错了）
- 用 `git tag -l` 随时查看所有存档点

---

## 三、提交信息规范

### 格式：`<类型>: <简短描述>`

```
feat:    新功能
fix:     修复bug
tune:    效果/数值调整
refactor:代码重构（不改功能）
ui:      界面调整
docs:    文档/注释
test:    测试相关
```

### 实际示例：

```bash
# ✅ 好的提交信息
feat: 实现隐士(IX)正位效果 - 丢弃小牌堆顶2张
fix: 隐士牌duration从2改为3，修复不触发问题
tune: 调整教皇逆位duration 3→4
ui: 大牌历史记录面板增加滚动条
refactor: 抽取_playMinorCard公共方法

# ❌ 不好的提交信息
update
改了东西
fix bug
111
```

---

## 四、日常工作流

### 场景1：开始一个新试验（最常见）

```powershell
# 1. 确保当前在main且干净
git checkout main
git status

# 2. 从main创建试验分支（分支名说清楚要干嘛）
git checkout -b experiment/tower-effect-test

# 3. 愉快地改代码...

# 4. 改到一个"检查点"，提交
git add .
git commit -m "tune: 修改塔(XVI)正位触发条件为点数变化>3"

# 5. 继续改...
git commit -m "tune: 塔逆位改为只丢弃点数最高的阵"

# 6. 试验满意了，合并回main
git checkout main
git merge experiment/tower-effect-test
git tag v3.1-tower-tuned        # ← 打标签存档！
git push origin main --tags

# 7. 试验失败了，直接丢弃
git checkout main
git branch -D experiment/tower-effect-test   # 删掉分支，当没发生过
```

### 场景2：改到一半发现搞坏了

```powershell
# 查看最近的提交
git log --oneline -10

# 回退到上一个提交（保留改动在工作区）
git reset --soft HEAD~1

# 或者彻底回退（丢弃改动）
git reset --hard HEAD~1

# 或者回退到任意一个 tag
git checkout v3.0-csv-rewrite
```

### 场景3：想对比两个版本

```powershell
# 查看 v2 和 v3 之间 tarot-battle.html 的差异
git diff v2.2-ui-improve v3.0-csv-rewrite -- tarot-battle-project/tarot-battle.html
```

---

## 五、实验性改动的保险机制

针对"试验性调整可能效果不好"的场景，增加**轻量快照 tag**：

```powershell
# 在做大改动之前，打一个临时快照 tag
git tag snapshot/20260708_before-tower-test

# 试验过程中，每个关键节点也可以打
git tag snapshot/20260708_tower-phase1
git tag snapshot/20260708_tower-phase2

# 试验结束后清理临时快照（或保留）
git tag -d snapshot/20260708_before-tower-test   # 删除本地
git push origin --delete snapshot/20260708_before-tower-test  # 删除远程
```

**快照命名规则**：`snapshot/YYYYMMDD_简短描述`

这比创建分支更轻量，适合"我马上要改这里，先存个档"的场景。

---

## 六、目录结构规范

```
tarot-battle-project/
├── tarot-battle.html            ← 主游戏文件
├── tarotEffect.csv              ← 效果定义 (当前版本)
├── archive/                     ← 历史效果备份 (加入.gitignore)
│   ├── tarotEffect_v2_old.js
│   └── tarotEffect_v1_original.js
├── snapshots/                   ← 本地快照 (加入.gitignore)
└── GIT-WORKFLOW.md              ← 本文件
```

> `archive/` 和 `snapshots/` 已加入 `.gitignore` 避免冗余提交，因为 Git 历史本身已经记录了所有版本。

---

## 七、快速参考卡片

```bash
# ===== 查看 =====
git tag -l                              # 查看所有标签（存档点）
git log --oneline --graph --all -20     # 查看提交历史（树状简洁版）
git status                              # 查看当前工作区状态

# ===== 分支操作 =====
git checkout -b experiment/xxx          # 创建并切换到新分支
git checkout main                       # 切换回main
git branch -d feat/xxx                  # 删除已合并的本地分支
git branch -D experiment/xxx            # 强制删除本地分支（丢弃试验）

# ===== 存档/回退 =====
git tag snapshot/YYYYMMDD_desc          # 打轻量快照
git checkout v3.0-csv-rewrite           # 切换到某个tag查看
git checkout -b feat/new v3.0-csv-rewrite # 基于某个tag开新分支
git diff v3.0-csv-rewrite -- file.html  # 对比当前与存档的差异
git reset --hard HEAD~1                 # 回退到上一个提交（丢弃改动）

# ===== 合并/推送 =====
git merge experiment/xxx                # 合并试验分支到当前分支
git tag vX.Y-desc                       # 打发布标签
git push origin main --tags             # 推送main和所有tag到远程
```

---

## 八、总结

| 操作 | 命令 |
|------|------|
| 开始试验 | `git checkout -b experiment/xxx` |
| 存档当前状态 | `git tag snapshot/YYYYMMDD_desc` |
| 发布稳定版 | `git merge` → `git tag vX.Y-desc` |
| 回退到存档 | `git checkout <tag名>` |
| 放弃试验 | `git checkout main` → `git branch -D experiment/xxx` |
| 对比版本 | `git diff <tag1> <tag2> -- <文件>` |

---

核心思路：**每次合并到 main 必打 tag，每次大改动前必打快照 tag，每次试验用独立分支。** 这样任何时候你都能通过 `git tag -l` 看到完整的版本演进历史，想回哪个版本就回哪个版本。
