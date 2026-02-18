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

// ─── Color Palettes ───────────────────────────────────────────────
// Inspired by Apple HIG + Silver Fern brand (teal/green)

export const COLORS_DARK = {
  // Backgrounds
  background: '#000000',
  primary: '#1C1C1E',
  secondary: '#2C2C2E',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  surfaceLight: '#3A3A3C',

  // Brand
  accent: '#0A84FF',
  accentLight: 'rgba(10, 132, 255, 0.15)',
  tint: '#64D2FF',

  // Text
  text: '#FFFFFF',
  textSecondary: '#98989D',
  textTertiary: '#636366',

  // Semantic
  success: '#30D158',
  successLight: 'rgba(48, 209, 88, 0.15)',
  warning: '#FFD60A',
  warningLight: 'rgba(255, 214, 10, 0.15)',
  error: '#FF453A',
  errorLight: 'rgba(255, 69, 58, 0.15)',

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

  // Brand
  accent: '#007AFF',
  accentLight: 'rgba(0, 122, 255, 0.12)',
  tint: '#5AC8FA',

  // Text
  text: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#AEAEB2',

  // Semantic
  success: '#34C759',
  successLight: 'rgba(52, 199, 89, 0.12)',
  warning: '#FF9500',
  warningLight: 'rgba(255, 149, 0, 0.12)',
  error: '#FF3B30',
  errorLight: 'rgba(255, 59, 48, 0.12)',

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
