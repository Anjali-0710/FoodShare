import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Mail, ArrowLeft, CheckCircle2, Lock, KeyRound } from 'lucide-react';
import { apiCall } from '../../services/api';
import { AppTheme } from '../../theme/theme';

interface ForgotPasswordScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ theme, navigate }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [step, setStep] = useState<1 | 2>(1); // 1: Email Request, 2: Code verification & password reset
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const handleRequestCode = async () => {
    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }
    if (!email.includes('@')) {
      setError('Invalid email address format.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await apiCall('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() }
      });
      
      if (response.success) {
        setStep(2);
        setStatus('A verification code has been generated and printed to system logs.');
        if (response.code) {
          setDemoCode(response.code); // Store for demo convenience
        }
      } else {
        setError(response.message || 'Failed to send verification code.');
      }
    } catch (err: any) {
      console.error('Request code error:', err);
      setError(err.message || 'No account associated with this email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all mandatory fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiCall('/auth/reset-password', {
        method: 'POST',
        body: { 
          email: email.trim().toLowerCase(), 
          code: code.trim(), 
          newPassword 
        }
      });

      if (response.success) {
        setStatus('Your password has been reset successfully! You can now sign in with your new credentials.');
        setStep(1); // Return to default success state
        setEmail('');
        setCode('');
        setNewPassword('');
        setConfirmPassword('');
        setDemoCode(null);
      } else {
        setError(response.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isSuccessScreen = status && step === 1 && !email;

  return (
    <ScrollView 
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity 
        style={styles.backBtn} 
        onPress={() => {
          if (step === 2) {
            setStep(1);
            setError(null);
            setStatus(null);
            setDemoCode(null);
          } else {
            navigate('Login');
          }
        }} 
        id="btn-forgot-back"
      >
        <ArrowLeft size={20} color={theme.colors.text} />
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          {isSuccessScreen ? 'Password Recovered' : step === 1 ? 'Recover Password' : 'Verify & Reset'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {isSuccessScreen 
            ? 'Access to your account has been restored.' 
            : step === 1 
              ? 'Enter your registered email to receive a password reset code.' 
              : `Enter the code sent to ${email} to configure your new credentials.`
          }
        </Text>

        {error && (
          <View style={[styles.alertBanner, { backgroundColor: theme.colors.error + '12', borderColor: theme.colors.error + '30' }]}>
            <Text style={[styles.errorText, { color: theme.colors.error }]} id="forgot-error-text">{error}</Text>
          </View>
        )}

        {isSuccessScreen ? (
          <View style={[styles.successBox, { backgroundColor: theme.colors.primary + '0F', borderColor: theme.colors.primary + '40' }]}>
            <CheckCircle2 size={36} color={theme.colors.primary} style={{ marginBottom: 12 }} />
            <Text style={[styles.successTitle, { color: theme.colors.primary }]}>Reset Successful</Text>
            <Text style={[styles.successText, { color: theme.colors.textSecondary }]}>{status}</Text>
            
            <TouchableOpacity 
              id="btn-forgot-back-login"
              style={[styles.button, { backgroundColor: theme.colors.primary, width: '100%', marginTop: 8 }]}
              onPress={() => navigate('Login')}
            >
              <Text style={styles.btnText}>Sign In Now</Text>
            </TouchableOpacity>
          </View>
        ) : step === 1 ? (
          <>
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Email Address</Text>
            <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
              <Mail size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                id="input-forgot-email"
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                autoCapitalize="none"
                keyboardType="email-address"
                onSubmitEditing={handleRequestCode}
              />
            </View>

            <TouchableOpacity
              id="btn-forgot-submit"
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={handleRequestCode}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Send Code</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Demo code helper alert banner */}
            {demoCode && (
              <View style={[styles.demoBanner, { backgroundColor: theme.colors.warning + '12', borderColor: theme.colors.warning + '40' }]}>
                <Text style={[styles.demoTitle, { color: theme.colors.warning }]}>Demo Verification Code</Text>
                <Text style={[styles.demoText, { color: theme.colors.text }]}>
                  Copy this generated code to reset: <Text style={{ fontWeight: '800', fontSize: 15 }}>{demoCode}</Text>
                </Text>
              </View>
            )}

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Verification Code</Text>
            <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
              <KeyRound size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                id="input-forgot-code"
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Enter 6-digit code"
                placeholderTextColor={theme.colors.textSecondary}
                value={code}
                onChangeText={(t) => { setCode(t); setError(null); }}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>New Password</Text>
            <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
              <Lock size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                id="input-forgot-new-password"
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Min 6 characters"
                placeholderTextColor={theme.colors.textSecondary}
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setError(null); }}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Confirm New Password</Text>
            <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
              <Lock size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                id="input-forgot-confirm-password"
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Re-enter password"
                placeholderTextColor={theme.colors.textSecondary}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                secureTextEntry
                autoCapitalize="none"
                onSubmitEditing={handleResetPassword}
              />
            </View>

            <TouchableOpacity
              id="btn-forgot-reset-submit"
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Update Password</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setStep(1);
                setError(null);
                setDemoCode(null);
              }}
            >
              <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>Request Another Code</Text>
            </TouchableOpacity>
          </>
        )}
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
    marginBottom: 20,
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
  btnText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15.5
  },
  successBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center'
  },
  successTitle: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10
  },
  successText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20
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
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: 10
  },
  cancelText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13.5,
    fontWeight: '600'
  }
});

export default ForgotPasswordScreen;
