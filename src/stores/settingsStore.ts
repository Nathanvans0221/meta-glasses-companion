import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GEMINI_DEFAULT_MODEL } from '../constants';
import type { AppSettings } from '../types';

interface SettingsStore extends AppSettings {
  updateSettings: (partial: Partial<AppSettings>) => void;
}

// Models that are NOT valid or are deprecated for the Live API — auto-correct on hydration
const INVALID_LIVE_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash',
  'gemini-2.5-flash-native-audio-preview-12-2025',  // audio-only, no text support
];

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      geminiApiKey: '',
      geminiModel: GEMINI_DEFAULT_MODEL,
      autoReconnect: true,
      keepAwake: true,
      darkMode: true,
      updateSettings: (partial) => set(partial),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState: any, currentState) => {
        const merged = { ...currentState, ...persistedState };
        // Fix persisted model if it's a non-Live API model
        if (INVALID_LIVE_MODELS.includes(merged.geminiModel)) {
          merged.geminiModel = GEMINI_DEFAULT_MODEL;
        }
        return merged;
      },
    },
  ),
);
