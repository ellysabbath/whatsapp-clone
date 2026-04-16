import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Platform, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  points: number;
}

interface Response {
  userId: string;
  userName: string;
  answers: any[];
  totalScore?: number;
  maxScore?: number;
  percentage?: number;
  submittedAt: string;
  graded: boolean;
  gradedAt?: string;
  gradedBy?: string;
}

interface Form {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  composer: string;
  status: string;
  responses: Response[];
}

const CURRENT_USER = 'Current User';

export default function FormListScreen() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const storedForms = await AsyncStorage.getItem('evangelistic_forms');
      if (storedForms) {
        const allForms: Form[] = JSON.parse(storedForms);
        // Only show forms created by current user
        const composedForms = allForms.filter(form => form.composer === CURRENT_USER);
        setForms(composedForms);
      } else {
        setForms([]);
      }
    } catch (error) {
      console.error('Error loading forms:', error);
      Alert.alert('Error', 'Failed to load forms');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadForms();
    setRefreshing(false);
  };

  const handleFormPress = (form: Form) => {
    router.push(`/dashboard/formId/${form.id}`);
  };

  const deleteForm = async (formId: string) => {
    Alert.alert(
      'Delete Form',
      'Are you sure you want to delete this form? All responses will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const storedForms = await AsyncStorage.getItem('evangelistic_forms');
              if (storedForms) {
                const allForms: Form[] = JSON.parse(storedForms);
                const filteredForms = allForms.filter(f => f.id !== formId);
                await AsyncStorage.setItem('evangelistic_forms', JSON.stringify(filteredForms));
                await loadForms();
                Alert.alert('Success', 'Form deleted successfully');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete form');
            }
          }
        }
      ]
    );
  };

  const renderFormCard = ({ item }: { item: Form }) => {
    const pendingCount = item.responses.filter(r => !r.graded).length;
    
    return (
      <TouchableOpacity 
        style={styles.formCard}
        onPress={() => handleFormPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text" size={24} color="#fff" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.formTitle}>{item.title}</Text>
            <Text style={styles.formComposer}>Created: {new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteForm(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {item.description && (
          <Text style={styles.formDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.stat}>
            <Ionicons name="help-circle-outline" size={14} color="#666" />
            <Text style={styles.statText}>{item.questions.length} questions</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.statText}>{item.responses.length} responses</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="star-outline" size={14} color="#666" />
            <Text style={styles.statText}>
              Total: {item.questions.reduce((sum, q) => sum + q.points, 0)} pts
            </Text>
          </View>
        </View>

        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Ionicons name="time-outline" size={14} color="#fff" />
            <Text style={styles.pendingText}>
              {pendingCount} pending {pendingCount === 1 ? 'response' : 'responses'} to grade
            </Text>
          </View>
        )}

        {item.responses.length > 0 && pendingCount === 0 && (
          <View style={styles.allGradedBadge}>
            <Ionicons name="checkmark-done-circle" size={14} color="#fff" />
            <Text style={styles.allGradedText}>All responses graded</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={80} color="#ddd" />
      <Text style={styles.emptyText}>No forms created yet</Text>
      <Text style={styles.emptySubtext}>
        Tap the + button to create your first form
      </Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => router.push('/dashboard/forms')}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create Form</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#063314" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Forms</Text>
        <TouchableOpacity 
          style={styles.createFormButton}
          onPress={() => router.push('/dashboard/forms')}
        >
          <Ionicons name="add" size={24} color="#063314" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={forms}
        keyExtractor={(item) => item.id}
        renderItem={renderFormCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={["#25D366"]}
            tintColor="#25D366"
          />
        }
        ListEmptyComponent={EmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 60,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#043816',
  },
  createFormButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  formComposer: {
    fontSize: 12,
    color: '#666',
  },
  formDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#f0f0f0',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  pendingBadge: {
    marginTop: 12,
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pendingText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  allGradedBadge: {
    marginTop: 12,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  allGradedText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  createButton: {
    marginTop: 20,
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});