import React from 'react';
import { 
  FolderOpen, 
  BookOpen, 
  Store, 
  Github, 
  ExternalLink, 
  Terminal, 
  Layers, 
  Zap, 
  ArrowRight 
} from 'lucide-react';
import { Logo } from './Logo';

export function ProjectEmptyState({ title, description, error, onSelect }: any) {
  const resources = [
    {
      title: 'Documentation',
      description: 'Master the Agency framework and CLI tools.',
      icon: BookOpen,
      link: 'https://github.com/bagaking/agency/docs',
      color: 'text-blue-400',
    },
    {
      title: 'Asset Store',
      description: 'Download pre-built Agent templates and cells.',
      icon: Store,
      link: '#',
      color: 'text-purple-400',
    },
    {
      title: 'GitHub Community',
      description: 'Join the discussion and contribute to Agency.',
      icon: Github,
      link: 'https://github.com/bagaking/agency',
      color: 'text-emerald-400',
    }
  ];

  return (
    <div className="flex h-full flex-1 flex-col bg-[#0b0d11] overflow-hidden select-none animate-tab-in">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-30" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-10 py-20 max-w-5xl mx-auto w-full">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-1000 opacity-50" />
            <div className="relative bg-white/5 backdrop-blur-md rounded-[2.5rem] p-8 ring-1 ring-white/10 shadow-2xl">
                <Logo size={80} className="drop-shadow-2xl" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-1.5 shadow-lg ring-4 ring-[#0b0d11]">
                <Zap size={16} className="text-black" fill="currentColor" />
            </div>
          </div>

          <h1 className="text-4xl font-black tracking-tighter text-white mb-4 italic uppercase">
            Agency <span className="text-primary not-italic">OS</span>
          </h1>
          <p className="text-sm text-muted-foreground/60 max-w-md leading-relaxed">
            {description || 'The high-performance orchestration environment for autonomous agents and distributed worktrees.'}
          </p>
          
          {error && (
            <div className="mt-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-rose-400 bg-rose-500/5 px-4 py-2 rounded-full border border-rose-500/10">
                <AlertCircle size={14} />
                {error}
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onSelect}
              className="group flex items-center gap-3 rounded-full bg-white text-black px-8 py-3.5 text-xs font-black uppercase tracking-widest transition-all hover:bg-primary hover:text-white hover:scale-105 active:scale-95 shadow-2xl"
            >
              <FolderOpen size={16} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
              Initialize Workspace
            </button>
            <button
              className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 text-white px-8 py-3.5 text-xs font-black uppercase tracking-widest transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
            >
              <Terminal size={16} strokeWidth={2.5} />
              Quick Start
            </button>
          </div>
        </div>

        {/* Resource Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {resources.map((res) => {
            const Icon = res.icon;
            return (
              <a
                key={res.title}
                href={res.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-start p-6 rounded-2xl bg-white/[0.02] border border-white/[0.03] transition-all duration-500 hover:bg-white/[0.05] hover:-translate-y-1 hover:border-white/10 shadow-sm"
              >
                <div className={`mb-4 rounded-xl p-3 bg-white/5 transition-all duration-500 group-hover:scale-110 ${res.color}`}>
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <div className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                    {res.title}
                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground/50">
                  {res.description}
                </p>
              </a>
            );
          })}
        </div>

        {/* Footer Meta */}
        <div className="mt-20 flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/20">
            <div className="flex items-center gap-2">
                <Layers size={12} strokeWidth={3} />
                Multi-Cell Core
            </div>
            <div className="h-4 w-[1px] bg-white/5" />
            <div className="flex items-center gap-2">
                <Terminal size={12} strokeWidth={3} />
                TMUX V2 Native
            </div>
            <div className="h-4 w-[1px] bg-white/5" />
            <div className="flex items-center gap-2 font-mono">
                v0.2.0-STABLE
            </div>
        </div>
      </div>
    </div>
  );
}

function AlertCircle({ size, className }: any) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    )
}