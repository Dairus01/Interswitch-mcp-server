#!/usr/bin/env node
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { registeredTools, toolHandlers } from './tools/registry.js';
import { readResource, resources } from './resources/registry.js';
import { jsonContent } from './utils/mcp.js';
import { toInterswitchError } from './utils/errors.js';

async function main() {
  const server = new Server(
    { name: 'interswitch-mcp-server', version: '0.1.0' },
    { capabilities: { tools: {}, resources: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: registeredTools.map((tool) => tool.definition),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const handler = toolHandlers[request.params.name];
    if (!handler) {
      return jsonContent({ success: false, responseCode: 'UNKNOWN_TOOL', message: `Unknown tool: ${request.params.name}`, data: null, raw: null }, true);
    }

    try {
      return await handler(request.params.arguments);
    } catch (error) {
      const iswError = toInterswitchError(error);
      return jsonContent({ success: false, responseCode: iswError.responseCode, message: iswError.responseDescription, data: null, raw: iswError.raw }, true);
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => readResource(request.params.uri));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('[interswitch-mcp-server] Fatal startup error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
