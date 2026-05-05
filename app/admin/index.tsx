// app/admin/dashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Switch,
  Animated,
  Platform,
  StatusBar,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import adminAPI, { User, Role, UserStats } from '../../lib/api/admin';

type TabType = 'dashboard' | 'users' | 'roles' | 'sessions';

// Theme definitions
const THEMES = {
  light: {
    id: 'light',
    name: 'Light',
    icon: 'sunny-outline',
    colors: {
      primary: '#000000',
      background: '#f5f5f5',
      surface: '#ffffff',
      text: '#000000',
      textSecondary: '#666666',
      border: '#e0e0e0',
      card: '#ffffff',
      success: '#4CAF50',
      error: '#f44336',
      warning: '#FF9800',
      info: '#2196F3',
    }
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    icon: 'moon-outline',
    colors: {
      primary: '#128C7E',
      background: '#111B21',
      surface: '#202C33',
      text: '#E9EDEF',
      textSecondary: '#AEBAC1',
      border: '#2A3942',
      card: '#202C33',
      success: '#4CAF50',
      error: '#f44336',
      warning: '#FF9800',
      info: '#2196F3',
    }
  },
  blue: {
    id: 'blue',
    name: 'Ocean Blue',
    icon: 'water-outline',
    colors: {
      primary: '#1E88E5',
      background: '#E3F2FD',
      surface: '#ffffff',
      text: '#0D47A1',
      textSecondary: '#1976D2',
      border: '#90CAF9',
      card: '#ffffff',
      success: '#4CAF50',
      error: '#f44336',
      warning: '#FF9800',
      info: '#2196F3',
    }
  },
  purple: {
    id: 'purple',
    name: 'Purple Haze',
    icon: 'color-palette-outline',
    colors: {
      primary: '#9C27B0',
      background: '#F3E5F5',
      surface: '#ffffff',
      text: '#4A148C',
      textSecondary: '#7B1FA2',
      border: '#CE93D8',
      card: '#ffffff',
      success: '#4CAF50',
      error: '#f44336',
      warning: '#FF9800',
      info: '#2196F3',
    }
  },
};

