# Phase 0 Research: 后台管理网站（Admin Portal）

## Decision 1: 后台前端采用独立 `apps/admin`

**Decision**: 将后台管理站实现为独立的 `apps/admin` Vue 3 应用，而不是把后台页面继续塞入现有 `apps/web` 用户端应用。

**Rationale**: 该 feature 明确是内部 PC 后台，使用后台账号体系、固定角色矩阵、PC-only 布局，并与前台微信用户端隔离。独立应用可以避免把移动端用户流程、微信登录态、后台菜单权限和错误页逻辑混到一起，同时仍可复用同一 monorepo、Vite、Pinia 与 shared DTO。

**Alternatives considered**:
- 在 `apps/web` 内增加 `/admin/*` 路由：启动成本低，但会混合前后台认证与路由守卫。
- 在 `apps/web` 内做多入口：隔离稍好，但发布/打包和状态边界仍然不如独立应用清晰。

## Decision 2: 后台认证采用 session + HttpOnly cookie

**Decision**: 后台认证使用 NestJS 服务端 session，凭证通过 HttpOnly cookie 传递，Redis 作为 session store；授权采用固定角色枚举 + 服务端 Guard/Policy。

**Rationale**: 后台是内部系统，不需要第三方 token 分发。session 更适合实现 8 小时无操作过期、账号禁用后后续请求立即失效、角色调整即时生效和后台登出控制。Redis 已是既定技术栈，可直接承载 session。

**Alternatives considered**:
- JWT：更适合开放式多端 API，但会增加 token 失效、禁用账号即时生效等复杂度。
- JWT + refresh token：功能完备，但对当前固定角色内部后台属于过度设计。

## Decision 3: 后台接口统一挂载在 `/api/admin/*`

**Decision**: 所有后台接口使用独立的 `/api/admin/*` 前缀，并按 admin bounded context 划分模块。

**Rationale**: 该前缀天然隔离后台鉴权、审计和限流策略，也让前后台接口边界更清楚。后端可在 `apps/server/src/modules/` 下按 `admin-auth`、`admin-orders`、`admin-templates` 等模块组织，避免与用户端 API 混杂。

**Alternatives considered**:
- 复用用户端 API 前缀：路径更少，但权限边界和日志审计容易混乱。
- 仅在 Controller 层分文件不分前缀：长期演进时维护性较差。

## Decision 4: 前后端共享后台 DTO，但不共享 Nest 运行时校验类

**Decision**: 在 `packages/shared` 中定义后台的纯 TypeScript DTO、枚举和类型契约；`apps/server` 中单独保留带校验装饰器的 DTO class 来实现这些契约。

**Rationale**: 这样既满足 constitution 对 shared DTO 的要求，又避免把 Nest 运行时装饰器耦合给前端。`apps/admin` 直接消费 shared 类型，`apps/server` 负责 `class-validator` 与转换。

**Alternatives considered**:
- 直接共享 Nest DTO class：会把后端框架细节泄露给前端。
- 前后端各写一套类型：违反 shared DTO 原则，并增加漂移风险。

## Decision 5: `Order` 与 `GenerationJob` 使用 1:N 建模

**Decision**: `Order` 表示面向用户的履约对象，`GenerationJob` 表示后台执行尝试；一个订单可以关联多次任务尝试（`Order 1:N GenerationJob`）。

**Rationale**: 该 feature 已确认支持失败后重试、人工取消视同失败、超 2 小时仅告警。1:N 模型能保留每次尝试的日志、失败原因和触发来源，同时保持 `Order.status` 作为面向业务的最终状态。

**Alternatives considered**:
- `Order 1:1 GenerationJob`：重试历史与失败审计难以保留。
- 仅在 `Order` 上表达任务状态：会把业务态和执行态混在一起。

## Decision 6: 任务取消视同失败，超 2 小时仅告警

