import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, StatusBar, Alert, Modal, Animated, Dimensions, ActivityIndicator, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService, Message as APIMessage, User } from '../../lib/api';
import { websocketService } from '../../lib/api/services/websocket.service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
      messageBubble: '#DCF8C6',
      messageBubbleOutgoing: '#E4E6EB',
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
      messageBubble: '#005C4B',
      messageBubbleOutgoing: '#1F2C34',
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
      messageBubble: '#DCF8C6',
      messageBubbleOutgoing: '#E4E6EB',
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
      messageBubble: '#1E3A5F',
      messageBubbleOutgoing: '#2C4A6E',
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
      messageBubble: '#FFE0B2',
      messageBubbleOutgoing: '#FFCC80',
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
      messageBubble: '#E1BEE7',
      messageBubbleOutgoing: '#CE93D8',
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
      messageBubble: '#B2DFDB',
      messageBubbleOutgoing: '#80CBC4',
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
      messageBubble: '#F8BBD0',
      messageBubbleOutgoing: '#F48FB1',
    }
  },
};

// Cache keys
const CACHE_KEYS = {
  USER: 'cached_user',
  MESSAGES: (chatId: string) => `cached_messages_${chatId}`,
  CHAT: (chatId: string) => `cached_chat_${chatId}`,
  THEME: 'app_theme',
};

