import { View, Text, FlatList, Platform, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator, StatusBar, Alert, Modal, Animated, ActionSheetIOS, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService, contactService, websocketService, Chat as ChatType, User } from '../../lib/api';

// API Configuration
const API_BASE_URL = 'https://aptecproject.pythonanywhere.com';

// Theme definitions
const THEMES = {
  light: {
    id: 'light',
    name: 'Light',
    icon: 'sunny-outline',
    colors: {
      primary: '#075E54',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#000000',
      textSecondary: '#666666',
      border: '#E0E0E0',
      messageBubble: '#DCF8C6',
      messageBubbleOutgoing: '#E4E6EB',
    }
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    icon: 'moon-outline',
    colors: {
      primary: '#128C7E',
      background: '#111B21',
      surface: '#202C33',
      text: '#E9EDEF',
      textSecondary: '#AEBAC1',
      border: '#2A3942',
      messageBubble: '#005C4B',
      messageBubbleOutgoing: '#1F2C34',
    }
  },
  whatsappGreen: {
    id: 'whatsappGreen',
    name: 'WhatsApp Green',
    icon: 'leaf-outline',
    colors: {
      primary: '#25D366',
      background: '#FFFFFF',
      surface: '#F0F2F5',
      text: '#111B21',
      textSecondary: '#54656F',
      border: '#E9EDEF',
      messageBubble: '#DCF8C6',
      messageBubbleOutgoing: '#E4E6EB',
    }
  },
  midnightBlue: {
    id: 'midnightBlue',
    name: 'Midnight Blue',
    icon: 'moon',
    colors: {
      primary: '#1E88E5',
      background: '#0A1929',
      surface: '#132F4C',
      text: '#FFFFFF',
      textSecondary: '#B0C4DE',
      border: '#1E3A5F',
      messageBubble: '#1E3A5F',
      messageBubbleOutgoing: '#2C4A6E',
    }
  },
  sunsetOrange: {
    id: 'sunsetOrange',
    name: 'Sunset Orange',
    icon: 'sunny',
    colors: {
      primary: '#FF5722',
      background: '#FFF3E0',
      surface: '#FFE0B2',
      text: '#4E342E',
      textSecondary: '#8D6E63',
      border: '#FFCC80',
      messageBubble: '#FFE0B2',
      messageBubbleOutgoing: '#FFCC80',
    }
  },
  purpleHaze: {
    id: 'purpleHaze',
    name: 'Purple Haze',
    icon: 'color-palette-outline',
    colors: {
      primary: '#9C27B0',
      background: '#F3E5F5',
      surface: '#E1BEE7',
      text: '#4A148C',
      textSecondary: '#7B1FA2',
      border: '#CE93D8',
      messageBubble: '#E1BEE7',
      messageBubbleOutgoing: '#CE93D8',
    }
  },
  oceanTeal: {
    id: 'oceanTeal',
    name: 'Ocean Teal',
    icon: 'water-outline',
    colors: {
      primary: '#00897B',
      background: '#E0F2F1',
      surface: '#B2DFDB',
      text: '#004D40',
      textSecondary: '#00695C',
      border: '#80CBC4',
      messageBubble: '#B2DFDB',
      messageBubbleOutgoing: '#80CBC4',
    }
  },
  cherryBlossom: {
    id: 'cherryBlossom',
    name: 'Cherry Blossom',
    icon: 'flower-outline',
    colors: {
      primary: '#E91E63',
      background: '#FCE4EC',
      surface: '#F8BBD0',
      text: '#880E4F',
      textSecondary: '#AD1457',
      border: '#F48FB1',
      messageBubble: '#F8BBD0',
      messageBubbleOutgoing: '#F48FB1',
    }
  },
};

interface UIChat {
  id: string;
  chat_id: string;
  name: string;
  phoneNumber: string;
  message: string;
  time: string;
  avatar: string;
  unread: number;
  online: boolean;
  muted: boolean;
  pinned: boolean;
  typing: boolean;
  isGroup: boolean;
  blocked: boolean;
  archived: boolean;
  lastMessageTime: Date;
  otherUserId?: number;
}

