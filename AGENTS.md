# AGENTS.md — paper 仓库 + Paperclip + Cursor

面向人类与 AI 协作者：本仓库用 **Cursor** 在本地改代码，用 **Paperclip**（独立控制面）做目标、工单、预算与审计；规范驱动开发继续走 **OpenSpec / Speckit**（见 [.cursor/rules/specify-rules.mdc](.cursor/rules/specify-rules.mdc)）。

## 1. 先读这些

1. [.cursor/rules/specify-rules.mdc](.cursor/rules/specify-rules.mdc) — 技术栈、目录、`pnpm` 命令、Speckit / OpenSpec 命令流  
2. 本文「Paperclip 与 Cursor」各节 — 领单、映射、节奏  

## 2. Paperclip 环境（本机）

- **安装/首次向导**：`npx --yes paperclipai onboard --yes`  
  - 默认：**local_trusted**、**loopback `127.0.0.1:3100`**、嵌入式 Postgres（数据在实例目录下）。  
  - 需局域网 / Tailscale：`npx paperclipai onboard --yes --bind lan` 或 `--bind tailnet`（见上游 README）。  
- **日常启动**（已 onboard）：`npx paperclipai run`（或上游文档中的等价命令）。  
- **健康检查**：`Invoke-RestMethod http://127.0.0.1:3100/api/health`（或 `curl`）。  
- **Board UI**：`http://127.0.0.1:3100`  
- **实例与配置目录（Windows 示例）**：`%USERPROFILE%\.paperclip`，默认实例配置：`instances\default\config.json`。  
- **遥测（可选关闭）**：环境变量 `PAPERCLIP_TELEMETRY_DISABLED=1`，或配置里 `telemetry.enabled: false`（见上游 README）。  
- **预算**：在 Board 为各 agent 设置月度预算；达到上限后 agent 停止（上游产品行为）。  

Paperclip **不作为**本 monorepo 的 npm 依赖；控制面与 `apps/`、`packages/` 代码库分离。

## 3. 在 Paperclip 里为「paper」建模（Board 一次性 + 日常）

在 Board 中完成（具体菜单以当前版本为准）：

1. **Company**：若尚无，则创建；用于隔离数据与工单前缀。  
2. **顶层 Goal**：与产品/迭代目标一致（例：完成某 capability）。  
3. **Project / 子目标**：把 Goal 拆到可交付粒度，便于工单携带「为何做」的祖先链。  
4. **组织**：最小结构即可，例如 Owner → TechLead（拆单/策略）→ Engineer（Cursor 执行）；审批边界写清。  
5. **雇佣 Cursor 类 Agent**：在 Agent 配置中选择 **Cursor** adapter，**工作目录**设为 **`d:\code\paper`**（若路径不同则改为本机克隆路径）；按需配置 API Key / 批准策略（若开启「新 agent 需 Board 批准」则在此处放行）。  
6. **CLI 辅助**（可选）：`npx paperclipai company list`、`npx paperclipai agent list -C <companyId>`、`npx paperclipai agent local-cli <agentRef> -C <companyId>`（为已存在 agent 生成本地 API key、安装上游提供的 Codex/Claude skills；Cursor 侧以 Board 配置为准）。  

## 4. 工单与仓库规范的映射约定（必遵守）

| Paperclip | paper 仓库 |
|-----------|------------|
| 每条实施工单的 **Description 开头** | 写：`OpenSpec: openspec/changes/<id>` 和/或 `Speckit: specs/<feature>` 的可复制路径（或 PR/文档链接） |
| 工单验收标准 | 对应变更目录下 `tasks.md` 勾选、或 OpenSpec verify 清单 |
| 大功能里程碑 | 对齐 `openspec/changes/...` 生命周期：`new` → `apply` → `sync` → `archive` |

**Cursor 在 IDE 内**：继续用 OpenSpec skills（`.cursor/skills/openspec-*.md`）与 Speckit 流程改代码；**Paperclip** 负责排期、委派、成本与审计。

## 5. Cursor 领单 / 开发 / 验证 / 提交

1. **领单**：在 Paperclip 将工单指派给 Cursor agent（或自行从 backlog 领取并在评论中声明）。  
2. **上下文**：打开本仓库 Cursor 聊天；Description 中的 OpenSpec/Speckit 路径即首要上下文。  
3. **实现**：只改任务所需文件；风格与邻近代码一致。  
4. **验证**（按变更范围选择）：  
   - `pnpm lint`  
   - `pnpm --filter @ai-paper/server test`  
   - `pnpm --filter @ai-paper/admin test`  
5. **收尾**：推送分支；在工单贴 PR 链接与摘要；验收通过后关闭工单并在 OpenSpec 侧 **sync/archive**（若适用）。  

## 6. 周节奏与 Heartbeat

- **周一**：从 Goal 刷新本周 tickets；每条关联 `openspec/changes/<id>` 或 `specs/<feature>`。  
- **每日**：Agent 执行 → 本地验证 → 推分支 → 工单更新。  
- **合入前**：lint/测试绿；需要时在 Paperclip 记录决策摘要。  
- **迭代末**：OpenSpec 归档与 Paperclip 里程碑对齐关闭。  
- **Heartbeat**：Paperclip 实例默认有心跳调度（间隔见启动日志，如 30000ms）。对**重复性**工作（依赖审计、定时同步 `openspec/specs`、轻量冒烟）在 Board 建 **Routine / 定时任务**（名称与周期以当前 UI 为准），指派给负责 agent 或配合本机脚本；**合并生产**仍建议人工或显式审批门槛。  

