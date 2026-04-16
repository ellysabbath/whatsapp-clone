import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyScreen() {
  const { phoneNumber } = useLocalSearchParams();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Start countdown timer
    if (timer > 0 && !canResend) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setCanResend(true);
    }
  }, [timer]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && index > 0 && !code[index]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    
    // Simulate verification
    setTimeout(() => {
      setIsLoading(false);
      if (verificationCode === '123456') {
        Alert.alert('Success', 'Phone number verified successfully!');
        router.replace('/dashboard');
      } else {
        Alert.alert('Error', 'Invalid verification code. Please try again.');
      }
    }, 1500);
  };

  const handleResendCode = () => {
    setCanResend(false);
    setTimer(60);
    Alert.alert('Code Resent', `A new verification code has been sent to ${phoneNumber}`);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#075E54" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Phone Number</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubble-ellipses" size={60} color="#25D366" />
        </View>

        <Text style={styles.title}>We have sent you an SMS</Text>
        <Text style={styles.subtitle}>
          with a 6-digit verification code to
        </Text>
        <Text style={styles.phoneNumber}>{phoneNumber}</Text>

        {/* OTP Inputs */}
        <View style={styles.otpContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={styles.otpInput}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity 
          style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
          onPress={handleVerify}
          disabled={isLoading}
        >
          <Text style={styles.verifyButtonText}>
            {isLoading ? 'Verifying...' : 'Verify'}
          </Text>
        </TouchableOpacity>

        {/* Resend Section */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn`t receive the code? </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResendCode}>
              <Text style={styles.resendLink}>Resend SMS</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>Resend in {timer}s</Text>
          )}
        </View>

        {/* Alternative Methods */}
        <TouchableOpacity style={styles.callButton}>
          <Ionicons name="call-outline" size={20} color="#075E54" />
          <Text style={styles.callButtonText}>Call me instead</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#075E54',
  },
  headerPlaceholder: {
    width: 32,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#075E54',
    marginTop: 4,
    marginBottom: 32,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  otpInput: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '600',
    backgroundColor: '#f9f9f9',
  },
  verifyButton: {
    backgroundColor: '#25D366',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075E54',
  },
  timerText: {
    fontSize: 14,
    color: '#999',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  callButtonText: {
    fontSize: 14,
    color: '#075E54',
    fontWeight: '500',
  },
});