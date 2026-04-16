// app/(tabs)/settings.tsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Platform, StatusBar, Alert, Image, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [mediaAutoDownload, setMediaAutoDownload] = useState('Wi-Fi');
  const [privacyLastSeen, setPrivacyLastSeen] = useState('Everyone');
  const [privacyProfilePhoto, setPrivacyProfilePhoto] = useState('Everyone');
  const [privacyStatus, setPrivacyStatus] = useState('Everyone');
  const [privacyReadReceipts, setPrivacyReadReceipts] = useState(true);
  const [twoStepVerification, setTwoStepVerification] = useState(false);
  const [wallpaper, setWallpaper] = useState('Default');
  const [fontSize, setFontSize] = useState('Medium');
  const [chatBackup, setChatBackup] = useState('Last backup: Yesterday');
  const [storageUsage, setStorageUsage] = useState('2.5 GB used');
  const [language, setLanguage] = useState('English');
  const [dataSaver, setDataSaver] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [tempValue, setTempValue] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedDarkMode = await AsyncStorage.getItem('dark_mode');
      if (savedDarkMode !== null) setDarkMode(savedDarkMode === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const toggleDarkMode = async (value: boolean) => {
    setDarkMode(value);
    await AsyncStorage.setItem('dark_mode', value.toString());
  };

  const showPickerModal = (type: string, currentValue: string, options: string[]) => {
    setModalType(type);
    setTempValue(currentValue);
    setModalVisible(true);
  };

  const handleThemePress = () => {
    router.push('/theme-settings');
  };

  const handleProfilePress = () => {
    router.push('/profile');
  };

  const handleAccountPress = () => {
    Alert.alert('Account', 'Account settings coming soon');
  };

  const handleDevicesPress = () => {
    Alert.alert('Linked Devices', 'Manage linked devices');
  };

  const handleStarredPress = () => {
    router.push('/starred-messages');
  };

  const handleChatBackupPress = () => {
    Alert.alert('Chat Backup', 'Backup settings coming soon');
  };

  const handleStoragePress = () => {
    Alert.alert('Storage', 'Storage management coming soon');
  };

  const handleHelpPress = () => {
    Alert.alert('Help', 'Help center coming soon');
  };

  const handleInvitePress = () => {
    Alert.alert('Invite a Friend', 'Share ApTec with friends');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => router.replace('/login')
        }
      ]
    );
  };

  const handleGoBack = () => {
    router.push('/dashboard');
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightElement, danger, badge }: any) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingItemLeft}>
        <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
          <Ionicons name={icon} size={22} color={danger ? '#FF3B30' : '#075E54'} />
        </View>
        <View style={styles.settingItemContent}>
          <View style={styles.settingTitleRow}>
            <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>{title}</Text>
            {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
          </View>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement ? rightElement : <Ionicons name="chevron-forward" size={20} color="#999" />}
    </TouchableOpacity>
  );

  const SettingSection = ({ title, children }: any) => (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <View style={[styles.container, darkMode && styles.containerDark]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={darkMode ? '#111B21' : '#075E54'} />
      
      {/* Header with Back Button */}
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#075E54" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={() => router.push('/dashboard/profile')} style={styles.searchButton}>
          <Ionicons name="search" size={22} color="#075E54" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Profile Section */}
<View style={[styles.profileSection, darkMode && styles.profileSectionDark]}>
  <Image 
    source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }} 
    style={styles.profileAvatar}
  />
  <View style={styles.profileInfo}>
    <Text style={[styles.profileName, darkMode && styles.textDark]}>John Doe</Text>
    <Text style={[styles.profileStatus, darkMode && styles.textSecondaryDark]}>Hey there! I'm using ApTec</Text>
  </View>
  <Ionicons name="chevron-forward" size={20} color="#999" />
