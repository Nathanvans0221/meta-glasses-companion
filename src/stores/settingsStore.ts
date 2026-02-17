import { create } from 'zustand';
import type { AppSettings } from '../types';

interface SettingsStore extends AppSettings {
  updateSettings: (partial: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash-exp',
  autoReconnect: true,
  keepAwake: true,
  darkMode: true,

  updateSettings: (partial) => set(partial),
}));
