# 技术设计文档：傻瓜式 AI 写论文

**项目**：ai-paper-writing  
**日期**：2026-03-15  
**规格**：[requirements.md](./requirements.md) | [clarifications.md](./clarifications.md)

---

## 概述

基于 requirements.md 中的 11 项需求，采用 Monorepo 架构构建前后端分离的 Web 应用。前端 Vue 3 + Vant 4 实现移动端优先的六步向导，后端 NestJS + BullMQ 处理异步论文生成任务，PostgreSQL 持久化所有用户数据。

---

## 治理合规检查

### 产品对齐（product.md）
- [x] 六步向导主流程完整覆盖
- [x] 微信登录 + 微信支付（JSAPI + Native 扫码）
- [x] 不支持退款，支付即服务开始
- [x] 未支付草稿永久保留，支持多草稿并行
- [x] 后台生成不设超时，SLA ≥ 99.9%
- [x] 引用仅来自步骤 2 确认文献列表

### 技术合规（tech.md）
- [x] TypeScript 5.x 全栈，禁止 `any`
- [x] Vue 3 Composition API + Pinia + Vant 4
- [x] NestJS + Prisma + PostgreSQL + Redis + BullMQ
- [x] AI 调用封装在 Service 层，支持 SSE 流式输出
- [x] 提示词统一在 `prompts/` 目录管理
- [x] 第三方 API 通过适配器模式接入
- [x] TDD：Vitest（前端）+ Jest（后端）+ Playwright（E2E）

### 结构合规（structure.md）
- [x] Monorepo：apps/web + apps/server + packages/shared
- [x] 命名规范：PascalCase 组件、kebab-case 文件、camelCase 函数
- [x] API 路由遵循 structure.md 规范

---

## 技术上下文

| 项目 | 选型 |
|------|------|
| 语言/版本 | TypeScript 5.x（前后端统一） |
| 前端框架 | Vue 3.4 + Composition API |
| 后端框架 | NestJS 10.x |
| 数据库 | PostgreSQL 16 |
| 缓存/队列 | Redis 7 + BullMQ 5 |
| ORM | Prisma 5.x |
| 前端构建 | Vite 5.x |
| UI 组件库 | Vant 4（移动端）+ TailwindCSS |
| 富文本编辑器 | Tiptap 2.x |
| 状态管理 | Pinia + pinia-plugin-persistedstate |
| 测试（前端） | Vitest + Playwright |
| 测试（后端） | Jest + Supertest |
| 包管理器 | pnpm workspace（Monorepo） |
| 容器化 | Docker + Docker Compose |
| AI 接口 | OpenAI API 兼容（可切换 DeepSeek） |
| AI 绘图 | DALL-E / Stable Diffusion API |
| 文献 API | 知网/万方/维普 + Semantic Scholar/CrossRef |
| 支付 | 微信支付 JSAPI + Native 扫码 |
| 登录 | 微信公众号 OAuth + 微信扫码 |

---

## 项目结构

```text
ai-paper-writing/
├── apps/
│   ├── web/                          # 前端 Vue 3
│   │   └── src/
│   │       ├── views/
│   │       │   ├── wizard/
│   │       │   │   ├── Step1BasicInfo.vue
│   │       │   │   ├── Step2References.vue
│   │       │   │   ├── Step3Outline.vue
│   │       │   │   ├── Step4Payment.vue
│   │       │   │   ├── Step5Generating.vue
│   │       │   │   └── Step6Revision.vue
│   │       │   ├── orders/
│   │       │   └── auth/
│   │       ├── components/
│   │       │   ├── wizard/
│   │       │   ├── common/
│   │       │   └── layout/
│   │       ├── stores/
│   │       │   ├── wizard.ts
│   │       │   ├── auth.ts
│   │       │   └── order.ts
│   │       ├── services/
│   │       │   ├── wizard.service.ts
│   │       │   ├── reference.service.ts
│   │       │   ├── order.service.ts
│   │       │   └── ai.service.ts
│   │       ├── composables/
│   │       ├── router/
│   │       └── utils/
│   └── server/                       # 后端 NestJS
│       └── src/
│           ├── modules/
│           │   ├── auth/
│           │   ├── user/
│           │   ├── wizard/
│           │   ├── reference/
│           │   ├── outline/
│           │   ├── order/
│           │   ├── generation/
│           │   ├── revision/
│           │   ├── citation/
│           │   ├── plagiarism/
│           │   ├── template/
│           │   ├── notification/
│           │   └── admin/
│           ├── adapters/
│           │   ├── ai/
│           │   ├── reference/
│           │   ├── plagiarism/
│           │   └── payment/
│           ├── prompts/
│           │   ├── outline.prompt.ts
│           │   ├── generation.prompt.ts
│           │   ├── revision.prompt.ts
│           │   └── reduce-ai.prompt.ts
│           ├── prisma/
│           └── common/
└── packages/
    └── shared/
        └── src/
            ├── dto/
            ├── enums/
            └── types/
```


