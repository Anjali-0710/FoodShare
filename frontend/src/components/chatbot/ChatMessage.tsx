import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Linking,
} from 'react-native';
import { Bot, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { ChatMessageItem } from '../../services/aiService';
import { getChatbotStyles } from './chatbotStyles';

interface ChatMessageProps {
  message: ChatMessageItem;
  isDark: boolean;
  isLastAI?: boolean;
  onRegenerate?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isDark,
  isLastAI,
  onRegenerate,
}) => {
  const styles = getChatbotStyles(isDark);
  const isUser = message.sender === 'user';

  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  // Entrance animation for message bubbles (Requirement 6)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateYAnim]);

  const handleCopy = (textToCopy: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenURL = (url: string) => {
    Linking.openURL(url).catch((err) => console.warn('Could not open URL:', err));
  };

  /**
   * Helper to parse and format text segment with links and inline bold text
   */
  const renderFormattedText = (rawText: string, baseStyle: any) => {
    // URL pattern detection (http:// or https://)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = rawText.split(urlRegex);

    return (
      <Text style={baseStyle}>
        {parts.map((part, idx) => {
          if (urlRegex.test(part)) {
            return (
              <Text
                key={idx}
                style={styles.linkText}
                onPress={() => handleOpenURL(part)}
              >
                {part}
              </Text>
            );
          }

          // Bold text pattern (**bold**)
          const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
          return boldParts.map((bPart, bIdx) => {
            if (bPart.startsWith('**') && bPart.endsWith('**')) {
              return (
                <Text key={`${idx}-${bIdx}`} style={styles.boldText}>
                  {bPart.slice(2, -2)}
                </Text>
              );
            }
            return bPart;
          });
        })}
      </Text>
    );
  };

  /**
   * Complete Markdown & Code Block parser (Requirement 1, 9, 10)
   */
  const renderMarkdownContent = (content: string) => {
    // 1. Split content by code blocks ```lang ... ```
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const precedingText = content.substring(lastIndex, match.index);
      if (precedingText) {
        elements.push(renderMarkdownParagraphs(precedingText, elements.length));
      }

      const lang = match[1] || 'code';
      const codeText = match[2].trim();
      const blockKey = `code-${match.index}`;

      elements.push(
        <View key={blockKey} style={styles.codeBlockContainer}>
          <View style={styles.codeBlockHeader}>
            <Text style={styles.codeBlockLangText}>{lang}</Text>
            <TouchableOpacity onPress={() => handleCopy(codeText)}>
              <Copy size={12} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          <Text style={styles.codeBlockText}>{codeText}</Text>
        </View>
      );

      lastIndex = match.index + match[0].length;
    }

    const remainingText = content.substring(lastIndex);
    if (remainingText) {
      elements.push(renderMarkdownParagraphs(remainingText, elements.length));
    }

    return <View>{elements}</View>;
  };

  /**
   * Parses Markdown lines (Headings, Bullet Lists, Numbered Lists)
   */
  const renderMarkdownParagraphs = (textBlock: string, baseKeyIndex: number) => {
    const lines = textBlock.split('\n');
    return (
      <View key={`block-${baseKeyIndex}`}>
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <View key={lIdx} style={{ height: 4 }} />;
          }

          // Headings (# H1, ## H2, ### H3)
          if (trimmed.startsWith('# ')) {
            return (
              <Text key={lIdx} style={styles.h1Text}>
                {trimmed.replace(/^#\s+/, '')}
              </Text>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <Text key={lIdx} style={styles.h2Text}>
                {trimmed.replace(/^##\s+/, '')}
              </Text>
            );
          }
          if (trimmed.startsWith('### ')) {
            return (
              <Text key={lIdx} style={styles.h3Text}>
                {trimmed.replace(/^###\s+/, '')}
              </Text>
            );
          }

          // Bullet lists (*, -, •)
          if (/^[*•-]\s+/.test(trimmed)) {
            const listContent = trimmed.replace(/^[*•-]\s+/, '');
            return (
              <View key={lIdx} style={styles.listItemRow}>
                <Text style={styles.bulletPrefix}>•</Text>
                <View style={{ flex: 1 }}>
                  {renderFormattedText(listContent, styles.aiMessageText)}
                </View>
              </View>
            );
          }

          // Numbered lists (1., 2., etc.)
          const numMatch = trimmed.match(/^(\d+\.)\s+(.*)/);
          if (numMatch) {
            return (
              <View key={lIdx} style={styles.listItemRow}>
                <Text style={styles.bulletPrefix}>{numMatch[1]}</Text>
                <View style={{ flex: 1 }}>
                  {renderFormattedText(numMatch[2], styles.aiMessageText)}
                </View>
              </View>
            );
          }

          // Regular paragraph text
          return (
            <View key={lIdx} style={{ marginVertical: 1.5 }}>
              {renderFormattedText(trimmed, styles.aiMessageText)}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAI,
        {
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }],
        },
      ]}
    >
      {!isUser && (
        <View style={styles.aiAvatarContainer}>
          <Bot size={16} color="#FFFFFF" />
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {isUser ? (
          <Text style={styles.userMessageText}>{message.text}</Text>
        ) : (
          renderMarkdownContent(message.text)
        )}

        {/* BOTTOM METADATA & ACTIONS (Requirements 3, 4, 5) */}
        {isUser ? (
          <Text style={[styles.timestampText, styles.userTimestamp]}>
            {message.timestamp}
          </Text>
        ) : (
          <View style={styles.bottomMetaRow}>
            <Text style={[styles.timestampText, styles.aiTimestamp]}>
              {message.timestamp}
            </Text>

            <View style={styles.actionRow}>
              {/* COPY BUTTON */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleCopy(message.text)}
                accessibilityLabel="Copy response"
              >
                {copied ? (
                  <Check size={13} color="#22C55E" />
                ) : (
                  <Copy size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                )}
              </TouchableOpacity>

              {/* LIKE BUTTON */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  feedback === 'like' && styles.actionBtnActive,
                ]}
                onPress={() => setFeedback(feedback === 'like' ? null : 'like')}
                accessibilityLabel="Like response"
              >
                <ThumbsUp
                  size={13}
                  color={feedback === 'like' ? '#22C55E' : isDark ? '#94A3B8' : '#64748B'}
                />
              </TouchableOpacity>

              {/* DISLIKE BUTTON */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  feedback === 'dislike' && styles.actionBtnActive,
                ]}
                onPress={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
                accessibilityLabel="Dislike response"
              >
                <ThumbsDown
                  size={13}
                  color={feedback === 'dislike' ? '#EF4444' : isDark ? '#94A3B8' : '#64748B'}
                />
              </TouchableOpacity>

              {/* REGENERATE BUTTON FOR LAST AI RESPONSE */}
              {isLastAI && onRegenerate && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={onRegenerate}
                  accessibilityLabel="Regenerate response"
                >
                  <RotateCcw size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export default ChatMessage;
