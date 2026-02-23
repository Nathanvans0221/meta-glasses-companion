import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../stores/authStore';
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, SHADOWS } from '../design/tokens';
import { APP_VERSION } from '../constants';

export function LoginScreen() {
  const colors = useTheme();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  const handleLogin = async () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: '#69936C' }]}>
            <Ionicons name="sparkles" size={36} color="#FFFFFF" />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>
            WorkSuite Voice
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in with your WorkSuite account
          </Text>
        </View>

        {/* Form */}
        <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
          {/* Error banner */}
          {error && (
            <Pressable
              style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}
              onPress={clearError}
            >
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            </Pressable>
          )}

          {/* Email */}
          <View
            style={[styles.inputContainer, { backgroundColor: colors.fill }]}
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color={colors.textTertiary}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={email}
              onChangeText={(val) => {
                clearError();
                setEmail(val);
              }}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!isLoading}
            />
          </View>

          {/* Password */}
          <View
            style={[styles.inputContainer, { backgroundColor: colors.fill }]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.textTertiary}
            />
            <TextInput
              ref={passwordRef}
              style={[styles.input, { color: colors.text }]}
              value={password}
              onChangeText={(val) => {
                clearError();
                setPassword(val);
              }}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              editable={!isLoading}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textTertiary}
              />
            </Pressable>
          </View>

          {/* Sign In button */}
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              { backgroundColor: colors.accent, opacity: canSubmit ? (pressed ? 0.8 : 1) : 0.4 },
            ]}
            onPress={handleLogin}
            disabled={!canSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.signInText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            WorkSuite Voice v{APP_VERSION}
          </Text>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Silver Fern Engineering
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING['3xl'],
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: SPACING['4xl'],
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  appName: {
    ...TYPOGRAPHY.title2,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.subheadline,
  },
  formCard: {
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  errorText: {
    ...TYPOGRAPHY.caption1,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: SIZES.inputHeight,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    height: '100%',
  },
  signInButton: {
    height: SIZES.buttonHeight,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  signInText: {
    ...TYPOGRAPHY.headline,
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING['4xl'],
    gap: SPACING.xs,
  },
  footerText: {
    ...TYPOGRAPHY.caption1,
  },
});
