# Phase 1 Data Model: 后台管理网站（Admin Portal）

## Overview

本 feature 以现有用户域实体为基础，新增后台管理域实体，并扩展订单/草稿字段以支撑运营、风控和统计看板。核心建模原则：

- 业务状态与执行状态分离：`Order` 表示履约结果，`GenerationJob` 表示执行尝试
- 后台权限固定为四种角色，不做可配置 RBAC
- 模板、商品、配置和日志均使用显式业务字段，不依赖隐式推断
- 历史订单必须保留支付当时的商品快照

## Entities

### AdminUser

| Field | Type | Notes |
|------|------|------|
| `id` | UUID | 主键 |
| `username` | string | 唯一，后台登录名 |
| `passwordHash` | string | 哈希后的密码 |
| `role` | enum | `SUPER_ADMIN` / `OPERATOR` / `CUSTOMER_SERVICE` / `READ_ONLY` |
| `status` | enum | `ACTIVE` / `DISABLED` / `LOCKED` |
| `failedLoginAttempts` | int | 连续失败次数 |
| `lockedUntil` | datetime nullable | 锁定结束时间 |
| `lastLoginAt` | datetime nullable | 最近登录时间 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |

**Validation rules**
- `username` 唯一且不可为空
- 密码策略遵循 spec：至少 8 位且包含字母与数字
- 系统必须始终保留至少一个启用中的 `SUPER_ADMIN`

**State transitions**
- `ACTIVE -> LOCKED`：连续登录失败 5 次
- `LOCKED -> ACTIVE`：30 分钟后自动恢复
- `ACTIVE -> DISABLED`：被超管禁用

### UserRiskControl

| Field | Type | Notes |
|------|------|------|
| `id` | UUID | 主键 |
| `userId` | UUID | 关联前台用户，唯一 |
| `isDisabled` | boolean | 是否禁止新登录 |
| `dailyGenerationLimit` | int nullable | 单日生成上限 |
| `reason` | string nullable | 风控备注 |
| `updatedByAdminUserId` | UUID | 操作者 |
| `updatedAt` | datetime | 更新时间 |

**Validation rules**
- 每个前台用户最多一条风控记录
- `dailyGenerationLimit` 必须大于 0 或为空
- 禁用仅影响新登录，不强制吊销现有前台会话

### SchoolTemplate

| Field | Type | Notes |
|------|------|------|
| `id` | UUID | 主键 |
| `schoolName` | string | 展示名称 |
| `schoolNameNormalized` | string | 归一化检索字段 |
| `degreeType` | enum | `COLLEGE` / `BACHELOR` / `MASTER` / `DOCTOR` |
| `templateFilePath` | string | `.dotx` 存储路径 |
| `citationStyle` | enum/string | 如 `GB_T_7714`, `APA` |
| `headingConfigJson` | json | 标题层级规则 |
| `pageLayoutJson` | json | 页眉页脚、页边距等 |
| `status` | enum | `ENABLED` / `DISABLED` |
| `createdByAdminUserId` | UUID | 创建人 |
| `updatedByAdminUserId` | UUID | 更新人 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |

**Validation rules**
- 唯一约束：`(schoolNameNormalized, degreeType)`
- 仅支持启用/停用，不支持物理删除
- 文件大小限制建议 20MB

### TemplateRequest

| Field | Type | Notes |
|------|------|------|
| `id` | UUID | 主键 |
| `userId` | UUID | 提交用户 |
| `schoolName` | string | 用户提交的学校名 |
| `degreeType` | enum | 用户上下文中的学历 |
| `documentPath` | string nullable | 规范文档路径 |
| `status` | enum | `PENDING` / `FULFILLED` / `IGNORED` |
| `linkedTemplateId` | UUID nullable | 关联新建模板 |
| `handledByAdminUserId` | UUID nullable | 处理人 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |

### Product

| Field | Type | Notes |
|------|------|------|
| `id` | UUID | 主键 |
| `productCode` | string | 唯一业务编码 |
| `name` | string | 套餐名 |
| `status` | enum | `ACTIVE` / `INACTIVE` |
| `priceFen` | int | 价格，分 |
| `revisionLimit` | int nullable | 改稿次数上限；无限版为空或特殊值 |
| `aiRateThreshold` | decimal nullable | AI 率保障版阈值 |
| `benefitsJson` | json | 赠品与权益 |
| `description` | string | 说明 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |

**Validation rules**
- `productCode` 唯一
- 下架仅影响新订单
- `aiRateThreshold` 仅对 AI 率保障版必填

### Order（扩展现有用户域实体）

| Field | Type | Notes |
|------|------|------|
| `id` | UUID | 主键 |
| `userId` | UUID | 前台用户 |
| `title` | string | 论文标题 |
| `status` | enum | `PENDING_PAYMENT` / `GENERATING` / `COMPLETED` / `FAILED` |
| `paidAt` | datetime nullable | 支付时间 |
| `completedAt` | datetime nullable | 完成时间 |
| `failedAt` | datetime nullable | 失败时间 |
| `productSnapshotJson` | json | 支付时套餐快照 |
| `productCodeSnapshot` | string | 冗余字段，便于筛选 |
| `productNameSnapshot` | string | 冗余字段 |
| `paidAmountFen` | int nullable | 冗余金额字段 |
| `latestFailureReason` | string nullable | 最新失败原因 |
| `generationStartedAt` | datetime nullable | 用于统计 |
| `generationCompletedAt` | datetime nullable | 用于统计 |
| `createdAt` | datetime | 创建时间 |
| `updatedAt` | datetime | 更新时间 |

**Validation rules**
- 商品快照在支付成功时一次性写入，不随后台商品更新而变化
- 订单取消任务时同步进入 `FAILED`

