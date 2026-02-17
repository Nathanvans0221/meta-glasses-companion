import { BleManager, Device, State } from 'react-native-ble-plx';
import { META_GLASSES_NAME_PREFIX } from '../constants';
import type { BleDevice } from '../types';

class BluetoothService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  async getState(): Promise<State> {
    return this.manager.state();
  }

  async waitForPoweredOn(): Promise<void> {
    return new Promise((resolve) => {
      const subscription = this.manager.onStateChange((state) => {
        if (state === State.PoweredOn) {
          subscription.remove();
          resolve();
        }
      }, true);
    });
  }

  startScan(
    onDeviceFound: (device: BleDevice) => void,
    onError?: (error: Error) => void,
  ): void {
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        onError?.(new Error(error.message));
        return;
      }
      if (device && device.name?.startsWith(META_GLASSES_NAME_PREFIX)) {
        onDeviceFound({
          id: device.id,
          name: device.name,
          rssi: device.rssi,
          isConnectable: device.isConnectable,
        });
      }
    });
  }

  stopScan(): void {
    this.manager.stopDeviceScan();
  }

  async connectToDevice(deviceId: string): Promise<Device> {
    const device = await this.manager.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();
    this.connectedDevice = device;
    return device;
  }

  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      await this.connectedDevice.cancelConnection();
      this.connectedDevice = null;
    }
  }

  getConnectedDevice(): Device | null {
    return this.connectedDevice;
  }

  onDeviceDisconnected(callback: (deviceId: string) => void): void {
    if (this.connectedDevice) {
      this.manager.onDeviceDisconnected(this.connectedDevice.id, (error, device) => {
        if (device) {
          callback(device.id);
          this.connectedDevice = null;
        }
      });
    }
  }

  destroy(): void {
    this.manager.destroy();
  }
}

export const bluetoothService = new BluetoothService();
