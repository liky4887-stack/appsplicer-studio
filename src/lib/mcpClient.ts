import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { McpToolInfo } from './types';

export interface McpCallRequest {
  tool: string;
  args: Record<string, unknown>;
}

export interface McpCallResult {
  content: unknown;
  raw: unknown;
}

export async function createMcpClient(url: string): Promise<Client> {
  const client = new Client({ name: 'AppSplicer Studio', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url));
  await client.connect(transport);
  return client;
}

export async function listTools(client: Client): Promise<McpToolInfo[]> {
  const res = await client.listTools();
  return (res.tools ?? []).map((t) => ({
    name: t.name,
    description: t.description,
  }));
}

export async function callTool(client: Client, req: McpCallRequest): Promise<McpCallResult> {
  const res = await client.callTool({ name: req.tool, arguments: req.args });
  const blocks = (res.content ?? []) as Array<{ type: string; text?: string }>;
  const text = blocks
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n');
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // content is plain text, keep it as-is
  }
  return { content: parsed, raw: res };
}

export async function closeMcpClient(client: Client): Promise<void> {
  await client.close();
}

/**
 * Lightweight reachability probe used by "Test connection" before we commit to a full
 * MCP handshake. Browsers cannot do a real JSON-RPC probe without CORS cooperation from
 * the remote server, so we surface any network/CORS error clearly to the UI.
 */
export async function probeMcpEndpoint(url: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'AppSplicer Studio', version: '1.0.0' },
        },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
