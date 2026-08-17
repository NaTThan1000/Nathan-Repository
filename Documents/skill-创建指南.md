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
| tarot-battle-project | `tarot-battle-project/` | `dev/tarot` |
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

File path mapping:
- match3-rpg: `match3-rpg-project/Documents/match3-rpg-memory.md` and `match3-rpg-project/Documents/match3-rpg-context.md`
- tarot-battle: `tarot-battle-project/Documents/tarot-battle-memory.md` and `tarot-battle-project/Documents/tarot-battle-context.md`
- isaac-turnbase: `Project-Issac-turnbase/Documents/isaac-turnbase-memory.md` and `Project-Issac-turnbase/Documents/isaac-turnbase-context.md`
- rockman: `Project-rockman/Documents/rockman-memory.md` and `Project-rockman/Documents/rockman-context.md`

### Step 3: Switch to the Correct Branch

Switch to the feature branch corresponding to the identified project:

```
git checkout dev/{project}
```

Then verify the branch:

```
git branch --show-current
```

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

```markdown
---
name: daily-end
description: >
  This skill should be used at the end of each daily coding session to wrap up
  work. It audits code-documentation inconsistencies discovered during the
  session, syncs all three documentation layers (context.md, memory.md,
  global-rules.md), commits and pushes changes, then merges the feature branch
  into main. Trigger phrases include "daily end", "同步文档并合并 main",
  "今天的收尾流程", "收尾", or any request to finalize the day's work and
  merge to main.
---

# Daily End - Session Wrap-Up and Merge

## Purpose

Complete the end-of-day workflow: audit code-documentation inconsistencies,
sync all three documentation layers, commit and push, and merge the feature
branch into `main` — all in a single automated flow.

## When to Use

Trigger when the user says any of:
- "daily end"
- "同步文档并合并 main"
- "今天的收尾流程"
- "收尾"
- "提交推送并合并"
- Or any request that implies finalizing the day's work and merging to main

## Important: Merge Confirmation Policy

**Within this `daily-end` workflow**, merging to `main` requires NO additional
confirmation from the user — it is an expected and automatic part of the flow.

**In all other contexts** (e.g., standalone "merge to main" requests), the
standard confirmation requirement still applies.

## Workflow

### Phase 1: Audit Code-Documentation Inconsistencies

Review the entire current session's conversation history. Identify every
instance where a code-documentation inconsistency was discovered but not yet
resolved. Produce a checklist:

1. List each inconsistency found during the session
2. Mark each as "已修正" (fixed) or "待处理" (pending)
3. For pending items, ask the user how to resolve before proceeding

If there are unresolved inconsistencies, pause and wait for user input before
continuing to Phase 2.

### Phase 2: Sync Project Documentation

Perform a full-coverage sync of all three documentation layers:

#### 2a. Sync Project Context (`{project}-context.md`)

Read the context file in full, then systematically cross-check against actual
code. Verify every section:

- Key bindings / control table
- Core attributes / player attributes
- Render constants (verify values are current)
- Architecture overview (add any new system modules)
- Core system descriptions (the project's own systems, e.g. TILE/floor for
  isaac, level/weapon for rockman, etc. — adapt to the active project)
- Section numbering (no duplicates, no gaps)
- Function index (add all new functions)
- Data flow (supplement the project's startup/exploration/level flows)
- Game flow (supplement the project's actual modes, e.g. exploration + battle
  for isaac, run-and-gun levels for rockman)
- UI panels (add new UI panels specific to the project)
- File inventory (add new config files)
- Next steps (remove completed items)
- Expired content cleanup (deprecated features)

Update all outdated sections. Do NOT update only the sections related to today's
changes — perform a comprehensive cross-check.

#### 2b. Sync Project Memory (`{project}-memory.md`)

Update with:
- Decisions made during this session
- Problems solved and their solutions
- Creative ideas and brainstorms
- Any changed design directions

#### 2c. Uplift Check to Global Rules (`Documents/global-rules.md`)

For every new rule or convention added to the project-level documentation
(memory.md / context.md) during this sync, evaluate:

- Is this rule cross-project universal?
- If yes, sync it to `Documents/global-rules.md` in the appropriate section.
- If it only applies to the current project, keep it in project-level docs only.

### Phase 3: Review Git Status

Run `git status` and `git diff --stat` to review all pending changes. Present a
summary to the user:
- Modified files
- New untracked files
- Deleted files

### Phase 4: Commit and Push

Stage all changes (code + documentation) and create a single commit:

```
git add -A
git commit -m "收尾：同步文档并提交 [YYYY-MM-DD]"
```

The commit date should be the current date. Commit messages MUST be written in
Chinese (中文).

Push the current feature branch:

```
git push origin {current-branch}
```

### Phase 5: Merge to Main

Execute the merge flow without additional confirmation:

1. Checkout main:
   ```
   git checkout main
   ```

2. Pull latest main:
   ```
   git pull origin main
   ```

3. Merge the feature branch:
   ```
   git merge {feature-branch}
   ```

4. Push main:
   ```
   git push origin main
   ```

5. Switch back to the feature branch:
   ```
   git checkout {feature-branch}
   ```

### Phase 6: Final Report

Provide a summary report to the user:

- Total inconsistencies audited and resolved
- Documentation sections updated (with counts)
- Files committed and pushed
- Merge status (successful / conflicts)
- Current branch after wrap-up

### Safety Rules

- Verify the current branch is a feature branch (`dev/*`) before proceeding
- If `git status` shows no changes, skip Phase 4 and Phase 5
- If merge conflicts occur in Phase 5, pause and ask the user for resolution guidance
- Never force-push or skip hooks
- Never amend commits

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
