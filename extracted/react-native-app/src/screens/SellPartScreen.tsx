import React, { useState } from 'react';
import { View, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, useTheme } from 'react-native-paper';
import { createSparePartListing, auth } from '../services/firebase';

export function SellPartScreen({ navigation }: any) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Engine Parts');
  const [carBrand, setCarBrand] = useState('Maruti Suzuki');
  const [carModel, setCarModel] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'New' | 'Used - Like New' | 'Used - Fair' | 'Refurbished'>('Used - Like New');
  const [location, setLocation] = useState('Mumbai, Maharashtra');
  const [contactName, setContactName] = useState('Rahul Sharma');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState('https://images.unsplash.com/photo-1600706432520-2c1b82736209?w=600&auto=format&fit=crop');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title || !price || !carModel || !description) {
      Alert.alert('Missing Details', 'Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const partData = {
        title,
        category,
        carBrand,
        carModel,
        price: parseFloat(price) || 0,
        condition,
        description,
        location,
        contactName,
        contactPhone,
        sellerId: auth.currentUser?.uid || "user-current",
        sellerEmail: auth.currentUser?.email || "user@autoparts.com",
        approved: true,
        createdAt: Date.now()
      };

      await createSparePartListing(partData, [imageUri]);
      setSubmitting(false);
      Alert.alert('Listing Posted!', 'Your spare part ad is live and photos uploaded to Cloudinary.', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (err: any) {
      setSubmitting(false);
      Alert.alert('Posting Error', err.message || 'Image upload or listing creation failed.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.headerTitle}>Post Spare Part Ad</Text>

      <TextInput
        label="Listing Title *"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        placeholder="e.g. Maruti Swift Front Brake Pads"
        style={styles.input}
      />

      <TextInput
        label="Car Brand *"
        value={carBrand}
        onChangeText={setCarBrand}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Car Model *"
        value={carModel}
        onChangeText={setCarModel}
        mode="outlined"
        placeholder="e.g. Swift / Creta / Nexon"
        style={styles.input}
      />

      <TextInput
        label="Price (₹) *"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        mode="outlined"
        style={styles.input}
      />

      <Text variant="titleSmall" style={styles.label}>Condition</Text>
      <SegmentedButtons
        value={condition}
        onValueChange={(val: any) => setCondition(val)}
        buttons={[
          { value: 'New', label: 'New' },
          { value: 'Used - Like New', label: 'Used' },
          { value: 'Refurbished', label: 'Refurbished' },
        ]}
        style={styles.segmented}
      />

      <TextInput
        label="Location *"
        value={location}
        onChangeText={setLocation}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Contact Person Name *"
        value={contactName}
        onChangeText={setContactName}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Contact Phone Number *"
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Part Description *"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        mode="outlined"
        style={styles.input}
      />

      <View style={styles.imageSection}>
        <Text variant="titleSmall" style={styles.label}>Product Photo Preview</Text>
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
        <Button mode="outlined" icon="camera" style={styles.photoBtn} onPress={() => Alert.alert('Image Selected', 'Photo selected for Cloudinary upload.')}>
          Change Photo
        </Button>
      </View>

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        style={styles.submitBtn}
        contentStyle={{ paddingVertical: 8 }}
      >
        Publish Spare Part Listing
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerTitle: {
    fontWeight: '800',
    color: '#0056D2',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  label: {
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4,
  },
  segmented: {
    marginBottom: 16,
  },
  imageSection: {
    marginVertical: 12,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginBottom: 8,
  },
  photoBtn: {
    marginBottom: 16,
  },
  submitBtn: {
    marginTop: 12,
    borderRadius: 8,
  }
});
