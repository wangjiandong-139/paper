# Clarification Log: 傻瓜式 AI 写论文

**Feature**: ai-paper-writing
**Session Date**: 2026-03-15
**Total Questions**: 5

---

## Q1: 生成完成通知方式

**Category**: Interaction & UX

**Question**: 论文生成完成后，系统应通过哪些渠道通知用户？

**Options Presented**:
- **A**: 仅页面内通知（轮询或 WebSocket 推送）
- **B**: 页面内通知 + 微信公众号/小程序消息通知
- **C**: 页面内通知 + 微信 + 短信
- **Other**: 自定义答案

**Recommended**: B — 覆盖大多数用户场景，微信触达率高

**User's Choice**: B — 页面内通知 + 微信公众号/小程序消息通知

**Resolution**: 需求 6 验收标准 8 更新为：生成完成后页面内更新订单状态，同时通过微信公众号或小程序发送模板消息通知用户。

---

## Q2: 系统推荐文献的数据来源

**Category**: Integration & External Dependencies

**Question**: 步骤 2「系统推荐文献」的数据来源是什么？

**Options Presented**:
- **A**: 自建文献库（人工维护或爬取后存储）
- **B**: 接入第三方学术数据库 API（如知网、万方、维普）
- **C**: 接入国际数据库（如 Semantic Scholar、CrossRef 等开放 API）
- **D**: B + C 同时支持（中英文分别走不同数据源）
- **Other**: 自定义答案

**Recommended**: B — 接入知网/万方等主流学术数据库 API，文献真实可靠

**User's Choice**: D — 中文走知网/万方/维普，英文走 Semantic Scholar/CrossRef 等开放 API

**Resolution**: 需求 3 验收标准 1 更新，明确中文文献接入知网/万方/维普 API，英文文献接入 Semantic Scholar/CrossRef 等开放 API。

---

## Q3: 用户身份认证方式

**Category**: Functional Scope & Behavior

**Question**: 用户如何登录/注册系统？（支付、订单、多端同步均依赖用户身份）

**Options Presented**:
- **A**: 手机号 + 验证码登录
- **B**: 微信授权登录（公众号/小程序）
- **C**: A + B 均支持（手机号或微信二选一）
- **D**: 手机号 + 密码，另支持微信绑定
- **Other**: 自定义答案

**Recommended**: B — 微信一键登录对移动端用户最友好，与微信通知天然打通

**User's Choice**: B — 微信授权登录（公众号/小程序）

**Resolution**: 新增需求 12「用户身份认证」，明确以微信授权登录为唯一登录方式，订单与进度与微信账号关联。

---

## Q4: 支付方式

**Category**: Integration & External Dependencies

**Question**: 步骤 4 支持哪些支付渠道？

**Options Presented**:
- **A**: 仅微信支付
- **B**: 微信支付 + 支付宝
- **C**: 微信支付 + 支付宝 + 银行卡
- **Other**: 自定义答案

**Recommended**: B — 微信支付与微信登录体系一致，移动端体验最顺畅

**User's Choice**: A — 仅微信支付

**Resolution**: 需求 5 验收标准 3 明确支付渠道为微信支付（公众号/小程序内 JSAPI 支付，PC 端 Native 扫码支付）。

---

## Q5: 后台生成超时策略

**Category**: Non-Functional Quality Attributes

**Question**: 步骤 5 后台按章生成全文，是否设置超时限制？

**Options Presented**:
- **A**: 不设超时，生成完成为止
- **B**: 单章超时 10 分钟则标记失败，支持单章重试
- **C**: 全文超时 30 分钟则整单失败，需重新下单
- **Other**: 自定义答案

**Recommended**: B — 给用户明确预期，超时后允许重试而非直接失败

**User's Choice**: A — 不设超时，生成完成为止

**Resolution**: 需求 6 验收标准 1 补充说明：后台生成不设超时限制，系统持续运行直至全文生成完成；「生成中」页展示当前章节进度文案，无预计剩余时间。

---

## Summary

| # | Question | Category | Choice | Applied To |
|---|----------|----------|--------|------------|
| 1 | 生成完成通知方式 | Interaction & UX | B（页面内 + 微信） | 需求 6 验收标准 8 |
| 2 | 系统推荐文献数据来源 | Integration | D（中文知网/万方 + 英文开放 API） | 需求 3 验收标准 1 |
| 3 | 用户身份认证方式 | Functional Scope | B（微信授权登录） | 新增需求 12 |
| 4 | 支付方式 | Integration | A（仅微信支付） | 需求 5 验收标准 3 |
| 5 | 后台生成超时策略 | Non-Functional | A（不设超时） | 需求 6 验收标准 1 |

---

## Impact on Specification

- **Sections Modified**: 需求 3、需求 5、需求 6
- **New Requirements Added**: 需求 12（用户身份认证）
- **Requirements Changed**:
  - 需求 3 验收标准 1：明确中英文文献数据源
  - 需求 5 验收标准 3：明确微信支付渠道
  - 需求 6 验收标准 1：补充不设超时说明
  - 需求 6 验收标准 8：补充微信通知渠道