---

## 数据模型

### Entity: User（用户）

- **用途**：存储微信登录用户信息
- **字段**：
  - `id`: UUID - 主键
  - `wechat_open_id`: string - 公众号 OpenID（唯一）
  - `wechat_union_id`: string? - UnionID（跨公众号/小程序）
  - `nickname`: string? - 微信昵称
  - `avatar_url`: string? - 头像 URL
  - `onboarding_completed`: boolean - 是否已完成首次引导（默认 false）
  - `created_at`: timestamp
  - `updated_at`: timestamp
  - `deleted_at`: timestamp? - 软删除
- **关系**：一对多 Draft、一对多 Order

### Entity: Draft（草稿）

- **用途**：存储用户未支付的写作向导状态（步骤 1～3）
- **字段**：
  - `id`: UUID - 主键
  - `user_id`: UUID - 外键 → User
  - `current_step`: int - 当前步骤（1～4）
  - `step1_data`: JSON - 基础信息（学科、标题、语言、学历、字数、学校格式 ID、AI 投喂等）
  - `step2_data`: JSON - 已确认文献列表（ReferenceItem[]）
  - `step3_data`: JSON - 已确认提纲（OutlineNode[]）
  - `created_at`: timestamp
  - `updated_at`: timestamp
  - `deleted_at`: timestamp? - 软删除（用户主动删除）
- **关系**：多对一 User；一对一 Order（支付后关联）
- **约束**：`deleted_at` 为 null 的草稿永久保留

### Entity: Order（订单）

- **用途**：存储支付完成后的写作任务，包含生成状态与改稿内容
- **字段**：
  - `id`: UUID - 主键
  - `user_id`: UUID - 外键 → User
  - `draft_id`: UUID - 外键 → Draft（快照来源）
  - `plan_type`: enum(BASIC) - 套餐类型（当前仅支持 BASIC，后续可扩展）
  - `plan_price`: int - 支付金额（分）
  - `wechat_pay_order_id`: string - 微信支付订单号
  - `status`: enum(PENDING_PAYMENT, GENERATING, COMPLETED, FAILED) - 订单状态
  - `generation_progress`: JSON - 生成进度（{ total_chapters, completed_chapters, current_chapter }）
  - `bullmq_job_id`: string? - BullMQ 任务 ID
  - `ai_revision_count`: int - 已使用 AI 改稿次数（默认 0）
  - `revision_content`: JSON? - 改稿后的正文内容（章节数组）
  - `paper_snapshot`: JSON - 支付时的论文元数据快照（标题、提纲、文献列表）
  - `created_at`: timestamp
  - `updated_at`: timestamp
- **关系**：多对一 User；多对一 Draft；一对多 GeneratedChapter
- **状态转换**：PENDING_PAYMENT → GENERATING → COMPLETED / FAILED

### Entity: GeneratedChapter（生成章节）

- **用途**：存储每章生成结果与引用核对状态
- **字段**：
  - `id`: UUID - 主键
  - `order_id`: UUID - 外键 → Order
  - `chapter_index`: int - 章节序号（从 1 开始）
  - `chapter_title`: string - 章节标题
  - `content`: text - 生成正文（Markdown/HTML）
  - `citation_check_result`: JSON? - 引用核对结果（{ traceable: CitationItem[], untraceable: CitationItem[] }）
  - `status`: enum(PENDING, GENERATING, DONE, FAILED) - 章节生成状态
  - `created_at`: timestamp
  - `updated_at`: timestamp
