import { View, Text,RefreshControl, FlatList, TouchableOpacity, StyleSheet, Image, TextInput, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService } from '../../../lib/api/services/chat.service';
 
interface AppUser {
  id: number;
  mobile_number: string;
  full_name: string;
  profile_picture?: string;
  is_online?: boolean;
}

interface UserWithChatStatus extends AppUser {
  hasExistingChat: boolean;
  chatId?: string;
}

export default function ContactScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithChatStatus[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithChatStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all users from backend
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch('http://192.168.137.1:8000/api/users/all/', {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const allUsers: AppUser[] = await response.json();
        
        // Get current user ID
        const userStr = await AsyncStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        
        // Filter out current user
        const otherUsers = allUsers.filter(user => user.id !== currentUser?.id);
        
        // Get existing chats to check which users already have chats
        const chats = await chatService.getChats();
        const userChatMap = new Map<number, string>();
        
        chats.forEach(chat => {
          if (chat.chat_type === 'individual' && chat.other_participant) {
            userChatMap.set(chat.other_participant.id, chat.chat_id);
          }
        });
        
        // Add chat status to users
        const usersWithChatStatus: UserWithChatStatus[] = otherUsers.map(user => ({
          ...user,
          hasExistingChat: userChatMap.has(user.id),
          chatId: userChatMap.get(user.id),
        }));
        
        // Sort alphabetically by name
        usersWithChatStatus.sort((a, b) => 
          (a.full_name || a.mobile_number).localeCompare(b.full_name || b.mobile_number)
        );
        
        setUsers(usersWithChatStatus);
        setFilteredUsers(usersWithChatStatus);
        console.log(`Loaded ${usersWithChatStatus.length} users from database`);
      } else {
        console.error('Failed to load users:', response.status);
        Alert.alert('Error', 'Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      setFilteredUsers(users);
    } else {
      const searchLower = text.toLowerCase();
      const filtered = users.filter(user =>
        (user.full_name && user.full_name.toLowerCase().includes(searchLower)) ||
        user.mobile_number.includes(searchLower)
      );
      setFilteredUsers(filtered);
    }
  }, [users]);

  const startChat = async (user: UserWithChatStatus) => {
    try {
      if (user.hasExistingChat && user.chatId) {
        // Navigate to existing chat
        router.push(`/chat/${user.chatId}`);
      } else {
        // Create new chat
        const newChat = await chatService.createChat({
          participant_ids: [user.id],
          chat_type: 'individual'
        });
        router.push(`/chat/${newChat.chat_id}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getRandomColor = (name: string) => {
    const colors = ['#25D366', '#075E54', '#128C7E', '#34B7F1', '#00A884'];
    const index = name.length % colors.length;
    return colors[index];
  };

  const renderUser = useCallback(({ item }: { item: UserWithChatStatus }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => startChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.profile_picture ? (
          <Image source={{ uri: item.profile_picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.defaultAvatar, { backgroundColor: getRandomColor(item.full_name || item.mobile_number) }]}>
            <Text style={styles.avatarText}>
              {getInitials(item.full_name || item.mobile_number)}
            </Text>
          </View>
        )}
        {item.is_online && (
          <View style={styles.onlineBadge} />
        )}
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.full_name || item.mobile_number}
        </Text>
        <Text style={styles.phoneNumber} numberOfLines={1}>
          {item.mobile_number}
        </Text>
      </View>
      
      <View style={styles.chatButton}>
        {item.hasExistingChat ? (
          <Ionicons name="chatbubble" size={22} color="#25D366" />
        ) : (
          <Ionicons name="chatbubble-outline" size={22} color="#25D366" />
        )}
      </View>
    </TouchableOpacity>
  ), []);

  const renderSectionHeader = (letter: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{letter}</Text>
    </View>
  );

  // Group users by first letter of name
  const groupedUsers = useMemo(() => {
    const grouped: { [key: string]: UserWithChatStatus[] } = {};
    
    filteredUsers.forEach(user => {
      const name = user.full_name || user.mobile_number;
      const firstLetter = name.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(user);
    });
    
    return Object.keys(grouped)
      .sort()
      .map(letter => ({
        title: letter,
        data: grouped[letter]
      }));
  }, [filteredUsers]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Loading ApTec users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0B150D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ApTec Users</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or phone..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color="#ddd" />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search' : 'No other users on ApTec yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedUsers}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <>
              {renderSectionHeader(item.title)}
              <FlatList
                data={item.data}
                keyExtractor={(user) => user.id.toString()}
                renderItem={renderUser}
                scrollEnabled={false}
                removeClippedSubviews={true}
                initialNumToRender={20}
                maxToRenderPerBatch={10}
                windowSize={5}
              />
            </>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.usersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          stickySectionHeadersEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#f5f5f5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 66,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#061C0F',
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCD4CC',
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
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  usersList: {
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#25D366',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 13,
    color: '#666',
  },
  chatButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    textAlign: 'center',
  },
});

// Add RefreshControl import at the top
