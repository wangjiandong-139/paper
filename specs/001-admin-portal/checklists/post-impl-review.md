# Post-Implementation Review Checklist: 后台管理网站（Admin Portal）

**Purpose**: 实现完成后的需求对齐自查——验证每条 spec 要求是否已在实现中完整、正确地体现，覆盖 US1-US7 全域。
**Created**: 2026-03-16
**Reviewed**: 2026-03-16
**Feature**: [spec.md](../spec.md)
**Audience**: 开发团队（self-review），PR 审阅者
**Depth**: Post-Implementation Review（advisory 级非功能约束与功能约束同等权重）

---

## 综合结论

| 域 | 通过 | 待修复 | Advisory/待验证 |
|---|---|---|---|
| US1 订单 | CHK003 CHK004 CHK006 CHK007 CHK008 | CHK001 CHK002 CHK005 | — |
| US2 模板 | CHK011 | CHK009 CHK010* CHK012* CHK013* CHK014* CHK015* | — |
| US3 账号 | CHK017 CHK018 CHK020 CHK021 CHK023 CHK024 | CHK016 CHK019 CHK022 | — |
| US4 风控 | CHK025† | CHK026 CHK027* CHK028* | — |
| US5 配置 | CHK030 | CHK029 CHK031* CHK032* CHK033* | — |
| US6 看板 | CHK036 CHK037 | CHK034 CHK035 | — |
| US7 商品 | CHK038 CHK040* | CHK039* | — |
| 安全横切 | CHK041 CHK043 | CHK042* | — |
| 并发边界 | — | CHK044* CHK045* | — |
| 性能 Advisory | — | — | CHK046 CHK047 CHK048 |

> *：需进一步代码确认或属于 stub 未实现功能（模板、风控等服务主体未暴露）。†：DTO 中 wechatOpenId 已定义但前端不展示，实质已脱敏。

---

## US1 — 订单与生成任务

- [x] CHK001 — ⚠️ **FAIL** 订单列表筛选：DTO 有 `search` 字段，但 `OrderListView.vue` UI 只有状态/日期/用户ID，**缺少「论文标题关键词」搜索框**；后端 `listOrders` 也未按 title 过滤。→ 已修复（见 fix-chk001）[Completeness, Spec §FR-001]

- [x] CHK002 — ⚠️ **FAIL** CSV 超 10,000 行：后端 `exportOrdersCsv` 静默截断；`OrderExportButton.vue` 无任何大数据量提示，用户无感知。→ 已修复（见 fix-chk002）[Clarity, Spec §FR-001, Edge Case]

- [x] CHK003 — ✅ **PASS** 订单详情展示基本信息、支付信息、生成任务列表（含按需加载的 eventLogs，eventLog 含 chapterNo）；备注编辑器存在。[Completeness, Spec §FR-002]

- [x] CHK004 — ✅ **PASS** `retryOrder` 仅对 `FAILED` 状态可用，触发后调用 `_updateOrderStatus(orderId, GENERATING)`。[Spec §FR-003]

- [x] CHK005 — ⚠️ **FAIL** 备注保存：后端 `updateOrderNote` 未写操作日志；Controller 也未传 `actorAdminUserId`。→ 已修复（见 fix-chk005）[Spec §FR-004]

- [x] CHK006 — ✅ **PASS** `cancelJob` 后调用 `_updateOrderStatus(job.orderId, FAILED)`，父订单同步变为失败。[Spec §FR-005]

- [x] CHK007 — ✅ **PASS** `isOverdue` 标记通过 UI badge 展示；`AdminGenerationJobsService` / `AdminOrdersService` 均无任何自动终止或状态变更逻辑。[Spec §FR-005, Edge Case]

- [x] CHK008 — ✅ **PASS** `retryOrder`/`retryJob` 均调用 `getRunningJobForOrder`，若有 RUNNING 任务则抛出 `ConflictException`（HTTP 409）。[Spec §Edge Cases]

---

## US2 — 格式模板管理

- [x] CHK009 — ⚠️ **FAIL** `TemplateListView.vue` 为平铺列表，**未按学校分组**。→ 已修复（见 fix-chk009）[Spec §FR-006]

- [x] CHK010 — ⚠️ **待验证** 模板唯一约束：Prisma schema 含唯一约束，但模板 service 为 stub（未实现），无法确认友好错误提示已处理。[Spec §FR-007]

- [x] CHK011 — ✅ **PASS** UI 无删除按钮，仅 enable/disable 操作；TemplateListView 只调用 `/enable` 和 `/disable` 接口，不存在 DELETE 入口。[Spec §FR-007]

- [x] CHK012 — ⚠️ **待验证** 模板创建服务为 stub，初始默认状态是否为 DISABLED 无法确认。[Spec §US2 Scenario 2]

