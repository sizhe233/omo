# Agent 架构与 @ 提及机制

> 本文档记录 oh-my-opencode 中 Agent、Category 的架构设计和 @ 提及的执行流程。

## 概述

oh-my-opencode 有两个核心概念：

- **Agent**：独立的 AI 实体，有自己的 system prompt、model、tools
- **Category**：任务配置模板，用于调整 Sisyphus-Junior 子 agent 的行为

## Agent Mode（代理模式）

每个 Agent 都有一个 `mode` 字段，决定它的调用方式：

| mode           | 说明             | @ 列表可见？ | 可作为主控？ |
| -------------- | ---------------- | ------------ | ------------ |
| `"primary"`  | 主控 agent       | ❌           | ✅           |
| `"subagent"` | 子 agent         | ✅           | ❌           |
| `"all"`      | 两者皆可（默认） | ✅           | ✅           |

### 当前 Agent 的 mode 配置

```typescript
// src/agents/sisyphus.ts
mode: "primary" as const  // 主控

// src/agents/oracle.ts
mode: "subagent" as const  // 子 agent

// 其他 agent（librarian, explore, document-writer 等）
mode: "subagent" as const  // 都是子 agent
```

**代码位置**：`src/agents/*.ts` 中的 `mode` 字段

## @ 提及执行流程

当用户在对话框中输入 `@oracle 帮我分析架构` 时：

```
用户输入: "@oracle 帮我分析架构"
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  OpenCode TUI 识别到 @oracle                     │
│  触发 TaskTool                                   │
│  创建一个 **新的子会话 (child session)**         │
│  parentID 指向当前主会话                         │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  Oracle Agent (在子会话中运行)                   │
│  - 使用 oracle 的 system prompt                  │
│  - 使用 oracle 的 model (gpt-5.2)               │
│  - 使用 oracle 的 temperature (0.1)             │
│  - 独立执行任务                                  │
└─────────────────────────────────────────────────┘
                    │
                    ▼
           结果返回给用户
           (主会话仍然是 Sisyphus)
```

### 关键点

1. **@ 提及 ≠ 替换主控**：@ 一个 agent 不会替换 Sisyphus 成为主控
2. **创建子会话**：@ 提及会创建一个独立的子会话，子会话使用被 @ 的 agent
3. **主会话保持不变**：主会话仍然是 Sisyphus，只是创建了一个子任务
4. **权限绕过**：@ 提及时会绕过权限检查，用户可以调用任何 subagent

### @ 列表过滤规则

@ 列表只显示符合以下条件的 agent：

- `mode` 不是 `"primary"`（或者是 `"subagent"` 或 `"all"`）
- `hidden` 不是 `true`

**参考**：OpenCode SDK 中的 `TaskTool` 处理 @ 提及逻辑

## Agent vs Category

### Agent（代理）

```typescript
// 定义位置：src/agents/*.ts
// 注册位置：src/agents/index.ts 的 builtinAgents

const oracleAgent: AgentConfig = {
  model: "openai/gpt-5.2",
  mode: "subagent",
  prompt: ORACLE_SYSTEM_PROMPT,  // 完整的 system prompt
  temperature: 0.1,
  // ...
}
```

**特点**：

- 有独立的 system prompt
- 有固定的 model（可通过配置覆盖）
- 可以在 @ 列表中被用户直接调用
- 在子会话中独立运行

### Category（类别）

```typescript
// 定义位置：src/tools/delegate-task/constants.ts

const DEFAULT_CATEGORIES = {
  "visual-engineering": {
    model: "google/gemini-3-pro-preview",
    temperature: 0.7,
  },
  "ultrabrain": {
    model: "openai/gpt-5.2",
    temperature: 0.1,
  },
  // ...
}
```

**特点**：

- 只有 model、temperature、prompt_append 等配置
- **没有**完整的 system prompt，只有追加内容
- **不会**出现在 @ 列表中
- 是 Sisyphus-Junior 的"换装"配置

### 对比表

