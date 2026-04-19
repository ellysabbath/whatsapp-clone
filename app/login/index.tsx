import { View, Text, TextInput, TouchableOpacity, Platform, StyleSheet, Alert, Modal, FlatList, KeyboardAvoidingView, ScrollView, Keyboard, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import loginApi from '../../lib/api/loginApi';
import { useUser } from '../../context/UserContext';

const countries = [
  { code: '+1', name: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: '+91', name: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: '+61', name: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { code: '+255', name: 'Tanzania', flag: '🇹🇿', dialCode: '+255' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { code: '+256', name: 'Uganda', flag: '🇺🇬', dialCode: '+256' },
  { code: '+250', name: 'Rwanda', flag: '🇷🇼', dialCode: '+250' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦', dialCode: '+27' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬', dialCode: '+20' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966' },
  { code: '+971', name: 'UAE', flag: '🇦🇪', dialCode: '+971' },
  { code: '+49', name: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: '+33', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: '+81', name: 'Japan', flag: '🇯🇵', dialCode: '+81' },
  { code: '+86', name: 'China', flag: '🇨🇳', dialCode: '+86' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷', dialCode: '+55' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽', dialCode: '+52' },
  { code: '+39', name: 'Italy', flag: '🇮🇹', dialCode: '+39' },
  { code: '+34', name: 'Spain', flag: '🇪🇸', dialCode: '+34' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷', dialCode: '+82' },
  { code: '+7', name: 'Russia', flag: '🇷🇺', dialCode: '+7' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩', dialCode: '+62' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭', dialCode: '+63' },
];

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const router = useRouter();
  const { login, user, isAuthenticated } = useUser();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await loginApi.isAuthenticated();
      if (authenticated) {
        router.replace('/dashboard');
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery)
  );

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Format based on country pattern (simplified)
    if (selectedCountry.dialCode === '+255') {
      // Tanzanian format: ### ### ###
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;
    }
    
    return cleaned;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const handleLogin = async () => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 8) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    const fullNumber = `${selectedCountry.dialCode}${cleanNumber}`;
    
    setIsLoading(true);
    
    try {
      // First check if phone number exists
      setCheckingPhone(true);
      const checkResponse = await loginApi.checkPhoneNumber(fullNumber);
      
      if (!checkResponse.valid) {
        Alert.alert('Error', checkResponse.message || 'Invalid phone number');
        setIsLoading(false);
        setCheckingPhone(false);
        return;
      }
      
      if (!checkResponse.user_exists) {
        Alert.alert(
          'Account Not Found',
          'No account exists with this phone number. Would you like to create a new account?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Create Account', onPress: () => router.push('/register') }
          ]
        );
        setIsLoading(false);
        setCheckingPhone(false);
        return;
      }
      
      // Proceed with login
      const loginResponse = await login(fullNumber);
      
      if (loginResponse) {
        Alert.alert('Success', 'Login successful!', [
          { text: 'OK', onPress: () => router.replace('/dashboard') }
        ]);
      } else {
        Alert.alert('Login Failed', 'Unable to login. Please try again.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Error', error.message || 'Failed to login. Please check your connection.');
    } finally {
      setIsLoading(false);
      setCheckingPhone(false);
    }
  };

  const handleCreateAccount = () => {
    router.push('/register');
  };

  const selectCountry = (country: typeof countries[0]) => {
    setSelectedCountry(country);
    setModalVisible(false);
    setSearchQuery('');
    setPhoneNumber('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ApTec</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Ionicons name="logo-whatsapp" size={80} color="#000000" />
          </View>
          <Text style={styles.title}>Welcome to ApTec</Text>
          <Text style={styles.subtitle}>Please enter your phone number to continue</Text>

          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.countrySelector} onPress={() => setModalVisible(true)}>
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryCode}>{selectedCountry.dialCode}</Text>
              <Ionicons name="chevron-down" size={16} color="#000000" />
            </TouchableOpacity>
            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor="#999"
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <Text style={styles.buttonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#000000" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.createAccountButton} 
            onPress={handleCreateAccount}
            disabled={isLoading}
          >
            <Ionicons name="person-add-outline" size={20} color="#000000" />
            <Text style={styles.createAccountText}>Create new account</Text>
          </TouchableOpacity>

          <Text style={styles.terms}>Your phone number will be used for account verification</Text>
        </View>
      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#000000" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#000000" />
                </TouchableOpacity>
              )}
            </View>
            
            <FlatList
              data={filteredCountries}
              keyExtractor={(item, index) => `${item.dialCode}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.countryItem} onPress={() => selectCountry(item)}>
                  <Text style={styles.countryFlagLarge}>{item.flag}</Text>
                  <View style={styles.countryInfo}>
                    <Text style={styles.countryName}>{item.name}</Text>
                    <Text style={styles.countryDialCode}>{item.dialCode}</Text>
                  </View>
                  {selectedCountry.dialCode === item.dialCode && selectedCountry.name === item.name && (
                    <Ionicons name="checkmark-circle" size={24} color="#000000" />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 60, 
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 1,
  },
  headerRight: {
    width: 32,
  },
  scrollContent: { 
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  logoContainer: {
    marginBottom: 20,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#000000', 
    marginTop: 10, 
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: { 
    fontSize: 15, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: { 
    flexDirection: 'row', 
    borderWidth: 1.5, 
    borderColor: '#e0e0e0', 
    borderRadius: 12, 
    marginBottom: 20, 
    width: '100%',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  countrySelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    backgroundColor: '#f8f9fa', 
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  countryFlag: { fontSize: 20 },
  countryCode: { fontSize: 16, fontWeight: '600', color: '#000000' },
  phoneInput: { 
    flex: 1, 
    padding: 14, 
    fontSize: 16, 
    color: '#000000',
    backgroundColor: '#fff',
  },
  button: { 
    backgroundColor: '#E8E8E8', 
    paddingHorizontal: 30, 
    paddingVertical: 14, 
    borderRadius: 30, 
    width: '100%', 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#000000' 
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#000000',
    fontSize: 14,
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#000000',
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  createAccountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  terms: { 
    fontSize: 12, 
    color: '#666', 
    textAlign: 'center', 
    marginTop: 10,
    marginBottom: Platform.OS === 'ios' ? 10 : 20,
    lineHeight: 18,
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContainer: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: '80%' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#e0e0e0' 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#000000' 
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    margin: 15, 
    paddingHorizontal: 15, 
    backgroundColor: '#f0f0f0', 
    borderRadius: 12 
  },
  searchIcon: { 
    marginRight: 10 
  },
  searchInput: { 
    flex: 1, 
    paddingVertical: 12, 
    fontSize: 16,
    color: '#000000'
  },
  countryItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#f0f0f0' 
  },
  countryFlagLarge: { 
    fontSize: 32, 
    marginRight: 15 
  },
  countryInfo: { 
    flex: 1 
  },
  countryName: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#000000' 
  },
  countryDialCode: { 
    fontSize: 13, 
    color: '#666', 
    marginTop: 2 
  },
});