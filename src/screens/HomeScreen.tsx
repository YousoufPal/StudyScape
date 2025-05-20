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
  Platform,
  Appearance,
  TextInput, // Import TextInput
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { HomeStackParamList } from '../../App';

// ... (StudySpotData interface, constants, etc. remain the same) ...
interface StudySpotData {
  id: string;
  name: string;
  address: string;
  suburb?: string | null;
  latitude: number;
  longitude: number;
  photo_urls?: string[] | null;
  average_overall_rating?: number | null;
  review_count?: number | null; // Ensure this is in your interface if selected
}

type HomeScreenNavigationProp = NavigationProp<HomeStackParamList, 'HomeList'>;

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const MELBOURNE_CBD_COORDS = { /* ... */ latitude: -37.8136, longitude: 144.9631, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA, };


// Debounce function
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
};


export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [spots, setSpots] = useState<StudySpotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region>(MELBOURNE_CBD_COORDS);
  const mapRef = useRef<MapView>(null);
  const colorScheme = Appearance.getColorScheme();

  const [searchText, setSearchText] = useState(''); // State for search text

  const requestLocationPermissions = async () => { /* ... same as before ... */
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      // setError('Permission to access location was denied. Map will center on Melbourne CBD.');
      console.warn('Location permission denied. Centering map on Melbourne CBD.');
      setInitialRegion(MELBOURNE_CBD_COORDS); 
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

  const fetchSpots = async (isRefreshing = false, currentSearchText = searchText) => { // Added currentSearchText param
    if (!isRefreshing && !loading) setLoading(true);
    setError(null);
    try {
      let query = supabase
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
        `)
        .order('name', { ascending: true });

      if (currentSearchText.trim() !== '') {
        // Using 'ilike' for case-insensitive search on 'name' OR 'suburb'
        // For more complex full-text search, Supabase offers .textSearch() with a tsvector column
        const searchTerm = `%${currentSearchText.trim()}%`;
        query = query.or(`name.ilike.${searchTerm},suburb.ilike.${searchTerm}`);
        // If you want to search only name:
        // query = query.ilike('name', `%${currentSearchText.trim()}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Supabase fetch error:', JSON.stringify(fetchError, null, 2));
        throw fetchError;
      }
      
      const validSpots = (data || []).filter(
        (spot: any) => typeof spot.latitude === 'number' && typeof spot.longitude === 'number'
      ) as StudySpotData[]; 

      setSpots(validSpots);

    } catch (e: any) {
      setError(e.message || 'An unknown error occurred');
      console.error('Error in fetchSpots function:', e);
    } finally {
      if (!isRefreshing) setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounced version of fetchSpots for search input
  const debouncedFetchSpots = useCallback(debounce(fetchSpots, 500), []);


  useEffect(() => {
    setLoading(true);
    requestLocationPermissions();
    fetchSpots(false, ''); // Initial fetch without search text
  }, []);

  // Effect to re-fetch spots when searchText changes (debounced)
  useEffect(() => {
    // Don't trigger initial fetch here again, already done in the first useEffect
    // This effect is specifically for subsequent search text changes.
    if (!loading) { // Avoid fetching if initial load is still in progress
      setLoading(true); // Show loading indicator while searching
      debouncedFetchSpots(false, searchText);
    }
  }, [searchText, debouncedFetchSpots]); // Depend on searchText and the debounced function

  useEffect(() => { /* ... map animation effect, same as before ... */
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
    setSearchText(''); // Clear search on refresh
    requestLocationPermissions();
    fetchSpots(true, ''); // Pass true for refreshing and clear search text
  }, []);

  const navigateToSpotDetail = (spot: StudySpotData) => { /* ... same as before ... */ 
    navigation.navigate('SpotDetail', { spotId: spot.id, spotName: spot.name });
  };

  const renderListView = () => { /* ... same as before ... */ 
    return (
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
        ListEmptyComponent={!loading && !error ? ( // Show only if not loading and no error
            <View style={styles.centered}>
                <Text style={styles.noSpotsText}>No spots match your search.</Text>
            </View>
        ) : null}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4A90E2"]} tintColor={"#4A90E2"}/>
        }
        />
    );
  };

  const renderMapView = () => { /* ... same as before ... */ 
    return (
        <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        userInterfaceStyle={colorScheme === 'dark' ? 'dark' : 'light'}
        >
        {spots.map(spot => (
            <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            title={spot.name}
            description={spot.address}
            >
            <Callout onPress={() => navigateToSpotDetail(spot)} tooltip={Platform.OS === 'ios'}>
                <View style={styles.calloutView}>
                <Text style={styles.calloutTitle}>{spot.name}</Text>
                <Text style={styles.calloutDescription} numberOfLines={2}>{spot.address}</Text>
                </View>
            </Callout>
            </Marker>
        ))}
        </MapView>
    );
  };

  if (loading && !refreshing && spots.length === 0 && searchText === '') { // Show full screen loader only on initial load and no search
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading study spots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or suburb..."
          placeholderTextColor="#888"
          value={searchText}
          onChangeText={setSearchText} // Directly update state, useEffect will trigger debounced fetch
          clearButtonMode="while-editing" // iOS clear button
        />
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
      </View>
      
      {/* Display loading indicator during search/filter, but not full screen */}
      {loading && (spots.length > 0 || searchText !== '') && (
        <View style={styles.inlineLoadingContainer}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.inlineLoadingText}>Searching...</Text>
        </View>
      )}


      {error && (viewMode === 'list' || viewMode === 'map') && ( // Show error in both views
        <View style={styles.centeredError}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity onPress={() => fetchSpots(false, searchText)} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
      )}

      {!loading && !error && viewMode === 'list' && renderListView()}
      
      {!loading && !error && viewMode === 'map' && (
        <View style={styles.mapContainer}>
          {spots.length === 0 ? (
            <View style={styles.centeredMapMessage}>
                <Text style={styles.noSpotsText}>No spots match your search.</Text>
            </View>
          ): null}
          {renderMapView()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (most styles from before)
  headerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 10 : 5, // Adjust for status bar
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 45,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 10, // Adjusted from paddingVertical
  },
  centeredMapMessage: { // For "No spots" message on map view
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 249, 250, 0.8)', // Semi-transparent background
  },
  inlineLoadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#f8f9fa' // Match screen background
  },
  inlineLoadingText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#555'
  },
  // Keep other styles like:
  // centered, centeredError, loadingText, container, listContentContainer, itemContainer, itemImage, 
  // itemImagePlaceholder, itemImagePlaceholderText, itemTextContainer, itemName, itemAddress,
  // itemRating, errorText, retryButton, retryButtonText, noSpotsText, mapContainer,
  // calloutView, calloutTitle, calloutDescription, toggleButton, toggleButtonActive,
  // toggleButtonText, toggleButtonTextActive
  centered: { /* ... */ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa', },
  centeredError: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  loadingText: { marginTop: 10, fontSize: 16, color: '#555', },
  container: { flex: 1, backgroundColor: '#f8f9fa', },
  listContentContainer: { paddingVertical: 8, paddingHorizontal: 16, },
  itemContainer: { backgroundColor: '#fff', padding: 15, marginVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4, },
  itemImage: { width: width * 0.22, height: width * 0.22, borderRadius: 10, marginRight: 15, backgroundColor: '#e9ecef', },
  itemImagePlaceholder: { justifyContent: 'center', alignItems: 'center', },
  itemImagePlaceholderText: { fontSize: 12, color: '#adb5bd', },
  itemTextContainer: { flex: 1, justifyContent: 'center', },
  itemName: { fontSize: 17, fontWeight: '600', color: '#343a40', marginBottom: 5, },
  itemAddress: { fontSize: 14, color: '#6c757d', marginBottom: 5, },
  itemRating: { fontSize: 14, color: '#f59e0b', fontWeight: 'bold', marginTop: 2, },
  errorText: { color: '#dc3545', fontSize: 16, textAlign: 'center', marginBottom: 15, },
  retryButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, marginTop:10, },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '500', },
  noSpotsText: { fontSize: 18, color: '#495057', textAlign: 'center', marginBottom: 8, },
  mapContainer: { flex: 1, },
  calloutView: { padding: 10, minWidth: 150, maxWidth: 250, },
  calloutTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 3, color: '#333', },
  calloutDescription: { fontSize: 13, color: '#555', },
  toggleButton: { paddingVertical: 8, paddingHorizontal: 25, borderRadius: 20, marginHorizontal: 5, borderWidth: 1, borderColor: '#007AFF', },
  toggleButtonActive: { backgroundColor: '#007AFF', },
  toggleButtonText: { color: '#007AFF', fontWeight: '500', fontSize: 15, },
  toggleButtonTextActive: { color: '#fff', },
});