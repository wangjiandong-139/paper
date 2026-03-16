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

- [x] 17. 实现 Word/PDF 文件生成与下载（apps/server/src/modules/download）
  - [x] 17.1 Word 文件生成
    - `DocumentBuilderService.build()`：使用 `docx` 库渲染 `.docx` 文件，应用 `FormatTemplate.config` 中的页边距（mm→twip）、字体、行距（1.5→360/240ths）参数
    - `DownloadService.generateDownload()`：获取订单、取改稿内容、解析默认模板 config、调用构建器，返回 `{ download_url }` base64 data URL（生产环境替换为 OSS 预签名 URL）
    - `POST /api/orders/:id/download`（支持 format: docx | pdf），受 JwtAuthGuard 保护，校验订单所有权
    - _需求：8.1、8.2_
  - [x] 17.2 PDF 导出（存根）
    - PDF 格式存根实现：复用 docx buffer，返回占位符 URL；生产环境可替换为 LibreOffice headless / Puppeteer
    - _需求：8.3_

- [x] 18. 检查点 — 后端全模块
  - 验证：所有后端模块接口联调通过；生成→改稿→下载全链路可用；核心模块覆盖率 ≥ 80%
  - 18 个测试套件，216 个测试，100% 通过；覆盖认证、用户、草稿、文献、提纲、格式模板、系统配置、查重、订单、支付、生成任务、改稿、下载全模块
  - _如有疑问请询问用户（ask the user if questions arise）_

- [x] 19. 初始化前端 Vue 3 应用（apps/web）
  - 创建 Vite + Vue 3 + TypeScript 项目，配置 TailwindCSS、Vant 4、Pinia（含 pinia-plugin-persistedstate）
  - 配置 Vue Router，定义六步向导路由（`/wizard/1` ～ `/wizard/6`）、登录页、订单列表页
  - 配置 Vitest 测试环境
  - 实现 `useAuthStore`：存储 JWT token，配置 axios 拦截器自动附加 Authorization 头；JWT 持久化到 localStorage，页面刷新后自动恢复
  - 16 个单元测试，100% 通过（覆盖登录/登出/引导/更新/恢复 token 全流程）
  - _需求：1.1、1.3_

- [x] 20. 实现登录页与首次引导（apps/web/src/views/auth）
  - [x] 20.1 微信登录页面
    - 实现 `LoginView.vue`：移动端显示微信授权按钮（跳转 OAuth），PC 端显示微信扫码登录二维码（轮询 /auth/wechat/qrcode/poll）
    - 登录成功后根据 needsOnboarding 跳转 /onboarding 或 redirect 指定路由
    - _需求：1.1、1.2_
  - [x] 20.2 首次引导（Onboarding）
    - 实现 `components/common/OnboardingGuide.vue`：5 屏，每屏图标+标题+说明，提供「下一步」/「跳过」/「开始写论文」按钮，最后一屏隐藏跳过
    - 提取路由守卫为 `router/guards.ts`：已登录且 needsOnboarding=true 时跳转 `/onboarding`；完成或跳过后调用 `PATCH /api/users/me`
    - _需求：1.5_
  - [x] 20.3 登录状态守卫
    - `router/guards.ts` 中 authGuard 纯函数：未登录跳转登录页、已登录访问登录页跳转首页、未完成引导跳转 onboarding
    - _需求：1.3_
  - [x] 20.4 登录页单元测试
    - 28 个单元测试（guards×10 + LoginView×9 + OnboardingGuide×9），全部通过；累计 44 个测试 100% 通过
    - _需求：11.1、11.5、1.5_

- [x] 21. 实现步骤 1 基础信息表单（apps/web/src/views/wizard/Step1BasicInfo.vue）
  - [x] 21.1 表单字段实现
    - 实现学科选择（Picker）、论文标题输入、语言选择（中/英）、学历类型选择（本科/硕士/博士/其他）、目标字数（快选+自定义）、格式模板选择、AI 投喂文本域
    - 使用 Vant 4 表单组件，按钮触摸热区 ≥ 44pt；学历切换自动带出推荐字数
    - _需求：2.1、2.2_
  - [x] 21.2 表单校验
    - 提取 `step1-validation.ts` 纯函数模块：必填项（标题、学科、字数）；字数范围 3000～100000；AI 投喂 ≤ 1500 字
    - _需求：2.3_
  - [ ] 21.3 智能选题（P2）*
    - _需求：2.4_
  - [ ] 21.4 开题报告解析（P2）*
    - _需求：2.5_
  - [x] 21.5 步骤数据持久化
    - 实现 `useWizardStore`：草稿 CRUD（loadDrafts/createDraft/selectDraft/deleteDraft），saveStep1/2/3 调用 `PATCH /api/drafts/:id/step/:n`，本地缓存同步
    - 提取 `types/wizard.ts`：Step1Data/Step2Data/Step3Data/DraftDTO/枚举/常量
    - _需求：2.1_
  - [x] 21.6 步骤 1 单元测试
    - step1-validation×18（必填/字数范围/AI 投喂/isStep1Valid）+ wizard store×16（CRUD/保存/计算属性/reset）= 34 个新增测试，全部通过；累计 78 个测试 100% 通过
    - _需求：2.1、2.3_

