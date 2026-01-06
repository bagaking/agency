import Foundation
import Speech
import AVFoundation
import Darwin
import NaturalLanguage

func emitDebug(_ payload: [String: Any]) {
  JsonEmitter.emit(["type": "debug", "data": payload])
}

NSSetUncaughtExceptionHandler { exception in
  FileHandle.standardError.write(
    ("Uncaught exception: \(exception)\n").data(using: .utf8) ?? Data()
  )
}

struct JsonEmitter {
  static func emit(_ payload: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []) else {
      return
    }
    if let text = String(data: data, encoding: .utf8) {
      FileHandle.standardOutput.write((text + "\n").data(using: .utf8) ?? Data())
    }
  }

  static func status(_ value: String) {
    emit(["type": "status", "status": value])
  }

  static func partial(_ text: String) {
    emit(["type": "partial", "text": text])
  }

  static func error(_ message: String) {
    emit(["type": "error", "message": message])
  }
}

func parseLanguage() -> (value: String, isAuto: Bool) {
  let args = CommandLine.arguments
  guard let index = args.firstIndex(of: "--lang"), index + 1 < args.count else {
    return (Locale.current.identifier, false)
  }
  let value = args[index + 1].trimmingCharacters(in: .whitespacesAndNewlines)
  if value.isEmpty {
    return (Locale.current.identifier, false)
  }
  if value.lowercased() == "auto" {
    return (Locale.current.identifier, true)
  }
  return (value, false)
}

func parseAudioPath() -> String? {
  let args = CommandLine.arguments
  guard let index = args.firstIndex(of: "--audio"), index + 1 < args.count else {
    return nil
  }
  let value = args[index + 1].trimmingCharacters(in: .whitespacesAndNewlines)
  if value.isEmpty {
    return nil
  }
  return value
}

func resolveLocaleIdentifier(_ language: NLLanguage) -> String {
  switch language {
  case .simplifiedChinese:
    return "zh-CN"
  case .traditionalChinese:
    return "zh-TW"
  case .japanese:
    return "ja-JP"
  case .korean:
    return "ko-KR"
  case .english:
    return "en-US"
  default:
    return language.rawValue
  }
}

func createRecognizer(localeId: String) -> SFSpeechRecognizer? {
  let locale = Locale(identifier: localeId)
  guard let recognizer = SFSpeechRecognizer(locale: locale) else {
    return nil
  }
  return recognizer.isAvailable ? recognizer : nil
}

func normalizeLocaleId(_ value: String) -> String {
  let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
  if trimmed.isEmpty {
    return trimmed
  }
  let lowercased = trimmed.lowercased()
  if lowercased == "zh" || lowercased.hasPrefix("zh-hans") {
    return "zh-CN"
  }
  if lowercased.hasPrefix("zh-hant") {
    return "zh-TW"
  }
  if lowercased == "en" {
    return "en-US"
  }
  if lowercased == "ja" {
    return "ja-JP"
  }
  if lowercased == "ko" {
    return "ko-KR"
  }
  return trimmed
}

func preferredLocaleCandidates() -> [String] {
  var results: [String] = []
  for entry in Locale.preferredLanguages {
    let normalized = normalizeLocaleId(entry)
    if normalized.isEmpty {
      continue
    }
    if !results.contains(normalized) {
      results.append(normalized)
    }
    if results.count >= 3 {
      break
    }
  }
  return results
}

let languageInput = parseLanguage()
let autoDetectLanguage = languageInput.isAuto
var currentLocaleId = languageInput.value
guard var recognizer = createRecognizer(localeId: currentLocaleId) else {
  JsonEmitter.error("Speech recognizer unavailable for language.")
  exit(1)
}

