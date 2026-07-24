import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Text, Button, SegmentedButtons, List, Avatar, Badge, TextInput, useTheme } from 'react-native-paper';

export function AdminScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState('listings');
  const [broadcastText, setBroadcastText] = useState('');
  const [apkUrl, setApkUrl] = useState('https://github.com/autoparts/app/releases/download/v1.1.0/AutoParts-v1.1.0.apk');

  const pendingListings = [
    {
      id: 'part-pending-1',
      title: 'Mahindra Thar Grille Assembly (Black)',
      price: 3500,
      seller: 'Vikram Patel',
      status: 'pending',
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.header}>Super Admin Operations Panel</Text>

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
          <Text variant="titleMedium" style={styles.subHeader}>Pending Listings Moderation</Text>
          {pendingListings.map(item => (
            <Card key={item.id} mode="outlined" style={styles.card}>
              <Card.Title
                title={item.title}
                subtitle={`₹${item.price} • Seller: ${item.seller}`}
                left={(props) => <Avatar.Icon {...props} icon="car-cog" />}
              />
              <Card.Actions>
                <Button mode="contained" buttonColor="#059669" onPress={() => Alert.alert('Approved', 'Listing has been approved.')}>
                  Approve
                </Button>
                <Button mode="outlined" textColor="#E53935" onPress={() => Alert.alert('Rejected', 'Listing rejected.')}>
                  Reject
                </Button>
              </Card.Actions>
            </Card>
          ))}
        </View>
      )}

      {tab === 'users' && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.subHeader}>Registered Marketplace Users</Text>
          <List.Item
            title="Rahul Sharma (Super Admin)"
            description="wwwautoparts2@gmail.com • Active"
            left={props => <List.Icon {...props} icon="account-shield" color="#0056D2" />}
          />
          <List.Item
            title="Anand Kumar"
            description="anand@creta.com • Verified Seller"
            left={props => <List.Icon {...props} icon="account-check" color="#059669" />}
          />
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
          <Button mode="contained" onPress={() => Alert.alert('Config Saved', 'APK URL updated across all app instances.')}>
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
          <Button mode="contained" buttonColor="#1E293B" onPress={() => {
            Alert.alert('Broadcast Sent', 'Notification sent to all active users.');
            setBroadcastText('');
          }}>
            Send Broadcast Alert
          </Button>
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
  }
});
