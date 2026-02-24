import { Platform } from 'react-native';
import * as MetaGlasses from '../../modules/meta-glasses/src';
import type {
  GlassesDevice,
  RegistrationState,
  StreamState,
  VideoFrameEvent,
  PhotoCaptureEvent,
} from '../../modules/meta-glasses/src';

export type { GlassesDevice, RegistrationState, StreamState, VideoFrameEvent, PhotoCaptureEvent };

type StateCallback = (state: RegistrationState) => void;
type DevicesCallback = (devices: GlassesDevice[]) => void;
type FrameCallback = (frame: VideoFrameEvent) => void;
type PhotoCallback = (photo: PhotoCaptureEvent) => void;
type StreamCallback = (state: StreamState) => void;
type ErrorCallback = (error: string) => void;

/**
 * High-level service for Meta glasses integration.
 * Wraps the native DAT SDK module with a simpler event-based API.
 */
class GlassesService {
  private configured = false;
  private subscriptions: Array<{ remove(): void }> = [];

  private stateCallbacks: StateCallback[] = [];
  private devicesCallbacks: DevicesCallback[] = [];
  private frameCallbacks: FrameCallback[] = [];
  private photoCallbacks: PhotoCallback[] = [];
  private streamCallbacks: StreamCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];

  /**
   * Initialize the Meta DAT SDK. Safe to call multiple times.
   * Returns false on Android (DAT SDK is iOS-only for now).
   */
  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    if (this.configured) return true;

    try {
      await MetaGlasses.configure();
      this.configured = true;
      this.setupListeners();
      return true;
    } catch (err) {
      console.warn('[GlassesService] Failed to initialize:', err);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  // ─── Registration ───────────────────────────────────────────────

  /**
   * Start the registration flow. This opens the Meta AI app for authorization.
   * The user must approve access, then the Meta AI app redirects back.
   */
  async register(): Promise<void> {
    this.ensureConfigured();
    await MetaGlasses.startRegistration();
  }

  /**
   * Handle a deep link URL from Meta AI app (registration/permission callback).
   * Call this from your app's URL handler.
   */
  async handleDeepLink(url: string): Promise<boolean> {
    if (!this.configured) return false;
    return MetaGlasses.handleUrl(url);
  }

  /** Disconnect from Meta AI. */
  async unregister(): Promise<void> {
    this.ensureConfigured();
    await MetaGlasses.unregister();
  }

  getRegistrationState(): RegistrationState {
    if (!this.configured) return 'unavailable';
    return MetaGlasses.getRegistrationState();
  }

  // ─── Devices ────────────────────────────────────────────────────

  getDevices(): GlassesDevice[] {
    if (!this.configured) return [];
    return MetaGlasses.getDevices();
  }

  // ─── Camera ─────────────────────────────────────────────────────

  async checkCameraPermission(): Promise<'granted' | 'denied'> {
    this.ensureConfigured();
    return MetaGlasses.checkCameraPermission();
  }

  async requestCameraPermission(): Promise<'granted' | 'denied'> {
    this.ensureConfigured();
    return MetaGlasses.requestCameraPermission();
  }

  /**
   * Start streaming video from the glasses camera.
   * Frames are throttled to ~1fps by default for AI processing.
   * Listen via onVideoFrame().
   */
  async startCameraStream(options?: MetaGlasses.StreamOptions): Promise<void> {
    this.ensureConfigured();
    await MetaGlasses.startStreaming(options);
  }

  async stopCameraStream(): Promise<void> {
    if (!this.configured) return;
    await MetaGlasses.stopStreaming();
  }

  /**
   * Capture a single photo. Result delivered via onPhotoCapture callback.
   * Requires an active camera stream.
   */
  capturePhoto(format?: MetaGlasses.PhotoFormat): boolean {
    if (!this.configured) return false;
    return MetaGlasses.capturePhoto(format);
  }

  // ─── Event Listeners ────────────────────────────────────────────

  onRegistrationStateChange(cb: StateCallback): () => void {
    this.stateCallbacks.push(cb);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter((c) => c !== cb);
    };
  }

  onDevicesChange(cb: DevicesCallback): () => void {
    this.devicesCallbacks.push(cb);
    return () => {
      this.devicesCallbacks = this.devicesCallbacks.filter((c) => c !== cb);
    };
  }

  onVideoFrame(cb: FrameCallback): () => void {
    this.frameCallbacks.push(cb);
    return () => {
      this.frameCallbacks = this.frameCallbacks.filter((c) => c !== cb);
    };
  }

  onPhotoCapture(cb: PhotoCallback): () => void {
    this.photoCallbacks.push(cb);
    return () => {
      this.photoCallbacks = this.photoCallbacks.filter((c) => c !== cb);
    };
  }

  onStreamStateChange(cb: StreamCallback): () => void {
    this.streamCallbacks.push(cb);
    return () => {
      this.streamCallbacks = this.streamCallbacks.filter((c) => c !== cb);
    };
  }

  onError(cb: ErrorCallback): () => void {
    this.errorCallbacks.push(cb);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter((c) => c !== cb);
    };
  }

  // ─── Cleanup ────────────────────────────────────────────────────

  cleanup(): void {
    for (const sub of this.subscriptions) {
      sub.remove();
    }
    this.subscriptions = [];
    this.stateCallbacks = [];
    this.devicesCallbacks = [];
    this.frameCallbacks = [];
    this.photoCallbacks = [];
    this.streamCallbacks = [];
    this.errorCallbacks = [];
  }

  // ─── Private ────────────────────────────────────────────────────

  private ensureConfigured(): void {
    if (!this.configured) {
      throw new Error('GlassesService not initialized. Call initialize() first.');
    }
  }

  private setupListeners(): void {
    this.subscriptions.push(
      MetaGlasses.onRegistrationStateChange((event) => {
        for (const cb of this.stateCallbacks) cb(event.state);
      }),
    );

    this.subscriptions.push(
      MetaGlasses.onDevicesChange((event) => {
        for (const cb of this.devicesCallbacks) cb(event.devices);
      }),
    );

    this.subscriptions.push(
      MetaGlasses.onVideoFrame((event) => {
        for (const cb of this.frameCallbacks) cb(event);
      }),
    );

    this.subscriptions.push(
      MetaGlasses.onPhotoCapture((event) => {
        for (const cb of this.photoCallbacks) cb(event);
      }),
    );

    this.subscriptions.push(
      MetaGlasses.onStreamStateChange((event) => {
        for (const cb of this.streamCallbacks) cb(event.state);
      }),
    );

    this.subscriptions.push(
      MetaGlasses.onError((event) => {
        for (const cb of this.errorCallbacks) cb(event.error);
      }),
    );
  }
}

export const glassesService = new GlassesService();
