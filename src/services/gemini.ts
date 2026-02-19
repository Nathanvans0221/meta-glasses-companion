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
  private messageCount = 0;

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

    // Bare minimum setup — no sessionResumption, no contextWindowCompression
    // Testing if those features cause instability with this preview model
    const setupMsg = {
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

  getMessageCount(): number {
    return this.messageCount;
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
    websocketService.disconnect();
  }

  isConnected(): boolean {
    return websocketService.isConnected();
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
      this.transcriptCallback?.(`[WS parse error] type=${data._rawType} preview=${data._rawPreview}`, 'assistant');
      return;
    }

    // Log every message type we receive (for debugging)
    const msgKeys = Object.keys(data || {}).join(',');
    this.transcriptCallback?.(`[msg #${this.messageCount}: ${msgKeys}]`, 'assistant');

    // Handle error messages from Gemini
    if (data.error) {
      const errMsg = data.error.message || JSON.stringify(data.error);
      this.transcriptCallback?.(`Error: ${errMsg}`, 'assistant');
      return;
    }

    // Handle GoAway — server is about to disconnect
    if (data.goAway) {
      this.transcriptCallback?.(`[GoAway] timeLeft=${data.goAway.timeLeft}`, 'assistant');
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
