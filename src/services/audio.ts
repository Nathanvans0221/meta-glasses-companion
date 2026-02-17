import { Audio } from 'expo-av';
import { AUDIO_SAMPLE_RATE, AUDIO_CHANNELS } from '../constants';

class AudioService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private playbackFinishedCallback: (() => void) | null = null;

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

  /**
   * Set audio mode for recording (enables mic input on iOS).
   * Must be called before startRecording().
   */
  async prepareForRecording(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }

  /**
   * Set audio mode for playback (routes audio to speaker on iOS, not earpiece).
   * Must be called before playing audio.
   */
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

    // Ensure audio mode is set for recording
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

    // Switch audio mode for playback (speaker, not earpiece)
    await this.prepareForPlayback();

    return uri;
  }

  /**
   * Register a callback for when audio playback finishes.
   * Used by the PTT flow to transition audioState from 'playing' back to 'idle'.
   */
  onPlaybackFinished(callback: () => void): void {
    this.playbackFinishedCallback = callback;
  }

  async playAudioFromBase64(base64Audio: string): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
    }

    // Ensure we're in playback mode (speaker, not earpiece)
    await this.prepareForPlayback();

    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/pcm;rate=${AUDIO_SAMPLE_RATE};base64,${base64Audio}` },
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
    this.playbackFinishedCallback = null;
  }
}

export const audioService = new AudioService();
