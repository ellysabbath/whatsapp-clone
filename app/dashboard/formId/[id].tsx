import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Question {
  id: string;
  text: string;
  type: 'short_answer' | 'checkbox' | 'radio' | 'accept' | 'understand' | 'learn_more';
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
  composer: string;
  responses: Response[];
}

const CURRENT_USER = 'Current User';
const CURRENT_RESPONDENT = 'Current Respondent';

export default function FormResponseScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<{[key: string]: any}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<'composer' | 'reader'>('reader');
  const [gradingMode, setGradingMode] = useState(false);
  const [selectedResponseIndex, setSelectedResponseIndex] = useState<number | null>(null);
  const [scores, setScores] = useState<{[key: string]: number}>({});
  const [feedbacks, setFeedbacks] = useState<{[key: string]: string}>({});
  const [showResults, setShowResults] = useState(false);
  const [explanationText, setExplanationText] = useState<{[key: string]: string}>({});
  const [activeTab, setActiveTab] = useState<'respond' | 'responses'>('respond');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    loadForm();
  }, [id]);

  const loadForm = async () => {
    try {
      const storedForms = await AsyncStorage.getItem('evangelistic_forms');
      if (storedForms) {
        const forms = JSON.parse(storedForms);
        const currentForm = forms.find((f: Form) => f.id === id);
        setForm(currentForm);
        
        if (currentForm) {
          if (currentForm.composer === CURRENT_USER) {
            setUserRole('composer');
          } else {
            setUserRole('reader');
            // Check if already submitted
            const existingResponse = currentForm.responses.find(r => r.userId === CURRENT_RESPONDENT);
            if (existingResponse && existingResponse.graded) {
              setShowResults(true);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading form:', error);
      Alert.alert('Error', 'Failed to load form');
    }
  };

  const saveForm = async (updatedForm: Form) => {
    try {
      const storedForms = await AsyncStorage.getItem('evangelistic_forms');
      if (storedForms) {
        const forms = JSON.parse(storedForms);
        const index = forms.findIndex((f: Form) => f.id === id);
        if (index !== -1) {
          forms[index] = updatedForm;
          await AsyncStorage.setItem('evangelistic_forms', JSON.stringify(forms));
          setForm(updatedForm);
        }
      }
    } catch (error) {
      console.error('Error saving form:', error);
      Alert.alert('Error', 'Failed to save form');
    }
  };

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

  const submitResponse = async () => {
    if (!form) return;
    
    const existingResponse = form.responses.find(r => r.userId === CURRENT_RESPONDENT);
    if (existingResponse) {
      Alert.alert('Already Submitted', 'You have already submitted this form');
      return;
    }
    
    // Check if all questions are answered
    const unanswered = form.questions.filter(q => {
      if (q.type === 'learn_more' && answers[q.id] === 'learn_more') {
        return !answers[q.id] || (answers[q.id] === 'learn_more' && !explanationText[q.id]);
      }
      return !answers[q.id];
    });
    
    if (unanswered.length > 0) {
      Alert.alert('Incomplete', `Please answer all ${unanswered.length} questions before submitting`);
      return;
    }

    setIsSubmitting(true);
    
    const formattedAnswers = form.questions.map(q => {
      let answer = answers[q.id];
      if (q.type === 'learn_more' && answer === 'learn_more') {
        answer = { choice: 'learn_more', explanation: explanationText[q.id] };
      }
      return {
        questionId: q.id,
        answer: answer,
      };
    });
    
    const responseData = {
      userId: CURRENT_RESPONDENT,
      userName: userRole === 'composer' ? 'Composer (Test Submission)' : 'Current Respondent',
      answers: formattedAnswers,
      submittedAt: new Date().toISOString(),
      graded: false,
    };

    const updatedForm = {
      ...form,
      responses: [...form.responses, responseData],
    };

    await saveForm(updatedForm);
    Alert.alert('Success', 'Your responses have been submitted successfully!');
    setIsSubmitting(false);
    
    // Reset answers after submission
    setAnswers({});
    setExplanationText({});
    
    // Reload form to update UI
    loadForm();
  };

  const startGrading = (index: number) => {
    setSelectedResponseIndex(index);
    const response = form?.responses[index];
    if (response) {
      const initialScores: {[key: string]: number} = {};
      form?.questions.forEach(question => {
        const userAnswer = response.answers.find(a => a.questionId === question.id);
        initialScores[question.id] = userAnswer?.score || 0;
      });
      setScores(initialScores);
    }
    setGradingMode(true);
  };

  // Updated handleScore to support decimals
  const handleScore = (questionId: string, score: string, maxPoints: number) => {
    // Allow empty string for clearing input
    if (score === '') {
      setScores({...scores, [questionId]: 0});
      return;
    }
    
    // Parse as float to support decimals
    const numericScore = parseFloat(score);
    
    // Check if valid number and within bounds
    if (!isNaN(numericScore) && numericScore <= maxPoints && numericScore >= 0) {
      // Round to 2 decimal places for display
      const roundedScore = Math.round(numericScore * 100) / 100;
      setScores({...scores, [questionId]: roundedScore});
    }
  };

  const submitGrades = async () => {
    if (!form || selectedResponseIndex === null) return;
    
    const totalPoints = form.questions.reduce((sum, q) => sum + q.points, 0);
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const percentage = (totalScore / totalPoints) * 100;
    
    const updatedResponse = {
      ...form.responses[selectedResponseIndex],
      answers: form.questions.map(q => ({
        questionId: q.id,
        answer: form.responses[selectedResponseIndex].answers.find(a => a.questionId === q.id)?.answer,
        score: scores[q.id] || 0,
        feedback: feedbacks[q.id] || '',
      })),
      totalScore: totalScore,
      maxScore: totalPoints,
      percentage: percentage,
      graded: true,
      gradedAt: new Date().toISOString(),
      gradedBy: CURRENT_USER,
    };
    
    const updatedResponses = [...form.responses];
    updatedResponses[selectedResponseIndex] = updatedResponse;
    
    const updatedForm = {
      ...form,
      responses: updatedResponses,
    };
    
    await saveForm(updatedForm);
    Alert.alert('Success', `Grades submitted! Score: ${totalScore.toFixed(2)}/${totalPoints} (${percentage.toFixed(1)}%)`);
    setGradingMode(false);
    setSelectedResponseIndex(null);
    setScores({});
    setFeedbacks({});
    
    // Reload form to update UI
    loadForm();
  };

  const renderQuestion = ({ item, index }: { item: Question; index: number }) => {
    const currentAnswer = answers[item.id];
    const hasSubmitted = form?.responses.some(r => r.userId === CURRENT_RESPONDENT);
    
    // Don't show questions if already submitted
    if (hasSubmitted && userRole !== 'composer') return null;
    
    switch(item.type) {
      case 'short_answer':
        return (
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>{index + 1}</Text>
              <Text style={styles.questionText}>{item.text}</Text>
              <Text style={styles.pointsBadge}>{item.points} pts</Text>
            </View>
            <TextInput
              style={styles.answerInput}
              placeholder="Type your answer here..."
              value={currentAnswer || ''}
              onChangeText={(text) => handleAnswer(item.id, text)}
              multiline
            />
          </View>
        );
        
      case 'checkbox':
        return (
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>{index + 1}</Text>
              <Text style={styles.questionText}>{item.text}</Text>
              <Text style={styles.pointsBadge}>{item.points} pts</Text>
            </View>
            {item.options?.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.optionRow}
                onPress={() => handleCheckbox(item.id, option)}
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
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>{index + 1}</Text>
              <Text style={styles.questionText}>{item.text}</Text>
              <Text style={styles.pointsBadge}>{item.points} pts</Text>
            </View>
            {item.options?.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.optionRow}
                onPress={() => handleAnswer(item.id, option)}
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
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>{index + 1}</Text>
              <Text style={styles.questionText}>{item.text}</Text>
              <Text style={styles.pointsBadge}>{item.points} pts</Text>
            </View>
            <View style={styles.twoButtonRow}>
              <TouchableOpacity
                style={[styles.acceptButton, currentAnswer === 'accept' && styles.activeButton]}
                onPress={() => handleAnswer(item.id, 'accept')}
              >
                <Ionicons name="checkmark-circle" size={24} color={currentAnswer === 'accept' ? "#25D366" : "#999"} />
                <Text style={styles.buttonText}>I Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.declineButton, currentAnswer === 'decline' && styles.activeButton]}
                onPress={() => handleAnswer(item.id, 'decline')}
              >
                <Ionicons name="close-circle" size={24} color={currentAnswer === 'decline' ? "#FF3B30" : "#999"} />
                <Text style={styles.buttonText}>I Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
        
      case 'understand':
        return (
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>{index + 1}</Text>
              <Text style={styles.questionText}>{item.text}</Text>
              <Text style={styles.pointsBadge}>{item.points} pts</Text>
            </View>
            <TouchableOpacity
              style={[styles.understandButton, currentAnswer === 'understand' && styles.activeButton]}
              onPress={() => handleAnswer(item.id, 'understand')}
            >
              <Ionicons name="bulb" size={24} color="#fff" />
              <Text style={styles.understandButtonText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'learn_more':
        return (
          <View style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>{index + 1}</Text>
              <Text style={styles.questionText}>{item.text}</Text>
              <Text style={styles.pointsBadge}>{item.points} pts</Text>
            </View>
            <View style={styles.twoButtonRow}>
              <TouchableOpacity
                style={[styles.learnButton, currentAnswer === 'learn_more' && styles.activeButton]}
                onPress={() => handleAnswer(item.id, 'learn_more')}
              >
                <Ionicons name="school" size={24} color={currentAnswer === 'learn_more' ? "#25D366" : "#999"} />
                <Text style={styles.buttonText}>I Will Learn More</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gotItButton, currentAnswer === 'got_it' && styles.activeButton]}
                onPress={() => handleAnswer(item.id, 'got_it')}
              >
                <Ionicons name="checkmark-circle" size={24} color={currentAnswer === 'got_it' ? "#25D366" : "#999"} />
                <Text style={styles.buttonText}>I Got It</Text>
              </TouchableOpacity>
            </View>
            {currentAnswer === 'learn_more' && (
              <TextInput
                style={styles.explanationInput}
                placeholder="What would you like to learn more about?"
                multiline
                value={explanationText[item.id] || ''}
                onChangeText={(text) => setExplanationText({...explanationText, [item.id]: text})}
              />
            )}
          </View>
        );
        
      default:
        return null;
    }
  };

  const renderGradingQuestion = ({ item, index }: { item: Question; index: number }) => {
    if (!form || selectedResponseIndex === null) return null;
    const response = form.responses[selectedResponseIndex];
    const userAnswer = response.answers.find(a => a.questionId === item.id);
    let answerDisplay = userAnswer?.answer;
    
    if (item.type === 'learn_more' && typeof answerDisplay === 'object') {
      answerDisplay = `${answerDisplay.choice}\nExplanation: ${answerDisplay.explanation || 'None'}`;
    }
    
    // Format the score to show decimals properly
    const currentScore = scores[item.id] || 0;
    const scoreDisplay = currentScore % 1 === 0 ? currentScore.toString() : currentScore.toFixed(2);
    
    return (
      <View style={styles.gradingCard}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>{index + 1}</Text>
          <Text style={styles.questionText}>{item.text}</Text>
          <Text style={styles.pointsBadge}>{item.points} pts</Text>
        </View>
        
        <View style={styles.answerContainer}>
          <Text style={styles.answerLabel}>Reader`s Answer:</Text>
          <Text style={styles.answerText}>
            {typeof answerDisplay === 'object' ? JSON.stringify(answerDisplay) : answerDisplay || 'No answer'}
          </Text>
        </View>
        
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>Score (max {item.points}):</Text>
          <TextInput
            style={styles.scoreInput}
            keyboardType="decimal-pad"
            value={scoreDisplay}
            onChangeText={(text) => handleScore(item.id, text, item.points)}
            placeholder="0"
            placeholderTextColor="#999"
          />
          <Text style={styles.scoreMax}>/{item.points}</Text>
        </View>
        
        <TextInput
          style={styles.feedbackInput}
          placeholder="Add feedback for this question..."
          value={feedbacks[item.id] || ''}
          onChangeText={(text) => setFeedbacks({...feedbacks, [item.id]: text})}
          multiline
        />
      </View>
    );
  };

  const renderResultsModal = () => {
    if (!form || !showResults) return null;
    
    const response = form.responses.find(r => r.userId === CURRENT_RESPONDENT);
    if (!response || !response.graded) return null;
    
    const percentage = response.percentage || 0;
    const gradeColor = percentage >= 70 ? '#4CAF50' : percentage >= 50 ? '#FF9800' : '#F44336';
    
    return (
      <Modal
        visible={showResults}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowResults(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Your Results</Text>
              <TouchableOpacity onPress={() => setShowResults(false)}>
                <Ionicons name="close" size={24} color="#075E54" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.resultsContent}>
              <View style={[styles.scoreCircle, { borderColor: gradeColor }]}>
                <Text style={[styles.percentageText, { color: gradeColor }]}>
                  {percentage.toFixed(1)}%
                </Text>
              </View>
              
              <Text style={styles.scoreSummary}>
                Score: {response.totalScore?.toFixed(2)}/{response.maxScore}
              </Text>
              
              <View style={styles.divider} />
              
              <Text style={styles.detailsTitle}>Detailed Results</Text>
              
              {form.questions.map((question, idx) => {
                const answer = response.answers.find(a => a.questionId === question.id);
                const score = answer?.score || 0;
                
                return (
                  <View key={question.id} style={styles.resultCard}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultNumber}>Q{idx + 1}</Text>
                      <Text style={styles.resultQuestion}>{question.text}</Text>
                      <Text style={[styles.resultScore, { color: (score/question.points) >= 0.7 ? '#4CAF50' : '#FF9800' }]}>
                        {score % 1 === 0 ? score : score.toFixed(2)}/{question.points}
                      </Text>
                    </View>
                    <Text style={styles.resultAnswer}>
                      Your answer: {typeof answer?.answer === 'object' ? JSON.stringify(answer?.answer) : answer?.answer || 'No answer'}
                    </Text>
                    {answer?.feedback && (
                      <Text style={styles.resultFeedback}>Feedback: {answer.feedback}</Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (!form) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const hasSubmitted = form.responses.some(r => r.userId === CURRENT_RESPONDENT);
  const isGraded = form.responses.find(r => r.userId === CURRENT_RESPONDENT)?.graded || false;
  const userResponse = form.responses.find(r => r.userId === CURRENT_RESPONDENT);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#09381BD4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{form.title}</Text>
        {userRole === 'composer' && !gradingMode && (
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={22} color="#052B13" />
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
                router.push('/dashboard/qr');
              }}
            >
              <Ionicons name="qr-code-outline" size={20} color="#075E54" />
              <Text style={styles.menuItemText}>QR Code</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/dashboard');
              }}
            >
              <Ionicons name="home-outline" size={20} color="#075E54" />
              <Text style={styles.menuItemText}>Dashboard</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Tab Bar for Composer View */}
      {userRole === 'composer' && !gradingMode && (
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'respond' && styles.tabActive]}
            onPress={() => setActiveTab('respond')}
          >
            <Text style={[styles.tabText, activeTab === 'respond' && styles.tabTextActive]}>Respond as Reader</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'responses' && styles.tabActive]}
            onPress={() => setActiveTab('responses')}
          >
            <Text style={[styles.tabText, activeTab === 'responses' && styles.tabTextActive]}>
              Responses ({form.responses.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Form Info Section - WhatsApp style white card */}
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
              <Text style={styles.infoBadgeText}>{form.composer}</Text>
            </View>
            <View style={styles.infoBadge}>
              <Ionicons name="help-circle-outline" size={12} color="#666" />
              <Text style={styles.infoBadgeText}>{form.questions.length} questions</Text>
            </View>
            <View style={styles.infoBadge}>
              <Ionicons name="star-outline" size={12} color="#666" />
              <Text style={styles.infoBadgeText}>{form.questions.reduce((sum, q) => sum + q.points, 0)} pts</Text>
            </View>
          </View>
        </View>

        {!gradingMode ? (
          <>
            {/* Show Response Form for Readers OR Composers in Respond tab */}
            {((userRole === 'reader' && !hasSubmitted) || (userRole === 'composer' && activeTab === 'respond' && !hasSubmitted)) && (
              <>
                <FlatList
                  data={form.questions}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => renderQuestion({ item, index })}
                  scrollEnabled={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
                
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

            {/* Show submitted message for Readers */}
            {userRole === 'reader' && hasSubmitted && !isGraded && (
              <View style={styles.infoMessage}>
                <Ionicons name="time-outline" size={24} color="#FF9800" />
                <Text style={styles.infoMessageText}>You have submitted this form. Waiting for grading...</Text>
              </View>
            )}

            {/* Show View Results button for Readers */}
            {userRole === 'reader' && isGraded && (
              <TouchableOpacity 
                style={styles.viewResultsButton}
                onPress={() => setShowResults(true)}
              >
                <Ionicons name="bar-chart" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>View My Results</Text>
              </TouchableOpacity>
            )}

            {/* Show submitted message for Composer in Respond tab */}
            {userRole === 'composer' && activeTab === 'respond' && hasSubmitted && (
              <View style={styles.infoMessage}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={[styles.infoMessageText, { color: '#4CAF50' }]}>
                  You have already submitted a test response. 
                  {!isGraded && ' Waiting for grading...'}
                  {isGraded && ` Score: ${userResponse?.totalScore?.toFixed(2)}/${userResponse?.maxScore} (${userResponse?.percentage?.toFixed(1)}%)`}
                </Text>
                {isGraded && (
                  <TouchableOpacity onPress={() => setShowResults(true)}>
                    <Text style={styles.viewResultsLink}>View Results</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Show Responses List for Composer */}
            {userRole === 'composer' && activeTab === 'responses' && (
              <View style={styles.responsesSection}>
                {form.responses.length === 0 ? (
                  <View style={styles.infoMessage}>
                    <Ionicons name="people-outline" size={24} color="#999" />
                    <Text style={styles.infoMessageText}>No responses yet. Share this form with readers.</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.responsesTitle}>All Responses ({form.responses.length})</Text>
                    {form.responses.map((response, idx) => (
                      <View key={idx} style={styles.responseCard}>
                        <View style={styles.responseHeader}>
                          <View style={styles.responseAvatar}>
                            <Ionicons name="person-circle" size={40} color="#25D366" />
                          </View>
                          <View style={styles.responseInfo}>
                            <Text style={styles.responseName}>{response.userName}</Text>
                            <Text style={styles.responseDate}>
                              {new Date(response.submittedAt).toLocaleString()}
                            </Text>
                          </View>
                          {response.graded ? (
                            <View style={styles.gradedBadge}>
                              <Text style={styles.gradedText}>{response.percentage?.toFixed(1)}%</Text>
                            </View>
                          ) : (
                            <View style={styles.pendingBadge}>
                              <Text style={styles.pendingText}>Pending</Text>
                            </View>
                          )}
                        </View>
                        {!response.graded ? (
                          <TouchableOpacity 
                            style={styles.gradeButton}
                            onPress={() => startGrading(idx)}
                          >
                            <Ionicons name="checkmark-done" size={18} color="#fff" />
                            <Text style={styles.gradeButtonText}>Grade This Response</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.gradedInfo}>
                            <Text style={styles.gradedInfoText}>
                              Score: {response.totalScore?.toFixed(2)}/{response.maxScore}
                            </Text>
                          </View>
                        )}
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
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => renderGradingQuestion({ item, index })}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
            
            <TouchableOpacity style={styles.submitButton} onPress={submitGrades}>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Grades</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {renderResultsModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#f5f5f5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 60,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#07230D',
  },
  headerRight: {
    flexDirection: 'row',
  },
  menuButton: {
    padding: 4,
  },
  menuOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 60,
    right: 16,
    left: 0,
    bottom: 0,
    zIndex: 1000,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#075E54',
    fontWeight: '500',
  },
  menuDivider: {
    height: 0.5,
    backgroundColor: '#e0e0e0',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#25D366',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#25D366',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075E54',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  infoBadgeText: {
    fontSize: 11,
    color: '#666',
  },
  questionCard: {
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
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#075E54',
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  pointsBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  answerInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  twoButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  learnButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  gotItButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  activeButton: {
    borderColor: '#25D366',
    backgroundColor: '#e8f5e9',
  },
  buttonText: {
    fontSize: 14,
    color: '#333',
  },
  understandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    padding: 12,
    borderRadius: 8,
  },
  understandButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  explanationInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 12,
    backgroundColor: '#fafafa',
  },
  submitButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  viewResultsButton: {
    backgroundColor: '#075E54',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  viewResultsLink: {
    color: '#25D366',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
  },
  infoMessage: {
    backgroundColor: '#FFF3E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  infoMessageText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
    flex: 1,
  },
  responsesSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  responsesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#075E54',
    marginBottom: 12,
  },
  responseCard: {
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
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  responseAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseInfo: {
    flex: 1,
  },
  responseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  responseDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  gradedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  gradedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  pendingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gradeButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  gradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  gradedInfo: {
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
  },
  gradedInfoText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
    textAlign: 'center',
  },
  gradingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  answerContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    color: '#000',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  scoreInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: '#fff',
  },
  scoreMax: {
    fontSize: 14,
    color: '#666',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#075E54',
  },
  resultsContent: {
    padding: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  percentageText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreSummary: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#075E54',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resultNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#075E54',
    marginRight: 8,
  },
  resultQuestion: {
    flex: 1,
    fontSize: 13,
    color: '#000',
    fontWeight: '500',
  },
  resultScore: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  resultAnswer: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  resultFeedback: {
    fontSize: 12,
    color: '#FF9800',
    fontStyle: 'italic',
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
  },
});