import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { List, Avatar, Text, Badge, Divider, useTheme } from 'react-native-paper';
import { ChatRoom } from '../types';

const MOCK_CHATS: ChatRoom[] = [
  {
    id: 'chat-1',
    partId: 'part-1',
    partTitle: 'Maruti Swift Brake Pads (Front)',
    partImage: 'https://images.unsplash.com/photo-1600706432520-2c1b82736209?w=600&auto=format&fit=crop',
    partPrice: 1850,
    buyerId: 'user-current',
    buyerName: 'You',
    sellerId: 'seller-1',
    sellerName: 'Rahul Sharma',
    lastMessage: 'Is this brake pad set still available?',
    lastMessageTime: Date.now() - 1800000,
    unreadCount: 1,
  },
  {
    id: 'chat-2',
    partId: 'part-2',
    partTitle: 'Hyundai Creta LED Headlight Assembly',
    partImage: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=600&auto=format&fit=crop',
    partPrice: 6500,
    buyerId: 'user-current',
    buyerName: 'You',
    sellerId: 'seller-2',
    sellerName: 'Anand Kumar',
    lastMessage: 'Can you offer a slight discount if I pick it up today?',
    lastMessageTime: Date.now() - 86400000,
    unreadCount: 0,
  }
];

export function ChatsScreen({ navigation }: any) {
  const theme = useTheme();
  const [chats, setChats] = useState<ChatRoom[]>(MOCK_CHATS);

  const renderChatItem = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ChatRoom', {
        partId: item.partId,
        partTitle: item.partTitle,
        partImage: item.partImage,
        partPrice: item.partPrice,
        sellerId: item.sellerId,
        sellerName: item.sellerName
      })}
    >
      <List.Item
        title={item.sellerName}
        description={item.lastMessage}
        descriptionNumberOfLines={1}
        left={props => (
          <Avatar.Image
            {...props}
            size={48}
            source={{ uri: item.partImage || 'https://images.unsplash.com/photo-1600706432520-2c1b82736209?w=600&auto=format&fit=crop' }}
          />
        )}
        right={props => (
          <View style={styles.rightMeta}>
            <Text variant="bodySmall" style={styles.timeText}>
              {new Date(item.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {item.unreadCount ? (
              <Badge style={styles.badge}>{item.unreadCount}</Badge>
            ) : null}
          </View>
        )}
      />
      <Divider />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  list: {
    paddingVertical: 8,
  },
  rightMeta: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  timeText: {
    color: '#94A3B8',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#0056D2',
  },
});