- [x] CHK013 — ⚠️ **待验证** 模板启用后缓存刷新机制：`AdminConfigCacheService` 存在，但无模板服务调用它；需在模板 service 实现时补充。[Spec §FR-009]

- [x] CHK014 — ⚠️ **待验证** `.dotx` 文件大小校验：模板编辑入口为 `console.log` 占位，文件上传功能未实现。[Spec §Edge Cases]

- [x] CHK015 — ⚠️ **待验证** `TemplateRequestListView.vue` 存在但为 stub，查看规范文档和状态标记功能未实现。[Spec §FR-008]

---

## US3 — 后台账号与权限

- [x] CHK016 — ⚠️ **FAIL** `createUser` 和 `changePassword` 均无密码规则校验（≥8位+字母+数字）。→ 已修复（见 fix-chk016）[Spec §FR-014a]

- [x] CHK017 — ✅ **PASS** `handleLoginFailure` 失败5次后设 `LOCKED`；`checkLockStatus` 过期自动解锁（无手动解锁路径）。[Spec §FR-014a]

- [x] CHK018 — ✅ **PASS** `SESSION_TTL_MS = 8h`，`getSession` 在服务端验证 `expiresAt`。[Spec §FR-014a]

- [x] CHK019 — ⚠️ **FAIL** 权限矩阵偏差：READ_ONLY 缺少 `operation-logs:read`、`template-requests:read`、`configs:read`、`admin-users:read`（全模块只读应覆盖）；CUSTOMER_SERVICE 缺 `template-requests:read`。→ 已修复（见 fix-chk019）[Spec §FR-014]

- [x] CHK020 — ✅ **PASS** `assertNotLastSuperAdmin` 确认剩余非该用户的 ACTIVE SUPER_ADMIN 数量，为0时抛出 400。[Spec §FR-015]

- [x] CHK021 — ✅ **PASS** `changePassword(userId, currentPassword, newPassword)` 先 bcrypt.compare 验证当前密码，`userId` 参数须为当前登录用户（接口层需确认，controller stub 中已用 session.adminUserId）。[Spec §FR-015a]

- [x] CHK022 — ⚠️ **FAIL** 操作日志覆盖：`updateOrderNote` controller 未写日志（同 CHK005）。→ 已修复（见 fix-chk005）[Spec §FR-016]

- [x] CHK023 — ✅ **PASS** `AdminOperationLogService` 暴露 `log`、`query`、`deleteOlderThan`，无 DELETE 接口；Controller 未暴露删除路由。[Spec §FR-016]

- [x] CHK024 — ✅ **PASS** `admin-operation-log-retention.job.ts` 实现；`deleteOlderThan` 接受 cutoffDate，180天边界行为由 `new Date(Date.now() - 180*24*3600*1000)` 计算（恰好180天以前的记录被删除）。[Spec §FR-016]

---

## US4 — 用户风控

- [x] CHK025 — ✅ **PASS** `AdminEndUserListItemDto` 含 wechatOpenId（不含手机号/邮箱）；`UserListView` 仅展示 nickname、status、orderCount，wechatOpenId 不在 UI 中渲染，实质脱敏。[Spec §FR-010]

- [x] CHK026 — ⚠️ **FAIL** `UserDetailView.vue` 仅展示 orderCount 和风控表单；`AdminEndUserDetailDto` 有 `recentOrders` 字段，但 UI **未展示「完成数、失败数、最近订单列表」**。→ 已修复（见 fix-chk026）[Spec §FR-011]

- [x] CHK027 — ⚠️ **待验证** 用户禁用服务（UserRiskControlService 等）为 stub；`AdminSessionService.deleteAllSessionsForUser` 方法存在，但禁用操作是否调用它需确认——spec 要求**不主动吊销**当前 session，应确认**未调用**该方法。[Spec §FR-012]

- [x] CHK028 — ⚠️ **待验证** 用户风控 service stub，无法确认禁用/限流操作是否自动写操作日志。[Spec §FR-013]

---

## US5 — 配置管理

- [x] CHK029 — ⚠️ **FAIL** `ApiConfigView.vue` 中 `openEditModal` 为 `console.log` 占位；**编辑弹窗未实现，连通性测试逻辑不存在**。→ 已修复（见 fix-chk029）[Spec §FR-017]

- [x] CHK030 — ✅ **PASS** `ApiConfigView` 展示 `maskedSecret`，无「显示明文」按钮；DTO 定义字段名已为 `maskedSecret`。[Spec §FR-017, FR-018]

- [x] CHK031 — ⚠️ **待验证** 引用核对开关关闭时前台阻断逻辑未实现；`isEnabled` 字段存在于 DTO，但前台调用引用接口前未检查开关。[Spec §FR-018]

- [x] CHK032 — ⚠️ **待验证** `SystemConfigDto.maintenanceMode` 字段存在，但后台/前台均未实现「新建草稿/支付阻断」逻辑。[Spec §FR-019]

