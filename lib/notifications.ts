import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests push notification permissions, gets the Expo push token,
 * and registers it with the backend (PATCH /users/me/push-token).
 *
 * Safe to call multiple times — exits early on simulators.
 */
export async function registerForPushNotificationsAsync(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    // Web and simulators don't support Expo push tokens
    return;
  }

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[notifications] Push permission denied.');
    return;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('[notifications] EAS projectId missing in app.json extra.eas.projectId');
    return;
  }

  try {
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

    // Persist on the backend so the server can send alerts to this device
    await api.patch('/users/me/push-token', { pushToken });

    console.log('[notifications] Push token registered:', pushToken);
  } catch (err) {
    console.error('[notifications] Failed to register push token:', err);
  }
}
