import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TextInput, TouchableOpacity, Easing } from 'react-native';
import { Scan, QrCode, AlertCircle } from 'lucide-react-native';
import { AppTheme } from '../theme/theme';

interface QRScannerMockProps {
  theme: AppTheme;
  expectedCode?: string;
  onScanSuccess: (code: string) => void;
  onCancel: () => void;
}

export const QRScannerMock: React.FC<QRScannerMockProps> = ({
  theme,
  expectedCode = '',
  onScanSuccess,
  onCancel
}) => {
  const [laserY] = useState(new Animated.Value(0));
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Scan laser animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserY, {
          toValue: 180,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(laserY, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  }, []);

  const handleScanSubmit = (codeToScan: string) => {
    const trimmed = codeToScan.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a valid QR token.');
      return;
    }
    
    if (expectedCode && trimmed.toLowerCase() !== expectedCode.toLowerCase()) {
      setErrorMsg(`Invalid QR Code: Does not match expected donation record.`);
      return;
    }
    
    setErrorMsg(null);
    onScanSuccess(trimmed);
  };

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
      <Text style={styles.title}>Scan Donation Receipt</Text>
      <Text style={styles.subtitle}>Align the recipient's QR code within the frame below</Text>

      {/* Camera Scanning Reticle Frame */}
      <View style={styles.scannerFrame}>
        {/* Corner Borders */}
        <View style={[styles.cornerTL, { borderColor: theme.colors.primary }]} />
        <View style={[styles.cornerTR, { borderColor: theme.colors.primary }]} />
        <View style={[styles.cornerBL, { borderColor: theme.colors.primary }]} />
        <View style={[styles.cornerBR, { borderColor: theme.colors.primary }]} />

        {/* Laser Line */}
        <Animated.View style={[styles.laser, { transform: [{ translateY: laserY }] }]} />

        <QrCode size={48} color="rgba(255,255,255,0.2)" />
      </View>

      {errorMsg && (
        <View style={styles.errorBox}>
          <AlertCircle size={14} color="#FF5252" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Simulator Inputs */}
      <View style={[styles.simCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.simTitle, { color: theme.colors.text }]}>Scanner Simulator</Text>
        <Text style={[styles.simDesc, { color: theme.colors.textSecondary }]}>
          Since you are running in web mode, enter code manually or auto-fill:
        </Text>

        <TextInput
          style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="Enter QR Code (e.g. QR_DON_1234)"
          placeholderTextColor={theme.colors.textSecondary}
          value={manualCode}
          onChangeText={setManualCode}
          autoCapitalize="characters"
        />

        {expectedCode ? (
          <TouchableOpacity
            style={[styles.autoFillBtn, { backgroundColor: theme.colors.primary + '1A' }]}
            onPress={() => setManualCode(expectedCode)}
          >
            <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700' }}>
              Auto-fill expected code: {expectedCode}
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btn, styles.cancelBtn, { borderColor: theme.colors.border }]}
            onPress={onCancel}
          >
            <Text style={[styles.btnText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.scanBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleScanSubmit(manualCode || expectedCode)}
          >
            <Scan size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Scan Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4
  },
  subtitle: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20
  },
  scannerFrame: {
    width: 200,
    height: 200,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    borderLeftWidth: 3,
    borderTopWidth: 3
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRightWidth: 3,
    borderTopWidth: 3
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 24,
    height: 24,
    borderLeftWidth: 3,
    borderBottomWidth: 3
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRightWidth: 3,
    borderBottomWidth: 3
  },
  laser: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    zIndex: 10
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,82,82,0.15)',
    borderWidth: 1,
    borderColor: '#FF5252',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    width: '90%'
  },
  errorText: {
    color: '#FF5252',
    fontSize: 11,
    fontWeight: '600'
  },
  simCard: {
    width: '90%',
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5
  },
  simTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4
  },
  simDesc: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 12
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    marginBottom: 10
  },
  autoFillBtn: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 14
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  btn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  cancelBtn: {
    borderWidth: 1,
    marginRight: 8
  },
  scanBtn: {
    marginLeft: 8
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700'
  }
});
export default QRScannerMock;
