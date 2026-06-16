import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { ArrowLeft, MapPin, Navigation, Milestone, Clock, CheckCircle, AlertTriangle, ShieldAlert, Sliders, RefreshCw } from 'lucide-react';
import { RootState } from '../../store';
import { AppTheme } from '../../theme/theme';
import LocationService from '../../services/locationService';

interface MapsPlaygroundScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

export const MapsPlaygroundScreen: React.FC<MapsPlaygroundScreenProps> = ({ theme, navigate }) => {
  const { token, user } = useSelector((state: RootState) => state.auth);

  // Map settings
  const [selectedLat, setSelectedLat] = useState('12.9716'); // Bangalore default
  const [selectedLon, setSelectedLon] = useState('77.5946');
  
  // Multi-pin targets
  const [donorLat, setDonorLat] = useState('12.9812');
  const [donorLon, setDonorLon] = useState('77.6321');
  const [ngoLat, setNgoLat] = useState('12.9482');
  const [ngoLon, setNgoLon] = useState('77.5684');

  // Calculations states
  const [loading, setLoading] = useState(false);
  const [distResult, setDistResult] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [etaResult, setEtaResult] = useState<any>(null);

  // Active overlay path display config
  const [activeRouteType, setActiveRouteType] = useState<'none' | 'volunteer_to_donor' | 'donor_to_ngo' | 'full_route'>('none');

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
          // Set to randomized Bangalore coordinate nearby
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

  // Perform Calculations
  const handleCalculateDistance = async () => {
    setLoading(true);
    try {
      const res = await LocationService.calculateDistance(
        Number(selectedLat),
        Number(selectedLon),
        Number(donorLat),
        Number(donorLon),
        token
      );
      if (res.success) {
        setDistResult(res.distance);
      }
    } catch (err: any) {
      // Local fallback calculation if backend issues
      const d = getLocalHaversine(Number(selectedLat), Number(selectedLon), Number(donorLat), Number(donorLon));
      setDistResult(d);
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
      // Local fallback validate
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
      const res = await LocationService.getRouteDetails(
        Number(selectedLat), // Volunteer start coords
        Number(selectedLon),
        Number(donorLat),
        Number(donorLon),
        Number(ngoLat),
        Number(ngoLon),
        token
      );
      if (res.success) {
        setEtaResult(res.route);
        setActiveRouteType('full_route');
      }
    } catch (err: any) {
      // Local fallback calculation
      const leg1 = getLocalHaversine(Number(selectedLat), Number(selectedLon), Number(donorLat), Number(donorLon));
      const leg2 = getLocalHaversine(Number(donorLat), Number(donorLon), Number(ngoLat), Number(ngoLon));
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
      setActiveRouteType('full_route');
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

  // Interactive Grid Select
  const handleGridClick = (xPercent: number, yPercent: number) => {
    // Map grid percents to Bangalore coordinate box:
    // Latitude: 12.92 to 13.02
    // Longitude: 77.53 to 77.65
    const latMin = 12.92;
    const latMax = 13.02;
    const lonMin = 77.53;
    const lonMax = 77.65;

    const computedLat = (latMax - (yPercent / 100) * (latMax - latMin)).toFixed(4);
    const computedLon = (lonMin + (xPercent / 100) * (lonMax - lonMin)).toFixed(4);

    setSelectedLat(computedLat);
    setSelectedLon(computedLon);
    setValidationResult(null);
  };

  // Helper to place markers in percentage bounds of grid
  // Lat range [12.92, 13.02], Lon range [77.53, 77.65]
  const getGridPosition = (latStr: string, lonStr: string) => {
    const latVal = Number(latStr);
    const lonVal = Number(lonStr);
    const latMin = 12.92;
    const latMax = 13.02;
    const lonMin = 77.53;
    const lonMax = 77.65;

    // Percentages
    let x = ((lonVal - lonMin) / (lonMax - lonMin)) * 100;
    let y = ((latMax - latVal) / (latMax - latMin)) * 100;

    // Clamp bounds
    x = Math.max(2, Math.min(95, x));
    y = Math.max(2, Math.min(95, y));

    return { x: `${x}%`, y: `${y}%` };
  };

  const currentPos = getGridPosition(selectedLat, selectedLon);
  const donorPos = getGridPosition(donorLat, donorLon);
  const ngoPos = getGridPosition(ngoLat, ngoLon);

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
        
        {/* Interactive Grid Map Selection Component */}
        <View style={[styles.mapContainer, { backgroundColor: theme.dark ? '#1E293B' : '#E2E8F0', borderColor: theme.colors.border }]}>
          <Text style={styles.gridMapLabel}>📍 Tap Map Grid to Select Coordinates</Text>
          
          {/* Simulated Intersections/Streets */}
          <View style={styles.streetsOverlay}>
            {[20, 40, 60, 80].map((val) => (
              <View key={`h-street-${val}`} style={[styles.streetH, { top: `${val}%`, borderColor: theme.dark ? '#334155' : '#CBD5E1' }]} />
            ))}
            {[20, 40, 60, 80].map((val) => (
              <View key={`v-street-${val}`} style={[styles.streetV, { left: `${val}%`, borderColor: theme.dark ? '#334155' : '#CBD5E1' }]} />
            ))}
          </View>

          {/* Interactive touch map sector slots */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={(e) => {
              // Get touch ratios on native web target
              const nativeEvent = e.nativeEvent as any;
              const w = nativeEvent.target.clientWidth || 300;
              const h = nativeEvent.target.clientHeight || 250;
              const offsetX = nativeEvent.offsetX || 0;
              const offsetY = nativeEvent.offsetY || 0;
              const xPercent = (offsetX / w) * 100;
              const yPercent = (offsetY / h) * 100;
              handleGridClick(xPercent, yPercent);
            }}
          />

          {/* Connective Route Overlay Line segments */}
          {activeRouteType === 'full_route' && (
            <View style={styles.routesOverlay}>
              {/* Volunteer (selectedLat/selectedLon) to Donor */}
              <View style={[styles.connectLine, {
                left: currentPos.x,
                top: currentPos.y,
                width: 100, // mock connector
                borderColor: theme.colors.primary,
                transform: [{ rotate: '45deg' }]
              } as any]} />
              {/* Donor to NGO */}
              <View style={[styles.connectLine, {
                left: donorPos.x,
                top: donorPos.y,
                width: 80,
                borderColor: theme.colors.accent
              } as any]} />
            </View>
          )}

          {/* Selected Volunteer Location Node Pin (Blue) */}
          <View style={[styles.markerPin, { left: currentPos.x, top: currentPos.y } as any]}>
            <View style={[styles.pulseDot, { backgroundColor: '#3B82F644' }]} />
            <View style={styles.pinIcon}><Navigation size={18} color="#3B82F6" /></View>
            <View style={[styles.markerLabel, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.markerLabelText, { color: theme.colors.text }]}>Selected</Text>
            </View>
          </View>

          {/* Donor Pin Node (Orange) */}
          <View style={[styles.markerPin, { left: donorPos.x, top: donorPos.y } as any]}>
            <View style={styles.pinIcon}><MapPin size={18} color={theme.colors.accent} /></View>
            <View style={[styles.markerLabel, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.markerLabelText, { color: theme.colors.text }]}>Donor</Text>
            </View>
          </View>

          {/* NGO Pin Node (Green) */}
          <View style={[styles.markerPin, { left: ngoPos.x, top: ngoPos.y } as any]}>
            <View style={styles.pinIcon}><MapPin size={18} color={theme.colors.success} /></View>
            <View style={[styles.markerLabel, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.markerLabelText, { color: theme.colors.text }]}>NGO</Text>
            </View>
          </View>

          <View style={styles.overlayIndicator}>
            <Text style={styles.indicatorText}>Interactive Map Simulation</Text>
          </View>
        </View>

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

          {/* Helper buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              id="btn-detect-location"
              style={[styles.locBtn, { backgroundColor: theme.colors.surface }]}
              onPress={handleDetectLocation}
            >
              <RefreshCw size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.locBtnText, { color: theme.colors.text }]}>Detect Current Location</Text>
            </TouchableOpacity>
          </View>
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
            Computes distance to donor pickup point ({donorLat}, {donorLon}) via great-circle algorithm.
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
              <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>Calculated Haversine Distance:</Text>
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
            Plans route details: Volunteer ({selectedLat}, {selectedLon}) ➔ Donor ({donorLat}, {donorLon}) ➔ NGO ({ngoLat}, {ngoLon}).
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
  mapContainer: {
    height: 280,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16
  },
  gridMapLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 10
  },
  streetsOverlay: {
    ...StyleSheet.absoluteFillObject
  },
  streetH: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1.5,
    borderStyle: 'solid'
  },
  streetV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRightWidth: 1.5,
    borderStyle: 'solid'
  },
  routesOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2
  },
  connectLine: {
    position: 'absolute',
    borderBottomWidth: 3,
    borderStyle: 'dashed',
    height: 1
  },
  markerPin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    marginLeft: -30,
    marginTop: -24,
    zIndex: 5
  },
  pulseDot: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16
  },
  pinIcon: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1
  },
  markerLabel: {
    marginTop: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1
  },
  markerLabelText: {
    fontSize: 7.5,
    fontWeight: '700'
  },
  overlayIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  indicatorText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600'
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
