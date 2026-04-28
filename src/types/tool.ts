import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import type { RiskLevel, ToolMode } from './common.js';

export interface RegisteredTool {
  definition: Tool;
  handler: (args: unknown) => Promise<CallToolResult>;
  mode: ToolMode;
  risk: RiskLevel;
}
