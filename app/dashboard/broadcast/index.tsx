// app/new-broadcast.tsx
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, Platform, StatusBar, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { broadcastService, contactService, User } from '../../../lib/api';

// API Configuration
const API_BASE_URL = 'http://192.168.137.1:8000';

interface Contact {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  avatar?: string;
  selected: boolean;
  user_details?: User;
  is_blocked: boolean;
  is_favorite: boolean;
}

export default function NewBroadcastScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [selectedRecipientDetails, setSelectedRecipientDetails] = useState<User[]>([]);
  const [broadcastName, setBroadcastName] = useState('');
  const [step, setStep] = useState(1);
  const [recipients, setRecipients] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Helper function to get valid image URL
  const getValidImageUrl = (imageUrl: string | undefined | null): string => {
    const defaultAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';
    
    if (!imageUrl) return defaultAvatar;
    if (imageUrl.startsWith('data:image')) return imageUrl;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    if (imageUrl.startsWith('/')) return `${API_BASE_URL}${imageUrl}`;
    
    return defaultAvatar;
  };

  // Load current user
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Load contacts when current user is loaded
  useEffect(() => {
    if (currentUser) {
      loadContacts();
    }
  }, [currentUser]);

  const loadCurrentUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
        console.log('Current user loaded:', JSON.parse(userStr));
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      // Fetch contacts from api/contacts endpoint
      const response = await contactService.getContacts();
      console.log('Contacts loaded:', response.length);
      
      // Filter out blocked contacts and format
      const formattedContacts: Contact[] = response
        .filter(contact => !contact.is_blocked) // Exclude blocked contacts
        .map(contact => ({
          id: contact.id,
          user_id: contact.contact_user,
          name: contact.name || contact.contact_user_details?.full_name || contact.contact_user_details?.mobile_number || 'Unknown',
          phone: contact.contact_user_details?.mobile_number || '',
          avatar: getValidImageUrl(contact.contact_user_details?.profile_picture),
          selected: false,
          user_details: contact.contact_user_details,
          is_blocked: contact.is_blocked,
          is_favorite: contact.is_favorite,
        }));
      
      // Sort alphabetically by name
      formattedContacts.sort((a, b) => a.name.localeCompare(b.name));
      
      setRecipients(formattedContacts);
      console.log('Formatted contacts:', formattedContacts.length);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', error.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadContacts();
  }, []);

  const filteredRecipients = recipients.filter(recipient =>
    recipient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipient.phone.includes(searchQuery)
  );

  const toggleRecipient = (recipient: Contact) => {
    if (selectedRecipients.includes(recipient.user_id)) {
      setSelectedRecipients(selectedRecipients.filter(id => id !== recipient.user_id));
      setSelectedRecipientDetails(selectedRecipientDetails.filter(c => c.id !== recipient.user_id));
    } else {
      setSelectedRecipients([...selectedRecipients, recipient.user_id]);
      if (recipient.user_details) {
        setSelectedRecipientDetails([...selectedRecipientDetails, recipient.user_details]);
      }
    }
  };

  const handleNext = () => {
    if (selectedRecipients.length === 0) {
      Alert.alert('Error', 'Please select at least one recipient');
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!broadcastName.trim()) {
      Alert.alert('Error', 'Please enter a broadcast list name');
      return;
    }
    
    setCreating(true);
    try {
      const newBroadcast = await broadcastService.createBroadcast({
        name: broadcastName.trim(),
        recipient_ids: selectedRecipients,
      });
      
      console.log('Broadcast created:', newBroadcast);
      
      Alert.alert(
        'Success', 
        `Broadcast list "${broadcastName}" created with ${selectedRecipients.length} recipients`
      );
      router.back();
    } catch (error: any) {
      console.error('Error creating broadcast:', error);
      Alert.alert('Error', error.message || 'Failed to create broadcast list');
    } finally {
      setCreating(false);
    }
  };

  const renderRecipient = ({ item }: { item: Contact }) => (
    <TouchableOpacity 
      style={styles.recipientItem} 
      onPress={() => toggleRecipient(item)}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: item.avatar }} 
        style={styles.recipientAvatar} 
      />
      <View style={styles.recipientInfo}>
        <View style={styles.recipientNameRow}>
          <Text style={styles.recipientName}>{item.name}</Text>
          {item.is_favorite && (
            <Ionicons name="star" size={14} color="#FFC107" />
          )}
        </View>
        <Text style={styles.recipientPhone}>{item.phone}</Text>
      </View>
      <View style={[styles.checkbox, selectedRecipients.includes(item.user_id) && styles.checkboxSelected]}>
        {selectedRecipients.includes(item.user_id) && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
    </TouchableOpacity>
  );

  const renderSelectedRecipient = ({ item }: { item: User }) => (
    <View style={styles.previewRecipient}>
      <Image 
        source={{ uri: getValidImageUrl(item.profile_picture) }} 
        style={styles.previewAvatar} 
      />
      <View>
        <Text style={styles.previewName}>{item.full_name || item.mobile_number}</Text>
        <Text style={styles.previewPhone}>{item.mobile_number}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Loading contacts...</Text>
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
        <Text style={styles.headerTitle}>New broadcast list</Text>
        <TouchableOpacity 
          onPress={step === 1 ? handleNext : handleCreate}
          disabled={step === 1 ? selectedRecipients.length === 0 : creating}
        >
          <Text style={[
            styles.nextButton, 
            (step === 1 && selectedRecipients.length === 0) && styles.nextButtonDisabled
          ]}>
            {step === 1 ? 'Next' : (creating ? 'Creating...' : 'Create')}
          </Text>
        </TouchableOpacity>
      </View>

      {step === 1 ? (
        <>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#25D366" />
            <Text style={styles.infoText}>
              Broadcast lists let you send messages to multiple contacts at once. Recipients won't see each other.
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Selected Count */}
          {selectedRecipients.length > 0 && (
            <View style={styles.selectedCount}>
              <Ionicons name="people" size={16} color="#25D366" />
              <Text style={styles.selectedCountText}>
                {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <Text style={styles.statsText}>
              {recipients.length} contacts available • {recipients.filter(c => c.is_favorite).length} favorites
            </Text>
          </View>

          {/* Recipients List */}
          {filteredRecipients.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color="#ddd" />
              <Text style={styles.emptyText}>No contacts found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try a different search' : 'Add contacts to create broadcast lists'}
              </Text>
              <TouchableOpacity 
                style={styles.addContactButton}
                onPress={() => router.push('/dashboard/contacts')}
              >
                <Text style={styles.addContactButtonText}>Add Contacts</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredRecipients}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderRecipient}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#25D366"]} tintColor="#25D366" />
              }
            />
          )}
        </>
      ) : (
        <View style={styles.broadcastSetup}>
          {/* Broadcast Icon */}
          <View style={styles.broadcastIconContainer}>
            <View style={styles.broadcastIcon}>
              <Ionicons name="megaphone" size={40} color="#25D366" />
            </View>
          </View>

          {/* Broadcast Name Input */}
          <View style={styles.broadcastNameContainer}>
            <TextInput
              style={styles.broadcastNameInput}
              placeholder="Broadcast list name"
              placeholderTextColor="#999"
              value={broadcastName}
              onChangeText={setBroadcastName}
              autoFocus
              maxLength={30}
            />
            <Text style={styles.charCount}>{broadcastName.length}/30</Text>
          </View>

          {/* Recipients Preview */}
          <View style={styles.recipientsPreview}>
            <Text style={styles.recipientsTitle}>
              {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''}
            </Text>
            <FlatList
              data={selectedRecipientDetails}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderSelectedRecipient}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.previewList}
              ListEmptyComponent={
                <Text style={styles.noRecipientsText}>No recipients selected</Text>
              }
            />
          </View>

          <Text style={styles.warningText}>
            <Ionicons name="alert-circle-outline" size={14} color="#FF9800" />
            {' '}Recipients won't see each other's contact information
          </Text>
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
  infoBanner: { 
    flexDirection: 'row', 
    backgroundColor: '#e8f5e9', 
    padding: 12, 
    margin: 12, 
    borderRadius: 8, 
    gap: 8 
  },
  infoText: { 
    flex: 1, 
    fontSize: 13, 
    color: '#666' 
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f0f0f0', 
    margin: 12, 
    paddingHorizontal: 12, 
    borderRadius: 20, 
    height: 40 
  },
  searchIcon: { 
    marginRight: 8 
  },
  searchInput: { 
    flex: 1, 
    fontSize: 16,
    color: '#000',
  },
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  selectedCount: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    backgroundColor: '#e8f5e9', 
    gap: 8 
  },
  selectedCountText: { 
    fontSize: 14, 
    color: '#25D366', 
    fontWeight: '500' 
  },
  listContainer: {
    paddingBottom: 20,
  },
  recipientItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#f0f0f0' 
  },
  recipientAvatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  recipientInfo: { 
    flex: 1 
  },
  recipientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recipientName: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#000' 
  },
  recipientPhone: { 
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
    alignItems: 'center' 
  },
  checkboxSelected: { 
    backgroundColor: '#25D366', 
    borderColor: '#25D366' 
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
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
  addContactButton: {
    marginTop: 20,
    backgroundColor: '#25D366',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addContactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  broadcastSetup: { 
    flex: 1, 
    alignItems: 'center', 
    paddingTop: 40, 
    paddingHorizontal: 20 
  },
  broadcastIconContainer: { 
    marginBottom: 24 
  },
  broadcastIcon: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#e8f5e9', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  broadcastNameContainer: { 
    width: '100%', 
    marginBottom: 24,
    alignItems: 'center',
  },
  broadcastNameInput: { 
    fontSize: 18, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e0e0e0', 
    textAlign: 'center',
    width: '100%',
    color: '#000',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  recipientsPreview: { 
    width: '100%', 
    marginBottom: 24,
    flex: 1,
  },
  recipientsTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#666', 
    marginBottom: 12 
  },
  previewList: {
    paddingBottom: 20,
  },
  previewRecipient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
    gap: 12,
  },
  previewAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#f0f0f0',
  },
  previewName: { 
    fontSize: 16, 
    color: '#000',
    fontWeight: '500',
  },
  previewPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  noRecipientsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  warningText: { 
    fontSize: 12, 
    color: '#FF9800', 
    textAlign: 'center', 
    marginTop: 20,
    marginBottom: 20,
  },
});