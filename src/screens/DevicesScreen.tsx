import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useBluetoothStore } from '../stores/bluetoothStore';
import { useConversationStore } from '../stores/conversationStore';
import { bluetoothService } from '../services/bluetooth';
import { glassesService } from '../services/glasses';
import type { GlassesDevice, RegistrationState } from '../services/glasses';
import { DeviceCard } from '../components/DeviceCard';
import type { BleDevice } from '../types';
import { useTheme } from '../hooks/useTheme';
import { SPACING, TYPOGRAPHY, RADIUS, SIZES } from '../design/tokens';

export function DevicesScreen() {
  const colors = useTheme();
  const addMessage = useConversationStore((s) => s.addMessage);

  // ─── Meta DAT SDK state ────────────────────────────────────────
  const [datRegistrationState, setDatRegistrationState] = useState<RegistrationState>('unavailable');
  const [datDevices, setDatDevices] = useState<GlassesDevice[]>([]);
  const [datLoading, setDatLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const unsubs: Array<() => void> = [];

    unsubs.push(
      glassesService.onRegistrationStateChange((state) => {
        setDatRegistrationState(state);
        setDatLoading(state === 'registering');
      }),
    );

    unsubs.push(
      glassesService.onDevicesChange((devices) => {
        setDatDevices(devices);
      }),
    );

    unsubs.push(
      glassesService.onError((error) => {
        addMessage('system', `Glasses error: ${error}`);
      }),
    );

    // Get initial state
    if (glassesService.isConfigured()) {
      setDatRegistrationState(glassesService.getRegistrationState());
      setDatDevices(glassesService.getDevices());
    }

    return () => unsubs.forEach((fn) => fn());
  }, [addMessage]);

  const handleDatRegister = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setDatLoading(true);
      await glassesService.register();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addMessage('system', `Registration failed: ${err.message}`);
      setDatLoading(false);
    }
  }, [addMessage]);

  const handleDatUnregister = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await glassesService.unregister();
      setDatDevices([]);
    } catch (err: any) {
      addMessage('system', `Disconnect failed: ${err.message}`);
    }
  }, [addMessage]);

  // ─── BLE state (existing) ─────────────────────────────────────
  const btState = useBluetoothStore((s) => s.state);
  const devices = useBluetoothStore((s) => s.devices);
  const connectedDeviceId = useBluetoothStore((s) => s.connectedDeviceId);
  const setBtState = useBluetoothStore((s) => s.setState);
  const addDevice = useBluetoothStore((s) => s.addDevice);
  const clearDevices = useBluetoothStore((s) => s.clearDevices);
  const setConnectedDevice = useBluetoothStore((s) => s.setConnectedDevice);
  const setError = useBluetoothStore((s) => s.setError);

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
  const isRegistered = datRegistrationState === 'registered';
  const connectedDatDevice = datDevices.find((d) => d.linkState === 'connected');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── Meta DAT SDK Section ─────────────────────────────── */}
      {Platform.OS === 'ios' && (
        <>
          <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.glassesIcon, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="glasses" size={28} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Meta Ray-Ban</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isRegistered && connectedDatDevice
                ? `Connected: ${connectedDatDevice.name}`
                : isRegistered
                  ? `Registered (${datDevices.length} device${datDevices.length !== 1 ? 's' : ''})`
                  : datLoading
                    ? 'Connecting via Meta AI app...'
                    : 'Register through Meta AI to access camera & sensors'}
            </Text>

            {/* DAT Devices */}
            {isRegistered && datDevices.length > 0 && (
              <View style={styles.datDeviceList}>
                {datDevices.map((d) => (
                  <View
                    key={d.id}
                    style={[styles.datDeviceRow, { backgroundColor: colors.fill }]}
                  >
                    <Ionicons
                      name={d.linkState === 'connected' ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={d.linkState === 'connected' ? colors.success : colors.textTertiary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.datDeviceName, { color: colors.text }]}>{d.name}</Text>
                      <Text style={[styles.datDeviceInfo, { color: colors.textTertiary }]}>
                        {d.type.replace(/_/g, ' ')} · {d.linkState}
                        {d.compatibility !== 'compatible' && d.compatibility !== 'undefined'
                          ? ` · ${d.compatibility.replace(/_/g, ' ')}`
                          : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Action Button */}
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: isRegistered ? colors.errorLight : colors.accent,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={isRegistered ? handleDatUnregister : handleDatRegister}
              disabled={datLoading}
            >
              {datLoading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons
                  name={isRegistered ? 'close-circle' : 'link'}
                  size={18}
                  color={isRegistered ? colors.error : '#FFFFFF'}
                />
              )}
              <Text
                style={[
                  styles.actionText,
                  { color: isRegistered ? colors.error : '#FFFFFF' },
                ]}
              >
                {datLoading
                  ? 'Connecting...'
                  : isRegistered
                    ? 'Disconnect'
                    : 'Connect via Meta AI'}
              </Text>
            </Pressable>
          </View>

          {/* Divider between DAT and BLE sections */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            BLUETOOTH DEVICES
          </Text>
        </>
      )}

      {/* ─── BLE Section (existing) ──────────────────────────── */}
      {Platform.OS !== 'ios' && (
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
      )}

      {/* BLE scan button (iOS — below DAT section) */}
      {Platform.OS === 'ios' && (
        <View style={styles.bleScanRow}>
          <Pressable
            style={({ pressed }) => [
              styles.bleButton,
              { backgroundColor: colors.fill, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={connectedDeviceId ? disconnect : isScanning ? stopScan : startScan}
          >
            {isScanning && <ActivityIndicator size="small" color={colors.accent} />}
            {!isScanning && (
              <Ionicons
                name={connectedDeviceId ? 'close-circle' : 'search'}
                size={16}
                color={connectedDeviceId ? colors.error : colors.accent}
              />
            )}
            <Text style={[styles.bleButtonText, { color: connectedDeviceId ? colors.error : colors.accent }]}>
              {connectedDeviceId ? 'Disconnect BLE' : isScanning ? 'Stop' : 'Scan BLE'}
            </Text>
          </Pressable>
        </View>
      )}

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
              {isScanning ? 'Looking for glasses...' : 'No BLE devices found'}
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
              {isScanning
                ? 'Make sure your glasses are powered on and nearby'
                : 'Tap Scan BLE to search for nearby Bluetooth devices'}
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
  datDeviceList: {
    width: '100%',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  datDeviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  datDeviceName: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  datDeviceInfo: {
    ...TYPOGRAPHY.caption1,
  },
  sectionLabel: {
    ...TYPOGRAPHY.footnote,
    fontWeight: '400',
    paddingHorizontal: SPACING.lg + SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  bleScanRow: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  bleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 36,
    borderRadius: RADIUS.md,
  },
  bleButtonText: {
    ...TYPOGRAPHY.subheadline,
    fontWeight: '500',
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