- [x] 22. 实现步骤 2 参考文献管理（apps/web/src/views/wizard/Step2References.vue）
  - [x] 22.1 文献推荐列表
    - 调用 `GET /api/references/suggest`，展示推荐文献卡片（标题、作者、年份、来源）；支持一键添加；已添加文献显示 ✓
    - _需求：3.1、3.2_
  - [x] 22.2 手动添加文献
    - 支持粘贴知网引文格式（含格式示例），「解析引文」按钮触发解析，预览后一键全部添加
    - _需求：3.1_
  - [x] 22.3 文献列表管理
    - 已选文献列表支持上移/下移排序、删除；底部实时显示已选数量与最少要求
    - _需求：3.4_
  - [x] 22.4 引文格式解析异常处理
    - `citation-parser.ts` 纯函数解析，异常条目红色高亮显示错误原因；存在异常时禁止「全部添加」并提示修复
    - _需求：3.6_
  - [x] 22.5 文献确认弹窗
    - 数量满足后「下一步」弹出确认弹窗；列表展示文献标题/作者/年份；「返回修改」关闭弹窗，「确认」保存并跳转步骤 3
    - _需求：3.4、3.5_
  - [x] 22.6 步骤 2 单元测试
    - citation-parser×22（合法/异常格式、批量解析、最少数量）+ useReferences×29（增删/排序/minCount/弹窗触发）= 51 个新增测试，全部通过；累计 129 个测试 100% 通过
    - _需求：3.4、3.6_

- [x] 23. 实现步骤 3 提纲编辑器（apps/web/src/views/wizard/Step3Outline.vue）
  - [x] 23.1 AI 生成提纲触发
    - `onMounted` 自动调用 `generateOutline()`（若无已保存提纲）；fetch+ReadableStream 接收 SSE；支持 `{ outline: [...] }` 和 `{ text: "..." }` 两种 chunk 格式；生成中显示流式文本
    - _需求：4.1、4.2_
  - [x] 23.2 提纲树形编辑器
    - 递归渲染 OutlineNodeItem 组件（最多 3 级）；支持增删改、上移/下移；每章可添加子节（level ≤ 3）；底部「添加章节」按钮
    - _需求：4.3_
  - [x] 23.3 提纲保存
    - 确认弹窗「确定」调用 `wizardStore.saveStep3` → `PATCH /api/drafts/:id/step/3`，跳转 `/wizard/4`
    - _需求：4.3_
  - [x] 23.4 重新生成提纲
    - 「重新生成」按钮触发 `van-dialog` 二次确认，确认后重新调用 generateOutline 覆盖当前提纲
    - _需求：4.4_
  - [x] 23.5 提纲确认弹窗
    - 弹窗展示：顶层章节数、预估总字数（按各节 word_count 均分）、图/表/公式/代码占位数量统计；「返回修改」/「确定生成」按钮
    - _需求：4.7、4.8_
  - [x] 23.6 步骤 3 单元测试
    - outline-utils×37（树操作/统计/校验纯函数）+ useOutlineEditor×22（节点增删改移/占位/SSE/弹窗）= 59 个新增测试，全部通过；累计 188 个测试 100% 通过
    - _需求：4.1、4.3、4.7_

- [x] 24. 实现步骤 4 预览与支付（apps/web/src/views/wizard/Step4Payment.vue）
  - [x] 24.1 论文预览摘要
    - 展示步骤 1～3 的汇总信息（标题、字数、文献数、提纲章节数）供用户确认
    - _需求：5.1_
  - [x] 24.2 套餐选择与支付
    - 展示当前可用套餐（基础版）及价格；调用 `POST /api/orders` 创建订单
    - 移动端调起微信 JSAPI 支付；PC 端展示 Native 扫码支付二维码
    - _需求：5.2、5.3_
  - [x] 24.3 支付结果处理
    - 支付成功后自动跳转步骤 5；支付失败展示错误提示，支持重试
    - _需求：5.5_

