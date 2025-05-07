import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const MELBOURNE_REGION = {
  latitude: -37.8136,
  longitude: 144.9631,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

const SAMPLE_SPOTS = [
  {
    id: '1',
    name: 'State Library Victoria',
    coords: { latitude: -37.8098, longitude: 144.9652 },
    category: 'Library',
  },
  {
    id: '2',
    name: 'Mr Tulk Cafe',
    coords: { latitude: -37.8095, longitude: 144.9647 },
    category: 'Cafe',
  },
  {
    id: '3',
    name: 'RMIT Study Space',
    coords: { latitude: -37.8087, longitude: 144.9634 },
    category: 'Campus',
  },
];

export default function MapScreen() {
  const [filterVisible, setFilterVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>StudyScape</Text>
        <Text style={styles.subtitle}>Discover & rate Melbourne's best study spots</Text>
      </View>

      {/* Map */}
      <MapView style={styles.map} initialRegion={MELBOURNE_REGION}>
        {SAMPLE_SPOTS.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={spot.coords}
            title={spot.name}
            description={spot.category}
          />
        ))}
      </MapView>

      {/* Floating Filter Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setFilterVisible(true)}
        accessibilityLabel="Open filter options"
      >
        <Ionicons name="options" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Study Spots</Text>
            {/* Filter options would go here */}
            <Text style={styles.filterLabel}>Quietness</Text>
            <Text style={styles.filterLabel}>Power Outlets</Text>
            <Text style={styles.filterLabel}>Category</Text>
            <Pressable style={styles.closeButton} onPress={() => setFilterVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PRIMARY = '#5B72F2';
const ACCENT = '#F2B705';
const BG = '#F7F8FA';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 2,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.85,
  },
  map: {
    flex: 1,
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  fab: {
    position: 'absolute',
    bottom: 36,
    right: 24,
    backgroundColor: ACCENT,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 260,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: PRIMARY,
  },
  filterLabel: {
    fontSize: 16,
    color: '#333',
    marginVertical: 8,
    alignSelf: 'flex-start',
  },
  closeButton: {
    marginTop: 24,
    backgroundColor: PRIMARY,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
