import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft, Calendar, FileText, CheckCircle2, XCircle } from 'lucide-react-native';
import { RootState } from '../../store';
import { setActiveItem } from '../../store/donationSlice';
import { apiCall } from '../../services/api';
import { AppTheme } from '../../theme/theme';

interface HistoryScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

const MOCK_HISTORY = [
  { _id: 'h001', foodType: 'Cooked Rice & Sambar', quantity: 100, unit: 'Plates', status: 'Completed', pickupAddress: '12 MG Road, Bengaluru', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { _id: 'h002', foodType: 'Mixed Vegetables', quantity: 20, unit: 'Kg', status: 'Completed', pickupAddress: '5 Brigade Road, Bengaluru', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { _id: 'h003', foodType: 'Bread & Butter', quantity: 40, unit: 'Packets', status: 'Completed', pickupAddress: '7 Indiranagar, Bengaluru', createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  { _id: 'h004', foodType: 'Fruit Basket', quantity: 15, unit: 'Kg', status: 'Cancelled', pickupAddress: '3 Jayanagar, Bengaluru', createdAt: new Date(Date.now() - 86400000 * 12).toISOString() },
];

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await apiCall('/donations?mine=true', { token });
        if (response.success) {
          const filtered = response.donations.filter((d: any) => ['Completed', 'Cancelled'].includes(d.status));
          setHistory(filtered);
        }
      } catch (error) {
        // Backend offline — show demo history
        setHistory(MOCK_HISTORY);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);


  const renderHistoryItem = ({ item }: { item: any }) => {
    const isCompleted = item.status === 'Completed';

    return (
      <TouchableOpacity
        id={`history-card-${item._id || item.id}`}
        style={[styles.historyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={() => {
          dispatch(setActiveItem(item));
          navigate('DonationDetail');
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.foodType, { color: theme.colors.text }]}>{item.foodType}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isCompleted ? theme.colors.success + '1A' : theme.colors.error + '1A' }
          ]}>
            {isCompleted ? (
              <CheckCircle2 size={12} color={theme.colors.success} style={{ marginRight: 4 }} />
            ) : (
              <XCircle size={12} color={theme.colors.error} style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.statusText, { color: isCompleted ? theme.colors.success : theme.colors.error }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={[styles.details, { color: theme.colors.textSecondary }]}>
          Quantity: {item.quantity} {item.unit}
        </Text>
        <Text style={[styles.address, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          📍 {item.pickupAddress}
        </Text>

        <View style={[styles.cardFooter, { borderTopColor: theme.colors.border }]}>
          <View style={styles.dateRow}>
            <Calendar size={12} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.receiptBtn}>
            <FileText size={12} color={theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.receiptText, { color: theme.colors.primary }]}>Details</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-history-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Donation History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No history records found.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id || item._id}
          renderItem={renderHistoryItem}
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
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  list: {
    padding: 16
  },
  historyCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  foodType: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  details: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  address: {
    fontSize: 11,
    marginBottom: 12,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dateText: {
    fontSize: 10,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4
  },
  receiptText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  }
});
export default HistoryScreen;
