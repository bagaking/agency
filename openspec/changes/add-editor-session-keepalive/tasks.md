## 1. Implementation
- [ ] 1.1 设计并落地 session registry 文件结构（`.agency/sessions-<worktreeName>.yaml`）
- [ ] 1.2 实现多会话终端管理（创建/恢复/关闭/标记 stale）
- [ ] 1.3 集成 tmux 可恢复后端与 fallback 策略（无 tmux 则新 shell）
- [ ] 1.4 增加快捷指令配置 UI（start/resume 命令）与持久化
- [ ] 1.5 增加会话列表 UI 与会话切换/恢复入口
- [ ] 1.6 应用重启恢复逻辑（会话列表 + 当前会话）
- [ ] 1.7 文档与用户指引（限制、配置、恢复策略）
- [ ] 1.8 基础测试与手动验证清单