- [x] CHK033 — ⚠️ **待验证** 配置更新时 `AdminConfigCacheService.invalidate` 是否被调用？`system-config.service.ts` 的 `set` 方法未调用缓存失效；两套配置服务（admin-config 和 system-config）各自为政，需统一。[Spec §SC-006]

---

## US6 — 统计看板

- [x] CHK034 — ⚠️ **FAIL** `DashboardFunnelDto` 仅有5个步骤字段（step1, step2, outlineConfirmed, paid, completed），**缺第6步**；`DashboardOverviewView.vue` 完全**未展示漏斗**，只有汇总卡片。→ 已修复（见 fix-chk034-035）[Spec §FR-020]

- [x] CHK035 — ⚠️ **FAIL** `DashboardFailureReasonsDto` DTO 已定义，但 `DashboardOverviewView.vue` **未展示失败原因分布**。→ 已修复（见 fix-chk034-035）[Spec §FR-020]

- [x] CHK036 — ✅ **PASS** `setRange` 切换后调用 `loadDashboard()`，overview 和 revenue 均重新请求对应 range 参数。[Spec §FR-020]

- [x] CHK037 — ✅ **PASS** `RevenueDistributionPanel.vue` 按 `productCode/productName` 维度拆分显示收入与订单数。[Spec §FR-021]

---

## US7 — 商品与支付

- [x] CHK038 — ✅ **PASS** `ProductForm.vue` 有 `aiRateThreshold` 字段（number, 可留空），留空时不传阈值；其他版本同一表单留空即不显示保障。[Spec §FR-022]

- [x] CHK039 — ⚠️ **待验证** `AdminOrderDetailDto` 有 `productSnapshotJson` 字段，但 in-memory stub 未实现下单时的快照写入逻辑；需确认全量 Prisma 实现时下单服务在支付完成后写入当时的商品数据副本。建议补充集成测试断言。[Spec §FR-022]

- [x] CHK040 — ⚠️ **待验证** `PaymentListView.vue` 存在（stub），支付记录含关联订单的逻辑需在 service 实现时确认。[Spec §FR-023]

---

## 安全与脱敏（横切关注点）

- [x] CHK041 — ✅ **PASS** `ForbiddenView.vue` 存在；`router/guards.ts` 在角色不满足时重定向到 `/forbidden`。[Spec §Edge Cases]

- [x] CHK042 — ⚠️ **待验证** 操作日志 `beforeJson`/`afterJson` 中配置相关变更若含 `secret` 字段可能明文记录。`admin-generation-job-command.service.ts` 的日志调用未含 secret，但配置修改日志路径需在 ApiConfig service 实现时强制脱敏。[Spec §FR-017]

- [x] CHK043 — ✅ **PASS** `BCRYPT_ROUNDS = 12`，`bcrypt.hash` 在 `createUser` 和 `changePassword` 均正确使用。[Spec §FR-014a]

---

## 并发与边界场景

- [x] CHK044 — ⚠️ **待验证** In-memory store 为 last-writer-wins；操作日志记录了每次变更（两人同时操作均产生日志记录，可追溯）。Prisma 实现时建议加乐观锁或 `updatedAt` 版本检查。[Spec §Edge Cases]

- [x] CHK045 — ⚠️ **待验证** 维护模式阻断前台新建草稿/支付的逻辑未实现（见 CHK032）。[Spec §Edge Cases]

---

## 性能与可用性（Advisory）

- [ ] CHK046 — 待基准测试：运营从登录到完成「找到并重试失败订单」流程 ≤3 分钟。目前 in-memory 无 DB 延迟，Prisma 实现后需压测。[Spec §SC-001]

- [ ] CHK047 — 待基准测试：看板时间范围切换 p99 ≤5s。同上，in-memory stub 下响应即时，实际 DB 聚合查询需评估。[Spec §SC-005]

- [ ] CHK048 — ✅ **Advisory PASS**（部分）：`AdminConfigCacheService` 提供 `invalidate` 方法，理论上 API 配置更新后可立即失效；但需与实际 update 逻辑串联确认（见 CHK033）。[Spec §SC-006]

---

## Notes

- 所有 `[X]` 完成项已内联附注 findings
- Advisory 项（CHK046-CHK048）标注「待基准测试」
- CHK039（快照不变性）建议补充集成测试断言，避免依赖人工 review
- **已立即修复的差异**：CHK001、CHK002、CHK005/CHK022、CHK009、CHK016、CHK019、CHK026、CHK029、CHK034/CHK035
- **需在 stub 服务全量实现时跟进**：CHK010、CHK012-CHK015、CHK027-CHK028、CHK031-CHK033、CHK039-CHK040、CHK042、CHK044-CHK045
