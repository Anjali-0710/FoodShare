import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  Search,
  History,
  LogOut,
  RefreshCw,
  Sun,
  Moon,
  ArrowRight,
  Bell,
  UserCircle,
  List,
  CheckCircle2,
  TrendingUp,
  Package,
  Clock3,
  Truck,
  MessageSquare,
  Sparkles,
  Layers,
  Calendar,
  AlertCircle
} from 'lucide-react-native';
import { RootState } from '../../store';
import { logout, toggleTheme } from '../../store/authSlice';
import { setMyDonations, setActiveDonation } from '../../store/ngoSlice';
import { DonationService } from '../../services/donationService';
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
      const all = user?.id ? await DonationService.getNgoDonations(user.id) : [];
      setAllDonations(all || []);
      const active = (all ?? []).filter((d: any) =>
        ['Accepted', 'Assigned', 'Picked Up', 'Delivered'].includes(d.status)
      );
      setClaimedDonations(active);
      dispatch(setMyDonations(all || []));
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
  const completed = (allDonations ?? []).filter(d => d?.status === 'Completed');
  const active = (allDonations ?? []).filter(d =>
    ['Accepted', 'Assigned', 'Picked Up', 'Delivered'].includes(d?.status)
  );
  const collectedFoodKg = (completed ?? []).reduce((sum, d) => {
    let factor = 1;
    if (d?.unit === 'Plates') factor = 0.4;
    else if (d?.unit === 'Packets') factor = 0.3;
    return sum + (d?.quantity ?? 0) * factor;
  }, 0);

  const currentLoad = (claimedDonations ?? []).reduce((sum, d) => {
    let factor = 1;
    if (d?.unit === 'Plates') factor = 0.4;
    else if (d?.unit === 'Packets') factor = 0.3;
    return sum + (d?.quantity ?? 0) * factor;
  }, 0);

  const maxCapacity = user?.ngoCapacity || 250;
  const capacityPercent = Math.min(100, Math.round((currentLoad / maxCapacity) * 100));
  const maxMonthly = Math.max(...(MONTHLY_DATA ?? []).map(m => m.kg), 1);

  const handleItemPress = (item: any) => {
    dispatch(setActiveDonation(item));
    navigate('NgoDonationDetail');
  };

  const getInitials = (name: string) => {
    if (!name) return 'N';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderClaimedItem = ({ item }: { item: any }) => {
    const statusColor = getStatusColor(item?.status, theme);
    return (
      <TouchableOpacity
        id={`ngo-card-${item?.id || item?._id}`}
        style={[styles.donationCard, { borderColor: theme.colors.border }]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.85}
      >
        <View style={[styles.cardLeftBar, { backgroundColor: statusColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item?.foodType ?? 'Food'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '1F' }]}>
              {getStatusIcon(item?.status, theme)}
              <Text style={[styles.statusText, { color: statusColor }]}>{item?.status ?? 'Accepted'}</Text>
            </View>
          </View>
          
          <Text style={styles.cardDetails}>
            {item?.quantity ?? 0} {item?.unit ?? ''} • {item?.donorName || 'Local Donor'}
          </Text>
          
          <View style={styles.cardDivider} />
          
          <View style={styles.cardFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <ArrowRight size={12} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.cardAddress} numberOfLines={1}>
                📍 {item?.pickupAddress ?? item?.address ?? ''}
              </Text>
            </View>
            <Text style={[styles.volunteerLabel, { color: item?.volunteerName ? '#8B5CF6' : '#64748B' }]}>
              {item?.volunteerName ? `🚴 ${item.volunteerName}` : '⏳ Matching Courier'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* SaaS Glassmorphism Header */}
      <View style={styles.navBar}>
        <View style={styles.headerUserSection}>
          <View style={styles.avatarHeader}>
            <Text style={styles.avatarHeaderText}>{getInitials(user?.name || 'NGO')}</Text>
          </View>
          <View>
            <Text style={styles.welcomeText}>NGO Panel Partner</Text>
            <Text style={styles.nameText} numberOfLines={1}>
              {user?.name || 'Care NGO'}
            </Text>
          </View>
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity
            id="btn-ngo-notifications"
            style={styles.circleBtn}
            onPress={() => navigate('NgoNotifications')}
          >
            <Bell size={18} color={unreadCount > 0 ? '#F59E0B' : '#64748B'} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            id="btn-ngo-profile"
            style={styles.circleBtn}
            onPress={() => navigate('Profile')}
          >
            <UserCircle size={18} color="#64748B" />
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Capacity Gauge Banner */}
        <View style={styles.capacityCard}>
          <View style={styles.capacityHeader}>
            <Text style={styles.capacityTitle}>Capacity Utilization</Text>
            <Text style={styles.capacityValues}>
              {Math.round(currentLoad)} / {maxCapacity} Kg
            </Text>
          </View>
          <View style={styles.capacityBarShell}>
            <View
              style={[
                styles.capacityBarFill,
                {
                  width: `${capacityPercent}%`,
                  backgroundColor: capacityPercent > 85 ? '#EF4444' : capacityPercent > 60 ? '#F59E0B' : '#22C55E',
                },
              ]}
            />
          </View>
          <Text style={styles.capacityDesc}>
            {capacityPercent}% utilized • {maxCapacity - Math.round(currentLoad)} Kg remaining capacity
          </Text>
        </View>

        {/* Premium Grid Statistics */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { borderLeftColor: '#22C55E' }]}>
            <View style={styles.statMetaRow}>
              <Text style={styles.statLabel}>Collected</Text>
              <TrendingUp size={14} color="#22C55E" />
            </View>
            <Text style={styles.statValue}>{Math.round(collectedFoodKg * 10) / 10} Kg</Text>
            <Text style={styles.statSubText}>Completed weight</Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: '#3B82F6' }]}>
            <View style={styles.statMetaRow}>
              <Text style={styles.statLabel}>Active Claims</Text>
              <Layers size={14} color="#3B82F6" />
            </View>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{active.length}</Text>
            <Text style={styles.statSubText}>Claimed task units</Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: '#8B5CF6' }]}>
            <View style={styles.statMetaRow}>
              <Text style={styles.statLabel}>Total Claims</Text>
              <Calendar size={14} color="#8B5CF6" />
            </View>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{allDonations?.length ?? 0}</Text>
            <Text style={styles.statSubText}>Lifetime assignments</Text>
          </View>
        </View>

        {/* Action Panel Buttons */}
        <View style={styles.actionPanel}>
          <TouchableOpacity
            id="btn-browse-donations"
            style={styles.actionBtnPrimary}
            onPress={() => navigate('BrowseDonations')}
          >
            <Search size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextPrimary}>Browse Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            id="btn-manage-requests"
            style={styles.actionBtnSecondary}
            onPress={() => navigate('NgoRequests')}
          >
            <List size={18} color="#22C55E" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextSecondary}>My Requests</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionPanel, { marginTop: -8 }]}>
          <TouchableOpacity
            id="btn-view-history"
            style={styles.actionBtnOutline}
            onPress={() => navigate('History')}
          >
            <History size={16} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextOutline}>All History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            id="btn-ngo-analytics"
            style={styles.actionBtnOutline}
            onPress={() => navigate('NgoNotifications')}
          >
            <Bell size={16} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnTextOutline}>Alert Center</Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Food Collected Mini Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TrendingUp size={14} color="#22C55E" style={{ marginRight: 6 }} />
              <Text style={styles.chartTitle}>Monthly Intake (Kg)</Text>
            </View>
            <Text style={styles.chartSubtitle}>Last 6 months</Text>
          </View>
          
          <View style={styles.chartBars}>
            {(MONTHLY_DATA ?? []).map((m, i) => {
              const heightPct = (m.kg / maxMonthly) * 80;
              const isLast = i === MONTHLY_DATA.length - 1;
              return (
                <View key={m.month} style={styles.barGroup}>
                  <Text style={[styles.barValue, { color: isLast ? '#22C55E' : '#64748B' }]}>
                    {m.kg}
                  </Text>
                  <View style={styles.barShell}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: isLast ? '#22C55E' : '#E2E8F0',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{m.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Active Claims Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Active Claims</Text>
            <Text style={styles.sectionSubtitle}>Donations claimed by you that are currently open</Text>
          </View>
          <TouchableOpacity onPress={fetchData} id="btn-refresh" style={styles.refreshBtnCircle}>
            <RefreshCw size={14} color="#64748B" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#22C55E" style={{ marginTop: 24 }} />
        ) : !claimedDonations || claimedDonations.length === 0 ? (
          <View style={styles.emptyCard}>
            <AlertCircle size={32} color="#94A3B8" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>Zero Active Claims</Text>
            <Text style={styles.emptyText}>
              Claim and receive food items by browsing the map and checking listings.
            </Text>
            <TouchableOpacity
              id="btn-empty-browse"
              style={styles.emptyActionBtn}
              onPress={() => navigate('BrowseDonations')}
            >
              <Text style={styles.emptyActionBtnText}>Browse Available</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={claimedDonations}
            keyExtractor={item => item?.id || item?._id}
            renderItem={renderClaimedItem}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Floating AI chatbot FAB */}
      <TouchableOpacity
        id="btn-floating-ai-chat"
        style={styles.floatingAiBtn}
        onPress={() => navigate('AIChat')}
      >
        <MessageSquare size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
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
  capacityCard: {
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
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  capacityTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  capacityValues: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#22C55E',
  },
  capacityBarShell: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginBottom: 8,
  },
  capacityBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  capacityDesc: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#FAFBFD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 16,
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
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: -0.5,
  },
  statSubText: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 3,
    fontWeight: '600',
  },
  actionPanel: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  actionBtnOutline: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FAFBFD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionBtnTextOutline: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 13,
  },
  chartCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  chartSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
    marginTop: 8,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barValue: {
    fontSize: 8.5,
    fontWeight: '800',
    marginBottom: 4,
  },
  barShell: {
    width: '45%',
    height: 60,
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 6,
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
  donationCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cardLeftBar: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cardDetails: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardAddress: {
    fontSize: 10.5,
    color: '#64748B',
    flex: 1,
  },
  volunteerLabel: {
    fontSize: 9.5,
    fontWeight: '800',
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
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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

export default NgoDashboard;
