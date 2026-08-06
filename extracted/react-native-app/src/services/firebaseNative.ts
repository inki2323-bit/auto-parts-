import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import messaging from '@react-native-firebase/messaging';

export async function initializeFirebaseNativeServices(): Promise<void> {
  try {
    await messaging().requestPermission();
    await messaging().registerDeviceForRemoteMessages();
    await messaging().setAutoInitEnabled(true);
    await analytics().setAnalyticsCollectionEnabled(true);
    await crashlytics().setCrashlyticsCollectionEnabled(true);
  } catch (error) {
    console.warn('Firebase native initialization warning', error);
  }
}

export async function getCurrentFcmToken(): Promise<string | null> {
  try {
    return await messaging().getToken();
  } catch (error) {
    console.warn('FCM token fetch failed', error);
    return null;
  }
}

export async function logFirebaseEvent(eventName: string, params?: Record<string, any>): Promise<void> {
  try {
    await analytics().logEvent(eventName, params);
  } catch (error) {
    console.warn('Firebase Analytics event logging failed', error);
  }
}

export async function recordCrashlyticsError(error: Error | string, context?: Record<string, any>): Promise<void> {
  try {
    if (error instanceof Error) {
      crashlytics().recordError(error);
      if (context) {
        Object.entries(context).forEach(([key, value]) => crashlytics().setAttribute(key, String(value)));
      }
    } else {
      crashlytics().log(error);
    }
  } catch (reportError) {
    console.warn('Crashlytics reporting failed', reportError);
  }
}
