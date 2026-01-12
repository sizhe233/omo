import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentPromptMetadata } from "./types"
import { isGptModel } from "./types"
import { createAgentToolRestrictions } from "../shared/permission-compat"

const DEFAULT_MODEL = "openai/gpt-5.2"

export const CODE_REVIEWER_PROMPT_METADATA: AgentPromptMetadata = {
  category: "advisor",
  cost: "EXPENSIVE",
  promptAlias: "代码审阅",
  triggers: [
    { domain: "代码审阅", trigger: "代码质量检查、最佳实践、安全审计" },
  ],
  useWhen: [
    "提交前的代码审查",
    "PR/MR 代码审阅",
    "安全漏洞检查",
    "性能问题分析",
    "代码风格和最佳实践检查",
  ],
  avoidWhen: [
    "简单的语法修复",
    "已经通过 linter 的格式问题",
  ],
}

const CODE_REVIEWER_SYSTEM_PROMPT = `你是一位资深代码审阅专家，专注于代码质量、安全性和可维护性。

## 审阅维度

### 1. 代码质量
- **可读性**: 命名清晰、逻辑简洁
- **可维护性**: 模块化、低耦合
- **一致性**: 遵循项目风格

### 2. 安全性
- 输入验证和清理
- 敏感数据处理
- 常见漏洞模式（注入、XSS 等）

### 3. 性能
- 算法复杂度
- 资源使用（内存、连接）
- 潜在的性能瓶颈

### 4. 最佳实践
- 设计模式的合理使用
- 错误处理
- 测试覆盖

## 输出格式

\`\`\`
## 审阅摘要
[一句话总结代码质量]

## 🔴 必须修复 (Critical)
- [问题描述] → [建议修复方案]

## 🟡 建议改进 (Suggestion)
- [问题描述] → [改进建议]

## 🟢 做得好的地方
- [值得肯定的实践]

## 总体评分: X/10
\`\`\`

## 原则

- **建设性**: 指出问题的同时给出解决方案
- **优先级**: 先安全，再正确性，最后风格
- **尊重**: 对事不对人，代码可以改进但要尊重作者`

export function createCodeReviewerAgent(model: string = DEFAULT_MODEL): AgentConfig {
  const restrictions = createAgentToolRestrictions([
    "write",
    "edit",
    "task",
  ])

  const base = {
    description: "代码审阅专家 - 代码质量、安全性、最佳实践检查",
    mode: "subagent" as const,
    model,
    temperature: 0.1,
    ...restrictions,
    prompt: CODE_REVIEWER_SYSTEM_PROMPT,
  } as AgentConfig

  if (isGptModel(model)) {
    return { ...base, reasoningEffort: "medium" } as AgentConfig
  }

  return { ...base, thinking: { type: "enabled", budgetTokens: 16000 } } as AgentConfig
}

export const codeReviewerAgent = createCodeReviewerAgent()
