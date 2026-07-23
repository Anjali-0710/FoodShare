import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { Bot } from 'lucide-react-native';
import { getChatbotStyles } from './chatbotStyles';

interface TypingIndicatorProps {
  isDark: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isDark }) => {
  const styles = getChatbotStyles(isDark);
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: -5,
              duration: 300,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 300,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
          ])
        ),
      ]);
    };

    const anim1 = createAnimation(dot1Anim, 0);
    const anim2 = createAnimation(dot2Anim, 150);
    const anim3 = createAnimation(dot3Anim, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      dot1Anim.stopAnimation();
      dot2Anim.stopAnimation();
      dot3Anim.stopAnimation();
    };
  }, [dot1Anim, dot2Anim, dot3Anim]);

  return (
    <View style={[styles.messageRow, styles.messageRowAI]}>
      <View style={styles.aiAvatarContainer}>
        <Bot size={16} color="#FFFFFF" />
      </View>
      <View style={[styles.bubble, styles.aiBubble, styles.typingRow]}>
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1Anim }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2Anim }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3Anim }] }]} />
      </View>
    </View>
  );
};

export default TypingIndicator;
