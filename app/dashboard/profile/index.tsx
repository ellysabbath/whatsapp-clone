import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, StatusBar, KeyboardAvoidingView, Platform, ScrollView, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../../../context/UserContext';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme definitions
const THEMES = {
  light: {
    id: 'light',
    colors: {
      primary: '#075E54',
      primaryLight: '#e8f5e9',
      background: '#FFFFFF',
      surface: '#F8F9FA',
      cardBg: '#F8F9FA',
      text: '#000000',
      textSecondary: '#666666',
      border: '#E0E0E0',
      danger: '#FF3B30',
      dangerLight: '#FFF3F0',
      success: '#25D366',
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
    }
  },
  whatsappGreen: {
    id: 'whatsappGreen',
    colors: {
      primary: '#25D366',
      primaryLight: '#e8f5e9',
      background: '#FFFFFF',
      surface: '#F0F2F5',
      cardBg: '#F0F2F5',
      text: '#111B21',
      textSecondary: '#54656F',
      border: '#E9EDEF',
      danger: '#FF3B30',
      dangerLight: '#FFF3F0',
      success: '#25D366',
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
    }
  },
};

interface LocalProfile {
  full_name: string;
  profile_picture: string | null;
  bio: string;
  email: string;
  phone: string;
  location: string;
}

