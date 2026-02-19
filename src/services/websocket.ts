type MessageHandler = (data: any) => void;
type StateHandler = (state: 'connecting' | 'connected' | 'disconnected' | 'error', detail?: string) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private stateHandlers: StateHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string = '';
  private autoReconnect: boolean = true;
  public lastCloseCode: number = 0;
  public lastCloseReason: string = '';

  connect(url: string, autoReconnect = true): void {
    this.url = url;
    this.autoReconnect = autoReconnect;
    this.notifyState('connecting');

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.notifyState('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        let raw = event.data;

        // React Native WebSocket may deliver messages as ArrayBuffer
        if (raw instanceof ArrayBuffer) {
          const bytes = new Uint8Array(raw);
          raw = '';
          // Decode UTF-8 bytes to string in chunks to avoid stack overflow
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
            raw += String.fromCharCode.apply(null, Array.from(chunk));
          }
        } else if (typeof raw !== 'string') {
          raw = String(raw);
        }

        const data = JSON.parse(raw);
        this.messageHandlers.forEach((handler) => handler(data));
      } catch {
        // Surface parse failures as a special message
        this.messageHandlers.forEach((handler) => handler({
          _parseError: true,
          _rawType: typeof event.data,
          _rawPreview: String(event.data).substring(0, 200),
        }));
      }
    };

    this.ws.onerror = (err: any) => {
      const detail = err?.message || 'unknown error';
      this.notifyState('error', detail);
    };

    this.ws.onclose = (event: any) => {
      this.lastCloseCode = event?.code || 0;
      this.lastCloseReason = event?.reason || '';
      const detail = `code=${this.lastCloseCode} reason=${this.lastCloseReason}`;
      this.notifyState('disconnected', detail);
      if (this.autoReconnect) {
        this.scheduleReconnect();
      }
    };
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(payload);
    }
  }

  sendAudioChunk(base64Audio: string): void {
    this.send({
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Audio,
          },
        ],
      },
    });
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.push(handler);
    return () => {
      this.stateHandlers = this.stateHandlers.filter((h) => h !== handler);
    };
  }

  disconnect(): void {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private notifyState(state: 'connecting' | 'connected' | 'disconnected' | 'error', detail?: string): void {
    this.stateHandlers.forEach((handler) => handler(state, detail));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.url) {
        this.connect(this.url, this.autoReconnect);
      }
    }, 3000);
  }
}

export const websocketService = new WebSocketService();
