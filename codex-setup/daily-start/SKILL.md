---
name: daily-start
description: 使用 daily start 初始化项目会话，读取项目记忆和上下文并检查 Git 状态。
---

# Daily start

用户说 daily start 时使用。根据用户当前请求确定项目；无法确定时询问。优先读取项目决策索引及 context，再按当前任务检索 memory 中相关历史，涉及已否决方案时检查原因及适用条件。索引并非完整历史，缺失索引时读取可用 memory；缺失文档则报告，不虚构内容。对 Nathan-Repository 的映射：

| 项目 | 分支 | 文档 |
|---|---|---|
| match3-rpg-project | dev/match3 | match3-rpg-context.md（项目根目录） |
| tarot-battle-project | dev/tarot-update | tarot-battle-context.md（项目根目录） |
| Project-Issac-turnbase | dev/issac | Documents/isaac-decision-index.md、isaac-memory.md、isaac-turnbase-context.md |
| Project-rockman | dev/rockman | Documents/rockman-decision-index.md、rockman-memory.md、rockman-context.md |

只读检查当前分支、工作区和 upstream；若不匹配，报告并征求切换或设置的明确授权，不自动更改。发现文档排序或内容冲突时报告，不自动重排。简述项目、分支、未提交变更、关键决策、缺失文档和待处理事项。不能读取的信息明确说明。