- **关系**：多对一 Order

### Entity: Reference（文献）

- **用途**：缓存文献 API 返回的文献条目，避免重复请求
- **字段**：
  - `id`: UUID - 主键
  - `source`: enum(CNKI, WANFANG, VIPINFO, SEMANTIC_SCHOLAR, CROSSREF, USER_INPUT) - 来源
  - `external_id`: string? - 第三方文献 ID
  - `title`: string
  - `authors`: string[] - 作者列表（Prisma 存储为 JSON 数组字段）
  - `journal`: string? - 期刊/来源
  - `year`: int? - 发表年份
  - `raw_citation`: string? - 原始引文格式字符串
  - `metadata`: JSON? - 其他元数据
  - `created_at`: timestamp
- **约束**：`(source, external_id)` 唯一索引

### Entity: SystemConfig（系统配置）

- **用途**：存储运营后台可配置的系统级参数，如当前启用的查重服务商、AI 提供商等
- **字段**：
  - `id`: UUID - 主键
  - `key`: string - 配置键（唯一），如 `plagiarism_provider`、`ai_provider`
  - `value`: string - 配置值，如 `wanfang`、`cnki`、`vipinfo`
  - `description`: string? - 配置说明（供运营人员参考）
  - `created_at`: timestamp
  - `updated_at`: timestamp
  - `updated_by`: string? - 最后修改的运营人员标识
- **约束**：`key` 唯一索引；不设 `deleted_at`，配置项只更新不删除
- **预置键值**：

| key | 默认值 | 说明 |
|-----|--------|------|
| `plagiarism_provider` | `wanfang` | 当前启用的查重服务商（wanfang / cnki / vipinfo） |
| `ai_provider` | `openai` | 当前 AI 接口提供商（openai / deepseek） |

- **访问方式**：后端通过 `SystemConfigService.get(key)` 读取，结果缓存至 Redis（TTL 5 分钟），运营后台更新后主动清除缓存

**新增运营后台 API**：
```
GET   /api/admin/system-configs
  响应: SystemConfigDTO[]

PATCH /api/admin/system-configs/:key
  请求: { value: string }
  响应: SystemConfigDTO
```

---

### Entity: FormatTemplate（格式模板）

- **用途**：存储学校/格式模板，由运营后台维护
- **字段**：
  - `id`: UUID - 主键
  - `name`: string - 模板名称（如「北京大学」「国标/通用」）
  - `school_keyword`: string[] - 搜索关键词（Prisma 存储为 JSON 数组字段）
  - `is_default`: boolean - 是否为默认模板（国标/通用）
  - `config`: JSON - 排版规范（标题层级、字体、参考文献著录格式等）
  - `created_at`: timestamp
  - `updated_at`: timestamp
  - `deleted_at`: timestamp?
- **关系**：被 Draft.step1_data 引用


---

## API 契约

### 认证模块

```
POST /api/auth/wechat
  请求: { code: string, platform: 'h5' | 'pc_qrcode' }
  响应: { access_token: string, user: UserDTO }

GET  /api/auth/wechat/qrcode
  响应: { qrcode_url: string, scene_id: string }  # PC 扫码登录二维码

GET  /api/auth/wechat/qrcode/poll
  查询: { scene_id: string }
  响应: { status: 'pending' | 'scanned' | 'confirmed', access_token?: string }
```

### 用户模块

```
PATCH /api/users/me
  请求: { onboarding_completed?: boolean }
  响应: UserDTO  # 更新当前用户信息（首次引导完成后调用）
```

### 草稿模块

```
GET    /api/drafts
  响应: DraftSummaryDTO[]  # 该用户所有未删除草稿

POST   /api/drafts
  请求: {}
  响应: DraftDTO  # 创建新草稿，current_step=1

PATCH  /api/drafts/:id/step/:n
  请求: { data: Step1Data | Step2Data | Step3Data }
  响应: DraftDTO  # 更新指定步骤数据

DELETE /api/drafts/:id
  响应: 204  # 软删除草稿
```

