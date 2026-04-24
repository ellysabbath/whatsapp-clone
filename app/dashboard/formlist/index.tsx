import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Platform, RefreshControl, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { formService, Form, FormResponse } from '../../../lib/api/services/form.service';
import { useUser } from '../../../context/UserContext';

export default function FormListScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [forms, setForms] = useState<Form[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedGradeResponse, setSelectedGradeResponse] = useState<FormResponse | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);

  useEffect(() => {
    loadForms();
  }, []);

  useFocusEffect(
    useCallback(() => {
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
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Your Grade Details</Text>
            <TouchableOpacity onPress={() => setShowGradeModal(false)}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {selectedGradeResponse && (
              <>
                <View style={styles.scoreSummaryCard}>
                  <Text style={styles.scoreSummaryTitle}>Overall Score</Text>
                  <Text style={styles.scoreSummaryValue}>
                    {selectedGradeResponse.total_score?.toFixed(0)} / {selectedGradeResponse.max_possible_score}
                  </Text>
                  <Text style={styles.scoreSummaryPercentage}>
                    {selectedGradeResponse.percentage?.toFixed(1)}%
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    (selectedGradeResponse.percentage || 0) >= 70 ? styles.passedBadge : styles.failedBadge
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {(selectedGradeResponse.percentage || 0) >= 70 ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.detailedTitle}>Detailed Results</Text>
                
                {selectedGradeResponse.answers?.map((answer, idx) => {
                  const question = selectedGradeResponse.form_details?.questions?.find(q => q.id === answer.question);
                  const percentage = question?.points ? (answer.score / question.points) * 100 : 0;
                  
                  return (
                    <View key={answer.answer_id} style={styles.resultItemCard}>
                      <View style={styles.resultItemHeader}>
                        <Text style={styles.resultItemNumber}>Q{idx + 1}</Text>
                        <Text style={styles.resultItemText}>{question?.text || 'Question'}</Text>
                      </View>
                      <Text style={styles.resultItemAnswer}>
                        Your answer: {answer.answer_text || answer.answer_choices?.join(', ') || 'No answer'}
                      </Text>
                      <View style={styles.resultItemScoreRow}>
                        <Text style={styles.resultItemScoreLabel}>Score:</Text>
                        <Text style={[
                          styles.resultItemScore,
                          percentage >= 70 ? styles.goodScore : percentage >= 50 ? styles.averageScore : styles.badScore
                        ]}>
                          {answer.score} / {question?.points || 0}
                        </Text>
                      </View>
                      {answer.feedback && (
                        <Text style={styles.resultItemFeedback}>Feedback: {answer.feedback}</Text>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.closeModalButton}
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
        style={styles.formCard}
        onPress={() => handleFormPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, isOwner && styles.ownerIcon]}>
            <Ionicons name="document-text" size={24} color="#fff" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.formTitle}>{item.title}</Text>
            <View style={styles.composerRow}>
              <Ionicons name="person-outline" size={12} color="#666" />
              <Text style={styles.formComposer}>By: {item.composer_name}</Text>
              {isOwner && (
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>Owner</Text>
                </View>
              )}
              {hasResponded && !isOwner && (
                <View style={styles.respondedBadge}>
                  <Text style={styles.respondedBadgeText}>Responded</Text>
                </View>
              )}
            </View>
            <Text style={styles.formDate}>
              Created: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          {isOwner && (
            <TouchableOpacity onPress={() => deleteForm(item.form_id, item.title)}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>

        {item.description && (
          <Text style={styles.formDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.stat}>
            <Ionicons name="help-circle-outline" size={14} color="#666" />
            <Text style={styles.statText}>{item.questions?.length || 0} questions</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.statText}>{totalResponses} responses</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="star-outline" size={14} color="#666" />
            <Text style={styles.statText}>Total: {item.total_points} pts</Text>
          </View>
        </View>

        {/* View Grade Button for respondents who have been graded */}
        {!isOwner && hasGradedResponse && userResponse && (
          <TouchableOpacity 
            style={styles.viewGradeButton}
            onPress={() => handleViewGrade(userResponse)}
          >
            <Ionicons name="school-outline" size={18} color="#fff" />
            <Text style={styles.viewGradeButtonText}>View My Grade</Text>
          </TouchableOpacity>
        )}

        {/* Submitted waiting for grading badge */}
        {!isOwner && hasResponded && !hasGradedResponse && (
          <View style={styles.waitingBadge}>
            <Ionicons name="time-outline" size={14} color="#fff" />
            <Text style={styles.waitingText}>Waiting for Grading</Text>
          </View>
        )}

        {/* Owner badge */}
        {isOwner && (
          <View style={styles.publicBadge}>
            <Ionicons name="globe-outline" size={14} color="#fff" />
            <Text style={styles.pendingText}>Public Form</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={80} color="#ddd" />
      <Text style={styles.emptyText}>No forms available</Text>
      <Text style={styles.emptySubtext}>
        Create a new form or wait for others to share forms with you
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Loading forms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forms</Text>
        <TouchableOpacity 
          style={styles.createFormButton}
          onPress={() => router.push('/dashboard/forms')}
        >
          <Ionicons name="add" size={24} color="#000000" />
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
            colors={["#25D366"]}
            tintColor="#25D366"
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 80,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
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
  ownerIcon: {
    backgroundColor: '#075E54',
  },
  cardInfo: {
    flex: 1,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
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
    color: '#666',
  },
  ownerBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ownerBadgeText: {
    fontSize: 9,
    color: '#25D366',
    fontWeight: '600',
  },
  respondedBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  respondedBadgeText: {
    fontSize: 9,
    color: '#2196F3',
    fontWeight: '600',
  },
  formDate: {
    fontSize: 10,
    color: '#999',
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
  // View Grade Button
  viewGradeButton: {
    marginTop: 12,
    backgroundColor: '#075E54',
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
    backgroundColor: '#FF9800',
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
    backgroundColor: '#25D366',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#25D366',
  },
  modalContent: {
    padding: 20,
  },
  closeModalButton: {
    backgroundColor: '#075E54',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreSummaryTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scoreSummaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  scoreSummaryPercentage: {
    fontSize: 18,
    color: '#25D366',
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
    color: '#075E54',
    marginBottom: 12,
  },
  resultItemCard: {
    backgroundColor: '#f8f9fa',
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
    color: '#25D366',
    marginRight: 8,
  },
  resultItemText: {
    flex: 1,
    fontSize: 13,
    color: '#000',
    fontWeight: '500',
  },
  resultItemAnswer: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  resultItemScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultItemScoreLabel: {
    fontSize: 12,
    color: '#666',
  },
  resultItemScore: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  goodScore: {
    color: '#4CAF50',
  },
  averageScore: {
    color: '#FF9800',
  },
  badScore: {
    color: '#F44336',
  },
  resultItemFeedback: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 6,
    fontStyle: 'italic',
  },
});