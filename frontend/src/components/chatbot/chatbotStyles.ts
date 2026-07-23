import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const getChatbotStyles = (isDark: boolean) =>
  StyleSheet.create({
    // Floating Action Button
    floatingFab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 8,
      shadowColor: '#000000',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      zIndex: 99999,
    },
    fabBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#EF4444',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },

    // Main Chat Window Container (Glass effect & rounded corners)
    chatWindowOverlay: {
      position: 'absolute',
      bottom: 84,
      right: width < 480 ? 12 : 24,
      width: width < 480 ? width - 24 : 390,
      maxHeight: Math.min(height * 0.8, 640),
      height: 560,
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.97)',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : 'rgba(226, 232, 240, 0.8)',
      elevation: 16,
      shadowColor: '#0F172A',
      shadowOpacity: 0.22,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      zIndex: 99999,
      overflow: 'hidden',
      flexDirection: 'column',
    },
    chatWindowMinimized: {
      height: 60,
    },

    // Header
    header: {
      height: 60,
      backgroundColor: isDark ? '#0F172A' : '#15803D',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },
    headerTitleText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    headerStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    onlineDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#4ADE80',
    },
    headerSubtitleText: {
      fontSize: 11,
      color: '#DCFCE7',
      fontWeight: '500',
    },
    headerRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerIconBtn: {
      padding: 4,
    },

    // Messages Area
    messagesScroll: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
    },
    messagesContent: {
      paddingBottom: 16,
    },

    // Message Row & Bubbles
    messageRow: {
      marginVertical: 6,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    messageRowUser: {
      justifyContent: 'flex-end',
    },
    messageRowAI: {
      justifyContent: 'flex-start',
    },
    aiAvatarContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      marginBottom: 2,
    },
    bubble: {
      maxWidth: '80%', // Requirement 2: Max bubble width 80%
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
    },
    userBubble: {
      backgroundColor: '#22C55E',
      borderBottomRightRadius: 4,
    },
    aiBubble: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },

    // Text & Markdown Formatting (Requirement 1 & 2)
    userMessageText: {
      color: '#FFFFFF',
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: '500',
    },
    aiMessageText: {
      color: isDark ? '#F8FAFC' : '#1E293B',
      fontSize: 13.5,
      lineHeight: 20,
      fontWeight: '400',
    },
    boldText: {
      fontWeight: '700',
    },
    h1Text: {
      fontSize: 16,
      fontWeight: '800',
      marginVertical: 4,
      color: isDark ? '#38BDF8' : '#0369A1',
    },
    h2Text: {
      fontSize: 15,
      fontWeight: '700',
      marginVertical: 3,
      color: isDark ? '#38BDF8' : '#0369A1',
    },
    h3Text: {
      fontSize: 14,
      fontWeight: '700',
      marginVertical: 2,
      color: isDark ? '#38BDF8' : '#0369A1',
    },
    listItemRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginVertical: 2,
    },
    bulletPrefix: {
      fontSize: 13.5,
      fontWeight: '700',
      color: '#22C55E',
      marginRight: 6,
    },
    linkText: {
      color: isDark ? '#60A5FA' : '#2563EB',
      textDecorationLine: 'underline',
      fontWeight: '600',
    },

    // Code Block Formatting (Requirement 10)
    codeBlockContainer: {
      marginVertical: 6,
      backgroundColor: isDark ? '#020617' : '#1E293B',
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? '#1E293B' : '#334155',
    },
    codeBlockHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#0F172A' : '#0F172A',
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    codeBlockLangText: {
      color: '#94A3B8',
      fontSize: 10.5,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    codeBlockText: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      color: '#38BDF8',
      fontSize: 12,
      padding: 10,
      lineHeight: 17,
    },
    inlineCode: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
      color: isDark ? '#38BDF8' : '#0284C7',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 12,
    },

    // Timestamp & Actions Row (Requirements 3, 4, 5)
    bottomMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 6,
      paddingTop: 4,
      borderTopWidth: 0.5,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    actionBtn: {
      padding: 3,
      borderRadius: 6,
    },
    actionBtnActive: {
      backgroundColor: isDark ? 'rgba(34,197,94,0.2)' : '#DCFCE7',
    },
    timestampText: {
      fontSize: 9.5,
    },
    userTimestamp: {
      color: '#DCFCE7',
      alignSelf: 'flex-end',
      marginTop: 4,
    },
    aiTimestamp: {
      color: isDark ? '#94A3B8' : '#94A3B8',
    },

    // Quick Suggestions
    suggestionsContainer: {
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#334155' : '#E2E8F0',
    },
    suggestionsTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
      marginBottom: 6,
      paddingLeft: 4,
    },
    chipScroll: {
      flexDirection: 'row',
    },
    chipItem: {
      backgroundColor: isDark ? '#0F172A' : '#F0FDF4',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#BBF7D0',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 18,
      marginRight: 8,
    },
    chipText: {
      fontSize: 11.5,
      color: isDark ? '#4ADE80' : '#15803D',
      fontWeight: '600',
    },

    // Typing Indicator
    typingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    typingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#22C55E',
    },

    // Input Bar
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#334155' : '#E2E8F0',
      gap: 8,
    },
    textInput: {
      flex: 1,
      height: 40,
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      borderRadius: 20,
      paddingHorizontal: 14,
      fontSize: 13,
      color: isDark ? '#F8FAFC' : '#1E293B',
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      backgroundColor: isDark ? '#334155' : '#CBD5E1',
    },

    // Error Alert Banner & Retry Button
    errorBanner: {
      backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#EF4444',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    errorText: {
      fontSize: 11,
      color: isDark ? '#FCA5A5' : '#991B1B',
      fontWeight: '600',
      flex: 1,
    },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#EF4444',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    retryBtnText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
  });
