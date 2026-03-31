import React from 'react';
import { Eye, Replace, SearchCode } from 'lucide-react';

import { IconButton } from '../ui/IconButton';
import { focusRing } from '../ui/focusRing';
import { buildExplorerContentReplacePreview } from './explorerContentReplacePreview';
import {
  buildExplorerContentSearchMatchKey,
  type ExplorerContentSearchConfirmedMatch,
} from './useExplorerContentSearch';

type ExplorerContentSearchViewProps = {
  query: string;
  replaceText: string;
  setReplaceText: (value: string) => void;
  scopeOptions: Array<{ id: string; label: string; disabled?: boolean }>;
  activeScopeKind: string;
  onScopeChange: (value: string) => void;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  onToggleCaseSensitive: () => void;
  onToggleWholeWord: () => void;
  onToggleUseRegex: () => void;
  replacementPreviewEnabled: boolean;
  results: Array<{
    path: string;
    matchCount: number;
    matches: Array<{
      line: number;
      column: number;
      endColumn: number;
      text: string;
      snippet: string;
    }>;
  }>;
  loading: boolean;
  replacing: boolean;
  truncated: boolean;
  totalResultFiles: number;
  totalResultMatches: number;
  scannedFiles: number;
  skippedBinaryCount: number;
  skippedLargeCount: number;
  error: string;
  selectedPaths: string[];
  selectedMatchKeys: string[];
  selectedFileCount: number;
  selectedMatchCount: number;
  onToggleResult: (path: string) => void;
  onToggleMatch: (match: ExplorerContentSearchConfirmedMatch) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onOpenResult: (path: string, line?: number) => void | Promise<void>;
  onRevealResult: (path: string) => void | Promise<void>;
  onApplyReplace: () => void | Promise<void>;
};

const focusRingClass = focusRing.sidebar;

