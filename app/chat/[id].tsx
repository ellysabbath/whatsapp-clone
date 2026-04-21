import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, StatusBar, Alert, Modal, Animated, Keyboard, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService, websocketService, Message as APIMessage, Chat, User } from '../../lib/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UIMessage {
  id: string;
  message_id: string;
  text: string;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  time: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const chatId = id as string;

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard opens
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Load chat data
  useEffect(() => {
    initializeChat();
    return () => {
      websocketService.disconnect();
    };
  }, [chatId]);

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
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentUser) {
        websocketService.sendTyping(chatId, message.length > 0);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [message]);

  const initializeChat = async () => {
    await loadCurrentUser();
    await loadChatDetails();
    await loadMessages();
    setupWebSocket();
  };

  const loadCurrentUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        console.log('Current user loaded:', user.id, user.full_name);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadChatDetails = async () => {
    try {
      const chat = await chatService.getChat(chatId);
      setChatDetails(chat);
      console.log('Chat details loaded:', chat);
      
      if (chat.chat_type === 'individual' && chat.participants) {
        const otherParticipant = chat.participants.find(p => p.user !== currentUser?.id);
        if (otherParticipant && otherParticipant.user_details) {
          setOtherUser(otherParticipant.user_details);
          console.log('Other user found:', otherParticipant.user_details.full_name);
        }
      }
    } catch (error: any) {
      console.error('Error loading chat details:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const msgs = await chatService.getMessages(chatId, 50, 0);
      console.log('Messages received:', msgs.length);
      
      const formattedMessages: UIMessage[] = msgs.map((msg: APIMessage) => {
        const isMe = msg.sender === currentUser?.id;
        let senderName = 'Unknown';
        let senderAvatar = undefined;
        
        if (isMe) {
          senderName = currentUser?.full_name || currentUser?.mobile_number || 'Me';
          senderAvatar = currentUser?.profile_picture;
        } else {
          if (msg.sender_details?.full_name) {
            senderName = msg.sender_details.full_name;
          } else if (msg.sender_details?.mobile_number) {
            senderName = msg.sender_details.mobile_number;
          } else if (otherUser?.full_name) {
            senderName = otherUser.full_name;
          } else if (otherUser?.mobile_number) {
            senderName = otherUser.mobile_number;
          } else if (chatDetails?.other_participant?.name) {
            senderName = chatDetails.other_participant.name;
          }
          
          senderAvatar = msg.sender_details?.profile_picture || otherUser?.profile_picture || chatDetails?.other_participant?.profile_picture;
        }
        
        return {
          id: msg.message_id,
          message_id: msg.message_id,
          text: msg.content,
          senderId: msg.sender,
          senderName: senderName,
          senderAvatar: senderAvatar,
          time: formatTime(msg.created_at),
          status: msg.status_for_user as 'sent' | 'delivered' | 'read',
        };
      });
      
      setMessages(formattedMessages.reverse());
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    if (!currentUser) return;
    
    websocketService.connectToChat(chatId);
    
    websocketService.on('new_message', (data) => {
      console.log('New message via WebSocket:', data);
      if (data.sender_id !== currentUser?.id) {
        const newMessage: UIMessage = {
          id: data.message_id || Date.now().toString(),
          message_id: data.message_id,
          text: data.content,
          senderId: data.sender_id,
          senderName: otherUser?.full_name || otherUser?.mobile_number || chatDetails?.other_participant?.name || 'Unknown',
          senderAvatar: otherUser?.profile_picture || chatDetails?.other_participant?.profile_picture,
          time: formatTime(new Date().toISOString()),
          status: 'delivered',
        };
        setMessages(prev => [...prev, newMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
    
    websocketService.on('typing', (data) => {
      if (data.user_id !== currentUser?.id) {
        setOtherUserTyping(data.is_typing);
      }
    });
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
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentUser) return;
    
    setSendingMessage(true);
    const messageContent = message.trim();
    const tempId = Date.now().toString();
    const currentTime = new Date().toISOString();
    
    const optimisticMessage: UIMessage = {
      id: tempId,
      message_id: tempId,
      text: messageContent,
      senderId: currentUser.id,
      senderName: currentUser.full_name || currentUser.mobile_number || 'Me',
      senderAvatar: currentUser.profile_picture,
      time: formatTime(currentTime),
      status: 'sent',
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setMessage('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    
    try {
      const sentMessage = await chatService.sendMessage(chatId, {
        content: messageContent,
      });
      
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, id: sentMessage.message_id, message_id: sentMessage.message_id, status: 'delivered' }
          : msg
      ));
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, status: 'failed' } : msg
      ));
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCall = () => {
    router.push(`/call/${chatId}?type=voice`);
  };

  const handleVideoCall = () => {
    router.push(`/call/${chatId}?type=video`);
  };

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

  const handleTabPress = (tab: string) => {
    if (tab === 'chats') router.back();
    else if (tab === 'updates') router.push('/dashboard/updates');
    else if (tab === 'profile') router.push('/dashboard/profile');
    else if (tab === 'newBroadcast') router.push('/dashboard/broadcast');
  };

  const renderMessage = ({ item, index }: { item: UIMessage; index: number }) => {
    const isMe = item.senderId === currentUser?.id;
    const showSenderName = !isMe && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
    
    const getStatusIcon = () => {
      if (!isMe) return null;
      switch(item.status) {
        case 'read': return <Ionicons name="checkmark-done" size={14} color="#34B7F1" />;
        case 'delivered': return <Ionicons name="checkmark-done" size={14} color="#999" />;
        case 'failed': return <Ionicons name="alert-circle" size={14} color="#FF3B30" />;
        default: return <Ionicons name="checkmark" size={14} color="#999" />;
      }
    };
    
    return (
      <View style={styles.messageContainer}>
        {showSenderName && (
          <View style={styles.senderNameContainer}>
            {item.senderAvatar && (
              <Image source={{ uri: item.senderAvatar }} style={styles.senderAvatar} />
            )}
            <Text style={styles.senderNameText}>{item.senderName}</Text>
          </View>
        )}
        
        <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
          <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
            <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
              {item.text}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={styles.messageTime}>{item.time}</Text>
              {getStatusIcon()}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const getDisplayName = () => {
    if (chatDetails?.chat_type === 'group') {
      return chatDetails.name || 'Group';
    }
    if (otherUser?.full_name) {
      return otherUser.full_name;
    }
    if (otherUser?.mobile_number) {
      return otherUser.mobile_number;
    }
    if (chatDetails?.other_participant?.name) {
      return chatDetails.other_participant.name;
    }
    return 'Unknown';
  };

  const getDisplayAvatar = () => {
    if (otherUser?.profile_picture) {
      return otherUser.profile_picture;
    }
    if (chatDetails?.other_participant?.profile_picture) {
      return chatDetails.other_participant.profile_picture;
    }
    return 'https://randomuser.me/api/portraits/lego/1.jpg';
  };

  if (loading || !currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerInfo} onPress={() => {}}>
          <Image 
            source={{ uri: getDisplayAvatar() }} 
            style={styles.headerAvatar} 
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>{getDisplayName()}</Text>
            <Text style={styles.headerStatus}>
              {otherUserTyping ? 'typing...' : (otherUser?.is_online ? 'Online' : 'Offline')}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon} onPress={handleVideoCall}>
            <Ionicons name="videocam" size={22} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={handleCall}>
            <Ionicons name="call" size={20} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={openMenu}>
            <Ionicons name="ellipsis-vertical" size={20} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu */}
      <Modal transparent visible={menuVisible} animationType="none" onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
          <Animated.View style={[styles.dropdownMenu, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
            <TouchableOpacity style={[styles.menuItem, styles.dangerMenuItem]} onPress={() => handleMenuItem('delete')}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
              <Text style={[styles.menuItemText, styles.dangerText]}>Delete chat</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Typing Indicator */}
      {otherUserTyping && (
        <View style={styles.typingContainer}>
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>typing...</Text>
            <View style={styles.typingDots}>
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
            </View>
          </View>
        </View>
      )}

      {/* Messages List - Add padding bottom when keyboard is visible */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesContainer,
          keyboardVisible && { paddingBottom: keyboardHeight + 60 }
        ]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input Bar - Using KeyboardAvoidingView with proper configuration */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              maxLength={1000}
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

      {/* Bottom Tab Navigation - Hide when keyboard is visible on Android */}
      {(!keyboardVisible || Platform.OS === 'ios') && (
        <View style={styles.bottomTab}>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('chats')}>
            <Ionicons name="chatbubbles-outline" size={24} color="#666" />
            <Text style={styles.tabLabel}>Chats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('updates')}>
            <Ionicons name="time-outline" size={24} color="#666" />
            <Text style={styles.tabLabel}>Updates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('profile')}>
            <Ionicons name="person-outline" size={24} color="#666" />
            <Text style={styles.tabLabel}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('newBroadcast')}>
            <Ionicons name="megaphone-outline" size={24} color="#666" />
            <Text style={styles.tabLabel}>Broadcast</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  
  // Header Styles
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 15 : 80,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerStatus: {
    fontSize: 12,
    color: '#666666',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
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
    zIndex: 1000,
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
    color: '#333',
  },
  dangerMenuItem: {
    backgroundColor: '#fff',
  },
  dangerText: {
    color: '#FF3B30',
  },
  
  // Messages Container
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  
  // Message Styles
  messageContainer: {
    marginBottom: 12,
  },
  senderNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 8,
  },
  senderAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  senderNameText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#DCF8C5',
    borderTopRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: '#000000',
  },
  theirText: {
    color: '#000000',
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
    color: '#999',
  },
  
  // Typing Indicator
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    alignSelf: 'flex-start',
    gap: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
  },
  
  // Input Bar - Keyboard Avoiding
  keyboardAvoidingView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  micButton: {
    padding: 4,
  },
  sendButton: {
    padding: 4,
  },
  
  // Bottom Tab
  bottomTab: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
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
    color: '#666',
  },
});