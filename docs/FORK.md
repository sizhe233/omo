# Fork 文档

> 本文档记录 [sizhe233/omo](https://github.com/sizhe233/omo) 相对于上游 [code-yeongyu/oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) 的特色功能和修复。

**Fork 分支**: `my-customizations`
**上游分支**: `code-yeongyu/oh-my-opencode:dev`
**最后同步**: 2026-01-21 (第二次合并)

---

## 合并历史

### 2026-01-21 合并上游 dev 分支 (第二次)

**合并提交**: `dde88e4`

**上游主要变更** (10 个新 commits):
- Model Fallback System - 自动模型降级,支持跨提供商回退
- Atlas agent 重命名 (`orchestrator-sisyphus` → `Atlas`)
- Thinking Block Validator 重构为主动验证策略
- Session Recovery 错误检测顺序优化
- 不稳定 Agent 强制后台模式并等待结果
- 恢复并行后台 explore/librarian 提示
- Model Selection System 文档
- CLA 签署记录更新

**解决的冲突**:
- `src/agents/types.ts` - 保留 GPT 模型检测增强,合并 `Atlas` 重命名
- `src/agents/utils.ts` - 合并 `Atlas` 重命名,保留 3 个自定义 Agent

**保留的 Fork 特色**:
- ✅ Enhanced `isGptModel()` - 支持自定义 API 提供商 (如 `sub2api-oai/gpt-5.2`)
- ✅ 3 个自定义 Agent (git-master, code-reviewer, requirement-analyst)
- ✅ 中文 promptAlias
- ✅ Agent 架构文档 (docs/agent-architecture.md)
- ✅ Fork 文档 (docs/FORK.md)

**接受的上游变更**:
- ✅ Model Fallback System (新增 `src/cli/model-fallback.ts`)
- ✅ Thinking Block Validator 主动验证策略
- ✅ Atlas 重命名 (`atlas` → `Atlas`)
- ✅ Session Recovery 改进

**冲突解决策略**:
- GPT 模型检测: 保留 Fork 的自定义提供商支持逻辑
- Agent 注册: 合并上游 Atlas 重命名 + 保留 3 个自定义 Agent
- 文档: 自动保留 (上游未修改这些文件)

---

### 2026-01-21 合并上游 dev 分支 (第一次)

**合并提交**: `8875773`

**上游主要变更**:
- `orchestrator-sisyphus` → `atlas` 重命名（Agent 和 Hook）
- 删除 `document-writer` 和 `frontend-ui-ux-engineer` Agent（改用 Category）
- Category model catalog 和 `is_unstable_agent` 选项
- 不稳定 Agent 强制后台模式
- Session 创建重试机制
- 各种 bug 修复和文档更新

**解决的冲突**:
- `src/agents/index.ts` - 合并导出，保留 3 个新 Agent
- `src/agents/types.ts` - 合并类型定义，保留 GPT 模型检测增强
- `src/agents/utils.ts` - 合并 Agent 注册，添加新 Agent

**接受的上游删除**:
- `src/agents/document-writer.ts` ❌ 已删除
- `src/agents/frontend-ui-ux-engineer.ts` ❌ 已删除

**保留的 Fork 特色**:
- ✅ 3 个新 Agent (git-master, code-reviewer, requirement-analyst)
- ✅ 中文 promptAlias
- ✅ GPT 模型检测增强
- ✅ thinking-block-validator 修复
- ✅ Windows 兼容性修复
- ✅ Agent 架构文档

---

## 特色功能

### 1. 新增 3 个 Agent

| Agent | 中文别名 | 模型 | 用途 |
|-------|---------|------|------|
| `requirement-analyst` | 需求澄清 | claude-sonnet-4-5 | 面向外行的需求分析教练，渐进式对话引导 |
| `code-reviewer` | 代码审阅 | gpt-5.2 | 代码质量、安全性、最佳实践检查 |
| `git-master` | Git大师 | grok-code | Git 操作专家：提交、分支、合并、变基 |

#### requirement-analyst 特点
- **Phase 0 意图分类**：模糊愿景/问题驱动/功能请求/优化需求
- **5层渐进式对话**：北极星→用户场景→成功样子→边界→细节
- **选择题模式**：降低认知负担，不逼用户"写作文"
- **双层输出**：通俗版给客户，技术版给开发者
- **决策权边界**：从对话中自然揣摩用户技术背景

### 2. 中文 promptAlias

所有内置 Agent 的 `promptAlias` 改为中文，在 @ 提及列表中更直观：

| Agent | 原英文 | 现中文 |
|-------|--------|--------|
| oracle | oracle | 架构顾问 |
| librarian | librarian | 文档研究 |
| explore | explore | 探索者 |
| multimodal-looker | Multimodal Looker | 多模态观察 |

> **注意**: `frontend-ui-ux-engineer` 和 `document-writer` 已在 2026-01-21 合并中随上游删除，改用 Category 系统。

### 3. 用户自定义模型覆盖

支持在 `oh-my-opencode.json` 中为任意 Agent 配置自定义模型：

```json
{
  "agents": {
    "oracle": {
      "model": "my-provider/custom-gpt-5"
    }
  }
}
```

现已正确传递到 `call-omo-agent`、`delegate-task`、`look-at` 等工具。

### 4. Agent 架构文档

新增 `docs/agent-architecture.md`，详细记录：

- Agent Mode（primary/subagent/all）分类
- @ 提及执行流程
- Agent vs Category 的区别
- `sisyphus_task` 调用流程
- 配置文件覆盖机制
- **已知问题分析**：subagent_type 不传递 model 的问题

---

## Bug 修复

### 1. GPT 模型检测增强

**问题**：原 `isGptModel` 只支持 `openai/` 前缀，不支持自定义提供商。

**修复**：
- 使用 `includes("gpt")` 替代 `startsWith` 前缀检查
- 支持 `azure/gpt-4`、`sub2api-oai/gpt-5.2`、`custom/chatgpt-5` 等
- 扩展 O 系列检测：从 `^o[13]` 改为 `^o\d`，支持 o2、o4 等未来模型

```typescript
// 现在支持：
// - openai/gpt-5.2
// - sub2api-oai/gpt-5.2
// - azure/gpt-4o
// - custom/o3-pro
```

### 2. Thinking Block Validator 重构

**问题**：原逻辑尝试创建没有 signature 的合成 thinking blocks，导致 Anthropic API 返回 `"signature: Field required"` 400 错误。

**修复**（参考 claude-code-hub PR #576）：
- 移除没有有效 signature 的 thinking/reasoning blocks
- 移除非 thinking 类型 parts 上残留的 signature 字段
- **不再尝试创建无法验证的合成 thinking blocks**

### 3. Agent 模型配置动态查找

**问题**：`agentOverrides` 类型只支持固定的 agent 名称。

**修复**：
- 将类型断言改为 `Record<string, ...>` 支持任意 agent 名称
- Schema 添加 `Sisyphus-Junior`、`code-reviewer`、`git-master`、`requirement-analyst`

---

## Windows 兼容性修复

### 1. CLI 二进制检测

**问题**：`checkBinaryExists` 使用 Unix 的 `which` 命令，Windows 不支持。

**修复**：
```typescript
const isWindows = process.platform === "win32"
const cmd = isWindows ? "where" : "which"
```

### 2. LSP 服务器命令检测

**问题**：只检测 `.exe` 后缀，漏掉 npm 包常用的 `.cmd` 和 `.bat`。

**修复**：
- 扩展检测：`.exe`、`.cmd`、`.bat`
- 增加 npm/pnpm/yarn 全局安装路径支持：
  - `%APPDATA%\npm`
  - `%LOCALAPPDATA%\npm`
  - `$HOME\.yarn\bin`
  - `$HOME\.pnpm-global\bin`

### 3. 测试套件 Windows 兼容

| 测试文件 | 问题 | 修复 |
|---------|------|------|
| `migration.test.ts` | 硬编码 `/tmp/` | 改用 `os.tmpdir()` |
| `opencode-config-dir.test.ts` | Unix 路径格式 | 改用 `path.resolve()` |
| `env-cleaner.test.ts` | Windows `process.env` 行为差异 | 添加 undefined 处理 |
| `finder.test.ts` | 路径比较 | 统一 normalize |
| `finder.ts` | `isGitHubInstructionsDir` | 处理 Windows 反斜杠 |
| `storage.test.ts` | Unix 文件权限测试 | Windows 跳过 |

---

## 文件变更统计

```
新增文件:
+ docs/agent-architecture.md         (569 行)
+ src/agents/requirement-analyst.ts  (436 行)
+ src/agents/code-reviewer.ts        (99 行)
+ src/agents/git-master.ts           (78 行)

主要修改:
~ src/agents/types.ts                (isGptModel 增强)
~ src/hooks/thinking-block-validator/index.ts (重构策略)
~ src/tools/lsp/config.ts            (Windows 路径检测)
~ src/cli/doctor/checks/lsp.ts       (where vs which)
~ 6+ 测试文件                        (Windows 兼容)
```

---

## 已知问题

### subagent_type 调用不传递用户配置的 model

**状态**: 🟡 未修复（上游问题）

**问题**：通过 `sisyphus_task(subagent_type="oracle")` 调用时，用户在配置中设置的 `agents.oracle.model` **不会传递**到 API。

**临时方案**：使用 `category` 而非 `subagent_type`：

```typescript
// ❌ model 可能不生效
sisyphus_task(subagent_type: "oracle", prompt: "...")

// ✅ model 会生效
sisyphus_task(category: "ultrabrain", prompt: "...")
```

**详细分析**：见 `docs/agent-architecture.md` 的"已知问题"章节。

---

## 如何同步上游

```bash
# 添加上游 remote（如果没有）
git remote add upstream https://github.com/code-yeongyu/oh-my-opencode.git

# 获取上游更新
git fetch upstream dev

# 合并到 my-customizations 分支
git checkout my-customizations
git merge upstream/dev

# 解决冲突后提交
git add .
git commit -m "Merge upstream/dev: resolve conflicts"
git push origin my-customizations
```

---

*最后更新：2026-01-21*
