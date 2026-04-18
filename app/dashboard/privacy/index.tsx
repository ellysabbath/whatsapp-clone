// app/privacy-settings.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  
  // Privacy states
  const [lastSeen, setLastSeen] = useState('Everyone');
  const [profilePhoto, setProfilePhoto] = useState('Everyone');
  const [about, setAbout] = useState('Everyone');
  const [status, setStatus] = useState('Everyone');
  const [readReceipts, setReadReceipts] = useState(true);
  const [groups, setGroups] = useState('Everyone');
  const [calls, setCalls] = useState('Everyone');
  const [blockedContacts, setBlockedContacts] = useState(['+1234567890']);
  const [fingerprintLock, setFingerprintLock] = useState(false);
  const [screenLock, setScreenLock] = useState(false);
  const [disappearingMessages, setDisappearingMessages] = useState(false);
  const [liveLocation, setLiveLocation] = useState(false);
  
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerType, setPickerType] = useState('');
  const [pickerValue, setPickerValue] = useState('');

  const privacyOptions = ['Everyone', 'My Contacts', 'My Contacts Except...', 'Nobody'];

  const handlePickerSelect = (value: string) => {
    switch(pickerType) {
      case 'lastSeen':
        setLastSeen(value);
        break;
      case 'profilePhoto':
        setProfilePhoto(value);
        break;
      case 'about':
        setAbout(value);
        break;
      case 'status':
        setStatus(value);
        break;
      case 'groups':
        setGroups(value);
        break;
      case 'calls':
        setCalls(value);
        break;
    }
    setShowPickerModal(false);
  };

  const showPicker = (type: string, currentValue: string) => {
    setPickerType(type);
    setPickerValue(currentValue);
    setShowPickerModal(true);
  };

  const handleBlockedContacts = () => {
    Alert.alert('Blocked Contacts', 'Manage blocked contacts');
  };

  const handleFingerprintLock = () => {
    Alert.alert('Fingerprint Lock', 'Enable fingerprint lock for extra security');
  };

  const PrivacyItem = ({ icon, title, value, onPress, rightElement }: any) => (
    <TouchableOpacity style={styles.privacyItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.privacyItemLeft}>
        <View style={styles.privacyIcon}>
          <Ionicons name={icon} size={22} color="#075E54" />
        </View>
        <Text style={styles.privacyTitle}>{title}</Text>
      </View>
      {rightElement ? rightElement : <Text style={styles.privacyValue}>{value}<Ionicons name="chevron-forward" size={16} color="#999" style={styles.chevron} /></Text>}
    </TouchableOpacity>
  );

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#075E54" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        
        {/* Who can see my info */}
        <Section title="Who can see my personal info">
          <PrivacyItem 
            icon="time-outline" 
            title="Last seen & online" 
            value={lastSeen}
            onPress={() => showPicker('lastSeen', lastSeen)}
          />
          <PrivacyItem 
            icon="image-outline" 
            title="Profile photo" 
            value={profilePhoto}
            onPress={() => showPicker('profilePhoto', profilePhoto)}
          />
          <PrivacyItem 
            icon="information-circle-outline" 
            title="About" 
            value={about}
            onPress={() => showPicker('about', about)}
          />
          <PrivacyItem 
            icon="chatbubble-outline" 
            title="Status" 
            value={status}
            onPress={() => showPicker('status', status)}
          />
        </Section>

        {/* Read receipts */}
        <Section title="Read receipts">
          <PrivacyItem 
            icon="checkmark-done-outline" 
            title="Read receipts" 
            value={readReceipts ? "On" : "Off"}
            rightElement={
              <Switch
                value={readReceipts}
                onValueChange={setReadReceipts}
                trackColor={{ false: '#767577', true: '#25D366' }}
                thumbColor="#fff"
              />
            }
          />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoText}>
              If turned off, you won't be able to see read receipts from others. Read receipts are always sent for group chats.
            </Text>
          </View>
        </Section>

        {/* Who can contact me */}
        <Section title="Who can contact me">
          <PrivacyItem 
            icon="people-outline" 
            title="Groups" 
            value={groups}
            onPress={() => showPicker('groups', groups)}
          />
          <PrivacyItem 
            icon="call-outline" 
            title="Calls" 
            value={calls}
            onPress={() => showPicker('calls', calls)}
          />
        </Section>

        {/* Blocked contacts */}
        <Section title="Blocked contacts">
          <PrivacyItem 
            icon="ban-outline" 
            title="Blocked contacts" 
            value={`${blockedContacts.length} blocked`}
            onPress={handleBlockedContacts}
          />
        </Section>

        {/* Security */}
        <Section title="Security">
          <PrivacyItem 
            icon="finger-print-outline" 
            title="Fingerprint lock" 
            value={fingerprintLock ? "On" : "Off"}
            rightElement={
              <Switch
                value={fingerprintLock}
                onValueChange={setFingerprintLock}
                trackColor={{ false: '#767577', true: '#25D366' }}
                thumbColor="#fff"
              />
            }
          />
          <PrivacyItem 
            icon="lock-closed-outline" 
            title="Screen lock" 
            value={screenLock ? "On" : "Off"}
            rightElement={
              <Switch
                value={screenLock}
                onValueChange={setScreenLock}
                trackColor={{ false: '#767577', true: '#25D366' }}
                thumbColor="#fff"
              />
            }
          />
          <PrivacyItem 
            icon="shield-checkmark-outline" 
            title="Two-step verification" 
            value="Enabled"
            onPress={() => Alert.alert('Two-step verification', 'Manage two-step verification settings')}
          />
        </Section>

        {/* Additional privacy */}
        <Section title="Additional privacy">
          <PrivacyItem 
            icon="chatbubbles-outline" 
            title="Disappearing messages" 
            value={disappearingMessages ? "On" : "Off"}
            rightElement={
              <Switch
                value={disappearingMessages}
                onValueChange={setDisappearingMessages}
                trackColor={{ false: '#767577', true: '#25D366' }}
                thumbColor="#fff"
              />
            }
          />
          <PrivacyItem 
            icon="location-outline" 
            title="Live location" 
            value={liveLocation ? "On" : "Off"}
            rightElement={
              <Switch
                value={liveLocation}
                onValueChange={setLiveLocation}
                trackColor={{ false: '#767577', true: '#25D366' }}
                thumbColor="#fff"
              />
            }
          />
          <PrivacyItem 
            icon="alert-circle-outline" 
            title="Block unknown contacts" 
            value="Off"
            rightElement={
              <Switch
                value={false}
                onValueChange={() => {}}
                trackColor={{ false: '#767577', true: '#25D366' }}
                thumbColor="#fff"
              />
            }
          />
        </Section>

        {/* Info text at bottom */}
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomInfoText}>
            Your privacy and security are important to us. These settings control who can see your information and how you interact with others.
          </Text>
        </View>
      </ScrollView>

      {/* Picker Modal */}
      {showPickerModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose who can see</Text>
              <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                <Ionicons name="close" size={24} color="#075E54" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalOptions}>
              {privacyOptions.map(option => (
                <TouchableOpacity 
                  key={option} 
                  style={styles.modalOption}
                  onPress={() => handlePickerSelect(option)}
                >
                  <Text style={[styles.modalOptionText, pickerValue === option && styles.modalOptionTextSelected]}>
                    {option}
                  </Text>
                  {pickerValue === option && <Ionicons name="checkmark" size={20} color="#25D366" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 66,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#075E54',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderTopColor: '#e0e0e0',
    borderBottomColor: '#e0e0e0',
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  privacyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  privacyTitle: {
    fontSize: 16,
    color: '#000',
  },
  privacyValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  chevron: {
    marginLeft: 4,
  },
  infoTextContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  bottomInfo: {
    padding: 20,
    alignItems: 'center',
  },
  bottomInfoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#075E54',
  },
  modalOptions: {
    padding: 16,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#000',
  },
  modalOptionTextSelected: {
    color: '#075E54',
    fontWeight: '500',
  },
});