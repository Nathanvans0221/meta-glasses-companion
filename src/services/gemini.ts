import { websocketService } from './websocket';
import { audioService } from './audio';
import { GEMINI_WS_BASE, GEMINI_DEFAULT_MODEL } from '../constants';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
}

// Send a lightweight message every 15s to prevent Gemini idle timeout
const KEEPALIVE_INTERVAL_MS = 15_000;

// 10ms of silence at 16kHz, 16-bit mono PCM = 320 bytes of zeros, base64-encoded
// This is the smallest meaningful audio chunk we can send as a keepalive
const SILENT_AUDIO_CHUNK = 'A'.repeat(427) + '=';

class GeminiService {
  private config: GeminiConfig | null = null;
  private transcriptCallback: ((text: string, role: 'user' | 'assistant') => void) | null = null;
  private audioCallback: ((base64Audio: string) => void) | null = null;
  private turnCompleteCallback: (() => void) | null = null;
  private disconnectCallback: ((detail?: string) => void) | null = null;
  private unsubscribeMessage: (() => void) | null = null;
  private unsubscribeState: (() => void) | null = null;
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;

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

    // Disable auto-reconnect — we handle reconnection at the UI level
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

    // Send setup message and wait for setupComplete before resolving
    await new Promise<void>((resolve, reject) => {
      const setupTimeout = setTimeout(() => {
        unsubMsg();
        unsubState();
        reject(new Error('Setup timeout — Gemini did not acknowledge config'));
      }, 10000);

      // Listen for setupComplete from Gemini
      const unsubMsg = websocketService.onMessage((data) => {
        if (data.setupComplete) {
          clearTimeout(setupTimeout);
          unsubMsg();
          unsubState();
          resolve();
        }
      });

      // If the connection drops during setup, reject with details
      const unsubState = websocketService.onStateChange((state, detail) => {
        if (state === 'disconnected' || state === 'error') {
          clearTimeout(setupTimeout);
          unsubMsg();
          unsubState();
          const closeInfo = `close=${websocketService.lastCloseCode} ${websocketService.lastCloseReason}`;
          reject(new Error(`Setup failed [${closeInfo}] ${detail || ''}`));
        }
      });

      websocketService.send({
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
      });
    });

    // Connection established — start keepalive pings and monitor for disconnects
    this.startKeepalive();
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
    websocketService.disconnect();
  }

  isConnected(): boolean {
    return websocketService.isConnected();
  }

  /**
   * Clean up all handlers and timers without closing the WebSocket.
   * Called before reconnect and on full disconnect.
   */
  private cleanupConnection(): void {
    this.stopKeepalive();
    this.unsubscribeMessage?.();
    this.unsubscribeMessage = null;
    this.unsubscribeState?.();
    this.unsubscribeState = null;
  }

  /**
   * Send periodic keepalive pings to prevent Gemini's idle timeout.
   * Sends a tiny silent audio chunk via realtimeInput — the natural
   * "I'm still here" signal for a bidirectional audio stream.
   * (Empty clientContent causes "Stream end encountered" — don't use that.)
   */
  private startKeepalive(): void {
    this.stopKeepalive();
    this.keepaliveTimer = setInterval(() => {
      if (websocketService.isConnected()) {
        // 10ms of silence at 16kHz 16-bit mono = 320 bytes of zeros
        // Base64-encoded: 320 zero bytes → ~428 chars of 'A's
        websocketService.send({
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: 'audio/pcm;rate=16000',
                data: SILENT_AUDIO_CHUNK,
              },
            ],
          },
        });
      }
    }, KEEPALIVE_INTERVAL_MS);
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  /**
   * Monitor the WebSocket for unexpected disconnects after setup is complete.
   * Fires the onDisconnect callback so the UI can show a message / offer reconnect.
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
