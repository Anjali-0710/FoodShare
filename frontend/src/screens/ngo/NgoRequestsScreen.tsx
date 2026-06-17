import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, TextInput,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft, RefreshCw, Search, X, Clock3, CheckCircle2,
  Truck, Package, Star, ShieldAlert,
} from 'lucide-react-native';
import { RootState } from '../../store';
import { setMyDonations, setActiveDonation } from '../../store/ngoSlice';
import { DonationService } from '../../services/donationService';
import { AppTheme } from '../../theme/theme';

interface NgoRequestsScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

const ALL_STATUSES = ['All', 'Accepted', 'Assigned', 'Picked Up', 'Delivered', 'Completed', 'Cancelled'];

const MOCK_MY_DONATIONS = [
  { _id: 'c001', id: 'c001', foodType: 'Cooked Rice & Dal', quantity: 60, unit: 'Plates', status: 'Accepted', pickupAddress: '14 Koramangala, Bengaluru', donorName: 'Hotel Udupi Garden', donorPhone: '+91 98765 43210', volunteerName: null, freshnessScore: 88, createdAt: new Date(Date.now() - 3600000).toISOString(), acceptedAt: new Date(Date.now() - 2400000).toISOString() },
  { _id: 'c002', id: 'c002', foodType: 'Fresh Bread Loaves', quantity: 40, unit: 'Packets', status: 'Assigned', pickupAddress: '22 Jayanagar, Bengaluru', donorName: 'Modern Bakery', donorPhone: '+91 87654 32109', volunteerName: 'Rohan Sharma', freshnessScore: 76, createdAt: new Date(Date.now() - 7200000).toISOString(), acceptedAt: new Date(Date.now() - 6000000).toISOString() },
  { _id: 'c003', id: 'c003', foodType: 'Mixed Vegetables', quantity: 25, unit: 'Kg', status: 'Picked Up', pickupAddress: '8 HSR Layout, Bengaluru', donorName: 'Fresh Farms', donorPhone: '+91 76543 21098', volunteerName: 'Priya Nair', freshnessScore: 92, createdAt: new Date(Date.now() - 10800000).toISOString(), acceptedAt: new Date(Date.now() - 9600000).toISOString() },
  { _id: 'c004', id: 'c004', foodType: 'Packaged Dal & Rice', quantity: 50, unit: 'Packets', status: 'Completed', pickupAddress: '5 Whitefield, Bengaluru', donorName: 'BigBasket Warehouse', donorPhone: '+91 65432 10987', volunteerName: 'Suresh Kumar', freshnessScore: 97, createdAt: new Date(Date.now() - 86400000).toISOString(), acceptedAt: new Date(Date.now() - 82800000).toISOString() },
  { _id: 'c005', id: 'c005', foodType: 'Mango Juice Cartons', quantity: 100, unit: 'Packets', status: 'Completed', pickupAddress: '11 MG Road, Bengaluru', donorName: 'Juice Hub', donorPhone: '+91 54321 09876', volunteerName: 'Amit Desai', freshnessScore: 91, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), acceptedAt: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString() },
  { _id: 'c006', id: 'c006', foodType: 'Fresh Apples & Bananas', quantity: 20, unit: 'Kg', status: 'Delivered', pickupAddress: '9 Sadashivanagar, Bengaluru', donorName: 'City Mart', donorPhone: '+91 43210 98765', volunteerName: 'Priya Nair', freshnessScore: 85, createdAt: new Date(Date.now() - 3 * 3600000).toISOString(), acceptedAt: new Date(Date.now() - 2.5 * 3600000).toISOString() },
];

