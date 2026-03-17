## Context

- **前台（步骤 2）现状**：`ReferenceManager` 按学历类型硬编码最低文献数量（如本科 10 篇、硕士 15 篇、博士 25 篇），该逻辑写在 `Step2.vue` 或对应 composable 中。本变更改为**单一固定值**，由 admin 配置，不按学历类型区分。
- **后台（admin）现状**：`system-config.service.ts` 维护了 `plagiarism_provider`、`ai_provider` 等 key，`UpdateSystemConfigDto` 包含 `maintenanceMode`、`defaultSuggestedTopic`、`maxDailyGenerationDefault`，但尚未落地 `minReferenceCount`。
- **缓存层**：已有 `AdminConfigCacheService`，修改配置后 `invalidate` 使缓存失效，前台重新拉取时即得新值。

## Goals / Non-Goals

**Goals:**

- 在 `system-config.service` 中新增 `min_reference_count` config key（正整数，默认 1）。
- 步骤 2 从专用接口（如 `GET /api/wizard/step2/config` 或 `GET /api/config/global`）获取 `minReferenceCount`，作为「下一步」置灰门槛。
- Admin 端「全局参数」页新增该字段的编辑表单，保存后前台下次请求即生效。

**Non-Goals:**

- 不按学历类型提供不同最低文献数量（仅一个全局固定值）。
- 不修改步骤 3～6 的任何逻辑。

## Decisions

### 1. 配置存储

- 复用现有 `system-config.service`，新增 `min_reference_count` key。
- 允许的值范围：正整数（≥ 1），由 admin API 校验，非法值返回 400。
- **理由**：无需新建 DB 表或迁移，`system-config` 是轻量 KV 存储，适合少量全局参数。

### 2. 前台获取配置的接口

- 方案 A：复用已有全局配置接口（如 `GET /api/admin/system-configs`），但该接口需 admin 权限，前台用户无法访问。
- **方案 B（选用）**：新增公开接口 `GET /api/config/public`，返回前台需要的安全配置子集（`minReferenceCount`、`maintenanceMode` 等），无需认证。前台 `wizard store` 或 `Step2` 在进入步骤 2 时请求该接口并缓存。
- **理由**：职责分离清晰，admin 配置接口不对外暴露所有内容；`/api/config/public` 仅暴露前台安全可见字段。

### 3. 前台验证逻辑

- 最低文献数量为**固定值**，仅来自 `publicConfig.minReferenceCount`，不按学历类型区分；无学历区间建议文案。
- 逻辑示例：

```
minCount = publicConfig.minReferenceCount ?? 1
selectedCount = references.length
isNextDisabled = selectedCount < minCount
hint = selectedCount < minCount ? `请至少添加 ${minCount} 篇文献` : ''
```

### 4. Admin UI 改动

- 在 `SystemConfigView.vue` 的表单中新增 `minReferenceCount` 输入项（number，min=1，整数），与 `maintenanceMode`、`maxDailyGenerationDefault` 并列。
- 保存时调用现有 `PATCH /api/admin/system-configs/min_reference_count`（或批量 `PUT /api/admin/system-configs`，按既有 API 接口对齐）。

### 5. DTO / 类型变更

- `SystemConfigDto`（`packages/shared`）：新增字段 `minReferenceCount: number`（后端直接返回，无需前台二次计算）。
- `PublicConfigDto`（新增，`packages/shared`）：`{ minReferenceCount: number; maintenanceMode: boolean }`，仅含前台可安全访问的字段。

## Risks / Trade-offs

- **风险**：`/api/config/public` 接口被滥用轮询。**缓解**：加 HTTP Cache-Control 头（如 `max-age=60`），前台缓存 1 分钟。
- **风险**：`min_reference_count = 1` 作为默认值极为宽松，如不注意可能导致质量问题。**缓解**：后台显示默认值与建议值（「建议值：本科 10，硕士 15，博士 25」）的提示文案。

## Migration Plan

1. 后端：`system-config.service` 新增 `min_reference_count`（默认 1）preset；新增 `GET /api/config/public` 接口（无鉴权）。
2. 前台：`wizard store` 或 Step2 composable 拉取 `publicConfig`；将硬编码阈值替换为 `publicConfig.minReferenceCount`。
3. Admin：`SystemConfigView` 表单新增 `minReferenceCount` 字段。
4. 回滚：移除 `min_reference_count` preset 与 `/api/config/public` 接口，前台恢复硬编码逻辑（改动独立，不影响其他配置项）。

## Open Questions

- 无；方案已明确，可直接进入任务分解。
