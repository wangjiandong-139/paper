# 结构治理文档 (Structure Steering)

## 项目布局（Monorepo）

```text
ai-paper-writing/
├── apps/
│   ├── web/                    # 前端 Vue 3 应用
│   └── server/                 # 后端 NestJS 应用
├── packages/
│   └── shared/                 # 前后端共享类型、DTO、常量
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

## 前端结构（apps/web）

```text
src/
├── views/                      # 页面级组件（对应路由）
│   ├── wizard/                 # 六步向导页面
│   │   ├── Step1BasicInfo.vue
│   │   ├── Step2References.vue
│   │   ├── Step3Outline.vue
│   │   ├── Step4Payment.vue
│   │   ├── Step5Generating.vue
│   │   └── Step6Revision.vue
│   ├── orders/                 # 订单列表页
│   └── auth/                   # 登录页
├── components/                 # 可复用 UI 组件
│   ├── wizard/                 # 向导专用组件
│   ├── common/                 # 通用组件
│   └── layout/                 # 布局组件
├── stores/                     # Pinia 状态管理
│   ├── wizard.ts               # 向导步骤状态
│   ├── auth.ts                 # 用户认证状态
│   └── order.ts                # 订单状态
├── services/                   # API 调用层
│   ├── wizard.service.ts
│   ├── reference.service.ts
│   ├── order.service.ts
│   └── ai.service.ts
├── composables/                # Vue Composition 复用逻辑
├── router/                     # Vue Router 路由配置
├── assets/                     # 静态资源
└── utils/                      # 工具函数
```

## 后端结构（apps/server）

```text
src/
├── modules/                    # NestJS 功能模块
│   ├── auth/                   # 微信登录认证
│   ├── wizard/                 # 向导流程（草稿管理）
│   ├── reference/              # 参考文献管理
│   ├── outline/                # 提纲管理
│   ├── order/                  # 订单与支付
│   ├── generation/             # 后台论文生成任务
│   ├── revision/               # 改稿编辑
│   ├── citation/               # 引用核对
│   ├── plagiarism/             # 查重
│   ├── template/               # 格式模板管理
│   └── admin/                  # 运营后台
├── adapters/                   # 第三方服务适配器
│   ├── ai/                     # AI 接口适配器（OpenAI/DeepSeek）
│   ├── reference/              # 文献 API 适配器
│   ├── plagiarism/             # 查重 API 适配器
│   └── payment/                # 微信支付适配器
├── prompts/                    # AI 提示词统一管理
│   ├── outline.prompt.ts
│   ├── generation.prompt.ts
│   ├── revision.prompt.ts
│   └── reduce-ai.prompt.ts
├── prisma/                     # Prisma schema 与迁移
│   ├── schema.prisma
│   └── migrations/
└── common/                     # 共享工具、守卫、拦截器
```

## 共享包结构（packages/shared）

```text
src/
├── dto/                        # 请求/响应 DTO 类型
├── enums/                      # 枚举常量
└── types/                      # 通用类型定义
```

## 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名（通用） | kebab-case | `basic-info-form.vue` |
| Vue 组件文件 | PascalCase | `Step1BasicInfo.vue` |
| NestJS 模块文件 | kebab-case | `order.service.ts` |
| TypeScript 类 | PascalCase | `OrderService` |
| 函数/方法 | camelCase | `createOrder()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_REFERENCES` |
| Pinia store | camelCase + Store 后缀 | `useWizardStore` |
| API 路由 | kebab-case，复数名词 | `/api/orders`, `/api/references` |
| 数据库表名 | snake_case，复数 | `orders`, `draft_outlines` |

## API 路由规范

```
POST   /api/auth/wechat          # 微信登录
GET    /api/drafts               # 草稿列表
POST   /api/drafts               # 创建草稿
PATCH  /api/drafts/:id/step/:n   # 更新指定步骤数据
GET    /api/references/suggest   # 获取推荐文献
POST   /api/orders               # 创建订单（支付）
GET    /api/orders/:id/progress  # 获取生成进度（SSE）
PATCH  /api/orders/:id/revision  # 保存改稿内容
POST   /api/orders/:id/download  # 生成下载文件
```

## 数据库约定

- 所有表包含 `id`（UUID）、`created_at`、`updated_at` 字段
- 软删除使用 `deleted_at` 字段，不物理删除用户数据
- 向导状态以 JSON 字段存储在 `drafts` 表，便于灵活扩展
- 生成任务状态存储在 `orders` 表，通过 BullMQ job ID 关联

## 文档位置

```
.kiro/
├── steering/           # 治理文档（本目录）
└── specs/              # 功能规格文档
    └── ai-paper-writing/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```
