import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, Modal, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { formService, Question, CreateFormData } from '../../../lib/api/services/form.service';

interface LocalQuestion {
  id: string;
  text: string;
  type: Question['question_type'];
  options?: string[];
  points: number;
}

export default function CreateFormScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionType, setQuestionType] = useState<Question['question_type']>('short_answer');
  const [questionPoints, setQuestionPoints] = useState('1');
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);
  const [customOptions, setCustomOptions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questionTypes = [
    { value: 'short_answer', label: 'Short Answer', icon: 'create-outline' },
    { value: 'checkbox', label: 'Checkbox', icon: 'checkbox-outline' },
    { value: 'radio', label: 'Radio Button', icon: 'radio-button-on-outline' },
    { value: 'accept', label: 'I Accept', icon: 'checkmark-circle-outline' },
    { value: 'understand', label: 'I Understand', icon: 'bulb-outline' },
    { value: 'learn_more', label: 'I Will Learn More', icon: 'school-outline' },
  ];

  const addQuestion = () => {
    if (!currentQuestion.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    let options: string[] | undefined;
    if (questionType === 'checkbox' || questionType === 'radio') {
      if (!customOptions.trim()) {
        Alert.alert('Error', 'Please enter options separated by commas');
        return;
      }
      options = customOptions.split(',').map(opt => opt.trim());
    }

    const newQuestion: LocalQuestion = {
      id: Date.now().toString(),
      text: currentQuestion,
      type: questionType,
      options,
      points: parseInt(questionPoints) || 1,
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion('');
    setCustomOptions('');
    setQuestionPoints('1');
    setShowQuestionBuilder(false);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const saveForm = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a form title');
      return;
    }
    if (questions.length === 0) {
      Alert.alert('Error', 'Please add at least one question');
      return;
    }

    setIsSubmitting(true);
    
    const formData: CreateFormData = {
      title: title.trim(),
      description: description.trim(),
      status: 'active',
      is_public: true,
      questions: questions.map((q, index) => ({
        text: q.text,
        question_type: q.type,
        options: q.options,
        points: q.points,
        order: index,
        is_required: true,
      })),
    };

    try {
      const response = await formService.createForm(formData);
      Alert.alert('Success', 'Form created successfully!', [
        { text: 'OK', onPress: () => router.push('/dashboard/formlist') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'short_answer': return 'create-outline';
      case 'checkbox': return 'checkbox-outline';
      case 'radio': return 'radio-button-on-outline';
      case 'accept': return 'checkmark-circle-outline';
      case 'understand': return 'bulb-outline';
      case 'learn_more': return 'school-outline';
      default: return 'help-outline';
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Form</Text>
        <TouchableOpacity onPress={saveForm} style={styles.saveButton} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#25D366" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#000000" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <TextInput
            style={styles.titleInput}
            placeholder="Form Title"
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.descriptionInput}
            placeholder="Form Description"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.questionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Questions ({questions.length})</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowQuestionBuilder(true)}
            >
              <Ionicons name="add-circle" size={28} color="#25D366" />
            </TouchableOpacity>
          </View>

          {questions.map((q, index) => (
            <View key={q.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <View style={styles.questionNumber}>
                  <Text style={styles.questionNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.questionText}>{q.text}</Text>
                <TouchableOpacity onPress={() => removeQuestion(q.id)}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
              <View style={styles.questionFooter}>
                <View style={styles.typeBadge}>
                  <Ionicons name={getTypeIcon(q.type)} size={14} color="#25D366" />
                  <Text style={styles.typeText}>{q.type.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.pointsText}>{q.points} pts</Text>
              </View>
              {q.options && (
                <View style={styles.optionsContainer}>
                  {q.options.map((opt, idx) => (
                    <Text key={idx} style={styles.optionText}>• {opt}</Text>
                  ))}
                </View>
              )}
            </View>
          ))}

          {questions.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No questions yet</Text>
              <Text style={styles.emptySubtext}>Tap + to add your first question</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showQuestionBuilder}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQuestionBuilder(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowQuestionBuilder(false)}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Question</Text>
            <TouchableOpacity onPress={addQuestion}>
              <Ionicons name="checkmark" size={24} color="#25D366" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.questionInput}
              placeholder="Enter your question..."
              placeholderTextColor="#999"
              value={currentQuestion}
              onChangeText={setCurrentQuestion}
              multiline
            />

            <Text style={styles.label}>Question Type</Text>
            <View style={styles.typesGrid}>
              {questionTypes.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeCard,
                    questionType === type.value && styles.typeCardActive
                  ]}
                  onPress={() => setQuestionType(type.value as Question['question_type'])}
                >
                  <Ionicons 
                    name={type.icon} 
                    size={28} 
                    color={questionType === type.value ? "#25D366" : "#666"} 
                  />
                  <Text style={[
                    styles.typeLabel,
                    questionType === type.value && styles.typeLabelActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(questionType === 'checkbox' || questionType === 'radio') && (
              <>
                <Text style={styles.label}>Options (comma separated)</Text>
                <TextInput
                  style={styles.optionsInput}
                  placeholder="Option 1, Option 2, Option 3"
                  placeholderTextColor="#999"
                  value={customOptions}
                  onChangeText={setCustomOptions}
                />
              </>
            )}

            <Text style={styles.label}>Points</Text>
            <TextInput
              style={styles.pointsInput}
              placeholder="Points for this question"
              placeholderTextColor="#999"
              value={questionPoints}
              onChangeText={setQuestionPoints}
              keyboardType="numeric"
            />
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 76,
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
  saveButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 8,
    color: '#000',
  },
  descriptionInput: {
    fontSize: 15,
    color: '#666',
    paddingVertical: 8,
    minHeight: 60,
  },
  questionsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#25D366',
  },
  addButton: {
    padding: 4,
  },
  questionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  questionNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  questionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 36,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  pointsText: {
    fontSize: 12,
    color: '#25D366',
    fontWeight: '500',
  },
  optionsContainer: {
    marginLeft: 36,
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#e0e0e0',
  },
  optionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    padding: 16,
  },
  questionInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    gap: 6,
  },
  typeCardActive: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#25D366',
  },
  typeLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  typeLabelActive: {
    color: '#25D366',
    fontWeight: '500',
  },
  optionsInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  pointsInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    width: 100,
  },
});