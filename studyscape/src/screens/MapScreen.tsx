import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { getSpots } from '../services/spotService';
import Filter from '../components/Filter'; // Assuming a Filter component exists

const MapScreen = () => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpots = async () => {
      try {
        const fetchedSpots = await getSpots();
        setSpots(fetchedSpots);
      } catch (error) {
        console.error("Error fetching spots: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpots();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Filter />
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -37.8136,
          longitude: 144.9631,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {spots.map(spot => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.coords.lat, longitude: spot.coords.lng }}
            title={spot.name}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
});

export default MapScreen;