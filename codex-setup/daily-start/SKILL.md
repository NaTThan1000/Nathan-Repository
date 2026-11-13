---
name: daily-start
description: 使用 daily start 初始化项目会话，读取项目记忆和上下文并检查 Git 状态。
---

# Daily start

用户说 daily start 时使用。沿用会话已加载的 AGENTS.md。根据请求和工作区确定项目；无法确定时询问。表内路径相对各自的项目根目录。

| 项目 | 分支 | 文档 |
|---|---|---|
| match3-rpg-project | main | match3-rpg-context.md（项目根目录） |
| tarot-battle-project | main | tarot-battle-context.md（项目根目录） |
| Project-Issac-turnbase | main | Documents/isaac-decision-index.md、isaac-memory.md、isaac-turnbase-context.md |
| Project-rockman | main | Documents/rockman-decision-index.md、rockman-memory.md、rockman-context.md |
| Project-turnbased-shoot | main | PROJECTS.md |
| tmp-dessert-escape | main | README.md、试玩说明.md；无独立 memory/context/决策索引 |

Nathan-Repository 已由用户确认统一在 main 日常开发，项目通过目录区分，不按旧 dev/* 映射自动切换或重建分支。main 下根据请求和上下文确定项目，不靠分支名判断。临时分支用于实验、重构、并行开发或旧版本维护。

- 项目有 PROJECTS.md 时，以它为唯一开工入口。按其链接读 GDD 总览和 Memory 最近一条与项目开发或验证有关的记录，略过纯迁移资料和旧索引表。已有任务时再查相关设计章节和历史，核对已有决定、否决理由和重议条件。仅在任务命中项目指引时查外部参考。
- 仍使用旧入口的项目，优先读表中的决策索引与 context，按当前任务检索 memory；索引缺失时查可用 memory。报告关键资料缺失。

只读检查当前分支、工作区和 upstream；若不匹配，报告并征求切换或设置的明确授权，不自动更改。发现文档排序或内容冲突时报告，不自动重排。简述项目、分支、未提交变更、关键决策、缺失文档和待处理事项。不能读取的信息明确说明。
