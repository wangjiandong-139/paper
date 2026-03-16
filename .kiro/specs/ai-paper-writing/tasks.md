# 实现计划：傻瓜式 AI 写论文

## 概述

按模块递进实现：共享类型 → Monorepo 脚手架 → 后端核心模块（认证、草稿、文献、提纲、订单、生成、改稿）→ 前端六步向导 → 集成联调。每个模块先写测试再实现（TDD），关键节点设置检查点。

---

## 任务列表

- [x] 1. 初始化 Monorepo 项目结构
  - 创建 `pnpm-workspace.yaml`，配置 `apps/web`、`apps/server`、`packages/shared` 三个工作区
  - 创建根 `package.json`，配置 ESLint、TypeScript 5.x、Prettier 共享配置
  - 初始化 `packages/shared`：配置 `tsconfig.json`，创建 `src/enums/index.ts`、`src/types/index.ts`、`src/dto/index.ts` 入口文件
  - 创建 `docker-compose.yml`，配置 PostgreSQL 16 + Redis 7 服务
  - _需求：1.7、11.3_

- [x] 2. 实现共享类型与枚举（packages/shared）
  - [x] 2.1 实现枚举定义
    - 在 `packages/shared/src/enums/index.ts` 中实现 `PlanType`、`OrderStatus`、`ChapterStatus`、`ReferenceSource`、`Language`、`DegreeType`、`RevisionType` 枚举
    - _需求：5.2、6.1、7.4_
  - [x]* 2.2 为枚举写属性测试
    - **Property 1：枚举值唯一性** — 所有枚举成员的字符串值在同一枚举内不重复
    - **Validates: 需求 5.2、7.4**
  - [x] 2.3 实现核心 DTO 与类型定义
    - 在 `packages/shared/src/types/index.ts` 中实现 `Step1Data`、`Step2Data`、`Step3Data`、`ReferenceItem`、`OutlineNode`、`GenerationProgressEvent`、`CitationItem`、`CitationCheckResultDTO`
    - _需求：2.1、3.1、4.1、6.1_
  - [x]* 2.4 为 OutlineNode 树结构写属性测试
    - **Property 2：OutlineNode 树深度约束** — 任意合法 OutlineNode 树的 level 值满足 1 ≤ level ≤ 3，且子节点 level 等于父节点 level + 1
    - **Validates: 需求 4.1**

- [x] 3. 初始化后端 NestJS 应用（apps/server）
  - 创建 NestJS 项目，配置 `tsconfig.json`（禁止 `any`，strict 模式）
  - 配置 Jest + Supertest 测试环境
  - 初始化 Prisma：创建 `prisma/schema.prisma`，定义 `User`、`Draft`、`Order`、`GeneratedChapter`、`Reference`、`FormatTemplate`、`SystemConfig` 七张表及关系
  - 创建初始迁移文件（需本地 Docker 环境启动后手动执行 `prisma migrate dev`）
  - 创建 `common/` 目录，实现 JWT 守卫（`JwtAuthGuard`）、全局异常过滤器、请求日志拦截器
  - _需求：1.7、11.1_

- [ ] 4. 实现认证模块（apps/server/src/modules/auth）
  - [x] 4.1 微信 OAuth 登录接口
    - 实现 `POST /api/auth/wechat`：接收微信 `code`，换取 `access_token`，获取 `wechat_open_id`，首次登录自动创建用户记录（幂等：同一 OpenID 不重复创建）
    - 返回 JWT（含 `userId`、`wechat_open_id`），有效期与刷新策略见 design.md §关键技术方案
    - _需求：11.1、11.2_
  - [x] 4.2 为微信登录写单元测试
    - Mock 微信 API 调用，验证首次登录创建用户、重复登录返回同一用户
    - _需求：11.1_
  - [x] 4.3 JWT 守卫集成测试
    - 验证无 token / 过期 token 返回 401，有效 token 正常放行
    - _需求：11.5_
  - [x] 4.4 实现用户信息初始化
    - 登录时同步微信昵称、头像到 `users` 表（`nickname`、`avatar_url`）
    - _需求：1.2_

- [x] 5. 检查点 — 认证模块
  - 验证：`POST /api/auth/wechat` 返回 JWT；JWT 守卫保护后续接口；用户记录正确写入数据库
  - 所有认证模块测试通过，覆盖率 ≥ 80%
  - _如有疑问请询问用户（ask the user if questions arise）_