### GenerationJob

| Field | Type | Notes |
|------|------|------|
| `id` | UUID | 主键 |
| `orderId` | UUID | 关联订单 |
| `attemptNo` | int | 第几次尝试 |
| `status` | enum | `QUEUED` / `RUNNING` / `COMPLETED` / `FAILED` |
| `bullmqJobId` | string | 队列任务 ID |
| `triggerSource` | enum | `SYSTEM` / `MANUAL_RETRY` |
| `terminalReason` | enum/string nullable | 如 `MODEL_TIMEOUT`, `RATE_LIMITED`, `MANUAL_CANCELLED` |
| `failureMessage` | string nullable | 失败详情 |
| `queuedAt` | datetime | 入队时间 |
| `startedAt` | datetime nullable | 开始时间 |
| `finishedAt` | datetime nullable | 结束时间 |
| `attentionRequiredAt` | datetime nullable | 超 2 小时告警时间 |
| `operatorAdminUserId` | UUID nullable | 人工触发者 |

**Validation rules**
- `attemptNo` 在同一 `orderId` 下唯一递增
- 取消视同失败，不单独维护 `CANCELLED` 状态
- 运行超过 2 小时仅打告警，不自动失败

### GenerationJobEventLog

| Field | Type | Notes |
|------|------|------|
| `id` | UUID | 主键 |
| `generationJobId` | UUID | 归属任务 |
| `chapterNo` | int nullable | 章节序号 |
| `eventType` | enum | `QUEUED` / `CHAPTER_STARTED` / `CHAPTER_COMPLETED` / `WARNING` / `ERROR` |
| `message` | string | 日志内容 |
| `createdAt` | datetime | 事件时间 |

### ApiConfig

| Field | Type | Notes |
|------|------|------|
| `id` | UUID | 主键 |
| `configType` | enum | `PLAGIARISM` / `CITATION_CHECK` |
| `providerName` | string | 服务商名称 |
| `baseUrl` | string | 接口地址 |
| `encryptedSecret` | string nullable | 加密后密钥 |
| `rateLimitConfigJson` | json nullable | 限流配置 |
| `isEnabled` | boolean | 开关 |
| `configVersion` | int | 递增版本号，用于缓存失效 |
| `updatedByAdminUserId` | UUID | 修改人 |
| `updatedAt` | datetime | 更新时间 |

**Validation rules**
- 密钥只存密文，界面始终脱敏
- 保存前必须通过连通性测试
- 更新成功后版本号递增，用于实例缓存失效

### OperationLog

| Field | Type | Notes |
|------|------|------|
| `id` | UUID | 主键 |
| `actorAdminUserId` | UUID | 操作者 |
| `actionType` | string | 如 `ORDER_RETRY`, `TEMPLATE_ENABLE` |
| `targetType` | string | 操作对象类型 |
| `targetId` | UUID/string | 操作对象 ID |
| `summary` | string | 简述 |
| `beforeJson` | json nullable | 变更前快照 |
| `afterJson` | json nullable | 变更后快照 |
| `createdAt` | datetime | 日志时间 |

**Validation rules**
- append-only，不允许后台手动删除
- 仅保留 180 天，由定时任务清理
- 不得写入密钥明文

## Existing Domain Extensions

### Draft（扩展现有实体）

为统计看板增加以下里程碑字段：

- `step1CompletedAt`
- `step2ConfirmedAt`
- `outlineConfirmedAt`

### Order（统计扩展）

为看板增加或复用以下里程碑字段：

- `paidAt`
- `generationStartedAt`
- `generationCompletedAt`
- `failedAt`

这些字段用于漏斗和趋势分析，避免从 JSON 内容或日志反推。

## Relationships

- `AdminUser 1:N OperationLog`
- `AdminUser 1:N ApiConfig`（更新人）
- `AdminUser 1:N SchoolTemplate`（创建/更新人）
- `User 1:1 UserRiskControl`
- `User 1:N Order`
- `Order 1:N GenerationJob`
- `GenerationJob 1:N GenerationJobEventLog`
- `TemplateRequest N:1 SchoolTemplate`（可选关联）

## Indexing Strategy

- `AdminUser.username` unique
- `SchoolTemplate (schoolNameNormalized, degreeType)` unique
- `TemplateRequest.status, createdAt`
- `Order.status, createdAt`
- `Order.userId, createdAt`
- `GenerationJob.orderId, attemptNo` unique
- `GenerationJob.status, startedAt`
- `OperationLog.createdAt, actionType`
- `ApiConfig.configType` unique

## State Machines

### Order

- `PENDING_PAYMENT -> GENERATING`: 支付完成并创建首个 `GenerationJob`
- `GENERATING -> COMPLETED`: 最新任务成功完成
- `GENERATING -> FAILED`: 最新任务失败或人工取消
- `FAILED -> GENERATING`: 运营人员执行重新生成

### GenerationJob

- `QUEUED -> RUNNING`
- `RUNNING -> COMPLETED`
- `RUNNING -> FAILED`
- `RUNNING` + `startedAt > 2h` => 标记异常关注，不改变状态

### SchoolTemplate

- `DISABLED -> ENABLED`
- `ENABLED -> DISABLED`

### TemplateRequest

- `PENDING -> FULFILLED`
- `PENDING -> IGNORED`

## Runtime-Only Structures

以下结构不进入 Prisma 主模型，但属于实现设计的一部分：

- **AdminSession (Redis)**: `sessionId`, `adminUserId`, `role`, `lastSeenAt`, `expiresAt`
- **Config cache entry (Redis / in-memory)**: `configType`, `configVersion`, `resolvedConfig`

这些结构用于后台登录和配置即时生效，不替代数据库中的权威业务数据。
