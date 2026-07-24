import React, { useState } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, IconButton, Card, Avatar, Text, useTheme } from 'react-native-paper';
import { ChatMessage } from '../types';

export function ChatRoomScreen({ route }: any) {
  const { partTitle, partImage, partPrice, sellerName } = route.params || {};
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      senderId: 'seller',
      text: `Hello! Yes, the ${partTitle || 'spare part'} is available.`,
      timestamp: Date.now() - 600000,
    },
    {
      id: 'msg-2',
      senderId: 'me',
      text: 'Great! Is the price negotiable?',
      timestamp: Date.now() - 300000,
    }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      text: input.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === 'me';
    return (
      <View style={[styles.msgContainer, isMe ? styles.msgRight : styles.msgLeft]}>
        <View style={[
          styles.msgBubble, 
          isMe ? { backgroundColor: theme.colors.primary } : { backgroundColor: '#E2E8F0' }
        ]}>
          <Text style={[styles.msgText, isMe ? { color: '#FFFFFF' } : { color: '#0F172A' }]}>
            {item.text}
          </Text>
          <Text style={[styles.msgTime, isMe ? { color: '#DCE2FF' } : { color: '#64748B' }]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Listing Summary Header */}
      <Card style={styles.summaryCard} mode="outlined">
        <Card.Title
          title={partTitle || "Spare Part Inquiry"}
          subtitle={`₹${(partPrice || 0).toLocaleString('en-IN')} • Seller: ${sellerName || 'Seller'}`}
          left={(props) => (
            <Avatar.Image
              {...props}
              size={40}
              source={{ uri: partImage || 'https://images.unsplash.com/photo-1600706432520-2c1b82736209?w=600&auto=format&fit=crop' }}
            />
          )}
        />
      </Card>

      {/* Messages Feed */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
      />

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <IconButton icon="camera" size={24} onPress={() => {}} />
        <TextInput
          placeholder="Type message..."
          value={input}
          onChangeText={setInput}
          mode="outlined"
          style={styles.textInput}
          outlineStyle={{ borderRadius: 24 }}
        />
        <IconButton
          icon="send"
          iconColor={theme.colors.primary}
          size={24}
          onPress={handleSend}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  summaryCard: {
    margin: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  messagesList: {
    padding: 12,
  },
  msgContainer: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  msgLeft: {
    justifyContent: 'flex-start',
  },
  msgRight: {
    justifyContent: 'flex-end',
  },
  msgBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  msgText: {
    fontSize: 15,
  },
  msgTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#F1F5F9',
  }
});