- [x] 6. 实现用户模块（apps/server/src/modules/user）
  - [x] 实现 `PATCH /api/users/me`：允许用户更新昵称、头像等个人信息
  - [x] 实现 `GET /api/users/me`：返回当前登录用户信息
  - [x] 写单元测试：验证更新成功、未登录返回 401
  - _需求：1.2、1.3_

- [x] 7. 实现草稿模块（apps/server/src/modules/wizard）
  - [x] 7.1 草稿 CRUD 接口
    - 实现 `GET /api/drafts`（列表）、`POST /api/drafts`（创建）、`PATCH /api/drafts/:id/step/:n`（更新步骤数据）
    - 草稿步骤数据以 JSON 字段存储，支持步骤 1～3 数据独立保存
    - _需求：2.1、3.1、4.1_
  - [x] 7.2 草稿状态持久化测试
    - 验证步骤数据正确写入 `drafts.step_data` JSON 字段；验证多草稿并行互不干扰
    - _需求：2.1_
  - [x] 7.3 草稿软删除
    - 实现用户主动删除草稿（`DELETE /api/drafts/:id`），使用 `deleted_at` 软删除
    - _需求：2.1_

- [x] 8. 实现文献模块（apps/server/src/modules/reference）
  - [x] 8.1 文献推荐接口
    - 实现 `GET /api/references/suggest`：根据草稿标题、学科调用文献 API 适配器，返回推荐文献列表
    - _需求：3.1、3.2_
  - [x] 8.2 文献适配器实现
    - 在 `adapters/reference/` 实现知网/万方/维普适配器（中文）和 Semantic Scholar/CrossRef 适配器（英文），统一接口
    - _需求：3.2_
  - [x] 8.3 用户文献管理接口
    - 实现文献的增删改查（`POST /api/drafts/:id/references`、`DELETE /api/drafts/:id/references/:refId`）
    - 支持用户粘贴知网引文格式（每行一条）解析文献（`POST /api/references/parse`）
    - _需求：3.1、3.3、3.4_
  - [ ]* 8.5 DOI/URL 自动解析（P2）
    - 支持用户粘贴 DOI 或文献 URL 自动解析文献元数据，作为知网引文格式粘贴的补充能力
    - _需求：3.1_
  - [x] 8.4 文献模块单元测试
    - Mock 文献 API，验证推荐结果格式；验证知网引文格式解析逻辑
    - _需求：3.1、3.3_

- [x] 9. 实现提纲模块（apps/server/src/modules/outline）
  - [x] 9.1 AI 生成提纲接口
    - 实现 `POST /api/outlines/generate`：接收 `draft_id`，调用 AI 适配器，基于步骤 1 信息和确认文献生成提纲，流式返回（SSE）
    - _需求：4.1、4.2_
  - [x] 9.2 提纲保存与编辑接口
    - 实现 `PATCH /api/drafts/:id/outline`：保存用户编辑后的提纲（`OutlineNode[]` 结构）
    - _需求：4.3_
  - [x] 9.3 提纲 AI 提示词
    - 在 `prompts/outline.prompt.ts` 实现提纲生成提示词，支持学科、字数、学历类型参数注入
    - _需求：4.1_
  - [x] 9.4 提纲模块单元测试
    - Mock AI 适配器，验证提纲结构符合 `OutlineNode` 类型约束；验证 SSE 流式输出格式
    - _需求：4.1、4.2_

- [x] 10. 检查点 — 后端基础模块
  - 验证：草稿、文献、提纲三个模块接口全部可用；AI 适配器 Mock 测试通过（OpenAI stub）
  - 测试套件 12 个，测试用例 97 个，100% 通过；语句覆盖率 99.25%，分支覆盖率 84%，均 ≥ 80%
  - 注：当前使用内存存储，Prisma + PostgreSQL 集成将在后续任务中完成
  - _如有疑问请询问用户（ask the user if questions arise）_