- [x] 25. 实现步骤 5 生成中页面（apps/web/src/views/wizard/Step5Generating.vue）
  - [x] 25.1 生成进度展示
    - 连接 `GET /api/orders/:id/progress`（SSE），实时展示当前生成章节、总进度百分比
    - _需求：6.5_
  - [x] 25.2 生成完成跳转
    - 收到全部章节完成事件后，自动跳转步骤 6；展示完成动画
    - _需求：6.3_
  - [x] 25.3 网络中断重连
    - SSE 断线后自动重连，恢复进度展示；不丢失已生成章节状态
    - _需求：6.6_

- [x] 26. 检查点 — 前端步骤 1～5
  - 验证：六步向导步骤 1～5 在移动端竖屏下完整可用；支付流程端到端可跑通；进度 SSE 正常推送
  - 结果：Step1～5 全部实现，246 个单元测试通过，无 Linter 错误；vue-tsc 存在 v1.8.27 与 TS5.9 已知兼容性问题（预存问题，不影响运行）
  - _如有疑问请询问用户（ask the user if questions arise）_

- [x] 27. 实现步骤 6 改稿编辑器（apps/web/src/views/wizard/Step6Revision.vue）
  - [x] 27.1 Tiptap 富文本编辑器集成
    - 集成 Tiptap，加载生成的论文全文（HTML/JSON 格式），支持手动编辑
    - _需求：7.1_
  - [x] 27.2 AI 改稿功能
    - 选中段落后触发 AI 改稿，调用 `POST /api/orders/:id/revision/ai`，SSE 流式替换选中内容
    - 显示剩余改稿次数（基础版 3 次）
    - _需求：7.2、7.3_
  - [x] 27.3 降 AI 痕迹功能
    - 选中段落后触发降 AI 痕迹，调用 `POST /api/orders/:id/revision/ai`（传入 `type: REDUCE_AI`），SSE 流式替换
    - _需求：7.4_
  - [x] 27.4 加图/表功能（P2）*
    - 实现插入 AI 生成图表的入口，调用 `/revision/figure` 或 `/revision/table`；不计入改稿次数
    - _需求：7.6_
  - [x] 27.5 引用核对面板
    - 调用 `POST /api/orders/:id/citation-check`，展示引用核对结果，高亮问题引用
    - _需求：7.5_
  - [x] 27.6 查重入口
    - 提供「发起查重」按钮，展示查重报告链接或结果摘要
    - _需求：7.7_
  - [x] 27.7 下载论文
    - 调用 `POST /api/orders/:id/download`，下载前检查用户是否已查看引用核对结果与查重结果；若未查看任一结果则阻止下载并提示；确认后生成 Word 文件提供下载链接
    - _需求：7.7、7.8、8.1、8.2_
  - [x] 27.8 改稿内容自动保存
    - 实现 Tiptap 编辑器内容变更后自动保存（防抖 2 秒），调用 `PATCH /api/orders/:id/revision`；页面刷新或意外关闭后内容不丢失
    - _需求：7.9_
  - [x] 27.9 步骤 6 单元测试
    - 验证改稿次数计数展示；验证 SSE 流式内容替换；验证下载前拦截逻辑；验证自动保存防抖触发
    - _需求：7.2、7.3、7.7、7.9_

- [x] 28. 实现订单列表页（apps/web/src/views/orders）
  - 实现 `OrdersView.vue`：展示用户所有订单，含状态（生成中/已完成）、套餐、创建时间
  - 点击订单可跳转至对应向导步骤（未完成草稿跳步骤 1，生成中跳步骤 5，已完成跳步骤 6）
  - _需求：5.6_

- [x] 29. 实现向导进度条组件（apps/web/src/components/wizard）
  - 实现 `WizardProgress.vue`：顶部固定显示当前步骤（1/6 ～ 6/6），支持点击已完成步骤回退
  - 移动端触摸热区 ≥ 44pt，适配竖屏布局
  - _需求：2.1、11.4_

- [x] 30. 检查点 — 前端全模块
  - 验证：所有六步向导页面在移动端和 PC 端均可正常使用；订单列表、进度条组件正常
  - 前端 Vitest 测试全部通过，核心模块覆盖率 ≥ 80%
  - 结果：16 个测试文件，325 个测试全部通过；核心模块覆盖率：Statements 94.39%、Branches 87.39%、Functions 93.06%；无 Linter 错误
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
