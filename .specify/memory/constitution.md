<!--
SYNC IMPACT REPORT
==================
Version Change: [TEMPLATE] → 1.0.0 (initial population from .kiro/steering governance docs)

Modified Principles:
  [PRINCIPLE_1_NAME] → I. 测试优先（Test-First）
  [PRINCIPLE_2_NAME] → II. 类型安全（Type Safety）
  [PRINCIPLE_3_NAME] → III. AI 接口隔离（AI Interface Isolation）
  [PRINCIPLE_4_NAME] → IV. 状态持久化（State Persistence）
  [PRINCIPLE_5_NAME] → V. 简单性（Simplicity）
  [SECTION_2_NAME]   → 技术栈约束（Technology Stack Constraints）
  [SECTION_3_NAME]   → 完工标准（Definition of Done）

Added Sections:
  - 技术栈约束（Technology Stack Constraints）
  - 完工标准（Definition of Done）

Removed Sections:
  - None (all template sections populated)

Templates Requiring Updates:
  ✅ .specify/templates/plan-template.md — Constitution Check section already present; no update needed
  ✅ .specify/templates/spec-template.md — Requirements format aligned with DoD; no update needed
  ✅ .specify/templates/tasks-template.md — TDD task ordering (tests-first) already reflected; no update needed

Follow-up TODOs:
  - None: all placeholders resolved
-->

# 傻瓜式 AI 写论文 Constitution

## Core Principles

### I. 测试优先（Test-First）（NON-NEGOTIABLE）

所有功能实现 MUST 遵循 TDD 循环：

1. 先写测试，确认测试失败（Red）
2. 实现代码使测试通过（Green）
3. 重构，保持测试绿色（Refactor）

覆盖率要求：核心业务逻辑（向导流程、生成任务、支付）单元测试行覆盖率 MUST ≥ 80%，通过率 MUST = 100%。

集成测试与接口测试 MUST 连接真实 PostgreSQL 数据库，禁止使用内存数据库或 Mock 数据层；
禁止在接口测试和功能测试层 Mock 业务逻辑层。
单元测试中允许 Mock 外部依赖（微信 API、AI 接口、第三方文献 API、微信支付 API）。

**测试工具**：前端 Vitest、后端 Jest + Supertest（API）、E2E Playwright。

**依据**：论文生成是核心商业承诺，任何回归都会直接损害用户体验和商业指标（生成成功率 ≥ 99%）。

### II. 类型安全（Type Safety）

代码库中 MUST NOT 出现 TypeScript `any` 类型。所有模块边界（Controller、Service、DTO、前端 Service 层）MUST
有明确的类型定义。前后端共享类型 MUST 统一存放于 `packages/shared`（monorepo shared 包），禁止在
`apps/web` 或 `apps/server` 中重复定义相同实体类型。

**依据**：前后端共用一套接口契约，类型漂移会在运行时引发难以追踪的数据错误。

### III. AI 接口隔离（AI Interface Isolation）

所有 AI 调用 MUST 封装在 `apps/server/src/adapters/ai/` 适配器及对应 Service 层，
禁止在 Controller 或任何前端代码中直接调用 AI 接口。

AI 接口 MUST 支持流式输出（SSE 或 WebSocket）以提供实时进度反馈。

所有 AI 提示词（prompt） MUST 统一管理在 `apps/server/src/prompts/` 目录，
禁止将 prompt 硬编码在业务逻辑中。AI 提示词变更 MUST 经过回归测试。

**依据**：AI 提供商切换成本极高，隔离后可在不改动业务逻辑的情况下替换 OpenAI → DeepSeek 等国内模型；
集中管理 prompt 便于版本控制和质量回归。

### IV. 状态持久化（State Persistence）

向导步骤状态（选题、文献、提纲、每章内容）MUST 持久化到服务端 PostgreSQL 数据库，
存储于 `drafts` 表的 JSON 字段。前端 Pinia store MUST 仅作为视图层缓存，
MUST NOT 作为唯一数据源。

