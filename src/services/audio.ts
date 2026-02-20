import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { AUDIO_SAMPLE_RATE, AUDIO_CHANNELS } from '../constants';

// Gemini outputs audio at 24kHz, 16-bit, mono PCM
const GEMINI_OUTPUT_SAMPLE_RATE = 24000;
const GEMINI_OUTPUT_CHANNELS = 1;
const GEMINI_OUTPUT_BIT_DEPTH = 16;

/**
 * Create a WAV header for raw PCM data.
 * Returns a base64-encoded WAV header.
 */
function createWavHeader(pcmByteLength: number): string {
  const sampleRate = GEMINI_OUTPUT_SAMPLE_RATE;
  const channels = GEMINI_OUTPUT_CHANNELS;
  const bitDepth = GEMINI_OUTPUT_BIT_DEPTH;
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmByteLength;
  const fileSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // "RIFF" chunk
  view.setUint8(0, 0x52); // R
  view.setUint8(1, 0x49); // I
  view.setUint8(2, 0x46); // F
  view.setUint8(3, 0x46); // F
  view.setUint32(4, fileSize, true);
  view.setUint8(8, 0x57);  // W
  view.setUint8(9, 0x41);  // A
  view.setUint8(10, 0x56); // V
  view.setUint8(11, 0x45); // E

  // "fmt " sub-chunk
  view.setUint8(12, 0x66); // f
  view.setUint8(13, 0x6D); // m
  view.setUint8(14, 0x74); // t
  view.setUint8(15, 0x20); // (space)
  view.setUint32(16, 16, true);         // Sub-chunk size
  view.setUint16(20, 1, true);          // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // "data" sub-chunk
  view.setUint8(36, 0x64); // d
  view.setUint8(37, 0x61); // a
  view.setUint8(38, 0x74); // t
  view.setUint8(39, 0x61); // a
  view.setUint32(40, dataSize, true);

  // Convert ArrayBuffer to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

class AudioService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private playbackFinishedCallback: (() => void) | null = null;
  private audioChunks: string[] = [];
  private audioFileCounter = 0;

  async initialize(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      throw new Error('Microphone permission not granted');
    }
  }

  async prepareForRecording(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }

  async prepareForPlayback(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }

  async startRecording(): Promise<void> {
    if (this.recording) {
      await this.stopRecording();
    }

    await this.prepareForRecording();

    const { recording } = await Audio.Recording.createAsync({
      android: {
        extension: '.wav',
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: AUDIO_SAMPLE_RATE,
        numberOfChannels: AUDIO_CHANNELS,
        bitRate: 128000,
      },
      ios: {
        extension: '.wav',
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: AUDIO_SAMPLE_RATE,
        numberOfChannels: AUDIO_CHANNELS,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/wav',
        bitsPerSecond: 128000,
      },
    });

    this.recording = recording;
  }

  async stopRecording(): Promise<string | null> {
    if (!this.recording) return null;

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;

    await this.prepareForPlayback();

    return uri;
  }

  onPlaybackFinished(callback: () => void): void {
    this.playbackFinishedCallback = callback;
  }

  /**
   * Accumulate a base64 PCM audio chunk from Gemini.
   * Call playAccumulatedAudio() when the turn is complete.
   */
  addAudioChunk(base64Audio: string): void {
    this.audioChunks.push(base64Audio);
  }

  hasAudioChunks(): boolean {
    return this.audioChunks.length > 0;
  }

  /**
   * Combine all accumulated PCM chunks, wrap in WAV header,
   * write to temp file, and play.
   */
  async playAccumulatedAudio(): Promise<void> {
    if (this.audioChunks.length === 0) {
      this.playbackFinishedCallback?.();
      return;
    }

    // Combine all base64 chunks into one
    const combinedBase64 = this.audioChunks.join('');
    this.audioChunks = [];

    // Calculate PCM byte length from base64
    const pcmByteLength = Math.floor((combinedBase64.length * 3) / 4);

    // Create WAV header + PCM data as base64
    const wavHeaderBase64 = createWavHeader(pcmByteLength);
    const wavBase64 = wavHeaderBase64 + combinedBase64;

    // Write to temp file
    const filename = `gemini_audio_${this.audioFileCounter++}.wav`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    try {
      await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (this.sound) {
        await this.sound.unloadAsync();
      }

      await this.prepareForPlayback();

      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true },
      );
      this.sound = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          this.sound = null;
          // Clean up temp file
          FileSystem.deleteAsync(fileUri, { idempotent: true });
          this.playbackFinishedCallback?.();
        }
      });
    } catch (err) {
      this.audioChunks = [];
      throw err;
    }
  }

  /**
   * @deprecated Use addAudioChunk() + playAccumulatedAudio() instead
   */
  async playAudioFromBase64(base64Audio: string): Promise<void> {
    this.addAudioChunk(base64Audio);
    await this.playAccumulatedAudio();
  }

  async playAudioFromUri(uri: string): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
    }

    await this.prepareForPlayback();

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

  isRecording(): boolean {
    return this.recording !== null;
  }

  async cleanup(): Promise<void> {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
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
