import { websocketService } from './websocket';
import { audioService } from './audio';
import { GEMINI_WS_BASE, GEMINI_DEFAULT_MODEL } from '../constants';
import { toolRegistry } from './tools';
import type { GeminiFunctionCall } from './tools/types';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  toolsEnabled?: boolean;
}

class GeminiService {
  private config: GeminiConfig | null = null;
  private transcriptCallback: ((text: string, role: 'user' | 'assistant' | 'system') => void) | null = null;
  private audioCallback: ((base64Audio: string) => void) | null = null;
  private turnCompleteCallback: (() => void) | null = null;
  private disconnectCallback: ((detail?: string) => void) | null = null;
  private unsubscribeMessage: (() => void) | null = null;
  private unsubscribeState: (() => void) | null = null;
  private messageCount = 0;
  private audioMode = false;

  configure(config: GeminiConfig): void {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Clean up any existing connection before reconnecting
    this.cleanupConnection();
    this.messageCount = 0;

    const config = this.config;
    const model = config.model || GEMINI_DEFAULT_MODEL;

    const url = `${GEMINI_WS_BASE}?key=${config.apiKey}`;

    // Listen for incoming messages — log every single one for debugging
    this.unsubscribeMessage = websocketService.onMessage((data) => {
      this.messageCount++;
      this.handleServerMessage(data);
    });

    // Disable auto-reconnect — we handle reconnection ourselves
    websocketService.connect(url, false);

    // Wait for WebSocket connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 15000);
      const unsub = websocketService.onStateChange((state) => {
        if (state === 'connected') {
          clearTimeout(timeout);
          unsub();
          resolve();
        } else if (state === 'error' || state === 'disconnected') {
          clearTimeout(timeout);
          unsub();
          reject(new Error('Connection failed'));
        }
      });
    });

    // Build setup message with optional tool declarations
    const setupMsg: any = {
      setup: {
        model: `models/${model}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore',
              },
            },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: this.buildSystemInstruction(config),
            },
          ],
        },
      },
    };

    // Add tool declarations if enabled
    if (config.toolsEnabled !== false && toolRegistry.size > 0) {
      setupMsg.setup.tools = toolRegistry.getToolsConfig();
    }

    this.audioMode = true;

    // Send setup message and wait for setupComplete
    await new Promise<void>((resolve, reject) => {
      const setupTimeout = setTimeout(() => {
        unsubMsg();
        unsubState();
        reject(new Error('Setup timeout — Gemini did not acknowledge config'));
      }, 10000);

      const unsubMsg = websocketService.onMessage((data) => {
        if (data.setupComplete) {
          clearTimeout(setupTimeout);
          unsubMsg();
          unsubState();
          resolve();
        }
      });

      const unsubState = websocketService.onStateChange((state, detail) => {
        if (state === 'disconnected' || state === 'error') {
          clearTimeout(setupTimeout);
          unsubMsg();
          unsubState();
          const closeInfo = `close=${websocketService.lastCloseCode} ${websocketService.lastCloseReason}`;
          reject(new Error(`Setup failed [${closeInfo}] ${detail || ''}`));
        }
      });

      websocketService.send(setupMsg);
    });

    // Connection established — monitor for disconnects
    this.monitorConnection();
  }

  getMessageCount(): number {
    return this.messageCount;
  }

  sendAudio(base64Audio: string): void {
    websocketService.sendAudioChunk(base64Audio);
  }

  /**
   * Send a JPEG image frame to Gemini for visual analysis.
   * Used for glasses camera streaming — Gemini sees what the user sees.
   */
  sendImage(base64Jpeg: string): void {
    websocketService.send({
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'image/jpeg',
            data: base64Jpeg,
          },
        ],
      },
    });
  }

  /**
   * Signal to Gemini that the user's audio turn is complete.
   * Used after streaming audio to tell Gemini to start responding immediately.
   */
  sendEndOfTurn(): void {
    websocketService.send({
      clientContent: {
        turnComplete: true,
      },
    });
  }

  sendText(text: string): void {
    websocketService.send({
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    });
  }

  onTranscript(callback: (text: string, role: 'user' | 'assistant' | 'system') => void): void {
    this.transcriptCallback = callback;
  }

  onAudioResponse(callback: (base64Audio: string) => void): void {
    this.audioCallback = callback;
  }

  onTurnComplete(callback: () => void): void {
    this.turnCompleteCallback = callback;
  }

  onDisconnect(callback: (detail?: string) => void): void {
    this.disconnectCallback = callback;
  }

  disconnect(): void {
    this.cleanupConnection();
    websocketService.disconnect();
  }

  isConnected(): boolean {
    return websocketService.isConnected();
  }

  private buildSystemInstruction(config: GeminiConfig): string {
    if (config.systemInstruction) {
      return config.systemInstruction;
    }

    const base =
      'You are Ferny, the WorkSuite voice assistant for Silver Fern — a food production and ' +
      'agriculture technology company. You help growers and production teams manage their daily ' +
      'operations completely hands-free through voice.\n\n' +
      'PERSONALITY:\n' +
      '- You are practical, friendly, and efficient — like a knowledgeable farm manager.\n' +
      '- Keep responses SHORT and conversational. Growers are busy and wearing smart glasses — ' +
      'they need quick answers, not essays.\n' +
      '- Use natural farming language. Say "we\'re running low on corn" not "inventory levels are suboptimal".\n' +
      '- When reporting numbers, round and summarize. Say "about 2,400 pounds" not "2,400.00 lbs".\n' +
      '- If listing multiple items, give the top 2-3 most important ones verbally, not all of them.\n' +
      '- Proactively flag problems: low stock, orders at risk, field issues.\n\n' +
      'CONTEXT:\n' +
      '- The user is typically a grower or production manager working in the field or packhouse.\n' +
      '- They\'re wearing Meta Ray-Ban smart glasses and talking to you hands-free.\n' +
      '- WorkSuite has four products: PRODUCE (growing/harvesting), FULFILL (orders/shipping), ' +
      'FORECAST (demand planning), and RESTOCK (purchasing/inventory).\n' +
      '- This operation grows fresh produce — tomatoes, corn, peppers, squash, greens, onions, herbs.\n\n' +
      'VOICE STYLE:\n' +
      '- Start responses with the key info, not filler. Say "You\'ve got 2 orders shipping today" ' +
      'not "Sure! Let me check on that for you. I found that...".\n' +
      '- For yes/no questions, lead with yes or no.\n' +
      '- When there\'s a problem, state it plainly and suggest next steps.\n' +
      '- Don\'t narrate your tool usage. Just use the tool and speak the result naturally.\n' +
      '- Never say "I don\'t have access to WorkSuite" — you ARE WorkSuite.\n\n' +
      'VISION (GLASSES CAMERA):\n' +
      '- You can see through the user\'s Meta Ray-Ban glasses via the camera feed.\n' +
      '- Image frames are sent periodically (~1 per second) so you have continuous visual context.\n' +
      '- When the user asks "what am I looking at?", "what\'s this?", "identify this plant", etc. — ' +
      'use the latest camera image to answer.\n' +
      '- You can also use the capture_photo tool to take a high-resolution snapshot.\n' +
      '- For field inspections, identify: crop type, growth stage, pest/disease signs, weed pressure, ' +
      'irrigation issues, equipment condition.\n' +
      '- For packhouse/warehouse, identify: product type, packaging, labels, equipment, safety issues.\n' +
      '- Be specific and actionable: "That looks like early blight on the lower tomato leaves — ' +
      'you might want to apply a copper fungicide" not "I see a plant with spots."';

    if (config.toolsEnabled === false || toolRegistry.size === 0) {
      return base;
    }

    return (
      base +
      '\n\n' +
      'TOOLS — USE THEM PROACTIVELY:\n' +
      '- check_production_schedule: What\'s being harvested, what\'s coming up\n' +
      '- check_inventory: Stock levels, low stock alerts, days of supply\n' +
      '- check_orders: Customer orders, what\'s shipping, fulfillment status\n' +
      '- lookup_customer: Contact info, terms, revenue for a customer\n' +
      '- log_harvest: Record what was picked (item, quantity, field, quality grade)\n' +
      '- harvest_summary: Show all harvests logged this session\n' +
      '- check_field_status: What\'s planted, growth stages, field issues\n' +
      '- get_current_datetime: Current date and time\n' +
      '- calculate: Math calculations\n' +
      '- set_reminder / list_reminders: Voice reminders\n' +
      '- get_device_info: Device details\n' +
      '- capture_photo: Take a high-res photo from glasses camera\n\n' +
      'Always use the appropriate tool rather than guessing data. ' +
      'After receiving the tool result, speak the answer naturally and concisely. ' +
      'If the user asks a general farming/growing question (not specific to their data), ' +
      'you can answer from your knowledge — you\'re a knowledgeable ag assistant too.'
    );
  }

  private cleanupConnection(): void {
    this.unsubscribeMessage?.();
    this.unsubscribeMessage = null;
    this.unsubscribeState?.();
    this.unsubscribeState = null;
  }

  private monitorConnection(): void {
    this.unsubscribeState?.();
    this.unsubscribeState = websocketService.onStateChange((state, detail) => {
      if (state === 'disconnected' || state === 'error') {
        this.cleanupConnection();
        this.disconnectCallback?.(detail);
      }
    });
  }

  private handleServerMessage(data: any): void {
    // Surface WebSocket parse errors
    if (data?._parseError) {
      return;
    }

    // Handle error messages from Gemini
    if (data.error) {
      const errMsg = data.error.message || JSON.stringify(data.error);
      this.transcriptCallback?.(`Error: ${errMsg}`, 'assistant');
      return;
    }

    // Handle GoAway — server is about to disconnect
    if (data.goAway) {
      this.cleanupConnection();
      websocketService.disconnect();
      this.disconnectCallback?.('GoAway: session expiring');
      return;
    }

    // Handle tool calls from Gemini
    if (data.toolCall?.functionCalls) {
      this.handleToolCalls(data.toolCall.functionCalls);
      return;
    }

    // Handle tool call cancellation (Gemini changed its mind) — no-op
    if (data.toolCallCancellation) {
      return;
    }

    // Ignore setupComplete, usageMetadata, sessionResumptionUpdate, etc.
    if (!data.serverContent) {
      return;
    }

    // Handle model responses
    if (data.serverContent.modelTurn?.parts) {
      for (const part of data.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.audioCallback?.(part.inlineData.data);
        }
        // In audio mode, part.text is internal planning/thinking — skip it.
        // Actual spoken response is in the audio data; we add a transcript
        // placeholder from the caller when audio playback finishes.
        if (part.text && !this.audioMode) {
          this.transcriptCallback?.(part.text, 'assistant');
        }
      }
    }

    // Handle turn completion
    if (data.serverContent.turnComplete) {
      this.turnCompleteCallback?.();
    }
  }

  private async handleToolCalls(functionCalls: GeminiFunctionCall[]): Promise<void> {
    // Show tool execution in transcript
    const toolNames = functionCalls.map((c) => c.name).join(', ');
    this.transcriptCallback?.(`Using ${toolNames}...`, 'system');

    // Execute all tools and send results back to Gemini
    const responsePayload = await toolRegistry.executeAll(functionCalls);
    websocketService.send(responsePayload);
  }
}

export const geminiService = new GeminiService();
