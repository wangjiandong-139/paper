# 技术治理文档 (Technology Steering)

## 技术栈

### 前端
- 语言：TypeScript 5.x
- 框架：Vue 3（Composition API）
- 构建工具：Vite
- 状态管理：Pinia（含持久化插件 pinia-plugin-persistedstate）
- UI 组件库：Vant 4（移动端）+ 自定义 PC 响应式布局
- 样式：TailwindCSS
- 富文本编辑器：Tiptap

### 后端
- 语言：TypeScript 5.x
- 框架：NestJS
- 数据库：PostgreSQL（主库）
- 缓存/队列：Redis + BullMQ（后台生成任务队列）
- ORM：Prisma

### AI 与第三方集成
- 论文生成/改稿/降重：OpenAI API 兼容接口（可切换 DeepSeek 等国内模型）
- AI 绘图：DALL-E / Stable Diffusion API
- 中文文献：知网 / 万方 / 维普 API
- 英文文献：Semantic Scholar / CrossRef 开放 API
- 查重：运营后台可配置（万方、知网、维普等多家，支持切换）
- 支付：微信支付（JSAPI + Native 扫码）
- 登录：微信公众号 OAuth + 微信扫码登录

### 部署
- 容器化：Docker + Docker Compose
- 云平台：阿里云 / 腾讯云
- 静态资源：CDN 加速

---

## 开发原则

### 测试优先（NON-NEGOTIABLE）
所有实现必须遵循 TDD：
1. 先写测试，确认测试失败
2. 实现代码使测试通过
3. 重构，保持测试绿色

### 简单性原则
- 不做过度设计，不为未来需求预留抽象
- 优先使用框架原生能力，避免不必要的封装层
- 复杂度只在被证明必要时才引入

### 类型安全
- 禁止使用 `any`，所有接口必须有明确类型定义
- 前后端共享 DTO 类型定义（monorepo 或 shared 包）

### AI 接口隔离
- 所有 AI 调用封装在独立 Service 层，禁止在 Controller 或 UI 层直接调用
- AI 接口必须支持流式输出（SSE / WebSocket）以提供实时进度反馈
- AI 提示词（prompt）统一管理，禁止硬编码在业务逻辑中

### 状态持久化
- 向导步骤状态（选题、文献、提纲、每章内容）必须持久化到服务端数据库
- 前端 Pinia store 仅作为视图层缓存，不作为唯一数据源

---

## 测试策略

- 单元测试：Vitest（前端）、Jest（后端 NestJS）
- 集成测试：Supertest（API 层）
- E2E 测试：Playwright
- 覆盖率要求：核心业务逻辑（向导流程、生成任务、支付）≥ 80%

---

## 质量门禁

在合并代码前必须通过：
- [ ] 所有测试通过
- [ ] 核心模块代码覆盖率 ≥ 80%
- [ ] 无 ESLint 错误
- [ ] 无 TypeScript 类型错误（无 `any`）
- [ ] AI 提示词变更需经过回归测试

---

## 依赖管理规则

- 包管理器：pnpm（monorepo 使用 pnpm workspace）
- 引入新依赖前必须评估：包大小、维护状态、许可证
- 禁止引入与 Vant 4 功能重叠的 UI 库
- 第三方 API（文献、查重、AI）必须通过适配器模式接入，便于切换服务商