### 文献模块

```
GET  /api/references/suggest
  查询: { subject: string, title: string, language: 'zh' | 'en', page?: number }
  响应: { items: ReferenceDTO[], total: number }

POST /api/references/parse
  请求: { raw_text: string }  # 粘贴的引文格式文本
  响应: { items: ReferenceDTO[], errors: ParseErrorDTO[] }

POST /api/references/upload
  请求: FormData (file: PDF/Word)
  响应: { items: ReferenceDTO[], errors: ParseErrorDTO[] }
```

### 提纲模块

```
POST /api/outlines/generate
  请求: { draft_id: string }
  响应: SSE stream → OutlineNode[]  # 流式返回生成提纲

POST /api/outlines/parse
  请求: { raw_text: string }  # 粘贴的提纲文本
  响应: OutlineNode[]
```

### 订单与支付模块

```
POST /api/orders
  请求: { draft_id: string, plan_type: PlanType }
  响应: { order_id: string, pay_params: WechatPayParams }  # 返回微信支付参数

GET  /api/orders
  响应: OrderSummaryDTO[]  # 该用户所有订单

GET  /api/orders/:id
  响应: OrderDetailDTO

GET  /api/orders/:id/progress
  响应: SSE stream → GenerationProgressEvent  # 实时生成进度

POST /api/orders/:id/wechat-pay/notify
  请求: WechatPayNotifyBody  # 微信支付回调（内部）
  响应: 200 OK
```

### 改稿模块

```
PATCH /api/orders/:id/revision
  请求: { chapter_index?: number, content: string }  # 保存改稿内容
  响应: OrderDetailDTO

POST  /api/orders/:id/revision/ai
  请求: { type: RevisionType, chapter_index?: number, instruction?: string }
  响应: SSE stream → RevisionChunk  # 流式返回改稿结果
  # RevisionType 枚举见共享类型定义，降重(reduce_plagiarism)与降AI痕迹(reduce_ai)为不同操作

POST  /api/orders/:id/citation-check
  响应: CitationCheckResultDTO

POST  /api/orders/:id/plagiarism-check
  响应: PlagiarismResultDTO

POST  /api/orders/:id/download
  请求: { format: 'docx' | 'pdf' }
  响应: { download_url: string }  # 预签名 URL，有效期 10 分钟
```

### 格式模板模块（运营后台）

```
GET    /api/templates
  查询: { keyword?: string }
  响应: FormatTemplateDTO[]

POST   /api/admin/templates
  请求: FormatTemplateCreateDTO
  响应: FormatTemplateDTO

PATCH  /api/admin/templates/:id
  请求: Partial<FormatTemplateCreateDTO>
  响应: FormatTemplateDTO

DELETE /api/admin/templates/:id
  响应: 204
```

### AI 能力模块（内部，不对外暴露）

```
POST /api/ai/topic-suggest  (内部)
  请求: { subject: string, degree_type: string }
  响应: SSE stream → string[]

POST /api/ai/parse-proposal  (内部)
  请求: FormData (file: docx/doc)
  响应: { research_topic: string, keywords: string[], methods: string[] }
```


---

## 共享类型定义（packages/shared）

### 枚举

```typescript
// packages/shared/src/enums/index.ts

export enum PlanType {
  BASIC = 'BASIC',           // 基础版（AI 改稿 ≤ 3 次，当前唯一支持套餐）
  // AI_RATE = 'AI_RATE',    // AI 率保障版（后续扩展）
  // UNLIMITED = 'UNLIMITED', // 无限改稿版（后续扩展）
}

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ChapterStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export enum ReferenceSource {
  CNKI = 'CNKI',
  WANFANG = 'WANFANG',
  VIPINFO = 'VIPINFO',
  SEMANTIC_SCHOLAR = 'SEMANTIC_SCHOLAR',
  CROSSREF = 'CROSSREF',
  USER_INPUT = 'USER_INPUT',
}

export enum Language {
  ZH = 'zh',
  EN = 'en',
}

export enum DegreeType {
  UNDERGRADUATE = 'undergraduate',
  MASTER = 'master',
  DOCTOR = 'doctor',
  OTHER = 'other',
}

export enum RevisionType {
  REWRITE = 'rewrite',               // 按意见修改（用户输入修改指令）
  REDUCE_PLAGIARISM = 'reduce_plagiarism', // 降重（降低查重率，改写相似段落）
  REDUCE_AI = 'reduce_ai',           // 降 AI 痕迹（降低 AI 检测率，使文本更自然）
  EXPAND = 'expand',                 // 扩写
  SHRINK = 'shrink',                 // 缩写
  POLISH = 'polish',                 // 润色
}
```

