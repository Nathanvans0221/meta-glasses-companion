import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings } from '../types';

interface SettingsStore extends AppSettings {
  updateSettings: (partial: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      geminiApiKey: '',
      geminiModel: 'gemini-2.0-flash-exp',
      autoReconnect: true,
      keepAwake: true,
      darkMode: true,
      updateSettings: (partial) => set(partial),
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
