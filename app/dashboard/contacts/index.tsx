import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, TextInput, Platform, Alert, PermissionsAndroid, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: { number: string; label?: string }[];
  image?: string;
}

export default function ContactScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 50; // Load 50 contacts at a time

  useEffect(() => {
    requestPermissionsAndLoadContacts();
  }, []);

  const requestPermissionsAndLoadContacts = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'ApTec needs access to your contacts to show them here',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          await loadContactsPaginated(0);
        } else {
          Alert.alert(
            'Permission Required',
            'Please grant contacts permission to see your contacts',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => openSettings() }
            ]
          );
          setLoading(false);
        }
      } else {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
          await loadContactsPaginated(0);
        } else {
          Alert.alert(
            'Permission Required',
            'Please grant contacts permission to see your contacts'
          );
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setLoading(false);
    }
  };

  const loadContactsPaginated = async (pageNum: number) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        // Get total count first
        const { data: allContacts } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });

        const validContacts = allContacts
          .filter(contact => contact.name && contact.phoneNumbers && contact.phoneNumbers.length > 0)
          .map(contact => ({
            id: contact.id,
            name: contact.name || 'Unknown',
            phoneNumbers: contact.phoneNumbers?.slice(0, 1), // Only take first phone number for speed
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        // Paginate
        const start = pageNum * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const paginatedContacts = validContacts.slice(start, end);

        if (pageNum === 0) {
          setContacts(paginatedContacts);
          setFilteredContacts(paginatedContacts);
        } else {
          setContacts(prev => [...prev, ...paginatedContacts]);
          setFilteredContacts(prev => [...prev, ...paginatedContacts]);
        }

        setHasMore(end < validContacts.length);
        setPermissionGranted(true);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreContacts = () => {
    if (!loadingMore && hasMore) {
      loadContactsPaginated(page + 1);
      setPage(prev => prev + 1);
    }
  };

  // Optimized search with debouncing
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      // Use requestIdleCallback for better performance on large lists
      const searchLower = text.toLowerCase();
      const filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchLower) ||
        contact.phoneNumbers?.some(phone => phone.number.includes(searchLower))
      );
      setFilteredContacts(filtered);
    }
  }, [contacts]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim() === '') {
        setFilteredContacts(contacts);
      } else {
        const searchLower = searchQuery.toLowerCase();
        const filtered = contacts.filter(contact =>
          contact.name.toLowerCase().includes(searchLower) ||
          contact.phoneNumbers?.some(phone => phone.number.includes(searchLower))
        );
        setFilteredContacts(filtered);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, contacts]);

  const handleContactPress = async (contact: Contact) => {
    const phoneNumber = contact.phoneNumbers?.[0]?.number;
    if (!phoneNumber) {
      Alert.alert('Error', 'No phone number found for this contact');
      return;
    }

    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      router.push({
        pathname: `/chat/${contact.id}`,
        params: { 
          name: contact.name,
          phone: phoneNumber.replace(/\s/g, '')
        }
      });
    } else {
      Alert.alert('Error', 'SMS is not available on this device');
    }
  };

  const handleInviteFriend = async () => {
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync(
        [],
        'Hey! I\'m using ApTec - the best messaging app. Join me here!'
      );
    } else {
      Alert.alert('Error', 'SMS is not available on this device');
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

  const renderContact = useCallback(({ item }: { item: Contact }) => (
    <TouchableOpacity 
      style={styles.contactItem}
      onPress={() => handleContactPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={[styles.defaultAvatar, { backgroundColor: getRandomColor(item.name) }]}>
          <Text style={styles.avatarText}>
            {getInitials(item.name)}
          </Text>
        </View>
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        {item.phoneNumbers && item.phoneNumbers[0] && (
          <Text style={styles.phoneNumber} numberOfLines={1}>
            {item.phoneNumbers[0].label && `${item.phoneNumbers[0].label}: `}
            {item.phoneNumbers[0].number}
          </Text>
        )}
      </View>
      
      <Ionicons name="chatbubble-outline" size={22} color="#25D366" />
    </TouchableOpacity>
  ), []);

  const renderSectionHeader = (letter: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{letter}</Text>
    </View>
  );

  // Memoize grouped contacts for better performance
  const groupedContacts = useMemo(() => {
    const grouped: { [key: string]: Contact[] } = {};
    filteredContacts.forEach(contact => {
      const firstLetter = contact.name.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(contact);
    });
    
    return Object.keys(grouped)
      .sort()
      .map(letter => ({
        title: letter,
        data: grouped[letter]
      }));
  }, [filteredContacts]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#25D366" />
        <Text style={styles.footerText}>Loading more contacts...</Text>
      </View>
    );
  };

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0B150D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Contact</Text>
        <TouchableOpacity onPress={handleInviteFriend} style={styles.inviteButton}>
          <Ionicons name="person-add-outline" size={24} color="#09110A" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
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

      {/* New Chat Button */}
      <TouchableOpacity style={styles.newChatButton}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#25D366" />
        <Text style={styles.newChatText}>New chat</Text>
      </TouchableOpacity>

      {/* Contacts List */}
      {!permissionGranted ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color="#ddd" />
          <Text style={styles.emptyText}>No contacts access</Text>
          <Text style={styles.emptySubtext}>
            Please grant contacts permission to see your contacts
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestPermissionsAndLoadContacts}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      ) : filteredContacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color="#ddd" />
          <Text style={styles.emptyText}>No contacts found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search' : 'Add contacts to start chatting'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedContacts}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <>
              {renderSectionHeader(item.title)}
              <FlatList
                data={item.data}
                keyExtractor={(contact) => contact.id}
                renderItem={renderContact}
                scrollEnabled={false}
                removeClippedSubviews={true}
                initialNumToRender={20}
                maxToRenderPerBatch={10}
                windowSize={5}
              />
            </>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contactsList}
          onEndReached={loadMoreContacts}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={15}
          windowSize={10}
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
  inviteButton: {
    padding: 4,
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
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  newChatText: {
    fontSize: 16,
    color: '#25D366',
    fontWeight: '500',
  },
  contactsList: {
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
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
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
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 13,
    color: '#666',
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
  permissionButton: {
    marginTop: 20,
    backgroundColor: '#25D366',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});