import { create } from 'zustand';
import type { BleDevice, ConnectionState } from '../types';

interface BluetoothStore {
  state: ConnectionState;
  devices: BleDevice[];
  connectedDeviceId: string | null;
  error: string | null;

  setState: (state: ConnectionState) => void;
  addDevice: (device: BleDevice) => void;
  clearDevices: () => void;
  setConnectedDevice: (deviceId: string | null) => void;
  setError: (error: string | null) => void;
}

export const useBluetoothStore = create<BluetoothStore>((set) => ({
  state: 'disconnected',
  devices: [],
  connectedDeviceId: null,
  error: null,

  setState: (state) => set({ state, error: state === 'error' ? undefined : null }),
  addDevice: (device) =>
    set((prev) => {
      const exists = prev.devices.some((d) => d.id === device.id);
      if (exists) {
        return {
          devices: prev.devices.map((d) => (d.id === device.id ? device : d)),
        };
      }
      return { devices: [...prev.devices, device] };
    }),
  clearDevices: () => set({ devices: [] }),
  setConnectedDevice: (deviceId) => set({ connectedDeviceId: deviceId }),
  setError: (error) => set({ error, state: error ? 'error' : 'disconnected' }),
}));
