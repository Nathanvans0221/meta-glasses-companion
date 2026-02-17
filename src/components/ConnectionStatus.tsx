import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useBluetoothStore } from '../stores/bluetoothStore';
import { useConversationStore } from '../stores/conversationStore';
import { COLORS } from '../constants';

export function ConnectionStatus() {
  const btState = useBluetoothStore((s) => s.state);
  const wsState = useConversationStore((s) => s.wsState);

  const btColor =
    btState === 'connected'
      ? COLORS.success
      : btState === 'scanning' || btState === 'connecting'
        ? COLORS.warning
        : COLORS.error;

  const wsColor =
    wsState === 'connected'
      ? COLORS.success
      : wsState === 'connecting'
        ? COLORS.warning
        : COLORS.error;

  return (
    <View style={styles.container}>
      <View style={styles.indicator}>
        <View style={[styles.dot, { backgroundColor: btColor }]} />
        <Text style={styles.label}>
          Glasses: {btState}
        </Text>
      </View>
      <View style={styles.indicator}>
        <View style={[styles.dot, { backgroundColor: wsColor }]} />
        <Text style={styles.label}>
          AI: {wsState}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
  },
});
