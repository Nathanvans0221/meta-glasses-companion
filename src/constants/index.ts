// Meta Ray-Ban glasses BLE service UUIDs
// These will need to be updated with actual Meta DAT SDK values
export const META_GLASSES_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
export const META_GLASSES_NAME_PREFIX = 'Ray-Ban';

// App version — lives in JS so OTA updates reflect it immediately
export const APP_VERSION = '1.1.0';

// Gemini Live API
export const GEMINI_WS_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
export const GEMINI_DEFAULT_MODEL = 'gemini-2.0-flash-exp';

// Audio settings
export const AUDIO_SAMPLE_RATE = 16000;
export const AUDIO_CHANNELS = 1;
export const AUDIO_BIT_DEPTH = 16;

// ─── Color Palettes ───────────────────────────────────────────────
// Apple HIG structure + WorkSuite/Silver Fern brand colors
// WorkSuite palette: sage green #69936C, teal #1A93AE, blue #2196F3
// Accent teal bridges WorkSuite identity with Apple polish

export const COLORS_DARK = {
  // Backgrounds
  background: '#000000',
  primary: '#1C1C1E',
  secondary: '#2C2C2E',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  surfaceLight: '#3A3A3C',

  // Brand — WorkSuite teal as primary accent
  accent: '#1A93AE',
  accentLight: 'rgba(26, 147, 174, 0.18)',
  tint: '#90C4D3',

  // Text
  text: '#DDDDDD',
  textSecondary: '#AAAAAA',
  textTertiary: '#777777',

  // Semantic — WorkSuite accent colors
  success: '#4CAF50',
  successLight: 'rgba(76, 175, 80, 0.18)',
  warning: '#FFD60A',
  warningLight: 'rgba(255, 214, 10, 0.15)',
  error: '#F44336',
  errorLight: 'rgba(244, 67, 54, 0.18)',

  // Utilities
  separator: '#38383A',
  fill: 'rgba(120, 120, 128, 0.36)',
  overlay: 'rgba(0, 0, 0, 0.4)',
} as const;

export const COLORS_LIGHT = {
  // Backgrounds
  background: '#F2F2F7',
  primary: '#FFFFFF',
  secondary: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceLight: '#E5E5EA',

  // Brand — WorkSuite teal as primary accent
  accent: '#1A93AE',
  accentLight: 'rgba(26, 147, 174, 0.10)',
  tint: '#90C4D3',

  // Text — WorkSuite text values
  text: '#333333',
  textSecondary: '#555555',
  textTertiary: '#888888',

  // Semantic — WorkSuite accent colors
  success: '#66BB6A',
  successLight: 'rgba(102, 187, 106, 0.12)',
  warning: '#FF9500',
  warningLight: 'rgba(255, 149, 0, 0.12)',
  error: '#EF5350',
  errorLight: 'rgba(239, 83, 80, 0.12)',

  // Utilities
  separator: '#C6C6C8',
  fill: 'rgba(120, 120, 128, 0.2)',
  overlay: 'rgba(0, 0, 0, 0.2)',
} as const;

// Default export for backward compat
export const COLORS = COLORS_DARK;

export type ThemeColors = {
  [K in keyof typeof COLORS_DARK]: string;
};
