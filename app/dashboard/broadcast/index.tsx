// app/new-broadcast.tsx
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, Platform, StatusBar, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const recipients = [
  { id: '1', name: 'Sarah Johnson', phone: '+1 234 567 8900', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', selected: false },
  { id: '2', name: 'Mike Chen', phone: '+1 234 567 8901', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', selected: false },
  { id: '3', name: 'Emma Wilson', phone: '+1 234 567 8902', avatar: 'https://randomuser.me/api/portraits/women/3.jpg', selected: false },
  { id: '4', name: 'David Brown', phone: '+1 234 567 8903', avatar: 'https://randomuser.me/api/portraits/men/4.jpg', selected: false },
  { id: '5', name: 'Lisa Anderson', phone: '+1 234 567 8904', avatar: 'https://randomuser.me/api/portraits/women/5.jpg', selected: false },
];

export default function NewBroadcastScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [broadcastName, setBroadcastName] = useState('');
  const [step, setStep] = useState(1);

  const filteredRecipients = recipients.filter(recipient =>
    recipient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipient.phone.includes(searchQuery)
  );

  const toggleRecipient = (recipientId: string) => {
    if (selectedRecipients.includes(recipientId)) {
      setSelectedRecipients(selectedRecipients.filter(id => id !== recipientId));
    } else {
      setSelectedRecipients([...selectedRecipients, recipientId]);
    }
  };

  const handleCreate = () => {
    if (!broadcastName.trim()) {
      Alert.alert('Error', 'Please enter a broadcast list name');
      return;
    }
    if (selectedRecipients.length === 0) {
      Alert.alert('Error', 'Please select at least one recipient');
      return;
    }
    Alert.alert('Success', `Broadcast list "${broadcastName}" created with ${selectedRecipients.length} recipients`);
    router.back();
  };

  const renderRecipient = ({ item }: any) => (
    <TouchableOpacity style={styles.recipientItem} onPress={() => toggleRecipient(item.id)}>
      <Image source={{ uri: item.avatar }} style={styles.recipientAvatar} />
      <View style={styles.recipientInfo}>
        <Text style={styles.recipientName}>{item.name}</Text>
        <Text style={styles.recipientPhone}>{item.phone}</Text>
      </View>
      <View style={[styles.checkbox, selectedRecipients.includes(item.id) && styles.checkboxSelected]}>
        {selectedRecipients.includes(item.id) && <Ionicons name="checkmark" size={16} color="#fff" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)}>
          <Ionicons name="arrow-back" size={24} color="#075E54" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New broadcast list</Text>
        <TouchableOpacity onPress={step === 1 ? () => setStep(2) : handleCreate}>
          <Text style={[styles.nextButton, step === 1 && selectedRecipients.length === 0 && styles.nextButtonDisabled]}>
            {step === 1 ? 'Next' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      {step === 1 ? (
        <>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color="#25D366" />
            <Text style={styles.infoText}>
              Broadcast lists let you send messages to multiple contacts at once
            </Text>
          </View>

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
          {selectedRecipients.length > 0 && (
            <View style={styles.selectedCount}>
              <Ionicons name="people" size={16} color="#075E54" />
              <Text style={styles.selectedCountText}>
                {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          )}

          {/* Recipients List */}
          <FlatList
            data={filteredRecipients}
            keyExtractor={(item) => item.id}
            renderItem={renderRecipient}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.broadcastSetup}>
          {/* Broadcast Icon */}
          <View style={styles.broadcastIconContainer}>
            <View style={styles.broadcastIcon}>
              <Ionicons name="megaphone" size={40} color="#075E54" />
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
          </View>

          {/* Recipients Preview */}
          <View style={styles.recipientsPreview}>
            <Text style={styles.recipientsTitle}>Recipients</Text>
            {selectedRecipients.map(recipientId => {
              const recipient = recipients.find(r => r.id === recipientId);
              return recipient ? (
                <View key={recipient.id} style={styles.previewRecipient}>
                  <Image source={{ uri: recipient.avatar }} style={styles.previewAvatar} />
                  <Text style={styles.previewName}>{recipient.name}</Text>
                </View>
              ) : null;
            })}
          </View>

          <Text style={styles.warningText}>
            <Ionicons name="alert-circle-outline" size={14} color="#FF9800" />
            {' '}Recipients won`t see each other`s contact information
          </Text>
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
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#07211E' },
  nextButton: { fontSize: 16, fontWeight: '600', color: '#061A18' },
  nextButtonDisabled: { opacity: 0.5 },
  infoBanner: { flexDirection: 'row', backgroundColor: '#e8f5e9', padding: 12, margin: 12, borderRadius: 8, gap: 8 },
  infoText: { flex: 1, fontSize: 13, color: '#666' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', margin: 12, paddingHorizontal: 12, borderRadius: 20, height: 40 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  selectedCount: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#e8f5e9', gap: 8 },
  selectedCountText: { fontSize: 14, color: '#075E54', fontWeight: '500' },
  recipientItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  recipientAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  recipientInfo: { flex: 1 },
  recipientName: { fontSize: 16, fontWeight: '500', color: '#000' },
  recipientPhone: { fontSize: 13, color: '#666', marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#25D366', borderColor: '#25D366' },
  broadcastSetup: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  broadcastIconContainer: { marginBottom: 24 },
  broadcastIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center' },
  broadcastNameContainer: { width: '100%', marginBottom: 24 },
  broadcastNameInput: { fontSize: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', textAlign: 'center' },
  recipientsPreview: { width: '100%', marginBottom: 24 },
  recipientsTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },
  previewRecipient: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  previewAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  previewName: { fontSize: 16, color: '#000' },
  warningText: { fontSize: 12, color: '#FF9800', textAlign: 'center', marginTop: 20 },
});