import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';
import { ArrowLeft, Mail, RefreshCw, CheckCircle2, ExternalLink } from 'lucide-react-native';
import { AuthService } from '../../services/authService';
import { setCredentials } from '../../store/authSlice';
import { AppTheme } from '../../theme/theme';
import { supabase } from '../../services/supabase';

interface OTPScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
  email: string;
}

export const OTPScreen: React.FC<OTPScreenProps> = ({ theme, navigate, email }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [timer, setTimer] = useState(60);

  // Countdown timer for resend button
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Poll for email verification every 5 seconds
  useEffect(() => {
    const checkVerification = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email_confirmed_at) {
          // Already verified — get profile and log in
          const sessionData = await AuthService.getSession();
          if (sessionData) {
            dispatch(setCredentials({ user: sessionData.user, token: sessionData.token }));
            navigate('Dashboard');
          }
        }
      } catch (e) {
        // Silent check
      }
    };

    const pollInterval = setInterval(checkVerification, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleCheckVerification = async () => {
    setChecking(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        const sessionData = await AuthService.getSession();
        if (sessionData) {
          setSuccess('Email verified! Signing you in...');
          setTimeout(() => {
            dispatch(setCredentials({ user: sessionData.user, token: sessionData.token }));
            navigate('Dashboard');
          }, 800);
        }
      } else {
        setError('Email not yet verified. Please click the link in your email and try again.');
      }
    } catch (err: any) {
      setError('Unable to check verification. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await AuthService.resendVerification(email);
      setTimer(60);
      setSuccess('Verification email resent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend email. Please try again.');
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
        {/* Icon */}
        <View style={styles.iconRow}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
            <Mail size={32} color={theme.colors.primary} />
          </View>
        </View>

        <Text style={[styles.title, { color: theme.colors.primary }]}>Verify Your Email</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          We've sent a verification link to{' '}
          <Text style={{ fontWeight: '700', color: theme.colors.text }}>{email}</Text>
          {'\n'}Please click the link in your email to verify your account.
        </Text>

        {/* Instructions Card */}
        <View style={[styles.instructionCard, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30' }]}>
          <Text style={[styles.instructionTitle, { color: theme.colors.primary }]}>📧 Check Your Email</Text>
          <Text style={[styles.instructionText, { color: theme.colors.text }]}>
            1. Open your email inbox{'\n'}
            2. Look for an email from FoodShare AI{'\n'}
            3. Click the <Text style={{ fontWeight: '700' }}>"Confirm your email"</Text> link{'\n'}
            4. Return here and tap the button below
          </Text>
        </View>

        {/* Error/Success Banners */}
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

        {/* Check Verification Button */}
        <TouchableOpacity
          id="btn-otp-check"
          style={[styles.button, { backgroundColor: theme.colors.primary }, (checking || loading) && { opacity: 0.7 }]}
          onPress={handleCheckVerification}
          disabled={checking || loading}
        >
          {checking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.btnRow}>
              <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>I've Verified My Email</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Resend Section */}
        <View style={styles.resendContainer}>
          <Text style={[styles.resendLabel, { color: theme.colors.textSecondary }]}>
            Didn't receive the email?
          </Text>
          {timer > 0 ? (
            <Text style={[styles.timerText, { color: theme.colors.textSecondary }]}>
              Resend available in {timer}s
            </Text>
          ) : (
            <TouchableOpacity
              onPress={handleResend}
              style={styles.resendBtn}
              id="btn-otp-resend"
              disabled={loading}
            >
              <RefreshCw size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.resendText, { color: theme.colors.primary }]}>Resend Verification Email</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Also check spam note */}
        <Text style={[styles.spamNote, { color: theme.colors.textSecondary }]}>
          💡 Also check your spam or junk folder if you don't see it.
        </Text>
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
    marginBottom: 24,
    lineHeight: 20,
    textAlign: 'center'
  },
  instructionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  instructionTitle: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  instructionText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13,
    lineHeight: 22,
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
  resendContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  resendLabel: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13,
    marginBottom: 6,
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
  },
  spamNote: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  }
});

export default OTPScreen;