## 7. 端到端演练记录（可复制）

本计划实施时已验证：

1. `npx --yes paperclipai onboard --yes` → `http://127.0.0.1:3100/api/health` 返回 `ok`。  
2. `npx paperclipai company list` 取得 `companyId`。  
3. `npx paperclipai issue create -C <companyId> --title "..." --description "OpenSpec: openspec/changes/<change-id>"` 创建样板工单；可用 `issue comment <issueId> --body "..."` 补充多行说明。  

样板工单标识示例：**WJD-1**（前缀随 Company 配置变化）。新环境请先 `company list` 再替换 `-C` 参数。

## 8. 参考链接

- Paperclip 上游：<https://github.com/paperclipai/paperclip>  
- 上游 AGENTS（Paperclip 自身仓库贡献指南）：<https://github.com/paperclipai/paperclip/blob/master/AGENTS.md>  

## 9. 新建 Paperclip 公司（从零：团队 + 棕地首单）

用于**弃用旧 Company、换一张干净控制面**时按序执行（菜单名以当前 Board 为准）。旧公司数据通常仍保留在同一实例下，仅切换当前 Company 上下文即可。

### 9.1 创建 Company

1. Board：**新建 / New company**（或 Company 切换器里的 **Add**）。  
2. **Company name**（可直接用）：`AI论文写作 · Paper`  
3. **Mission / goal**（可整段粘贴）：

   > 以微信 H5 + PC Web 交付**向导式 AI 写论文**全流程（文献必选、提纲、支付下单、后台生成、改稿导出），工程上交付 **Web 用户端、后端服务与管理后台**；本仓库为**棕地**，演进以**读懂再改、最小 diff** 为原则。规范与任务追踪对齐 `docs/` 设计与 OpenSpec/Speckit。

4. 完成向导或保存后，记下新公司的 **工单前缀**；终端可用 `npx paperclipai company list` 取 **companyId**（`-C` 参数）。

### 9.2 组织（Org）——推荐两条链，二选一

**方案 A（最省事，仅一个 Cursor）**

- **Owner**：你（Board 登录用户）。  
- **Engineer · Paper**：挂在 Owner 下（或直接向 Owner 汇报，以 UI 为准）。  
- **不雇 CEO agent**；管理、拆单、批预算全部由你在 Board 完成。

**方案 B（要 CEO 角色 + 仍只有一个写仓库的 Cursor）**

- **Owner → CEO · Paper → Engineer · Paper**。  
- **CEO · Paper**：若有 Claude/Codex 等，优先用作「拆单/评论」；若仍为 Cursor，则必须在 CEO 的 Instructions 中写死**不承担 IC、不改仓库**，所有改代码工单 **assignee 只能是 Engineer · Paper**。  
- **Engineer · Paper**：**Cursor CLI (local)**，工作目录 **`d:\code\paper`**，承担全部 IC。

无论 A/B：**汇报链不要留空**，避免路由与委派歧义。

### 9.3 雇佣 Agent（顺序建议）

1. 先建 **Engineer · Paper**（Cursor）→ 跑 **Adapter / Environment Check** → 设**月度预算**。  
2. 若采用方案 B，再建 **CEO · Paper**（Adapter 与提示词按你与团队约定；见上文 CEO 边界）。  
3. 若开启 **「新 agent 需 Board 批准」**：在 **Approvals** 中全部放行。

**Engineer · Paper 提示词**（可贴入该 agent 的 Instructions）：以「`d:\code\paper` 唯一 IC、棕地最小 diff、遵守本 `AGENTS.md` 与 `.cursor/rules/specify-rules.mdc`、工单含 `OpenSpec:`/`Speckit:` 时先读规范再改」为核心；全文可用对话内已给出的精简/完整版。

### 9.4 顶层 Goal 与首发工单（棕地）

1. **Goals**：建 1 条顶层目标（例：`MVP：向导主流程 + 订单/生成骨架 + admin 最小能力`），再拆 **Project** 或子目标（粒度以能派单为准）。  
2. **首条 Issue（推荐标题）**：`棕地摸底：梳理现有 web/server/admin 与文档差距，输出 MVP 增量清单`  
3. **Description** 须包含：工作目录 `d:\code\paper`、只读梳理步骤、对照 `docs/应用设计建议-傻瓜式AI写论文.md` 与 `docs/应用设计建议-傻瓜式AI写论文-后台管理功能清单.md`、输出「已具备 vs 文档」表与 P0/P1 子任务、**本阶段不大改业务代码**；若已有 OpenSpec 变更，**首行**写 `OpenSpec: openspec/changes/<id>`。  
4. **Assignee**：**Engineer · Paper**（不要派给 CEO）。  
5. 用 **`npx paperclipai issue create -C <companyId> ...`** 或 Board 创建均可；多行说明可用 `issue comment` 追加。

### 9.5 Routines（可选，稳定后再加）

- 先 **0～1 条**：如「每周 `pnpm audit` 简报」或「每周 lint + 轻量 test」；指派 **Engineer · Paper**；单次 Issue 能在约一小时内完成或明确仅报告。

### 9.6 与旧公司的关系

- **仓库仍是同一个** `d:\code\paper`；仅 Paperclip 侧换 **companyId** 与工单池。  
- 旧 Company 可保留作历史；新 Company 的 CLI 命令一律用 **`company list` 得到的新 id`**。  
- 若需从旧实例**导出再导入**公司包：见上游 `paperclipai company export` / `import` 文档（大迁移时用）。
