import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft,
  Search,
  Filter,
  X,
  ArrowRight,
  ShieldAlert,
  RefreshCw,
  PackageCheck,
  Clock3,
  Truck,
  CheckCircle2,
  XCircle,
  Package,
} from 'lucide-react-native';
import { RootState } from '../../store';
import { setDonations, setActiveItem } from '../../store/donationSlice';
import { DonationService } from '../../services/donationService';
import { AppTheme } from '../../theme/theme';

interface DonationListScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

const ALL_STATUSES = ['All', 'Pending', 'Accepted', 'Assigned', 'Picked Up', 'Delivered', 'Completed', 'Cancelled'];
const ALL_CATEGORIES = ['All', 'Cooked Food', 'Vegetables', 'Fruits', 'Bakery Items', 'Beverages', 'Grocery Items'];

const MOCK_LIST = [
  { _id: 'don_1', id: 'don_1', foodType: 'Cooked Food', quantity: 50, unit: 'Plates', status: 'Pending', pickupAddress: 'Connaught Place, New Delhi', freshnessScore: 82, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { _id: 'don_2', id: 'don_2', foodType: 'Fruits', quantity: 15, unit: 'Kg', status: 'Assigned', pickupAddress: 'Block E, Connaught Place, New Delhi', freshnessScore: 90, createdAt: new Date(Date.now() - 4 * 3600000).toISOString() },
  { _id: 'don_hist_1', id: 'don_hist_1', foodType: 'Cooked Food', quantity: 120, unit: 'Plates', status: 'Completed', pickupAddress: 'Connaught Place, New Delhi', freshnessScore: 75, createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  { _id: 'don_hist_2', id: 'don_hist_2', foodType: 'Grocery Items', quantity: 40, unit: 'Kg', status: 'Completed', pickupAddress: 'Connaught Place, New Delhi', freshnessScore: 100, createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
  { _id: 'don_hist_3', id: 'don_hist_3', foodType: 'Bakery Items', quantity: 30, unit: 'Packets', status: 'Completed', pickupAddress: 'Connaught Place, New Delhi', freshnessScore: 88, createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
  { _id: 'don_hist_4', id: 'don_hist_4', foodType: 'Vegetables', quantity: 25, unit: 'Kg', status: 'Completed', pickupAddress: 'Connaught Place, New Delhi', freshnessScore: 92, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
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
  const size = 10;
  switch (status) {
    case 'Pending': return <Clock3 size={size} color={color} />;
    case 'Accepted': return <PackageCheck size={size} color={color} />;
    case 'Assigned': return <Truck size={size} color={color} />;
    case 'Picked Up': return <Package size={size} color={color} />;
    case 'Delivered': return <Truck size={size} color={color} />;
    case 'Completed': return <CheckCircle2 size={size} color={color} />;
    case 'Cancelled': return <XCircle size={size} color={color} />;
    default: return null;
  }
};

const getCategoryEmoji = (category: string) => {
  switch (category) {
    case 'Cooked Food': return '🍛';
    case 'Vegetables': return '🥦';
    case 'Fruits': return '🍎';
    case 'Bakery Items': return '🥐';
    case 'Beverages': return '🧃';
    case 'Grocery Items': return '🛒';
    default: return '🍽️';
  }
};

const getFreshnessColor = (score: number, theme: AppTheme) => {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.error;
};

export const DonationListScreen: React.FC<DonationListScreenProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const donations = useSelector((state: RootState) => state.donation.items);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const fetchDonations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = user?.id
        ? await DonationService.getDonations({ donorId: user.id })
        : [];
      dispatch(setDonations(data as any));
    } catch {
      dispatch(setDonations(MOCK_LIST as any));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDonations();
  }, []);

  const filtered = donations.filter((d) => {
    const matchSearch = !searchQuery || d.foodType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = selectedStatus === 'All' || d.status === selectedStatus;
    const matchCategory = selectedCategory === 'All' || d.foodType === selectedCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  const activeFilterCount = (selectedStatus !== 'All' ? 1 : 0) + (selectedCategory !== 'All' ? 1 : 0);

  const handleDonationPress = (item: any) => {
    dispatch(setActiveItem(item));
    navigate('DonationDetail');
  };

  const clearFilters = () => {
    setSelectedStatus('All');
    setSelectedCategory('All');
    setSearchQuery('');
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusColor = getStatusColor(item.status, theme);
    const freshnessColor = getFreshnessColor(item.freshnessScore || 80, theme);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => handleDonationPress(item)}
        id={`card-donation-${item.id || item._id}`}
        activeOpacity={0.85}
      >
        {/* Left freshness indicator bar */}
        <View style={[styles.freshnessBar, { backgroundColor: freshnessColor }]} />

        <View style={styles.cardBody}>
          {/* Top row */}
          <View style={styles.cardTop}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.foodType)}</Text>
              <Text style={[styles.foodTypeText, { color: theme.colors.text }]} numberOfLines={1}>
                {item.foodType}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '1F' }]}>
              {getStatusIcon(item.status, theme)}
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>

          {/* Middle row */}
          <View style={styles.cardMiddle}>
            <Text style={[styles.quantityText, { color: theme.colors.textSecondary }]}>
              {item.quantity} {item.unit}
            </Text>
            <View style={styles.freshnessRow}>
              <View style={[styles.freshnessIndicator, { backgroundColor: freshnessColor + '2A' }]}>
                <Text style={[styles.freshnessLabel, { color: freshnessColor }]}>
                  AI: {item.freshnessScore || '—'}%
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom row */}
          <View style={styles.cardBottom}>
            <Text style={[styles.addressText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              📍 {item.pickupAddress}
            </Text>
            <View style={styles.rowRight}>
              <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
              <ArrowRight size={14} color={theme.colors.primary} style={{ marginLeft: 6 }} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-list-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Donations</Text>
          {!loading && (
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {filtered.length} of {donations.length} records
            </Text>
          )}
        </View>
        <TouchableOpacity
          id="btn-list-refresh"
          style={[styles.refreshBtn, { backgroundColor: theme.colors.card }]}
          onPress={() => fetchDonations(true)}
        >
          <RefreshCw size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search + Filter Row */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Search size={14} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            id="input-list-search"
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search by food name..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} id="btn-clear-search">
              <X size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          id="btn-toggle-filters"
          style={[
            styles.filterBtn,
            { backgroundColor: showFilters ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border },
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} color={showFilters ? '#FFFFFF' : theme.colors.text} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterCountBadge, { backgroundColor: theme.colors.error }]}>
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Expandable Filter Panel */}
      {showFilters && (
        <View style={[styles.filterPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.filterPanelHeader}>
            <Text style={[styles.filterPanelTitle, { color: theme.colors.text }]}>Filter Donations</Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearFilters} id="btn-clear-filters">
                <Text style={[styles.clearText, { color: theme.colors.error }]}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.filterSectionLabel, { color: theme.colors.textSecondary }]}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={styles.chipRow}>
              {ALL_STATUSES.map((s) => {
                const isActive = selectedStatus === s;
                const color = s === 'All' ? theme.colors.primary : getStatusColor(s, theme);
                return (
                  <TouchableOpacity
                    key={s}
                    id={`chip-status-${s}`}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isActive ? color : 'transparent',
                        borderColor: isActive ? color : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedStatus(s)}
                  >
                    <Text style={[styles.chipText, { color: isActive ? '#FFFFFF' : theme.colors.textSecondary }]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <Text style={[styles.filterSectionLabel, { color: theme.colors.textSecondary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {ALL_CATEGORIES.map((c) => {
                const isActive = selectedCategory === c;
                return (
                  <TouchableOpacity
                    key={c}
                    id={`chip-cat-${c.replace(' ', '')}`}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isActive ? theme.colors.accent : 'transparent',
                        borderColor: isActive ? theme.colors.accent : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(c)}
                  >
                    <Text style={[styles.chipText, { color: isActive ? '#FFFFFF' : theme.colors.textSecondary }]}>
                      {c === 'All' ? '🌐 All' : `${getCategoryEmoji(c)} ${c}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Status Tab Quick Filters (always visible) */}
      {!showFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFilterBar}>
          <View style={styles.chipRow}>
            {ALL_STATUSES.map((s) => {
              const isActive = selectedStatus === s;
              const color = s === 'All' ? theme.colors.primary : getStatusColor(s, theme);
              return (
                <TouchableOpacity
                  key={s}
                  id={`qchip-status-${s}`}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: isActive ? color + '22' : 'transparent',
                      borderColor: isActive ? color : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedStatus(s)}
                >
                  <Text style={[styles.quickChipText, { color: isActive ? color : theme.colors.textSecondary }]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* List / States */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading donations...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <ShieldAlert size={40} color={theme.colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Donations Found</Text>
          <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
            {searchQuery || activeFilterCount > 0
              ? 'Try adjusting your search or filters.'
              : 'Create your first donation to get started!'}
          </Text>
          {(searchQuery || activeFilterCount > 0) && (
            <TouchableOpacity
              id="btn-empty-clear"
              style={[styles.clearBtn, { borderColor: theme.colors.primary }]}
              onPress={clearFilters}
            >
              <Text style={[styles.clearBtnText, { color: theme.colors.primary }]}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id || (item as any)._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={() => fetchDonations(true)}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginRight: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', fontFamily: 'System' },
  headerSubtitle: { fontSize: 10, marginTop: 2, fontWeight: '500', fontFamily: 'System' },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: 'System' },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  filterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { color: '#FFFFFF', fontSize: 8, fontWeight: '700', fontFamily: 'System' },
  filterPanel: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterPanelTitle: { fontSize: 13, fontWeight: '700', fontFamily: 'System' },
  clearText: { fontSize: 12, fontWeight: '600', fontFamily: 'System' },
  filterSectionLabel: { fontSize: 10, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5, fontFamily: 'System' },
  chipRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 2 },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: '600', fontFamily: 'System' },
  quickFilterBar: { paddingHorizontal: 14, marginBottom: 2 },
  quickChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 10,
  },
  quickChipText: { fontSize: 11, fontWeight: '700', fontFamily: 'System' },
  list: { padding: 16, paddingTop: 8 },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  freshnessBar: { width: 4 },
  cardBody: { flex: 1, padding: 12 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryEmoji: { fontSize: 16, marginRight: 6 },
  foodTypeText: { fontSize: 13, fontWeight: '700', flex: 1, fontFamily: 'System' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 20,
    gap: 4,
  },
  statusText: { fontSize: 9, fontWeight: '700', fontFamily: 'System' },
  cardMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quantityText: { fontSize: 12, fontWeight: '500', fontFamily: 'System' },
  freshnessRow: { flexDirection: 'row', alignItems: 'center' },
  freshnessIndicator: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  freshnessLabel: { fontSize: 9, fontWeight: '700', fontFamily: 'System' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addressText: { fontSize: 10, flex: 1, fontFamily: 'System' },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 9, fontFamily: 'System' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { fontSize: 12, marginTop: 12, fontFamily: 'System' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, fontFamily: 'System' },
  emptyDesc: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 20, fontFamily: 'System' },
  clearBtn: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  clearBtnText: { fontSize: 12, fontWeight: '700', fontFamily: 'System' },
});

export default DonationListScreen;
