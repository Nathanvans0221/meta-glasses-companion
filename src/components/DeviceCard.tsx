import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BleDevice } from '../types';
import { useTheme } from '../hooks/useTheme';
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../design/tokens';

interface DeviceCardProps {
  device: BleDevice;
  isConnected: boolean;
  onPress: (device: BleDevice) => void;
}

function SignalBars({ rssi }: { rssi: number | null }) {
  const colors = useTheme();
  if (rssi === null) return null;

  const strength = rssi > -50 ? 4 : rssi > -65 ? 3 : rssi > -80 ? 2 : 1;

  return (
    <View style={signalStyles.container}>
      {[1, 2, 3, 4].map((bar) => (
        <View
          key={bar}
          style={[
            signalStyles.bar,
            {
              height: 4 + bar * 3,
              backgroundColor: bar <= strength ? colors.accent : colors.fill,
            },
          ]}
        />
      ))}
    </View>
  );
}

const signalStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
});

export function DeviceCard({ device, isConnected, onPress }: DeviceCardProps) {
  const colors = useTheme();

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress(device);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isConnected ? colors.success : colors.separator,
          opacity: pressed ? 0.7 : 1,
        },
        isConnected && { borderColor: colors.success, borderWidth: 1.5 },
      ]}
      onPress={handlePress}
    >
      <View style={[styles.iconBox, { backgroundColor: isConnected ? colors.successLight : colors.fill }]}>
        <Ionicons
          name={isConnected ? 'glasses' : 'glasses-outline'}
          size={22}
          color={isConnected ? colors.success : colors.textSecondary}
        />
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {device.name || 'Unknown Device'}
        </Text>
        <Text style={[styles.id, { color: colors.textTertiary }]} numberOfLines={1}>
          {device.id.substring(0, 17)}...
        </Text>
      </View>

      <View style={styles.meta}>
        <SignalBars rssi={device.rssi} />
        {isConnected ? (
          <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}>Connected</Text>
          </View>
        ) : (
          <Text style={[styles.tapHint, { color: colors.textTertiary }]}>Tap to pair</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    gap: SPACING.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...TYPOGRAPHY.headline,
  },
  id: {
    ...TYPOGRAPHY.caption1,
  },
  meta: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    ...TYPOGRAPHY.caption2,
    fontWeight: '600',
  },
  tapHint: {
    ...TYPOGRAPHY.caption2,
  },
});