export default function ChatsScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<UIChat[]>([]);
  const [filteredChats, setFilteredChats] = useState<UIChat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState<UIChat | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [loading, setLoading] = useState(true);
  
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const theme = THEMES[currentTheme as keyof typeof THEMES];
  const colors = theme.colors;

  const getValidImageUrl = (imageUrl: string | undefined | null): string => {
    const defaultAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';
    if (!imageUrl) return defaultAvatar;
    if (imageUrl.startsWith('data:image')) return imageUrl;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    if (imageUrl.startsWith('/')) return `${API_BASE_URL}${imageUrl}`;
    return defaultAvatar;
  };

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

  useEffect(() => {
    loadTheme();
    loadCurrentUser();
    loadChats();
    setupWebSocket();
    
    return () => {
      websocketService.disconnect();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTheme();
      loadChats();
    }, [])
  );

  useEffect(() => {
    filterChats();
  }, [chats, searchQuery, selectedFilter]);

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

  const setupWebSocket = async () => {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      websocketService.connectToUser(user.id);
      
      websocketService.on('new_message', () => {
        loadChats();
      });
      
      websocketService.on('typing', (data) => {
        updateTypingStatus(data.chat_id, data.user_id, data.is_typing);
      });
    }
  };

  const updateTypingStatus = (chatId: string, userId: number, isTyping: boolean) => {
    setChats(prevChats => prevChats.map(chat => {
      if (chat.chat_id === chatId && userId !== currentUser?.id) {
        return { ...chat, typing: isTyping };
      }
      return chat;
    }));
  };

  const loadChats = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const response = await chatService.getChats();
      
      const formattedChats: UIChat[] = response.map(chat => {
        let displayName = 'Unknown';
        let displayPhone = '';
        let displayAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';
        let isOnline = false;
        let otherUserId = null;
        
        if (chat.chat_type === 'individual') {
          let otherUser = null;
          
          if (chat.other_participant) {
            otherUser = chat.other_participant;
            otherUserId = otherUser.id;
          } else if (chat.participants && chat.participants.length > 0) {
            const found = chat.participants.find((p: any) => p.user !== currentUser?.id);
            if (found && found.user_details) {
              otherUser = found.user_details;
              otherUserId = otherUser.id;
            }
          }
          
          if (otherUser) {
            displayName = otherUser.full_name || otherUser.name || otherUser.mobile_number || 'Unknown';
            displayPhone = otherUser.mobile_number || '';
            const profilePic = otherUser.profile_picture || otherUser.avatar;
            displayAvatar = getValidImageUrl(profilePic);
            isOnline = otherUser.is_online || otherUser.online || false;
          }
        } else {
          displayName = chat.name || 'Group';
          displayAvatar = getValidImageUrl(chat.avatar);
        }
        
        return {
          id: chat.chat_id,
          chat_id: chat.chat_id,
          name: displayName,
          phoneNumber: displayPhone,
          message: chat.last_message?.content || 'No messages yet',
          time: formatTime(chat.last_message?.created_at || chat.updated_at),
          avatar: displayAvatar,
          unread: chat.unread_count || 0,
          online: isOnline,
          muted: chat.is_muted || false,
          pinned: chat.is_pinned || false,
          typing: false,
          isGroup: chat.chat_type === 'group',
          blocked: false,
          archived: chat.is_archived || false,
          lastMessageTime: new Date(chat.last_message?.created_at || chat.updated_at),
          otherUserId: otherUserId,
        };
      });
      
      setChats(formattedChats);
      setFilteredChats(formattedChats);
    } catch (error: any) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filterChats = () => {
    let filtered = [...chats];
    
    if (selectedFilter !== 'archived') {
      filtered = filtered.filter(chat => !chat.archived);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.phoneNumber.includes(searchQuery)
      );
    }
    
    if (selectedFilter === 'unread') {
      filtered = filtered.filter(chat => chat.unread > 0);
    }
    
    if (selectedFilter === 'groups') {
      filtered = filtered.filter(chat => chat.isGroup);
    }
    
    filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
    });
    
    setFilteredChats(filtered);
  };

  const updateChat = (chatId: string, updates: Partial<UIChat>) => {
    setChats(prevChats => prevChats.map(chat => 
      chat.chat_id === chatId ? { ...chat, ...updates } : chat
    ));
    setFilteredChats(prev => prev.map(chat => 
      chat.chat_id === chatId ? { ...chat, ...updates } : chat
    ));
  };

  const markChatAsRead = async (chatId: string) => {
    try {
      const chat = chats.find(c => c.chat_id === chatId);
      if (chat && chat.unread > 0) {
        await chatService.markMessagesAsRead(chatId);
        updateChat(chatId, { unread: 0 });
      }
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  const deleteChat = (chat: UIChat) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Delete Chat'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: 'Delete Chat',
          message: 'Are you sure you want to delete this chat? This action cannot be undone.',
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await performDeleteChat(chat);
          }
        }
      );
    } else {
      Alert.alert(
        'Delete Chat',
        'Are you sure you want to delete this chat?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => performDeleteChat(chat) }
        ]
      );
    }
  };

  const performDeleteChat = async (chat: UIChat) => {
    try {
      await chatService.deleteChat(chat.chat_id);
      await loadChats();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Chat deleted successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete chat');
    }
  };

  const togglePinChat = async (chat: UIChat) => {
    try {
      const newPinState = !chat.pinned;
      const result = await chatService.pinChat(chat.chat_id, newPinState);
      updateChat(chat.chat_id, { pinned: result.pinned });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert('Success', newPinState ? 'Chat pinned' : 'Chat unpinned');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pin/unpin chat');
    }
  };

  const toggleMuteChat = async (chat: UIChat) => {
    try {
      const newMuteState = !chat.muted;
      const result = await chatService.muteChat(chat.chat_id, newMuteState);
      updateChat(chat.chat_id, { muted: result.muted });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert('Success', newMuteState ? 'Chat muted' : 'Chat unmuted');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mute/unmute chat');
    }
  };

  const blockContact = async (chat: UIChat) => {
    Alert.alert(
      'Block Contact',
      `Block ${chat.name}? You won't receive messages from them anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.blockUser(chat.chat_id);
              updateChat(chat.chat_id, { blocked: true });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert('Success', `${chat.name} has been blocked`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to block contact');
            }
          }
        }
      ]
    );
  };

  const archiveChat = async (chat: UIChat) => {
    try {
      const result = await chatService.archiveChat(chat.chat_id);
      updateChat(chat.chat_id, { archived: result.archived });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert('Success', result.archived ? 'Chat archived' : 'Chat unarchived');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to archive chat');
    }
  };

  const unarchiveChat = async (chat: UIChat) => {
    try {
      const result = await chatService.archiveChat(chat.chat_id);
      updateChat(chat.chat_id, { archived: false });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (selectedFilter === 'archived') {
        setSelectedFilter('all');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to unarchive chat');
    }
  };

  const markAsUnread = (chat: UIChat) => {
    updateChat(chat.chat_id, { unread: chat.unread + 1 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Success', 'Chat marked as unread');
  };

  const clearChat = (chat: UIChat) => {
    Alert.alert(
      'Clear Chat',
      `Clear all messages in "${chat.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.clearMessages(chat.chat_id);
              updateChat(chat.chat_id, { message: 'No messages yet' });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Chat cleared successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to clear chat');
            }
          }
        }
      ]
    );
  };

  const showChatOptions = (chat: UIChat) => {
    if (Platform.OS === 'ios') {
      const options = ['Cancel'];
      if (!chat.pinned) options.push('Pin');
      else options.push('Unpin');
      
      if (!chat.muted) options.push('Mute');
      else options.push('Unmute');
      
      options.push('Mark as unread');
      if (!chat.blocked) options.push('Block');
      options.push('Archive');
      options.push('Clear chat');
      options.push('Delete chat');
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: options,
          destructiveButtonIndex: options.includes('Delete chat') ? options.indexOf('Delete chat') : -1,
          cancelButtonIndex: 0,
          title: chat.name,
        },
        (buttonIndex) => {
          const selected = options[buttonIndex];
          switch(selected) {
            case 'Pin': togglePinChat(chat); break;
            case 'Unpin': togglePinChat(chat); break;
            case 'Mute': toggleMuteChat(chat); break;
            case 'Unmute': toggleMuteChat(chat); break;
            case 'Mark as unread': markAsUnread(chat); break;
            case 'Block': blockContact(chat); break;
            case 'Archive': archiveChat(chat); break;
            case 'Clear chat': clearChat(chat); break;
            case 'Delete chat': deleteChat(chat); break;
          }
        }
      );
    } else {
      setSelectedChat(chat);
      setActionSheetVisible(true);
    }
  };

  const handleChatPress = (chat: UIChat) => {
    if (chat.blocked) {
      Alert.alert('Blocked Contact', `You have blocked ${chat.name}. Unblock to send messages.`);
      return;
    }
    
    if (chat.unread > 0) {
      markChatAsRead(chat.chat_id);
    }
    
    router.push(`/chat/${chat.chat_id}`);
  };

  const handleMenuPress = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleMenuItem = (action: string) => {
    closeMenu();
    setTimeout(() => {
      switch(action) {
        case 'newGroup':
          router.push('/dashboard/group');
          break;
        case 'newBroadcast':
          router.push('/dashboard/broadcast');
          break;
        case 'starredMessages':
          router.push('/dashboard/starred');
          break;
        case 'shareQR':
          router.push('/dashboard/qr');
          break;
        case 'admin':
          router.push('/admin');
          break;
        case 'settings':
          router.push('/dashboard/set');
          break;
        case 'profile':
          router.push('/dashboard/profile');
          break;
        case 'forms':
          router.push('/dashboard/formlist');
          break;
        case 'createForm':
          router.push('/dashboard/forms');
          break;
        case 'archived':
          setSelectedFilter('archived');
          break;
        default:
          break;
      }
    }, 300);
  };

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    switch(tab) {
      case 'chats':
        break;
      case 'updates':
        router.push('/dashboard/updates');
        break;
      case 'profile':
        router.push('/dashboard/profile');
        break;
      case 'newBroadcast':
        router.push('/dashboard/broadcast');
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (menuVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -300, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [menuVisible]);

  const onRefresh = useCallback(() => {
    loadChats();
  }, []);

  const ChatAvatar = ({ uri, online }: { uri: string; online: boolean }) => {
    const [imageError, setImageError] = useState(false);
    const validUri = getValidImageUrl(uri);
    
    return (
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: imageError ? 'https://randomuser.me/api/portraits/lego/1.jpg' : validUri }} 
          style={styles.avatar}
          onError={() => setImageError(true)}
        />
        {online && <View style={[styles.onlineBadge, { borderColor: colors.background }]} />}
      </View>
    );
  };

  const renderChat = ({ item }: { item: UIChat }) => (
    <TouchableOpacity 
      style={[styles.chatItem, { borderBottomColor: colors.border }, item.blocked && styles.blockedChat]}
      onPress={() => handleChatPress(item)}
      onLongPress={() => showChatOptions(item)}
      activeOpacity={0.7}
      delayLongPress={500}
    >
      <ChatAvatar uri={item.avatar} online={item.online} />
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <View style={styles.nameContainer}>
            {item.pinned && (
              <Ionicons name="pin" size={14} color={colors.textSecondary} style={styles.pinIcon} />
            )}
            <Text style={[styles.chatName, { color: colors.text }, item.unread > 0 && styles.boldName]} numberOfLines={1}>
              {item.name}
              {item.blocked && <Text style={[styles.blockedText, { color: colors.textSecondary }]}> (Blocked)</Text>}
            </Text>
          </View>
          <Text style={[styles.chatTime, { color: colors.textSecondary }, item.unread > 0 && styles.boldTime]}>{item.time}</Text>
        </View>
        
        {!item.isGroup && item.phoneNumber ? (
          <Text style={[styles.phoneNumber, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.phoneNumber}
          </Text>
        ) : null}
        
        <View style={styles.chatFooter}>
          <View style={styles.messageContainer}>
            {item.typing && !item.blocked ? (
              <Text style={[styles.typingText, { color: colors.primary }]}>typing...</Text>
            ) : (
              <Text style={[
                styles.lastMessage, 
                { color: colors.textSecondary },
                item.unread > 0 && { color: colors.text, fontWeight: '500' },
                item.blocked && { color: colors.textSecondary, fontStyle: 'italic' }
              ]} numberOfLines={1}>
                {item.blocked ? 'You have blocked this contact' : item.message}
              </Text>
            )}
          </View>
          
          {!item.typing && !item.blocked && (
            item.unread > 0 ? (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </View>
            ) : (
              <Ionicons name="checkmark-done" size={16} color={colors.textSecondary} />
            )
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderArchiveChat = ({ item }: { item: UIChat }) => (
    <TouchableOpacity 
      style={[styles.chatItem, { borderBottomColor: colors.border }]}
      onPress={() => unarchiveChat(item)}
      onLongPress={() => showChatOptions(item)}
      activeOpacity={0.7}
    >
      <ChatAvatar uri={item.avatar} online={false} />
      <View style={styles.chatInfo}>
        <Text style={[styles.chatName, { color: colors.text }]}>{item.name}</Text>
        {!item.isGroup && item.phoneNumber ? (
          <Text style={[styles.phoneNumber, { color: colors.textSecondary }]} numberOfLines={1}>{item.phoneNumber}</Text>
        ) : null}
        <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>{item.message}</Text>
      </View>
      <TouchableOpacity onPress={() => unarchiveChat(item)} style={styles.unarchiveButton}>
        <Ionicons name="folder-open-outline" size={20} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading && chats.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/dashboard/camera')}>
            <Ionicons name="camera-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/dashboard/search')}>
            <Ionicons name="search" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={handleMenuPress}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu - Added Admin option */}
      <Modal transparent={true} visible={menuVisible} animationType="none" onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
          <Animated.View style={[styles.dropdownMenu, { backgroundColor: colors.surface, transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('newGroup')}>
              <Ionicons name="people-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>New group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('newBroadcast')}>
              <Ionicons name="megaphone-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>New broadcast</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('starredMessages')}>
              <Ionicons name="star-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Starred messages</Text>
            </TouchableOpacity>
            
            {/* Admin Panel Option */}
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('admin')}>
              <Ionicons name="shield-outline" size={22} color={colors.primary} />
              <Text style={[styles.menuItemText, { color: colors.text, fontWeight: '600' }]}>Admin Panel</Text>
            </TouchableOpacity>
            
            {/* Share/QR Code Menu Item */}
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('shareQR')}>
              <Ionicons name="qr-code-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Share QR Code</Text>
            </TouchableOpacity>
            
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('forms')}>
              <Ionicons name="document-text-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>View Forms</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('createForm')}>
              <Ionicons name="create-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Create Form</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('profile')}>
              <Ionicons name="person-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('settings')}>
              <Ionicons name="settings-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Settings</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search chats..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.filterTab, selectedFilter === 'all' && { backgroundColor: colors.primary + '20' }]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterText, { color: colors.text }, selectedFilter === 'all' && { color: colors.primary, fontWeight: '600' }]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, selectedFilter === 'unread' && { backgroundColor: colors.primary + '20' }]}
          onPress={() => setSelectedFilter('unread')}
        >
          <Text style={[styles.filterText, { color: colors.text }, selectedFilter === 'unread' && { color: colors.primary, fontWeight: '600' }]}>Unread</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, selectedFilter === 'groups' && { backgroundColor: colors.primary + '20' }]}
          onPress={() => setSelectedFilter('groups')}
        >
          <Text style={[styles.filterText, { color: colors.text }, selectedFilter === 'groups' && { color: colors.primary, fontWeight: '600' }]}>Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, selectedFilter === 'archived' && { backgroundColor: colors.primary + '20' }]}
          onPress={() => setSelectedFilter('archived')}
        >
          <Text style={[styles.filterText, { color: colors.text }, selectedFilter === 'archived' && { color: colors.primary, fontWeight: '600' }]}>Archived</Text>
        </TouchableOpacity>
      </View>

      {/* Chats List */}
      {selectedFilter === 'archived' ? (
        <FlatList
          data={chats.filter(c => c.archived)}
          keyExtractor={(item) => item.id}
          renderItem={renderArchiveChat}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="archive-outline" size={80} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No archived chats</Text>
              <TouchableOpacity onPress={() => setSelectedFilter('all')}>
                <Text style={[styles.emptySubtext, { color: colors.primary }]}>Go back to chats</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={renderChat}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={80} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No chats found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary + '80' }]}>
                {searchQuery ? 'Try a different search' : 'Start a new conversation'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB Button */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => router.push('/dashboard/contacts')}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Tab Navigation */}
      <View style={[styles.bottomTab, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'chats' && styles.tabItemActive]}
          onPress={() => handleTabPress('chats')}
        >
          <Ionicons 
            name={activeTab === 'chats' ? "chatbubbles" : "chatbubbles-outline"} 
            size={24} 
            color={activeTab === 'chats' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabLabel, { color: activeTab === 'chats' ? colors.primary : colors.textSecondary }]}>Chats</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'updates' && styles.tabItemActive]}
          onPress={() => handleTabPress('updates')}
        >
          <Ionicons 
            name={activeTab === 'updates' ? "time" : "time-outline"} 
            size={24} 
            color={activeTab === 'updates' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabLabel, { color: activeTab === 'updates' ? colors.primary : colors.textSecondary }]}>Updates</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
          onPress={() => handleTabPress('profile')}
        >
          <Ionicons 
            name={activeTab === 'profile' ? "person" : "person-outline"} 
            size={24} 
            color={activeTab === 'profile' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabLabel, { color: activeTab === 'profile' ? colors.primary : colors.textSecondary }]}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'newBroadcast' && styles.tabItemActive]}
          onPress={() => handleTabPress('newBroadcast')}
        >
          <Ionicons 
            name={activeTab === 'newBroadcast' ? "megaphone" : "megaphone-outline"} 
            size={24} 
            color={activeTab === 'newBroadcast' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabLabel, { color: activeTab === 'newBroadcast' ? colors.primary : colors.textSecondary }]}>Broadcast</Text>
        </TouchableOpacity>
      </View>

      {/* Android Action Sheet */}
      <Modal visible={actionSheetVisible} transparent={true} animationType="fade" onRequestClose={() => setActionSheetVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionSheetVisible(false)}>
          <View style={[styles.androidActionSheet, { backgroundColor: colors.background }]}>
            <View style={[styles.actionSheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.actionSheetTitle, { color: colors.text }]}>{selectedChat?.name}</Text>
            </View>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { if(selectedChat) togglePinChat(selectedChat); setActionSheetVisible(false); }}>
              <Ionicons name="pin-outline" size={22} color={colors.text} />
              <Text style={[styles.actionSheetItemText, { color: colors.text }]}>{selectedChat?.pinned ? 'Unpin' : 'Pin'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { if(selectedChat) toggleMuteChat(selectedChat); setActionSheetVisible(false); }}>
              <Ionicons name="notifications-off-outline" size={22} color={colors.text} />
              <Text style={[styles.actionSheetItemText, { color: colors.text }]}>{selectedChat?.muted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { if(selectedChat) markAsUnread(selectedChat); setActionSheetVisible(false); }}>
              <Ionicons name="mail-unread-outline" size={22} color={colors.text} />
              <Text style={[styles.actionSheetItemText, { color: colors.text }]}>Mark as unread</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { if(selectedChat) archiveChat(selectedChat); setActionSheetVisible(false); }}>
              <Ionicons name="archive-outline" size={22} color={colors.text} />
              <Text style={[styles.actionSheetItemText, { color: colors.text }]}>Archive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { if(selectedChat) clearChat(selectedChat); setActionSheetVisible(false); }}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
              <Text style={[styles.actionSheetItemText, { color: '#FF3B30' }]}>Clear chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { if(selectedChat) deleteChat(selectedChat); setActionSheetVisible(false); }}>
              <Ionicons name="trash-bin-outline" size={22} color="#FF3B30" />
              <Text style={[styles.actionSheetItemText, { color: '#FF3B30' }]}>Delete chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionSheetCancel, { borderTopColor: colors.border }]} onPress={() => setActionSheetVisible(false)}>
              <Text style={[styles.actionSheetCancelText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 20,
  },
  headerIcon: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 70,
    right: 12,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  menuDivider: {
    height: 1,
    marginVertical: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chatsList: {
    paddingBottom: 180,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 0.5,
  },
  blockedChat: {
    opacity: 0.7,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f0f0f0',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#25D366',
    borderWidth: 2,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  pinIcon: {
    marginRight: 2,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  boldName: {
    fontWeight: '700',
  },
  phoneNumber: {
    fontSize: 12,
    marginBottom: 2,
  },
  blockedText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  chatTime: {
    fontSize: 11,
    marginLeft: 8,
  },
  boldTime: {
    fontWeight: '600',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  lastMessage: {
    fontSize: 13,
    flex: 1,
  },
  typingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  unreadBadge: {
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  unarchiveButton: {
    padding: 8,
  },
  androidActionSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 40,
  },
  actionSheetHeader: {
    padding: 16,
    borderBottomWidth: 0.5,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionSheetItemText: {
    fontSize: 16,
  },
  actionSheetCancel: {
    padding: 16,
    borderTopWidth: 0.5,
    marginTop: 8,
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomTab: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 76,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 12,
  },
});