import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Avatar, Text, Card, Button, List, Divider } from 'react-native-paper';

export function SellerProfileScreen({ route, navigation }: any) {
  const { sellerName } = route.params || { sellerName: 'Rahul Sharma' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.header}>
          <Avatar.Icon size={64} icon="account" />
          <View style={styles.details}>
            <Text variant="titleLarge" style={styles.name}>{sellerName}</Text>
            <Text variant="bodyMedium" style={styles.verified}>✓ Verified Spare Parts Vendor</Text>
            <Text variant="bodySmall" style={styles.rating}>⭐ 4.8 Rating (12 Reviews)</Text>
          </View>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.sectionHeader}>Active Vendor Listings</Text>

      <Card style={styles.itemCard} mode="outlined">
        <Card.Title
          title="Maruti Swift Brake Pads (Front)"
          subtitle="₹1,850 • New Condition"
          left={(props) => <Avatar.Icon {...props} icon="car-brake-pad" />}
        />
        <Card.Actions>
          <Button mode="contained" onPress={() => navigation.navigate('Home')}>View Listing</Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16 },
  card: { marginBottom: 16, borderRadius: 12 },
  header: { flexDirection: 'row', alignItems: 'center' },
  details: { marginLeft: 16 },
  name: { fontWeight: '800' },
  verified: { color: '#059669', fontWeight: '600' },
  rating: { color: '#D97706', marginTop: 2 },
  sectionHeader: { fontWeight: '700', marginBottom: 12 },
  itemCard: { borderRadius: 8 }
});
