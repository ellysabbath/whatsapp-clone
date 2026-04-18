// app/starred-messages.tsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Platform, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

const starredMessages = [
  {
    id: '1',
    message: "Hey! Don't forget about the meeting tomorrow at 10am",
    time: 'Yesterday at 3:30 PM',
    chatId: '1',
    chatName: 'Sarah Johnson',
    chatAvatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    media: null,
  },
  {
    id: '2',
    message: "I love this photo! 📸",
    time: 'Monday at 8:15 PM',
    chatId: '2',
    chatName: 'Mike Chen',
    chatAvatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    media: 'https://picsum.photos/200',
  },
  {
    id: '3',
    message: "Check out this document - very important",
    time: 'Sunday at 11:20 AM',
    chatId: '3',
    chatName: 'Emma Wilson',
    chatAvatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    media: null,
    hasDoc: true,
  },
  {
    id: '4',
    message: "Great job on the project! 🎉",
    time: 'Last week',
    chatId: '4',
    chatName: 'David Brown',
    chatAvatar: 'https://randomuser.me/api/portraits/men/4.jpg',
    media: null,
  },
  {
    id: '5',
    message: "Family dinner this Sunday at 7pm",
    time: 'Last week',
    chatId: '5',
    chatName: 'Family Group',
    chatAvatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    media: null,
    isGroup: true,
  },
];

export default function StarredMessagesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');

  const handleMessagePress = (chatId: string, messageId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleUnstar = (messageId: string) => {
    Alert.alert(
      'Remove from starred',
      'Are you sure you want to remove this message from starred?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => console.log('Unstarred:', messageId) }
      ]
    );
  };

  const renderMessage = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.messageCard}
      onPress={() => handleMessagePress(item.chatId, item.id)}
      activeOpacity={0.7}
    >
      {/* Chat Info */}
      <View style={styles.chatHeader}>
        <Image source={{ uri: item.chatAvatar }} style={styles.chatAvatar} />
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{item.chatName}</Text>
          <Text style={styles.messageTime}>{item.time}</Text>
        </View>
        <TouchableOpacity onPress={() => handleUnstar(item.id)} style={styles.starButton}>
          <Ionicons name="star" size={22} color="#FFC107" />
        </TouchableOpacity>
      </View>

      {/* Message Content */}
      <View style={styles.messageContent}>
        {item.media && (
          <Image source={{ uri: item.media }} style={styles.messageMedia} />
        )}
        {item.hasDoc && (
          <View style={styles.documentPreview}>
            <Ionicons name="document-text" size={32} color="#075E54" />
            <Text style={styles.documentText}>Document.pdf</Text>
          </View>
        )}
        <Text style={styles.messageText}>{item.message}</Text>
      </View>

      {/* Actions */}
      <View style={styles.messageActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={18} color="#666" />
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={18} color="#666" />
          <Text style={styles.actionText}>Forward</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="star-outline" size={64} color="#ddd" />
      </View>
      <Text style={styles.emptyTitle}>No starred messages</Text>
      <Text style={styles.emptyText}>
        Star important messages to find them easily
      </Text>
      <Text style={styles.emptyHint}>
        Press and hold any message and tap the star icon
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#041816" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Starred messages</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#075E54" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'media' && styles.filterTabActive]}
          onPress={() => setFilter('media')}
        >
          <Text style={[styles.filterText, filter === 'media' && styles.filterTextActive]}>Media</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'docs' && styles.filterTabActive]}
          onPress={() => setFilter('docs')}
        >
          <Text style={[styles.filterText, filter === 'docs' && styles.filterTextActive]}>Documents</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={18} color="#25D366" />
        <Text style={styles.infoText}>
          Your starred messages are private and only visible to you
        </Text>
      </View>

      {/* Starred Messages List */}
      <FlatList
        data={starredMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={EmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 76,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#041816',
  },
  menuButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterTabActive: {
    backgroundColor: '#e8f5e9',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#075E54',
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    margin: 12,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  listContainer: {
    padding: 12,
    paddingBottom: 20,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
  },
  starButton: {
    padding: 4,
  },
  messageContent: {
    marginBottom: 12,
  },
  messageMedia: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  documentText: {
    fontSize: 14,
    color: '#075E54',
    fontWeight: '500',
  },
  messageText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  messageActions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#f0f0f0',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});