import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { ExpoPlayAudioStream } from '@mykin-ai/expo-audio-stream';
import type { EventSubscription } from '@mykin-ai/expo-audio-stream';
import { AUDIO_SAMPLE_RATE, AUDIO_CHANNELS } from '../constants';

// Gemini outputs audio at 24kHz, 16-bit, mono PCM
const GEMINI_OUTPUT_SAMPLE_RATE = 24000;
const GEMINI_OUTPUT_CHANNELS = 1;
const GEMINI_OUTPUT_BIT_DEPTH = 16;

// Streaming config: send audio chunks every 200ms for low-latency streaming
const STREAM_INTERVAL_MS = 200;

/**
 * Create a complete WAV file (header + PCM data) as a single base64 string.
 * Used for playback of Gemini's audio responses via expo-av.
 */
function createWavBase64(pcmBase64: string): string {
  const pcmBinary = atob(pcmBase64);
  const pcmByteLength = pcmBinary.length;

  const sampleRate = GEMINI_OUTPUT_SAMPLE_RATE;
  const channels = GEMINI_OUTPUT_CHANNELS;
  const bitDepth = GEMINI_OUTPUT_BIT_DEPTH;
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);

  const totalLength = 44 + pcmByteLength;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  // "RIFF" chunk
  view.setUint8(0, 0x52); view.setUint8(1, 0x49);
  view.setUint8(2, 0x46); view.setUint8(3, 0x46);
  view.setUint32(4, 36 + pcmByteLength, true);
  view.setUint8(8, 0x57); view.setUint8(9, 0x41);
  view.setUint8(10, 0x56); view.setUint8(11, 0x45);

  // "fmt " sub-chunk
  view.setUint8(12, 0x66); view.setUint8(13, 0x6D);
  view.setUint8(14, 0x74); view.setUint8(15, 0x20);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // "data" sub-chunk
  view.setUint8(36, 0x64); view.setUint8(37, 0x61);
  view.setUint8(38, 0x74); view.setUint8(39, 0x61);
  view.setUint32(40, pcmByteLength, true);

  // Copy PCM data
  for (let i = 0; i < pcmByteLength; i++) {
    view.setUint8(44 + i, pcmBinary.charCodeAt(i));
  }

  // Convert to base64 in chunks
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

class AudioService {
  private sound: Audio.Sound | null = null;
  private playbackFinishedCallback: (() => void) | null = null;
  private audioChunks: string[] = [];
  private audioFileCounter = 0;

  // Streaming state
  private isStreaming = false;
  private streamSubscription: EventSubscription | null = null;
  private streamChunksSent = 0;

  async initialize(): Promise<void> {
    // Set audio mode for playback (recording is handled by expo-audio-stream)
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    // Request mic permission via expo-audio-stream
    const { granted } = await ExpoPlayAudioStream.requestPermissionsAsync();
    if (!granted) {
      throw new Error('Microphone permission not granted');
    }
  }

  /**
   * Start streaming audio recording. Chunks are delivered in real-time
   * via the onChunk callback as base64-encoded 16kHz mono PCM.
   */
  async startStreamingRecording(
    onChunk: (base64Pcm: string) => void,
  ): Promise<void> {
    if (this.isStreaming) {
      await this.stopStreamingRecording();
    }

    this.streamChunksSent = 0;
    this.isStreaming = true;

    const { subscription } = await ExpoPlayAudioStream.startRecording({
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm_16bit',
      interval: STREAM_INTERVAL_MS,
      onAudioStream: async (event) => {
        if (!this.isStreaming) return;

        // event.data is base64-encoded PCM at the configured sample rate
        const audioData = event.data;
        if (typeof audioData === 'string' && audioData.length > 0) {
          this.streamChunksSent++;
          onChunk(audioData);
        }
      },
    });

    this.streamSubscription = subscription ?? null;
  }

  /**
   * Stop streaming recording. Returns the number of chunks that were sent.
   */
  async stopStreamingRecording(): Promise<number> {
    if (!this.isStreaming) return 0;

    this.isStreaming = false;
    const chunksSent = this.streamChunksSent;

    try {
      this.streamSubscription?.remove();
      this.streamSubscription = null;
      await ExpoPlayAudioStream.stopRecording();
    } catch {
      // Ignore stop errors — recording may have already been stopped
    }

    return chunksSent;
  }

  getIsStreaming(): boolean {
    return this.isStreaming;
  }

  onPlaybackFinished(callback: () => void): void {
    this.playbackFinishedCallback = callback;
  }

  /**
   * Accumulate a base64 PCM audio chunk from Gemini response.
   */
  addAudioChunk(base64Audio: string): void {
    this.audioChunks.push(base64Audio);
  }

  hasAudioChunks(): boolean {
    return this.audioChunks.length > 0;
  }

  /**
   * Combine all accumulated PCM chunks, wrap in WAV header, and play.
   */
  async playAccumulatedAudio(): Promise<void> {
    if (this.audioChunks.length === 0) {
      this.playbackFinishedCallback?.();
      return;
    }

    const combinedBase64 = this.audioChunks.join('');
    this.audioChunks = [];

    const wavBase64 = createWavBase64(combinedBase64);

    const filename = `gemini_audio_${this.audioFileCounter++}.wav`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    try {
      await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // Switch to playback mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true },
      );
      this.sound = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          this.sound = null;
          FileSystem.deleteAsync(fileUri, { idempotent: true });
          this.playbackFinishedCallback?.();
        }
      });
    } catch (err) {
      this.audioChunks = [];
      throw err;
    }
  }

  async playAudioFromUri(uri: string): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
    );
    this.sound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        this.sound = null;
        this.playbackFinishedCallback?.();
      }
    });
  }

  async cleanup(): Promise<void> {
    if (this.isStreaming) {
      await this.stopStreamingRecording();
    }
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
    this.audioChunks = [];
    this.playbackFinishedCallback = null;
  }
}

export const audioService = new AudioService();