export default function AdminSuperDashboard() {
  const router = useRouter();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'user' | 'role'>('user');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  
  // Animations
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const theme = THEMES[currentTheme as keyof typeof THEMES];
  const colors = theme.colors;

  // Load theme and cached data
  useEffect(() => {
    loadTheme();
    loadCachedData();
    setupNetworkListener();
    
    return () => {
      AppState.removeEventListener('change', handleAppStateChange);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab, searchQuery]);

  // Setup network listener
  const setupNetworkListener = () => {
    AppState.addEventListener('change', handleAppStateChange);
  };

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'active') {
      checkOnlineStatus();
      syncData();
    }
  };

  const checkOnlineStatus = async () => {
    try {
      const response = await adminAPI.getUserStats();
      setIsOnline(response.status === 'success');
    } catch (error) {
      setIsOnline(false);
    }
  };

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('admin_theme');
      if (savedTheme && THEMES[savedTheme as keyof typeof THEMES]) {
        setCurrentTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const saveTheme = async (themeId: string) => {
    try {
      await AsyncStorage.setItem('admin_theme', themeId);
      setCurrentTheme(themeId);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const loadCachedData = async () => {
    try {
      const cachedStats = await AsyncStorage.getItem('admin_stats');
      const cachedUsers = await AsyncStorage.getItem('admin_users');
      const cachedRoles = await AsyncStorage.getItem('admin_roles');
      
      if (cachedStats) setStats(JSON.parse(cachedStats));
      if (cachedUsers) setUsers(JSON.parse(cachedUsers));
      if (cachedRoles) setRoles(JSON.parse(cachedRoles));
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const saveToCache = async (key: string, data: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const syncData = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please check your connection.');
      return;
    }
    
    setSyncing(true);
    try {
      const [statsRes, usersRes, rolesRes] = await Promise.all([
        adminAPI.getUserStats(),
        adminAPI.getUsers({ detailed: true }),
        adminAPI.getRoles({ detailed: true })
      ]);
      
      if (statsRes.status === 'success') {
        setStats(statsRes.data);
        saveToCache('admin_stats', statsRes.data);
      }
      if (usersRes.status === 'success') {
        setUsers(usersRes.data);
        saveToCache('admin_users', usersRes.data);
      }
      if (rolesRes.status === 'success') {
        setRoles(rolesRes.data);
        saveToCache('admin_roles', rolesRes.data);
      }
      
      Alert.alert('Success', 'Data synced successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to sync data');
    } finally {
      setSyncing(false);
    }
  };

  const loadData = async () => {
    if (!isOnline && activeTab !== 'dashboard') {
      return;
    }
    
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const statsRes = await adminAPI.getUserStats();
        if (statsRes.status === 'success') {
          setStats(statsRes.data);
          saveToCache('admin_stats', statsRes.data);
        }
      } else if (activeTab === 'users') {
        const usersRes = await adminAPI.getUsers({ search: searchQuery, detailed: true });
        if (usersRes.status === 'success') {
          setUsers(usersRes.data);
          saveToCache('admin_users', usersRes.data);
        }
      } else if (activeTab === 'roles') {
        const rolesRes = await adminAPI.getRoles({ detailed: true });
        if (rolesRes.status === 'success') {
          setRoles(rolesRes.data);
          saveToCache('admin_roles', rolesRes.data);
        }
      }
    } catch (error) {
      if (!isOnline) {
        Alert.alert('Offline', 'Showing cached data');
      } else {
        Alert.alert('Error', 'Failed to load data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    syncData();
  }, []);

  // User CRUD Operations
  const handleCreateUser = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot create user while offline');
      return;
    }
    
    try {
      const response = await adminAPI.createUser(formData);
      if (response.status === 'success') {
        Alert.alert('Success', 'User created successfully');
        setModalVisible(false);
        syncData();
        setFormData({});
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot update user while offline');
      return;
    }
    
    try {
      const response = await adminAPI.updateUser(selectedItem.id, formData);
      if (response.status === 'success') {
        Alert.alert('Success', 'User updated successfully');
        setModalVisible(false);
        syncData();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot delete user while offline');
      return;
    }
    
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await adminAPI.deleteUser(userId);
              if (response.status === 'success') {
                Alert.alert('Success', 'User deleted successfully');
                syncData();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  // Role CRUD Operations
  const handleCreateRole = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot assign role while offline');
      return;
    }
    
    try {
      const response = await adminAPI.createRole(formData);
      if (response.status === 'success') {
        Alert.alert('Success', 'Role assigned successfully');
        setModalVisible(false);
        syncData();
        setFormData({});
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to assign role');
    }
  };

  const handleUpdateRole = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot update role while offline');
      return;
    }
    
    try {
      const response = await adminAPI.updateRole(selectedItem.id, formData);
      if (response.status === 'success') {
        Alert.alert('Success', 'Role updated successfully');
        setModalVisible(false);
        syncData();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot delete role while offline');
      return;
    }
    
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this role?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await adminAPI.deleteRole(roleId);
              if (response.status === 'success') {
                Alert.alert('Success', 'Role deleted successfully');
                syncData();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete role');
            }
          },
        },
      ]
    );
  };

  // Menu handlers
  const handleMenuPress = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleMenuItem = (action: string) => {
    closeMenu();
    setTimeout(() => {
      switch(action) {
        case 'chats':
          router.push('/chats/manage');
          break;
        case 'forms':
          router.push('/forms/manage');
          break;
        case 'groups':
          router.push('/groups/manage');
          break;
        case 'library':
          router.push('/library/manage');
          break;
        default:
          break;
      }
    }, 300);
  };

  const changeTheme = (themeId: string) => {
    saveTheme(themeId);
    closeMenu();
  };

  useEffect(() => {
    if (menuVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -300, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [menuVisible]);

  // Render Dashboard Tab
  const renderDashboard = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Dashboard</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Complete System Management</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Total Users"
          value={stats?.users.total || 0}
          icon="people"
          color={colors.primary}
          onPress={() => setActiveTab('users')}
          colors={colors}
        />
        <StatCard
          title="Active Users"
          value={stats?.users.active || 0}
          icon="checkmark-circle"
          color={colors.success}
          onPress={() => setActiveTab('users')}
          colors={colors}
        />
        <StatCard
          title="Total Roles"
          value={stats?.roles.total || 0}
          icon="shield"
          color={colors.info}
          onPress={() => setActiveTab('roles')}
          colors={colors}
        />
        <StatCard
          title="Online Now"
          value={stats?.sessions.online || 0}
          icon="wifi"
          color={colors.warning}
          onPress={() => setActiveTab('sessions')}
          colors={colors}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, margin: 16, borderRadius: 12, padding: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Role Distribution</Text>
        <DistributionItem
          label="Admin"
          count={stats?.roles.admin || 0}
          total={stats?.roles.total || 1}
          color="#9C27B0"
          colors={colors}
        />
        <DistributionItem
          label="MiddleMan"
          count={stats?.roles.middleman || 0}
          total={stats?.roles.total || 1}
          color="#00BCD4"
          colors={colors}
        />
        <DistributionItem
          label="User"
          count={stats?.roles.user || 0}
          total={stats?.roles.total || 1}
          color="#607D8B"
          colors={colors}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, margin: 16, borderRadius: 12, padding: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>System Status</Text>
        <View style={styles.statusContainer}>
          <StatusItem label="Active Sessions" value={stats?.sessions.active || 0} icon="log-in" colors={colors} />
          <StatusItem label="Verified OTPs" value={stats?.otp.verified || 0} icon="mail-open" colors={colors} />
          <StatusItem label="Profiles" value={stats?.profiles.total || 0} icon="image" colors={colors} />
          <StatusItem label="Staff Users" value={stats?.users.staff || 0} icon="briefcase" colors={colors} />
        </View>
      </View>

      <View style={[styles.section, { marginHorizontal: 16, marginBottom: 30 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <ActionButton title="Add User" icon="person-add" color={colors.success} onPress={() => {
            setModalType('user');
            setSelectedItem(null);
            setFormData({});
            setModalVisible(true);
          }} colors={colors} />
          <ActionButton title="Assign Role" icon="shield" color={colors.info} onPress={() => {
            setModalType('role');
            setSelectedItem(null);
            setFormData({});
            setModalVisible(true);
          }} colors={colors} />
          <ActionButton title="Sync" icon="sync" color={colors.warning} onPress={syncData} colors={colors} />
        </View>
      </View>
    </ScrollView>
  );

  // Render Users Tab
  const renderUsers = () => (
    <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search users..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.success }]} onPress={() => {
        setModalType('user');
        setSelectedItem(null);
        setFormData({});
        setModalVisible(true);
      }}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add New User</Text>
      </TouchableOpacity>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        renderItem={({ item }) => (
          <UserCard
            user={item}
            onEdit={() => {
              setSelectedItem(item);
              setFormData({
                full_name: item.full_name,
                email: item.email,
                is_active: item.is_active,
                is_staff: item.is_staff,
              });
              setModalType('user');
              setModalVisible(true);
            }}
            onDelete={() => handleDeleteUser(item.id)}
            colors={colors}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
          </View>
        )}
      />
    </View>
  );

  // Render Roles Tab
  const renderRoles = () => (
    <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.success }]} onPress={() => {
        setModalType('role');
        setSelectedItem(null);
        setFormData({});
        setModalVisible(true);
      }}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Assign New Role</Text>
      </TouchableOpacity>

      <FlatList
        data={roles}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        renderItem={({ item }) => (
          <RoleCard
            role={item}
            onEdit={() => {
              setSelectedItem(item);
              setFormData({
                role: item.role,
                status: item.status,
              });
              setModalType('role');
              setModalVisible(true);
            }}
            onDelete={() => handleDeleteRole(item.id)}
            colors={colors}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No roles found</Text>
          </View>
        )}
      />
    </View>
  );

  // Modal
  const renderModal = () => (
    <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {modalType === 'user' ? (selectedItem ? 'Edit User' : 'Create User') : (selectedItem ? 'Edit Role' : 'Assign Role')}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {modalType === 'user' ? (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} value={formData.full_name} onChangeText={(text) => setFormData({ ...formData, full_name: text })} placeholder="Enter full name" placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Mobile Number</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} value={formData.mobile_number} onChangeText={(text) => setFormData({ ...formData, mobile_number: text })} placeholder="+1234567890" editable={!selectedItem} placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} value={formData.email} onChangeText={(text) => setFormData({ ...formData, email: text })} placeholder="user@example.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.textSecondary} />
                </View>
                {!selectedItem && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} value={formData.password} onChangeText={(text) => setFormData({ ...formData, password: text })} placeholder="Enter password" secureTextEntry placeholderTextColor={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.switchGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Active Status</Text>
                  <Switch value={formData.is_active} onValueChange={(value) => setFormData({ ...formData, is_active: value })} trackColor={{ false: '#767577', true: colors.success }} />
                </View>
                <View style={styles.switchGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Staff Status</Text>
                  <Switch value={formData.is_staff} onValueChange={(value) => setFormData({ ...formData, is_staff: value })} trackColor={{ false: '#767577', true: colors.info }} />
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>User ID</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} value={formData.user?.toString()} onChangeText={(text) => setFormData({ ...formData, user: parseInt(text) })} placeholder="Enter user ID" keyboardType="numeric" editable={!selectedItem} placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Role Type</Text>
                  <View style={styles.radioGroup}>
                    {['admin', 'middleman', 'user'].map((role) => (
                      <TouchableOpacity key={role} style={[styles.radioOption, formData.role === role && styles.radioOptionSelected, { borderColor: colors.border }]} onPress={() => setFormData({ ...formData, role })}>
                        <Text style={[styles.radioText, formData.role === role && styles.radioTextSelected, { color: formData.role === role ? '#fff' : colors.text }]}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Status</Text>
                  <View style={styles.radioGroup}>
                    {['active', 'inactive'].map((status) => (
                      <TouchableOpacity key={status} style={[styles.radioOption, formData.status === status && styles.radioOptionSelected, { borderColor: colors.border }]} onPress={() => setFormData({ ...formData, status })}>
                        <Text style={[styles.radioText, formData.status === status && styles.radioTextSelected, { color: formData.status === status ? '#fff' : colors.text }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>Assigned By (User ID)</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} value={formData.assigned_by?.toString()} onChangeText={(text) => setFormData({ ...formData, assigned_by: parseInt(text) })} placeholder="Enter admin user ID" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
                </View>
              </View>
            )}
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={() => {
              if (modalType === 'user') {
                if (selectedItem) handleUpdateUser();
                else handleCreateUser();
              } else {
                if (selectedItem) handleUpdateRole();
                else handleCreateRole();
              }
            }}>
              <Text style={styles.submitButtonText}>{selectedItem ? 'Update' : 'Create'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading && !stats && users.length === 0 && roles.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading admin panel...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* Header with Back and Menu */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.push('/dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Ionicons name="shield" size={20} color={colors.primary} />
          <Text style={[styles.headerBarTitle, { color: colors.text }]}>Admin Panel</Text>
        </View>
        
        <View style={styles.headerRight}>
          {syncing && <ActivityIndicator size="small" color={colors.primary} style={styles.syncIcon} />}
          {!isOnline && <Ionicons name="cloud-offline" size={20} color={colors.error} style={styles.onlineIcon} />}
          {isOnline && <Ionicons name="cloud-done" size={20} color={colors.success} style={styles.onlineIcon} />}
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu */}
      <Modal transparent={true} visible={menuVisible} animationType="none" onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
          <Animated.View style={[styles.dropdownMenu, { backgroundColor: colors.surface, transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
            <Text style={[styles.menuHeader, { color: colors.textSecondary }]}>MANAGE</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('chats')}>
              <Ionicons name="chatbubbles-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Manage Chats</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('forms')}>
              <Ionicons name="document-text-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Manage Forms</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('groups')}>
              <Ionicons name="people-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Manage Groups</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItem('library')}>
              <Ionicons name="library-outline" size={22} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Manage Library</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.menuHeader, { color: colors.textSecondary }]}>THEMES</Text>
            {Object.entries(THEMES).map(([key, themeData]) => (
              <TouchableOpacity key={key} style={styles.menuItem} onPress={() => changeTheme(key)}>
                <Ionicons name={themeData.icon as any} size={22} color={currentTheme === key ? colors.primary : colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }, currentTheme === key && { color: colors.primary, fontWeight: '600' }]}>{themeData.name}</Text>
                {currentTheme === key && <Ionicons name="checkmark" size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'roles' && renderRoles()}

      {/* Bottom Tab Bar */}
      <View style={[styles.bottomTab, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'dashboard' && { borderTopColor: colors.primary }]} onPress={() => setActiveTab('dashboard')}>
          <Ionicons name={activeTab === 'dashboard' ? "grid" : "grid-outline"} size={22} color={activeTab === 'dashboard' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabLabel, { color: activeTab === 'dashboard' ? colors.primary : colors.textSecondary }]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'users' && { borderTopColor: colors.primary }]} onPress={() => setActiveTab('users')}>
          <Ionicons name={activeTab === 'users' ? "people" : "people-outline"} size={22} color={activeTab === 'users' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabLabel, { color: activeTab === 'users' ? colors.primary : colors.textSecondary }]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'roles' && { borderTopColor: colors.primary }]} onPress={() => setActiveTab('roles')}>
          <Ionicons name={activeTab === 'roles' ? "shield" : "shield-outline"} size={22} color={activeTab === 'roles' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabLabel, { color: activeTab === 'roles' ? colors.primary : colors.textSecondary }]}>Roles</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      {renderModal()}
    </View>
  );
}

// Helper Components
const StatCard = ({ title, value, icon, color, onPress, colors }: any) => (
  <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surface, borderLeftColor: color }]} onPress={onPress}>
    <View style={[styles.statIconBg, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View style={styles.statContent}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  </TouchableOpacity>
);

const DistributionItem = ({ label, count, total, color, colors }: any) => (
  <View style={styles.distributionItem}>
    <View style={styles.distributionHeader}>
      <Text style={[styles.distributionLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.distributionCount, { color: colors.text }]}>{count}</Text>
    </View>
    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
      <View style={[styles.progressFill, { width: `${(count / total) * 100}%`, backgroundColor: color }]} />
    </View>
  </View>
);

const StatusItem = ({ label, value, icon, colors }: any) => (
  <View style={[styles.statusItem, { backgroundColor: colors.surface }]}>
    <Ionicons name={icon} size={24} color={colors.success} />
    <Text style={[styles.statusValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{label}</Text>
  </View>
);

const ActionButton = ({ title, icon, color, onPress, colors }: any) => (
  <TouchableOpacity style={[styles.actionButton, { backgroundColor: color }]} onPress={onPress}>
    <Ionicons name={icon} size={20} color="#fff" />
    <Text style={styles.actionButtonText}>{title}</Text>
  </TouchableOpacity>
);

const UserCard = ({ user, onEdit, onDelete, colors }: any) => (
  <View style={[styles.card, { backgroundColor: colors.surface }]}>
    <View style={styles.cardHeader}>
      <View style={[styles.avatarContainer, { backgroundColor: colors.info }]}>
        <Text style={styles.avatarText}>{user.full_name?.charAt(0) || user.mobile_number.charAt(0)}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{user.full_name || 'No Name'}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{user.mobile_number}</Text>
        <Text style={[styles.cardEmail, { color: colors.textSecondary }]}>{user.email}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={onEdit} style={styles.actionIcon}>
          <Ionicons name="pencil" size={20} color={colors.info} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionIcon}>
          <Ionicons name="trash" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
      <View style={[styles.badge, user.is_active ? { backgroundColor: colors.success + '20' } : { backgroundColor: colors.error + '20' }]}>
        <Text style={[styles.badgeText, { color: user.is_active ? colors.success : colors.error }]}>{user.is_active ? 'Active' : 'Inactive'}</Text>
      </View>
      {user.user_role && (
        <View style={[styles.badge, { backgroundColor: colors.info + '20' }]}>
          <Text style={[styles.badgeText, { color: colors.info }]}>{user.user_role.role_display}</Text>
        </View>
      )}
      <Text style={[styles.cardDate, { color: colors.textSecondary }]}>Joined: {new Date(user.date_joined).toLocaleDateString()}</Text>
    </View>
  </View>
);

const RoleCard = ({ role, onEdit, onDelete, colors }: any) => (
  <View style={[styles.card, { backgroundColor: colors.surface }]}>
    <View style={styles.cardHeader}>
      <View style={[styles.roleIcon, { backgroundColor: role.role === 'admin' ? '#9C27B020' : role.role === 'middleman' ? '#00BCD420' : '#607D8B20' }]}>
        <Ionicons name={role.role === 'admin' ? 'crown' : role.role === 'middleman' ? 'swap-horizontal' : 'person'} size={24} color={role.role === 'admin' ? '#9C27B0' : role.role === 'middleman' ? '#00BCD4' : '#607D8B'} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{role.role_display}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>User ID: {role.user}</Text>
        <Text style={[styles.cardEmail, { color: colors.textSecondary }]}>Status: {role.status_display}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={onEdit} style={styles.actionIcon}>
          <Ionicons name="pencil" size={20} color={colors.info} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionIcon}>
          <Ionicons name="trash" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
      <Text style={[styles.cardDate, { color: colors.textSecondary }]}>Assigned: {new Date(role.assigned_at).toLocaleDateString()}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBarTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncIcon: {
    marginRight: 4,
  },
  onlineIcon: {
    marginRight: 4,
  },
  menuButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 66,
    right: 12,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  menuHeader: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
  },
  menuDivider: {
    height: 1,
    marginVertical: 4,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  distributionItem: {
    marginBottom: 16,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  distributionLabel: {
    fontSize: 14,
  },
  distributionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusItem: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  tabContainer: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  card: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  cardEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
  },
  actionIcon: {
    padding: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  bottomTab: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  radioGroup: {
    flexDirection: 'row',
  },
  radioOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  radioOptionSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  radioText: {
    fontSize: 14,
  },
  radioTextSelected: {
    color: '#fff',
  },
  submitButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
});