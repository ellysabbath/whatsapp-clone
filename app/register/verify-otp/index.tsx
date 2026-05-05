import { View, Text, TextInput, TouchableOpacity,Platform, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import registerApi from '../../../lib/api/registerApi';

export default function VerifyOTPScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { phoneNumber, email, fromRegistration } = params;

  useEffect(() => {
    // Start countdown timer
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    
    try {
      const response = await registerApi.verifyOTP(
        phoneNumber as string,
        email as string,
        otpCode
      );
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Account created successfully!',
          [{ text: 'OK', onPress: () => router.replace('/dashboard/profile') }]
        );
      } else {
        Alert.alert('Verification Failed', response.errors?.otp_code || 'Invalid verification code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    
    setLoading(true);
    
    try {
      const response = await registerApi.resendOTP(
        phoneNumber as string,
        email as string
      );
      
      if (response.success) {
        Alert.alert('Code Sent', 'A new verification code has been sent to your email');
        setTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        
        // Restart timer
        const interval = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setCanResend(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        Alert.alert('Error', response.message || 'Failed to resend code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Code</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <Ionicons name="mail-outline" size={80} color="#000000" style={styles.icon} />
        
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We`ve sent a verification code to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={styles.otpInput}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              editable={!loading}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.verifyButton, otp.join('').length === 6 && !loading && styles.verifyButtonActive]}
          onPress={handleVerify}
          disabled={otp.join('').length !== 6 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.verifyButtonText, otp.join('').length === 6 && styles.verifyButtonTextActive]}>
              Verify & Create Account
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>
            Didn't receive the code?{' '}
          </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResendCode}>
              <Text style={styles.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>Resend in {timer}s</Text>
          )}
        </View>

        <TouchableOpacity 
          style={styles.backLink}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={18} color="#000000" />
          <Text style={styles.backLinkText}>Back to registration</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    color: '#000000',
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
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  email: {
    color: '#000000',
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
  },
  otpInput: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  verifyButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonActive: {
    backgroundColor: '#000000',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  verifyButtonTextActive: {
    color: '#fff',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  timerText: {
    fontSize: 14,
    color: '#999',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  backLinkText: {
    fontSize: 14,
    color: '#000000',
  },
});