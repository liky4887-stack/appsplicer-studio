import { useEffect, useRef } from 'react';
import { TerminalSquare, Trash2 } from 'lucide-react';
import { useMcp } from '@/lib/McpContext';

const KIND_COLOR: Record<string, string> = {
  info: 'text-zinc-400',
  request: 'text-sky-400',
  response: 'text-emerald-400',
  error: 'text-rose-400',
  success: 'text-emerald-300',
};

const SOURCE_TAG: Record<string, string> = {
  system: 'SYS',
  rea: 'REA',
  craft: 'CRF',
};

export function Console() {
  const { logs, clearLogs } = useMcp();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [logs]);

  return (
    <section className="h-64 shrink-0 border-t border-zinc-800 bg-zinc-950 flex flex-col">
      <header className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/80">
        <TerminalSquare className="w-3.5 h-3.5 text-zinc-500" />
        <h2 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">MCP Console</h2>
        <span className="text-[10px] text-zinc-600">{logs.length} lines</span>
        <button
          onClick={clearLogs}
          className="ml-auto text-zinc-600 hover:text-zinc-300 transition-colors"
          title="Clear console"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[11px] leading-relaxed space-y-0.5">
        {logs.length === 0 && <p className="text-zinc-700">Waiting for MCP traffic…</p>}
        {logs.map((entry) => (
          <div key={entry.id} className="flex gap-2">
            <span className="text-zinc-700">{new Date(entry.createdAt).toLocaleTimeString()}</span>
            <span className={`w-8 shrink-0 ${KIND_COLOR[entry.kind]}`}>[{SOURCE_TAG[entry.source]}]</span>
            <span className="text-zinc-300 flex-1">{entry.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