**Decision**: 对进行中的任务执行取消时，任务终态记录为失败（`terminalReason=MANUAL_CANCELLED`），父订单同步为 `FAILED`；连续运行超过 2 小时只显示警示标记，不自动终止或改状态。

**Rationale**: 这样可复用现有失败筛选和重试入口，不引入额外 `CANCELLED` 状态；同时避免自动终止误杀大论文生成任务，仍保留人工决策权。

**Alternatives considered**:
- 单独引入 `CANCELLED` 状态：增加状态机复杂度。
- 超时自动失败：与“不设超时限制”的主流程约束冲突。

## Decision 7: 后台统计直接读 PostgreSQL 主库

**Decision**: 初期所有后台统计和看板直接查询 PostgreSQL 主库，不引入 OLAP、数仓或 Redis 统计真源。

**Rationale**: 当前规模约束为 < 100,000 订单 / < 50,000 用户，主库聚合足够。重点不是是否引入复杂架构，而是确保统计口径稳定，因此应持久化关键里程碑时间戳并基于它们做聚合。

**Alternatives considered**:
- 使用 Redis/BullMQ 运行时指标：不适合作为业务统计真源。
- 直接上数仓/离线预聚合：当前阶段成本过高。

## Decision 8: 漏斗统计依赖持久化里程碑时间戳

**Decision**: 不从 JSON 草稿内容或日志临时推断漏斗，改为在 `Draft` / `Order` 等实体中持久化关键阶段时间戳，如 `step1CompletedAt`、`step2ConfirmedAt`、`outlineConfirmedAt`、`orderPaidAt`、`generationStartedAt`、`generationCompletedAt`。

**Rationale**: 漏斗统计需要稳定口径、可按时间范围重算且易于索引。阶段时间戳可让日/周/月统计和失败分析保持可验证。

**Alternatives considered**:
- 从 JSON 字段推断：实现快，但口径不稳定、查询困难。
- 从操作日志回放：审计适合，统计成本过高。

## Decision 9: 模板、商品快照、日志采用显式业务建模

**Decision**:
- `SchoolTemplate` 使用 `(schoolNameNormalized, degreeType)` 唯一约束和启停状态，不支持物理删除。
- `Order` 支付时写入商品快照，历史订单不受商品下架或改价影响。
- `OperationLog` 使用 append-only 模型，并以定时清理实现 180 天保留。

**Rationale**: 这些选择都来自 spec 已确认约束，可减少后续状态歧义并方便测试。

**Alternatives considered**:
- 用 `deletedAt` 代替模板停用：会混淆业务状态和数据生命周期。
- 订单仅存 `productId`：会破坏历史订单稳定性。
- 日志只存文本描述：不利于查询与审计。

## Decision 10: 合同优先，使用 OpenAPI 3.1

**Decision**: 在 `contracts/admin-api.yaml` 中定义后台关键接口的 OpenAPI 3.1 合同，优先覆盖认证、订单/任务、模板、用户风控、配置和看板接口。

**Rationale**: 这些接口最容易导致前后端和测试理解偏差。先定义合同可直接驱动 contract tests、integration tests 和任务拆解。

**Alternatives considered**:
- 只靠 controller DTO 和注释：前后端更容易漂移。
- 一次性穷举所有接口：文档量过大，短期收益不高。

## Planning Implications

- `plan.md` 需要将 `apps/admin` 作为新增独立前端应用，并在 Constitution Check 中说明其必要性。
- `data-model.md` 需要明确 `Order 1:N GenerationJob`、模板唯一键、商品快照与操作日志保留策略。
- `contracts/admin-api.yaml` 需要覆盖状态流转、模板启停、用户禁用、配置热更新和看板查询。
- `quickstart.md` 需要包含 `apps/admin`、`apps/server`、PostgreSQL 和 Redis 的本地联调方式。
- `update-agent-context.ps1` 需要把 `apps/admin`、session/cookie、OpenAPI 合同和 Prisma/BullMQ 管理模型写入 agent context。
