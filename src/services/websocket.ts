type MessageHandler = (data: any) => void;
type StateHandler = (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private stateHandlers: StateHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string = '';
  private autoReconnect: boolean = true;

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
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach((handler) => handler(data));
      } catch {
        // Handle non-JSON messages
        this.messageHandlers.forEach((handler) => handler(event.data));
      }
    };

    this.ws.onerror = () => {
      this.notifyState('error');
    };

    this.ws.onclose = () => {
      this.notifyState('disconnected');
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

  private notifyState(state: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    this.stateHandlers.forEach((handler) => handler(state));
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
