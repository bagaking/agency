import React from 'react';
import { StickyNote, Camera, Inbox, Quote, ArrowUpRight } from 'lucide-react';
import { FlashCaptureCard } from './memo/FlashCaptureCard.jsx';
import { ExcerptCaptureCard } from './memo/ExcerptCaptureCard.jsx';
import { ScreenshotCaptureCard } from './memo/ScreenshotCaptureCard.jsx';

export function HilMemoDrawer({
  activeInboxId,
  onSelectInbox,
  onOpenInbox,
  flashValue,
  onFlashChange,
  onSaveFlash,
  flashVoice,
  flashVoiceSegments,
  excerptUrl,
  onExcerptUrlChange,
  onFetchExcerpt,
  excerptPreview,
  excerptFetching,
  excerptNote,
  onExcerptNoteChange,
  onSaveExcerpt,
  screenshotAsset,
  pendingCapture,
  screenshotNote,
  onScreenshotNoteChange,
  onCaptureScreenshot,
  onOpenRouting,
  captureLoading,
  onFocusInboxInput,
}) {
  const focusRingClass =
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background';
  const renderViewRecordsButton = (targetId) => (
    <button
      type="button"
      onClick={() => onSelectInbox?.(targetId)}
      aria-label="Jump to records"
      title="Jump to records page"
      className={`rounded-full border border-border/30 bg-background/40 p-1.5 text-muted-foreground/60 transition hover:text-foreground hover:border-primary/40 hover:bg-primary/10 ${focusRingClass}`}
    >
      <ArrowUpRight size={12} />
    </button>
  );

  return (
    <div className="flex flex-col gap-4 py-1 select-none">
      <div className="px-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground/50">
          Inbox Shortcuts
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground/60">
          Jump to capture modes in the Memo inbox.
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <MemoShortcutCard
          id="flash"
          label="Flash"
          description="Quick note capture"
          icon={StickyNote}
          active={activeInboxId === 'flash'}
          actions={renderViewRecordsButton('flash')}
          onActivate={() => onFocusInboxInput?.('flash')}
        >
          <FlashCaptureCard
            value={flashValue}
            onChange={onFlashChange}
            onSave={onSaveFlash}
            voice={flashVoice}
            voiceSegments={flashVoiceSegments}
            loading={captureLoading}
          />
        </MemoShortcutCard>

        <MemoShortcutCard
          id="excerpt"
          label="Excerpt"
          description="Capture a source URL"
          icon={Quote}
          active={activeInboxId === 'excerpt'}
          actions={renderViewRecordsButton('excerpt')}
          onActivate={() => onFocusInboxInput?.('excerpt')}
        >
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
          />
        </MemoShortcutCard>

        <MemoShortcutCard
          id="screenshot"
          label="Screenshot"
          description="Capture and annotate"
          icon={Camera}
          active={activeInboxId === 'screenshot'}
          actions={renderViewRecordsButton('screenshot')}
          onActivate={() => onFocusInboxInput?.('screenshot')}
        >
          <ScreenshotCaptureCard
            asset={screenshotAsset}
            pending={pendingCapture}
            note={screenshotNote}
            onNoteChange={onScreenshotNoteChange}
            onCapture={onCaptureScreenshot}
            onOpenRouting={onOpenRouting}
            loading={captureLoading}
          />
        </MemoShortcutCard>
      </div>

      <button
        type="button"
        onClick={() => onOpenInbox?.()}
        className={`flex items-center justify-between rounded-xl bg-card/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 ring-1 ring-inset ring-border/20 transition hover:text-foreground hover:ring-primary/30 hover:bg-card/60 ${focusRingClass}`}
      >
        <span className="flex items-center gap-2">
          <Inbox size={12} />
          Open Inbox
        </span>
        <span className="text-[9px] font-medium text-muted-foreground/40">Comments</span>
      </button>
    </div>
  );
}

function MemoShortcutCard({
  id,
  label,
  description,
  icon: Icon,
  active,
  actions,
  onActivate,
  children,
}) {
  const expanded = !active;
  const focusRingClass =
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background';
  return (
    <div
      className={`rounded-2xl transition-all duration-300 ring-1 ring-inset ${
        active
          ? 'ring-primary/35 bg-card/60 shadow-[0_12px_30px_rgba(15,23,42,0.35)]'
          : 'ring-border/20 bg-card/40 hover:ring-primary/25 hover:bg-card/55'
      }`}
    >
      <div
        role={active ? 'button' : undefined}
        tabIndex={active ? 0 : -1}
        onClick={() => {
          if (active) {
            onActivate?.();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (active) {
              onActivate?.();
            }
          }
        }}
        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${focusRingClass} ${
          active ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <span className="flex items-center gap-3">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset ${
            active
              ? 'ring-primary/40 bg-primary/10 text-primary'
              : 'ring-border/20 bg-background/40 text-muted-foreground/60'
          }`}>
            <Icon size={14} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold text-foreground/80">{label}</span>
            <span className="block text-[10px] text-muted-foreground/50">{description}</span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          {active ? (
            <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary">
              Active
            </span>
          ) : null}
          {actions}
        </span>
      </div>
      <div
        className={`px-3 pb-3 overflow-hidden transition-all duration-300 ${
          expanded ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={`transition-all duration-300 ${expanded ? 'translate-y-0' : '-translate-y-1'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
