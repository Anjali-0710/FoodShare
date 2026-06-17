import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Bell, X } from 'lucide-react-native';
import { AppTheme } from '../theme/theme';

interface NotificationToastProps {
  visible: boolean;
  message: string;
  onClose: () => void;
  theme: AppTheme;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  visible,
  message,
  onClose,
  theme
}) => {
  const [slideY] = useState(new Animated.Value(-150));

  useEffect(() => {
    if (visible) {
      // Slide Down
      Animated.spring(slideY, {
        toValue: 20, // Offset from top
        useNativeDriver: true,
        bounciness: 8
      }).start();

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        dismiss();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      slideY.setValue(-150);
    }
  }, [visible]);

  const dismiss = () => {
    Animated.timing(slideY, {
      toValue: -150,
      duration: 350,
      useNativeDriver: true
    }).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          transform: [{ translateY: slideY }],
          backgroundColor: theme.dark ? '#1E293B' : '#FFFFFF',
          borderColor: theme.colors.border
        }
      ]}
    >
      <View style={styles.contentRow}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.accent + '22' }]}>
          <Bell size={18} color={theme.colors.accent} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Platform Alert</Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={dismiss}>
          <X size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  textContainer: {
    flex: 1
  },
  title: {
    fontSize: 12,
    fontWeight: '700'
  },
  message: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14
  },
  closeBtn: {
    padding: 4,
    marginLeft: 6
  }
});
export default NotificationToast;