- [x] 11. 实现格式模板模块（apps/server/src/modules/template）
  - [x] 11.1 模板管理接口
    - 实现 `GET /api/templates`（列表，支持 keyword 搜索）、`GET /api/templates/:id`（详情）
    - 运营后台 `POST /api/admin/templates`（创建）、`PATCH /api/admin/templates/:id`（更新）、`DELETE /api/admin/templates/:id`（软删除）
    - 内置「国标/通用」默认模板（isDefault=true，GB/T 7714 引文格式）
    - _需求：8.1、8.2、8.4_
  - [x] 11.2 模板解析逻辑
    - 实现 `TemplateParserService.buildConfig()`：支持自定义 margins、font、lineSpacing、citationFormat，未提供字段使用国标默认值
    - 实现 `TemplateParserService.parseWordBuffer()`：从 Word 文件 Buffer 提取排版参数（当前返回默认值，可通过 mammoth 等库扩展）
    - 支持 GB/T 7714、APA、MLA 三种引文著录格式，存入 `config.citationFormat` 字段
    - 写单元测试 27 个，覆盖 CRUD、关键词搜索、软删除、引文格式解析，全部通过
    - _需求：8.1、8.5_

- [x] 12. 实现系统配置模块与查重适配器（apps/server/src/modules/admin）
  - [x] 12.1 系统配置接口
    - 实现 `GET /api/admin/system-configs`、`PATCH /api/admin/system-configs/:key`：运营后台管理查重服务商、AI 提供商等配置
    - 预置键：`plagiarism_provider`（默认 wanfang）、`ai_provider`（默认 openai）；`key` 唯一，只更新不删除
    - 接口受 JwtAuthGuard 保护
    - _需求：7.6、8.2_
  - [x] 12.2 查重适配器实现
    - 在 `adapters/plagiarism/` 实现 `IPlagiarismAdapter` 接口（`check(content) → PlagiarismResultDTO`）
    - 实现 `WanfangPlagiarismAdapter`、`CnkiPlagiarismAdapter`、`VipinfoPlagiarismAdapter` 三个存根适配器
    - `PlagiarismService` 在每次调用前读取 `SystemConfigService.get('plagiarism_provider')` 动态选择适配器
    - _需求：7.6_
  - [x] 12.3 系统配置单元测试
    - 验证配置预置值、读写、未知 key 抛错；验证三个适配器均返回正确 provider 和 similarityRate；验证 PlagiarismService 适配器切换逻辑、无效 provider 抛错
    - 新增 17 个单元测试，全部通过
    - _需求：7.6、8.2_

- [x] 13. 实现订单与支付模块（apps/server/src/modules/order）
  - [x] 13.1 创建订单接口
    - 实现 `POST /api/orders`：根据草稿 ID 和套餐类型创建订单，仅支持 `PlanType.BASIC`（9900 分 = 99 元）
    - 返回 `{ orderId, payParams }` 含微信 JSAPI 支付参数
    - _需求：5.1、5.2_
  - [x] 13.2 微信支付集成
    - 在 `adapters/payment/` 实现 `IPaymentAdapter` 接口 + `WechatPaymentAdapter` 存根
    - 支持 JSAPI（H5）和 Native 扫码支付两种模式
    - 实现 `POST /api/orders/:id/wechat-pay/notify` 支付回调（无 JWT 保护）
    - _需求：5.3、5.4_
  - [x] 13.3 订单状态管理
    - 状态流转：`PENDING_PAYMENT` → `GENERATING` → `COMPLETED` / `FAILED`（严格对齐枚举）
    - 支付回调验签成功后直接置为 `GENERATING`（无 PAID 中间状态）
    - 提供 `markOrderCompleted()` / `markOrderFailed()` 供生成模块调用
    - _需求：5.5_
  - [x] 13.4 订单列表接口
    - 实现 `GET /api/orders`（列表）、`GET /api/orders/:id`（详情），用户数据严格隔离
    - _需求：5.6_
  - [x] 13.5 支付模块单元测试
    - Mock 微信支付适配器，验证 JSAPI 参数生成、回调验签成功/失败、状态流转
    - _需求：5.3、5.4_
  - [x] 13.6 支付安全测试
    - 验证重复回调幂等（GENERATING/COMPLETED 状态均返回 true 不重复处理）
    - 验证金额被篡改时回调返回 false 且订单状态不变
    - 新增 21 个单元测试，全部通过
    - _需求：5.4_

- [x] 14. 检查点 — 订单与支付模块
  - 验证：订单创建、微信支付回调、状态流转全链路可用；支付安全测试通过
  - 15 个测试套件，162 个测试，100% 通过
  - _如有疑问请询问用户（ask the user if questions arise）_

