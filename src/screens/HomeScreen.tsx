// src/screens/HomeScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  Dimensions,
  Platform, // For platform-specific map settings
  Appearance, // For dark mode map style
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Region } from 'react-native-maps'; // Import MapView and Marker
import * as Location from 'expo-location'; // For user location
import { supabase } from '../lib/supabase';
import { HomeStackParamList } from '../../App';

// Interface for StudySpot data (ensure latitude and longitude are numbers)
interface StudySpotData {
  id: string;
  name: string;
  address: string;
  suburb?: string | null;
  latitude: number; // Must be a number for the map
  longitude: number; // Must be a number for the map
  photo_urls?: string[] | null;
  average_overall_rating?: number | null;
}

type HomeScreenNavigationProp = NavigationProp<HomeStackParamList, 'HomeList'>;

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922; // Standard delta for zoom level
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const MELBOURNE_CBD_COORDS = {
  latitude: -37.8136, // Melbourne CBD
  longitude: 144.9631,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [spots, setSpots] = useState<StudySpotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list'); // 'list' or 'map'
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region>(MELBOURNE_CBD_COORDS);
  const mapRef = useRef<MapView>(null);
  const colorScheme = Appearance.getColorScheme();

  // Fetch User Location
  const requestLocationPermissions = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access location was denied. Map will center on Melbourne CBD.');
      setInitialRegion(MELBOURNE_CBD_COORDS); // Default to Melbourne
      return;
    }
    try {
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
      setInitialRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    } catch (e) {
        console.warn("Could not get user location, defaulting to Melbourne CBD.", e);
        setInitialRegion(MELBOURNE_CBD_COORDS);
    }
  };

  const fetchSpots = async (isRefreshing = false) => {
    if (!isRefreshing && !loading) setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('study_spots')
        .select(`
          id,
          name,
          address,
          suburb,
          latitude,
          longitude,
          photo_urls, 
          average_overall_rating,
          review_count 
        `) // NO COMMENTS INSIDE THIS TEMPLATE LITERAL
        .order('name', { ascending: true });

      if (fetchError) {
        // Log the detailed Supabase error
        console.error('Supabase fetch error:', JSON.stringify(fetchError, null, 2));
        throw fetchError;
      }
      
      const validSpots = (data || []).filter(
        (spot: any) => typeof spot.latitude === 'number' && typeof spot.longitude === 'number'
      ) as StudySpotData[]; 

      setSpots(validSpots);

    } catch (e: any) {
      // This will catch the error thrown above or other JS errors
      setError(e.message || 'An unknown error occurred');
      console.error('Error in fetchSpots function:', e);
    } finally {
      if (!isRefreshing) setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    setLoading(true);
    requestLocationPermissions(); // Request location first
    fetchSpots();
  }, []);

  useEffect(() => {
    // If user location is fetched after spots, and map is active, animate to user
    if (userLocation && mapRef.current && viewMode === 'map') {
        mapRef.current.animateToRegion({
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
        }, 1000);
    }
  }, [userLocation, viewMode]);


  const onRefresh = useCallback(() => {
    setRefreshing(true);
    requestLocationPermissions(); // Re-fetch location on refresh
    fetchSpots(true);
  }, []);

  const navigateToSpotDetail = (spot: StudySpotData) => {
    navigation.navigate('SpotDetail', { spotId: spot.id, spotName: spot.name });
  };


  const renderListView = () => (
    <FlatList
      data={spots}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.itemContainer} onPress={() => navigateToSpotDetail(item)}>
          {item.photo_urls && item.photo_urls.length > 0 && item.photo_urls[0] ? (
            <Image source={{ uri: item.photo_urls[0] }} style={styles.itemImage} />
          ) : (
            <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                <Text style={styles.itemImagePlaceholderText}>No Image</Text>
            </View>
          )}
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
            <Text style={styles.itemAddress} numberOfLines={2} ellipsizeMode="tail">
                {item.address}{item.suburb ? `, ${item.suburb}` : ''}
            </Text>
            {item.average_overall_rating !== undefined && item.average_overall_rating !== null && item.average_overall_rating > 0 && (
                <Text style={styles.itemRating}>★ {item.average_overall_rating.toFixed(1)}</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      keyExtractor={item => item.id.toString()}
      contentContainerStyle={styles.listContentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4A90E2"]} tintColor={"#4A90E2"}/>
      }
    />
  );

  const renderMapView = () => (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFillObject} // MapView should fill its container
      provider={PROVIDER_GOOGLE} // Or null for default (Apple Maps on iOS, Google Maps on Android if available)
      initialRegion={initialRegion}
      showsUserLocation={true}
      showsMyLocationButton={true} // Shows a button to center on user location
      userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'} // For dark mode map
      // onRegionChangeComplete={setInitialRegion} // Optional: update region state on map move
    >
      {spots.map(spot => (
        <Marker
          key={spot.id}
          coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
          title={spot.name}
          description={spot.address}
        >
          <Callout onPress={() => navigateToSpotDetail(spot)} tooltip={Platform.OS === 'ios'}>
            {/* Tooltip style for iOS makes the whole callout tappable */}
            {/* For Android, the default callout might be better or requires custom view */}
            <View style={styles.calloutView}>
              <Text style={styles.calloutTitle}>{spot.name}</Text>
              <Text style={styles.calloutDescription} numberOfLines={2}>{spot.address}</Text>
              {/* Add a small image or rating if desired */}
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );

  if (loading && !refreshing && spots.length === 0) { // Show full screen loader only on initial load
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading study spots...</Text>
      </View>
    );
  }
  
  // Handle case where location permission is denied and spots are still loading or not found
  if (!userLocation && initialRegion === MELBOURNE_CBD_COORDS && loading && !refreshing){
     // Can show a specific message or just the general loader
  }


  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
          onPress={() => setViewMode('list')}>
          <Text style={[styles.toggleButtonText, viewMode === 'list' && styles.toggleButtonTextActive]}>List</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
          onPress={() => setViewMode('map')}>
          <Text style={[styles.toggleButtonText, viewMode === 'map' && styles.toggleButtonTextActive]}>Map</Text>
        </TouchableOpacity>
      </View>

      {error && viewMode === 'list' && ( // Show error only in list view, or adapt for map
        <View style={styles.centeredError}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity onPress={() => fetchSpots()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
      )}

      {viewMode === 'list' && (
        spots.length === 0 && !loading && !error ? (
            <View style={styles.centered}>
                <Text style={styles.noSpotsText}>No study spots found.</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Refresh</Text>
                </TouchableOpacity>
            </View>
        ) : renderListView()
      )}
      
      {viewMode === 'map' && (
        <View style={styles.mapContainer}>
          {renderMapView()}
          {/* You could overlay a search bar or filters on the map here too */}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (centered, loadingText, container, listContentContainer, itemContainer, etc. from previous HomeScreen)
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  centeredError: { // Specific style for error message area in list view
    flex: 1, // Take up space if list is empty due to error
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff', // Slight background for the toggle
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleButtonText: {
    color: '#007AFF',
    fontWeight: '500',
    fontSize: 15,
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  mapContainer: {
    flex: 1, // Ensure map view takes available space
  },
  // List styles (copied and adjusted from previous message)
  listContentContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  itemImage: {
    width: width * 0.22,
    height: width * 0.22,
    borderRadius: 10,
    marginRight: 15,
    backgroundColor: '#e9ecef',
  },
  itemImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImagePlaceholderText: {
    fontSize: 12,
    color: '#adb5bd',
  },
  itemTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 5,
  },
  itemAddress: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
  itemRating: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: 'bold',
    marginTop: 2,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop:10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  noSpotsText: {
    fontSize: 18,
    color: '#495057',
    textAlign: 'center',
    marginBottom: 8,
  },
  // Callout styles for map markers
  calloutView: {
    padding: 10,
    minWidth: 150, // Ensure callout has some width
    maxWidth: 250,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#333',
  },
  calloutDescription: {
    fontSize: 13,
    color: '#555',
  },
});