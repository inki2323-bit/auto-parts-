import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { loginWithEmail, registerWithEmail } from '../services/firebase';

export function AuthScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Authentication', 'Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const user = await registerWithEmail(email.trim(), password.trim());
        Alert.alert('Sign Up Successful', `Account created for ${user.email}`);
      } else {
        const user = await loginWithEmail(email.trim(), password.trim());
        Alert.alert('Welcome Back', `Logged in as ${user.email}`);
      }
      navigation.navigate('MainTabs');
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>Auto Parts Marketplace</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {isSignUp ? 'Create an account to post ads & buy spare parts' : 'Sign in to access your listings & chat'}
      </Text>

      <TextInput
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        mode="outlined"
        style={styles.input}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0056D2" style={styles.loader} />
      ) : (
        <>
          <Button mode="contained" onPress={handleAuth} style={styles.btn}>
            {isSignUp ? 'Sign Up with Email' : 'Sign In with Email'}
          </Button>

          <Button 
            mode="text" 
            onPress={() => setIsSignUp(!isSignUp)} 
            style={styles.toggleBtn}
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </Button>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontWeight: '800',
    color: '#0056D2',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  btn: {
    marginTop: 8,
    borderRadius: 8,
  },
  toggleBtn: {
    marginTop: 12,
  },
  loader: {
    marginVertical: 16,
  }
});
