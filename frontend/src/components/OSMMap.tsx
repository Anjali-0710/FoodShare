import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { MapPin, AlertTriangle, Globe } from 'lucide-react-native';
import { AppTheme } from '../theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MapMarker {
  latitude: number;
  longitude: number;
  label?: string;
  color?: string; // hex
}

interface OSMMapProps {
  theme: AppTheme;
  /** Center of the map */
  latitude?: number;
  longitude?: number;
  /** Markers to render */
  markers?: MapMarker[];
  /** Optional polyline route coordinates */
  polyline?: { latitude: number; longitude: number }[];
  /** If true, tapping the map fires onLocationSelect with the tapped coords */
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: number;
  zoom?: number;
}

// ─── Default coords (Bengaluru city centre) ───────────────────────────────────
const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

// ─── Leaflet HTML builder ─────────────────────────────────────────────────────
function buildLeafletHTML(
  lat: number,
  lng: number,
  zoom: number,
  markers: MapMarker[],
  interactive: boolean,
  isDark: boolean,
  primaryColor: string,
  polyline: { latitude: number; longitude: number }[] = [],
) {
  const markersJson = JSON.stringify(markers);

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const tileAttr = isDark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: ${isDark ? '#1E293B' : '#f0f4f8'}; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${lat}, ${lng}], ${zoom});

  L.tileLayer('${tileUrl}', {
    maxZoom: 19,
    attribution: '${tileAttr}'
  }).addTo(map);

  var markers = ${markersJson};
  markers.forEach(function(m) {
    var color = m.color || '${primaryColor}';
    var svgIcon = L.divIcon({
      className: '',
      html: '<div style="width:28px;height:28px;background:' + color + ';border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -32]
    });
    var marker = L.marker([m.latitude, m.longitude], { icon: svgIcon }).addTo(map);
    if (m.label) {
      marker.bindPopup('<b>' + m.label + '</b><br/>' + m.latitude.toFixed(4) + ', ' + m.longitude.toFixed(4));
      marker.openPopup();
    }
  });

  var polylineCoords = ${JSON.stringify(polyline)};
  if (polylineCoords && polylineCoords.length > 0) {
    var latlngs = polylineCoords.map(function(p) { return [p.latitude, p.longitude]; });
    var polyline = L.polyline(latlngs, {color: '${primaryColor}', weight: 4, opacity: 0.7}).addTo(map);
    map.fitBounds(polyline.getBounds());
  }

  ${interactive ? `
  map.on('click', function(e) {
    var lat = e.latlng.lat;
    var lng = e.latlng.lng;

    // Remove any previous selection marker
    if (window._selectedMarker) { map.removeLayer(window._selectedMarker); }

    var selIcon = L.divIcon({
      className: '',
      html: '<div style="width:24px;height:24px;background:#EF4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);animation:pulse 1.5s infinite;"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    window._selectedMarker = L.marker([lat, lng], { icon: selIcon }).addTo(map);

    // Send coords back to React Native
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOCATION_SELECTED', lat: lat, lng: lng }));
    } else {
      window.parent.postMessage(JSON.stringify({ type: 'LOCATION_SELECTED', lat: lat, lng: lng }), '*');
    }
  });
  ` : ''}
</script>
</body>
</html>`;
}

// ─── Web fallback (renders an iframe with OpenStreetMap) ──────────────────────
function WebMapFallback({ lat, lng, zoom, theme, height, htmlContent, onLocationSelect }: {
  lat: number; lng: number; zoom: number; theme: AppTheme; height: number; htmlContent: string;
  onLocationSelect?: (lat: number, lng: number) => void;
}) {
  React.useEffect(() => {
    const handleWebMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data || '{}');
        if (data.type === 'LOCATION_SELECTED' && onLocationSelect) {
          onLocationSelect(data.lat, data.lng);
        }
      } catch (_) {}
    };
    window.addEventListener('message', handleWebMessage);
    return () => window.removeEventListener('message', handleWebMessage);
  }, [onLocationSelect]);

  return (
    <View style={[webStyles.container, { height, backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {typeof document !== 'undefined' ? (
        // @ts-ignore — iframe works in web context
        <iframe
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 16 }}
          title="OpenStreetMap"
        />
      ) : (
        <MapFallbackError theme={theme} message="Map unavailable in this context." />
      )}
    </View>
  );
}

// ─── Error fallback card ──────────────────────────────────────────────────────
function MapFallbackError({ theme, message }: { theme: AppTheme; message: string }) {
  return (
    <View style={[webStyles.errorCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <AlertTriangle size={28} color={theme.colors.warning} style={{ marginBottom: 8 }} />
      <Text style={[webStyles.errorTitle, { color: theme.colors.text }]}>Map Unavailable</Text>
      <Text style={[webStyles.errorDesc, { color: theme.colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const OSMMap: React.FC<OSMMapProps> = ({
  theme,
  latitude,
  longitude,
  markers = [],
  polyline = [],
  interactive = false,
  onLocationSelect,
  height = 250,
  zoom = 14,
}) => {
  const lat = latitude ?? DEFAULT_LAT;
  const lng = longitude ?? DEFAULT_LNG;

  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const primaryColor = theme.colors.primary || '#22C55E';

  // Build the effective marker list
  const allMarkers: MapMarker[] = markers.length > 0
    ? markers
    : (latitude && longitude ? [{ latitude: lat, longitude: lng, label: 'Location', color: primaryColor }] : []);

  const htmlContent = buildLeafletHTML(lat, lng, zoom, allMarkers, interactive, theme.dark, primaryColor, polyline);

  // Handle messages from the Leaflet map (location selection)
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent?.data || event.data || '{}');
      if (data.type === 'LOCATION_SELECTED' && onLocationSelect) {
        onLocationSelect(data.lat, data.lng);
      }
    } catch (_) {}
  }, [onLocationSelect]);

  // ── Web platform: use iframe ────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <WebMapFallback
        lat={lat}
        lng={lng}
        zoom={zoom}
        theme={theme}
        height={height}
        htmlContent={htmlContent}
        onLocationSelect={onLocationSelect}
      />
    );
  }

  // ── Native: use WebView with Leaflet ───────────────────────────────────────
  // Dynamic import to avoid requiring react-native-webview on web
  let WebView: any = null;
  try {
    WebView = require('react-native-webview').WebView;
  } catch (_) {
    return <MapFallbackError theme={theme} message="WebView module is not available." />;
  }

  if (hasError) {
    return (
      <View style={{ height }}>
        <MapFallbackError theme={theme} message="Map failed to load. Check your internet connection." />
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { height, borderColor: theme.colors.border }]}>
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.card }]}>
          <Globe size={28} color={theme.colors.primary} style={{ marginBottom: 8 }} />
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginBottom: 6 }} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading OpenStreetMap…</Text>
        </View>
      )}

      <WebView
        source={{ html: htmlContent }}
        style={{ flex: 1, borderRadius: 16, opacity: loading ? 0 : 1 }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setHasError(true); }}
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
        allowsInlineMediaPlayback
        mixedContentMode="always"
      />

      {interactive && (
        <View style={[styles.interactiveBadge, { backgroundColor: theme.colors.primary }]}>
          <MapPin size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.interactiveBadgeText}>Tap to set pickup location</Text>
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 12,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  interactiveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 20,
  },
  interactiveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'System',
  },
});

const webStyles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 12,
  },
  errorCard: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginVertical: 12,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: 'System',
  },
  errorDesc: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'System',
  },
});

export default OSMMap;
