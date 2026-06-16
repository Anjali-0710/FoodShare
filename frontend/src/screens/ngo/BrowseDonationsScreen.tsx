import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft, Search, RefreshCw, X, Filter, Compass,
  Check, XCircle, MessageSquare, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { RootState } from '../../store';
import { setActiveDonation, addNotification } from '../../store/ngoSlice';
import { apiCall } from '../../services/api';
import { AppTheme } from '../../theme/theme';

interface BrowseDonationsScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

const CATEGORIES = ['All', 'Cooked Food', 'Vegetables', 'Fruits', 'Bakery Items', 'Beverages', 'Grocery Items'];

const MOCK_BROWSE = [
  { _id: 'b001', id: 'b001', foodType: 'Cooked Biryani', quantity: 80, unit: 'Plates', status: 'Pending', pickupAddress: '14 Koramangala, Bengaluru', freshnessScore: 94, category: 'Cooked Food', donorName: 'Spice Garden Restaurant', donorPhone: '+91 98765 43210', bestBeforeDate: new Date(Date.now() + 3 * 3600000).toISOString(), additionalNotes: 'Hot and freshly prepared. Handle with care.', createdAt: new Date(Date.now() - 1800000).toISOString() },
  { _id: 'b002', id: 'b002', foodType: 'Fresh Tomatoes & Onions', quantity: 35, unit: 'Kg', status: 'Pending', pickupAddress: '7 KR Market, Bengaluru', freshnessScore: 88, category: 'Vegetables', donorName: 'Fresh Farms Outlet', donorPhone: '+91 87654 32109', bestBeforeDate: new Date(Date.now() + 6 * 3600000).toISOString(), additionalNotes: '', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { _id: 'b003', id: 'b003', foodType: 'Assorted Pastries', quantity: 60, unit: 'Packets', status: 'Pending', pickupAddress: '22 Indiranagar, Bengaluru', freshnessScore: 79, category: 'Bakery Items', donorName: 'Corner Bakery', donorPhone: '+91 76543 21098', bestBeforeDate: new Date(Date.now() + 2 * 3600000).toISOString(), additionalNotes: 'Contains gluten. Assorted flavors.', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { _id: 'b004', id: 'b004', foodType: 'Packaged Dal & Rice Kits', quantity: 50, unit: 'Packets', status: 'Pending', pickupAddress: '5 Whitefield, Bengaluru', freshnessScore: 97, category: 'Grocery Items', donorName: 'BigBasket Warehouse', donorPhone: '+91 65432 10987', bestBeforeDate: new Date(Date.now() + 24 * 3600000).toISOString(), additionalNotes: 'Sealed packets, 6 months shelf life.', createdAt: new Date(Date.now() - 5400000).toISOString() },
  { _id: 'b005', id: 'b005', foodType: 'Mango Juice Cartons', quantity: 100, unit: 'Packets', status: 'Pending', pickupAddress: '11 MG Road, Bengaluru', freshnessScore: 91, category: 'Beverages', donorName: 'Juice Hub', donorPhone: '+91 54321 09876', bestBeforeDate: new Date(Date.now() + 12 * 3600000).toISOString(), additionalNotes: '200ml Tetrapaks.', createdAt: new Date(Date.now() - 900000).toISOString() },
  { _id: 'b006', id: 'b006', foodType: 'Fresh Apples & Bananas', quantity: 20, unit: 'Kg', status: 'Pending', pickupAddress: '9 Sadashivanagar, Bengaluru', freshnessScore: 85, category: 'Fruits', donorName: 'City Mart', donorPhone: '+91 43210 98765', bestBeforeDate: new Date(Date.now() + 48 * 3600000).toISOString(), additionalNotes: '', createdAt: new Date(Date.now() - 4500000).toISOString() },
];

const getCategoryEmoji = (cat: string) => {
  const m: Record<string, string> = {
    'Cooked Food': '🍛', 'Vegetables': '🥦', 'Fruits': '🍎',
    'Bakery Items': '🥐', 'Beverages': '🧃', 'Grocery Items': '🛒',
  };
  return m[cat] || '🍽️';
};

const getFreshnessColor = (score: number, theme: AppTheme) =>
  score >= 75 ? theme.colors.success : score >= 50 ? theme.colors.warning : theme.colors.error;

const formatExpiry = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (isNaN(diff) || diff < 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const BrowseDonationsScreen: React.FC<BrowseDonationsScreenProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { token } = useSelector((state: RootState) => state.auth);

  const [donations, setDonations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Accept/Reject modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalItem, setModalItem] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'accept' | 'reject'>('accept');
  const [ngoNotes, setNgoNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const REJECT_REASONS = [
    'Capacity full',
    'Too far from NGO location',
    'Food type not needed',
    'Expiry too soon',
    'Other',
  ];

  const fetchAvailableDonations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiCall('/donations?status=Pending', { token });
      if (response.success) setDonations(response.donations);
      else setDonations(MOCK_BROWSE);
    } catch {
      setDonations(MOCK_BROWSE);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAvailableDonations();
  }, []);

  const openModal = (item: any, mode: 'accept' | 'reject') => {
    setModalItem(item);
    setModalMode(mode);
    setNgoNotes('');
    setRejectReason(REJECT_REASONS[0]);
    setModalVisible(true);
  };

  const handleAccept = async () => {
    if (!modalItem) return;
    const id = modalItem._id || modalItem.id;
    setModalVisible(false);
    setActionLoadingId(id);
    try {
      const response = await apiCall(`/donations/${id}/accept`, { method: 'PUT', token, body: { notes: ngoNotes } });
      if (response.success) {
        setDonations(prev => prev.filter(d => d._id !== id && d.id !== id));
      } else {
        // Optimistic removal for offline mode
        setDonations(prev => prev.filter(d => d._id !== id && d.id !== id));
      }
      dispatch(addNotification({
        id: `notif_accept_${id}`,
        type: 'accepted',
        title: 'Donation Accepted',
        message: `You accepted ${modalItem.quantity} ${modalItem.unit} of ${modalItem.foodType} from ${modalItem.donorName || 'a donor'}.`,
        donationId: id,
        timestamp: new Date().toISOString(),
        read: false,
      }));
    } catch {
      setDonations(prev => prev.filter(d => d._id !== id && d.id !== id));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async () => {
    if (!modalItem) return;
    const id = modalItem._id || modalItem.id;
    setModalVisible(false);
    setActionLoadingId(id);
    try {
      await apiCall(`/donations/${id}/reject`, { method: 'PUT', token, body: { reason: rejectReason } });
    } catch {
      // silent fail
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCardPress = (item: any) => {
    dispatch(setActiveDonation(item));
    navigate('NgoDonationDetail');
  };

  const filtered = donations.filter(d => {
    const matchSearch = !searchQuery || d.foodType.toLowerCase().includes(searchQuery.toLowerCase()) || (d.donorName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'All' || d.foodType === selectedCategory || d.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const renderItem = ({ item }: { item: any }) => {
    const freshnessColor = getFreshnessColor(item.freshnessScore || 80, theme);
    const isLoading = actionLoadingId === (item._id || item.id);
    const expiryStr = item.bestBeforeDate ? formatExpiry(item.bestBeforeDate) : 'N/A';
    const expiryUrgent = item.bestBeforeDate && (new Date(item.bestBeforeDate).getTime() - Date.now() < 3 * 3600000);

    return (
      <TouchableOpacity
        id={`card-browse-${item.id || item._id}`}
        style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.85}
      >
        {/* Left freshness bar */}
        <View style={[styles.freshnessBar, { backgroundColor: freshnessColor }]} />
        <View style={styles.cardBody}>
          {/* Header */}
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.foodType, { color: theme.colors.text }]} numberOfLines={1}>
                {getCategoryEmoji(item.category || item.foodType)} {item.foodType}
              </Text>
              <Text style={[styles.donorName, { color: theme.colors.textSecondary }]}>
                by {item.donorName || 'Local Donor'}
              </Text>
            </View>
            <View style={[styles.freshnessBadge, { backgroundColor: freshnessColor + '18' }]}>
              <Text style={[styles.freshnessText, { color: freshnessColor }]}>
                AI {item.freshnessScore}%
              </Text>
            </View>
          </View>

          {/* Qty & Expiry row */}
          <View style={styles.infoRow}>
            <View style={[styles.infoPill, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.infoPillText, { color: theme.colors.text }]}>
                📦 {item.quantity} {item.unit}
              </Text>
            </View>
            <View style={[styles.infoPill, { backgroundColor: expiryUrgent ? theme.colors.error + '18' : theme.colors.surface }]}>
              <Text style={[styles.infoPillText, { color: expiryUrgent ? theme.colors.error : theme.colors.text }]}>
                ⏱ Expires: {expiryStr}
              </Text>
            </View>
          </View>

          {/* Address */}
          <Text style={[styles.addressText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            📍 {item.pickupAddress}
          </Text>

          {/* Notes */}
          {!!item.additionalNotes && (
            <Text style={[styles.notesText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              📝 {item.additionalNotes}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isLoading ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <>
                <TouchableOpacity
                  id={`btn-accept-${item._id || item.id}`}
                  style={[styles.acceptBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={(e) => { e.stopPropagation?.(); openModal(item, 'accept'); }}
                >
                  <Check size={14} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  id={`btn-reject-${item._id || item.id}`}
                  style={[styles.rejectBtn, { borderColor: theme.colors.error }]}
                  onPress={(e) => { e.stopPropagation?.(); openModal(item, 'reject'); }}
                >
                  <XCircle size={14} color={theme.colors.error} style={{ marginRight: 4 }} />
                  <Text style={[styles.rejectBtnText, { color: theme.colors.error }]}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  id={`btn-detail-${item._id || item.id}`}
                  style={[styles.detailBtn, { borderColor: theme.colors.border }]}
                  onPress={() => handleCardPress(item)}
                >
                  <ChevronRight size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-browse-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Browse Donations</Text>
          {!loading && (
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {filtered.length} available
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={fetchAvailableDonations} id="btn-refresh-browse"
          style={[styles.refreshBtn, { backgroundColor: theme.colors.card }]}>
          <RefreshCw size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Search size={14} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            id="input-browse-search"
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search food name or donor..."
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
      </View>

      {/* Category Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar}
        contentContainerStyle={styles.catBarContent}>
        {CATEGORIES.map(cat => {
          const active = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              id={`chip-cat-${cat.replace(/\s/g, '')}`}
              style={[styles.catChip, {
                backgroundColor: active ? theme.colors.accent : 'transparent',
                borderColor: active ? theme.colors.accent : theme.colors.border,
              }]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catChipText, { color: active ? '#FFF' : theme.colors.textSecondary }]}>
                {cat === 'All' ? '🌐 All' : `${getCategoryEmoji(cat)} ${cat}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Finding available donations...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <AlertTriangle size={40} color={theme.colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Donations Found</Text>
          <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
            {searchQuery ? 'Try adjusting your search.' : 'No listings right now. Check back soon!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id || item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Accept / Reject Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {modalMode === 'accept' ? '✅ Accept Donation' : '❌ Reject Donation'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} id="btn-modal-close">
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {modalItem && (
              <View style={[styles.modalItemPreview, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.modalItemName, { color: theme.colors.text }]}>{modalItem.foodType}</Text>
                <Text style={[styles.modalItemMeta, { color: theme.colors.textSecondary }]}>
                  {modalItem.quantity} {modalItem.unit} · {modalItem.donorName || 'Local Donor'}
                </Text>
              </View>
            )}

            {modalMode === 'accept' ? (
              <>
                <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Add a Note (optional)</Text>
                <View style={[styles.textAreaBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <MessageSquare size={14} color={theme.colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
                  <TextInput
                    id="input-accept-notes"
                    style={[styles.textArea, { color: theme.colors.text }]}
                    placeholder="E.g. Will arrange pickup by 4pm..."
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    value={ngoNotes}
                    onChangeText={setNgoNotes}
                  />
                </View>
                <TouchableOpacity
                  id="btn-modal-confirm-accept"
                  style={[styles.modalConfirmBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={handleAccept}
                >
                  <Check size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalConfirmText}>Confirm Acceptance</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Reason for Rejection</Text>
                <View style={styles.reasonsList}>
                  {REJECT_REASONS.map(r => (
                    <TouchableOpacity
                      key={r}
                      id={`reason-${r.replace(/\s/g, '')}`}
                      style={[
                        styles.reasonChip,
                        {
                          backgroundColor: rejectReason === r ? theme.colors.error + '18' : theme.colors.surface,
                          borderColor: rejectReason === r ? theme.colors.error : theme.colors.border,
                        },
                      ]}
                      onPress={() => setRejectReason(r)}
                    >
                      <Text style={[styles.reasonChipText, { color: rejectReason === r ? theme.colors.error : theme.colors.textSecondary }]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  id="btn-modal-confirm-reject"
                  style={[styles.modalConfirmBtn, { backgroundColor: theme.colors.error }]}
                  onPress={handleReject}
                >
                  <XCircle size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalConfirmText}>Confirm Rejection</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity id="btn-modal-cancel" onPress={() => setModalVisible(false)}>
              <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  searchRow: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', height: 44,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  catBar: { maxHeight: 46 },
  catBarContent: { paddingHorizontal: 14, gap: 8, paddingBottom: 6 },
  catChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  catChipText: { fontSize: 11, fontWeight: '700', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { fontSize: 12, marginTop: 12, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  emptyDesc: { fontSize: 12, textAlign: 'center', lineHeight: 18, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  list: { padding: 16, paddingBottom: 30 },
  card: {
    flexDirection: 'row', borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden',
    elevation: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10,
  },
  freshnessBar: { width: 4 },
  cardBody: { flex: 1, padding: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  foodType: { fontSize: 14, fontWeight: '800', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  donorName: { fontSize: 11, marginTop: 2, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  freshnessBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  freshnessText: { fontSize: 9, fontWeight: '800', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  infoPill: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8 },
  infoPillText: { fontSize: 10, fontWeight: '600', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  addressText: { fontSize: 11, marginBottom: 4, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  notesText: { fontSize: 10, lineHeight: 14, marginBottom: 8, fontStyle: 'italic', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  actionButtons: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  acceptBtn: {
    flex: 1, height: 34, borderRadius: 8, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', elevation: 1,
  },
  acceptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  rejectBtn: {
    flex: 1, height: 34, borderRadius: 8, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  rejectBtnText: { fontWeight: '700', fontSize: 12, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  detailBtn: {
    width: 34, height: 34, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
    elevation: 10, shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 8,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  modalItemPreview: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  modalItemName: { fontSize: 14, fontWeight: '700', marginBottom: 2, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  modalItemMeta: { fontSize: 11, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  modalLabel: { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  textAreaBox: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 16, minHeight: 70,
  },
  textArea: { flex: 1, fontSize: 13, textAlignVertical: 'top', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  reasonsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  reasonChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  reasonChipText: { fontSize: 12, fontWeight: '600', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  modalConfirmBtn: {
    height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
  },
  modalConfirmText: { color: '#FFF', fontWeight: '700', fontSize: 14, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  cancelText: { textAlign: 'center', fontSize: 13, fontWeight: '600', paddingVertical: 8, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
});

export default BrowseDonationsScreen;
