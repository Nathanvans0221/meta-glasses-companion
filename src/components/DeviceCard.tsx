import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import type { BleDevice } from '../types';
import { COLORS } from '../constants';

interface DeviceCardProps {
  device: BleDevice;
  isConnected: boolean;
  onPress: (device: BleDevice) => void;
}

export function DeviceCard({ device, isConnected, onPress }: DeviceCardProps) {
  return (
    <Pressable
      style={[styles.card, isConnected && styles.cardConnected]}
      onPress={() => onPress(device)}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{device.name || 'Unknown Device'}</Text>
        <Text style={styles.id}>{device.id}</Text>
      </View>
      <View style={styles.meta}>
        {device.rssi !== null && (
          <Text style={styles.rssi}>{device.rssi} dBm</Text>
        )}
        <Text style={[styles.status, isConnected && styles.statusConnected]}>
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
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  cardConnected: {
    borderColor: COLORS.success,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  id: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  meta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rssi: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  status: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  statusConnected: {
    color: COLORS.success,
    fontWeight: '600',
  },
});
