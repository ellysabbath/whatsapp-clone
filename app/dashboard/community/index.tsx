// app/new-community.tsx
import { View, Text, TextInput,ScrollView, TouchableOpacity, FlatList, StyleSheet, Image, Platform, StatusBar, Alert, Switch } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const existingGroups = [
  { id: '1', name: 'Family Group', members: 8, avatar: 'https://randomuser.me/api/portraits/women/5.jpg', selected: false },
  { id: '2', name: 'Work Team', members: 12, avatar: 'https://randomuser.me/api/portraits/men/6.jpg', selected: false },
  { id: '3', name: 'Fitness Club', members: 25, avatar: 'https://randomuser.me/api/portraits/women/7.jpg', selected: false },
];

export default function NewCommunityScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [communityName, setCommunityName] = useState('');
  const [communityDesc, setCommunityDesc] = useState('');
  const [communityImage, setCommunityImage] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [announcementOnly, setAnnouncementOnly] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(true);

  const toggleGroup = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter(id => id !== groupId));
    } else {
      setSelectedGroups([...selectedGroups, groupId]);
    }
  };

  const handleCreate = () => {
    if (!communityName.trim()) {
      Alert.alert('Error', 'Please enter a community name');
      return;
    }
    Alert.alert(
      'Success',
      `Community "${communityName}" created with ${selectedGroups.length} groups`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const renderGroup = ({ item }: any) => (
    <TouchableOpacity style={styles.groupItem} onPress={() => toggleGroup(item.id)}>
      <Image source={{ uri: item.avatar }} style={styles.groupAvatar} />
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupMembers}>{item.members} members</Text>
      </View>
      <View style={[styles.checkbox, selectedGroups.includes(item.id) && styles.checkboxSelected]}>
        {selectedGroups.includes(item.id) && <Ionicons name="checkmark" size={16} color="#fff" />}
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
        <Text style={styles.headerTitle}>New community</Text>
        <TouchableOpacity onPress={step === 1 ? () => setStep(2) : handleCreate}>
          <Text style={styles.nextButton}>Create</Text>
        </TouchableOpacity>
      </View>

      {step === 1 ? (
        <ScrollView style={styles.setupContainer}>
          {/* Community Image */}
          <View style={styles.imageSection}>
            <TouchableOpacity style={styles.communityImageContainer} onPress={() => Alert.alert('Add photo', 'Choose community photo')}>
              {communityImage ? (
                <Image source={{ uri: communityImage }} style={styles.communityImage} />
              ) : (
                <View style={styles.communityImagePlaceholder}>
                  <Ionicons name="people" size={40} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Community Info */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Community name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter community name"
              value={communityName}
              onChangeText={setCommunityName}
              maxLength={50}
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your community"
              value={communityDesc}
              onChangeText={setCommunityDesc}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          {/* Settings */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Community settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Announcement only</Text>
                <Text style={styles.settingDesc}>Only admins can send messages</Text>
              </View>
              <Switch value={announcementOnly} onValueChange={setAnnouncementOnly} trackColor={{ false: '#ddd', true: '#25D366' }} />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Approval required</Text>
                <Text style={styles.settingDesc}>New members need admin approval</Text>
              </View>
              <Switch value={approvalRequired} onValueChange={setApprovalRequired} trackColor={{ false: '#ddd', true: '#25D366' }} />
            </View>
          </View>

          <Text style={styles.infoText}>
            <Ionicons name="information-circle-outline" size={14} color="#666" />
            {' '}Communities bring your groups together in one place
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.groupsContainer}>
          <Text style={styles.groupsTitle}>Add groups to community</Text>
          <Text style={styles.groupsSubtitle}>Select groups to include in {communityName || 'this community'}</Text>
          
          <FlatList
            data={existingGroups}
            keyExtractor={(item) => item.id}
            renderItem={renderGroup}
            showsVerticalScrollIndicator={false}
          />
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
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#075E54' },
  nextButton: { fontSize: 16, fontWeight: '600', color: '#075E54' },
  setupContainer: { flex: 1, padding: 20 },
  imageSection: { alignItems: 'center', marginBottom: 24 },
  communityImageContainer: { marginBottom: 12 },
  communityImage: { width: 100, height: 100, borderRadius: 50 },
  communityImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputSection: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  settingsSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 0.5, borderTopColor: '#e0e0e0' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 16 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '500', color: '#000', marginBottom: 4 },
  settingDesc: { fontSize: 13, color: '#666' },
  infoText: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 24 },
  groupsContainer: { flex: 1, padding: 16 },
  groupsTitle: { fontSize: 20, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  groupsSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  groupItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  groupAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '500', color: '#000' },
  groupMembers: { fontSize: 13, color: '#666', marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#25D366', borderColor: '#25D366' },
});