# Skill 创建指南（跨电脑复用）

本文档用于在另一台电脑上重建 `daily-start` 和 `daily-end` 两个 skill。

> **维护规则**：每次更新 skill 的任何逻辑，都必须同步更新本文档中对应的 Skill 完整内容，保证本文档始终与实际 skill 一致，可在任何电脑上重建出最新形式的相同 skill。

## 创建步骤

1. 进入 skill 存放目录：
   - Windows：`C:\Users\<用户名>\.codebuddy\skills\`
   - macOS / Linux：`~/.codebuddy/skills/`

2. 新建 `daily-start/SKILL.md`，粘贴下方「Skill 1」的完整内容。

3. 新建 `daily-end/SKILL.md`，粘贴下方「Skill 2」的完整内容。

4. 重启 CodeBuddy，使 skill 生效。

> 注意：文件名必须为 `SKILL.md`（大写）。

---

## Skill 1: daily-start

```markdown
---
name: daily-start
description: >
  This skill should be used at the start of each daily coding session.
  It loads the project memory by reading the three-layer documentation system
  (global-rules.md, project-memory.md, project-context.md), identifies the
  active project, switches to the correct feature branch, and verifies the
  working tree status. Trigger phrases include "daily start", "加载项目记忆",
  "读取项目文档", "开始今天的工作", or any request to initialize a session
  with project documentation.
---

# Daily Start - Session Initialization

## Purpose

Load the full project context at the start of each daily session by reading the
three-layer documentation system, switching to the correct feature branch, and
summarizing the current project state.

## When to Use

Trigger when the user says any of:
- "daily start"
- "加载项目记忆"
- "读取项目文档"
- "开始今天的工作"
- "初始化会话"
- Or any request that implies starting a new session and loading project docs

## Workflow

### Step 1: Ask the User to Select the Active Project

Do NOT attempt to auto-detect the active project. Instead, always ask the user
directly using an interactive selection (the `ask_followup_question` tool) with
clickable options. The options are the four project directory names:

| Project | Directory | Feature Branch |
|---------|-----------|----------------|
| match3-rpg-project | `match3-rpg-project/` | `dev/match3` |
| tarot-battle-project | `tarot-battle-project/` | `dev/tarot-update` |
| Project-Issac-turnbase | `Project-Issac-turnbase/` | `dev/issac` |
| Project-rockman | `Project-rockman/` | `dev/rockman` |

The option labels shown to the user must be the actual project directory names
exactly as listed above. Wait for the user to click a selection before
proceeding. Do not guess or default to any project.

### Step 2: Read the Three Documentation Layers

Read all three documentation files in parallel:

1. **Global Rules** — `Documents/global-rules.md`
   - Cross-project universal conventions (Git workflow, documentation process, file management, session conventions)

2. **Project Memory** — `{project}/Documents/{project}-memory.md`
   - Project-specific decision history, problem-solving records, creative brainstorms

3. **Project Context** — `{project}/Documents/{project}-context.md`
   - Design document + technical quick-reference (game mechanics, architecture, constants, file inventory)

File path mapping (verify with `list_dir` when a path does not exist — some
projects keep context docs in the project root and have no memory doc yet):
- match3-rpg: `match3-rpg-project/match3-rpg-context.md`（暂无 memory 文档，目录下也没有 Documents/）
- tarot-battle: `tarot-battle-project/tarot-battle-context.md`（暂无 memory 文档，目录下也没有 Documents/）
- isaac-turnbase: `Project-Issac-turnbase/Documents/isaac-memory.md` 和 `Project-Issac-turnbase/Documents/isaac-turnbase-context.md`
- rockman: `Project-rockman/Documents/rockman-memory.md` 和 `Project-rockman/Documents/rockman-context.md`

4. **Ordering check (mandatory, per `global-rules §2.8`)**
   - After reading memory + context, confirm the date sections/tables are ordered
     **new → old** (newest at the top)
   - If a doc is ordered old → new, or its header still says "append at the end",
     report it to the user and reorder it (do not silently follow the stale header
     text)
   - Never trust a project doc's own header ordering instruction over `global-rules §2.8`

### Step 3: Verify the Branch (switch only when actually needed)

Do NOT blindly run `git checkout`. First verify the current branch **read-only**:

```
git branch --show-current
```

(If command execution is unavailable/rejected, read `.git/HEAD` instead — it
contains `ref: refs/heads/<branch>`.)

- If the current branch already **is** the project's feature branch → skip
  switching entirely and just report it. Running `git checkout` on the branch you
  are already on is pointless and counts as an unnecessary write operation.
- Only when the current branch differs → switch:
  `git checkout dev/{branch}` (branch names per the Step 1 table, e.g. `dev/tarot-update`)

