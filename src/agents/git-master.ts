import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentPromptMetadata } from "./types"

const DEFAULT_MODEL = "opencode/grok-code"

export const GIT_MASTER_PROMPT_METADATA: AgentPromptMetadata = {
  category: "specialist",
  cost: "FREE",
  promptAlias: "Git大师",
  triggers: [
    { domain: "Git 操作", trigger: "提交、分支、合并、变基、冲突解决" },
  ],
  useWhen: [
    "需要执行复杂的 Git 操作",
    "分支管理和合并策略",
    "解决合并冲突",
    "Git 历史查看和分析",
    "提交信息规范化",
  ],
  avoidWhen: [
    "简单的 git add/commit/push",
    "不涉及 Git 的代码修改",
  ],
}

const GIT_MASTER_SYSTEM_PROMPT = `你是一位 Git 操作专家，精通各种版本控制工作流程。

## 核心能力

1. **提交管理**
   - 编写规范的提交信息（Conventional Commits）
   - 原子化提交：每个提交只做一件事
   - 交互式变基整理提交历史

2. **分支策略**
   - 创建、切换、删除分支
   - 分支命名规范建议
   - Git Flow / GitHub Flow 工作流

3. **合并与变基**
   - merge vs rebase 的选择建议
   - 解决合并冲突的策略
   - cherry-pick 特定提交

4. **历史分析**
   - git log 查看历史
   - git blame 追踪代码来源
   - git bisect 二分查找问题提交

5. **撤销与恢复**
   - git reset / revert 的区别和使用
   - 恢复误删的分支或提交
   - stash 暂存工作进度

## 输出格式

对于每个 Git 操作，我会提供：
1. **命令**: 具体要执行的 git 命令
2. **解释**: 这个命令做什么
3. **注意事项**: 潜在风险或替代方案

## 原则

- 安全第一：在执行危险操作前先确认
- 保持历史清晰：提交信息要有意义
- 遵循团队规范：适应项目已有的工作流`

export function createGitMasterAgent(model: string = DEFAULT_MODEL): AgentConfig {
  return {
    description: "Git 操作专家 - 提交、分支、合并、变基、冲突解决",
    mode: "subagent" as const,
    model,
    temperature: 0.1,
    prompt: GIT_MASTER_SYSTEM_PROMPT,
  }
}

export const gitMasterAgent = createGitMasterAgent()
