import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { ArrowLeft, Trophy, Award, Flame } from 'lucide-react-native';
import { RootState } from '../../store';
import { apiCall } from '../../services/api';
import { AppTheme } from '../../theme/theme';

interface LeaderboardScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

const MOCK_LEADERBOARD = [
  { _id: 'lv1', name: 'Priya Nair', completedPickups: 48, volunteerScore: 2400 },
  { _id: 'lv2', name: 'Arjun Mehta', completedPickups: 36, volunteerScore: 1800 },
  { _id: 'lv3', name: 'Rohan Sharma', completedPickups: 24, volunteerScore: 1200 },
  { _id: 'lv4', name: 'Sunita Rao', completedPickups: 18, volunteerScore: 900 },
  { _id: 'lv5', name: 'Karan Verma', completedPickups: 12, volunteerScore: 600 },
  { _id: 'lv6', name: 'Anita Patel', completedPickups: 7, volunteerScore: 350 },
];

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ theme, navigate }) => {
  const { token } = useSelector((state: RootState) => state.auth);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await apiCall('/volunteer/leaderboard', { token });
        if (response.success) setLeaderboard(response.leaderboard);
      } catch (error) {
        // Backend offline — show demo leaderboard
        setLeaderboard(MOCK_LEADERBOARD);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);


  const renderLeaderboardItem = ({ item, index }: { item: any; index: number }) => {
    const rank = index + 1;
    let rankColor = theme.colors.text;
    let isTop3 = false;

    if (rank === 1) {
      rankColor = '#FFD700'; // Gold
      isTop3 = true;
    } else if (rank === 2) {
      rankColor = '#C0C0C0'; // Silver
      isTop3 = true;
    } else if (rank === 3) {
      rankColor = '#CD7F32'; // Bronze
      isTop3 = true;
    }

    return (
      <View style={[styles.leaderboardRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.rankCol}>
          {isTop3 ? (
            <Trophy size={20} color={rankColor} fill={rankColor + '44'} />
          ) : (
            <Text style={[styles.rankText, { color: theme.colors.textSecondary }]}>#{rank}</Text>
          )}
        </View>

        <View style={styles.nameCol}>
          <Text style={[styles.nameText, { color: theme.colors.text }]}>{item.name}</Text>
          <Text style={[styles.deliverySub, { color: theme.colors.textSecondary }]}>
            {item.completedPickups} pickups completed
          </Text>
        </View>

        <View style={styles.scoreCol}>
          <Flame size={14} color={theme.colors.accent} style={{ marginRight: 4 }} />
          <Text style={[styles.scoreText, { color: theme.colors.accent }]}>{item.volunteerScore} pts</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-leaderboard-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Karma Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Top Banner (Motivation) */}
      <View style={[styles.banner, { backgroundColor: theme.colors.primary }]}>
        <Award size={36} color="#FFFFFF" style={{ marginBottom: 6 }} />
        <Text style={styles.bannerTitle}>Transport Heroes</Text>
        <Text style={styles.bannerText}>Top volunteers reducing food waste and supporting NGOs in New Delhi</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.id || item._id}
          renderItem={renderLeaderboardItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)'
  },
  backBtn: {
    padding: 8
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  banner: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  bannerText: {
    color: '#E2E8F0',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
    paddingHorizontal: 20,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  list: {
    padding: 16
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10
  },
  rankCol: {
    width: 36,
    alignItems: 'center'
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  nameCol: {
    flex: 1,
    paddingLeft: 8
  },
  nameText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  deliverySub: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  scoreCol: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  }
});
export default LeaderboardScreen;
