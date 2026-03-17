## Why

步骤 2「参考文献」的最低文献数量目前按学历类型硬编码（本科 10～15 篇、硕士 15～25 篇、博士 25 篇以上），业务上需要改为**单一固定值**并由 admin 端配置，在不发版的情况下灵活调整（如内测降低门槛、活动场景等）。运营应能从 admin 端配置一个全局最低文献数量，所有学历类型统一使用该值。

## What Changes

- Admin 端「全局参数配置」新增 `min_reference_count`（最低文献数量）配置项，类型为正整数，默认值 **1**；该值为**固定值**，不按学历类型区分。
- 前台步骤 2 的「下一步」置灰逻辑与提示文案仅依据该配置值：已选文献数 < `minReferenceCount` 时置灰并提示「请至少添加 X 篇文献」；不再使用或展示按学历类型的文献数量建议区间。
- 配置修改后前台立即生效，无需重启服务（通过已有的全局配置缓存机制）。

## Capabilities

### Modified Capabilities

- `ai-paper-writing` → **步骤 2 — 确定参考文献**：`min_reference_count` 验证逻辑改为从 admin 配置读取，默认 1。
- `admin-portal` → **全局参数与维护模式**：新增 `min_reference_count` 可配置项（正整数，默认 1，≥ 1）。

### New Capabilities

- 无（不新增独立功能，为现有参数配置能力的扩展）。

## Impact

- **apps/server**：`modules/admin`（或 `system-config.service`）新增 `min_reference_count` config key；`modules/wizard`（或 step2 相关 API）在返回步骤状态时附带 `minReferenceCount` 字段。
- **apps/web**：步骤 2 的 `ReferenceManager`（`views/wizard/Step2.vue` 或对应 composable）将硬编码阈值替换为从接口/store 读取 `minReferenceCount`。
- **packages/shared**：如 `SystemConfigDto` / `GlobalConfigDto` 中补充 `minReferenceCount: number` 字段。
- **依赖**：无新增依赖，复用已有 `AdminConfigCacheService` 与前台配置读取机制。

## Non-goals

- 不将每个学历类型的建议区间（10～15 等）改为独立可配置项，提示文案保持硬编码（or 可本地化），仅最低验证门槛可配置。
- 不新增按商品/套餐差异化文献数量限制。
- 不影响已锁定（进入步骤 3 后）的草稿文献列表。
