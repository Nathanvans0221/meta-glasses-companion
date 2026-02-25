import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TextInput, Pressable, Text, KeyboardAvoidingView, Platform, AppState } from 'react-native';
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
import { glassesService } from '../services/glasses';
import { useTheme } from '../hooks/useTheme';
import { SPACING, TYPOGRAPHY, RADIUS, SIZES } from '../design/tokens';

const MAX_AUTO_RECONNECT_ATTEMPTS = 5;
const AUTO_RECONNECT_DELAY_MS = 1500;

export function HomeScreen() {
  const colors = useTheme();
  const addMessage = useConversationStore((s) => s.addMessage);
  const setWsState = useConversationStore((s) => s.setWsState);
  const setSessionActive = useConversationStore((s) => s.setSessionActive);
  const keepAwake = useSettingsStore((s) => s.keepAwake);
  const apiKey = useSettingsStore((s) => s.geminiApiKey);
  const geminiModel = useSettingsStore((s) => s.geminiModel);
  const toolsEnabled = useSettingsStore((s) => s.toolsEnabled);
  const handsFreeMode = useSettingsStore((s) => s.handsFreeMode);
  const [textInput, setTextInput] = React.useState('');
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedAt = useRef<number>(0);
  const handsFreeActive = useRef(false);
  const cameraStreamActive = useRef(false);
  // Controls whether audio chunks are forwarded to Gemini.
  // When false, recording stays alive (keeps iOS background audio session)
  // but chunks are discarded to prevent echo during playback.
  const forwardingAudio = useRef(true);

  useEffect(() => {
    if (keepAwake) {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
  }, [keepAwake]);

  const setAudioState = useConversationStore((s) => s.setAudioState);

  // ─── Hands-free: start continuous recording ───────────────────────

  const startHandsFreeListening = useCallback(async () => {
    if (handsFreeActive.current) return;
    if (!geminiService.isConnected()) return;

    handsFreeActive.current = true;
    forwardingAudio.current = true;
    setAudioState('recording');

    // Only start a new recording session if one isn't already running
    if (!audioService.getIsStreaming()) {
      try {
        await audioService.startStreamingRecording((base64Pcm) => {
          // Only forward to Gemini when flag is set — prevents echo during playback
          if (forwardingAudio.current) {
            geminiService.sendAudio(base64Pcm);
          }
        });
      } catch (err) {
        handsFreeActive.current = false;
        forwardingAudio.current = false;
        addMessage('system', `Hands-free mic error: ${err}`);
        setAudioState('idle');
      }
    }
  }, [setAudioState, addMessage]);

  /**
   * Resume forwarding audio chunks to Gemini after playback finishes.
   * Recording was never stopped, so we just flip the flag.
   */
  const resumeHandsFreeForwarding = useCallback(() => {
    const handsFree = useSettingsStore.getState().handsFreeMode;
    if (!handsFree || !geminiService.isConnected()) return;

    if (audioService.getIsStreaming()) {
      // Recording still alive — just resume forwarding
      handsFreeActive.current = true;
      forwardingAudio.current = true;
      setAudioState('recording');
    } else {
      // Recording died (shouldn't happen) — restart fully
      setTimeout(() => startHandsFreeListening(), 300);
    }
  }, [setAudioState, startHandsFreeListening]);

  /**
   * Fully stop hands-free recording. Only used on disconnect/cleanup.
   */
  const stopHandsFreeListening = useCallback(async () => {
    handsFreeActive.current = false;
    forwardingAudio.current = false;

    if (audioService.getIsStreaming()) {
      try {
        await audioService.stopStreamingRecording();
      } catch {
        // Ignore
      }
    }
    setAudioState('idle');
  }, [setAudioState]);

  // ─── AppState: resume hands-free recording when returning from background ──

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const handsFree = useSettingsStore.getState().handsFreeMode;
        if (handsFree && geminiService.isConnected()) {
          if (audioService.getIsStreaming() && !handsFreeActive.current) {
            // Recording survived background — just resume forwarding
            handsFreeActive.current = true;
            forwardingAudio.current = true;
            setAudioState('recording');
          } else if (!audioService.getIsStreaming()) {
            // Recording died in background — restart
            setTimeout(() => startHandsFreeListening(), 500);
          }
        }
      }
    });
    return () => subscription.remove();
  }, [startHandsFreeListening, setAudioState]);

  // ─── Glasses camera: stream frames to Gemini ─────────────────────

  const startCameraStream = useCallback(async () => {
    if (cameraStreamActive.current) return;
    if (!glassesService.isConfigured()) return;

    const regState = glassesService.getRegistrationState();
    if (regState !== 'registered') return;

    try {
      const perm = await glassesService.checkCameraPermission();
      if (perm !== 'granted') {
        const requested = await glassesService.requestCameraPermission();
        if (requested !== 'granted') {
          addMessage('system', 'Camera permission denied on glasses.');
          return;
        }
      }

      cameraStreamActive.current = true;
      await glassesService.startCameraStream({
        resolution: 'low',
        frameRate: 24,
        throttleSeconds: 1.0,
      });
      addMessage('system', 'Glasses camera active — Ferny can see what you see.');
    } catch (err) {
      cameraStreamActive.current = false;
      addMessage('system', `Camera stream error: ${err}`);
    }
  }, [addMessage]);

  const stopCameraStream = useCallback(async () => {
    if (!cameraStreamActive.current) return;
    cameraStreamActive.current = false;
    try {
      await glassesService.stopCameraStream();
    } catch {
      // Ignore
    }
  }, []);

  // Forward glasses camera frames + photos to Gemini
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    // Video frames → Gemini multimodal input
    unsubs.push(
      glassesService.onVideoFrame((frame) => {
        if (geminiService.isConnected()) {
          geminiService.sendImage(frame.base64);
        }
      }),
    );

    // High-res photo captures → Gemini multimodal input
    unsubs.push(
      glassesService.onPhotoCapture((photo) => {
        if (geminiService.isConnected()) {
          geminiService.sendImage(photo.base64);
        }
      }),
    );

    // Auto-start camera when glasses connect (if Gemini is also connected)
    unsubs.push(
      glassesService.onRegistrationStateChange((state) => {
        if (state === 'registered' && geminiService.isConnected()) {
          startCameraStream();
        }
      }),
    );

    return () => unsubs.forEach((fn) => fn());
  }, [startCameraStream]);

  // ─── Reconnection logic ───────────────────────────────────────────

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= MAX_AUTO_RECONNECT_ATTEMPTS) {
      addMessage('system', 'Connection lost. Tap "Connect to AI" to reconnect.');
      reconnectAttempts.current = 0;
      return;
    }

    if (reconnectAttempts.current === 0) {
      addMessage('system', 'Connection lost, reconnecting...');
    }
    reconnectAttempts.current += 1;
    reconnectTimer.current = setTimeout(() => {
      connectToGemini(true);
    }, AUTO_RECONNECT_DELAY_MS);
  }, []);

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
        addMessage('system', `Connecting to Gemini (${geminiModel})...`);
      }
      geminiService.configure({ apiKey, model: geminiModel, toolsEnabled });
      await geminiService.connect();
      const wasReconnect = reconnectAttempts.current > 0;
      reconnectAttempts.current = 0;
      connectedAt.current = Date.now();
      if (!isAutoReconnect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const handsFree = useSettingsStore.getState().handsFreeMode;
      if (handsFree) {
        addMessage('system', wasReconnect ? 'Reconnected. Listening...' : 'Connected. Hands-free listening active.');
        // Small delay to let audio session settle
        setTimeout(() => startHandsFreeListening(), 500);
      } else {
        addMessage('system', wasReconnect ? 'Reconnected.' : 'Connected. Ready for voice input.');
      }

      // Start glasses camera stream if DAT SDK is registered
      if (glassesService.getRegistrationState() === 'registered') {
        startCameraStream();
      }
    } catch (err: any) {
      if (!isAutoReconnect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        addMessage('system', `Connection failed: ${err.message}`);
      } else {
        scheduleReconnect();
      }
    }
  }, [apiKey, geminiModel, addMessage, scheduleReconnect, startHandsFreeListening, startCameraStream]);

  // ─── Wire up Gemini callbacks ─────────────────────────────────────

  useEffect(() => {
    audioService.initialize().catch((err) => {
      addMessage('system', `Audio init failed: ${err.message}`);
    });

    audioService.onPlaybackFinished(() => {
      setAudioState('idle');
      // Resume hands-free forwarding (recording was never stopped)
      resumeHandsFreeForwarding();
    });

    geminiService.onTranscript((text, role) => {
      addMessage(role, text);
    });

    geminiService.onAudioResponse((base64Audio) => {
      // In hands-free mode: stop forwarding (not recording!) when Gemini responds
      // to prevent echo. Recording stays alive to keep iOS background audio session.
      // This block runs once per turn (handsFreeActive is set false on first chunk).
      if (handsFreeActive.current) {
        handsFreeActive.current = false;
        forwardingAudio.current = false;
        // DON'T call audioService.stopStreamingRecording() — keep recording alive
        setAudioState('processing');
        addMessage('user', '[Voice message]');
        addMessage('assistant', 'On it...');
        audioService.playAcknowledgmentTone();
      }

      audioService.addAudioChunk(base64Audio);
    });

    geminiService.onTurnComplete(async () => {
      if (audioService.hasAudioChunks()) {
        try {
          setAudioState('playing');
          addMessage('assistant', '🔊 [Audio response]');
          await audioService.playAccumulatedAudio();
        } catch (err) {
          addMessage('system', `Audio playback error: ${err}`);
          setAudioState('idle');
          resumeHandsFreeForwarding();
        }
      } else {
        setAudioState('idle');
        resumeHandsFreeForwarding();
      }
    });

    // Handle unexpected disconnects
    geminiService.onDisconnect((detail) => {
      const duration = connectedAt.current
        ? Math.round((Date.now() - connectedAt.current) / 1000)
        : 0;
      connectedAt.current = 0;

      // Fully stop hands-free recording on disconnect
      forwardingAudio.current = false;
      if (handsFreeActive.current || audioService.getIsStreaming()) {
        handsFreeActive.current = false;
        audioService.stopStreamingRecording().catch(() => {});
      }

      // Stop glasses camera stream on disconnect
      stopCameraStream();

      setWsState('disconnected');
      setSessionActive(false);
      setAudioState('idle');

      if (reconnectAttempts.current === 0 && duration > 0) {
        const closeCode = websocketService.lastCloseCode;
        const closeReason = websocketService.lastCloseReason;
        addMessage('system',
          `Disconnected after ${duration}s (code=${closeCode} ${closeReason || 'no reason'}). Reconnecting...`
        );
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(() => {
          connectToGemini(true);
        }, AUTO_RECONNECT_DELAY_MS);
      } else {
        scheduleReconnect();
      }
    });

    const unsub = websocketService.onStateChange((state) => {
      setWsState(state as any);
      setSessionActive(state === 'connected');
    });

    return () => {
      unsub();
      forwardingAudio.current = false;
      if (handsFreeActive.current || audioService.getIsStreaming()) {
        handsFreeActive.current = false;
        audioService.stopStreamingRecording().catch(() => {});
      }
      stopCameraStream();
      audioService.cleanup();
      geminiService.disconnect();
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, []);

  const handleConnect = () => {
    reconnectAttempts.current = 0;
    connectedAt.current = 0;
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

        {!handsFreeMode && (
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
        )}
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