Then verify upstream tracking (`global-rules §1.7`):

```
git branch -vv
```

If the current branch shows no `[origin/...]`, run
`git branch --set-upstream-to=origin/dev/{branch} dev/{branch}`, otherwise
`git pull` silently does nothing.

### Step 4: Check Working Tree Status

Run `git status` to verify the working tree is clean and note any pending changes
or untracked files.

### Step 5: Summarize

Provide a brief summary to the user covering:
- Which project is active
- Which branch is checked out
- Working tree status (clean / has changes)
- Key highlights from the documentation (any critical rules or recent decisions
  the user should be aware of)

Conclude with a ready signal so the user knows the session is initialized and
ready for work.

## Output Language Rule

This skill's own instructions are written in English for the AI's readability,
but that does NOT mean the AI should produce English output elsewhere. Whenever
executing this skill, all outputs directed at the user-facing artifacts — commit
messages, documentation updates (memory.md / context.md / global-rules.md /
guides), and any written text — MUST be written in Chinese (中文). The English in
this skill is for internal instruction only and must not leak into commit
messages or documents.

## Maintenance Rule

Whenever ANY logic of this skill is updated, you MUST also sync the change to
`Documents/skill-创建指南.md` (in the workspace root), so that the guide always
matches the latest skill and can be used to rebuild the skill on another machine.
```

---

## Skill 2: daily-end

当前 Codex 安装位置为 `~/.codex/skills/daily-end/SKILL.md`，仓库副本为 `codex-setup/daily-end/SKILL.md`；下方为完整内容。上文 CodeBuddy 路径为旧环境说明。

```markdown
---
name: daily-end
description: 使用 daily end 同步本次相关项目文档，提交并推送项目分支，再检查并合并到 main。
---

# Daily end

用户说 daily end 时使用。确定当前项目；不明确时询问。检查工作区、当前分支及相关差异，结合当前可访问会话和项目文档列出决策、待办及代码与文档不一致；无法回溯的内容标记待确认。报告需要同步的内容、文件范围和 Git 状态。

调用 daily end 即授权同步本次工作涉及的项目 memory、context、已有决策索引，以及已有设计纲要（design）和游戏设计文档（GDD）：核对相关代码及可访问的会话，记录重要决策、原因、否决方案、未决事项及必要的当前状态；没有相关变化的文件不修改。日期记录按新到旧。无法回溯或存在设计意图争议时标记待确认并询问，不虚构或擅自裁决。索引只记录重要决策、否决原因、可重议条件和历史出处；若条件未知则标记待确认。

同步前先查找本次项目已有的文档，逐项检查上述五类，不因 memory/context 已更新而跳过 design/GDD。memory 保留决策演变，context 维护系统现状，索引指向重要决策，design 维护设计方向与实现／验证状态，GDD 同步受影响的规则、设计分析和待验证事项。保留历史分析并标明已失效结论，区分用户决定、AI 建议、实现事实及测试结论；没有相关变化的文件不为凑齐清单而修改，缺失的文档不自动新建。最终列明各类文档已更新、核对无需更新或不存在，不能笼统声称“文档已同步”。

检查本次工作是否产生需要更新 AGENTS.md 的跨项目规则；没有则跳过，有则列出具体建议及冲突并取得用户确认后同步。

## Git 完整收尾

用户明确调用 daily end 即授权本次完整收尾：同步本次项目文档、暂存并提交范围内改动、推送项目分支、合并到 main 并推送 main。用户另行限定范围时遵从其限定。

1. 确认项目、当前分支、上游、工作区状态与改动归属；不是预期项目分支、存在其他项目或归属不明的改动时暂停并询问。保留用户已有和无关修改。
2. 审查暂存区和工作区的实际差异，只暂存明确属于本次收尾的文件，不使用无范围的 `git add -A`；已有暂存内容如不属于本次范围，暂停询问，不擅自取消暂存。提交使用中文信息。没有需要提交的变更则跳过新提交。
3. 核对远程和分支状态后推送项目分支。工作区干净不代表没有待推送或待合并的已有提交，应分别检查。
4. 合并前检查项目分支相对于 main 的全部待合并提交及文件，并核对远程 main 状态；若包含其他项目、归属不明内容、远程状态异常或无法安全切换，暂停并询问。确认范围符合预期后，更新 main、合并项目分支并推送 main，然后在安全时切回原项目分支。
5. 不得强推，不擅自重置或覆盖改动。合并冲突或其他异常时停止相关操作，报告当前状态和需要用户决策的内容。最终报告文档更新、提交和推送结果、main 合并状态、当前分支和未处理事项。
```
