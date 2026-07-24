import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, StatusBar, Image } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';

interface SplashScreenProps {
  onAnimationFinish?: () => void;
  statusText?: string;
}

export function SplashScreen({ statusText = 'Connecting Marketplace...' }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2563EB" barStyle="light-content" />
      
      {/* Background Glow */}
      <View style={styles.glowCircle} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text variant="headlineMedium" style={styles.title}>
          AUTO PARTS
        </Text>
        <Text variant="titleMedium" style={styles.subtitle}>
          MARKETPLACE
        </Text>
        <Text variant="bodySmall" style={styles.tagline}>
          Premium Automotive Marketplace
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#10B981" style={styles.loader} />
        <Text variant="labelMedium" style={styles.statusText}>
          {statusText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  glowCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#10B981',
    opacity: 0.25,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 28,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  logoImage: {
    width: 130,
    height: 130,
  },
  title: {
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    fontSize: 26,
  },
  subtitle: {
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 3,
    marginTop: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontSize: 14,
  },
  tagline: {
    color: '#CBD5E1',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
  },
  loader: {
    marginBottom: 8,
  },
  statusText: {
    color: '#E2E8F0',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '600',
  },
});
