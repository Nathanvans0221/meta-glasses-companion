// Tool declaration format for Gemini's function calling API
export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

// Result returned by a tool handler after execution
export interface ToolResult {
  [key: string]: unknown;
}

// Handler function that executes a tool and returns a result
export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

// A registered tool combines its declaration with its handler
export interface RegisteredTool {
  declaration: ToolDeclaration;
  handler: ToolHandler;
}

// Gemini protocol: incoming function call request
export interface GeminiFunctionCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

// Gemini protocol: outgoing function response
export interface GeminiFunctionResponse {
  id: string;
  name: string;
  response: ToolResult;
}
