import { useState } from 'react';
import { FileText, Boxes, Code2, Network, Wand2, PlayCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useMcp } from '@/lib/McpContext';
import { Button } from '@/components/ui/Button';

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="text-[11px] leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap bg-zinc-950 rounded p-3 overflow-x-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function ReaPane() {
  const { analysis, inspectPackage, inspectMethod, traceReferences, searchClasses, servers, selectClass } = useMcp();
  const busy = servers.rea.status === 'connecting';
  const [classQuery, setClassQuery] = useState('');

  return (
    <section className="flex-1 flex flex-col overflow-hidden border-r border-zinc-800">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950">
        <Boxes className="w-4 h-4 text-sky-400" />
        <h2 className="text-xs font-semibold text-zinc-200">REA Analysis</h2>
        <span className="text-[10px] text-zinc-600">reverse-engineered APK context</span>
        <Button
          variant="primary"
          size="sm"
          className="ml-auto"
          loading={busy}
          disabled={!servers.rea.client && !servers.rea.url && servers.rea.status !== 'connected'}
          onClick={() => inspectPackage()}
        >
          <PlayCircle className="w-3.5 h-3.5" /> inspect-android-package
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!analysis.manifest && !busy && (
          <p className="text-xs text-zinc-600">No analysis yet. Upload an APK and run `inspect-android-package`.</p>
        )}

        {analysis.manifest && (
          <div className="space-y-1">
            <h3 className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Manifest
            </h3>
            <JsonBlock data={analysis.manifest} />
          </div>
        )}

        {analysis.classes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
                <Boxes className="w-3 h-3" /> Classes
              </h3>
              <input
                value={classQuery}
                onChange={(e) => setClassQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && classQuery.trim()) searchClasses(classQuery.trim());
                }}
                placeholder="search-android-classes…"
                className="ml-auto bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 placeholder-zinc-600 w-44 focus:outline-none focus:border-zinc-600"
              />
            </div>
            <ul className="space-y-1.5">
              {analysis.classes.map((c) => (
                <li
                  key={c.name}
                  className={`rounded-lg border p-2.5 cursor-pointer transition-colors ${
                    analysis.selectedClass === c.name
                      ? 'border-sky-700/60 bg-sky-500/5'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                  }`}
                  onClick={() => selectClass(c.name)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-200">{c.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        inspectMethod(c.name, c.methods[0]);
                      }}
                      title="inspect-android-method"
                    >
                      <Code2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">extends {c.superClassName}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.methods.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.methodDetail && (
          <div className="space-y-1">
            <h3 className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
              <Code2 className="w-3 h-3" /> Decompiled logic — {analysis.methodDetail.methodName}
            </h3>
            <pre className="text-[11px] leading-relaxed text-emerald-300/90 font-mono whitespace-pre-wrap bg-zinc-950 rounded p-3 overflow-x-auto">
              {analysis.methodDetail.source}
            </pre>
            <Button variant="secondary" size="sm" onClick={() => traceReferences(analysis.selectedClass ?? '')}>
              <Network className="w-3 h-3" /> trace-android-references
            </Button>
          </div>
        )}

        {analysis.references.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-[11px] uppercase tracking-wide text-zinc-500">Reference graph</h3>
            <JsonBlock data={analysis.references} />
          </div>
        )}
      </div>
    </section>
  );
}

export function CraftPane() {
  const { craftOutput, rebuildApp, injectFeature, servers, analysis } = useMcp();
  const busy = servers.craft.status === 'connecting';
  const [featurePrompt, setFeaturePrompt] = useState('');

  const canRunRebuild = analysis.manifest !== null;
  const canInject = analysis.methodDetail !== null;

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950">
        <Wand2 className="w-4 h-4 text-fuchsia-400" />
        <h2 className="text-xs font-semibold text-zinc-200">Craft Output</h2>
        <span className="text-[10px] text-zinc-600">generated Expo / React Native code</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
          <h3 className="text-[11px] uppercase tracking-wide text-zinc-500">Pipeline A — Rebuild</h3>
          <Button variant="primary" size="sm" disabled={!canRunRebuild || busy} loading={busy} onClick={() => rebuildApp(null)}>
            <PlayCircle className="w-3.5 h-3.5" /> rebuild
          </Button>
          {!canRunRebuild && <p className="text-[10px] text-zinc-600">Run REA analysis first.</p>}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
          <h3 className="text-[11px] uppercase tracking-wide text-zinc-500">Pipeline B — Inject feature</h3>
          <input
            value={featurePrompt}
            onChange={(e) => setFeaturePrompt(e.target.value)}
            placeholder="e.g. add a dark-mode toggle"
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
          <Button
            variant="primary"
            size="sm"
            disabled={!canInject || busy || !featurePrompt.trim()}
            loading={busy}
            onClick={() => injectFeature(featurePrompt.trim())}
          >
            <Wand2 className="w-3.5 h-3.5" /> Send to Craft Anything
          </Button>
          {!canInject && <p className="text-[10px] text-zinc-600">Pick a class and inspect a method first.</p>}
        </div>

        {craftOutput && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] uppercase tracking-wide text-zinc-500">Result</h3>
              {craftOutput.buildStatus === 'passed' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> build passed
                </span>
              )}
              {craftOutput.buildStatus === 'pending' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> build pending
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">{craftOutput.summary}</p>

            {craftOutput.files.map((f) => (
              <div key={f.path} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-300">{f.path}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      f.action === 'create' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    {f.action}
                  </span>
                </div>
                <pre className="text-[11px] leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap bg-zinc-950 rounded p-3 overflow-x-auto">
                  {f.content}
                </pre>
              </div>
            ))}

            {craftOutput.diff && (
              <div className="space-y-1">
                <h3 className="text-[11px] uppercase tracking-wide text-zinc-500">Diff</h3>
                <pre className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap bg-zinc-950 rounded p-3 overflow-x-auto text-zinc-400">
                  {craftOutput.diff}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
