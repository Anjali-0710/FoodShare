import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft, Search, Calendar, Inbox, Clock, User, Filter, AlertCircle, Info, ShieldCheck
} from 'lucide-react';
import { RootState } from '../../store';
import { setHistory, setLoading, setError } from '../../store/notificationSlice';
import NotificationService from '../../services/notificationService';
import { AppTheme } from '../../theme/theme';

interface NotificationHistoryScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

export const NotificationHistoryScreen: React.FC<NotificationHistoryScreenProps> = ({
  theme,
  navigate,
}) => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);
  const { history, loading, error } = useSelector((state: RootState) => state.notification);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState<any[]>([]);

  const fetchHistory = useCallback(async (isSilent = false) => {
    if (!isSilent) dispatch(setLoading(true));
    try {
      const response = await NotificationService.getNotificationHistory(token);
      if (response.success) {
        dispatch(setHistory(response.history));
      }
    } catch (err: any) {
      dispatch(setError(err.message || 'Failed to fetch history'));
      console.error('Fetch notification history error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [token, dispatch]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(true);
  };

  useEffect(() => {
    let result = [...history];

    // Search query
    if (searchQuery.trim() !== '') {
      result = result.filter(n => 
        n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.userDetails?.name && n.userDetails.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (n.userDetails?.email && n.userDetails.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by type
    if (filterType !== 'All') {
      if (filterType === 'System') {
        result = result.filter(n => n.type === 'system_alert');
      } else if (filterType === 'Donations') {
        result = result.filter(n => ['donation_created', 'accepted', 'new_donation'].includes(n.type));
      } else if (filterType === 'Transits') {
        result = result.filter(n => ['volunteer_assigned', 'pickup_started', 'delivery_completed', 'completion_confirmation'].includes(n.type));
      }
    }

    setFilteredHistory(result);
  }, [searchQuery, filterType, history]);

  const filterOptions = ['All', 'Donations', 'Transits', 'System'];

  const renderHistoryItem = ({ item }: { item: any }) => {
    const date = new Date(item.createdAt);
    const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    return (
      <View style={[styles.historyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.dateRow}>
            <Calendar size={12} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>{dateString}</Text>
            <Clock size={12} color={theme.colors.textSecondary} style={{ marginLeft: 8, marginRight: 4 }} />
            <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>{timeString}</Text>
          </View>
          <View style={[
            styles.statusBadge, 
            { 
              backgroundColor: item.read ? theme.colors.border : theme.colors.primary + '1F',
              borderColor: item.read ? 'transparent' : theme.colors.primary
            }
          ]}>
            <Text style={[styles.statusText, { color: item.read ? theme.colors.textSecondary : theme.colors.primary }]}>
              {item.read ? 'Read' : 'Unread'}
            </Text>
          </View>
        </View>

        {/* User context info block */}
        <View style={styles.userRow}>
          <User size={13} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.userLabelText, { color: theme.colors.text }]}>
            {item.userDetails?.name || 'Self'} 
            <Text style={[styles.userRoleText, { color: theme.colors.textSecondary }]}>
              {` (${(item.userDetails?.role || item.role || 'user').toUpperCase()})`}
            </Text>
          </Text>
        </View>

        <Text style={[styles.titleText, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.messageText, { color: theme.colors.textSecondary }]}>{item.message}</Text>
        
        <View style={styles.typeRow}>
          <Info size={10} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={[styles.typeText, { color: theme.colors.textSecondary }]}>
            Type: {item.type}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate('Dashboard')}
          id="btn-history-back"
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notification History Log</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Header Panel */}
      <View style={styles.filterSection}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Search size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search log message, user name, or email..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.colors.text }]}
            id="input-history-search"
          />
        </View>

        {/* Categories row */}
        <FlatList
          horizontal
          data={filterOptions}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryTab,
                {
                  backgroundColor: filterType === item ? theme.colors.primary : theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setFilterType(item)}
              id={`tab-history-filter-${item}`}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: filterType === item ? '#FFFFFF' : theme.colors.textSecondary },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '1A', borderColor: theme.colors.error }]}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        </View>
      )}

      {/* List content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : filteredHistory.length === 0 ? (
        <View style={styles.center}>
          <Inbox size={48} color={theme.colors.textSecondary} style={{ marginBottom: 16, opacity: 0.5 }} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No logs found</Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No notification records matched your filter settings.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item._id || item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
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
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 6,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  categoryList: {
    gap: 8
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dateText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1
  },
  statusText: {
    fontSize: 8.5,
    fontWeight: '800',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  userLabelText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  userRoleText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  titleText: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  messageText: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
    paddingTop: 6,
    marginTop: 2
  },
  typeText: {
    fontSize: 9.5,
    fontWeight: '600',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  errorBox: {
    margin: 16,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1
  },
  errorText: {
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  }
});

export default NotificationHistoryScreen;
