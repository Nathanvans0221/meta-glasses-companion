import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { HomeScreen } from './src/screens/HomeScreen';
import { DevicesScreen } from './src/screens/DevicesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { useTheme } from './src/hooks/useTheme';
import { useSettingsStore } from './src/stores/settingsStore';
import { useAuthStore } from './src/stores/authStore';
import { isTokenExpired } from './src/services/auth';
import { glassesService } from './src/services/glasses';
import { TYPOGRAPHY, SPACING } from './src/design/tokens';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Voice: { active: 'mic', inactive: 'mic-outline' },
  Glasses: { active: 'glasses', inactive: 'glasses-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

export default function App() {
  const colors = useTheme();
  const darkMode = useSettingsStore((s) => s.darkMode);
  const token = useAuthStore((s) => s.token);

  const isLoggedIn = token !== null && !isTokenExpired(token);

  // Initialize Meta DAT SDK and handle deep link callbacks
  useEffect(() => {
    glassesService.initialize().catch(() => {});

    // Handle Meta AI app OAuth callback URLs
    const sub = Linking.addEventListener('url', ({ url }) => {
      glassesService.handleDeepLink(url).catch(() => {});
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) glassesService.handleDeepLink(url).catch(() => {});
    });

    return () => {
      sub.remove();
      glassesService.cleanup();
    };
  }, []);

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <StatusBar style={darkMode ? 'light' : 'dark'} />
        <LoginScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style={darkMode ? 'light' : 'dark'} />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerStyle: {
              backgroundColor: colors.primary,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.separator,
              shadowColor: 'transparent',
              elevation: 0,
            },
            headerTintColor: colors.text,
            headerTitleStyle: {
              ...TYPOGRAPHY.headline,
              color: colors.text,
            },
            tabBarStyle: {
              backgroundColor: colors.primary,
              borderTopWidth: 0.5,
              borderTopColor: colors.separator,
              paddingTop: SPACING.xs,
            },
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textTertiary,
            tabBarLabelStyle: {
              fontSize: TYPOGRAPHY.caption2.fontSize,
              fontWeight: '500',
            },
            tabBarIcon: ({ focused, color, size }) => {
              const icons = TAB_ICONS[route.name];
              const iconName = focused ? icons?.active : icons?.inactive;
              return <Ionicons name={iconName || 'help-outline'} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen
            name="Voice"
            component={HomeScreen}
            options={{ title: 'Voice' }}
          />
          <Tab.Screen
            name="Glasses"
            component={DevicesScreen}
            options={{ title: 'Glasses' }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
