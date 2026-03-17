## 1. 后端：新增配置 Key 与公开配置接口（TDD）

- [x] 1.1 在 `system-config.service.ts` 的 `ALLOWED_KEYS` 与 `PRESETS` 中新增 `min_reference_count`（默认值 `"1"`，description: 「步骤 2 最低文献数量，正整数，默认 1」），并验证写入时值必须为正整数（非法值返回 400）
- [ ] 1.2 为 1.1 编写单元测试：读取默认值为 `1`、写入合法值成功、写入非正整数返回 400
- [x] 1.3 新增 `PublicConfigController`（路由 `GET /api/config/public`，无鉴权），返回 `PublicConfigDto { minReferenceCount: number; maintenanceMode: boolean }`，从 `system-config.service` 读取并组装
- [ ] 1.4 为 1.3 编写集成测试：GET 请求返回 200、字段类型正确、`min_reference_count` 默认为 1、admin 修改后接口返回新值

## 2. 共享类型（packages/shared）

- [x] 2.1 在 `packages/shared` 新增 `PublicConfigDto { minReferenceCount: number; maintenanceMode: boolean }`（路径建议 `dto/public-config.dto.ts`，导出至 `src/index.ts`）
- [x] 2.2 在 `SystemConfigDto`（`admin-config.dto.ts`）补充 `minReferenceCount: number` 字段，与后端返回对齐

## 3. 前台：Step2 验证逻辑替换（TDD）

- [x] 3.1 在 `wizard store`（或专用 composable `usePublicConfig`）中新增 `fetchPublicConfig()` 方法，调用 `GET /api/config/public`，将结果存入 store state `publicConfig`；编写单元测试：成功时 `minReferenceCount` 写入 store，接口异常时降级为默认值 1
- [x] 3.2 在 `Step2.vue`（或 `ReferenceManager` 组件/composable）中将按学历类型的硬编码阈值全部移除，改为仅使用 `publicConfig.minReferenceCount` 这一固定值：`selectedCount < minReferenceCount` 时禁用「下一步」并展示「请至少添加 ${minReferenceCount} 篇文献」；不再展示或依赖学历区间建议文案
- [ ] 3.3 为 Step2 的验证逻辑编写组件测试：minReferenceCount=1 时选 1 篇即可进入下一步；minReferenceCount=10 时选 9 篇按钮置灰并显示「请至少添加 10 篇文献」

## 4. Admin UI：全局参数页新增字段

- [x] 4.1 在 `SystemConfigView.vue` 的表单中新增 `minReferenceCount` 数字输入框（label 「最低文献数量」，min=1，整数），读取现有 `GET /api/admin/system-configs`（或 public API）的值并回填，保存时调用 `PATCH /api/admin/system-configs/min_reference_count`
- [ ] 4.2 为 4.1 编写组件测试：页面加载时回填当前值；输入新值保存后 API 被调用；输入 0 或负数时显示校验错误，阻止提交

## 5. 端到端验证（可选 E2E 或人工核查）

- [ ] 5.1 Admin 将 `minReferenceCount` 设为 3，前台步骤 2 选 2 篇时「下一步」置灰且显示「请至少添加 3 篇文献」；选满 3 篇后按钮变为可用——核查通过后在此处打钩
- [ ] 5.2 Admin 将 `minReferenceCount` 恢复默认值 1，前台选 1 篇即可进入下一步——回归验证
