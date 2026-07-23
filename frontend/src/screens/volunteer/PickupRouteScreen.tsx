import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft, CheckSquare, Sparkles, Navigation, QrCode, Phone, MapPin, Milestone, Clock, Calendar } from 'lucide-react-native';
import { RootState } from '../../store';
import { updateKarmaPoints } from '../../store/authSlice';
import { setSubStatus } from '../../store/volunteerSlice';
import VolunteerService from '../../services/volunteerService';
import NotificationService from '../../services/notificationService';
import { AppTheme } from '../../theme/theme';
import MapMock from '../../components/MapMock';
import OSMMap from '../../components/OSMMap';
import QRScannerMock from '../../components/QRScannerMock';
import { supabase } from '../../services/supabase';

interface PickupRouteScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}




export const PickupRouteScreen: React.FC<PickupRouteScreenProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { subStatuses } = useSelector((state: RootState) => state.volunteer);
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [completedSuccess, setCompletedSuccess] = useState(false);

  const fetchActiveTask = async () => {
    try {
      if (!user?.id) return;
      const assigned = await VolunteerService.getAssignedPickups(user.id);
      if (Array.isArray(assigned) && assigned.length > 0) {
        const active = assigned[0];
        // Fetch NGO details from Supabase if ngoId exists
        if (active.ngoId) {
          try {
            const { data: ngoProfile } = await supabase
              .from('profiles')
              .select('name, contact_number, address, latitude, longitude')
              .eq('id', active.ngoId)
              .single();
            if (ngoProfile) {
              active.ngoDetails = {
                name: ngoProfile.name,
                contactNumber: ngoProfile.contact_number,
                address: ngoProfile.address,
                latitude: ngoProfile.latitude,
                longitude: ngoProfile.longitude,
              };
            }
          } catch (e) {
            console.error('Error fetching NGO profile:', e);
          }
        }
        // Fetch Donor details from Supabase if donorId exists
        if (active.donorId) {
          try {
            const { data: donorProfile } = await supabase
              .from('profiles')
              .select('name, contact_number')
              .eq('id', active.donorId)
              .single();
            if (donorProfile) {
              active.donorDetails = {
                name: donorProfile.name,
                contactNumber: donorProfile.contact_number,
              };
            }
          } catch (e) {
            console.error('Error fetching donor profile:', e);
          }
        }
        setTask(active);
      } else {
        setTask(null);
      }
    } catch (err) {
      console.error('Fetch active task error:', err);
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveTask();
  }, []);

  const handleStartPickup = () => {
    if (!task) return;
    const taskId = task.id || task._id;
    dispatch(setSubStatus({ id: taskId, status: 'Pickup Started' }));
    
    // Write pickup reminder to the database
    NotificationService.createNotification({
      userId: user?.id || '',
      title: 'Pickup Commenced 🧭',
      message: `You started pickup for ${task.foodType}. Head to ${task.pickupAddress || 'donor site'}.`,
      type: 'pickup_reminder',
      relatedDonationId: taskId
    }).catch(err => console.error(err));
  };

  const handleConfirmPickup = async () => {
    if (!task) return;
    const taskId = task.id || task._id;
    setActionLoading(true);

    try {
      await VolunteerService.updateStatus(taskId, 'Picked Up', user?.id || '');
      dispatch(setSubStatus({ id: taskId, status: null }));
      await fetchActiveTask();
    } catch (error: any) {
      console.error('Confirm pickup error:', error);
      alert(error.message || 'Error updating pickup status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkInTransit = () => {
    if (!task) return;
    const taskId = task.id || task._id;
    dispatch(setSubStatus({ id: taskId, status: 'In Transit' }));

    // Write delivery reminder to the database
    NotificationService.createNotification({
      userId: user?.id || '',
      title: 'In Transit 🚚',
      message: `You are in transit to ${task.ngoDetails?.name || 'NGO'}. Please drive safely.`,
      type: 'delivery_reminder',
      relatedDonationId: taskId
    }).catch(err => console.error(err));
  };

  const handleMarkDelivered = async () => {
    if (!task) return;
    const taskId = task.id || task._id;
    setActionLoading(true);

    try {
      await VolunteerService.updateStatus(taskId, 'Delivered', user?.id || '');
      dispatch(setSubStatus({ id: taskId, status: null }));
      await fetchActiveTask();
    } catch (error: any) {
      console.error('Mark delivered error:', error);
      alert(error.message || 'Error updating status to Delivered.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScanSuccess = async (scannedCode: string) => {
    setShowScanner(false);
    setLoading(true);

    try {
      await VolunteerService.verifyQrCode(scannedCode);
      dispatch(updateKarmaPoints(50));
      setCompletedSuccess(true);
    } catch (error: any) {
      console.error('QR verification error:', error);
      alert(error.message || 'QR Code verification failed. Please check with the NGO.');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  // Determine current display status combining backend status and local sub-status
  const taskId = task ? (task.id || task._id) : '';
  const localSubStatus = subStatuses[taskId];
  const currentStatus = (localSubStatus || (task ? task.status : 'Assigned')) as string;

  // Status mapping to indices
  const statusSteps = ['Assigned', 'Pickup Started', 'Picked Up', 'In Transit', 'Delivered', 'Completed'];
  const currentStepIndex = statusSteps.indexOf(currentStatus);

  // Estimated distance and time (Simulated based on status)
  const estDistance = currentStatus === 'Pickup Started' ? '2.8 km' : currentStatus === 'In Transit' ? '3.5 km' : '0.0 km';
  const estTime = currentStatus === 'Pickup Started' ? '9 Mins' : currentStatus === 'In Transit' ? '12 Mins' : '0 Mins';

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (completedSuccess) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Sparkles size={48} color={theme.colors.primary} style={{ marginBottom: 16 }} />
        <Text style={[styles.successTitle, { color: theme.colors.text }]}>Delivery Completed!</Text>
        <Text style={[styles.successText, { color: theme.colors.textSecondary }]}>
          Excellent work! You successfully verified the donation QR code, delivered the food to the NGO, and earned +50 Karma Points!
        </Text>
        <TouchableOpacity
          id="btn-return-dashboard"
          style={[styles.btn, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigate('Dashboard')}
        >
          <Text style={styles.btnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>No active delivery tasks remaining.</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.primary }]} onPress={() => navigate('Dashboard')}>
          <Text style={styles.btnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-route-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Route Tracking Guide</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation Map — OpenStreetMap via Leaflet */}
        <OSMMap
          theme={theme}
          latitude={task.latitude ?? task.gpsLocation?.latitude ?? 12.9716}
          longitude={task.longitude ?? task.gpsLocation?.longitude ?? 77.5946}
          markers={[
            ((task.latitude && task.longitude) || (task.gpsLocation?.latitude && task.gpsLocation?.longitude))
              ? {
                  latitude: task.latitude ?? task.gpsLocation?.latitude,
                  longitude: task.longitude ?? task.gpsLocation?.longitude,
                  label: task.donorDetails?.name || task.donorName || 'Pickup',
                  color: theme.colors.accent
                }
              : { latitude: 12.9716, longitude: 77.5946, label: 'Pickup Point', color: theme.colors.accent },
            ...(task.ngoDetails?.latitude && task.ngoDetails?.longitude
              ? [{ latitude: task.ngoDetails.latitude, longitude: task.ngoDetails.longitude, label: task.ngoDetails?.name || 'NGO', color: theme.colors.primary }]
              : []),
          ]}
          height={240}
          zoom={13}
        />

        {/* 6-Step Status Timeline Stepper */}
        <View style={[styles.stepperBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.stepperBoxTitle, { color: theme.colors.text }]}>Delivery Progress Timeline</Text>
          <View style={styles.stepsRow}>
            {statusSteps.map((step, idx) => {
              const isActive = idx <= currentStepIndex;
              const isCompleted = idx < currentStepIndex;
              
              return (
                <View key={step} style={styles.stepWrapper}>
                  {idx > 0 && (
                    <View style={[
                      styles.connectorLine,
                      { backgroundColor: idx <= currentStepIndex ? theme.colors.primary : theme.colors.border }
                    ]} />
                  )}
                  <View style={[
                    styles.stepNode,
                    {
                      backgroundColor: isCompleted ? theme.colors.primary : isActive ? theme.colors.accent : theme.colors.card,
                      borderColor: isActive ? theme.colors.accent : theme.colors.border
                    }
                  ]}>
                    <Text style={[
                      styles.stepNodeText,
                      { color: isCompleted || isActive ? '#FFFFFF' : theme.colors.textSecondary }
                    ]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text style={[
                    styles.stepLabelText,
                    {
                      color: idx === currentStepIndex ? theme.colors.accent : theme.colors.textSecondary,
                      fontWeight: idx === currentStepIndex ? '800' : '500'
                    }
                  ]} numberOfLines={1}>
                    {step}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Cargo and Route stats card */}
        <View style={[styles.statusBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.statusStatsRow}>
            <View style={styles.statusStat}>
              <Milestone size={14} color={theme.colors.primary} />
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Distance</Text>
              <Text style={[styles.statVal, { color: theme.colors.text }]}>{estDistance}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusStat}>
              <Clock size={14} color={theme.colors.warning} />
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Est. Time</Text>
              <Text style={[styles.statVal, { color: theme.colors.text }]}>{estTime}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusStat}>
              <Milestone size={14} color={theme.colors.accent} />
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Freshness</Text>
              <Text style={[styles.statVal, { color: theme.colors.text }]}>{task.freshnessScore || 85}%</Text>
            </View>
          </View>
        </View>

        {/* Detailed Assigned Donation Info Card */}
        <View style={[styles.infoBox, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.infoBoxTitle, { color: theme.colors.text }]}>Assigned Donation Details</Text>
          
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Donation ID</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{task.id || task._id}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Food Item</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text, fontWeight: '700' }]}>
              {task.foodType} ({task.quantity} {task.unit})
            </Text>
          </View>

          <View style={styles.detailDivider} />

          {/* STOP 1: Pickup Donor */}
          <View style={styles.stopItem}>
            <View style={styles.stopDotWrapper}>
              <View style={[styles.stopDot, { backgroundColor: theme.colors.accent }]} />
              <View style={[styles.stopLine, { backgroundColor: theme.colors.border }]} />
            </View>
            <View style={styles.stopDetails}>
              <Text style={[styles.stopType, { color: theme.colors.accent }]}>PICKUP POINT (DONOR)</Text>
              <Text style={[styles.stopName, { color: theme.colors.text }]}>
                {task.donorDetails?.name || task.donorName || 'Local Donor'}
              </Text>
              <Text style={[styles.stopAddress, { color: theme.colors.textSecondary }]}>
                📍 {task.pickupAddress}
              </Text>
              {task.donorDetails?.contactNumber && (
                <TouchableOpacity style={styles.phoneBtn} onPress={() => handleCall(task.donorDetails?.contactNumber)}>
                  <Phone size={12} color={theme.colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.phoneText, { color: theme.colors.primary }]}>
                    {task.donorDetails?.contactNumber}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* STOP 2: Dropoff NGO */}
          <View style={styles.stopItem}>
            <View style={styles.stopDotWrapper}>
              <View style={[styles.stopDot, { backgroundColor: theme.colors.primary }]} />
            </View>
            <View style={styles.stopDetails}>
              <Text style={[styles.stopType, { color: theme.colors.primary }]}>DROPOFF POINT (NGO)</Text>
              <Text style={[styles.stopName, { color: theme.colors.text }]}>
                {task.ngoDetails?.name || task.ngoName || 'Welfare Center'}
              </Text>
              <Text style={[styles.stopAddress, { color: theme.colors.textSecondary }]}>
                📍 {task.ngoDetails?.address || '45 Karol Bagh, New Delhi'}
              </Text>
              {task.ngoDetails?.contactNumber && (
                <TouchableOpacity style={styles.phoneBtn} onPress={() => handleCall(task.ngoDetails?.contactNumber)}>
                  <Phone size={12} color={theme.colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.phoneText, { color: theme.colors.primary }]}>
                    {task.ngoDetails?.contactNumber}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Actions panel based on status */}
        <View style={styles.actionsPanel}>
          {currentStatus === 'Assigned' && (
            <TouchableOpacity
              id="btn-start-pickup"
              style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handleStartPickup}
            >
              <View style={styles.flexRow}>
                <Navigation size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Start Pickup Transit</Text>
              </View>
            </TouchableOpacity>
          )}

          {currentStatus === 'Pickup Started' && (
            <TouchableOpacity
              id="btn-confirm-pickup"
              style={[styles.actionBtn, { backgroundColor: theme.colors.accent }]}
              onPress={handleConfirmPickup}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.flexRow}>
                  <CheckSquare size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Confirm Pickup (Cargo Loaded)</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {currentStatus === 'Picked Up' && (
            <TouchableOpacity
              id="btn-mark-transit"
              style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handleMarkInTransit}
            >
              <View style={styles.flexRow}>
                <Navigation size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Mark In Transit (Heading to NGO)</Text>
              </View>
            </TouchableOpacity>
          )}

          {currentStatus === 'In Transit' && (
            <TouchableOpacity
              id="btn-confirm-delivered"
              style={[styles.actionBtn, { backgroundColor: theme.colors.accent }]}
              onPress={handleMarkDelivered}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.flexRow}>
                  <Navigation size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Mark Delivered (Arrived at NGO)</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {currentStatus === 'Delivered' && (
            <TouchableOpacity
              id="btn-verify-qr"
              style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowScanner(true)}
            >
              <QrCode size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Verify Delivery QR Code</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* QR scanner overlay modal */}
      {showScanner && (
        <QRScannerMock
          theme={theme}
          expectedCode={task.qrCode}
          onScanSuccess={handleScanSuccess}
          onCancel={() => setShowScanner(false)}
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
    fontFamily: 'System'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  stepperBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  stepperBoxTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    marginBottom: 16,
    fontFamily: 'System'
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative'
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
    position: 'relative'
  },
  connectorLine: {
    position: 'absolute',
    height: 2,
    left: '-50%',
    right: '50%',
    top: 10,
    zIndex: -1
  },
  stepNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  stepNodeText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'System'
  },
  stepLabelText: {
    fontSize: 7.5,
    textAlign: 'center',
    width: 48,
    fontFamily: 'System'
  },
  statusBox: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  statusStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusStat: {
    flex: 1,
    alignItems: 'center'
  },
  statusDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(128,128,128,0.2)'
  },
  statLabel: {
    fontSize: 8.5,
    fontWeight: '600',
    marginTop: 2,
    fontFamily: 'System'
  },
  statVal: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
    fontFamily: 'System'
  },
  infoBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  infoBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 14,
    fontFamily: 'System'
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  detailLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    fontFamily: 'System'
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'System'
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.1)',
    marginVertical: 10
  },
  stopItem: {
    flexDirection: 'row',
    marginBottom: 12
  },
  stopDotWrapper: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative'
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4
  },
  stopLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    minHeight: 35
  },
  stopDetails: {
    flex: 1
  },
  stopType: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
    fontFamily: 'System'
  },
  stopName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'System'
  },
  stopAddress: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
    fontFamily: 'System'
  },
  phoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 2
  },
  phoneText: {
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: 'System'
  },
  actionsPanel: {
    marginTop: 10
  },
  actionBtn: {
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'System'
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    fontFamily: 'System'
  },
  successText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 20,
    fontFamily: 'System'
  },
  btn: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'System'
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: 'System'
  }
});

export default PickupRouteScreen;
