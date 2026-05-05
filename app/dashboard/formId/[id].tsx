import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, Platform, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { formService, Form, FormResponse, Question, SubmitResponseData, GradeResponseData } from '../../../lib/api/services/form.service';
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

export default function FormResponseScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [currentTheme, setCurrentTheme] = useState('light');
  
  // Get current theme colors
  const theme = THEMES[currentTheme as keyof typeof THEMES];
  const colors = theme.colors;
  
  // State variables
  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<{[key: string]: any}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [gradingMode, setGradingMode] = useState(false);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [scores, setScores] = useState<{[key: string]: number}>({});
  const [feedbacks, setFeedbacks] = useState<{[key: string]: string}>({});
  const [explanationText, setExplanationText] = useState<{[key: string]: string}>({});
  const [activeTab, setActiveTab] = useState<'respond' | 'responses'>('respond');
  const [showMenu, setShowMenu] = useState(false);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [userResponse, setUserResponse] = useState<FormResponse | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedResponseForResults, setSelectedResponseForResults] = useState<FormResponse | null>(null);
  const [showRetakeConfirmation, setShowRetakeConfirmation] = useState(false);
  const [userEmail, setUserEmail] = useState('');

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

  // Load user email from context
  useEffect(() => {
    loadTheme();
    if (user) {
      setUserEmail(user.email || '');
    }
  }, [user]);

  // Load form data
  useEffect(() => {
    loadForm();
  }, [id, user]);

  // Load all data
  const loadForm = async () => {
    try {
      setLoading(true);
      const formData = await formService.getForm(id as string);
      setForm(formData);
      
      if (user && formData.composer === user.id) {
        setIsOwner(true);
        await loadAllResponses();
      }
      
      if (userEmail) {
        await findUserResponse();
      }
    } catch (error: any) {
      console.error('Error loading form:', error);
      Alert.alert('Error', error.message || 'Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const loadAllResponses = async () => {
    try {
      const responseData = await formService.getFormResponses(id as string);
      setResponses(responseData);
    } catch (error: any) {
      console.error('Error loading responses:', error);
    }
  };

  const findUserResponse = async () => {
    if (!userEmail || responses.length === 0) return;
    
    const existingResponse = responses.find(r => r.respondent_email === userEmail);
    if (existingResponse) {
      setHasSubmitted(true);
      setUserResponse(existingResponse);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadForm();
    if (isOwner) {
      await loadAllResponses();
    }
    await findUserResponse();
    setRefreshing(false);
  }, [id, isOwner, userEmail]);

  // Answer handlers
  const handleAnswer = (questionId: string, value: any) => {
    setAnswers({...answers, [questionId]: value});
  };

  const handleCheckbox = (questionId: string, option: string) => {
    const currentAnswers = answers[questionId] || [];
    if (currentAnswers.includes(option)) {
      handleAnswer(questionId, currentAnswers.filter((a: string) => a !== option));
    } else {
      handleAnswer(questionId, [...currentAnswers, option]);
    }
  };

  const resetForm = () => {
    setAnswers({});
    setExplanationText({});
  };

  // Submit response
  const submitResponse = async () => {
    if (!form) return;
    
    const unanswered = form.questions.filter(q => {
      if (q.question_type === 'learn_more' && answers[q.question_id!] === 'learn_more') {
        return !answers[q.question_id!] || (answers[q.question_id!] === 'learn_more' && !explanationText[q.question_id!]);
      }
      return !answers[q.question_id!];
    });
    
    if (unanswered.length > 0) {
      Alert.alert('Incomplete', `Please answer all ${unanswered.length} questions before submitting`);
      return;
    }

    if (!userEmail.trim()) {
      Alert.alert('Email Required', 'Please enter your email to track your response');
      return;
    }

    setIsSubmitting(true);
    
    const formattedAnswers = form.questions.map(q => {
      let answer = answers[q.question_id!];
      if (q.question_type === 'learn_more' && answer === 'learn_more') {
        answer = { choice: 'learn_more', explanation: explanationText[q.question_id!] };
      }
      return {
        question_id: q.question_id!,
        answer_text: typeof answer === 'string' ? answer : '',
        answer_choices: Array.isArray(answer) ? answer : [],
        answer_boolean: typeof answer === 'boolean' ? answer : null,
        answer_explanation: q.question_type === 'learn_more' && answer === 'learn_more' ? explanationText[q.question_id!] : '',
      };
    });
    
    const submitData: SubmitResponseData = {
      respondent_name: user?.full_name || 'Anonymous',
      respondent_email: userEmail.trim(),
      respondent_phone: user?.mobile_number || '',
      answers: formattedAnswers,
    };

    try {
      const response = await formService.submitResponse(form.form_id, submitData);
      Alert.alert('Success', 'Your responses have been submitted successfully!');
      resetForm();
      setHasSubmitted(true);
      setUserResponse(response);
      
      if (isOwner) {
        await loadAllResponses();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retake form
  const handleRetakeForm = () => {
    setShowRetakeConfirmation(true);
  };

  const confirmRetake = () => {
    setShowRetakeConfirmation(false);
    resetForm();
    setHasSubmitted(false);
    setUserResponse(null);
  };

  // Grading functions
  const startGrading = (responseId: string) => {
    setSelectedResponseId(responseId);
    const response = responses.find(r => r.response_id === responseId);
    if (response) {
      const initialScores: {[key: string]: number} = {};
      const initialFeedbacks: {[key: string]: string} = {};
      form?.questions.forEach(question => {
        const answer = response.answers.find(a => a.question === question.id);
        initialScores[question.question_id!] = answer?.score || 0;
        initialFeedbacks[question.question_id!] = answer?.feedback || '';
      });
      setScores(initialScores);
      setFeedbacks(initialFeedbacks);
    }
    setGradingMode(true);
  };

  const handleScore = (questionId: string, score: string, maxPoints: number) => {
    if (score === '') {
      setScores({...scores, [questionId]: 0});
      return;
    }
    
    const intRegex = /^\d+$/;
    if (intRegex.test(score)) {
      const numericScore = parseInt(score, 10);
      if (!isNaN(numericScore) && numericScore <= maxPoints && numericScore >= 0) {
        setScores({...scores, [questionId]: numericScore});
      }
    }
  };

  const submitGrades = async () => {
    if (!form || !selectedResponseId) return;
    
    const totalPoints = form.questions.reduce((sum, q) => sum + q.points, 0);
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    
    const gradeData: GradeResponseData = {
      answers: form.questions.map(q => ({
        answer_id: responses.find(r => r.response_id === selectedResponseId)?.answers.find(a => a.question === q.id)?.answer_id || '',
        score: scores[q.question_id!] || 0,
        feedback: feedbacks[q.question_id!] || '',
      })),
    };

    try {
      await formService.gradeResponse(selectedResponseId, gradeData);
      Alert.alert('Success', `Grades submitted! Score: ${totalScore}/${totalPoints}`);
      setGradingMode(false);
      setSelectedResponseId(null);
      setScores({});
      setFeedbacks({});
      await loadAllResponses();
      
      if (userResponse && userResponse.response_id === selectedResponseId) {
        await findUserResponse();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit grades');
    }
  };

  const deleteResponse = async (responseId: string) => {
    Alert.alert(
      'Delete Response',
      'Are you sure you want to delete this response?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await formService.deleteResponse(responseId);
              await loadAllResponses();
              if (userResponse && userResponse.response_id === responseId) {
                setHasSubmitted(false);
                setUserResponse(null);
                resetForm();
              }
              Alert.alert('Success', 'Response deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete response');
            }
          }
        }
      ]
    );
  };

  const viewGrade = (response: FormResponse) => {
    setSelectedResponseForResults(response);
    setShowResultsModal(true);
  };

  // Question renderers
  const renderQuestionByType = (question: Question, index: number) => {
    const currentAnswer = answers[question.question_id!];
    
    switch(question.question_type) {
      case 'short_answer':
        return (
          <View key={question.question_id} style={[styles.questionCard, { backgroundColor: colors.cardBg, shadowColor: colors.border }]}>
            <View style={styles.questionHeader}>
              <View style={[styles.questionNumber, { backgroundColor: colors.success }]}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={[styles.questionText, { color: colors.text }]}>{question.text}</Text>
              <View style={[styles.pointsBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.pointsBadgeText, { color: colors.textSecondary }]}>{question.points} pts</Text>
              </View>
            </View>
            <TextInput
              style={[styles.answerInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
              placeholder="Type your answer here..."
              placeholderTextColor={colors.placeholder}
              value={currentAnswer || ''}
              onChangeText={(text) => handleAnswer(question.question_id!, text)}
              multiline
            />
          </View>
        );
        
      case 'checkbox':
        return (
          <View key={question.question_id} style={[styles.questionCard, { backgroundColor: colors.cardBg, shadowColor: colors.border }]}>
            <View style={styles.questionHeader}>
              <View style={[styles.questionNumber, { backgroundColor: colors.success }]}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={[styles.questionText, { color: colors.text }]}>{question.text}</Text>
              <View style={[styles.pointsBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.pointsBadgeText, { color: colors.textSecondary }]}>{question.points} pts</Text>
              </View>
            </View>
            {question.options?.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.optionRow}
                onPress={() => handleCheckbox(question.question_id!, option)}
              >
                <Ionicons 
                  name={currentAnswer?.includes(option) ? "checkbox" : "square-outline"} 
                  size={22} 
                  color={colors.success} 
                />
                <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
        
      case 'radio':
        return (
          <View key={question.question_id} style={[styles.questionCard, { backgroundColor: colors.cardBg, shadowColor: colors.border }]}>
            <View style={styles.questionHeader}>
              <View style={[styles.questionNumber, { backgroundColor: colors.success }]}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={[styles.questionText, { color: colors.text }]}>{question.text}</Text>
              <View style={[styles.pointsBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.pointsBadgeText, { color: colors.textSecondary }]}>{question.points} pts</Text>
              </View>
            </View>
            {question.options?.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.optionRow}
                onPress={() => handleAnswer(question.question_id!, option)}
              >
                <Ionicons 
                  name={currentAnswer === option ? "radio-button-on" : "radio-button-off"} 
                  size={22} 
                  color={colors.success} 
                />
                <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
        
      case 'accept':
        return (
          <View key={question.question_id} style={[styles.questionCard, { backgroundColor: colors.cardBg, shadowColor: colors.border }]}>
            <View style={styles.questionHeader}>
              <View style={[styles.questionNumber, { backgroundColor: colors.success }]}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={[styles.questionText, { color: colors.text }]}>{question.text}</Text>
              <View style={[styles.pointsBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.pointsBadgeText, { color: colors.textSecondary }]}>{question.points} pts</Text>
              </View>
            </View>
            <View style={styles.twoButtonRow}>
              <TouchableOpacity
                style={[styles.acceptButton, { borderColor: colors.border, backgroundColor: colors.cardBg }, currentAnswer === 'accept' && [styles.activeButton, { borderColor: colors.success, backgroundColor: colors.success + '20' }]]}
                onPress={() => handleAnswer(question.question_id!, 'accept')}
              >
                <Ionicons name="checkmark-circle" size={24} color={currentAnswer === 'accept' ? colors.success : colors.textTertiary} />
                <Text style={[styles.buttonText, { color: colors.text }]}>I Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.declineButton, { borderColor: colors.border, backgroundColor: colors.cardBg }, currentAnswer === 'decline' && [styles.activeButton, { borderColor: colors.danger, backgroundColor: colors.danger + '20' }]]}
                onPress={() => handleAnswer(question.question_id!, 'decline')}
              >
                <Ionicons name="close-circle" size={24} color={currentAnswer === 'decline' ? colors.danger : colors.textTertiary} />
                <Text style={[styles.buttonText, { color: colors.text }]}>I Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
        
      case 'understand':
        return (
          <View key={question.question_id} style={[styles.questionCard, { backgroundColor: colors.cardBg, shadowColor: colors.border }]}>
            <View style={styles.questionHeader}>
              <View style={[styles.questionNumber, { backgroundColor: colors.success }]}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={[styles.questionText, { color: colors.text }]}>{question.text}</Text>
              <View style={[styles.pointsBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.pointsBadgeText, { color: colors.textSecondary }]}>{question.points} pts</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.understandButton, { backgroundColor: colors.success }]}
              onPress={() => handleAnswer(question.question_id!, 'understand')}
            >
              <Ionicons name="bulb" size={24} color="#fff" />
              <Text style={styles.understandButtonText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'learn_more':
        return (
          <View key={question.question_id} style={[styles.questionCard, { backgroundColor: colors.cardBg, shadowColor: colors.border }]}>
            <View style={styles.questionHeader}>
              <View style={[styles.questionNumber, { backgroundColor: colors.success }]}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={[styles.questionText, { color: colors.text }]}>{question.text}</Text>
              <View style={[styles.pointsBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.pointsBadgeText, { color: colors.textSecondary }]}>{question.points} pts</Text>
              </View>
            </View>
            <View style={styles.twoButtonRow}>
              <TouchableOpacity
                style={[styles.learnButton, { borderColor: colors.border, backgroundColor: colors.cardBg }, currentAnswer === 'learn_more' && [styles.activeButton, { borderColor: colors.success, backgroundColor: colors.success + '20' }]]}
                onPress={() => handleAnswer(question.question_id!, 'learn_more')}
              >
                <Ionicons name="school" size={24} color={currentAnswer === 'learn_more' ? colors.success : colors.textTertiary} />
                <Text style={[styles.buttonText, { color: colors.text }]}>I Will Learn More</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gotItButton, { borderColor: colors.border, backgroundColor: colors.cardBg }, currentAnswer === 'got_it' && [styles.activeButton, { borderColor: colors.success, backgroundColor: colors.success + '20' }]]}
                onPress={() => handleAnswer(question.question_id!, 'got_it')}
              >
                <Ionicons name="checkmark-circle" size={24} color={currentAnswer === 'got_it' ? colors.success : colors.textTertiary} />
                <Text style={[styles.buttonText, { color: colors.text }]}>I Got It</Text>
              </TouchableOpacity>
            </View>
            {currentAnswer === 'learn_more' && (
              <TextInput
                style={[styles.explanationInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                placeholder="What would you like to learn more about?"
                placeholderTextColor={colors.placeholder}
                multiline
                value={explanationText[question.question_id!] || ''}
                onChangeText={(text) => setExplanationText({...explanationText, [question.question_id!]: text})}
              />
            )}
          </View>
        );
        
      default:
        return (
          <View key={question.question_id} style={[styles.questionCard, { backgroundColor: colors.cardBg, shadowColor: colors.border }]}>
            <View style={styles.questionHeader}>
              <View style={[styles.questionNumber, { backgroundColor: colors.success }]}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={[styles.questionText, { color: colors.text }]}>{question.text}</Text>
              <View style={[styles.pointsBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.pointsBadgeText, { color: colors.textSecondary }]}>{question.points} pts</Text>
              </View>
            </View>
            <Text style={[styles.unsupportedText, { color: colors.textTertiary }]}>This question type is not supported</Text>
          </View>
        );
    }
  };

  const renderGradingQuestion = ({ item, index }: { item: Question; index: number }) => {
    if (!selectedResponseId) return null;
    const response = responses.find(r => r.response_id === selectedResponseId);
    const userAnswer = response?.answers.find(a => a.question === item.id);
    let answerDisplay = userAnswer?.answer_text || '';
    
    if (userAnswer?.answer_choices && userAnswer.answer_choices.length > 0) {
      answerDisplay = userAnswer.answer_choices.join(', ');
    }
    
    if (userAnswer?.answer_explanation) {
      answerDisplay = `${answerDisplay}\nExplanation: ${userAnswer.answer_explanation}`;
    }
    
    const currentScore = scores[item.question_id!] || 0;
    
    return (
      <View key={item.question_id} style={[styles.gradingCard, { backgroundColor: colors.cardBg, borderLeftColor: colors.warning, shadowColor: colors.border }]}>
        <View style={styles.questionHeader}>
          <View style={[styles.questionNumber, { backgroundColor: colors.success }]}>
            <Text style={styles.questionNumberText}>{index + 1}</Text>
          </View>
          <Text style={[styles.questionText, { color: colors.text }]}>{item.text}</Text>
          <View style={[styles.pointsBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pointsBadgeText, { color: colors.textSecondary }]}>{item.points} pts</Text>
          </View>
        </View>
        
        <View style={[styles.answerContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>Reader's Answer:</Text>
          <Text style={[styles.answerText, { color: colors.text }]}>{answerDisplay || 'No answer'}</Text>
        </View>
        
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreLabel, { color: colors.text }]}>Score (max {item.points}):</Text>
          <TextInput
            style={[styles.scoreInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            keyboardType="number-pad"
            value={currentScore.toString()}
            onChangeText={(text) => handleScore(item.question_id!, text, item.points)}
            placeholder="0"
            placeholderTextColor={colors.placeholder}
          />
          <Text style={[styles.scoreMax, { color: colors.textSecondary }]}>/{item.points}</Text>
        </View>
        
        <TextInput
          style={[styles.feedbackInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Add feedback for this question..."
          placeholderTextColor={colors.placeholder}
          value={feedbacks[item.question_id!] || ''}
          onChangeText={(text) => setFeedbacks({...feedbacks, [item.question_id!]: text})}
          multiline
        />
      </View>
    );
  };

  // Modals
  const ResultsModal = () => (
    <Modal
      visible={showResultsModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowResultsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.resultsModalContainer, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.resultsModalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.resultsModalTitle, { color: colors.success }]}>Your Grade Results</Text>
            <TouchableOpacity onPress={() => setShowResultsModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.resultsModalContent}>
            {selectedResponseForResults && form && (
              <>
                <View style={[styles.scoreSummaryCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.scoreSummaryTitle, { color: colors.textSecondary }]}>Overall Score</Text>
                  <Text style={[styles.scoreSummaryValue, { color: colors.text }]}>
                    {selectedResponseForResults.total_score?.toFixed(0)} / {selectedResponseForResults.max_possible_score}
                  </Text>
                  <Text style={[styles.scoreSummaryPercentage, { color: colors.success }]}>
                    {selectedResponseForResults.percentage?.toFixed(1)}%
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    (selectedResponseForResults.percentage || 0) >= 70 ? [styles.passedBadge, { backgroundColor: colors.goodScore }] : [styles.failedBadge, { backgroundColor: colors.warning }]
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {(selectedResponseForResults.percentage || 0) >= 70 ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.detailedTitle, { color: colors.primary }]}>Detailed Results</Text>
                
                {form.questions.map((question, idx) => {
                  const answer = selectedResponseForResults.answers.find(a => a.question === question.id);
                  const score = answer?.score || 0;
                  const maxScore = question.points;
                  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                  
                  return (
                    <View key={question.question_id} style={[styles.resultItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.resultItemHeader}>
                        <Text style={[styles.resultItemNumber, { color: colors.success }]}>Q{idx + 1}</Text>
                        <Text style={[styles.resultItemText, { color: colors.text }]}>{question.text}</Text>
                      </View>
                      <Text style={[styles.resultItemAnswer, { color: colors.textSecondary }]}>
                        Your answer: {answer?.answer_text || answer?.answer_choices?.join(', ') || 'No answer'}
                      </Text>
                      <View style={styles.resultItemScoreRow}>
                        <Text style={[styles.resultItemScoreLabel, { color: colors.textSecondary }]}>Score:</Text>
                        <Text style={[
                          styles.resultItemScore,
                          percentage >= 70 ? { color: colors.goodScore } : percentage >= 50 ? { color: colors.averageScore } : { color: colors.badScore }
                        ]}>
                          {score} / {maxScore}
                        </Text>
                      </View>
                      {answer?.feedback && (
                        <Text style={[styles.resultItemFeedback, { color: colors.info }]}>Feedback: {answer.feedback}</Text>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
          
          <TouchableOpacity 
            style={[styles.retakeButton, { backgroundColor: colors.warning }]}
            onPress={() => {
              setShowResultsModal(false);
              handleRetakeForm();
            }}
          >
            <Ionicons name="refresh-circle" size={20} color="#fff" />
            <Text style={styles.retakeButtonText}>Take Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const RetakeConfirmationModal = () => (
    <Modal
      visible={showRetakeConfirmation}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowRetakeConfirmation(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.confirmModal, { backgroundColor: colors.cardBg }]}>
          <Ionicons name="refresh-circle" size={50} color={colors.warning} />
          <Text style={[styles.confirmTitle, { color: colors.text }]}>Retake Form?</Text>
          <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
            Taking the form again will reset your previous answers. Your previous grade will be replaced with the new one.
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity 
              style={[styles.confirmCancel, { borderColor: colors.border }]} 
              onPress={() => setShowRetakeConfirmation(false)}
            >
              <Text style={[styles.confirmCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmRetake, { backgroundColor: colors.warning }]} 
              onPress={confirmRetake}
            >
              <Text style={styles.confirmRetakeText}>Retake</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Loading state
  if (loading || userLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.success} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading form...</Text>
      </View>
    );
  }

  if (!form) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>Form not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButtonSmall, { backgroundColor: colors.success }]}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSubmittedNotGraded = hasSubmitted && !userResponse?.is_graded;
  const isSubmittedAndGraded = hasSubmitted && userResponse?.is_graded;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{form.title}</Text>
        {isOwner && !gradingMode && (
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Dropdown Menu */}
      {showMenu && (
        <TouchableOpacity 
          style={styles.menuOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.dropdownMenu, { backgroundColor: colors.cardBg, shadowColor: colors.border }]}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/dashboard');
              }}
            >
              <Ionicons name="home-outline" size={20} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Dashboard</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Tab Bar for Owner View */}
      {isOwner && !gradingMode && (
        <View style={[styles.tabBar, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'respond' && [styles.tabActive, { borderBottomColor: colors.success }]]}
            onPress={() => setActiveTab('respond')}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'respond' && [styles.tabTextActive, { color: colors.success }]]}>Respond</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'responses' && [styles.tabActive, { borderBottomColor: colors.success }]]}
            onPress={() => setActiveTab('responses')}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'responses' && [styles.tabTextActive, { color: colors.success }]]}>
              Responses ({responses.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.success]} tintColor={colors.success} />
        }
      >
        {/* Form Info Section */}
        <View style={[styles.infoSection, { backgroundColor: colors.cardBg, shadowColor: colors.border }]}>
          <View style={[styles.infoHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="information-circle" size={24} color={colors.success} />
            </View>
            <Text style={[styles.infoTitle, { color: colors.success }]}>Form Information</Text>
          </View>
          <Text style={[styles.formTitle, { color: colors.text }]}>{form.title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{form.description || 'No description provided'}</Text>
          <View style={styles.infoRow}>
            <View style={[styles.infoBadge, { backgroundColor: colors.surface }]}>
              <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.infoBadgeText, { color: colors.textSecondary }]}>By: {form.composer_name}</Text>
            </View>
            <View style={[styles.infoBadge, { backgroundColor: colors.surface }]}>
              <Ionicons name="help-circle-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.infoBadgeText, { color: colors.textSecondary }]}>{form.questions?.length || 0} questions</Text>
            </View>
            <View style={[styles.infoBadge, { backgroundColor: colors.surface }]}>
              <Ionicons name="star-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.infoBadgeText, { color: colors.textSecondary }]}>{form.total_points} pts</Text>
            </View>
          </View>
        </View>

        {!gradingMode ? (
          <>
            {/* Non-owner views */}
            {!isOwner && (
              <>
                {/* Not submitted - Show response form */}
                {!hasSubmitted && (
                  <>
                    {form.questions.map((question, index) => renderQuestionByType(question, index))}
                    <TouchableOpacity 
                      style={[styles.submitButton, { backgroundColor: colors.success }]} 
                      onPress={submitResponse}
                      disabled={isSubmitting}
                    >
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>
                        {isSubmitting ? 'Submitting...' : 'Submit My Responses'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Submitted waiting for grading */}
                {isSubmittedNotGraded && (
                  <View style={[styles.waitingContainer, { backgroundColor: colors.warning + '20' }]}>
                    <Ionicons name="time-outline" size={48} color={colors.warning} />
                    <Text style={[styles.waitingTitle, { color: colors.warning }]}>Waiting for Grading</Text>
                    <Text style={[styles.waitingText, { color: colors.textSecondary }]}>Your responses have been submitted successfully.</Text>
                    <Text style={[styles.waitingSubtext, { color: colors.textTertiary }]}>The form creator will grade your responses soon.</Text>
                    <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.warning }]} onPress={onRefresh}>
                      <Ionicons name="refresh-outline" size={20} color="#fff" />
                      <Text style={styles.refreshButtonText}>Refresh Status</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Submitted and graded */}
                {isSubmittedAndGraded && userResponse && (
                  <View style={[styles.gradedContainer, { backgroundColor: colors.goodScore + '20' }]}>
                    <Ionicons name="checkmark-done-circle" size={48} color={colors.goodScore} />
                    <Text style={[styles.gradedTitle, { color: colors.goodScore }]}>Your Response Has Been Graded!</Text>
                    <View style={styles.scorePreview}>
                      <Text style={[styles.scorePreviewText, { color: colors.text }]}>
                        Score: {userResponse.total_score?.toFixed(0)} / {userResponse.max_possible_score}
                      </Text>
                      <Text style={[styles.scorePreviewPercentage, { color: colors.goodScore }]}>
                        ({userResponse.percentage?.toFixed(1)}%)
                      </Text>
                    </View>
                    <View style={styles.gradedButtonsRow}>
                      <TouchableOpacity style={[styles.viewGradeButton, { backgroundColor: colors.primary }]} onPress={() => viewGrade(userResponse)}>
                        <Ionicons name="school-outline" size={20} color="#fff" />
                        <Text style={styles.viewGradeButtonText}>View My Grade</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.retakeButton, { backgroundColor: colors.warning }]} onPress={handleRetakeForm}>
                        <Ionicons name="refresh-circle" size={20} color="#fff" />
                        <Text style={styles.retakeButtonText}>Take Again</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Owner respond tab */}
            {isOwner && activeTab === 'respond' && (
              <>
                {!hasSubmitted ? (
                  <>
                    {form.questions.map((question, index) => renderQuestionByType(question, index))}
                    <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.success }]} onPress={submitResponse} disabled={isSubmitting}>
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Submit Test Response</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={[styles.submittedInfoContainer, { backgroundColor: colors.goodScore + '20' }]}>
                    <Ionicons name="checkmark-circle" size={48} color={colors.goodScore} />
                    <Text style={[styles.submittedInfoTitle, { color: colors.goodScore }]}>Test Response Submitted</Text>
                    <Text style={[styles.submittedInfoText, { color: colors.textSecondary }]}>You have already submitted a test response.</Text>
                    {userResponse?.is_graded && (
                      <>
                        <View style={styles.scorePreview}>
                          <Text style={[styles.scorePreviewText, { color: colors.text }]}>
                            Score: {userResponse.total_score?.toFixed(0)} / {userResponse.max_possible_score}
                          </Text>
                          <Text style={[styles.scorePreviewPercentage, { color: colors.goodScore }]}>
                            ({userResponse.percentage?.toFixed(1)}%)
                          </Text>
                        </View>
                        <View style={styles.gradedButtonsRow}>
                          <TouchableOpacity style={[styles.viewGradeButton, { backgroundColor: colors.primary }]} onPress={() => viewGrade(userResponse)}>
                            <Ionicons name="school-outline" size={20} color="#fff" />
                            <Text style={styles.viewGradeButtonText}>View Results</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.retakeButton, { backgroundColor: colors.warning }]} onPress={handleRetakeForm}>
                            <Ionicons name="refresh-circle" size={20} color="#fff" />
                            <Text style={styles.retakeButtonText}>Take Again</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                    {!userResponse?.is_graded && (
                      <Text style={[styles.submittedInfoSubtext, { color: colors.textTertiary }]}>Waiting for grading...</Text>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Owner responses tab */}
            {isOwner && activeTab === 'responses' && (
              <View style={styles.responsesSection}>
                {responses.length === 0 ? (
                  <View style={[styles.infoMessage, { backgroundColor: colors.warning + '20' }]}>
                    <Ionicons name="people-outline" size={24} color={colors.warning} />
                    <Text style={[styles.infoMessageText, { color: colors.warning }]}>No responses yet.</Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.responsesTitle, { color: colors.success }]}>All Responses ({responses.length})</Text>
                    {responses.map((response) => (
                      <View key={response.response_id} style={[styles.responseCard, { backgroundColor: colors.cardBg, shadowColor: colors.border }]}>
                        <View style={styles.responseHeader}>
                          <View style={styles.responseAvatar}>
                            <Ionicons name="person-circle" size={40} color={colors.success} />
                          </View>
                          <View style={styles.responseInfo}>
                            <Text style={[styles.responseName, { color: colors.text }]}>{response.respondent_name || 'Anonymous'}</Text>
                            <Text style={[styles.responseEmail, { color: colors.textSecondary }]}>{response.respondent_email}</Text>
                            <Text style={[styles.responseDate, { color: colors.textTertiary }]}>
                              {new Date(response.submitted_at).toLocaleString()}
                            </Text>
                          </View>
                          {response.is_graded ? (
                            <View style={[styles.gradedBadge, { backgroundColor: colors.goodScore }]}>
                              <Text style={styles.gradedText}>{response.percentage?.toFixed(1)}%</Text>
                            </View>
                          ) : (
                            <View style={[styles.pendingBadge, { backgroundColor: colors.warning }]}>
                              <Text style={styles.pendingText}>Pending</Text>
                            </View>
                          )}
                          <View style={styles.responseActions}>
                            {!response.is_graded && (
                              <TouchableOpacity style={[styles.gradeButton, { backgroundColor: colors.success }]} onPress={() => startGrading(response.response_id)}>
                                <Ionicons name="checkmark-done" size={18} color="#fff" />
                                <Text style={styles.gradeButtonText}>Grade</Text>
                              </TouchableOpacity>
                            )}
                            {response.is_graded && (
                              <TouchableOpacity style={styles.viewGradeButtonSmall} onPress={() => viewGrade(response)}>
                                <Ionicons name="eye-outline" size={18} color={colors.primary} />
                                <Text style={[styles.viewGradeButtonSmallText, { color: colors.primary }]}>View</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => deleteResponse(response.response_id)}>
                              <Ionicons name="trash-outline" size={20} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Grading Mode */}
            <FlatList
              data={form.questions}
              keyExtractor={(item) => item.question_id!}
              renderItem={renderGradingQuestion}
              scrollEnabled={false}
            />
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.success }]} onPress={submitGrades}>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Grades</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <ResultsModal />
      <RetakeConfirmationModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  errorText: { fontSize: 18, marginBottom: 16 },
  backButtonSmall: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 60, paddingBottom: 12, borderBottomWidth: 0.5 },
  backButton: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row' },
  menuButton: { padding: 4 },
  menuOverlay: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 60, right: 16, left: 0, bottom: 0, zIndex: 1000 },
  dropdownMenu: { position: 'absolute', top: 40, right: 16, borderRadius: 12, paddingVertical: 8, minWidth: 180, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, zIndex: 1001 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  menuItemText: { fontSize: 15, fontWeight: '500' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 0.5 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2 },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabTextActive: { fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  infoSection: { borderRadius: 12, padding: 16, marginBottom: 16, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottomWidth: 0.5 },
  infoIconContainer: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontSize: 14, fontWeight: '600' },
  formTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  infoBadgeText: { fontSize: 11 },
  questionCard: { borderRadius: 12, padding: 16, marginBottom: 16, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  questionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  questionNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  questionNumberText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  questionText: { flex: 1, fontSize: 15, fontWeight: '500', lineHeight: 20 },
  pointsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pointsBadgeText: { fontSize: 12, fontWeight: '500' },
  answerInput: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, minHeight: 100, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  optionText: { fontSize: 15, flex: 1 },
  twoButtonRow: { flexDirection: 'row', gap: 12 },
  acceptButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderRadius: 10 },
  declineButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderRadius: 10 },
  learnButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderRadius: 10 },
  gotItButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderRadius: 10 },
  activeButton: { borderWidth: 2 },
  buttonText: { fontSize: 14, fontWeight: '500' },
  understandButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 10 },
  understandButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  explanationInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginTop: 12 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, marginTop: 20, marginBottom: 40 },
  submitButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  waitingContainer: { borderRadius: 12, padding: 30, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  waitingTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  waitingText: { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  waitingSubtext: { fontSize: 12, textAlign: 'center', marginBottom: 20 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25 },
  refreshButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  gradedContainer: { borderRadius: 12, padding: 30, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  gradedTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  scorePreview: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: 12 },
  scorePreviewText: { fontSize: 18, fontWeight: 'bold' },
  scorePreviewPercentage: { fontSize: 14, fontWeight: '600' },
  gradedButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  viewGradeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  viewGradeButtonText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  retakeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  retakeButtonText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  viewGradeButtonSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  viewGradeButtonSmallText: { fontSize: 12, fontWeight: '500' },
  submittedInfoContainer: { borderRadius: 12, padding: 30, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  submittedInfoTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  submittedInfoText: { fontSize: 14, textAlign: 'center' },
  submittedInfoSubtext: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  infoMessage: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, borderRadius: 12, marginTop: 20, marginBottom: 40 },
  infoMessageText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  responsesSection: { marginTop: 20, marginBottom: 40 },
  responsesTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  responseCard: { borderRadius: 12, padding: 16, marginBottom: 12, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  responseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  responseAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  responseInfo: { flex: 1 },
  responseName: { fontSize: 16, fontWeight: '600' },
  responseEmail: { fontSize: 12, marginTop: 2 },
  responseDate: { fontSize: 11, marginTop: 2 },
  gradedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  gradedText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  pendingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  pendingText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  responseActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8, paddingTop: 8, borderTopWidth: 0.5 },
  gradeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  gradeButtonText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  gradingCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  answerContainer: { padding: 12, borderRadius: 8, marginBottom: 12 },
  answerLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  answerText: { fontSize: 14, lineHeight: 20 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  scoreLabel: { fontSize: 14, fontWeight: '500' },
  scoreInput: { borderWidth: 1, borderRadius: 8, padding: 8, width: 80, textAlign: 'center', fontSize: 14 },
  scoreMax: { fontSize: 14 },
  feedbackInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  unsupportedText: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  resultsModalContainer: { borderRadius: 20, width: '90%', maxHeight: '80%' },
  resultsModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5 },
  resultsModalTitle: { fontSize: 18, fontWeight: 'bold' },
  resultsModalContent: { padding: 20 },
  scoreSummaryCard: { borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 20 },
  scoreSummaryTitle: { fontSize: 14, marginBottom: 8 },
  scoreSummaryValue: { fontSize: 32, fontWeight: 'bold' },
  scoreSummaryPercentage: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  statusBadge: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  passedBadge: { backgroundColor: '#4CAF50' },
  failedBadge: { backgroundColor: '#FF9800' },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  detailedTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  resultItemCard: { borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 0.5 },
  resultItemHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  resultItemNumber: { fontSize: 14, fontWeight: 'bold', marginRight: 8 },
  resultItemText: { flex: 1, fontSize: 14, fontWeight: '500' },
  resultItemAnswer: { fontSize: 12, marginBottom: 6 },
  resultItemScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultItemScoreLabel: { fontSize: 12 },
  resultItemScore: { fontSize: 14, fontWeight: 'bold' },
  resultItemFeedback: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  confirmModal: { borderRadius: 20, padding: 24, width: '85%', alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  confirmMessage: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  confirmButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '500' },
  confirmRetake: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmRetakeText: { fontSize: 14, color: '#fff', fontWeight: '500' },
});