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

---

## Q6: 智能选题实现方式

**Category**: Functional Scope & Behavior

**Question**: 步骤 1「智能选题」的题目从哪里来？

**Options Presented**:
- **A**: 预置题库，按学科/类型筛选推荐
- **B**: 调用 AI 实时生成（根据学科 + 学历/类型生成若干题目）
- **C**: A + B 结合（先走题库，无结果再 AI 生成）
- **Other**: 自定义答案

**Recommended**: B — 调用 AI 实时生成，灵活度高，无需维护题库

**User's Choice**: B — 调用 AI 实时生成

**Resolution**: 需求 2 验收标准 4 更新，明确「智能选题」调用 AI 接口实时生成题目建议。

---

## Q7: 改稿页「加图片」生成方式

**Category**: Functional Scope & Behavior

**Question**: 改稿页「加图片和表格」中，图片由谁生成？

**Options Presented**:
- **A**: 图和表都由 AI 生成文字描述，用户自行替换真实图表
- **B**: 图调用 AI 绘图接口生成（如 DALL-E/Stable Diffusion），表格由 AI 生成内容后渲染为表格
- **C**: 图仅支持用户手动上传，表格由 AI 生成内容
- **D**: 图和表均由 AI 生成占位内容，导出时标注「[图/表待补充]」
- **Other**: 自定义答案

**Recommended**: B — 图表分开处理，更符合学术论文场景

**User's Choice**: B — 图调用 AI 绘图接口生成，表格由 AI 生成内容后渲染为表格

**Resolution**: 需求 7 验收标准 2 更新，明确插图调用 AI 绘图接口，插表由 AI 生成结构化内容后渲染。

---

## Q8: 查重第三方服务商

**Category**: Integration & External Dependencies

**Question**: 步骤 6 查重接入哪个第三方服务？

**Options Presented**:
- **A**: 万方检测
- **B**: 知网学术不端检测（CNKI）
- **C**: 维普查重
- **D**: 暂不指定，由运营配置（支持多家切换）
- **Other**: 自定义答案

**Recommended**: B — 知网查重是国内高校最认可的查重系统

**User's Choice**: D — 暂不指定，由运营配置，支持多家切换

**Resolution**: 需求 7 验收标准 6 更新，PlagiarismChecker 通过可配置接口支持多家查重服务商，由运营后台配置当前启用的服务商。

---

## Q9: 改稿次数限制

**Category**: Functional Scope & Behavior

**Question**: 用户是否可以对同一篇论文无限次使用改稿 AI 能力？

**Options Presented**:
- **A**: 不限次数，所有套餐均可无限进入改稿
- **B**: 按套餐限制：基础版有限次（如 3 次），无限改稿版不限次
- **C**: 不限进入次数，但每次 AI 操作按次计费
- **Other**: 自定义答案

**Recommended**: B — 与套餐挂钩，既有商业价值又给用户明确预期

**User's Choice**: B — 基础版有限次，无限改稿版不限次

**Resolution**: 需求 7 验收标准 1 补充套餐限制说明：基础版 AI 改稿操作合计不超过 3 次，无限改稿版不限次，剩余次数在改稿页显示。

---

## Q10: 未支付草稿保留期限

**Category**: Domain & Data Model

**Question**: 用户未完成支付的写作草稿保留多久？

**Options Presented**:
- **A**: 永久保留（直到用户主动删除）
- **B**: 保留 7 天，到期前提醒用户继续或删除
- **C**: 保留 30 天，到期自动清除
- **D**: 仅保留最近 1 条草稿，新建时覆盖旧草稿
- **Other**: 自定义答案

**Recommended**: B — 7 天足够用户回来继续，也避免无限期占用存储

**User's Choice**: A — 永久保留，直到用户主动删除

**Resolution**: 需求 1 验收标准 7 补充：未支付草稿永久保留，直到用户主动删除。

---

## Session 2 Summary

| # | Question | Category | Choice | Applied To |
|---|----------|----------|--------|------------|
| 6 | 智能选题实现方式 | Functional Scope | B（AI 实时生成） | 需求 2 验收标准 4 |
| 7 | 改稿页加图片生成方式 | Functional Scope | B（AI 绘图 + AI 生成表格） | 需求 7 验收标准 2 |
| 8 | 查重第三方服务商 | Integration | D（运营配置，多家切换） | 需求 7 验收标准 6 |
| 9 | 改稿次数限制 | Functional Scope | B（按套餐限制） | 需求 7 验收标准 1 |
| 10 | 未支付草稿保留期限 | Domain & Data | A（永久保留） | 需求 1 验收标准 7 |

---

## Q11: 产品形态

**Category**: Functional Scope & Behavior

**Question**: 产品是微信小程序、独立 Web，还是公众号 H5？

**Options Presented**:
- **A**: 微信小程序（仅小程序）
- **B**: 独立 Web 应用（H5 + PC，不依赖微信生态）
- **C**: 微信公众号内 H5 + PC Web（同一套代码，微信内走公众号授权）
- **D**: 微信小程序 + PC Web 双端
- **Other**: 自定义答案

**Recommended**: C — 微信内 H5 + PC Web 覆盖最广，开发成本低于小程序双端

**User's Choice**: C — 微信公众号内 H5 + PC Web，同一套代码

