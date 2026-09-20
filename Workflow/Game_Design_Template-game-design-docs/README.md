# 游戏设计文档模板（空白骨架）

> 完整使用说明见同目录 `GAME-DESIGN-WORKFLOW.md`。
> 填好的参考实例见 `Workflow/Game_Design_Example_Weapon_Farm_Dual_Loop-game-design-docs/`（只读，不要在里面改内容）。

## 怎么用

1. 复制整个文件夹，重命名为 `{项目名}-game-design-docs/`。
2. 按 `00_concept` → `01_top_design` → `02_architecture` → `03_systems` 的顺序填写。
   **上一层 `design.md` 定稿前，不要动下一层。**
3. 每层两个文件：`design.md` 写定稿结论，`analysis.md` 写推理过程。
4. `03_systems/_TEMPLATE/` 是系统骨架，按 L3 的 P0 系统清单复制成 `S01_xxx/`、`S02_xxx/`……
5. 正文中所有「填写要点」引用块，**填完后请删除**。

## 填写标记约定

| 标记 | 含义 |
|---|---|
| `> 填写要点：` | 提示这一节该写什么，填完删除 |
| `> 填写要点〔图〕：` | 该处需要插一张 mermaid 流程图，参考示例的对应图 |
| `【 】` | 占位符，替换成你的项目内容 |
| `状态：agent_proposal` | AI 提案待确认（详见工作流文档第四节） |

## 四道闸门（每层结尾必须过）

1. 边界声明：本层不负责什么、留给谁。
2. 不做清单 / 不是什么：每条都要写原因。
3. P0 / P1 / P2 分级：后置项必须写后置原因。
4. 验证标准：用可回答的问句写。
