import React, { useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput, Pressable, Text } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { PushToTalkButton } from '../components/PushToTalkButton';
import { TranscriptView } from '../components/TranscriptView';
import { useConversationStore } from '../stores/conversationStore';
import { useSettingsStore } from '../stores/settingsStore';
import { geminiService } from '../services/gemini';
import { audioService } from '../services/audio';
import { websocketService } from '../services/websocket';
import { COLORS } from '../constants';

export function HomeScreen() {
  const addMessage = useConversationStore((s) => s.addMessage);
  const setWsState = useConversationStore((s) => s.setWsState);
  const setSessionActive = useConversationStore((s) => s.setSessionActive);
  const keepAwake = useSettingsStore((s) => s.keepAwake);
  const apiKey = useSettingsStore((s) => s.geminiApiKey);
  const [textInput, setTextInput] = React.useState('');

  useEffect(() => {
    if (keepAwake) {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
  }, [keepAwake]);

  useEffect(() => {
    // Initialize audio service
    audioService.initialize().catch((err) => {
      addMessage('system', `Audio init failed: ${err.message}`);
    });

    // Listen for Gemini responses
    geminiService.onTranscript((text, role) => {
      addMessage(role, text);
    });

    geminiService.onAudioResponse(async (base64Audio) => {
      try {
        await audioService.playAudioFromBase64(base64Audio);
      } catch (err) {
        // Silent fail on audio playback
      }
    });

    // Track WebSocket state
    const unsub = websocketService.onStateChange((state) => {
      setWsState(state as any);
      setSessionActive(state === 'connected');
    });

    return () => {
      unsub();
      audioService.cleanup();
    };
  }, []);

  const connectToGemini = async () => {
    if (!apiKey) {
      addMessage('system', 'Set your Gemini API key in Settings first');
      return;
    }

    try {
      addMessage('system', 'Connecting to Gemini...');
      geminiService.configure({ apiKey });
      await geminiService.connect();
      addMessage('system', 'Connected! Ready for voice input.');
    } catch (err: any) {
      addMessage('system', `Connection failed: ${err.message}`);
    }
  };

  const sendTextMessage = () => {
    if (!textInput.trim()) return;
    geminiService.sendText(textInput.trim());
    setTextInput('');
  };

  const wsState = useConversationStore((s) => s.wsState);

  return (
    <View style={styles.container}>
      <ConnectionStatus />

      {wsState !== 'connected' && (
        <Pressable style={styles.connectButton} onPress={connectToGemini}>
          <Text style={styles.connectText}>
            {wsState === 'connecting' ? 'Connecting...' : 'Connect to AI'}
          </Text>
        </Pressable>
      )}

      <TranscriptView />

      <View style={styles.inputArea}>
        <PushToTalkButton />

        <View style={styles.textInputRow}>
          <TextInput
            style={styles.textInput}
            value={textInput}
            onChangeText={setTextInput}
            placeholder="Or type a message..."
            placeholderTextColor={COLORS.textSecondary}
            onSubmitEditing={sendTextMessage}
            returnKeyType="send"
          />
          <Pressable
            style={styles.sendButton}
            onPress={sendTextMessage}
            disabled={!textInput.trim()}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  connectButton: {
    margin: 16,
    padding: 14,
    backgroundColor: COLORS.highlight,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  inputArea: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    gap: 16,
  },
  textInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    fontSize: 14,
  },
  sendButton: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 24,
  },
  sendText: {
    color: COLORS.text,
    fontWeight: '600',
  },
});
