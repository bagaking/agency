# Memo 语音输入冷启动实现经验总结

## 面向无上下文读者的定位
这份文档的目标是帮助新成员在缺少项目背景的情况下快速落地“语音输入 + 自动重扫 + 回放”的能力，并清楚分辨哪些部分可复用、哪些属于本项目特化。

适用边界：
- 目标运行环境为 Electron。
- macOS 原生 Speech 作为主路径，Web Speech 仅作 fallback。
- 任何自动化改写都不能阻断录音过程。

## 作者视角（为何这样组织）
以“语音系统工程 + Electron 平台工程 + 交互体验设计”的联合视角撰写：
- 语音工程关注识别链路稳定与并发任务冲突。
- 平台工程关注进程隔离、IPC 与日志可观测性。
- 体验设计关注用户的可理解性与状态反馈一致性。

因此采用“分层结构 + 通用/特化拆分 + 冷启动路线图 + 失败模式”的组织方式。

## 冷启动最短路径（可运行 → 可用 → 可靠）
1) 可运行（最小闭环）
- native helper 支持 start/stop + partial/final/error。
- UI 显示录音状态与实时转写。
- 关键文件：`apps/editor/electron/native/speech-helper/SpeechHelper.swift`、`apps/editor/renderer/src/hooks/useVoiceCapture.js`。

2) 可用（基础体验）
- IPC 打通并稳定转发事件。
- fallback 到 Web Speech。
- 关键文件：`apps/editor/electron/services/voiceCapture.js`、`apps/editor/renderer/src/components/hil/memo/VoiceCaptureControl.jsx`。

3) 可靠（生产体验）
- rescore 独立进程化（与实时识别隔离）。
- 语言规范化与候选过滤。
- UI 拆分“实时转写 vs 输入框写入”。

4) 启动性能（可感知）
- 启动时后台 warmup helper（避免首录音触发编译/拷贝）。
- 权限检查走 fast-path（授权后不重复异步请求）。
- 关键阶段日志可观测（warmup、权限、录音进入）。

## 架构分层与数据流（通用模板）
1) UI 层：录音按钮、状态提示、实时转写预览、rescore 状态。
2) Renderer 逻辑层：状态机、合并策略、输入框写入。
3) Main 服务层：启动 helper、转发事件、管理 rescore 队列。
4) Native 层：实时识别与音频采集；rescore 独立执行。

数据流（简化）：
录音 → capture helper → `rescore-request` → main rescore queue → rescore helper → `final(rescore)` → renderer 写入输入框。

## 通用能力 vs 项目特化（快速判断）
### 通用能力（可复用）
- capture/rescore 双进程模型（隔离识别任务）。
- rescore 队列与进程管理。
- locale 规范化与候选过滤（基于 `SFSpeechRecognizer.supportedLocales()`）。
- pre-roll 缓冲（减少句首丢字）。
- 实时转写与最终写入分离。
- 启动 warmup + 权限 fast-path（降低首录音等待）。

### 项目特化（与 Agency 相关）
- HIL/Memo 的 Flash 保存语义与资产路径（HIL 资产策略）。
- IPC 必须通过 `agencyBridge`（不直接访问 `window.agency`）。
- OpenSpec 文档与 `openspec validate --strict` 流程要求。

## 关键实现入口（按模块查找）
- Native capture/rescore：`apps/editor/electron/native/speech-helper/SpeechHelper.swift`
  - capture 模式：实时识别 + `rescore-request`
  - rescore 模式：读取段音频，输出 `final(rescore)`
- Main 进程服务：`apps/editor/electron/services/voiceCapture.js`
  - 管理 helper 启停、rescore 队列、事件转发
- Renderer hook：`apps/editor/renderer/src/hooks/useVoiceCapture.js`
  - 接收事件、管理 interim/final 状态
- 交互 UI：`apps/editor/renderer/src/components/hil/memo/VoiceCaptureControl.jsx`
- Memo 组装逻辑：`apps/editor/renderer/src/hooks/useHilMemoCaptureState.js`

## 常见坑 / 原因 / 解决 / 预防
1) Rescore 中断实时识别
- 原因：同进程并行识别任务互相打断。
- 解决：rescore 独立 helper 进程。
- 预防：设计阶段规定 rescore 不允许与实时识别共进程。

2) 句首丢字
- 原因：识别任务重启时丢失最前音频。
- 解决：pre-roll 缓冲回放。
- 预防：所有识别重启统一注入 pre-roll。

3) 语种识别不稳定
- 原因：短句文本语言识别波动 + locale 非标准值。
- 解决：locale 规范化 + 候选过滤 + 延迟切换。
- 预防：短句不切换，使用累积判断或候选集合。

4) rescore 写回导致 UI 闪烁
- 原因：rescore 事件清空 interim。
- 解决：rescore 不清空 interim，实时流与最终写入分离。
- 预防：UI 模型明确区分“实时流”和“最终写入”。

5) rescore 结果更差（跨语种或误识别）
- 原因：rescore 评分不受控，候选语种过宽导致错误语言被选中。
- 解决：对 draft 与 rescore 结果做评分对比，仅在“明显更好”时替换；高置信度时限制候选语系。
- 预防：为 rescore 定义最小增益阈值与候选过滤规则，并记录日志用于校准。

6) 首次录音启动慢
- 原因：helper 需编译/拷贝，或权限请求重复等待。
- 解决：app ready 后后台 warmup；权限检查走 fast-path。
- 预防：在启动日志里记录 warmup 与权限耗时，便于定位长尾。

7) 麦克风权限被拒后无法再提示
- 原因：权限被拒后请求逻辑早退，用户误以为只尝试一次。
- 解决：每次 start 都尝试权限请求，权限拒绝时自动打开系统设置页。
- 预防：在 UI 中提供“打开系统设置”入口，并保留错误日志。

8) 权限弹窗从未出现（系统列表无条目）
- 原因：speech helper 未签名，TCC 不创建权限条目。
- 解决：在打包流程中对 SpeechHelper.app 进行 codesign，并明确显示名为 “Agency Speech Helper”。
- 预防：afterPack 钩子签名 helper，保持与主应用同一签名链路；macOS Hardened Runtime 下补充 `com.apple.security.device.audio-input` entitlement。

9) Dev/Release 权限条目难区分
- 原因：两者使用同一 helper bundle id 与显示名，TCC 列表难区分或不刷新名称。
- 解决：dev helper 使用独立的 bundle id 与显示名 “Agency Speech Helper (Dev)”，release helper 改为独立的 bundle id 强制刷新名称。
- 预防：dev 只替换 helper 的 Info.plist 来源，不影响正式包内容。

## 验收清单（最低可行）
- 连续说 1/2/3 句，不互相覆盖。
- rescore 期间继续说话，实时转写持续更新。
- auto 语种在中英混说场景下稳定。
- 保存 Flash 后音频可回放。

## 面向未来的优化建议
- 使用多段文本累积判断语种，减少短句误判。
- rescore 加入超时与退化策略（明确 fallback 规则）。
- 引入识别质量指标日志，支持数据化调参。

## 一句话总结
语音输入的稳定性不是“识别准确率”问题，而是“隔离 + 状态管理 + 可视化反馈”问题。
