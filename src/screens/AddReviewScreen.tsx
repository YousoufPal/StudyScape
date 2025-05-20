// src/screens/AddReviewScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext'; // To get the current user
import StarRatingInput from '../components/StarRatingInput'; // Import the component
import { HomeStackParamList } from '../../App'; // Or your types file

type AddReviewScreenRouteProp = RouteProp<HomeStackParamList, 'AddReview'>; // Add 'AddReview' to HomeStackParamList
type AddReviewScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'AddReview'>;

interface AddReviewParams {
  spotId: string;
  spotName: string;
}

export default function AddReviewScreen() {
  const route = useRoute<RouteProp<{ params: AddReviewParams }>>(); // Simpler param typing for route
  const navigation = useNavigation<AddReviewScreenNavigationProp>();
  const { user } = useAuth(); // Get the logged-in user

  const { spotId, spotName } = route.params;

  const [rating, setRating] = useState(0); // 0 means no rating selected yet
  const [reviewContent, setReviewContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: `Review: ${spotName}` });
  }, [spotName, navigation]);

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit a review.');
      return;
    }
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }
    if (reviewContent.trim().length < 10 && reviewContent.trim().length > 0) { // Optional: min length for content
        Alert.alert('Review Too Short', 'Please provide a bit more detail in your review (at least 10 characters), or leave it blank.');
        return;
    }
     if (reviewContent.trim().length > 1000) { 
        Alert.alert('Review Too Long', 'Your review is too long (max 1000 characters).');
        return;
    }


    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('reviews').insert({
        spot_id: spotId,
        user_id: user.id,
        rating_overall: rating,
        content: reviewContent.trim() || null, // Store null if empty after trimming
      });

      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation (unique_user_spot_review)
            Alert.alert('Already Reviewed', 'You have already submitted a review for this spot.');
        } else {
            throw insertError;
        }
      } else {
        Alert.alert('Review Submitted!', 'Thank you for your feedback.', [
          { text: 'OK', onPress: () => navigation.goBack() }, // Navigate back after success
        ]);
        // Optionally, you might want to trigger a refresh on the SpotDetailScreen
      }
    } catch (e: any) {
      setError(e.message || 'Failed to submit review.');
      Alert.alert('Error', e.message || 'Failed to submit review.');
      console.error('Error submitting review:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
    >
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContentContainer}>
            <Text style={styles.title}>Rate Your Experience At</Text>
            <Text style={styles.spotName}>{spotName}</Text>

            <View style={styles.ratingContainer}>
                <Text style={styles.label}>Your Rating (Tap to select):</Text>
                <StarRatingInput
                rating={rating}
                onRatingChange={setRating}
                starSize={40}
                />
                {rating > 0 && <Text style={styles.ratingValueText}>{rating} / 5 Stars</Text>}
            </View>

            <View style={styles.reviewContentContainer}>
                <Text style={styles.label}>Your Review (Optional):</Text>
                <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={6}
                placeholder="Share your thoughts about Wi-Fi, atmosphere, power outlets, etc."
                value={reviewContent}
                onChangeText={setReviewContent}
                placeholderTextColor="#aaa"
                textAlignVertical="top" // For Android
                />
                <Text style={styles.charCount}>{reviewContent.length} / 1000</Text>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleSubmitReview}
                disabled={isLoading}>
                {isLoading ? (
                <ActivityIndicator color="#fff" />
                ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 50, // Extra padding at the bottom
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: '#444',
    textAlign: 'center',
    marginBottom: 5,
  },
  spotName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 25,
  },
  ratingContainer: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center', // Center StarRatingInput
  },
  ratingValueText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  reviewContentContainer: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center', // Center label above stars
  },
  textInput: {
    backgroundColor: '#fdfdfd',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 120, // Good height for review input
    color: '#333',
  },
  charCount: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#a0c8ff', // Lighter blue when disabled
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 15,
  },
});