let audioEngine = AVAudioEngine()
var recognitionTask: SFSpeechRecognitionTask?
var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
var stopRequested = false
let audioOutputPath = parseAudioPath()
var audioFile: AVAudioFile?
var recordedDuration: TimeInterval = 0
var recognitionTaskToken = 0
let languageRecognizer = autoDetectLanguage ? NLLanguageRecognizer() : nil
let silenceThresholdSeconds: TimeInterval = 1.6
let autoDetectConfidence: Double = 0.6
let autoSwitchConfidence: Double = 0.78
let autoSwitchProbeConfidence: Double = 0.62
let autoSwitchMinChars = 8
let autoSwitchProbeMinChars = 4
let autoSwitchProbeWindowSeconds: TimeInterval = 1.8
let autoSwitchCooldownSeconds: TimeInterval = 2.0
let rescoreTimeoutSeconds: TimeInterval = 2.0
let maxSegmentSeconds: TimeInterval = 14.0
var lastPartialText = ""
var lastPartialAt: Date?
var silenceWorkItem: DispatchWorkItem?
var lastFinalText = ""
var lastFinalAt = Date.distantPast
var pendingLocaleId: String?
var pendingLocaleCount = 0
var lastSwitchAt = Date.distantPast
var segmentBuffers: [AVAudioPCMBuffer] = []
var segmentDuration: TimeInterval = 0
var rescoreInFlight = false
var phraseStartedAt = Date.distantPast
var exitCheckAttempts = 0
let exitCheckInterval: TimeInterval = 0.2
let maxExitChecks = 15
var recoverableErrorCount = 0
var lastRecoverableErrorAt = Date.distantPast
let recoverableErrorCooldownSeconds: TimeInterval = 1.5
let maxRecoverableErrors = 2
let noSpeechErrorHints = [
  "no speech",
  "speech not detected",
  "未检测到语音",
  "没有检测到语音",
]

let bundle = Bundle.main
emitDebug([
  "bundleId": bundle.bundleIdentifier ?? "",
  "bundlePath": bundle.bundlePath,
  "hasMicUsage": bundle.object(forInfoDictionaryKey: "NSMicrophoneUsageDescription") != nil,
  "hasSpeechUsage": bundle.object(forInfoDictionaryKey: "NSSpeechRecognitionUsageDescription") != nil,
  "autoLanguage": autoDetectLanguage,
  "locale": currentLocaleId,
])

func punctuationForLocale(_ localeId: String) -> String {
  let lowercased = localeId.lowercased()
  if lowercased.hasPrefix("zh") || lowercased.hasPrefix("ja") || lowercased.hasPrefix("ko") {
    return "。"
  }
  return "."
}

func normalizeFinalText(_ text: String, localeId: String) -> String {
  let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
  if trimmed.isEmpty {
    return ""
  }
  let punctuationSet = CharacterSet(charactersIn: "。？！.!?…")
  if let lastScalar = trimmed.unicodeScalars.last, punctuationSet.contains(lastScalar) {
    return trimmed
  }
  return trimmed + punctuationForLocale(localeId)
}

func detectLocale(from text: String) -> (localeId: String, confidence: Double)? {
  guard let languageRecognizer = languageRecognizer else {
    return nil
  }
  languageRecognizer.processString(text)
  let hypotheses = languageRecognizer.languageHypotheses(withMaximum: 1)
  guard let best = hypotheses.max(by: { $0.value < $1.value }) else {
    return nil
  }
  return (resolveLocaleIdentifier(best.key), best.value)
}

func detectLocaleSnapshot(from text: String) -> (localeId: String, confidence: Double)? {
  guard let languageRecognizer = languageRecognizer else {
    return nil
  }
  languageRecognizer.reset()
  languageRecognizer.processString(text)
  let hypotheses = languageRecognizer.languageHypotheses(withMaximum: 1)
  guard let best = hypotheses.max(by: { $0.value < $1.value }) else {
    return nil
  }
  return (resolveLocaleIdentifier(best.key), best.value)
}

func resetLanguageDetection() {
  languageRecognizer?.reset()
}

func resetSegmentBuffers() {
  segmentBuffers.removeAll()
  segmentDuration = 0
}

