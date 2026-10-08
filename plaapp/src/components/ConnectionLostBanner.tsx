import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';

interface ConnectionLostBannerProps {
  visible: boolean;
  onRetry: () => void;
  message?: string;
}

export const ConnectionLostBanner: React.FC<ConnectionLostBannerProps> = ({
  visible,
  onRetry,
  message = 'Connection lost',
}) => {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [opacity, translateY, visible]);

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY }], opacity },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Left: icon + message */}
      <View style={styles.left}>
        <View style={styles.iconDot}>
          <View style={styles.iconDotInner} />
        </View>
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
      </View>

      {/* Right: retry button */}
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={onRetry}
        activeOpacity={0.75}
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    zIndex:          9999,
    backgroundColor: '#D32F2F',        // Material-red 700 — assertive but not neon
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingTop:      Platform.OS === 'ios' ? 54 : 12,   // clears status bar
    paddingBottom:   12,
    paddingHorizontal: 16,
    // subtle depth
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.22,
    shadowRadius:    6,
    elevation:       8,
  },

  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    flex:          1,
  },

  // pulsing red dot indicator
  iconDot: {
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  iconDotInner: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: '#FFFFFF',
  },

  message: {
    color:      '#FFFFFF',
    fontSize:   14,
    fontWeight: '600',
    letterSpacing: 0.1,
    flexShrink: 1,
  },

  retryBtn: {
    backgroundColor:   'rgba(255,255,255,0.18)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.40)',
    borderRadius:      6,
    paddingHorizontal: 14,
    paddingVertical:   6,
    marginLeft:        12,
    flexShrink:        0,
  },
  retryText: {
    color:      '#FFFFFF',
    fontSize:   13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default ConnectionLostBanner;