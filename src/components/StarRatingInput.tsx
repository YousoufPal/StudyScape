// src/components/StarRatingInput.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
// You might want to use an icon library like @expo/vector-icons if you have it
// For simplicity, we'll use text stars ★ and ☆ for now.
// import { Ionicons } from '@expo/vector-icons'; 

interface StarRatingInputProps {
  rating: number;
  maxRating?: number;
  onRatingChange: (rating: number) => void;
  starSize?: number;
  starColor?: string;
  emptyStarColor?: string;
}

export default function StarRatingInput({
  rating,
  maxRating = 5,
  onRatingChange,
  starSize = 30,
  starColor = '#FFD700', // Gold
  emptyStarColor = '#D3D3D3', // Light gray
}: StarRatingInputProps) {
  const stars = [];
  for (let i = 1; i <= maxRating; i++) {
    stars.push(
      <TouchableOpacity key={i} onPress={() => onRatingChange(i)} style={styles.starButton}>
        {/* Using text stars. Replace with icons if you prefer */}
        <Text style={{ fontSize: starSize, color: i <= rating ? starColor : emptyStarColor }}>
          {i <= rating ? '★' : '☆'}
        </Text>
        {/* Example with Ionicons:
        <Ionicons 
          name={i <= rating ? "star" : "star-outline"} 
          size={starSize} 
          color={i <= rating ? starColor : emptyStarColor} 
        /> 
        */}
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{stars}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Or 'flex-start' if you want it left-aligned
  },
  starButton: {
    paddingHorizontal: 5, // Spacing between stars
  },
});