### 核心 DTO 类型

```typescript
// packages/shared/src/types/index.ts

export interface Step1Data {
  subject: string
  title: string
  language: Language
  degree_type: DegreeType
  word_count: number
  template_id: string        // 格式模板 ID，默认「国标/通用」
  ai_feed?: string           // AI 投喂（≤ 1500 字）
  proposal_file_url?: string // 开题报告文件 URL
}

export interface ReferenceItem {
  id: string
  source: ReferenceSource
  title: string
  authors: string[]
  journal?: string
  year?: number
  raw_citation?: string
}

export interface OutlineNode {
  id: string
  title: string
  level: number              // 1=章, 2=节, 3=小节
  word_count?: number        // 该节目标字数
  children: OutlineNode[]
  placeholders?: Array<'figure' | 'table' | 'formula' | 'code'>
}

export interface Step2Data {
  references: ReferenceItem[]
  confirmed: boolean
}

export interface Step3Data {
  outline: OutlineNode[]
  confirmed: boolean
}

export interface GenerationProgressEvent {
  order_id: string
  status: OrderStatus
  total_chapters: number
  completed_chapters: number
  current_chapter?: string   // 当前正在生成的章节标题
}

export interface CitationItem {
  text: string               // 引用原文
  reference_id?: string      // 匹配到的文献 ID
  traceable: boolean
}

export interface CitationCheckResultDTO {
  traceable: CitationItem[]
  untraceable: CitationItem[]
}
```

---

## 关键技术方案

### 1. 微信登录流程

**移动端（公众号 H5）**：
1. 前端检测微信环境，重定向至微信 OAuth 授权页
2. 微信回调携带 `code`，前端调用 `POST /api/auth/wechat`
3. 后端用 `code` 换取 `access_token` + `wechat_open_id`，创建/查找用户，返回 JWT

**PC 端（扫码登录）**：
1. 前端请求 `GET /api/auth/wechat/qrcode` 获取带参数二维码
2. 用户微信扫码，公众号服务器收到事件，将 `scene_id` 与 `wechat_open_id` 绑定
3. 前端轮询 `GET /api/auth/wechat/qrcode/poll?scene_id=xxx` 直到 `confirmed`，获取 JWT

### 2. 后台生成任务（BullMQ）

```
支付回调成功
  → OrderService.createGenerationJob(orderId)
  → BullMQ 队列 "paper-generation" 入队
  → GenerationWorker.process(job)
      → 按 OutlineNode[] 顺序逐章调用 AI
      → 每章完成后：
          1. 保存 GeneratedChapter
          2. 执行 CitationChecker.check(chapter, references)
          3. 更新 Order.generation_progress
          4. 通过 Redis Pub/Sub 推送 SSE 事件给前端
      → 全部完成：Order.status = COMPLETED
      → 任意章节失败：Order.status = FAILED（支持单章重试）
```

**SSE 推送**：`GET /api/orders/:id/progress` 建立 SSE 连接，后端订阅 Redis channel `order:progress:{id}`，收到消息即推送给客户端。

### 3. AI 接口适配器

```typescript
// apps/server/src/adapters/ai/ai.adapter.interface.ts
export interface IAiAdapter {
  streamCompletion(prompt: string, systemPrompt: string): AsyncIterable<string>
  completion(prompt: string, systemPrompt: string): Promise<string>
  generateImage(prompt: string): Promise<string>  // 返回图片 URL
}

// 实现：OpenAiAdapter（默认）、DeepSeekAdapter（可切换）
// 通过环境变量 AI_PROVIDER 控制
```

