import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft, Bell, CheckCheck, Package, Truck, Star, Zap } from 'lucide-react-native';
import { RootState } from '../../store';
import { setActiveDonation } from '../../store/ngoSlice';
import NotificationService from '../../services/notificationService';
import { AppTheme } from '../../theme/theme';

interface NgoNotificationsScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

const getNotifIcon = (type: string, theme: AppTheme) => {
  switch (type) {
    case 'new_donation': return <Zap size={18} color={theme.colors.info} />;
    case 'accepted': return <Package size={18} color={theme.colors.accent} />;
    case 'volunteer_assigned': return <Truck size={18} color="#8B5CF6" />;
    case 'delivery_completed': return <Star size={18} color={theme.colors.success} />;
    default: return <Bell size={18} color={theme.colors.textSecondary} />;
  }
};

const getNotifColor = (type: string, theme: AppTheme) => {
  switch (type) {
    case 'new_donation': return theme.colors.info;
    case 'accepted': return theme.colors.accent;
    case 'volunteer_assigned': return '#8B5CF6';
    case 'delivery_completed': return theme.colors.success;
    default: return theme.colors.textSecondary;
  }
};

const formatTime = (isoStr: string) => {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
};

export const NgoNotificationsScreen: React.FC<NgoNotificationsScreenProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { myDonations } = useSelector((state: RootState) => state.ngo);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await NotificationService.getNotifications(user.id);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch NGO notifications:', err);
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

  const handleNotifPress = async (notif: any) => {
    const notifId = notif.id || notif._id;
    try {
      await NotificationService.markRead(notifId);
      setNotifications(prev => prev.map(n => (n._id === notifId || n.id === notifId) ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }

    if (notif.donationId) {
      const donation = myDonations.find(
        d => d.id === notif.donationId || d._id === notif.donationId
      );
      if (donation) {
        dispatch(setActiveDonation(donation));
        navigate('NgoDonationDetail');
      } else {
        navigate('NgoRequests');
      }
    }
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

  const renderNotif = ({ item }: { item: any }) => {
    const notifColor = getNotifColor(item.type, theme);
    const notifId = item.id || item._id;
    const notifTime = item.timestamp || item.createdAt;
    return (
      <TouchableOpacity
        id={`notif-${notifId}`}
        style={[
          styles.notifCard,
          {
            backgroundColor: item.read ? theme.colors.card : notifColor + '0C',
            borderColor: item.read ? theme.colors.border : notifColor + '44',
          },
        ]}
        onPress={() => handleNotifPress(item)}
        activeOpacity={0.82}
      >
        {/* Left color indicator */}
        <View style={[styles.notifBar, { backgroundColor: item.read ? theme.colors.border : notifColor }]} />

        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: notifColor + '18' }]}>
          {getNotifIcon(item.type, theme)}
        </View>

        {/* Content */}
        <View style={styles.notifContent}>
          <View style={styles.notifTop}>
            <Text style={[styles.notifTitle, { color: theme.colors.text, fontWeight: item.read ? '600' : '800' }]}>
              {item.title}
            </Text>
            {!item.read && (
              <View style={[styles.unreadDot, { backgroundColor: notifColor }]} />
            )}
          </View>
          <Text style={[styles.notifMessage, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={[styles.notifTime, { color: theme.colors.textSecondary }]}>
            {formatTime(notifTime)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);
  const unreadCount = unread.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-notif-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            id="btn-mark-all-read"
            style={[styles.markAllBtn, { borderColor: theme.colors.border }]}
            onPress={handleMarkAllRead}
          >
            <CheckCheck size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.markAllText, { color: theme.colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Bell size={48} color={theme.colors.textSecondary} style={{ marginBottom: 14 }} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No notifications available</Text>
          <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
            No notifications yet. Accept donations to receive updates.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        >
          {/* Unread Section */}
          {unread.length > 0 && (
            <>
              <View style={styles.sectionLabel}>
                <View style={[styles.sectionDot, { backgroundColor: theme.colors.error }]} />
                <Text style={[styles.sectionLabelText, { color: theme.colors.textSecondary }]}>UNREAD</Text>
              </View>
              <FlatList
                data={unread}
                keyExtractor={n => n.id || n._id}
                renderItem={renderNotif}
                scrollEnabled={false}
              />
            </>
          )}

          {/* Read Section */}
          {read.length > 0 && (
            <>
              <View style={styles.sectionLabel}>
                <View style={[styles.sectionDot, { backgroundColor: theme.colors.textSecondary }]} />
                <Text style={[styles.sectionLabelText, { color: theme.colors.textSecondary }]}>EARLIER</Text>
              </View>
              <FlatList
                data={read}
                keyExtractor={n => n.id || n._id}
                renderItem={renderNotif}
                scrollEnabled={false}
              />
            </>
          )}

          {/* Bottom Tip */}
          <View style={[styles.tipBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Bell size={14} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Tap a notification to view the related donation details.
            </Text>
          </View>
        </ScrollView>
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
  headerTitle: { fontSize: 17, fontWeight: '800', fontFamily: 'System' },
  headerSubtitle: { fontSize: 10, marginTop: 1, fontFamily: 'System' },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    paddingHorizontal: 10, borderRadius: 10, borderWidth: 1,
  },
  markAllText: { fontSize: 11, fontWeight: '700', fontFamily: 'System' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, fontFamily: 'System' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: 'System' },
  list: { padding: 16, paddingBottom: 32 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4, gap: 6 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionLabelText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, fontFamily: 'System' },
  notifCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1,
    marginBottom: 10, overflow: 'hidden',
    elevation: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10,
  },
  notifBar: { width: 4, alignSelf: 'stretch' },
  iconCircle: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center',
    justifyContent: 'center', marginHorizontal: 12,
  },
  notifContent: { flex: 1, paddingVertical: 12, paddingRight: 12 },
  notifTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  notifTitle: { fontSize: 13, flex: 1, marginRight: 8, fontFamily: 'System' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifMessage: { fontSize: 11, lineHeight: 16, marginBottom: 5, fontFamily: 'System' },
  notifTime: { fontSize: 9, fontWeight: '600', fontFamily: 'System' },
  tipBox: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1,
    padding: 12, marginTop: 8,
  },
  tipText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: 'System' },
});

export default NgoNotificationsScreen;
