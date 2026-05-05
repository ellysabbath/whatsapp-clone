import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView, StatusBar, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEMES = {
  light: {
    id: 'light',
    name: 'Light',
    icon: 'sunny-outline',
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
    name: 'Dark',
    icon: 'moon-outline',
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
    name: 'WhatsApp Green',
    icon: 'leaf-outline',
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
    name: 'Midnight Blue',
    icon: 'moon',
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
    name: 'Sunset Orange',
    icon: 'sunny',
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
    name: 'Purple Haze',
    icon: 'color-palette-outline',
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
    name: 'Ocean Teal',
    icon: 'water-outline',
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
    name: 'Cherry Blossom',
    icon: 'flower-outline',
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

export default function ThemeSettingsScreen() {
  const router = useRouter();
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [previewTheme, setPreviewTheme] = useState('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme) {
        setSelectedTheme(savedTheme);
        setPreviewTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const saveTheme = async (themeId: string) => {
    try {
      await AsyncStorage.setItem('app_theme', themeId);
      setSelectedTheme(themeId);
      setPreviewTheme(themeId);
      
      Alert.alert('Theme Applied', `${THEMES[themeId as keyof typeof THEMES].name} theme has been applied successfully`);
    } catch (error) {
      console.error('Error saving theme:', error);
      Alert.alert('Error', 'Failed to save theme');
    }
  };

  const handleThemeSelect = (themeId: string) => {
    setPreviewTheme(themeId);
    saveTheme(themeId);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Theme',
      'Are you sure you want to reset to the default Light theme?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => handleThemeSelect('light')
        }
      ]
    );
  };

  const currentTheme = THEMES[previewTheme as keyof typeof THEMES];
  const currentColors = currentTheme.colors;

  const renderThemeCard = (theme: any) => {
    const isSelected = selectedTheme === theme.id;
    
    return (
      <TouchableOpacity
        key={theme.id}
        style={[
          styles.themeCard, 
          { backgroundColor: currentColors.surface, borderColor: currentColors.border },
          isSelected && { borderColor: '#25D366', borderWidth: 2 }
        ]}
        onPress={() => handleThemeSelect(theme.id)}
        activeOpacity={0.7}
      >
        <View style={styles.themeCardHeader}>
          <View style={[styles.themeIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name={theme.icon as any} size={28} color={theme.colors.primary} />
          </View>
          <View style={styles.themeCardInfo}>
            <Text style={[styles.themeName, { color: currentColors.text }]}>{theme.name}</Text>
            <View style={styles.colorPreview}>
              <View style={[styles.colorDot, { backgroundColor: theme.colors.primary }]} />
              <View style={[styles.colorDot, { backgroundColor: theme.colors.background }]} />
              <View style={[styles.colorDot, { backgroundColor: theme.colors.messageBubble }]} />
            </View>
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={28} color="#25D366" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      <StatusBar barStyle={previewTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={currentColors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentColors.surface, borderBottomColor: currentColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={currentColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>Theme</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Ionicons name="refresh-outline" size={22} color={currentColors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Live Preview Section */}
        <View style={styles.previewSection}>
          <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }]}>Live Preview</Text>
          <View style={[styles.previewChatContainer, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
            {/* Chat Header Preview */}
            <View style={[styles.previewChatHeader, { borderBottomColor: currentColors.border }]}>
              <Ionicons name="arrow-back" size={20} color={currentColors.primary} />
              <View style={styles.previewChatInfo}>
                <View style={[styles.previewAvatar, { backgroundColor: currentColors.primary }]} />
                <View>
                  <Text style={[styles.previewChatName, { color: currentColors.text }]}>Sarah Johnson</Text>
                  <Text style={[styles.previewChatStatus, { color: currentColors.textSecondary }]}>Online</Text>
                </View>
              </View>
              <Ionicons name="ellipsis-vertical" size={20} color={currentColors.primary} />
            </View>

            {/* Chat Messages Preview */}
            <View style={styles.previewMessages}>
              <View style={[styles.previewMessageBubble, styles.previewMessageIncoming, { backgroundColor: currentColors.messageBubble }]}>
                <Text style={[styles.previewMessageText, { color: currentColors.text }]}>
                  Hey! How are you?
                </Text>
                <Text style={[styles.previewMessageTime, { color: currentColors.textSecondary }]}>10:30 AM</Text>
              </View>
              
              <View style={[styles.previewMessageBubble, styles.previewMessageOutgoing, { backgroundColor: currentColors.messageBubbleOutgoing }]}>
                <Text style={[styles.previewMessageText, { color: currentColors.text }]}>
                  I'm good, thanks! How about you?
                </Text>
                <View style={styles.previewMessageFooter}>
                  <Text style={[styles.previewMessageTime, { color: currentColors.textSecondary }]}>10:31 AM</Text>
                  <Ionicons name="checkmark-done" size={14} color={currentColors.primary} />
                </View>
              </View>

              <View style={[styles.previewMessageBubble, styles.previewMessageIncoming, { backgroundColor: currentColors.messageBubble }]}>
                <Text style={[styles.previewMessageText, { color: currentColors.text }]}>
                  Doing great! Want to grab coffee later? ☕
                </Text>
                <Text style={[styles.previewMessageTime, { color: currentColors.textSecondary }]}>10:32 AM</Text>
              </View>
            </View>

            {/* Message Input Preview */}
            <View style={[styles.previewInputContainer, { borderTopColor: currentColors.border }]}>
              <Ionicons name="happy-outline" size={24} color={currentColors.primary} />
              <View style={[styles.previewInput, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
                <Text style={{ color: currentColors.textSecondary }}>Type a message...</Text>
              </View>
              <Ionicons name="mic-outline" size={24} color={currentColors.primary} />
            </View>
          </View>
        </View>

        {/* Theme Options */}
        <View style={styles.themesSection}>
          <Text style={[styles.sectionTitle, { color: currentColors.textSecondary }]}>Choose Theme</Text>
          {Object.values(THEMES).map(renderThemeCard)}
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color={currentColors.textSecondary} />
          <Text style={[styles.infoText, { color: currentColors.textSecondary }]}>
            Theme will be applied across the entire app
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 66,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  resetButton: {
    padding: 4,
  },
  previewSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewChatContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  previewChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 0.5,
  },
  previewChatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginLeft: 10,
  },
  previewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  previewChatName: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewChatStatus: {
    fontSize: 11,
  },
  previewMessages: {
    padding: 12,
    gap: 12,
  },
  previewMessageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
  },
  previewMessageIncoming: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  previewMessageOutgoing: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  previewMessageText: {
    fontSize: 14,
    marginBottom: 4,
  },
  previewMessageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  previewMessageTime: {
    fontSize: 10,
  },
  previewInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 0.5,
    gap: 10,
  },
  previewInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  themesSection: {
    padding: 16,
    paddingTop: 0,
  },
  themeCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
  },
  themeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  themeCardInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
  },
  colorPreview: {
    flexDirection: 'row',
    gap: 6,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#ddd',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 20,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 12,
  },
});