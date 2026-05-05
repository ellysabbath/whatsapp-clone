import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Modal,
  Image,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Theme definitions
const THEMES = {
  light: {
    id: 'light',
    colors: {
      primary: '#075E54',
      primaryLight: '#e8f5e9',
      success: '#25D366',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      cardBg: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      textTertiary: '#999999',
      border: '#E0E0E0',
      placeholder: '#CCCCCC',
    }
  },
  dark: {
    id: 'dark',
    colors: {
      primary: '#128C7E',
      primaryLight: '#1a2f2a',
      success: '#25D366',
      background: '#111B21',
      surface: '#202C33',
      cardBg: '#202C33',
      text: '#E9EDEF',
      textSecondary: '#AEBAC1',
      textTertiary: '#8696A0',
      border: '#2A3942',
      placeholder: '#3D4B55',
    }
  },
  whatsappGreen: {
    id: 'whatsappGreen',
    colors: {
      primary: '#25D366',
      primaryLight: '#e8f5e9',
      success: '#25D366',
      background: '#FFFFFF',
      surface: '#F0F2F5',
      cardBg: '#FFFFFF',
      text: '#111B21',
      textSecondary: '#54656F',
      textTertiary: '#8696A0',
      border: '#E9EDEF',
      placeholder: '#CCCCCC',
    }
  },
  midnightBlue: {
    id: 'midnightBlue',
    colors: {
      primary: '#1E88E5',
      primaryLight: '#102a44',
      success: '#1E88E5',
      background: '#0A1929',
      surface: '#132F4C',
      cardBg: '#132F4C',
      text: '#FFFFFF',
      textSecondary: '#B0C4DE',
      textTertiary: '#7B9BB5',
      border: '#1E3A5F',
      placeholder: '#2C4A6E',
    }
  },
  sunsetOrange: {
    id: 'sunsetOrange',
    colors: {
      primary: '#FF5722',
      primaryLight: '#FFE0B2',
      success: '#FF5722',
      background: '#FFF3E0',
      surface: '#FFE0B2',
      cardBg: '#FFE0B2',
      text: '#4E342E',
      textSecondary: '#8D6E63',
      textTertiary: '#A1887F',
      border: '#FFCC80',
      placeholder: '#FFCC80',
    }
  },
  purpleHaze: {
    id: 'purpleHaze',
    colors: {
      primary: '#9C27B0',
      primaryLight: '#E1BEE7',
      success: '#9C27B0',
      background: '#F3E5F5',
      surface: '#E1BEE7',
      cardBg: '#E1BEE7',
      text: '#4A148C',
      textSecondary: '#7B1FA2',
      textTertiary: '#9C27B0',
      border: '#CE93D8',
      placeholder: '#CE93D8',
    }
  },
  oceanTeal: {
    id: 'oceanTeal',
    colors: {
      primary: '#00897B',
      primaryLight: '#B2DFDB',
      success: '#00897B',
      background: '#E0F2F1',
      surface: '#B2DFDB',
      cardBg: '#B2DFDB',
      text: '#004D40',
      textSecondary: '#00695C',
      textTertiary: '#00897B',
      border: '#80CBC4',
      placeholder: '#80CBC4',
    }
  },
  cherryBlossom: {
    id: 'cherryBlossom',
    colors: {
      primary: '#E91E63',
      primaryLight: '#F8BBD0',
      success: '#E91E63',
      background: '#FCE4EC',
      surface: '#F8BBD0',
      cardBg: '#F8BBD0',
      text: '#880E4F',
      textSecondary: '#AD1457',
      textTertiary: '#C2185B',
      border: '#F48FB1',
      placeholder: '#F48FB1',
    }
  },
};

