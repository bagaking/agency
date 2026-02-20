---
stage_status: pending
forum_mode: deep_dive_forum
discussion_clear: false
final_one_liner: ""
user_review_status: pending
user_review_note: ""
participants:
  - name: "专家A"
    domain_strength: "系统化深度分析"
    thinking_model: "第一性原理 + 约束驱动"
    persona: "deep thinker"
  - name: "专家B"
    domain_strength: "方案创新与机会探索"
    thinking_model: "发散收敛 + 类比迁移"
    persona: "creative explorer"
  - name: "专家C"
    domain_strength: "风险识别与反例推演"
    thinking_model: "红队审查 + 反事实挑战"
    persona: "constructive challenger"
key_issues:
  - "讨论中最关键的争议问题是什么？"
  - "哪条决策条件最容易被忽略但会影响最终结果？"
  - "如果当前结论错误，最可能错在什么假设？"
key_insights:
  - "讨论后沉淀的关键洞察是什么？"
  - "最小可执行路径是什么？"
  - "当前结论成立的边界条件是什么？"
references:
  - "https://example.com/source-a"
  - "https://example.com/source-b"
  - "https://example.com/source-c"
scoring_rules:
  peer_score_scale: "0~10"
  experiment_bonus_scale: "1~5"
  experiment_root: ".bagakit/brainstorm/<discussion-id>/experimental/<expert>-<experiment>/"
---

# 详细结论

- 一句话结论：
- 适用边界：
- 暂不纳入范围：

# 背景和专家组介绍

## 议题背景

- 主题：{{TOPIC}}
- 目标：{{GOAL}}
- 资料范围：{{SOURCE_HINT}}

## 论坛类型说明

- `deep_dive_forum`：单一重点议题深挖，强调因果链和可证伪路径。
- `lightning_talk_forum`：开放议题多角度快节奏发言，强调观点覆盖。
- `industry_readout_forum`：面向准出/准入决策，强调结论可执行与对外可解释。

## 决策目标与准出条件

- 决策目标：
- 准出条件（必须全部满足）：
  - 条件1：
  - 条件2：
  - 条件3：

## 专家组介绍

| 专家 | 擅长领域 | 思考模型 | 人格特征 | 在本议题中的职责 |
|------|----------|----------|----------|------------------|
| 专家A | 系统化深度分析 | 第一性原理 + 约束驱动 | deep thinker | 识别核心约束与可行性边界 |
| 专家B | 方案创新与机会探索 | 发散收敛 + 类比迁移 | creative explorer | 提出替代路线与创新机会 |
| 专家C | 风险识别与反例推演 | 红队审查 + 反事实挑战 | constructive challenger | 主动挑战假设并暴露盲点 |

# 讨论过程

## 论坛议程（按模式执行）

### deep_dive_forum 议程

1. 议题拆解与因果链假设
2. 专家检索与证据陈述（必须）
3. 交叉评分（0~10）（必须）
4. 本地 MVP 实验提案与执行（建议）
5. 结论收敛与边界声明

### lightning_talk_forum 议程

1. 快速观点轮询（每人 3-5 分钟）
2. 专家检索与证据陈述（必须）
3. 交叉评分（0~10）（必须）
4. 本地 MVP 实验提案与执行（建议）
5. 观点归并与结论句收敛

### industry_readout_forum 议程

1. 行业基线与竞品态势复盘
2. 方案准出标准映射
3. 风险和合规项逐条校对
4. 准出建议（go / hold / no-go）

## 专家检索与证据陈述

| 专家 | 检索关键词 | 最有用参考 | 该参考如何支持观点 |
|------|------------|------------|--------------------|
| 专家A | 关键词A | https://example.com/source-a | 支持约束假设 |
| 专家B | 关键词B | https://example.com/source-b | 支持机会判断 |
| 专家C | 关键词C | https://example.com/source-c | 支持风险判断 |

## 交叉评分（0~10）