**Resolution**: 简介与需求 12 更新，明确产品形态为微信公众号内 H5 + PC Web，移动端走公众号 OAuth，PC 端走微信扫码登录。

---

## Q12: AI 率保障版套餐定义

**Category**: Functional Scope & Behavior

**Question**: 「AI 率保障版」套餐的保障机制是什么？

**Options Presented**:
- **A**: 保障 AI 检测率低于阈值，否则免费重做
- **B**: 保障 AI 检测率低于阈值，超出则系统自动触发降 AI 痕迹处理直至达标
- **C**: 保障查重率低于阈值
- **D**: 暂不定义，由产品运营决定
- **Other**: 自定义答案

**Recommended**: B — 降低 AI 检测率是用户核心诉求，明确阈值便于系统实现

**User's Choice**: B — 系统自动触发降 AI 痕迹处理直至达标

**Resolution**: 需求 5 验收标准 2 补充 AI 率保障版定义：保障 AI 检测率低于约定阈值，超出时系统自动触发降 AI 痕迹处理直至达标。

---

## Q13: 多草稿并行支持

**Category**: Domain & Data Model

**Question**: 用户可以同时拥有多个进行中的写作草稿吗？

**Options Presented**:
- **A**: 每个用户只能有 1 个未支付草稿
- **B**: 支持多个草稿并行，草稿列表展示所有未支付草稿
- **C**: 支持多草稿，但最多 3 个
- **Other**: 自定义答案

**Recommended**: B — 支持多草稿，用户可以同时写多篇论文，体验更灵活

**User's Choice**: B — 支持多个草稿并行，草稿列表展示所有未支付草稿

**Resolution**: 需求 1 验收标准 7 补充：系统支持多草稿并行，草稿列表展示该用户所有未支付草稿，用户可随时切换继续编辑。

---

## Q14: 开题报告解析方式

**Category**: Functional Scope & Behavior

**Question**: 步骤 1 上传开题报告后如何处理文件内容？

**Options Presented**:
- **A**: 纯文本提取，直接展示给用户
- **B**: 调用 AI 提取研究主题、关键词、研究方法等结构化信息，自动填入 AI 投喂字段
- **C**: 仅作为附件存储，生成时作为上下文传给 AI，不做解析展示
- **Other**: 自定义答案

**Recommended**: B — 调用 AI 提取关键信息，比纯文本提取更智能，能直接填入 AI 投喂字段

**User's Choice**: B — 调用 AI 提取结构化信息，自动填入 AI 投喂字段

**Resolution**: 需求 2 验收标准 5 更新，明确调用 AI 从开题报告中提取研究主题、关键词、研究方法等，自动填入 AI 投喂字段供用户核对。

---

## Session 3 Summary

| # | Question | Category | Choice | Applied To |
|---|----------|----------|--------|------------|
| 11 | 产品形态 | Functional Scope | C（公众号 H5 + PC Web） | 简介、需求 12 |
| 12 | AI 率保障版定义 | Functional Scope | B（自动降 AI 痕迹至达标） | 需求 5 验收标准 2 |
| 13 | 多草稿并行支持 | Domain & Data | B（支持多草稿并行） | 需求 1 验收标准 7 |
| 14 | 开题报告解析方式 | Functional Scope | B（AI 提取结构化信息） | 需求 2 验收标准 5 |

---

## Q15: 退款策略

**Category**: Functional Scope & Behavior

**Question**: 用户支付后对生成结果不满意，是否支持退款？

**Options Presented**:
- **A**: 不支持退款，生成完成即视为服务完成
- **B**: 生成完成前可申请退款；生成完成后不退款，但可申请重新生成一次
- **C**: 支持退款，由客服人工审核处理
- **Other**: 自定义答案

**Recommended**: B — 生成完成后不退款，但提供重新生成机会，降低运营风险

**User's Choice**: A — 不支持退款，生成完成即视为服务完成

**Resolution**: 需求 5 新增验收标准 6：支付完成后不支持退款，生成完成视为服务完成，订单不可撤销。

---

## Q16: 客服入口实现方式

**Category**: Interaction & UX

**Question**: 系统中「联系客服」入口的具体形式是什么？

**Options Presented**:
- **A**: 跳转微信客服（企业微信客服或公众号客服消息）
- **B**: 页面内嵌在线客服窗口（如腾讯云客服、美洽等第三方）
- **C**: 展示客服微信二维码，用户扫码添加
- **D**: 跳转到客服表单页，用户填写问题后提交
- **Other**: 自定义答案

**Recommended**: A — 微信客服与整体微信生态一致，用户无需切换 App

**User's Choice**: C — 展示客服微信二维码弹窗，用户扫码添加

**Resolution**: 需求 2 验收标准 6、需求 6 验收标准 6、需求 8 验收标准 3 中「客服入口」统一更新为展示客服微信二维码弹窗。

---

## Session 4 Summary

| # | Question | Category | Choice | Applied To |
|---|----------|----------|--------|------------|
| 15 | 退款策略 | Functional Scope | A（不支持退款） | 需求 5 新增验收标准 6 |
| 16 | 客服入口实现方式 | Interaction & UX | C（客服微信二维码弹窗） | 需求 2、6、8 |
