import React, { useState, useRef } from 'react';
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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';

export default function QRScreen() {
  const router = useRouter();
  const viewShotRef = useRef<ViewShot>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrImageUri, setQrImageUri] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  
  const QR_LINK = 'https://google.play/aptec';

  // Generate QR code and convert to image
  const generateAndShare = async () => {
    setIsLoading(true);
    try {
      setQrGenerated(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture();
        setQrImageUri(uri);
        
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share QR Code',
          UTI: 'public.png',
        });
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate QR code only
  const generateQRCode = async () => {
    setIsLoading(true);
    try {
      setQrGenerated(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture();
        setQrImageUri(uri);
        setShowQRModal(true);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  // Share QR code
  const shareQRCode = async () => {
    if (!qrImageUri) {
      Alert.alert('Error', 'No QR code to share');
      return;
    }
    
    setIsLoading(true);
    try {
      await Sharing.shareAsync(qrImageUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share QR Code',
        UTI: 'public.png',
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
      Alert.alert('Error', 'Failed to share QR code');
    } finally {
      setIsLoading(false);
    }
  };

  // Save QR code
  const saveQRCode = async () => {
    if (!qrImageUri) {
      Alert.alert('Error', 'No QR code to save');
      return;
    }
    
    setIsLoading(true);
    try {
      const fileName = `qr_code_${Date.now()}.png`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.copyAsync({
        from: qrImageUri,
        to: fileUri,
      });

      Alert.alert('Success', 'QR Code saved successfully!');
    } catch (error) {
      console.error('Error saving QR code:', error);
      Alert.alert('Error', 'Failed to save QR code');
    } finally {
      setIsLoading(false);
    }
  };

  // Share link
  const shareLink = async () => {
    try {
      await Share.share({
        message: QR_LINK,
      });
    } catch (error) {
      console.error('Error sharing link:', error);
      Alert.alert('Error', 'Failed to share link');
    }
  };

  // Copy link
  const copyLinkToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(QR_LINK);
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

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* WhatsApp Green Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#064218" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!qrGenerated ? (
          // Generate Screen
          <View style={styles.generateContainer}>
            <View style={styles.qrIllustration}>
              <View style={styles.qrCircle}>
                <Ionicons name="qr-code" size={80} color="#25D366" />
              </View>
            </View>
            
            <Text style={styles.title}>Generate QR Code</Text>
            <Text style={styles.subtitle}>
              Create a QR code for your link and share it with anyone
            </Text>
            
            <View style={styles.linkCard}>
              <Text style={styles.linkLabel}>Your link</Text>
              <Text style={styles.linkValue} numberOfLines={2}>
                {QR_LINK}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.greenButton} 
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
              onPress={generateQRCode}
              disabled={isLoading}
            >
              <Text style={styles.textButtonText}>Generate only</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // QR Code Display
          <View>
            {/* QR Code Card */}
            <View style={styles.qrCard}>
              <View style={styles.qrHeader}>
                <View style={styles.qrHeaderIcon}>
                  <Ionicons name="checkmark-circle" size={24} color="#25D366" />
                </View>
                <Text style={styles.qrHeaderTitle}>QR Code ready</Text>
                <Text style={styles.qrHeaderSubtitle}>Scan to open the link</Text>
              </View>

              {/* Hidden capture component */}
              <ViewShot
                ref={viewShotRef}
                options={{ format: 'png', quality: 1.0 }}
                style={styles.hiddenCapture}
              >
                <View style={styles.qrCaptureContent}>
                  <View style={styles.qrCaptureWrapper}>
                    <QRCode
                      value={QR_LINK}
                      size={200}
                      color="#000"
                      backgroundColor="#fff"
                    />
                    <Text style={styles.qrCaptureText}>{QR_LINK}</Text>
                  </View>
                </View>
              </ViewShot>

              {/* Display QR Code */}
              {qrImageUri && (
                <View style={styles.qrImageContainer}>
                  <Image 
                    source={{ uri: qrImageUri }} 
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionShare} onPress={shareQRCode}>
                  <Ionicons name="share-social" size={22} color="#fff" />
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionSave} onPress={saveQRCode}>
                  <Ionicons name="download-outline" size={22} color="#075E54" />
                  <Text style={[styles.actionText, { color: '#075E54' }]}>Save</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionNew} onPress={resetQRCode}>
                  <Ionicons name="refresh-outline" size={22} color="#075E54" />
                  <Text style={[styles.actionText, { color: '#075E54' }]}>New</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Options Section */}
            <View style={styles.optionsCard}>
              <Text style={styles.optionsTitle}>Other options</Text>
              
              <TouchableOpacity style={styles.optionItem} onPress={shareLink}>
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, { backgroundColor: '#DCF8C6' }]}>
                    <Ionicons name="share-outline" size={20} color="#25D366" />
                  </View>
                  <View>
                    <Text style={styles.optionTitle}>Share link</Text>
                    <Text style={styles.optionDesc}>Send the link directly</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionItem} onPress={copyLinkToClipboard}>
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, { backgroundColor: '#E8F0FE' }]}>
                    <Ionicons name="copy-outline" size={20} color="#2196F3" />
                  </View>
                  <View>
                    <Text style={styles.optionTitle}>Copy link</Text>
                    <Text style={styles.optionDesc}>Copy to clipboard</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>How to scan</Text>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>1</Text>
                </View>
                <Text style={styles.instructionText}>Open your camera app</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>2</Text>
                </View>
                <Text style={styles.instructionText}>Point at the QR code</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>3</Text>
                </View>
                <Text style={styles.instructionText}>Tap the notification to open</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Preview Modal - WhatsApp Style */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowQRModal(false)}>
              <Ionicons name="close" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>QR Code</Text>
            <TouchableOpacity onPress={shareQRCode}>
              <Ionicons name="share-social" size={22} color="#25D366" />
            </TouchableOpacity>
          </View>

          {qrImageUri && (
            <View style={styles.modalContent}>
              <Image 
                source={{ uri: qrImageUri }} 
                style={styles.modalImage}
                resizeMode="contain"
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalSaveButton} onPress={saveQRCode}>
                  <Ionicons name="download-outline" size={20} color="#075E54" />
                  <Text style={styles.modalSaveText}>Save to device</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.modalCopyButton} onPress={copyLinkToClipboard}>
                  <Ionicons name="copy-outline" size={20} color="#075E54" />
                  <Text style={styles.modalCopyText}>Copy link</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 80,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#022D04',
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
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#075E54',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  linkCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 32,
  },
  linkLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  linkValue: {
    fontSize: 13,
    color: '#075E54',
    fontWeight: '500',
  },
  greenButton: {
    backgroundColor: '#25D366',
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
    color: '#999',
  },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  qrHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  qrHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#075E54',
    marginBottom: 4,
  },
  qrHeaderSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  hiddenCapture: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
  },
  qrCaptureContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  qrCaptureWrapper: {
    alignItems: 'center',
  },
  qrCaptureText: {
    fontSize: 11,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    maxWidth: 220,
  },
  qrImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrImage: {
    width: 280,
    height: 280,
    borderRadius: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionShare: {
    flex: 2,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 30,
  },
  actionSave: {
    flex: 1,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#075E54',
  },
  actionNew: {
    flex: 1,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  optionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
    borderTopColor: '#e0e0e0',
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
    color: '#000',
  },
  optionDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  instructionsCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 40,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075E54',
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
    backgroundColor: '#25D366',
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
    color: '#666',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
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
    backgroundColor: '#F5F5F5',
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
    color: '#075E54',
  },
  modalCopyButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    color: '#075E54',
  },
});