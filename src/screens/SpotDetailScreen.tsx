// src/screens/SpotDetailScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView, // Main ScrollView for the screen
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
  FlatList, // For reviews
  NativeSyntheticEvent, // For onScroll event type
  NativeScrollEvent,   // For onScroll event type
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { HomeStackParamList } from '../../App'; 
import { useAuth } from '../contexts/AuthContext';

// --- Interfaces ---
interface ReviewerProfile { /* ... */ id: string; display_name: string | null; }
interface ReviewData { /* ... */ id: string; content: string | null; rating_overall: number; created_at: string; user_id: string; profiles: ReviewerProfile[] | null; }
interface StudySpotDetails { /* ... */ id: string; name: string; description?: string | null; address: string; suburb?: string | null; latitude: number; longitude: number; hours?: Record<string, { open?: string; close?: string }> | null; contact_info?: { phone?: string; email?: string; website?: string } | null; amenity_wifi?: boolean | null; amenity_power_outlets_available?: boolean | null; amenity_power_outlets_count?: number | null; amenity_noise_level?: string | null; amenity_food_available?: boolean | null; other_amenities?: Record<string, any> | null; photo_urls?: string[] | null; tags?: string[] | null; average_overall_rating?: number | null; review_count?: number | null; }

type SpotDetailScreenRouteProp = RouteProp<HomeStackParamList, 'SpotDetail'>;
type SpotDetailScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'SpotDetail'>;

const { width, height } = Dimensions.get('window');

