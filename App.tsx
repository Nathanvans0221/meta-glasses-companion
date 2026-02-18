import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from './src/screens/HomeScreen';
import { DevicesScreen } from './src/screens/DevicesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useTheme } from './src/hooks/useTheme';
import { useSettingsStore } from './src/stores/settingsStore';
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