const getStatusColor = (status: string, theme: AppTheme) => {
  switch (status) {
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
  const size = 11;
  switch (status) {
    case 'Accepted': return <CheckCircle2 size={size} color={color} />;
    case 'Assigned': return <Truck size={size} color={color} />;
    case 'Picked Up': return <Package size={size} color={color} />;
    case 'Delivered': return <Truck size={size} color={color} />;
    case 'Completed': return <Star size={size} color={color} />;
    default: return <Clock3 size={size} color={color} />;
  }
};

const getCategoryEmoji = (foodType: string) => {
  if (foodType.toLowerCase().includes('rice') || foodType.toLowerCase().includes('dal') || foodType.toLowerCase().includes('biryani') || foodType.toLowerCase().includes('cooked')) return '🍛';
  if (foodType.toLowerCase().includes('bread') || foodType.toLowerCase().includes('bakery') || foodType.toLowerCase().includes('pastry')) return '🥐';
  if (foodType.toLowerCase().includes('vegetable') || foodType.toLowerCase().includes('tomato') || foodType.toLowerCase().includes('onion')) return '🥦';
  if (foodType.toLowerCase().includes('fruit') || foodType.toLowerCase().includes('apple') || foodType.toLowerCase().includes('mango')) return '🍎';
  if (foodType.toLowerCase().includes('juice') || foodType.toLowerCase().includes('beverage')) return '🧃';
  return '📦';
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const NgoRequestsScreen: React.FC<NgoRequestsScreenProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const myDonations = useSelector((state: RootState) => state.ngo.myDonations);

  const [loading, setLoading] = useState(myDonations.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMyDonations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = user?.id ? await DonationService.getNgoDonations(user.id) : [];
      dispatch(setMyDonations(data.length > 0 ? data : MOCK_MY_DONATIONS));
    } catch {
      if (myDonations.length === 0) dispatch(setMyDonations(MOCK_MY_DONATIONS));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, myDonations.length]);

  useEffect(() => {
    fetchMyDonations();
  }, []);

  const handleItemPress = (item: any) => {
    dispatch(setActiveDonation(item));
    navigate('NgoDonationDetail');
  };

  const displayDonations = myDonations.length > 0 ? myDonations : MOCK_MY_DONATIONS;

  const filtered = displayDonations.filter(d => {
    const matchStatus = selectedStatus === 'All' || d.status === selectedStatus;
    const matchSearch = !searchQuery || d.foodType.toLowerCase().includes(searchQuery.toLowerCase()) || (d.donorName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Group stats
  const stats = ALL_STATUSES.slice(1).reduce((acc, s) => {
    acc[s] = displayDonations.filter(d => d.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const renderItem = ({ item }: { item: any }) => {
    const statusColor = getStatusColor(item.status, theme);
    return (
      <TouchableOpacity
        id={`req-card-${item.id || item._id}`}
        style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.85}
      >
        <View style={[styles.cardLeftBar, { backgroundColor: statusColor }]} />
        <View style={styles.cardBody}>
          {/* Top */}
          <View style={styles.cardTop}>
            <Text style={[styles.foodEmoji]}>{getCategoryEmoji(item.foodType)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.foodType, { color: theme.colors.text }]} numberOfLines={1}>
                {item.foodType}
              </Text>
              <Text style={[styles.donorName, { color: theme.colors.textSecondary }]}>
                from {item.donorName || 'Local Donor'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '1F' }]}>
              {getStatusIcon(item.status, theme)}
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>

          {/* Meta Row */}
          <View style={styles.metaRow}>
            <View style={[styles.metaPill, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.metaPillText, { color: theme.colors.text }]}>
                📦 {item.quantity} {item.unit}
              </Text>
            </View>
            {item.volunteerName ? (
              <View style={[styles.metaPill, { backgroundColor: '#8B5CF6' + '18' }]}>
                <Text style={[styles.metaPillText, { color: '#8B5CF6' }]}>
                  🚴 {item.volunteerName}
                </Text>
              </View>
            ) : (
              <View style={[styles.metaPill, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.metaPillText, { color: theme.colors.textSecondary }]}>
                  ⏳ Awaiting volunteer
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={[styles.addressText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              📍 {item.pickupAddress}
            </Text>
            <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
              {formatDate(item.acceptedAt || item.createdAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-requests-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Requests</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {filtered.length} of {displayDonations.length} records
          </Text>
        </View>
        <TouchableOpacity
          id="btn-requests-refresh"
          style={[styles.refreshBtn, { backgroundColor: theme.colors.card }]}
          onPress={() => fetchMyDonations(true)}
        >
          <RefreshCw size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}
        contentContainerStyle={styles.statsContent}>
        {['Accepted', 'Assigned', 'Picked Up', 'Completed'].map(s => {
          const color = getStatusColor(s, theme);
          return (
            <TouchableOpacity
              key={s}
              id={`stat-btn-${s.replace(/\s/g, '')}`}
              style={[styles.statPill, { backgroundColor: color + '18', borderColor: color + '44' }]}
              onPress={() => setSelectedStatus(selectedStatus === s ? 'All' : s)}
            >
              {getStatusIcon(s, theme)}
              <Text style={[styles.statPillCount, { color }]}>{stats[s] || 0}</Text>
              <Text style={[styles.statPillLabel, { color }]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Search size={14} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            id="input-requests-search"
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search food or donor..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} id="btn-clear-req-search">
              <X size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}
        contentContainerStyle={styles.tabContent}>
        {ALL_STATUSES.map(s => {
          const active = selectedStatus === s;
          const color = s === 'All' ? theme.colors.primary : getStatusColor(s, theme);
          return (
            <TouchableOpacity
              key={s}
              id={`tab-${s.replace(/\s/g, '')}`}
              style={[styles.tab, {
                backgroundColor: active ? color + '22' : 'transparent',
                borderColor: active ? color : theme.colors.border,
              }]}
              onPress={() => setSelectedStatus(s)}
            >
              <Text style={[styles.tabText, { color: active ? color : theme.colors.textSecondary }]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading requests...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <ShieldAlert size={40} color={theme.colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Requests Found</Text>
          <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
            {selectedStatus !== 'All' ? `No ${selectedStatus} donations.` : 'Accept donations from the browse screen.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id || item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={() => fetchMyDonations(true)}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 40, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginRight: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  headerSubtitle: { fontSize: 10, marginTop: 2, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  refreshBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statsScroll: { maxHeight: 60 },
  statsContent: { paddingHorizontal: 14, gap: 8, paddingVertical: 10 },
  statPill: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10,
    borderRadius: 20, borderWidth: 1, gap: 5,
  },
  statPillCount: { fontSize: 13, fontWeight: '800', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  statPillLabel: { fontSize: 10, fontWeight: '600', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  searchRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', height: 44,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  tabBar: { maxHeight: 46 },
  tabContent: { paddingHorizontal: 14, gap: 6, paddingBottom: 6 },
  tab: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 11, fontWeight: '700', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { fontSize: 12, marginTop: 12, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  emptyDesc: { fontSize: 12, textAlign: 'center', lineHeight: 18, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  list: { padding: 16, paddingBottom: 30 },
  card: {
    flexDirection: 'row', borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: 'hidden',
    elevation: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10,
  },
  cardLeftBar: { width: 4 },
  cardBody: { flex: 1, padding: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  foodEmoji: { fontSize: 20 },
  foodType: { fontSize: 13, fontWeight: '700', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  donorName: { fontSize: 11, marginTop: 1, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 3,
    paddingHorizontal: 7, borderRadius: 20, gap: 4,
  },
  statusText: { fontSize: 9, fontWeight: '700', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  metaPill: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8 },
  metaPillText: { fontSize: 10, fontWeight: '600', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addressText: { fontSize: 10, flex: 1, marginRight: 8, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  dateText: { fontSize: 9, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
});

export default NgoRequestsScreen;
