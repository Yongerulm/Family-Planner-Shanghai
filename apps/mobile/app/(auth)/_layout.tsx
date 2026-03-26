import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Bereits eingeloggt → direkt zu Tabs
  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Anmelden', headerShown: false }} />
    </Stack>
  );
}
