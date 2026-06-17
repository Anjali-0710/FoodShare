import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';
import { KeyRound, ArrowLeft, Mail, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { apiCall } from '../../services/api';
import { setCredentials } from '../../store/authSlice';
import { AppTheme } from '../../theme/theme';

interface OTPScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
  email: string;
}

export const OTPScreen: React.FC<OTPScreenProps> = ({ theme, navigate, email }) => {
  const dispatch = useDispatch();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Timer for resend button (60 seconds)
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (code.trim().length !== 6) {
      setError('The verification code must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiCall('/auth/verify-otp', {
        method: 'POST',
        body: {
          email: email.toLowerCase(),
          code: code.trim()
        }
      });

      if (response.success) {
        setSuccess('Email address verified successfully!');
        setTimeout(() => {
          dispatch(setCredentials({ user: response.user, token: response.token }));
          navigate('Dashboard');
        }, 1200);
      } else {
        setError(response.message || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error('OTP verification failed:', err);
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiCall('/auth/resend-otp', {
        method: 'POST',
        body: { email: email.toLowerCase() }
      });

      if (response.success) {
        setTimer(60);
        setSuccess('A new verification code has been generated.');
      } else {
        setError(response.message || 'Failed to resend verification code.');
      }
    } catch (err: any) {
      console.error('OTP resend failed:', err);
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Back button */}
      <TouchableOpacity 
        style={styles.backBtn} 
        onPress={() => navigate('Login')}
        id="btn-otp-back"
      >
        <ArrowLeft size={20} color={theme.colors.text} />
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.iconRow}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
            <Mail size={32} color={theme.colors.primary} />
          </View>
        </View>

        <Text style={[styles.title, { color: theme.colors.primary }]}>Verify Your Email</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          We have generated a 6-digit verification code for <Text style={{ fontWeight: '700', color: theme.colors.text }}>{email}</Text>. Please enter it below.
        </Text>

        {error && (
          <View style={[styles.alertBanner, { backgroundColor: theme.colors.error + '12', borderColor: theme.colors.error + '30' }]}>
            <Text style={[styles.errorText, { color: theme.colors.error }]} id="otp-error-text">{error}</Text>
          </View>
        )}

        {success && (
          <View style={[styles.alertBanner, { backgroundColor: theme.colors.primary + '12', borderColor: theme.colors.primary + '30' }]}>
            <Text style={[styles.successText, { color: theme.colors.primary }]} id="otp-success-text">{success}</Text>
          </View>
        )}



        {/* OTP Input field */}
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Verification Code</Text>
        <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
          <KeyRound size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            id="input-otp-code"
            style={[styles.input, { color: theme.colors.text }]}
            placeholder="Enter 6-digit OTP"
            placeholderTextColor={theme.colors.textSecondary}
            value={code}
            onChangeText={(t) => { setCode(t); setError(null); }}
            keyboardType="numeric"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handleVerify}
          />
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          id="btn-otp-submit"
          style={[styles.button, { backgroundColor: theme.colors.primary }, loading && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.btnRow}>
              <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>Verify & Sign In</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Resend Section */}
        <View style={styles.resendContainer}>
          {timer > 0 ? (
            <Text style={[styles.timerText, { color: theme.colors.textSecondary }]}>
              Resend code in {timer} seconds
            </Text>
          ) : (
            <TouchableOpacity 
              onPress={handleResend}
              style={styles.resendBtn}
              id="btn-otp-resend"
              disabled={loading}
            >
              <RefreshCw size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.resendText, { color: theme.colors.primary }]}>Resend Verification Code</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60
  },
  backBtn: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 8,
    borderRadius: 12,
    zIndex: 10
  },
  card: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    padding: 8
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: 16
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
    textAlign: 'center'
  },
  subtitle: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 14,
    marginBottom: 28,
    lineHeight: 20,
    textAlign: 'center'
  },
  alertBanner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20
  },
  errorText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  successText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  fieldLabel: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    height: 52
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 4
  },
  input: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    flex: 1,
    height: 52,
    fontSize: 14.5,
    paddingLeft: 10,
    paddingRight: 14
  },
  button: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    marginTop: 8,
    marginBottom: 20
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  btnText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15.5
  },
  demoBanner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 24
  },
  demoTitle: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 6
  },
  demoText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 12.5
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 10
  },
  timerText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13.5,
    fontWeight: '600'
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  resendText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13.5,
    fontWeight: '700'
  }
});

export default OTPScreen;
