---
marp: true
theme: default
paginate: true
backgroundColor: #fff
style: |
  section { font-size: 28px; }
  section.title { text-align: center; }
  h2 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 0.3em; }
  table { font-size: 0.85em; }
---

<!-- _class: title -->

# Speckit 与 OpenSpec 协同工作

规范驱动开发：为什么用、怎么用、何时用

---

## 目录

1. **为什么用** — 痛点与目标  
2. **两个工具简介** — Speckit vs OpenSpec  
3. **怎么协同** — 统一规范源与双工作流  
4. **什么情况下用** — 场景与选择  
5. **怎么用** — 命令与流程  
6. **优点** — 协同带来的价值  

---

## 1. 为什么用？

**痛点**
- 需求、设计、实现容易脱节，「 vibe 编码」导致后期返工  
- 规范散落在对话、文档、代码里，没有单一事实来源  
- 大功能需要完整规划，小改动又希望快速迭代，一套流程难以兼顾  

**目标**
- **规范先行**：先有 spec，再写代码，减少偏差  
- **规范一致**：主规范集中存放，Speckit 与 OpenSpec 产出都汇聚到同一处  
- **按需选流程**：大功能用 Speckit 做全链路规划，小变更用 OpenSpec 做增量闭环  

---

## 2. Speckit 与 OpenSpec 简介

| 维度 | Speckit | OpenSpec |
|------|---------|----------|
| **定位** | 功能级完整规划 | 变更级增量管理 |
| **产出** | spec + plan + research + tasks + contracts | proposal + delta spec + design + tasks |
| **规范形态** | 完整 User Stories + Requirements | ADDED/MODIFIED/REMOVED 增量 |
| **适合** | 新功能、多用户故事、复杂设计 | 小范围修改、单 capability、快迭代 |
| **典型命令** | /speckit.specify → plan → tasks | /opsx:new → continue → apply → sync/archive |

两者都面向「规范驱动」，但粒度不同：Speckit 按「功能」、OpenSpec 按「变更」。

---

## 3. 怎么协同？— 统一规范源

**主规范源**：`openspec/specs/<capability>/spec.md`

- Speckit 功能完成后，通过 **桥接** 将 `specs/<NNN-feature>/spec.md` 转为并写入 `openspec/specs/<capability>/spec.md`  
- OpenSpec 变更归档时，通过 **sync** 将 delta spec 合并进 `openspec/specs/<capability>/spec.md`  

这样无论从哪条路径来，最终都汇聚到同一份主规范，便于对齐代码与文档。

---

## 3. 怎么协同？— 双工作流并存

```
Speckit:  specify → clarify → plan → tasks → implement → 桥接 → openspec/specs/
OpenSpec: new → proposal → specs → design → tasks → apply → sync/archive → openspec/specs/
```

**约定**：同一 capability 同一时间只用一种工作流，避免两边同时改同一能力导致冲突。

---

## 4. 什么情况下用？

| 场景 | 用哪个 | 说明 |
|------|--------|------|
| 新功能、多用户故事、要 plan/research/contracts | **Speckit** | 完整 specify → plan → tasks → 实现 |
| 小范围增量、单 capability、快速迭代 | **OpenSpec** | new → continue → apply，可选 sync/archive |
| Speckit 功能已实现完，要纳入主规范 | **桥接** | 用 speckit-to-openspec-bridge 同步到 openspec/specs/ |

**简单记**：大而全用 Speckit，小而快用 OpenSpec；做完 Speckit 再桥接到主规范。

---

## 5. 怎么用？— Speckit 流程

1. **/speckit.specify** — 根据功能描述生成 `specs/<NNN-feature>/spec.md`  
2. **/speckit.clarify** — 澄清不明确需求（可选）  
3. **/speckit.plan** — 生成 plan、research、data-model、contracts  
4. **/speckit.tasks** — 生成可执行任务列表  
5. **implement** — 按 tasks 实现  
6. **桥接** — 完成后用 speckit-to-openspec-bridge 同步到 `openspec/specs/<capability>/spec.md`  

---

## 5. 怎么用？— OpenSpec 流程

1. **/opsx:new** — 新建变更目录 `openspec/changes/<name>/`  
2. **/opsx:continue** — 按提示依次写 proposal、specs、design、tasks  
3. **/opsx:apply** — 按 tasks 实施  
4. **/opsx:sync** — 将 delta spec 合并到 `openspec/specs/<capability>/spec.md`（可选，也可在归档时做）  
5. **/opsx:archive** — 归档变更  

小改动可以只做 new → 写 delta spec → apply → sync，不必写全所有 artifact。

---

## 6. 优点

- **规范可追溯**：主规范在 `openspec/specs/`，大功能（Speckit）与小变更（OpenSpec）都汇聚于此，方便对照代码。  
- **流程可择**：大功能走 Speckit 全链路，小改动走 OpenSpec 短链路，按需选择，不强行统一。  
- **AI 友好**：Spec-First + 明确 artifact 结构，便于 AI 理解上下文、生成与校验实现。  
- **减少漂移**：Constitution、steering、openspec config 统一治理，规范与实现一致性更容易维护。  

---

## 小结

- **为什么用**：规范先行、单一事实来源、大功能与小迭代都能覆盖。  
- **怎么协同**：以 `openspec/specs/` 为主规范源，Speckit 桥接 + OpenSpec sync 双路径写入。  
- **什么情况用**：大而全用 Speckit，小而快用 OpenSpec；做完 Speckit 再桥接。  
- **优点**：可追溯、可择流程、AI 友好、减少规范与实现漂移。  

详细操作见：`docs/speckit-openspec-workflow.md`

---

<!-- _class: title -->

# 谢谢

Q & A
