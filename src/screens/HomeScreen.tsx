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
import { HomeStackParamList } from '../../App'; // Or your types file

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
  amenity_wifi?: boolean | null;
  amenity_power_outlets_available?: boolean | null;
}

type HomeScreenNavigationProp = NavigationProp<HomeStackParamList, 'HomeList'>;

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const MELBOURNE_CBD_COORDS = { latitude: -37.8136, longitude: 144.9631, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA };

const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: NodeJS.Timeout | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) { clearTimeout(timeout); timeout = null; }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced as (...args: Parameters<F>) => ReturnType<F>;
};

type FilterState = 'all' | 'yes';

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [spots, setSpots] = useState<StudySpotData[]>([]);
  const [loading, setLoading] = useState(true); // True for initial load and subsequent filter/search fetches
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region>(MELBOURNE_CBD_COORDS);
  const mapRef = useRef<MapView | null>(null);
  const colorScheme = Appearance.getColorScheme();

  const [searchText, setSearchText] = useState('');
  const [wifiFilter, setWifiFilter] = useState<FilterState>('all');
  const [powerFilter, setPowerFilter] = useState<FilterState>('all');
  const [openNowFilterActive, setOpenNowFilterActive] = useState<boolean>(false);
  const [fetchedOpenSpotIds, setFetchedOpenSpotIds] = useState<string[] | null>(null); // Stores IDs if openNow is active
  const [isLoadingOpenNowIds, setIsLoadingOpenNowIds] = useState<boolean>(false);

  const isInitialMount = useRef(true);

  const requestLocationPermissions = useCallback(async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission denied. Centering map on Melbourne CBD.');
      setInitialRegion(MELBOURNE_CBD_COORDS);
      return;
    }
    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation(location);
      const userRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      setInitialRegion(userRegion);
      if (viewMode === 'map' && mapRef.current) {
        mapRef.current.animateToRegion(userRegion, 1000);
      }
    } catch (e) {
      console.warn("Could not get user location.", e);
      setInitialRegion(MELBOURNE_CBD_COORDS);
    }
  }, [viewMode]); // Add viewMode dependency

  const fetchSpotsData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    setError(null);

    let idsFromOpenNowFilter: string[] | null = null;

    if (openNowFilterActive) {
      // If openNowFilter is active, we MUST have its results before proceeding.
      // If fetchedOpenSpotIds is null, it means we need to fetch them.
      if (fetchedOpenSpotIds === null && !isLoadingOpenNowIds) {
        setIsLoadingOpenNowIds(true);
        try {
          console.log("Invoking isOpenNowFilter Edge Function...");
          const { data: funcData, error: funcError } = await supabase.functions.invoke('isOpenNowFilter');
          setIsLoadingOpenNowIds(false);
          if (funcError) {
            console.error("isOpenNowFilter Edge Function error:", funcError);
            throw new Error(`Open Now filter failed: ${funcError.message}`);
          }
          idsFromOpenNowFilter = funcData?.openSpotIds ?? [];
          setFetchedOpenSpotIds(idsFromOpenNowFilter); // Store for subsequent non-OpenNow filter changes
          console.log("Open Now IDs fetched:", idsFromOpenNowFilter);
        } catch (e: any) {
          console.error("Catch block for isOpenNowFilter invocation:", e);
          setError(e.message);
          idsFromOpenNowFilter = []; // On error, assume no spots are open to avoid showing all
          setFetchedOpenSpotIds([]);
          setIsLoadingOpenNowIds(false);
          setLoading(false);
          setRefreshing(false);
          return; // Stop further processing if the crucial Open Now filter fails
        }
      } else {
        // OpenNow filter is active, and we already have the IDs (or it's currently fetching)
        idsFromOpenNowFilter = fetchedOpenSpotIds;
      }
    } else {
        // OpenNow filter is not active, ensure we clear any previously fetched IDs
        if (fetchedOpenSpotIds !== null) {
            setFetchedOpenSpotIds(null);
        }
    }

    // Proceed to fetch spots only if we are not currently waiting for openNow IDs
    // or if the openNowFilter is not active.
    if (isLoadingOpenNowIds && openNowFilterActive) {
        console.log("Waiting for Open Now IDs before fetching spots...");
        // setLoading(false); // Or keep it true if you want a continuous loading state
        // setRefreshing(false);
        return; 
    }
    
    console.log("Proceeding to fetch spots with filters:", {searchText, wifiFilter, powerFilter, idsFromOpenNowFilter});

    try {
      let query = supabase
        .from('study_spots')
        .select(`id, name, address, suburb, latitude, longitude, photo_urls, average_overall_rating, review_count, amenity_wifi, amenity_power_outlets_available`)
        .order('name', { ascending: true });

      if (searchText.trim()) {
        const term = `%${searchText.trim()}%`;
        query = query.or(`name.ilike.${term},suburb.ilike.${term}`);
      }
      if (wifiFilter === 'yes') query = query.eq('amenity_wifi', true);
      if (powerFilter === 'yes') query = query.eq('amenity_power_outlets_available', true);
      
      if (idsFromOpenNowFilter !== null) { // This means openNowFilterActive was true
        if (idsFromOpenNowFilter.length === 0) {
          // If Open Now filter is active and returns no IDs, show no spots
          console.log("Open Now filter active, no spots are open. Setting spots to empty.");
          setSpots([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        query = query.in('id', idsFromOpenNowFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) {
        console.error("Supabase fetchSpots query error:", fetchError);
        throw fetchError;
      }
      const valid = (data || []).filter((s: any) => typeof s.latitude === 'number' && typeof s.longitude === 'number') as StudySpotData[];
      console.log("Fetched and validated spots:", valid.length);
      setSpots(valid);
    } catch (e: any) {
      console.error("Catch block in fetchSpotsData after query attempt:", e);
      setError(e.message || 'Unknown error fetching spots.');
      setSpots([]); // Clear spots on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchText, wifiFilter, powerFilter, openNowFilterActive, fetchedOpenSpotIds, isLoadingOpenNowIds]); // Dependencies for re-creating this callback

  const debouncedFetch = useCallback(debounce(fetchSpotsData, 500), [fetchSpotsData]);

  useEffect(() => {
    requestLocationPermissions();
    fetchSpotsData(); // Initial fetch
    isInitialMount.current = false;
  }, []); // Runs once on mount

  useEffect(() => {
    if (!isInitialMount.current) {
      // For direct filter toggles (WiFi, Power, OpenNow)
      fetchSpotsData();
    }
  }, [wifiFilter, powerFilter, openNowFilterActive]); // Trigger on these direct filter changes

  useEffect(() => {
    if (!isInitialMount.current) {
      // For debounced search text changes
      debouncedFetch();
    }
  }, [searchText, debouncedFetch]); // Trigger on searchText change

  useEffect(() => {
    if (userLocation && mapRef.current && viewMode === 'map' && initialRegion.latitude === userLocation.coords.latitude) {
      // Animate only if initialRegion is already set to user's location
      mapRef.current.animateToRegion(initialRegion, 1000);
    }
  }, [userLocation, viewMode, initialRegion]);

  const onRefresh = useCallback(() => {
    setSearchText(''); 
    setWifiFilter('all'); 
    setPowerFilter('all'); 
    setOpenNowFilterActive(false); 
    setFetchedOpenSpotIds(null); // Crucial to reset this
    // requestLocationPermissions(); // Location already requested on mount, or handled if permissions change
    fetchSpotsData(true); // Pass true for isRefresh
  }, [fetchSpotsData]); // fetchSpotsData is now stable due to its own useCallback

  const toggleFilter = (filterType: 'wifi' | 'power' | 'openNow') => {
    if (filterType === 'wifi') setWifiFilter(prev => prev === 'yes' ? 'all' : 'yes');
    else if (filterType === 'power') setPowerFilter(prev => prev === 'yes' ? 'all' : 'yes');
    else if (filterType === 'openNow') {
      setOpenNowFilterActive(prev => {
        const newActiveState = !prev;
        if (!newActiveState) { // If turning OFF
          setFetchedOpenSpotIds(null); // Clear IDs so next fetch doesn't use stale ones
        } else {
          setFetchedOpenSpotIds(null); // Clear old IDs to force re-fetch for "Open Now"
        }
        return newActiveState;
      });
    }
  };

  const navigateToSpotDetail = (spot: StudySpotData) => navigation.navigate('SpotDetail', { spotId: spot.id, spotName: spot.name });

  const renderListView = () => ( <FlatList /* ... same as before, ensure ListEmptyComponent has good message ... */ 
    data={spots}
    renderItem={({ item }) => (
      <TouchableOpacity style={styles.itemContainer} onPress={() => navigateToSpotDetail(item)}>
        {item.photo_urls?.[0]
          ? <Image source={{ uri: item.photo_urls[0] }} style={styles.itemImage} />
          : <View style={[styles.itemImage, styles.itemImagePlaceholder]}><Text style={styles.itemImagePlaceholderText}>No Image</Text></View>}
        <View style={styles.itemTextContainer}>
          <Text style={styles.itemName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
          <Text style={styles.itemAddress} numberOfLines={2} ellipsizeMode="tail">{item.address}{item.suburb ? `, ${item.suburb}` : ''}</Text>
          {item.average_overall_rating !== undefined && item.average_overall_rating !== null && item.average_overall_rating > 0 && 
            <Text style={styles.itemRating}>★ {item.average_overall_rating.toFixed(1)}</Text>}
        </View>
      </TouchableOpacity>
    )}
    keyExtractor={item => item.id}
    contentContainerStyle={styles.listContentContainer}
    ListEmptyComponent={!loading && !isLoadingOpenNowIds && !error ? <View style={styles.centered}><Text style={styles.noSpotsText}>No spots match your criteria.</Text></View> : null}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4A90E2"]} tintColor="#4A90E2" />}
  />);

  const renderMapView = () => (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }} // Use flex: 1 to fill the container it's placed in
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
          // description={spot.address} // Description can make callout too busy, optional
        >
          <Callout onPress={() => navigateToSpotDetail(spot)} tooltip={Platform.OS === 'ios'}>
            <View style={styles.calloutView}>
              <Text style={styles.calloutTitle} numberOfLines={1}>{spot.name}</Text>
              <Text style={styles.calloutDescription} numberOfLines={1}>{spot.address}</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );

  const isActuallyLoading = (loading || isLoadingOpenNowIds) && !refreshing;

  if (isActuallyLoading && spots.length === 0 && !searchText && wifiFilter === 'all' && powerFilter === 'all' && !openNowFilterActive) {
    return (<View style={styles.centered}><ActivityIndicator size="large" color="#4A90E2" /><Text style={styles.loadingText}>Loading study spots...</Text></View>);
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
        <View style={styles.filterButtonsContainer}>
          <TouchableOpacity style={[styles.filterButton, wifiFilter==='yes'&&styles.filterButtonActive]} onPress={()=>toggleFilter('wifi')}><Text style={[styles.filterButtonText,wifiFilter==='yes'&&styles.filterButtonTextActive]}>Has Wi‑Fi</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton,powerFilter==='yes'&&styles.filterButtonActive]} onPress={()=>toggleFilter('power')}><Text style={[styles.filterButtonText,powerFilter==='yes'&&styles.filterButtonTextActive]}>Has Power</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.filterButton,openNowFilterActive&&styles.filterButtonActive,isLoadingOpenNowIds&&styles.filterButtonDisabled]} onPress={()=>toggleFilter('openNow')} disabled={isLoadingOpenNowIds}>
            {isLoadingOpenNowIds
              ? <ActivityIndicator size="small" color={openNowFilterActive ? '#fff':'#007AFF'} />
              : <Text style={[styles.filterButtonText,openNowFilterActive&&styles.filterButtonTextActive]}>Open Now</Text>
            }
          </TouchableOpacity>
        </View>
        <View style={styles.toggleContainer}>
          <TouchableOpacity style={[styles.toggleButton,viewMode==='list'&&styles.toggleButtonActive]} onPress={()=>setViewMode('list')}><Text style={[styles.toggleButtonText,viewMode==='list'&&styles.toggleButtonTextActive]}>List</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.toggleButton,viewMode==='map'&&styles.toggleButtonActive]} onPress={()=>setViewMode('map')}><Text style={[styles.toggleButtonText,viewMode==='map'&&styles.toggleButtonTextActive]}>Map</Text></TouchableOpacity>
        </View>
      </View>

      {isActuallyLoading && (spots.length > 0 || !!searchText || wifiFilter !=='all' || powerFilter !=='all' || openNowFilterActive) && (
        <View style={styles.inlineLoadingContainer}><ActivityIndicator size="small" color="#4A90E2"/><Text style={styles.inlineLoadingText}>Updating results...</Text></View>
      )}

      {error && <View style={styles.centeredError}><Text style={styles.errorText}>Error: {error}</Text><TouchableOpacity onPress={()=>fetchSpotsData(false)} style={styles.retryButton}><Text style={styles.retryButtonText}>Try Again</Text></TouchableOpacity></View>}
      
      {!isActuallyLoading && !error && viewMode==='list' && renderListView()}
      {!isActuallyLoading && !error && viewMode==='map' && (
        <View style={styles.mapContainer}>
            {renderMapView()}
            {spots.length === 0 && !isActuallyLoading && !error && ( // Show message if no spots after filtering
                <View style={styles.centeredMapMessage}>
                    <Text style={styles.noSpotsText}>No spots match your criteria.</Text>
                </View>
            )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (Keep all your existing styles as they were, make sure they are complete)
  filterButtonDisabled: { opacity: 0.6 },
  headerContainer: { backgroundColor:'#fff',paddingHorizontal:15,paddingTop:Platform.OS==='android'?15:10,paddingBottom:5,borderBottomWidth:1,borderBottomColor:'#e0e0e0',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:3,elevation:3 },
  searchInput: { height:48,backgroundColor:'#f0f3f5',borderRadius:10,paddingHorizontal:18,fontSize:16,marginBottom:12,color:'#333',borderWidth:1,borderColor:'#dde2e7' },
  filterButtonsContainer: { flexDirection:'row',justifyContent:'flex-start',marginBottom:10,gap:10,flexWrap:'wrap' }, // Added flexWrap
  filterButton: { paddingVertical:8,paddingHorizontal:15,borderRadius:20,borderWidth:1,borderColor:'#007AFF',backgroundColor:'#fff',marginRight:10,marginBottom:5 },
  filterButtonActive: { backgroundColor:'#007AFF',borderColor:'#0056b3' },
  filterButtonText: { color:'#007AFF',fontSize:14,fontWeight:'500' },
  filterButtonTextActive: { color:'#fff' },
  inlineLoadingContainer: { flexDirection:'row',justifyContent:'center',alignItems:'center',paddingVertical:15,backgroundColor:'#f8f9fa'},
  inlineLoadingText: { marginLeft:10,fontSize:15,color:'#555' },
  noSpotsText: { fontSize:18,color:'#495057',textAlign:'center',marginBottom:8 },
  centered: { flex:1,justifyContent:'center',alignItems:'center',padding:20,backgroundColor:'#f8f9fa' },
  centeredError: { flex:1,justifyContent:'center',alignItems:'center',padding:20 },
  loadingText: { marginTop:10,fontSize:16,color:'#555' },
  container: { flex:1,backgroundColor:'#f8f9fa' },
  toggleContainer: { flexDirection:'row',justifyContent:'center',paddingBottom:10 },
  listContentContainer: { paddingBottom: 20 }, // Added paddingBottom
  itemContainer: { backgroundColor:'#fff',padding:15,marginVertical:8,borderRadius:12,flexDirection:'row',alignItems:'center',shadowColor:'#000',shadowOffset:{width:0,height:3},shadowOpacity:0.1,shadowRadius:6,elevation:4 },
  itemImage: { width:width*0.22,height:width*0.22,borderRadius:10,marginRight:15,backgroundColor:'#e9ecef' },
  itemImagePlaceholder: { justifyContent:'center',alignItems:'center' },
  itemImagePlaceholderText: { fontSize:12,color:'#adb5bd' },
  itemTextContainer: { flex:1,justifyContent:'center' },
  itemName: { fontSize:17,fontWeight:'600',color:'#343a40',marginBottom:5 },
  itemAddress: { fontSize:14,color:'#6c757d',marginBottom:5 },
  itemRating: { fontSize:14,color:'#f59e0b',fontWeight:'bold',marginTop:2 },
  errorText: { color:'#dc3545',fontSize:16,textAlign:'center',marginBottom:15 },
  retryButton: { backgroundColor:'#007AFF',paddingVertical:12,paddingHorizontal:25,borderRadius:8,marginTop:10 },
  retryButtonText: { color:'#fff',fontSize:16,fontWeight:'500' },
  mapContainer: { flex:1 },
  centeredMapMessage: { ...StyleSheet.absoluteFillObject,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(248,249,250,0.8)', padding: 20 }, // Added padding
  calloutView: { paddingHorizontal: 10, paddingVertical: 8, minWidth: 150, maxWidth: 250, alignItems: 'center' }, // Centered callout content
  calloutTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 3, color: '#333', textAlign: 'center' },
  calloutDescription: { fontSize: 13, color: '#555', textAlign: 'center' },
  toggleButton: { paddingVertical:8,paddingHorizontal:25,borderRadius:20,marginHorizontal:5,borderWidth:1,borderColor:'#007AFF' },
  toggleButtonActive: { backgroundColor:'#007AFF' },
  toggleButtonText: { color:'#007AFF',fontWeight:'500',fontSize:15 },
  toggleButtonTextActive: { color:'#fff' }
});