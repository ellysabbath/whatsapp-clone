import { View, Text, FlatList, Platform, TouchableOpacity, StyleSheet, Image, TextInput, StatusBar, Alert, Modal, Animated, ActionSheetIOS } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Chat {
  id: string;
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
  lastMessageTime: Date | string;
}

const initialChats: Chat[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    message: 'Hey! How are you doing?',
    time: '5:30 PM',
    avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    unread: 2,
    online: true,
    muted: false,
    pinned: false,
    typing: false,
    isGroup: false,
    blocked: false,
    archived: false,
    lastMessageTime: new Date(2024, 0, 15, 17, 30),
  },
  {
    id: '2',
    name: 'Mike Chen',
    message: 'See you tomorrow at the meeting!',
    time: '4:15 PM',
    avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    unread: 0,
    online: false,
    muted: false,
    pinned: true,
    typing: false,
    isGroup: false,
    blocked: false,
    archived: false,
    lastMessageTime: new Date(2024, 0, 15, 16, 15),
  },
  {
    id: '3',
    name: 'Emma Wilson',
    message: 'Thanks for your help! 🙏',
    time: 'Yesterday',
    avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    unread: 0,
    online: true,
    muted: false,
    pinned: false,
    typing: false,
    isGroup: false,
    blocked: false,
    archived: false,
    lastMessageTime: new Date(2024, 0, 14, 10, 30),
  },
  {
    id: '4',
    name: 'David Brown',
    message: 'Can you send me the files?',
    time: 'Yesterday',
    avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
    unread: 1,
    online: false,
    muted: true,
    pinned: false,
    typing: false,
    isGroup: false,
    blocked: false,
    archived: false,
    lastMessageTime: new Date(2024, 0, 14, 9, 0),
  },
  {
    id: '5',
    name: 'Family Group',
    message: 'Mom: Dinner at 7pm 🍽️',
    time: 'Yesterday',
    avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    unread: 5,
    online: false,
    muted: false,
    pinned: false,
    typing: false,
    isGroup: true,
    blocked: false,
    archived: false,
    lastMessageTime: new Date(2024, 0, 14, 8, 0),
  },
  {
    id: '6',
    name: 'Work Team',
    message: 'Sarah: Great job everyone! 🎉',
    time: 'Monday',
    avatar: 'https://randomuser.me/api/portraits/men/6.jpg',
    unread: 0,
    online: false,
    muted: false,
    pinned: false,
    typing: true,
    isGroup: true,
    blocked: false,
    archived: false,
    lastMessageTime: new Date(2024, 0, 13, 15, 0),
  },
];

