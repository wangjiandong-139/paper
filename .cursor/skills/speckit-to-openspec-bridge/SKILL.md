---
name: speckit-to-openspec-bridge
description: When a Speckit feature is complete, sync its spec to openspec/specs/ as the main spec source of truth. Use when the user wants to bridge a finished Speckit feature into OpenSpec main specs.
license: MIT
compatibility: Works with specs/ (Speckit) and openspec/specs/ (main spec source).
metadata:
  author: paper
  version: "1.0"
---

Bridge a completed Speckit feature into OpenSpec main specs so that `openspec/specs/` remains the single source of truth and document consistency is kept between Speckit and OpenSpec.

**When to use**: After a Speckit feature (e.g. `001-admin-portal`) has been implemented and the user wants to sync it to the main spec store, or when onboarding existing Speckit specs into the OpenSpec world.

**Input**: Optionally the feature directory or branch name (e.g. `001-admin-portal`). If omitted, infer from conversation or list `specs/*` and let the user choose.

---

## Steps

1. **Identify the Speckit feature**
   - If not provided: list directories under `specs/` whose names match `NNN-*` (e.g. `001-admin-portal`). Use **AskUserQuestion** if multiple exist.
   - Set `FEATURE_DIR = specs/<NNN-feature-name>/` and read `FEATURE_DIR/spec.md`.

2. **Derive the capability name**
   - From the feature directory name (e.g. `001-admin-portal`), derive capability: strip the leading digits and hyphen, use kebab-case. Examples:
     - `001-admin-portal` → `admin-portal`
     - `002-user-auth` → `user-auth`
   - Set `CAPABILITY = <derived-name>` and `MAIN_SPEC = openspec/specs/<CAPABILITY>/spec.md`.

3. **Convert Speckit spec to OpenSpec main spec format**
   - **Source**: `specs/<NNN-feature>/spec.md` (sections: User Scenarios & Testing, Requirements, Success Criteria, Key Entities).
   - **Target format**: OpenSpec main spec (Purpose + Requirements with SHALL + Scenarios with WHEN/THEN).

   **Conversion rules**:
   - **Purpose**: One short paragraph. Use the feature title from the spec (e.g. "后台管理网站（Admin Portal）") and a 1–2 sentence summary of scope.
   - **Requirements**: Map each Speckit item to an OpenSpec requirement:
     - From **Functional Requirements**: `**FR-XXX**: System MUST ...` → `### Requirement: <Short title>\n\nSystem SHALL ...` (replace MUST with SHALL).
     - From **User Stories**: Either fold into Purpose or add a high-level requirement (e.g. "系统 SHALL 支持运营人员处理异常订单与重试生成任务") and add key Acceptance Scenarios as scenarios.
   - **Scenarios**: Map acceptance scenarios to OpenSpec scenario form:
     - `**Given** A, **When** B, **Then** C` → `#### Scenario: <brief name>\n- **WHEN** <B (and relevant A)>\n- **THEN** <C>`
     - Prefer one scenario per requirement when possible; group multiple Given/When/Then into one scenario if they describe the same flow.
   - **Key Entities**: Optional short "Key Entities" or "Data" section in the main spec (can be bullet list), or omit if the main spec is long.

4. **Write or merge into main spec**
   - If `openspec/specs/<CAPABILITY>/spec.md` does **not** exist:
     - Create directory `openspec/specs/<CAPABILITY>/`.
     - Write the full main spec (Purpose, Requirements with scenarios).
   - If it **exists**:
     - Read the current main spec. Treat the Speckit content as **ADDED** (new capability): merge new requirements and scenarios without removing existing content. If a requirement with the same intent exists, update it; otherwise append.

5. **Optional: record in archive**
   - Optionally create or append to a short note under `openspec/changes/archive/` that this capability was bridged from Speckit feature `specs/<NNN-feature>/` on date YYYY-MM-DD (e.g. in a README or a single markdown file). Not required for the bridge to be complete.

6. **Summary**
   - Report: capability name, path to main spec, and what was added or updated (e.g. "Created openspec/specs/admin-portal/spec.md with 23 requirements from specs/001-admin-portal/spec.md").

---

## Format reference

**Speckit (source)**:
```markdown
## Requirements
- **FR-001**: 系统 MUST 提供订单列表，支持按时间范围、订单状态筛选…
**Acceptance Scenarios**:
1. **Given** 运营人员已登录，**When** 在订单列表按状态筛选「失败」，**Then** 仅展示生成失败的订单。
```

**OpenSpec main spec (target)**:
```markdown
# <Capability name>

## Purpose
<One short paragraph.>

## Requirements

### Requirement: 订单列表与筛选
System SHALL 提供订单列表，支持按时间范围、订单状态筛选…

#### Scenario: 按状态筛选失败订单
- **WHEN** 运营人员已登录并在订单列表按状态筛选「失败」
- **THEN** 仅展示生成失败的订单
```

---

## Guardrails

- Do not remove or overwrite existing content in `openspec/specs/<CAPABILITY>/spec.md` when merging; only add or update.
- Use kebab-case for capability names and align with existing openspec/specs/ naming (e.g. `admin-portal`, `web-username-password-auth`).
- If the same capability is already being changed in an active OpenSpec change (`openspec/changes/<name>/specs/<capability>/`), warn the user and suggest resolving the change first (sync or archive) to avoid conflicting edits.
- One capability per Speckit feature by default; if one spec spans multiple domains, split into multiple capabilities only when the user explicitly asks.
