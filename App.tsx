// App.tsx
import 'react-native-url-polyfill/auto';    // Should be first for Supabase
import 'react-native-get-random-values'; // For crypto polyfill
import 'react-native-gesture-handler';   // For React Navigation

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { NavigatorScreenParams } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
// If using icons, uncomment and install:
// import Ionicons from '@expo/vector-icons/Ionicons'; // Example icon library

import { AuthProvider, useAuth } from './src/contexts/AuthContext';

import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import SpotDetailScreen from './src/screens/SpotDetailScreen';
import AddReviewScreen from './src/screens/AddReviewScreen';
import AddSpotScreen from './src/screens/AddSpotScreen'; // Import AddSpotScreen
import ProfileScreen from './src/screens/ProfileScreen';


// --- Navigation Param Lists ---
// For type safety. Define all screens and their expected params.

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type HomeStackParamList = {
  HomeList: undefined; //
  SpotDetail: { spotId: string; spotName: string };
  AddReview: { spotId: string; spotName: string };
};

export type MainAppTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  AddSpot: undefined;
  Profile: undefined;
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const HomeStackNavigator = createStackNavigator<HomeStackParamList>();
const MainAppTab = createBottomTabNavigator<MainAppTabParamList>();

// --- Navigator Components ---

function AuthScreens() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

// This stack handles navigation within the "Home" tab
// (e.g., from list of spots to a spot's detail page, then to add a review for that spot)
function HomeStack() {
  return (
    <HomeStackNavigator.Navigator
      // Default screen options for this stack (e.g., header style)
      // screenOptions={{
      //   headerStyle: { backgroundColor: '#fff' },
      //   headerTintColor: '#333',
      //   headerTitleStyle: { fontWeight: 'bold' },
      // }}
    >
      <HomeStackNavigator.Screen
        name="HomeList"
        component={HomeScreen}
        options={{ title: 'Study Spots Melbourne' }}
      />
      <HomeStackNavigator.Screen
        name="SpotDetail"
        component={SpotDetailScreen}
        options={({ route }: any) => ({ // Type route if needed: RouteProp<HomeStackParamList, 'SpotDetail'>
          title: route.params?.spotName || 'Spot Details',
          // headerBackTitle: 'Back', // Optional: customize back button text on iOS
        })}
      />
      <HomeStackNavigator.Screen
        name="AddReview"
        component={AddReviewScreen}
        options={({ route }: any) => ({ // Type route if needed: RouteProp<HomeStackParamList, 'AddReview'>
          title: `Review: ${route.params?.spotName || ''}`,
          // presentation: 'modal', // Optional: if you want it to slide up like a modal
        })}
      />
    </HomeStackNavigator.Navigator>
  );
}

// This is the main navigator for authenticated users, using bottom tabs
function MainAppScreens() {
  return (
    <MainAppTab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#007AFF', // Example active color
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: [ // Example custom tab bar style
          { 
            // display: 'flex', // Default
            // backgroundColor: 'white',
            // borderTopColor: '#eee',
            // borderTopWidth: 1,
            // height: Platform.OS === 'ios' ? 90 : 60, // Adjust height
          },
          null
        ],
        // Example for icons (requires @expo/vector-icons or similar)
        // tabBarIcon: ({ focused, color, size }) => {
        //   let iconName;
        //   if (route.name === 'Home') {
        //     iconName = focused ? 'home' : 'home-outline';
        //   } else if (route.name === 'AddSpot') {
        //     iconName = focused ? 'add-circle' : 'add-circle-outline';
        //   } else if (route.name === 'Profile') {
        //     iconName = focused ? 'person-circle' : 'person-circle-outline';
        //   }
        //   // return <Ionicons name={iconName as any} size={size} color={color} />;
        //   return <View><Text>{route.name.substring(0,1)}</Text></View>; // Placeholder icon
        // },
        // Show header only for specific tabs if needed, HomeStack handles its own.
        headerShown: route.name !== 'Home', 
      })}
    >
      <MainAppTab.Screen
        name="Home" // This is the Tab name
        component={HomeStack} // Nest the HomeStack navigator here
        options={{ 
            title: 'Browse Spots', // Title for the tab label
            // headerShown is false by default due to screenOptions, HomeStack handles its header.
        }} 
      />
      <MainAppTab.Screen
        name="AddSpot"
        component={AddSpotScreen}
        options={{ 
            title: 'Add New Spot', // Title for the tab label AND the header if headerShown is true
        }} 
      />
      <MainAppTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ 
            title: 'My Profile', // Title for the tab label AND the header
        }} 
      />
    </MainAppTab.Navigator>
  );
}

// Root navigator that decides between Auth flow and Main App flow
function AppNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.centeredLoader}>
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

// Main App component
export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centeredLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa', // Match a common app background
  },
});