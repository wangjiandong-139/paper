# Implementation Plan: 后台管理网站（Admin Portal）

**Branch**: `001-admin-portal` | **Date**: 2026-03-16 | **Spec**: `d:/code/paper/specs/001-admin-portal/spec.md`
**Input**: Feature specification from `/specs/001-admin-portal/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

构建一个仅面向内部运营团队的 PC 后台管理站，用于处理订单与生成任务、维护学校格式模板、管理后台账号与用户风控、更新第三方接口配置、查看运营看板，并管理商品版本与支付记录。技术方案采用独立 `apps/admin` Vue 3 应用配合 NestJS ` /api/admin/* ` 接口，复用 monorepo 的 PostgreSQL、Redis、BullMQ 和 `packages/shared` 契约层。

## Technical Context

**Language/Version**: TypeScript 5.x（前端 Vue 3、后端 NestJS 10）  
**Primary Dependencies**: Vue 3, Vite, Pinia, TailwindCSS, NestJS, Prisma, PostgreSQL, Redis, BullMQ  
**Storage**: PostgreSQL（业务数据、配置、日志、模板元数据）+ Redis（admin session、运行时缓存、队列/配置失效广播）  
**Testing**: Vitest（admin 前端）、Jest + Supertest（NestJS API）、Playwright（admin E2E）  
**Target Platform**: PC 桌面浏览器（宽屏 >= 1280px）+ Linux/Docker 服务端  
**Project Type**: Monorepo web application（独立后台前端 + NestJS API + shared contracts）  
**Performance Goals**: 后台看板时间范围切换 p99 <= 5s；失败订单定位与重试操作 3 分钟内可完成；配置更新在下一次请求即生效  
**Constraints**: 固定角色矩阵；后台账号使用 session/cookie；密钥永远脱敏显示；任务超 2 小时仅告警不自动终止；历史订单保留商品快照；禁止 `any`；必须 TDD  
**Scale/Scope**: 初期 < 100,000 订单 / < 50,000 用户；新增 1 个 `apps/admin` 应用、若干 `apps/server` admin 模块（含商品与支付管理）与 shared DTO

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **测试优先**: PASS。计划先定义 OpenAPI contracts，再编写 auth、订单/任务状态流转、模板管理、配置热更新和统计查询测试。
- **类型安全**: PASS。后台共享契约集中放在 `packages/shared/src/{dto,enums,types}/admin`，服务端 DTO class 仅负责运行时校验。
- **AI 接口隔离**: PASS。后台只配置 AI/查重服务商参数，实际调用仍经 `apps/server/src/adapters/*` 与 service 层执行。
- **状态持久化**: PASS。后台管理数据、模板状态、操作日志和订单快照全部落 PostgreSQL；运行时 session 使用 Redis，不依赖前端本地状态作为权威来源。
- **简单性**: PASS（带约束性选择）。采用固定角色矩阵、PC-only、任务超时仅告警不自动杀死，并将后台拆为独立 `apps/admin` 以避免与用户端微信登录/移动端流程耦合。
- **Phase 1 复核**: PASS。数据模型、合同和 quickstart 均保持上述原则，无新增未论证复杂度。

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-portal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── admin-api.yaml
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── admin/
│   ├── src/
│   │   ├── router/
│   │   ├── views/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── services/
│   │   └── layouts/
│   └── tests/
│       ├── unit/
│       └── e2e/
├── web/
│   └── src/
└── server/
    ├── src/
    │   ├── modules/
    │   │   ├── admin-auth/
    │   │   ├── admin-orders/
    │   │   ├── admin-generation-jobs/
    │   │   ├── admin-templates/
    │   │   ├── admin-users/
    │   │   ├── admin-config/
    │   │   ├── admin-dashboard/
    │   │   ├── admin-products/
    │   │   ├── admin-payments/
    │   │   └── admin-logs/
    │   ├── adapters/
    │   ├── prisma/
    │   └── common/
    └── tests/
        ├── contract/
        └── integration/

packages/
└── shared/
    └── src/
        ├── dto/admin/
        ├── enums/admin/
        └── types/admin/
```

**Structure Decision**: 在现有 `apps/web + apps/server + packages/shared` monorepo 上新增独立 `apps/admin`。这样可以隔离后台账号认证、PC-only 布局、内部菜单和发布节奏，同时继续复用 `apps/server` 与 `packages/shared`；后台业务能力按订单/模板/账号/配置/看板/商品/支付等 admin 模块拆分，避免将内部运营能力耦合进前台应用。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Additional frontend app (`apps/admin`) | 后台与前台用户端具有不同认证方式、角色权限、桌面布局和部署入口，需要清晰隔离 | 将后台塞进 `apps/web` 会混合微信用户登录与后台账号登录、增加路由守卫复杂度，并破坏 PC-only 约束 |
