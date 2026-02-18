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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { APP_VERSION } from '../constants';
import { useSettingsStore } from '../stores/settingsStore';
import { useConversationStore } from '../stores/conversationStore';
import { useTheme } from '../hooks/useTheme';
import { SPACING, TYPOGRAPHY, RADIUS, SIZES } from '../design/tokens';

function SettingsGroup({ children }: { children: React.ReactNode }) {
  const colors = useTheme();
  return (
    <View style={[groupStyles.container, { backgroundColor: colors.surface }]}>
      {children}
    </View>
  );
}

function SettingsRow({
  icon,
  iconColor,
  label,
  description,
  right,
}: {
  icon: string;
  iconColor: string;
  label: string;
  description?: string;
  right: React.ReactNode;
}) {
  const colors = useTheme();
  return (
    <View style={rowStyles.container}>
      <View style={[rowStyles.iconBox, { backgroundColor: iconColor }]}>
        <Ionicons name={icon as any} size={16} color="#FFFFFF" />
      </View>
      <View style={rowStyles.content}>
        <Text style={[rowStyles.label, { color: colors.text }]}>{label}</Text>
        {description && (
          <Text style={[rowStyles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

function SectionDivider() {
  const colors = useTheme();
  return <View style={[dividerStyles.line, { backgroundColor: colors.separator }]} />;
}

const groupStyles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
});

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    minHeight: 52,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 1,
  },
  label: {
    ...TYPOGRAPHY.body,
  },
  description: {
    ...TYPOGRAPHY.caption1,
  },
});

const dividerStyles = StyleSheet.create({
  line: {
    height: 0.5,
    marginLeft: 56,
  },
});

export function SettingsScreen() {
  const colors = useTheme();
  const settings = useSettingsStore();
  const clearMessages = useConversationStore((s) => s.clearMessages);

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'This will permanently delete all conversation messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            clearMessages();
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* API Configuration */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        GEMINI API
      </Text>
      <SettingsGroup>
        <View style={styles.inputRow}>
          <View style={[rowStyles.iconBox, { backgroundColor: '#FF9500' }]}>
            <Ionicons name="key" size={16} color="#FFFFFF" />
          </View>
          <View style={styles.inputContent}>
            <Text style={[rowStyles.label, { color: colors.text }]}>API Key</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.fill, color: colors.text }]}
              value={settings.geminiApiKey}
              onChangeText={(val) => settings.updateSettings({ geminiApiKey: val })}
              placeholder="Enter your Gemini API key"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        <SectionDivider />
        <View style={styles.inputRow}>
          <View style={[rowStyles.iconBox, { backgroundColor: '#AF52DE' }]}>
            <Ionicons name="cube" size={16} color="#FFFFFF" />
          </View>
          <View style={styles.inputContent}>
            <Text style={[rowStyles.label, { color: colors.text }]}>Model</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.fill, color: colors.text }]}
              value={settings.geminiModel}
              onChangeText={(val) => settings.updateSettings({ geminiModel: val })}
              placeholder="gemini-2.0-flash-live-001"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
        <SectionDivider />
        <Pressable
          style={styles.linkRow}
          onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}
        >
          <View style={[rowStyles.iconBox, { backgroundColor: '#1A93AE' }]}>
            <Ionicons name="open-outline" size={16} color="#FFFFFF" />
          </View>
          <Text style={[styles.linkText, { color: colors.accent }]}>
            Get an API key from Google AI Studio
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </Pressable>
      </SettingsGroup>

      {/* Appearance */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        APPEARANCE
      </Text>
      <SettingsGroup>
        <SettingsRow
          icon="moon"
          iconColor="#5856D6"
          label="Dark Mode"
          right={
            <Switch
              value={settings.darkMode}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                settings.updateSettings({ darkMode: val });
              }}
              trackColor={{ false: colors.fill, true: colors.accent }}
            />
          }
        />
      </SettingsGroup>

      {/* Behavior */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        BEHAVIOR
      </Text>
      <SettingsGroup>
        <SettingsRow
          icon="eye"
          iconColor="#FF9500"
          label="Keep Screen Awake"
          description="Prevents sleep during use"
          right={
            <Switch
              value={settings.keepAwake}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                settings.updateSettings({ keepAwake: val });
              }}
              trackColor={{ false: colors.fill, true: colors.accent }}
            />
          }
        />
        <SectionDivider />
        <SettingsRow
          icon="refresh"
          iconColor="#34C759"
          label="Auto-Reconnect"
          description="Reconnect on drop"
          right={
            <Switch
              value={settings.autoReconnect}
              onValueChange={(val) => {
                Haptics.selectionAsync();
                settings.updateSettings({ autoReconnect: val });
              }}
              trackColor={{ false: colors.fill, true: colors.accent }}
            />
          }
        />
      </SettingsGroup>

      {/* Data */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        DATA
      </Text>
      <SettingsGroup>
        <Pressable
          style={({ pressed }) => [styles.dangerRow, { opacity: pressed ? 0.6 : 1 }]}
          onPress={handleClearHistory}
        >
          <View style={[rowStyles.iconBox, { backgroundColor: colors.error }]}>
            <Ionicons name="trash" size={16} color="#FFFFFF" />
          </View>
          <Text style={[styles.dangerText, { color: colors.error }]}>
            Clear Conversation History
          </Text>
        </Pressable>
      </SettingsGroup>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          WorkSuite Voice v{APP_VERSION}
        </Text>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          Silver Fern Engineering
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING['5xl'],
  },
  sectionHeader: {
    ...TYPOGRAPHY.footnote,
    fontWeight: '400',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  inputContent: {
    flex: 1,
    gap: SPACING.sm,
  },
  input: {
    height: SIZES.inputHeight,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    ...TYPOGRAPHY.body,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  linkText: {
    ...TYPOGRAPHY.body,
    flex: 1,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  dangerText: {
    ...TYPOGRAPHY.body,
  },
  footer: {
    alignItems: 'center',
    paddingTop: SPACING['3xl'],
    gap: SPACING.xs,
  },
  footerText: {
    ...TYPOGRAPHY.caption1,
  },
});
