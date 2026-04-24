// app/starred-messages.tsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Platform, StatusBar, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService, Message, User } from '../../../lib/api';

// API Configuration
const API_BASE_URL = 'http://192.168.137.1:8000';

interface StarredMessage {
  id: string;
  message_id: string;
  content: string;
  message_type: string;
  media_url: string | null;
  created_at: string;
  chat_id: string;
  chat_name: string;
  chat_avatar: string;
  isGroup: boolean;
  sender_name: string;
  sender_id: number;
}

export default function StarredMessagesScreen() {
  const router = useRouter();
  const [starredMessages, setStarredMessages] = useState<StarredMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<StarredMessage[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Helper function to get valid image URL
  const getValidImageUrl = (imageUrl: string | undefined | null): string => {
    const defaultAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';
    
    if (!imageUrl) {
      return defaultAvatar;
    }
    
    if (imageUrl.startsWith('data:image')) {
      return imageUrl;
    }
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    if (imageUrl.startsWith('/')) {
      return `${API_BASE_URL}${imageUrl}`;
    }
    
    return defaultAvatar;
  };

  // Load current user and starred messages
  useEffect(() => {
    loadCurrentUser();
    loadStarredMessages();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStarredMessages();
    }, [])
  );

  useEffect(() => {
    filterMessages();
  }, [starredMessages, filter]);

  const loadCurrentUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadStarredMessages = async () => {
    try {
      setLoading(true);
      const messages = await chatService.getStarredMessages();
      
      // Format messages for display
      const formattedMessages: StarredMessage[] = messages.map((msg: Message) => {
        // Extract chat name and avatar from message
        let chatName = 'Unknown';
        let chatAvatar = '';
        let isGroup = false;
        
        if (msg.sender_details) {
          chatName = msg.sender_details.full_name || msg.sender_details.mobile_number || 'Unknown';
          chatAvatar = getValidImageUrl(msg.sender_details.profile_picture);
        }
        
        return {
          id: msg.message_id,
          message_id: msg.message_id,
          content: msg.content,
          message_type: msg.message_type,
          media_url: msg.media_url,
          created_at: msg.created_at,
          chat_id: msg.chat.toString(),
          chat_name: chatName,
          chat_avatar: chatAvatar,
          isGroup: false,
          sender_name: msg.sender_details?.full_name || 'Unknown',
          sender_id: msg.sender,
        };
      });
      
      setStarredMessages(formattedMessages);
      console.log('Starred messages loaded:', formattedMessages.length);
    } catch (error: any) {
      console.error('Error loading starred messages:', error);
      Alert.alert('Error', error.message || 'Failed to load starred messages');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadStarredMessages();
  }, []);

  const filterMessages = () => {
    let filtered = [...starredMessages];
    
    if (filter === 'media') {
      filtered = filtered.filter(msg => 
        msg.message_type === 'image' || 
        msg.message_type === 'video' || 
        msg.media_url
      );
    } else if (filter === 'docs') {
      filtered = filtered.filter(msg => 
        msg.message_type === 'document'
      );
    }
    
    setFilteredMessages(filtered);
  };

  const handleMessagePress = (chatId: string, messageId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleUnstar = async (messageId: string) => {
    Alert.alert(
      'Remove from starred',
      'Are you sure you want to remove this message from starred?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await chatService.toggleStarMessage(messageId);
              // Remove from local list
              setStarredMessages(prev => prev.filter(msg => msg.message_id !== messageId));
              Alert.alert('Success', 'Message removed from starred');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove starred message');
            }
          }
        }
      ]
    );
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (days === 0) {
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const renderMessage = ({ item }: { item: StarredMessage }) => (
    <TouchableOpacity 
      style={styles.messageCard}
      onPress={() => handleMessagePress(item.chat_id, item.message_id)}
      activeOpacity={0.7}
    >
      {/* Chat Info */}
      <View style={styles.chatHeader}>
        <Image source={{ uri: item.chat_avatar }} style={styles.chatAvatar} />
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{item.chat_name}</Text>
          <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
        </View>
        <TouchableOpacity onPress={() => handleUnstar(item.message_id)} style={styles.starButton}>
          <Ionicons name="star" size={22} color="#FFC107" />
        </TouchableOpacity>
      </View>

      {/* Message Content */}
      <View style={styles.messageContent}>
        {item.media_url && (item.message_type === 'image') && (
          <Image source={{ uri: item.media_url }} style={styles.messageMedia} />
        )}
        {item.media_url && (item.message_type === 'video') && (
          <View style={styles.videoPreview}>
            <Ionicons name="play-circle" size={48} color="#075E54" />
            <Text style={styles.videoText}>Video message</Text>
          </View>
        )}
        {item.message_type === 'document' && (
          <View style={styles.documentPreview}>
            <Ionicons name="document-text" size={32} color="#075E54" />
            <Text style={styles.documentText}>Document</Text>
          </View>
        )}
        <Text style={styles.messageText} numberOfLines={3}>
          {item.content}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.messageActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleMessagePress(item.chat_id, item.message_id)}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#666" />
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={18} color="#666" />
          <Text style={styles.actionText}>Forward</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="star-outline" size={64} color="#ddd" />
      </View>
      <Text style={styles.emptyTitle}>No starred messages</Text>
      <Text style={styles.emptyText}>
        Star important messages to find them easily
      </Text>
      <Text style={styles.emptyHint}>
        Press and hold any message and tap the star icon
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Loading starred messages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Starred messages</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'media' && styles.filterTabActive]}
          onPress={() => setFilter('media')}
        >
          <Text style={[styles.filterText, filter === 'media' && styles.filterTextActive]}>Media</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'docs' && styles.filterTabActive]}
          onPress={() => setFilter('docs')}
        >
          <Text style={[styles.filterText, filter === 'docs' && styles.filterTextActive]}>Documents</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={18} color="#25D366" />
        <Text style={styles.infoText}>
          Your starred messages are private and only visible to you
        </Text>
      </View>

      {/* Starred Messages List */}
      <FlatList
        data={filteredMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#25D366"]} tintColor="#25D366" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 76,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 32,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterTabActive: {
    backgroundColor: '#e8f5e9',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#075E54',
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    margin: 12,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  listContainer: {
    padding: 12,
    paddingBottom: 20,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
  },
  starButton: {
    padding: 4,
  },
  messageContent: {
    marginBottom: 12,
  },
  messageMedia: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  videoPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  videoText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  documentText: {
    fontSize: 14,
    color: '#075E54',
    fontWeight: '500',
  },
  messageText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  messageActions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#f0f0f0',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});