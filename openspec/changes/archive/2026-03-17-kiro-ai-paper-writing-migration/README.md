# 归档：Kiro → OpenSpec 规范迁移

**归档日期**：2026-03-17  
**类型**：迁移（非功能变更）

## 说明

将 `.kiro/specs/ai-paper-writing/` 下已完成的需求与设计迁移至 OpenSpec 主规范，保证规范与代码一致，并统一后续开发路线。

## 迁移内容

- **源**：`.kiro/specs/ai-paper-writing/requirements.md`（及同目录下 design.md、tasks.md、clarifications.md、checklists/）
- **目标**：`openspec/specs/ai-paper-writing/spec.md`（主规范）
- **约定**：需求表述与原 Kiro 文档保持一致，仅做格式整理以符合 OpenSpec 主规范结构；技术设计与任务分解仍可参考 `.kiro/specs/ai-paper-writing/` 下原有文件。

## 后续开发路线

- **不再使用 Kiro** 进行新需求或新功能的规格与开发。
- **统一使用 Speckit + OpenSpec**：
  - 新功能、多用户故事、复杂设计：Speckit（`specs/<NNN-feature>/`）
  - 小范围增量变更：OpenSpec（`openspec/changes/<name>/`）
  - 主规范源：`openspec/specs/`，与代码一致性以该目录及上述工作流为准。

详见 `docs/speckit-openspec-workflow.md`。
