import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface OfflineScreenProps {
  onRetry: () => void;
}

// ─── Floating dot decoration ──────────────────────────────────────────────────
const FloatingDot = ({
  size, top, left, opacity, delay,
}: {
  size: number; top: number; left: number; opacity: number; delay: number;
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim, delay]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <Animated.View
      style={{
        position: 'absolute', top, left,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: `rgba(255,255,255,${opacity})`,
        transform: [{ translateY }],
      }}
    />
  );
};

export const OfflineScreen: React.FC<OfflineScreenProps> = ({ onRetry }) => {
  // ── Entrance animations ──
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.stagger(140, [
      Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 10 }),
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 12 }),
    ]).start();

    // Pulse the signal icon forever
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [cardAnim, logoAnim, pulseAnim]);

  const handleRetryPressIn = () => Animated.spring(btnScale, { toValue: 0.93, useNativeDriver: true, tension: 200, friction: 8 }).start();
  const handleRetryPressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }).start();

  return (
    <LinearGradient
      colors={['#14532d', '#15803d', '#16a34a', '#0d9488']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {/* ── Decorative floating dots ── */}
      <FloatingDot size={80} top={-20} left={-20} opacity={0.07} delay={0} />
      <FloatingDot size={120} top={height * 0.1} left={width * 0.7} opacity={0.05} delay={400} />
      <FloatingDot size={60} top={height * 0.4} left={-10} opacity={0.08} delay={800} />
      <FloatingDot size={100} top={height * 0.7} left={width * 0.8} opacity={0.06} delay={200} />
      <FloatingDot size={40} top={height * 0.85} left={width * 0.2} opacity={0.09} delay={600} />

      {/* ── Radial glow behind card ── */}
      <View style={styles.glowCircle} />

      <SafeAreaView style={styles.safe}>

        {/* ── Logo block ── */}
        <Animated.View style={[
          styles.logoBlock,
          {
            opacity: logoAnim,
            transform: [{
              translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }),
            }],
          },
        ]}>
          <View style={styles.logoRing}>
            <Image
              source={require('../../assets/pla-icon.png')}
              style={styles.logoImg}
              resizeMode="contain"
              onError={(e) => console.error('❌ Logo image failed to load:', e.nativeEvent)}
            />
          </View>
          <Text style={styles.brandName}>ProLeague Africa</Text>
          <Text style={styles.brandSub}>Football & esports</Text>
        </Animated.View>

        {/* ── Card ── */}
        <Animated.View style={[
          styles.card,
          {
            opacity: cardAnim,
            transform: [{
              translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
            }],
          },
        ]}>

          {/* Signal icon */}
          <Animated.Text style={[styles.signalIcon, { transform: [{ scale: pulseAnim }] }]}>
            📡
          </Animated.Text>

          <Text style={styles.cardTitle}>No Connection</Text>
          <Text style={styles.cardBody}>
            You&apos;re offline. Once you&apos;re back online, your app will pick up right where you left off.
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Tips row */}
          {[
            { icon: '📶', tip: 'Check your Wi-Fi or mobile data' },
            { icon: '✈️', tip: 'Make sure airplane mode is off' },
            { icon: '🔄', tip: 'Try toggling your connection' },
          ].map((item, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={styles.tipIcon}>{item.icon}</Text>
              <Text style={styles.tipText}>{item.tip}</Text>
            </View>
          ))}

          {/* Retry button */}
          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={onRetry}
              onPressIn={handleRetryPressIn}
              onPressOut={handleRetryPressOut}
              activeOpacity={1}
            >
              <LinearGradient
                colors={['#15803d', '#0d9488']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.retryGradient}
              >
                <Text style={styles.retryText}>Try Again</Text>
                <Text style={styles.retryArrow}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

        </Animated.View>

        {/* ── Footer ── */}
        <Animated.Text style={[styles.footer, { opacity: cardAnim }]}>
          Powered by{' '}
          <Text style={styles.footerBrand}>ProLeague Africa</Text>
        </Animated.Text>

      </SafeAreaView>
    </LinearGradient>
  );
};

const CARD_RADIUS = 28;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // ── Radial glow ──
  glowCircle: {
    position: 'absolute',
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: width * 0.7,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: height * 0.25,
    left: -(width * 0.2),
  },

  // ── Logo ──
  logoBlock: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    // glass depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  logoImg: {
    width: 46,
    height: 46,
  },
  brandName: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // ── Card ──
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: CARD_RADIUS,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 14,
  },

  signalIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardBody: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
    paddingHorizontal: 4,
  },

  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 20,
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  tipIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  tipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },

  // ── Retry button ──
  retryBtn: {
    width: '100%',
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  retryArrow: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Footer ──
  footer: {
    marginTop: 28,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  footerBrand: {
    color: 'rgba(255,255,255,0.90)',
    fontWeight: '800',
  },
});

export default OfflineScreen;