import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { PlusCircle, History, LogOut, RefreshCw, Sun, Moon, ArrowRight, ShieldAlert, List, UserCircle, MapPin, Camera } from 'lucide-react-native';
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
      const active = donations.filter((d: any) =>
        ['Pending', 'Accepted', 'Assigned', 'Picked Up', 'Delivered'].includes(d.status)
      );
      setActiveDonations(active);
      const completed = donations.filter((d: any) => d.status === 'Completed' || d.status === 'Delivered');
      const savedKg = completed.reduce((sum: number, d: any) => {
        let factor = 1;
        if (d.unit === 'Plates') factor = 0.4;
        else if (d.unit === 'Packets') factor = 0.3;
        return sum + (d.quantity * factor);
      }, 0);
      setStats({ totalDonations: donations.length, foodSavedKg: Math.round(savedKg * 10) / 10, activeCount: active.length });
    } catch (error) {
      console.error('Failed to load donations:', error);
      // Show empty state on error — no more mock data
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

  const renderActiveItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.donationCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={() => {
        // Set active donation in some state if needed or redirect to Track
        navigate('TrackDonation');
      }}
      id={`card-donation-${item.id || item._id}`}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.foodType}</Text>
        <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary + '1F' }]}>
          <Text style={[styles.statusText, { color: theme.colors.primary }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={[styles.cardDetails, { color: theme.colors.textSecondary }]}>
        Qty: {item.quantity} {item.unit} • AI Freshness: {item.freshnessScore}%
      </Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.cardAddress, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          📍 {item.pickupAddress}
        </Text>
        <ArrowRight size={14} color={theme.colors.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <View>
          <Text style={[styles.welcomeText, { color: theme.colors.textSecondary }]}>Hello, Donor</Text>
          <Text style={[styles.nameText, { color: theme.colors.text }]} numberOfLines={1}>
            {user?.name}
          </Text>
        </View>
        
        <View style={styles.rightActions}>
          <TouchableOpacity
            id="btn-profile-nav"
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

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stat Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{stats.foodSavedKg}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Food Saved (Kg)</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.statValue, { color: theme.colors.accent }]}>{stats.activeCount}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Active Offers</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.totalDonations}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Donations</Text>
          </View>
        </View>

        {/* Action Panel */}
        <View style={styles.actionPanel}>
          <TouchableOpacity 
            id="btn-create-donation"
            style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigate('CreateDonation')}
          >
            <PlusCircle size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>New Donation</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            id="btn-view-history"
            style={[styles.actionBtn, { backgroundColor: theme.colors.accent }]}
            onPress={() => navigate('History')}
          >
            <History size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Second Action Row */}
        <View style={[styles.actionPanel, { marginTop: -12 }]}>
          <TouchableOpacity
            id="btn-view-all-donations"
            style={[styles.actionBtn, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={() => navigate('DonationList')}
          >
            <List size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>All Donations</Text>
          </TouchableOpacity>

          <TouchableOpacity
            id="btn-track-donation"
            style={[styles.actionBtn, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={() => navigate('TrackDonation')}
          >
            <ArrowRight size={18} color={theme.colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>Track Active</Text>
          </TouchableOpacity>
        </View>

        {/* Third Action Row for Playgrounds */}
        <View style={[styles.actionPanel, { marginTop: -12 }]}>
          <TouchableOpacity
            id="btn-nav-maps-playground"
            style={[styles.actionBtn, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={() => navigate('MapsPlayground')}
          >
            <MapPin size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>Maps & Route</Text>
          </TouchableOpacity>

          <TouchableOpacity
            id="btn-nav-image-playground"
            style={[styles.actionBtn, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={() => navigate('ImageUploadPlayground')}
          >
            <Camera size={18} color={theme.colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>Food Photos</Text>
          </TouchableOpacity>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Active Listings</Text>
          <TouchableOpacity onPress={fetchData} id="btn-refresh">
            <RefreshCw size={14} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : activeDonations.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <ShieldAlert size={28} color={theme.colors.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No active food listings. Create a new listing above!
            </Text>
          </View>
        ) : (
          <FlatList
            data={activeDonations}
            keyExtractor={(item) => item.id || item._id}
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
    gap: 10
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
  content: {
    padding: 20
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1
  },
  statValue: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  statLabel: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 10,
    marginTop: 6,
    fontWeight: '700',
    textAlign: 'center'
  },
  actionPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12
  },
  actionBtn: {
    flex: 1,
    height: 48,
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
    fontSize: 14
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8
  },
  sectionTitle: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  donationCard: {
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
    marginBottom: 8
  },
  cardTitle: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 14.5,
    fontWeight: '700'
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12
  },
  statusText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 10,
    fontWeight: '800'
  },
  cardDetails: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 12,
    marginBottom: 12
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardAddress: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 11,
    maxWidth: '85%'
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
export default DonorDashboard;
