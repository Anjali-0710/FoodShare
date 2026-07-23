import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Bot, Send, X, Minus, Trash2, Sparkles, AlertCircle, RotateCcw } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { AppTheme } from '../../theme/theme';
import { ChatMessageItem, aiService } from '../../services/aiService';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { QuickSuggestions } from './QuickSuggestions';
import { getChatbotStyles } from './chatbotStyles';

interface AIChatbotProps {
  theme?: AppTheme;
}

const INITIAL_MESSAGES: ChatMessageItem[] = [
  {
    id: 'welcome-1',
    sender: 'ai',
    text: '👋 Welcome to FoodReach AI! How can I assist you today with food donations, NGO registration, volunteer opportunities, or food safety?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

export const AIChatbot: React.FC<AIChatbotProps> = ({ theme }) => {
  const themeMode = useSelector((state: RootState) => state.auth.themeMode);
  const isDark = Boolean(theme?.dark || themeMode === 'dark');
  const styles = getChatbotStyles(isDark);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to newest message (Requirement 7)
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping, isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    setErrorMsg(null);
    setInputText('');
    setLastQuery(query);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: timeStr,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsTyping(true); // Typing indicator active until response arrives (Requirement 8)

    try {
      const aiReply = await aiService.sendMessage(query, updatedMessages);
      const aiMsg: ChatMessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorText = err?.message || 'Groq API Key not configured.';
      setErrorMsg(errorText);
      const errorAiMsg: ChatMessageItem = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: errorText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorAiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Regenerate Response button handler (Requirement 4)
  const handleRegenerateLast = async () => {
    const userPrompts = messages.filter((m) => m.sender === 'user');
    const lastUserPrompt = userPrompts[userPrompts.length - 1]?.text || lastQuery;
    if (!lastUserPrompt || isTyping) return;

    // Remove latest AI message if present
    const cleanedMessages = messages.filter((m, i) => {
      if (i === messages.length - 1 && m.sender === 'ai') return false;
      return true;
    });

    setMessages(cleanedMessages);
    setIsTyping(true);
    setErrorMsg(null);

    try {
      const aiReply = await aiService.sendMessage(lastUserPrompt, cleanedMessages);
      const aiMsg: ChatMessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorText = err?.message || 'Groq API Key not configured.';
      setErrorMsg(errorText);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRetry = () => {
    if (lastQuery) {
      handleSendMessage(lastQuery);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: 'Chat history cleared. How else can FoodReach AI help you?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setErrorMsg(null);
    setLastQuery(null);
  };

  const lastAIIndex = messages.map((m) => m.sender).lastIndexOf('ai');

  return (
    <>
      {/* FLOATING AI BUTTON */}
      {!isOpen && (
        <TouchableOpacity
          style={styles.floatingFab}
          onPress={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          activeOpacity={0.85}
          accessibilityLabel="Open FoodReach AI"
        >
          <Sparkles size={24} color="#FFFFFF" />
          <View style={styles.fabBadge} />
        </TouchableOpacity>
      )}

      {/* CHAT WINDOW OVERLAY */}
      {isOpen && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.chatWindowOverlay, isMinimized && styles.chatWindowMinimized]}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerAvatar}>
                <Bot size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitleText}>FoodReach AI</Text>
                <View style={styles.headerStatusRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.headerSubtitleText}>Assistant Online</Text>
                </View>
              </View>
            </View>

            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setIsMinimized(!isMinimized)}
                accessibilityLabel="Minimize chat"
              >
                <Minus size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handleClearChat}
                accessibilityLabel="Clear chat history"
              >
                <Trash2 size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setIsOpen(false)}
                accessibilityLabel="Close chat window"
              >
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* CHAT BODY (HIDDEN WHEN MINIMIZED) */}
          {!isMinimized && (
            <>
              {/* ERROR BANNER WITH RETRY BUTTON */}
              {errorMsg && (
                <View style={styles.errorBanner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <AlertCircle size={14} color={isDark ? '#FCA5A5' : '#991B1B'} />
                    <Text style={styles.errorText} numberOfLines={2}>
                      {errorMsg}
                    </Text>
                  </View>
                  {lastQuery && (
                    <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                      <RotateCcw size={12} color="#FFFFFF" />
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={{ marginLeft: 8 }} onPress={() => setErrorMsg(null)}>
                    <X size={14} color={isDark ? '#FCA5A5' : '#991B1B'} />
                  </TouchableOpacity>
                </View>
              )}

              {/* MESSAGES SCROLL VIEW */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesScroll}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((item, idx) => (
                  <ChatMessage
                    key={item.id}
                    message={item}
                    isDark={isDark}
                    isLastAI={idx === lastAIIndex}
                    onRegenerate={handleRegenerateLast}
                  />
                ))}
                {isTyping && <TypingIndicator isDark={isDark} />}
              </ScrollView>

              {/* QUICK SUGGESTIONS CHIPS */}
              <QuickSuggestions
                isDark={isDark}
                onSelectSuggestion={(suggestionText) => handleSendMessage(suggestionText)}
              />

              {/* INPUT BAR */}
              <View style={styles.inputBar}>
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask FoodReach AI..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  onSubmitEditing={() => handleSendMessage()}
                  returnKeyType="send"
                  editable={!isTyping}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
                  onPress={() => handleSendMessage()}
                  disabled={!inputText.trim() || isTyping}
                  activeOpacity={0.8}
                >
                  {isTyping ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      )}
    </>
  );
};

export default AIChatbot;
