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
import { useTheme } from '../hooks/useTheme';

export function PushToTalkButton() {
  const colors = useTheme();
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
        addMessage('user', '[Voice message sent]');
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
            { backgroundColor: colors.accent, borderColor: colors.highlight },
            isRecording && { backgroundColor: colors.highlight, borderColor: colors.text },
          ]}
        >
          <View style={[
            styles.innerRing,
            { backgroundColor: colors.surfaceLight, borderColor: colors.accent },
            isRecording && { backgroundColor: 'rgba(233, 69, 96, 0.3)', borderColor: colors.text },
          ]}>
            <Text style={[styles.icon, { color: colors.text }]}>
              {isRecording ? '||' : '\u25B6'}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{stateLabel}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  innerRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  icon: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
