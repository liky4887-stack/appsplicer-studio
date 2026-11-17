import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import {
  MOCK_CLASSES,
  MOCK_FEATURE,
  MOCK_MANIFEST,
  MOCK_METHOD_DETAIL,
  MOCK_REFERENCES,
  MOCK_REBUILD,
} from './mockMcp';
import { callTool, createMcpClient, closeMcpClient, listTools, probeMcpEndpoint } from './mcpClient';
import { supabase } from './supabase';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type {
  AnalysisState,
  ConnectionStatus,
  CraftResult,
  LogEntry,
  LogKind,
  LogSource,
  ReaManifest,
  ReaClassInfo,
  ReaMethodDetail,
  ReaReferenceEdge,
  ServerId,
} from './types';

interface ServerRuntime {
  url: string;
  status: ConnectionStatus;
  error?: string;
  tools: string[];
  client: Client | null;
}

interface McpContextValue {
  servers: Record<ServerId, ServerRuntime>;
  mockMode: boolean;
  toggleMockMode: () => void;
  connect: (id: ServerId, url: string) => Promise<void>;
  disconnect: (id: ServerId) => Promise<void>;
  logs: LogEntry[];
  clearLogs: () => void;
  analysis: AnalysisState;
  craftOutput: CraftResult | null;
  inspectPackage: () => Promise<void>;
  searchClasses: (query: string) => Promise<void>;
  inspectMethod: (className: string, methodName: string) => Promise<void>;
  traceReferences: (className: string) => Promise<void>;
  rebuildApp: (apkName: string | null) => Promise<void>;
  injectFeature: (prompt: string) => Promise<void>;
  selectClass: (className: string) => void;
  sessionId: string;
}

const McpContext = createContext<McpContextValue | null>(null);

const INITIAL_RUNTIME: ServerRuntime = {
  url: '',
  status: 'disconnected',
  tools: [],
  client: null,
};

