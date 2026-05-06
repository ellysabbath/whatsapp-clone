import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { manageService, Chat, User, Contact, Message, ChatParticipant } from '../../../lib/api/manage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatWithDetails extends Chat {
  otherUser?: User;
  lastMessageText?: string;
  lastMessageTime?: string;
}

export default function ManageChatsScreen() {
  const router = useRouter();
  
  // State
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatWithDetails[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number>(1); // Default user ID
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [groupName, setGroupName] = useState('');
  const [searchUsers, setSearchUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [creatingChat, setCreatingChat] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // Refs
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const isMounted = useRef(true);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Load initial data
  useEffect(() => {
    isMounted.current = true;
    loadCurrentUser();
    loadData();
    
    // Auto-refresh every 5 seconds
    autoRefreshInterval.current = setInterval(() => {
      if (isMounted.current && !refreshing) {
        loadChats();
      }
    }, 5000);
    
    return () => {
      isMounted.current = false;
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, []);

  const loadCurrentUser = async () => {
    try {
      // Try to get user from storage, fallback to fetching from API
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setCurrentUserId(user.id);
      } else {
        // Fetch first user as default
        const users = await manageService.getUsers();
        if (users && users.length > 0) {
          setCurrentUser(users[0]);
          setCurrentUserId(users[0].id);
          await AsyncStorage.setItem('user', JSON.stringify(users[0]));
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setCurrentUserId(1); // Fallback to user ID 1
    }
  };

  const loadData = async () => {
    try {
      await Promise.all([
        loadChats(),
        loadContacts(),
        loadAllUsers(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const loadAllUsers = async () => {
    try {
      const users = await manageService.getUsers();
      if (isMounted.current && users) {
        setAllUsers(users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadChats = async () => {
    try {
      const chatsData = await manageService.getChats(currentUserId);
      if (!isMounted.current) return;
      
      if (!chatsData || !Array.isArray(chatsData)) {
        setChats([]);
        setFilteredChats([]);
        return;
      }
      
      // Enrich chats with other user details
      const enrichedChats: ChatWithDetails[] = chatsData.map((chat: Chat) => {
        let otherUser: User | undefined;
        
        if (chat.chat_type === 'individual' && chat.participants_details) {
          const otherParticipant = chat.participants_details.find(
            (p: ChatParticipant) => p.user !== currentUserId
          );
          if (otherParticipant?.user_detail) {
            otherUser = otherParticipant.user_detail;
          }
        }
        
        return {
          ...chat,
          otherUser,
          lastMessageText: chat.last_message?.content || 'No messages',
          lastMessageTime: chat.last_message?.created_at,
        };
      });
      
      setChats(enrichedChats);
      setFilteredChats(enrichedChats);
    } catch (error: any) {
      console.error('Error loading chats:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const contactsData = await manageService.getContacts(currentUserId);
      if (isMounted.current && contactsData && Array.isArray(contactsData)) {
        setContacts(contactsData);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const searchUsersHandler = async (query: string) => {
    setUserSearchQuery(query);
    if (query.length < 2) {
      setSearchUsers([]);
      return;
    }
    
    try {
      const users = await manageService.searchUsers(query);
      if (isMounted.current && users && Array.isArray(users)) {
        // Filter out current user and existing contacts
        const filtered = users.filter(
          (user: User) => 
            user.id !== currentUserId &&
            !contacts.some(contact => contact.contact_user === user.id)
        );
        setSearchUsers(filtered);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const createIndividualChat = async (userId: number) => {
    setCreatingChat(true);
    try {
      const chat = await manageService.createIndividualChat(userId, currentUserId);
      if (isMounted.current && chat) {
        setShowNewChatModal(false);
        setSearchUsers([]);
        setUserSearchQuery('');
        await loadChats();
        router.push(`/dashboard/chat/${chat.id}`);
      }
    } catch (error: any) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', error.message || 'Failed to create chat');
    } finally {
      if (isMounted.current) {
        setCreatingChat(false);
      }
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    if (selectedContacts.length === 0) {
      Alert.alert('Error', 'Please select at least one contact');
      return;
    }
    
    setCreatingChat(true);
    try {
      const participantIds = [...selectedContacts, currentUserId];
      const chat = await manageService.createGroupChat(groupName, participantIds);
      if (isMounted.current && chat) {
        setShowGroupModal(false);
        setGroupName('');
        setSelectedContacts([]);
        await loadChats();
        router.push(`/dashboard/chat/${chat.id}`);
      }
    } catch (error: any) {
      console.error('Error creating group:', error);
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      if (isMounted.current) {
        setCreatingChat(false);
      }
    }
  };

  const archiveChat = async (chatId: string) => {
    try {
      await manageService.archiveChat(chatId, currentUserId);
      await loadChats();
      Alert.alert('Success', 'Chat archived successfully');
    } catch (error: any) {
      console.error('Error archiving chat:', error);
      Alert.alert('Error', error.message || 'Failed to archive chat');
    }
  };

  const deleteChat = async (chatId: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await manageService.deleteChat(chatId);
              await loadChats();
              Alert.alert('Success', 'Chat deleted successfully');
            } catch (error: any) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', error.message || 'Failed to delete chat');
            }
          },
        },
      ]
    );
  };

  const toggleContactSelection = (contactId: number) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    await loadContacts();
    setRefreshing(false);
  }, [currentUserId]);

  // Filter chats based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = chats.filter(chat =>
        chat.chat_type === 'individual'
          ? chat.otherUser?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.otherUser?.mobile_number?.includes(searchQuery)
          : chat.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    } else {
      setFilteredChats(chats);
    }
  }, [searchQuery, chats]);

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderChatItem = ({ item }: { item: ChatWithDetails }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push(`/dashboard/chat/${item.id}`)}
      onLongPress={() => {
        Alert.alert(
          'Chat Options',
          'Choose an action',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Archive', onPress: () => archiveChat(item.chat_id) },
            { text: 'Delete', style: 'destructive', onPress: () => deleteChat(item.chat_id) },
          ]
        );
      }}
    >
      <Image
        source={{
          uri: item.chat_type === 'individual'
            ? item.otherUser?.profile_picture || 'https://randomuser.me/api/portraits/lego/1.jpg'
            : item.avatar || 'https://randomuser.me/api/portraits/lego/2.jpg',
        }}
        style={styles.avatar}
      />
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.chat_type === 'individual'
              ? item.otherUser?.full_name || item.otherUser?.mobile_number || 'Unknown'
              : item.name || 'Group Chat'}
          </Text>
          <Text style={styles.chatTime}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessageText || 'No messages yet'}
          </Text>
          
          {item.unread_count && item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => toggleContactSelection(item.contact_user)}
    >
      <Image
        source={{ uri: item.contact_user_detail?.profile_picture || 'https://randomuser.me/api/portraits/lego/1.jpg' }}
        style={styles.contactAvatar}
      />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>
          {item.name || item.contact_user_detail?.full_name || item.contact_user_detail?.mobile_number}
        </Text>
        <Text style={styles.contactNumber}>{item.contact_user_detail?.mobile_number}</Text>
      </View>
      {selectedContacts.includes(item.contact_user) && (
        <Ionicons name="checkmark-circle" size={24} color="#25D366" />
      )}
    </TouchableOpacity>
  );

  const renderSearchUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => createIndividualChat(item.id)}
      disabled={creatingChat}
    >
      <Image
        source={{ uri: item.profile_picture || 'https://randomuser.me/api/portraits/lego/1.jpg' }}
        style={styles.contactAvatar}
      />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.full_name || item.mobile_number}</Text>
        <Text style={styles.contactNumber}>{item.mobile_number}</Text>
      </View>
      {creatingChat && <ActivityIndicator size="small" color="#25D366" />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/dashboard/manage/contacts')} style={styles.headerButton}>
            <Ionicons name="people-outline" size={24} color="#075E54" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowNewChatModal(true)} style={styles.headerButton}>
            <Ionicons name="create-outline" size={24} color="#075E54" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Chats List */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderChatItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#25D366']} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No chats yet</Text>
            <Text style={styles.emptySubtext}>Start a new conversation</Text>
          </View>
        )}
        contentContainerStyle={filteredChats.length === 0 && styles.emptyList}
      />
      
      {/* New Chat Modal */}
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Chat</Text>
              <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalOptions}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowNewChatModal(false);
                  setShowGroupModal(true);
                }}
              >
                <View style={styles.modalOptionIcon}>
                  <Ionicons name="people" size={24} color="#25D366" />
                </View>
                <View>
                  <Text style={styles.modalOptionTitle}>New Group</Text>
                  <Text style={styles.modalOptionSubtitle}>Create a group chat</Text>
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchUsersContainer}>
              <TextInput
                style={styles.userSearchInput}
                placeholder="Search by name or number..."
                placeholderTextColor="#999"
                value={userSearchQuery}
                onChangeText={searchUsersHandler}
              />
            </View>
            
            <FlatList
              data={searchUsers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderSearchUserItem}
              ListEmptyComponent={() => {
                if (userSearchQuery.length >= 2) {
                  return (
                    <Text style={styles.noResultsText}>
                      No users found
                    </Text>
                  );
                }
                return null;
              }}
            />
          </Animated.View>
        </View>
      </Modal>
      
      {/* Create Group Modal */}
      <Modal
        visible={showGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Group</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.groupNameInput}
              placeholder="Group name"
              placeholderTextColor="#999"
              value={groupName}
              onChangeText={setGroupName}
            />
            
            <Text style={styles.contactSectionTitle}>
              Select Contacts ({selectedContacts.length})
            </Text>
            
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderContactItem}
              ListEmptyComponent={() => (
                <Text style={styles.noResultsText}>No contacts found</Text>
              )}
              style={styles.contactsList}
            />
            
            <TouchableOpacity
              style={[
                styles.createGroupButton,
                (!groupName.trim() || selectedContacts.length === 0) && styles.createGroupButtonDisabled,
              ]}
              onPress={createGroupChat}
              disabled={creatingChat || !groupName.trim() || selectedContacts.length === 0}
            >
              {creatingChat ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.createGroupButtonText}>Create Group</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#075E54',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 20,
  },
  headerButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  chatTime: {
    fontSize: 11,
    color: '#999',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.3,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  emptyList: {
    flexGrow: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalOptions: {
    paddingVertical: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  modalOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  searchUsersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  userSearchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  contactNumber: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  noResultsText: {
    textAlign: 'center',
    paddingVertical: 20,
    color: '#999',
  },
  groupNameInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginHorizontal: 20,
    marginVertical: 16,
  },
  contactSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  contactsList: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  createGroupButton: {
    backgroundColor: '#25D366',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  createGroupButtonDisabled: {
    backgroundColor: '#CCC',
  },
  createGroupButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});