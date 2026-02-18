import React, { useCallback, useRef, useEffect } from 'react';
import { Pressable, Text, StyleSheet, Animated, View } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useConversationStore } from '../stores/conversationStore';
import { audioService } from '../services/audio';
import { geminiService } from '../services/gemini';
import { useTheme } from '../hooks/useTheme';
import { SPACING, TYPOGRAPHY, SIZES } from '../design/tokens';

export function PushToTalkButton() {
  const colors = useTheme();
  const audioState = useConversationStore((s) => s.audioState);
  const setAudioState = useConversationStore((s) => s.setAudioState);
  const addMessage = useConversationStore((s) => s.addMessage);
  const wsState = useConversationStore((s) => s.wsState);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const isRecording = audioState === 'recording';
  const isProcessing = audioState === 'processing';
  const isPlaying = audioState === 'playing';
  const isDisabled = wsState !== 'connected' || isProcessing || isPlaying;

  // Pulse animation during recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      glow.start();
      return () => { pulse.stop(); glow.stop(); };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isRecording, pulseAnim, glowAnim]);

  const handlePressIn = useCallback(async () => {
    if (wsState !== 'connected') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addMessage('system', 'Connect to AI first before using voice input.');
      return;
    }
    if (isProcessing || isPlaying) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }).start();

    try {
      await audioService.startRecording();
      setAudioState('recording');
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addMessage('system', `Recording error: ${err}`);
      setAudioState('idle');
    }
  }, [scaleAnim, setAudioState, addMessage, wsState, audioState]);

  const handlePressOut = useCallback(async () => {
    if (audioState !== 'recording') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

    try {
      setAudioState('processing');
      const uri = await audioService.stopRecording();
      if (uri) {
        const audioFile = new ExpoFile(uri);
        const base64Audio = await audioFile.base64();
        addMessage('user', '[Voice message sent]');
        geminiService.sendAudio(base64Audio);
      } else {
        setAudioState('idle');
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addMessage('system', `Processing error: ${err}`);
      setAudioState('idle');
    }
  }, [scaleAnim, setAudioState, addMessage, audioState]);

  const stateLabel = isRecording
    ? 'Listening...'
    : isProcessing
      ? 'Thinking...'
      : isPlaying
        ? 'Speaking...'
        : 'Hold to Talk';

  const iconName = isRecording
    ? 'radio'
    : isProcessing
      ? 'hourglass'
      : isPlaying
        ? 'volume-high'
        : 'mic';

  const buttonColor = isRecording
    ? colors.error
    : isDisabled
      ? colors.fill
      : colors.accent;

  return (
    <View style={styles.wrapper}>
      {/* Outer pulse ring (visible during recording) */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            borderColor: colors.error,
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
        pointerEvents="none"
      />

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.button, { backgroundColor: buttonColor }]}
          accessibilityLabel={stateLabel}
          accessibilityRole="button"
        >
          <Ionicons name={iconName} size={SIZES.iconSizeLg} color="#FFFFFF" />
        </Pressable>
      </Animated.View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{stateLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  outerRing: {
    position: 'absolute',
    width: SIZES.pttOuterRing,
    height: SIZES.pttOuterRing,
    borderRadius: SIZES.pttOuterRing / 2,
    borderWidth: 2,
  },
  button: {
    width: SIZES.pttButtonSize,
    height: SIZES.pttButtonSize,
    borderRadius: SIZES.pttButtonSize / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...TYPOGRAPHY.footnote,
    fontWeight: '500',
  },
});
