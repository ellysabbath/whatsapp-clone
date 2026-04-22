import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, StatusBar, Alert, Modal, Animated, Dimensions, ActivityIndicator, AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService, Message as APIMessage, Chat, User } from '../../lib/api';
import { websocketService } from '../../lib/api/services/websocket.service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getValidImageUrl = (imageUrl: string | undefined | null): string => {
  const defaultAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';
  if (!imageUrl) return defaultAvatar;
  if (imageUrl.startsWith('data:image')) return imageUrl;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  if (imageUrl.startsWith('/')) {
    return `http://192.168.137.1:8000${imageUrl}`;
  }
  return defaultAvatar;
};

interface UIMessage {
  id: string;
  message_id: string;
  text: string;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  time: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  createdAt?: string;
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [chatDetails, setChatDetails] = useState<Chat | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const appState = useRef(AppState.currentState);
  const unsubscribeWebSocket = useRef<(() => void) | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const chatId = id as string;

  // ============ AUTO-FETCH FUNCTIONS ============
  
  // Main function to fetch messages automatically
  const fetchMessagesAutomatically = useCallback(async () => {
    if (!currentUser || !isMounted.current) return;
    
    try {
      const msgs = await chatService.getMessages(chatId, 50, 0);
      if (!isMounted.current) return;
      
      const formattedMessages: UIMessage[] = msgs.map((msg: APIMessage) => {
        const isMe = msg.sender === currentUser?.id;
        return {
          id: msg.message_id,
          message_id: msg.message_id,
          text: msg.content,
          senderId: msg.sender,
          senderName: isMe 
            ? (currentUser?.full_name || 'Me')
            : (msg.sender_details?.full_name || otherUser?.full_name || 'Unknown'),
          senderAvatar: isMe ? currentUser?.profile_picture : (msg.sender_details?.profile_picture || otherUser?.profile_picture),
          time: formatTime(msg.created_at),
          status: (msg.status_for_user as any) || 'sent',
          createdAt: msg.created_at,
        };
      });
      
      const sortedMessages = formattedMessages.sort((a, b) => 
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
      
      setMessages(sortedMessages);
      
      setTimeout(() => {
        if (sortedMessages.length > 0 && isMounted.current) {
          flatListRef.current?.scrollToEnd({ animated: false });
        }
      }, 100);
    } catch (error) {
      console.error('Auto-fetch error:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [chatId, currentUser, otherUser]);

  // Polling for new messages (every 2 seconds)
  const startPolling = useCallback(() => {
    if (pollingInterval.current) return;
    
    pollingInterval.current = setInterval(async () => {
      if (isMounted.current && !websocketService.isConnected()) {
        console.log('📡 Polling for new messages...');
        await fetchMessagesAutomatically();
      }
    }, 2000);
  }, [fetchMessagesAutomatically]);

  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  // Auto-mark messages as read
  const autoMarkAsRead = useCallback(() => {
    if (!currentUser || !isMounted.current || messages.length === 0) return;
    
    const unreadMessages = messages.filter(
      msg => msg.senderId !== currentUser.id && msg.status !== 'read'
    );
    
    if (unreadMessages.length > 0 && websocketService.isConnected()) {
      const unreadMessageIds = unreadMessages.map(msg => msg.message_id);
      websocketService.sendReadReceipt(chatId, unreadMessageIds);
      console.log('📖 Sent read receipts for', unreadMessageIds.length, 'messages');
      
      setMessages(prev => prev.map(msg => 
        msg.senderId !== currentUser.id && msg.status !== 'read'
          ? { ...msg, status: 'read' }
          : msg
      ));
      setUnreadCount(0);
    }
  }, [chatId, currentUser, messages]);

  // ============ INITIALIZATION ============
  
  useEffect(() => {
    isMounted.current = true;
    initializeChat();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      isMounted.current = false;
      stopPolling();
      if (unsubscribeWebSocket.current) {
        unsubscribeWebSocket.current();
      }
      websocketService.disconnect();
      subscription.remove();
    };
  }, [chatId]);

  // Start polling when WebSocket disconnects
  useEffect(() => {
    if (isConnected) {
      stopPolling();
    } else if (currentUser && !isConnected) {
      startPolling();
    }
  }, [isConnected, currentUser, startPolling, stopPolling]);

  // Auto-mark messages as read
  useEffect(() => {
    if (messages.length > 0 && AppState.currentState === 'active') {
      autoMarkAsRead();
    }
  }, [messages, autoMarkAsRead]);

  // Menu animation
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

  // Send typing status
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      if (currentUser && websocketService.isConnected()) {
        websocketService.sendTyping(chatId, message.length > 0);
      }
    }, 500);
    
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [message]);

  // ============ CORE FUNCTIONS ============
  
  const handleAppStateChange = (nextAppState: any) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('📱 App came to foreground - refreshing');
      fetchMessagesAutomatically();
      setupWebSocket();
    }
    appState.current = nextAppState;
  };

  const initializeChat = async () => {
    await loadCurrentUser();
    await loadChatDetails();
    await fetchMessagesAutomatically();
    await setupWebSocket();
  };

  const loadCurrentUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr && isMounted.current) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        console.log('👤 Current user loaded:', user.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadChatDetails = async () => {
    if (!isMounted.current) return;
    
    try {
      const chat = await chatService.getChat(chatId);
      if (!isMounted.current) return;
      
      setChatDetails(chat);
      
      if (chat.chat_type === 'individual' && chat.participants) {
        const otherParticipant = chat.participants.find(p => p.user !== currentUser?.id);
        if (otherParticipant && otherParticipant.user_details) {
          setOtherUser(otherParticipant.user_details);
          setOtherUserOnline(otherParticipant.user_details?.is_online || false);
          setUnreadCount(otherParticipant.unread_count || 0);
        }
      }
    } catch (error) {
      console.error('Error loading chat details:', error);
    }
  };

  const setupWebSocket = async () => {
    if (!currentUser || !isMounted.current) return;
    
    const connected = await websocketService.connectToChat(chatId);
    setIsConnected(connected);
    
    if (connected) {
      setupWebSocketListeners();
    }
    
    // Monitor connection status
    const interval = setInterval(() => {
      if (isMounted.current) {
        setIsConnected(websocketService.isConnected());
      }
    }, 3000);
    
    return () => clearInterval(interval);
  };

  const setupWebSocketListeners = () => {
    if (!isMounted.current) return;
    
    if (unsubscribeWebSocket.current) {
      unsubscribeWebSocket.current();
    }
    
    // Listen for new messages
    const unsubscribeMessage = websocketService.on('new_message', (data) => {
      if (!isMounted.current) return;
      
      console.log('📨 New message via WebSocket:', data);
      
      const newMessage: UIMessage = {
        id: data.message_id || Date.now().toString(),
        message_id: data.message_id,
        text: data.content,
        senderId: data.sender_id,
        senderName: data.sender_name || otherUser?.full_name || 'Unknown',
        senderAvatar: data.sender_avatar || otherUser?.profile_picture,
        time: formatTime(new Date().toISOString()),
        status: 'delivered',
        createdAt: data.created_at || new Date().toISOString(),
      };
      
      setMessages(prev => {
        const exists = prev.some(msg => msg.message_id === data.message_id);
        if (exists) return prev;
        return [...prev, newMessage];
      });
      
      setTimeout(() => {
        if (isMounted.current) {
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      }, 100);
      
      autoMarkAsRead();
    });
    
    // Listen for typing
    const unsubscribeTyping = websocketService.on('typing', (data) => {
      if (!isMounted.current) return;
      if (data.user_id !== currentUser?.id) {
        setOtherUserTyping(data.is_typing);
        if (data.is_typing) {
          setTimeout(() => {
            if (isMounted.current) setOtherUserTyping(false);
          }, 3000);
        }
      }
    });
    
    // Listen for read receipts
    const unsubscribeRead = websocketService.on('read_receipt', (data) => {
      if (!isMounted.current) return;
      console.log('👁️ Read receipt:', data);
      setMessages(prev => prev.map(msg => 
        data.message_ids?.includes(msg.message_id) ? { ...msg, status: 'read' } : msg
      ));
    });
    
    // Listen for connection events
    const unsubscribeConnect = websocketService.on('connect', () => {
      console.log('✅ WebSocket connected event');
      setIsConnected(true);
      fetchMessagesAutomatically();
    });
    
    const unsubscribeDisconnect = websocketService.on('disconnect', () => {
      console.log('❌ WebSocket disconnected event');
      setIsConnected(false);
    });
    
    unsubscribeWebSocket.current = () => {
      unsubscribeMessage();
      unsubscribeTyping();
      unsubscribeRead();
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentUser || sendingMessage) return;
    
    setSendingMessage(true);
    const messageContent = message.trim();
    const tempId = `temp_${Date.now()}`;
    
    const optimisticMessage: UIMessage = {
      id: tempId,
      message_id: tempId,
      text: messageContent,
      senderId: currentUser.id,
      senderName: currentUser.full_name || 'Me',
      senderAvatar: currentUser.profile_picture,
      time: formatTime(new Date().toISOString()),
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setMessage('');
    
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    
    try {
      const sentMessage = await chatService.sendMessage(chatId, { content: messageContent });
      
      if (!isMounted.current) return;
      
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, id: sentMessage.message_id, message_id: sentMessage.message_id } : msg
      ));
      
      if (websocketService.isConnected()) {
        websocketService.sendMessage(chatId, {
          content: messageContent,
          message_id: sentMessage.message_id,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      if (isMounted.current) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'failed' } : msg
        ));
        Alert.alert('Error', 'Failed to send message');
      }
    } finally {
      if (isMounted.current) setSendingMessage(false);
    }
  };

  const handleRetrySend = async (failedMessage: UIMessage) => {
    if (!currentUser) return;
    
    const tempId = `retry_${Date.now()}`;
    
    setMessages(prev => prev.map(msg => 
      msg.id === failedMessage.id ? { ...msg, id: tempId, status: 'sent' } : msg
    ));
    
    try {
      const sentMessage = await chatService.sendMessage(chatId, { content: failedMessage.text });
      
      if (!isMounted.current) return;
      
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { 
          ...sentMessage, 
          id: sentMessage.message_id, 
          message_id: sentMessage.message_id,
          senderId: currentUser.id,
          senderName: currentUser.full_name || 'Me',
          status: 'sent'
        } : msg
      ));
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, status: 'failed' } : msg
      ));
      Alert.alert('Error', 'Failed to resend');
    }
  };

  const handleCall = () => router.push(`/call/${chatId}?type=voice`);
  const handleVideoCall = () => router.push(`/call/${chatId}?type=video`);
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleMenuItem = async (action: string) => {
    closeMenu();
    if (action === 'delete') {
      Alert.alert('Delete Chat', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await chatService.deleteChat(chatId);
          router.back();
        }}
      ]);
    }
  };

  const AvatarImage = ({ uri, size = 40, style }: any) => {
    const [error, setError] = useState(false);
    return (
      <Image 
        source={{ uri: error ? 'https://randomuser.me/api/portraits/lego/1.jpg' : getValidImageUrl(uri) }}
        style={[style, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setError(true)}
      />
    );
  };

  const renderMessage = ({ item, index }: { item: UIMessage; index: number }) => {
    const isMe = item.senderId === currentUser?.id;
    
    const getStatusIcon = () => {
      if (!isMe) return null;
      switch(item.status) {
        case 'read': return <Ionicons name="checkmark-done" size={14} color="#34B7F1" />;
        case 'delivered': return <Ionicons name="checkmark-done" size={14} color="#999" />;
        case 'failed': 
          return (
            <TouchableOpacity onPress={() => handleRetrySend(item)}>
              <Ionicons name="alert-circle" size={14} color="#FF3B30" />
            </TouchableOpacity>
          );
        default: return <Ionicons name="checkmark" size={14} color="#999" />;
      }
    };
    
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
        {!isMe && <AvatarImage uri={item.senderAvatar} size={32} style={styles.messageAvatar} />}
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={styles.messageText}>{item.text}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>{item.time}</Text>
            {getStatusIcon()}
          </View>
        </View>
      </View>
    );
  };

  const getDisplayName = () => {
    if (otherUser?.full_name) return otherUser.full_name;
    if (otherUser?.mobile_number) return otherUser.mobile_number;
    return 'Unknown';
  };

  const getDisplayAvatar = () => otherUser?.profile_picture;

  if (loading || !currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <AvatarImage uri={getDisplayAvatar()} size={40} style={styles.headerAvatar} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>{getDisplayName()}</Text>
            <View style={styles.headerStatusContainer}>
              {!isConnected && <Ionicons name="wifi-outline" size={12} color="#FF9800" />}
              <Text style={styles.headerStatus}>
                {otherUserTyping ? 'typing...' : (otherUserOnline ? 'Online' : 'Offline')}
              </Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleVideoCall} style={styles.headerIcon}>
            <Ionicons name="videocam" size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCall} style={styles.headerIcon}>
            <Ionicons name="call" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openMenu} style={styles.headerIcon}>
            <Ionicons name="ellipsis-vertical" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

  

      <Modal transparent visible={menuVisible} onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
          <Animated.View style={[styles.dropdownMenu, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
            <TouchableOpacity style={[styles.menuItem, styles.dangerMenuItem]} onPress={() => handleMenuItem('delete')}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
              <Text style={[styles.menuItemText, styles.dangerText]}>Delete chat</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {otherUserTyping && (
        <View style={styles.typingContainer}>
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>{getDisplayName()} is typing...</Text>
          </View>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={true}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Send a message to start chatting!</Text>
          </View>
        )}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              maxHeight={100}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            
            {message.trim() ? (
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={sendingMessage}>
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#075E54" />
                ) : (
                  <Ionicons name="send" size={24} color="#075E54" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micButton}>
                <Ionicons name="mic" size={24} color="#075E54" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  
  header: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  backButton: { padding: 4, marginRight: 8 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#f0f0f0' },
  headerTextContainer: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  headerStatusContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerStatus: { fontSize: 12, color: '#666' },
  unreadBadge: { backgroundColor: '#075E54', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  unreadBadgeText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', gap: 20 },
  headerIcon: { padding: 4 },
  
  connectionBar: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  connectionBarText: { fontSize: 12, color: '#fff' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : (StatusBar.currentHeight || 0) + 70,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  menuItemText: { fontSize: 16, color: '#333' },
  dangerMenuItem: { backgroundColor: '#fff' },
  dangerText: { color: '#FF3B30' },
  
  messagesContainer: { padding: 16, paddingBottom: 120 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  myMessageRow: { justifyContent: 'flex-end' },
  theirMessageRow: { justifyContent: 'flex-start' },
  messageAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, backgroundColor: '#f0f0f0' },
  messageBubble: { maxWidth: '75%', padding: 10, borderRadius: 18 },
  myBubble: { backgroundColor: '#DCF8C5', borderTopRightRadius: 4 },
  theirBubble: { backgroundColor: '#FFF', borderTopLeftRadius: 4, borderWidth: 0.5, borderColor: '#E0E0E0' },
  messageText: { fontSize: 15, lineHeight: 20, color: '#000' },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4 },
  messageTime: { fontSize: 10, color: '#999' },
  
  typingContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  typingBubble: { backgroundColor: '#E8E8E8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, alignSelf: 'flex-start' },
  typingText: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: SCREEN_HEIGHT * 0.3 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#ccc', marginTop: 4 },
  
  keyboardAvoidingView: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  inputWrapper: { backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#e0e0e0', paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 38 : 78 },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 25, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 16, backgroundColor: '#fff', color: '#000' },
  micButton: { padding: 8, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  sendButton: { padding: 8, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});