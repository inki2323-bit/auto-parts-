import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { Avatar, Text, Card, List, Button, Divider, SegmentedButtons, Badge, useTheme } from 'react-native-paper';
import { SparePart } from '../types';
import { logoutUser, deleteSparePartListing } from '../services/firebase';

export function ProfileScreen({ navigation }: any) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('my_ads');
  
  const handleLogout = async () => {
    try {
      await logoutUser();
      Alert.alert('Logged Out', 'You have been signed out successfully.');
      navigation.navigate('Auth');
    } catch (err: any) {
      Alert.alert('Logout Error', err.message || 'Failed to logout.');
    }
  };

  const handleDeleteListing = (partId: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? All associated photos will be purged from Cloudinary.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSparePartListing(partId);
              Alert.alert('Listing Deleted', 'The listing and its images have been removed.');
            } catch (err: any) {
              Alert.alert('Deletion Error', err.message || 'Could not delete listing.');
            }
          }
        }
      ]
    );
  };
  
  const user = {
    name: 'Rahul Sharma',
    email: 'wwwautoparts2@gmail.com', // Super Admin Email
    phone: '+91 98765 43210',
    location: 'Mumbai, Maharashtra',
    rating: 4.8,
    reviewsCount: 12,
  };

  const isAdmin = user.email === 'wwwautoparts2@gmail.com';

  const myAdsList: SparePart[] = [
    {
      id: 'part-1',
      title: 'Maruti Swift Brake Pads (Front)',
      category: 'Brakes & Suspension',
      carBrand: 'Maruti Suzuki',
      carModel: 'Swift',
      price: 1850,
      condition: 'New',
      imageUrl: 'https://images.unsplash.com/photo-1600706432520-2c1b82736209?w=600&auto=format&fit=crop',
      description: 'Original OEM Front Brake Pad Set',
      location: 'Mumbai, Maharashtra',
      contactName: 'Rahul Sharma',
      contactPhone: '+91 98765 43210',
      sellerId: 'user-current',
      sellerEmail: 'wwwautoparts2@gmail.com',
      createdAt: Date.now(),
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <Card mode="outlined" style={styles.profileCard}>
        <Card.Content style={styles.headerContent}>
          <Avatar.Icon size={64} icon="account" backgroundColor={theme.colors.primaryContainer} />
          <View style={styles.headerDetails}>
            <View style={styles.nameRow}>
              <Text variant="titleLarge" style={styles.userName}>{user.name}</Text>
              {isAdmin && <Badge style={styles.adminBadge}>ADMIN</Badge>}
            </View>
            <Text variant="bodyMedium" style={styles.userEmail}>{user.email}</Text>
            <Text variant="bodySmall" style={styles.userLocation}>📍 {user.location}</Text>
            <Text variant="bodySmall" style={styles.userRating}>⭐ {user.rating} ({user.reviewsCount} Reviews)</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Admin Panel Entry if Admin */}
      {isAdmin && (
        <Button
          mode="contained"
          icon="shield-account"
          onPress={() => navigation.navigate('AdminDashboard')}
          style={[styles.adminBtn, { backgroundColor: '#1E293B' }]}
        >
          Open Admin Dashboard Panel
        </Button>
      )}

      {/* APK App Version Update Box */}
      <Card style={styles.updateCard} mode="elevated">
        <Card.Title
          title="Auto Parts Android App v1.1.0"
          subtitle="Latest native Android build available"
          left={(props) => <Avatar.Icon {...props} icon="cellphone-arrow-down" backgroundColor="#DCE2FF" iconColor="#0056D2" />}
        />
        <Card.Content>
          <Text variant="bodySmall" style={{ color: '#475569', marginBottom: 8 }}>
            Includes faster native scrolling, FlashList optimization, offline Firestore persistence, and multi-photo uploads.
          </Text>
          <Button
            mode="outlined"
            icon="download"
            onPress={() => Linking.openURL('https://github.com/autoparts/app/releases/download/v1.1.0/AutoParts-v1.1.0.apk')}
          >
            Download Signed APK (Direct)
          </Button>
        </Card.Content>
      </Card>

      {/* Tabs for My Ads vs Wishlist */}
      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          { value: 'my_ads', label: 'My Ads (1)' },
          { value: 'wishlist', label: 'Saved Wishlist' },
        ]}
        style={styles.tabs}
      />

      {activeTab === 'my_ads' ? (
        <View style={styles.adsList}>
          {myAdsList.map(item => (
            <Card key={item.id} style={styles.adCard} mode="outlined">
              <Card.Title
                title={item.title}
                subtitle={`₹${item.price.toLocaleString('en-IN')} • ${item.condition}`}
                left={(props) => <Avatar.Image {...props} source={{ uri: item.imageUrl }} />}
              />
              <Card.Actions>
                <Button mode="text" onPress={() => Alert.alert('Edit Listing', 'Opening listing editor.')}>Edit</Button>
                <Button mode="text" textColor="#E53935" onPress={() => handleDeleteListing(item.id)}>Delete</Button>
              </Card.Actions>
            </Card>
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text variant="bodyMedium" style={{ color: '#64748B' }}>No saved wishlist items yet.</Text>
        </View>
      )}

      <Divider style={styles.divider} />

      {/* Settings List */}
      <List.Section>
        <List.Subheader>Account & Preferences</List.Subheader>
        <List.Item
          title="Edit Profile"
          left={props => <List.Icon {...props} icon="account-edit" />}
          onPress={() => Alert.alert('Profile', 'Edit profile details')}
        />
        <List.Item
          title="Language Settings"
          description="English / Hindi / Regional"
          left={props => <List.Icon {...props} icon="translate" />}
          onPress={() => Alert.alert('Language', 'Language selector')}
        />
        <List.Item
          title="Help & Support"
          left={props => <List.Icon {...props} icon="help-circle" />}
          onPress={() => Alert.alert('Support', 'Contact Support at support@autoparts.com')}
        />
        <List.Item
          title="Logout"
          titleStyle={{ color: '#E53935' }}
          left={props => <List.Icon {...props} icon="logout" color="#E53935" />}
          onPress={handleLogout}
        />
      </List.Section>
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
  profileCard: {
    borderRadius: 12,
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerDetails: {
    marginLeft: 16,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontWeight: '800',
  },
  adminBadge: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#64748B',
  },
  userLocation: {
    color: '#94A3B8',
    marginTop: 2,
  },
  userRating: {
    color: '#D97706',
    fontWeight: '600',
    marginTop: 2,
  },
  adminBtn: {
    marginBottom: 16,
    borderRadius: 8,
  },
  updateCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  tabs: {
    marginBottom: 16,
  },
  adsList: {
    gap: 12,
  },
  adCard: {
    borderRadius: 8,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  divider: {
    marginVertical: 16,
  }
});
