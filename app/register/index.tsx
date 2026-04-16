import { View, Text, TextInput, TouchableOpacity, Platform, StyleSheet, Alert, Modal, FlatList, StatusBar, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Country data
const countries = [
  { code: '+1', name: 'United States', flag: '🇺🇸', dialCode: '+1', pattern: '### ### ####' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', pattern: '#### ######' },
  { code: '+91', name: 'India', flag: '🇮🇳', dialCode: '+91', pattern: '##### #####' },
  { code: '+61', name: 'Australia', flag: '🇦🇺', dialCode: '+61', pattern: '# #### ####' },
  { code: '+255', name: 'Tanzania', flag: '🇹🇿', dialCode: '+255', pattern: '## ### ####' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪', dialCode: '+254', pattern: '### ### ###' },
  { code: '+256', name: 'Uganda', flag: '🇺🇬', dialCode: '+256', pattern: '### ### ###' },
  { code: '+250', name: 'Rwanda', flag: '🇷🇼', dialCode: '+250', pattern: '### ### ###' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234', pattern: '### ### ####' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦', dialCode: '+27', pattern: '## ### ####' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬', dialCode: '+20', pattern: '### ### ####' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966', pattern: '# #### ####' },
  { code: '+971', name: 'UAE', flag: '🇦🇪', dialCode: '+971', pattern: '# ### ####' },
  { code: '+49', name: 'Germany', flag: '🇩🇪', dialCode: '+49', pattern: '#### ######' },
  { code: '+33', name: 'France', flag: '🇫🇷', dialCode: '+33', pattern: '# ## ## ## ##' },
  { code: '+81', name: 'Japan', flag: '🇯🇵', dialCode: '+81', pattern: '## #### ####' },
  { code: '+86', name: 'China', flag: '🇨🇳', dialCode: '+86', pattern: '### #### ####' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷', dialCode: '+55', pattern: '## ##### ####' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽', dialCode: '+52', pattern: '## ## ## ####' },
  { code: '+39', name: 'Italy', flag: '🇮🇹', dialCode: '+39', pattern: '## ### ####' },
  { code: '+34', name: 'Spain', flag: '🇪🇸', dialCode: '+34', pattern: '## ### ## ##' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷', dialCode: '+82', pattern: '## ### ####' },
  { code: '+7', name: 'Russia', flag: '🇷🇺', dialCode: '+7', pattern: '### ### ## ##' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩', dialCode: '+62', pattern: '## ### ####' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭', dialCode: '+63', pattern: '### ### ####' },
];

export default function RegisterScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const router = useRouter();

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery)
  );

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Apply pattern if available
    if (selectedCountry.pattern) {
      let formatted = '';
      let patternIndex = 0;
      let cleanedIndex = 0;
      
      while (patternIndex < selectedCountry.pattern.length && cleanedIndex < cleaned.length) {
        if (selectedCountry.pattern[patternIndex] === '#') {
          formatted += cleaned[cleanedIndex];
          cleanedIndex++;
          patternIndex++;
        } else {
          formatted += selectedCountry.pattern[patternIndex];
          patternIndex++;
        }
      }
      return formatted;
    }
    return cleaned;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  const handleNext = () => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 8) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number');
      return;
    }
    
    if (!agreeToTerms) {
      Alert.alert('Agreement Required', 'Please agree to the terms and conditions');
      return;
    }
    
    const fullNumber = `${selectedCountry.dialCode}${cleanNumber}`;
    console.log('Registering with:', fullNumber);
    
    // Navigate to verification screen
    router.push({
      pathname: '/register/verify-otp',
      params: { phoneNumber: fullNumber }
    });
  };

  const selectCountry = (country: typeof countries[0]) => {
    setSelectedCountry(country);
    setModalVisible(false);
    setSearchQuery('');
    setPhoneNumber(''); // Reset phone number when country changes
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
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
          <Text style={styles.headerTitle}>Register</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* WhatsApp Logo */}
          <View style={styles.logoContainer}>
            <Ionicons name="logo-whatsapp" size={60} color="#25D366" />
          </View>

          <Text style={styles.title}>Enter your phone number</Text>
          <Text style={styles.subtitle}>
            WhatsApp will need to verify your phone number. 
            Carrier rates may apply.
          </Text>

          {/* Phone Input */}
          <View style={styles.phoneContainer}>
            <TouchableOpacity 
              style={styles.countrySelector}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryCode}>{selectedCountry.dialCode}</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor="#999"
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              autoFocus
            />
          </View>

          {/* Terms Agreement */}
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setAgreeToTerms(!agreeToTerms)}
          >
            <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
              {agreeToTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.termsText}>
              I agree to the <Text style={styles.linkText}>Terms & Conditions</Text> and 
              <Text style={styles.linkText}> Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Next Button with Forward Arrow */}
          <TouchableOpacity 
            style={[styles.nextButton, phoneNumber.replace(/\D/g, '').length >= 8 && agreeToTerms && styles.nextButtonActive]}
            onPress={handleNext}
            disabled={phoneNumber.replace(/\D/g, '').length < 8 || !agreeToTerms}
          >
            <Text style={[styles.nextButtonText, phoneNumber.replace(/\D/g, '').length >= 8 && agreeToTerms && styles.nextButtonTextActive]}>
              Continue
            </Text>
            <Ionicons 
              name="arrow-forward" 
              size={20} 
              color={phoneNumber.replace(/\D/g, '').length >= 8 && agreeToTerms ? "#fff" : "#999"} 
            />
          </TouchableOpacity>

          {/* Already have account */}
          <TouchableOpacity 
            style={styles.loginLink}
            onPress={() => router.push('/login')}
          >
            <Ionicons name="log-in-outline" size={18} color="#075E54" />
            <Text style={styles.loginLinkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>

          {/* Info Text */}
          <Text style={styles.infoText}>
            <Ionicons name="information-circle-outline" size={12} color="#999" /> 
            {' '}Your phone number will be used for account verification
          </Text>
        </View>

        {/* Country Picker Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#075E54" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search country or code..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
              
              <FlatList
                data={filteredCountries}
                keyExtractor={(item, index) => `${item.dialCode}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.countryItem}
                    onPress={() => selectCountry(item)}
                  >
                    <Text style={styles.countryFlagLarge}>{item.flag}</Text>
                    <View style={styles.countryInfo}>
                      <Text style={styles.countryName}>{item.name}</Text>
                      <Text style={styles.countryDialCode}>{item.dialCode}</Text>
                    </View>
                    {selectedCountry.dialCode === item.dialCode && selectedCountry.name === item.name && (
                      <Ionicons name="checkmark-circle" size={24} color="#25D366" />
                    )}
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
    color: '#0DA043',
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
  logoContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0D9E17',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#0D9E17',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  phoneContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    backgroundColor: '#fff',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    gap: 6,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  phoneInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  termsText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  linkText: {
    color: '#0CA036',
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    marginBottom: 16,
  },
  nextButtonActive: {
    backgroundColor: '#25D366',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  nextButtonTextActive: {
    color: '#fff',
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#0B9741',
    fontWeight: '500',
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A932A',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  countryFlagLarge: {
    fontSize: 30,
    marginRight: 15,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  countryDialCode: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
});