const getValidImageUrl = (imageUrl: string | undefined | null): string => {
  const defaultAvatar = 'https://randomuser.me/api/portraits/lego/1.jpg';
  if (!imageUrl) return defaultAvatar;
  if (imageUrl.startsWith('data:image')) return imageUrl;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  if (imageUrl.startsWith('/')) {
    return `https://autofix.pythonanywhere.com${imageUrl}`;
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
  
  // State
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [currentTheme, setCurrentTheme] = useState('light');
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const isMounted = useRef(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const hasLoadedOnce = useRef(false);
  
  // Animations
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const chatId = id as string;

  // Get current theme colors
  const theme = THEMES[currentTheme as keyof typeof THEMES];
  const colors = theme.colors;

  // Load theme from storage
  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(CACHE_KEYS.THEME);
      if (savedTheme && THEMES[savedTheme as keyof typeof THEMES]) {
        setCurrentTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  // ============ KEYBOARD HANDLERS FOR EXPO ============
  
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
        
        setTimeout(() => {
          if (shouldAutoScroll && flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [shouldAutoScroll]);

  // ============ CACHE HELPERS ============
  
  const saveToCache = async (key: string, data: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Cache save error:', error);
    }
  };

  const getFromCache = async (key: string) => {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  };

  // ============ DATA LOADING ============
  
  useEffect(() => {
    isMounted.current = true;
    loadTheme();
    
    const loadCachedData = async () => {
      const cachedUser = await getFromCache(CACHE_KEYS.USER);
      if (cachedUser && isMounted.current) {
        setCurrentUser(cachedUser);
      }
      
      const cachedMessages = await getFromCache(CACHE_KEYS.MESSAGES(chatId));
      if (cachedMessages && isMounted.current) {
        setMessages(cachedMessages);
        setLoading(false);
        hasLoadedOnce.current = true;
        
        setTimeout(() => {
          if (flatListRef.current && isMounted.current) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }, 100);
      }
      
      const cachedChat = await getFromCache(CACHE_KEYS.CHAT(chatId));
      if (cachedChat && isMounted.current) {
        setOtherUser(cachedChat.otherUser);
      }
    };
    
    loadCachedData();
    
    const fetchFreshData = async () => {
      await Promise.all([
        loadCurrentUser(),
        loadChatDetails(),
      ]);
      await loadMessages();
    };
    
    fetchFreshData();
    
    return () => {
      isMounted.current = false;
      websocketService.disconnect();
    };
  }, [chatId]);

  const loadCurrentUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr && isMounted.current) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        await saveToCache(CACHE_KEYS.USER, user);
        return user;
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
    return null;
  };

  const loadChatDetails = async () => {
    if (!isMounted.current) return null;
    
    try {
      const chat = await chatService.getChat(chatId);
      if (!isMounted.current) return null;
      
      let otherParticipant = null;
      if (chat.chat_type === 'individual' && chat.participants && currentUser) {
        otherParticipant = chat.participants.find(p => p.user !== currentUser?.id);
        if (otherParticipant?.user_details) {
          setOtherUser(otherParticipant.user_details);
          await saveToCache(CACHE_KEYS.CHAT(chatId), {
            otherUser: otherParticipant.user_details
          });
        }
      }
      return otherParticipant;
    } catch (error) {
      console.error('Error loading chat details:', error);
      return null;
    }
  };

  const loadMessages = useCallback(async () => {
    if (!currentUser && !hasLoadedOnce.current) {
      const user = await loadCurrentUser();
      if (!user) return;
    }
    
    const user = currentUser || await loadCurrentUser();
    if (!user) return;
    
    try {
      const msgs = await chatService.getMessages(chatId, 15, 0);
      
      if (!isMounted.current) return;
      
      const formattedMessages = formatMessages(msgs, user);
      setMessages(formattedMessages);
      await saveToCache(CACHE_KEYS.MESSAGES(chatId), formattedMessages);
      
      if (!hasLoadedOnce.current) {
        setLoading(false);
        hasLoadedOnce.current = true;
      }
      
      setTimeout(() => {
        if (flatListRef.current && isMounted.current && shouldAutoScroll) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 200);
      
      setupWebSocket();
      
    } catch (error) {
      console.error('Load messages error:', error);
      if (!hasLoadedOnce.current) {
        setLoading(false);
      }
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  }, [chatId, currentUser]);

  const formatMessages = (msgs: APIMessage[], user: User): UIMessage[] => {
    return msgs.map((msg: APIMessage) => {
      const isMe = msg.sender === user.id;
      return {
        id: msg.message_id,
        message_id: msg.message_id,
        text: msg.content,
        senderId: msg.sender,
        senderName: isMe 
          ? (user.full_name || 'Me')
          : (msg.sender_details?.full_name || otherUser?.full_name || 'Unknown'),
        senderAvatar: isMe ? user.profile_picture : (msg.sender_details?.profile_picture || otherUser?.profile_picture),
        time: formatTime(msg.created_at),
        status: (msg.status_for_user as any) || 'sent',
        createdAt: msg.created_at,
      };
    }).sort((a, b) => 
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
  };

  // ============ WEBSOCKET SETUP ============
  
  const setupWebSocket = async () => {
    if (!currentUser || !isMounted.current) return;
    
    const connected = await websocketService.connectToChat(chatId);
    
    if (connected) {
      websocketService.on('new_message', (data) => {
        if (!isMounted.current) return;
        
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
          const newMessages = [...prev, newMessage];
          saveToCache(CACHE_KEYS.MESSAGES(chatId), newMessages);
          return newMessages;
        });
        
        if (shouldAutoScroll) {
          setTimeout(() => {
            if (flatListRef.current && isMounted.current) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }, 100);
        }
        
        if (data.sender_id !== currentUser?.id) {
          markMessagesAsRead([data.message_id]);
        }
      });
      
      websocketService.on('typing', (data) => {
        if (!isMounted.current) return;
        if (data.user_id !== currentUser?.id) {
          setOtherUserTyping(data.is_typing);
          if (data.is_typing) {
            setTimeout(() => {
              if (isMounted.current) setOtherUserTyping(false);
            }, 2000);
          }
        }
      });
      
      websocketService.on('read_receipt', (data) => {
        if (!isMounted.current) return;
        setMessages(prev => prev.map(msg => 
          data.message_ids?.includes(msg.message_id) ? { ...msg, status: 'read' } : msg
        ));
      });
    }
  };

  const markMessagesAsRead = (messageIds: string[]) => {
    if (websocketService.isConnected()) {
      websocketService.sendReadReceipt(chatId, messageIds);
      setMessages(prev => prev.map(msg => 
        messageIds.includes(msg.message_id) ? { ...msg, status: 'read' } : msg
      ));
    }
  };

  // ============ HELPER FUNCTIONS ============
  
  const formatTime = (dateString: string): string => {
    if (!dateString) return '';
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
    
    setMessages(prev => {
      const newMessages = [...prev, optimisticMessage];
      saveToCache(CACHE_KEYS.MESSAGES(chatId), newMessages);
      return newMessages;
    });
    setMessage('');
    setShouldAutoScroll(true);
    
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    
    try {
      const sentMessage = await chatService.sendMessage(chatId, { content: messageContent });
      
      if (!isMounted.current) return;
      
      setMessages(prev => {
        const updated = prev.map(msg => 
          msg.id === tempId ? { 
            ...msg, 
            id: sentMessage.message_id, 
            message_id: sentMessage.message_id,
            status: 'delivered'
          } : msg
        );
        saveToCache(CACHE_KEYS.MESSAGES(chatId), updated);
        return updated;
      });
      
      if (websocketService.isConnected()) {
        websocketService.sendMessage(chatId, {
          content: messageContent,
          message_id: sentMessage.message_id,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      if (isMounted.current) {
        setMessages(prev => {
          const updated = prev.map(msg => 
            msg.id === tempId ? { ...msg, status: 'failed' } : msg
          );
          saveToCache(CACHE_KEYS.MESSAGES(chatId), updated);
          return updated;
        });
        Alert.alert('Error', 'Failed to send message');
      }
    } finally {
      if (isMounted.current) setSendingMessage(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }, [loadMessages]);

  const handleTyping = (text: string) => {
    setMessage(text);
    if (websocketService.isConnected()) {
      websocketService.sendTypingStatus(chatId, text.length > 0);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  // ============ UI COMPONENTS ============
  
  const AvatarImage = ({ uri, size = 40, style }: any) => {
    const [error, setError] = useState(false);
    const imageUrl = useMemo(() => {
      if (error) return 'https://randomuser.me/api/portraits/lego/1.jpg';
      if (!uri) return 'https://randomuser.me/api/portraits/lego/1.jpg';
      if (uri.startsWith('http')) return uri;
      if (uri.startsWith('/')) return `https://autofix.pythonanywhere.com${uri}`;
      return 'https://randomuser.me/api/portraits/lego/1.jpg';
    }, [uri, error]);
    
    return (
      <Image 
        source={{ uri: imageUrl }}
        style={[style, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setError(true)}
      />
    );
  };

  const renderMessage = useCallback(({ item }: { item: UIMessage }) => {
    const isMe = item.senderId === currentUser?.id;
    
    const getStatusIcon = () => {
      if (!isMe) return null;
      switch(item.status) {
        case 'read': 
          return <Ionicons name="checkmark-done" size={14} color={colors.primary} />;
        case 'delivered': 
          return <Ionicons name="checkmark-done" size={14} color={colors.textSecondary} />;
        case 'failed': 
          return (
            <TouchableOpacity onPress={() => sendMessage()}>
              <Ionicons name="alert-circle" size={14} color="#FF3B30" />
            </TouchableOpacity>
          );
        default: 
          return <Ionicons name="checkmark" size={14} color={colors.textSecondary} />;
      }
    };
    
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
        {!isMe && <AvatarImage uri={item.senderAvatar} size={36} style={styles.messageAvatar} />}
        <View style={[
          styles.messageBubble, 
          isMe ? [styles.myBubble, { backgroundColor: colors.messageBubbleOutgoing }] : [styles.theirBubble, { backgroundColor: colors.messageBubble, borderColor: colors.border }]
        ]}>
          <Text style={[styles.messageText, { color: colors.text }]}>{item.text}</Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, { color: colors.textSecondary }]}>{item.time}</Text>
            {getStatusIcon()}
          </View>
        </View>
      </View>
    );
  }, [currentUser, colors]);

  const getDisplayName = () => {
    if (otherUser?.full_name) return otherUser.full_name;
    if (otherUser?.mobile_number) return otherUser.mobile_number;
    return 'Loading...';
  };

  if (loading && messages.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <AvatarImage uri={otherUser?.profile_picture} size={40} style={styles.headerAvatar} />
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerName, { color: colors.text }]}>{getDisplayName()}</Text>
            <Text style={[styles.headerStatus, { color: colors.textSecondary }]}>
              {otherUserTyping ? 'Typing...' : (otherUser?.is_online ? 'Online' : 'Offline')}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push(`/call/${chatId}?type=video`)} style={styles.headerIcon}>
            <Ionicons name="videocam" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/call/${chatId}?type=voice`)} style={styles.headerIcon}>
            <Ionicons name="call" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerIcon}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Modal */}
      <Modal transparent visible={menuVisible} onRequestClose={() => setMenuVisible(false)} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <Animated.View style={[styles.dropdownMenu, { backgroundColor: colors.surface, transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.menuItem} onPress={async () => {
              setMenuVisible(false);
              Alert.alert('Delete Chat', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => {
                  await chatService.deleteChat(chatId);
                  router.back();
                }}
              ]);
            }}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Delete chat</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Typing Indicator */}
      {otherUserTyping && (
        <View style={[styles.typingContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.typingText, { color: colors.textSecondary }]}>{getDisplayName()} is typing...</Text>
        </View>
      )}

      {/* Messages List with dynamic padding for keyboard */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesContainer,
          { paddingBottom: keyboardVisible ? keyboardHeight + 20 : 20 }
        ]}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        onScrollBeginDrag={() => setShouldAutoScroll(false)}
        onMomentumScrollEnd={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
          setShouldAutoScroll(isAtBottom);
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={60} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No messages yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary + '80' }]}>Send a message to start chatting!</Text>
          </View>
        )}
      />

      {/* Input Area - Pushed above keyboard */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.keyboardAvoidingView}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle" size={32} color={colors.primary} />
          </TouchableOpacity>
          
          <View style={[styles.textInputWrapper, { backgroundColor: colors.surface }]}>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Message"
              placeholderTextColor={colors.textSecondary}
              value={message}
              onChangeText={handleTyping}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              editable={!sendingMessage}
              multiline
              blurOnSubmit={false}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]} 
            onPress={sendMessage} 
            disabled={sendingMessage || !message.trim()}
          >
            {sendingMessage ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="send" size={24} color={message.trim() ? colors.primary : colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 15,
    borderBottomWidth: 0.5,
    zIndex: 10,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerStatus: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 20,
  },
  headerIcon: {
    padding: 4,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : (StatusBar.currentHeight || 0) + 70,
    right: 12,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  
  // Messages Styles
  messagesContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
  },
  
  // Typing Indicator
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.3,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  
  // Input Area - Pushed above keyboard
  keyboardAvoidingView: {
    position: 'absolute',
    bottom: 76,
    left: 0,
    right: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  attachButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 4,
  },
  textInputWrapper: {
    flex: 1,
    borderRadius: 20,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    fontSize: 16,
    minHeight: 50,
    maxHeight: 100,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});