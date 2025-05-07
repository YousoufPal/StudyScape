import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TextInput, Button } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getSpotDetails, addReview } from '../services/spotService';
import { Review } from '../types';

const SpotDetailScreen = () => {
  const route = useRoute();
  const { spotId } = route.params;
  const [spot, setSpot] = useState(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ comment: '', scores: { noise: 0, comfort: 0, wifi: 0 } });

  useEffect(() => {
    const fetchSpotDetails = async () => {
      const spotData = await getSpotDetails(spotId);
      setSpot(spotData);
      setReviews(spotData.reviews || []);
    };

    fetchSpotDetails();
  }, [spotId]);

  const handleAddReview = async () => {
    await addReview(spotId, newReview);
    setNewReview({ comment: '', scores: { noise: 0, comfort: 0, wifi: 0 } });
    // Optionally refresh reviews after adding a new one
  };

  if (!spot) {
    return <Text>Loading...</Text>;
  }

  return (
    <ScrollView>
      <Text>{spot.name}</Text>
      <Image source={{ uri: spot.image }} style={{ width: '100%', height: 200 }} />
      <Text>Average Rating: {spot.averageRating}</Text>
      <Text>Recent Reviews:</Text>
      {reviews.map((review) => (
        <View key={review.id}>
          <Text>{review.comment}</Text>
          <Text>Noise: {review.scores.noise}</Text>
          <Text>Comfort: {review.scores.comfort}</Text>
          <Text>WiFi: {review.scores.wifi}</Text>
        </View>
      ))}
      <TextInput
        placeholder="Add a review"
        value={newReview.comment}
        onChangeText={(text) => setNewReview({ ...newReview, comment: text })}
      />
      <Button title="Submit Review" onPress={handleAddReview} />
    </ScrollView>
  );
};

export default SpotDetailScreen;