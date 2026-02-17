import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import { useConversationStore } from '../stores/conversationStore';
import { audioService } from '../services/audio';
import { geminiService } from '../services/gemini';
import { websocketService } from '../services/websocket';
import { useTheme } from '../hooks/useTheme';

export function PushToTalkButton() {
  const colors = useTheme();
  const audioState = useConversationStore((s) => s.audioState);
  const setAudioState = useConversationStore((s) => s.setAudioState);
  const addMessage = useConversationStore((s) => s.addMessage);
  const wsState = useConversationStore((s) => s.wsState);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isRecording = audioState === 'recording';

  const handlePressIn = useCallback(async () => {
    // Don't allow recording if not connected to Gemini
    if (wsState !== 'connected') {
      addMessage('system', 'Connect to AI first before using voice input.');
      return;
    }

    // Don't allow new recording while processing or playing
    if (audioState === 'processing' || audioState === 'playing') {
      return;
    }

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
  }, [scaleAnim, setAudioState, addMessage, wsState, audioState]);

  const handlePressOut = useCallback(async () => {
    // Only process if we were actually recording
    if (audioState !== 'recording') return;

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    try {
      setAudioState('processing');
      const uri = await audioService.stopRecording();

      if (uri) {
        // Read the recorded audio file as base64 using the new expo-file-system API
        const audioFile = new ExpoFile(uri);
        const base64Audio = await audioFile.base64();

        addMessage('user', '[Voice message sent]');

        // Send the audio to Gemini via websocket
        geminiService.sendAudio(base64Audio);
      } else {
        setAudioState('idle');
      }
      // Note: audioState stays 'processing' until Gemini responds.
      // The HomeScreen's onAudioResponse / onTurnComplete callbacks
      // will transition the state to 'playing' then 'idle'.
    } catch (err) {
      addMessage('system', `Processing error: ${err}`);
      setAudioState('idle');
    }
  }, [scaleAnim, setAudioState, addMessage, audioState]);

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
