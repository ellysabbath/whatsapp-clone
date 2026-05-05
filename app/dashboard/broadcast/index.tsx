// app/new-broadcast.tsx
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, Platform, StatusBar, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { broadcastService, contactService, User } from '../../../lib/api';

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
  const [currentTheme, setCurrentTheme] = useState('light');

  // Get current theme colors
  const theme = THEMES[currentTheme as keyof typeof THEMES];
  const colors = theme.colors;

  // API Configuration
  const API_BASE_URL = 'https://aptecProject.pythonanywhere.com';

  // Helper function to get valid image URL
  const getValidImageUrl = (imageUrl: string | undefined | null): string => {
    const defaultAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';
    
    if (!imageUrl) return defaultAvatar;
    if (imageUrl.startsWith('data:image')) return imageUrl;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    if (imageUrl.startsWith('/')) return `${API_BASE_URL}${imageUrl}`;
    
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

  // Load current user
  useEffect(() => {
    loadTheme();
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
      const response = await contactService.getContacts();
      console.log('Contacts loaded:', response.length);
      
      const formattedContacts: Contact[] = response
        .filter(contact => !contact.is_blocked)
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
      style={[styles.recipientItem, { borderBottomColor: colors.border }]} 
      onPress={() => toggleRecipient(item)}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: item.avatar }} 
        style={styles.recipientAvatar} 
      />
      <View style={styles.recipientInfo}>
        <View style={styles.recipientNameRow}>
          <Text style={[styles.recipientName, { color: colors.text }]}>{item.name}</Text>
          {item.is_favorite && (
            <Ionicons name="star" size={14} color="#FFC107" />
          )}
        </View>
        <Text style={[styles.recipientPhone, { color: colors.textSecondary }]}>{item.phone}</Text>
      </View>
      <View style={[styles.checkbox, { borderColor: colors.border }, selectedRecipients.includes(item.user_id) && [styles.checkboxSelected, { backgroundColor: colors.primary, borderColor: colors.primary }]]}>
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
        <Text style={[styles.previewName, { color: colors.text }]}>{item.full_name || item.mobile_number}</Text>
        <Text style={[styles.previewPhone, { color: colors.textSecondary }]}>{item.mobile_number}</Text>
      </View>
    </View>
  );

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
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New broadcast list</Text>
        <TouchableOpacity 
          onPress={step === 1 ? handleNext : handleCreate}
          disabled={step === 1 ? selectedRecipients.length === 0 : creating}
        >
          <Text style={[
            styles.nextButton, 
            { color: colors.primary },
            (step === 1 && selectedRecipients.length === 0) && [styles.nextButtonDisabled, { opacity: 0.5 }]
          ]}>
            {step === 1 ? 'Next' : (creating ? 'Creating...' : 'Create')}
          </Text>
        </TouchableOpacity>
      </View>

      {step === 1 ? (
        <>
          {/* Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Broadcast lists let you send messages to multiple contacts at once. Recipients won't see each other.
            </Text>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search contacts..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Selected Count */}
          {selectedRecipients.length > 0 && (
            <View style={[styles.selectedCount, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="people" size={16} color={colors.primary} />
              <Text style={[styles.selectedCountText, { color: colors.primary }]}>
                {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          {/* Stats Bar */}
          <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Text style={[styles.statsText, { color: colors.textSecondary }]}>
              {recipients.length} contacts available • {recipients.filter(c => c.is_favorite).length} favorites
            </Text>
          </View>

          {/* Recipients List */}
          {filteredRecipients.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={80} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No contacts found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary + '80' }]}>
                {searchQuery ? 'Try a different search' : 'Add contacts to create broadcast lists'}
              </Text>
              <TouchableOpacity 
                style={[styles.addContactButton, { backgroundColor: colors.primary }]}
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
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh} 
                  colors={[colors.primary]} 
                  tintColor={colors.primary} 
                />
              }
            />
          )}
        </>
      ) : (
        <View style={styles.broadcastSetup}>
          {/* Broadcast Icon */}
          <View style={styles.broadcastIconContainer}>
            <View style={[styles.broadcastIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="megaphone" size={40} color={colors.primary} />
            </View>
          </View>

          {/* Broadcast Name Input */}
          <View style={styles.broadcastNameContainer}>
            <TextInput
              style={[styles.broadcastNameInput, { color: colors.text, borderBottomColor: colors.border }]}
              placeholder="Broadcast list name"
              placeholderTextColor={colors.textSecondary}
              value={broadcastName}
              onChangeText={setBroadcastName}
              autoFocus
              maxLength={30}
            />
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>{broadcastName.length}/30</Text>
          </View>

          {/* Recipients Preview */}
          <View style={styles.recipientsPreview}>
            <Text style={[styles.recipientsTitle, { color: colors.textSecondary }]}>
              {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''}
            </Text>
            <FlatList
              data={selectedRecipientDetails}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderSelectedRecipient}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.previewList}
              ListEmptyComponent={
                <Text style={[styles.noRecipientsText, { color: colors.textSecondary }]}>No recipients selected</Text>
              }
            />
          </View>

          <Text style={[styles.warningText, { color: '#FF9800' }]}>
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
  infoBanner: { 
    flexDirection: 'row', 
    padding: 12, 
    margin: 12, 
    borderRadius: 8, 
    gap: 8 
  },
  infoText: { 
    flex: 1, 
    fontSize: 13, 
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
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
  },
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  statsText: {
    fontSize: 12,
  },
  selectedCount: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    gap: 8 
  },
  selectedCountText: { 
    fontSize: 14, 
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
  },
  recipientPhone: { 
    fontSize: 13, 
    marginTop: 2 
  },
  checkbox: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 2, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  checkboxSelected: { 
    borderWidth: 2, 
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
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  addContactButton: {
    marginTop: 20,
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
    textAlign: 'center',
    width: '100%',
  },
  charCount: {
    fontSize: 12,
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
    fontWeight: '500',
  },
  previewPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  noRecipientsText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  warningText: { 
    fontSize: 12, 
    textAlign: 'center', 
    marginTop: 20,
    marginBottom: 20,
  },
});