// app/(tabs)/updates.tsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Platform, StatusBar, Alert, Modal, TextInput, ScrollView, SafeAreaView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, GestureHandlerRootView, State } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme definitions
const THEMES = {
  light: {
    id: 'light',
    colors: {
      primary: '#075E54',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#000000',
      textSecondary: '#666666',
      border: '#E0E0E0',
      headerBg: '#FFFFFF',
      statusUnviewed: '#25D366',
    }
  },
  dark: {
    id: 'dark',
    colors: {
      primary: '#128C7E',
      background: '#111B21',
      surface: '#202C33',
      text: '#E9EDEF',
      textSecondary: '#AEBAC1',
      border: '#2A3942',
      headerBg: '#111B21',
      statusUnviewed: '#25D366',
    }
  },
  whatsappGreen: {
    id: 'whatsappGreen',
    colors: {
      primary: '#25D366',
      background: '#FFFFFF',
      surface: '#F0F2F5',
      text: '#111B21',
      textSecondary: '#54656F',
      border: '#E9EDEF',
      headerBg: '#FFFFFF',
      statusUnviewed: '#25D366',
    }
  },
  midnightBlue: {
    id: 'midnightBlue',
    colors: {
      primary: '#1E88E5',
      background: '#0A1929',
      surface: '#132F4C',
      text: '#FFFFFF',
      textSecondary: '#B0C4DE',
      border: '#1E3A5F',
      headerBg: '#0A1929',
      statusUnviewed: '#1E88E5',
    }
  },
  sunsetOrange: {
    id: 'sunsetOrange',
    colors: {
      primary: '#FF5722',
      background: '#FFF3E0',
      surface: '#FFE0B2',
      text: '#4E342E',
      textSecondary: '#8D6E63',
      border: '#FFCC80',
      headerBg: '#FFF3E0',
      statusUnviewed: '#FF5722',
    }
  },
  purpleHaze: {
    id: 'purpleHaze',
    colors: {
      primary: '#9C27B0',
      background: '#F3E5F5',
      surface: '#E1BEE7',
      text: '#4A148C',
      textSecondary: '#7B1FA2',
      border: '#CE93D8',
      headerBg: '#F3E5F5',
      statusUnviewed: '#9C27B0',
    }
  },
  oceanTeal: {
    id: 'oceanTeal',
    colors: {
      primary: '#00897B',
      background: '#E0F2F1',
      surface: '#B2DFDB',
      text: '#004D40',
      textSecondary: '#00695C',
      border: '#80CBC4',
      headerBg: '#E0F2F1',
      statusUnviewed: '#00897B',
    }
  },
  cherryBlossom: {
    id: 'cherryBlossom',
    colors: {
      primary: '#E91E63',
      background: '#FCE4EC',
      surface: '#F8BBD0',
      text: '#880E4F',
      textSecondary: '#AD1457',
      border: '#F48FB1',
      headerBg: '#FCE4EC',
      statusUnviewed: '#E91E63',
    }
  },
};

// Mock data for status updates
const myStatuses = [
  {
    id: 'my1',
    timestamp: 'Today, 2:30 PM',
    viewers: 24,
    media: 'https://picsum.photos/400/600?random=1',
    caption: 'Beautiful day! ☀️',
  },
  {
    id: 'my2',
    timestamp: 'Yesterday, 8:15 PM',
    viewers: 18,
    media: 'https://picsum.photos/400/600?random=2',
    caption: 'Dinner time! 🍕',
  },
];

const recentStatuses = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    timestamp: '5 minutes ago',
    viewed: false,
    statuses: [
      { id: 's1', media: 'https://picsum.photos/400/600?random=3', caption: 'Working hard! 💪', time: '5 min ago' },
      { id: 's2', media: 'https://picsum.photos/400/600?random=4', caption: 'Coffee time ☕', time: '10 min ago' },
    ]
  },
  {
    id: '2',
    name: 'Mike Chen',
    avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    timestamp: '1 hour ago',
    viewed: false,
    statuses: [
      { id: 's3', media: 'https://picsum.photos/400/600?random=5', caption: 'Gym time! 💪', time: '1 hour ago' },
    ]
  },
  {
    id: '3',
    name: 'Emma Wilson',
    avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    timestamp: '3 hours ago',
    viewed: true,
    statuses: [
      { id: 's4', media: 'https://picsum.photos/400/600?random=6', caption: 'New haircut! 💇‍♀️', time: '3 hours ago' },
    ]
  },
];

