import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { ArrowLeft, Clock, ShieldCheck, MapPin, PhoneCall, QrCode } from 'lucide-react-native';
import { RootState } from '../../store';
import { DonationService } from '../../services/donationService';
import { AppTheme } from '../../theme/theme';
import MapMock from '../../components/MapMock';

interface TrackDonationScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

const MOCK_ACTIVE_DONATION = {
  _id: 'track001',
  foodType: 'Cooked Rice & Curry',
  quantity: 50,
  unit: 'Plates',
  status: 'Assigned',
  freshnessScore: 91,
  pickupAddress: '12 MG Road, Bengaluru',
  qrCode: 'QR-DEMO-001',
  donorDetails: { name: 'Rajesh Kumar', contactNumber: '+91-98765-43210' },
  ngoDetails: { name: 'Care & Feed Foundation', address: '45 Church Street, Bengaluru', contactNumber: '+91-80-2356-7890' },
  volunteerDetails: { name: 'Rohan Sharma', contactNumber: '+91-99887-65432' },
  createdAt: new Date(Date.now() - 3600000).toISOString(),
};


export const TrackDonationScreen: React.FC<TrackDonationScreenProps> = ({ theme, navigate }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [donation, setDonation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadActiveDonation = async () => {
    try {
      const donations = user?.id
        ? await DonationService.getDonations({ donorId: user.id })
        : [];
      const active = donations.find((d: any) =>
        ['Pending', 'Accepted', 'Assigned', 'Picked Up', 'Delivered'].includes(d.status)
      );
      setDonation(active || MOCK_ACTIVE_DONATION);
    } catch (error) {
      setDonation(MOCK_ACTIVE_DONATION);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveDonation();

    // Poll status updates every 7s to reflect simulated volunteer movement
    const interval = setInterval(() => {
      loadActiveDonation();
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!donation) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>No active donations to track.</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.primary }]} onPress={() => navigate('Dashboard')}>
          <Text style={styles.btnText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Define steps
  const steps = ['Pending', 'Accepted', 'Assigned', 'Picked Up', 'Completed'];
  const currentStepIndex = steps.indexOf(donation.status === 'Delivered' ? 'Picked Up' : donation.status);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-track-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Real-time Tracker</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Timeline Progress Bar */}
        <View style={[styles.timelineBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.timelineTitle, { color: theme.colors.text }]}>Delivery Timeline</Text>
          
          <View style={styles.stepsRow}>
            {steps.map((step, idx) => {
              const active = idx <= currentStepIndex;
              const isLast = idx === steps.length - 1;
              return (
                <View key={step} style={styles.stepItem}>
                  <View style={styles.stepBubbleRow}>
                    <View style={[
                      styles.bubble, 
                      { 
                        backgroundColor: active ? theme.colors.primary : 'rgba(128,128,128,0.2)',
                        borderColor: active ? theme.colors.primary : 'rgba(128,128,128,0.3)'
                      }
                    ]}>
                      <Text style={styles.bubbleNum}>{idx + 1}</Text>
                    </View>
                    {!isLast && (
                      <View style={[
                        styles.connector, 
                        { backgroundColor: idx < currentStepIndex ? theme.colors.primary : 'rgba(128,128,128,0.2)' }
                      ]} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, { color: active ? theme.colors.text : theme.colors.textSecondary }]}>
                    {step}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Map View */}
        {donation.status !== 'Pending' && donation.status !== 'Accepted' ? (
          <MapMock
            theme={theme}
            pickupLabel={donation.donorDetails?.name || 'Pickup Point'}
            deliveryLabel={donation.ngoDetails?.name || 'NGO Destination'}
            animateRoute={donation.status === 'Assigned' || donation.status === 'Picked Up'}
          />
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Clock size={32} color={theme.colors.accent} style={{ marginBottom: 10 }} />
            <Text style={[styles.placeholderTitle, { color: theme.colors.text }]}>Awaiting Claims</Text>
            <Text style={[styles.placeholderDesc, { color: theme.colors.textSecondary }]}>
              Once an NGO claims this donation and a volunteer is assigned, live GPS maps will load.
            </Text>
          </View>
        )}

        {/* QR Verification Receipt */}
        <View style={[styles.qrBox, { backgroundColor: theme.colors.card }]}>
          <View style={styles.qrHeader}>
            <QrCode size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.qrTitle, { color: theme.colors.text }]}>Verification QR Token</Text>
          </View>
          
          <View style={styles.qrRow}>
            <View style={styles.barcodeMock}>
              <View style={styles.bar1} />
              <View style={styles.bar2} />
              <View style={styles.bar3} />
              <View style={styles.bar4} />
              <View style={styles.bar2} />
              <View style={styles.bar1} />
              <View style={styles.bar3} />
            </View>
            <View style={styles.qrTextCol}>
              <Text style={[styles.qrCodeVal, { color: theme.colors.text }]}>{donation.qrCode}</Text>
              <Text style={[styles.qrDesc, { color: theme.colors.textSecondary }]}>
                Share this code with the volunteer on pickup or delivery to authorize cargo clearance.
              </Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={[styles.infoBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Listing Details</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Food Type:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>{donation.foodType}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Quantity:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>{donation.quantity} {donation.unit}</Text>
          </View>

          {donation.ngoDetails && (
            <View style={[styles.recipientCard, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.recipientTitle, { color: theme.colors.primary }]}>NGO Partner</Text>
              <Text style={[styles.recipientName, { color: theme.colors.text }]}>{donation.ngoDetails.name}</Text>
              <Text style={[styles.recipientContact, { color: theme.colors.textSecondary }]}>
                📞 {donation.ngoDetails.contactNumber}
              </Text>
            </View>
          )}

          {donation.volunteerDetails && (
            <View style={[styles.recipientCard, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.recipientTitle, { color: theme.colors.accent }]}>Assigned Volunteer</Text>
              <Text style={[styles.recipientName, { color: theme.colors.text }]}>{donation.volunteerDetails.name}</Text>
              <Text style={[styles.recipientContact, { color: theme.colors.textSecondary }]}>
                📞 {donation.volunteerDetails.contactNumber}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  timelineBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 14,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  stepItem: {
    alignItems: 'center',
    flex: 1
  },
  stepBubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center'
  },
  bubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5
  },
  bubbleNum: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700'
  },
  connector: {
    height: 2,
    flex: 1,
    position: 'absolute',
    left: '50%',
    right: '-50%',
    top: 9,
    zIndex: 1
  },
  stepLabel: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 16
  },
  placeholderTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  placeholderDesc: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  qrBox: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 16
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  qrTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  barcodeMock: {
    width: 70,
    height: 40,
    flexDirection: 'row',
    backgroundColor: 'rgba(128,128,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderRadius: 4
  },
  bar1: { width: 4, height: 32, backgroundColor: '#333', marginHorizontal: 2 },
  bar2: { width: 2, height: 32, backgroundColor: '#333', marginHorizontal: 2 },
  bar3: { width: 6, height: 32, backgroundColor: '#333', marginHorizontal: 2 },
  bar4: { width: 1, height: 32, backgroundColor: '#333', marginHorizontal: 2 },
  qrTextCol: {
    flex: 1
  },
  qrCodeVal: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  qrDesc: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  infoBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  recipientCard: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10
  },
  recipientTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  recipientName: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  recipientContact: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  btn: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif'
  }
});
export default TrackDonationScreen;
