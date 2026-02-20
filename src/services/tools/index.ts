import type {
  ToolDeclaration,
  ToolHandler,
  ToolResult,
  RegisteredTool,
  GeminiFunctionCall,
  GeminiFunctionResponse,
} from './types';
import {
  datetimeTool,
  mathTool,
  setReminderTool,
  listRemindersTool,
  deviceInfoTool,
} from './handlers';

class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  register(tool: RegisteredTool): void {
    this.tools.set(tool.declaration.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  /**
   * Returns the `tools` config array for the Gemini setup message.
   * Format: [{ functionDeclarations: [...] }]
   */
  getToolsConfig(): { functionDeclarations: ToolDeclaration[] }[] {
    const declarations = Array.from(this.tools.values()).map((t) => t.declaration);
    if (declarations.length === 0) return [];
    return [{ functionDeclarations: declarations }];
  }

  /**
   * Execute a single function call from Gemini and return the response payload.
   */
  async execute(call: GeminiFunctionCall): Promise<GeminiFunctionResponse> {
    const tool = this.tools.get(call.name);

    let result: ToolResult;
    if (!tool) {
      result = { error: `Unknown tool: ${call.name}` };
    } else {
      try {
        result = await tool.handler(call.args || {});
      } catch (err: any) {
        result = { error: err.message || 'Tool execution failed' };
      }
    }

    return {
      id: call.id,
      name: call.name,
      response: result,
    };
  }

  /**
   * Execute multiple function calls (Gemini can send several at once)
   * and return the full toolResponse payload to send back.
   */
  async executeAll(
    calls: GeminiFunctionCall[],
  ): Promise<{ toolResponse: { functionResponses: GeminiFunctionResponse[] } }> {
    const responses = await Promise.all(calls.map((c) => this.execute(c)));
    return {
      toolResponse: {
        functionResponses: responses,
      },
    };
  }

  get size(): number {
    return this.tools.size;
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();

// Register all Phase 1 tools
toolRegistry.register(datetimeTool);
toolRegistry.register(mathTool);
toolRegistry.register(setReminderTool);
toolRegistry.register(listRemindersTool);
toolRegistry.register(deviceInfoTool);

export type { ToolDeclaration, ToolHandler, ToolResult, RegisteredTool };
