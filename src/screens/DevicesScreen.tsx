import React, { useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useBluetoothStore } from '../stores/bluetoothStore';
import { useConversationStore } from '../stores/conversationStore';
import { bluetoothService } from '../services/bluetooth';
import { DeviceCard } from '../components/DeviceCard';
import type { BleDevice } from '../types';
import { useTheme } from '../hooks/useTheme';

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
      setError(err.message);
    }
  }, [clearDevices, setBtState, addDevice, setError, addMessage, connectedDeviceId]);

  const stopScan = useCallback(() => {
    bluetoothService.stopScan();
    setBtState(connectedDeviceId ? 'connected' : 'disconnected');
  }, [setBtState, connectedDeviceId]);

  const connectToDevice = useCallback(
    async (device: BleDevice) => {
      try {
        bluetoothService.stopScan();
        setBtState('connecting');
        addMessage('system', `Connecting to ${device.name}...`);

        await bluetoothService.connectToDevice(device.id);
        setConnectedDevice(device.id);
        setBtState('connected');
        addMessage('system', `Connected to ${device.name}`);

        bluetoothService.onDeviceDisconnected((deviceId) => {
          setConnectedDevice(null);
          setBtState('disconnected');
          addMessage('system', `Disconnected from ${device.name}`);
        });
      } catch (err: any) {
        setError(err.message);
        addMessage('system', `Failed to connect: ${err.message}`);
      }
    },
    [setBtState, setConnectedDevice, setError, addMessage],
  );

  const disconnect = useCallback(async () => {
    try {
      await bluetoothService.disconnect();
      setConnectedDevice(null);
      setBtState('disconnected');
      addMessage('system', 'Disconnected from glasses');
    } catch (err: any) {
      setError(err.message);
    }
  }, [setConnectedDevice, setBtState, setError, addMessage]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Meta Ray-Ban Glasses</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {btState === 'scanning'
            ? `Scanning... (${devices.length} found)`
            : connectedDeviceId
              ? 'Connected'
              : 'Not connected'}
        </Text>
      </View>

      <View style={styles.actions}>
        {connectedDeviceId ? (
          <Pressable style={[styles.button, { backgroundColor: colors.error }]} onPress={disconnect}>
            <Text style={styles.buttonText}>Disconnect</Text>
          </Pressable>
        ) : btState === 'scanning' ? (
          <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={stopScan}>
            <Text style={styles.buttonText}>Stop Scan</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={startScan}>
            <Text style={styles.buttonText}>Scan for Glasses</Text>
          </Pressable>
        )}
      </View>

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
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {btState === 'scanning'
                ? 'Searching for Meta Ray-Ban glasses...'
                : 'Tap "Scan for Glasses" to find nearby devices'}
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
  header: {
    padding: 20,
    paddingTop: 8,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  button: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
