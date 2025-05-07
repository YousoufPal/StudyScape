import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);

  const handleAuth = async () => {
    try {
      if (isSignUp) {
        await auth().createUserWithEmailAndPassword(email, password);
        Alert.alert('Success', 'User registered successfully!');
      } else {
        await auth().signInWithEmailAndPassword(email, password);
        Alert.alert('Success', 'User logged in successfully!');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>{isSignUp ? 'Sign Up' : 'Login'}</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />
      <Button title={isSignUp ? 'Sign Up' : 'Login'} onPress={handleAuth} />
      <Button
        title={`Switch to ${isSignUp ? 'Login' : 'Sign Up'}`}
        onPress={() => setIsSignUp(!isSignUp)}
      />
    </View>
  );
};

export default AuthScreen;