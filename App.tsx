// App.tsx
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values'; // <-- ADD THIS IMPORT
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet } from 'react-native'; // For loading indicator

import { AuthProvider, useAuth } from './src/contexts/AuthContext';

import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen'; // Placeholder
import ProfileScreen from './src/screens/ProfileScreen'; // Placeholder
import SpotDetailScreen from './src/screens/SpotDetailScreen';
import AddReviewScreen from './src/screens/AddReviewScreen';

// Define Param Lists for type safety (optional but good practice)
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type HomeStackParamList = {
  HomeList: undefined; // Changed from 'Home' to avoid conflict with Tab name
  SpotDetail: { spotId: string; spotName: string };
  AddReview: { spotId: string; spotName: string };
};

export type MainAppTabParamList = {
  Home: undefined; // This refers to the HomeStack
  // AddSpot: undefined; // For later
  Profile: undefined;
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const HomeStackNavigator = createStackNavigator<HomeStackParamList>(); // Renamed
const MainAppTab = createBottomTabNavigator<MainAppTabParamList>();

function AuthScreens() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

function HomeStack() {
  return (
    <HomeStackNavigator.Navigator>
      <HomeStackNavigator.Screen
        name="HomeList"
        component={HomeScreen}
        options={{ title: 'Melbourne Study Spots' }}
      />
      <HomeStackNavigator.Screen 
        name="SpotDetail" 
        component={SpotDetailScreen} 
        options={({ route }: any) => ({ title: route.params?.spotName || 'Details' })} 
      /> 
      <HomeStackNavigator.Screen // <-- ADD THIS SCREEN
        name="AddReview"
        component={AddReviewScreen}
        // options can be dynamic too, or set in AddReviewScreen via navigation.setOptions
        // options={({ route }: any) => ({ title: `Review: ${route.params?.spotName}` })} 
      />
    </HomeStackNavigator.Navigator>
  );
}

function MainAppScreens() {
  return (
    <MainAppTab.Navigator>
      <MainAppTab.Screen
        name="Home" // Tab name
        component={HomeStack} // Use the HomeStack navigator here
        options={{
          headerShown: false, // The stack inside handles its own header
          // tabBarIcon: ({ color, size }) => ( /* Add icon here */ ),
        }}
      />
      {/* <MainAppTab.Screen name="AddSpot" component={AddSpotScreen} /> */}
      <MainAppTab.Screen
        name="Profile"
        component={ProfileScreen}
        // options={{ tabBarIcon: ({ color, size }) => ( /* Add icon here */ ) }}
      />
    </MainAppTab.Navigator>
  );
}

function AppNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session && session.user ? <MainAppScreens /> : <AuthScreens />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});