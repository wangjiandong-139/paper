## 1. 数据层与凭证模型

- [x] 1.1 在 Prisma schema 中新增 `local_credentials` 表（id, user_id FK→users, username 唯一, password_hash），并生成迁移
- [x] 1.2 为 auth 模块添加 bcrypt 依赖（如 `bcrypt` 或 `@nestjs/passport` 所需），并在 AuthService 中实现密码哈希与校验工具（先写单元测试再实现）

## 2. 后端密码登录 API（TDD）

- [x] 2.1 为 `POST /api/auth/login` 编写集成/接口测试：正确凭证返回 200 与 token/user，错误凭证返回 401
- [x] 2.2 在 AuthController 新增 `POST /api/auth/login`，Body 为 `{ username, password }`，委托 AuthService
- [x] 2.3 在 AuthService 实现 `loginWithPassword(username, password)`：查 local_credentials、校验密码、加载 User、签发与微信登录相同形态的 token 与 user 响应
- [x] 2.4 确保登录响应与现有微信登录 DTO 形态一致（前端可复用 token/user 字段），并补充或复用 DTO 类型（packages/shared 或 server 内）

## 3. 初始用户 Seed

- [x] 3.1 在 Prisma seed 中：若不存在则创建 User（wechat_open_id=`local:user`），并 upsert local_credentials（username=`user`，password_hash=bcrypt(`1`)），保证幂等
- [x] 3.2 验证 seed 后使用用户名 `user`、密码 `1` 调用登录 API 可成功返回 token 与 user

## 4. 前端登录页与 Store（TDD）

- [x] 4.1 为 auth store 的 `loginWithPassword(username, password)` 编写单元测试：成功时写入 token/user，失败时抛出或保留未登录态
- [x] 4.2 在 stores/auth 中新增 `loginWithPassword(username: string, password: string)`，调用 `POST /api/auth/login` 后复用现有 _applyToken 与 user 赋值逻辑
- [x] 4.3 在 LoginView.vue 中增加用户名、密码输入框与“密码登录”按钮，提交时调用 `loginWithPassword`，成功则执行现有 redirectAfterLogin，失败则展示“用户名或密码错误”
- [x] 4.4 为 LoginView 中密码登录流程编写组件/集成测试：提交正确/错误凭证时的行为与 redirect 参数处理

## 5. 路由与守卫校验

- [x] 5.1 确认未登录访问需认证路由时重定向到 Login 且带 `redirect` 参数（现有 guards 已支持，必要时补充测试）
- [x] 5.2 确认密码登录成功后跳转至 `redirect` 或默认首页（与现有 redirectAfterLogin 一致，可加端到端或集成测试）