func prepareAudioFile(format: AVAudioFormat) {
  guard let audioOutputPath else {
    return
  }
  let url = URL(fileURLWithPath: audioOutputPath)
  do {
    if FileManager.default.fileExists(atPath: audioOutputPath) {
      try FileManager.default.removeItem(atPath: audioOutputPath)
    }
  } catch {
    emitDebug(["stage": "audio-cleanup-failed", "error": error.localizedDescription])
  }
  do {
    audioFile = try AVAudioFile(forWriting: url, settings: format.settings, commonFormat: format.commonFormat, interleaved: format.isInterleaved)
    recordedDuration = 0
  } catch {
    emitDebug(["stage": "audio-file-failed", "error": error.localizedDescription])
  }
}

func emitAudioSummary() {
  guard let audioOutputPath else {
    return
  }
  guard recordedDuration > 0 else {
    return
  }
  guard FileManager.default.fileExists(atPath: audioOutputPath) else {
    return
  }
  JsonEmitter.emit([
    "type": "audio",
    "path": audioOutputPath,
    "durationMs": Int(round(recordedDuration * 1000)),
    "mime": "audio/wav",
  ])
}

func storeSegmentBuffer(_ buffer: AVAudioPCMBuffer) {
  guard autoDetectLanguage else {
    return
  }
  guard let copied = buffer.copy() as? AVAudioPCMBuffer else {
    return
  }
  let sampleRate = copied.format.sampleRate
  if sampleRate > 0 {
    segmentDuration += Double(copied.frameLength) / sampleRate
  }
  segmentBuffers.append(copied)
  while segmentDuration > maxSegmentSeconds && !segmentBuffers.isEmpty {
    let removed = segmentBuffers.removeFirst()
    let removedRate = removed.format.sampleRate
    if removedRate > 0 {
      segmentDuration -= Double(removed.frameLength) / removedRate
    }
  }
}

func shouldRescore(detected: (localeId: String, confidence: Double)?) -> String? {
  guard autoDetectLanguage, !rescoreInFlight else {
    return nil
  }
  guard !segmentBuffers.isEmpty else {
    return nil
  }
  if let detected, detected.confidence >= autoDetectConfidence {
    return detected.localeId
  }
  return currentLocaleId
}

func rescoreSegment(buffers: [AVAudioPCMBuffer], localeId: String, completion: @escaping (String?) -> Void) {
  guard let rescoreRecognizer = createRecognizer(localeId: localeId) else {
    completion(nil)
    return
  }
  let request = SFSpeechAudioBufferRecognitionRequest()
  request.shouldReportPartialResults = false
  request.taskHint = .dictation
  if #available(macOS 13.0, *) {
    request.addsPunctuation = true
  }
  buffers.forEach { request.append($0) }
  request.endAudio()
  var resolved = false
  let task = rescoreRecognizer.recognitionTask(with: request) { result, error in
    if resolved {
      return
    }
    if error != nil {
      resolved = true
      completion(nil)
      return
    }
    guard let result else {
      return
    }
    if result.isFinal {
      resolved = true
      completion(result.bestTranscription.formattedString)
    }
  }
  DispatchQueue.main.asyncAfter(deadline: .now() + rescoreTimeoutSeconds) {
    if resolved {
      return
    }
    resolved = true
    task.cancel()
    completion(nil)
  }
}

func scoreRescoreText(_ text: String, localeId: String) -> Double {
  let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
  if trimmed.isEmpty {
    return 0
  }
  let recognizer = NLLanguageRecognizer()
  recognizer.processString(trimmed)
  let hypotheses = recognizer.languageHypotheses(withMaximum: 1)
  let best = hypotheses.max(by: { $0.value < $1.value })
  let bestLocale = best.map { resolveLocaleIdentifier($0.key) } ?? ""
  let confidence = best?.value ?? 0
  let lengthBonus = min(Double(trimmed.count) / 80.0, 0.2)
  let localeBias: Double = bestLocale == localeId ? 0.15 : 0
  return confidence + lengthBonus + localeBias
}

