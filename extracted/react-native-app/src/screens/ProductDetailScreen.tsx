import React, { useState } from 'react';
import { View, ScrollView, Image, StyleSheet, Linking, Alert } from 'react-native';
import { Text, Button, Card, Avatar, Divider, Chip, IconButton, useTheme } from 'react-native-paper';
import { SparePart } from '../types';

export function ProductDetailScreen({ route, navigation }: any) {
  const { part } = route.params as { part: SparePart };
  const theme = useTheme();
  const [selectedImage, setSelectedImage] = useState(part.imageUrl);
  const [isFavorite, setIsFavorite] = useState(false);

  const images = part.imageUrls && part.imageUrls.length > 0 ? part.imageUrls : [part.imageUrl];

  const handleCall = () => {
    if (part.contactPhone) {
      Linking.openURL(`tel:${part.contactPhone}`);
    } else {
      Alert.alert('Contact Error', 'Phone number not provided.');
    }
  };

  const handleWhatsApp = () => {
    if (part.contactPhone) {
      const cleanPhone = part.contactPhone.replace(/[^0-9]/g, '');
      const msg = encodeURIComponent(`Hi ${part.contactName}, I'm interested in your listing "${part.title}" listed on Auto Parts Marketplace.`);
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`);
    }
  };

  const handleStartChat = () => {
    navigation.navigate('ChatRoom', {
      partId: part.id,
      partTitle: part.title,
      partImage: part.imageUrl,
      partPrice: part.price,
      sellerId: part.sellerId,
      sellerName: part.contactName
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Product Image Carousel View */}
        <View style={styles.imageViewer}>
          <Image source={{ uri: selectedImage }} style={styles.mainImage} resizeMode="cover" />
          <IconButton
            icon={isFavorite ? "heart" : "heart-outline"}
            iconColor={isFavorite ? "#E53935" : "#000"}
            style={styles.favBtn}
            size={24}
            onPress={() => setIsFavorite(!isFavorite)}
          />
        </View>

        {images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsRow}>
            {images.map((img, idx) => (
              <IconButton
                key={idx}
                icon="image"
                size={20}
                onPress={() => setSelectedImage(img)}
                style={{ backgroundColor: selectedImage === img ? theme.colors.primaryContainer : '#E2E8F0' }}
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.contentSection}>
          <Text variant="headlineSmall" style={styles.priceText}>
            ₹{part.price.toLocaleString('en-IN')}
          </Text>
          <Text variant="titleLarge" style={styles.titleText}>
            {part.title}
          </Text>

          <View style={styles.badgeRow}>
            <Chip icon="check-circle" style={styles.chip}>{part.condition}</Chip>
            <Chip icon="car" style={styles.chip}>{part.carBrand} {part.carModel}</Chip>
            {part.year && <Chip icon="calendar" style={styles.chip}>{part.year}</Chip>}
          </View>

          <Divider style={styles.divider} />

          {/* Description */}
          <Text variant="titleMedium" style={styles.heading}>Part Overview & Details</Text>
          <Text variant="bodyMedium" style={styles.description}>
            {part.description}
          </Text>

          <Divider style={styles.divider} />

          {/* Location */}
          <Text variant="titleMedium" style={styles.heading}>Pickup / Delivery Location</Text>
          <Text variant="bodyMedium" style={styles.location}>
            📍 {part.location}
          </Text>

          <Divider style={styles.divider} />

          {/* Seller Profile Card */}
          <Card mode="outlined" style={styles.sellerCard}>
            <Card.Title
              title={part.contactName}
              subtitle={`Verified Seller • Member`}
              left={(props) => <Avatar.Icon {...props} icon="account" style={{ backgroundColor: theme.colors.primaryContainer }} />}
              right={(props) => (
                <Button 
                  mode="text" 
                  onPress={() => navigation.navigate('SellerProfile', { sellerId: part.sellerId, sellerName: part.contactName })}
                >
                  View Profile
                </Button>
              )}
            />
          </Card>
        </View>
      </ScrollView>

      {/* Action Footer Bar */}
      <View style={styles.footer}>
        <Button mode="outlined" icon="message-text" onPress={handleStartChat} style={styles.footerBtn}>
          Chat
        </Button>
        <Button mode="contained" icon="phone" onPress={handleCall} style={[styles.footerBtn, { backgroundColor: '#059669' }]}>
          Call
        </Button>
        <Button mode="contained" icon="whatsapp" onPress={handleWhatsApp} style={[styles.footerBtn, { backgroundColor: '#25D366' }]}>
          WhatsApp
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  imageViewer: {
    position: 'relative',
    height: 280,
    backgroundColor: '#F1F5F9',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  favBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  thumbnailsRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  contentSection: {
    padding: 16,
  },
  priceText: {
    fontWeight: '800',
    color: '#0056D2',
    marginBottom: 4,
  },
  titleText: {
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#F1F5F9',
  },
  divider: {
    marginVertical: 16,
  },
  heading: {
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  description: {
    color: '#475569',
    lineHeight: 22,
  },
  location: {
    color: '#1E293B',
    fontWeight: '500',
  },
  sellerCard: {
    borderRadius: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  footerBtn: {
    flex: 1,
    borderRadius: 8,
  }
});
