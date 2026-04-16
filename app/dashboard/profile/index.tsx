import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, StatusBar, KeyboardAvoidingView, Platform, ScrollView, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  name: string;
  avatar: string | null;
  bio: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
}

export default function ProfileSetupScreen() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    avatar: null,
    bio: '',
    email: '',
    phone: '',
    location: '',
    joinDate: new Date().toISOString(),
  });
  
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAccountDeleteConfirm, setShowAccountDeleteConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const router = useRouter();

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Reload profile when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('user_profile');
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsInitialLoad(false);
    }
  };

  const saveProfile = async (showAlert: boolean = true) => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      if (showAlert) {
        Alert.alert('Success', 'Profile saved successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setIsLoading(false);
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
      const updatedProfile = { ...profile, avatar: result.assets[0].uri };
      setProfile(updatedProfile);
      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      Alert.alert('Success', 'Profile photo updated!');
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
      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      setEditField(null);
      setEditValue('');
      Alert.alert('Success', `${editField} updated successfully!`);
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
      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      setShowDeleteConfirm(false);
      setFieldToDelete(null);
      Alert.alert('Success', `${fieldToDelete} has been removed`);
    }
  };

  const deleteAccount = () => {
    setShowAccountDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem('user_profile');
      await AsyncStorage.removeItem('evangelistic_forms');
      Alert.alert('Account Deleted', 'Your account and all data have been permanently deleted', [
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
    if (!profile.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    await saveProfile(false);
    router.replace('/dashboard');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renderField = (label: string, value: string, icon: string, fieldKey: string, placeholder: string, editable: boolean = true) => (
    <View style={styles.fieldCard}>
      <View style={styles.fieldHeader}>
        <View style={styles.fieldIcon}>
          <Ionicons name={icon as any} size={20} color="#075E54" />
        </View>
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View style={styles.fieldContent}>
        {editable && editField === fieldKey ? (
          <TextInput
            style={styles.fieldInput}
            value={editValue}
            onChangeText={setEditValue}
            placeholder={placeholder}
            autoFocus
            onBlur={saveEditField}
            onSubmitEditing={saveEditField}
          />
        ) : (
          <Text style={[styles.fieldValue, !value && styles.emptyValue]}>
            {value || `No ${label.toLowerCase()} added`}
          </Text>
        )}
        {editable && editField !== fieldKey && (
          <View style={styles.fieldActions}>
            <TouchableOpacity onPress={() => handleEditField(fieldKey, value)} style={styles.fieldAction}>
              <Ionicons name="create-outline" size={18} color="#25D366" />
            </TouchableOpacity>
            {value && (
              <TouchableOpacity onPress={() => deleteField(fieldKey)} style={styles.fieldAction}>
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );

  if (isInitialLoad) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#25D366"]} tintColor="#25D366" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => saveProfile(true)} style={styles.saveButton} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#25D366" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#25D366" />
            )}
          </TouchableOpacity>
        </View>

        {/* Profile Picture */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={50} color="#fff" />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change profile photo</Text>
        </View>

        {/* Basic Info Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          {renderField('Name', profile.name, 'person-outline', 'name', 'Enter your name', true)}
          {renderField('Bio', profile.bio, 'chatbubble-outline', 'bio', 'Tell something about yourself', true)}
          {renderField('Email', profile.email, 'mail-outline', 'email', 'your@email.com', true)}
          {renderField('Phone', profile.phone, 'call-outline', 'phone', '+1234567890', true)}
          {renderField('Location', profile.location, 'location-outline', 'location', 'City, Country', true)}
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoCard}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoText}>Member since: {formatDate(profile.joinDate)}</Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <TouchableOpacity 
            style={styles.dangerButton} 
            onPress={() => setShowDangerZone(!showDangerZone)}
          >
            <Ionicons name={showDangerZone ? "chevron-up" : "chevron-down"} size={16} color="#FF3B30" />
            <Text style={styles.dangerButtonText}>
              {showDangerZone ? 'Hide Danger Zone' : 'Show Danger Zone'}
            </Text>
          </TouchableOpacity>

          {showDangerZone && (
            <View style={styles.dangerContent}>
              <TouchableOpacity style={styles.deleteFieldButton} onPress={deleteAccount}>
                <Ionicons name="warning-outline" size={20} color="#fff" />
                <Text style={styles.deleteFieldButtonText}>Delete Entire Account</Text>
              </TouchableOpacity>
              <Text style={styles.dangerWarning}>
                Warning: This action cannot be undone. All your data will be permanently deleted.
              </Text>
            </View>
          )}
        </View>

        {/* Continue Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleContinue}>
          <Text style={styles.nextButtonText}>Continue to Dashboard</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Field Modal */}
      <Modal
        visible={editField !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditField(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit {editField}</Text>
            <TextInput
              style={[styles.modalInput, editField === 'bio' && styles.modalTextArea]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editField}`}
              multiline={editField === 'bio'}
              numberOfLines={editField === 'bio' ? 4 : 1}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditField(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveEditField}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Field Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Ionicons name="alert-circle" size={50} color="#FF3B30" />
            <Text style={styles.confirmTitle}>Delete {fieldToDelete}?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete your {fieldToDelete}? This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDelete} onPress={confirmDeleteField}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showAccountDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAccountDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Ionicons name="warning" size={50} color="#FF3B30" />
            <Text style={styles.confirmTitle}>Delete Account?</Text>
            <Text style={styles.confirmMessage}>
              This action is permanent and cannot be undone. All your data, including forms and responses, will be deleted forever.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowAccountDeleteConfirm(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteAccount} onPress={confirmDeleteAccount}>
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

      {/* Loading Overlay */}
      {isLoading && !isInitialLoad && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.loadingOverlayText}>Saving...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    padding: 4,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#075E54',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#075E54',
    marginBottom: 12,
  },
  fieldCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textTransform: 'uppercase',
  },
  fieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldValue: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#25D366',
  },
  emptyValue: {
    color: '#999',
    fontStyle: 'italic',
  },
  fieldActions: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldAction: {
    padding: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  dangerZone: {
    marginTop: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF3F0',
    padding: 12,
    borderRadius: 10,
  },
  dangerButtonText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  dangerContent: {
    marginTop: 12,
    backgroundColor: '#FFF3F0',
    borderRadius: 10,
    padding: 16,
  },
  deleteFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  deleteFieldButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dangerWarning: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#25D366',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 40,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    color: '#666',
  },
  modalSave: {
    flex: 1,
    backgroundColor: '#25D366',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  confirmMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  confirmDelete: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmDeleteAccount: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayText: {
    marginTop: 12,
    fontSize: 14,
    color: '#fff',
  },
});