## Context
Direct/Hub 模式已经覆盖了“通过 SSH attach tmux”的移动续接。但它们不解决“无需主机账号权限的临时接管”诉求。

本次引入 `proxy` 模式：Agency 主进程维护一个 token-auth 代理入口，移动端凭 token 连接后直接进入目标 tmux session。

## Goals / Non-Goals
- Goals:
  - 为每个 session 提供稳定 token，token 在 session 结束前持续有效。
  - 代理端只暴露最小能力：token 校验 + tmux attach 桥接，不引入额外业务协议。
  - 与现有 continuation 结果结构兼容，UI 仅做 mode-aware 分支。
- Non-Goals:
  - 不引入 Tailscale SSH/Mosh/反向隧道。
  - 不做跨机器身份系统或多租户权限模型。
  - 不在本次引入 TLS 终端代理（默认走局域网/Tailscale 内网场景）。

## Decisions

### 1) Proxy token 绑定 session，且默认复用
- Decision: token 索引键为 `worktreePath + sessionId`，重复触发 proxy 续接时复用同一 token。
- Why: 满足“token 一直有效到 session 结束”的产品语义，并避免用户每次重新同步新 token。

### 2) token 失效条件以 session 存活为准
- Decision: 当目标 tmux session 不存在（`tmux has-session` 失败）或 session 显式关闭/重建时，token 失效。
- Why: “session 结束”在运行时最可靠的判据是 tmux liveness；关闭/重建路径做主动清理可减少脏状态。

### 3) 代理握手协议保持最小化
- Decision: 客户端连接后首行发送 token（`<token>\n`）。校验通过后进入透明字节转发（socket <-> node-pty `tmux attach-session`）。
- Why: 协议简单、调试成本低、和 tmux TTY 行为天然兼容。

### 4) continuation 响应新增 `proxy` 诊断对象
- Decision: `prepareSessionContinueOnMobile` 在 proxy 模式返回 `proxy` 结构（ready/host/port/token/warnings），Direct/Hub 继续返回 `ssh`。
- Why: 避免把 SSH 字段复用成含义混乱的“泛通道”，保持结果语义清晰。

### 5) UI action 三分支且保留现有默认路径
- Decision: Session 菜单新增 `Continue on Mobile (Proxy)`；Direct 与 Hub 行为不变。
- Why: 向后兼容已建立的 SSH 使用习惯，同时给用户显式选择 token 代理路径。

## Risks / Trade-offs
- 明文 TCP + token：若网络暴露面过大存在窃听风险。
  - Mitigation: 文案提示建议在 Tailscale/LAN 内网使用；token 高熵且仅绑定单 session。
- 终端客户端依赖：proxy 命令依赖移动端可运行 `nc`（或等价工具）。
  - Mitigation: 返回命令与诊断中明确依赖；后续可追加多客户端模板。
- 长生命周期 token 清理不全可能积累内存状态。
  - Mitigation: close/recreate 主动清理 + 连接前 liveness 校验 + 服务内定期惰性清理。

## Migration Plan
1. 添加 OpenSpec delta（proxy 模式 + action variants）。
2. 实现 `mobileSessionProxy` 服务与测试。
3. 在 continuation 服务中接入 `proxy` 分支并补充结果协议。
4. 接入 Session 生命周期清理。
5. 更新 renderer 菜单与反馈测试。
6. 更新 docs，跑 typecheck + targeted tests + openspec validate。
