import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Platform, RefreshControl, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { formService, Form, FormResponse } from '../../../lib/api/services/form.service';
import { useUser } from '../../../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme definitions
const THEMES = {
  light: {
    id: 'light',
    colors: {
      primary: '#075E54',
      success: '#25D366',
      danger: '#FF3B30',
      warning: '#FF9800',
      info: '#2196F3',
      background: '#F5F5F5',
      cardBg: '#FFFFFF',
      surface: '#F8F9FA',
      modalBg: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      textTertiary: '#999999',
      border: '#E0E0E0',
      placeholder: '#CCCCCC',
      goodScore: '#4CAF50',
      averageScore: '#FF9800',
      badScore: '#F44336',
    }
  },
  dark: {
    id: 'dark',
    colors: {
      primary: '#128C7E',
      success: '#25D366',
      danger: '#FF5C5C',
      warning: '#FFB74D',
      info: '#64B5F6',
      background: '#111B21',
      cardBg: '#202C33',
      surface: '#202C33',
      modalBg: '#202C33',
      text: '#E9EDEF',
      textSecondary: '#AEBAC1',
      textTertiary: '#8696A0',
      border: '#2A3942',
      placeholder: '#3D4B55',
      goodScore: '#81C784',
      averageScore: '#FFB74D',
      badScore: '#E57373',
    }
  },
  whatsappGreen: {
    id: 'whatsappGreen',
    colors: {
      primary: '#25D366',
      success: '#25D366',
      danger: '#FF3B30',
      warning: '#FF9800',
      info: '#2196F3',
      background: '#F0F2F5',
      cardBg: '#FFFFFF',
      surface: '#FFFFFF',
      modalBg: '#FFFFFF',
      text: '#111B21',
      textSecondary: '#54656F',
      textTertiary: '#8696A0',
      border: '#E9EDEF',
      placeholder: '#CCCCCC',
      goodScore: '#4CAF50',
      averageScore: '#FF9800',
      badScore: '#F44336',
    }
  },
  midnightBlue: {
    id: 'midnightBlue',
    colors: {
      primary: '#1E88E5',
      success: '#1E88E5',
      danger: '#FF6B6B',
      warning: '#FFB74D',
      info: '#64B5F6',
      background: '#0A1929',
      cardBg: '#132F4C',
      surface: '#132F4C',
      modalBg: '#132F4C',
      text: '#FFFFFF',
      textSecondary: '#B0C4DE',
      textTertiary: '#7B9BB5',
      border: '#1E3A5F',
      placeholder: '#2C4A6E',
      goodScore: '#81C784',
      averageScore: '#FFB74D',
      badScore: '#E57373',
    }
  },
  sunsetOrange: {
    id: 'sunsetOrange',
    colors: {
      primary: '#FF5722',
      success: '#FF5722',
      danger: '#D84315',
      warning: '#FF9800',
      info: '#2196F3',
      background: '#FFF3E0',
      cardBg: '#FFFFFF',
      surface: '#FFE0B2',
      modalBg: '#FFFFFF',
      text: '#4E342E',
      textSecondary: '#8D6E63',
      textTertiary: '#A1887F',
      border: '#FFCC80',
      placeholder: '#FFCC80',
      goodScore: '#4CAF50',
      averageScore: '#FF9800',
      badScore: '#F44336',
    }
  },
  purpleHaze: {
    id: 'purpleHaze',
    colors: {
      primary: '#9C27B0',
      success: '#9C27B0',
      danger: '#E91E63',
      warning: '#FF9800',
      info: '#2196F3',
      background: '#F3E5F5',
      cardBg: '#FFFFFF',
      surface: '#E1BEE7',
      modalBg: '#FFFFFF',
      text: '#4A148C',
      textSecondary: '#7B1FA2',
      textTertiary: '#9C27B0',
      border: '#CE93D8',
      placeholder: '#CE93D8',
      goodScore: '#4CAF50',
      averageScore: '#FF9800',
      badScore: '#F44336',
    }
  },
  oceanTeal: {
    id: 'oceanTeal',
    colors: {
      primary: '#00897B',
      success: '#00897B',
      danger: '#D81B60',
      warning: '#FF9800',
      info: '#2196F3',
      background: '#E0F2F1',
      cardBg: '#FFFFFF',
      surface: '#B2DFDB',
      modalBg: '#FFFFFF',
      text: '#004D40',
      textSecondary: '#00695C',
      textTertiary: '#00897B',
      border: '#80CBC4',
      placeholder: '#80CBC4',
      goodScore: '#4CAF50',
      averageScore: '#FF9800',
      badScore: '#F44336',
    }
  },
  cherryBlossom: {
    id: 'cherryBlossom',
    colors: {
      primary: '#E91E63',
      success: '#E91E63',
      danger: '#C2185B',
      warning: '#FF9800',
      info: '#2196F3',
      background: '#FCE4EC',
      cardBg: '#FFFFFF',
      surface: '#F8BBD0',
      modalBg: '#FFFFFF',
      text: '#880E4F',
      textSecondary: '#AD1457',
      textTertiary: '#C2185B',
      border: '#F48FB1',
      placeholder: '#F48FB1',
      goodScore: '#4CAF50',
      averageScore: '#FF9800',
      badScore: '#F44336',
    }
  },
};

