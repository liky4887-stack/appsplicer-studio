import { useCallback, useRef, useState } from 'react';
import { Upload, Link2, Loader2, FlaskConical, Plug, Unplug, Wifi, WifiOff } from 'lucide-react';
import { useMcp } from '@/lib/McpContext';
import type { ServerId } from '@/lib/types';
import { Button } from '@/components/ui/Button';

function ServerRow({ id, label }: { id: ServerId; label: string }) {
  const { servers, connect, disconnect } = useMcp();
  const server = servers[id];
  const [url, setUrl] = useState(server.url);

  const statusIcon = {
    connected: <Wifi className="w-3.5 h-3.5 text-emerald-400" />,
    connecting: <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
    error: <WifiOff className="w-3.5 h-3.5 text-rose-400" />,
    disconnected: <WifiOff className="w-3.5 h-3.5 text-zinc-600" />,
  }[server.status];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
      <div className="flex items-center gap-2">
        {statusIcon}
        <span className="text-xs font-medium text-zinc-300">{label}</span>
        {server.tools.length > 0 && (
          <span className="ml-auto text-[10px] text-zinc-500">{server.tools.length} tools</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…/mcp"
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        {server.status === 'connected' ? (
          <Button variant="ghost" size="sm" onClick={() => disconnect(id)} title="Disconnect">
            <Unplug className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => connect(id, url)} title="Test connection">
            <Plug className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      {server.error && <p className="text-[10px] text-rose-400 leading-snug">{server.error}</p>}
      {server.status === 'connected' && server.tools.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {server.tools.map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ApkDropzone() {
  const { servers, connect } = useMcp();
  const [apkName, setApkName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!file.name.endsWith('.apk')) {
        alert('Please drop a .apk file');
        return;
      }
      setApkName(file.name);
    },
    [],
  );

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/60'
        }`}
      >
        <Upload className="w-5 h-5 text-zinc-500 mx-auto mb-2" />
        <p className="text-xs text-zinc-400">{apkName ?? 'Drop target APK here or click to browse'}</p>
        {apkName && <p className="mt-1 text-[10px] text-emerald-400">Loaded — ready for Pipeline A</p>}
        <input
          ref={inputRef}
          type="file"
          accept=".apk"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <Button
        variant="primary"
        size="sm"
        className="w-full"
        disabled={!apkName}
        onClick={() => connect('rea', servers.rea.url || 'mock://rea')}
      >
        <Link2 className="w-3.5 h-3.5" /> Analyze with REA
      </Button>
    </div>
  );
}

export function Sidebar() {
  const { mockMode, toggleMockMode } = useMcp();
  return (
    <aside className="w-72 shrink-0 border-r border-zinc-800 bg-zinc-950 p-4 space-y-4 overflow-y-auto">
      <div>
        <h1 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-emerald-400" /> AppSplicer Studio
        </h1>
        <p className="text-[11px] text-zinc-500 mt-1">MCP orchestrator for REA + Craft Anything</p>
      </div>

      <div>
        <h2 className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Target APK</h2>
        <ApkDropzone />
      </div>

      <div>
        <h2 className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">MCP Server URLs</h2>
        <div className="space-y-2">
          <ServerRow id="rea" label="REA (reverse engineering)" />
          <ServerRow id="craft" label="Craft Anything (generation)" />
        </div>
      </div>

      <button
        onClick={toggleMockMode}
        className={`w-full text-left rounded-lg border p-3 transition-colors ${
          mockMode ? 'border-amber-700/50 bg-amber-500/5' : 'border-emerald-700/50 bg-emerald-500/5'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-200">Mock responses</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              mockMode ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {mockMode ? 'ON' : 'OFF'}
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 mt-1">
          {mockMode
            ? 'Using simulated MCP responses — no server needed.'
            : 'Live mode — real MCP calls to the URLs above.'}
        </p>
      </button>
    </aside>
  );
}
