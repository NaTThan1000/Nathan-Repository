# Skill 创建指南（跨电脑复用）

当前使用 Codex，安装目录为 ~/.codex/skills/。仓库副本在 codex-setup/；下方完整内容必须与仓库及本机安装版本保持一致，技能修改时同步本指南。旧 CodeBuddy 路径及按项目切换长期分支的流程已退役。

另一台电脑可将仓库 daily-start 和 daily-end 目录复制到 ~/.codex/skills/，或分别保存下方内容为对应目录的 SKILL.md。保留无关技能和用户修改，让新会话重新加载。全局协作模板为 codex-setup/AGENTS.md，应用前核对本机既有规则。

## daily-start 完整内容

```markdown
---
name: daily-start
description: 使用 daily start 初始化项目会话，读取项目记忆和上下文并检查 Git 状态。
---

# Daily start

用户说 daily start 时使用。根据用户当前请求确定项目；无法确定时询问。优先读取项目决策索引及 context，再按当前任务检索 memory 中相关历史，涉及已否决方案时检查原因及适用条件。索引并非完整历史，缺失索引时读取可用 memory；缺失文档则报告，不虚构内容。对 Nathan-Repository 的映射：

| 项目 | 分支 | 文档 |
|---|---|---|
| match3-rpg-project | main | match3-rpg-context.md（项目根目录） |
| tarot-battle-project | main | tarot-battle-context.md（项目根目录） |
| Project-Issac-turnbase | main | Documents/isaac-decision-index.md、isaac-memory.md、isaac-turnbase-context.md |
| Project-rockman | main | Documents/rockman-decision-index.md、rockman-memory.md、rockman-context.md |
| Project-turnbased-shoot | main | Documents/turnbased-shoot-decision-index.md、turnbased-shoot-memory.md、turnbased-shoot-context.md |
| tmp-dessert-escape | main | README.md、试玩说明.md；无独立 memory/context/决策索引 |

Nathan-Repository 已由用户确认统一在 main 日常开发，项目通过目录区分，不按旧 dev/* 映射自动切换或重建分支。main 下根据请求和上下文确定项目，不靠分支名判断。临时分支用于实验、重构、并行开发或旧版本维护。

只读检查当前分支、工作区和 upstream；若不匹配，报告并征求切换或设置的明确授权，不自动更改。发现文档排序或内容冲突时报告，不自动重排。简述项目、分支、未提交变更、关键决策、缺失文档和待处理事项。不能读取的信息明确说明。
```

## daily-end 完整内容

```markdown
---
name: daily-end
description: 使用 daily end 同步本次相关项目文档，提交并推送；默认在 main 收尾，临时分支按授权合并。
---

# Daily end

用户说 daily end 时使用。确定当前项目；不明确时询问。检查工作区、当前分支及相关差异，结合当前可访问会话和项目文档列出决策、待办及代码与文档不一致；无法回溯的内容标记待确认。报告需要同步的内容、文件范围和 Git 状态。

调用 daily end 即授权同步本次工作涉及的项目 memory、context、已有决策索引，以及已有设计纲要（design）和游戏设计文档（GDD）：核对相关代码及可访问的会话，记录重要决策、原因、否决方案、未决事项及必要的当前状态；没有相关变化的文件不修改。日期记录按新到旧。无法回溯或存在设计意图争议时标记待确认并询问，不虚构或擅自裁决。索引只记录重要决策、否决原因、可重议条件和历史出处；若条件未知则标记待确认。

同步前先查找本次项目已有的文档，逐项检查上述五类，不因 memory/context 已更新而跳过 design/GDD。memory 保留决策演变，context 维护系统现状，索引指向重要决策，design 维护设计方向与实现／验证状态，GDD 同步受影响的规则、设计分析和待验证事项。保留历史分析并标明已失效结论，区分用户决定、AI 建议、实现事实及测试结论；没有相关变化的文件不为凑齐清单而修改，缺失的文档不自动新建。最终列明各类文档已更新、核对无需更新或不存在，不能笼统声称“文档已同步”。

检查本次工作是否产生需要更新 AGENTS.md 的跨项目规则；没有则跳过，有则列出具体建议及冲突并取得用户确认后同步。

## Git 完整收尾

用户明确调用 daily end 即授权本次完整收尾：同步本次项目文档、暂存并提交范围内改动、在 main 提交并推送；确有临时分支时核对范围后合并到 main 并推送。用户另行限定范围时遵从其限定。

1. 确认项目、当前分支、上游、工作区状态与改动归属；Nathan-Repository 默认 main，按目录确定项目，不要求恢复旧项目分支；存在其他项目或归属不明的改动时暂停并询问。保留用户已有和无关修改。
2. 审查暂存区和工作区的实际差异，只暂存明确属于本次收尾的文件，不使用无范围的 `git add -A`；已有暂存内容如不属于本次范围，暂停询问，不擅自取消暂存。提交使用中文信息。没有需要提交的变更则跳过新提交。
3. 核对远程和分支状态。当前为 main 时直接提交并正常推送 main，不新建项目分支或重复合并；无文件变更时仍检查待推送提交。
4. 仅当实际使用临时分支时，检查相对 main 的全部待合并提交及文件并核对远端状态；范围符合授权且安全时更新 main、合并并推送。无关内容、冲突或远端异常时停止相关操作并报告。默认最终留在 main，不自动重建或切回退役项目分支。
5. 不得强推，不擅自重置或覆盖改动。合并冲突或其他异常时停止相关操作，报告当前状态和需要用户决策的内容。最终报告文档更新、提交和推送结果、main 合并状态、当前分支和未处理事项。
```
