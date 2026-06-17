import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { MapPin, Navigation, Car, ShieldAlert } from 'lucide-react-native';
import { AppTheme } from '../theme/theme';

interface MapMockProps {
  theme: AppTheme;
  pickupCoords?: { latitude: number; longitude: number };
  deliveryCoords?: { latitude: number; longitude: number };
  pickupLabel?: string;
  deliveryLabel?: string;
  animateRoute?: boolean;
}

export const MapMock: React.FC<MapMockProps> = ({
  theme,
  pickupCoords = { latitude: 28.6304, longitude: 77.2177 }, // Default CP, Delhi
  deliveryCoords = { latitude: 28.6448, longitude: 77.1903 }, // Default NGO
  pickupLabel = 'Donor Location',
  deliveryLabel = 'NGO Center',
  animateRoute = true
}) => {
  const [progress] = useState(new Animated.Value(0));

  useEffect(() => {
    if (animateRoute) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(progress, {
            toValue: 1,
            duration: 8000,
            easing: Easing.linear,
            useNativeDriver: false // Layout width/height properties don't support native driver
          }),
          Animated.delay(1500)
        ])
      ).start();
    }
  }, [animateRoute]);

  // Interpolate vehicle position along a path
  // Since this is a UI mock, we interpolate between coordinates in a 2D box grid
  const vehicleX = progress.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: ['15%', '40%', '40%', '80%']
  });

  const vehicleY = progress.interpolate({
    inputRange: [0, 0.4, 0.6, 1],
    outputRange: ['80%', '80%', '20%', '20%']
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.dark ? '#1E293B' : '#E2E8F0', borderColor: theme.colors.border }]}>
      {/* Grid Lines to simulate topographic maps */}
      <View style={styles.gridOverlay}>
        {[...Array(6)].map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLineH, { top: `${i * 20}%`, borderColor: theme.dark ? '#334155' : '#CBD5E1' }]} />
        ))}
        {[...Array(6)].map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLineV, { left: `${i * 20}%`, borderColor: theme.dark ? '#334155' : '#CBD5E1' }]} />
        ))}
      </View>

      {/* Route Path (Dashed visual connections) */}
      <View style={styles.routeWrapper}>
        {/* Step 1: Horizontal route section */}
        <View style={[styles.routeSegmentH, { left: '15%', top: '80%', width: '25%', borderColor: theme.colors.primary }]} />
        {/* Step 2: Vertical route section */}
        <View style={[styles.routeSegmentV, { left: '40%', top: '20%', height: '60%', borderColor: theme.colors.primary }]} />
        {/* Step 3: Second horizontal route section */}
        <View style={[styles.routeSegmentH, { left: '40%', top: '20%', width: '40%', borderColor: theme.colors.primary }]} />
      </View>

      {/* Donor / Pickup Pin */}
      <View style={[styles.pinContainer, { left: '15%', top: '75%' }]}>
        <View style={[styles.pulseCircle, { backgroundColor: theme.colors.accent + '33' }]} />
        <MapPin size={24} color={theme.colors.accent} fill={theme.colors.accent + '22'} />
        <View style={[styles.labelCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.labelText, { color: theme.colors.text }]} numberOfLines={1}>
            📍 {pickupLabel}
          </Text>
        </View>
      </View>

      {/* NGO / Destination Pin */}
      <View style={[styles.pinContainer, { left: '80%', top: '15%' }]}>
        <View style={[styles.pulseCircle, { backgroundColor: theme.colors.primary + '33' }]} />
        <Navigation size={24} color={theme.colors.primary} fill={theme.colors.primary + '22'} />
        <View style={[styles.labelCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.labelText, { color: theme.colors.text }]} numberOfLines={1}>
            🏢 {deliveryLabel}
          </Text>
        </View>
      </View>

      {/* Animated Moving Vehicle */}
      {animateRoute && (
        <Animated.View style={[styles.vehicleContainer, { left: vehicleX, top: vehicleY, backgroundColor: theme.colors.primary }]}>
          <Car size={14} color="#FFFFFF" />
        </Animated.View>
      )}

      {/* Simulated GPS Navigation Card */}
      <View style={[styles.navCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.navRow}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '1A' }]}>
            <Navigation size={20} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={[styles.navMainText, { color: theme.colors.text }]}>Navigating Route</Text>
            <Text style={[styles.navSubText, { color: theme.colors.textSecondary }]}>Distance: 2.4 km • Est. ETA: 8 Mins</Text>
          </View>
        </View>
      </View>

      {/* Google Maps Indicator Overlay */}
      <View style={styles.overlayIndicator}>
        <Text style={styles.indicatorText}>
          <ShieldAlert size={10} color="#FFFFFF" /> Demo Live Tracker (Expo-compatible)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 12
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderStyle: 'dashed'
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    borderStyle: 'dashed'
  },
  routeWrapper: {
    ...StyleSheet.absoluteFillObject
  },
  routeSegmentH: {
    position: 'absolute',
    borderBottomWidth: 3,
    borderStyle: 'dotted',
    height: 1
  },
  routeSegmentV: {
    position: 'absolute',
    borderRightWidth: 3,
    borderStyle: 'dotted',
    width: 1
  },
  pinContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    marginLeft: -40,
    marginTop: -28
  },
  pulseCircle: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24
  },
  labelCard: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2
  },
  labelText: {
    fontSize: 9,
    fontWeight: '600'
  },
  vehicleContainer: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
    marginTop: -12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  navCard: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  navMainText: {
    fontSize: 12,
    fontWeight: '700'
  },
  navSubText: {
    fontSize: 10,
    marginTop: 2
  },
  overlayIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  indicatorText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600'
  }
});
export default MapMock;
