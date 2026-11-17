export type ServerId = 'rea' | 'craft';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface McpToolInfo {
  name: string;
  description?: string;
}

export interface McpServerState {
  id: ServerId;
  label: string;
  url: string;
  status: ConnectionStatus;
  error?: string;
  tools: McpToolInfo[];
}

export type LogKind = 'info' | 'request' | 'response' | 'error' | 'success';
export type LogSource = 'system' | 'rea' | 'craft';

export interface LogEntry {
  id: string;
  kind: LogKind;
  source: LogSource;
  message: string;
  payload?: unknown;
  createdAt: string;
}

export interface ReaManifest {
  appLabel: string;
  packageName: string;
  versionName: string;
  minSdk: number;
  targetSdk: number;
  permissions: string[];
  activities: string[];
}

export interface ReaClassInfo {
  name: string;
  superClassName: string;
  methods: string[];
}

export interface ReaMethodDetail {
  className: string;
  methodName: string;
  signature: string;
  source: string;
}

export interface ReaReferenceEdge {
  from: string;
  to: string;
  kind: string;
}

export interface CraftFile {
  path: string;
  action: 'create' | 'modify';
  content: string;
}

export interface CraftResult {
  kind: 'rebuild' | 'feature';
  summary: string;
  files: CraftFile[];
  diff?: string;
  buildStatus: 'passed' | 'pending' | 'failed';
}

export interface AnalysisState {
  manifest: ReaManifest | null;
  classes: ReaClassInfo[];
  selectedClass: string | null;
  methodDetail: ReaMethodDetail | null;
  references: ReaReferenceEdge[];
}