### 4. 文献 API 适配器

```typescript
// apps/server/src/adapters/reference/reference.adapter.interface.ts
export interface IReferenceAdapter {
  search(query: string, page: number): Promise<ReferenceItem[]>
}

// 实现：CnkiAdapter、WanfangAdapter、VipinfoAdapter
//       SemanticScholarAdapter、CrossRefAdapter
// ReferenceService 根据 language 字段选择适配器
```

### 5. 查重适配器

```typescript
// apps/server/src/adapters/plagiarism/plagiarism.adapter.interface.ts
export interface IPlagiarismAdapter {
  check(content: string): Promise<PlagiarismResultDTO>
}

// 实现：WanfangPlagiarismAdapter、CnkiPlagiarismAdapter、VipinfoPlagiarismAdapter
// 当前启用的服务商通过 SystemConfigService.get('plagiarism_provider') 读取
// 结果缓存至 Redis（TTL 5 分钟），运营后台更新后主动清除缓存
// PlagiarismService 在每次调用前读取配置，动态选择对应适配器实例
```

### 6. 向导状态持久化策略

- 前端每次步骤操作后调用 `PATCH /api/drafts/:id/step/:n` 同步到服务端
- Pinia store 作为视图层缓存，页面刷新时从服务端重新加载
- `pinia-plugin-persistedstate` 仅用于缓存 `auth` store（JWT token），不作为业务数据唯一来源

### 7. 套餐改稿次数控制

```
Order.ai_revision_count 记录已使用次数
POST /api/orders/:id/revision/ai 调用前：
  - BASIC 套餐：ai_revision_count >= 3 → 返回 403，提示已达改稿上限
  - 计入次数的操作类型：REWRITE、REDUCE_PLAGIARISM、REDUCE_AI、EXPAND、SHRINK、POLISH
  - 不计入次数的操作：加图/表（ADD_FIGURE、ADD_TABLE，通过独立接口调用，不经过 revision/ai）
  （后续扩展套餐时在此处添加对应分支）
```

### 8. Word/PDF 生成

- 使用 `docx` npm 包按 FormatTemplate.config 生成 Word 文件
- PDF 通过 Headless Chrome（Puppeteer）将 Word 渲染后导出
- 生成文件上传至 OSS（阿里云/腾讯云），返回预签名下载 URL（有效期 10 分钟）

### 9. 首次引导（Onboarding）

**需求来源**：需求 1 验收标准 5

**前端组件**：`components/common/OnboardingGuide.vue`

**展示逻辑**：
- 用户首次登录后，`useAuthStore` 检查 `user.onboarding_completed` 字段
- 若为 `false`，在进入向导前全屏展示引导组件
- 引导内容：≤ 5 屏，每屏一句话 + 配图说明主流程步骤（步骤 1～6）
- 用户可点击「跳过」或「下一步」逐屏浏览，最后一屏点击「开始写论文」
- 引导完成或跳过后，调用 `PATCH /api/users/me` 将 `onboarding_completed` 置为 `true`，不再展示

**路由逻辑**：
```
router.beforeEach:
  已登录 + onboarding_completed = false → 跳转 /onboarding
  已登录 + onboarding_completed = true  → 正常进入目标路由
  未登录 → 跳转 /auth/login
```

### 10. 微信消息通知

**需求来源**：需求 6 验收标准 8（P2 功能，生成完成后通知用户）

**技术方案**：微信公众号模板消息（Template Message）

**触发时机**：`GenerationWorker` 完成全文生成，`Order.status` 更新为 `COMPLETED` 时

**后端模块**：`apps/server/src/modules/notification/`

```typescript
// notification.service.ts
export class NotificationService {
  async sendGenerationComplete(userId: string, orderId: string): Promise<void>
  // 通过微信公众号模板消息接口推送，消息包含：
  // - 论文标题
  // - 完成时间
  // - 跳转链接（/orders/:id）
}
```