func rescoreSegmentMultiple(buffers: [AVAudioPCMBuffer], locales: [String], completion: @escaping (String?, String?) -> Void) {
  var uniqueLocales: [String] = []
  var seen = Set<String>()
  for locale in locales where !locale.isEmpty {
    if seen.contains(locale) {
      continue
    }
    seen.insert(locale)
    uniqueLocales.append(locale)
  }
  if uniqueLocales.isEmpty {
    completion(nil, nil)
    return
  }
  var bestText: String?
  var bestLocale: String?
  var bestScore: Double = -1

  func handle(index: Int) {
    if index >= uniqueLocales.count {
      completion(bestText, bestLocale)
      return
    }
    let localeId = uniqueLocales[index]
    guard createRecognizer(localeId: localeId) != nil else {
      handle(index: index + 1)
      return
    }
    rescoreSegment(buffers: buffers, localeId: localeId) { rescored in
      if let rescored {
        let score = scoreRescoreText(rescored, localeId: localeId)
        if score > bestScore {
          bestScore = score
          bestText = rescored
          bestLocale = localeId
        }
      }
      handle(index: index + 1)
    }
  }

  handle(index: 0)
}

func updateRecognizerIfNeeded(for localeId: String) -> Bool {
  if localeId.isEmpty || localeId == currentLocaleId {
    return false
  }
  if let nextRecognizer = createRecognizer(localeId: localeId) {
    currentLocaleId = localeId
    recognizer = nextRecognizer
    emitDebug(["stage": "language-switch", "locale": localeId])
    lastSwitchAt = Date()
    startRecognitionTask()
    return true
  }
  return false
}

func emitFinalText(_ text: String, reason: String, localeId: String) {
  let normalized = normalizeFinalText(text, localeId: localeId)
  if normalized.isEmpty {
    return
  }
  let now = Date()
  if normalized == lastFinalText && now.timeIntervalSince(lastFinalAt) < 0.6 {
    return
  }
  lastFinalText = normalized
  lastFinalAt = now
  JsonEmitter.emit([
    "type": "final",
    "text": normalized,
    "reason": reason,
    "language": localeId,
  ])
}

func handleFinalText(_ text: String, reason: String) -> String? {
  let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
  if trimmed.isEmpty {
    return nil
  }
  let detected = detectLocaleSnapshot(from: trimmed)
  let detectedLocale = (detected?.confidence ?? 0) >= autoDetectConfidence
    ? detected?.localeId ?? currentLocaleId
    : currentLocaleId
  if let rescoreLocale = shouldRescore(detected: detected) {
    let buffers = segmentBuffers
    resetSegmentBuffers()
    rescoreInFlight = true
    var candidates: [String] = [rescoreLocale, currentLocaleId]
    if let detectedLocale = detected?.localeId {
      candidates.append(detectedLocale)
    }
    candidates.append(contentsOf: preferredLocaleCandidates())
    emitDebug(["stage": "rescore-start", "locale": rescoreLocale, "candidates": candidates])
    rescoreSegmentMultiple(buffers: buffers, locales: candidates) { rescored, localeId in
      let resultText = rescored?.trimmingCharacters(in: .whitespacesAndNewlines) ?? trimmed
      let resultLocale = localeId ?? detectedLocale
      emitFinalText(resultText, reason: rescored != nil ? "rescore" : "rescore-fallback", localeId: resultLocale)
      if autoDetectLanguage {
        resetLanguageDetection()
        _ = updateRecognizerIfNeeded(for: resultLocale)
      }
      rescoreInFlight = false
      emitDebug(["stage": "rescore-done", "locale": resultLocale, "fallback": rescored == nil])
      if stopRequested {
        attemptExit()
      }
    }
    return nil
  }
  emitFinalText(trimmed, reason: reason, localeId: detectedLocale)
  resetSegmentBuffers()
  return detectedLocale
}

func finalizePartial(reason: String) {
  let text = lastPartialText.trimmingCharacters(in: .whitespacesAndNewlines)
  lastPartialText = ""
  lastPartialAt = nil
  silenceWorkItem?.cancel()
  silenceWorkItem = nil
  pendingLocaleId = nil
  pendingLocaleCount = 0
  if text.isEmpty {
    resetSegmentBuffers()
    return
  }
  let emittedLocale = handleFinalText(text, reason: reason)
  var restarted = false
  if autoDetectLanguage && !stopRequested, let emittedLocale {
    resetLanguageDetection()
    restarted = updateRecognizerIfNeeded(for: emittedLocale)
  }
  if reason == "silence" && !stopRequested && !restarted {
    startRecognitionTask()
  }
}

