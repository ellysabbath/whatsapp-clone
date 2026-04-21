import { View, Text, FlatList, Platform, TouchableOpacity, StyleSheet, Image, TextInput, StatusBar, Alert, Modal, Animated, ActionSheetIOS, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService, contactService, websocketService, Chat as ChatType, User } from '../../lib/api';

// API Configuration
const API_BASE_URL = 'http://192.168.137.1:8000';

// UI Chat Interface
interface UIChat {
  id: string;
  chat_id: string;
  name: string;
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
  
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Helper function to get valid image URL
  const getValidImageUrl = (imageUrl: string | undefined | null): string => {
    const defaultAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';
    
    if (!imageUrl) {
      return defaultAvatar;
    }
    
    // Base64 image
    if (imageUrl.startsWith('data:image')) {
      return imageUrl;
    }
    
    // Full URL
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Relative path starting with /
    if (imageUrl.startsWith('/')) {
      return `${API_BASE_URL}${imageUrl}`;
    }
    
    return defaultAvatar;
  };

  // Load current user and chats
  useEffect(() => {
    loadCurrentUser();
    loadChats();
    setupWebSocket();
    
    return () => {
      websocketService.disconnect();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
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
      setRefreshing(true);
      const response = await chatService.getChats();
      
      const formattedChats: UIChat[] = response.map(chat => {
        let displayName = 'Unknown';
        let displayAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';
        let isOnline = false;
        
        if (chat.chat_type === 'individual') {
          // Get other user info
          let otherUser = null;
          
          // From other_participant field
          if (chat.other_participant) {
            otherUser = chat.other_participant;
          }
          // From participants list
          else if (chat.participants && chat.participants.length > 0) {
            const found = chat.participants.find(p => p.user !== currentUser?.id);
            if (found && found.user_details) {
              otherUser = found.user_details;
            }
          }
          
          if (otherUser) {
            displayName = otherUser.name || otherUser.full_name || otherUser.mobile_number || 'Unknown';
            const profilePic = otherUser.profile_picture || otherUser.avatar;
            displayAvatar = getValidImageUrl(profilePic);
            isOnline = otherUser.online || otherUser.is_online || false;
          }
        } else {
          // Group chat
          displayName = chat.name || 'Group';
          displayAvatar = getValidImageUrl(chat.avatar);
        }
        
        return {
          id: chat.chat_id,
          chat_id: chat.chat_id,
          name: displayName,
          message: chat.last_message?.content || 'No messages yet',
          time: formatTime(chat.last_message?.created_at || chat.updated_at),
          avatar: displayAvatar,
          unread: chat.unread_count,
          online: isOnline,
          muted: chat.is_muted,
          pinned: chat.is_pinned,
          typing: false,
          isGroup: chat.chat_type === 'group',
          blocked: false,
          archived: chat.is_archived,
          lastMessageTime: new Date(chat.last_message?.created_at || chat.updated_at),
        };
      });
      
      setChats(formattedChats);
    } catch (error: any) {
      console.error('Error loading chats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatTime = (dateString: string): string => {
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
        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
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
    const updatedChats = chats.map(chat => 
      chat.chat_id === chatId ? { ...chat, ...updates } : chat
    );
    setChats(updatedChats);
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
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete chat');
    }
  };

  const togglePinChat = async (chat: UIChat) => {
    try {
      const newPinState = !chat.pinned;
      await chatService.pinChat(chat.chat_id, newPinState);
      updateChat(chat.chat_id, { pinned: newPinState });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pin/unpin chat');
    }
  };

  const toggleMuteChat = async (chat: UIChat) => {
    try {
      const newMuteState = !chat.muted;
      await chatService.muteChat(chat.chat_id, newMuteState);
      updateChat(chat.chat_id, { muted: newMuteState });
      Alert.alert('Success', newMuteState ? 'Chat muted' : 'Chat unmuted');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mute/unmute chat');
    }
  };

  const blockContact = async (chat: UIChat) => {
    Alert.alert(
      'Block Contact',
      `Block ${chat.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: async () => {
            try {
              const contacts = await contactService.getContacts();
              const contact = contacts.find(c => 
                c.contact_user_details.full_name === chat.name || 
                c.contact_user_details.mobile_number === chat.name
              );
              if (contact) {
                await contactService.blockContact(contact.id);
                updateChat(chat.chat_id, { blocked: true });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
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
      await chatService.archiveChat(chat.chat_id);
      updateChat(chat.chat_id, { archived: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert('Archived', 'Chat moved to archive');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to archive chat');
    }
  };

  const unarchiveChat = async (chat: UIChat) => {
    try {
      await chatService.archiveChat(chat.chat_id);
      updateChat(chat.chat_id, { archived: false });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to unarchive chat');
    }
  };

  const markAsUnread = (chat: UIChat) => {
    updateChat(chat.chat_id, { unread: chat.unread + 1 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const clearChat = (chat: UIChat) => {
    Alert.alert(
      'Clear Chat',
      'Clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            updateChat(chat.chat_id, { message: 'No messages yet' });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      Alert.alert('Blocked Contact', `You have blocked ${chat.name}.`);
      return;
    }
    if (chat.unread > 0) {
      updateChat(chat.chat_id, { unread: 0 });
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

  // Chat Avatar Component
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
        {online && <View style={styles.onlineBadge} />}
      </View>
    );
  };

  const renderChat = ({ item }: { item: UIChat }) => (
    <TouchableOpacity 
      style={[styles.chatItem, item.blocked && styles.blockedChat]}
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
              <Ionicons name="pin" size={14} color="#999" style={styles.pinIcon} />
            )}
            <Text style={[styles.chatName, item.unread > 0 && styles.boldName]} numberOfLines={1}>
              {item.name}
              {item.blocked && <Text style={styles.blockedText}> (Blocked)</Text>}
            </Text>
          </View>
          <Text style={[styles.chatTime, item.unread > 0 && styles.boldTime]}>{item.time}</Text>
        </View>
        
        <View style={styles.chatFooter}>
          <View style={styles.messageContainer}>
            {item.typing && !item.blocked ? (
              <Text style={styles.typingText}>typing...</Text>
            ) : (
              <Text style={[
                styles.lastMessage, 
                item.unread > 0 && styles.unreadMessage,
                item.blocked && styles.blockedMessage
              ]} numberOfLines={1}>
                {item.blocked ? 'You have blocked this contact' : item.message}
              </Text>
            )}
          </View>
          
          {!item.typing && !item.blocked && (
            item.unread > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </View>
            ) : (
              <Ionicons name="checkmark-done" size={16} color="#999" />
            )
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderArchiveChat = ({ item }: { item: UIChat }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => unarchiveChat(item)}
      onLongPress={() => showChatOptions(item)}
      activeOpacity={0.7}
    >
      <ChatAvatar uri={item.avatar} online={false} />
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.name}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.message}</Text>
      </View>
      <TouchableOpacity onPress={() => unarchiveChat(item)} style={styles.unarchiveButton}>
        <Ionicons name="archive-outline" size={20} color="#25D366" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aptec</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/dashboard')}>
            <Ionicons name="camera-outline" size={22} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/dashboard')}>
            <Ionicons name="search" size={22} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={handleMenuPress}>
            <Ionicons name="ellipsis-vertical" size={20} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu */}
      <Modal transparent={true} visible={menuVisible} animationType="none" onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
          <Animated.View style={[styles.dropdownMenu, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('newGroup')}>
              <Ionicons name="people-outline" size={22} color="#000000" />
              <Text style={styles.menuItemText}>New group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('newBroadcast')}>
              <Ionicons name="megaphone-outline" size={22} color="#000000" />
              <Text style={styles.menuItemText}>New broadcast</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('starredMessages')}>
              <Ionicons name="star-outline" size={22} color="#000000" />
              <Text style={styles.menuItemText}>Starred messages</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('archived')}>
              <Ionicons name="archive-outline" size={22} color="#000000" />
              <Text style={styles.menuItemText}>Archived chats</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('forms')}>
              <Ionicons name="document-text-outline" size={22} color="#000000" />
              <Text style={styles.menuItemText}>View Forms</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('createForm')}>
              <Ionicons name="create-outline" size={22} color="#000000" />
              <Text style={styles.menuItemText}>Create Form</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('profile')}>
              <Ionicons name="person-outline" size={22} color="#000000" />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('settings')}>
              <Ionicons name="settings-outline" size={22} color="#000000" />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, selectedFilter === 'unread' && styles.filterTabActive]}
          onPress={() => setSelectedFilter('unread')}
        >
          <Text style={[styles.filterText, selectedFilter === 'unread' && styles.filterTextActive]}>Unread</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, selectedFilter === 'groups' && styles.filterTabActive]}
          onPress={() => setSelectedFilter('groups')}
        >
          <Text style={[styles.filterText, selectedFilter === 'groups' && styles.filterTextActive]}>Groups</Text>
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#25D366"]} tintColor="#25D366" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="archive-outline" size={80} color="#ddd" />
              <Text style={styles.emptyText}>No archived chats</Text>
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#25D366"]} tintColor="#25D366" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={80} color="#ddd" />
              <Text style={styles.emptyText}>No chats found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try a different search' : 'Start a new conversation'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB Button */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/dashboard/contacts')}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#000000" />
      </TouchableOpacity>

      {/* Bottom Tab Navigation */}
      <View style={styles.bottomTab}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'chats' && styles.tabItemActive]}
          onPress={() => handleTabPress('chats')}
        >
          <Ionicons 
            name={activeTab === 'chats' ? "chatbubbles" : "chatbubbles-outline"} 
            size={24} 
            color={activeTab === 'chats' ? "rgb(7, 21, 13)16, 10)" : "#000000"} 
          />
          <Text style={[styles.tabLabel, activeTab === 'chats' && styles.tabLabelActive]}>Chats</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'updates' && styles.tabItemActive]}
          onPress={() => handleTabPress('updates')}
        >
          <Ionicons 
            name={activeTab === 'updates' ? "time" : "time-outline"} 
            size={24} 
            color={activeTab === 'updates' ? "rgb(13, 18, 15)" : "#000000"} 
          />
          <Text style={[styles.tabLabel, activeTab === 'updates' && styles.tabLabelActive]}>Updates</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
          onPress={() => handleTabPress('profile')}
        >
          <Ionicons 
            name={activeTab === 'profile' ? "person" : "person-outline"} 
            size={24} 
            color={activeTab === 'profile' ? "rgb(19, 22, 20)" : "#000000"} 
          />
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'newBroadcast' && styles.tabItemActive]}
          onPress={() => handleTabPress('newBroadcast')}
        >
          <Ionicons 
            name={activeTab === 'newBroadcast' ? "megaphone" : "megaphone-outline"} 
            size={24} 
            color={activeTab === 'newBroadcast' ? "rgb(14, 31, 20)" : "#000000"} 
          />
          <Text style={[styles.tabLabel, activeTab === 'newBroadcast' && styles.tabLabelActive]}>Broadcast</Text>
        </TouchableOpacity>
      </View>

      {/* Android Action Sheet */}
      <Modal visible={actionSheetVisible} transparent={true} animationType="fade" onRequestClose={() => setActionSheetVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionSheetVisible(false)}>
          <View style={styles.androidActionSheet}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>{selectedChat?.name}</Text>
            </View>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { if(selectedChat) togglePinChat(selectedChat); setActionSheetVisible(false); }}>
              <Ionicons name="pin-outline" size={22} color="#333" />
              <Text style={styles.actionSheetItemText}>{selectedChat?.pinned ? 'Unpin' : 'Pin'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { if(selectedChat) toggleMuteChat(selectedChat); setActionSheetVisible(false); }}>
              <Ionicons name="notifications-off-outline" size={22} color="#333" />
              <Text style={styles.actionSheetItemText}>{selectedChat?.muted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { if(selectedChat) markAsUnread(selectedChat); setActionSheetVisible(false); }}>
              <Ionicons name="mail-unread-outline" size={22} color="#333" />
              <Text style={styles.actionSheetItemText}>Mark as unread</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { if(selectedChat) archiveChat(selectedChat); setActionSheetVisible(false); }}>
              <Ionicons name="archive-outline" size={22} color="#333" />
              <Text style={styles.actionSheetItemText}>Archive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { if(selectedChat) clearChat(selectedChat); setActionSheetVisible(false); }}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
              <Text style={[styles.actionSheetItemText, { color: '#FF3B30' }]}>Clear chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { if(selectedChat) deleteChat(selectedChat); setActionSheetVisible(false); }}>
              <Ionicons name="trash-bin-outline" size={22} color="#FF3B30" />
              <Text style={[styles.actionSheetItemText, { color: '#FF3B30' }]}>Delete chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetCancel} onPress={() => setActionSheetVisible(false)}>
              <Text style={styles.actionSheetCancelText}>Cancel</Text>
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
    backgroundColor: '#fff',
  },
  
  // Header
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 76,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 20,
  },
  headerIcon: {
    padding: 4,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 70,
    right: 12,
    backgroundColor: '#fff',
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
    color: '#000000',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
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
    color: '#000',
  },
  
  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  filterTabActive: {
    backgroundColor: '#e8f5e9',
  },
  filterText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#25D366',
    fontWeight: '600',
  },
  
  // Chat List
  chatsList: {
    paddingBottom: 180,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
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
    borderColor: '#fff',
  },
  mutedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
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
    color: '#000',
    flex: 1,
  },
  boldName: {
    fontWeight: '700',
    color: '#000',
  },
  blockedText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  chatTime: {
    fontSize: 11,
    color: '#999',
    marginLeft: 8,
  },
  boldTime: {
    fontWeight: '600',
    color: '#000',
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
    color: '#666',
    flex: 1,
  },
  unreadMessage: {
    color: '#000',
    fontWeight: '500',
  },
  blockedMessage: {
    color: '#999',
    fontStyle: 'italic',
  },
  typingText: {
    fontSize: 13,
    color: '#25D366',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: '#25D366',
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
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    backgroundColor: '#25D366',
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
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
  
  // Archive
  unarchiveButton: {
    padding: 8,
  },
  
  // Android Action Sheet
  androidActionSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 40,
  },
  actionSheetHeader: {
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
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
    color: '#333',
  },
  actionSheetCancel: {
    padding: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
  },
  actionSheetCancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Bottom Tab
  bottomTab: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
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
    color: '#000000',
  },
  tabLabelActive: {
    color: '#090A09',
    fontWeight: '500',
  },
});