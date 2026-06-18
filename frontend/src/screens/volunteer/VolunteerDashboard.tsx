import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  Award, Navigation, LogOut, RefreshCw, Sun, Moon, ArrowRight,
  ClipboardCheck, Bell, History, Shield, Zap, CheckCircle, Clock
} from 'lucide-react-native';
import { RootState } from '../../store';
import { logout, toggleTheme } from '../../store/authSlice';
import {
  setActivePickups, setLeaderboard, addVolunteerNotification
} from '../../store/volunteerSlice';
import VolunteerService from '../../services/volunteerService';
import { AppTheme } from '../../theme/theme';

interface VolunteerDashboardProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}




export const VolunteerDashboard: React.FC<VolunteerDashboardProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { activePickups, leaderboard, subStatuses, unreadCount } = useSelector((state: RootState) => state.volunteer);

  const [unassignedPickups, setUnassignedPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      // 1. Fetch unassigned pickups (Accepted status — awaiting volunteer)
      const available = await VolunteerService.getAvailablePickups();
      setUnassignedPickups(available);

      // 2. Fetch pickups assigned to this volunteer
      if (user?.id) {
        const assigned = await VolunteerService.getAssignedPickups(user.id);
        dispatch(setActivePickups(assigned as any));
      }

      // 3. Fetch leaderboard
      const board = await VolunteerService.getLeaderboard();
      dispatch(setLeaderboard(board as any));
    } catch (err: any) {
      console.error('Fetch volunteer dashboard data error:', err);
      setError('Failed to load data. Please check your connection and refresh.');
      setUnassignedPickups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleClaim = async (id: string, foodType: string, quantity: number, unit: string, donorName: string) => {
    if (!user?.id || !user?.name) {
      alert('User session not found. Please log in again.');
      return;
    }
    try {
      await VolunteerService.claimPickup(id, user.id, user.name);

      // Notify
      dispatch(addVolunteerNotification({
        type: 'new_assignment',
        title: 'New Delivery Claimed! 🚚',
        message: `You claimed a delivery task for ${foodType} (${quantity} ${unit}) from ${donorName}.`,
        donationId: id
      }));

      setTimeout(() => {
        dispatch(addVolunteerNotification({
          type: 'pickup_reminder',
          title: 'Pickup Reminder ⏰',
          message: `Please pick up the food from ${donorName} soon to maintain freshness.`,
          donationId: id
        }));
      }, 3000);

      fetchData(true);
    } catch (err: any) {
      console.error('Claim task error:', err);
      alert(err.message || 'Failed to claim delivery task.');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('Login');
  };

  // Compute stats metrics
  const assignedCount = activePickups.filter(p => {
    const subStatus = subStatuses[p.id || (p as any)._id];
    const status = (subStatus || p.status) as string;
    return status === 'Assigned' || status === 'Pickup Started';
  }).length;

  const activeCount = activePickups.filter(p => {
    const subStatus = subStatuses[p.id || (p as any)._id];
    const status = (subStatus || p.status) as string;
    return ['Picked Up', 'In Transit', 'Delivered'].includes(status);
  }).length;

  const completedCount = user?.completedPickups || 0;
  const totalCount = completedCount + activePickups.length;

  const userRankIndex = leaderboard.findIndex(u => u.name === user?.name || u.id === user?.id);
  const leaderboardPos = userRankIndex >= 0 ? `#${userRankIndex + 1}` : 'N/A';

  const renderAvailableItem = ({ item }: { item: any }) => (
    <View style={[styles.taskCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.foodType}</Text>
        <Text style={[styles.qtyBadge, { color: theme.colors.primary, backgroundColor: theme.colors.primary + '14' }]}>
          {item.quantity} {item.unit}
        </Text>
      </View>
      <Text style={[styles.cardText, { color: theme.colors.textSecondary }]}>
        From: <Text style={styles.boldText}>{item.donorName || item.donorDetails?.name || 'Local Donor'}</Text>
      </Text>
      <Text style={[styles.cardText, { color: theme.colors.textSecondary }]}>
        To: <Text style={styles.boldText}>{item.ngoName || item.ngoDetails?.name || 'Welfare Center'}</Text>
      </Text>
      
      <TouchableOpacity
        id={`btn-claim-task-${item.id || item._id}`}
        style={[styles.claimBtn, { backgroundColor: theme.colors.primary }]}
        onPress={() => handleClaim(
          item.id || item._id,
          item.foodType,
          item.quantity,
          item.unit,
          item.donorName || item.donorDetails?.name || 'Donor'
        )}
      >
        <Text style={styles.claimBtnText}>Claim Delivery Task</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAssignedItem = ({ item }: { item: any }) => {
    const subStatus = subStatuses[item.id || item._id];
    const displayStatus = subStatus || item.status;
    
    return (
      <TouchableOpacity
        style={[styles.taskCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent + '33' }]}
        onPress={() => navigate('PickupRoute')}
        id={`card-active-task-${item.id || item._id}`}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.foodType}</Text>
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.accent + '1A' }]}>
            <Text style={[styles.statusText, { color: theme.colors.accent }]}>{displayStatus}</Text>
          </View>
        </View>
        <Text style={[styles.cardText, { color: theme.colors.textSecondary }]}>
          📍 Pickup: {item.donorDetails?.name || item.donorName || 'Donor'}
        </Text>
        <Text style={[styles.cardText, { color: theme.colors.textSecondary }]}>
          🏢 Dropoff: {item.ngoDetails?.name || item.ngoName || 'NGO'}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={[styles.navText, { color: theme.colors.primary }]}>Open Navigation support</Text>
          <ArrowRight size={14} color={theme.colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <View>
          <Text style={[styles.welcomeText, { color: theme.colors.textSecondary }]}>Hello, Volunteer</Text>
          <Text style={[styles.nameText, { color: theme.colors.text }]} numberOfLines={1}>
            {user?.name}
          </Text>
        </View>
        
        <View style={styles.rightActions}>
          <TouchableOpacity
            id="btn-notifications"
            style={[styles.circleBtn, { backgroundColor: theme.colors.card }]}
            onPress={() => navigate('VolunteerNotifications')}
          >
            <Bell size={18} color={theme.colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.colors.notification }]}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            id="btn-toggle-theme"
            style={[styles.circleBtn, { backgroundColor: theme.colors.card }]} 
            onPress={() => dispatch(toggleTheme())}
          >
            {theme.dark ? <Sun size={18} color={theme.colors.warning} /> : <Moon size={18} color={theme.colors.primary} />}
          </TouchableOpacity>

          <TouchableOpacity 
            id="btn-logout"
            style={[styles.circleBtn, { backgroundColor: theme.colors.card }]} 
            onPress={handleLogout}
          >
            <LogOut size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '1A', borderColor: theme.colors.error }]}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Karma points & Rank */}
        <View style={[styles.karmaCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.karmaRow}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '1A' }]}>
              <Award size={24} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={[styles.karmaVal, { color: theme.colors.text }]}>
                {user?.volunteerScore || 0} Points
              </Text>
              <Text style={[styles.karmaLabel, { color: theme.colors.textSecondary }]}>
                Karma Level: {(user?.completedPickups || 0) > 5 ? 'Elite Hero' : 'Rookie Deliverer'} • {user?.completedPickups || 0} Completed Pickups
              </Text>
            </View>
          </View>
        </View>

        {/* Dashboard Grid Statistics */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Performance Metrics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statsRowGrid}>
            <View style={[styles.statCell, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Clock size={16} color={theme.colors.accent} style={{ marginBottom: 4 }} />
              <Text style={[styles.statValNum, { color: theme.colors.text }]}>{assignedCount}</Text>
              <Text style={[styles.statLabelSub, { color: theme.colors.textSecondary }]}>Assigned Pickups</Text>
            </View>
            <View style={[styles.statCell, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Navigation size={16} color={theme.colors.primary} style={{ marginBottom: 4 }} />
              <Text style={[styles.statValNum, { color: theme.colors.text }]}>{activeCount}</Text>
              <Text style={[styles.statLabelSub, { color: theme.colors.textSecondary }]}>Active Deliveries</Text>
            </View>
          </View>

          <View style={[styles.statsRowGrid, { marginTop: 10 }]}>
            <View style={[styles.statCell, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <CheckCircle size={16} color={theme.colors.success || '#2E7D32'} style={{ marginBottom: 4 }} />
              <Text style={[styles.statValNum, { color: theme.colors.text }]}>{completedCount}</Text>
              <Text style={[styles.statLabelSub, { color: theme.colors.textSecondary }]}>Completed Pickups</Text>
            </View>
            <View style={[styles.statCell, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Shield size={16} color={theme.colors.info} style={{ marginBottom: 4 }} />
              <Text style={[styles.statValNum, { color: theme.colors.text }]}>{leaderboardPos}</Text>
              <Text style={[styles.statLabelSub, { color: theme.colors.textSecondary }]}>Leaderboard Rank</Text>
            </View>
          </View>
        </View>

        {/* Action Panel Buttons */}
        <View style={styles.actionPanel}>
          <TouchableOpacity 
            id="btn-view-leaderboard"
            style={[styles.actionBtn, { backgroundColor: theme.colors.accent }]}
            onPress={() => navigate('Leaderboard')}
          >
            <Award size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Leaderboard</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            id="btn-view-history"
            style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigate('VolunteerHistory')}
          >
            <History size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Delivery History</Text>
          </TouchableOpacity>
        </View>

        {/* Active Task (Claimed by Volunteer) */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 10 }]}>Active Delivery Task</Text>
        {activePickups.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, marginBottom: 20 }]}>
            <ClipboardCheck size={28} color={theme.colors.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No active task assigned. Claim a delivery task below!
            </Text>
          </View>
        ) : (
          <FlatList
            data={activePickups}
            keyExtractor={(item) => item.id || (item as any)._id}
            renderItem={renderAssignedItem}
            scrollEnabled={false}
            contentContainerStyle={{ marginBottom: 20 }}
          />
        )}

        {/* Available pickups queue */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Awaiting Transport</Text>
          <TouchableOpacity onPress={onRefresh} id="btn-refresh-volunteer">
            <RefreshCw size={14} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : unassignedPickups.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <ClipboardCheck size={28} color={theme.colors.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No pending transport tasks found. Check back later!
            </Text>
          </View>
        ) : (
          <FlatList
            data={unassignedPickups}
            keyExtractor={(item) => item.id || (item as any)._id}
            renderItem={renderAvailableItem}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.08)'
  },
  welcomeText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 12,
    fontWeight: '600'
  },
  nameText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 18,
    fontWeight: '800',
    maxWidth: 180,
    letterSpacing: -0.2
  },
  rightActions: {
    flexDirection: 'row',
    gap: 10,
    position: 'relative'
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  badgeText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900'
  },
  content: {
    padding: 20
  },
  errorBox: {
    margin: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1
  },
  errorText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center'
  },
  karmaCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1
  },
  karmaRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  karmaVal: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 20,
    fontWeight: '800'
  },
  karmaLabel: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700'
  },
  statsGrid: {
    marginBottom: 24
  },
  statsRowGrid: {
    flexDirection: 'row',
    gap: 10
  },
  statCell: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8
  },
  statValNum: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  statLabelSub: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4
  },
  actionPanel: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6
  },
  actionBtnText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10
  },
  sectionTitle: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  taskCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  cardTitle: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 14.5,
    fontWeight: '700'
  },
  qtyBadge: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 10,
    fontWeight: '800',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12
  },
  statusText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 10,
    fontWeight: '800'
  },
  cardText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 12,
    marginBottom: 6
  },
  boldText: {
    fontWeight: '700'
  },
  claimBtn: {
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  claimBtnText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.08)',
    paddingTop: 10,
    marginTop: 8
  },
  navText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 11,
    fontWeight: '700'
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1
  },
  emptyText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18
  }
});

export default VolunteerDashboard;
