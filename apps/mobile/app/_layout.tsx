import { useEffect } from 'react';
import { Platform } from 'react-native';
import { startOfflineQueueProcessor } from '../src/lib/offlineQueue';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/stores/auth.store';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { notificationsApi } from '../src/api/client';

SplashScreen.preventAutoHideAsync();

// Push Notification Handler (Vordergrund)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 3;
      },
    },
  },
});

/**
 * Requests push permission and registers the device token with our backend.
 *
 * - Only runs on physical devices (Expo Go simulator doesn't support push)
 * - deviceId is stable: generated once, stored in SecureStore, survives reinstalls
 * - Platform detection: iOS → 'apns', Android → 'fcm'
 */
async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return; // Simulator has no push token

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return; // User denied push — respect that

  // Get or create a stable device ID
  let deviceId = await SecureStore.getItemAsync('fp_device_id');
  if (!deviceId) {
    deviceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await SecureStore.setItemAsync('fp_device_id', deviceId);
  }

  // Get the Expo push token (which wraps APNs/FCM)
  // For production use, retrieve the native APNs token directly
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  const platform = Platform.OS === 'ios' ? 'apns' : 'fcm';
  const appVersion = Application.nativeApplicationVersion ?? undefined;

  await notificationsApi.registerDeviceToken({
    deviceId,
    platform,
    pushToken: expoPushToken,
    appVersion,
  });
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    hydrate().finally(() => SplashScreen.hideAsync());

    // Startet Offline-Queue-Prozessor — wiederholt gespeicherte Mutations bei Reconnect
    const stopQueue = startOfflineQueueProcessor();
    return stopQueue;
  }, []);

  // Register push token after user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      registerPushToken().catch(() => {
        // Non-critical — push can fail gracefully; in-app notifications still work
      });
    }
  }, [isAuthenticated]);

  if (isLoading) return null; // Splash Screen sichtbar während Hydration

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