const viewedStatuses = [
  {
    id: '4',
    name: 'David Brown',
    avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
    timestamp: 'Yesterday, 10:30 PM',
    viewed: true,
    statuses: [
      { id: 's5', media: 'https://picsum.photos/400/600?random=7', caption: 'Late night work 🌙', time: 'Yesterday' },
    ]
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    timestamp: 'Yesterday, 8:15 PM',
    viewed: true,
    statuses: [
      { id: 's6', media: 'https://picsum.photos/400/600?random=8', caption: 'Movie night! 🎬', time: 'Yesterday' },
    ]
  },
];

const channels = [
  {
    id: 'c1',
    name: 'Tech News',
    avatar: 'https://randomuser.me/api/portraits/men/10.jpg',
    subscribers: '2.5M',
    latest: 'iPhone 15 Pro Max review',
    timestamp: '1 hour ago',
    verified: true,
  },
  {
    id: 'c2',
    name: 'Daily Motivation',
    avatar: 'https://randomuser.me/api/portraits/women/11.jpg',
    subscribers: '1.2M',
    latest: "Don't give up! 💪",
    timestamp: '3 hours ago',
    verified: false,
  },
  {
    id: 'c3',
    name: 'Football Updates',
    avatar: 'https://randomuser.me/api/portraits/men/12.jpg',
    subscribers: '5.1M',
    latest: 'Champions League results',
    timestamp: '5 hours ago',
    verified: true,
  },
];

