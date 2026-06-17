import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft, Bell, CheckCheck, Trash2, MailOpen, Mail, ShieldAlert,
  Calendar, Info, AlertTriangle, Truck, Award, CheckCircle, Package, Navigation
} from 'lucide-react-native';
import { RootState } from '../../store';
import {
  setNotifications, markReadLocal, markAllReadLocal, deleteLocal, setLoading, setError
} from '../../store/notificationSlice';
import NotificationService from '../../services/notificationService';
import { AppTheme } from '../../theme/theme';

interface NotificationCenterScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

export const NotificationCenterScreen: React.FC<NotificationCenterScreenProps> = ({
  theme,
  navigate,
}) => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);
  const { items, loading, error } = useSelector((state: RootState) => state.notification);

  const [activeTab, setActiveTab] = useState<'All' | 'Unread' | 'Read' | 'Alerts'>('All');
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) dispatch(setLoading(true));
    try {
      const response = await NotificationService.getNotifications(token);
      if (response.success) {
        dispatch(setNotifications(response.notifications));
      }
    } catch (err: any) {
      dispatch(setError(err.message || 'Failed to fetch notifications'));
      console.error('Fetch notifications error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [token, dispatch]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const handleMarkRead = async (id: string) => {
    try {
      const response = await NotificationService.markRead(id, token);
      if (response.success) {
        dispatch(markReadLocal(id));
      }
    } catch (err) {
      console.error('Mark notification read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await NotificationService.markAllRead(token);
      if (response.success) {
        dispatch(markAllReadLocal());
      }
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await NotificationService.deleteNotification(id, token);
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
        navigate('History'); // Donor History showing tracking lists
      } else if (user?.role === 'volunteer') {
        navigate('PickupRoute');
      }
    }
  };

  // Filter notifications logic
  const filteredItems = items.filter(item => {
    if (activeTab === 'Unread') return !item.read;
    if (activeTab === 'Read') return item.read;
    if (activeTab === 'Alerts') return item.type === 'system_alert' || item.type.includes('warning');
    return true; // 'All'
  });

  const getIcon = (type: string, readStatus: boolean) => {
    const iconSize = 20;
    const color = readStatus ? theme.colors.textSecondary : theme.colors.primary;
    
    switch (type) {
      case 'new_donation':
        return <Package size={iconSize} color={theme.colors.success || '#10B981'} />;
      case 'accepted':
        return <CheckCircle size={iconSize} color={theme.colors.primary} />;
      case 'volunteer_assigned':
        return <Truck size={iconSize} color={theme.colors.info} />;
      case 'pickup_started':
        return <Navigation size={iconSize} color={theme.colors.accent} />;
      case 'delivery_completed':
        return <Award size={iconSize} color={theme.colors.success || '#10B981'} />;
      case 'completion_confirmation':
        return <CheckSquare size={iconSize} color={theme.colors.success || '#10B981'} />;
      case 'system_alert':
        return <ShieldAlert size={iconSize} color={theme.colors.error} />;
      default:
        return readStatus ? <MailOpen size={iconSize} color={color} /> : <Mail size={iconSize} color={color} />;
    }
  };

  const getFormattedTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderNotificationCard = ({ item }: { item: any }) => (
    <View
      style={[
        styles.notifCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: item.read ? theme.colors.border : theme.colors.primary + '33',
        }
      ]}
    >
      <TouchableOpacity
        style={styles.cardMain}
        onPress={() => handleNotificationTap(item)}
        id={`btn-tap-notif-${item._id}`}
      >
        <View style={[styles.iconBox, { backgroundColor: theme.colors.background }]}>
          {getIcon(item.type, item.read)}
        </View>
        <View style={styles.textContainer}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }, !item.read && styles.boldText]} numberOfLines={1}>
              {item.title || 'Notification Update'}
            </Text>
            <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
              {getFormattedTime(item.createdAt)}
            </Text>
          </View>
          <Text style={[styles.messageText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item._id || item.id)}
        id={`btn-delete-notif-${item._id}`}
      >
        <Trash2 size={16} color={theme.colors.error} style={{ opacity: 0.7 }} />
      </TouchableOpacity>
    </View>
  );

  const unreadCount = items.filter(n => !n.read).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigate('Dashboard')}
            id="btn-notif-center-back"
          >
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notification Center</Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllRead}
            id="btn-notif-center-mark-all"
          >
            <CheckCheck size={16} color={theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.markAllText, { color: theme.colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs Menu */}
      <View style={[styles.tabsMenu, { borderBottomColor: theme.colors.border }]}>
        {(['All', 'Unread', 'Read', 'Alerts'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabBtn,
              activeTab === tab && { borderBottomColor: theme.colors.primary, borderBottomWidth: 3 }
            ]}
            onPress={() => setActiveTab(tab)}
            id={`tab-notif-${tab}`}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? theme.colors.primary : theme.colors.textSecondary },
                activeTab === tab && styles.boldText
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
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
      ) : filteredItems.length === 0 ? (
        <View style={styles.center}>
          <Bell size={48} color={theme.colors.textSecondary} style={{ marginBottom: 16, opacity: 0.5 }} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No notifications found</Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            All caught up! Alerts will appear here when donation updates occur.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item: any) => item._id || item.id}
          renderItem={renderNotificationCard}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        />
      )}
    </View>
  );
};

// Quick helper
const CheckSquare: React.FC<{ size: number; color: string; style?: any }> = ({ size, color, style }) => (
  <View style={style}><CheckCircle size={size} color={color} /></View>
);

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
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  backBtn: {
    padding: 8
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  tabsMenu: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  list: {
    padding: 16
  },
  notifCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center'
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  textContainer: {
    flex: 1,
    paddingRight: 6
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4
  },
  cardTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  boldText: {
    fontWeight: '800',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  timeText: {
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  messageText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  deleteBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(128,128,128,0.1)'
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
    paddingHorizontal: 20,
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

export default NotificationCenterScreen;
