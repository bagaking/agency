import React, { useState } from 'react';
import { Columns, Eye, Code2, Maximize2, Minimize2 } from 'lucide-react';
import { CodeWorkbenchView } from './CodeWorkbenchView';

export function VectorWorkbenchView({
  content,
  fileUrl,
  language,
  readOnly,
  onChange,
  onCursorChange
}: any) {
  const [mode, setMode] = useState('split'); // split, preview, code

  return (
    <div className="flex h-full w-full flex-col bg-[#0b0d11]">
      {/* Mini-Toolbar for Vector View */}
      <div className="flex h-8 shrink-0 items-center justify-end px-4 border-b border-white/[0.03] bg-white/[0.01] gap-1">
        <ModeButton active={mode === 'preview'} onClick={() => setMode('preview')} icon={Eye} label="Preview" />
        <ModeButton active={mode === 'split'} onClick={() => setMode('split')} icon={Columns} label="Split" />
        <ModeButton active={mode === 'code'} onClick={() => setMode('code')} icon={Code2} label="Source" />
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Preview Pane */}
        {(mode === 'preview' || mode === 'split') && (
          <div className={`flex-1 flex flex-col items-center justify-center p-8 bg-[#111318] relative group ${mode === 'split' ? 'border-r border-white/[0.03]' : ''}`}>
            <div className="absolute top-4 left-4 text-[9px] font-black uppercase tracking-widest text-white/5 pointer-events-none">Vector Render</div>
            <div className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden rounded-lg bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uInGs0ADXUwtWChsBAZGRmIBg9IDGC6g0H0AAYaoXBhfgD1uQ8L86fE1wAAAABJRU5ErkJggg==')] shadow-2xl ring-1 ring-white/10">
                <img src={fileUrl} alt="SVG Preview" className="max-w-full max-h-full object-contain" />
            </div>
          </div>
        )}

        {/* Code Pane */}
        {(mode === 'code' || mode === 'split') && (
          <div className="flex-1 min-w-0 bg-background relative">
            <div className="absolute top-4 left-4 z-10 text-[9px] font-black uppercase tracking-widest text-primary/20 pointer-events-none">XML Source</div>
            <CodeWorkbenchView
              value={content}
              language={language}
              readOnly={readOnly}
              onChange={onChange}
              onCursorChange={onCursorChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${active ? 'text-primary bg-primary/10 font-bold' : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/5'}`}
        >
            <Icon size={12} strokeWidth={active ? 2.5 : 1.5} />
            <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
        </button>
    )
}
