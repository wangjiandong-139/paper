## ADDED Requirements

### Requirement: Web 端提供用户名密码登录入口

系统 SHALL 在 Web 登录页提供用户名与密码输入框及提交按钮，用户输入用户名和密码后可发起登录请求；该入口与现有微信登录入口并存，不替代微信登录。

#### Scenario: 用户在登录页输入用户名密码并提交

- **WHEN** 用户在登录页输入有效用户名与密码并点击登录
- **THEN** 前端调用 `POST /api/auth/login`（或等价密码登录 API），请求体包含 `username` 与 `password`
- **AND** 若服务端返回成功，前端保存 token 与 user 信息并跳转至 redirect 或默认首页

#### Scenario: 用户提交错误密码

- **WHEN** 用户提交的用户名存在但密码错误
- **THEN** 服务端返回 401 或明确错误码，前端展示“用户名或密码错误”类提示，不跳转

#### Scenario: 用户提交不存在的用户名

- **WHEN** 用户提交的用户名在系统中不存在
- **THEN** 服务端返回 401 或明确错误码，前端展示“用户名或密码错误”类提示（不区分用户不存在与密码错误）

---

### Requirement: 后端支持用户名密码校验并签发会话

系统 SHALL 提供密码登录 API，接受用户名与密码，校验通过后签发与微信登录相同形态的 access token 与 user 信息；密码 MUST 以安全哈希（如 bcrypt）存储，不以明文存储。

#### Scenario: 使用正确凭证登录

- **WHEN** 客户端请求 `POST /api/auth/login` 且 username/password 与存储的凭证一致
- **THEN** 服务端返回 200 及 `token` 与 `user` 对象，形态与现有微信登录响应一致，前端可复用同一套 token/user 存储与路由逻辑

#### Scenario: 使用错误凭证登录

- **WHEN** 客户端请求 `POST /api/auth/login` 且用户名不存在或密码错误
- **THEN** 服务端返回 401，不签发 token

---

### Requirement: 存在初始用户 user 且密码为 1

系统 SHALL 在种子数据或迁移中提供初始用户：用户名为 `user`，密码为 `1`，以便开发与内测开箱即用；该用户与普通 User 模型关联，可正常使用向导与订单等能力。

#### Scenario: 使用初始用户登录

- **WHEN** 客户端使用用户名 `user`、密码 `1` 调用密码登录 API
- **THEN** 服务端校验通过并返回 token 与 user，行为与其它密码用户一致

#### Scenario: 初始用户仅用于开发或内测

- **WHEN** 部署或种子脚本执行
- **THEN** 初始用户 `user`/`1` 的创建可通过环境或脚本控制（如仅 development 或显式 seed），文档标明不用于生产或弱口令风险

---

### Requirement: 未登录访问受保护页时重定向到登录页并带回跳

系统 SHALL 在用户未登录且访问需要认证的页面时，重定向到登录页，并在登录成功后跳回原目标页或默认首页；与现有路由守卫行为一致。

#### Scenario: 未登录访问向导页

- **WHEN** 用户未登录并访问需要认证的路由（如 `/wizard/1`）
- **THEN** 前端路由守卫将用户重定向到登录页，且 URL 带 `redirect=/wizard/1`（或等价）参数

#### Scenario: 密码登录成功后跳转

- **WHEN** 用户在登录页通过用户名密码登录成功，且当前 URL 带有 `redirect` 参数
- **THEN** 前端跳转到 `redirect` 指向的路径；若无 `redirect` 则跳转到默认首页（如 `/wizard/1`）
