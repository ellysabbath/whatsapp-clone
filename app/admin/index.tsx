// app/admin/index.tsx
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// ==================== API CONFIGURATION ====================
const API_BASE_URL = 'https://aptecproject.pythonanywhere.com/api';

const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
  const token = await AsyncStorage.getItem('access_token');
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const text = await response.text();
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('API Error:', endpoint, text.substring(0, 200));
    throw new Error('Server response error');
  }
};

// ==================== TYPES ====================
interface User {
  id: number;
  mobile_number: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  user_role?: { role_display: string };
}

interface Role {
  id: number;
  role: string;
  role_display: string;
  status: string;
  status_display: string;
  user: number;
  user_name?: string;
  assigned_at: string;
}

interface Stats {
  users: { total: number; active: number; inactive: number; staff: number };
  roles: { total: number; admin: number; middleman: number; user: number };
}

// ==================== THEMES ====================
const THEMES: Record<string, any> = {
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
      success: '#4CAF50',
      error: '#f44336',
      warning: '#FF9800',
      info: '#2196F3',
    }
  },
};

type TabType = 'dashboard' | 'users' | 'roles';

// ==================== MAIN COMPONENT ====================
export default function AdminDashboard() {
  const router = useRouter();
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'user' | 'role'>('user');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  
  // Animations
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  
  const theme = THEMES[currentTheme];
  const colors = theme.colors;

  // ==================== LOAD DATA ====================
  useEffect(() => {
    loadAdmin();
    loadTheme();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab, searchQuery]);

  const loadAdmin = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) setCurrentAdmin(JSON.parse(userStr));
    } catch (e) {}
  };

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('admin_theme');
      if (saved && THEMES[saved]) setCurrentTheme(saved);
    } catch (e) {}
  };

  const saveTheme = async (themeId: string) => {
    await AsyncStorage.setItem('admin_theme', themeId);
    setCurrentTheme(themeId);
    showToast('Theme changed');
    setMenuVisible(false);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await apiCall('/users/stats/', 'GET');
        if (res.status === 'success') setStats(res.data);
      } else if (activeTab === 'users') {
        const res = await apiCall(`/users/?search=${searchQuery}&detailed=true`, 'GET');
        if (res.status === 'success') setUsers(res.data);
      } else if (activeTab === 'roles') {
        const res = await apiCall('/roles/?detailed=true', 'GET');
        if (res.status === 'success') setRoles(res.data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [activeTab]);

  // ==================== USER CRUD ====================
  const createUser = async () => {
    try {
      const res = await apiCall('/users/', 'POST', form);
      if (res.status === 'success') {
        showToast('User created');
        setModalVisible(false);
        loadData();
        setForm({});
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const updateUser = async () => {
    try {
      const res = await apiCall(`/users/${editingItem.id}/`, 'PATCH', form);
      if (res.status === 'success') {
        showToast('User updated');
        setModalVisible(false);
        loadData();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteUser = (id: number) => {
    Alert.alert('Confirm', 'Delete this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await apiCall(`/users/${id}/`, 'DELETE');
          showToast('User deleted');
          loadData();
        },
      },
    ]);
  };

  // ==================== ROLE CRUD ====================
  const createRole = async () => {
    try {
      const data = { ...form, assigned_by: currentAdmin?.id };
      const res = await apiCall('/roles/', 'POST', data);
      if (res.status === 'success') {
        showToast('Role assigned');
        setModalVisible(false);
        loadData();
        setForm({});
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const updateRole = async () => {
    try {
      const data = { role: form.role, status: form.status, assigned_by: currentAdmin?.id };
      const res = await apiCall(`/roles/${editingItem.id}/`, 'PATCH', data);
      if (res.status === 'success') {
        showToast('Role updated');
        setModalVisible(false);
        loadData();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteRole = (id: number) => {
    Alert.alert('Confirm', 'Delete this role?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await apiCall(`/roles/${id}/`, 'DELETE');
          showToast('Role deleted');
          loadData();
        },
      },
    ]);
  };

  // ==================== MODAL HANDLERS ====================
  const openCreateUser = () => {
    setEditingItem(null);
    setForm({});
    setModalType('user');
    setModalVisible(true);
  };

  const openEditUser = (user: User) => {
    setEditingItem(user);
    setForm({
      full_name: user.full_name,
      email: user.email,
      mobile_number: user.mobile_number,
      is_active: user.is_active,
      is_staff: user.is_staff,
    });
    setModalType('user');
    setModalVisible(true);
  };

  const openCreateRole = () => {
    setEditingItem(null);
    setForm({ user: '', role: 'user', status: 'active' });
    setModalType('role');
    setModalVisible(true);
  };

  const openEditRole = (role: Role) => {
    setEditingItem(role);
    setForm({
      role: role.role,
      status: role.status,
      user: role.user,
    });
    setModalType('role');
    setModalVisible(true);
  };

  // ==================== MENU ====================
  const toggleMenu = () => setMenuVisible(!menuVisible);
  const closeMenu = () => setMenuVisible(false);

  const handleMenuAction = (screen: string) => {
    closeMenu();
    router.push(`/${screen}/manage`);
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: menuVisible ? 0 : -300, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: menuVisible ? 1 : 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [menuVisible]);

  // ==================== RENDER ====================
  if (loading && !stats && users.length === 0 && roles.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Admin Panel...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="shield" size={20} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Panel</Text>
        </View>
        <TouchableOpacity onPress={toggleMenu} style={styles.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu */}
      <Modal transparent visible={menuVisible} onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeMenu}>
          <Animated.View style={[styles.dropdown, { backgroundColor: colors.surface, transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
            <Text style={[styles.menuHeader, { color: colors.textSecondary }]}>MANAGE</Text>
            {['chats', 'forms', 'groups', 'library'].map(item => (
              <TouchableOpacity key={item} style={styles.menuItem} onPress={() => handleMenuAction(item)}>
                <Ionicons name={item === 'chats' ? 'chatbubbles-outline' : item === 'forms' ? 'document-text-outline' : item === 'groups' ? 'people-outline' : 'library-outline'} size={22} color={colors.text} />
                <Text style={[styles.menuText, { color: colors.text }]}>Manage {item.charAt(0).toUpperCase() + item.slice(1)}</Text>
              </TouchableOpacity>
            ))}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.menuHeader, { color: colors.textSecondary }]}>THEMES</Text>
            {Object.entries(THEMES).map(([key, t]) => (
              <TouchableOpacity key={key} style={styles.menuItem} onPress={() => saveTheme(key)}>
                <Ionicons name={t.icon} size={22} color={currentTheme === key ? colors.primary : colors.text} />
                <Text style={[styles.menuText, { color: currentTheme === key ? colors.primary : colors.text }]}>{t.name}</Text>
                {currentTheme === key && <Ionicons name="checkmark" size={20} color={colors.primary} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Content */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <View>
            <View style={styles.statsGrid}>
              <StatCard colors={colors} title="Total Users" value={stats?.users.total || 0} icon="people" color={colors.primary} onPress={() => setActiveTab('users')} />
              <StatCard colors={colors} title="Active Users" value={stats?.users.active || 0} icon="checkmark-circle" color={colors.success} onPress={() => setActiveTab('users')} />
              <StatCard colors={colors} title="Total Roles" value={stats?.roles.total || 0} icon="shield" color={colors.info} onPress={() => setActiveTab('roles')} />
              <StatCard colors={colors} title="Staff Users" value={stats?.users.staff || 0} icon="briefcase" color={colors.warning} onPress={() => setActiveTab('users')} />
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Role Distribution</Text>
              <ProgressBar colors={colors} label="Admin" count={stats?.roles.admin || 0} total={stats?.roles.total || 1} color="#9C27B0" />
              <ProgressBar colors={colors} label="MiddleMan" count={stats?.roles.middleman || 0} total={stats?.roles.total || 1} color="#00BCD4" />
              <ProgressBar colors={colors} label="User" count={stats?.roles.user || 0} total={stats?.roles.total || 1} color="#607D8B" />
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success }]} onPress={openCreateUser}>
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Add User</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.info }]} onPress={openCreateRole}>
                <Ionicons name="shield" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Assign Role</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <View style={styles.tabContent}>
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.success }]} onPress={openCreateUser}>
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.addBtnText}>Add New User</Text>
            </TouchableOpacity>
            {users.map(user => (
              <UserCard key={user.id} colors={colors} user={user} onEdit={() => openEditUser(user)} onDelete={() => deleteUser(user.id)} />
            ))}
            {users.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
              </View>
            )}
          </View>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <View style={styles.tabContent}>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.success }]} onPress={openCreateRole}>
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.addBtnText}>Assign New Role</Text>
            </TouchableOpacity>
            {roles.map(role => (
              <RoleCard key={role.id} colors={colors} role={role} onEdit={() => openEditRole(role)} onDelete={() => deleteRole(role.id)} />
            ))}
            {roles.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="shield-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No roles found</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Tabs */}
      <View style={[styles.bottomTabs, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TabButton activeTab={activeTab} tab="dashboard" icon="grid" label="Dashboard" colors={colors} onPress={() => setActiveTab('dashboard')} />
        <TabButton activeTab={activeTab} tab="users" icon="people" label="Users" colors={colors} onPress={() => setActiveTab('users')} />
        <TabButton activeTab={activeTab} tab="roles" icon="shield" label="Roles" colors={colors} onPress={() => setActiveTab('roles')} />
      </View>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {modalType === 'user' ? (editingItem ? 'Edit User' : 'Create User') : (editingItem ? 'Edit Role' : 'Assign Role')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {modalType === 'user' ? (
                <View>
                  <InputField colors={colors} label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
                  <InputField colors={colors} label="Mobile Number" value={form.mobile_number} onChange={(v) => setForm({ ...form, mobile_number: v })} editable={!editingItem} />
                  <InputField colors={colors} label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} keyboard="email-address" />
                  {!editingItem && <InputField colors={colors} label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} secure />}
                  <View style={styles.switchRow}>
                    <Text style={{ color: colors.text }}>Active Status</Text>
                    <Switch value={form.is_active} onValueChange={(v) => setForm({ ...form, is_active: v })} trackColor={{ false: '#767577', true: colors.success }} />
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={{ color: colors.text }}>Staff Status</Text>
                    <Switch value={form.is_staff} onValueChange={(v) => setForm({ ...form, is_staff: v })} trackColor={{ false: '#767577', true: colors.info }} />
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={[styles.label, { color: colors.text }]}>Select User</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userScroll}>
                    {users.map(u => (
                      <TouchableOpacity
                        key={u.id}
                        style={[styles.userChip, { backgroundColor: colors.background, borderColor: colors.border }, form.user === u.id && { backgroundColor: colors.info + '20', borderColor: colors.info }]}
                        onPress={() => setForm({ ...form, user: u.id })}
                      >
                        <View style={[styles.userChipAvatar, { backgroundColor: colors.info }]}>
                          <Text style={styles.userChipInitial}>{u.full_name?.charAt(0) || u.mobile_number.charAt(0)}</Text>
                        </View>
                        <Text style={[styles.userChipName, { color: colors.text }]} numberOfLines={1}>{u.full_name || u.mobile_number}</Text>
                        {form.user === u.id && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {form.user && (
                    <Text style={[styles.selectedHint, { color: colors.success }]}>✓ Selected User ID: {form.user}</Text>
                  )}

                  <Text style={[styles.label, { color: colors.text }]}>Role Type</Text>
                  <View style={styles.radioGroup}>
                    {['admin', 'middleman', 'user'].map(r => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.radioOption, form.role === r && styles.radioSelected, { borderColor: colors.border }]}
                        onPress={() => setForm({ ...form, role: r })}
                      >
                        <Text style={[styles.radioText, { color: form.role === r ? '#fff' : colors.text }]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.label, { color: colors.text }]}>Status</Text>
                  <View style={styles.radioGroup}>
                    {['active', 'inactive'].map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.radioOption, form.status === s && styles.radioSelected, { borderColor: colors.border }]}
                        onPress={() => setForm({ ...form, status: s })}
                      >
                        <Text style={[styles.radioText, { color: form.status === s ? '#fff' : colors.text }]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={[styles.infoBox, { backgroundColor: colors.info + '20' }]}>
                    <Ionicons name="information-circle" size={20} color={colors.info} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>Assigned by: {currentAdmin?.full_name || currentAdmin?.mobile_number || 'Admin'} (Auto-filled)</Text>
                  </View>
                </View>
              )}
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={() => {
                if (modalType === 'user') {
                  editingItem ? updateUser() : createUser();
                } else {
                  editingItem ? updateRole() : createRole();
                }
              }}>
                <Text style={styles.submitBtnText}>{editingItem ? 'Update' : 'Create'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Toast */}
      {toastVisible && (
        <Animated.View style={[styles.toast, { backgroundColor: colors.success, opacity: toastAnim }]}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ==================== COMPONENTS ====================

const StatCard = ({ colors, title, value, icon, color, onPress }: any) => (
  <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surface, borderLeftColor: color }]} onPress={onPress}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  </TouchableOpacity>
);

const ProgressBar = ({ colors, label, count, total, color }: any) => (
  <View style={styles.progressItem}>
    <View style={styles.progressHeader}>
      <Text style={{ color: colors.textSecondary }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '600' }}>{count}</Text>
    </View>
    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
      <View style={[styles.progressFill, { width: `${(count / total) * 100}%`, backgroundColor: color }]} />
    </View>
  </View>
);

const TabButton = ({ activeTab, tab, icon, label, colors, onPress }: any) => (
  <TouchableOpacity style={[styles.tab, activeTab === tab && { borderTopColor: colors.primary }]} onPress={onPress}>
    <Ionicons name={activeTab === tab ? icon : `${icon}-outline`} size={22} color={activeTab === tab ? colors.primary : colors.textSecondary} />
    <Text style={[styles.tabLabel, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>{label}</Text>
  </TouchableOpacity>
);

const UserCard = ({ colors, user, onEdit, onDelete }: any) => (
  <View style={[styles.card, { backgroundColor: colors.surface }]}>
    <View style={styles.cardHeader}>
      <View style={[styles.avatar, { backgroundColor: colors.info }]}>
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
      <Text style={[styles.cardDate, { color: colors.textSecondary }]}>ID: {user.id}</Text>
    </View>
  </View>
);

const RoleCard = ({ colors, role, onEdit, onDelete }: any) => (
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
      <Text style={[styles.cardDate, { color: colors.textSecondary, marginLeft: 12 }]}>Role ID: {role.id}</Text>
    </View>
  </View>
);

const InputField = ({ colors, label, value, onChange, editable = true, keyboard = 'default', secure = false }: any) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    <TextInput
      style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
      value={value}
      onChangeText={onChange}
      editable={editable}
      keyboardType={keyboard}
      secureTextEntry={secure}
      placeholderTextColor={colors.textSecondary}
    />
  </View>
);

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  
  // Header
  header: {
     flexDirection: 'row',
      alignItems: 'center',
       justifyContent: 'space-between',
        paddingHorizontal: 16,
         paddingTop: Platform.OS === 'ios' ? 50 : 66,
          paddingBottom: 12, borderBottomWidth: 1 
    
    },
  headerBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  
  // Dropdown
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  dropdown: { position: 'absolute', top: Platform.OS === 'ios' ? 100 : 66, right: 12, borderRadius: 12, paddingVertical: 8, minWidth: 220, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5, zIndex: 1000 },
  menuHeader: { fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 8, letterSpacing: 0.5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  menuText: { fontSize: 15 },
  divider: { height: 1, marginVertical: 4 },
  
  // Dashboard
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, justifyContent: 'space-between' },
  statCard: { borderRadius: 12, padding: 16, marginBottom: 12, width: '48%', flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  statIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 2 },
  sectionCard: { margin: 16, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  progressItem: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 30, gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 8 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  // Users/Roles Tabs
  tabContent: { padding: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, marginBottom: 16, borderWidth: 1 },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 12, marginBottom: 16 },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16 },
  
  // Cards
  card: { borderRadius: 12, marginBottom: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  roleIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 14, marginTop: 2 },
  cardEmail: { fontSize: 12, marginTop: 2 },
  cardActions: { flexDirection: 'row' },
  actionIcon: { padding: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardDate: { fontSize: 11, marginLeft: 'auto' },
  
  // Bottom Tabs
  bottomTabs: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 28 : 46 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderTopWidth: 2, borderTopColor: 'transparent', gap: 4 },
  tabLabel: { fontSize: 11 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 20, padding: 20, width: '90%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  radioGroup: { flexDirection: 'row', marginBottom: 16 },
  radioOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderRadius: 8, marginHorizontal: 4 },
  radioSelected: { backgroundColor: '#000', borderColor: '#000' },
  radioText: { fontSize: 14 },
  userScroll: { marginBottom: 8, maxHeight: 100 },
  userChip: { flexDirection: 'row', alignItems: 'center', padding: 8, marginRight: 12, borderRadius: 8, borderWidth: 1, gap: 8 },
  userChipAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  userChipInitial: { color: '#fff', fontSize: 14, fontWeight: '600' },
  userChipName: { fontSize: 14, maxWidth: 100 },
  selectedHint: { fontSize: 12, marginBottom: 16 },
  infoBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginTop: 8, marginBottom: 16, gap: 8 },
  infoText: { fontSize: 12, flex: 1 },
  submitBtn: { borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  // Toast
  toast: { position: 'absolute', bottom: 100, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 8, zIndex: 1000 },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});