- [x] 15. 实现后台生成任务（apps/server/src/modules/generation）
  - [x] 15.1 BullMQ 任务队列配置
    - 实现 `GenerationQueueService`（内存 FIFO 队列，BullMQ 存根）：支持幂等入队（同一 orderId 不重复）、FIFO 出队
    - _需求：6.1_
  - [x] 15.2 按章生成逻辑
    - `GenerationWorkerService.processJob()`：提取 level=1 顶层章节，逐章调用 AI 适配器，保存 `GeneratedChapterDTO`，全部完成返回 `COMPLETED`
    - _需求：6.2、6.3_
  - [x] 15.3 引用注入逻辑
    - `buildGenerationUserPrompt()` 将 `references` 列表以 `[n] 作者. 标题.` 格式注入提示词；`buildGenerationSystemPrompt()` 明确要求 AI 仅从提供文献中引用
    - _需求：6.4、3.5_
  - [x] 15.4 生成进度 SSE 接口
    - `GET /api/orders/:id/progress`（SSE）：基于 EventEmitter 推送 `GenerationProgressEvent`（含 order_id、total_chapters、completed_chapters、current_chapter、status）
    - _需求：6.5_
  - [x] 15.5 生成提示词管理
    - `prompts/generation.prompt.ts`：`buildGenerationSystemPrompt()` + `buildGenerationUserPrompt()`，支持章节标题、字数、文献列表、子节标题注入
    - _需求：6.2、6.4_
  - [x] 15.6 生成任务单元测试
    - Mock AI 适配器，验证按章顺序生成、引用注入到提示词、进度事件格式
    - _需求：6.2、6.4、6.5_
  - [x] 15.7 生成任务失败重试测试
    - `MAX_RETRIES=3`：首次失败后最多重试 3 次（共 4 次调用）；全部失败后章节状态为 FAILED，整体 finalStatus 为 FAILED；第一章失败后不再生成后续章节（快速失败）
    - 新增 22 个单元测试，全部通过
    - _需求：6.6_
  - [ ]* 15.8 微信消息通知（P2）
    - _需求：6.8_

- [x] 16. 实现改稿模块（apps/server/src/modules/revision）
  - [x] 16.1 改稿内容保存接口
    - 实现 `PATCH /api/orders/:id/revision`：保存用户手动编辑的论文内容（HTML/JSON），用户隔离，多次保存覆盖旧内容
    - _需求：7.1_
  - [x] 16.2 AI 改稿接口
    - 实现 `POST /api/orders/:id/revision/ai`：统一处理六种 `RevisionType`（REWRITE、REDUCE_PLAGIARISM、REDUCE_AI、EXPAND、SHRINK、POLISH），流式返回（SSE）；每次调用计入 `aiRevisionCount`
    - BASIC 套餐限制 3 次，超限抛出 ForbiddenException（403）
    - 提示词注入原始内容、RevisionType 指令、可选指定修改意见；REWRITE/REDUCE_PLAGIARISM 时额外注入文献列表
    - _需求：7.2、7.3、7.4_
  - [x] 16.3 引用核对接口
    - 实现 `POST /api/orders/:id/citation-check`：正则扫描 `[n]` / `[n,m]` 引用，按序号与文献列表比对，返回 `CitationCheckResultDTO`（traceable / untraceable 两组）
    - _需求：7.5_
  - [ ]* 16.4 加图/表接口（P2）
    - _需求：7.6_
  - [x] 16.5 改稿模块单元测试
    - 验证六种 RevisionType 均计入次数；BASIC 套餐第 4 次抛 ForbiddenException；SSE 流式输出正确；引用核对 traceable/untraceable 分类；未保存内容时返回空
    - 新增 19 个单元测试，全部通过
    - _需求：7.3、7.4_

- [ ] 17. 实现 Word/PDF 文件生成与下载（apps/server/src/modules/revision）
  - [ ] 17.1 Word 文件生成
    - 实现 `POST /api/orders/:id/download`：将最终论文内容按格式模板渲染为 `.docx` 文件，返回下载链接
    - 使用 `docx` 或 `officegen` 库，应用 `FormatTemplate` 中的页边距、字体、行距参数
    - _需求：8.1、8.2_
  - [ ] 17.2 PDF 导出（可选）
    - 在 Word 生成完成后，通过 LibreOffice headless 或第三方服务转换为 PDF
    - _需求：8.3_