未支付草稿 MUST 永久保留（用户主动删除前），支持多草稿并行。
网络中断后恢复时 MUST 不丢失已保存的表单数据。

**依据**：向导流程跨越多个页面和会话，移动端网络不稳定，服务端持久化是防止数据丢失的唯一可靠保障。

### V. 简单性（Simplicity）

MUST NOT 为未来需求预留抽象；复杂度 MUST 在被证明必要时才引入（YAGNI 原则）。
MUST 优先使用框架原生能力（NestJS DI、Vue Composition API），避免不必要的封装层。
MUST NOT 引入与 Vant 4 功能重叠的 UI 库。
引入任何新依赖前 MUST 评估：包大小、维护状态、许可证兼容性。

**依据**：移动端首屏加载 ≤ 3 秒的性能约束要求控制包体积；过度设计会增加维护成本并降低交付速度。

## 技术栈约束（Technology Stack Constraints）

本节约束不可随意绕过；若有必要变更需走 Governance 修订流程。

| 层 | 技术选型 |
|----|---------|
| 前端语言 | TypeScript 5.x |
| 前端框架 | Vue 3（Composition API） |
| 构建工具 | Vite |
| 状态管理 | Pinia + pinia-plugin-persistedstate |
| UI 组件库 | Vant 4（移动端）+ 自定义 PC 响应式布局 |
| 样式 | TailwindCSS |
| 富文本编辑器 | Tiptap |
| 后端语言 | TypeScript 5.x |
| 后端框架 | NestJS |
| 数据库 | PostgreSQL（主库） |
| 缓存 / 队列 | Redis + BullMQ |
| ORM | Prisma |
| 包管理器 | pnpm（pnpm workspace monorepo） |
| 容器化 | Docker + Docker Compose |

第三方 API（文献、查重、AI、支付）MUST 通过适配器模式接入（`apps/server/src/adapters/`），
便于在不修改业务逻辑的情况下切换服务商。

## 完工标准（Definition of Done）

每个任务完成前 MUST 满足以下全部条件：

### 实现质量

- 所有功能 MUST 真实实现，MUST NOT 使用 Mock 替代业务逻辑
- MUST NOT 遗留 `// TODO` 或 `// FIXME` 注释
- MUST NOT 出现 TypeScript `any` 类型
- MUST NOT 有 ESLint 错误或警告

### 测试要求

- 单元测试行覆盖率 MUST ≥ 80%，通过率 MUST = 100%
- 接口测试和功能测试通过率 MUST = 100%
- 接口测试 MUST NOT 使用 Mock（MUST 调用真实实现）
- 接口测试、功能测试 MUST 连接真实 PostgreSQL（MUST NOT 使用内存数据库或 Mock 数据层）
- 接口测试、功能测试 MUST NOT Mock 业务逻辑层

## Governance

本 Constitution 是本项目所有开发决策的最高准则，优先级高于任何其他约定或习惯。

**修订程序**：
1. 在 `.specify/memory/constitution.md` 中提出变更草案（PR / 文档评审）
2. 说明变更影响范围（受影响的模块、测试、模板）
3. 对受影响的代码或模板进行同步更新
4. 按语义化版本规则（见下）递增版本号后方可合并

**版本规则（语义化）**：
- MAJOR：不兼容的治理/原则删除或重新定义
- MINOR：新增原则/章节或实质性扩展
- PATCH：澄清、措辞调整、排版修正等非语义变更

**合规审查**：所有 PR / 代码审查 MUST 验证是否符合 Constitution；
复杂度引入 MUST 在 plan.md 的 Complexity Tracking 表格中说明理由。

运行时开发指南参见 `.kiro/steering/` 目录下各治理文档。

**Version**: 1.0.0 | **Ratified**: 2026-03-16 | **Last Amended**: 2026-03-16
