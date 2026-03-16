# Tasks: 后台管理网站（Admin Portal）

**Input**: Design documents from `/specs/001-admin-portal/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/admin-api.yaml`

**Tests**: 本 feature 必须遵循 Constitution 的 TDD 要求。每个用户故事均先写 contract / integration / frontend tests，再进入实现。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件、无直接依赖）
- **[Story]**: 对应用户故事（如 `US1`、`US2`）
- 所有任务均包含明确文件路径

## Path Conventions

- 前端后台应用：`apps/admin/src/`
- 后端服务：`apps/server/src/`
- 后端测试：`apps/server/tests/`
- 前端后台测试：`apps/admin/tests/`
- 共享契约：`packages/shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 创建后台应用骨架并接通工作区基础能力

- [ ] T001 Create `apps/admin/package.json`, `apps/admin/tsconfig.json`, `apps/admin/vite.config.ts`, and `apps/admin/index.html`
- [ ] T002 Create admin app entry files in `apps/admin/src/main.ts`, `apps/admin/src/App.vue`, and `apps/admin/src/router/index.ts`
- [ ] T003 [P] Configure admin styling and build pipeline in `apps/admin/tailwind.config.ts`, `apps/admin/postcss.config.cjs`, and `apps/admin/src/assets/main.css`
- [ ] T004 [P] Add admin test scaffolding in `apps/admin/vitest.config.ts`, `apps/admin/tests/setup.ts`, and `apps/admin/tests/e2e/.gitkeep`
- [ ] T005 [P] Register `apps/admin` workspace and scripts in `package.json` and `pnpm-workspace.yaml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立所有用户故事共用的数据、认证、共享类型和后台 API 基础设施

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create shared admin enums in `packages/shared/src/enums/admin/roles.ts`, `packages/shared/src/enums/admin/order-status.ts`, and `packages/shared/src/enums/admin/index.ts`
- [ ] T007 [P] Create shared admin DTO/types in `packages/shared/src/dto/admin/`, `packages/shared/src/types/admin/`, and export them from `packages/shared/src/dto/index.ts`
- [ ] T008 Extend Prisma schema for `AdminUser`, `UserRiskControl`, `SchoolTemplate`, `TemplateRequest`, `GenerationJob`, `GenerationJobEventLog`, `ApiConfig`, and `OperationLog` in `apps/server/prisma/schema.prisma`
- [ ] T009 Create and commit Prisma migration files under `apps/server/prisma/migrations/` for the admin domain and order/draft milestone extensions
- [ ] T010 [P] Implement admin session infrastructure in `apps/server/src/modules/admin-auth/`, `apps/server/src/common/guards/admin-session.guard.ts`, and `apps/server/src/common/decorators/admin-role.decorator.ts`
- [ ] T011 [P] Implement fixed role matrix and last-super-admin protection in `apps/server/src/modules/admin-auth/admin-authorization.policy.ts` and `apps/server/src/modules/admin-auth/admin-user.service.ts`
- [ ] T012 [P] Add shared admin HTTP client, auth store, and route guards in `apps/admin/src/services/http/admin-api.ts`, `apps/admin/src/stores/admin-auth.store.ts`, and `apps/admin/src/router/guards.ts`
- [ ] T013 Create admin shell layout and navigation in `apps/admin/src/layouts/AdminShell.vue`, `apps/admin/src/components/layout/AdminSidebar.vue`, and `apps/admin/src/components/layout/AdminTopbar.vue`
- [ ] T014 Implement operation logging, config versioning, and Redis-backed runtime cache invalidation in `apps/server/src/modules/admin-logs/` and `apps/server/src/modules/admin-config/`
- [ ] T015 Create contract test harness for admin API in `apps/server/tests/contract/admin-api.contract.spec.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 处理失败订单与生成任务 (Priority: P1) 🎯 MVP

**Goal**: 运营人员可查询失败订单、查看任务日志、执行取消/重试，并识别长时间运行的异常任务。

**Independent Test**: 登录后台后，运营人员可以筛选失败订单、查看任务详情和日志、对失败订单或失败任务执行重试，并看到超 2 小时任务的异常警示标记。

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T016 [P] [US1] Add contract coverage for `/api/admin/orders`, `/api/admin/orders/{orderId}`, `/api/admin/orders/{orderId}/retry-generation`, `/api/admin/generation-jobs`, `/api/admin/generation-jobs/{jobId}`, `/api/admin/generation-jobs/{jobId}/cancel`, and `/api/admin/generation-jobs/{jobId}/retry` in `apps/server/tests/contract/admin-orders.contract.spec.ts`
- [ ] T017 [P] [US1] Add integration tests for order retry, generation-job retry, cancel-as-failed, duplicate-running-job rejection, and overdue warning behavior in `apps/server/tests/integration/admin-orders.integration.spec.ts`
- [ ] T018 [P] [US1] Add admin frontend tests for order list filters, detail drawer/page, order retry action, generation-job retry action, and overdue badge in `apps/admin/tests/unit/orders/order-list.spec.ts` and `apps/admin/tests/unit/orders/order-detail.spec.ts`
- [ ] T018a [P] [US1] Add contract coverage for `/api/admin/orders/export` and `/api/admin/orders/{orderId}/note` in `apps/server/tests/contract/admin-orders.contract.spec.ts`
- [ ] T018b [P] [US1] Add integration tests for CSV export row-limit enforcement and order note persistence in `apps/server/tests/integration/admin-orders.integration.spec.ts`
- [ ] T018c [P] [US1] Add admin frontend tests for export action and note editor in `apps/admin/tests/unit/orders/order-export.spec.ts` and `apps/admin/tests/unit/orders/order-note.spec.ts`

### Implementation for User Story 1

- [ ] T026a [US1] Implement CSV export service and endpoint in `apps/server/src/modules/admin-orders/admin-order-export.service.ts` and `apps/server/src/modules/admin-orders/admin-orders.controller.ts`
- [ ] T026b [US1] Implement order note persistence endpoint in `apps/server/src/modules/admin-orders/admin-order-note.service.ts` and `apps/server/src/modules/admin-orders/admin-orders.controller.ts`
- [ ] T026c [US1] Implement order export button and note editor in `apps/admin/src/components/orders/OrderExportButton.vue`, `apps/admin/src/components/orders/OrderNoteEditor.vue`, and `apps/admin/src/views/orders/OrderDetailView.vue`
- [ ] T019 [P] [US1] Implement order query/read service in `apps/server/src/modules/admin-orders/admin-orders.service.ts` and DTO mapping in `apps/server/src/modules/admin-orders/dto/`
- [ ] T020 [P] [US1] Implement generation job query and event log service in `apps/server/src/modules/admin-generation-jobs/admin-generation-jobs.service.ts`
- [ ] T021 [US1] Implement order and generation job controllers in `apps/server/src/modules/admin-orders/admin-orders.controller.ts` and `apps/server/src/modules/admin-generation-jobs/admin-generation-jobs.controller.ts`
- [ ] T022 [US1] Implement order retry, generation-job retry, and cancel command flow with BullMQ integration in `apps/server/src/modules/admin-generation-jobs/admin-generation-job-command.service.ts`
- [ ] T023 [US1] Add operation log writes for retry/cancel/note actions in `apps/server/src/modules/admin-logs/admin-operation-log.service.ts`
- [ ] T024 [P] [US1] Implement admin order list page and filters in `apps/admin/src/views/orders/OrderListView.vue` and `apps/admin/src/stores/orders.store.ts`
- [ ] T025 [P] [US1] Implement generation job detail page/panel, log timeline, and per-job retry entry in `apps/admin/src/views/orders/OrderDetailView.vue` and `apps/admin/src/components/orders/GenerationJobLogPanel.vue`
- [ ] T026 [US1] Wire order retry, generation-job retry, cancel actions, and overdue warning badge in `apps/admin/src/services/orders/admin-orders.service.ts` and `apps/admin/src/components/orders/GenerationJobStatusBadge.vue`

**Checkpoint**: User Story 1 should be fully functional and independently testable

---

## Phase 4: User Story 2 - 维护学校格式模板 (Priority: P1)

**Goal**: 运营人员可管理学校模板、启停模板，并处理用户提交的学校模板需求。

**Independent Test**: 运营人员能够创建并启用学校模板、阻止重复 `(school + degree)`、查看待处理模板请求并关联到新模板。

### Tests for User Story 2 ⚠️

- [ ] T027 [P] [US2] Add contract coverage for `/api/admin/school-templates`, `/api/admin/school-templates/{templateId}`, `/enable`, `/disable`, `/template-requests`, and `/template-requests/{requestId}` in `apps/server/tests/contract/admin-templates.contract.spec.ts`
- [ ] T028 [P] [US2] Add integration tests for template uniqueness, enable/disable semantics, and request fulfillment flow in `apps/server/tests/integration/admin-templates.integration.spec.ts`
- [ ] T029 [P] [US2] Add admin frontend tests for template list grouping, template form, and template request handling in `apps/admin/tests/unit/templates/template-list.spec.ts` and `apps/admin/tests/unit/templates/template-form.spec.ts`

### Implementation for User Story 2

- [ ] T030 [P] [US2] Implement school template repository/service logic in `apps/server/src/modules/admin-templates/admin-school-template.service.ts`
- [ ] T031 [P] [US2] Implement template request service and linking workflow in `apps/server/src/modules/admin-templates/admin-template-request.service.ts`
- [ ] T032 [US2] Implement template and template-request controllers in `apps/server/src/modules/admin-templates/admin-templates.controller.ts`
- [ ] T033 [US2] Add upload validation and duplicate-key handling for `.dotx` metadata in `apps/server/src/modules/admin-templates/template-file.service.ts`
- [ ] T034 [US2] Write operation logs for template create/update/enable/disable/request-fulfill in `apps/server/src/modules/admin-logs/admin-template-log.service.ts`
- [ ] T035 [P] [US2] Implement template list and grouped search UI in `apps/admin/src/views/templates/TemplateListView.vue`
- [ ] T036 [P] [US2] Implement template create/edit form and enable/disable actions in `apps/admin/src/components/templates/TemplateForm.vue` and `apps/admin/src/services/templates/admin-templates.service.ts`
- [ ] T037 [US2] Implement template request list and request-to-template linking UI in `apps/admin/src/views/templates/TemplateRequestListView.vue`

**Checkpoint**: User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - 管理后台账号与角色 (Priority: P1)

**Goal**: 超级管理员可登录后台、管理后台账号、应用固定角色矩阵，并查看操作日志与修改自己的密码。

**Independent Test**: 超级管理员可以创建一个运营账号，运营账号登录后仅能访问授权菜单；超级管理员可查看并筛选操作日志；最后一个超级管理员不可被禁用或降级；任意角色可修改自己的密码。

### Tests for User Story 3 ⚠️

- [ ] T038 [P] [US3] Add contract coverage for `/api/admin/auth/login`, `/auth/me`, `/auth/change-password`, admin user management endpoints, and `/api/admin/operation-logs` in `apps/server/tests/contract/admin-auth.contract.spec.ts`
- [ ] T039 [P] [US3] Add integration tests for session login, lockout, password change, fixed role guards, last-super-admin protection, and operation-log query/filter authorization in `apps/server/tests/integration/admin-auth.integration.spec.ts`
- [ ] T040 [P] [US3] Add admin frontend tests for login flow, route guards, account form, self-service password change, and operation log list/filter rendering in `apps/admin/tests/unit/auth/admin-login.spec.ts`, `apps/admin/tests/unit/settings/change-password.spec.ts`, and `apps/admin/tests/unit/logs/operation-log-list.spec.ts`

### Implementation for User Story 3

- [ ] T041 [P] [US3] Implement admin auth controller/session service in `apps/server/src/modules/admin-auth/admin-auth.controller.ts` and `apps/server/src/modules/admin-auth/admin-session.service.ts`
- [ ] T042 [P] [US3] Implement admin account CRUD and role assignment logic in `apps/server/src/modules/admin-auth/admin-user.service.ts`
- [ ] T043 [US3] Implement operation log query/read API in `apps/server/src/modules/admin-logs/admin-operation-logs.controller.ts`
- [ ] T044 [P] [US3] Implement login page and session bootstrap in `apps/admin/src/views/auth/AdminLoginView.vue` and `apps/admin/src/stores/admin-auth.store.ts`
- [ ] T045 [P] [US3] Implement admin account management page in `apps/admin/src/views/settings/AdminUsersView.vue`
- [ ] T046 [P] [US3] Implement self-service password change UI in `apps/admin/src/views/settings/ChangePasswordView.vue`
- [ ] T047 [US3] Implement role-based menu rendering and 403 handling in `apps/admin/src/router/index.ts`, `apps/admin/src/router/guards.ts`, and `apps/admin/src/views/errors/ForbiddenView.vue`
- [ ] T047a [P] [US3] Implement operation log list page and filters in `apps/admin/src/views/logs/OperationLogListView.vue` and `apps/admin/src/components/logs/OperationLogFilters.vue`

**Checkpoint**: User Stories 1-3 should be independently functional; MVP backend admin can be demoed

---

## Phase 6: User Story 4 - 用户风控与禁用 (Priority: P2)

**Goal**: 运营人员可查询用户、查看订单摘要，并设置禁用与单日生成上限。

**Independent Test**: 运营人员能按条件查找用户，更新风控配置并确认新登录被拦截。

### Tests for User Story 4 ⚠️

- [ ] T048 [P] [US4] Add contract coverage for `/api/admin/users`, `/api/admin/users/{userId}`, `/disable`, and `/risk-controls` in `apps/server/tests/contract/admin-users.contract.spec.ts`
- [ ] T049 [P] [US4] Add integration tests for user disable semantics, risk control upsert, and operation logging in `apps/server/tests/integration/admin-users.integration.spec.ts`
- [ ] T050 [P] [US4] Add admin frontend tests for user list filters and risk control form in `apps/admin/tests/unit/users/user-list.spec.ts` and `apps/admin/tests/unit/users/risk-control-form.spec.ts`

### Implementation for User Story 4

- [ ] T051 [P] [US4] Implement admin user query service and detail aggregation in `apps/server/src/modules/admin-users/admin-users.service.ts`
- [ ] T052 [P] [US4] Implement user disable and risk control command service in `apps/server/src/modules/admin-users/admin-user-risk.service.ts`
- [ ] T053 [US4] Implement user controllers in `apps/server/src/modules/admin-users/admin-users.controller.ts`
- [ ] T054 [P] [US4] Implement user list/detail UI in `apps/admin/src/views/users/UserListView.vue` and `apps/admin/src/views/users/UserDetailView.vue`
- [ ] T055 [US4] Implement disable/risk-control actions in `apps/admin/src/components/users/UserRiskControlForm.vue` and `apps/admin/src/services/users/admin-users.service.ts`

**Checkpoint**: User Stories 1-4 should all work independently

---

## Phase 7: User Story 5 - 配置查重与引用核对 API (Priority: P2)

**Goal**: 运营人员可安全更新第三方接口配置，保存前完成连通性测试，并使新配置即时生效。

**Independent Test**: 运营人员更新查重配置后，无需重启服务即可在下一次请求使用新配置；界面始终看不到明文密钥。

### Tests for User Story 5 ⚠️

- [ ] T056 [P] [US5] Add contract coverage for `/api/admin/configs/api` and `/api/admin/configs/api/{configType}` in `apps/server/tests/contract/admin-config.contract.spec.ts`
- [ ] T057 [P] [US5] Add integration tests for masked secret responses, connectivity validation, config version bump, and cache invalidation in `apps/server/tests/integration/admin-config.integration.spec.ts`
- [ ] T058 [P] [US5] Add admin frontend tests for masked secret rendering and config save flow in `apps/admin/tests/unit/configs/api-config-form.spec.ts`
- [ ] T058a [P] [US5] Add contract coverage for `/api/admin/configs/system` in `apps/server/tests/contract/admin-config.contract.spec.ts`
- [ ] T058b [P] [US5] Add integration tests for maintenance mode and default suggestion updates in `apps/server/tests/integration/admin-config.integration.spec.ts`
- [ ] T058c [P] [US5] Add admin frontend tests for system config form in `apps/admin/tests/unit/configs/system-config-form.spec.ts`

### Implementation for User Story 5

- [ ] T059 [P] [US5] Implement API config repository/service and encryption boundary in `apps/server/src/modules/admin-config/admin-api-config.service.ts`
- [ ] T060 [P] [US5] Implement connectivity test adapter orchestration in `apps/server/src/modules/admin-config/admin-config-validation.service.ts`
- [ ] T061 [US5] Implement config controller and runtime cache invalidation hooks in `apps/server/src/modules/admin-config/admin-config.controller.ts`
- [ ] T062 [P] [US5] Implement config management page and masked-secret form in `apps/admin/src/views/configs/ApiConfigView.vue`
- [ ] T063 [US5] Wire config save flow, validation feedback, and immediate refresh in `apps/admin/src/services/configs/admin-config.service.ts`
- [ ] T063a [US5] Implement system config repository/service in `apps/server/src/modules/admin-config/admin-system-config.service.ts`
- [ ] T063b [US5] Implement system config controller in `apps/server/src/modules/admin-config/admin-system-config.controller.ts`
- [ ] T063c [US5] Implement system config page and client flow in `apps/admin/src/views/configs/SystemConfigView.vue` and `apps/admin/src/services/configs/admin-system-config.service.ts`

**Checkpoint**: User Stories 1-5 should all work independently

---

## Phase 8: User Story 6 - 统计看板 (Priority: P2)

**Goal**: 运营人员可查看订单概览、漏斗、失败原因和收入汇总，并按日/周/月切换。

**Independent Test**: 看板展示概览卡片与漏斗数据，切换时间范围后 5 秒内返回新结果。

### Tests for User Story 6 ⚠️

- [ ] T064 [P] [US6] Add contract coverage for `/api/admin/dashboard/overview` and `/api/admin/dashboard/funnel` in `apps/server/tests/contract/admin-dashboard.contract.spec.ts`
- [ ] T065 [P] [US6] Add integration tests for overview, funnel, failure reason aggregation, and time-range grouping in `apps/server/tests/integration/admin-dashboard.integration.spec.ts`
- [ ] T066 [P] [US6] Add admin frontend tests for dashboard cards, funnel chart/table, and range switching in `apps/admin/tests/unit/dashboard/dashboard-overview.spec.ts`
- [ ] T066a [P] [US6] Add contract coverage for `/api/admin/dashboard/revenue` in `apps/server/tests/contract/admin-dashboard.contract.spec.ts`
- [ ] T066b [P] [US6] Add integration tests for revenue aggregation by product/version in `apps/server/tests/integration/admin-dashboard.integration.spec.ts`

### Implementation for User Story 6

- [ ] T067 [P] [US6] Extend write paths to persist funnel milestone timestamps in `apps/server/src/modules/wizard/`, `apps/server/src/modules/order/`, and related services
- [ ] T068 [P] [US6] Implement dashboard aggregation queries in `apps/server/src/modules/admin-dashboard/admin-dashboard.service.ts`
- [ ] T069 [US6] Implement dashboard controller and DTOs in `apps/server/src/modules/admin-dashboard/admin-dashboard.controller.ts`
- [ ] T070 [P] [US6] Implement dashboard overview page in `apps/admin/src/views/dashboard/DashboardOverviewView.vue`
- [ ] T071 [US6] Implement range switcher, funnel, and failure reason visual components in `apps/admin/src/components/dashboard/` and `apps/admin/src/services/dashboard/admin-dashboard.service.ts`
- [ ] T071a [US6] Implement revenue aggregation query in `apps/server/src/modules/admin-dashboard/admin-dashboard.service.ts`
- [ ] T071b [US6] Implement revenue distribution panel in `apps/admin/src/components/dashboard/RevenueDistributionPanel.vue` and `apps/admin/src/views/dashboard/DashboardOverviewView.vue`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 9: User Story 7 - 商品与支付管理 (Priority: P2)

**Goal**: 运营人员可管理商品版本、配置 AI 阈值、查看支付记录，并确保商品变更不影响历史订单快照。

**Independent Test**: 运营人员可创建或编辑一个商品版本、上下架该商品、查看支付记录列表，并确认已支付历史订单仍显示原始快照内容。

### Tests for User Story 7 ⚠️

- [ ] T077 [P] [US7] Add contract coverage for `/api/admin/products`, `/api/admin/products/{productId}`, `/api/admin/products/{productId}/activate`, `/api/admin/products/{productId}/deactivate`, `/api/admin/payments`, and `/api/admin/payments/{paymentId}` in `apps/server/tests/contract/admin-products.contract.spec.ts`
- [ ] T078 [P] [US7] Add integration tests for product upsert, activation/deactivation, AI threshold persistence, payment query, and order snapshot immutability in `apps/server/tests/integration/admin-products.integration.spec.ts`
- [ ] T079 [P] [US7] Add admin frontend tests for product form, product list, and payment list in `apps/admin/tests/unit/products/product-list.spec.ts`, `apps/admin/tests/unit/products/product-form.spec.ts`, and `apps/admin/tests/unit/payments/payment-list.spec.ts`

### Implementation for User Story 7

- [ ] T080 [P] [US7] Implement product management service/controller in `apps/server/src/modules/admin-products/admin-products.service.ts` and `apps/server/src/modules/admin-products/admin-products.controller.ts`
- [ ] T081 [P] [US7] Implement payment query service/controller in `apps/server/src/modules/admin-payments/admin-payments.service.ts` and `apps/server/src/modules/admin-payments/admin-payments.controller.ts`
- [ ] T081a [US7] Extend order snapshot mapping and validation in `apps/server/src/modules/order/` and `apps/server/src/modules/admin-products/`
- [ ] T081b [P] [US7] Implement product management pages in `apps/admin/src/views/products/ProductListView.vue` and `apps/admin/src/components/products/ProductForm.vue`
- [ ] T081c [P] [US7] Implement payment list/detail pages in `apps/admin/src/views/payments/PaymentListView.vue` and `apps/admin/src/views/payments/PaymentDetailView.vue`

**Checkpoint**: User Stories 1-7 should all work independently

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事收尾、稳定性补强和文档校验

- [ ] T072 [P] Document admin app structure and environment variables in `apps/admin/README.md` and `apps/server/README.md`
- [ ] T073 Implement end-to-end admin happy-path coverage in `apps/admin/tests/e2e/admin-portal.spec.ts`
- [ ] T074 [P] Add missing shared exports for admin DTO/enums/types in `packages/shared/src/index.ts`
- [ ] T075 Run quickstart validation and update `specs/001-admin-portal/quickstart.md` with any implementation-specific corrections
- [ ] T076 Review logging/redaction paths to ensure secrets never appear in `apps/server/src/modules/admin-logs/` and server error serializers
- [ ] T083 Implement operation log retention cleanup job and boundary tests in `apps/server/src/modules/admin-logs/admin-operation-log-retention.job.ts` and `apps/server/tests/integration/admin-logs-retention.integration.spec.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成，并阻塞所有用户故事
- **User Stories (Phase 3-9)**: 全部依赖 Foundational 完成
- **Polish (Phase 10)**: 依赖所有目标用户故事完成

