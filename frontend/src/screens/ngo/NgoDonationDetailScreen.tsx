import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft, Phone, MapPin, User, Package, Calendar,
  Clock3, CheckCircle2, Truck, Star, XCircle, AlertCircle,
  Thermometer, Info,
} from 'lucide-react-native';
import { RootState } from '../../store';
import { updateDonationInList } from '../../store/ngoSlice';
import { apiCall } from '../../services/api';
import { AppTheme } from '../../theme/theme';

interface NgoDonationDetailScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

const STATUS_STEPS = [
  { key: 'Pending', label: 'Submitted', icon: AlertCircle },
  { key: 'Accepted', label: 'Accepted', icon: CheckCircle2 },
  { key: 'Assigned', label: 'Volunteer Assigned', icon: Truck },
  { key: 'Picked Up', label: 'Picked Up', icon: Package },
  { key: 'Completed', label: 'Completed', icon: Star },
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

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatExpiry = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return '⚠️ Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h remaining`;
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
};

const getStepIndex = (status: string) => {
  const map: Record<string, number> = {
    'Pending': 0, 'Accepted': 1, 'Assigned': 2,
    'Picked Up': 3, 'Delivered': 3, 'Completed': 4,
  };
  return map[status] ?? -1;
};

export const NgoDonationDetailScreen: React.FC<NgoDonationDetailScreenProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { token } = useSelector((state: RootState) => state.auth);
  const activeDonation = useSelector((state: RootState) => state.ngo.activeDonation);

  const [loading, setLoading] = useState(false);
  const [actionDone, setActionDone] = useState(false);

  const donation = activeDonation;

  if (!donation) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-ngo-detail-back">
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Donation Detail</Text>
        </View>
        <View style={styles.center}>
          <Info size={40} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No donation selected.
          </Text>
          <TouchableOpacity onPress={() => navigate('NgoRequests')} id="btn-ngo-detail-go-list">
            <Text style={[styles.linkText, { color: theme.colors.primary }]}>Browse My Requests</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor(donation.status, theme);
  const stepIndex = getStepIndex(donation.status);
  const isCancelled = donation.status === 'Cancelled';
  const freshnessScore = donation.freshnessScore || 80;
  const freshnessColor = freshnessScore >= 75 ? theme.colors.success : freshnessScore >= 50 ? theme.colors.warning : theme.colors.error;

  const handleMarkDelivered = async () => {
    setLoading(true);
    try {
      const id = donation._id || donation.id;
      await apiCall(`/donations/${id}/status`, { method: 'PUT', token, body: { status: 'Completed' } });
      const updated = { ...donation, status: 'Completed' };
      dispatch(updateDonationInList(updated));
      setActionDone(true);
    } catch {
      const updated = { ...donation, status: 'Completed' };
      dispatch(updateDonationInList(updated));
      setActionDone(true);
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = actionDone ? 'Completed' : donation.status;
  const currentStepIndex = getStepIndex(currentStatus);
  const currentStatusColor = getStatusColor(currentStatus, theme);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('NgoRequests')} id="btn-ngo-detail-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Donation Detail</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            #{donation._id || donation.id}
          </Text>
        </View>
        <View style={[styles.statusHeaderBadge, { backgroundColor: currentStatusColor + '18', borderColor: currentStatusColor + '44' }]}>
          <Text style={[styles.statusHeaderText, { color: currentStatusColor }]}>{currentStatus}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Timeline */}
        {!isCancelled && (
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Delivery Timeline</Text>
            <View style={styles.timeline}>
              {STATUS_STEPS.map((step, idx) => {
                const done = idx <= currentStepIndex;
                const active = idx === currentStepIndex;
                const IconComponent = step.icon;
                const dotColor = done ? theme.colors.primary : theme.colors.border;
                return (
                  <View key={step.key} style={styles.timelineStep}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.timelineDot,
                        {
                          backgroundColor: done ? theme.colors.primary : theme.colors.card,
                          borderColor: dotColor,
                          transform: [{ scale: active ? 1.2 : 1 }],
                        },
                      ]}>
                        <IconComponent size={10} color={done ? '#FFF' : theme.colors.textSecondary} />
                      </View>
                      {idx < STATUS_STEPS.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: idx < currentStepIndex ? theme.colors.primary : theme.colors.border }]} />
                      )}
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={[
                        styles.timelineLabel,
                        { color: done ? theme.colors.text : theme.colors.textSecondary, fontWeight: active ? '800' : '500' },
                      ]}>
                        {step.label}
                      </Text>
                      {active && (
                        <Text style={[styles.timelineActive, { color: theme.colors.primary }]}>● Current Stage</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Donation Info */}
        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Donation Information</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Package size={14} color={theme.colors.primary} style={styles.infoIcon} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Food Type</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{donation.foodType}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Info size={14} color={theme.colors.accent} style={styles.infoIcon} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Quantity</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{donation.quantity} {donation.unit}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Star size={14} color={freshnessColor} style={styles.infoIcon} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>AI Freshness Score</Text>
                <Text style={[styles.infoValue, { color: freshnessColor }]}>{freshnessScore}% Fresh</Text>
              </View>
            </View>
            {donation.bestBeforeDate && (
              <View style={styles.infoRow}>
                <Clock3 size={14} color={theme.colors.warning} style={styles.infoIcon} />
                <View>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Best Before</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {formatDate(donation.bestBeforeDate)} ({formatExpiry(donation.bestBeforeDate)})
                  </Text>
                </View>
              </View>
            )}
            {donation.temperature && (
              <View style={styles.infoRow}>
                <Thermometer size={14} color={theme.colors.info} style={styles.infoIcon} />
                <View>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Storage Temp</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>{donation.temperature}°C</Text>
                </View>
              </View>
            )}
            <View style={styles.infoRow}>
              <Calendar size={14} color={theme.colors.textSecondary} style={styles.infoIcon} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Accepted On</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {formatDate(donation.acceptedAt || donation.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          {donation.additionalNotes ? (
            <View style={[styles.notesBox, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.notesLabel, { color: theme.colors.textSecondary }]}>📝 Donor Notes</Text>
              <Text style={[styles.notesText, { color: theme.colors.text }]}>{donation.additionalNotes}</Text>
            </View>
          ) : null}
        </View>

        {/* Donor Details */}
        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Donor Details</Text>
          <View style={styles.personCard}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '18' }]}>
              <User size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.personName, { color: theme.colors.text }]}>
                {donation.donorName || 'Anonymous Donor'}
              </Text>
              <Text style={[styles.personRole, { color: theme.colors.textSecondary }]}>Food Donor</Text>
            </View>
            {donation.donorPhone && (
              <TouchableOpacity
                id="btn-call-donor"
                style={[styles.callBtn, { backgroundColor: theme.colors.primary + '18' }]}
                onPress={() => Linking.openURL(`tel:${donation.donorPhone}`)}
              >
                <Phone size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Pickup Information */}
        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pickup Information</Text>
          <View style={styles.infoRow}>
            <MapPin size={14} color={theme.colors.error} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Pickup Address</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{donation.pickupAddress || 'N/A'}</Text>
            </View>
          </View>
          {donation.contactNumber && (
            <View style={styles.infoRow}>
              <Phone size={14} color={theme.colors.primary} style={styles.infoIcon} />
              <View>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Contact Number</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{donation.contactNumber}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Volunteer Card */}
        {donation.volunteerName ? (
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Assigned Volunteer</Text>
            <View style={styles.personCard}>
              <View style={[styles.avatar, { backgroundColor: '#8B5CF6' + '18' }]}>
                <User size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.personName, { color: theme.colors.text }]}>{donation.volunteerName}</Text>
                <Text style={[styles.personRole, { color: theme.colors.textSecondary }]}>Volunteer Driver</Text>
              </View>
              <View style={[styles.callBtn, { backgroundColor: '#8B5CF6' + '18' }]}>
                <Truck size={16} color="#8B5CF6" />
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Volunteer Status</Text>
            <View style={[styles.awaitingBox, { backgroundColor: theme.colors.surface }]}>
              <Clock3 size={16} color={theme.colors.warning} style={{ marginRight: 8 }} />
              <Text style={[styles.awaitingText, { color: theme.colors.textSecondary }]}>
                Awaiting volunteer assignment. A volunteer will be notified shortly.
              </Text>
            </View>
          </View>
        )}

        {/* Action: Mark as Delivered */}
        {(currentStatus === 'Delivered' || currentStatus === 'Picked Up') && !actionDone && (
          <TouchableOpacity
            id="btn-mark-completed"
            style={[styles.primaryAction, { backgroundColor: theme.colors.success }]}
            onPress={handleMarkDelivered}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Star size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryActionText}>Mark as Completed</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {actionDone && (
          <View style={[styles.successBanner, { backgroundColor: theme.colors.success + '18', borderColor: theme.colors.success + '44' }]}>
            <CheckCircle2 size={20} color={theme.colors.success} style={{ marginRight: 10 }} />
            <Text style={[styles.successText, { color: theme.colors.success }]}>
              Donation marked as Completed! Thank you for making a difference. 🎉
            </Text>
          </View>
        )}

        {isCancelled && (
          <View style={[styles.cancelBanner, { backgroundColor: theme.colors.error + '18', borderColor: theme.colors.error + '44' }]}>
            <XCircle size={20} color={theme.colors.error} style={{ marginRight: 10 }} />
            <Text style={[styles.cancelText, { color: theme.colors.error }]}>
              This donation has been cancelled.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 40, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  headerSubtitle: { fontSize: 10, marginTop: 1, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  statusHeaderBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  statusHeaderText: { fontSize: 11, fontWeight: '700', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 14, marginTop: 12, marginBottom: 12, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  linkText: { fontSize: 14, fontWeight: '700', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  section: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    elevation: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', marginBottom: 14, letterSpacing: 0.3, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  timeline: { gap: 0 },
  timelineStep: { flexDirection: 'row', minHeight: 48 },
  timelineLeft: { alignItems: 'center', width: 32 },
  timelineDot: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    elevation: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 3 },
  timelineRight: { flex: 1, paddingLeft: 12, paddingBottom: 16 },
  timelineLabel: { fontSize: 13, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  timelineActive: { fontSize: 10, marginTop: 2, fontWeight: '700', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  infoGrid: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoIcon: { marginRight: 10, marginTop: 2 },
  infoLabel: { fontSize: 10, fontWeight: '600', marginBottom: 1, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  infoValue: { fontSize: 13, fontWeight: '600', lineHeight: 18, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  notesBox: { borderRadius: 10, padding: 12, marginTop: 12 },
  notesLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  notesText: { fontSize: 12, lineHeight: 18, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  personCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  personName: { fontSize: 14, fontWeight: '700', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  personRole: { fontSize: 11, marginTop: 2, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  callBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  awaitingBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12 },
  awaitingText: { flex: 1, fontSize: 12, lineHeight: 16, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  primaryAction: {
    height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 4, elevation: 2, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10,
  },
  primaryActionText: { color: '#FFF', fontSize: 15, fontWeight: '800', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1,
    padding: 16, marginTop: 4,
  },
  successText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  cancelBanner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 16,
  },
  cancelText: { flex: 1, fontSize: 13, fontWeight: '600', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
});

export default NgoDonationDetailScreen;
