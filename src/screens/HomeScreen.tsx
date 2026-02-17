import React, { useEffect } from 'react';
import { View, StyleSheet, TextInput, Pressable, Text } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { PushToTalkButton } from '../components/PushToTalkButton';
import { TranscriptView } from '../components/TranscriptView';
import { useConversationStore } from '../stores/conversationStore';
import { useSettingsStore } from '../stores/settingsStore';
import { geminiService } from '../services/gemini';
import { audioService } from '../services/audio';
import { websocketService } from '../services/websocket';
import { useTheme } from '../hooks/useTheme';

export function HomeScreen() {
  const colors = useTheme();
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
    audioService.initialize().catch((err) => {
      addMessage('system', `Audio init failed: ${err.message}`);
    });

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ConnectionStatus />

      {wsState !== 'connected' && (
        <Pressable style={[styles.connectButton, { backgroundColor: colors.highlight }]} onPress={connectToGemini}>
          <Text style={styles.connectText}>
            {wsState === 'connecting' ? 'Connecting...' : 'Connect to AI'}
          </Text>
        </Pressable>
      )}

      <TranscriptView />

      <View style={[styles.inputArea, { backgroundColor: colors.surface, borderTopColor: colors.surfaceLight }]}>
        <PushToTalkButton />

        <View style={styles.textInputRow}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surfaceLight, color: colors.text }]}
            value={textInput}
            onChangeText={setTextInput}
            placeholder="Or type a message..."
            placeholderTextColor={colors.textSecondary}
            onSubmitEditing={sendTextMessage}
            returnKeyType="send"
          />
          <Pressable
            style={[styles.sendButton, { backgroundColor: colors.accent }]}
            onPress={sendTextMessage}
            disabled={!textInput.trim()}
          >
            <Text style={[styles.sendText, { color: '#ffffff' }]}>Send</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  connectButton: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  inputArea: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    gap: 16,
  },
  textInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    fontSize: 14,
  },
  sendButton: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 24,
  },
  sendText: {
    fontWeight: '600',
  },
});
