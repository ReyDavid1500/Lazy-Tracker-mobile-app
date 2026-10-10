import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { registerForPushNotificationsAsync } from '@/lib/notifications';

function Guard() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/scan');
    }
  }, [user, isLoading, segments]);

  return <Slot />;
}

function PushRegistrar() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) registerForPushNotificationsAsync();
  }, [user]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PushRegistrar />
        <Guard />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
