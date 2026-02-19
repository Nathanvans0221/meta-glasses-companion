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
  private unsubscribeMessage: (() => void) | null = null;

  configure(config: GeminiConfig): void {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new Error('Gemini API key not configured');
    }

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

      // If the connection drops during setup, reject
      const unsubState = websocketService.onStateChange((state) => {
        if (state === 'disconnected' || state === 'error') {
          clearTimeout(setupTimeout);
          unsubMsg();
          unsubState();
          reject(new Error('Connection lost during setup — check API key and model'));
        }
      });

      websocketService.send({
        setup: {
          model: `models/${model}`,
          generation_config: {
            response_modalities: ['AUDIO', 'TEXT'],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: {
                  voice_name: 'Aoede',
                },
              },
            },
          },
          system_instruction: {
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
  }

  sendAudio(base64Audio: string): void {
    websocketService.sendAudioChunk(base64Audio);
  }

  sendText(text: string): void {
    websocketService.send({
      client_content: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turn_complete: true,
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

  disconnect(): void {
    this.unsubscribeMessage?.();
    this.unsubscribeMessage = null;
    websocketService.disconnect();
  }

  private handleServerMessage(data: any): void {
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
