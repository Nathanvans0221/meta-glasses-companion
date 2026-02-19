import { websocketService } from './websocket';
import { audioService } from './audio';
import { GEMINI_WS_BASE, GEMINI_DEFAULT_MODEL } from '../constants';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
}

class GeminiService {
  private config: GeminiConfig | null = null;
  private transcriptCallback: ((text: string, role: 'user' | 'assistant') => void) | null = null;
  private audioCallback: ((base64Audio: string) => void) | null = null;
  private turnCompleteCallback: (() => void) | null = null;
  private disconnectCallback: ((detail?: string) => void) | null = null;
  private unsubscribeMessage: (() => void) | null = null;
  private unsubscribeState: (() => void) | null = null;

  // Session resumption — Gemini sends us tokens to resume after disconnect
  private resumptionHandle: string | null = null;

  configure(config: GeminiConfig): void {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Clean up any existing connection before reconnecting
    this.cleanupConnection();

    const config = this.config;
    const model = config.model || GEMINI_DEFAULT_MODEL;

    const url = `${GEMINI_WS_BASE}?key=${config.apiKey}`;

    // Listen for incoming messages
    this.unsubscribeMessage = websocketService.onMessage((data) => {
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

    // Build setup message
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
              text: config.systemInstruction ||
                'You are a helpful voice assistant for field workers using Meta Ray-Ban smart glasses. ' +
                'Keep responses concise and actionable. You help with inventory, task management, ' +
                'and work order operations through the WorkSuite system.',
            },
          ],
        },
        // Enable session resumption — server sends tokens we can use to
        // seamlessly reconnect without losing conversation context
        sessionResumption: this.resumptionHandle
          ? { handle: this.resumptionHandle }
          : {},
        // Enable context window compression so sessions can exceed 10 min
        contextWindowCompression: {
          slidingWindow: {
            targetTokens: 10000,
          },
          triggerTokens: 16000,
        },
      },
    };

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

  sendAudio(base64Audio: string): void {
    websocketService.sendAudioChunk(base64Audio);
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
    this.transcriptCallback?.(text, 'user');
  }

  onTranscript(callback: (text: string, role: 'user' | 'assistant') => void): void {
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
    this.resumptionHandle = null;
    websocketService.disconnect();
  }

  isConnected(): boolean {
    return websocketService.isConnected();
  }

  /**
   * Clean up handlers without closing the WebSocket.
   * Preserves resumptionHandle so we can resume the session on reconnect.
   */
  private cleanupConnection(): void {
    this.unsubscribeMessage?.();
    this.unsubscribeMessage = null;
    this.unsubscribeState?.();
    this.unsubscribeState = null;
  }

  /**
   * Monitor the WebSocket for unexpected disconnects after setup.
   * Fires the onDisconnect callback so the UI can auto-reconnect.
   */
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
      this.transcriptCallback?.(`[WS parse error] type=${data._rawType} preview=${data._rawPreview}`, 'assistant');
      return;
    }

    // Handle error messages from Gemini
    if (data.error) {
      const errMsg = data.error.message || JSON.stringify(data.error);
      this.transcriptCallback?.(`Error: ${errMsg}`, 'assistant');
      return;
    }

    // Save session resumption tokens — used to seamlessly reconnect
    if (data.sessionResumptionUpdate) {
      if (data.sessionResumptionUpdate.newHandle) {
        this.resumptionHandle = data.sessionResumptionUpdate.newHandle;
      }
    }

    // Handle GoAway — server is about to disconnect, reconnect proactively
    if (data.goAway) {
      this.transcriptCallback?.('Session expiring, reconnecting...', 'assistant');
      // Don't wait — trigger disconnect callback so UI auto-reconnects
      // The resumptionHandle is already saved, so reconnect will resume seamlessly
      this.cleanupConnection();
      websocketService.disconnect();
      this.disconnectCallback?.('GoAway: session expiring');
      return;
    }

    // Handle text responses
    if (data.serverContent?.modelTurn?.parts) {
      for (const part of data.serverContent.modelTurn.parts) {
        if (part.text) {
          this.transcriptCallback?.(part.text, 'assistant');
        }
        if (part.inlineData?.data) {
          this.audioCallback?.(part.inlineData.data);
        }
      }
    }

    // Handle turn completion
    if (data.serverContent?.turnComplete) {
      this.turnCompleteCallback?.();
    }
  }
}

export const geminiService = new GeminiService();