- [ ] 18. 检查点 — 后端全模块
  - 验证：所有后端模块接口联调通过；生成→改稿→下载全链路可用；核心模块覆盖率 ≥ 80%
  - _如有疑问请询问用户（ask the user if questions arise）_

- [ ] 19. 初始化前端 Vue 3 应用（apps/web）
  - 创建 Vite + Vue 3 + TypeScript 项目，配置 TailwindCSS、Vant 4、Pinia（含 pinia-plugin-persistedstate）
  - 配置 Vue Router，定义六步向导路由（`/wizard/1` ～ `/wizard/6`）、登录页、订单列表页
  - 配置 Vitest 测试环境
  - 实现 `useAuthStore`：存储 JWT token，配置 axios 拦截器自动附加 Authorization 头
  - _需求：1.1、1.3_

- [ ] 20. 实现登录页与首次引导（apps/web/src/views/auth）
  - [ ] 20.1 微信登录页面
    - 实现 `LoginView.vue`：移动端显示微信授权按钮，PC 端显示微信扫码登录二维码
    - 登录成功后跳转至草稿列表或上次未完成的向导步骤
    - _需求：1.1、1.2_
  - [ ] 20.2 首次引导（Onboarding）
    - 实现 `components/common/OnboardingGuide.vue`：≤ 5 屏，每屏一句话说明主流程步骤，提供「跳过」和「下一步」按钮，最后一屏点击「开始写论文」进入步骤 1
    - 配置路由守卫：已登录且 `onboarding_completed = false` 时跳转 `/onboarding`；完成或跳过后调用 `PATCH /api/users/me` 将 `onboarding_completed` 置为 `true`
    - _需求：1.5_
  - [ ] 20.3 登录状态守卫
    - 配置 Vue Router 导航守卫：未登录用户访问向导页自动跳转登录页
    - _需求：1.3_
  - [ ] 20.4 登录页单元测试
    - 验证登录成功跳转逻辑；验证未登录守卫重定向；验证 Onboarding 完成后不再展示
    - _需求：11.1、11.5、1.5_

- [ ] 21. 实现步骤 1 基础信息表单（apps/web/src/views/wizard/Step1BasicInfo.vue）
  - [ ] 21.1 表单字段实现
    - 实现学科选择、论文标题输入、语言选择（中/英）、学历类型选择、目标字数输入、学校/格式模板选择
    - 使用 Vant 4 表单组件，移动端触摸热区 ≥ 44pt
    - _需求：2.1、2.2_
  - [ ] 21.2 表单校验
    - 实现必填项校验（标题、学科、字数）；字数范围校验（3000～100000）
    - _需求：2.3_
  - [ ] 21.3 智能选题（P2）*
    - 实现 AI 辅助选题建议功能：用户输入研究方向，AI 返回候选标题列表
    - _需求：2.4_
  - [ ] 21.4 开题报告解析（P2）*
    - 实现上传开题报告文件（PDF/Word），AI 自动提取标题、学科、提纲信息预填表单
    - _需求：2.5_
  - [ ] 21.5 步骤数据持久化
    - 表单提交时调用 `PATCH /api/drafts/:id/step/1`，保存到服务端；Pinia store 同步缓存
    - _需求：2.1_
  - [ ] 21.6 步骤 1 单元测试
    - 验证表单校验逻辑；验证数据提交与持久化
    - _需求：2.1、2.3_

- [ ] 22. 实现步骤 2 参考文献管理（apps/web/src/views/wizard/Step2References.vue）
  - [ ] 22.1 文献推荐列表
    - 调用 `GET /api/references/suggest`，展示推荐文献卡片（标题、作者、年份、来源）；支持一键添加
    - _需求：3.1、3.2_
  - [ ] 22.2 手动添加文献
    - 支持粘贴知网引文格式（每行一条，提供格式示例）；支持上传题录文件（PDF/Word）；支持手动填写文献信息
    - _需求：3.1_
  - [ ] 22.3 文献列表管理
    - 已选文献列表支持拖拽排序、删除；显示文献总数（建议 10～30 篇）
    - _需求：3.4_
  - [ ] 22.4 引文格式解析异常处理
    - 实现粘贴知网引文格式时的解析异常标注：异常条目高亮显示并提示用户修改，不允许将格式异常文献加入确认列表
    - _需求：3.6_
  - [ ] 22.5 文献确认弹窗
    - 实现文献数量满足建议后点击「下一步」弹出确认弹窗：列表展示已选文献标题、作者、来源，提供「返回修改」和「确认」按钮
    - _需求：3.4、3.5_
  - [ ] 22.6 步骤 2 单元测试
    - 验证文献添加/删除逻辑；验证引文格式解析异常标注；验证确认弹窗触发条件
    - _需求：3.4、3.6_

