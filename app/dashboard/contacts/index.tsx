import { View, Text, RefreshControl, FlatList, TouchableOpacity, StyleSheet, Image, TextInput, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService } from '../../../lib/api/services/chat.service';

// Theme definitions (same as ThemeSettingsScreen)
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

// Helper function to normalize mobile number to +255 format
const normalizePhoneNumber = (phoneNumber: string): string => {
  let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '+255' + cleaned.substring(1);
  }
  else if (cleaned.startsWith('255')) {
    cleaned = '+' + cleaned;
  }
  else if (cleaned.startsWith('+255')) {
    // Already in correct format
  }
  else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
};

export default function ContactScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithChatStatus[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithChatStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserNumber, setCurrentUserNumber] = useState<string>('');
  const [currentTheme, setCurrentTheme] = useState('light');

  // Get current theme colors
  const theme = THEMES[currentTheme as keyof typeof THEMES];
  const colors = theme.colors;

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

  useEffect(() => {
    loadTheme();
    loadCurrentUserAndContacts();
  }, []);

  const loadCurrentUserAndContacts = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const userNumber = user.mobile_number || user.phone;
        if (userNumber) {
          const normalized = normalizePhoneNumber(userNumber);
          setCurrentUserNumber(normalized);
          console.log('Current user number:', normalized);
        }
      }
      
      await loadUsers();
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const token = await AsyncStorage.getItem('access_token');
      const userStr = await AsyncStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      
      const response = await fetch('https://aptecProject.pythonanywhere.com/api/users/all/', {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const allUsers: AppUser[] = await response.json();
        
        let currentUserNormalized = '';
        if (currentUser) {
          const currentPhone = currentUser.mobile_number || currentUser.phone;
          if (currentPhone) {
            currentUserNormalized = normalizePhoneNumber(currentPhone);
          }
        }
        
        const normalizedUsers = allUsers.map(user => ({
          ...user,
          normalized_number: normalizePhoneNumber(user.mobile_number)
        }));
        
        const otherUsers = normalizedUsers.filter(user => 
          user.normalized_number !== currentUserNormalized && user.id !== currentUser?.id
        );
        
        console.log(`Total users in DB: ${allUsers.length}`);
        console.log(`Other users after filtering: ${otherUsers.length}`);
        
        const chats = await chatService.getChats();
        const userChatMap = new Map<number, string>();
        
        chats.forEach(chat => {
          if (chat.chat_type === 'individual' && chat.other_participant) {
            userChatMap.set(chat.other_participant.id, chat.chat_id);
          }
        });
        
        const usersWithChatStatus: UserWithChatStatus[] = otherUsers.map(user => ({
          id: user.id,
          mobile_number: user.mobile_number,
          full_name: user.full_name || user.mobile_number,
          profile_picture: user.profile_picture,
          is_online: user.is_online,
          hasExistingChat: userChatMap.has(user.id),
          chatId: userChatMap.get(user.id),
        }));
        
        usersWithChatStatus.sort((a, b) => 
          (a.full_name || a.mobile_number).localeCompare(b.full_name || b.mobile_number)
        );
        
        setUsers(usersWithChatStatus);
        setFilteredUsers(usersWithChatStatus);
        
        console.log(`Loaded ${usersWithChatStatus.length} contacts to display`);
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
        router.push(`/chat/${user.chatId}`);
      } else {
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
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const getRandomColor = (name: string) => {
    const colors = ['#25D366', '#075E54', '#128C7E', '#34B7F1', '#00A884', '#1EBEA5', '#009688'];
    const index = name.length % colors.length;
    return colors[index];
  };

  const formatPhoneNumber = (phoneNumber: string): string => {
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    if (cleaned.startsWith('+255')) {
      const main = cleaned.substring(4);
      if (main.length === 9) {
        return `+255 ${main.substring(0, 2)} ${main.substring(2, 5)} ${main.substring(5)}`;
      }
    }
    return cleaned;
  };

  const renderUser = useCallback(({ item }: { item: UserWithChatStatus }) => (
    <TouchableOpacity 
      style={[styles.userItem, { borderBottomColor: colors.border }]}
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
          <View style={[styles.onlineBadge, { borderColor: colors.background }]} />
        )}
      </View>
      
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>
          {item.full_name || 'Unknown User'}
        </Text>
        <Text style={[styles.phoneNumber, { color: colors.textSecondary }]} numberOfLines={1}>
          {formatPhoneNumber(item.mobile_number)}
        </Text>
      </View>
      
      <View style={styles.chatButton}>
        {item.hasExistingChat ? (
          <Ionicons name="chatbubble" size={22} color={colors.primary} />
        ) : (
          <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  ), [colors]);

  const renderSectionHeader = (letter: string) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{letter}</Text>
    </View>
  );

  // Group users by first letter of name
  const groupedUsers = useMemo(() => {
    const grouped: { [key: string]: UserWithChatStatus[] } = {};
    
    filteredUsers.forEach(user => {
      const name = user.full_name || user.mobile_number;
      const firstLetter = name.charAt(0).toUpperCase();
      if (/[A-Z]/.test(firstLetter)) {
        if (!grouped[firstLetter]) {
          grouped[firstLetter] = [];
        }
        grouped[firstLetter].push(user);
      } else {
        if (!grouped['#']) {
          grouped['#'] = [];
        }
        grouped['#'].push(user);
      }
    });
    
    const sortedLetters = Object.keys(grouped).sort();
    const lettersWithNumber = sortedLetters.filter(l => l !== '#');
    const numberLetter = sortedLetters.includes('#') ? ['#'] : [];
    const allLetters = [...lettersWithNumber, ...numberLetter];
    
    return allLetters.map(letter => ({
      title: letter,
      data: grouped[letter]
    }));
  }, [filteredUsers]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Contacts</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search contacts by name or phone..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.statsText, { color: colors.textSecondary }]}>
          {filteredUsers.length} contact{filteredUsers.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No contacts found</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary + '80' }]}>
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
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
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
    paddingTop: Platform.OS === 'ios' ? 50 : 66,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
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
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  statsText: {
    fontSize: 12,
  },
  usersList: {
    paddingBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
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
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 13,
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
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});