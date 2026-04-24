import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, Platform, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { formService, Form, FormResponse, Question, SubmitResponseData, GradeResponseData } from '../../../lib/api/services/form.service';
import { useUser } from '../../../context/UserContext';

export default function FormResponseScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
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

  // Load user email from context
  useEffect(() => {
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
          <View style={styles.questionCard} key={question.question_id}>
            <View style={styles.questionHeader}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.questionText}>{question.text}</Text>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>{question.points} pts</Text>
              </View>
            </View>
            <TextInput
              style={styles.answerInput}
              placeholder="Type your answer here..."
              placeholderTextColor="#999"
              value={currentAnswer || ''}
              onChangeText={(text) => handleAnswer(question.question_id!, text)}
              multiline
            />
          </View>
        );
        
      case 'checkbox':
        return (
          <View style={styles.questionCard} key={question.question_id}>
            <View style={styles.questionHeader}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.questionText}>{question.text}</Text>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>{question.points} pts</Text>
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
                  color="#25D366" 
                />
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
        
      case 'radio':
        return (
          <View style={styles.questionCard} key={question.question_id}>
            <View style={styles.questionHeader}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.questionText}>{question.text}</Text>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>{question.points} pts</Text>
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
                  color="#25D366" 
                />
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
        
      case 'accept':
        return (
          <View style={styles.questionCard} key={question.question_id}>
            <View style={styles.questionHeader}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.questionText}>{question.text}</Text>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>{question.points} pts</Text>
              </View>
            </View>
            <View style={styles.twoButtonRow}>
              <TouchableOpacity
                style={[styles.acceptButton, currentAnswer === 'accept' && styles.activeButton]}
                onPress={() => handleAnswer(question.question_id!, 'accept')}
              >
                <Ionicons name="checkmark-circle" size={24} color={currentAnswer === 'accept' ? "#25D366" : "#999"} />
                <Text style={styles.buttonText}>I Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.declineButton, currentAnswer === 'decline' && styles.activeButton]}
                onPress={() => handleAnswer(question.question_id!, 'decline')}
              >
                <Ionicons name="close-circle" size={24} color={currentAnswer === 'decline' ? "#FF3B30" : "#999"} />
                <Text style={styles.buttonText}>I Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
        
      case 'understand':
        return (
          <View style={styles.questionCard} key={question.question_id}>
            <View style={styles.questionHeader}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.questionText}>{question.text}</Text>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>{question.points} pts</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.understandButton, currentAnswer === 'understand' && styles.activeButton]}
              onPress={() => handleAnswer(question.question_id!, 'understand')}
            >
              <Ionicons name="bulb" size={24} color="#fff" />
              <Text style={styles.understandButtonText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'learn_more':
        return (
          <View style={styles.questionCard} key={question.question_id}>
            <View style={styles.questionHeader}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.questionText}>{question.text}</Text>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>{question.points} pts</Text>
              </View>
            </View>
            <View style={styles.twoButtonRow}>
              <TouchableOpacity
                style={[styles.learnButton, currentAnswer === 'learn_more' && styles.activeButton]}
                onPress={() => handleAnswer(question.question_id!, 'learn_more')}
              >
                <Ionicons name="school" size={24} color={currentAnswer === 'learn_more' ? "#25D366" : "#999"} />
                <Text style={styles.buttonText}>I Will Learn More</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gotItButton, currentAnswer === 'got_it' && styles.activeButton]}
                onPress={() => handleAnswer(question.question_id!, 'got_it')}
              >
                <Ionicons name="checkmark-circle" size={24} color={currentAnswer === 'got_it' ? "#25D366" : "#999"} />
                <Text style={styles.buttonText}>I Got It</Text>
              </TouchableOpacity>
            </View>
            {currentAnswer === 'learn_more' && (
              <TextInput
                style={styles.explanationInput}
                placeholder="What would you like to learn more about?"
                placeholderTextColor="#999"
                multiline
                value={explanationText[question.question_id!] || ''}
                onChangeText={(text) => setExplanationText({...explanationText, [question.question_id!]: text})}
              />
            )}
          </View>
        );
        
      default:
        return (
          <View style={styles.questionCard} key={question.question_id}>
            <View style={styles.questionHeader}>
              <View style={styles.questionNumber}>
                <Text style={styles.questionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.questionText}>{question.text}</Text>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>{question.points} pts</Text>
              </View>
            </View>
            <Text style={styles.unsupportedText}>This question type is not supported</Text>
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
      <View key={item.question_id} style={styles.gradingCard}>
        <View style={styles.questionHeader}>
          <View style={styles.questionNumber}>
            <Text style={styles.questionNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.questionText}>{item.text}</Text>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsBadgeText}>{item.points} pts</Text>
          </View>
        </View>
        
        <View style={styles.answerContainer}>
          <Text style={styles.answerLabel}>Reader's Answer:</Text>
          <Text style={styles.answerText}>{answerDisplay || 'No answer'}</Text>
        </View>
        
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Score (max {item.points}):</Text>
          <TextInput
            style={styles.scoreInput}
            keyboardType="number-pad"
            value={currentScore.toString()}
            onChangeText={(text) => handleScore(item.question_id!, text, item.points)}
            placeholder="0"
            placeholderTextColor="#999"
          />
          <Text style={styles.scoreMax}>/{item.points}</Text>
        </View>
        
        <TextInput
          style={styles.feedbackInput}
          placeholder="Add feedback for this question..."
          placeholderTextColor="#999"
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
        <View style={styles.resultsModalContainer}>
          <View style={styles.resultsModalHeader}>
            <Text style={styles.resultsModalTitle}>Your Grade Results</Text>
            <TouchableOpacity onPress={() => setShowResultsModal(false)}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.resultsModalContent}>
            {selectedResponseForResults && form && (
              <>
                <View style={styles.scoreSummaryCard}>
                  <Text style={styles.scoreSummaryTitle}>Overall Score</Text>
                  <Text style={styles.scoreSummaryValue}>
                    {selectedResponseForResults.total_score?.toFixed(0)} / {selectedResponseForResults.max_possible_score}
                  </Text>
                  <Text style={styles.scoreSummaryPercentage}>
                    {selectedResponseForResults.percentage?.toFixed(1)}%
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    (selectedResponseForResults.percentage || 0) >= 70 ? styles.passedBadge : styles.failedBadge
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {(selectedResponseForResults.percentage || 0) >= 70 ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.detailedTitle}>Detailed Results</Text>
                
                {form.questions.map((question, idx) => {
                  const answer = selectedResponseForResults.answers.find(a => a.question === question.id);
                  const score = answer?.score || 0;
                  const maxScore = question.points;
                  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                  
                  return (
                    <View key={question.question_id} style={styles.resultItemCard}>
                      <View style={styles.resultItemHeader}>
                        <Text style={styles.resultItemNumber}>Q{idx + 1}</Text>
                        <Text style={styles.resultItemText}>{question.text}</Text>
                      </View>
                      <Text style={styles.resultItemAnswer}>
                        Your answer: {answer?.answer_text || answer?.answer_choices?.join(', ') || 'No answer'}
                      </Text>
                      <View style={styles.resultItemScoreRow}>
                        <Text style={styles.resultItemScoreLabel}>Score:</Text>
                        <Text style={[
                          styles.resultItemScore,
                          percentage >= 70 ? styles.goodScore : percentage >= 50 ? styles.averageScore : styles.badScore
                        ]}>
                          {score} / {maxScore}
                        </Text>
                      </View>
                      {answer?.feedback && (
                        <Text style={styles.resultItemFeedback}>Feedback: {answer.feedback}</Text>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
          
          <View style={styles.resultsModalFooter}>
            <TouchableOpacity 
              style={styles.retakeButton}
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
        <View style={styles.confirmModal}>
          <Ionicons name="refresh-circle" size={50} color="#FF9800" />
          <Text style={styles.confirmTitle}>Retake Form?</Text>
          <Text style={styles.confirmMessage}>
            Taking the form again will reset your previous answers. Your previous grade will be replaced with the new one.
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity 
              style={styles.confirmCancel} 
              onPress={() => setShowRetakeConfirmation(false)}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmRetake} 
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    );
  }

  if (!form) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Form not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonSmall}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSubmittedNotGraded = hasSubmitted && !userResponse?.is_graded;
  const isSubmittedAndGraded = hasSubmitted && userResponse?.is_graded;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{form.title}</Text>
        {isOwner && !gradingMode && (
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={22} color="#000000" />
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
          <View style={styles.dropdownMenu}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/dashboard');
              }}
            >
              <Ionicons name="home-outline" size={20} color="#000000" />
              <Text style={styles.menuItemText}>Dashboard</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Tab Bar for Owner View */}
      {isOwner && !gradingMode && (
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'respond' && styles.tabActive]}
            onPress={() => setActiveTab('respond')}
          >
            <Text style={[styles.tabText, activeTab === 'respond' && styles.tabTextActive]}>Respond</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'responses' && styles.tabActive]}
            onPress={() => setActiveTab('responses')}
          >
            <Text style={[styles.tabText, activeTab === 'responses' && styles.tabTextActive]}>
              Responses ({responses.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#25D366"]} tintColor="#25D366" />
        }
      >
        {/* Form Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={24} color="#25D366" />
            </View>
            <Text style={styles.infoTitle}>Form Information</Text>
          </View>
          <Text style={styles.formTitle}>{form.title}</Text>
          <Text style={styles.description}>{form.description || 'No description provided'}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoBadge}>
              <Ionicons name="person-outline" size={12} color="#666" />
              <Text style={styles.infoBadgeText}>By: {form.composer_name}</Text>
            </View>
            <View style={styles.infoBadge}>
              <Ionicons name="help-circle-outline" size={12} color="#666" />
              <Text style={styles.infoBadgeText}>{form.questions?.length || 0} questions</Text>
            </View>
            <View style={styles.infoBadge}>
              <Ionicons name="star-outline" size={12} color="#666" />
              <Text style={styles.infoBadgeText}>{form.total_points} pts</Text>
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
                      style={styles.submitButton} 
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
                  <View style={styles.waitingContainer}>
                    <Ionicons name="time-outline" size={48} color="#FF9800" />
                    <Text style={styles.waitingTitle}>Waiting for Grading</Text>
                    <Text style={styles.waitingText}>Your responses have been submitted successfully.</Text>
                    <Text style={styles.waitingSubtext}>The form creator will grade your responses soon.</Text>
                    <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                      <Ionicons name="refresh-outline" size={20} color="#fff" />
                      <Text style={styles.refreshButtonText}>Refresh Status</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Submitted and graded */}
                {isSubmittedAndGraded && userResponse && (
                  <View style={styles.gradedContainer}>
                    <Ionicons name="checkmark-done-circle" size={48} color="#4CAF50" />
                    <Text style={styles.gradedTitle}>Your Response Has Been Graded!</Text>
                    <View style={styles.scorePreview}>
                      <Text style={styles.scorePreviewText}>
                        Score: {userResponse.total_score?.toFixed(0)} / {userResponse.max_possible_score}
                      </Text>
                      <Text style={styles.scorePreviewPercentage}>
                        ({userResponse.percentage?.toFixed(1)}%)
                      </Text>
                    </View>
                    <View style={styles.gradedButtonsRow}>
                      <TouchableOpacity style={styles.viewGradeButton} onPress={() => viewGrade(userResponse)}>
                        <Ionicons name="school-outline" size={20} color="#fff" />
                        <Text style={styles.viewGradeButtonText}>View My Grade</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.retakeButton} onPress={handleRetakeForm}>
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
                    <TouchableOpacity style={styles.submitButton} onPress={submitResponse} disabled={isSubmitting}>
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Submit Test Response</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.submittedInfoContainer}>
                    <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                    <Text style={styles.submittedInfoTitle}>Test Response Submitted</Text>
                    <Text style={styles.submittedInfoText}>You have already submitted a test response.</Text>
                    {userResponse?.is_graded && (
                      <>
                        <View style={styles.scorePreview}>
                          <Text style={styles.scorePreviewText}>
                            Score: {userResponse.total_score?.toFixed(0)} / {userResponse.max_possible_score}
                          </Text>
                          <Text style={styles.scorePreviewPercentage}>
                            ({userResponse.percentage?.toFixed(1)}%)
                          </Text>
                        </View>
                        <View style={styles.gradedButtonsRow}>
                          <TouchableOpacity style={styles.viewGradeButton} onPress={() => viewGrade(userResponse)}>
                            <Ionicons name="school-outline" size={20} color="#fff" />
                            <Text style={styles.viewGradeButtonText}>View Results</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.retakeButton} onPress={handleRetakeForm}>
                            <Ionicons name="refresh-circle" size={20} color="#fff" />
                            <Text style={styles.retakeButtonText}>Take Again</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                    {!userResponse?.is_graded && (
                      <Text style={styles.submittedInfoSubtext}>Waiting for grading...</Text>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Owner responses tab */}
            {isOwner && activeTab === 'responses' && (
              <View style={styles.responsesSection}>
                {responses.length === 0 ? (
                  <View style={styles.infoMessage}>
                    <Ionicons name="people-outline" size={24} color="#999" />
                    <Text style={styles.infoMessageText}>No responses yet.</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.responsesTitle}>All Responses ({responses.length})</Text>
                    {responses.map((response) => (
                      <View key={response.response_id} style={styles.responseCard}>
                        <View style={styles.responseHeader}>
                          <View style={styles.responseAvatar}>
                            <Ionicons name="person-circle" size={40} color="#25D366" />
                          </View>
                          <View style={styles.responseInfo}>
                            <Text style={styles.responseName}>{response.respondent_name || 'Anonymous'}</Text>
                            <Text style={styles.responseEmail}>{response.respondent_email}</Text>
                            <Text style={styles.responseDate}>
                              {new Date(response.submitted_at).toLocaleString()}
                            </Text>
                          </View>
                          {response.is_graded ? (
                            <View style={styles.gradedBadge}>
                              <Text style={styles.gradedText}>{response.percentage?.toFixed(1)}%</Text>
                            </View>
                          ) : (
                            <View style={styles.pendingBadge}>
                              <Text style={styles.pendingText}>Pending</Text>
                            </View>
                          )}
                          <View style={styles.responseActions}>
                            {!response.is_graded && (
                              <TouchableOpacity style={styles.gradeButton} onPress={() => startGrading(response.response_id)}>
                                <Ionicons name="checkmark-done" size={18} color="#fff" />
                                <Text style={styles.gradeButtonText}>Grade</Text>
                              </TouchableOpacity>
                            )}
                            {response.is_graded && (
                              <TouchableOpacity style={styles.viewGradeButtonSmall} onPress={() => viewGrade(response)}>
                                <Ionicons name="eye-outline" size={18} color="#075E54" />
                                <Text style={styles.viewGradeButtonSmallText}>View</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => deleteResponse(response.response_id)}>
                              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
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
            <TouchableOpacity style={styles.submitButton} onPress={submitGrades}>
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorText: { fontSize: 18, color: '#FF3B30', marginBottom: 16 },
  backButtonSmall: { backgroundColor: '#25D366', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  header: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 60, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  backButton: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#000000' },
  headerRight: { flexDirection: 'row' },
  menuButton: { padding: 4 },
  menuOverlay: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 60, right: 16, left: 0, bottom: 0, zIndex: 1000 },
  dropdownMenu: { position: 'absolute', top: 40, right: 16, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, minWidth: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, zIndex: 1001 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  menuItemText: { fontSize: 15, color: '#000000', fontWeight: '500' },
  menuDivider: { height: 0.5, backgroundColor: '#e0e0e0' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#25D366' },
  tabText: { fontSize: 14, color: '#666', fontWeight: '500' },
  tabTextActive: { color: '#25D366' },
  content: { flex: 1, padding: 16 },
  infoSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  infoIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#25D366' },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  description: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  infoBadgeText: { fontSize: 11, color: '#666' },
  questionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  questionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  questionNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  questionNumberText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  questionText: { flex: 1, fontSize: 15, color: '#000', fontWeight: '500', lineHeight: 20 },
  pointsBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pointsBadgeText: { fontSize: 12, color: '#666', fontWeight: '500' },
  answerInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 14, fontSize: 15, minHeight: 100, textAlignVertical: 'top', backgroundColor: '#fafafa', color: '#000' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  optionText: { fontSize: 15, color: '#333', flex: 1 },
  twoButtonRow: { flexDirection: 'row', gap: 12 },
  acceptButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, backgroundColor: '#fff' },
  declineButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, backgroundColor: '#fff' },
  learnButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, backgroundColor: '#fff' },
  gotItButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, backgroundColor: '#fff' },
  activeButton: { borderColor: '#25D366', backgroundColor: '#e8f5e9' },
  buttonText: { fontSize: 14, color: '#333', fontWeight: '500' },
  understandButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#25D366', padding: 14, borderRadius: 10 },
  understandButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  explanationInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginTop: 12, backgroundColor: '#fafafa', color: '#000' },
  submitButton: { backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, marginTop: 20, marginBottom: 40 },
  submitButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  waitingContainer: { backgroundColor: '#FFF3E0', borderRadius: 12, padding: 30, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  waitingTitle: { fontSize: 20, fontWeight: 'bold', color: '#FF9800', marginTop: 12, marginBottom: 8 },
  waitingText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 8 },
  waitingSubtext: { fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 20 },
  refreshButton: { backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25 },
  refreshButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  gradedContainer: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 30, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  gradedTitle: { fontSize: 20, fontWeight: 'bold', color: '#4CAF50', marginTop: 12, marginBottom: 8 },
  scorePreview: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: 12 },
  scorePreviewText: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  scorePreviewPercentage: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  gradedButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  viewGradeButton: { backgroundColor: '#075E54', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  viewGradeButtonText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  retakeButton: { backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  retakeButtonText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  viewGradeButtonSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  viewGradeButtonSmallText: { fontSize: 12, color: '#075E54', fontWeight: '500' },
  submittedInfoContainer: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 30, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  submittedInfoTitle: { fontSize: 20, fontWeight: 'bold', color: '#4CAF50', marginTop: 12, marginBottom: 8 },
  submittedInfoText: { fontSize: 14, color: '#666', textAlign: 'center' },
  submittedInfoSubtext: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 },
  infoMessage: { backgroundColor: '#FFF3E0', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, borderRadius: 12, marginTop: 20, marginBottom: 40 },
  infoMessageText: { fontSize: 14, color: '#FF9800', fontWeight: '500', textAlign: 'center' },
  responsesSection: { marginTop: 20, marginBottom: 40 },
  responsesTitle: { fontSize: 18, fontWeight: 'bold', color: '#25D366', marginBottom: 12 },
  responseCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  responseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  responseAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  responseInfo: { flex: 1 },
  responseName: { fontSize: 16, fontWeight: '600', color: '#000' },
  responseEmail: { fontSize: 12, color: '#666', marginTop: 2 },
  responseDate: { fontSize: 11, color: '#999', marginTop: 2 },
  gradedBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  gradedText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  pendingBadge: { backgroundColor: '#FF9800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  pendingText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  responseActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#e0e0e0' },
  gradeButton: { backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  gradeButtonText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  gradingCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#FF9800', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  answerContainer: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 12 },
  answerLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  answerText: { fontSize: 14, color: '#000', lineHeight: 20 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  scoreLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  scoreInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 8, width: 80, textAlign: 'center', fontSize: 14, backgroundColor: '#fff', color: '#000' },
  scoreMax: { fontSize: 14, color: '#666' },
  feedbackInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: 'top', backgroundColor: '#fafafa', color: '#000' },
  noQuestionsContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 40, alignItems: 'center', marginBottom: 16 },
  noQuestionsText: { fontSize: 16, fontWeight: '600', color: '#666', marginTop: 12 },
  noQuestionsSubtext: { fontSize: 14, color: '#999', marginTop: 4, textAlign: 'center' },
  unsupportedText: { fontSize: 14, color: '#999', fontStyle: 'italic', textAlign: 'center', padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  resultsModalContainer: { backgroundColor: '#fff', borderRadius: 20, width: '90%', maxHeight: '80%' },
  resultsModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  resultsModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#25D366' },
  resultsModalContent: { padding: 20 },
  resultsModalFooter: { padding: 20, borderTopWidth: 0.5, borderTopColor: '#e0e0e0' },
  scoreSummaryCard: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 20 },
  scoreSummaryTitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  scoreSummaryValue: { fontSize: 32, fontWeight: 'bold', color: '#000' },
  scoreSummaryPercentage: { fontSize: 18, color: '#25D366', fontWeight: '600', marginTop: 4 },
  statusBadge: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  passedBadge: { backgroundColor: '#4CAF50' },
  failedBadge: { backgroundColor: '#FF9800' },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  detailedTitle: { fontSize: 16, fontWeight: 'bold', color: '#075E54', marginBottom: 12 },
  resultItemCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 0.5, borderColor: '#e0e0e0' },
  resultItemHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  resultItemNumber: { fontSize: 14, fontWeight: 'bold', color: '#25D366', marginRight: 8 },
  resultItemText: { flex: 1, fontSize: 14, color: '#000', fontWeight: '500' },
  resultItemAnswer: { fontSize: 12, color: '#666', marginBottom: 6 },
  resultItemScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultItemScoreLabel: { fontSize: 12, color: '#666' },
  resultItemScore: { fontSize: 14, fontWeight: 'bold' },
  goodScore: { color: '#4CAF50' },
  averageScore: { color: '#FF9800' },
  badScore: { color: '#F44336' },
  resultItemFeedback: { fontSize: 12, color: '#2196F3', marginTop: 6, fontStyle: 'italic' },
  confirmModal: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '85%', alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: 'bold', color: '#000', marginTop: 16, marginBottom: 8 },
  confirmMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  confirmButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center' },
  confirmCancelText: { fontSize: 14, color: '#666', fontWeight: '500' },
  confirmRetake: { flex: 1, backgroundColor: '#FF9800', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmRetakeText: { fontSize: 14, color: '#fff', fontWeight: '500' },
});