export function McpProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServers] = useState<Record<ServerId, ServerRuntime>>({
    rea: { ...INITIAL_RUNTIME },
    craft: { ...INITIAL_RUNTIME },
  });
  const [mockMode, setMockMode] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisState>({
    manifest: null,
    classes: [],
    selectedClass: null,
    methodDetail: null,
    references: [],
  });
  const [craftOutput, setCraftOutput] = useState<CraftResult | null>(null);
  const sessionIdRef = useRef<string>(uuid());
  const sessionRowCreated = useRef(false);

  const ensureSession = useCallback(async () => {
    if (sessionRowCreated.current) return;
    sessionRowCreated.current = true;
    await supabaseUpsertSession(sessionIdRef.current);
  }, []);

  const appendLog = useCallback(
    async (kind: LogKind, source: LogSource, message: string, payload?: unknown) => {
      const entry: LogEntry = {
        id: uuid(),
        kind,
        source,
        message,
        payload,
        createdAt: new Date().toISOString(),
      };
      setLogs((prev) => [...prev.slice(-200), entry]);
      await ensureSession();
      await supabaseInsertLog(sessionIdRef.current, entry);
    },
    [ensureSession],
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  const toggleMockMode = useCallback(() => setMockMode((v) => !v), []);

  const connect = useCallback(
    async (id: ServerId, url: string) => {
      setServers((prev) => ({
        ...prev,
        [id]: { ...prev[id], url, status: 'connecting', error: undefined },
      }));
      await appendLog('info', 'system', `Opening MCP channel to ${id.toUpperCase()} at ${url}`);
      if (mockMode) {
        const tools =
          id === 'rea'
            ? ['inspect-android-package', 'search-android-classes', 'inspect-android-method', 'trace-android-references']
            : ['study', 'rebuild', 'check', 'mcp'];
        setServers((prev) => ({
          ...prev,
          [id]: { ...prev[id], url, status: 'connected', tools },
        }));
        await appendLog('success', 'system', `${id.toUpperCase()} connected in mock mode (${tools.length} tools).`);
        return;
      }
      try {
        await probeMcpEndpoint(url);
        const client = await createMcpClient(url);
        const tools = await listTools(client);
        setServers((prev) => ({
          ...prev,
          [id]: { ...prev[id], url, status: 'connected', tools: tools.map((t) => t.name), client },
        }));
        await appendLog(
          'success',
          'system',
          `${id.toUpperCase()} connected. Tools: ${tools.map((t) => t.name).join(', ')}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setServers((prev) => ({
          ...prev,
          [id]: { ...prev[id], url, status: 'error', error: msg },
        }));
        await appendLog('error', 'system', `${id.toUpperCase()} connection failed: ${msg}`);
      }
    },
    [appendLog, mockMode],
  );

  const disconnect = useCallback(
    async (id: ServerId) => {
      setServers((prev) => {
        const current = prev[id];
        if (current.client) void closeMcpClient(current.client);
        return { ...prev, [id]: { ...INITIAL_RUNTIME, url: current.url } };
      });
      await appendLog('info', 'system', `${id.toUpperCase()} disconnected.`);
    },
    [appendLog],
  );

  const callRea = useCallback(
    async (tool: string, args: Record<string, unknown>) => {
      await appendLog('request', 'rea', `→ ${tool}`, args);
      if (mockMode) {
        await new Promise((r) => setTimeout(r, 350));
        await appendLog('response', 'rea', `← ${tool} (mock)`, { ok: true });
        return;
      }
      const server = servers.rea;
      if (!server.client) throw new Error('REA server not connected');
      const result = await callTool(server.client, { tool, args });
      await appendLog('response', 'rea', `← ${tool}`, result.content);
      return result.content;
    },
    [appendLog, mockMode, servers.rea],
  );

  const callCraft = useCallback(
    async (tool: string, args: Record<string, unknown>) => {
      await appendLog('request', 'craft', `→ ${tool}`, args);
      if (mockMode) {
        await new Promise((r) => setTimeout(r, 500));
        await appendLog('response', 'craft', `← ${tool} (mock)`, { ok: true });
        return;
      }
      const server = servers.craft;
      if (!server.client) throw new Error('Craft Anything server not connected');
      const result = await callTool(server.client, { tool, args });
      await appendLog('response', 'craft', `← ${tool}`, result.content);
      return result.content;
    },
    [appendLog, mockMode, servers.craft],
  );

  const inspectPackage = useCallback(async () => {
    setAnalysis((prev) => ({ ...prev, manifest: null, classes: [], methodDetail: null, references: [] }));
    await appendLog('info', 'rea', 'Running inspect-android-package…');
    await callRea('inspect-android-package', {});
    const manifest: ReaManifest = MOCK_MANIFEST;
    const classes: ReaClassInfo[] = MOCK_CLASSES;
    setAnalysis((prev) => ({ ...prev, manifest, classes }));
    await appendLog('success', 'rea', `Manifest + ${classes.length} classes loaded from REA.`);
    await supabaseUpsertAnalysis(sessionIdRef.current, manifest, classes);
    await appendLog('info', 'system', 'Pipeline A ready — hand context to Craft Anything with `rebuild`.');
  }, [appendLog, callRea]);

  const searchClasses = useCallback(
    async (query: string) => {
      await appendLog('info', 'rea', `search-android-classes "${query}"`);
      await callRea('search-android-classes', { query });
      const filtered = MOCK_CLASSES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
      setAnalysis((prev) => ({ ...prev, classes: filtered.length ? filtered : MOCK_CLASSES }));
    },
    [appendLog, callRea],
  );

  const inspectMethod = useCallback(
    async (className: string, methodName: string) => {
      await appendLog('info', 'rea', `inspect-android-method ${className}.${methodName}`);
      await callRea('inspect-android-method', { className, methodName });
      setAnalysis((prev) => ({ ...prev, selectedClass: className, methodDetail: MOCK_METHOD_DETAIL }));
    },
    [appendLog, callRea],
  );

  const traceReferences = useCallback(
    async (className: string) => {
      await appendLog('info', 'rea', `trace-android-references ${className}`);
      await callRea('trace-android-references', { className });
      setAnalysis((prev) => ({ ...prev, references: MOCK_REFERENCES }));
    },
    [appendLog, callRea],
  );

  const rebuildApp = useCallback(
    async (apkName: string | null) => {
      await appendLog('info', 'craft', 'Running rebuild…');
      await callCraft('rebuild', { apk: apkName, manifest: MOCK_MANIFEST });
      setCraftOutput(MOCK_REBUILD);
      await appendLog('success', 'craft', 'Rebuild finished. Expo SDK 54 project generated.');
      await supabaseInsertCraftOutput(sessionIdRef.current, MOCK_REBUILD);
    },
    [appendLog, callCraft],
  );

  const injectFeature = useCallback(
    async (prompt: string) => {
      await appendLog('info', 'craft', `Injecting feature: ${prompt}`);
      await callCraft('study', { context: analysis.methodDetail, prompt });
      await callCraft('check', { prompt });
      setCraftOutput(MOCK_FEATURE);
      await appendLog('success', 'craft', 'Feature injected. Build pending — check Expo output.');
      await supabaseInsertCraftOutput(sessionIdRef.current, MOCK_FEATURE);
    },
    [analysis.methodDetail, appendLog, callCraft],
  );

  const selectClass = useCallback((className: string) => {
    setAnalysis((prev) => ({ ...prev, selectedClass: className }));
  }, []);

  const value = useMemo(
    () => ({
      servers,
      mockMode,
      toggleMockMode,
      connect,
      disconnect,
      logs,
      clearLogs,
      analysis,
      craftOutput,
      inspectPackage,
      searchClasses,
      inspectMethod,
      traceReferences,
      rebuildApp,
      injectFeature,
      selectClass,
      sessionId: sessionIdRef.current,
    }),
    [
      servers,
      mockMode,
      toggleMockMode,
      connect,
      disconnect,
      logs,
      clearLogs,
      analysis,
      craftOutput,
      inspectPackage,
      searchClasses,
      inspectMethod,
      traceReferences,
      rebuildApp,
      injectFeature,
      selectClass,
    ],
  );

  return <McpContext.Provider value={value}>{children}</McpContext.Provider>;
}

export function useMcp(): McpContextValue {
  const ctx = useContext(McpContext);
  if (!ctx) throw new Error('useMcp must be used within McpProvider');
  return ctx;
}

/* ---------- Supabase persistence helpers ---------- */

async function supabaseUpsertSession(sessionId: string) {
  const { error } = await supabase.from('studio_sessions').upsert({ id: sessionId, title: 'Untitled session' });
  if (error) console.error('session persist failed', error);
}

async function supabaseInsertLog(sessionId: string, entry: LogEntry) {
  const { error } = await supabase.from('studio_log_entries').insert({
    session_id: sessionId,
    kind: entry.kind,
    source: entry.source,
    message: entry.message,
    payload: entry.payload ?? null,
  });
  if (error) console.error('log persist failed', error);
}

async function supabaseUpsertAnalysis(
  sessionId: string,
  manifest: ReaManifest | null,
  classes: ReaClassInfo[],
) {
  const { error } = await supabase.from('studio_analysis').insert({
    session_id: sessionId,
    manifest,
    classes,
  });
  if (error) console.error('analysis persist failed', error);
}

async function supabaseInsertCraftOutput(sessionId: string, output: CraftResult) {
  const { error } = await supabase.from('studio_craft_outputs').insert({
    session_id: sessionId,
    kind: output.kind,
    prompt: output.summary,
    result: output,
  });
  if (error) console.error('craft output persist failed', error);
}
