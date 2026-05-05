// app/(tabs)/settings.tsx
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Platform, StatusBar, Alert, Image, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../../../context/UserContext';

// Theme definitions
const THEMES = {
  light: {
    id: 'light',
    colors: {
      primary: '#075E54',
      primaryLight: '#e8f5e9',
      background: '#F0F2F5',
      surface: '#FFFFFF',
      cardBg: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      border: '#E0E0E0',
      danger: '#FF3B30',
      dangerLight: '#FFF3F0',
      success: '#25D366',
      headerBg: '#FFFFFF',
    }
  },
  dark: {
    id: 'dark',
    colors: {
      primary: '#128C7E',
      primaryLight: '#1a2f2a',
      background: '#111B21',
      surface: '#202C33',
      cardBg: '#202C33',
      text: '#E9EDEF',
      textSecondary: '#AEBAC1',
      border: '#2A3942',
      danger: '#FF5C5C',
      dangerLight: '#3a1a1a',
      success: '#25D366',
      headerBg: '#202C33',
    }
  },
  whatsappGreen: {
    id: 'whatsappGreen',
    colors: {
      primary: '#25D366',
      primaryLight: '#e8f5e9',
      background: '#F0F2F5',
      surface: '#FFFFFF',
      cardBg: '#FFFFFF',
      text: '#111B21',
      textSecondary: '#54656F',
      border: '#E9EDEF',
      danger: '#FF3B30',
      dangerLight: '#FFF3F0',
      success: '#25D366',
      headerBg: '#FFFFFF',
    }
  },
  midnightBlue: {
    id: 'midnightBlue',
    colors: {
      primary: '#1E88E5',
      primaryLight: '#102a44',
      background: '#0A1929',
      surface: '#132F4C',
      cardBg: '#132F4C',
      text: '#FFFFFF',
      textSecondary: '#B0C4DE',
      border: '#1E3A5F',
      danger: '#FF6B6B',
      dangerLight: '#2a1a1a',
      success: '#1E88E5',
      headerBg: '#132F4C',
    }
  },
  sunsetOrange: {
    id: 'sunsetOrange',
    colors: {
      primary: '#FF5722',
      primaryLight: '#FFE0B2',
      background: '#FFF3E0',
      surface: '#FFE0B2',
      cardBg: '#FFE0B2',
      text: '#4E342E',
      textSecondary: '#8D6E63',
      border: '#FFCC80',
      danger: '#D84315',
      dangerLight: '#FBE9E7',
      success: '#FF5722',
      headerBg: '#FFE0B2',
    }
  },
  purpleHaze: {
    id: 'purpleHaze',
    colors: {
      primary: '#9C27B0',
      primaryLight: '#E1BEE7',
      background: '#F3E5F5',
      surface: '#E1BEE7',
      cardBg: '#E1BEE7',
      text: '#4A148C',
      textSecondary: '#7B1FA2',
      border: '#CE93D8',
      danger: '#E91E63',
      dangerLight: '#FCE4EC',
      success: '#9C27B0',
      headerBg: '#E1BEE7',
    }
  },
  oceanTeal: {
    id: 'oceanTeal',
    colors: {
      primary: '#00897B',
      primaryLight: '#B2DFDB',
      background: '#E0F2F1',
      surface: '#B2DFDB',
      cardBg: '#B2DFDB',
      text: '#004D40',
      textSecondary: '#00695C',
      border: '#80CBC4',
      danger: '#D81B60',
      dangerLight: '#FCE4EC',
      success: '#00897B',
      headerBg: '#B2DFDB',
    }
  },
  cherryBlossom: {
    id: 'cherryBlossom',
    colors: {
      primary: '#E91E63',
      primaryLight: '#F8BBD0',
      background: '#FCE4EC',
      surface: '#F8BBD0',
      cardBg: '#F8BBD0',
      text: '#880E4F',
      textSecondary: '#AD1457',
      border: '#F48FB1',
      danger: '#C2185B',
      dangerLight: '#FCE4EC',
      success: '#E91E63',
      headerBg: '#F8BBD0',
    }
  },
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profileData, refreshUserData, isLoading, logout } = useUser();
  
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
  const [currentTheme, setCurrentTheme] = useState('light');
  const [refreshing, setRefreshing] = useState(false);

  // Get current theme colors
  const theme = THEMES[currentTheme as keyof typeof THEMES];
  const colors = theme.colors;

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
    loadSettings();
    refreshUserData();
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

  const showPickerModal = (type: string, currentValue: string) => {
    setModalType(type);
    setTempValue(currentValue);
    setModalVisible(true);
  };

  const handleThemePress = () => {
    router.push('/dashboard/theme');
  };

  const handleProfilePress = () => {
    router.push('/dashboard/profile');
  };

  const handleAccountPress = () => {
    Alert.alert('Account', 'Account settings coming soon');
  };

  const handleDevicesPress = () => {
    Alert.alert('Linked Devices', 'Manage linked devices');
  };

  const handleStarredPress = () => {
    router.push('/dashboard/starred');
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
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  const handleGoBack = () => {
    router.push('/dashboard');
  };

  const getValidImageUrl = (imageUrl: string | undefined | null): string => {
    if (!imageUrl) return 'https://randomuser.me/api/portraits/lego/1.jpg';
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('/')) return `https://aptecproject.pythonanywhere.com${imageUrl}`;
    return imageUrl;
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightElement, danger, badge }: any) => (
    <TouchableOpacity 
      style={[styles.settingItem, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.settingIcon, danger && { backgroundColor: colors.dangerLight }]}>
          <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.primary} />
        </View>
        <View style={styles.settingItemContent}>
          <View style={styles.settingTitleRow}>
            <Text style={[styles.settingTitle, { color: danger ? colors.danger : colors.text }, danger && { color: colors.danger }]}>{title}</Text>
            {badge && <View style={[styles.badge, { backgroundColor: colors.success }]}><Text style={styles.badgeText}>{badge}</Text></View>}
          </View>
          {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement ? rightElement : <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
    </TouchableOpacity>
  );

  const SettingSection = ({ title, children }: any) => (
    <View style={styles.section}>
      {title && <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>}
      <View style={[styles.sectionContent, { backgroundColor: colors.cardBg }]}>{children}</View>
    </View>
  );

  if (isLoading && !user) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.primary} />
      
      {/* Header with Back Button */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Settings</Text>
        <TouchableOpacity onPress={() => router.push('/dashboard/profile')} style={styles.searchButton}>
          <Ionicons name="search" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Profile Section - Now with real user data */}
        <TouchableOpacity 
          style={[styles.profileSection, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]} 
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          <Image 
            source={{ uri: getValidImageUrl(profileData?.profile_picture || user?.profile_picture) }} 
            style={styles.profileAvatar}
          />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user?.full_name || 'User'}</Text>
            <Text style={[styles.profileStatus, { color: colors.textSecondary }]}>{profileData?.bio || 'Hey there! I\'m using ApTec'}</Text>
            <Text style={[styles.profilePhone, { color: colors.textSecondary + '80' }]}>{user?.mobile_number || ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

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
                trackColor={{ false: colors.textSecondary, true: colors.success }}
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
            onPress={() => showPickerModal('mediaDownload', mediaAutoDownload)}
          />
          <SettingItem 
            icon="text-outline" 
            title="Font size" 
            subtitle={fontSize}
            onPress={() => showPickerModal('fontSize', fontSize)}
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
                trackColor={{ false: colors.textSecondary, true: colors.success }}
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
            onPress={() => showPickerModal('language', language)}
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
        <View style={[styles.versionInfo, { backgroundColor: colors.background }]}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>ApTec Messenger</Text>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0</Text>
          <Text style={[styles.versionTextSmall, { color: colors.textSecondary + '80' }]}>© 2024 ApTec. All rights reserved.</Text>
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
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Option</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalOptions}>
              {modalType === 'mediaDownload' && (
                <>
                  {['Wi-Fi', 'Wi-Fi & Mobile Data', 'Never'].map(option => (
                    <TouchableOpacity key={option} style={[styles.modalOption, { borderBottomColor: colors.border }]} onPress={() => { setMediaAutoDownload(option); setModalVisible(false); }}>
                      <Text style={[styles.modalOptionText, { color: colors.text }]}>{option}</Text>
                      {mediaAutoDownload === option && <Ionicons name="checkmark" size={20} color={colors.success} />}
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {modalType === 'fontSize' && (
                <>
                  {['Small', 'Medium', 'Large', 'Extra Large'].map(size => (
                    <TouchableOpacity key={size} style={[styles.modalOption, { borderBottomColor: colors.border }]} onPress={() => { setFontSize(size); setModalVisible(false); }}>
                      <Text style={[styles.modalOptionText, { color: colors.text }]}>{size}</Text>
                      {fontSize === size && <Ionicons name="checkmark" size={20} color={colors.success} />}
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {modalType === 'language' && (
                <>
                  {['English', 'Spanish', 'French', 'German', 'Arabic', 'Swahili'].map(lang => (
                    <TouchableOpacity key={lang} style={[styles.modalOption, { borderBottomColor: colors.border }]} onPress={() => { setLanguage(lang); setModalVisible(false); }}>
                      <Text style={[styles.modalOptionText, { color: colors.text }]}>{lang}</Text>
                      {language === lang && <Ionicons name="checkmark" size={20} color={colors.success} />}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 66,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 0.5,
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
    marginBottom: 2,
  },
  profileStatus: {
    fontSize: 13,
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 11,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionContent: {
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
    borderBottomWidth: 0.5,
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
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 32,
  },
  versionText: {
    fontSize: 13,
    marginBottom: 4,
  },
  versionTextSmall: {
    fontSize: 11,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
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
});