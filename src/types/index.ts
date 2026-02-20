export interface BleDevice {
  id: string;
  name: string | null;
  rssi: number | null;
  isConnectable: boolean | null;
}

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
}

export type ConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'error';

export type AudioState = 'idle' | 'recording' | 'processing' | 'playing';

export type WebSocketState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface AppSettings {
  geminiApiKey: string;
  geminiModel: string;
  autoReconnect: boolean;
  keepAwake: boolean;
  darkMode: boolean;
  toolsEnabled: boolean;
}