**调用位置**：`GenerationWorker.process()` 完成后调用，失败不影响主流程（fire-and-forget，捕获异常仅记录日志）

**模板消息内容**：
```
标题：您的论文已生成完成
内容：
  论文标题：{{paper_title}}
  完成时间：{{completed_at}}
  点击查看并开始改稿 →
```

**前提条件**：用户微信授权时需获取 `wechat_open_id`（已在认证流程中获取），公众号需配置模板消息权限

**注意**：微信消息通知为 P2 功能，实现时可在 `NotificationService` 中先提供空实现（no-op），待公众号模板消息配置完成后再接入真实调用。

---

## 前端状态管理设计

### useWizardStore

```typescript
interface WizardState {
  currentDraftId: string | null
  currentStep: number           // 1～6
  step1: Step1Data | null
  step2: Step2Data | null
  step3: Step3Data | null
  isSyncing: boolean            // 是否正在同步到服务端
}
```

### useAuthStore（持久化）

```typescript
interface AuthState {
  accessToken: string | null
  user: UserDTO | null
}
```

### useOrderStore

```typescript
interface OrderState {
  orders: OrderSummaryDTO[]
  currentOrderId: string | null
  generationProgress: GenerationProgressEvent | null
}
```

---

## 响应式布局策略

| 断点 | 布局 |
|------|------|
| < 768px（移动端） | 单栏，Vant 4 组件，底部固定操作按钮 |
| ≥ 768px（PC） | 步骤 1～5：居中单栏（max-width: 640px）；步骤 6：左侧正文 + 右侧能力区双栏 |

- 步骤 6 改稿页 PC 端：左侧 `flex-1` 正文区 + 右侧 `w-80` 能力区
- 步骤 6 改稿页移动端：能力区改为底部抽屉（Vant ActionSheet）
- 所有可交互元素触摸热区 ≥ 44pt（通过 TailwindCSS `min-h-[44px] min-w-[44px]` 保证）

---

## 测试策略

### 单元测试（Vitest / Jest）
- `WizardStore`：步骤状态流转、持久化逻辑
- `CitationChecker`：引用匹配算法（round-trip 属性验证）
- `GenerationWorker`：任务队列处理逻辑
- `ReferenceService`：适配器选择逻辑
- `OrderService`：套餐次数限制逻辑

### 集成测试（Supertest）
- 完整向导流程 API：创建草稿 → 更新步骤 → 创建订单 → 支付回调 → 查询进度
- 微信支付回调处理
- SSE 进度推送

### E2E 测试（Playwright）
- 六步向导主流程（Happy Path）
- 支付失败重试
- 改稿次数限制提示
- 移动端视口下的触摸热区验证

### 覆盖率目标
- 向导流程、生成任务、支付模块：≥ 80%

---

## 快速验证场景

### 场景 1：完整向导主流程
1. 微信登录 → 进入步骤 1，填写基础信息
2. 步骤 2：选择 15 篇文献并确认
3. 步骤 3：AI 生成提纲，调整后确认
4. 步骤 4：选择基础版套餐，完成微信支付
5. 步骤 5：等待后台生成，SSE 实时更新进度
6. 步骤 6：查看引用核对结果，执行查重，下载 Word
- 预期：全流程无阻断，数据在刷新/切换设备后不丢失

### 场景 2：草稿持久化与多草稿
1. 用户在步骤 2 填写一半，关闭页面
2. 重新打开，草稿列表显示该草稿，点击继续
3. 数据完整恢复到步骤 2
- 预期：step1_data 完整，current_step = 2

### 场景 3：基础版改稿次数限制
1. 用户购买基础版，进入步骤 6
2. 执行 3 次 AI 改稿操作
3. 第 4 次点击 AI 改稿
- 预期：返回 403，前端显示「已达改稿上限，如需继续请联系客服」

### 场景 4：引用溯源 round-trip
1. 后台生成章节，正文包含引用标注 [1][2][3]
2. CitationChecker 执行核对
3. 所有引用均能在步骤 2 文献列表中找到对应条目
- 预期：traceable ≥ 95%，不可溯源引用在步骤 6 标出

