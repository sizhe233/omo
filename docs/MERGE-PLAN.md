# 上游合并计划

**日期**: 2026-01-21  
**上游分支**: `code-yeongyu/oh-my-opencode:dev`  
**待合并提交数**: 33 个（排除 CLA 签名）

---

## 一、上游变更分类

### 1. 重大架构变更 (HIGH RISK)

| 提交 | 变更 | 影响 |
|------|------|------|
| `96bcd97` | `orchestrator-sisyphus` → `atlas` 重命名 | Agent 名称、类型定义、schema |
| `c46d57f` | `sisyphus-orchestrator` hook → `atlas` hook | Hook 目录、导出、配置 |
| `3e52657` | **删除** `frontend-ui-ux-engineer` agent | 改用 category="visual-engineering" |
| `f188732` | **删除** `document-writer` agent | 改用 category="writing" |
| `8cc9958` | Category 系统重构 | 移除 temperature，合并 CATEGORY_MODEL_CATALOG |

### 2. 功能增强 (MEDIUM RISK)

| 提交 | 变更 |
|------|------|
| `9729548` | 新增 `is_unstable_agent` 配置选项 |
| `18e02a3` | 不稳定 agent 强制后台模式 |
| `3d3d3e4` | Category 内置 model 优先于继承 model |
| `824da62` | Categories 和 skills 传递到 Sisyphus/Atlas prompts |
| `3be387d` | Category model catalog 默认模型 |
| `193c176` | omo-env 添加当前日期 |

### 3. Bug 修复 (LOW RISK)

| 提交 | 变更 |
|------|------|
| `6a4add2` | Session 创建重试机制 |
| `18262e7` | 使用 updateSessionAgent 防止 Prometheus fallback |
| `7ccb8fc` | Sisyphus/Prometheus 启用 question 工具 |
| `6956ce0` | 修复 config.data.model 访问模式 |
| `f39f77d` | 修复 model config 缺失错误信息 |
| `c698a5b` | 移除硬编码 model 默认值 |
| `5ce9c98` | 修复 README 超链接 |

### 4. 其他变更 (LOW RISK)

| 提交 | 变更 |
|------|------|
| `2c3f1bf` | 移除 ChatGPT 订阅检查 |
| `4e8106b` | 稳定化 non-interactive env hook 测试 |
| `d8d274f` | 欺诈网站警告 |
| `e40e42e` | features.md 文档重组 |
| `c941b5a` | bun.lock 同步 |

---

## 二、冲突预测

### 🔴 必然冲突

| 文件 | 原因 | 解决策略 |
|------|------|----------|
| `src/agents/types.ts` | 上游删除 document-writer/frontend，我们新增 3 个 agent | **保留我们的新增**，同步删除 |
| `src/agents/index.ts` | 导出变更 | 合并双方导出 |
| `src/config/schema.ts` | 上游 atlas 重命名 + 我们新增 agent | 合并两边改动 |
| `AGENTS.md` | 双方都有修改 | 合并内容 |

### 🟡 可能冲突

| 文件 | 原因 |
|------|------|
| `src/agents/sisyphus.ts` | 上游重命名 prompt builder |
| `src/tools/delegate-task/constants.ts` | Category 系统重构 |
| `src/hooks/sisyphus-orchestrator/` | **目录重命名为 atlas** |
| `src/index.ts` | 导出变更 |

### 🟢 无冲突

| 文件类型 |
|---------|
| 我们独有的 Windows 兼容修复 |
| 我们独有的 GPT 模型检测增强 |
| 我们独有的 thinking-block-validator 修复 |
| 我们独有的 3 个新 Agent 文件 |

---

## 三、合并策略

### 方案 A：直接 merge (推荐)

```bash
git fetch upstream dev
git checkout my-customizations
git merge upstream/dev
# 解决冲突
git add .
git commit -m "Merge upstream/dev: resolve conflicts for atlas rename and agent changes"
```

**优点**: 保留完整历史，冲突一次解决  
**缺点**: 可能有较多冲突需要手动处理

### 方案 B：Cherry-pick 精选

按风险分批 cherry-pick：

```bash
# 第 1 批：低风险修复
git cherry-pick 6a4add2 18262e7 7ccb8fc 6956ce0 f39f77d 5ce9c98

# 第 2 批：功能增强
git cherry-pick 9729548 18e02a3 3d3d3e4 824da62 193c176

# 第 3 批：重大重构（需要仔细处理）
git cherry-pick 96bcd97 c46d57f 8cc9958 3be387d

# 第 4 批：Agent 删除（决定是否接受）
# git cherry-pick 3e52657 f188732  # 可选：是否跟随上游删除
```

**优点**: 控制力强，可以选择不接受某些变更  
**缺点**: 历史复杂，后续同步困难

---

## 四、保留 vs 放弃决策

### 必须保留（我们的特色）

| 功能 | 理由 |
|------|------|
| `requirement-analyst` agent | 独特功能，上游没有 |
| `code-reviewer` agent | 独特功能，上游没有 |
| `git-master` agent | 独特功能，上游没有 |
| 中文 promptAlias | 本地化需求 |
| GPT 模型检测增强 | 支持更多提供商 |
| thinking-block-validator 修复 | Bug 修复（可能上游后续会合入） |
| Windows 兼容修复 | 跨平台支持 |

### 需要决策

| 上游变更 | 选项 | 建议 |
|---------|------|------|
| 删除 `frontend-ui-ux-engineer` | 接受/拒绝 | **接受** - 改用 category 更灵活 |
| 删除 `document-writer` | 接受/拒绝 | **接受** - 改用 category 更灵活 |
| `atlas` 重命名 | 接受/拒绝 | **接受** - 跟随上游命名 |

---

## 五、执行步骤

### Step 1: 备份当前分支

```bash
git branch backup-my-customizations
```

### Step 2: 尝试合并

```bash
git fetch upstream dev
git merge upstream/dev --no-commit
```

### Step 3: 识别冲突

```bash
git status
# 列出所有冲突文件
```

### Step 4: 解决冲突

按优先级处理：

1. **types.ts** - 保留我们的 3 个新 agent，同步上游删除
2. **index.ts** - 合并导出
3. **schema.ts** - 合并 atlas 重命名和我们的新增
4. **sisyphus-orchestrator/** - 重命名为 **atlas/**，保留我们的修改

### Step 5: 验证

```bash
bun run typecheck
bun test
bun run build
```

### Step 6: 提交

```bash
git add .
git commit -m "Merge upstream/dev: atlas rename, category refactor, keep fork features"
```

---

## 六、合并后更新

### 需要更新的文档

1. `docs/FORK.md` - 更新上游同步日期和变更
2. `docs/agent-architecture.md` - 更新 atlas 引用
3. `AGENTS.md` - 同步上游格式

### 需要验证的功能

- [ ] 3 个新 Agent 正常工作
- [ ] atlas hook 正常加载
- [ ] Category 系统正常工作
- [ ] Windows 兼容性未受影响
- [ ] GPT 模型检测正常

---

## 七、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 类型错误 | 高 | 中 | 合并后立即 typecheck |
| 测试失败 | 中 | 中 | 合并后运行全量测试 |
| 运行时错误 | 低 | 高 | 本地手动测试关键功能 |
| 功能丢失 | 低 | 高 | 备份分支，合并前 review |

---

**建议**: 采用 **方案 A 直接 merge**，一次性解决所有冲突，保持历史清晰。

准备好后执行：

```bash
git fetch upstream dev && git merge upstream/dev
```

*最后更新：2026-01-21*
