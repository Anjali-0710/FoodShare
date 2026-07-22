import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  Alert,
  ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import {
  Send,
  Trash2,
  ChevronLeft,
  AlertCircle,
  Copy,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Mic,
  Sparkles,
} from 'lucide-react-native';
import { RootState } from '../../store';
import { AppTheme } from '../../theme/theme';
import { apiCall } from '../../services/api';
import { supabase } from '../../services/supabase';

interface AIChatScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

const SUGGESTIONS = [
  'Donate Food',
  'Find NGO',
  'Volunteer',
  'Food Safety',
  'My Donations'
];

export const AIChatScreen: React.FC<AIChatScreenProps> = ({ theme, navigate }) => {
  const { token } = useSelector((state: RootState) => state.auth);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "### Welcome to FoodReach AI!\nI'm your official **FoodReach Assistant**. How can I help you support your community today?\n\n- **Donate Food**: List meals or groceries\n- **Find NGO**: Claim food for distribution\n- **Volunteer**: Accept delivery routes",
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    scrollToEnd();
  }, [messages, loading]);

  const scrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend) return;

    if (!messageText) {
      setInput('');
    }
    setErrorText(null);

    // Create user message
    const userMsg: Message = {
      id: Math.random().toString(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    let activeToken = token;
    if (!activeToken) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          activeToken = session.access_token;
        }
      } catch (sessionErr) {
        console.error('[AIChatScreen] Failed to retrieve session from Supabase:', sessionErr);
      }
    }

    try {
      const response = await apiCall('/ai/chat', {
        method: 'POST',
        body: { message: textToSend },
        token: activeToken,
      });

      if (response.success && response.reply) {
        const aiMsg: Message = {
          id: Math.random().toString(),
          text: response.reply,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(response.message || 'Invalid assistant reply');
      }
    } catch (err: any) {
      setErrorText(textToSend);
      
      let errorTextContent = err.message || 'Failed to connect. Please check your internet connection or try again.';
      if (err.status === 404) {
        errorTextContent = `Route not found: ${err.message || 'Please verify the backend endpoint registrations.'}`;
      } else if (
        err.message && 
        (err.message.includes('Failed to fetch') || err.message.includes('Network request failed') || err.message.includes('fetch failed'))
      ) {
        errorTextContent = 'Backend not running or server unavailable. Please make sure the backend Express server is active.';
      }

      const errorMsg: Message = {
        id: Math.random().toString(),
        text: `Error: ${errorTextContent}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (errorText) {
      const textToRetry = errorText;
      setMessages((prev) => prev.slice(0, -1));
      handleSend(textToRetry);
    }
  };

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Response copied to clipboard.');
  };

  const handleClearChat = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to clear your chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([
              {
                id: 'welcome',
                text: "### Conversation cleared.\nHow can I help you support your community today?",
                sender: 'ai',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
            setErrorText(null);
            setFeedback({});
          },
        },
      ]
    );
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedback((prev) => ({
      ...prev,
      [id]: prev[id] === type ? undefined as any : type
    }));
  };

  const handleRegenerate = (index: number) => {
    let lastUserQuery = '';
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        lastUserQuery = messages[i].text;
        break;
      }
    }
    if (!lastUserQuery) return;

    // Remove old AI response and everything after it
    setMessages((prev) => prev.slice(0, index));
    handleSend(lastUserQuery);
  };

  // Custom native Markdown-style Formatter
  const renderBoldText = (text: string) => {
    const parts = text.split('**');
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <Text key={i} style={styles.boldText}>{part}</Text>;
      }
      return part;
    });
  };

  const renderContentText = (text: string, textColor: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const currentLine = line.trim();
      if (!currentLine) return <View key={index} style={{ height: 6 }} />;

      // Headings (### Title)
      if (currentLine.startsWith('###') || currentLine.startsWith('##') || currentLine.startsWith('#')) {
        const headingText = currentLine.replace(/^#+\s*/, '');
        return (
          <Text key={index} style={[styles.markdownHeading, { color: textColor }]}>
            {headingText}
          </Text>
        );
      }

      // Bullet Lists (- Item)
      if (currentLine.startsWith('-') || currentLine.startsWith('*')) {
        const listItemText = currentLine.substring(1).trim();
        return (
          <View key={index} style={styles.bulletItemRow}>
            <Text style={[styles.bulletDot, { color: textColor }]}>•</Text>
            <Text style={[styles.bulletText, { color: textColor }]}>
              {renderBoldText(listItemText)}
            </Text>
          </View>
        );
      }

      // Numbered Steps (1. Item)
      const numberedMatch = currentLine.match(/^(\d+)\.\s*(.*)/);
      if (numberedMatch) {
        const num = numberedMatch[1];
        const itemText = numberedMatch[2];
        return (
          <View key={index} style={styles.bulletItemRow}>
            <Text style={[styles.bulletDot, { color: textColor }]}>{num}.</Text>
            <Text style={[styles.bulletText, { color: textColor }]}>
              {renderBoldText(itemText)}
            </Text>
          </View>
        );
      }

      // Regular lines
      return (
        <Text key={index} style={[styles.paragraphText, { color: textColor }]}>
          {renderBoldText(currentLine)}
        </Text>
      );
    });
  };

  // Modern animated three-dot indicator
  const TypingIndicator = () => {
    const [dotIdx, setDotIdx] = useState(0);
    useEffect(() => {
      const interval = setInterval(() => {
        setDotIdx((prev) => (prev + 1) % 3);
      }, 350);
      return () => clearInterval(interval);
    }, []);

    return (
      <View style={styles.typingIndicatorRow}>
        {[0, 1, 2].map((idx) => (
          <View
            key={idx}
            style={[
              styles.typingDot,
              { opacity: dotIdx === idx ? 1 : 0.3 }
            ]}
          />
        ))}
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.sender === 'user';
    const isError = item.text.startsWith('Error:');
    const userFeedback = feedback[item.id];

    return (
      <View style={[styles.messageContainer, isUser ? styles.userContainer : styles.aiContainer]}>
        {/* AI Avatar */}
        {!isUser && (
          <View style={styles.aiAvatarContainer}>
            <View style={styles.aiAvatarIcon}>
              <Sparkles size={16} color="#FFFFFF" />
            </View>
            <View style={styles.onlineBadgeSmall} />
          </View>
        )}

        <View style={styles.bubbleWrapper}>
          <View
            style={[
              styles.bubble,
              isUser
                ? styles.userBubble
                : [styles.aiBubble, { borderColor: theme.colors.border }],
              isError && styles.errorBubble
            ]}
          >
            {renderContentText(item.text, isUser ? '#FFFFFF' : '#1E293B')}
            
            <View style={styles.bubbleFooter}>
              <Text style={[styles.timestamp, { color: isUser ? 'rgba(255,255,255,0.7)' : '#94A3B8' }]}>
                {item.timestamp}
              </Text>
            </View>
          </View>

          {/* Premium Bottom Actions under AI responses */}
          {!isUser && !isError && item.id !== 'welcome' && (
            <View style={styles.aiActionsRow}>
              <TouchableOpacity onPress={() => handleCopy(item.text)} style={styles.actionBtn}>
                <Copy size={14} color="#64748B" />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => handleFeedback(item.id, 'up')} style={styles.actionBtn}>
                <ThumbsUp size={14} color={userFeedback === 'up' ? '#22C55E' : '#64748B'} />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => handleFeedback(item.id, 'down')} style={styles.actionBtn}>
                <ThumbsDown size={14} color={userFeedback === 'down' ? '#EF4444' : '#64748B'} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleRegenerate(index)} style={styles.actionBtn}>
                <RotateCw size={14} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigate('Dashboard')} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <View style={styles.avatarHeader}>
            <Sparkles size={16} color="#FFFFFF" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>FoodReach AI Assistant</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineBadgeDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={handleClearChat} style={styles.clearBtn}>
          <Trash2 size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={scrollToEnd}
      />

      {/* Error Alert Bar */}
      {errorText && (
        <View style={styles.errorBar}>
          <AlertCircle size={16} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.errorText}>Failed to get reply.</Text>
          <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
            <RotateCw size={12} color="#22C55E" style={{ marginRight: 4 }} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Generating state */}
      {loading && (
        <View style={styles.generatingContainer}>
          <Text style={styles.generatingText}>Thinking</Text>
          <TypingIndicator />
        </View>
      )}

      {/* Suggestions Chips Area */}
      <View style={styles.bottomAreaContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsContainer}
          contentContainerStyle={styles.suggestionsContent}
        >
          {SUGGESTIONS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleSend(item)}
              style={[styles.suggestionChip, { borderColor: theme.colors.border }]}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Premium Input Bar */}
        <View style={[styles.inputBar, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.inputIconBtn}>
            <Paperclip size={20} color="#64748B" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Ask FoodReach AI anything..."
            placeholderTextColor="#94A3B8"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            editable={!loading}
          />

          <TouchableOpacity style={styles.inputIconBtn}>
            <Mic size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSend()}
            style={[styles.sendBtn, { backgroundColor: input.trim() ? '#22C55E' : '#E2E8F0' }]}
            disabled={!input.trim() || loading}
          >
            <Send size={16} color={input.trim() ? '#FFFFFF' : '#94A3B8'} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  backBtn: { padding: 4 },
  titleContainer: { flexDirection: 'row', alignItems: 'center' },
  avatarHeader: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerInfo: { justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  onlineBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 4,
  },
  statusText: { fontSize: 10, color: '#64748B' },
  clearBtn: { padding: 4 },
  listContent: { padding: 16, paddingBottom: 32 },
  messageContainer: { marginVertical: 8, flexDirection: 'row', width: '100%' },
  userContainer: { justifyContent: 'flex-end', alignSelf: 'flex-end' },
  aiContainer: { justifyContent: 'flex-start', alignSelf: 'flex-start' },
  aiAvatarContainer: {
    marginRight: 10,
    position: 'relative',
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  aiAvatarIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadgeSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  bubbleWrapper: { maxWidth: '80%' },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#22C55E',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  errorBubble: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  timestamp: { fontSize: 10 },
  aiActionsRow: {
    flexDirection: 'row',
    marginTop: 6,
    marginLeft: 4,
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
  },
  errorText: { fontSize: 12, color: '#EF4444' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 6 },
  retryText: { fontSize: 12, fontWeight: '700', color: '#22C55E' },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 8,
  },
  generatingText: { fontSize: 12, color: '#64748B', fontStyle: 'italic' },
  typingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748B',
  },
  bottomAreaContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  suggestionsContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  suggestionsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  suggestionText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  inputIconBtn: {
    padding: 6,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boldText: { fontWeight: '700' },
  markdownHeading: { fontSize: 15, fontWeight: '700', marginVertical: 6 },
  bulletItemRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2, paddingLeft: 4 },
  bulletDot: { marginRight: 8, fontSize: 14 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20 },
  paragraphText: { fontSize: 14, lineHeight: 20, marginVertical: 2 },
});

export default AIChatScreen;
