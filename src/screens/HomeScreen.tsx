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
  TextInput,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { HomeStackParamList } from '../../App';

// ... (StudySpotData interface, constants, debounce function remain the same) ...
interface StudySpotData {
  id: string;
  name: string;
  address: string;
  suburb?: string | null;
  latitude: number;
  longitude: number;
  photo_urls?: string[] | null;
  average_overall_rating?: number | null;
  review_count?: number | null;
  // Add amenity fields if you're going to display them directly or need them for filtering logic
  amenity_wifi?: boolean | null;
  amenity_power_outlets_available?: boolean | null;
}
type HomeScreenNavigationProp = NavigationProp<HomeStackParamList, 'HomeList'>;
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const MELBOURNE_CBD_COORDS = { latitude: -37.8136, longitude: 144.9631, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA };
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => { /* ... */ 
  let timeout: NodeJS.Timeout | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) { clearTimeout(timeout); timeout = null; }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced as (...args: Parameters<F>) => ReturnType<F>;
};


export default function HomeScreen() {
  // ... (navigation, spots, loading, error, refreshing, viewMode, userLocation, initialRegion, mapRef, colorScheme states remain) ...
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


  const [searchText, setSearchText] = useState('');
  
  // --- Filter States ---
  // Using 'all', 'yes', 'no' for more flexibility later, or just boolean
  type FilterState = 'all' | 'yes'; // For MVP, 'yes' means true, 'all' means no filter for this amenity
  const [wifiFilter, setWifiFilter] = useState<FilterState>('all');
  const [powerFilter, setPowerFilter] = useState<FilterState>('all');

  const requestLocationPermissions = async () => { /* ... same as before ... */ 
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission denied. Centering map on Melbourne CBD.');
      setInitialRegion(MELBOURNE_CBD_COORDS); 
      return;
    }
    try {
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
      setInitialRegion({ latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA });
    } catch (e) {
      console.warn("Could not get user location, defaulting to Melbourne CBD.", e);
      setInitialRegion(MELBOURNE_CBD_COORDS);
    }
  };

  const fetchSpots = async (
    isRefreshing = false,
    currentSearchText = searchText,
    currentWifiFilter = wifiFilter, // Pass current filter states
    currentPowerFilter = powerFilter
  ) => {
    if (!isRefreshing && !loading) setLoading(true); // Show loading for new fetches/filters
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
          review_count,
          amenity_wifi, 
          amenity_power_outlets_available 
        `) // Ensure amenity columns are selected
        .order('name', { ascending: true });

      // Apply Search Filter
      if (currentSearchText.trim() !== '') {
        const searchTerm = `%${currentSearchText.trim()}%`;
        query = query.or(`name.ilike.${searchTerm},suburb.ilike.${searchTerm}`);
      }

      // Apply Amenity Filters
      if (currentWifiFilter === 'yes') {
        query = query.eq('amenity_wifi', true);
      }
      // If you wanted a 'no' option: else if (currentWifiFilter === 'no') { query = query.eq('amenity_wifi', false); }

      if (currentPowerFilter === 'yes') {
        query = query.eq('amenity_power_outlets_available', true);
      }
      // If you wanted a 'no' option: else if (currentPowerFilter === 'no') { query = query.eq('amenity_power_outlets_available', false); }


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

  const debouncedFetchSpotsForSearch = useCallback(debounce((currentSearchText: string) => {
    fetchSpots(false, currentSearchText, wifiFilter, powerFilter);
  }, 500), [wifiFilter, powerFilter]); // Recreate debounce if filters change

  useEffect(() => {
    setLoading(true);
    requestLocationPermissions();
    fetchSpots(false, '', 'all', 'all'); // Initial fetch without search or filters
  }, []);

  useEffect(() => {
    if (!loading) { // Avoid fetching if initial load is still in progress
      setLoading(true);
      debouncedFetchSpotsForSearch(searchText);
    }
  }, [searchText, debouncedFetchSpotsForSearch]);

  // Effect to re-fetch when filters change (no debounce needed here as it's a direct tap)
  useEffect(() => {
      // Avoid re-fetching on initial mount if loading is true (handled by first useEffect)
      if (!loading) {
        setLoading(true);
        fetchSpots(false, searchText, wifiFilter, powerFilter);
      }
  }, [wifiFilter, powerFilter]); // Re-fetch if wifiFilter or powerFilter changes, but not searchText here


  useEffect(() => { /* ... map animation effect ... */ 
    if (userLocation && mapRef.current && viewMode === 'map') {
        mapRef.current.animateToRegion({ latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA }, 1000);
    }
  }, [userLocation, viewMode]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchText('');
    setWifiFilter('all'); // Reset filters on refresh
    setPowerFilter('all');
    requestLocationPermissions();
    fetchSpots(true, '', 'all', 'all');
  }, []);

  const navigateToSpotDetail = (spot: StudySpotData) => { /* ... same as before ... */ navigation.navigate('SpotDetail', { spotId: spot.id, spotName: spot.name });};

  const toggleFilter = (filterType: 'wifi' | 'power') => {
    if (filterType === 'wifi') {
      setWifiFilter(prev => prev === 'yes' ? 'all' : 'yes');
    } else if (filterType === 'power') {
      setPowerFilter(prev => prev === 'yes' ? 'all' : 'yes');
    }
    // The useEffect for wifiFilter/powerFilter will trigger the fetch
  };

  const renderListView = () => { /* ... same as before, but added ListEmptyComponent logic ... */ 
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
        ListEmptyComponent={!loading && !error ? (
            <View style={styles.centered}>
                <Text style={styles.noSpotsText}>No spots match your criteria.</Text>
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

  if (loading && !refreshing && spots.length === 0 && searchText === '' && wifiFilter === 'all' && powerFilter === 'all') {
    // More specific condition for initial full screen loader
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
          onChangeText={setSearchText}
          clearButtonMode="while-editing"
        />
        {/* --- Filter Buttons --- */}
        <View style={styles.filterButtonsContainer}>
          <TouchableOpacity
            style={[styles.filterButton, wifiFilter === 'yes' && styles.filterButtonActive]}
            onPress={() => toggleFilter('wifi')}>
            <Text style={[styles.filterButtonText, wifiFilter === 'yes' && styles.filterButtonTextActive]}>Has Wi-Fi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, powerFilter === 'yes' && styles.filterButtonActive]}
            onPress={() => toggleFilter('power')}>
            <Text style={[styles.filterButtonText, powerFilter === 'yes' && styles.filterButtonTextActive]}>Has Power</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.toggleContainer}>
            {/* ... List/Map toggle ... */}
            <TouchableOpacity style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]} onPress={() => setViewMode('list')}><Text style={[styles.toggleButtonText, viewMode === 'list' && styles.toggleButtonTextActive]}>List</Text></TouchableOpacity><TouchableOpacity style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]} onPress={() => setViewMode('map')}><Text style={[styles.toggleButtonText, viewMode === 'map' && styles.toggleButtonTextActive]}>Map</Text></TouchableOpacity>
        </View>
      </View>
      
      {loading && (spots.length > 0 || searchText !== '' || wifiFilter !== 'all' || powerFilter !== 'all') && (
        <View style={styles.inlineLoadingContainer}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.inlineLoadingText}>Updating results...</Text>
        </View>
      )}

      {/* ... Error and View Rendering Logic (mostly same, adjust ListEmptyComponent message) ... */}
      {error && (viewMode === 'list' || viewMode === 'map') && (
        <View style={styles.centeredError}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity onPress={() => fetchSpots(false, searchText, wifiFilter, powerFilter)} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
      )}

      {!loading && !error && viewMode === 'list' && renderListView()}
      
      {!loading && !error && viewMode === 'map' && (
        <View style={styles.mapContainer}>
          {spots.length === 0 ? (
            <View style={styles.centeredMapMessage}>
                <Text style={styles.noSpotsText}>No spots match your criteria.</Text>
            </View>
          ): null}
          {renderMapView()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (all previous styles) ...
  headerContainer: {
    backgroundColor: '#ffffff', // White background for header
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 15 : 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  searchInput: {
    height: 48, // Slightly taller
    backgroundColor: '#f0f3f5', // Lighter grey
    borderRadius: 10, // Less rounded
    paddingHorizontal: 18,
    fontSize: 16,
    marginBottom: 12, // Space before filter buttons
    color: '#333',
    borderWidth: 1,
    borderColor: '#dde2e7'
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // Or 'space-around'
    marginBottom: 10,
    gap: 10, // Spacing between filter buttons (if supported, or use margin)
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff', // Default unselected state
    marginRight: 10, // For spacing if 'gap' isn't supported by RN version
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#0056b3',
  },
  filterButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  // Updated Loading/Empty states for clarity
  inlineLoadingContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, backgroundColor: '#f8f9fa' },
  inlineLoadingText: { marginLeft: 10, fontSize: 15, color: '#555' },
  noSpotsText: { fontSize: 18, color: '#495057', textAlign: 'center', marginBottom: 8, },
  // Make sure all previous styles from HomeScreen are still here and adjust as needed.
  // (centered, centeredError, loadingText, container, listContentContainer, itemContainer, etc.)
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa', },
  centeredError: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  loadingText: { marginTop: 10, fontSize: 16, color: '#555', },
  container: { flex: 1, backgroundColor: '#f8f9fa', },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 10, },
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
  mapContainer: { flex: 1, },
  centeredMapMessage: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(248, 249, 250, 0.8)', },
  calloutView: { padding: 10, minWidth: 150, maxWidth: 250, },
  calloutTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 3, color: '#333', },
  calloutDescription: { fontSize: 13, color: '#555', },
  toggleButton: { paddingVertical: 8, paddingHorizontal: 25, borderRadius: 20, marginHorizontal: 5, borderWidth: 1, borderColor: '#007AFF', },
  toggleButtonActive: { backgroundColor: '#007AFF', },
  toggleButtonText: { color: '#007AFF', fontWeight: '500', fontSize: 15, },
  toggleButtonTextActive: { color: '#fff', },
});