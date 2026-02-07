// Ambient typings for the preload IPC bridge.
// Keep this intentionally permissive during early TS adoption.

export {};

declare global {
  interface Window {
    agency?: Record<string, any>;
    agencyCapture?: Record<string, any>;
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}
