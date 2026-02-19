import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TextInput, Pressable, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { PushToTalkButton } from '../components/PushToTalkButton';
import { TranscriptView } from '../components/TranscriptView';
import { useConversationStore } from '../stores/conversationStore';
import { useSettingsStore } from '../stores/settingsStore';
import { geminiService } from '../services/gemini';
import { audioService } from '../services/audio';
import { websocketService } from '../services/websocket';
import { useTheme } from '../hooks/useTheme';
import { SPACING, TYPOGRAPHY, RADIUS, SIZES } from '../design/tokens';

const MAX_AUTO_RECONNECT_ATTEMPTS = 3;
const AUTO_RECONNECT_DELAY_MS = 2000;

export function HomeScreen() {
  const colors = useTheme();
  const addMessage = useConversationStore((s) => s.addMessage);
  const setWsState = useConversationStore((s) => s.setWsState);
  const setSessionActive = useConversationStore((s) => s.setSessionActive);
  const keepAwake = useSettingsStore((s) => s.keepAwake);
  const apiKey = useSettingsStore((s) => s.geminiApiKey);
  const geminiModel = useSettingsStore((s) => s.geminiModel);
  const [textInput, setTextInput] = React.useState('');
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (keepAwake) {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
  }, [keepAwake]);

  const setAudioState = useConversationStore((s) => s.setAudioState);

  const connectToGemini = useCallback(async (isAutoReconnect = false) => {
    if (!apiKey) {
      if (!isAutoReconnect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        addMessage('system', 'Add your Gemini API key in Settings first.');
      }
      return;
    }

    try {
      if (!isAutoReconnect) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      addMessage('system', isAutoReconnect
        ? `Reconnecting to Gemini (attempt ${reconnectAttempts.current})...`
        : `Connecting to Gemini (${geminiModel})...`);
      geminiService.configure({ apiKey, model: geminiModel });
      await geminiService.connect();
      reconnectAttempts.current = 0;
      if (!isAutoReconnect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      addMessage('system', 'Connected. Ready for voice input.');
    } catch (err: any) {
      if (!isAutoReconnect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      addMessage('system', `Connection failed: ${err.message}`);
    }
  }, [apiKey, geminiModel, addMessage]);

  useEffect(() => {
    audioService.initialize().catch((err) => {
      addMessage('system', `Audio init failed: ${err.message}`);
    });

    audioService.onPlaybackFinished(() => {
      setAudioState('idle');
    });

    geminiService.onTranscript((text, role) => {
      addMessage(role, text);
    });

    geminiService.onAudioResponse((base64Audio) => {
      audioService.addAudioChunk(base64Audio);
    });

    geminiService.onTurnComplete(async () => {
      try {
        setAudioState('playing');
        await audioService.playAccumulatedAudio();
      } catch (err) {
        addMessage('system', `Audio playback error: ${err}`);
        setAudioState('idle');
      }
    });

    // Handle unexpected disconnects — auto-reconnect up to MAX attempts
    geminiService.onDisconnect((detail) => {
      addMessage('system', `Disconnected from Gemini${detail ? ` (${detail})` : ''}`);
      setWsState('disconnected');
      setSessionActive(false);

      if (reconnectAttempts.current < MAX_AUTO_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(() => {
          connectToGemini(true);
        }, AUTO_RECONNECT_DELAY_MS);
      } else {
        addMessage('system', 'Auto-reconnect failed. Tap "Connect to AI" to try again.');
        reconnectAttempts.current = 0;
      }
    });

    const unsub = websocketService.onStateChange((state) => {
      setWsState(state as any);
      setSessionActive(state === 'connected');
    });

    return () => {
      unsub();
      audioService.cleanup();
      geminiService.disconnect();
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, []);

  const handleConnect = () => {
    reconnectAttempts.current = 0;
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    connectToGemini(false);
  };

  const sendTextMessage = () => {
    if (!textInput.trim()) return;
    Haptics.selectionAsync();
    geminiService.sendText(textInput.trim());
    addMessage('user', textInput.trim());
    setTextInput('');
  };

  const wsState = useConversationStore((s) => s.wsState);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ConnectionStatus />

      {wsState !== 'connected' && (
        <View style={styles.connectContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.connectButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleConnect}
          >
            <Ionicons
              name={wsState === 'connecting' ? 'sync' : 'flash'}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.connectText}>
              {wsState === 'connecting' ? 'Connecting...' : 'Connect to AI'}
            </Text>
          </Pressable>
        </View>
      )}

      <TranscriptView />

      <View style={[styles.inputArea, { backgroundColor: colors.primary, borderTopColor: colors.separator }]}>
        <PushToTalkButton />

        <View style={styles.textInputRow}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.fill, color: colors.text }]}
            value={textInput}
            onChangeText={setTextInput}
            placeholder="Or type a message..."
            placeholderTextColor={colors.textTertiary}
            onSubmitEditing={sendTextMessage}
            returnKeyType="send"
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: textInput.trim() ? colors.accent : colors.fill,
                opacity: pressed && textInput.trim() ? 0.7 : 1,
              },
            ]}
            onPress={sendTextMessage}
            disabled={!textInput.trim()}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={textInput.trim() ? '#FFFFFF' : colors.textTertiary}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  connectContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: SIZES.buttonHeight,
    borderRadius: RADIUS.md,
  },
  connectText: {
    ...TYPOGRAPHY.headline,
    color: '#FFFFFF',
  },
  inputArea: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING['3xl'],
    paddingHorizontal: SPACING.lg,
    borderTopWidth: 0.5,
    gap: SPACING.md,
  },
  textInputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: SIZES.inputHeight,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS['2xl'],
    ...TYPOGRAPHY.body,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
