import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useBluetoothStore } from '../stores/bluetoothStore';
import { useConversationStore } from '../stores/conversationStore';
import { useTheme } from '../hooks/useTheme';

export function ConnectionStatus() {
  const colors = useTheme();
  const btState = useBluetoothStore((s) => s.state);
  const wsState = useConversationStore((s) => s.wsState);

  const btColor =
    btState === 'connected'
      ? colors.success
      : btState === 'scanning' || btState === 'connecting'
        ? colors.warning
        : colors.error;

  const wsColor =
    wsState === 'connected'
      ? colors.success
      : wsState === 'connecting'
        ? colors.warning
        : colors.error;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.surfaceLight }]}>
      <View style={styles.indicator}>
        <View style={[styles.dot, { backgroundColor: btColor }]} />
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Glasses: {btState}
        </Text>
      </View>
      <View style={styles.indicator}>
        <View style={[styles.dot, { backgroundColor: wsColor }]} />
        <Text style={[styles.label, { color: colors.textSecondary }]}>
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
    borderBottomWidth: 1,
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
    fontSize: 12,
    textTransform: 'capitalize',
  },
});