export default function QRScreen() {
  const router = useRouter();
  const qrRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrImageUri, setQrImageUri] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [qrLink, setQrLink] = useState('');

  // Get current theme colors
  const theme = THEMES[currentTheme as keyof typeof THEMES];
  const colors = theme.colors;

  // Load theme and user data
  useEffect(() => {
    loadTheme();
    loadUserData();
  }, []);

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

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserProfile(user);
        const apiUrl = Platform.select({
          web: window.location.origin,
          default: 'https://aptecproject.pythonanywhere.com',
        });
        setQrLink(`${apiUrl}/invite/${user.id || user.mobile_number}`);
      } else {
        setQrLink('https://aptecproject.pythonanywhere.com/download');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setQrLink('https://aptecproject.pythonanywhere.com/download');
    }
  };

  // Convert SVG to Data URL
  const convertSVGtoDataURL = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!qrRef.current) {
        resolve(null);
        return;
      }
      
      try {
        if (qrRef.current.toDataURL) {
          // Mobile: QRCode component has toDataURL method
          qrRef.current.toDataURL((dataURL: string) => {
            resolve(dataURL);
          });
        } else {
          // Web: Get SVG element and convert
          let svg = qrRef.current;
          if (typeof svg === 'string') {
            svg = document.querySelector('svg');
          }
          
          if (!svg) {
            resolve(null);
            return;
          }
          
          const serializer = new XMLSerializer();
          let svgString = serializer.serializeToString(svg);
          svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
          
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, 400, 400);
            const pngUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);
            resolve(pngUrl);
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.src = url;
        }
      } catch (error) {
        console.error('Error converting SVG:', error);
        resolve(null);
      }
    });
  };

  // Generate QR code
  const generateQRImage = async (): Promise<string | null> => {
    setIsLoading(true);
    try {
      setQrGenerated(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataURL = await convertSVGtoDataURL();
      if (dataURL) {
        setQrImageUri(dataURL);
        return dataURL;
      }
      return null;
    } catch (error) {
      console.error('Error generating QR image:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Generate and share QR code
  const generateAndShare = async () => {
    const dataURL = await generateQRImage();
    if (dataURL) {
      await shareQRCodeImage(dataURL);
    } else {
      Alert.alert('Error', 'Failed to generate QR code');
    }
  };

  // Generate QR only
  const generateQROnly = async () => {
    const dataURL = await generateQRImage();
    if (dataURL) {
      setShowQRModal(true);
    } else {
      Alert.alert('Error', 'Failed to generate QR code');
    }
  };

  // Share QR code image - SIMPLIFIED VERSION
  const shareQRCodeImage = async (imageDataURL?: string) => {
    const imageToShare = imageDataURL || qrImageUri;
    if (!imageToShare) {
      Alert.alert('Error', 'No QR code to share');
      return;
    }
    
    setIsLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Web sharing
        const response = await fetch(imageToShare);
        const blob = await response.blob();
        const file = new File([blob], 'qrcode.png', { type: 'image/png' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'My QR Code',
            text: 'Scan this QR code to connect with me on ApTec!',
            files: [file],
          });
        } else {
          const link = document.createElement('a');
          link.href = imageToShare;
          link.download = `qrcode_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          Alert.alert('Success', 'QR code downloaded');
        }
      } else {
        // Mobile: Share the link directly instead of image
        await Share.share({
          message: `${qrLink}\n\nScan this QR code or click the link to connect with me on ApTec!`,
          title: 'My QR Code',
        });
        Alert.alert('Success', 'Link shared successfully!');
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      // Fallback: Share just the link
      try {
        await Share.share({
          message: qrLink,
          title: 'Join me on ApTec',
        });
        Alert.alert('Success', 'Link shared successfully!');
      } catch (fallbackError) {
        Alert.alert('Error', 'Failed to share. Please copy the link manually.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Save QR code - SIMPLIFIED VERSION
  const saveQRCode = async () => {
    if (!qrImageUri) {
      Alert.alert('Error', 'No QR code to save');
      return;
    }
    
    setIsLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Web download
        const link = document.createElement('a');
        link.href = qrImageUri;
        link.download = `qrcode_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Success', 'QR Code downloaded!');
      } else {
        // Mobile: Save using Sharing (simpler)
        const fileName = `${FileSystem.cacheDirectory}qrcode_${Date.now()}.png`;
        const base64Data = qrImageUri.split(',')[1];
        
        await FileSystem.writeAsStringAsync(fileName, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        await Sharing.shareAsync(fileName, {
          mimeType: 'image/png',
          dialogTitle: 'Save QR Code',
        });
        
        Alert.alert('Success', 'QR code ready to save!');
      }
    } catch (error) {
      console.error('Error saving QR code:', error);
      Alert.alert('Info', 'Take a screenshot to save the QR code');
    } finally {
      setIsLoading(false);
    }
  };

  // Share link
  const shareLink = async () => {
    try {
      if (Platform.OS === 'web' && navigator.share) {
        await navigator.share({
          title: 'Join me on ApTec',
          text: qrLink,
        });
      } else {
        await Share.share({
          message: qrLink,
          title: 'Join me on ApTec',
        });
      }
    } catch (error) {
      console.error('Error sharing link:', error);
      Alert.alert('Error', 'Failed to share link');
    }
  };

  // Copy link
  const copyLinkToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(qrLink);
      Alert.alert('Success', 'Link copied to clipboard!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  // Reset
  const resetQRCode = () => {
    setQrGenerated(false);
    setQrImageUri(null);
    setShowQRModal(false);
  };

  // Handle back button
  const handleGoBack = () => {
    router.push('/dashboard');
  };

  // Get display name
  const getDisplayName = () => {
    if (userProfile?.full_name) return userProfile.full_name;
    if (userProfile?.mobile_number) return userProfile.mobile_number;
    return 'ApTec User';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>QR Code</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!qrGenerated ? (
          // Generate Screen
          <View style={styles.generateContainer}>
            <View style={styles.qrIllustration}>
              <View style={[styles.qrCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="qr-code" size={80} color={colors.primary} />
              </View>
            </View>
            
            <Text style={[styles.title, { color: colors.primary }]}>Generate QR Code</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Create a QR code for your profile and share it with anyone
            </Text>
            
            <View style={[styles.linkCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.linkLabel, { color: colors.textTertiary }]}>Your profile link</Text>
              <Text style={[styles.linkValue, { color: colors.primary }]} numberOfLines={2}>
                {qrLink}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.greenButton, { backgroundColor: colors.success }]} 
              onPress={generateAndShare}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="qr-code" size={20} color="#fff" />
                  <Text style={styles.greenButtonText}>Generate & Share</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.textButton} 
              onPress={generateQROnly}
              disabled={isLoading}
            >
              <Text style={[styles.textButtonText, { color: colors.textTertiary }]}>Generate only</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // QR Code Display
          <View>
            {/* QR Code Card */}
            <View style={[styles.qrCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.qrHeader}>
                <View style={[styles.qrHeaderIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                </View>
                <Text style={[styles.qrHeaderTitle, { color: colors.primary }]}>QR Code ready</Text>
                <Text style={[styles.qrHeaderSubtitle, { color: colors.textTertiary }]}>Scan to connect</Text>
              </View>

              {/* QR Code Display */}
              <View style={styles.qrDisplayContainer}>
                <View style={[styles.qrWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <QRCode
                    value={qrLink}
                    size={250}
                    color={colors.text}
                    backgroundColor={colors.background}
                    getRef={(ref) => { qrRef.current = ref; }}
                  />
                </View>
                <Text style={[styles.qrLinkText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {qrLink}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionShare, { backgroundColor: colors.success }]} onPress={() => shareQRCodeImage()}>
                  <Ionicons name="share-social" size={22} color="#fff" />
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionSave, { borderColor: colors.primary }]} onPress={saveQRCode}>
                  <Ionicons name="download-outline" size={22} color={colors.primary} />
                  <Text style={[styles.actionSaveText, { color: colors.primary }]}>Save</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionNew, { borderColor: colors.border }]} onPress={resetQRCode}>
                  <Ionicons name="refresh-outline" size={22} color={colors.text} />
                  <Text style={[styles.actionNewText, { color: colors.text }]}>New</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Options Section */}
            <View style={[styles.optionsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.optionsTitle, { color: colors.textSecondary }]}>Other options</Text>
              
              <TouchableOpacity style={[styles.optionItem, { borderTopColor: colors.border }]} onPress={shareLink}>
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="share-outline" size={20} color={colors.success} />
                  </View>
                  <View>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>Share link</Text>
                    <Text style={[styles.optionDesc, { color: colors.textTertiary }]}>Send the link directly</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.optionItem, { borderTopColor: colors.border }]} onPress={copyLinkToClipboard}>
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="copy-outline" size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>Copy link</Text>
                    <Text style={[styles.optionDesc, { color: colors.textTertiary }]}>Copy to clipboard</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            <View style={[styles.instructionsCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.instructionsTitle, { color: colors.primary }]}>How to scan</Text>
              <View style={styles.instructionItem}>
                <View style={[styles.instructionNumber, { backgroundColor: colors.success }]}>
                  <Text style={styles.instructionNumberText}>1</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>Open your camera app</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={[styles.instructionNumber, { backgroundColor: colors.success }]}>
                  <Text style={styles.instructionNumberText}>2</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>Point at the QR code</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={[styles.instructionNumber, { backgroundColor: colors.success }]}>
                  <Text style={styles.instructionNumberText}>3</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>Tap the notification to connect</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Preview Modal */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.cardBg }]}>
            <TouchableOpacity onPress={() => setShowQRModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>QR Code</Text>
            <TouchableOpacity onPress={() => shareQRCodeImage()}>
              <Ionicons name="share-social" size={22} color={colors.success} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {qrImageUri ? (
              <Image 
                source={{ uri: qrImageUri }} 
                style={styles.modalImage}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.qrWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <QRCode
                  value={qrLink}
                  size={250}
                  color={colors.text}
                  backgroundColor={colors.background}
                />
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalSaveButton, { backgroundColor: colors.surface }]} onPress={saveQRCode}>
                <Ionicons name="download-outline" size={20} color={colors.primary} />
                <Text style={[styles.modalSaveText, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.modalCopyButton, { backgroundColor: colors.surface }]} onPress={copyLinkToClipboard}>
                <Ionicons name="copy-outline" size={20} color={colors.primary} />
                <Text style={[styles.modalCopyText, { color: colors.primary }]}>Copy link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 80,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  generateContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  qrIllustration: {
    marginBottom: 24,
  },
  qrCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  linkCard: {
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 32,
  },
  linkLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  linkValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  greenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: '100%',
    marginBottom: 12,
  },
  greenButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  textButton: {
    paddingVertical: 8,
  },
  textButtonText: {
    fontSize: 14,
  },
  qrCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0.5,
  },
  qrHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  qrHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  qrHeaderSubtitle: {
    fontSize: 13,
  },
  qrDisplayContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrWrapper: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 0.5,
  },
  qrLinkText: {
    fontSize: 11,
    textAlign: 'center',
    maxWidth: '90%',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionShare: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 30,
  },
  actionSave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
  },
  actionNew: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  actionSaveText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionNewText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionsCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 0.5,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 0.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  instructionsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 40,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  instructionText: {
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalImage: {
    width: 300,
    height: 300,
    borderRadius: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
    width: '100%',
  },
  modalSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 30,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalCopyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 30,
  },
  modalCopyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});