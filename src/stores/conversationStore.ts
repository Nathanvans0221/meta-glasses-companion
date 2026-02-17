import { create } from 'zustand';
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

export const useConversationStore = create<ConversationStore>((set) => ({
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
  clearMessages: () => set({ messages: [] }),
  setAudioState: (audioState) => set({ audioState }),
  setWsState: (wsState) => set({ wsState }),
  setSessionActive: (isSessionActive) => set({ isSessionActive }),
}));
