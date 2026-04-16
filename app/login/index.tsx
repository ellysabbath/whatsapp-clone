import { View, Text, TextInput, TouchableOpacity, Platform, StyleSheet, Alert, Modal, FlatList } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
  const router = useRouter();

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery)
  );

  const handleLogin = () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    router.replace('/(tabs)/chats');
  };

  const handleCreateAccount = () => {
    router.push('/profile-setup');
  };

  const selectCountry = (country: typeof countries[0]) => {
    setSelectedCountry(country);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#075E54" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter Phone Number</Text>
      </View>

      <View style={styles.content}>
        <Ionicons name="logo-whatsapp" size={80} color="#25D366" />
        <Text style={styles.title}>Welcome to WhatsApp Clone</Text>
        <Text style={styles.subtitle}>Please enter your phone number to continue</Text>

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.countrySelector} onPress={() => setModalVisible(true)}>
            <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
            <Text style={styles.countryCode}>{selectedCountry.dialCode}</Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
          <TextInput
            style={styles.phoneInput}
            placeholder="Phone number"
            placeholderTextColor="#999"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.createAccountButton} onPress={handleCreateAccount}>
          <Ionicons name="person-add-outline" size={20} color="#075E54" />
          <Text style={styles.createAccountText}>Create new account</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>Your phone number will be used for account verification</Text>
      </View>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
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
                <TouchableOpacity style={styles.countryItem} onPress={() => selectCountry(item)}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingTop: Platform.OS === 'ios' ? 50 : 15, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#075E54', marginLeft: 15 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#075E54', marginTop: 20, marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  inputContainer: { flexDirection: 'row', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 20, width: '100%' },
  countrySelector: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: '#f0f0f0', borderTopLeftRadius: 8, borderBottomLeftRadius: 8, gap: 5 },
  countryFlag: { fontSize: 18 },
  countryCode: { fontSize: 16, fontWeight: '500', color: '#333' },
  phoneInput: { flex: 1, padding: 12, fontSize: 16, color: '#333' },
  button: { 
    backgroundColor: '#25D366', 
    paddingHorizontal: 30, 
    paddingVertical: 12, 
    borderRadius: 25, 
    width: '100%', 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
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
    color: '#999',
    fontSize: 14,
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#075E54',
    width: '100%',
  },
  createAccountText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#075E54',
  },
  terms: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#075E54' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 15, paddingHorizontal: 15, backgroundColor: '#f0f0f0', borderRadius: 10 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  countryItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  countryFlagLarge: { fontSize: 30, marginRight: 15 },
  countryInfo: { flex: 1 },
  countryName: { fontSize: 16, fontWeight: '500', color: '#333' },
  countryDialCode: { fontSize: 13, color: '#999', marginTop: 2 },
});