export function ExplorerContentSearchView({
  query,
  replaceText,
  setReplaceText,
  scopeOptions,
  activeScopeKind,
  onScopeChange,
  caseSensitive,
  wholeWord,
  useRegex,
  onToggleCaseSensitive,
  onToggleWholeWord,
  onToggleUseRegex,
  replacementPreviewEnabled,
  results,
  loading,
  replacing,
  truncated,
  totalResultFiles,
  totalResultMatches,
  scannedFiles,
  skippedBinaryCount,
  skippedLargeCount,
  error,
  selectedPaths,
  selectedMatchKeys,
  selectedFileCount,
  selectedMatchCount,
  onToggleResult,
  onToggleMatch,
  onSelectAllVisible,
  onClearSelection,
  onOpenResult,
  onRevealResult,
  onApplyReplace,
}: ExplorerContentSearchViewProps) {
  const totalMatches = results.reduce((sum, entry) => sum + Number(entry.matchCount || 0), 0);
  const hasQuery = query.trim().length > 0;
  const selectedPathSet = new Set(selectedPaths);
  const selectedMatchKeySet = new Set(selectedMatchKeys);
  const canReplace = hasQuery && selectedMatchCount > 0 && !loading && !replacing;

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-border/40 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-border/40 bg-muted/10 p-0.5">
            {scopeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={option.disabled}
                onClick={() => onScopeChange(option.id)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
                  activeScopeKind === option.id
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                } disabled:cursor-not-allowed disabled:opacity-35`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-full border border-border/40 bg-muted/10 p-0.5">
            <TogglePill label="Aa" active={caseSensitive} onClick={onToggleCaseSensitive} />
            <TogglePill label="Word" active={wholeWord} onClick={onToggleWholeWord} />
            <TogglePill label=".*" active={useRegex} onClick={onToggleUseRegex} />
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 rounded-xl border border-border/40 bg-muted/10 px-2 py-2">
          <Replace size={12} strokeWidth={1.7} className="shrink-0 text-muted-foreground/50" />
          <input
            value={replaceText}
            onChange={(event) => setReplaceText(event.target.value)}
            placeholder="Replace matches with…"
            aria-label="Replace search matches"
            className={`min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground/35 ${focusRingClass}`}
          />
          <button
            type="button"
            disabled={!canReplace}
            onClick={() => void onApplyReplace()}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${focusRingClass} ${
              canReplace
                ? 'border-primary/30 bg-primary/10 text-primary hover:border-primary/50 hover:bg-primary/15'
                : 'border-border/30 text-muted-foreground/45'
            } disabled:cursor-not-allowed`}
          >
            {replacing ? 'Replacing…' : 'Replace Selected'}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/65">
          <span>
            {loading
              ? 'Searching…'
              : truncated
                ? `${results.length} visible of ${totalResultFiles} files · ${totalMatches} visible / ${totalResultMatches} total matches`
                : `${results.length} files · ${totalMatches} matches`}
          </span>
          <span>{scannedFiles} scanned</span>
          {skippedBinaryCount > 0 ? <span>{skippedBinaryCount} binary skipped</span> : null}
          {skippedLargeCount > 0 ? <span>{skippedLargeCount} large skipped</span> : null}
          {truncated ? (
            <span className="text-amber-300/80">
              Results truncated; replace is limited to confirmed visible matches
            </span>
          ) : null}
        </div>

        {hasQuery && results.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground/72">
            <span>
              {selectedFileCount} confirmed files · {selectedMatchCount} confirmed matches
            </span>
            <button
              type="button"
              onClick={onSelectAllVisible}
              className={`rounded-full border border-border/30 px-2 py-1 font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground ${focusRingClass}`}
            >
              Select Visible
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              disabled={selectedMatchCount === 0}
              className={`rounded-full border border-border/30 px-2 py-1 font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-35 ${focusRingClass}`}
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="border-b border-rose-500/10 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {!hasQuery ? (
          <EmptyState
            title="Content Search"
            body="Search across file contents without collapsing the project tree into filename matches."
          />
        ) : loading && results.length === 0 ? (
          <EmptyState title="Searching…" body="Scanning workspace text files for content matches." />
        ) : results.length === 0 ? (
          <EmptyState
            title="No content matches"
            body="Try a broader scope, relax a modifier, or switch back to path search."
          />
        ) : (
          <div className="space-y-2">
            {results.map((result) => {
              const selectedVisibleMatches = result.matches.reduce((sum, match) => {
                const matchKey = buildExplorerContentSearchMatchKey({
                  path: result.path,
                  line: match.line,
                  column: match.column,
                  endColumn: match.endColumn,
                  text: match.text,
                });
                return selectedMatchKeySet.has(matchKey) ? sum + 1 : sum;
              }, 0);
              const hasVisibleMatches = result.matches.length > 0;
              const allVisibleSelected = hasVisibleMatches && selectedVisibleMatches === result.matches.length;
              const partiallySelected =
                selectedVisibleMatches > 0 && selectedVisibleMatches < result.matches.length;
              return (
                <article
                  key={result.path}
                  className="overflow-hidden rounded-xl border border-border/40 bg-white/[0.03]"
                >
                  <header className="flex items-center gap-2 border-b border-border/20 px-3 py-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        aria-checked={partiallySelected ? 'mixed' : allVisibleSelected}
                        onChange={() => onToggleResult(result.path)}
                        className="h-3.5 w-3.5 rounded border-border/40 bg-background/80"
                        aria-label={`Confirm replace target ${result.path}`}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void onOpenResult(result.path, result.matches[0]?.line)}
                      className={`min-w-0 flex-1 truncate text-left text-[11px] font-semibold text-foreground hover:text-primary ${focusRingClass}`}
                      title={result.path}
                    >
                      {result.path}
                    </button>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {result.matchCount} matches
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                        selectedPathSet.has(result.path)
                          ? 'bg-emerald-500/12 text-emerald-200'
                          : 'bg-muted/20 text-muted-foreground'
                      }`}
                    >
                      {selectedVisibleMatches}/{result.matches.length} reviewed
                    </span>
                    <IconButton
                      label={`Reveal ${result.path} in Explorer tree`}
                      focusRing="sidebar"
                      className="h-6 w-6 rounded-md text-muted-foreground/60 hover:bg-white/5 hover:text-foreground"
                      onClick={() => void onRevealResult(result.path)}
                    >
                      <Eye size={12} strokeWidth={1.6} />
                    </IconButton>
                  </header>

                  <div className="divide-y divide-border/10">
                    {result.matches.map((match, index) => {
                      const matchReview = {
                        path: result.path,
                        line: match.line,
                        column: match.column,
                        endColumn: match.endColumn,
                        text: match.text,
                      };
                      const matchKey = buildExplorerContentSearchMatchKey(matchReview);
                      const matchSelected = selectedMatchKeySet.has(matchKey);
                      const replacementPreview = replacementPreviewEnabled
                        ? buildExplorerContentReplacePreview({
                            snippet: match.snippet,
                            query,
                            replacement: replaceText,
                            caseSensitive,
                            wholeWord,
                            useRegex,
                          })
                        : '';
                      return (
                        <div
                          key={`${result.path}:${match.line}:${match.column}:${index}`}
                          className={`flex items-start gap-2 px-3 py-2 transition-colors ${
                            matchSelected ? 'bg-emerald-500/5' : ''
                          }`}
                        >
                          <label className="mt-1 inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={matchSelected}
                              onChange={() => onToggleMatch(matchReview)}
                              className="h-3.5 w-3.5 rounded border-border/40 bg-background/80"
                              aria-label={`Confirm replace match at ${result.path}:${match.line}:${match.column}`}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => void onOpenResult(result.path, match.line)}
                            className={`flex min-w-0 flex-1 items-start gap-3 text-left transition-colors hover:bg-white/[0.04] ${focusRingClass}`}
                          >
                            <div className="mt-0.5 shrink-0 rounded bg-background/60 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground/80">
                              {match.line}:{match.column}
                            </div>
                            <div className="min-w-0 flex-1 text-[11px] leading-5 text-muted-foreground/85">
                              <span className="block break-words">{match.snippet}</span>
                              {replacementPreview ? (
                                <span className="mt-1 block break-words rounded-md border border-primary/15 bg-primary/5 px-2 py-1 text-primary/85">
                                  Would become: {replacementPreview}
                                </span>
                              ) : null}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function TogglePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${focusRingClass} ${
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-[10rem] flex-col items-center justify-center rounded-2xl border border-dashed border-border/30 bg-muted/5 px-6 text-center">
      <SearchCode size={16} strokeWidth={1.6} className="text-muted-foreground/45" />
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
        {title}
      </div>
      <div className="mt-2 max-w-xs text-[11px] leading-5 text-muted-foreground/70">{body}</div>
    </div>
  );
}
