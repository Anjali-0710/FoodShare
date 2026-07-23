import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { getChatbotStyles } from './chatbotStyles';

const SUGGESTIONS = [
  'Donate Food',
  'Register NGO',
  'Become Volunteer',
  'Food Safety',
  'Track Donation',
  'Contact Support',
  'Nearby NGOs',
  'Food Categories',
];

interface QuickSuggestionsProps {
  onSelectSuggestion: (text: string) => void;
  isDark: boolean;
}

export const QuickSuggestions: React.FC<QuickSuggestionsProps> = ({
  onSelectSuggestion,
  isDark,
}) => {
  const styles = getChatbotStyles(isDark);

  return (
    <View style={styles.suggestionsContainer}>
      <Text style={styles.suggestionsTitle}>💡 Quick Suggestions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
      >
        {SUGGESTIONS.map((item) => (
          <TouchableOpacity
            key={item}
            style={styles.chipItem}
            onPress={() => onSelectSuggestion(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default QuickSuggestions;