export default function UpdatesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('updates');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<any>(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [myStatusVisible, setMyStatusVisible] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');

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

  const handleMyStatusPress = () => {
    Alert.alert(
      'My Status',
      'Add a new status update?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Status', onPress: () => Alert.alert('Add Status', 'Camera feature coming soon') },
        { text: 'View My Statuses', onPress: () => setMyStatusVisible(true) },
      ]
    );
  };

  const handleStatusPress = (status: any) => {
    setSelectedStatus(status);
    setCurrentStatusIndex(0);
    setShowStatusModal(true);
  };

  const handleChannelPress = (channel: any) => {
    setSelectedChannel(channel);
    setShowChannelModal(true);
  };

  const handleNextStatus = () => {
    if (selectedStatus && currentStatusIndex < selectedStatus.statuses.length - 1) {
      setCurrentStatusIndex(currentStatusIndex + 1);
    } else {
      setShowStatusModal(false);
    }
  };

  const handlePreviousStatus = () => {
    if (currentStatusIndex > 0) {
      setCurrentStatusIndex(currentStatusIndex - 1);
    }
  };

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    switch(tab) {
      case 'chats':
        router.push('/chat/${chat.chat_id}');
        break;
      case 'updates':
        break;
      case 'profile':
        router.push('/dashboard/profile');
        break;
      case 'newBroadcast':
        router.push('/dashboard/broadcast');
        break;
      default:
        break;
    }
  };

  const onSwipeLeft = () => {
    handleTabPress('profile');
  };

  const onSwipeRight = () => {
    handleTabPress('chats');
  };

  const onGestureEvent = (event: any) => {};
  
  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      if (translationX < -50 || velocityX < -500) {
        onSwipeLeft();
      }
      else if (translationX > 50 || velocityX > 500) {
        onSwipeRight();
      }
    }
  };

  const renderStatusItem = ({ item }: any) => (
    <TouchableOpacity style={[styles.statusItem, { borderBottomColor: colors.border }]} onPress={() => handleStatusPress(item)}>
      <View style={[styles.statusAvatarContainer, !item.viewed && { borderColor: colors.statusUnviewed }]}>
        <Image source={{ uri: item.avatar }} style={styles.statusAvatar} />
      </View>
      <View style={styles.statusInfo}>
        <Text style={[styles.statusName, !item.viewed && styles.statusNameUnviewed, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.statusTime, { color: colors.textSecondary }]}>{item.timestamp}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderChannelItem = ({ item }: any) => (
    <TouchableOpacity style={[styles.channelItem, { borderBottomColor: colors.border }]} onPress={() => handleChannelPress(item)}>
      <View style={styles.channelAvatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.channelAvatar} />
        {item.verified && (
          <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark-circle" size={14} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.channelInfo}>
        <View style={styles.channelHeader}>
          <Text style={[styles.channelName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.channelTime, { color: colors.textSecondary }]}>{item.timestamp}</Text>
        </View>
        <Text style={[styles.channelLatest, { color: colors.textSecondary }]}>{item.latest}</Text>
        <Text style={[styles.channelSubscribers, { color: colors.textSecondary }]}>{item.subscribers} subscribers</Text>
      </View>
    </TouchableOpacity>
  );

  const renderMyStatus = ({ item }: any) => (
    <TouchableOpacity style={styles.myStatusItem} onPress={() => Alert.alert('View Status', 'View status details')}>
      <Image source={{ uri: item.media }} style={styles.myStatusMedia} />
      <View style={styles.myStatusOverlay}>
        <Text style={styles.myStatusCaption}>{item.caption}</Text>
        <Text style={styles.myStatusTime}>{item.timestamp}</Text>
        <View style={styles.viewerCount}>
          <Ionicons name="eye-outline" size={12} color="#fff" />
          <Text style={styles.viewerCountText}>{item.viewers} views</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={styles.gestureContainer}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-5, 5]}
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.primary }]}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.primary} />
            
            {/* Header with back arrow */}
            <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Updates</Text>
              </View>
              <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.headerIcon} onPress={() => Alert.alert('Search', 'Search updates')}>
                  <Ionicons name="search" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIcon} onPress={() => Alert.alert('Menu', 'Updates menu')}>
                  <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
              {/* My Status Section */}
              <View style={[styles.section, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>My status</Text>
                <TouchableOpacity style={styles.myStatusCard} onPress={handleMyStatusPress}>
                  <View style={styles.myStatusAvatarContainer}>
                    <Image 
                      source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }} 
                      style={styles.myStatusAvatar}
                    />
                    <View style={[styles.addStatusIcon, { backgroundColor: colors.statusUnviewed }]}>
                      <Ionicons name="add" size={16} color="#fff" />
                    </View>
                  </View>
                  <View style={styles.myStatusText}>
                    <Text style={[styles.myStatusTitle, { color: colors.text }]}>My status</Text>
                    <Text style={[styles.myStatusSubtitle, { color: colors.textSecondary }]}>Tap to add status update</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Recent Updates Section */}
              {recentStatuses.length > 0 && (
                <View style={[styles.section, { backgroundColor: colors.background }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent updates</Text>
                  <FlatList
                    data={recentStatuses}
                    keyExtractor={(item) => item.id}
                    renderItem={renderStatusItem}
                    scrollEnabled={false}
                  />
                </View>
              )}

              {/* Viewed Updates Section */}
              {viewedStatuses.length > 0 && (
                <View style={[styles.section, { backgroundColor: colors.background }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Viewed updates</Text>
                  <FlatList
                    data={viewedStatuses}
                    keyExtractor={(item) => item.id}
                    renderItem={renderStatusItem}
                    scrollEnabled={false}
                  />
                </View>
              )}

              {/* Channels Section */}
              <View style={[styles.section, { backgroundColor: colors.background }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Channels</Text>
                  <TouchableOpacity onPress={() => Alert.alert('Find Channels', 'Discover channels')}>
                    <Text style={[styles.findChannelsText, { color: colors.primary }]}>Find channels</Text>
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={channels}
                  keyExtractor={(item) => item.id}
                  renderItem={renderChannelItem}
                  scrollEnabled={false}
                />
                
                <TouchableOpacity style={styles.exploreButton} onPress={() => Alert.alert('Explore', 'Explore more channels')}>
                  <Text style={[styles.exploreButtonText, { color: colors.primary }]}>Explore more</Text>
                </TouchableOpacity>
              </View>

              {/* Privacy Note */}
              <View style={styles.privacyNote}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                  Your status updates are end-to-end encrypted
                </Text>
              </View>
            </ScrollView>

            {/* Status View Modal */}
            <Modal
              visible={showStatusModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowStatusModal(false)}
            >
              {selectedStatus && selectedStatus.statuses && selectedStatus.statuses[currentStatusIndex] && (
                <View style={styles.statusModalContainer}>
                  <TouchableOpacity style={styles.statusModalClose} onPress={() => setShowStatusModal(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                  
                  <View style={styles.statusHeader}>
                    <Image source={{ uri: selectedStatus.avatar }} style={styles.statusModalAvatar} />
                    <View>
                      <Text style={styles.statusModalName}>{selectedStatus.name}</Text>
                      <Text style={styles.statusModalTime}>
                        {selectedStatus.statuses[currentStatusIndex].time}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.statusModalContent}
                    onPress={handleNextStatus}
                    activeOpacity={1}
                  >
                    <Image 
                      source={{ uri: selectedStatus.statuses[currentStatusIndex].media }} 
                      style={styles.statusModalImage}
                      resizeMode="contain"
                    />
                    {selectedStatus.statuses[currentStatusIndex].caption && (
                      <View style={styles.statusCaption}>
                        <Text style={styles.statusCaptionText}>
                          {selectedStatus.statuses[currentStatusIndex].caption}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {currentStatusIndex > 0 && (
                    <TouchableOpacity style={styles.statusPrevButton} onPress={handlePreviousStatus}>
                      <Ionicons name="chevron-back" size={30} color="#fff" />
                    </TouchableOpacity>
                  )}
                  
                  {currentStatusIndex < selectedStatus.statuses.length - 1 && (
                    <TouchableOpacity style={styles.statusNextButton} onPress={handleNextStatus}>
                      <Ionicons name="chevron-forward" size={30} color="#fff" />
                    </TouchableOpacity>
                  )}

                  <View style={styles.statusProgressContainer}>
                    {selectedStatus.statuses.map((_: any, idx: number) => (
                      <View 
                        key={idx} 
                        style={[
                          styles.statusProgressBar,
                          idx === currentStatusIndex && styles.statusProgressBarActive,
                          idx < currentStatusIndex && [styles.statusProgressBarCompleted, { backgroundColor: colors.primary }]
                        ]} 
                      />
                    ))}
                  </View>
                </View>
              )}
            </Modal>

            {/* Channel View Modal */}
            <Modal
              visible={showChannelModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowChannelModal(false)}
            >
              {selectedChannel && (
                <View style={[styles.channelModalContainer, { backgroundColor: colors.background }]}>
                  <View style={[styles.channelModalHeader, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => setShowChannelModal(false)}>
                      <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                      <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.channelModalContent}>
                    <View style={styles.channelModalAvatarContainer}>
                      <Image source={{ uri: selectedChannel.avatar }} style={styles.channelModalAvatar} />
                      {selectedChannel.verified && (
                        <View style={styles.channelModalVerified}>
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        </View>
                      )}
                    </View>
                    
                    <Text style={[styles.channelModalName, { color: colors.text }]}>{selectedChannel.name}</Text>
                    <Text style={[styles.channelModalSubscribers, { color: colors.textSecondary }]}>{selectedChannel.subscribers} subscribers</Text>
                    
                    <TouchableOpacity style={[styles.followButton, { backgroundColor: colors.primary }]}>
                      <Text style={styles.followButtonText}>Follow</Text>
                    </TouchableOpacity>

                    <View style={[styles.channelLatestUpdate, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.channelLatestTitle, { color: colors.textSecondary }]}>Latest update</Text>
                      <Text style={[styles.channelLatestText, { color: colors.text }]}>{selectedChannel.latest}</Text>
                      <Text style={[styles.channelLatestTime, { color: colors.textSecondary }]}>{selectedChannel.timestamp}</Text>
                    </View>
                  </View>
                </View>
              )}
            </Modal>

            {/* My Statuses Modal */}
            <Modal
              visible={myStatusVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setMyStatusVisible(false)}
            >
              <View style={[styles.myStatusModalContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.myStatusModalHeader, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity onPress={() => setMyStatusVisible(false)}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.myStatusModalTitle, { color: colors.text }]}>My statuses</Text>
                  <TouchableOpacity>
                    <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={myStatuses}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMyStatus}
                  numColumns={3}
                  contentContainerStyle={styles.myStatusGrid}
                />

                <TouchableOpacity style={[styles.addStatusButton, { backgroundColor: colors.primary }]} onPress={() => Alert.alert('Add Status', 'Add new status')}>
                  <Ionicons name="camera" size={24} color="#fff" />
                  <Text style={styles.addStatusButtonText}>Add to my status</Text>
                </TouchableOpacity>
              </View>
            </Modal>

            {/* Bottom Tab Navigation */}
            <View style={[styles.bottomTab, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={styles.tabItem}
                onPress={() => handleTabPress('chats')}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={24}
                  color={colors.text}
                />
                <Text style={[styles.tabLabel, { color: colors.textSecondary }]}>Chats</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tabItem}
                onPress={() => handleTabPress('updates')}
              >
                <Ionicons
                  name="time"
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.tabLabel, { color: colors.primary }]}>Updates</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tabItem}
                onPress={() => handleTabPress('profile')}
              >
                <Ionicons
                  name="person-outline"
                  size={24}
                  color={colors.text}
                />
                <Text style={[styles.tabLabel, { color: colors.textSecondary }]}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tabItem}
                onPress={() => handleTabPress('newBroadcast')}
              >
                <Ionicons
                  name="megaphone-outline"
                  size={24}
                  color={colors.text}
                />
                <Text style={[styles.tabLabel, { color: colors.textSecondary }]}>Broadcast</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 60,
    paddingBottom: 12,
    minHeight: Platform.OS === 'ios' ? 70 : 86,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 20,
  },
  headerIcon: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    marginBottom: Platform.OS === 'ios' ? 80 : 100,
  },
  section: {
    marginTop: 8,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  findChannelsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  myStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  myStatusAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  myStatusAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  addStatusIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  myStatusText: {
    flex: 1,
  },
  myStatusTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  myStatusSubtitle: {
    fontSize: 13,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  statusAvatarContainer: {
    marginRight: 12,
    padding: 2,
    borderRadius: 30,
    borderWidth: 2,
  },
  statusAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  statusInfo: {
    flex: 1,
  },
  statusName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  statusNameUnviewed: {
    fontWeight: '700',
  },
  statusTime: {
    fontSize: 12,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  channelAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  channelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 8,
    padding: 2,
  },
  channelInfo: {
    flex: 1,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '600',
  },
  channelTime: {
    fontSize: 11,
  },
  channelLatest: {
    fontSize: 13,
    marginBottom: 2,
  },
  channelSubscribers: {
    fontSize: 11,
  },
  exploreButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  privacyText: {
    fontSize: 11,
  },
  statusModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  statusModalClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    zIndex: 10,
  },
  statusHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  statusModalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  statusModalName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusModalTime: {
    fontSize: 11,
    color: '#ccc',
  },
  statusModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusModalImage: {
    width: '100%',
    height: '80%',
  },
  statusCaption: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 8,
  },
  statusCaptionText: {
    fontSize: 14,
    color: '#fff',
  },
  statusPrevButton: {
    position: 'absolute',
    left: 10,
    top: '50%',
  },
  statusNextButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
  },
  statusProgressContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 4,
  },
  statusProgressBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  statusProgressBarActive: {
    backgroundColor: '#fff',
  },
  statusProgressBarCompleted: {
    backgroundColor: '#25D366',
  },
  channelModalContainer: {
    flex: 1,
  },
  channelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 15 : 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  channelModalContent: {
    alignItems: 'center',
    padding: 20,
  },
  channelModalAvatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  channelModalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  channelModalVerified: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  channelModalName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  channelModalSubscribers: {
    fontSize: 14,
    marginBottom: 20,
  },
  followButton: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 30,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  channelLatestUpdate: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
  },
  channelLatestTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  channelLatestText: {
    fontSize: 16,
    marginBottom: 4,
  },
  channelLatestTime: {
    fontSize: 12,
  },
  myStatusModalContainer: {
    flex: 1,
  },
  myStatusModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 15 : 40,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  myStatusModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  myStatusGrid: {
    padding: 4,
  },
  myStatusItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 2,
    position: 'relative',
  },
  myStatusMedia: {
    width: '100%',
    height: '100%',
  },
  myStatusOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
  },
  myStatusCaption: {
    fontSize: 10,
    color: '#fff',
    marginBottom: 2,
  },
  myStatusTime: {
    fontSize: 8,
    color: '#ccc',
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  viewerCountText: {
    fontSize: 8,
    color: '#ccc',
  },
  addStatusButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addStatusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  bottomTab: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 76,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 12,
  },
});