func scheduleSilenceFinalization() {
  silenceWorkItem?.cancel()
  let workItem = DispatchWorkItem {
    guard !stopRequested else {
      return
    }
    guard let lastPartialAt else {
      return
    }
    if Date().timeIntervalSince(lastPartialAt) >= silenceThresholdSeconds {
      finalizePartial(reason: "silence")
    }
  }
  silenceWorkItem = workItem
  DispatchQueue.main.asyncAfter(deadline: .now() + silenceThresholdSeconds, execute: workItem)
}

func stopCapture(_ reason: String? = nil) {
  if stopRequested {
    return
  }
  stopRequested = true
  finalizePartial(reason: "stop")
  recognitionTask?.finish()
  recognitionRequest?.endAudio()
  recognitionRequest = nil
  if audioEngine.isRunning {
    audioEngine.stop()
    audioEngine.inputNode.removeTap(onBus: 0)
  }
  audioFile = nil
  emitAudioSummary()
  JsonEmitter.status("stopped")
  if let message = reason {
    JsonEmitter.error(message)
  }
  attemptExit()
}

func attemptExit() {
  if rescoreInFlight && exitCheckAttempts < maxExitChecks {
    exitCheckAttempts += 1
    DispatchQueue.main.asyncAfter(deadline: .now() + exitCheckInterval) {
      attemptExit()
    }
    return
  }
  exit(0)
}

func startRecognitionTask() {
  recognitionTaskToken += 1
  let taskToken = recognitionTaskToken
  phraseStartedAt = Date()
  recognitionTask?.cancel()
  recognitionRequest?.endAudio()
  let request = SFSpeechAudioBufferRecognitionRequest()
  request.shouldReportPartialResults = true
  request.taskHint = .dictation
  if #available(macOS 13.0, *) {
    request.addsPunctuation = true
  }
  recognitionRequest = request
  recognitionTask = recognizer.recognitionTask(with: request) { result, error in
    if taskToken != recognitionTaskToken {
      return
    }
    if let error = error as NSError? {
      if !stopRequested {
        emitDebug([
          "stage": "recognition-error",
          "domain": error.domain,
          "code": error.code,
          "message": error.localizedDescription,
        ])
        let lowercased = error.localizedDescription.lowercased()
        let isNoSpeech = noSpeechErrorHints.contains { lowercased.contains($0) }
        let isRecoverable = (error.domain == "kAFAssistantErrorDomain" && error.code == 209) || isNoSpeech
        if isRecoverable {
          let now = Date()
          if now.timeIntervalSince(lastRecoverableErrorAt) >= recoverableErrorCooldownSeconds {
            lastRecoverableErrorAt = now
            recoverableErrorCount += 1
            if recoverableErrorCount <= maxRecoverableErrors {
              emitDebug([
                "stage": "recognition-retry",
                "domain": error.domain,
                "code": error.code,
                "attempt": recoverableErrorCount,
                "reason": isNoSpeech ? "no-speech" : "assistant-209",
              ])
              lastPartialText = ""
              lastPartialAt = nil
              startRecognitionTask()
              return
            }
          }
        }
        JsonEmitter.error(error.localizedDescription)
        stopCapture()
      }
      return
    }
    guard let result = result else {
      return
    }
    let text = result.bestTranscription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)
    if text.isEmpty {
      return
    }
    if result.isFinal {
      lastPartialText = ""
      lastPartialAt = nil
      silenceWorkItem?.cancel()
      silenceWorkItem = nil
      pendingLocaleId = nil
      pendingLocaleCount = 0
      let emittedLocale = handleFinalText(text, reason: "final")
      if autoDetectLanguage {
        resetLanguageDetection()
      }
      if !stopRequested {
        let switched = (autoDetectLanguage && emittedLocale != nil)
          ? updateRecognizerIfNeeded(for: emittedLocale ?? currentLocaleId)
          : false
        if !switched {
          startRecognitionTask()
        }
      }
    } else {
      lastPartialText = text
      lastPartialAt = Date()
      if autoDetectLanguage {
        let sinceStart = Date().timeIntervalSince(phraseStartedAt)
        let minChars = sinceStart <= autoSwitchProbeWindowSeconds ? autoSwitchProbeMinChars : autoSwitchMinChars
        let confidence = sinceStart <= autoSwitchProbeWindowSeconds ? autoSwitchProbeConfidence : autoSwitchConfidence
        if text.count >= minChars,
           let detected = detectLocale(from: text),
           detected.confidence >= confidence,
           detected.localeId != currentLocaleId {
          if detected.localeId == pendingLocaleId {
            pendingLocaleCount += 1
          } else {
            pendingLocaleId = detected.localeId
            pendingLocaleCount = 1
          }
          if pendingLocaleCount >= 2,
             Date().timeIntervalSince(lastSwitchAt) >= autoSwitchCooldownSeconds {
            pendingLocaleId = nil
            pendingLocaleCount = 0
            resetLanguageDetection()
            if updateRecognizerIfNeeded(for: detected.localeId) {
              return
            }
          }
        } else {
          pendingLocaleId = nil
          pendingLocaleCount = 0
        }
      }
      scheduleSilenceFinalization()
      JsonEmitter.partial(text)
    }
  }
}

