import { lazy, Suspense, type ReactNode } from 'react';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Load Monaco codicons only in browser-like environments.
  void import('monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.css');
}

let monacoEditorImportPromise: Promise<unknown> | null = null;

const MonacoEditor = lazy(async () => {
  const mod = await import('@monaco-editor/react');
  return {
    default: mod.default,
  };
});

export function preloadLazyMonacoEditor() {
  if (!monacoEditorImportPromise) {
    monacoEditorImportPromise = import('@monaco-editor/react');
  }
  return monacoEditorImportPromise;
}

export function LazyMonacoEditor({
  fallback = null,
  ...props
}: {
  fallback?: ReactNode;
  [key: string]: any;
}) {
  return (
    <Suspense fallback={fallback}>
      <MonacoEditor {...props} />
    </Suspense>
  );
}