</View>

        {/* Privacy Section */}
        <SettingSection title="Privacy">
          <SettingItem 
            icon="lock-closed-outline" 
            title="Privacy" 
            subtitle="Last seen, profile photo, about, read receipts"
            onPress={() => router.push('/dashboard/privacy')}
          />
          <SettingItem 
            icon="shield-checkmark-outline" 
            title="Two-step verification" 
            subtitle={twoStepVerification ? "Enabled" : "Disabled"}
            onPress={() => setTwoStepVerification(!twoStepVerification)}
            rightElement={
              <Switch
                value={twoStepVerification}
                onValueChange={setTwoStepVerification}
                trackColor={{ false: '#767577', true: '#25D366' }}
                thumbColor="#fff"
              />
            }
          />
          <SettingItem 
            icon="cellular-outline" 
            title="Network usage" 
            subtitle="Data saver, roaming"
            onPress={() => Alert.alert('Network', 'Network settings coming soon')}
          />
        </SettingSection>

        {/* Chats Section */}
        <SettingSection title="Chats">
          <SettingItem 
            icon="chatbubbles-outline" 
            title="Chat settings" 
            subtitle="Wallpaper, chat history, font size"
            onPress={() => router.push('/dashboard')}
          />
          <SettingItem 
            icon="brush-outline" 
            title="Theme" 
            subtitle="Change app appearance"
            onPress={handleThemePress}
          />
          <SettingItem 
            icon="star-outline" 
            title="Starred messages" 
            subtitle="View all starred messages"
            onPress={handleStarredPress}
          />
          <SettingItem 
            icon="download-outline" 
            title="Media auto-download" 
            subtitle={mediaAutoDownload}
            onPress={() => showPickerModal('mediaDownload', mediaAutoDownload, ['Wi-Fi', 'Wi-Fi & Mobile Data', 'Never'])}
          />
          <SettingItem 
            icon="text-outline" 
            title="Font size" 
            subtitle={fontSize}
            onPress={() => showPickerModal('fontSize', fontSize, ['Small', 'Medium', 'Large', 'Extra Large'])}
          />
          <SettingItem 
            icon="image-outline" 
            title="Wallpaper" 
            subtitle={wallpaper}
            onPress={() => router.push('/dashboard/theme')}
          />
        </SettingSection>

        {/* Notifications Section */}
        <SettingSection title="Notifications">
          <SettingItem 
            icon="notifications-outline" 
            title="Notification settings" 
            subtitle="Message, group, call alerts"
            onPress={() => router.push('/dashboard/profile')}
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#767577', true: '#25D366' }}
                thumbColor="#fff"
              />
            }
          />
        </SettingSection>

        {/* Storage & Data Section */}
        <SettingSection title="Storage & Data">
          <SettingItem 
            icon="cloud-outline" 
            title="Chat backup" 
            subtitle={chatBackup}
            onPress={handleChatBackupPress}
          />
          <SettingItem 
            icon="hardware-chip-outline" 
            title="Manage storage" 
            subtitle={storageUsage}
            onPress={handleStoragePress}
          />
        </SettingSection>

        {/* Apps & Devices Section */}
        <SettingSection title="Apps & Devices">
          <SettingItem 
            icon="desktop-outline" 
            title="Linked devices" 
            subtitle="Manage linked devices"
            onPress={handleDevicesPress}
            badge="1"
          />
          <SettingItem 
            icon="language-outline" 
            title="Language" 
            subtitle={language}
            onPress={() => showPickerModal('language', language, ['English', 'Spanish', 'French', 'German', 'Arabic', 'Swahili'])}
          />
        </SettingSection>

        {/* Help & Support Section */}
        <SettingSection title="Help & Support">
          <SettingItem 
            icon="help-circle-outline" 
            title="Help center" 
            subtitle="FAQ, troubleshooting"
            onPress={handleHelpPress}
          />
          <SettingItem 
            icon="information-circle-outline" 
            title="About" 
            subtitle="Version 1.0.0"
            onPress={() => Alert.alert('About', 'ApTec Messenger v1.0.0\n\nA modern messaging app')}
          />
          <SettingItem 
            icon="people-outline" 
            title="Invite a friend" 
            subtitle="Share ApTec with friends"
            onPress={handleInvitePress}
          />
        </SettingSection>

        {/* Legal Section */}
        <SettingSection title="Legal">
          <SettingItem 
            icon="document-text-outline" 
            title="Terms & Conditions" 
            onPress={() => Alert.alert('Terms', 'Terms & Conditions')}
          />
          <SettingItem 
            icon="shield-outline" 
            title="Privacy Policy" 
            onPress={() => Alert.alert('Privacy', 'Privacy Policy')}
          />
          <SettingItem 
            icon="eye" 
            title="Open source licenses" 
            onPress={() => Alert.alert('Open Source', 'Open source licenses')}
          />
        </SettingSection>

        {/* Danger Zone */}
        <SettingSection>
          <SettingItem 
            icon="log-out-outline" 
            title="Logout" 
            danger
            onPress={handleLogout}
          />
        </SettingSection>

        {/* Version Info */}
        <View style={[styles.versionInfo, darkMode && styles.versionInfoDark]}>
          <Text style={[styles.versionText, darkMode && styles.textSecondaryDark]}>ApTec Messenger</Text>
          <Text style={[styles.versionText, darkMode && styles.textSecondaryDark]}>Version 1.0.0</Text>
          <Text style={[styles.versionTextSmall, darkMode && styles.textSecondaryDark]}>© 2024 ApTec. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, darkMode && styles.modalContainerDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, darkMode && styles.textDark]}>Select Option</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={darkMode ? "#fff" : "#075E54"} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalOptions}>
              {modalType === 'mediaDownload' && (
                <>
                  <TouchableOpacity style={styles.modalOption} onPress={() => { setMediaAutoDownload('Wi-Fi'); setModalVisible(false); }}>
                    <Text style={[styles.modalOptionText, darkMode && styles.textDark]}>Wi-Fi</Text>
                    {mediaAutoDownload === 'Wi-Fi' && <Ionicons name="checkmark" size={20} color="#25D366" />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalOption} onPress={() => { setMediaAutoDownload('Wi-Fi & Mobile Data'); setModalVisible(false); }}>
                    <Text style={[styles.modalOptionText, darkMode && styles.textDark]}>Wi-Fi & Mobile Data</Text>
                    {mediaAutoDownload === 'Wi-Fi & Mobile Data' && <Ionicons name="checkmark" size={20} color="#25D366" />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalOption} onPress={() => { setMediaAutoDownload('Never'); setModalVisible(false); }}>
                    <Text style={[styles.modalOptionText, darkMode && styles.textDark]}>Never</Text>
                    {mediaAutoDownload === 'Never' && <Ionicons name="checkmark" size={20} color="#25D366" />}
                  </TouchableOpacity>
                </>
              )}
              {modalType === 'fontSize' && (
                <>
                  {['Small', 'Medium', 'Large', 'Extra Large'].map(size => (
                    <TouchableOpacity key={size} style={styles.modalOption} onPress={() => { setFontSize(size); setModalVisible(false); }}>
                      <Text style={[styles.modalOptionText, darkMode && styles.textDark]}>{size}</Text>
                      {fontSize === size && <Ionicons name="checkmark" size={20} color="#25D366" />}
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {modalType === 'language' && (
                <>
                  {['English', 'Spanish', 'French', 'German', 'Arabic', 'Swahili'].map(lang => (
                    <TouchableOpacity key={lang} style={styles.modalOption} onPress={() => { setLanguage(lang); setModalVisible(false); }}>
                      <Text style={[styles.modalOptionText, darkMode && styles.textDark]}>{lang}</Text>
                      {language === lang && <Ionicons name="checkmark" size={20} color="#25D366" />}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  containerDark: {
    backgroundColor: '#111B21',
  },
  header: {
    backgroundColor: 'rgb(233, 240, 233)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
  },
  headerDark: {
    backgroundColor: '#202C33',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#075E54',
  },
  searchButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  profileSectionDark: {
    backgroundColor: '#202C33',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: 13,
    color: '#666',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginLeft: 16,
    marginTop: 16,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIconDanger: {
    backgroundColor: '#FFE5E5',
  },
  settingItemContent: {
    flex: 1,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingTitle: {
    fontSize: 16,
    color: '#000',
  },
  settingTitleDanger: {
    color: '#FF3B30',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  textDark: {
    color: '#E9EDEF',
  },
  textSecondaryDark: {
    color: '#AEBAC1',
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 32,
  },
  versionInfoDark: {
    backgroundColor: '#111B21',
  },
  versionText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  versionTextSmall: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalContainerDark: {
    backgroundColor: '#202C33',
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
});