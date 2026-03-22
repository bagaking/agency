// Ambient typings for the preload IPC bridge.
// Keep this intentionally permissive during early TS adoption.

export {};

interface AgencyCaptureBridge {
  getDisplaySource?: (payload: Record<string, unknown>) => Promise<{ dataUrl?: string }>;
  completeCapture?: (payload: Record<string, unknown>) => Promise<void>;
  cancelCapture?: (payload: Record<string, unknown>) => Promise<void> | void;
  setIncludeAgencyWindows?: (payload: Record<string, unknown>) => Promise<void>;
}

declare global {
  interface Window {
    agency?: Record<string, any>;
    agencyCapture?: AgencyCaptureBridge;
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}
