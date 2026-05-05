// app/new-group.tsx
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, Platform, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { groupService, Chat } from '../../../lib/api';

// Theme definitions
const THEMES = {
  light: {
    id: 'light',
    colors: {
      primary: '#075E54',
      primaryLight: '#e8f5e9',
      success: '#25D366',
      background: '#FFFFFF',
      surface: '#F0F0F0',
      cardBg: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      textTertiary: '#999999',
      border: '#E0E0E0',
      placeholder: '#CCCCCC',
    }
  },
  dark: {
    id: 'dark',
    colors: {
      primary: '#128C7E',
      primaryLight: '#1a2f2a',
      success: '#25D366',
      background: '#111B21',
      surface: '#202C33',
      cardBg: '#202C33',
      text: '#E9EDEF',
      textSecondary: '#AEBAC1',
      textTertiary: '#8696A0',
      border: '#2A3942',
      placeholder: '#3D4B55',
    }
  },
  whatsappGreen: {
    id: 'whatsappGreen',
    colors: {
      primary: '#25D366',
      primaryLight: '#e8f5e9',
      success: '#25D366',
      background: '#FFFFFF',
      surface: '#F0F2F5',
      cardBg: '#FFFFFF',
      text: '#111B21',
      textSecondary: '#54656F',
      textTertiary: '#8696A0',
      border: '#E9EDEF',
      placeholder: '#CCCCCC',
    }
  },
  midnightBlue: {
    id: 'midnightBlue',
    colors: {
      primary: '#1E88E5',
      primaryLight: '#102a44',
      success: '#1E88E5',
      background: '#0A1929',
      surface: '#132F4C',
      cardBg: '#132F4C',
      text: '#FFFFFF',
      textSecondary: '#B0C4DE',
      textTertiary: '#7B9BB5',
      border: '#1E3A5F',
      placeholder: '#2C4A6E',
    }
  },
  sunsetOrange: {
    id: 'sunsetOrange',
    colors: {
      primary: '#FF5722',
      primaryLight: '#FFE0B2',
      success: '#FF5722',
      background: '#FFF3E0',
      surface: '#FFE0B2',
      cardBg: '#FFE0B2',
      text: '#4E342E',
      textSecondary: '#8D6E63',
      textTertiary: '#A1887F',
      border: '#FFCC80',
      placeholder: '#FFCC80',
    }
  },
  purpleHaze: {
    id: 'purpleHaze',
    colors: {
      primary: '#9C27B0',
      primaryLight: '#E1BEE7',
      success: '#9C27B0',
      background: '#F3E5F5',
      surface: '#E1BEE7',
      cardBg: '#E1BEE7',
      text: '#4A148C',
      textSecondary: '#7B1FA2',
      textTertiary: '#9C27B0',
      border: '#CE93D8',
      placeholder: '#CE93D8',
    }
  },
  oceanTeal: {
    id: 'oceanTeal',
    colors: {
      primary: '#00897B',
      primaryLight: '#B2DFDB',
      success: '#00897B',
      background: '#E0F2F1',
      surface: '#B2DFDB',
      cardBg: '#B2DFDB',
      text: '#004D40',
      textSecondary: '#00695C',
      textTertiary: '#00897B',
      border: '#80CBC4',
      placeholder: '#80CBC4',
    }
  },
  cherryBlossom: {
    id: 'cherryBlossom',
    colors: {
      primary: '#E91E63',
      primaryLight: '#F8BBD0',
      success: '#E91E63',
      background: '#FCE4EC',
      surface: '#F8BBD0',
      cardBg: '#F8BBD0',
      text: '#880E4F',
      textSecondary: '#AD1457',
      textTertiary: '#C2185B',
      border: '#F48FB1',
      placeholder: '#F48FB1',
    }
  },
};

interface User {
  id: number;
  mobile_number: string;
  full_name: string;
  profile_picture?: string;
  is_online?: boolean;
}

interface Contact {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  avatar?: string;
  selected: boolean;
}

