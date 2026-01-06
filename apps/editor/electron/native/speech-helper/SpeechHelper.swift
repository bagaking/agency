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
var recognitionTaskToken = 0
let languageRecognizer = autoDetectLanguage ? NLLanguageRecognizer() : nil
let silenceThresholdSeconds: TimeInterval = 0.9
let autoDetectConfidence: Double = 0.6
let autoSwitchConfidence: Double = 0.78
let autoSwitchMinChars = 8
let autoSwitchCooldownSeconds: TimeInterval = 2.0
var lastPartialText = ""
var lastPartialAt: Date?
var silenceWorkItem: DispatchWorkItem?
var lastFinalText = ""
var lastFinalAt = Date.distantPast
var pendingLocaleId: String?
var pendingLocaleCount = 0
var lastSwitchAt = Date.distantPast

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

func resetLanguageDetection() {
  languageRecognizer?.reset()
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

func finalizePartial(reason: String) {
  let text = lastPartialText.trimmingCharacters(in: .whitespacesAndNewlines)
  lastPartialText = ""
  lastPartialAt = nil
  silenceWorkItem?.cancel()
  silenceWorkItem = nil
  pendingLocaleId = nil
  pendingLocaleCount = 0
  if text.isEmpty {
    return
  }
  let detected = detectLocale(from: text)
  let detectedLocale = (detected?.confidence ?? 0) >= autoDetectConfidence
    ? detected?.localeId ?? currentLocaleId
    : currentLocaleId
  emitFinalText(text, reason: reason, localeId: detectedLocale)
  var restarted = false
  if autoDetectLanguage && !stopRequested {
    resetLanguageDetection()
    restarted = updateRecognizerIfNeeded(for: detectedLocale)
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
  JsonEmitter.status("stopped")
  if let message = reason {
    JsonEmitter.error(message)
  }
  DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
    exit(0)
  }
}

func startRecognitionTask() {
  recognitionTaskToken += 1
  let taskToken = recognitionTaskToken
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
    if let error = error {
      if !stopRequested {
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
      let detected = detectLocale(from: text)
      let detectedLocale = autoDetectLanguage && (detected?.confidence ?? 0) >= autoDetectConfidence
        ? detected?.localeId ?? currentLocaleId
        : currentLocaleId
      emitFinalText(text, reason: "final", localeId: detectedLocale)
      if autoDetectLanguage {
        resetLanguageDetection()
      }
      if !stopRequested {
        let switched = autoDetectLanguage ? updateRecognizerIfNeeded(for: detectedLocale) : false
        if !switched {
          startRecognitionTask()
        }
      }
    } else {
      lastPartialText = text
      lastPartialAt = Date()
      if autoDetectLanguage {
        if text.count >= autoSwitchMinChars,
           let detected = detectLocale(from: text),
           detected.confidence >= autoSwitchConfidence,
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
  inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
    recognitionRequest?.append(buffer)
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
    startRecognitionTask()
    JsonEmitter.status("recording")
  } catch {
    JsonEmitter.error(error.localizedDescription)
    stopCapture()
  }
}

RunLoop.current.run()
