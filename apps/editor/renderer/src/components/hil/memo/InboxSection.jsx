import React from 'react';
import { Terminal } from 'lucide-react';
import { FlashCaptureCard } from './FlashCaptureCard.jsx';
import { ExcerptCaptureCard } from './ExcerptCaptureCard.jsx';
import { ScreenshotCaptureCard } from './ScreenshotCaptureCard.jsx';

export function InboxSection({
  activeSection,
  flashValue,
  onFlashChange,
  onSaveFlash,
  flashVoice,
  flashVoiceSegments,
  flashVoiceShortcut,
  flashInputRef,
  excerptUrl,
  onExcerptUrlChange,
  onFetchExcerpt,
  excerptPreview,
  excerptFetching,
  excerptNote,
  onExcerptNoteChange,
  onSaveExcerpt,
  excerptUrlInputRef,
  excerptNoteInputRef,
  screenshotAsset,
  pendingCapture,
  screenshotNote,
  onScreenshotNoteChange,
  onCaptureScreenshot,
  onOpenRouting,
  screenshotShortcut,
  captureLoading,
  captureError,
  screenshotNoteInputRef,
}) {
  const highlightClass = activeSection?.id && activeSection.id !== 'comments'
    ? 'ring-1 ring-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.08)]'
    : '';
  return (
    <div className="border-b border-border/10 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
          Inbox
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
          {activeSection?.label || 'Inbox'}
        </div>
      </div>

      <div className={`mt-3 rounded-2xl border border-border/10 bg-muted/5 p-4 transition-all duration-300 ${highlightClass}`}>
        {activeSection?.id === 'comments' ? (
          <div className="flex flex-col gap-2 text-[11px] text-muted-foreground/60">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
              <Terminal size={12} />
              Comment Capture
            </div>
            <p className="leading-relaxed">
              Add comments directly inside the editor. Use line comments to capture context-rich feedback.
            </p>
          </div>
        ) : null}

        {activeSection?.id === 'flash' ? (
          <FlashCaptureCard
            value={flashValue}
            onChange={onFlashChange}
            onSave={onSaveFlash}
            voice={flashVoice}
            voiceSegments={flashVoiceSegments}
            loading={captureLoading}
            inputRef={flashInputRef}
            voiceShortcut={flashVoiceShortcut}
          />
        ) : null}

        {activeSection?.id === 'excerpt' ? (
          <ExcerptCaptureCard
            url={excerptUrl}
            onUrlChange={onExcerptUrlChange}
            onFetch={onFetchExcerpt}
            preview={excerptPreview}
            fetching={excerptFetching}
            note={excerptNote}
            onNoteChange={onExcerptNoteChange}
            onSave={onSaveExcerpt}
            loading={captureLoading}
            urlInputRef={excerptUrlInputRef}
            noteInputRef={excerptNoteInputRef}
          />
        ) : null}

        {activeSection?.id === 'screenshot' ? (
          <ScreenshotCaptureCard
            asset={screenshotAsset}
            pending={pendingCapture}
            note={screenshotNote}
            onNoteChange={onScreenshotNoteChange}
            onCapture={onCaptureScreenshot}
            onOpenRouting={onOpenRouting}
            loading={captureLoading}
            noteInputRef={screenshotNoteInputRef}
            captureShortcut={screenshotShortcut}
          />
        ) : null}

        {captureError ? (
          <div className="mt-3 text-[10px] font-medium text-rose-400 bg-rose-500/5 p-2 rounded border border-rose-500/10">
            {captureError}
          </div>
        ) : null}
      </div>
    </div>
  );
}
