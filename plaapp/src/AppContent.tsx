import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import BackgroundService from './services/BackgroundService';
import DeviceSocketService from './services/DeviceSocketService';
import NotificationService from './services/NotificationService';
import { DEVICE_SOCKET_URL, FRONTEND_URL, SOCKET_EVENTS } from './utils/constants';
import { logger } from './utils/logger';

type BridgeMessage = { type?: string; payload?: Record<string, unknown>; requestId?: string };

const EVENT_NAMES = [
  SOCKET_EVENTS.NOTIFICATION_NEW,
  SOCKET_EVENTS.NOTIFICATION_BROADCAST,
  SOCKET_EVENTS.SYSTEM_ANNOUNCEMENT,
  SOCKET_EVENTS.WALLET_UPDATED,
  SOCKET_EVENTS.MATCH_RESULT_READY,
  SOCKET_EVENTS.MATCH_SUBMISSION_RECEIVED,
  SOCKET_EVENTS.MATCH_POSTPONE_RESPONSE,
  SOCKET_EVENTS.MATCH_DISPUTE_OPENED,
  SOCKET_EVENTS.LEADERBOARD_UPDATED,
  SOCKET_EVENTS.CONNECTED,
  SOCKET_EVENTS.DISCONNECTED,
  SOCKET_EVENTS.DEVICE_SESSION_REPLACED,
] as const;

function injectNativeEvent(webView: WebView | null, type: string, payload: unknown): void {
  if (!webView) return;
  const detail = JSON.stringify({ type, payload }).replace(/</g, '\\u003c');
  webView.injectJavaScript(`window.dispatchEvent(new CustomEvent('pla:native-message',{detail:${detail}}));true;`);
}

export default function AppContent() {
  const webView = useRef<WebView>(null);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [session, setSession] = useState<{ userId: number | string; token: string } | null>(null);

  const sendResponse = useCallback((message: BridgeMessage, payload: unknown, error?: string) => {
    if (!message.requestId) return;
    const response = JSON.stringify({ type: message.type, requestId: message.requestId, payload, error }).replace(/</g, '\\u003c');
    webView.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('pla:native-response',{detail:${response}}));true;`);
  }, []);

  const initialize = useCallback(async (payload: Record<string, unknown>) => {
    const userId = payload.userId;
    const token = payload.authToken;
    if ((!Number.isSafeInteger(Number(userId)) && typeof userId !== 'string') || typeof token !== 'string' || !token) {
      throw new Error('A valid signed-in user and access token are required');
    }
    setSession({ userId: userId as number | string, token });

    DeviceSocketService.clearHandlers();
    for (const event of EVENT_NAMES) {
      DeviceSocketService.on(event, (data) => {
        injectNativeEvent(webView.current, event, data);
        if (event === SOCKET_EVENTS.NOTIFICATION_NEW || event === SOCKET_EVENTS.NOTIFICATION_BROADCAST) {
          const notification = data as { title?: string; body?: string };
          if (notification.title && notification.body) {
            void NotificationService.show({
              title: notification.title!,
              body: notification.body!,
            }).catch((error: unknown) => logger.warn('Could not show an in-app notification', error));
          }
        }
      });
    }

    const connected = await BackgroundService.start(userId as number | string, token, (type, data) => {
      injectNativeEvent(webView.current, type, data);
    });
    return { success: true, deviceSocketConnected: connected, socketUrlConfigured: Boolean(DEVICE_SOCKET_URL) };
  }, []);

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    let message: BridgeMessage;
    try {
      message = JSON.parse(event.nativeEvent.data) as BridgeMessage;
    } catch {
      logger.warn('Ignored an invalid native bridge message');
      return;
    }
    try {
      if (message.type === 'INITIALIZE_SERVICES') {
        sendResponse(message, await initialize(message.payload ?? {}));
      } else if (message.type === 'DISCONNECT_SOCKET') {
        setSession(null);
        await BackgroundService.stop();
        sendResponse(message, { success: true });
      } else if (message.type === 'REQUEST_PERMISSION') {
        const { default: permissions } = await import('./services/PermissionManager');
        sendResponse(message, { status: await permissions.request(String(message.payload?.permissionType ?? '')) });
      } else if (message.type === 'CHECK_PERMISSION') {
        const { default: permissions } = await import('./services/PermissionManager');
        sendResponse(message, { status: await permissions.check(String(message.payload?.permissionType ?? '')) });
      } else if (message.type === 'RECONNECT_SOCKET' && session) {
        await BackgroundService.stop();
        sendResponse(message, await initialize({ userId: session.userId, authToken: session.token }));
      } else {
        sendResponse(message, null, `Unsupported native message: ${message.type ?? 'unknown'}`);
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Native app service failed';
      logger.error('Native bridge request failed', messageText);
      sendResponse(message, null, messageText);
    }
  }, [initialize, sendResponse, session]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => setOnline(state.isConnected ?? false));
    return () => {
      unsubscribe();
      void BackgroundService.stop();
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        webView.current?.goBack();
        return true;
      }
      Alert.alert('Exit ProLeague Africa?', 'Do you want to close the app?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const frontendOrigin = FRONTEND_URL ? new URL(FRONTEND_URL).origin : '';
  const source = FRONTEND_URL ? { uri: FRONTEND_URL } : undefined;

  if (!FRONTEND_URL) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>ProLeague Africa</Text>
        <Text style={styles.message}>Set EXPO_PUBLIC_FRONTEND_URL to the PLA web app URL to continue.</Text>
      </SafeAreaView>
    );
  }

  if (!online) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>You are offline</Text>
        <Text style={styles.message}>Reconnect to the internet to use ProLeague Africa.</Text>
        <Pressable style={styles.button} onPress={() => void NetInfo.refresh()}>
          <Text style={styles.buttonText}>Retry connection</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={['#ffffff', '#ffffff']} style={styles.fill}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView style={styles.fill} edges={Platform.OS === 'ios' ? ['top', 'bottom'] : ['top']}>
        {loadError && (
          <Pressable style={styles.errorBanner} onPress={() => webView.current?.reload()}>
            <Text style={styles.bannerText}>Connection lost. Tap to retry.</Text>
          </Pressable>
        )}
        {loading && <ActivityIndicator style={styles.loader} size="large" color="#e3a300" />}
        <WebView
          ref={webView}
          source={source}
          onMessage={handleMessage}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          onLoadStart={() => { setLoading(true); setLoadError(false); }}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setLoadError(true); }}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 500) setLoadError(true);
          }}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url.startsWith('mailto:') || request.url.startsWith('tel:')) {
              void Linking.openURL(request.url);
              return false;
            }
            try {
              const url = new URL(request.url);
              if (url.origin === frontendOrigin) return true;
              if (url.protocol === 'https:' || url.protocol === 'http:') {
                void Linking.openURL(request.url);
                return false;
              }
            } catch {
              return false;
            }
            return false;
          }}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          startInLoadingState={false}
          style={styles.webView}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#ffffff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#ffffff' },
  title: { color: '#17221d', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  message: { color: '#53615a', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  button: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#e3a300' },
  buttonText: { color: '#17221d', fontWeight: '700' },
  errorBanner: { backgroundColor: '#9b2626', padding: 10 },
  bannerText: { color: '#ffffff', textAlign: 'center', fontWeight: '600' },
  loader: { position: 'absolute', top: '50%', left: '50%', zIndex: 2, marginTop: -18, marginLeft: -18 },
  webView: { flex: 1, backgroundColor: '#ffffff' },
});
