// src/screens/SpotDetailScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { HomeStackParamList } from '../../App'; // Assuming exported from App.tsx or types file
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

// Define the full structure for StudySpot details
interface StudySpotDetails {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  suburb?: string | null;
  latitude: number;
  longitude: number;
  hours?: Record<string, { open?: string; close?: string }> | null;
  contact_info?: { phone?: string; email?: string; website?: string } | null;
  amenity_wifi?: boolean | null;
  amenity_power_outlets_available?: boolean | null;
  amenity_power_outlets_count?: number | null;
  amenity_noise_level?: string | null;
  amenity_food_available?: boolean | null;
  other_amenities?: Record<string, any> | null;
  photo_urls?: string[] | null;
  tags?: string[] | null;
  average_overall_rating?: number | null;
  review_count?: number | null;
}

type SpotDetailScreenRouteProp = RouteProp<HomeStackParamList, 'SpotDetail'>;
type SpotDetailScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'SpotDetail'>;

const { width, height } = Dimensions.get('window');

export default function SpotDetailScreen() {
  const route = useRoute<SpotDetailScreenRouteProp>();
  const navigation = useNavigation<SpotDetailScreenNavigationProp>();
  const { user } = useAuth(); // Get the current authenticated user
  const { spotId, spotName } = route.params;

  const [spot, setSpot] = useState<StudySpotDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set title when component mounts or when spotName/spot.name changes
    const title = spot?.name || spotName || 'Details';
    navigation.setOptions({ title });
  }, [spotName, spot, navigation]);

  const fetchSpotDetails = useCallback(async () => {
    if (!spotId) {
      setError("Spot ID is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Listen for changes to the reviews table that might update the spot's average rating
      // This is optional for now and can be refined.
      // const reviewListener = supabase
      //   .channel(`spot-rating-update-${spotId}`)
      //   .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `spot_id=eq.${spotId}` },
      //     (payload) => {
      //       console.log('Review change detected, re-fetching spot details:', payload);
      //       // A bit aggressive to refetch on every change, might optimize later
      //       // For MVP, this ensures the rating is up-to-date if trigger works
      //       fetchSpotDetails(); // Re-fetch to get updated average_overall_rating
      //     }
      //   )
      //   .subscribe();


      const { data, error: fetchError } = await supabase
        .from('study_spots')
        .select('*')
        .eq('id', spotId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error("Spot not found.");
      
      setSpot(data as StudySpotDetails);

      // // Cleanup listener on component unmount or spotId change
      // return () => {
      //   if (reviewListener) {
      //     supabase.removeChannel(reviewListener);
      //   }
      // };

    } catch (e: any) {
      setError(e.message || "Failed to fetch spot details.");
      console.error('Error fetching spot details:', e);
    } finally {
      setLoading(false);
    }
  }, [spotId]); // Removed navigation from dependency array as it's stable

  useEffect(() => {
    fetchSpotDetails();
    // The subscription should ideally be managed here too if used,
    // and cleaned up in the return function of this useEffect.
    // For now, keeping it simple without realtime updates on this screen after initial load.
    // If you add the realtime listener in fetchSpotDetails, make sure to handle its lifecycle.
  }, [fetchSpotDetails]); // fetchSpotDetails is memoized by useCallback

  const openMap = () => { /* ... same as before ... */
    if (!spot?.latitude || !spot?.longitude) return;
    const scheme = Platform.select({ ios: 'maps://0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${spot.latitude},${spot.longitude}`;
    const label = spot.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    if (url) Linking.openURL(url).catch(err => console.error('Failed to open map link', err));
  };

  const handleLinkPress = (url?: string) => { /* ... same as before ... */
    if (url) {
      let fullUrl = url;
      if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
        fullUrl = `https://${url}`;
      }
      Linking.openURL(fullUrl).catch(err => console.error('Failed to open URL', err));
    }
  };
  
  const renderHours = (hoursData?: StudySpotDetails['hours']) => { /* ... same as before ... */
    if (!hoursData || typeof hoursData !== 'object') return <Text style={styles.detailText}>N/A</Text>;
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const entries = Object.entries(hoursData)
      .filter(([day, info]) => info && (info.open || info.close))
      .sort(([dayA], [dayB]) => daysOrder.indexOf(dayA) - daysOrder.indexOf(dayB));

    if (entries.length === 0) return <Text style={styles.detailText}>Hours not available.</Text>;

    return entries.map(([day, dayInfo]) => {
        const open = dayInfo?.open;
        const close = dayInfo?.close;
        let displayHours = "N/A";

        if (open && close) {
            if (open.toLowerCase() === 'closed' || close.toLowerCase() === 'closed') {
                displayHours = "Closed";
            } else {
                displayHours = `${open} - ${close}`;
            }
        } else if (open) {
            displayHours = `Opens at ${open}`;
        } else if (close) {
            displayHours = `Closes at ${close}`;
        }

        return (
            <Text key={day} style={styles.detailText}>
                {`${day.charAt(0).toUpperCase() + day.slice(1)}: ${displayHours}`}
            </Text>
        );
    });
  };

  const renderPhotos = () => { /* ... same as before ... */
    if (!spot?.photo_urls || spot.photo_urls.length === 0) {
      return (
        <View style={[styles.mainImage, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>No Image Available</Text>
        </View>
      );
    }
    return <Image source={{ uri: spot.photo_urls[0] }} style={styles.mainImage} resizeMode="cover"/>;
  };

  const formatAmenityKey = (key: string) => { /* ... same as before ... */
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (error || !spot) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Spot not found.'}</Text>
         <TouchableOpacity onPress={fetchSpotDetails} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {renderPhotos()}
      
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{spot.name}</Text>
        <Text style={styles.address}>{spot.address}{spot.suburb ? `, ${spot.suburb}` : ''}</Text>

        {spot.description && <Text style={styles.description}>{spot.description}</Text>}

        <TouchableOpacity style={styles.mapButton} onPress={openMap}>
          <Text style={styles.mapButtonText}>Open in Maps</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Amenities</Text>
          <Text style={styles.detailText}>WiFi: {spot.amenity_wifi ? 'Available' : 'No / Unknown'}</Text>
          <Text style={styles.detailText}>Power Outlets: {spot.amenity_power_outlets_available ? `Yes (${spot.amenity_power_outlets_count || 'Some'})` : 'No / Unknown'}</Text>
          <Text style={styles.detailText}>Noise Level: {spot.amenity_noise_level || 'N/A'}</Text>
          <Text style={styles.detailText}>Food Available: {spot.amenity_food_available ? 'Yes' : 'No / Unknown'}</Text>
        </View>
        
        {spot.hours && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Opening Hours</Text>
            {renderHours(spot.hours)}
          </View>
        )}

        {spot.contact_info && (spot.contact_info.phone || spot.contact_info.email || spot.contact_info.website) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            {spot.contact_info.phone && <Text style={styles.detailText}>Phone: {spot.contact_info.phone}</Text>}
            {spot.contact_info.email && <Text style={styles.detailText}>Email: {spot.contact_info.email}</Text>}
            {spot.contact_info.website && (
              <TouchableOpacity onPress={() => handleLinkPress(spot.contact_info?.website)}>
                <Text style={[styles.detailText, styles.linkText]}>Website: {spot.contact_info.website}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {spot.other_amenities && Object.keys(spot.other_amenities).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>More Amenities</Text>
            {Object.entries(spot.other_amenities).map(([key, value]) => {
              if (value === null || value === undefined || value === '') return null;
              return (
                <Text key={key} style={styles.detailText}>
                  {formatAmenityKey(key)}: {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                </Text>
              );
            })}
          </View>
        )}

        {spot.tags && spot.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {spot.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {spot.average_overall_rating !== undefined && spot.average_overall_rating !== null && (
             <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rating</Text>
                <Text style={styles.detailTextLarge}>
                    ★ {spot.average_overall_rating.toFixed(1)} / 5
                    {spot.review_count ? ` (from ${spot.review_count} reviews)` : ' (No reviews yet)'}
                </Text>
            </View>
        )}

        {/* --- Reviews Section with Add Review Button --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {/* Placeholder for displaying existing reviews - we'll do this next */}
          <Text style={styles.detailText}>(Existing reviews will be displayed here soon)</Text>
          
          {user && spot && ( // Only show "Add Review" button if user is logged in AND spot data is loaded
            <TouchableOpacity
              style={styles.addReviewButton}
              onPress={() => {
                // spot is already checked for nullity above, but good practice
                navigation.navigate('AddReview', { spotId: spot.id, spotName: spot.name });
              }}
            >
              <Text style={styles.addReviewButtonText}>Write Your Review</Text>
            </TouchableOpacity>
          )}
          {!user && (
              <Text style={styles.loginPromptText}>Please log in to write a review.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// Styles (ensure addReviewButton, addReviewButtonText, loginPromptText are added)
const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  mainImage: {
    width: width,
    height: height * 0.35, 
    backgroundColor: '#e0e0e0',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#6c757d',
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  address: {
    fontSize: 17,
    color: '#7f8c8d',
    marginBottom: 18,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#34495e',
    marginBottom: 20,
  },
  mapButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e7e7e7',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 7,
    lineHeight: 21,
  },
  detailTextLarge: {
    fontSize: 18,
    color: '#f59e0b',
    fontWeight: 'bold',
    marginBottom: 7,
  },
  linkText: {
    color: '#007AFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e0e7ff', 
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#4338ca', 
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: { color: '#dc3545', fontSize: 16, textAlign: 'center', marginBottom: 15 },
  retryButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, marginTop:10 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  // Styles for Add Review Button and login prompt
  addReviewButton: {
    backgroundColor: '#28a745', // Green color
    paddingVertical: 13,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  addReviewButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  loginPromptText: {
    textAlign: 'center',
    color: '#6c757d',
    marginTop: 15,
    fontSize: 15,
    fontStyle: 'italic',
  }
});