export default function FormListScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [forms, setForms] = useState<Form[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedGradeResponse, setSelectedGradeResponse] = useState<FormResponse | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');

  // Get current theme colors
  const theme = THEMES[currentTheme as keyof typeof THEMES];
  const colors = theme.colors;

  // Load theme from storage
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

  useEffect(() => {
    loadTheme();
    loadForms();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTheme();
      loadForms();
    }, [])
  );

  const loadForms = async () => {
    try {
      setLoading(true);
      const data = await formService.getForms();
      setForms(data);
    } catch (error: any) {
      console.error('Error loading forms:', error);
      Alert.alert('Error', error.message || 'Failed to load forms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadForms();
    setRefreshing(false);
  };

  const handleFormPress = (form: Form) => {
    router.push(`/dashboard/formId/${form.form_id}`);
  };

  const deleteForm = async (formId: string, formTitle: string) => {
    Alert.alert(
      'Delete Form',
      `Are you sure you want to delete "${formTitle}"? All responses will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await formService.deleteForm(formId);
              await loadForms();
              Alert.alert('Success', 'Form deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete form');
            }
          }
        }
      ]
    );
  };

  const handleViewGrade = (response: FormResponse) => {
    setSelectedGradeResponse(response);
    setShowGradeModal(true);
  };

  const getUserResponse = (form: Form): FormResponse | null => {
    if (!user?.email) return null;
    const response = form.responses?.find(r => r.respondent_email === user.email);
    return response || null;
  };

  const GradeModal = () => (
    <Modal
      visible={showGradeModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowGradeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.success }]}>Your Grade Details</Text>
            <TouchableOpacity onPress={() => setShowGradeModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {selectedGradeResponse && (
              <>
                <View style={[styles.scoreSummaryCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.scoreSummaryTitle, { color: colors.textSecondary }]}>Overall Score</Text>
                  <Text style={[styles.scoreSummaryValue, { color: colors.text }]}>
                    {selectedGradeResponse.total_score?.toFixed(0)} / {selectedGradeResponse.max_possible_score}
                  </Text>
                  <Text style={[styles.scoreSummaryPercentage, { color: colors.success }]}>
                    {selectedGradeResponse.percentage?.toFixed(1)}%
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    (selectedGradeResponse.percentage || 0) >= 70 ? [styles.passedBadge, { backgroundColor: colors.goodScore }] : [styles.failedBadge, { backgroundColor: colors.warning }]
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {(selectedGradeResponse.percentage || 0) >= 70 ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.detailedTitle, { color: colors.primary }]}>Detailed Results</Text>
                
                {selectedGradeResponse.answers?.map((answer, idx) => {
                  const question = selectedGradeResponse.form_details?.questions?.find(q => q.id === answer.question);
                  const percentage = question?.points ? (answer.score / question.points) * 100 : 0;
                  
                  return (
                    <View key={answer.answer_id} style={[styles.resultItemCard, { backgroundColor: colors.surface }]}>
                      <View style={styles.resultItemHeader}>
                        <Text style={[styles.resultItemNumber, { color: colors.success }]}>Q{idx + 1}</Text>
                        <Text style={[styles.resultItemText, { color: colors.text }]}>{question?.text || 'Question'}</Text>
                      </View>
                      <Text style={[styles.resultItemAnswer, { color: colors.textSecondary }]}>
                        Your answer: {answer.answer_text || answer.answer_choices?.join(', ') || 'No answer'}
                      </Text>
                      <View style={styles.resultItemScoreRow}>
                        <Text style={[styles.resultItemScoreLabel, { color: colors.textSecondary }]}>Score:</Text>
                        <Text style={[
                          styles.resultItemScore,
                          percentage >= 70 ? { color: colors.goodScore } : percentage >= 50 ? { color: colors.averageScore } : { color: colors.badScore }
                        ]}>
                          {answer.score} / {question?.points || 0}
                        </Text>
                      </View>
                      {answer.feedback && (
                        <Text style={[styles.resultItemFeedback, { color: colors.info }]}>Feedback: {answer.feedback}</Text>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
          
          <TouchableOpacity 
            style={[styles.closeModalButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowGradeModal(false)}
          >
            <Text style={styles.closeModalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderFormCard = ({ item }: { item: Form }) => {
    const isOwner = user && item.composer === user.id;
    const totalResponses = item.response_count || 0;
    const userResponse = getUserResponse(item);
    const hasResponded = !!userResponse;
    const hasGradedResponse = userResponse?.is_graded || false;
    
    return (
      <TouchableOpacity 
        style={[styles.formCard, { backgroundColor: colors.cardBg, shadowColor: colors.border }]}
        onPress={() => handleFormPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, isOwner && [styles.ownerIcon, { backgroundColor: colors.primary }], !isOwner && { backgroundColor: colors.success }]}>
            <Ionicons name="document-text" size={24} color="#fff" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.formTitle, { color: colors.text }]}>{item.title}</Text>
            <View style={styles.composerRow}>
              <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.formComposer, { color: colors.textSecondary }]}>By: {item.composer_name}</Text>
              {isOwner && (
                <View style={[styles.ownerBadge, { backgroundColor: colors.success + '20' }]}>
                  <Text style={[styles.ownerBadgeText, { color: colors.success }]}>Owner</Text>
                </View>
              )}
              {hasResponded && !isOwner && (
                <View style={[styles.respondedBadge, { backgroundColor: colors.info + '20' }]}>
                  <Text style={[styles.respondedBadgeText, { color: colors.info }]}>Responded</Text>
                </View>
              )}
            </View>
            <Text style={[styles.formDate, { color: colors.textTertiary }]}>
              Created: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          {isOwner && (
            <TouchableOpacity onPress={() => deleteForm(item.form_id, item.title)}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>

        {item.description && (
          <Text style={[styles.formDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.stat}>
            <Ionicons name="help-circle-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>{item.questions?.length || 0} questions</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>{totalResponses} responses</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="star-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>Total: {item.total_points} pts</Text>
          </View>
        </View>

        {!isOwner && hasGradedResponse && userResponse && (
          <TouchableOpacity 
            style={[styles.viewGradeButton, { backgroundColor: colors.primary }]}
            onPress={() => handleViewGrade(userResponse)}
          >
            <Ionicons name="school-outline" size={18} color="#fff" />
            <Text style={styles.viewGradeButtonText}>View My Grade</Text>
          </TouchableOpacity>
        )}

        {!isOwner && hasResponded && !hasGradedResponse && (
          <View style={[styles.waitingBadge, { backgroundColor: colors.warning }]}>
            <Ionicons name="time-outline" size={14} color="#fff" />
            <Text style={styles.waitingText}>Waiting for Grading</Text>
          </View>
        )}

        {isOwner && (
          <View style={[styles.publicBadge, { backgroundColor: colors.success }]}>
            <Ionicons name="globe-outline" size={14} color="#fff" />
            <Text style={styles.pendingText}>Public Form</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={80} color={colors.textTertiary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No forms available</Text>
      <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
        Create a new form or wait for others to share forms with you
      </Text>
      <TouchableOpacity 
        style={[styles.createButton, { backgroundColor: colors.success }]}
        onPress={() => router.push('/dashboard/forms')}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create Form</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.success} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading forms...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Forms</Text>
        <TouchableOpacity 
          style={styles.createFormButton}
          onPress={() => router.push('/dashboard/forms')}
        >
          <Ionicons name="add" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={forms}
        keyExtractor={(item) => item.form_id}
        renderItem={renderFormCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.success]}
            tintColor={colors.success}
          />
        }
        ListEmptyComponent={EmptyState}
      />

      <GradeModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: 'bold',
  },
  createFormButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  formCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ownerIcon: {
    backgroundColor: '#075E54',
  },
  cardInfo: {
    flex: 1,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  formComposer: {
    fontSize: 11,
  },
  ownerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ownerBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  respondedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  respondedBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  formDate: {
    fontSize: 10,
  },
  formDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  viewGradeButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewGradeButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  waitingBadge: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  waitingText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  publicBadge: {
    marginTop: 12,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  createButton: {
    marginTop: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  closeModalButton: {
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreSummaryCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreSummaryTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  scoreSummaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreSummaryPercentage: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  passedBadge: {
    backgroundColor: '#4CAF50',
  },
  failedBadge: {
    backgroundColor: '#FF9800',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resultItemCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  resultItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resultItemNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  resultItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  resultItemAnswer: {
    fontSize: 12,
    marginBottom: 6,
  },
  resultItemScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultItemScoreLabel: {
    fontSize: 12,
  },
  resultItemScore: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultItemFeedback: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
});