func startAudioEngine() throws {
  let inputNode = audioEngine.inputNode
  let format = inputNode.outputFormat(forBus: 0)
  inputNode.removeTap(onBus: 0)
  prepareAudioFile(format: format)
  inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
    recognitionRequest?.append(buffer)
    storeSegmentBuffer(buffer)
    if let audioFile {
      do {
        try audioFile.write(from: buffer)
        let sampleRate = buffer.format.sampleRate
        if sampleRate > 0 {
          recordedDuration += Double(buffer.frameLength) / sampleRate
        }
      } catch {
        emitDebug(["stage": "audio-write-failed", "error": error.localizedDescription])
      }
    }
  }
  audioEngine.prepare()
  try audioEngine.start()
}

func requestPermissions(completion: @escaping (Bool, String?) -> Void) {
  let group = DispatchGroup()
  var speechStatus: SFSpeechRecognizerAuthorizationStatus = .notDetermined
  var micGranted = false

  group.enter()
  emitDebug(["stage": "request-speech-auth"])
  SFSpeechRecognizer.requestAuthorization { status in
    speechStatus = status
    group.leave()
  }

  group.enter()
  emitDebug(["stage": "request-mic-auth"])
  AVCaptureDevice.requestAccess(for: .audio) { granted in
    micGranted = granted
    group.leave()
  }

  group.notify(queue: .main) {
    if speechStatus != .authorized {
      completion(false, "Speech recognition permission denied.")
      return
    }
    if !micGranted {
      completion(false, "Microphone permission denied.")
      return
    }
    completion(true, nil)
  }
}

func setupStopListener() {
  signal(SIGTERM, SIG_IGN)
  let termSource = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
  termSource.setEventHandler {
    stopCapture("Speech helper terminated.")
  }
  termSource.resume()

  FileHandle.standardInput.readabilityHandler = { handle in
    let data = handle.availableData
    if data.isEmpty {
      return
    }
    if let text = String(data: data, encoding: .utf8)?.lowercased(),
       text.contains("stop") {
      stopCapture()
    }
  }
}

setupStopListener()
JsonEmitter.status("starting")

requestPermissions { ok, error in
  if !ok {
    JsonEmitter.error(error ?? "Permission denied.")
    stopCapture()
    return
  }
  do {
    try startAudioEngine()
    recoverableErrorCount = 0
    lastRecoverableErrorAt = Date.distantPast
    startRecognitionTask()
    JsonEmitter.status("recording")
  } catch {
    JsonEmitter.error(error.localizedDescription)
    stopCapture()
  }
}

RunLoop.current.run()
