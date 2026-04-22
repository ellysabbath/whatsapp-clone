// app/new-group.tsx
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, Platform, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { groupService, Chat } from '../../../lib/api';

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

  // Load contacts on mount
  useEffect(() => {
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
      
      const response = await fetch('http://192.168.137.1:8000/api/users/all/', {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const users: User[] = await response.json();
        
        // Filter out current user and format contacts
        const formattedContacts: Contact[] = users
          .filter(user => user.id !== currentUser?.id)
          .map(user => ({
            id: user.id,
            user_id: user.id,
            name: user.full_name || user.mobile_number,
            phone: user.mobile_number,
            avatar: user.profile_picture,
            selected: false,
          }));
        
        // Sort alphabetically by name
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
      // Create user object for selected contact
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
      style={styles.contactItem} 
      onPress={() => toggleContact(item)}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: item.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg' }} 
        style={styles.contactAvatar} 
      />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <View style={[styles.checkbox, selectedContacts.includes(item.user_id) && styles.checkboxSelected]}>
        {selectedContacts.includes(item.user_id) && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
    </TouchableOpacity>
  );

  const renderSelectedMember = ({ item }: { item: User }) => (
    <View style={styles.memberItem}>
      <Image 
        source={{ uri: item.profile_picture || 'https://randomuser.me/api/portraits/lego/1.jpg' }} 
        style={styles.memberAvatar} 
      />
      <Text style={styles.memberName}>{item.full_name || item.mobile_number}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Add participants' : 'New group'}
        </Text>
        <TouchableOpacity 
          onPress={step === 1 ? handleNext : handleCreate}
          disabled={step === 1 ? selectedContacts.length === 0 : creating}
        >
          <Text style={[
            styles.nextButton, 
            (step === 1 && selectedContacts.length === 0) && styles.nextButtonDisabled
          ]}>
            {step === 1 ? 'Next' : (creating ? 'Creating...' : 'Create')}
          </Text>
        </TouchableOpacity>
      </View>

      {step === 1 ? (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Selected Count */}
          {selectedContacts.length > 0 && (
            <View style={styles.selectedCount}>
              <Text style={styles.selectedCountText}>
                {selectedContacts.length} user{selectedContacts.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          {/* Contacts List */}
          {filteredContacts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color="#ddd" />
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubtext}>
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
              <View style={styles.groupImagePlaceholder}>
                <Ionicons name="camera" size={32} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Group Name Input */}
          <View style={styles.groupNameContainer}>
            <TextInput
              style={styles.groupNameInput}
              placeholder="Group name"
              placeholderTextColor="#999"
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
              maxLength={25}
            />
            <Text style={styles.charCount}>{groupName.length}/25</Text>
          </View>

          {/* Selected Members Preview */}
          <View style={styles.membersPreview}>
            <Text style={styles.membersTitle}>
              {selectedContacts.length} member{selectedContacts.length !== 1 ? 's' : ''}
            </Text>
            <FlatList
              data={selectedContactDetails}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderSelectedMember}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.membersList}
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
    backgroundColor: '#fff' 
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
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#000000' 
  },
  nextButton: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#25D366' 
  },
  nextButtonDisabled: { 
    opacity: 0.5 
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
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
    color: '#000',
  },
  selectedCount: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    backgroundColor: '#e8f5e9' 
  },
  selectedCountText: { 
    fontSize: 14, 
    color: '#25D366', 
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
    borderBottomColor: '#f0f0f0',
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
    color: '#000' 
  },
  contactPhone: { 
    fontSize: 13, 
    color: '#666', 
    marginTop: 2 
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: { 
    backgroundColor: '#25D366', 
    borderColor: '#25D366' 
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
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupNameContainer: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 24,
  },
  groupNameInput: { 
    flex: 1, 
    fontSize: 18, 
    paddingVertical: 12, 
    color: '#000' 
  },
  charCount: { 
    fontSize: 12, 
    color: '#999' 
  },
  membersPreview: { 
    width: '90%', 
    flex: 1 
  },
  membersTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#666', 
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
    color: '#000' 
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
    textAlign: 'center',
  },
});