| 特性               | Agent                                                | Category                          |
| ------------------ | ---------------------------------------------------- | --------------------------------- |
| 独立 system prompt | ✅                                                   | ❌（只有 prompt_append）          |
| @ 列表可见         | ✅（subagent mode）                                  | ❌                                |
| 用户直接调用       | ✅（@oracle）                                        | ❌                                |
| 调用方式           | `@agent` 或 `sisyphus_task(subagent_type="xxx")` | `sisyphus_task(category="xxx")` |
| 载体               | 自己                                                 | Sisyphus-Junior                   |

## sisyphus_task 调用流程

Sisyphus 主 agent 在需要委派任务时调用 `sisyphus_task`：

### 使用 Category

```typescript
sisyphus_task(
  category: "visual-engineering",
  prompt: "Create a responsive dashboard...",
  skills: ["frontend-ui-ux"],
  run_in_background: false
)
```

流程：

```
Sisyphus ─→ sisyphus_task(category) ─→ Sisyphus-Junior
                                       (使用 category 的 model/config)
                                       ─→ 结果返回 Sisyphus
```

### 使用 Agent

```typescript
sisyphus_task(
  subagent_type: "oracle",
  prompt: "Analyze this architecture...",
  run_in_background: false
)
```

流程：

```
Sisyphus ─→ sisyphus_task(agent) ─→ Oracle Agent
                                    (使用 oracle 的 prompt/model)
                                    ─→ 结果返回 Sisyphus
```

## 配置文件覆盖

### 覆盖现有 Agent 的配置

```json
// oh-my-opencode.json
{
  "agents": {
    "oracle": {
      "model": "anthropic/claude-sonnet-4",
      "temperature": 0.2,
      "prompt_append": "额外的指令..."
    }
  }
}
```

**代码位置**：

- Schema：`src/config/schema.ts` 的 `AgentOverridesSchema`
- 应用逻辑：`src/agents/utils.ts` 的 `createBuiltinAgents`

### 覆盖 Category 的配置

```json
// oh-my-opencode.json
{
  "categories": {
    "visual-engineering": {
      "model": "openai/gpt-4o",
      "temperature": 0.5
    },
    "my-custom-category": {
      "model": "anthropic/claude-haiku-4",
      "temperature": 0.3,
      "prompt_append": "自定义指令..."
    }
  }
}
```

**代码位置**：

- Schema：`src/config/schema.ts` 的 `CategoriesConfigSchema`
- 内置定义：`src/tools/delegate-task/constants.ts` 的 `DEFAULT_CATEGORIES`

## isGptModel 模型检测

用于判断模型是否为 GPT 系列，以应用不同的配置：

```typescript
// src/agents/types.ts
export function isGptModel(model: string): boolean {
  return model.toLowerCase().includes("gpt")
}
```

**用途**：GPT 模型使用 `reasoningEffort`，Claude 模型使用 `thinking`

```typescript
// src/agents/oracle.ts
if (isGptModel(model)) {
  return { ...base, reasoningEffort: "medium", textVerbosity: "high" }
}
return { ...base, thinking: { type: "enabled", budgetTokens: 32000 } }
```

## 相关代码位置索引

| 概念               | 文件位置                                     |
| ------------------ | -------------------------------------------- |
| Agent 定义         | `src/agents/*.ts`                          |
| Agent 注册         | `src/agents/index.ts` 的 `builtinAgents` |
| Agent 类型         | `src/agents/types.ts`                      |
| Agent 构建工具     | `src/agents/utils.ts`                      |
| Category 定义      | `src/tools/delegate-task/constants.ts`     |
| sisyphus_task 工具 | `src/tools/delegate-task/tools.ts`         |
| 配置 Schema        | `src/config/schema.ts`                     |
| Agent 工具限制     | `src/shared/agent-tool-restrictions.ts`    |

---

## 已知问题

### 🐛 subagent_type 调用时不传递配置的 model

**问题描述**：

