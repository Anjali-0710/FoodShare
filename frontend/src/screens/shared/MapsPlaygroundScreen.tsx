import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft, MapPin, Navigation, Milestone, Clock, CheckCircle, AlertTriangle, ShieldAlert, Sliders, RefreshCw } from 'lucide-react-native';
import { RootState } from '../../store';
import { AppTheme } from '../../theme/theme';
import LocationService from '../../services/locationService';
import OSMMap from '../../components/OSMMap';
import { supabase } from '../../services/supabase';
import { updateProfile } from '../../store/authSlice';

interface MapsPlaygroundScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

export const MapsPlaygroundScreen: React.FC<MapsPlaygroundScreenProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state: RootState) => state.auth);

  // Map settings - center on user's profile location if exists, otherwise Bangalore center
  const [selectedLat, setSelectedLat] = useState(user?.gpsLocation?.latitude?.toString() || '12.9716');
  const [selectedLon, setSelectedLon] = useState(user?.gpsLocation?.longitude?.toString() || '77.5946');

  // Database-backed states
  const [ngos, setNgos] = useState<any[]>([]);
  const [activeDonation, setActiveDonation] = useState<any>(null);
  const [assignedVolunteer, setAssignedVolunteer] = useState<any>(null);
  const [assignedNgo, setAssignedNgo] = useState<any>(null);

  // Status/Calculation states
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [distResult, setDistResult] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [etaResult, setEtaResult] = useState<any>(null);

  // Fetch active NGO users & volunteer details from Supabase on mount
  const fetchSupabaseData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch active NGO user profiles from profiles table
      const { data: ngosData, error: ngosError } = await supabase
        .from('profiles')
        .select('id, name, latitude, longitude, address, contact_number')
        .eq('role', 'ngo')
        .eq('is_active', true);

      if (ngosError) throw ngosError;

      if (ngosData) {
        // Filter out those without valid coordinates
        const validNgos = ngosData.filter(ngo => ngo.latitude !== null && ngo.longitude !== null);
        setNgos(validNgos);
      }

      // 2. Fetch current active donation for the donor
      const { data: donationsData, error: donationsError } = await supabase
        .from('donations')
        .select('*')
        .eq('donor_id', user.id)
        .in('status', ['Pending', 'Accepted', 'Assigned', 'Picked Up', 'Delivered'])
        .order('created_at', { ascending: false });

      if (donationsError) throw donationsError;

      if (donationsData && donationsData.length > 0) {
        const active = donationsData[0];
        setActiveDonation(active);

        // Fetch NGO details if assigned to this donation
        if (active.ngo_id) {
          const { data: ngoProfile } = await supabase
            .from('profiles')
            .select('id, name, latitude, longitude, address, contact_number')
            .eq('id', active.ngo_id)
            .single();
          if (ngoProfile) {
            setAssignedNgo(ngoProfile);
          }
        } else {
          setAssignedNgo(null);
        }

        // Fetch volunteer details if assigned to this donation
        if (active.volunteer_id) {
          const { data: volunteerProfile } = await supabase
            .from('profiles')
            .select('id, name, latitude, longitude, contact_number')
            .eq('id', active.volunteer_id)
            .single();
          if (volunteerProfile) {
            setAssignedVolunteer(volunteerProfile);
          }
        } else {
          setAssignedVolunteer(null);
        }
      } else {
        setActiveDonation(null);
        setAssignedNgo(null);
        setAssignedVolunteer(null);
      }
    } catch (err) {
      console.warn('Error fetching Supabase map data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupabaseData();
  }, [user?.id]);

  // Geolocation detection
  const handleDetectLocation = () => {
    setLoading(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lon = position.coords.longitude.toFixed(4);
          setSelectedLat(lat);
          setSelectedLon(lon);
          setLoading(false);
        },
        (error) => {
          console.warn('Geolocation blocked or unavailable. Falling back to default coordinates.', error);
          const randLat = (12.9716 + (Math.random() - 0.5) * 0.05).toFixed(4);
          const randLon = (77.5946 + (Math.random() - 0.5) * 0.05).toFixed(4);
          setSelectedLat(randLat);
          setSelectedLon(randLon);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      const randLat = (12.9716 + (Math.random() - 0.5) * 0.05).toFixed(4);
      const randLon = (77.5946 + (Math.random() - 0.5) * 0.05).toFixed(4);
      setSelectedLat(randLat);
      setSelectedLon(randLon);
      setLoading(false);
    }
  };

  // Save coordinates to Supabase profiles
  const handleSaveLocation = async () => {
    if (!user) return;
    setSaveLoading(true);
    setSaveMessage(null);
    try {
      const latVal = Number(selectedLat);
      const lonVal = Number(selectedLon);

      if (isNaN(latVal) || isNaN(lonVal) || latVal < -90 || latVal > 90 || lonVal < -180 || lonVal > 180) {
        setSaveMessage({ type: 'error', text: 'Invalid coordinate range bounds.' });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          latitude: latVal,
          longitude: lonVal
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update Redux state
      dispatch(updateProfile({
        gpsLocation: { latitude: latVal, longitude: lonVal }
      }));

      setSaveMessage({ type: 'success', text: 'Pickup location saved successfully!' });
      
      // Auto-dismiss message
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving location:', err);
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save location.' });
    } finally {
      setSaveLoading(false);
    }
  };

  // Perform Calculations (Haversine to closest NGO)
  const handleCalculateDistance = async () => {
    setLoading(true);
    try {
      if (ngos.length === 0) {
        setDistResult(null);
        return;
      }

      let closestNgo = ngos[0];
      let minDistance = Infinity;
      const donorLatVal = Number(selectedLat);
      const donorLonVal = Number(selectedLon);

      ngos.forEach(ngo => {
        if (ngo.latitude !== null && ngo.longitude !== null) {
          const dist = getLocalHaversine(donorLatVal, donorLonVal, ngo.latitude, ngo.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            closestNgo = ngo;
          }
        }
      });

      const res = await LocationService.calculateDistance(
        donorLatVal,
        donorLonVal,
        closestNgo.latitude,
        closestNgo.longitude,
        token
      );
      if (res.success) {
        setDistResult(res.distance);
      } else {
        setDistResult(minDistance);
      }
    } catch (err: any) {
      // Local fallback calculation
      if (ngos.length > 0) {
        let minDistance = Infinity;
        const donorLatVal = Number(selectedLat);
        const donorLonVal = Number(selectedLon);

        ngos.forEach(ngo => {
          if (ngo.latitude !== null && ngo.longitude !== null) {
            const dist = getLocalHaversine(donorLatVal, donorLonVal, ngo.latitude, ngo.longitude);
            if (dist < minDistance) {
              minDistance = dist;
            }
          }
        });
        setDistResult(minDistance);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleValidateLocation = async () => {
    setLoading(true);
    try {
      const res = await LocationService.validateCoordinates(Number(selectedLat), Number(selectedLon), token);
      if (res.success) {
        setValidationResult(res);
      }
    } catch (err: any) {
      const latVal = Number(selectedLat);
      const lonVal = Number(selectedLon);
      if (isNaN(latVal) || isNaN(lonVal) || latVal < -90 || latVal > 90 || lonVal < -180 || lonVal > 180) {
        setValidationResult({ success: true, valid: false, message: 'Invalid coordinates range bounds.' });
      } else {
        const hubDist = getLocalHaversine(latVal, lonVal, 12.9716, 77.5946);
        if (hubDist > 100) {
          setValidationResult({
            success: true,
            valid: false,
            message: `Location is too far (${hubDist.toFixed(1)} km) from Bangalore service center hub. Must be within 100km.`
          });
        } else {
          setValidationResult({
            success: true,
            valid: true,
            message: 'Location parameters validated successfully within operating boundaries'
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRouteETA = async () => {
    setLoading(true);
    try {
      if (ngos.length === 0) {
        setEtaResult(null);
        return;
      }

      let closestNgo = ngos[0];
      let minDistance = Infinity;
      const donorLatVal = Number(selectedLat);
      const donorLonVal = Number(selectedLon);

      ngos.forEach(ngo => {
        if (ngo.latitude !== null && ngo.longitude !== null) {
          const dist = getLocalHaversine(donorLatVal, donorLonVal, ngo.latitude, ngo.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            closestNgo = ngo;
          }
        }
      });

      const volLat = assignedVolunteer?.latitude ?? (donorLatVal + 0.01);
      const volLon = assignedVolunteer?.longitude ?? (donorLonVal - 0.01);

      const res = await LocationService.getRouteDetails(
        Number(volLat),
        Number(volLon),
        donorLatVal,
        donorLonVal,
        closestNgo.latitude,
        closestNgo.longitude,
        token
      );
      if (res.success) {
        setEtaResult(res.route);
      } else {
        throw new Error('API route failed');
      }
    } catch (err: any) {
      if (ngos.length > 0) {
        let closestNgo = ngos[0];
        let minDistance = Infinity;
        const donorLatVal = Number(selectedLat);
        const donorLonVal = Number(selectedLon);

        ngos.forEach(ngo => {
          if (ngo.latitude !== null && ngo.longitude !== null) {
            const dist = getLocalHaversine(donorLatVal, donorLonVal, ngo.latitude, ngo.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              closestNgo = ngo;
            }
          }
        });

        const volLat = assignedVolunteer?.latitude ?? (donorLatVal + 0.01);
        const volLon = assignedVolunteer?.longitude ?? (donorLonVal - 0.01);

        const leg1 = getLocalHaversine(volLat, volLon, donorLatVal, donorLonVal);
        const leg2 = getLocalHaversine(donorLatVal, donorLonVal, closestNgo.latitude, closestNgo.longitude);
        const speedKmMin = 30 / 60;
        const leg1Duration = Math.round(leg1 / speedKmMin + 4);
        const leg2Duration = Math.round(leg2 / speedKmMin + 4);
        setEtaResult({
          totalDistance: Math.round((leg1 + leg2) * 100) / 100,
          totalDuration: leg1Duration + leg2Duration,
          legs: [
            { name: 'Volunteer to Donor Pickup', distance: leg1, duration: leg1Duration },
            { name: 'Donor Pickup to NGO Dropoff', distance: leg2, duration: leg2Duration }
          ]
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Local calculation fallback helper
  const getLocalHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  };

  // Compile active polyline route coordinates
  const getPolylineCoords = () => {
    if (activeDonation && assignedNgo && assignedNgo.latitude !== null && assignedNgo.longitude !== null) {
      const donorLatVal = activeDonation.latitude ?? Number(selectedLat);
      const donorLonVal = activeDonation.longitude ?? Number(selectedLon);
      return [
        { latitude: donorLatVal, longitude: donorLonVal },
        { latitude: assignedNgo.latitude, longitude: assignedNgo.longitude }
      ];
    } else if (ngos.length > 0) {
      // Demo fallback route to the closest NGO
      let closestNgo = ngos[0];
      let minDistance = Infinity;
      const donorLatVal = Number(selectedLat);
      const donorLonVal = Number(selectedLon);

      ngos.forEach(ngo => {
        if (ngo.latitude !== null && ngo.longitude !== null) {
          const dist = getLocalHaversine(donorLatVal, donorLonVal, ngo.latitude, ngo.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            closestNgo = ngo;
          }
        }
      });

      if (closestNgo && closestNgo.latitude !== null && closestNgo.longitude !== null) {
        return [
          { latitude: donorLatVal, longitude: donorLonVal },
          { latitude: closestNgo.latitude, longitude: closestNgo.longitude }
        ];
      }
    }
    return [];
  };

  // Compile map markers
  const getMapMarkers = () => {
    const markers = [
      {
        latitude: Number(selectedLat) || 12.9716,
        longitude: Number(selectedLon) || 77.5946,
        label: 'My Selected Pickup',
        color: '#EF4444' // Red
      },
      ...ngos.map(ngo => ({
        latitude: ngo.latitude,
        longitude: ngo.longitude,
        label: `NGO: ${ngo.name}`,
        color: '#10B981' // Green
      })),
      ...(assignedVolunteer && assignedVolunteer.latitude !== null && assignedVolunteer.longitude !== null ? [{
        latitude: assignedVolunteer.latitude,
        longitude: assignedVolunteer.longitude,
        label: `Assigned Volunteer: ${assignedVolunteer.name}`,
        color: '#3B82F6' // Blue
      }] : [])
    ];
    return markers;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Banner */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-maps-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Maps & Location Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Real OpenStreetMap Selection Component */}
        <OSMMap
          theme={theme}
          latitude={Number(selectedLat) || 12.9716}
          longitude={Number(selectedLon) || 77.5946}
          interactive
          onLocationSelect={(lat, lng) => {
            setSelectedLat(lat.toFixed(4));
            setSelectedLon(lng.toFixed(4));
            setValidationResult(null);
          }}
          markers={getMapMarkers()}
          polyline={getPolylineCoords()}
          height={320}
          zoom={12}
        />

        {/* Input Parameters Controls */}
        <View style={[styles.settingsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Sliders size={16} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Location Coordinates (Selected)</Text>
          </View>

          <View style={styles.inputsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Latitude</Text>
              <TextInput
                id="input-selected-lat"
                style={[styles.paramInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={selectedLat}
                onChangeText={(val) => { setSelectedLat(val); setValidationResult(null); }}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Longitude</Text>
              <TextInput
                id="input-selected-lon"
                style={[styles.paramInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                value={selectedLon}
                onChangeText={(val) => { setSelectedLon(val); setValidationResult(null); }}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              id="btn-detect-location"
              style={[styles.locBtn, { backgroundColor: theme.colors.surface, marginRight: 8 }]}
              onPress={handleDetectLocation}
            >
              <RefreshCw size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.locBtnText, { color: theme.colors.text }]}>Detect Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              id="btn-save-profile-location"
              style={[styles.locBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handleSaveLocation}
              disabled={saveLoading}
            >
              {saveLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MapPin size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={[styles.locBtnText, { color: '#FFFFFF' }]}>Save to Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {saveMessage && (
            <View style={[
              styles.validationBox,
              {
                backgroundColor: saveMessage.type === 'success' ? theme.colors.primary + '1F' : theme.colors.error + '1F',
                borderColor: saveMessage.type === 'success' ? theme.colors.primary : theme.colors.error,
                marginTop: 10
              }
            ]}>
              <Text style={{ fontSize: 11, color: theme.colors.text, fontWeight: '600' }}>
                {saveMessage.text}
              </Text>
            </View>
          )}
        </View>

        {/* Validation Checks outcomes */}
        <View style={[styles.settingsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <CheckCircle size={16} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Coordinates Range & Radius Validation</Text>
          </View>

          <TouchableOpacity
            id="btn-validate-location"
            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleValidateLocation}
          >
            <Text style={styles.btnText}>Validate Location</Text>
          </TouchableOpacity>

          {validationResult && (
            <View style={[
              styles.validationBox,
              {
                backgroundColor: validationResult.valid ? theme.colors.primary + '1F' : theme.colors.error + '1F',
                borderColor: validationResult.valid ? theme.colors.primary : theme.colors.error
              }
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                {validationResult.valid ? (
                  <CheckCircle size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                ) : (
                  <AlertTriangle size={16} color={theme.colors.error} style={{ marginRight: 6 }} />
                )}
                <Text style={{ fontSize: 12, fontWeight: '700', color: validationResult.valid ? theme.colors.primary : theme.colors.error }}>
                  {validationResult.valid ? 'VALID LOCATION BOUNDS' : 'VALIDATION FAILED'}
                </Text>
              </View>
              <Text style={{ fontSize: 10.5, color: theme.colors.text }}>{validationResult.message}</Text>
            </View>
          )}
        </View>

        {/* Distance Calculations Leg */}
        <View style={[styles.settingsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Milestone size={16} color={theme.colors.accent} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Distance Calculation (Haversine)</Text>
          </View>

          <Text style={[styles.bodyText, { color: theme.colors.textSecondary, marginBottom: 10 }]}>
            Computes distance from your selected pickup point to the nearest active NGO center.
          </Text>

          <TouchableOpacity
            id="btn-calculate-distance"
            style={[styles.primaryBtn, { backgroundColor: theme.colors.accent }]}
            onPress={handleCalculateDistance}
          >
            <Text style={styles.btnText}>Calculate Distance (Km)</Text>
          </TouchableOpacity>

          {distResult !== null && (
            <View style={[styles.resultBox, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>Calculated Distance:</Text>
              <Text style={[styles.resultValue, { color: theme.colors.text }]}>{distResult.toFixed(2)} km</Text>
            </View>
          )}
        </View>

        {/* ETA & Travel Routes Details */}
        <View style={[styles.settingsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Clock size={16} color={theme.colors.info} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Volunteer Pickup Route & Travel ETA</Text>
          </View>

          <Text style={[styles.bodyText, { color: theme.colors.textSecondary, marginBottom: 10 }]}>
            Plans route details: Volunteer ➔ Your Selected Location ➔ Closest NGO Center.
          </Text>

          <TouchableOpacity
            id="btn-calculate-route-eta"
            style={[styles.primaryBtn, { backgroundColor: theme.colors.info }]}
            onPress={handleCalculateRouteETA}
          >
            <Text style={styles.btnText}>Estimate Driving Route & ETA</Text>
          </TouchableOpacity>

          {etaResult && (
            <View style={[styles.resultBox, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.etaHeader}>
                <View>
                  <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>Total Route Distance:</Text>
                  <Text style={[styles.resultValue, { color: theme.colors.text }]}>{etaResult.totalDistance} km</Text>
                </View>
                <View>
                  <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>Estimated Total Duration:</Text>
                  <Text style={[styles.resultValue, { color: theme.colors.primary }]}>{etaResult.totalDuration} Mins</Text>
                </View>
              </View>

              <Text style={[styles.etaSectionTitle, { color: theme.colors.text }]}>Legs Details:</Text>
              {etaResult.legs.map((leg: any, idx: number) => (
                <View key={`leg_${idx}`} style={styles.legCard}>
                  <Text style={[styles.legName, { color: theme.colors.text }]}>{idx + 1}. {leg.name}</Text>
                  <Text style={{ fontSize: 10, color: theme.colors.textSecondary }}>
                    Distance: {leg.distance.toFixed(2)} km • Est: {leg.duration} Mins
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {loading && (
        <View style={styles.globalLoader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
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
    borderBottomWidth: 1
  },
  backBtn: {
    padding: 8
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  settingsCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    elevation: 1
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800'
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10
  },
  inputLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    marginBottom: 4
  },
  paramInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 11
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2
  },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  locBtnText: {
    fontSize: 10.5,
    fontWeight: '700'
  },
  primaryBtn: {
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12
  },
  bodyText: {
    fontSize: 10.5,
    lineHeight: 14
  },
  validationBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1
  },
  resultBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8
  },
  resultLabel: {
    fontSize: 9.5,
    fontWeight: '600'
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2
  },
  etaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  etaSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
    paddingTop: 8
  },
  legCard: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.05)'
  },
  legName: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2
  },
  globalLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000
  }
});

export default MapsPlaygroundScreen;
