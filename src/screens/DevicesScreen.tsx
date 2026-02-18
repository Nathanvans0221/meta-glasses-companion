import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useBluetoothStore } from '../stores/bluetoothStore';
import { useConversationStore } from '../stores/conversationStore';
import { bluetoothService } from '../services/bluetooth';
import { DeviceCard } from '../components/DeviceCard';
import type { BleDevice } from '../types';
import { useTheme } from '../hooks/useTheme';
import { SPACING, TYPOGRAPHY, RADIUS, SIZES } from '../design/tokens';

export function DevicesScreen() {
  const colors = useTheme();
  const btState = useBluetoothStore((s) => s.state);
  const devices = useBluetoothStore((s) => s.devices);
  const connectedDeviceId = useBluetoothStore((s) => s.connectedDeviceId);
  const setBtState = useBluetoothStore((s) => s.setState);
  const addDevice = useBluetoothStore((s) => s.addDevice);
  const clearDevices = useBluetoothStore((s) => s.clearDevices);
  const setConnectedDevice = useBluetoothStore((s) => s.setConnectedDevice);
  const setError = useBluetoothStore((s) => s.setError);
  const addMessage = useConversationStore((s) => s.addMessage);

  const startScan = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await bluetoothService.waitForPoweredOn();
      clearDevices();
      setBtState('scanning');

      bluetoothService.startScan(
        (device) => addDevice(device),
        (error) => {
          setError(error.message);
          addMessage('system', `BLE Error: ${error.message}`);
        },
      );

      setTimeout(() => {
        bluetoothService.stopScan();
        setBtState(connectedDeviceId ? 'connected' : 'disconnected');
      }, 15000);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message);
    }
  }, [clearDevices, setBtState, addDevice, setError, addMessage, connectedDeviceId]);

  const stopScan = useCallback(() => {
    Haptics.selectionAsync();
    bluetoothService.stopScan();
    setBtState(connectedDeviceId ? 'connected' : 'disconnected');
  }, [setBtState, connectedDeviceId]);

  const connectToDevice = useCallback(
    async (device: BleDevice) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        bluetoothService.stopScan();
        setBtState('connecting');
        addMessage('system', `Connecting to ${device.name}...`);

        await bluetoothService.connectToDevice(device.id);
        setConnectedDevice(device.id);
        setBtState('connected');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        addMessage('system', `Connected to ${device.name}`);

        bluetoothService.onDeviceDisconnected(() => {
          setConnectedDevice(null);
          setBtState('disconnected');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          addMessage('system', `Disconnected from ${device.name}`);
        });
      } catch (err: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(err.message);
        addMessage('system', `Failed to connect: ${err.message}`);
      }
    },
    [setBtState, setConnectedDevice, setError, addMessage],
  );

  const disconnect = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await bluetoothService.disconnect();
      setConnectedDevice(null);
      setBtState('disconnected');
      addMessage('system', 'Disconnected from glasses');
    } catch (err: any) {
      setError(err.message);
    }
  }, [setConnectedDevice, setBtState, setError, addMessage]);

  const isScanning = btState === 'scanning';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Card */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.glassesIcon, { backgroundColor: colors.accentLight }]}>
          <Ionicons name="glasses" size={28} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Meta Ray-Ban</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {connectedDeviceId
            ? 'Your glasses are connected'
            : isScanning
              ? `Scanning nearby devices (${devices.length} found)`
              : 'Pair your glasses to get started'}
        </Text>

        {/* Action Button */}
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: connectedDeviceId ? colors.errorLight : colors.accent,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={connectedDeviceId ? disconnect : isScanning ? stopScan : startScan}
        >
          {isScanning && <ActivityIndicator size="small" color={colors.accent} />}
          {!isScanning && (
            <Ionicons
              name={connectedDeviceId ? 'close-circle' : 'search'}
              size={18}
              color={connectedDeviceId ? colors.error : '#FFFFFF'}
            />
          )}
          <Text
            style={[
              styles.actionText,
              { color: connectedDeviceId ? colors.error : '#FFFFFF' },
            ]}
          >
            {connectedDeviceId ? 'Disconnect' : isScanning ? 'Stop Scanning' : 'Scan for Glasses'}
          </Text>
        </Pressable>
      </View>

      {/* Device List */}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DeviceCard
            device={item}
            isConnected={item.id === connectedDeviceId}
            onPress={connectToDevice}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={isScanning ? 'radio-outline' : 'bluetooth-outline'}
              size={40}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {isScanning ? 'Looking for glasses...' : 'No devices found'}
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
              {isScanning
                ? 'Make sure your glasses are powered on and nearby'
                : 'Tap "Scan for Glasses" to search for nearby devices'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  glassesIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.title2,
  },
  subtitle: {
    ...TYPOGRAPHY.subheadline,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: SIZES.buttonHeight,
    width: '100%',
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  actionText: {
    ...TYPOGRAPHY.headline,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING['3xl'],
  },
  empty: {
    alignItems: 'center',
    paddingVertical: SPACING['4xl'],
    gap: SPACING.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.headline,
    marginTop: SPACING.sm,
  },
  emptyHint: {
    ...TYPOGRAPHY.subheadline,
    textAlign: 'center',
    paddingHorizontal: SPACING['3xl'],
  },
});
