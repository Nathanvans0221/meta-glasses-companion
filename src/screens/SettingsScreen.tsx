import React from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  ScrollView,
  StyleSheet,
  Pressable,
  Linking,
} from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';
import { useConversationStore } from '../stores/conversationStore';
import { COLORS } from '../constants';

export function SettingsScreen() {
  const settings = useSettingsStore();
  const clearMessages = useConversationStore((s) => s.clearMessages);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Gemini API</Text>
      <View style={styles.card}>
        <Text style={styles.label}>API Key</Text>
        <TextInput
          style={styles.input}
          value={settings.geminiApiKey}
          onChangeText={(val) => settings.updateSettings({ geminiApiKey: val })}
          placeholder="Enter your Gemini API key"
          placeholderTextColor={COLORS.textSecondary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}
        >
          <Text style={styles.link}>Get an API key from Google AI Studio</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Model</Text>
        <TextInput
          style={styles.input}
          value={settings.geminiModel}
          onChangeText={(val) => settings.updateSettings({ geminiModel: val })}
          placeholder="gemini-2.0-flash-exp"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Keep Screen Awake</Text>
            <Text style={styles.description}>Prevents screen from sleeping during use</Text>
          </View>
          <Switch
            value={settings.keepAwake}
            onValueChange={(val) => settings.updateSettings({ keepAwake: val })}
            trackColor={{ false: COLORS.surfaceLight, true: COLORS.accent }}
            thumbColor={settings.keepAwake ? COLORS.highlight : COLORS.textSecondary}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Auto-Reconnect</Text>
            <Text style={styles.description}>Automatically reconnect if connection drops</Text>
          </View>
          <Switch
            value={settings.autoReconnect}
            onValueChange={(val) => settings.updateSettings({ autoReconnect: val })}
            trackColor={{ false: COLORS.surfaceLight, true: COLORS.accent }}
            thumbColor={settings.autoReconnect ? COLORS.highlight : COLORS.textSecondary}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Data</Text>
      <Pressable style={styles.dangerButton} onPress={clearMessages}>
        <Text style={styles.dangerText}>Clear Conversation History</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Meta Glasses Companion v1.0.0</Text>
        <Text style={styles.footerText}>Silver Fern Engineering</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.highlight,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  label: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 12,
    maxWidth: '80%',
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    color: COLORS.text,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  link: {
    color: COLORS.highlight,
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  dangerText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 40,
    gap: 4,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    opacity: 0.6,
  },
});