- [ ] 23. 实现步骤 3 提纲编辑器（apps/web/src/views/wizard/Step3Outline.vue）
  - [ ] 23.1 AI 生成提纲触发
    - 进入步骤 3 时自动调用 `POST /api/outlines/generate`，SSE 流式展示生成过程
    - _需求：4.1、4.2_
  - [ ] 23.2 提纲树形编辑器
    - 实现可拖拽排序的树形提纲编辑器（章节/小节/子节，最多 3 级）；支持增删改节点
    - _需求：4.3_
  - [ ] 23.3 提纲保存
    - 用户确认提纲后调用 `PATCH /api/drafts/:id/outline`，保存到服务端
    - _需求：4.3_
  - [ ] 23.4 重新生成提纲
    - 提供「重新生成」按钮，重新调用 AI 生成（覆盖当前提纲，需二次确认）
    - _需求：4.4_
  - [ ] 23.5 提纲确认弹窗
    - 实现点击「下一步」时弹出确认弹窗：展示已标记的图/表/公式/代码数量、预估生成字数，提供「返回修改」和「确定」按钮；点击「确定」后锁定提纲进入步骤 4
    - _需求：4.7、4.8_
  - [ ] 23.6 步骤 3 单元测试
    - 验证 SSE 流式接收与渲染；验证提纲节点增删改逻辑；验证确认弹窗数据统计
    - _需求：4.1、4.3、4.7_

- [ ] 24. 实现步骤 4 预览与支付（apps/web/src/views/wizard/Step4Payment.vue）
  - [ ] 24.1 论文预览摘要
    - 展示步骤 1～3 的汇总信息（标题、字数、文献数、提纲章节数）供用户确认
    - _需求：5.1_
  - [ ] 24.2 套餐选择与支付
    - 展示当前可用套餐（基础版）及价格；调用 `POST /api/orders` 创建订单
    - 移动端调起微信 JSAPI 支付；PC 端展示 Native 扫码支付二维码
    - _需求：5.2、5.3_
  - [ ] 24.3 支付结果处理
    - 支付成功后自动跳转步骤 5；支付失败展示错误提示，支持重试
    - _需求：5.5_

- [ ] 25. 实现步骤 5 生成中页面（apps/web/src/views/wizard/Step5Generating.vue）
  - [ ] 25.1 生成进度展示
    - 连接 `GET /api/orders/:id/progress`（SSE），实时展示当前生成章节、总进度百分比
    - _需求：6.5_
  - [ ] 25.2 生成完成跳转
    - 收到全部章节完成事件后，自动跳转步骤 6；展示完成动画
    - _需求：6.3_
  - [ ] 25.3 网络中断重连
    - SSE 断线后自动重连，恢复进度展示；不丢失已生成章节状态
    - _需求：6.6_

- [ ] 26. 检查点 — 前端步骤 1～5
  - 验证：六步向导步骤 1～5 在移动端竖屏下完整可用；支付流程端到端可跑通；进度 SSE 正常推送
  - _如有疑问请询问用户（ask the user if questions arise）_

