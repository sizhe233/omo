import type { AgentConfig } from "@opencode-ai/sdk"

export type AgentFactory = (model: string) => AgentConfig

/**
 * Agent category for grouping in Sisyphus prompt sections
 */
export type AgentCategory = "exploration" | "specialist" | "advisor" | "utility"

/**
 * Cost classification for Tool Selection table
 */
export type AgentCost = "FREE" | "CHEAP" | "EXPENSIVE"

/**
 * Delegation trigger for Sisyphus prompt's Delegation Table
 */
export interface DelegationTrigger {
  /** Domain of work (e.g., "Frontend UI/UX") */
  domain: string
  /** When to delegate (e.g., "Visual changes only...") */
  trigger: string
}

/**
 * Metadata for generating Sisyphus prompt sections dynamically
 * This allows adding/removing agents without manually updating the Sisyphus prompt
 */
export interface AgentPromptMetadata {
  /** Category for grouping in prompt sections */
  category: AgentCategory

  /** Cost classification for Tool Selection table */
  cost: AgentCost

  /** Domain triggers for Delegation Table */
  triggers: DelegationTrigger[]

  /** When to use this agent (for detailed sections) */
  useWhen?: string[]

  /** When NOT to use this agent */
  avoidWhen?: string[]

  /** Optional dedicated prompt section (markdown) - for agents like Oracle that have special sections */
  dedicatedSection?: string

  /** Nickname/alias used in prompt (e.g., "Oracle" instead of "oracle") */
  promptAlias?: string

  /** Key triggers that should appear in Phase 0 (e.g., "External library mentioned → fire librarian") */
  keyTrigger?: string
}

/**
 * Checks if a model is a GPT/OpenAI reasoning model.
 * Supports custom providers (e.g., "sub2api-oai/gpt-5.2", "codex/o3-pro")
 * by checking the model name portion, not just the provider prefix.
 */
export function isGptModel(model: string): boolean {
  // Direct OpenAI provider
  if (model.startsWith("openai/") || model.startsWith("github-copilot/gpt-")) {
    return true
  }

  // Extract model name after provider prefix (e.g., "sub2api-oai/gpt-5.2" -> "gpt-5.2")
  const modelName = model.includes("/") ? model.split("/").pop()! : model

  // GPT models (gpt-4, gpt-5, gpt-4o, gpt-4-turbo, etc.)
  if (modelName.startsWith("gpt-")) {
    return true
  }

  // OpenAI reasoning models (o1, o3, o4, o1-pro, o3-mini, etc.)
  if (/^o\d/.test(modelName)) {
    return true
  }

  return false
}

export type BuiltinAgentName =
  | "Sisyphus"
  | "oracle"
  | "librarian"
  | "explore"
  | "multimodal-looker"
  | "Metis (Plan Consultant)"
  | "Momus (Plan Reviewer)"
  | "Atlas"
  // Fork additions
  | "git-master"
  | "code-reviewer"
  | "requirement-analyst"

export type OverridableAgentName =
  | "build"
  | BuiltinAgentName

export type AgentName = BuiltinAgentName

export type AgentOverrideConfig = Partial<AgentConfig> & {
  prompt_append?: string
  variant?: string
}

export type AgentOverrides = Partial<Record<OverridableAgentName, AgentOverrideConfig>>
