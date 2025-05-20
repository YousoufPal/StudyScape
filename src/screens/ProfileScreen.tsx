// src/screens/ProfileScreen.tsx
import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigation to Auth screens will be handled by AppNavigator
    } catch (error: any) {
      Alert.alert("Sign Out Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {user && <Text style={styles.emailText}>Logged in as: {user.email}</Text>}
      <View style={styles.buttonContainer}>
        <Button title="Sign Out" onPress={handleSignOut} color="#FF3B30" />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  emailText: { fontSize: 16, marginBottom: 30 },
  buttonContainer: { width: '80%', marginTop: 20 },
});