当通过 `sisyphus_task(subagent_type="oracle")` 调用子 agent 时，用户在配置文件中设置的 `agents.oracle.model` **不会被传递**到 API 调用中。

**代码位置**：`src/tools/delegate-task/tools.ts` 第 596-608 行

```typescript
await client.session.prompt({
  path: { id: sessionID },
  body: {
    agent: agentToUse,
    system: systemContent,
    tools: { ... },
    parts: [{ type: "text", text: args.prompt }],
    ...(categoryModel ? { model: categoryModel } : {}),  // ← 只有 category 才传 model！
  },
})
```

**问题分析**：

| 调用方式                                  | model 来源                                | 是否传递到 API？   |
| ----------------------------------------- | ----------------------------------------- | ------------------ |
| `sisyphus_task(category="xxx")`         | `categoryModel`（从 category 配置解析） | ✅ 传递            |
| `sisyphus_task(subagent_type="oracle")` | ❌**没有读取 agent 的 model**       | ❌**不传递** |

**流程对比**：

```
【Category 方式 - 正常】
category="visual-engineering"
    → resolveCategoryConfig → 获取 model
    → categoryModel = { providerID, modelID }
    → client.session.prompt({ model: categoryModel })  ✅

【Agent 方式 - 问题】
subagent_type="oracle"
    → agentToUse = "oracle"
    → categoryModel = undefined  ❌ 没有读取 oracle 配置的 model
    → client.session.prompt({ agent: "oracle" })  ← 没传 model！
```

**影响**：

1. 用户在 `oh-my-opencode.json` 中设置的 `agents.oracle.model` 只在**插件启动时**生效
2. 通过 `sisyphus_task(subagent_type="oracle")` 调用时，OpenCode 会使用 agent 定义时的默认 model
3. 用户配置的自定义 model 可能被忽略

**临时解决方案**：

使用 Category 而非 subagent_type 来调用需要自定义 model 的任务：

```typescript
// 不要这样（model 可能不生效）
sisyphus_task(subagent_type: "oracle", prompt: "...")

// 改用 category（model 会生效）
sisyphus_task(category: "ultrabrain", prompt: "...")
```

**待修复**：

需要在 `delegate-task/tools.ts` 中添加逻辑，当使用 `subagent_type` 时也读取并传递 agent 配置的 model。

---

### 🐛 硬编码模型使用场景完整分析

以下是所有会使用硬编码默认模型的场景详细分析：

#### 各 Agent 的硬编码默认模型

| Agent                       | 默认 Model                        | 代码位置                                  |
| --------------------------- | --------------------------------- | ----------------------------------------- |
| `Sisyphus`                | `anthropic/claude-opus-4-5`     | `src/agents/sisyphus.ts`                |
| `oracle`                  | `openai/gpt-5.2`                | `src/agents/oracle.ts`                  |
| `librarian`               | `opencode/glm-4.7-free`         | `src/agents/librarian.ts`               |
| `explore`                 | `opencode/grok-code`            | `src/agents/explore.ts`                 |
| `frontend-ui-ux-engineer` | `google/gemini-3-pro-preview`   | `src/agents/frontend-ui-ux-engineer.ts` |
| `document-writer`         | `google/gemini-3-flash-preview` | `src/agents/document-writer.ts`         |
| `multimodal-looker`       | `google/gemini-3-flash`         | `src/agents/multimodal-looker.ts`       |
| `Metis`                   | `anthropic/claude-opus-4-5`     | `src/agents/metis.ts`                   |
| `Momus`                   | `openai/gpt-5.2`                | `src/agents/momus.ts`                   |
| `Sisyphus-Junior`         | `anthropic/claude-sonnet-4-5`   | `src/agents/sisyphus-junior.ts`         |
| `orchestrator-sisyphus`   | `anthropic/claude-sonnet-4-5`   | `src/agents/orchestrator-sisyphus.ts`   |

#### 所有 session.prompt 调用点分析

##### 1. `call_omo_agent` 工具