export default function SpotDetailScreen() {
  const route = useRoute<SpotDetailScreenRouteProp>();
  const navigation = useNavigation<SpotDetailScreenNavigationProp>();
  const { user } = useAuth();
  const { spotId, spotName } = route.params;

  const [spot, setSpot] = useState<StudySpotDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [activeImageIndex, setActiveImageIndex] = useState(0); // For pagination dots
  const imageScrollViewRef = useRef<ScrollView>(null);


  useEffect(() => { /* ... set header title ... */ 
    const title = spot?.name || spotName || 'Details';
    navigation.setOptions({ title });
  }, [spotName, spot, navigation]);

  const fetchSpotDetails = useCallback(async () => { /* ... same as before ... */ 
    if (!spotId) { setError("Spot ID is missing."); setLoading(false); return; }
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.from('study_spots').select('*').eq('id', spotId).single();
      if (fetchError) throw fetchError; if (!data) throw new Error("Spot not found.");
      setSpot(data as StudySpotDetails);
    } catch (e: any) { setError(e.message || "Failed to fetch spot details."); console.error('Error fetching spot details:', e);
    } finally { /* setLoading handled by loadAllData */ }
  }, [spotId]);

  const fetchSpotReviews = useCallback(async () => { /* ... same as before ... */ 
    if (!spotId) return; setLoadingReviews(true); setReviewsError(null);
    try {
      const { data, error: reviewsFetchError } = await supabase.from('reviews').select(`id,content,rating_overall,created_at,user_id,profiles(id,display_name)`).eq('spot_id', spotId).order('created_at', { ascending: false });
      if (reviewsFetchError) { console.error("Error fetching reviews:", JSON.stringify(reviewsFetchError, null, 2)); throw reviewsFetchError; }
      setReviews((data || []) as ReviewData[]);
    } catch (e: any) { setReviewsError(e.message || "Failed to fetch reviews."); console.error('Catch block for fetchSpotReviews:', e);
    } finally { setLoadingReviews(false); }
  }, [spotId]);

  const loadAllData = useCallback(async () => {
    setLoading(true); setLoadingReviews(true);
    await Promise.all([fetchSpotDetails(), fetchSpotReviews()]);
    setLoading(false); 
  }, [fetchSpotDetails, fetchSpotReviews]);

  useEffect(() => { if (spotId) loadAllData(); }, [spotId, loadAllData]);
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { if (spotId) loadAllData(); });
    return unsubscribe;
  }, [navigation, spotId, loadAllData]);

  const openMap = () => { /* ... */ };
  const handleLinkPress = (url?: string) => { /* ... */ };
  const renderHours = (hoursData?: StudySpotDetails['hours']) => { /* ... */ };
  const formatAmenityKey = (key: string) => { /* ... */ };
  const renderReviewItem = ({ item }: { item: ReviewData }) => { /* ... same as before, accessing item.profiles[0] ... */ 
    const reviewerProfile = item.profiles && item.profiles.length > 0 ? item.profiles[0] : null;
    return (
      <View style={styles.reviewItemContainer}>
        <View style={styles.reviewHeader}><Text style={styles.reviewerName}>{reviewerProfile?.display_name || 'Anonymous User'}</Text><Text style={styles.reviewDate}>{new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></View>
        <View style={styles.reviewRatingContainer}>{[...Array(5)].map((_, i) => (<Text key={i} style={[styles.reviewStar, i < item.rating_overall ? styles.reviewStarFilled : styles.reviewStarEmpty]}>★</Text>))}<Text style={styles.reviewRatingText}> ({item.rating_overall}/5)</Text></View>
        {item.content && <Text style={styles.reviewContent}>{item.content}</Text>}
      </View>
    );
  };

  // --- Image Gallery Logic ---
  const onImageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const contentOffset = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffset / slideSize);
    if (currentIndex !== activeImageIndex) {
      setActiveImageIndex(currentIndex);
    }
  };

  const renderPhotos = () => {
    if (!spot?.photo_urls || spot.photo_urls.length === 0) {
      return <View style={[styles.photoSectionContainer, styles.imagePlaceholderContainer]}><Text style={styles.imagePlaceholderText}>No Images Available</Text></View>;
    }
    if (spot.photo_urls.length === 1) {
      return <View style={styles.photoSectionContainer}><Image source={{ uri: spot.photo_urls[0] }} style={styles.mainStaticImage} resizeMode="cover" onError={(e) => console.warn(`Error loading main image: ${spot.photo_urls?.[0]}`, e.nativeEvent.error)}/></View>;
    }

    return (
      <View style={styles.photoSectionContainer}>
        <ScrollView
          ref={imageScrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onImageScroll}
          scrollEventThrottle={16} // How often onScroll event fires (milliseconds)
          contentContainerStyle={styles.photoScrollContentContainer}
          decelerationRate="fast"
        >
          {spot.photo_urls.map((url, index) => (
            <TouchableOpacity key={index} activeOpacity={0.9} onPress={() => console.log("Tapped image in gallery:", url)}>
              <Image source={{ uri: url }} style={styles.galleryImage} resizeMode="cover" onError={(e) => console.warn(`Error loading gallery image ${index}: ${url}`, e.nativeEvent.error)}/>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Pagination Dots */}
        <View style={styles.paginationContainer}>
          {spot.photo_urls.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.paginationDot,
                activeImageIndex === index ? styles.paginationDotActive : styles.paginationDotInactive,
              ]}
            />
          ))}
        </View>
      </View>
    );
  };
  // --- End Image Gallery Logic ---


  if (loading && !spot) { /* ... loading state ... */ return (<View style={styles.centered}><ActivityIndicator size="large" color="#4A90E2" /><Text style={styles.loadingText}>Loading details...</Text></View>);}
  if (error || !spot) { /* ... error state ... */ return (<View style={styles.centered}><Text style={styles.errorText}>{error || 'Spot not found.'}</Text><TouchableOpacity onPress={loadAllData} style={styles.retryButton}><Text style={styles.retryButtonText}>Try Again</Text></TouchableOpacity></View>);}

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {renderPhotos()}
      <View style={styles.infoContainer}>
        {/* ... All other sections (name, address, amenities, reviews, etc.) remain the same ... */}
        <Text style={styles.name}>{spot.name}</Text>
        <Text style={styles.address}>{spot.address}{spot.suburb ? `, ${spot.suburb}` : ''}</Text>
        {spot.description && <Text style={styles.description}>{spot.description}</Text>}
        <TouchableOpacity style={styles.mapButton} onPress={openMap}><Text style={styles.mapButtonText}>Open in Maps</Text></TouchableOpacity>

        <View style={styles.section}><Text style={styles.sectionTitle}>Key Amenities</Text><Text style={styles.detailText}>WiFi: {spot.amenity_wifi ? 'Available' : 'No / Unknown'}</Text><Text style={styles.detailText}>Power Outlets: {spot.amenity_power_outlets_available ? `Yes (${spot.amenity_power_outlets_count || 'Some'})` : 'No / Unknown'}</Text><Text style={styles.detailText}>Noise Level: {spot.amenity_noise_level || 'N/A'}</Text><Text style={styles.detailText}>Food Available: {spot.amenity_food_available ? 'Yes' : 'No / Unknown'}</Text></View>
        {spot.hours && (<View style={styles.section}><Text style={styles.sectionTitle}>Opening Hours</Text>{renderHours(spot.hours)}</View>)}
        {spot.contact_info && (spot.contact_info.phone || spot.contact_info.email || spot.contact_info.website) && (<View style={styles.section}><Text style={styles.sectionTitle}>Contact</Text>{spot.contact_info.phone && <Text style={styles.detailText}>Phone: {spot.contact_info.phone}</Text>}{spot.contact_info.email && <Text style={styles.detailText}>Email: {spot.contact_info.email}</Text>}{spot.contact_info.website && (<TouchableOpacity onPress={() => handleLinkPress(spot.contact_info?.website)}><Text style={[styles.detailText, styles.linkText]}>Website: {spot.contact_info.website}</Text></TouchableOpacity>)}</View>)}
        {spot.other_amenities && Object.keys(spot.other_amenities).length > 0 && (<View style={styles.section}><Text style={styles.sectionTitle}>More Amenities</Text>{Object.entries(spot.other_amenities).map(([key, value]) => { if (value === null || value === undefined || value === '') return null; return <Text key={key} style={styles.detailText}>{formatAmenityKey(key)}: {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</Text>;})}</View>)}
        {spot.tags && spot.tags.length > 0 && (<View style={styles.section}><Text style={styles.sectionTitle}>Tags</Text><View style={styles.tagsContainer}>{spot.tags.map((tag, index) => (<View key={index} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>))}</View></View>)}
        {spot.average_overall_rating !== undefined && spot.average_overall_rating !== null && (<View style={styles.section}><Text style={styles.sectionTitle}>Overall Rating</Text><Text style={styles.detailTextLarge}>★ {spot.average_overall_rating.toFixed(1)} / 5{spot.review_count !== undefined ? ` (from ${spot.review_count} ${spot.review_count === 1 ? "review" : "reviews"})` : ''}</Text></View>)}
        <View style={styles.section}><Text style={styles.sectionTitle}>User Reviews</Text>{loadingReviews && !loading ? (<ActivityIndicator style={{ marginTop: 20 }} size="small" color="#4A90E2" />) : reviewsError ? (<Text style={styles.errorTextSmall}>{reviewsError}</Text>) : reviews.length === 0 ? (<Text style={styles.noReviewsText}>No reviews yet. Be the first!</Text>) : (<FlatList data={reviews} renderItem={renderReviewItem} keyExtractor={item => item.id.toString()} scrollEnabled={false} ItemSeparatorComponent={() => <View style={styles.reviewSeparator} />} />)}{user && spot && (<TouchableOpacity style={styles.addReviewButton} onPress={() => { navigation.navigate('AddReview', { spotId: spot.id, spotName: spot.name }); }}><Text style={styles.addReviewButtonText}>Write Your Review</Text></TouchableOpacity>)}{!user && (<Text style={styles.loginPromptText}>Please log in to write a review.</Text>)}</View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ... (all existing styles)
  photoSectionContainer: { height: height * 0.35, backgroundColor: '#e0e0e0', marginBottom: 0, position: 'relative' /* For pagination dots */ },
  imagePlaceholderContainer: { justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  imagePlaceholderText: { fontSize: 16, color: '#6c757d' },
  mainStaticImage: { width: width, height: '100%' },
  photoScrollContentContainer: { alignItems: 'center' },
  galleryImage: { width: width, height: '100%' },
  paginationContainer: {
    position: 'absolute',
    bottom: 10, // Position dots at the bottom of the image gallery
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Active dot color
  },
  paginationDotInactive: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Inactive dot color
  },
  // --- Ensure all other styles from the previous full version are here ---
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  contentContainer: { paddingBottom: 40 },
  infoContainer: { paddingHorizontal: 20, paddingTop: 20 }, 
  name: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: 8 },
  address: { fontSize: 17, color: '#7f8c8d', marginBottom: 18 },
  description: { fontSize: 16, lineHeight: 24, color: '#34495e', marginBottom: 20 },
  mapButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 },
  mapButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  section: { marginBottom: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e7e7e7' },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#34495e', marginBottom: 12 },
  detailText: { fontSize: 15, color: '#555', marginBottom: 7, lineHeight: 21 },
  detailTextLarge: { fontSize: 18, color: '#f59e0b', fontWeight: 'bold', marginBottom: 7 },
  linkText: { color: '#007AFF' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: { backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8, marginBottom: 8 },
  tagText: { color: '#4338ca', fontSize: 13, fontWeight: '500' },
  errorText: { color: '#dc3545', fontSize: 16, textAlign: 'center', marginBottom: 15 },
  retryButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, marginTop:10 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  reviewItemContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 0, },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reviewerName: { fontSize: 15, fontWeight: '600', color: '#333' },
  reviewDate: { fontSize: 13, color: '#777' },
  reviewRatingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewStar: { fontSize: 18, marginRight: 2 },
  reviewStarFilled: { color: '#f59e0b' },
  reviewStarEmpty: { color: '#d0d0d0' },
  reviewRatingText: { fontSize: 14, color: '#555', marginLeft: 5 },
  reviewContent: { fontSize: 15, color: '#454545', lineHeight: 21 },
  reviewSeparator: { height: 12, backgroundColor: 'transparent' }, 
  noReviewsText: { textAlign: 'center', color: '#6c757d', marginTop: 15, marginBottom: 15, fontSize: 15, fontStyle: 'italic' },
  errorTextSmall: { color: '#dc3545', textAlign: 'center', marginTop: 10, marginBottom: 10, fontSize: 14 },
  addReviewButton: { backgroundColor: '#28a745', paddingVertical: 13, paddingHorizontal: 25, borderRadius: 8, alignItems: 'center', marginTop: 25, alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  addReviewButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  loginPromptText: { textAlign: 'center', color: '#6c757d', marginTop: 15, fontSize: 15, fontStyle: 'italic' },
});