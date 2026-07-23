import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Trash2,
  MailOpen,
  Mail,
  ShieldAlert,
  Search,
  X,
  Package,
  Truck,
  Building2,
  UserCheck,
  Info,
  CheckCircle,
  Navigation,
  Award,
} from 'lucide-react-native';
import { RootState } from '../../store';
import {
  setNotifications,
  markReadLocal,
  markAllReadLocal,
  deleteLocal,
  setLoading,
  setError,
} from '../../store/notificationSlice';
import NotificationService from '../../services/notificationService';
import { AppTheme } from '../../theme/theme';

interface NotificationCenterScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

export type CategoryFilter = 'All' | 'Donation' | 'Volunteer' | 'NGO' | 'Pickup' | 'System';

export const NotificationCenterScreen: React.FC<NotificationCenterScreenProps> = ({
  theme,
  navigate,
}) => {
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { token, user } = useSelector((state: RootState) => state.auth);
  const { items, loading, error } = useSelector((state: RootState) => state.notification);

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user notifications from Supabase
  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!user?.id) return;
    if (!isSilent) dispatch(setLoading(true));
    try {
      const response = await NotificationService.getNotifications(user.id);
      dispatch(setNotifications(response));
    } catch (err: any) {
      dispatch(setError(err.message || 'Failed to fetch notifications'));
      console.error('Fetch notifications error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, dispatch]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time listener for incoming notifications
  useEffect(() => {
    if (!user?.id) return;
    const channel = NotificationService.subscribeToNotifications(user.id, (newNotif) => {
      fetchNotifications(true);
    });

    return () => {
      if (channel) {
        NotificationService.unsubscribe(channel);
      }
    };
  }, [user?.id, fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const handleMarkRead = async (id: string) => {
    try {
      const response = await NotificationService.markRead(id);
      if (response.success) {
        dispatch(markReadLocal(id));
      }
    } catch (err) {
      console.error('Mark notification read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      const response = await NotificationService.markAllRead(user.id);
      if (response.success) {
        dispatch(markAllReadLocal());
      }
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await NotificationService.deleteNotification(id);
      if (response.success) {
        dispatch(deleteLocal(id));
      }
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  // Navigates based on notification target and user role
  const handleNotificationTap = async (item: any) => {
    if (!item.read) {
      await handleMarkRead(item._id || item.id);
    }

    if (item.donationId) {
      if (user?.role === 'ngo') {
        navigate('NgoRequests');
      } else if (user?.role === 'donor') {
        navigate('History');
      } else if (user?.role === 'volunteer') {
        navigate('PickupRoute');
      } else if (user?.role === 'admin') {
        navigate('Dashboard');
      }
    }
  };

  // Category matching helper
  const matchesCategory = (item: any, category: CategoryFilter): boolean => {
    if (category === 'All') return true;
    const typeStr = (item.type || '').toLowerCase();
    const titleStr = (item.title || '').toLowerCase();
    const msgStr = (item.message || '').toLowerCase();

    if (category === 'Donation') {
      return typeStr.includes('donation') || typeStr.includes('food') || titleStr.includes('donation') || msgStr.includes('donation');
    }
    if (category === 'Volunteer') {
      return typeStr.includes('volunteer') || typeStr.includes('karma') || titleStr.includes('volunteer') || msgStr.includes('volunteer');
    }
    if (category === 'NGO') {
      return typeStr.includes('ngo') || titleStr.includes('ngo') || msgStr.includes('ngo');
    }
    if (category === 'Pickup') {
      return typeStr.includes('pickup') || typeStr.includes('transit') || typeStr.includes('delivery') || titleStr.includes('pickup') || msgStr.includes('pickup');
    }
    if (category === 'System') {
      return typeStr.includes('system') || typeStr.includes('alert') || typeStr.includes('info') || titleStr.includes('system') || msgStr.includes('system');
    }
    return true;
  };

  // Filtered & Searched Notifications
  const filteredItems = items.filter((item) => {
    const matchCat = matchesCategory(item, activeCategory);
    const q = searchQuery.trim().toLowerCase();
    const matchQuery =
      !q ||
      (item.title || '').toLowerCase().includes(q) ||
      (item.message || '').toLowerCase().includes(q);
    return matchCat && matchQuery;
  });

  const getCategoryIcon = (type: string, readStatus: boolean) => {
    const iconSize = 20;
    const typeStr = (type || '').toLowerCase();

    if (typeStr.includes('donation') || typeStr.includes('food')) {
      return <Package size={iconSize} color="#22C55E" />;
    }
    if (typeStr.includes('pickup') || typeStr.includes('transit') || typeStr.includes('delivery')) {
      return <Truck size={iconSize} color="#3B82F6" />;
    }
    if (typeStr.includes('volunteer') || typeStr.includes('karma')) {
      return <UserCheck size={iconSize} color="#8B5CF6" />;
    }
    if (typeStr.includes('ngo')) {
      return <Building2 size={iconSize} color="#F59E0B" />;
    }
    if (typeStr.includes('alert') || typeStr.includes('warning')) {
      return <ShieldAlert size={iconSize} color="#EF4444" />;
    }
    return readStatus ? (
      <MailOpen size={iconSize} color={theme.colors.textSecondary} />
    ) : (
      <Mail size={iconSize} color={theme.colors.primary} />
    );
  };

  const getFormattedTime = (isoString: string) => {
    if (!isoString) return 'Recent';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderNotificationCard = ({ item }: { item: any }) => (
    <View
      style={[
        styles.notifCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: item.read ? theme.colors.border : theme.colors.primary + '40',
        },
      ]}
    >
      {!item.read && <View style={[styles.unreadBadgeDot, { backgroundColor: theme.colors.primary }]} />}
      <TouchableOpacity
        style={styles.cardMain}
        onPress={() => handleNotificationTap(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, { backgroundColor: theme.colors.background }]}>
          {getCategoryIcon(item.type, item.read)}
        </View>
        <View style={styles.textContainer}>
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardTitle,
                { color: theme.colors.text },
                !item.read && styles.boldText,
              ]}
              numberOfLines={1}
            >
              {item.title || 'Notification Update'}
            </Text>
            <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
              {getFormattedTime(item.createdAt)}
            </Text>
          </View>
          <Text
            style={[styles.messageText, { color: theme.colors.textSecondary }]}
            numberOfLines={3}
          >
            {item.message}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActionsGroup}>
        {!item.read && (
          <TouchableOpacity
            style={styles.actionIconButton}
            onPress={() => handleMarkRead(item._id || item.id)}
            accessibilityLabel="Mark as read"
          >
            <CheckCircle size={15} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionIconButton}
          onPress={() => handleDelete(item._id || item.id)}
          accessibilityLabel="Delete notification"
        >
          <Trash2 size={15} color={theme.colors.error} style={{ opacity: 0.75 }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const unreadCount = items.filter((n) => !n.read).length;
  const categories: CategoryFilter[] = ['All', 'Donation', 'Volunteer', 'NGO', 'Pickup', 'System'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* HEADER BAR */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.leftHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigate('Dashboard')}
            accessibilityLabel="Go back to Dashboard"
          >
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications Center</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All notifications up to date'}
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={[styles.markAllBtn, { backgroundColor: theme.colors.primary + '18' }]}
            onPress={handleMarkAllRead}
            accessibilityLabel="Mark all as read"
          >
            <CheckCheck size={16} color={theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.markAllText, { color: theme.colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* CENTER WRAPPER FOR RESPONSIVE DESKTOP LAYOUT */}
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? 900 : '100%' }]}>
        {/* SEARCH BAR */}
        <View style={[styles.searchBarRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Search size={16} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search notifications by title or message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* CATEGORY FILTERS CHIPS BAR */}
        <View style={styles.categoryChipsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: isActive ? theme.colors.primary : theme.colors.card,
                      borderColor: isActive ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isActive ? '#FFFFFF' : theme.colors.textSecondary },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ERROR BANNER */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '1A', borderColor: theme.colors.error }]}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        )}

        {/* NOTIFICATIONS LIST CONTENT */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading notifications...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.center}>
            <Bell size={48} color={theme.colors.textSecondary} style={{ marginBottom: 16, opacity: 0.4 }} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No notifications found</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {searchQuery
                ? `No notifications match "${searchQuery}".`
                : activeCategory !== 'All'
                ? `No ${activeCategory} notifications available.`
                : 'All caught up! Real-time alerts will appear here when updates occur.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item: any) => item._id || item.id}
            renderItem={renderNotificationCard}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  categoryChipsContainer: {
    marginBottom: 12,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 24,
  },
  notifCard: {
    position: 'relative',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  unreadBadgeDot: {
    position: 'absolute',
    top: 14,
    left: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    zIndex: 10,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    paddingLeft: 22,
    alignItems: 'center',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  boldText: {
    fontWeight: '800',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    gap: 6,
  },
  actionIconButton: {
    padding: 6,
    borderRadius: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorBox: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default NotificationCenterScreen;
