import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBluetoothStore } from '../stores/bluetoothStore';
import { useConversationStore } from '../stores/conversationStore';
import { useTheme } from '../hooks/useTheme';
import { SPACING, TYPOGRAPHY, RADIUS } from '../design/tokens';

const STATE_LABELS: Record<string, string> = {
  connected: 'Connected',
  connecting: 'Connecting',
  scanning: 'Scanning',
  disconnected: 'Off',
  error: 'Error',
};

export function ConnectionStatus() {
  const colors = useTheme();
  const btState = useBluetoothStore((s) => s.state);
  const wsState = useConversationStore((s) => s.wsState);

  const btColor =
    btState === 'connected'
      ? colors.success
      : btState === 'scanning' || btState === 'connecting'
        ? colors.warning
        : colors.textTertiary;

  const wsColor =
    wsState === 'connected'
      ? colors.success
      : wsState === 'connecting'
        ? colors.warning
        : colors.textTertiary;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary, borderBottomColor: colors.separator }]}>
      <View style={styles.indicator}>
        <View style={[styles.iconContainer, { backgroundColor: btState === 'connected' ? colors.successLight : colors.fill }]}>
          <Ionicons name="bluetooth" size={14} color={btColor} />
        </View>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Glasses</Text>
          <Text style={[styles.status, { color: btColor }]}>
            {STATE_LABELS[btState] || btState}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.separator }]} />

      <View style={styles.indicator}>
        <View style={[styles.iconContainer, { backgroundColor: wsState === 'connected' ? colors.successLight : colors.fill }]}>
          <Ionicons name="sparkles" size={14} color={wsColor} />
        </View>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>AI</Text>
          <Text style={[styles.status, { color: wsColor }]}>
            {STATE_LABELS[wsState] || wsState}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 0.5,
  },
  indicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.caption1,
    fontWeight: '600',
  },
  status: {
    ...TYPOGRAPHY.caption2,
  },
  divider: {
    width: 0.5,
    height: 24,
    marginHorizontal: SPACING.md,
  },
});