export default function NewGroupScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [selectedContactDetails, setSelectedContactDetails] = useState<User[]>([]);
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
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

  // Load contacts on mount
  useEffect(() => {
    loadTheme();
    loadCurrentUser();
    loadAllUsers();
  }, []);

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

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      
      const response = await fetch('https://aptecproject.pythonanywhere.com/api/users/all/', {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const users: User[] = await response.json();
        
        const formattedContacts: Contact[] = users
          .filter(user => user.id !== currentUser?.id)
          .map(user => ({
            id: user.id,
            user_id: user.id,
            name: user.full_name || user.mobile_number,
            phone: user.mobile_number,
            avatar: getValidImageUrl(user.profile_picture),
            selected: false,
          }));
        
        formattedContacts.sort((a, b) => a.name.localeCompare(b.name));
        
        setContacts(formattedContacts);
      } else {
        console.error('Failed to load users:', response.status);
        Alert.alert('Error', 'Failed to load users');
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      Alert.alert('Error', error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  const toggleContact = (contact: Contact) => {
    if (selectedContacts.includes(contact.user_id)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contact.user_id));
      setSelectedContactDetails(selectedContactDetails.filter(c => c.id !== contact.user_id));
    } else {
      setSelectedContacts([...selectedContacts, contact.user_id]);
      const selectedUser: User = {
        id: contact.user_id,
        mobile_number: contact.phone,
        full_name: contact.name,
        profile_picture: contact.avatar,
      };
      setSelectedContactDetails([...selectedContactDetails, selectedUser]);
    }
  };

  const handleNext = () => {
    if (selectedContacts.length === 0) {
      Alert.alert('Error', 'Please select at least one contact');
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    setCreating(true);
    try {
      const participantIds = [...selectedContacts];
      
      const newGroup = await groupService.createGroup({
        name: groupName.trim(),
        participant_ids: participantIds,
        description: '',
        avatar: groupImage || undefined,
      });
      
      Alert.alert('Success', `Group "${groupName}" created with ${selectedContacts.length} members`);
      router.push(`/chat/${newGroup.chat_id}`);
    } catch (error: any) {
      console.error('Error creating group:', error);
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity 
      style={[styles.contactItem, { borderBottomColor: colors.border }]} 
      onPress={() => toggleContact(item)}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: item.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' }} 
        style={[styles.contactAvatar, { backgroundColor: colors.surface }]} 
      />
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>{item.phone}</Text>
      </View>
      <View style={[styles.checkbox, { borderColor: colors.border }, selectedContacts.includes(item.user_id) && [styles.checkboxSelected, { backgroundColor: colors.success, borderColor: colors.success }]]}>
        {selectedContacts.includes(item.user_id) && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
    </TouchableOpacity>
  );

  const renderSelectedMember = ({ item }: { item: User }) => (
    <View style={styles.memberItem}>
      <Image 
        source={{ uri: getValidImageUrl(item.profile_picture) }} 
        style={[styles.memberAvatar, { backgroundColor: colors.surface }]} 
      />
      <Text style={[styles.memberName, { color: colors.text }]}>{item.full_name || item.mobile_number}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.success} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {step === 1 ? 'Add participants' : 'New group'}
        </Text>
        <TouchableOpacity 
          onPress={step === 1 ? handleNext : handleCreate}
          disabled={step === 1 ? selectedContacts.length === 0 : creating}
        >
          <Text style={[
            styles.nextButton, 
            { color: colors.success },
            (step === 1 && selectedContacts.length === 0) && [styles.nextButtonDisabled, { opacity: 0.5 }]
          ]}>
            {step === 1 ? 'Next' : (creating ? 'Creating...' : 'Create')}
          </Text>
        </TouchableOpacity>
      </View>

      {step === 1 ? (
        <>
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search users..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Selected Count */}
          {selectedContacts.length > 0 && (
            <View style={[styles.selectedCount, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.selectedCountText, { color: colors.success }]}>
                {selectedContacts.length} user{selectedContacts.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          {/* Contacts List */}
          {filteredContacts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                {searchQuery ? 'Try a different search' : 'No other users on ApTec yet'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderContact}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contactsList}
            />
          )}
        </>
      ) : (
        <View style={styles.groupSetup}>
          {/* Group Image */}
          <TouchableOpacity 
            style={styles.groupImageContainer} 
            onPress={() => Alert.alert('Add photo', 'Group photo feature coming soon')}
          >
            {groupImage ? (
              <Image source={{ uri: groupImage }} style={styles.groupImage} />
            ) : (
              <View style={[styles.groupImagePlaceholder, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={32} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Group Name Input */}
          <View style={[styles.groupNameContainer, { borderBottomColor: colors.border }]}>
            <TextInput
              style={[styles.groupNameInput, { color: colors.text }]}
              placeholder="Group name"
              placeholderTextColor={colors.textTertiary}
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
              maxLength={25}
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>{groupName.length}/25</Text>
          </View>

          {/* Selected Members Preview */}
          <View style={styles.membersPreview}>
            <Text style={[styles.membersTitle, { color: colors.textSecondary }]}>
              {selectedContacts.length} member{selectedContacts.length !== 1 ? 's' : ''}
            </Text>
            <FlatList
              data={selectedContactDetails}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderSelectedMember}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.membersList}
              ListEmptyComponent={
                <Text style={[styles.noMembersText, { color: colors.textTertiary }]}>No members selected</Text>
              }
            />
          </View>
        </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 76,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
  },
  nextButton: { 
    fontSize: 16, 
    fontWeight: '600', 
  },
  nextButtonDisabled: { 
    opacity: 0.5 
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 20,
    height: 40,
  },
  searchIcon: { 
    marginRight: 8 
  },
  searchInput: { 
    flex: 1, 
    fontSize: 16,
  },
  selectedCount: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
  },
  selectedCountText: { 
    fontSize: 14, 
    fontWeight: '500' 
  },
  contactsList: {
    paddingBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  contactAvatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    marginRight: 12 
  },
  contactInfo: { 
    flex: 1 
  },
  contactName: { 
    fontSize: 16, 
    fontWeight: '500', 
  },
  contactPhone: { 
    fontSize: 13, 
    marginTop: 2 
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: { 
    borderWidth: 2,
  },
  groupSetup: { 
    flex: 1, 
    alignItems: 'center', 
    paddingTop: 40 
  },
  groupImageContainer: { 
    marginBottom: 24 
  },
  groupImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60 
  },
  groupImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupNameContainer: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  groupNameInput: { 
    flex: 1, 
    fontSize: 18, 
    paddingVertical: 12, 
  },
  charCount: { 
    fontSize: 12, 
  },
  membersPreview: { 
    width: '90%', 
    flex: 1 
  },
  membersTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 12 
  },
  membersList: {
    paddingBottom: 20,
  },
  memberItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  memberAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 12 
  },
  memberName: { 
    fontSize: 16, 
  },
  noMembersText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
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
    textAlign: 'center',
  },
});