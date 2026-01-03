import React from 'react';
import { Terminal } from 'lucide-react';
import { FlashCaptureCard } from './FlashCaptureCard.jsx';
import { ExcerptCaptureCard } from './ExcerptCaptureCard.jsx';
import { ScreenshotCaptureCard } from './ScreenshotCaptureCard.jsx';

export function InboxSection({
  activeSection,
  selectionPath,
  selectionLines,
  selectionText,
  flashValue,
  onFlashChange,
  onSaveFlash,
  excerptNote,
  onExcerptNoteChange,
  onSaveExcerpt,
  screenshotAsset,
  screenshotNote,
  onScreenshotNoteChange,
  onCaptureScreenshot,
  onSaveScreenshot,
  captureLoading,
  captureError,
}) {
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

      <div className="mt-3 rounded-2xl border border-border/10 bg-muted/5 p-4">
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
            loading={captureLoading}
          />
        ) : null}

        {activeSection?.id === 'excerpt' ? (
          <ExcerptCaptureCard
            selectionText={selectionText}
            selectionPath={selectionPath}
            selectionLines={selectionLines}
            note={excerptNote}
            onNoteChange={onExcerptNoteChange}
            onSave={onSaveExcerpt}
            loading={captureLoading}
          />
        ) : null}

        {activeSection?.id === 'screenshot' ? (
          <ScreenshotCaptureCard
            asset={screenshotAsset}
            note={screenshotNote}
            onNoteChange={onScreenshotNoteChange}
            onCapture={onCaptureScreenshot}
            onSave={onSaveScreenshot}
            loading={captureLoading}
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
