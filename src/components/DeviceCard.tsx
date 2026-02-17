import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import type { BleDevice } from '../types';
import { useTheme } from '../hooks/useTheme';

interface DeviceCardProps {
  device: BleDevice;
  isConnected: boolean;
  onPress: (device: BleDevice) => void;
}

export function DeviceCard({ device, isConnected, onPress }: DeviceCardProps) {
  const colors = useTheme();

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: isConnected ? colors.success : colors.surfaceLight },
      ]}
      onPress={() => onPress(device)}
    >
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{device.name || 'Unknown Device'}</Text>
        <Text style={[styles.id, { color: colors.textSecondary }]}>{device.id}</Text>
      </View>
      <View style={styles.meta}>
        {device.rssi !== null && (
          <Text style={[styles.rssi, { color: colors.textSecondary }]}>{device.rssi} dBm</Text>
        )}
        <Text style={[styles.status, { color: isConnected ? colors.success : colors.textSecondary, fontWeight: isConnected ? '600' : 'normal' }]}>
          {isConnected ? 'Connected' : 'Tap to connect'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  id: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  meta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rssi: {
    fontSize: 12,
  },
  status: {
    fontSize: 12,
  },
});
