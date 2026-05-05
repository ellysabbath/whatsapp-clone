// app/privacy-settings.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Alert, Platform, ScrollView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme definitions
const THEMES = {
  light: {
    id: 'light',
    colors: {
      primary: '#075E54',
      primaryLight: '#e8f5e9',
      success: '#25D366',
      danger: '#FF3B30',
      background: '#F0F2F5',
      cardBg: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      textTertiary: '#999999',
      border: '#E0E0E0',
      placeholder: '#CCCCCC',
      info: '#666666',
      modalBg: '#FFFFFF',
    }
  },
  dark: {
    id: 'dark',
    colors: {
      primary: '#128C7E',
      primaryLight: '#1a2f2a',
      success: '#25D366',
      danger: '#FF5C5C',
      background: '#111B21',
      cardBg: '#202C33',
      surface: '#202C33',
      text: '#E9EDEF',
      textSecondary: '#AEBAC1',
      textTertiary: '#8696A0',
      border: '#2A3942',
      placeholder: '#3D4B55',
      info: '#AEBAC1',
      modalBg: '#202C33',
    }
  },
  whatsappGreen: {
    id: 'whatsappGreen',
    colors: {
      primary: '#25D366',
      primaryLight: '#e8f5e9',
      success: '#25D366',
      danger: '#FF3B30',
      background: '#F0F2F5',
      cardBg: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#111B21',
      textSecondary: '#54656F',
      textTertiary: '#8696A0',
      border: '#E9EDEF',
      placeholder: '#CCCCCC',
      info: '#54656F',
      modalBg: '#FFFFFF',
    }
  },
  midnightBlue: {
    id: 'midnightBlue',
    colors: {
      primary: '#1E88E5',
      primaryLight: '#102a44',
      success: '#1E88E5',
      danger: '#FF6B6B',
      background: '#0A1929',
      cardBg: '#132F4C',
      surface: '#132F4C',
      text: '#FFFFFF',
      textSecondary: '#B0C4DE',
      textTertiary: '#7B9BB5',
      border: '#1E3A5F',
      placeholder: '#2C4A6E',
      info: '#B0C4DE',
      modalBg: '#132F4C',
    }
  },
  sunsetOrange: {
    id: 'sunsetOrange',
    colors: {
      primary: '#FF5722',
      primaryLight: '#FFE0B2',
      success: '#FF5722',
      danger: '#D84315',
      background: '#FFF3E0',
      cardBg: '#FFFFFF',
      surface: '#FFE0B2',
      text: '#4E342E',
      textSecondary: '#8D6E63',
      textTertiary: '#A1887F',
      border: '#FFCC80',
      placeholder: '#FFCC80',
      info: '#8D6E63',
      modalBg: '#FFFFFF',
    }
  },
  purpleHaze: {
    id: 'purpleHaze',
    colors: {
      primary: '#9C27B0',
      primaryLight: '#E1BEE7',
      success: '#9C27B0',
      danger: '#E91E63',
      background: '#F3E5F5',
      cardBg: '#FFFFFF',
      surface: '#E1BEE7',
      text: '#4A148C',
      textSecondary: '#7B1FA2',
      textTertiary: '#9C27B0',
      border: '#CE93D8',
      placeholder: '#CE93D8',
      info: '#7B1FA2',
      modalBg: '#FFFFFF',
    }
  },
  oceanTeal: {
    id: 'oceanTeal',
    colors: {
      primary: '#00897B',
      primaryLight: '#B2DFDB',
      success: '#00897B',
      danger: '#D81B60',
      background: '#E0F2F1',
      cardBg: '#FFFFFF',
      surface: '#B2DFDB',
      text: '#004D40',
      textSecondary: '#00695C',
      textTertiary: '#00897B',
      border: '#80CBC4',
      placeholder: '#80CBC4',
      info: '#00695C',
      modalBg: '#FFFFFF',
    }
  },
  cherryBlossom: {
    id: 'cherryBlossom',
    colors: {
      primary: '#E91E63',
      primaryLight: '#F8BBD0',
      success: '#E91E63',
      danger: '#C2185B',
      background: '#FCE4EC',
      cardBg: '#FFFFFF',
      surface: '#F8BBD0',
      text: '#880E4F',
      textSecondary: '#AD1457',
      textTertiary: '#C2185B',
      border: '#F48FB1',
      placeholder: '#F48FB1',
      info: '#AD1457',
      modalBg: '#FFFFFF',
    }
  },
};

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const [currentTheme, setCurrentTheme] = useState('light');
  
  // Get current theme colors
  const theme = THEMES[currentTheme as keyof typeof THEMES];
  const colors = theme.colors;
  
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
  }, []);

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

  const PrivacyItem = ({ icon, title, value, onPress, rightElement }: any) => (
    <TouchableOpacity style={[styles.privacyItem, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.privacyItemLeft}>
        <View style={styles.privacyIcon}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
        <Text style={[styles.privacyTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {rightElement ? rightElement : <Text style={[styles.privacyValue, { color: colors.textSecondary }]}>{value}<Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={styles.chevron} /></Text>}
    </TouchableOpacity>
  );

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.cardBg }]}>{children}</View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.cardBg} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Privacy</Text>
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
                trackColor={{ false: colors.textTertiary, true: colors.success }}
                thumbColor="#fff"
              />
            }
          />
          <View style={[styles.infoTextContainer, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
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
                trackColor={{ false: colors.textTertiary, true: colors.success }}
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
                trackColor={{ false: colors.textTertiary, true: colors.success }}
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
                trackColor={{ false: colors.textTertiary, true: colors.success }}
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
                trackColor={{ false: colors.textTertiary, true: colors.success }}
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
                trackColor={{ false: colors.textTertiary, true: colors.success }}
                thumbColor="#fff"
              />
            }
          />
        </Section>

        {/* Info text at bottom */}
        <View style={styles.bottomInfo}>
          <Text style={[styles.bottomInfoText, { color: colors.textTertiary }]}>
            Your privacy and security are important to us. These settings control who can see your information and how you interact with others.
          </Text>
        </View>
      </ScrollView>

      {/* Picker Modal */}
      {showPickerModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.modalBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>Choose who can see</Text>
              <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalOptions}>
              {privacyOptions.map(option => (
                <TouchableOpacity 
                  key={option} 
                  style={[styles.modalOption, { borderBottomColor: colors.border }]}
                  onPress={() => handlePickerSelect(option)}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }, pickerValue === option && [styles.modalOptionTextSelected, { color: colors.primary }]]}>
                    {option}
                  </Text>
                  {pickerValue === option && <Ionicons name="checkmark" size={20} color={colors.success} />}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionContent: {
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
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
  },
  privacyValue: {
    fontSize: 14,
    marginRight: 8,
  },
  chevron: {
    marginLeft: 4,
  },
  infoTextContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 16,
  },
  bottomInfo: {
    padding: 20,
    alignItems: 'center',
  },
  bottomInfoText: {
    fontSize: 12,
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalOptionTextSelected: {
    fontWeight: '500',
  },
});