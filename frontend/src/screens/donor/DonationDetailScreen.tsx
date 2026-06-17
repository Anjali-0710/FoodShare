import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft,
  Clock3,
  MapPin,
  PhoneCall,
  QrCode,
  Truck,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Package,
  Users,
  User,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';
import { RootState } from '../../store';
import { updateDonationInList } from '../../store/donationSlice';
import { apiCall } from '../../services/api';
import { AppTheme } from '../../theme/theme';

interface DonationDetailScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

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

const STEPS = ['Pending', 'Accepted', 'Assigned', 'Picked Up', 'Completed'];

const MOCK_DETAIL: any = {
  id: 'don_1',
  _id: 'don_1',
  foodType: 'Cooked Food',
  quantity: 50,
  unit: 'Plates',
  status: 'Assigned',
  pickupAddress: 'Connaught Place Main Circle, Near Metro Gate 3, New Delhi',
  contactNumber: '+919876543210',
  additionalNotes: 'Freshly cooked rice and lentils from afternoon buffet. Packaged cleanly.',
  freshnessScore: 82,
  qrCode: 'QR_DON_1_8954',
  temperature: 26,
  createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  bestBeforeDate: new Date(Date.now() + 4 * 3600000).toISOString(),
  donorDetails: { name: 'Green Bakery & Cafe', contactNumber: '+919876543210', email: 'donor@foodshare.com' },
  ngoDetails: { name: 'Care & Feed Foundation NGO', contactNumber: '+919999888877', email: 'ngo@foodshare.com' },
  volunteerDetails: { name: 'Rohan Sharma', contactNumber: '+919555444333', email: 'volunteer@foodshare.com' },
};

