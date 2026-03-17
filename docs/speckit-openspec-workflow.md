# Speckit 与 OpenSpec 工作流协同说明

本文档说明在本项目中如何配合使用 Speckit 和 OpenSpec，以及如何保持文档一致性。

## 开发路线说明

**本项目后续不再使用 Kiro 进行新需求或新功能开发。** 规范与实现均以 **Speckit + OpenSpec** 为准：主规范源为 `openspec/specs/`，新功能走 Speckit（`specs/<NNN-feature>/`）或 OpenSpec 变更（`openspec/changes/<name>/`）。`.kiro/specs/` 下已有内容已完成迁移至 `openspec/specs/ai-paper-writing/spec.md`，仅作历史参考；澄清、设计与任务分解仍可查阅 `.kiro/specs/ai-paper-writing/`。

## 规范源与目录约定

- **主规范源**：`openspec/specs/<capability>/spec.md`  
所有已归档或已桥接的规范最终汇聚于此，作为单一事实来源。
- **Speckit 工作目录**：`specs/<NNN-feature>/`  
用于大型功能：完整 spec、plan、tasks、research、contracts 等。
- **OpenSpec 变更目录**：`openspec/changes/<name>/`  
用于增量变更：proposal、design、tasks、delta specs（ADDED/MODIFIED/REMOVED）。
- **capability 命名**：kebab-case，与功能域对应，例如 `admin-portal`、`web-username-password-auth`。

## 工作流选择


| 场景                                         | 推荐工作流          | 说明                                                                                                      |
| ------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------- |
| 新功能、多用户故事、需要 plan/research/contracts 的复杂功能 | **Speckit**    | 使用 `/speckit.specify` → clarify → plan → tasks → implement                                              |
| 小范围增量变更、单 capability 修改、快速迭代               | **OpenSpec**   | 使用 `/opsx:new` → continue → apply → 可选 sync/archive                                                     |
| 已有 Speckit 功能实现完毕，需要纳入主规范                  | **Speckit 桥接** | 使用 speckit-to-openspec-bridge：将 `specs/<NNN-feature>/spec.md` 同步到 `openspec/specs/<capability>/spec.md` |


约定：**同一 capability 同一时间仅用一种工作流**，避免 Speckit 与 OpenSpec 同时改同一能力导致冲突。

## 文档一致性检查清单

每次规范或实现变更后，建议确认：

1. **治理一致**：Constitution（`.specify/memory/constitution.md`）、`.kiro/steering/`、`openspec/config.yaml` 中的原则与约束一致。
2. **规范源一致**：主规范在 `openspec/specs/`；Speckit 功能完成后通过桥接同步到该目录；OpenSpec 变更归档时通过 `/opsx:sync` 或 openspec-sync-specs 合并到主规范。
3. **Agent 上下文一致**：`.cursor/rules/specify-rules.mdc` 中的 Project Structure、Commands、Recent Changes 反映当前 `specs/` 与 `openspec/specs/` 的使用方式。
4. **命名一致**：capability 使用 kebab-case，与模块/路由命名（如 `structure.md`）对齐。

## 常用命令速查

- **Speckit**：`/speckit.specify`、`/speckit.clarify`、`/speckit.plan`、`/speckit.tasks`、implement。
- **OpenSpec**：`/opsx:new` 新建变更，`/opsx:continue` 推进 artifact，`/opsx:apply` 实施，`/opsx:sync` 将 delta spec 同步到 `openspec/specs/`，`/opsx:archive` 归档。
- **桥接**：完成 Speckit 功能后，可调用 speckit-to-openspec-bridge 将 `specs/<NNN-feature>/spec.md` 转为并写入 `openspec/specs/<capability>/spec.md`。

## 参考

- 方案与流程图见项目内 Speckit/OpenSpec 协同方案（如 Cursor 计划或 `.cursor/plans/` 下对应文档）。
- Speckit 模板与 Constitution：`.specify/`、`.specify/memory/constitution.md`。
- OpenSpec 配置与规则：`openspec/config.yaml`、`.cursor/skills/openspec-`*、`.cursor/skills/speckit-to-openspec-bridge/`。

