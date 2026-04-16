import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, StatusBar, Alert, Modal, ActivityIndicator, Animated, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';

// Common emojis for quick picker
const commonEmojis = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '😍', '🥰', '😘', '😗', '😙', '😋', '😛', '😝', '🤪', '🤗',
  '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮',
  '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤',
  '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '🔥', '✨', '⭐', '🌟', '💫', '⚡', '☀️', '🌙', '🌚', '🌝',
];

// Mock messages data for different chats
const getMockMessages = (chatId: string) => {
  const messages: { [key: string]: any[] } = {
    '1': [
      { id: '1', text: 'Hey! How are you?', sender: 'other', time: '10:30 AM', status: 'read' },
      { id: '2', text: "I'm doing great! Thanks for asking 😊", sender: 'me', time: '10:32 AM', status: 'read' },
      { id: '3', text: 'Want to grab coffee later?', sender: 'other', time: '10:35 AM', status: 'read' },
      { id: '4', text: 'Sure! What time?', sender: 'me', time: '10:36 AM', status: 'read' },
      { id: '5', text: 'How about 3 PM at Starbucks?', sender: 'other', time: '10:38 AM', status: 'read' },
      { id: '6', text: 'Perfect! See you there 👋', sender: 'me', time: '10:39 AM', status: 'delivered' },
    ],
    '2': [
      { id: '1', text: 'Hello! Are you coming to the meeting?', sender: 'other', time: '9:15 AM', status: 'read' },
      { id: '2', text: 'Yes, I will be there in 10 minutes', sender: 'me', time: '9:20 AM', status: 'read' },
      { id: '3', text: 'Great! See you soon', sender: 'other', time: '9:21 AM', status: 'read' },
    ],
    '3': [
      { id: '1', text: 'Thanks for your help yesterday!', sender: 'other', time: '8:00 AM', status: 'read' },
      { id: '2', text: "You're welcome! Anytime 😊", sender: 'me', time: '8:05 AM', status: 'read' },
    ],
    '4': [
      { id: '1', text: 'Can you send me the files?', sender: 'other', time: 'Yesterday', status: 'read' },
      { id: '2', text: 'Sure, sending them now', sender: 'me', time: 'Yesterday', status: 'read' },
    ],
    '5': [
      { id: '1', text: 'Mom: Dinner at 7pm 🍽️', sender: 'other', time: 'Yesterday', status: 'read' },
      { id: '2', text: 'I will be there!', sender: 'me', time: 'Yesterday', status: 'read' },
      { id: '3', text: 'Dad: Don\'t be late', sender: 'other', time: 'Yesterday', status: 'read' },
    ],
  };
  
  return messages[chatId] || [
    { id: '1', text: 'Start a conversation!', sender: 'other', time: 'Now', status: 'read' },
  ];
};