| 评分人 | 被评分专家 | 分数(0~10) | 评分理由 |
|--------|------------|------------|----------|
| 专家A | 专家B | 8 | 证据相关性高 |
| 专家A | 专家C | 8 | 风险识别有覆盖 |
| 专家B | 专家A | 7 | 约束条目仍需量化 |
| 专家B | 专家C | 7 | 风险链条完整 |
| 专家C | 专家A | 9 | 约束定义清晰 |
| 专家C | 专家B | 8 | 创新路径具备可行性 |

## 实验设计与本地 MVP

- 推荐路径（实验根目录）：`.bagakit/brainstorm/<discussion-id>/experimental/<expert>-<experiment>/`
- 多版本目录规范（强制）：
  - 版本目录必须是实验目录的直接子目录：`v1-<semantic-description>/`、`v2-<semantic-description>/`...
  - 禁止使用 `versions/` 作为中间层目录。
  - 禁止在实验目录根部使用 `candidate-vN.md` 这类散落文件。
  - 每个版本目录必须包含 `version_delta.md`，用于记录基线阅读、控制变量和相对上一版优化。
- 实验记录建议：
  - 假设：
  - 最小实现：
  - 观点成立验证（claim validation）：
  - 工具可用验证（tool usability）：
  - 验证信号：
  - 结果：
  - 对结论影响：

### version_delta.md 模板（每个版本目录必备）

```md
# Version Delta
- version: v2-<semantic-description>
- based_on: v1-<semantic-description>

## Baseline Techniques Read
- `../v1-<semantic-description>/techniques.md`（已阅读，作为 baseline）

## New Techniques Introduced
- 新变量1（本版新增技巧，说明意图）

## Relative Optimizations
- 本版相对上一版的优化点1（动作 + 对象 + 预期收益）
- 本版相对上一版的优化点2（动作 + 对象 + 预期收益）

## No-Regression Guards
- baseline 约束1（本版不允许劣化）
- baseline 约束2（本版不允许劣化）

## Regression Check
- 相对 `v1-<semantic-description>`：关键 baseline 是否退化（yes/no + 简述）

## Validation Signals
- 信号1：
- 信号2：
```

## MVP验证结果（观点成立/工具可用）

| 实验 | 观点成立验证 | 工具可用验证 | 结论 |
|------|--------------|--------------|------|
| 示例实验A | 待补充 | 待补充 | 待补充 |

## 实验改动边界（强制）

- 源文改动：禁止
- 实验副本路径：`.bagakit/brainstorm/<discussion-id>/experimental/<expert>-<experiment>/`
- 版本约束：版本产物必须放在实验目录内的 `vN-<semantic-description>/` 子目录。
- 约束声明：所有改动仅限 `experimental/` 目录内产物；原始文档/源码不直接修改。

## 实验附加分（1~5）

- 规则：
  - 若存在可复现实验，且同时给出“观点成立 + 工具可用”证据，可按证据强度加 1~5 分。
  - 无实验则加分为 0，不阻塞流程。
- 本次加分：
  - 实验数量：
  - 附加分：

## 结论收敛记录

- 共识：
- 分歧：
- 需后续验证项：

## 会议结论清晰度判定

- [ ] 关键问题与关键洞察已沉淀到 frontmatter
- [ ] `final_one_liner` 已更新为明确结论句
- [ ] `discussion_clear` 已设置为 `true`

## 用户评判与确认

- 评判人：
- 评判结论（`approved` / `changes_requested`）：
- 评判意见摘要：
- 回填要求：将 frontmatter `user_review_status` 更新为最终状态，并填写 `user_review_note`。

## Quality Review Prompt (Agent/Human)

- Review focus: forum depth and convergence quality (qualitative, non-script gate).
- Suggested checklist:
  - 关键议题不是“格式项”，而是会改变结论的实质分歧。
  - 证据与观点映射清晰，可追溯到参考或实验信号。
  - 结论收敛记录明确写出共识、分歧、后续验证项。
