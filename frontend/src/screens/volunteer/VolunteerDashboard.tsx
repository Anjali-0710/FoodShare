import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  Award, Navigation, LogOut, RefreshCw, Sun, Moon, ArrowRight,
  ClipboardCheck, Bell, History, Shield, Zap, CheckCircle, Clock,
  Sparkles, MapPin, Truck, Layers, Calendar
} from 'lucide-react-native';
import { RootState } from '../../store';
import { logout, toggleTheme } from '../../store/authSlice';
import {
  setActivePickups, setLeaderboard
} from '../../store/volunteerSlice';
import VolunteerService from '../../services/volunteerService';
import { AppTheme } from '../../theme/theme';

interface VolunteerDashboardProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

export const VolunteerDashboard: React.FC<VolunteerDashboardProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);
  const { activePickups, leaderboard, subStatuses, unreadCount } = useSelector((state: RootState) => state.volunteer);

  const [unassignedPickups, setUnassignedPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      // 1. Fetch unassigned pickups
      const available = await VolunteerService.getAvailablePickups();
      setUnassignedPickups(available || []);

      // 2. Fetch pickups assigned to this volunteer
      if (user?.id) {
        const assigned = await VolunteerService.getAssignedPickups(user.id);
        dispatch(setActivePickups((assigned || []) as any));
      }

      // 3. Fetch leaderboard
      const board = await VolunteerService.getLeaderboard();
      dispatch(setLeaderboard((board || []) as any));
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

  const getInitials = (name: string) => {
    if (!name) return 'V';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Compute stats metrics
  const assignedCount = (activePickups ?? []).filter(p => {
    const subStatus = subStatuses[p?.id || (p as any)?._id];
    const status = (subStatus || p?.status) as string;
    return status === 'Assigned' || status === 'Pickup Started';
  }).length;

  const activeCount = (activePickups ?? []).filter(p => {
    const subStatus = subStatuses[p?.id || (p as any)?._id];
    const status = (subStatus || p?.status) as string;
    return ['Picked Up', 'In Transit', 'Delivered'].includes(status);
  }).length;

  const completedCount = user?.completedPickups || 0;
  const totalCount = completedCount + (activePickups?.length ?? 0);

  const userRankIndex = (leaderboard ?? []).findIndex(u => u?.name === user?.name || u?.id === user?.id);
  const leaderboardPos = userRankIndex >= 0 ? `#${userRankIndex + 1}` : 'N/A';

  const renderAvailableItem = ({ item }: { item: any }) => (
    <View style={[styles.taskCard, { borderColor: theme.colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item?.foodType ?? 'Food Task'}</Text>
        <Text style={styles.qtyBadge}>
          {item?.quantity ?? 0} {item?.unit ?? ''}
        </Text>
      </View>
      
      <Text style={styles.cardText}>
        From: <Text style={styles.boldText}>{item?.donorName || item?.donorDetails?.name || 'Local Donor'}</Text>
      </Text>
      <Text style={styles.cardText}>
        To: <Text style={styles.boldText}>{item?.ngoName || item?.ngoDetails?.name || 'Welfare Center'}</Text>
      </Text>

      <View style={styles.cardDivider} />
      
      <TouchableOpacity
        id={`btn-claim-task-${item?.id || item?._id}`}
        style={styles.claimBtn}
        onPress={() => handleClaim(
          item?.id || item?._id,
          item?.foodType,
          item?.quantity,
          item?.unit,
          item?.donorName || item?.donorDetails?.name || 'Donor'
        )}
      >
        <Text style={styles.claimBtnText}>Claim Delivery Task</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAssignedItem = ({ item }: { item: any }) => {
    const subStatus = subStatuses[item?.id || item?._id];
    const displayStatus = subStatus || item?.status;
    
    return (
      <TouchableOpacity
        style={[styles.taskCard, { borderColor: '#F59E0B' }]}
        onPress={() => navigate('PickupRoute')}
        id={`card-active-task-${item?.id || item?._id}`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item?.foodType ?? 'Food Task'}</Text>
          <View style={styles.statusBadgeYellow}>
            <Text style={styles.statusBadgeText}>{displayStatus}</Text>
          </View>
        </View>
        <Text style={styles.cardText}>
          📍 Pickup: {item?.donorDetails?.name || item?.donorName || 'Donor'}
        </Text>
        <Text style={styles.cardText}>
          🏢 Dropoff: {item?.ngoDetails?.name || item?.ngoName || 'NGO'}
        </Text>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <Text style={styles.navText}>Open Navigation support</Text>
          <ArrowRight size={14} color="#22C55E" />
        </View>
      </TouchableOpacity>
    );
  };

  const isDark = Boolean(theme?.dark);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* SaaS Glassmorphism Header */}
      <View style={[styles.navBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerUserSection}>
          <View style={styles.avatarHeader}>
            <Text style={styles.avatarHeaderText}>{getInitials(user?.name || 'Volunteer')}</Text>
          </View>
          <View>
            <Text style={[styles.welcomeText, { color: theme.colors.textSecondary }]}>Active Hero Volunteer</Text>
            <Text style={[styles.nameText, { color: theme.colors.text }]} numberOfLines={1}>
              {user?.name || 'Hero Volunteer'}
            </Text>
          </View>
        </View>
        
        <View style={styles.rightActions}>
          <TouchableOpacity
            id="btn-notifications"
            style={styles.circleBtn}
            onPress={() => navigate('VolunteerNotifications')}
          >
            <Bell size={18} color="#64748B" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            id="btn-toggle-theme"
            style={styles.circleBtn} 
            onPress={() => dispatch(toggleTheme())}
          >
            {theme?.dark ? <Sun size={18} color="#EAB308" /> : <Moon size={18} color="#22C55E" />}
          </TouchableOpacity>

          <TouchableOpacity 
            id="btn-logout"
            style={styles.circleBtn} 
            onPress={handleLogout}
          >
            <LogOut size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22C55E']} />}
      >
        {/* Welcome Dashboard Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroLeft}>
            <Sparkles size={20} color="#FFFFFF" style={{ marginBottom: 6 }} />
            <Text style={styles.heroTitle}>Karma Level Achievements</Text>
            <Text style={styles.heroDesc}>
              Karma Level: {(user?.completedPickups || 0) > 5 ? 'Elite Hero' : 'Rookie Deliverer'} • {user?.completedPickups || 0} completed transports.
            </Text>
          </View>
          <View style={styles.heroIconBox}>
            <Award size={40} color="#FFFFFF" />
          </View>
        </View>

        {/* Karma points & Rank */}
        <View style={styles.karmaCard}>
          <View style={styles.karmaRow}>
            <View style={styles.iconBox}>
              <Zap size={24} color="#22C55E" />
            </View>
            <View>
              <Text style={styles.karmaVal}>
                {user?.volunteerScore || 0} Karma Points
              </Text>
              <Text style={styles.karmaLabel}>
                Earn points for completing matching listings on time.
              </Text>
            </View>
          </View>
        </View>

        {/* Dashboard Grid Statistics */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { borderLeftColor: '#F59E0B' }]}>
            <View style={styles.statMetaRow}>
              <Text style={styles.statLabel}>Assigned</Text>
              <Clock size={14} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{assignedCount}</Text>
            <Text style={styles.statSubText}>Pickup pending</Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: '#3B82F6' }]}>
            <View style={styles.statMetaRow}>
              <Text style={styles.statLabel}>Active</Text>
              <Truck size={14} color="#3B82F6" />
            </View>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{activeCount}</Text>
            <Text style={styles.statSubText}>In transit routes</Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: '#22C55E' }]}>
            <View style={styles.statMetaRow}>
              <Text style={styles.statLabel}>Completed</Text>
              <CheckCircle size={14} color="#22C55E" />
            </View>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statSubText}>Total drops</Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: '#8B5CF6' }]}>
            <View style={styles.statMetaRow}>
              <Text style={styles.statLabel}>Leaderboard</Text>
              <Shield size={14} color="#8B5CF6" />
            </View>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{leaderboardPos}</Text>
            <Text style={styles.statSubText}>Community rank</Text>
          </View>
        </View>

        {/* Action Panel Buttons */}
        <View style={styles.actionPanel}>
          <TouchableOpacity 
            id="btn-view-leaderboard"
            style={styles.actionBtnPrimary}
            onPress={() => navigate('Leaderboard')}
          >
            <Award size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextPrimary}>Leaderboard</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            id="btn-view-history"
            style={styles.actionBtnSecondary}
            onPress={() => navigate('VolunteerHistory')}
          >
            <History size={16} color="#22C55E" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextSecondary}>My History</Text>
          </TouchableOpacity>
        </View>

        {/* Active Task (Claimed by Volunteer) */}
        <Text style={styles.sectionTitle}>Active Claimed task</Text>
        {!activePickups || activePickups.length === 0 ? (
          <View style={styles.emptyCard}>
            <ClipboardCheck size={28} color="#94A3B8" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Active Delivery</Text>
            <Text style={styles.emptyText}>
              A claimed delivery task will show up here. Complete it to secure Karma points!
            </Text>
          </View>
        ) : (
          <FlatList
            data={activePickups}
            keyExtractor={(item) => item?.id || (item as any)?._id}
            renderItem={renderAssignedItem}
            scrollEnabled={false}
            contentContainerStyle={{ marginBottom: 20 }}
          />
        )}

        {/* Available pickups queue */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Awaiting Transport</Text>
            <Text style={styles.sectionSubtitle}>Pending listings needing transportation matches</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} id="btn-refresh-volunteer" style={styles.refreshBtnCircle}>
            <RefreshCw size={14} color="#64748B" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#22C55E" style={{ marginTop: 24 }} />
        ) : !unassignedPickups || unassignedPickups.length === 0 ? (
          <View style={styles.emptyCard}>
            <ClipboardCheck size={28} color="#94A3B8" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>Zero Pending Tasks</Text>
            <Text style={styles.emptyText}>
              All local food donations are currently fully claimed. Nice work!
            </Text>
          </View>
        ) : (
          <FlatList
            data={unassignedPickups}
            keyExtractor={(item) => item?.id || (item as any)?._id}
            renderItem={renderAvailableItem}
            scrollEnabled={false}
          />
        )}
      </ScrollView>    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerUserSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarHeader: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#22C55E',
  },
  welcomeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    maxWidth: 150,
    letterSpacing: -0.2,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    backgroundColor: '#22C55E',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#22C55E',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  heroLeft: {
    flex: 1,
    marginRight: 10,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroDesc: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    lineHeight: 16,
  },
  heroIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    margin: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  karmaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  karmaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  karmaVal: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#22C55E',
  },
  karmaLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#FAFBFD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  statMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: -0.5,
  },
  statSubText: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  actionPanel: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionBtnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#22C55E',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtnSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionBtnTextSecondary: {
    color: '#22C55E',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  refreshBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  qtyBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22C55E',
    backgroundColor: '#F0FDF4',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusBadgeYellow: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  cardText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 4,
  },
  boldText: {
    fontWeight: '700',
    color: '#334155',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  claimBtn: {
    height: 38,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  floatingAiBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 999,
  },
});

export default VolunteerDashboard;
