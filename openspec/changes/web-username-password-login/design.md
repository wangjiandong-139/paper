## Context

- 现有 Web 仅支持微信登录（公众号 H5 / PC 扫码），auth 模块提供 `POST /api/auth/wechat`，返回 `access_token` 与 user 信息；前端 `LoginView.vue` 仅展示微信登录入口，`stores/auth` 仅有 `loginWithWechat`。
- User 表当前以 `wechat_open_id` 为必填且唯一；会话模型为 JWT/Bearer token，前端通过 `Authorization` 头携带，401 时触发 `auth:unauthorized`。
- 路由守卫 `guards.ts` 已实现：未登录访问需认证页面时重定向到 Login 并带 `redirect`，登录页与 onboarding 逻辑已存在。

## Goals / Non-Goals

**Goals:**

- Web 端支持用户名+密码登录，与现有微信登录并存，共用同一套会话与 User 模型。
- 提供初始账号：用户名 `user`，密码 `1`，便于开发/内测开箱即用。
- 未登录访问受保护页时重定向到登录页；登录成功后跳转 `redirect` 或默认首页。

**Non-Goals:**

- 不替代或修改微信登录流程与 API。
- 不提供注册、忘记密码、多因素认证；不对外暴露“注册入口”。

## Decisions

1. **密码用户与 User 模型**
   - 采用**独立凭证表**：新增 `local_credentials` 表（`id`、`user_id` FK、`username` 唯一、`password_hash`），不修改 `User` 表结构。
   - 密码用户对应一条 `User` 记录（可为该 User 设置占位 `wechat_open_id`，例如 `local:<username>`，以保证当前唯一约束），或在后端允许 `wechat_open_id` 为占位值；登录时通过 `local_credentials` 查得 `user_id`，再加载 User 并签发与微信登录相同形态的 token。
   - **理由**：避免把 `User` 的 `wechat_open_id` 改为可选带来的迁移与兼容成本；密码仅存于 `local_credentials`，职责清晰。

2. **API 路由**
   - 新增 `POST /api/auth/login`（或 `POST /api/auth/password`），Body：`{ username: string, password: string }`，返回与微信登录一致的 `{ token, user }`（复用现有 DTO 形态，如 `access_token` 与前端期望的 `token`/`user` 映射保持一致）。
   - 不新增登出端点（前端清除 token 即可）；受保护接口继续使用现有 JWT 守卫。

3. **密码存储**
   - 使用 **bcrypt** 哈希存储，salt rounds 取 10；依赖 NestJS 生态常用包（如 `bcrypt`）。
   - 初始用户 `user`/`1` 通过 Prisma seed 或迁移时插入：先创建或匹配 User（`wechat_open_id = 'local:user'`），再插入 `local_credentials`（username=`user`，password_hash=bcrypt(`1`））。

4. **前端**
   - 在现有 `LoginView.vue` 中增加“用户名密码”区块（表单项 + 提交按钮），与微信登录区域并列；移动端可保留微信为主、密码为辅助入口。
   - `stores/auth` 增加 `loginWithPassword(username: string, password: string)`，调用 `POST /api/auth/login` 后写入 token 与 user，复用现有 `_applyToken` 与持久化逻辑。
   - 路由守卫不变：仍用 `requiresAuth` 与 `authGuard`，未登录重定向到 Login（带 `redirect`），登录成功后用现有 `redirectAfterLogin` 逻辑。

5. **DTO 与类型**
   - 请求：`LoginWithPasswordDto { username: string; password: string }`（可放在 `packages/shared` 或 server 内，与现有 WechatLoginPayload 并列）。
   - 响应：与微信登录一致（同一 `AuthResult`/前端 `WechatLoginResponseDTO` 形态），确保前端一套 user/token 处理逻辑。

## Risks / Trade-offs

- **风险**：初始账号 `user`/`1` 若暴露到生产环境存在弱口令风险。  
  **缓解**：Seed 仅在有条件时执行（如 NODE_ENV=development 或显式 seed 命令）；文档与 Non-goals 明确仅用于开发/内测；后续可加环境变量关闭密码登录或移除该 seed。

- **风险**：`local_credentials` 与 User 的创建顺序（seed 时先 User 再 credential）。  
  **缓解**：Seed 脚本中先 `upsert` User（wechat_open_id=`local:user`），再 `upsert` local_credentials（username=`user`），保证幂等。

- **兼容**：前端现有 `UserInfo` 含 `wechatOpenId`；密码用户的 User 可填占位 `wechat_open_id`，前端无需区分登录方式，接口形态一致。

## Migration Plan

1. 数据库：新增 `local_credentials` 表（Prisma migration）；执行 seed 插入 user/1 对应 User + credential。
2. 后端：auth 模块新增 login 接口与密码校验逻辑；不修改现有 wechat 接口。
3. 前端：LoginView 增加表单与 `loginWithPassword`；auth store 增加方法并复用现有持久化与守卫。
4. 回滚：移除 seed 中密码用户、移除 `POST /api/auth/login` 及前端密码入口即可，不影响微信登录。

## Open Questions

- 无；初始用户与 API 形态已确定，可与实现阶段保持一致。