export default function ChatsScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    filterChats();
  }, [chats, searchQuery, selectedFilter]);

  const loadChats = async () => {
    try {
      const savedChats = await AsyncStorage.getItem('chats');
      if (savedChats) {
        const parsed = JSON.parse(savedChats);
        // Convert lastMessageTime strings back to Date objects
        const chatsWithDates = parsed.map((chat: Chat) => ({
          ...chat,
          lastMessageTime: chat.lastMessageTime ? new Date(chat.lastMessageTime) : new Date()
        }));
        setChats(chatsWithDates);
      } else {
        setChats(initialChats);
        await AsyncStorage.setItem('chats', JSON.stringify(initialChats));
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      setChats(initialChats);
    }
  };

  const saveChats = async (updatedChats: Chat[]) => {
    try {
      // Convert Dates to ISO strings for storage
      const chatsToStore = updatedChats.map(chat => ({
        ...chat,
        lastMessageTime: chat.lastMessageTime instanceof Date ? chat.lastMessageTime.toISOString() : chat.lastMessageTime
      }));
      await AsyncStorage.setItem('chats', JSON.stringify(chatsToStore));
    } catch (error) {
      console.error('Error saving chats:', error);
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
    
    // FIXED: Safe sorting with proper date handling
    filtered.sort((a, b) => {
      // Pinned first
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      
      // Handle lastMessageTime safely
      let timeA = a.lastMessageTime;
      let timeB = b.lastMessageTime;
      
      // Convert to Date if it's a string
      if (typeof timeA === 'string') timeA = new Date(timeA);
      if (typeof timeB === 'string') timeB = new Date(timeB);
      
      // Ensure we have valid dates
      const timestampA = timeA instanceof Date ? timeA.getTime() : 0;
      const timestampB = timeB instanceof Date ? timeB.getTime() : 0;
      
      return timestampB - timestampA;
    });
    
    setFilteredChats(filtered);
  };

  const updateChat = async (chatId: string, updates: Partial<Chat>) => {
    const updatedChats = chats.map(chat => 
      chat.id === chatId ? { ...chat, ...updates } : chat
    );
    setChats(updatedChats);
    await saveChats(updatedChats);
  };

  const deleteChat = (chatId: string) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Delete Chat'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: 'Delete Chat',
          message: 'Are you sure you want to delete this chat? This action cannot be undone.',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            performDeleteChat(chatId);
          }
        }
      );
    } else {
      Alert.alert(
        'Delete Chat',
        'Are you sure you want to delete this chat? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => performDeleteChat(chatId) }
        ]
      );
    }
  };

  const performDeleteChat = async (chatId: string) => {
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    setChats(updatedChats);
    await saveChats(updatedChats);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const togglePinChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      updateChat(chatId, { pinned: !chat.pinned });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggleMuteChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      updateChat(chatId, { muted: !chat.muted });
      Alert.alert('Success', chat.muted ? 'Chat unmuted' : 'Chat muted');
    }
  };

  const blockContact = (chatId: string, chatName: string) => {
    Alert.alert(
      'Block Contact',
      `Are you sure you want to block ${chatName}? You will no longer receive messages from this contact.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: () => {
            updateChat(chatId, { blocked: true });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
      ]
    );
  };

  const archiveChat = (chatId: string) => {
    updateChat(chatId, { archived: true });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Archived', 'Chat moved to archive');
  };

  const unarchiveChat = (chatId: string) => {
    updateChat(chatId, { archived: false });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const markAsUnread = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      updateChat(chatId, { unread: chat.unread + 1 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const clearChat = (chatId: string) => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            updateChat(chatId, { message: 'No messages yet' });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  const showChatOptions = (chat: Chat) => {
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
            case 'Pin': togglePinChat(chat.id); break;
            case 'Unpin': togglePinChat(chat.id); break;
            case 'Mute': toggleMuteChat(chat.id); break;
            case 'Unmute': toggleMuteChat(chat.id); break;
            case 'Mark as unread': markAsUnread(chat.id); break;
            case 'Block': blockContact(chat.id, chat.name); break;
            case 'Archive': archiveChat(chat.id); break;
            case 'Clear chat': clearChat(chat.id); break;
            case 'Delete chat': deleteChat(chat.id); break;
          }
        }
      );
    } else {
      setSelectedChat(chat);
      setActionSheetVisible(true);
    }
  };

  const handleChatPress = (chat: Chat) => {
    if (chat.blocked) {
      Alert.alert('Blocked Contact', `You have blocked ${chat.name}. Unblock to send messages.`);
      return;
    }
    if (chat.unread > 0) {
      updateChat(chat.id, { unread: 0 });
    }
    router.push(`/chat/${chat.id}`);
  };

  const handleMenuPress = () => {
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

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

  const renderChat = ({ item }: { item: Chat }) => (
    <TouchableOpacity 
      style={[styles.chatItem, item.blocked && styles.blockedChat]}
      onPress={() => handleChatPress(item)}
      onLongPress={() => showChatOptions(item)}
      activeOpacity={0.7}
      delayLongPress={500}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.online && !item.blocked && <View style={styles.onlineBadge} />}
        {item.muted && !item.blocked && (
          <View style={styles.mutedBadge}>
            <Ionicons name="notifications-off" size={10} color="#fff" />
          </View>
        )}
      </View>
      
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
              <>
                {item.isGroup && item.unread > 0 && (
                  <Text style={styles.senderName}>
                    {item.message.split(':')[0]}:
                  </Text>
                )}
                <Text style={[
                  styles.lastMessage, 
                  item.unread > 0 && styles.unreadMessage,
                  item.blocked && styles.blockedMessage
                ]} numberOfLines={1}>
                  {item.blocked ? 'You have blocked this contact' : item.message}
                </Text>
              </>
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

  const renderArchiveChat = ({ item }: { item: Chat }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => unarchiveChat(item.id)}
      onLongPress={() => showChatOptions(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.name}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.message}
        </Text>
      </View>
      <TouchableOpacity onPress={() => unarchiveChat(item.id)} style={styles.unarchiveButton}>
        <Ionicons name="archive-outline" size={20} color="#25D366" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ApTec</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => {}}>
            <Ionicons name="camera-outline" size={22} color="#064807" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => {}}>
            <Ionicons name="search" size={22} color="#064807" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={handleMenuPress}>
            <Ionicons name="ellipsis-vertical" size={20} color="#064807" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal transparent={true} visible={menuVisible} animationType="none" onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
          <Animated.View style={[styles.dropdownMenu, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('newGroup')}>
              <Ionicons name="people-outline" size={22} color="#075E54" />
              <Text style={styles.menuItemText}>New group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('newBroadcast')}>
              <Ionicons name="megaphone-outline" size={22} color="#075E54" />
              <Text style={styles.menuItemText}>New broadcast</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('starredMessages')}>
              <Ionicons name="star-outline" size={22} color="#075E54" />
              <Text style={styles.menuItemText}>Starred messages</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('archived')}>
              <Ionicons name="archive-outline" size={22} color="#075E54" />
              <Text style={styles.menuItemText}>Archived chats</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('forms')}>
              <Ionicons name="document-text-outline" size={22} color="#075E54" />
              <Text style={styles.menuItemText}>View Forms</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('createForm')}>
              <Ionicons name="create-outline" size={22} color="#075E54" />
              <Text style={styles.menuItemText}>Create Form</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('profile')}>
              <Ionicons name="person-outline" size={22} color="#075E54" />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('settings')}>
              <Ionicons name="settings-outline" size={22} color="#075E54" />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

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

      {selectedFilter === 'archived' ? (
        <FlatList
          data={chats.filter(c => c.archived)}
          keyExtractor={(item) => item.id}
          renderItem={renderArchiveChat}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatsList}
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

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/dashboard/contacts')}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#064807" />
      </TouchableOpacity>

      <View style={styles.bottomTab}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'chats' && styles.tabItemActive]}
          onPress={() => handleTabPress('chats')}
        >
          <Ionicons 
            name={activeTab === 'chats' ? "chatbubbles" : "chatbubbles-outline"} 
            size={24} 
            color={activeTab === 'chats' ? "#25D366" : "#666"} 
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
            color={activeTab === 'updates' ? "#25D366" : "#666"} 
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
            color={activeTab === 'profile' ? "#25D366" : "#666"} 
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
            color={activeTab === 'newBroadcast' ? "#25D366" : "#666"} 
          />
          <Text style={[styles.tabLabel, activeTab === 'newBroadcast' && styles.tabLabelActive]}>Broadcast</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={actionSheetVisible} transparent={true} animationType="fade" onRequestClose={() => setActionSheetVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActionSheetVisible(false)}>
          <View style={styles.androidActionSheet}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>{selectedChat?.name}</Text>
            </View>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { togglePinChat(selectedChat!.id); setActionSheetVisible(false); }}>
              <Ionicons name="pin-outline" size={22} color="#333" />
              <Text style={styles.actionSheetItemText}>{selectedChat?.pinned ? 'Unpin' : 'Pin'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { toggleMuteChat(selectedChat!.id); setActionSheetVisible(false); }}>
              <Ionicons name="notifications-off-outline" size={22} color="#333" />
              <Text style={styles.actionSheetItemText}>{selectedChat?.muted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { markAsUnread(selectedChat!.id); setActionSheetVisible(false); }}>
              <Ionicons name="mail-unread-outline" size={22} color="#333" />
              <Text style={styles.actionSheetItemText}>Mark as unread</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { archiveChat(selectedChat!.id); setActionSheetVisible(false); }}>
              <Ionicons name="archive-outline" size={22} color="#333" />
              <Text style={styles.actionSheetItemText}>Archive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { clearChat(selectedChat!.id); setActionSheetVisible(false); }}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
              <Text style={[styles.actionSheetItemText, { color: '#FF3B30' }]}>Clear chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { deleteChat(selectedChat!.id); setActionSheetVisible(false); }}>
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
  header: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 76,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F2112',
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
    color: '#333',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
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
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#075E54',
    fontWeight: '600',
  },
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
  senderName: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
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
  fab: {
    position: 'absolute',
    bottom: 180,
    right: 20,
    backgroundColor: '#A9CFA9',
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
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
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
  tabItemActive: {},
  tabLabel: {
    fontSize: 12,
    color: '#666',
  },
  tabLabelActive: {
    color: '#25D366',
    fontWeight: '500',
  },
});