import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import BackgroundService from './src/services/BackgroundService';
import DeviceSocketService from './src/services/DeviceSocketService';
import NotificationService from './src/services/NotificationService';
import PermissionManager from './src/services/PermissionManager';
import { SOCKET_EVENTS, CONSTANTS } from './src/utils/constants';
import { logger } from './src/utils/logger';
import { ConnectionLostBanner } from './src/components/ConnectionLostBanner';
import { OfflineScreen } from './src/components/OfflineScreen';

type NativeMessage = {
  type?: string;
  payload?: Record<string, unknown>;
  requestId?: string;
};

const SOCKET_EVENTS_TO_FORWARD = [
  SOCKET_EVENTS.NOTIFICATION_NEW,
  SOCKET_EVENTS.NOTIFICATION_BROADCAST,
  SOCKET_EVENTS.SYSTEM_ANNOUNCEMENT,
  SOCKET_EVENTS.WALLET_UPDATED,
  SOCKET_EVENTS.MATCH_RESULT_READY,
  SOCKET_EVENTS.MATCH_SUBMISSION_RECEIVED,
  SOCKET_EVENTS.MATCH_POSTPONE_RESPONSE,
  SOCKET_EVENTS.MATCH_DISPUTE_OPENED,
  SOCKET_EVENTS.LEADERBOARD_UPDATED,
  SOCKET_EVENTS.DEVICE_SESSION_REPLACED,
] as const;

function injectWebEvent(
  webView: WebView | null,
  eventName: 'pla:native-message' | 'pla:native-response',
  detail: unknown,
): void {
  if (!webView) return;
  const safeDetail = JSON.stringify(detail).replace(/</g, '\\u003c');
  webView.injectJavaScript(
    `window.dispatchEvent(new CustomEvent('${eventName}',{detail:${safeDetail}}));true;`,
  );
}

export default function AppContent() {
  const webViewRef = useRef<WebView>(null);
  const sessionRef = useRef<{ userId: string | number; token: string } | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  const sendToWebView = useCallback((type: string, payload: unknown) => {
    injectWebEvent(webViewRef.current, 'pla:native-message', { type, payload });
  }, []);

  const sendResponse = useCallback((message: NativeMessage, payload: unknown, error?: string) => {
    if (!message.requestId) return;
    injectWebEvent(webViewRef.current, 'pla:native-response', {
      type: message.type,
      requestId: message.requestId,
      payload,
      error,
    });
  }, []);

  const initializeServices = useCallback(async (payload: Record<string, unknown>) => {
    const userId = payload.userId;
    const token = payload.authToken;
    if (
      (typeof userId !== 'string' && typeof userId !== 'number')
      || !String(userId)
      || typeof token !== 'string'
      || !token
    ) {
      throw new Error('A signed-in PLA user and access token are required');
    }

    sessionRef.current = { userId, token };
    DeviceSocketService.clearHandlers();
    await NotificationService.initialize((type, notification) => {
      sendToWebView(type, notification);
    });

    for (const eventName of SOCKET_EVENTS_TO_FORWARD) {
      DeviceSocketService.on(eventName, (payloadData) => {
        sendToWebView(eventName, payloadData);
        if (eventName === SOCKET_EVENTS.NOTIFICATION_NEW) {
          const notification = payloadData as { title?: unknown; body?: unknown; data?: unknown };
          if (typeof notification?.title === 'string' && typeof notification.body === 'string') {
            void NotificationService.show({
              title: notification.title,
              body: notification.body,
              data: notification.data && typeof notification.data === 'object'
                ? notification.data as Record<string, unknown>
                : undefined,
            }).catch((error: unknown) => logger.warn('Could not display a PLA notification', error));
          }
        }
      });
    }
    DeviceSocketService.on(SOCKET_EVENTS.CONNECTED, () => {
      sendToWebView('SOCKET_CONNECTED', {});
    });
    DeviceSocketService.on(SOCKET_EVENTS.DISCONNECTED, (payloadData) => {
      sendToWebView('SOCKET_DISCONNECTED', payloadData);
    });

    const socketConnected = await BackgroundService.start({ userId, token });
    return { success: true, socketConnected };
  }, [sendToWebView]);

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    let message: NativeMessage;
    try {
      message = JSON.parse(event.nativeEvent.data) as NativeMessage;
    } catch (error) {
      logger.warn('Ignored an invalid message from the PLA web app', error);
      return;
    }

    try {
      const payload = message.payload ?? {};
      switch (message.type) {
        case 'INITIALIZE_SERVICES':
          sendResponse(message, await initializeServices(payload));
          break;
        case 'DISCONNECT_SOCKET':
          sessionRef.current = null;
          BackgroundService.stop();
          NotificationService.cleanup();
          DeviceSocketService.clearHandlers();
          sendResponse(message, { success: true });
          break;
        case 'REQUEST_PERMISSION':
          sendResponse(message, {
            status: await PermissionManager.request(String(payload.permissionType ?? '')),
          });
          break;
        case 'CHECK_PERMISSION':
          sendResponse(message, {
            status: await PermissionManager.check(String(payload.permissionType ?? '')),
          });
          break;
        case 'SHOW_NOTIFICATION':
          if (typeof payload.title !== 'string' || typeof payload.body !== 'string') {
            throw new Error('Notification title and body are required');
          }
          await NotificationService.show({
            title: payload.title,
            body: payload.body,
            data: payload.data && typeof payload.data === 'object'
              ? payload.data as Record<string, unknown>
              : undefined,
          });
          sendResponse(message, { success: true });
          break;
        case 'RECONNECT_SOCKET':
          if (!sessionRef.current) throw new Error('Sign in before reconnecting the PLA socket');
          BackgroundService.stop();
          sendResponse(message, await initializeServices({
            userId: sessionRef.current.userId,
            authToken: sessionRef.current.token,
          }));
          break;
        default:
          throw new Error(`Unsupported native message: ${message.type ?? 'unknown'}`);
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'PLA native service failed';
      logger.error('PLA native bridge request failed', error);
      sendResponse(message, null, messageText);
    }
  }, [initializeServices, sendResponse]);

  useEffect(() => {
    let mounted = true;
    void NetInfo.fetch().then((state) => {
      if (mounted) setIsConnected(state.isConnected ?? false);
    });
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });
    return () => {
      mounted = false;
      unsubscribe();
      BackgroundService.stop();
      NotificationService.cleanup();
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  if (!isConnected) {
    return <OfflineScreen onRetry={() => void NetInfo.refresh()} />;
  }

  let frontendOrigin = '';
  try {
    frontendOrigin = new URL(CONSTANTS.FRONTEND_URL).origin;
  } catch (error) {
    logger.error('The PLA frontend URL is invalid', error);
  }

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={styles.fill}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.fill} edges={Platform.OS === 'ios' ? ['top', 'bottom'] : ['top']}>
        <ConnectionLostBanner
          visible={hasError}
          onRetry={() => webViewRef.current?.reload()}
          message="Connection lost"
        />
        {isLoading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#E3A300" />
            <Text style={styles.loadingText}>Loading ProLeague Africa…</Text>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: CONSTANTS.FRONTEND_URL }}
          onMessage={handleMessage}
          onNavigationStateChange={(navigation) => setCanGoBack(navigation.canGoBack)}
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 500) setHasError(true);
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
              }
            } catch (error) {
              logger.warn('Blocked an invalid WebView navigation URL', error);
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
  fill: { flex: 1, backgroundColor: '#FFFFFF' },
  webView: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: { marginTop: 12, color: '#17221D', fontSize: 15 },
});
