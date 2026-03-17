# 真实微信扫码登录与配置

## Why

当前 PC 端微信扫码登录为占位实现（GET /api/auth/wechat/qrcode 返回 null，POST /api/auth/wechat 用 mock 数据），无法完成真实扫码登录。需要接入微信开放平台实现真实 OAuth2 流程，并允许运营在 Admin 后台配置 AppID/AppSecret，同时满足公众号 H5 内使用官方 JS SDK 的扩展能力。

## What Changes

- **Admin 后台**：在「系统配置」或「第三方接入」中新增微信开放平台配置项：AppID（明文展示）、AppSecret（仅录入与掩码展示，不提供查看明文）。保存前可做连通性校验（可选）。
- **后端**：
  - 使用 Admin 配置的 AppID/AppSecret 调用微信开放平台「网站应用」授权流程：生成带 state 的扫码 URL、提供 OAuth2 回调接口接收 code、用 code 换取 access_token、拉取用户信息（openid/unionid/昵称/头像）。
  - 回调验证：校验 state 防 CSRF、code 仅使用一次、按微信文档校验返回参数。
  - 用户信息存储：根据 openid/unionid 查找或创建 User 记录，更新 nickname、avatar_url 等，并写入数据库。
  - 会话管理：回调成功后签发前端可用的 token（与现有 JWT/登录态一致），并通过「扫码状态」临时存储（如 state → { token, user }）供前端轮询接口返回，实现「扫码确认后前端轮询拿到 token」。
- **前端**：
  - PC 登录页：调用 GET /api/auth/wechat/qrcode 获取真实扫码 URL 与 state，展示二维码（或嵌入微信官方 wxLogin 组件）；轮询 GET /api/auth/wechat/qrcode/poll?state=xxx，在 status=confirmed 时写入 token 与 user 并跳转。
  - 可选：H5 在微信内打开时，接入微信公众平台官方 JS SDK（wx.config、wx.ready、wx.login），用 JS SDK 获取 code 后发给后端，后端用公众号接口换 token 与用户信息（与开放平台为两套 appid，可在 Admin 中区分「开放平台网站应用」与「公众号」配置）。
- **安全与合规**：AppSecret 仅存后端，Admin 界面与日志中均不出现明文；回调接口仅接受微信服务器或浏览器合法重定向，校验 state 与 code。

## Capabilities

### Modified Capabilities

- **ai-paper-writing** → 用户身份认证：PC 端微信扫码登录由占位改为真实开放平台 OAuth2；用户信息持久化到 User 表；会话与现有 token 机制一致。
- **admin-portal** → 全局参数/第三方接入：新增微信开放平台 AppID、AppSecret 配置项（AppSecret 掩码）；可选公众号 AppID/AppSecret 用于 H5 内授权。

### New Capabilities

- 无（在现有「微信登录」能力上做实做全，不新增独立产品能力）。

## Impact

- **apps/server**：Auth 模块增加 getWechatQrcodeUrl（读配置、生成带 state 的 qrconnect URL）、GET /api/auth/wechat/callback（OAuth2 回调、换 code、拉用户、写库、签发 token、写 state 状态）、GET /api/auth/wechat/qrcode/poll（按 state 返回是否已确认及 token/user）；依赖读取 Admin 配置的微信 AppID/AppSecret；可选 WeChatHttpService 封装开放平台 API 调用。
- **apps/admin**：系统配置或新「第三方接入」页增加微信开放平台表单（AppID、AppSecret 输入，Secret 掩码展示）；调用现有 PATCH system-configs 或新接口保存，Secret 需加密或仅哈希存储（按现有密钥策略）。
- **apps/web**：LoginView 使用真实 qrcode URL 与 state，轮询 poll 直至 confirmed 后写 token/user 并跳转；可选在 H5 微信内引入微信 JS SDK 并调用 wx.login 将 code 发后端。
- **packages/shared**：如需，新增或复用 DTO（qrcode 返回 url+state，poll 返回 status+token+user）。
- **数据库**：User 表已有 wechat_open_id、wechat_union_id、nickname、avatar_url，无需改表；若当前无 unionid 可确认字段长度与唯一约束。

## Non-goals

- 不实现微信支付、公众号菜单等与登录无关的能力。
- 不在此变更内实现「公众号内 H5 自动静默授权」（可后续单独需求）；若实现则仅做 JS SDK 获取 code + 后端换 token 与用户信息。
- AppSecret 的「加密存储」若现有系统无统一方案，可先存明文于后端配置存储，仅保证 Admin 与日志不暴露。
