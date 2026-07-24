import React, { useState, useEffect } from 'react';
import { View, ScrollView, FlatList, Image, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Searchbar, Text, Chip, Card, FAB, Badge, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { SparePart } from '../types';
import { fetchPartsList } from '../services/firebase';

const CATEGORIES = [
  "All",
  "Engine Parts",
  "Brakes & Suspension",
  "Headlights & Lighting",
  "Body Parts",
  "Wheels & Tyres",
  "Electrical & Electronics",
  "Interior Accessories"
];

const BRANDS = ["All", "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Honda", "Toyota"];

export function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    const list = await fetchPartsList();
    setParts(list);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleWishlist = (id: string) => {
    setWishlist(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          part.carBrand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          part.carModel.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || part.category === selectedCategory;
    const matchesBrand = selectedBrand === 'All' || part.carBrand === selectedBrand;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  const renderPartCard = ({ item }: { item: SparePart }) => {
    const isWishlisted = wishlist.includes(item.id);
    return (
      <TouchableOpacity 
        style={styles.cardWrapper} 
        onPress={() => navigation.navigate('ProductDetail', { part: item })}
        activeOpacity={0.8}
      >
        <Card style={styles.card} mode="elevated">
          <View style={styles.imageContainer}>
            <Card.Cover source={{ uri: item.imageUrl }} style={styles.cardCover} />
            {item.featured && (
              <Badge style={styles.featuredBadge}>FEATURED</Badge>
            )}
            <IconButton
              icon={isWishlisted ? "heart" : "heart-outline"}
              iconColor={isWishlisted ? "#E53935" : "#FFFFFF"}
              size={22}
              style={styles.wishlistBtn}
              onPress={() => toggleWishlist(item.id)}
            />
          </View>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" numberOfLines={1} style={styles.title}>
              {item.title}
            </Text>
            <Text variant="titleLarge" style={[styles.price, { color: theme.colors.primary }]}>
              ₹{item.price.toLocaleString('en-IN')}
            </Text>
            <View style={styles.metaRow}>
              <Text variant="bodySmall" style={styles.brandText}>
                {item.carBrand} {item.carModel}
              </Text>
              <Text variant="bodySmall" style={styles.conditionText}>
                {item.condition}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.locationText} numberOfLines={1}>
              📍 {item.location}
            </Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search parts, brands, models..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          elevation={1}
        />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Horizontal Chips */}
        <View style={styles.sectionHeader}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Categories</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
          {CATEGORIES.map(cat => (
            <Chip
              key={cat}
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
              style={styles.chip}
              mode={selectedCategory === cat ? "flat" : "outlined"}
            >
              {cat}
            </Chip>
          ))}
        </ScrollView>

        {/* Brand Horizontal Chips */}
        <View style={styles.sectionHeader}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Popular Car Brands</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
          {BRANDS.map(brand => (
            <Chip
              key={brand}
              selected={selectedBrand === brand}
              onPress={() => setSelectedBrand(brand)}
              style={styles.chip}
              mode={selectedBrand === brand ? "flat" : "outlined"}
            >
              {brand}
            </Chip>
          ))}
        </ScrollView>

        {/* Listings Section */}
        <View style={styles.listingsHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Spare Parts Listings ({filteredParts.length})
          </Text>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 12 }}>Loading genuine spare parts...</Text>
          </View>
        ) : filteredParts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge">No spare parts found matching your criteria.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredParts}
            renderItem={renderPartCard}
            keyExtractor={item => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.gridContainer}
          />
        )}
      </ScrollView>

      {/* Sell Floating Action Button */}
      <FAB
        icon="plus"
        label="Sell Part"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => navigation.navigate('Sell')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1E293B',
  },
  horizontalChips: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    marginRight: 8,
  },
  listingsHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  gridContainer: {
    paddingHorizontal: 8,
    paddingBottom: 80,
  },
  cardWrapper: {
    width: '50%',
    padding: 6,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  cardCover: {
    height: 130,
    backgroundColor: '#F1F5F9',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  wishlistBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardContent: {
    padding: 10,
  },
  title: {
    fontWeight: '600',
    fontSize: 14,
  },
  price: {
    fontWeight: '700',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  brandText: {
    color: '#64748B',
    fontSize: 11,
  },
  conditionText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '600',
  },
  locationText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 30,
  },
});