- [ ] 27. 实现步骤 6 改稿编辑器（apps/web/src/views/wizard/Step6Revision.vue）
  - [ ] 27.1 Tiptap 富文本编辑器集成
    - 集成 Tiptap，加载生成的论文全文（HTML/JSON 格式），支持手动编辑
    - _需求：7.1_
  - [ ] 27.2 AI 改稿功能
    - 选中段落后触发 AI 改稿，调用 `POST /api/orders/:id/revision/ai`，SSE 流式替换选中内容
    - 显示剩余改稿次数（基础版 3 次）
    - _需求：7.2、7.3_
  - [ ] 27.3 降 AI 痕迹功能
    - 选中段落后触发降 AI 痕迹，调用 `POST /api/orders/:id/revision/ai`（传入 `type: REDUCE_AI`），SSE 流式替换
    - _需求：7.4_
  - [ ] 27.4 加图/表功能（P2）*
    - 实现插入 AI 生成图表的入口，调用 `/revision/figure` 或 `/revision/table`；不计入改稿次数
    - _需求：7.6_
  - [ ] 27.5 引用核对面板
    - 调用 `POST /api/orders/:id/citation-check`，展示引用核对结果，高亮问题引用
    - _需求：7.5_
  - [ ] 27.6 查重入口
    - 提供「发起查重」按钮，展示查重报告链接或结果摘要
    - _需求：7.7_
  - [ ] 27.7 下载论文
    - 调用 `POST /api/orders/:id/download`，下载前检查用户是否已查看引用核对结果与查重结果；若未查看任一结果则阻止下载并提示；确认后生成 Word 文件提供下载链接
    - _需求：7.7、7.8、8.1、8.2_
  - [ ] 27.8 改稿内容自动保存
    - 实现 Tiptap 编辑器内容变更后自动保存（防抖 2 秒），调用 `PATCH /api/orders/:id/revision`；页面刷新或意外关闭后内容不丢失
    - _需求：7.9_
  - [ ] 27.9 步骤 6 单元测试
    - 验证改稿次数计数展示；验证 SSE 流式内容替换；验证下载前拦截逻辑；验证自动保存防抖触发
    - _需求：7.2、7.3、7.7、7.9_

- [ ] 28. 实现订单列表页（apps/web/src/views/orders）
  - 实现 `OrdersView.vue`：展示用户所有订单，含状态（生成中/已完成）、套餐、创建时间
  - 点击订单可跳转至对应向导步骤（未完成草稿跳步骤 1，生成中跳步骤 5，已完成跳步骤 6）
  - _需求：5.6_

- [ ] 29. 实现向导进度条组件（apps/web/src/components/wizard）
  - 实现 `WizardProgress.vue`：顶部固定显示当前步骤（1/6 ～ 6/6），支持点击已完成步骤回退
  - 移动端触摸热区 ≥ 44pt，适配竖屏布局
  - _需求：2.1、11.4_

- [ ] 30. 检查点 — 前端全模块
  - 验证：所有六步向导页面在移动端和 PC 端均可正常使用；订单列表、进度条组件正常
  - 前端 Vitest 测试全部通过，核心模块覆盖率 ≥ 80%
  - _如有疑问请询问用户（ask the user if questions arise）_

- [ ] 31. E2E 测试（Playwright）
  - [ ] 31.1 完整向导流程 E2E
    - 模拟用户从登录 → 步骤 1 填写 → 步骤 2 添加文献 → 步骤 3 确认提纲 → 步骤 4 支付（Mock）→ 步骤 5 等待生成 → 步骤 6 下载
    - _需求：全流程_
  - [ ] 31.2 移动端视口测试
    - 在 375×812（iPhone 14）视口下运行完整向导流程，验证触摸热区和布局
    - _需求：11.4_
  - [ ] 31.3 网络中断恢复测试
    - 模拟步骤 5 生成中网络中断，验证重连后进度恢复
    - _需求：6.6_
  - [ ] 31.4 支付回调 E2E
    - 模拟微信支付回调，验证订单状态更新和页面跳转
    - _需求：5.4、5.5_

- [ ] 32. 最终检查点
  - 验证：所有单元测试、集成测试、E2E 测试通过；核心模块覆盖率 ≥ 80%；无 ESLint 错误；无 TypeScript `any`
  - 验证：完整向导流程在移动端和 PC 端均可端到端跑通
  - _如有疑问请询问用户（ask the user if questions arise）_

---

## 备注

- 标 `*` 的任务为 P2 功能，在 P0/P1 全部完成后再实现
- 当前仅支持基础版套餐（`PlanType.BASIC`）；AI 率保障版和无限改稿版套餐代码预留枚举值，暂不实现业务逻辑
- 所有 AI 调用均通过 `adapters/ai/` 适配器层，禁止在 Controller 或 UI 层直接调用
- 提示词统一在 `prompts/` 目录管理，变更需经过回归测试
- 数据库迁移需在本地 Docker 环境启动后手动执行 `pnpm prisma migrate dev`
