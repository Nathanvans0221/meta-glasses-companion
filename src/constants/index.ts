// Meta Ray-Ban glasses BLE service UUIDs
// These will need to be updated with actual Meta DAT SDK values
export const META_GLASSES_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
export const META_GLASSES_NAME_PREFIX = 'Ray-Ban';

// Gemini Live API
export const GEMINI_WS_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
export const GEMINI_DEFAULT_MODEL = 'gemini-2.0-flash-live-001';

// Audio settings
export const AUDIO_SAMPLE_RATE = 16000;
export const AUDIO_CHANNELS = 1;
export const AUDIO_BIT_DEPTH = 16;

// UI Colors
export const COLORS = {
  primary: '#1a1a2e',
  secondary: '#16213e',
  accent: '#0f3460',
  highlight: '#e94560',
  success: '#00c853',
  warning: '#ff9800',
  error: '#f44336',
  text: '#ffffff',
  textSecondary: '#a0a0b0',
  background: '#0a0a1a',
  surface: '#1a1a2e',
  surfaceLight: '#252540',
} as const;
