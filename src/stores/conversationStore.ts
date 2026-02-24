import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TranscriptMessage, AudioState, WebSocketState } from '../types';

interface ConversationStore {
  messages: TranscriptMessage[];
  audioState: AudioState;
  wsState: WebSocketState;
  isSessionActive: boolean;

  addMessage: (role: TranscriptMessage['role'], text: string) => void;
  clearMessages: () => void;
  setAudioState: (state: AudioState) => void;
  setWsState: (state: WebSocketState) => void;
  setSessionActive: (active: boolean) => void;
}

let messageCounter = 0;

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set) => ({
      messages: [],
      audioState: 'idle',
      wsState: 'disconnected',
      isSessionActive: false,

      addMessage: (role, text) =>
        set((prev) => ({
          messages: [
            ...prev.messages,
            {
              id: `msg_${++messageCounter}`,
              role,
              text,
              timestamp: Date.now(),
            },
          ],
        })),
      clearMessages: () => {
        messageCounter = 0;
        return set({ messages: [] });
      },
      setAudioState: (audioState) => set({ audioState }),
      setWsState: (wsState) => set({ wsState }),
      setSessionActive: (isSessionActive) => set({ isSessionActive }),
    }),
    {
      name: 'conversation-history',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist messages — audioState/wsState/isSessionActive are transient
      partialize: (state) => ({ messages: state.messages }),
      merge: (persistedState: any, currentState) => {
        const merged = { ...currentState, ...persistedState };
        // Restore messageCounter from persisted messages so IDs stay unique
        if (merged.messages?.length > 0) {
          const maxId = merged.messages.reduce((max: number, msg: TranscriptMessage) => {
            const num = parseInt(msg.id.replace('msg_', ''), 10);
            return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          messageCounter = maxId;
        }
        return merged;
      },
    },
  ),
);
