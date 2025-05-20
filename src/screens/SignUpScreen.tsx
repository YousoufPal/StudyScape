// src/screens/SignUpScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation, NavigationProp } from '@react-navigation/native';

type AuthStackParamList = { Login: undefined; SignUp: undefined; };
type SignUpScreenNavigationProp = NavigationProp<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen() {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(''); // Optional: for display name
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
        Alert.alert("Input required", "Please enter both email and password.");
        return;
    }
    setLoading(true);
    const { data: { session }, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { // This data is passed to the 'handle_new_user' trigger for profile creation
          display_name: displayName || email.split('@')[0], // Default display name
        },
      },
    });

    if (error) {
      Alert.alert('Sign Up Error', error.message);
    } else if (!session) {
      Alert.alert('Sign Up Successful!', 'Please check your email to confirm your account.');
      // You might want to navigate to login or show a message here
      navigation.navigate('Login');
    }
    // If auto-confirm is on or email is already confirmed, session will exist, and AuthProvider will navigate
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create Account</Text>
      <TextInput
        placeholder="Display Name (Optional)"
        value={displayName}
        onChangeText={setDisplayName}
        style={styles.input}
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#888"
      />
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.buttonSpacing}/>
      ) : (
        <TouchableOpacity style={[styles.button, styles.buttonSpacing]} onPress={handleSignUp}>
            <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.switchButton}>
        <Text style={styles.switchButtonText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}
// Use similar styles as LoginScreen.tsx or create a shared style file
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 25, backgroundColor: '#f0f4f7' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#333' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  buttonSpacing: {
    marginTop: 10,
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});