### User Story Dependencies

- **US1 (P1)**: 基于 Foundational，可独立作为 MVP 启动
- **US2 (P1)**: 基于 Foundational，可与 US1 并行
- **US3 (P1)**: 基于 Foundational，可与 US1/US2 并行，但建议优先完成以解锁真实后台登录
- **US4 (P2)**: 依赖 US3 的后台角色与认证能力
- **US5 (P2)**: 依赖 US3 的后台认证与日志能力
- **US6 (P2)**: 依赖 Foundational 和部分订单/任务数据写入路径；可在 US1 基础上展开
- **US7 (P2)**: 依赖 Foundational；商品快照验证与支付查询建议在 US1/US3 稳定后推进

### Within Each User Story

- 先写 contract / integration / frontend tests，并确保失败
- 再实现服务/控制器
- 最后实现前端页面、交互和日志
- 每个故事完成后独立验证再进入下一个优先级

### Parallel Opportunities

- `T003`, `T004`, `T006`, `T007`, `T010`, `T011`, `T012` 可并行
- 每个用户故事中的 contract / integration / frontend tests 可并行
- US1、US2、US3 在 Foundational 后可并行推进
- US4、US5、US6、US7 在 P1 稳定后可按团队容量并行推进

---

## Parallel Example: User Story 1

