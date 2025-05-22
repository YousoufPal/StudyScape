// src/screens/AddSpotScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  KeyboardAvoidingView,
  Image, // Import Image
  Button, // For "Pick Image" button
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
// import { // Use named imports for functions and the enum
//   launchImageLibraryAsync,
//   requestMediaLibraryPermissionsAsync,
//   MediaType // <--- Import the MediaType enum directly
// } from 'expo-image-picker';
import * as ImagePicker from 'expo-image-picker'; // Use the namespace import

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MainAppTabParamList } from '../../App'; // Or your relevant ParamList
import * as FileSystem from 'expo-file-system';

type AddSpotScreenNavigationProp = NavigationProp<MainAppTabParamList, 'AddSpot'>; // Assuming it's a tab

interface SpotFormData {
  name: string;
  address: string;
  suburb: string;
  description: string;
  latitude: string;
  longitude: string;
  amenity_wifi: boolean;
  amenity_power_outlets_available: boolean;
  localImageUris: string[];
}

const initialFormData: SpotFormData = {
  name: '',
  address: '',
  suburb: '',
  description: '',
  latitude: '',
  longitude: '',
  amenity_wifi: false,
  amenity_power_outlets_available: false,
  localImageUris: [],
};

export default function AddSpotScreen() {
  const navigation = useNavigation<AddSpotScreenNavigationProp>();
  const { user } = useAuth();
  const [formData, setFormData] = useState<SpotFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (name: keyof SpotFormData, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); // Access via namespace
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to select images.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({ // Access via namespace
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // <-- TRY THE OLD DEPRECATED ONE FIRST
                                                       // If it still warns but WORKS, we know the path.
                                                       // THEN TRY THE NEW ENUM NAME if it exists on ImagePicker
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map(asset => asset.uri);
      const currentUris = formData.localImageUris || [];
      const combinedUris = [...currentUris, ...uris];
      setFormData(prev => ({ 
        ...prev, 
        localImageUris: combinedUris.slice(0, 5) 
      }));
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormData(prev => ({
        ...prev,
        localImageUris: prev.localImageUris.filter((_, index) => index !== indexToRemove)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) { Alert.alert('Validation Error', 'Spot name is required.'); return false; }
    if (!formData.address.trim()) { Alert.alert('Validation Error', 'Address is required.'); return false; }
    if (!formData.latitude.trim() || !formData.longitude.trim()) { Alert.alert('Validation Error', 'Latitude and Longitude are required.'); return false; }
    if (isNaN(parseFloat(formData.latitude)) || isNaN(parseFloat(formData.longitude))) { Alert.alert('Validation Error', 'Latitude and Longitude must be valid numbers.'); return false; }
    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) { Alert.alert('Validation Error', 'Invalid latitude or longitude values.'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!user) { /* ... */ return; }
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const uploadedPhotoUrls: string[] = [];

      if (formData.localImageUris.length > 0) {
        console.log("Starting image uploads to Supabase Storage...");
        for (const uri of formData.localImageUris) {
          const uriParts = uri.split('.');
          const fileTypeExtension = uriParts.pop()?.toLowerCase();
          const fileName = `${user.id}_${Date.now()}.${fileTypeExtension}`;
          const filePath = `${fileName}`;

          let determinedContentType = 'application/octet-stream';
          if (fileTypeExtension === 'jpg' || fileTypeExtension === 'jpeg') {
            determinedContentType = 'image/jpeg';
          } else if (fileTypeExtension === 'png') {
            determinedContentType = 'image/png';
          } // Add more types

          try {
            console.log(`Fetching local file URI: ${uri}`);
            const response = await fetch(uri); // Fetch the local file

            if (!response.ok) { // Check if fetch itself was successful
                throw new Error(`Failed to fetch local image URI: ${response.status} ${response.statusText}`);
            }

            // Directly get ArrayBuffer from the response
            const arrayBuffer = await response.arrayBuffer(); // <--- KEY CHANGE HERE

            console.log(`Uploading ${filePath}. ArrayBuffer size: ${arrayBuffer.byteLength}, Content-Type: ${determinedContentType}`);
            
            if (arrayBuffer.byteLength === 0) {
              console.error(`ERROR: ArrayBuffer for URI ${uri} has size 0. Skipping.`);
              Alert.alert('Upload Issue', `Could not process image (empty): ${uri.split('/').pop()}.`);
              continue;
            }

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('spot-photos')
              .upload(filePath, arrayBuffer, { // Upload ArrayBuffer
                cacheControl: '3600',
                upsert: false,
                contentType: determinedContentType,
              });

            if (uploadError) {
              console.error("Supabase Storage Upload error for", uri, uploadError);
              throw new Error(`Failed to upload image ${fileName}: ${uploadError.message}`);
            }

            if (uploadData) {
              const { data: urlData } = supabase.storage
                .from('spot-photos')
                .getPublicUrl(filePath);
              
              if (urlData && urlData.publicUrl) {
                console.log("Uploaded to Supabase Storage, public URL:", urlData.publicUrl);
                uploadedPhotoUrls.push(urlData.publicUrl);
              } else {
                console.warn("Could not get public URL for Supabase Storage file:", filePath);
              }
            }
          } catch (fileUploadError: any) {
              console.error(`Error processing or uploading file ${uri}:`, fileUploadError);
              throw new Error(`An error occurred during image upload: ${fileUploadError.message}`);
          }
        }
        console.log("All image upload attempts finished. URLs:", uploadedPhotoUrls);
      }

      // ... (rest of handleSubmit: inserting spot data into the database) ...
      const { data: spotData, error: insertError } = await supabase
        .from('study_spots')
        // ... (insert object, including photo_urls: uploadedPhotoUrls) ...
        .insert({
          name: formData.name.trim(),
          address: formData.address.trim(),
          suburb: formData.suburb.trim() || null,
          description: formData.description.trim() || null,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          hours: null, 
          amenity_wifi: formData.amenity_wifi,
          amenity_power_outlets_available: formData.amenity_power_outlets_available,
          added_by: user.id,
          photo_urls: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : null,
        })
        .select()
        .single();

      if (insertError) { /* ... */ throw insertError; }
      Alert.alert('Success!', 'New study spot added successfully.', [ /* ... navigation ... */ ]);


    } catch (e: any) {
      setError(e.message || 'Failed to add spot.');
      Alert.alert('Error', e.message || 'An error occurred while adding the spot.');
      console.error('Error adding spot:', JSON.stringify(e, null, 2));
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
      <Text style={styles.header}>Add a New Study Spot</Text>
      <Text style={styles.subHeader}>Help fellow students find great places!</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Spot Name <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} value={formData.name} onChangeText={text => handleInputChange('name', text)} placeholder="e.g., The Quiet Corner Cafe" placeholderTextColor="#aaa"/>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Full Address <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} value={formData.address} onChangeText={text => handleInputChange('address', text)} placeholder="e.g., 123 Study St, Melbourne VIC 3000" placeholderTextColor="#aaa"/>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Suburb</Text>
        <TextInput style={styles.input} value={formData.suburb} onChangeText={text => handleInputChange('suburb', text)} placeholder="e.g., Carlton, Fitzroy" placeholderTextColor="#aaa"/>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} value={formData.description} onChangeText={text => handleInputChange('description', text)} placeholder="Vibe, seating, best times, etc." multiline numberOfLines={4} textAlignVertical="top" placeholderTextColor="#aaa"/>
      </View>

      <View style={styles.coordinatesContainer}>
        <View style={[styles.formGroup, styles.coordinateInput]}><Text style={styles.label}>Latitude <Text style={styles.required}>*</Text></Text><TextInput style={styles.input} value={formData.latitude} onChangeText={text => handleInputChange('latitude', text)} placeholder="-37.8136" keyboardType="numeric" placeholderTextColor="#aaa"/></View>
        <View style={[styles.formGroup, styles.coordinateInput]}><Text style={styles.label}>Longitude <Text style={styles.required}>*</Text></Text><TextInput style={styles.input} value={formData.longitude} onChangeText={text => handleInputChange('longitude', text)} placeholder="144.9631" keyboardType="numeric" placeholderTextColor="#aaa"/></View>
      </View>
      <Text style={styles.hintText}>Tip: Get coordinates from Google Maps.</Text>
      
      {/* Removed hours_info text input as per previous decision */}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Spot Photos (Max 5)</Text>
        <Button title="Select Images from Library" onPress={pickImage} />
        <View style={styles.imagePreviewContainer}>
          {formData.localImageUris.map((uri, index) => (
            <View key={uri} style={styles.imagePreviewItem}> {/* Use URI as key if unique, or index */}
                <Image source={{ uri }} style={styles.thumbnail} />
                <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                    <Text style={styles.removeImageButtonText}>✕</Text>
                </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.label, {marginTop: 15, marginBottom: 5, textAlign: 'left'}]}>Amenities:</Text>
      <View style={styles.switchContainer}><Text style={styles.switchLabel}>Wi-Fi Available</Text><Switch trackColor={{ false: "#dcdcdc", true: "#81b0ff" }} thumbColor={formData.amenity_wifi ? "#007AFF" : "#f4f3f4"} ios_backgroundColor="#dcdcdc" onValueChange={value => handleInputChange('amenity_wifi', value)} value={formData.amenity_wifi}/></View>
      <View style={styles.switchContainer}><Text style={styles.switchLabel}>Power Outlets Available</Text><Switch trackColor={{ false: "#dcdcdc", true: "#81b0ff" }} thumbColor={formData.amenity_power_outlets_available ? "#007AFF" : "#f4f3f4"} ios_backgroundColor="#dcdcdc" onValueChange={value => handleInputChange('amenity_power_outlets_available', value)} value={formData.amenity_power_outlets_available}/></View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Add Study Spot</Text>}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  scrollContentContainer: { padding: 20, paddingBottom: 60 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', marginBottom: 8 },
  subHeader: { fontSize: 16, color: '#7f8c8d', textAlign: 'center', marginBottom: 30 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 16, color: '#34495e', marginBottom: 8, fontWeight: '500' },
  required: { color: 'red' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#495057' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  coordinatesContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  coordinateInput: { width: '48%' },
  hintText: { fontSize: 13, color: '#6c757d', marginTop: -15, marginBottom: 20, textAlign: 'center' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 5, backgroundColor: '#fff', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  switchLabel: { fontSize: 16, color: '#495057' },
  submitButton: { backgroundColor: '#28a745', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  submitButtonDisabled: { backgroundColor: '#a3d3ab' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 15, fontSize: 15 },
  // Image Preview Styles
  imagePreviewContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, marginBottom: 10 },
  imagePreviewItem: { position: 'relative', marginRight: 10, marginBottom: 10 },
  thumbnail: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#e0e0e0' },
  removeImageButton: { position: 'absolute', top: -5, right: -5, backgroundColor: 'rgba(40,40,40,0.7)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  removeImageButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14, lineHeight: 16 },
});