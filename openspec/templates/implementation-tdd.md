# OpenSpec 实现阶段：TDD 必选

本仓库要求：**实现阶段必须采用 TDD（测试驱动开发），单元测试为默认要求，不可省略。**

---

## 1. 任务列表（tasks.md）应如何写

- 每个「可测试的实现单元」须对应**两条任务**：一条**测试任务**、一条**实现任务**。
- **测试任务必须排在实现任务之前**，例如：

```markdown
## 1. 后端：XXX 模块（TDD）

- [ ] 1.1 为 XXX 编写单元测试：apps/server/src/modules/xxx/__tests__/xxx.service.spec.ts（预期：未实现时失败）
- [ ] 1.2 实现 XXX：apps/server/src/modules/xxx/xxx.service.ts，使 1.1 通过
```

- 任务描述中**须包含测试文件路径**与实现文件路径，便于执行与复查。
- 契约/接口类功能：先写契约测试或集成测试（含请求/响应断言），再写 Controller/Service 实现。

---

## 2. 执行顺序（实现时怎么做）

对**每一个**实现单元：

1. **Red**：先写该单元的测试（单元测试或契约测试），运行测试，**确认失败**（因尚未实现或行为不符）。
2. **Green**：再写/改实现代码，运行测试，**确认通过**。
3. **Refactor**：如需重构，保持测试通过，再勾选任务。

禁止：先写实现再补测试、或跳过测试直接写实现。

---

## 3. 测试范围约定

| 类型           | 后端 (apps/server)     | 前端 (apps/web)              |
|----------------|------------------------|------------------------------|
| 单元测试       | Jest，`*.spec.ts`      | Vitest，`*.spec.ts`          |
| 位置           | 同目录 `__tests__/` 或 `tests/unit/` | 同目录 `__tests__/` 或 `*.spec.ts` |
| 可 Mock        | 外部 HTTP、第三方 API、可选 DB | 外部 API、router、store     |
| 契约/集成测试  | Jest + Supertest，`tests/contract/`、`tests/integration/` | 接口行为可用 MSW 或真实后端 |

---

## 4. 与 config.yaml 的对应关系

- `openspec/config.yaml` 中 **rules.tasks** 与 **rules.implementation** 已规定：
  - 任务须「先测试、后实现」排列；
  - 实现阶段严格 TDD，单元测试为默认要求。
- 新建或修改 OpenSpec 变更时，**tasks.md 应遵循本模板**；实现时按上述执行顺序进行。

---

## 5. 参考

- 项目 Constitution：`.specify/memory/constitution.md`（测试优先为 NON-NEGOTIABLE）
- OpenSpec 规则：`openspec/config.yaml` → `rules.tasks`、`rules.implementation`
