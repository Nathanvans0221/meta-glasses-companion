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
import { useTheme } from '../hooks/useTheme';

export function SettingsScreen() {
  const colors = useTheme();
  const settings = useSettingsStore();
  const clearMessages = useConversationStore((s) => s.clearMessages);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.sectionTitle, { color: colors.highlight }]}>Gemini API</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.text }]}>API Key</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceLight, color: colors.text }]}
          value={settings.geminiApiKey}
          onChangeText={(val) => settings.updateSettings({ geminiApiKey: val })}
          placeholder="Enter your Gemini API key"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}
        >
          <Text style={[styles.link, { color: colors.highlight }]}>Get an API key from Google AI Studio</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.text }]}>Model</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceLight, color: colors.text }]}
          value={settings.geminiModel}
          onChangeText={(val) => settings.updateSettings({ geminiModel: val })}
          placeholder="gemini-2.0-flash-exp"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.highlight }]}>Appearance</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={[styles.label, { color: colors.text }]}>Dark Mode</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>Toggle between dark and light theme</Text>
          </View>
          <Switch
            value={settings.darkMode}
            onValueChange={(val) => settings.updateSettings({ darkMode: val })}
            trackColor={{ false: colors.surfaceLight, true: colors.accent }}
            thumbColor={settings.darkMode ? colors.highlight : colors.textSecondary}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.highlight }]}>Preferences</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={[styles.label, { color: colors.text }]}>Keep Screen Awake</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>Prevents screen from sleeping during use</Text>
          </View>
          <Switch
            value={settings.keepAwake}
            onValueChange={(val) => settings.updateSettings({ keepAwake: val })}
            trackColor={{ false: colors.surfaceLight, true: colors.accent }}
            thumbColor={settings.keepAwake ? colors.highlight : colors.textSecondary}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={[styles.label, { color: colors.text }]}>Auto-Reconnect</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>Automatically reconnect if connection drops</Text>
          </View>
          <Switch
            value={settings.autoReconnect}
            onValueChange={(val) => settings.updateSettings({ autoReconnect: val })}
            trackColor={{ false: colors.surfaceLight, true: colors.accent }}
            thumbColor={settings.autoReconnect ? colors.highlight : colors.textSecondary}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.highlight }]}>Data</Text>
      <Pressable style={[styles.dangerButton, { backgroundColor: colors.surface, borderColor: colors.error }]} onPress={clearMessages}>
        <Text style={[styles.dangerText, { color: colors.error }]}>Clear Conversation History</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>Meta Glasses Companion v1.0.0</Text>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>Silver Fern Engineering</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    maxWidth: '80%',
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  link: {
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flex: 1,
  },
  dangerButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  dangerText: {
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
    fontSize: 12,
    opacity: 0.6,
  },
});
