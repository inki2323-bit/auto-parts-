import React, { useState, useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Image } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconButton } from 'react-native-paper';

import { HomeScreen } from '../screens/HomeScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { SellPartScreen } from '../screens/SellPartScreen';
import { ChatsScreen } from '../screens/ChatsScreen';
import { ChatRoomScreen } from '../screens/ChatRoomScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { SellerProfileScreen } from '../screens/SellerProfileScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { subscribeAuth } from '../services/firebase';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HeaderLogo() {
  return (
    <View style={styles.headerLogoContainer}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.headerLogoImage}
        resizeMode="contain"
      />
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { fontWeight: '800', color: '#0F172A', fontSize: 18 },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Auto Parts',
          headerLeft: () => <HeaderLogo />,
          tabBarIcon: ({ color, size }) => <IconButton icon="storefront" iconColor={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Sell"
        component={SellPartScreen}
        options={{
          title: 'Sell Part',
          tabBarIcon: ({ color, size }) => <IconButton icon="plus-circle" iconColor={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => <IconButton icon="message-text" iconColor={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <IconButton icon="account" iconColor={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeAuth((currentUser) => {
      if (!isMounted) return;
      setUser(currentUser);

      Animated.sequence([
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMounted) {
          setInitializing(false);
        }
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [contentOpacity, splashOpacity]);

  if (initializing) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]}>
        <SplashScreen statusText="Connecting Marketplace..." />
      </Animated.View>
    );
  }

  const initialRoute = user ? "MainTabs" : "Auth";

  return (
    <Animated.View style={[styles.mainContainer, { opacity: contentOpacity }]}>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{ 
          headerBackTitleVisible: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ title: 'Part Details' }}
        />
        <Stack.Screen
          name="ChatRoom"
          component={ChatRoomScreen}
          options={{ title: 'Chat with Seller' }}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminScreen}
          options={{ title: 'Admin Operations' }}
        />
        <Stack.Screen
          name="SellerProfile"
          component={SellerProfileScreen}
          options={{ title: 'Seller Profile' }}
        />
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ title: 'Sign In' }}
        />
      </Stack.Navigator>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#2563EB',
  },
  mainContainer: {
    flex: 1,
  },
  headerLogoContainer: {
    marginLeft: 16,
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 30,
    height: 30,
  },
});
