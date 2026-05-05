// app/starred-messages.tsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Platform, StatusBar, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService, Message, User } from '../../../lib/api';

// Theme definitions
const THEMES = {
  light: {
    id: 'light',
    colors: {
      primary: '#075E54',
      primaryLight: '#e8f5e9',
      background: '#F5F5F5',
      cardBg: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      textTertiary: '#999999',
      border: '#E0E0E0',
      placeholder: '#CCCCCC',
      starColor: '#FFC107',
    }
  },
  dark: {
    id: 'dark',
    colors: {
      primary: '#128C7E',
      primaryLight: '#1a2f2a',
      background: '#111B21',
      cardBg: '#202C33',
      surface: '#202C33',
      text: '#E9EDEF',
      textSecondary: '#AEBAC1',
      textTertiary: '#8696A0',
      border: '#2A3942',
      placeholder: '#3D4B55',
      starColor: '#FFC107',
    }
  },
  whatsappGreen: {
    id: 'whatsappGreen',
    colors: {
      primary: '#25D366',
      primaryLight: '#e8f5e9',
      background: '#F0F2F5',
      cardBg: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#111B21',
      textSecondary: '#54656F',
      textTertiary: '#8696A0',
      border: '#E9EDEF',
      placeholder: '#CCCCCC',
      starColor: '#FFC107',
    }
  },
  midnightBlue: {
    id: 'midnightBlue',
    colors: {
      primary: '#1E88E5',
      primaryLight: '#102a44',
      background: '#0A1929',
      cardBg: '#132F4C',
      surface: '#132F4C',
      text: '#FFFFFF',
      textSecondary: '#B0C4DE',
      textTertiary: '#7B9BB5',
      border: '#1E3A5F',
      placeholder: '#2C4A6E',
      starColor: '#FFC107',
    }
  },
  sunsetOrange: {
    id: 'sunsetOrange',
    colors: {
      primary: '#FF5722',
      primaryLight: '#FFE0B2',
      background: '#FFF3E0',
      cardBg: '#FFE0B2',
      surface: '#FFE0B2',
      text: '#4E342E',
      textSecondary: '#8D6E63',
      textTertiary: '#A1887F',
      border: '#FFCC80',
      placeholder: '#FFCC80',
      starColor: '#FF9800',
    }
  },
  purpleHaze: {
    id: 'purpleHaze',
    colors: {
      primary: '#9C27B0',
      primaryLight: '#E1BEE7',
      background: '#F3E5F5',
      cardBg: '#E1BEE7',
      surface: '#E1BEE7',
      text: '#4A148C',
      textSecondary: '#7B1FA2',
      textTertiary: '#9C27B0',
      border: '#CE93D8',
      placeholder: '#CE93D8',
      starColor: '#FFC107',
    }
  },
  oceanTeal: {
    id: 'oceanTeal',
    colors: {
      primary: '#00897B',
      primaryLight: '#B2DFDB',
      background: '#E0F2F1',
      cardBg: '#B2DFDB',
      surface: '#B2DFDB',
      text: '#004D40',
      textSecondary: '#00695C',
      textTertiary: '#00897B',
      border: '#80CBC4',
      placeholder: '#80CBC4',
      starColor: '#FFC107',
    }
  },
  cherryBlossom: {
    id: 'cherryBlossom',
    colors: {
      primary: '#E91E63',
      primaryLight: '#F8BBD0',
      background: '#FCE4EC',
      cardBg: '#F8BBD0',
      surface: '#F8BBD0',
      text: '#880E4F',
      textSecondary: '#AD1457',
      textTertiary: '#C2185B',
      border: '#F48FB1',
      placeholder: '#F48FB1',
      starColor: '#FFC107',
    }
  },
};

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
  const [currentTheme, setCurrentTheme] = useState('light');

  // Get current theme colors
  const theme = THEMES[currentTheme as keyof typeof THEMES];
  const colors = theme.colors;

  // Helper function to get valid image URL
  const getValidImageUrl = (imageUrl: string | undefined | null): string => {
    const defaultAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';
    
    if (!imageUrl) return defaultAvatar;
    if (imageUrl.startsWith('data:image')) return imageUrl;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    if (imageUrl.startsWith('/')) return `https://aptecproject.pythonanywhere.com${imageUrl}`;
    
    return defaultAvatar;
  };

  // Load theme from storage
  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme && THEMES[savedTheme as keyof typeof THEMES]) {
        setCurrentTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  // Load current user and starred messages
  useEffect(() => {
    loadTheme();
    loadCurrentUser();
    loadStarredMessages();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTheme();
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
      
      const formattedMessages: StarredMessage[] = messages.map((msg: Message) => {
        let chatName = 'Unknown';
        let chatAvatar = '';
        
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
      style={[styles.messageCard, { backgroundColor: colors.cardBg, shadowColor: colors.border }]}
      onPress={() => handleMessagePress(item.chat_id, item.message_id)}
      activeOpacity={0.7}
    >
      {/* Chat Info */}
      <View style={styles.chatHeader}>
        <Image source={{ uri: item.chat_avatar }} style={[styles.chatAvatar, { backgroundColor: colors.surface }]} />
        <View style={styles.chatInfo}>
          <Text style={[styles.chatName, { color: colors.text }]}>{item.chat_name}</Text>
          <Text style={[styles.messageTime, { color: colors.textTertiary }]}>{formatTime(item.created_at)}</Text>
        </View>
        <TouchableOpacity onPress={() => handleUnstar(item.message_id)} style={styles.starButton}>
          <Ionicons name="star" size={22} color={colors.starColor} />
        </TouchableOpacity>
      </View>

      {/* Message Content */}
      <View style={styles.messageContent}>
        {item.media_url && (item.message_type === 'image') && (
          <Image source={{ uri: item.media_url }} style={styles.messageMedia} />
        )}
        {item.media_url && (item.message_type === 'video') && (
          <View style={[styles.videoPreview, { backgroundColor: colors.surface }]}>
            <Ionicons name="play-circle" size={48} color={colors.primary} />
            <Text style={[styles.videoText, { color: colors.textSecondary }]}>Video message</Text>
          </View>
        )}
        {item.message_type === 'document' && (
          <View style={[styles.documentPreview, { backgroundColor: colors.surface }]}>
            <Ionicons name="document-text" size={32} color={colors.primary} />
            <Text style={[styles.documentText, { color: colors.primary }]}>Document</Text>
          </View>
        )}
        <Text style={[styles.messageText, { color: colors.text }]} numberOfLines={3}>
          {item.content}
        </Text>
      </View>

      {/* Actions */}
      <View style={[styles.messageActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleMessagePress(item.chat_id, item.message_id)}
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Forward</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
        <Ionicons name="star-outline" size={64} color={colors.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No starred messages</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        Star important messages to find them easily
      </Text>
      <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
        Press and hold any message and tap the star icon
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading starred messages...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Starred messages</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'all' && { backgroundColor: colors.primaryLight }]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, { color: colors.textSecondary }, filter === 'all' && { color: colors.primary, fontWeight: '600' }]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'media' && { backgroundColor: colors.primaryLight }]}
          onPress={() => setFilter('media')}
        >
          <Text style={[styles.filterText, { color: colors.textSecondary }, filter === 'media' && { color: colors.primary, fontWeight: '600' }]}>Media</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'docs' && { backgroundColor: colors.primaryLight }]}
          onPress={() => setFilter('docs')}
        >
          <Text style={[styles.filterText, { color: colors.textSecondary }, filter === 'docs' && { color: colors.primary, fontWeight: '600' }]}>Documents</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 76,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
  },
  listContainer: {
    padding: 12,
    paddingBottom: 20,
  },
  messageCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
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
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageTime: {
    fontSize: 11,
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
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  videoText: {
    fontSize: 14,
    marginTop: 8,
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  documentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageActions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 0.5,
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 12,
    textAlign: 'center',
  },
});