```bash
# Tests first
Task: "T016 Add contract coverage for admin order and generation job endpoints"
Task: "T017 Add integration tests for retry/cancel/overtime logic"
Task: "T018 Add admin frontend tests for order list and detail"

# Then implementation pieces
Task: "T019 Implement admin order query service"
Task: "T020 Implement generation job query and event log service"
Task: "T024 Implement admin order list page and filters"
Task: "T025 Implement generation job detail page/panel"
```

---

## Implementation Strategy

### MVP First (US1 + US3)

1. 完成 Phase 1-2，搭好 `apps/admin`、session、shared DTO、Prisma 模型和 `/api/admin/*`
2. 先交付 US3（后台登录与固定权限）
3. 再交付 US1（失败订单与任务处理）
4. 停下来验证：运营可真实登录并处理失败任务

### Incremental Delivery

1. Setup + Foundational
2. US3 后台认证/权限
3. US1 订单与任务
4. US2 模板管理
5. US4 用户风控
6. US5 配置管理
7. US6 看板统计
8. US7 商品与支付

### Recommended Story Grouping

- **第一批上线**: US3 + US1 + US2
- **第二批上线**: US4 + US5
- **第三批上线**: US6 + US7 + Polish

---

## Notes

- 所有服务端接口使用 `/api/admin/*`
- 所有密钥在 UI 中必须始终脱敏
- 商品改动不得影响历史订单快照
- 生成任务超 2 小时只告警，不自动终止
- 模板仅停用，不物理删除
- 后台仅支持 PC 桌面浏览器
