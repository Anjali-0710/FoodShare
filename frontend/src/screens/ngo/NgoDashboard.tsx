import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  Search, History, LogOut, RefreshCw, Sun, Moon,
  ArrowRight, Bell, UserCircle, List, CheckCircle2,
  TrendingUp, Package, Clock3, Truck
} from 'lucide-react';
import { RootState } from '../../store';
import { logout, toggleTheme } from '../../store/authSlice';
import { setMyDonations, setActiveDonation } from '../../store/ngoSlice';
import { apiCall } from '../../services/api';
import { AppTheme } from '../../theme/theme';

interface NgoDashboardProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

const MOCK_CLAIMED = [
  { _id: 'c001', id: 'c001', foodType: 'Cooked Rice & Dal', quantity: 60, unit: 'Plates', status: 'Accepted', pickupAddress: '14 Koramangala, Bengaluru', donorName: 'Hotel Udupi Garden', volunteerName: null, freshnessScore: 88, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { _id: 'c002', id: 'c002', foodType: 'Fresh Bread Loaves', quantity: 40, unit: 'Packets', status: 'Assigned', pickupAddress: '22 Jayanagar, Bengaluru', donorName: 'Modern Bakery', volunteerName: 'Rohan Sharma', freshnessScore: 76, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { _id: 'c003', id: 'c003', foodType: 'Mixed Vegetables', quantity: 25, unit: 'Kg', status: 'Picked Up', pickupAddress: '8 HSR Layout, Bengaluru', donorName: 'Fresh Farms', volunteerName: 'Priya Nair', freshnessScore: 92, createdAt: new Date(Date.now() - 10800000).toISOString() },
];

const MONTHLY_DATA = [
  { month: 'Jan', kg: 82 }, { month: 'Feb', kg: 110 }, { month: 'Mar', kg: 145 },
  { month: 'Apr', kg: 98 }, { month: 'May', kg: 178 }, { month: 'Jun', kg: 203 },
];

const getStatusColor = (status: string, theme: AppTheme) => {
  switch (status) {
    case 'Pending': return theme.colors.warning;
    case 'Accepted': return theme.colors.accent;
    case 'Assigned': return '#8B5CF6';
    case 'Picked Up': return '#F97316';
    case 'Delivered': return '#06B6D4';
    case 'Completed': return theme.colors.success;
    case 'Cancelled': return theme.colors.error;
    default: return theme.colors.textSecondary;
  }
};

const getStatusIcon = (status: string, theme: AppTheme) => {
  const color = getStatusColor(status, theme);
  switch (status) {
    case 'Accepted': return <CheckCircle2 size={12} color={color} />;
    case 'Assigned': return <Truck size={12} color={color} />;
    case 'Picked Up': return <Package size={12} color={color} />;
    default: return <Clock3 size={12} color={color} />;
  }
};

export const NgoDashboard: React.FC<NgoDashboardProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);
  const { unreadCount } = useSelector((state: RootState) => state.ngo);

  const [claimedDonations, setClaimedDonations] = useState<any[]>([]);
  const [allDonations, setAllDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiCall('/donations?mine=true', { token });
      if (response.success) {
        const all = response.donations;
        setAllDonations(all);
        const active = all.filter((d: any) =>
          ['Accepted', 'Assigned', 'Picked Up', 'Delivered'].includes(d.status)
        );
        setClaimedDonations(active);
        dispatch(setMyDonations(all));
      }
    } catch {
      setClaimedDonations(MOCK_CLAIMED);
      setAllDonations(MOCK_CLAIMED);
      dispatch(setMyDonations(MOCK_CLAIMED));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('Login');
  };

  // Stats computation
  const completed = allDonations.filter(d => d.status === 'Completed');
  const accepted = allDonations.filter(d => d.status === 'Accepted');
  const active = allDonations.filter(d =>
    ['Accepted', 'Assigned', 'Picked Up', 'Delivered'].includes(d.status)
  );
  const collectedFoodKg = completed.reduce((sum, d) => {
    let factor = 1;
    if (d.unit === 'Plates') factor = 0.4;
    else if (d.unit === 'Packets') factor = 0.3;
    return sum + d.quantity * factor;
  }, 0);

  const currentLoad = claimedDonations.reduce((sum, d) => {
    let factor = 1;
    if (d.unit === 'Plates') factor = 0.4;
    else if (d.unit === 'Packets') factor = 0.3;
    return sum + d.quantity * factor;
  }, 0);

  const maxCapacity = user?.ngoCapacity || 250;
  const capacityPercent = Math.min(100, Math.round((currentLoad / maxCapacity) * 100));
  const maxMonthly = Math.max(...MONTHLY_DATA.map(m => m.kg), 1);

  const handleItemPress = (item: any) => {
    dispatch(setActiveDonation(item));
    navigate('NgoDonationDetail');
  };

  const renderClaimedItem = ({ item }: { item: any }) => {
    const statusColor = getStatusColor(item.status, theme);
    return (
      <TouchableOpacity
        id={`ngo-card-${item.id || item._id}`}
        style={[styles.donationCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.82}
      >
        <View style={[styles.cardLeftBar, { backgroundColor: statusColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.foodType}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '1F' }]}>
              {getStatusIcon(item.status, theme)}
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>
          <Text style={[styles.cardDetails, { color: theme.colors.textSecondary }]}>
            {item.quantity} {item.unit} • {item.donorName || 'Local Donor'}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={[styles.cardAddress, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              📍 {item.pickupAddress}
            </Text>
            <Text style={[styles.volunteerLabel, { color: item.volunteerName ? '#8B5CF6' : theme.colors.textSecondary }]}>
              {item.volunteerName ? `🚴 ${item.volunteerName}` : '⏳ Awaiting vol.'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Navigation Bar */}
      <View style={[styles.navBar, { borderBottomColor: theme.colors.border }]}>
        <View>
          <Text style={[styles.welcomeText, { color: theme.colors.textSecondary }]}>Hello, NGO Partner</Text>
          <Text style={[styles.nameText, { color: theme.colors.text }]} numberOfLines={1}>
            {user?.name}
          </Text>
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity
            id="btn-ngo-notifications"
            style={[styles.circleBtn, { backgroundColor: theme.colors.card }]}
            onPress={() => navigate('NgoNotifications')}
          >
            <Bell size={18} color={unreadCount > 0 ? theme.colors.accent : theme.colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: theme.colors.error }]}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            id="btn-ngo-profile"
            style={[styles.circleBtn, { backgroundColor: theme.colors.card }]}
            onPress={() => navigate('Profile')}
          >
            <UserCircle size={18} color={theme.colors.primary} />
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Capacity Gauge */}
        <View style={[styles.capacityCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.capacityHeader}>
            <Text style={[styles.capacityTitle, { color: theme.colors.text }]}>NGO Capacity Utilization</Text>
            <Text style={[styles.capacityValues, { color: theme.colors.primary }]}>
              {Math.round(currentLoad)} / {maxCapacity} Kg
            </Text>
          </View>
          <View style={styles.capacityBarShell}>
            <View
              style={[
                styles.capacityBarFill,
                {
                  width: `${capacityPercent}%`,
                  backgroundColor: capacityPercent > 85 ? theme.colors.error : capacityPercent > 60 ? theme.colors.warning : theme.colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.capacityDesc, { color: theme.colors.textSecondary }]}>
            {capacityPercent}% utilized • {maxCapacity - Math.round(currentLoad)} Kg remaining capacity
          </Text>
        </View>

        {/* 4-Stat Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{Math.round(collectedFoodKg * 10) / 10}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Collected (Kg)</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.statValue, { color: theme.colors.accent }]}>{active.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Active Claims</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{completed.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.statValue, { color: theme.colors.info }]}>{allDonations.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Donations</Text>
          </View>
        </View>

        {/* Action Panel */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            id="btn-browse-donations"
            style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigate('BrowseDonations')}
          >
            <Search size={18} color="#FFF" style={{ marginRight: 7 }} />
            <Text style={styles.actionBtnText}>Browse Available</Text>
          </TouchableOpacity>
          <TouchableOpacity
            id="btn-manage-requests"
            style={[styles.actionBtn, { backgroundColor: theme.colors.accent }]}
            onPress={() => navigate('NgoRequests')}
          >
            <List size={18} color="#FFF" style={{ marginRight: 7 }} />
            <Text style={styles.actionBtnText}>Manage Requests</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.actionRow, { marginTop: -10 }]}>
          <TouchableOpacity
            id="btn-view-history"
            style={[styles.actionBtn, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={() => navigate('History')}
          >
            <History size={18} color={theme.colors.primary} style={{ marginRight: 7 }} />
            <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            id="btn-ngo-analytics"
            style={[styles.actionBtn, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={() => navigate('NgoNotifications')}
          >
            <Bell size={18} color={theme.colors.accent} style={{ marginRight: 7 }} />
            <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}</Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Food Collected Mini Chart */}
        <View style={[styles.chartCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <TrendingUp size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Monthly Collection (Kg)</Text>
            </View>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>Last 6 months</Text>
          </View>
          <View style={styles.chartBars}>
            {MONTHLY_DATA.map((m, i) => {
              const heightPct = (m.kg / maxMonthly) * 100;
              const isLast = i === MONTHLY_DATA.length - 1;
              return (
                <View key={m.month} style={styles.barGroup}>
                  <Text style={[styles.barValue, { color: isLast ? theme.colors.primary : theme.colors.textSecondary }]}>
                    {m.kg}
                  </Text>
                  <View style={styles.barShell}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: isLast ? theme.colors.primary : theme.colors.primary + '55',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>{m.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Active Claims Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Active Claims</Text>
          <TouchableOpacity onPress={fetchData} id="btn-refresh">
            <RefreshCw size={14} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : claimedDonations.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <CheckCircle2 size={28} color={theme.colors.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No active claims. Browse and accept donations to get started!
            </Text>
            <TouchableOpacity
              id="btn-empty-browse"
              style={[styles.emptyAction, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigate('BrowseDonations')}
            >
              <Text style={styles.emptyActionText}>Browse Donations</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={claimedDonations}
            keyExtractor={item => item.id || item._id}
            renderItem={renderClaimedItem}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 44, paddingBottom: 20, borderBottomWidth: 1,
  },
  welcomeText: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 12, fontWeight: '600' },
  nameText: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 18, fontWeight: '800', maxWidth: 180, letterSpacing: -0.2 },
  rightActions: { flexDirection: 'row', gap: 10 },
  circleBtn: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    elevation: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute', top: -4, right: -4, width: 16, height: 16,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeText: { color: '#FFF', fontSize: 8.5, fontWeight: '900' },
  content: { padding: 20, paddingBottom: 32 },
  capacityCard: {
    padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20,
    elevation: 1, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8,
  },
  capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  capacityTitle: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 13.5, fontWeight: '800' },
  capacityValues: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 14.5, fontWeight: '800' },
  capacityBarShell: { height: 8, borderRadius: 4, backgroundColor: 'rgba(128,128,128,0.15)', overflow: 'hidden', marginBottom: 10 },
  capacityBarFill: { height: '100%', borderRadius: 4 },
  capacityDesc: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 11, lineHeight: 15 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, minWidth: '44%', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center',
    elevation: 1, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8,
  },
  statValue: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 24, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
  statLabel: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: {
    flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', elevation: 3, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  actionBtnText: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', color: '#FFFFFF', fontWeight: '700', fontSize: 13.5 },
  chartCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24,
    elevation: 1, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center' },
  chartTitle: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 13.5, fontWeight: '800' },
  chartSubtitle: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 10.5 },
  chartBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80 },
  barGroup: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barValue: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 8.5, fontWeight: '800', marginBottom: 4 },
  barShell: { width: '60%', height: 64, justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(128,128,128,0.1)' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 8.5, fontWeight: '700', marginTop: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  donationCard: {
    flexDirection: 'row', borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden',
    elevation: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8,
  },
  cardLeftBar: { width: 4 },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 14.5, fontWeight: '700', flex: 1, marginRight: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, gap: 4 },
  statusText: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 10, fontWeight: '800' },
  cardDetails: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 12, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAddress: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 11, flex: 1, marginRight: 8 },
  volunteerLabel: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 9.5, fontWeight: '800' },
  emptyCard: { padding: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  emptyAction: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12 },
  emptyActionText: { fontFamily: 'Outfit, system-ui, -apple-system, sans-serif', color: '#FFF', fontWeight: '700', fontSize: 13 },
});

export default NgoDashboard;
