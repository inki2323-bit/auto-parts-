import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Card, Text, Button, SegmentedButtons, List, Avatar, Badge, TextInput, useTheme } from 'react-native-paper';
import {
  fetchAdminDashboardStats,
  fetchAdminUsers,
  fetchAdminListings,
  fetchAdminReports,
  fetchAdminNotifications,
  fetchActivityLogs,
  moderateListing,
  deleteListingAdmin,
  deleteListingImage,
  saveCategory,
  deleteCategory,
  fetchAdminCategories,
  saveAppConfig,
  sendBroadcastAnnouncement,
  updateUserAccess,
} from '../services/admin';

export function AdminScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState('listings');
  const [broadcastText, setBroadcastText] = useState('');
  const [apkUrl, setApkUrl] = useState('https://github.com/autoparts/app/releases/download/v1.1.0/AutoParts-v1.1.0.apk');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [dashboardStats, adminUsers, adminListings, adminReports, adminNotifications, adminLogs, adminCategories] = await Promise.all([
        fetchAdminDashboardStats(),
        fetchAdminUsers(),
        fetchAdminListings(),
        fetchAdminReports(),
        fetchAdminNotifications(),
        fetchActivityLogs(),
        fetchAdminCategories(),
      ]);
      setStats(dashboardStats);
      setUsers(adminUsers);
      setListings(adminListings);
      setReports(adminReports);
      setNotifications(adminNotifications);
      setActivityLogs(adminLogs);
      setCategories(adminCategories);
    } catch (error: any) {
      Alert.alert('Admin Error', error.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleModerate = async (listingId: string, decision: 'approved' | 'rejected') => {
    try {
      await moderateListing(listingId, decision);
      await loadAdminData();
      Alert.alert('Moderation Updated', `Listing ${decision}.`);
    } catch (error: any) {
      Alert.alert('Moderation Error', error.message || 'Failed to update listing status.');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      await deleteListingAdmin(listingId);
      await loadAdminData();
      Alert.alert('Listing Deleted', 'The listing was removed from the marketplace.');
    } catch (error: any) {
      Alert.alert('Delete Error', error.message || 'Failed to delete listing.');
    }
  };

  const handleRemoveImage = async (listingId: string, imageUrl: string) => {
    try {
      await deleteListingImage(listingId, imageUrl);
      await loadAdminData();
      Alert.alert('Image Removed', 'The image was removed from the listing.');
    } catch (error: any) {
      Alert.alert('Image Error', error.message || 'Failed to remove image.');
    }
  };

  const handleToggleBlock = async (userId: string, currentValue: boolean) => {
    try {
      await updateUserAccess(userId, { isBlocked: !currentValue });
      await loadAdminData();
    } catch (error: any) {
      Alert.alert('User Update Error', error.message || 'Failed to update user state.');
    }
  };

  const handleSaveCategory = async () => {
    try {
      await saveCategory({ name: categoryName, description: categoryDescription });
      setCategoryName('');
      setCategoryDescription('');
      await loadAdminData();
      Alert.alert('Category Saved', 'The category was saved to Firestore.');
    } catch (error: any) {
      Alert.alert('Category Error', error.message || 'Failed to save category.');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
      await loadAdminData();
    } catch (error: any) {
      Alert.alert('Category Error', error.message || 'Failed to delete category.');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await saveAppConfig({ apkDownloadUrl: apkUrl, latestVersion: '1.1.0' });
      Alert.alert('Config Saved', 'APK URL was updated in Firestore.');
    } catch (error: any) {
      Alert.alert('Config Error', error.message || 'Failed to save config.');
    }
  };

  const handleBroadcast = async () => {
    try {
      await sendBroadcastAnnouncement(broadcastText);
      setBroadcastText('');
      Alert.alert('Broadcast Sent', 'Announcement and notification were pushed to Firestore.');
    } catch (error: any) {
      Alert.alert('Broadcast Error', error.message || 'Failed to send broadcast.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.header}>Super Admin Operations Panel</Text>

      {loading ? (
        <View style={styles.loaderWrap}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : null}

      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'listings', label: 'Moderation' },
          { value: 'users', label: 'Users' },
          { value: 'config', label: 'APK Config' },
        ]}
        style={styles.segmented}
      />

      {tab === 'listings' && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.subHeader}>Dashboard Summary</Text>
          <View style={styles.statGrid}>
            <Card mode="outlined" style={styles.statCard}><Card.Content><Text variant="titleLarge">{stats?.totalListings ?? 0}</Text><Text variant="bodySmall">Listings</Text></Card.Content></Card>
            <Card mode="outlined" style={styles.statCard}><Card.Content><Text variant="titleLarge">{stats?.pendingListings ?? 0}</Text><Text variant="bodySmall">Pending</Text></Card.Content></Card>
            <Card mode="outlined" style={styles.statCard}><Card.Content><Text variant="titleLarge">{stats?.approvedListings ?? 0}</Text><Text variant="bodySmall">Approved</Text></Card.Content></Card>
            <Card mode="outlined" style={styles.statCard}><Card.Content><Text variant="titleLarge">{stats?.totalReports ?? 0}</Text><Text variant="bodySmall">Reports</Text></Card.Content></Card>
          </View>

          <Text variant="titleMedium" style={styles.subHeader}>Pending Listings Moderation</Text>
          {listings.filter(item => item.status === 'pending' || item.approved === false).length === 0 && <Text variant="bodyMedium" style={styles.emptyState}>No pending listings.</Text>}
          {listings.filter(item => item.status === 'pending' || item.approved === false).map(item => (
            <Card key={item.id} mode="outlined" style={styles.card}>
              <Card.Title
                title={item.title || 'Untitled Listing'}
                subtitle={`₹${item.price || 0} • Seller: ${item.sellerEmail || item.contactName || 'Unknown'}`}
                left={(props) => <Avatar.Icon {...props} icon="car-cog" />}
              />
              <Card.Actions>
                <Button mode="contained" buttonColor="#059669" onPress={() => handleModerate(item.id, 'approved')}>
                  Approve
                </Button>
                <Button mode="outlined" textColor="#E53935" onPress={() => handleModerate(item.id, 'rejected')}>
                  Reject
                </Button>
                <Button mode="text" onPress={() => handleDeleteListing(item.id)}>
                  Delete
                </Button>
              </Card.Actions>
            </Card>
          ))}
        </View>
      )}

      {tab === 'users' && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.subHeader}>Registered Marketplace Users</Text>
          {users.map(user => (
            <List.Item
              key={user.id}
              title={`${user.name || user.email || 'User'}${user.isBlocked ? ' (Blocked)' : ''}`}
              description={`${user.email || 'No email'} • ${user.role || 'user'}`}
              left={props => <List.Icon {...props} icon={user.role === 'admin' ? 'account-shield' : 'account-check'} color={user.isBlocked ? '#E53935' : '#059669'} />}
              right={() => (
                <Button mode="text" onPress={() => handleToggleBlock(user.id, Boolean(user.isBlocked))}>
                  {user.isBlocked ? 'Unblock' : 'Block'}
                </Button>
              )}
            />
          ))}
        </View>
      )}

      {tab === 'config' && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.subHeader}>APK Download & Version Manager</Text>
          <TextInput
            label="APK Direct Download URL"
            value={apkUrl}
            onChangeText={setApkUrl}
            mode="outlined"
            style={styles.input}
          />
          <Button mode="contained" onPress={handleSaveConfig}>
            Save Version Config
          </Button>

          <Text variant="titleMedium" style={[styles.subHeader, { marginTop: 20 }]}>Send Broadcast Notification</Text>
          <TextInput
            label="Announcement Message"
            value={broadcastText}
            onChangeText={setBroadcastText}
            mode="outlined"
            placeholder="Type message for all app users..."
            style={styles.input}
          />
          <Button mode="contained" buttonColor="#1E293B" onPress={handleBroadcast}>
            Send Broadcast Alert
          </Button>

          <Text variant="titleMedium" style={[styles.subHeader, { marginTop: 20 }]}>Categories</Text>
          <TextInput label="Category Name" value={categoryName} onChangeText={setCategoryName} mode="outlined" style={styles.input} />
          <TextInput label="Category Description" value={categoryDescription} onChangeText={setCategoryDescription} mode="outlined" style={styles.input} />
          <Button mode="contained" onPress={handleSaveCategory}>Save Category</Button>
          {categories.map(category => (
            <Card key={category.id} mode="outlined" style={styles.card}>
              <Card.Title title={category.name} subtitle={category.description} />
              <Card.Actions>
                <Button mode="text" onPress={() => handleDeleteCategory(category.id)}>Delete</Button>
              </Card.Actions>
            </Card>
          ))}

          <Text variant="titleMedium" style={[styles.subHeader, { marginTop: 20 }]}>Reports</Text>
          {reports.map(report => (
            <Card key={report.id} mode="outlined" style={styles.card}>
              <Card.Title title={report.reason || 'Report'} subtitle={report.description || ''} />
            </Card>
          ))}

          <Text variant="titleMedium" style={[styles.subHeader, { marginTop: 20 }]}>Notifications</Text>
          {notifications.map(notification => (
            <Card key={notification.id} mode="outlined" style={styles.card}>
              <Card.Title title={notification.title || 'Notification'} subtitle={notification.body || notification.message || ''} />
            </Card>
          ))}

          <Text variant="titleMedium" style={[styles.subHeader, { marginTop: 20 }]}>Activity Log</Text>
          {activityLogs.map(log => (
            <Card key={log.id} mode="outlined" style={styles.card}>
              <Card.Title title={log.action} subtitle={new Date(log.createdAt).toLocaleString()} />
            </Card>
          ))}
        </View>
      )}
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
  },
  header: {
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  segmented: {
    marginBottom: 16,
  },
  section: {
    gap: 12,
  },
  subHeader: {
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  card: {
    borderRadius: 8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  loaderWrap: {
    marginVertical: 12,
    alignItems: 'center',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: '48%',
    borderRadius: 8,
  },
  emptyState: {
    color: '#64748B',
    marginBottom: 8,
  }
});
