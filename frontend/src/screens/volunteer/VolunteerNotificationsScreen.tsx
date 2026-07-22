import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft, Bell, CheckCheck, Package, Truck, Award } from 'lucide-react-native';
import { RootState } from '../../store';
import NotificationService from '../../services/notificationService';
import { AppTheme } from '../../theme/theme';

interface VolunteerNotificationsScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

export const VolunteerNotificationsScreen: React.FC<VolunteerNotificationsScreenProps> = ({
  theme,
  navigate,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await NotificationService.getNotifications(user.id);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch volunteer notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await NotificationService.markAllRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await NotificationService.markRead(id);
      setNotifications(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const getIcon = (type: string) => {
    const iconSize = 20;
    switch (type) {
      case 'new_assignment':
        return <Package size={iconSize} color={theme.colors.accent} />;
      case 'pickup_reminder':
        return <Bell size={iconSize} color={theme.colors.warning} />;
      case 'delivery_reminder':
        return <Truck size={iconSize} color={theme.colors.primary} />;
      case 'completion_confirmation':
        return <Award size={iconSize} color={theme.colors.success || '#10B981'} />;
      default:
        return <Bell size={iconSize} color={theme.colors.textSecondary} />;
    }
  };

  const getFormattedTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(isoString).toLocaleDateString();
  };

  const renderNotificationItem = ({ item }: { item: any }) => {
    const notifId = item.id || item._id;
    const notifTime = item.timestamp || item.createdAt;
    return (
      <TouchableOpacity
        style={[
          styles.notifCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: item.read ? theme.colors.border : theme.colors.primary + '33',
          },
        ]}
        onPress={() => handleMarkRead(notifId)}
        disabled={item.read}
        id={`notif-item-${notifId}`}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.background }]}>
            {getIcon(item.type)}
          </View>
          <View style={styles.textDetails}>
            <View style={styles.titleRow}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }, !item.read && styles.boldText]}>
                {item.title}
              </Text>
              <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
                {getFormattedTime(notifTime)}
              </Text>
            </View>
            <Text style={[styles.messageText, { color: theme.colors.textSecondary }]}>
              {item.message}
            </Text>
          </View>
        </View>
        {!item.read && (
          <View style={styles.unreadIndicator}>
            <View style={[styles.blueDot, { backgroundColor: theme.colors.primary }]} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigate('Dashboard')}
            id="btn-notifications-back"
          >
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            style={styles.markAllBtn}
            id="btn-mark-all-read"
          >
            <CheckCheck size={16} color={theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.markAllText, { color: theme.colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Bell size={48} color={theme.colors.textSecondary} style={{ marginBottom: 16, opacity: 0.5 }} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No notifications available</Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            You will receive transport updates, reminders, and award highlights here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id || item._id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        />
      )}
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
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
  },
  list: {
    padding: 16,
  },
  notifCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textDetails: {
    flex: 1,
    paddingRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
  },
  boldText: {
    fontWeight: '800',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
  },
  timeText: {
    fontSize: 9,
    fontWeight: '500',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
  },
  messageText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
  },
  unreadIndicator: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -4,
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
  },
});

export default VolunteerNotificationsScreen;