**文件**：`src/tools/call-omo-agent/tools.ts` 第 186-197 行

**触发场景**：

- AI 调用 `call_omo_agent(subagent_type="explore", prompt="...")`
- AI 调用 `call_omo_agent(subagent_type="librarian", prompt="...")`

**允许的 agent**：只有 `explore` 和 `librarian`（定义在 `constants.ts` 的 `ALLOWED_AGENTS`）

**问题**：❌ **不传递 model**

```typescript
await ctx.client.session.prompt({
  body: {
    agent: args.subagent_type,  // 只传 agent 名称
    // 没有 model 字段！
  },
})
```

**影响**：即使用户配置了 `agents.explore.model = "xxx"`，仍使用硬编码默认值。

---

##### 2. `sisyphus_task` / `delegate_task` 工具

**文件**：`src/tools/delegate-task/tools.ts` 第 596-608 行

**触发场景**：

- AI 调用 `sisyphus_task(category="visual-engineering", prompt="...")`
- AI 调用 `sisyphus_task(subagent_type="oracle", prompt="...")`

**问题**：⚠️ **只有 category 模式传递 model**

| 调用方式                            | model 传递 | 实际使用的模型                    |
| ----------------------------------- | ---------- | --------------------------------- |
| `category="visual-engineering"`   | ✅ 传递    | category 配置的模型               |
| `subagent_type="oracle"`          | ❌ 不传递  | `openai/gpt-5.2` (硬编码)       |
| `subagent_type="document-writer"` | ❌ 不传递  | `google/gemini-3-flash-preview` |

---

##### 3. `look_at` 工具（多模态分析）

**文件**：`src/tools/look-at/tools.ts` 第 120-135 行

**触发场景**：AI 调用 `look_at(file_path="xxx.pdf", goal="分析内容")`

**问题**：❌ **不传递 model**

```typescript
await ctx.client.session.prompt({
  body: {
    agent: MULTIMODAL_LOOKER_AGENT,  // "multimodal-looker"
    // 没有 model 字段！
  },
})
```

**影响**：始终使用 `google/gemini-3-flash`

---

##### 4. `background-agent/manager.ts`（后台任务）

**文件**：`src/features/background-agent/manager.ts` 第 178-191, 410-422 行

**触发场景**：

- `sisyphus_task(run_in_background=true, ...)`
- 后台任务 resume

**情况**：✅ **如果调用者传入 model，则会传递**

```typescript
this.client.session.prompt({
  body: {
    agent: input.agent,
    ...(input.model ? { model: input.model } : {}),  // 取决于调用者
  },
})
```

**但问题**：调用者（delegate_task）在 subagent_type 模式下不传 model，所以后台任务也没有 model。

---

##### 5. `session-recovery` Hook（会话恢复）

**文件**：`src/hooks/session-recovery/index.ts` 第 77-84 行

**触发场景**：崩溃后自动恢复会话

**情况**：✅ **尝试恢复原 model**（从之前的消息中提取）

---

##### 6. `todo-continuation-enforcer` Hook（TODO 继续）

**文件**：`src/hooks/todo-continuation-enforcer.ts` 第 233-240 行

**触发场景**：TODO 未完成时自动继续

**情况**：✅ **尝试继承当前 model**

---

##### 7. `sisyphus-orchestrator` Hook

**文件**：`src/hooks/sisyphus-orchestrator/index.ts` 第 496-504 行

**触发场景**：Sisyphus 编排器继续

**情况**：✅ **尝试继承当前 model**

---

##### 8. `ralph-loop` Hook

**文件**：`src/hooks/ralph-loop/index.ts` 第 356-364 行

**触发场景**：ralph-loop 自动继续

**情况**：✅ **尝试继承当前 model**

---

#### 总结表

