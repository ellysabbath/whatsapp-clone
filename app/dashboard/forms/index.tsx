import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, Modal, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { formService, Question, CreateFormData } from '../../../lib/api/services/form.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme definitions
const THEMES = {
  light: {
    id: 'light',
    colors: {
      primary: '#075E54',
      success: '#25D366',
      danger: '#FF3B30',
      background: '#F5F5F5',
      cardBg: '#FFFFFF',
      surface: '#F8F9FA',
      modalBg: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      textTertiary: '#999999',
      border: '#E0E0E0',
      placeholder: '#CCCCCC',
      questionBg: '#F8F9FA',
    }
  },
  dark: {
    id: 'dark',
    colors: {
      primary: '#128C7E',
      success: '#25D366',
      danger: '#FF5C5C',
      background: '#111B21',
      cardBg: '#202C33',
      surface: '#202C33',
      modalBg: '#202C33',
      text: '#E9EDEF',
      textSecondary: '#AEBAC1',
      textTertiary: '#8696A0',
      border: '#2A3942',
      placeholder: '#3D4B55',
      questionBg: '#2A3942',
    }
  },
  whatsappGreen: {
    id: 'whatsappGreen',
    colors: {
      primary: '#25D366',
      success: '#25D366',
      danger: '#FF3B30',
      background: '#F0F2F5',
      cardBg: '#FFFFFF',
      surface: '#FFFFFF',
      modalBg: '#FFFFFF',
      text: '#111B21',
      textSecondary: '#54656F',
      textTertiary: '#8696A0',
      border: '#E9EDEF',
      placeholder: '#CCCCCC',
      questionBg: '#F0F2F5',
    }
  },
  midnightBlue: {
    id: 'midnightBlue',
    colors: {
      primary: '#1E88E5',
      success: '#1E88E5',
      danger: '#FF6B6B',
      background: '#0A1929',
      cardBg: '#132F4C',
      surface: '#132F4C',
      modalBg: '#132F4C',
      text: '#FFFFFF',
      textSecondary: '#B0C4DE',
      textTertiary: '#7B9BB5',
      border: '#1E3A5F',
      placeholder: '#2C4A6E',
      questionBg: '#1E3A5F',
    }
  },
  sunsetOrange: {
    id: 'sunsetOrange',
    colors: {
      primary: '#FF5722',
      success: '#FF5722',
      danger: '#D84315',
      background: '#FFF3E0',
      cardBg: '#FFFFFF',
      surface: '#FFE0B2',
      modalBg: '#FFFFFF',
      text: '#4E342E',
      textSecondary: '#8D6E63',
      textTertiary: '#A1887F',
      border: '#FFCC80',
      placeholder: '#FFCC80',
      questionBg: '#FFF3E0',
    }
  },
  purpleHaze: {
    id: 'purpleHaze',
    colors: {
      primary: '#9C27B0',
      success: '#9C27B0',
      danger: '#E91E63',
      background: '#F3E5F5',
      cardBg: '#FFFFFF',
      surface: '#E1BEE7',
      modalBg: '#FFFFFF',
      text: '#4A148C',
      textSecondary: '#7B1FA2',
      textTertiary: '#9C27B0',
      border: '#CE93D8',
      placeholder: '#CE93D8',
      questionBg: '#F3E5F5',
    }
  },
  oceanTeal: {
    id: 'oceanTeal',
    colors: {
      primary: '#00897B',
      success: '#00897B',
      danger: '#D81B60',
      background: '#E0F2F1',
      cardBg: '#FFFFFF',
      surface: '#B2DFDB',
      modalBg: '#FFFFFF',
      text: '#004D40',
      textSecondary: '#00695C',
      textTertiary: '#00897B',
      border: '#80CBC4',
      placeholder: '#80CBC4',
      questionBg: '#E0F2F1',
    }
  },
  cherryBlossom: {
    id: 'cherryBlossom',
    colors: {
      primary: '#E91E63',
      success: '#E91E63',
      danger: '#C2185B',
      background: '#FCE4EC',
      cardBg: '#FFFFFF',
      surface: '#F8BBD0',
      modalBg: '#FFFFFF',
      text: '#880E4F',
      textSecondary: '#AD1457',
      textTertiary: '#C2185B',
      border: '#F48FB1',
      placeholder: '#F48FB1',
      questionBg: '#FCE4EC',
    }
  },
};

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
  }, []);

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
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create New Form</Text>
        <TouchableOpacity onPress={saveForm} style={styles.saveButton} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.success} />
          ) : (
            <Ionicons name="checkmark" size={24} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
          <TextInput
            style={[styles.titleInput, { color: colors.text }]}
            placeholder="Form Title"
            placeholderTextColor={colors.placeholder}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.descriptionInput, { color: colors.textSecondary }]}
            placeholder="Form Description"
            placeholderTextColor={colors.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={[styles.questionsSection, { backgroundColor: colors.cardBg }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.success }]}>Questions ({questions.length})</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowQuestionBuilder(true)}
            >
              <Ionicons name="add-circle" size={28} color={colors.success} />
            </TouchableOpacity>
          </View>

          {questions.map((q, index) => (
            <View key={q.id} style={[styles.questionCard, { backgroundColor: colors.questionBg }]}>
              <View style={styles.questionHeader}>
                <View style={[styles.questionNumber, { backgroundColor: colors.success }]}>
                  <Text style={styles.questionNumberText}>{index + 1}</Text>
                </View>
                <Text style={[styles.questionText, { color: colors.text }]}>{q.text}</Text>
                <TouchableOpacity onPress={() => removeQuestion(q.id)}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
              <View style={styles.questionFooter}>
                <View style={styles.typeBadge}>
                  <Ionicons name={getTypeIcon(q.type)} size={14} color={colors.success} />
                  <Text style={[styles.typeText, { color: colors.textSecondary }]}>{q.type.replace('_', ' ')}</Text>
                </View>
                <Text style={[styles.pointsText, { color: colors.success }]}>{q.points} pts</Text>
              </View>
              {q.options && (
                <View style={[styles.optionsContainer, { borderLeftColor: colors.border }]}>
                  {q.options.map((opt, idx) => (
                    <Text key={idx} style={[styles.optionText, { color: colors.textSecondary }]}>• {opt}</Text>
                  ))}
                </View>
              )}
            </View>
          ))}

          {questions.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={60} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No questions yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Tap + to add your first question</Text>
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
        <View style={[styles.modalContainer, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowQuestionBuilder(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Question</Text>
            <TouchableOpacity onPress={addQuestion}>
              <Ionicons name="checkmark" size={24} color={colors.success} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              style={[styles.questionInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Enter your question..."
              placeholderTextColor={colors.placeholder}
              value={currentQuestion}
              onChangeText={setCurrentQuestion}
              multiline
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Question Type</Text>
            <View style={styles.typesGrid}>
              {questionTypes.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeCard,
                    { backgroundColor: colors.surface },
                    questionType === type.value && [styles.typeCardActive, { backgroundColor: colors.success + '20', borderColor: colors.success }]
                  ]}
                  onPress={() => setQuestionType(type.value as Question['question_type'])}
                >
                  <Ionicons 
                    name={type.icon} 
                    size={28} 
                    color={questionType === type.value ? colors.success : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.typeLabel,
                    { color: questionType === type.value ? colors.success : colors.textSecondary },
                    questionType === type.value && styles.typeLabelActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(questionType === 'checkbox' || questionType === 'radio') && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Options (comma separated)</Text>
                <TextInput
                  style={[styles.optionsInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  placeholder="Option 1, Option 2, Option 3"
                  placeholderTextColor={colors.placeholder}
                  value={customOptions}
                  onChangeText={setCustomOptions}
                />
              </>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>Points</Text>
            <TextInput
              style={[styles.pointsInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Points for this question"
              placeholderTextColor={colors.placeholder}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 76,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 8,
  },
  descriptionInput: {
    fontSize: 15,
    paddingVertical: 8,
    minHeight: 60,
  },
  questionsSection: {
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
  },
  addButton: {
    padding: 4,
  },
  questionCard: {
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
    textTransform: 'capitalize',
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  optionsContainer: {
    marginLeft: 36,
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  optionText: {
    fontSize: 12,
    marginBottom: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  questionInput: {
    borderWidth: 1,
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
    borderRadius: 10,
    gap: 6,
  },
  typeCardActive: {
    borderWidth: 1,
  },
  typeLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  typeLabelActive: {
    fontWeight: '500',
  },
  optionsInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  pointsInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    width: 100,
  },
});