export const DonationDetailScreen: React.FC<DonationDetailScreenProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);
  const activeItem = useSelector((state: RootState) => state.donation.activeItem);

  const [donation, setDonation] = useState<any>(activeItem || MOCK_DETAIL);
  const [loading, setLoading] = useState(!activeItem);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = async () => {
    if (!activeItem) return;
    try {
      const id = activeItem.id || (activeItem as any)._id;
      const res = await apiCall(`/donations/${id}`, { token });
      if (res.success) {
        setDonation(res.donation);
      }
    } catch {
      // Use activeItem as fallback
      setDonation({ ...MOCK_DETAIL, ...activeItem });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, []);

  const handleCancel = async () => {
    if (donation?.status !== 'Pending') {
      setError('Only Pending donations can be cancelled.');
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      const id = donation.id || donation._id;
      const res = await apiCall(`/donations/${id}/status`, {
        method: 'PUT',
        body: { status: 'Cancelled' },
        token,
      });
      if (res.success) {
        const updated = { ...donation, status: 'Cancelled' };
        setDonation(updated);
        dispatch(updateDonationInList(updated));
      } else {
        setError(res.message || 'Failed to cancel donation.');
      }
    } catch {
      // Optimistic update for offline mode
      const updated = { ...donation, status: 'Cancelled' };
      setDonation(updated);
      dispatch(updateDonationInList(updated));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading details...</Text>
      </View>
    );
  }

  if (!donation) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.textSecondary }}>Donation not found.</Text>
        <TouchableOpacity onPress={() => navigate('DonationList')} style={[styles.backToDashBtn, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.backToDashText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = getStatusColor(donation.status, theme);
  const currentStepIndex = STEPS.indexOf(donation.status === 'Delivered' ? 'Picked Up' : donation.status);
  const canCancel = donation.status === 'Pending' && user?.role === 'donor';
  const isCancelled = donation.status === 'Cancelled';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('DonationList')} id="btn-detail-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Donation Details</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadDetails} id="btn-detail-refresh">
          <RefreshCw size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '15', borderColor: statusColor + '40' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusBannerText, { color: statusColor }]}>{donation.status}</Text>
          {isCancelled && <XCircle size={16} color={statusColor} style={{ marginLeft: 8 }} />}
        </View>

        {/* Error message */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '15' }]}>
            <AlertTriangle size={14} color={theme.colors.error} style={{ marginRight: 6 }} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Timeline Progress */}
        {!isCancelled && (
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Delivery Timeline</Text>
            <View style={styles.stepsRow}>
              {STEPS.map((step, idx) => {
                const isActive = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isLast = idx === STEPS.length - 1;
                const stepColor = isActive ? theme.colors.primary : 'rgba(128,128,128,0.25)';
                return (
                  <View key={step} style={styles.stepItem}>
                    <View style={styles.stepBubbleRow}>
                      <View style={[styles.bubble, { backgroundColor: isActive ? theme.colors.primary : theme.colors.card, borderColor: stepColor, borderWidth: isCurrent ? 2 : 1 }]}>
                        {isActive && <CheckCircle2 size={10} color="#FFFFFF" />}
                      </View>
                      {!isLast && (
                        <View style={[styles.connector, { backgroundColor: idx < currentStepIndex ? theme.colors.primary : 'rgba(128,128,128,0.2)' }]} />
                      )}
                    </View>
                    <Text style={[styles.stepLabel, { color: isActive ? theme.colors.text : theme.colors.textSecondary }]}>{step}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Donation Info Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Donation Information</Text>

          <InfoRow label="Food Category" value={donation.foodType} theme={theme} />
          <InfoRow label="Quantity" value={`${donation.quantity} ${donation.unit}`} theme={theme} />
          <InfoRow label="AI Freshness Score" value={`${donation.freshnessScore || '—'}%`} theme={theme} valueColor={
            (donation.freshnessScore || 80) >= 75 ? theme.colors.success :
            (donation.freshnessScore || 80) >= 50 ? theme.colors.warning : theme.colors.error
          } />
          <InfoRow label="Temperature" value={donation.temperature ? `${donation.temperature}°C` : 'N/A'} theme={theme} />
          <InfoRow label="Listed On" value={new Date(donation.createdAt).toLocaleString()} theme={theme} />
          {donation.bestBeforeDate && (
            <InfoRow label="Best Before" value={new Date(donation.bestBeforeDate).toLocaleString()} theme={theme} />
          )}
        </View>

        {/* Pickup Details */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Pickup Details</Text>
          <View style={styles.iconRow}>
            <MapPin size={14} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.iconRowText, { color: theme.colors.text }]}>{donation.pickupAddress}</Text>
          </View>
          {donation.contactNumber && (
            <View style={[styles.iconRow, { marginTop: 10 }]}>
              <PhoneCall size={14} color={theme.colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.iconRowText, { color: theme.colors.text }]}>{donation.contactNumber}</Text>
            </View>
          )}
          {donation.additionalNotes && (
            <View style={[styles.notesBox, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.notesLabel, { color: theme.colors.textSecondary }]}>Additional Notes</Text>
              <Text style={[styles.notesText, { color: theme.colors.text }]}>{donation.additionalNotes}</Text>
            </View>
          )}
        </View>

        {/* QR Verification Code */}
        {donation.qrCode && !isCancelled && (
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.cardTitleRow}>
              <QrCode size={15} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Verification QR Code</Text>
            </View>
            <View style={styles.qrDisplay}>
              <View style={styles.barcodeMock}>
                {[4, 2, 6, 1, 3, 2, 5].map((w, i) => (
                  <View key={i} style={{ width: w, height: 36, backgroundColor: theme.dark ? '#EEE' : '#222', marginHorizontal: 1.5 }} />
                ))}
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.qrCode, { color: theme.colors.text }]}>{donation.qrCode}</Text>
                <Text style={[styles.qrDesc, { color: theme.colors.textSecondary }]}>
                  Share with volunteer on pickup to complete verification.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Stakeholder Cards */}
        {donation.ngoDetails && (
          <View style={[styles.stakeholderCard, { backgroundColor: theme.colors.accent + '10', borderColor: theme.colors.accent + '30' }]}>
            <View style={styles.stakeholderHeader}>
              <Users size={14} color={theme.colors.accent} />
              <Text style={[styles.stakeholderRole, { color: theme.colors.accent }]}>NGO Partner</Text>
            </View>
            <Text style={[styles.stakeholderName, { color: theme.colors.text }]}>{donation.ngoDetails.name}</Text>
            {donation.ngoDetails.contactNumber && (
              <Text style={[styles.stakeholderContact, { color: theme.colors.textSecondary }]}>
                📞 {donation.ngoDetails.contactNumber}
              </Text>
            )}
          </View>
        )}

        {donation.volunteerDetails && (
          <View style={[styles.stakeholderCard, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF630' }]}>
            <View style={styles.stakeholderHeader}>
              <User size={14} color="#8B5CF6" />
              <Text style={[styles.stakeholderRole, { color: '#8B5CF6' }]}>Assigned Volunteer</Text>
            </View>
            <Text style={[styles.stakeholderName, { color: theme.colors.text }]}>{donation.volunteerDetails.name}</Text>
            {donation.volunteerDetails.contactNumber && (
              <Text style={[styles.stakeholderContact, { color: theme.colors.textSecondary }]}>
                📞 {donation.volunteerDetails.contactNumber}
              </Text>
            )}
          </View>
        )}

        {/* Cancel Button (only for Pending donations) */}
        {canCancel && (
          <TouchableOpacity
            id="btn-cancel-donation"
            style={[styles.cancelBtn, { borderColor: theme.colors.error }]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <>
                <XCircle size={16} color={theme.colors.error} style={{ marginRight: 8 }} />
                <Text style={[styles.cancelBtnText, { color: theme.colors.error }]}>Cancel Donation</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          id="btn-detail-back-dash"
          style={[styles.dashBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigate('DonationList')}
        >
          <Text style={styles.dashBtnText}>Back to My Donations</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// Helper Component
const InfoRow: React.FC<{ label: string; value: string; theme: AppTheme; valueColor?: string }> = ({
  label, value, theme, valueColor,
}) => (
  <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: valueColor || theme.colors.text }]}>{value}</Text>
  </View>
);

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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  refreshBtn: { padding: 8 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusBannerText: { fontSize: 14, fontWeight: '800', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { fontSize: 12, fontWeight: '600', flex: 1, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepBubbleRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center', position: 'relative' },
  bubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  connector: {
    height: 2,
    flex: 1,
    position: 'absolute',
    left: '50%',
    right: '-50%',
    top: 10,
    zIndex: 1,
  },
  stepLabel: { fontSize: 8, fontWeight: '700', marginTop: 6, textAlign: 'center', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 12, fontWeight: '600', flex: 1, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  infoValue: { fontSize: 12, fontWeight: '700', flex: 1, textAlign: 'right', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  iconRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconRowText: { fontSize: 13, flex: 1, lineHeight: 18, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  notesBox: { borderRadius: 12, padding: 10, marginTop: 12 },
  notesLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  notesText: { fontSize: 12, lineHeight: 18, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  qrDisplay: { flexDirection: 'row', alignItems: 'center' },
  barcodeMock: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 6,
  },
  qrCode: { fontSize: 14, fontWeight: '800', letterSpacing: 1, marginBottom: 4, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  qrDesc: { fontSize: 10, lineHeight: 14, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  stakeholderCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  stakeholderHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stakeholderRole: { fontSize: 11, fontWeight: '800', marginLeft: 6, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  stakeholderName: { fontSize: 14, fontWeight: '700', marginBottom: 2, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  stakeholderContact: { fontSize: 11, marginTop: 2, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  dashBtn: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dashBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { fontSize: 12, marginTop: 12, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
  backToDashBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  backToDashText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, fontFamily: 'Outfit, system-ui, -apple-system, sans-serif' },
});

export default DonationDetailScreen;