| 场景                                   | 触发方式 | model 传递   | 实际使用的模型            |
| -------------------------------------- | -------- | ------------ | ------------------------- |
| **call_omo_agent(explore)**      | AI 调用  | ❌           | `opencode/grok-code`    |
| **call_omo_agent(librarian)**    | AI 调用  | ❌           | `opencode/glm-4.7-free` |
| **sisyphus_task(category)**      | AI 调用  | ✅           | category 配置             |
| **sisyphus_task(subagent_type)** | AI 调用  | ❌           | agent 硬编码默认值        |
| **look_at**                      | AI 调用  | ❌           | `google/gemini-3-flash` |
| **后台任务**                     | AI 调用  | 取决于调用者 | 继承或默认                |
| **会话恢复**                     | 自动     | ✅           | 尝试恢复原 model          |
| **TODO 继续**                    | 自动     | ✅           | 继承当前 model            |
| **ralph-loop**                   | 自动     | ✅           | 继承当前 model            |
| **sisyphus-orchestrator**        | 自动     | ✅           | 继承当前 model            |

---

### 相关 GitHub Issues

#### OpenCode 官方仓库 (anomalyco/opencode)

| Issue                                                   | 状态    | 标题                                                 | 官方回复                              |
| ------------------------------------------------------- | ------- | ---------------------------------------------------- | ------------------------------------- |
| [#7099](https://github.com/anomalyco/opencode/issues/7099) | 🟡 OPEN | Server API ignores agent's configured model          | "This seems to be a bug w/ ur plugin" |
| [#6928](https://github.com/anomalyco/opencode/issues/6928) | 🟡 OPEN | Subtask commands do not inherit model                | 无回复                                |
| [#6636](https://github.com/anomalyco/opencode/issues/6636) | 🟡 OPEN | Subagent with specific model results in model change | "ill fix"                             |

**说明**：#7099 官方认为是插件问题，但报告者使用的是 `opencode-antigravity-auth` 而非 oh-my-opencode，说明问题可能在 SDK 层面。

#### oh-my-opencode 仓库 (code-yeongyu/oh-my-opencode)

| Issue                                                          | 状态    | 标题                                            | 说明                             |
| -------------------------------------------------------------- | ------- | ----------------------------------------------- | -------------------------------- |
| [#839](https://github.com/code-yeongyu/oh-my-opencode/issues/839) | 🟡 OPEN | Proposal: Centralize hardcoded model references | 提案：创建模型注册表             |
| [#641](https://github.com/code-yeongyu/oh-my-opencode/issues/641) | 🟡 OPEN | Agent model config not applied                  | **已验证：误报**（见下方） |
| [#811](https://github.com/code-yeongyu/oh-my-opencode/issues/811) | 🟡 OPEN | Overwrite original antigravity model config     | 安装后覆盖模型配置               |
| [#376](https://github.com/code-yeongyu/oh-my-opencode/issues/376) | 🟡 OPEN | Models change randomly                          | 模型随机变化                     |

---

### Issue #641 验证结果

**结论**：Issue #641 描述的问题**不存在**（或已修复）。

#### 验证过程

1. **检查 OpenCode SDK 的 AgentConfig 类型**：

```typescript
// node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts
export type AgentConfig = {
    model?: string;  // ← 是字符串类型！
    // ...
}
```

2. **检查我们的 Agent 定义**：

```typescript
// src/agents/oracle.ts
model,  // 这是字符串，如 "openai/gpt-5.2"
```

3. **检查 session.prompt 调用**：

```typescript
// src/features/background-agent/types.ts
model?: { providerID: string; modelID: string }  // ← 需要对象格式
```

4. **检查转换逻辑**：`delegate-task/tools.ts` 中的 `resolveCategoryConfig` 会将字符串解析为对象。

#### 结论

| 场景                          | model 格式 | 说明                |
| ----------------------------- | ---------- | ------------------- |
| **AgentConfig 定义**    | `string` | SDK 期望字符串 ✅   |
| **session.prompt 调用** | `object` | 代码中有转换逻辑 ✅ |

**真正的问题不是格式不匹配，而是 `subagent_type` 模式下根本不读取也不传递 model。**

---

*最后更新：2026-01-18*
