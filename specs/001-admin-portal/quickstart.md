# Quickstart: 后台管理网站（Admin Portal）

## Goal

在本地启动后台管理站、NestJS 服务端、PostgreSQL 和 Redis，并验证关键后台流程：

- 后台账号登录
- 失败订单重试与任务告警
- 学校模板启停与用户提交处理
- 用户禁用与风控
- 第三方配置更新与即时生效
- 统计看板查询

## Prerequisites

- Node.js 20+
- pnpm workspace
- Docker / Docker Compose
- PostgreSQL 和 Redis 可通过 `docker-compose.yml` 启动

## 1. 安装依赖

```powershell
pnpm install
```

## 2. 启动基础服务

```powershell
docker compose up -d postgres redis
```

如果当前 `docker-compose.yml` 服务名不同，请按实际服务名启动数据库与 Redis。

## 3. 准备数据库

```powershell
pnpm --filter @ai-paper/server prisma migrate dev
```

如实现阶段提供 seed 或 bootstrap 脚本，还需要创建一个初始超级管理员账号。该账号应具备：

- `role=SUPER_ADMIN`
- 状态为启用
- 满足后台密码策略

## 4. 启动服务端

```powershell
pnpm --filter @ai-paper/server start:dev
```

预期服务端暴露：

- 用户端 API
- `/api/admin/*` 后台接口
- Redis session 支持
- BullMQ 队列连接

## 5. 启动后台前端

```powershell
pnpm --filter @ai-paper/admin dev
```

预期后台前端运行于本地 Vite 端口，仅针对宽屏桌面浏览器访问。

## 6. 登录后台

使用初始化的超级管理员账号登录后台，验证：

- 登录成功后进入后台首页或订单列表
- 浏览器中未暴露可读的后台凭证
- 无操作 8 小时会过期（可通过测试缩短配置验证）

## 7. 验证关键流程

### 订单与任务

1. 打开订单列表并按 `FAILED` 筛选
2. 进入订单详情查看任务日志
3. 点击“重新触发生成”
4. 确认订单状态变为 `GENERATING`
5. 将一个长时间运行的任务模拟为运行超过 2 小时，确认列表显示异常警示标记

### 模板管理

1. 新建学校模板（学校名 + 学历）
2. 上传 `.dotx`
3. 启用模板
4. 验证同一 `(school + degree)` 不能重复创建
5. 停用模板后确认其不再出现在前台搜索结果中

### 用户风控

1. 查询某个前台用户
2. 配置单日生成上限
3. 执行禁用
4. 验证该用户后续新登录被拒绝

### 配置管理

1. 打开查重或引用核对配置页面
2. 确认密钥始终显示为 `****`
3. 更新服务地址与新密钥
4. 保存前通过连通性测试
5. 验证后续请求使用新配置，无需重启服务

### 后台账号

1. 超管创建一个运营账号
2. 使用运营账号登录，确认只能访问授权菜单
3. 使用任意角色测试自助修改密码
4. 尝试禁用最后一个超级管理员，确认系统拒绝操作

### 看板

1. 打开概览看板
2. 切换 `day / week / month`
3. 验证订单趋势、漏斗、失败原因、收入分布在 5 秒内返回

## 8. Recommended Test Order

```powershell
pnpm --filter @ai-paper/server test
pnpm --filter @ai-paper/web test
pnpm --filter @ai-paper/admin test
```

如果实现阶段补齐 contract test / integration test / Playwright，可按以下顺序执行：

1. Contract tests
2. Server integration tests
3. Admin frontend unit tests
4. Admin Playwright E2E

## Expected Deliverables After Implementation

- `apps/admin` 可本地启动
- `apps/server` 暴露 `/api/admin/*`
- `packages/shared` 提供后台共享 DTO / enums / types
- 订单、任务、模板、用户、配置、看板功能均可联调
