import Foundation
import Speech
import AVFoundation
import AppKit
import Darwin

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

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

  static func final(_ text: String) {
    emit(["type": "final", "text": text])
  }

  static func error(_ message: String) {
    emit(["type": "error", "message": message])
  }
}

func parseLanguage() -> String {
  let args = CommandLine.arguments
  guard let index = args.firstIndex(of: "--lang"), index + 1 < args.count else {
    return Locale.current.identifier
  }
  let value = args[index + 1].trimmingCharacters(in: .whitespacesAndNewlines)
  return value.isEmpty ? Locale.current.identifier : value
}

let language = parseLanguage()
let locale = Locale(identifier: language)
guard let recognizer = SFSpeechRecognizer(locale: locale) else {
  JsonEmitter.error("Speech recognizer unavailable for language.")
  exit(1)
}

if !recognizer.isAvailable {
  JsonEmitter.error("Speech recognizer is unavailable.")
  exit(1)
}

let audioEngine = AVAudioEngine()
var recognitionTask: SFSpeechRecognitionTask?
var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
var stopRequested = false

let bundle = Bundle.main
emitDebug([
  "bundleId": bundle.bundleIdentifier ?? "",
  "bundlePath": bundle.bundlePath,
  "hasMicUsage": bundle.object(forInfoDictionaryKey: "NSMicrophoneUsageDescription") != nil,
  "hasSpeechUsage": bundle.object(forInfoDictionaryKey: "NSSpeechRecognitionUsageDescription") != nil,
])

func stopCapture(_ reason: String? = nil) {
  if stopRequested {
    return
  }
  stopRequested = true
  recognitionTask?.finish()
  recognitionTask?.cancel()
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
  recognitionTask?.cancel()
  recognitionRequest?.endAudio()
  let request = SFSpeechAudioBufferRecognitionRequest()
  request.shouldReportPartialResults = true
  recognitionRequest = request
  recognitionTask = recognizer.recognitionTask(with: request) { result, error in
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
      JsonEmitter.final(text)
      if !stopRequested {
        startRecognitionTask()
      }
    } else {
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
