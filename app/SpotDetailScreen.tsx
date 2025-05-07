import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Sample data for demonstration
const SPOTS = [
  {
    id: '1',
    name: 'State Library Victoria',
    images: [
      // require('../assets/images/partial-react-logo.png'),
      // require('../assets/images/react-logo.png'),
      { uri: 'https://placehold.co/220x120/5B72F2/fff?text=Photo+1' },
      { uri: 'https://placehold.co/220x120/5B72F2/fff?text=Photo+2' },
    ],
    category: 'Library',
    reviews: [
      {
        id: 'r1',
        user: 'Alice',
        scores: { noise: 4, comfort: 5, wifi: 5 },
        comment: 'Quiet, comfy, and great wifi!',
        createdAt: '2025-05-01',
      },
      {
        id: 'r2',
        user: 'Bob',
        scores: { noise: 3, comfort: 4, wifi: 4 },
        comment: 'Nice place but can get busy.',
        createdAt: '2025-05-03',
      },
    ],
  },
  {
    id: '2',
    name: 'Mr Tulk Cafe',
    images: [
      // require('../assets/images/react-logo@2x.png'),
      { uri: 'https://placehold.co/220x120/5B72F2/fff?text=Photo+1' },
    ],
    category: 'Cafe',
    reviews: [],
  },
  {
    id: '3',
    name: 'RMIT Study Space',
    images: [
      // require('../assets/images/react-logo@3x.png'),
      { uri: 'https://placehold.co/220x120/5B72F2/fff?text=Photo+1' },
    ],
    category: 'Campus',
    reviews: [],
  },
];

// Type definitions for spot and review
interface Review {
  id: string;
  user: string;
  scores: { noise: number; comfort: number; wifi: number };
  comment: string;
  createdAt: string;
}

interface Spot {
  id: string;
  name: string;
  images: any[];
  category: string;
  reviews: Review[];
}

function getSpotById(id: string): Spot | undefined {
  return SPOTS.find((s) => s.id === id);
}

export default function SpotDetailScreen() {
  const { spotId } = useLocalSearchParams();
  // Ensure spotId is a string
  const spot = getSpotById(Array.isArray(spotId) ? spotId[0] : spotId);

  if (!spot) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Spot not found</Text>
      </View>
    );
  }

  // Calculate average ratings
  const avg = (key: keyof Review['scores']) => {
    if (!spot.reviews.length) return '-';
    const sum = spot.reviews.reduce((acc, r) => acc + (r.scores[key] || 0), 0);
    return (sum / spot.reviews.length).toFixed(1);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Spot Name & Category */}
      <Text style={styles.title}>{spot.name}</Text>
      <Text style={styles.category}>{spot.category}</Text>

      {/* Image Carousel */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageCarousel}>
        {spot.images.map((img, idx) => (
          <Image key={idx} source={img} style={styles.image} resizeMode="cover" />
        ))}
      </ScrollView>

      {/* Average Ratings */}
      <View style={styles.ratingsRow}>
        <View style={styles.ratingBox}>
          <Ionicons name="volume-mute" size={20} color="#5B72F2" />
          <Text style={styles.ratingLabel}>Quietness</Text>
          <Text style={styles.ratingValue}>{avg('noise')}</Text>
        </View>
        <View style={styles.ratingBox}>
          <Ionicons name="cafe" size={20} color="#5B72F2" />
          <Text style={styles.ratingLabel}>Comfort</Text>
          <Text style={styles.ratingValue}>{avg('comfort')}</Text>
        </View>
        <View style={styles.ratingBox}>
          <Ionicons name="wifi" size={20} color="#5B72F2" />
          <Text style={styles.ratingLabel}>WiFi</Text>
          <Text style={styles.ratingValue}>{avg('wifi')}</Text>
        </View>
      </View>

      {/* Reviews */}
      <Text style={styles.sectionTitle}>Recent Reviews</Text>
      {spot.reviews.length === 0 ? (
        <Text style={styles.noReviews}>No reviews yet. Be the first to review!</Text>
      ) : (
        <FlatList
          data={spot.reviews}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Ionicons name="person-circle" size={24} color="#5B72F2" />
                <Text style={styles.reviewUser}>{item.user}</Text>
                <Text style={styles.reviewDate}>{item.createdAt}</Text>
              </View>
              <Text style={styles.reviewComment}>{item.comment}</Text>
              <View style={styles.reviewScores}>
                <Text style={styles.reviewScore}>Quietness: {item.scores.noise}</Text>
                <Text style={styles.reviewScore}>Comfort: {item.scores.comfort}</Text>
                <Text style={styles.reviewScore}>WiFi: {item.scores.wifi}</Text>
              </View>
            </View>
          )}
          scrollEnabled={false}
        />
      )}

      {/* Add Review Button (stub) */}
      <TouchableOpacity style={styles.addReviewBtn}>
        <Ionicons name="add-circle" size={22} color="#fff" />
        <Text style={styles.addReviewText}>Add Review</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FA',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#5B72F2',
    marginBottom: 4,
    marginTop: 12,
  },
  category: {
    fontSize: 16,
    color: '#888',
    marginBottom: 12,
  },
  imageCarousel: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  image: {
    width: 220,
    height: 120,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  ratingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  ratingBox: {
    alignItems: 'center',
    flex: 1,
  },
  ratingLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5B72F2',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
    color: '#333',
  },
  noReviews: {
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewUser: {
    fontWeight: 'bold',
    marginLeft: 6,
    color: '#5B72F2',
    fontSize: 15,
  },
  reviewDate: {
    marginLeft: 'auto',
    color: '#aaa',
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  reviewScores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewScore: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
  addReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5B72F2',
    paddingVertical: 12,
    borderRadius: 24,
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 32,
  },
  addReviewText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});
