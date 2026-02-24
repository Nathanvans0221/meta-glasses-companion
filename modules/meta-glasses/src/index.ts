import { requireNativeModule, EventEmitter, type EventSubscription } from 'expo-modules-core';

// ─── Types ──────────────────────────────────────────────────────

export type RegistrationState = 'unavailable' | 'available' | 'registering' | 'registered';
export type LinkState = 'disconnected' | 'connecting' | 'connected';
export type StreamState = 'stopping' | 'stopped' | 'waiting_for_device' | 'starting' | 'streaming' | 'paused';
export type DeviceType = 'ray_ban_meta' | 'oakley_meta_hstn' | 'oakley_meta_vanguard' | 'meta_ray_ban_display' | 'unknown';
export type Compatibility = 'compatible' | 'device_update_required' | 'sdk_update_required' | 'undefined';
export type PhotoFormat = 'jpeg' | 'heic';
export type StreamResolution = 'low' | 'medium' | 'high';

export interface GlassesDevice {
  id: string;
  name: string;
  type: DeviceType;
  linkState: LinkState;
  compatibility: Compatibility;
}

export interface StreamOptions {
  resolution?: StreamResolution;
  frameRate?: number;
  /** Seconds between video frames sent to JS (default: 1.0) */
  throttleSeconds?: number;
}

export interface VideoFrameEvent {
  base64: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface PhotoCaptureEvent {
  base64: string;
  format: PhotoFormat;
}

export interface RegistrationStateEvent {
  state: RegistrationState;
}

export interface DevicesChangeEvent {
  devices: GlassesDevice[];
}

export interface DeviceLinkStateEvent {
  deviceId: string;
  deviceName: string;
  linkState: LinkState;
}

export interface StreamStateEvent {
  state: StreamState;
}

export interface ErrorEvent {
  error: string;
  source?: string;
}

// ─── Native Module ──────────────────────────────────────────────

const MetaGlassesNative = requireNativeModule('MetaGlasses');
const emitter = new EventEmitter(MetaGlassesNative);

// ─── Public API ─────────────────────────────────────────────────

/** Initialize the Meta Wearables DAT SDK. Call once at app startup. */
export async function configure(): Promise<{ status: string }> {
  return MetaGlassesNative.configure();
}

/** Start registration flow (redirects to Meta AI app for authorization). */
export async function startRegistration(): Promise<{ status: string }> {
  return MetaGlassesNative.startRegistration();
}

/** Handle callback URL from Meta AI app after registration/permission. */
export async function handleUrl(url: string): Promise<boolean> {
  return MetaGlassesNative.handleUrl(url);
}

/** Disconnect from Meta AI / unregister device access. */
export async function unregister(): Promise<{ status: string }> {
  return MetaGlassesNative.unregister();
}

/** Get current registration state synchronously. */
export function getRegistrationState(): RegistrationState {
  return MetaGlassesNative.getRegistrationState();
}

/** Get list of currently discovered glasses devices. */
export function getDevices(): GlassesDevice[] {
  return MetaGlassesNative.getDevices();
}

/** Check if camera permission has been granted on the glasses. */
export async function checkCameraPermission(): Promise<'granted' | 'denied'> {
  return MetaGlassesNative.checkCameraPermission();
}

/** Request camera permission (redirects to Meta AI app). */
export async function requestCameraPermission(): Promise<'granted' | 'denied'> {
  return MetaGlassesNative.requestCameraPermission();
}

/** Start camera streaming from glasses. Video frames delivered via onVideoFrame. */
export async function startStreaming(options?: StreamOptions): Promise<{ status: string }> {
  return MetaGlassesNative.startStreaming(options ?? {});
}

/** Stop camera streaming. */
export async function stopStreaming(): Promise<{ status: string }> {
  return MetaGlassesNative.stopStreaming();
}

/** Capture a single photo from the glasses camera. Result via onPhotoCapture. */
export async function capturePhoto(format?: PhotoFormat): Promise<boolean> {
  return MetaGlassesNative.capturePhoto(format ?? 'jpeg');
}

// ─── Event Listeners ────────────────────────────────────────────
// Cast to any because the EventEmitter generic expects statically defined event names
// which aren't available until the native module loads at runtime.

const _emitter = emitter as any;

export function onRegistrationStateChange(listener: (event: RegistrationStateEvent) => void): EventSubscription {
  return _emitter.addListener('onRegistrationStateChange', listener);
}

export function onDevicesChange(listener: (event: DevicesChangeEvent) => void): EventSubscription {
  return _emitter.addListener('onDevicesChange', listener);
}

export function onDeviceLinkStateChange(listener: (event: DeviceLinkStateEvent) => void): EventSubscription {
  return _emitter.addListener('onDeviceLinkStateChange', listener);
}

export function onStreamStateChange(listener: (event: StreamStateEvent) => void): EventSubscription {
  return _emitter.addListener('onStreamStateChange', listener);
}

export function onVideoFrame(listener: (event: VideoFrameEvent) => void): EventSubscription {
  return _emitter.addListener('onVideoFrame', listener);
}

export function onPhotoCapture(listener: (event: PhotoCaptureEvent) => void): EventSubscription {
  return _emitter.addListener('onPhotoCapture', listener);
}

export function onError(listener: (event: ErrorEvent) => void): EventSubscription {
  return _emitter.addListener('onError', listener);
}
