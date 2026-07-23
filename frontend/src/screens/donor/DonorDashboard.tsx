import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  PlusCircle,
  History,
  LogOut,
  RefreshCw,
  Sun,
  Moon,
  ArrowRight,
  ShieldAlert,
  List,
  UserCircle,
  TrendingUp,
  Heart,
  Calendar,
  Layers,
  MapPin,
  Sparkles
} from 'lucide-react-native';
import { RootState } from '../../store';
import { logout, toggleTheme } from '../../store/authSlice';
import { DonationService } from '../../services/donationService';
import { AuthService } from '../../services/authService';
import { AppTheme } from '../../theme/theme';

interface DonorDashboardProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

export const DonorDashboard: React.FC<DonorDashboardProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);
  
  const [activeDonations, setActiveDonations] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalDonations: 0, foodSavedKg: 0, activeCount: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const donations = await DonationService.getDonations({ donorId: user.id });
      const active = (donations ?? []).filter((d: any) =>
        ['Pending', 'Accepted', 'Assigned', 'Picked Up', 'Delivered'].includes(d.status)
      );
      setActiveDonations(active);
      const completed = (donations ?? []).filter((d: any) => d.status === 'Completed' || d.status === 'Delivered');
      const savedKg = (completed ?? []).reduce((sum: number, d: any) => {
        let factor = 0.4;
        if (d?.unit === 'Plates') factor = 0.4;
        else if (d?.unit === 'Packets') factor = 0.3;
        else if (d?.unit === 'Kg') factor = 1.0;
        return sum + ((d?.quantity ?? 0) * factor);
      }, 0);
      setStats({
        totalDonations: donations?.length ?? 0,
        foodSavedKg: Math.round(savedKg * 10) / 10,
        activeCount: active?.length ?? 0
      });
    } catch (error) {
      console.error('Failed to load donations:', error);
      setActiveDonations([]);
      setStats({ totalDonations: 0, foodSavedKg: 0, activeCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await AuthService.logout();
    dispatch(logout());
    navigate('Login');
  };

  const getInitials = (name: string) => {
    if (!name) return 'D';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderActiveItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.donationCard, { borderColor: theme.colors.border }]}
      onPress={() => {
        navigate('TrackDonation');
      }}
      id={`card-donation-${item?.id || item?._id}`}
    >
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.foodAvatarCircle}>
            <Text style={styles.foodAvatarText}>{(item?.foodType ?? 'Food').charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.cardTitle}>{item?.foodType ?? 'Food Listing'}</Text>
            <Text style={styles.cardSubtitle}>
              Qty: {item?.quantity ?? 0} {item?.unit ?? ''} • Freshness: {item?.freshnessScore ?? 85}%
            </Text>
          </View>
        </View>

        <View style={styles.statusBadgeGreen}>
          <Text style={styles.statusBadgeText}>{item?.status ?? 'Pending'}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View style={styles.addressRow}>
          <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.cardAddress} numberOfLines={1}>
            {item?.pickupAddress ?? item?.address ?? ''}
          </Text>
        </View>
        <ArrowRight size={14} color="#22C55E" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* SaaS Glassmorphism Header */}
      <View style={styles.navBar}>
        <View style={styles.headerUserSection}>
          <View style={styles.avatarHeader}>
            <Text style={styles.avatarHeaderText}>{getInitials(user?.name || 'Donor')}</Text>
          </View>
          <View>
            <Text style={styles.welcomeText}>Hello, Partner Donor</Text>
            <Text style={styles.nameText} numberOfLines={1}>
              {user?.name || 'Food Donor'}
            </Text>
          </View>
        </View>
        
        <View style={styles.rightActions}>
          <TouchableOpacity
            id="btn-profile-nav"
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
        {/* Welcome Dashboard Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroLeft}>
            <Sparkles size={20} color="#FFFFFF" style={{ marginBottom: 6 }} />
            <Text style={styles.heroTitle}>Impact Tracker</Text>
            <Text style={styles.heroDesc}>Your donations help build a zero-waste, zero-hunger neighborhood.</Text>
          </View>
          <View style={styles.heroIconBox}>
            <Heart size={44} color="#FFFFFF" style={{ opacity: 0.85 }} />
          </View>
        </View>

        {/* Premium Gradient Metric Cards Row */}
        <View style={styles.statsRow}>
          
          <View style={[styles.statBox, { borderLeftColor: '#22C55E' }]}>
            <View style={styles.statMetaRow}>
              <Text style={styles.statLabel}>Food Saved</Text>
              <TrendingUp size={14} color="#22C55E" />
            </View>
            <Text style={styles.statValue}>{stats.foodSavedKg} Kg</Text>
            <Text style={styles.statSubText}>Environmental saved</Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: '#3B82F6' }]}>
            <View style={styles.statMetaRow}>
              <Text style={styles.statLabel}>Active Listings</Text>
              <Layers size={14} color="#3B82F6" />
            </View>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.activeCount}</Text>
            <Text style={styles.statSubText}>Awaiting pickup</Text>
          </View>

          <View style={[styles.statBox, { borderLeftColor: '#8B5CF6' }]}>
            <View style={styles.statMetaRow}>
              <Text style={styles.statLabel}>Total Contributions</Text>
              <Calendar size={14} color="#8B5CF6" />
            </View>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{stats.totalDonations}</Text>
            <Text style={styles.statSubText}>All time total posts</Text>
          </View>

        </View>

        {/* Premium Quick Action Buttons Panel */}
        <View style={styles.actionPanel}>
          <TouchableOpacity 
            id="btn-create-donation"
            style={styles.actionBtnPrimary}
            onPress={() => navigate('CreateDonation')}
          >
            <PlusCircle size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnTextPrimary}>New Donation</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            id="btn-view-history"
            style={styles.actionBtnSecondary}
            onPress={() => navigate('History')}
          >
            <History size={18} color="#22C55E" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnTextSecondary}>History Logs</Text>
          </TouchableOpacity>
        </View>

        {/* Second Quick Action Row */}
        <View style={[styles.actionPanel, { marginTop: -8 }]}>
          <TouchableOpacity
            id="btn-view-all-donations"
            style={styles.actionBtnOutline}
            onPress={() => navigate('DonationList')}
          >
            <List size={16} color="#64748B" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnTextOutline}>All Listings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            id="btn-track-donation"
            style={styles.actionBtnOutline}
            onPress={() => navigate('TrackDonation')}
          >
            <ArrowRight size={16} color="#64748B" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnTextOutline}>Track Deliveries</Text>
          </TouchableOpacity>
        </View>

        {/* Active Listings Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Active Orders</Text>
            <Text style={styles.sectionSubtitle}>Listings currently in transit or awaiting matches</Text>
          </View>
          <TouchableOpacity onPress={fetchData} id="btn-refresh" style={styles.refreshBtnCircle}>
            <RefreshCw size={14} color="#64748B" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#22C55E" style={{ marginTop: 24 }} />
        ) : !activeDonations || activeDonations.length === 0 ? (
          <View style={styles.emptyCard}>
            <ShieldAlert size={32} color="#94A3B8" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>Zero Active Listings</Text>
            <Text style={styles.emptyText}>
              Any food items or dry groceries you list will show up here. Let's create one now!
            </Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={() => navigate('CreateDonation')}>
              <Text style={styles.emptyActionBtnText}>Create Post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={activeDonations}
            keyExtractor={(item) => item?.id || item?._id}
            renderItem={renderActiveItem}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
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
  },
  foodAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#22C55E',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadgeGreen: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  cardAddress: {
    fontSize: 11,
    color: '#64748B',
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

export default DonorDashboard;