export default function ProfileSetupScreen() {
  const { 
    user, 
    profileData, 
    updateProfile, 
    updateProfilePicture, 
    deleteProfileField,
    refreshUserData, 
    isLoading: contextLoading, 
    logout 
  } = useUser();
  
  const [profile, setProfile] = useState<LocalProfile>({
    full_name: '',
    profile_picture: null,
    bio: '',
    email: '',
    phone: '',
    location: '',
  });
  
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAccountDeleteConfirm, setShowAccountDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentTheme, setCurrentTheme] = useState('light');
  
  const router = useRouter();

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
  }, []);

  // Load profile from context
  useEffect(() => {
    loadProfileData();
  }, [user, profileData]);

  const loadProfileData = async () => {
    try {
      if (user) {
        setProfile(prev => ({
          ...prev,
          full_name: user.full_name || '',
          email: user.email || '',
          phone: user.mobile_number || '',
        }));
      }
      
      if (profileData) {
        setProfile(prev => ({
          ...prev,
          profile_picture: profileData.profile_picture || null,
          bio: profileData.bio || '',
          location: profileData.location || '',
        }));
      }
      
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshUserData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUserData();
    setRefreshing(false);
  };

  const saveProfile = async (showAlert: boolean = true) => {
    setIsLoading(true);
    try {
      const success = await updateProfile({
        bio: profile.bio,
        location: profile.location,
      });
      
      if (success && showAlert) {
        Alert.alert('Success', 'Profile saved successfully!');
      } else if (!success && showAlert) {
        Alert.alert('Error', 'Failed to save profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return uri;
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setIsLoading(true);
      try {
        const base64Image = await convertImageToBase64(result.assets[0].uri);
        const success = await updateProfilePicture(base64Image);
        
        if (success) {
          setProfile({ ...profile, profile_picture: result.assets[0].uri });
          Alert.alert('Success', 'Profile picture updated!');
        } else {
          Alert.alert('Error', 'Failed to update profile picture');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to update profile picture');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditField = (field: string, currentValue: string) => {
    setEditField(field);
    setEditValue(currentValue);
  };

  const saveEditField = async () => {
    if (editField) {
      const updatedProfile = { ...profile, [editField]: editValue };
      setProfile(updatedProfile);
      
      if (editField === 'bio' || editField === 'location') {
        const success = await updateProfile({ [editField]: editValue });
        if (!success) {
          Alert.alert('Error', 'Failed to update field');
          return;
        }
      } else if (editField === 'full_name') {
        console.log('Would update full_name:', editValue);
      }
      
      setEditField(null);
      setEditValue('');
      Alert.alert('Success', `${editField.replace('_', ' ')} updated successfully!`);
    }
  };

  const deleteField = (field: string) => {
    setFieldToDelete(field);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteField = async () => {
    if (fieldToDelete) {
      const updatedProfile = { ...profile, [fieldToDelete]: '' };
      setProfile(updatedProfile);
      
      if (fieldToDelete === 'bio' || fieldToDelete === 'location') {
        const success = await deleteProfileField(fieldToDelete);
        if (!success) {
          Alert.alert('Error', 'Failed to delete field');
          return;
        }
      }
      
      setShowDeleteConfirm(false);
      setFieldToDelete(null);
      Alert.alert('Success', `${fieldToDelete.replace('_', ' ')} has been removed`);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      Alert.alert('Logged Out', 'You have been successfully logged out', [
        { text: 'OK', onPress: () => router.replace('/login') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setIsLoading(false);
      setShowLogoutConfirm(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowAccountDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    setIsLoading(true);
    try {
      Alert.alert('Account Deleted', 'Your account has been permanently deleted', [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account');
    } finally {
      setIsLoading(false);
      setShowAccountDeleteConfirm(false);
    }
  };

  const handleContinue = async () => {
    if (!profile.full_name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    await saveProfile(false);
    router.replace('/dashboard');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renderField = (label: string, value: string, icon: string, fieldKey: string, placeholder: string, editable: boolean = true) => (
    <View style={[styles.fieldCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={styles.fieldHeader}>
        <View style={[styles.fieldIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name={icon as any} size={20} color={colors.primary} />
        </View>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <View style={styles.fieldContent}>
        {editable && editField === fieldKey ? (
          <TextInput
            style={[styles.fieldInput, { color: colors.text, borderBottomColor: colors.primary }]}
            value={editValue}
            onChangeText={setEditValue}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            autoFocus
            onBlur={saveEditField}
            onSubmitEditing={saveEditField}
          />
        ) : (
          <Text style={[styles.fieldValue, { color: colors.text }, !value && { color: colors.textSecondary, fontStyle: 'italic' }]}>
            {value || `No ${label.toLowerCase()} added`}
          </Text>
        )}
        {editable && editField !== fieldKey && (
          <View style={styles.fieldActions}>
            <TouchableOpacity onPress={() => handleEditField(fieldKey, value)} style={styles.fieldAction}>
              <Ionicons name="create-outline" size={18} color={colors.success} />
            </TouchableOpacity>
            {value && (
              <TouchableOpacity onPress={() => deleteField(fieldKey)} style={styles.fieldAction}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );

  if (isInitialLoad && contextLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.success} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.success]} tintColor={colors.success} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <TouchableOpacity onPress={() => saveProfile(true)} style={styles.saveButton} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name="checkmark" size={24} color={colors.text} />
            )}
          </TouchableOpacity>
        </View>

        {/* Profile Picture */}
        <View style={[styles.avatarSection, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {profile.profile_picture ? (
              <Image source={{ uri: profile.profile_picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Ionicons name="person" size={50} color="#fff" />
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>Tap to change profile photo</Text>
        </View>

        {/* Basic Info Fields */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
          {renderField('Name', profile.full_name, 'person-outline', 'full_name', 'Enter your name', true)}
          {renderField('Bio', profile.bio, 'chatbubble-outline', 'bio', 'Tell something about yourself', true)}
          {renderField('Email', profile.email, 'mail-outline', 'email', 'your@email.com', false)}
          {renderField('Phone', profile.phone, 'call-outline', 'phone', '+1234567890', false)}
          {renderField('Location', profile.location, 'location-outline', 'location', 'City, Country', true)}
        </View>

        {/* Account Info - From Backend */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Information</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>Member since: {formatDate(user?.date_joined)}</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>Status: {user?.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={colors.danger} />
            <Text style={[styles.logoutButtonText, { color: colors.danger }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={[styles.dangerTitle, { color: colors.danger }]}>Danger Zone</Text>
          <TouchableOpacity 
            style={[styles.dangerButton, { backgroundColor: colors.dangerLight }]} 
            onPress={() => setShowDangerZone(!showDangerZone)}
          >
            <Ionicons name={showDangerZone ? "chevron-up" : "chevron-down"} size={16} color={colors.danger} />
            <Text style={[styles.dangerButtonText, { color: colors.danger }]}>
              {showDangerZone ? 'Hide Danger Zone' : 'Show Danger Zone'}
            </Text>
          </TouchableOpacity>

          {showDangerZone && (
            <View style={[styles.dangerContent, { backgroundColor: colors.dangerLight }]}>
              <TouchableOpacity style={[styles.deleteFieldButton, { backgroundColor: colors.danger }]} onPress={handleDeleteAccount}>
                <Ionicons name="warning-outline" size={20} color="#fff" />
                <Text style={styles.deleteFieldButtonText}>Delete Account</Text>
              </TouchableOpacity>
              <Text style={[styles.dangerWarning, { color: colors.danger }]}>
                Warning: This action cannot be undone. All your data will be permanently deleted.
              </Text>
            </View>
          )}
        </View>

        {/* Continue Button */}
        <TouchableOpacity style={[styles.nextButton, { backgroundColor: colors.primary }]} onPress={handleContinue}>
          <Text style={styles.nextButtonText}>Continue to Dashboard</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <Modal
        visible={editField !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditField(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit {editField?.replace('_', ' ')}</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }, editField === 'bio' && styles.modalTextArea]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editField?.replace('_', ' ')}`}
              placeholderTextColor={colors.textSecondary}
              multiline={editField === 'bio'}
              numberOfLines={editField === 'bio' ? 4 : 1}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.border }]} onPress={() => setEditField(null)}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, { backgroundColor: colors.success }]} onPress={saveEditField}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.background }]}>
            <Ionicons name="alert-circle" size={50} color={colors.danger} />
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Delete {fieldToDelete?.replace('_', ' ')}?</Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              Are you sure you want to delete your {fieldToDelete?.replace('_', ' ')}? This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={[styles.confirmCancel, { borderColor: colors.border }]} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={[styles.confirmCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmDelete, { backgroundColor: colors.danger }]} onPress={confirmDeleteField}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLogoutConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.background }]}>
            <Ionicons name="log-out-outline" size={50} color={colors.danger} />
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Logout?</Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              Are you sure you want to logout? You will need to login again to access your account.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={[styles.confirmCancel, { borderColor: colors.border }]} onPress={() => setShowLogoutConfirm(false)}>
                <Text style={[styles.confirmCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmLogout, { backgroundColor: colors.danger }]} onPress={confirmLogout}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAccountDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAccountDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.background }]}>
            <Ionicons name="warning" size={50} color={colors.danger} />
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Delete Account?</Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              This action is permanent and cannot be undone. All your data will be deleted forever.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={[styles.confirmCancel, { borderColor: colors.border }]} onPress={() => setShowAccountDeleteConfirm(false)}>
                <Text style={[styles.confirmCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmDeleteAccount, { backgroundColor: colors.danger }]} onPress={confirmDeleteAccount}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isLoading && !isInitialLoad && (
        <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingOverlayText, { color: '#fff' }]}>Saving...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 66,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  saveButton: { padding: 4 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarHint: { fontSize: 12, marginTop: 8 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  fieldCard: { borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 0.5 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  fieldIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase' },
  fieldContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldValue: { flex: 1, fontSize: 15, fontWeight: '500' },
  fieldInput: { flex: 1, fontSize: 15, paddingVertical: 4, borderBottomWidth: 1 },
  fieldActions: { flexDirection: 'row', gap: 12 },
  fieldAction: { padding: 4 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 0.5 },
  infoText: { fontSize: 14 },
  logoutSection: { paddingHorizontal: 16, marginTop: 20 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1 },
  logoutButtonText: { fontSize: 16, fontWeight: '600' },
  dangerZone: { marginTop: 20, paddingHorizontal: 16, marginBottom: 20 },
  dangerTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  dangerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10 },
  dangerButtonText: { fontSize: 14, fontWeight: '600' },
  dangerContent: { marginTop: 12, borderRadius: 10, padding: 16 },
  deleteFieldButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 12 },
  deleteFieldButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  dangerWarning: { fontSize: 12, textAlign: 'center' },
  nextButton: { marginHorizontal: 16, paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 16, padding: 20, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textTransform: 'capitalize' },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, minHeight: 40 },
  modalTextArea: { minHeight: 100, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 14 },
  modalSave: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalSaveText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  confirmModal: { borderRadius: 20, padding: 24, width: '85%', alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8, textTransform: 'capitalize' },
  confirmMessage: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  confirmButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '500' },
  confirmDelete: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmLogout: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmDeleteAccount: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmDeleteText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  loadingOverlayText: { marginTop: 12, fontSize: 14 },
});