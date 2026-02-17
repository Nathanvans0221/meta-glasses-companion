import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { DevicesScreen } from './src/screens/DevicesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useTheme } from './src/hooks/useTheme';
import { useSettingsStore } from './src/stores/settingsStore';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '\u{1F3A4}',
    Devices: '\u{1F50D}',
    Settings: '\u2699\uFE0F',
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[label] || label}
    </Text>
  );
}

export default function App() {
  const colors = useTheme();
  const darkMode = useSettingsStore((s) => s.darkMode);

  return (
    <NavigationContainer>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: colors.primary,
            shadowColor: 'transparent',
          },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          tabBarStyle: {
            backgroundColor: colors.primary,
            borderTopColor: colors.surfaceLight,
          },
          tabBarActiveTintColor: colors.highlight,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarIcon: ({ focused }) => (
            <TabIcon label={route.name} focused={focused} />
          ),
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'WorkSuite Voice' }}
        />
        <Tab.Screen
          name="Devices"
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
  );
}
