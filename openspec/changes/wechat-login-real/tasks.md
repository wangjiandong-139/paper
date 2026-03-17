# 真实微信扫码登录 — 任务列表（TDD）

## 1. 后端：Admin 微信开放平台配置 Key（TDD）

- [ ] 1.1 在 `system-config.service.ts` 的 `ALLOWED_KEYS` 与 `PRESETS` 中新增 `wechat_open_app_id`（description: 「微信开放平台网站应用 AppID」）、`wechat_open_app_secret`（description: 「微信开放平台网站应用 AppSecret，仅后端使用」）；Secret 写入时不做明文日志、读取给 Admin 时返回掩码（如 `****`）或仅「已配置」标识
- [ ] 1.2 为 1.1 编写单元测试：未配置时读取为空/默认；写入 app_id 与 app_secret 后读取 app_id 为明文、app_secret 为掩码或不可见；非法 key 拒绝

## 2. 后端：WeChat 开放平台 HTTP 与 state 存储（TDD）

- [ ] 2.1 新增 `WeChatOpenService`（或 `WeChatHttpService`）：方法 `exchangeCodeForToken(appId, appSecret, code)` 调 `api.weixin.qq.com/sns/oauth2/access_token`，返回 `{ access_token, openid, unionid? }`；方法 `getUserInfo(accessToken, openid)` 调用户信息接口返回 `{ nickname, headimgurl }`；编写单元测试（可 mock HTTP）
- [ ] 2.2 新增 state 存储：接口 `setPending(state)`, `setConfirmed(state, token, user)`, `get(state)`, `consume(state)`；实现可为内存 Map + TTL（如 10 分钟），key=state；为 2.2 编写单元测试：setPending 后 get 为 pending、setConfirmed 后 get 为 confirmed、consume 后 get 失效

## 3. 后端：Auth 扫码 URL、回调与轮询（TDD）

- [ ] 3.1 `AuthService.getWechatQrcodeUrl()`：若未配置 app_id 或 app_secret 则返回 `{ url: null, state: null }`；否则生成随机 state、调用 state 存储 setPending(state)、组装 `open.weixin.qq.com/connect/qrconnect` URL（appid, redirect_uri, state），返回 `{ url, state }`；编写单元测试：未配置返回 null、已配置返回有效 url 与 state 且 state 已 pending
- [ ] 3.2 新增 `GET /api/auth/wechat/callback`：query 含 code、state；校验 state 存在且为 pending、code 非空；调 WeChatOpenService 用 code 换 token、拉用户信息；根据 openid 查找或创建 User（wechat_open_id, wechat_union_id, nickname, avatar_url）；签发 token（与现有 login 一致）；state 存储 setConfirmed(state, token, user)；响应 302 重定向到前端 `/login?wechat_done=1&state=STATE`；编写集成测试：模拟带 code/state 的 GET、校验 302、User 存在、轮询可得 token
- [ ] 3.3 `GET /api/auth/wechat/qrcode/poll?state=xxx`：若 state 不存在或过期返回 `{ status: 'expired' }`；若 pending 返回 `{ status: 'pending' }`；若 confirmed 返回 `{ status: 'confirmed', token, user }` 并 consume(state)；编写集成测试：先 getQrcode 再 poll 得 pending、模拟 callback 后再 poll 得 confirmed 且仅一次

## 4. 共享类型（packages/shared）

- [ ] 4.1 新增或复用 DTO：`WechatQrcodeDto { url: string | null; state: string | null }`；`WechatPollDto { status: 'pending' | 'confirmed' | 'expired'; token?: string; user?: UserDto }`；导出至 `packages/shared` 的 index

## 5. Admin UI：微信开放平台配置（TDD）

- [ ] 5.1 在系统配置或「第三方接入」页新增表单：微信开放平台 AppID（明文输入）、AppSecret（密码框输入、展示为掩码）；读取现有 system-config 接口回填 AppID、AppSecret 仅显示「已配置」或掩码；保存时调用 PATCH 写入 `wechat_open_app_id`、`wechat_open_app_secret`
- [ ] 5.2 为 5.1 编写组件测试：加载时回填 AppID、Secret 不展示明文；保存时请求体包含两 key；可选：清空 Secret 提交表示不更新 Secret（按现有实现约定）

## 6. 前端 Web：登录页真实 URL 与轮询（TDD）

- [ ] 6.1 LoginView：调用 `GET /api/auth/wechat/qrcode`，若 `url` 为 null 则保持当前「暂未开启扫码登录」文案；若 `url` 存在则展示二维码（用 url 生成或嵌入组件）、记录 `state`，并调用 `GET /api/auth/wechat/qrcode/poll?state=xxx` 轮询
- [ ] 6.2 轮询逻辑：当返回 `status: 'confirmed'` 时写入 token 与 user（与现有 auth store 一致）、跳转至原目标或首页；`status: 'expired'` 时提示过期并停止轮询；持续 pending 时继续轮询（如每 2 秒）
- [ ] 6.3 为 6.1/6.2 编写组件或 E2E 测试：url 为 null 时不展示二维码；url 存在时展示并轮询；mock poll 返回 confirmed 后校验 token 写入与跳转

## 7. 端到端与人工验证（可选）

- [ ] 7.1 Admin 配置真实微信开放平台 AppID/AppSecret，PC 登录页展示二维码；扫码后在微信内确认，浏览器重定向到登录页并轮询获得 token，完成登录——人工核查
- [ ] 7.2 多实例部署时 state 存储使用 Redis（若当前为内存 Map），确保回调与轮询命中同一 state——按部署方式验证

## 8. 可选：公众号 H5 与 JS SDK（后续或本变更内）

- [ ] 8.1 Admin 新增 `wechat_mp_app_id`、`wechat_mp_app_secret`（公众号）；后端 `POST /api/auth/wechat` 支持 `platform: 'h5'`，用公众号接口以 code 换 token 与用户信息，写 User、签发 token
- [ ] 8.2 前端 H5 在微信内引入微信 JS SDK，wx.config + wx.ready + wx.login 获取 code，将 code 发 `POST /api/auth/wechat`（platform: h5），成功后写 token 并跳转
