import { Tabs, Redirect } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 8, height: 60 },
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Startseite', tabBarLabel: 'Start', tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} /> }}
      />
      <Tabs.Screen
        name="shopping"
        options={{ title: 'Einkauf', tabBarLabel: 'Einkauf', tabBarIcon: ({ color }) => <TabIcon emoji="🛒" color={color} /> }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: 'Aufgaben', tabBarLabel: 'Aufgaben', tabBarIcon: ({ color }) => <TabIcon emoji="✅" color={color} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Kalender', tabBarLabel: 'Kalender', tabBarIcon: ({ color }) => <TabIcon emoji="📅" color={color} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'Mehr', tabBarLabel: 'Mehr', tabBarIcon: ({ color }) => <TabIcon emoji="⋯" color={color} /> }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 22, opacity: color === '#2563eb' ? 1 : 0.5 }}>{emoji}</Text>;
}
