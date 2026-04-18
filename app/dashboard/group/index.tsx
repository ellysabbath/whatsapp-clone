// app/new-group.tsx
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, Platform, StatusBar, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const contacts = [
  { id: '1', name: 'Sarah Johnson', phone: '+1 234 567 8900', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', selected: false },
  { id: '2', name: 'Mike Chen', phone: '+1 234 567 8901', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', selected: false },
  { id: '3', name: 'Emma Wilson', phone: '+1 234 567 8902', avatar: 'https://randomuser.me/api/portraits/women/3.jpg', selected: false },
  { id: '4', name: 'David Brown', phone: '+1 234 567 8903', avatar: 'https://randomuser.me/api/portraits/men/4.jpg', selected: false },
  { id: '5', name: 'Lisa Anderson', phone: '+1 234 567 8904', avatar: 'https://randomuser.me/api/portraits/women/5.jpg', selected: false },
  { id: '6', name: 'Tom Wilson', phone: '+1 234 567 8905', avatar: 'https://randomuser.me/api/portraits/men/6.jpg', selected: false },
];

export default function NewGroupScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState<string | null>(null);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  const toggleContact = (contactId: string) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
  };

  const handleNext = () => {
    if (selectedContacts.length === 0) {
      Alert.alert('Error', 'Please select at least one contact');
      return;
    }
    setStep(2);
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    Alert.alert('Success', `Group "${groupName}" created with ${selectedContacts.length} members`);
    router.back();
  };

  const renderContact = ({ item }: any) => (
    <TouchableOpacity style={styles.contactItem} onPress={() => toggleContact(item.id)}>
      <Image source={{ uri: item.avatar }} style={styles.contactAvatar} />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <View style={[styles.checkbox, selectedContacts.includes(item.id) && styles.checkboxSelected]}>
        {selectedContacts.includes(item.id) && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)}>
          <Ionicons name="arrow-back" size={24} color="#051A17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Add participants' : 'New group'}
        </Text>
        <TouchableOpacity onPress={step === 1 ? handleNext : handleCreate}>
          <Text style={[styles.nextButton, (step === 1 && selectedContacts.length === 0) && styles.nextButtonDisabled]}>
            {step === 1 ? 'Next' : 'Create'}
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
              placeholder="Search contacts..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Selected Count */}
          {selectedContacts.length > 0 && (
            <View style={styles.selectedCount}>
              <Text style={styles.selectedCountText}>
                {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          {/* Contacts List */}
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            renderItem={renderContact}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.groupSetup}>
          {/* Group Image */}
          <TouchableOpacity style={styles.groupImageContainer} onPress={() => Alert.alert('Add photo', 'Choose group photo')}>
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
            {selectedContacts.map(contactId => {
              const contact = contacts.find(c => c.id === contactId);
              return contact ? (
                <View key={contact.id} style={styles.memberItem}>
                  <Image source={{ uri: contact.avatar }} style={styles.memberAvatar} />
                  <Text style={styles.memberName}>{contact.name}</Text>
                </View>
              ) : null;
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#031B19' },
  nextButton: { fontSize: 16, fontWeight: '600', color: '#041D1A' },
  nextButtonDisabled: { opacity: 0.5 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 20,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  selectedCount: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#e8f5e9' },
  selectedCountText: { fontSize: 14, color: '#031916', fontWeight: '500' },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  contactAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '500', color: '#000' },
  contactPhone: { fontSize: 13, color: '#666', marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: '#25D366', borderColor: '#25D366' },
  groupSetup: { flex: 1, alignItems: 'center', paddingTop: 40 },
  groupImageContainer: { marginBottom: 24 },
  groupImage: { width: 120, height: 120, borderRadius: 60 },
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
  groupNameInput: { flex: 1, fontSize: 18, paddingVertical: 12, color: '#000' },
  charCount: { fontSize: 12, color: '#999' },
  membersPreview: { width: '90%' },
  membersTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  memberItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  memberName: { fontSize: 16, color: '#000' },
});