const chatDetails: { [key: string]: { name: string; avatar: string; online: boolean; lastSeen: string } } = {
  '1': { name: 'Sarah Johnson', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', online: true, lastSeen: 'Online' },
  '2': { name: 'Mike Chen', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', online: false, lastSeen: 'Last seen today at 4:15 PM' },
  '3': { name: 'Emma Wilson', avatar: 'https://randomuser.me/api/portraits/women/3.jpg', online: true, lastSeen: 'Online' },
  '4': { name: 'David Brown', avatar: 'https://randomuser.me/api/portraits/men/4.jpg', online: false, lastSeen: 'Last seen yesterday' },
  '5': { name: 'Family Group', avatar: 'https://randomuser.me/api/portraits/women/5.jpg', online: false, lastSeen: 'Group • 5 members' },
};

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(getMockMessages(id as string));
  const [isTyping, setIsTyping] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Animation values for dropdown
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const chatId = id as string;
  const chat = chatDetails[chatId] || { 
    name: 'Unknown', 
    avatar: 'https://randomuser.me/api/portraits/lego/1.jpg', 
    online: false, 
    lastSeen: 'Unknown' 
  };

  // Animate menu sliding down
  useEffect(() => {
    if (menuVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [menuVisible]);

  useEffect(() => {
    // Simulate typing indicator
    if (message.length > 0) {
      const timeout = setTimeout(() => {
        setIsTyping(true);
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
    }
  }, [message]);

  const sendMessage = () => {
    if (!message.trim()) return;
    
    const newMessage = {
      id: Date.now().toString(),
      text: message.trim(),
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };
    
    setMessages([...messages, newMessage]);
    setMessage('');
    
    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    
    // Simulate reply after 2 seconds
    setTimeout(() => {
      const replyMessage = {
        id: (Date.now() + 1).toString(),
        text: getAutoReply(message.trim()),
        sender: 'other',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
      };
      setMessages(prev => [...prev, replyMessage]);
      setIsTyping(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, 2000);
  };

  const getAutoReply = (userMessage: string) => {
    const replies = [
      'That sounds great! 😊',
      'I agree with you!',
      'Thanks for letting me know',
      'Interesting! Tell me more',
      'I\'ll get back to you soon',
      '👍',
      '😊',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  };

  const handleCall = () => {
    Alert.alert('Voice Call', `Calling ${chat.name}...`);
  };

  const handleVideoCall = () => {
    Alert.alert('Video Call', `Starting video call with ${chat.name}...`);
  };

  const openMenu = () => {
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  const handleEmojiPress = () => {
    Keyboard.dismiss();
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleMenuItem = (action: string) => {
    closeMenu();
    setTimeout(() => {
      switch(action) {
        case 'contact':
          Alert.alert('Contact Info', chat.name);
          break;
        case 'media':
          Alert.alert('Media', 'Media, Links, and Docs coming soon');
          break;
        case 'search':
          Alert.alert('Search', 'Search in conversation');
          break;
        case 'mute':
          Alert.alert('Mute', 'Notifications muted for this chat');
          break;
        case 'wallpaper':
          Alert.alert('Wallpaper', 'Change chat wallpaper');
          break;
        case 'clear':
          Alert.alert('Clear Chat', 'Chat history cleared');
          break;
        case 'delete':
          Alert.alert('Delete Chat', 'Chat deleted');
          router.back();
          break;
        default:
          break;
      }
    }, 300);
  };

  const renderMessage = ({ item }: any) => {
    const isMe = item.sender === 'me';
    
    const getStatusIcon = () => {
      if (!isMe) return null;
      if (item.status === 'read') return <Ionicons name="checkmark-done" size={14} color="#34B7F1" />;
      if (item.status === 'delivered') return <Ionicons name="checkmark-done" size={14} color="#999" />;
      return <Ionicons name="checkmark" size={14} color="#999" />;
    };
    
    return (
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
    );
  };

  const renderEmojiItem = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={styles.emojiItem}
      onPress={() => handleEmojiSelect(item)}
    >
      <Text style={styles.emojiText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#075E54" />
        
        {/* Header with extra top padding */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#089629" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.headerInfo} onPress={() => Alert.alert('Contact Info', chat.name)}>
            <Image source={{ uri: chat.avatar }} style={styles.headerAvatar} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName}>{chat.name}</Text>
              <Text style={styles.headerStatus}>
                {chat.online ? 'Online' : chat.lastSeen}
              </Text>
              {isTyping && <Text style={styles.typingStatus}>typing...</Text>}
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIcon} onPress={handleVideoCall}>
              <Ionicons name="videocam" size={22} color="#069308" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon} onPress={handleCall}>
              <Ionicons name="call" size={20} color="#069308" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon} onPress={openMenu}>
              <Ionicons name="ellipsis-vertical" size={20} color="#069308" />
            </TouchableOpacity>
          </View>
        </View>

        {/* WhatsApp Style Dropdown Menu */}
        <Modal
          transparent={true}
          visible={menuVisible}
          animationType="none"
          onRequestClose={closeMenu}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={closeMenu}
          >
            <Animated.View 
              style={[
                styles.dropdownMenu,
                {
                  transform: [{ translateY: slideAnim }],
                  opacity: fadeAnim,
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => handleMenuItem('contact')}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={22} color="#075E54" />
                <Text style={styles.menuItemText}>Contact info</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => handleMenuItem('media')}
                activeOpacity={0.7}
              >
                <Ionicons name="images-outline" size={22} color="#075E54" />
                <Text style={styles.menuItemText}>Media, links, and docs</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => handleMenuItem('search')}
                activeOpacity={0.7}
              >
                <Ionicons name="search-outline" size={22} color="#075E54" />
                <Text style={styles.menuItemText}>Search</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => handleMenuItem('mute')}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-off-outline" size={22} color="#075E54" />
                <Text style={styles.menuItemText}>Mute notifications</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => handleMenuItem('wallpaper')}
                activeOpacity={0.7}
              >
                <Ionicons name="image-outline" size={22} color="#075E54" />
                <Text style={styles.menuItemText}>Wallpaper</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity 
                style={[styles.menuItem, styles.dangerMenuItem]} 
                onPress={() => handleMenuItem('clear')}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                <Text style={[styles.menuItemText, styles.dangerText]}>Clear chat</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.menuItem, styles.dangerMenuItem]} 
                onPress={() => handleMenuItem('delete')}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={22} color="#FF3B30" />
                <Text style={[styles.menuItemText, styles.dangerText]}>Delete chat</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        {/* Messages with extra bottom padding */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>someone is typing</Text>
              <View style={styles.typingDots}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </View>
          </View>
        )}

        {/* Input Bar with extra bottom padding for keyboard */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="add-circle" size={28} color="#075E54" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
            />
            
            <TouchableOpacity style={styles.emojiButton} onPress={handleEmojiPress}>
              <Ionicons name="happy-outline" size={24} color="#666" />
            </TouchableOpacity>
            
            {message.trim() ? (
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                <Ionicons name="send" size={24} color="#25D366" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micButton}>
                <Ionicons name="mic" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          {/* Extra bottom padding space */}
          <View style={styles.bottomPadding} />
        </KeyboardAvoidingView>

        {/* Custom Emoji Picker Modal */}
        <Modal
          visible={showEmojiPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEmojiPicker(false)}
        >
          <TouchableOpacity 
            style={styles.emojiModalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowEmojiPicker(false)}
          >
            <View style={styles.emojiPickerContainer}>
              <View style={styles.emojiHeader}>
                <Text style={styles.emojiTitle}>Choose an emoji</Text>
                <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                  <Ionicons name="close" size={24} color="#075E54" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={commonEmojis}
                renderItem={renderEmojiItem}
                keyExtractor={(item, index) => index.toString()}
                numColumns={8}
                contentContainerStyle={styles.emojiList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#f5f5f5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 60,
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
    color: '#319708',
  },
  headerStatus: {
    fontSize: 12,
    color: '#2B8108',
  },
  typingStatus: {
    fontSize: 12,
    color: '#088E0F',
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 20,
  },
  headerIcon: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 80,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 240,
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
  menuDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  dangerMenuItem: {
    backgroundColor: '#fff',
  },
  dangerText: {
    color: '#FF3B30',
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
    paddingTop: 10,
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#DCF8C5',
    borderTopRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: '#000',
  },
  theirText: {
    color: '#000',
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
    color: '#666',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
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
  keyboardAvoidingView: {
    backgroundColor: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 34 : 50, // Extra bottom padding for safe area
    backgroundColor: '#fff',
  },
  attachButton: {
    padding: 4,
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
  },
  emojiButton: {
    padding: 4,
  },
  micButton: {
    padding: 4,
  },
  sendButton: {
    padding: 4,
  },
  emojiModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  emojiPickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: Platform.OS === 'ios' ? 400 : 450,
  },
  emojiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  emojiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#075E54',
  },
  emojiList: {
    padding: 10,
  },
  emojiItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    margin: 4,
    borderRadius: 8,
  },
  emojiText: {
    fontSize: 32,
  },
});