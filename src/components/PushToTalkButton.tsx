import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import { useConversationStore } from '../stores/conversationStore';
import { audioService } from '../services/audio';
import { geminiService } from '../services/gemini';
import { COLORS } from '../constants';

export function PushToTalkButton() {
  const audioState = useConversationStore((s) => s.audioState);
  const setAudioState = useConversationStore((s) => s.setAudioState);
  const addMessage = useConversationStore((s) => s.addMessage);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isRecording = audioState === 'recording';

  const handlePressIn = useCallback(async () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();

    try {
      await audioService.startRecording();
      setAudioState('recording');
    } catch (err) {
      addMessage('system', `Recording error: ${err}`);
      setAudioState('idle');
    }
  }, [scaleAnim, setAudioState, addMessage]);

  const handlePressOut = useCallback(async () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    try {
      setAudioState('processing');
      const uri = await audioService.stopRecording();
      if (uri) {
        // In production, we'd stream audio chunks during recording.
        // For MVP, we send the recorded file after release.
        addMessage('user', '[Voice message sent]');
        // TODO: Read file as base64 and send via geminiService.sendAudio()
      }
      setAudioState('idle');
    } catch (err) {
      addMessage('system', `Processing error: ${err}`);
      setAudioState('idle');
    }
  }, [scaleAnim, setAudioState, addMessage]);

  const stateLabel =
    audioState === 'recording'
      ? 'Listening...'
      : audioState === 'processing'
        ? 'Processing...'
        : audioState === 'playing'
          ? 'Speaking...'
          : 'Hold to Talk';

  return (
    <View style={styles.wrapper}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.button,
            isRecording && styles.buttonActive,
          ]}
        >
          <View style={[styles.innerRing, isRecording && styles.innerRingActive]}>
            <Text style={styles.icon}>
              {isRecording ? '||' : '\u25B6'}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
      <Text style={styles.label}>{stateLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.highlight,
  },
  buttonActive: {
    backgroundColor: COLORS.highlight,
    borderColor: COLORS.text,
  },
  innerRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  innerRingActive: {
    backgroundColor: 'rgba(233, 69, 96, 0.3)',
    borderColor: COLORS.text,
  },
  icon: {
    fontSize: 28,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
