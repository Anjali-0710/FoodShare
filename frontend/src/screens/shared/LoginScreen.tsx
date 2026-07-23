import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';
import { Mail, Lock, LogIn, Eye, EyeOff, Sun, Moon, Leaf } from 'lucide-react-native';
import { setCredentials, toggleTheme } from '../../store/authSlice';
import { AuthService } from '../../services/authService';
import { AppTheme } from '../../theme/theme';

interface LoginScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await AuthService.login(email, password);

      if (response.success && response.token && response.user) {
        dispatch(setCredentials({ user: response.user, token: response.token, rememberMe }));
        navigate('Dashboard');
      } else {
        setError(response.message || 'Login failed. Please check your credentials and try again.');
      }
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('suspend') || msg.includes('block') || msg.includes('disable')) {
        setError('Your account has been suspended. Please contact the administrator.');
      } else if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('not found') || msg.includes('password') || msg.includes('credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('connect') || msg.includes('failed')) {
        setError('Unable to connect. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent?.key === 'Enter') handleLogin();
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Theme Toggle */}
      <View style={styles.headerControls}>
        <TouchableOpacity
          id="btn-toggle-theme"
          style={[styles.circleBtn, { backgroundColor: theme.colors.card }]}
          onPress={() => dispatch(toggleTheme())}
          accessibilityLabel="Toggle theme"
        >
          {theme.dark ? <Sun size={18} color={theme.colors.warning} /> : <Moon size={18} color={theme.colors.primary} />}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {/* Logo & Branding */}
        <View style={styles.logoRow}>
          <View style={[styles.logoCircle, { backgroundColor: theme.colors.primary + '18' }]}>
            <Leaf size={32} color={theme.colors.primary} />
          </View>
        </View>
        <Text style={[styles.title, { color: theme.colors.primary }]}>FoodReach</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Connect. Share. Reduce Waste.
        </Text>

        {/* Error Banner */}
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: theme.colors.error + '15', borderColor: theme.colors.error + '40' }]}>
            <Text style={[styles.errorText, { color: theme.colors.error }]} id="login-error-text">
              {error}
            </Text>
          </View>
        )}

        {/* Email Input */}
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Email Address</Text>
        <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
          <Mail size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            id="input-login-email"
            style={[styles.input, { color: theme.colors.text }]}
            placeholder="you@example.com"
            placeholderTextColor={theme.colors.textSecondary}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(null); }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="off"
            onSubmitEditing={handleLogin}
            returnKeyType="next"
          />
        </View>

        {/* Password Input */}
        <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Password</Text>
        <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
          <Lock size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            id="input-login-password"
            style={[styles.input, { color: theme.colors.text, paddingRight: 48 }]}
            placeholder="Enter your password"
            placeholderTextColor={theme.colors.textSecondary}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null); }}
            secureTextEntry={secureText}
            autoCapitalize="none"
            autoComplete="new-password"
            onKeyPress={handleKeyPress}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setSecureText(!secureText)}
            accessibilityLabel={secureText ? 'Show password' : 'Hide password'}
          >
            {secureText
              ? <EyeOff size={18} color={theme.colors.textSecondary} />
              : <Eye size={18} color={theme.colors.textSecondary} />
            }
          </TouchableOpacity>
        </View>

        {/* Remember Me & Forgot Password Options Row */}
        <View style={styles.optionsRow}>
          <TouchableOpacity
            id="checkbox-remember-me"
            style={styles.checkboxContainer}
            onPress={() => setRememberMe(!rememberMe)}
            accessibilityLabel="Remember me option"
          >
            <View style={[
              styles.checkboxIcon,
              { borderColor: theme.colors.border },
              rememberMe && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
            ]}>
              {rememberMe && <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900', lineHeight: 12 }}>✓</Text>}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.colors.textSecondary }]}>Remember Me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigate('ForgotPassword')}
            id="link-forgot-password"
          >
            <Text style={[styles.forgotText, { color: theme.colors.accent }]}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Button */}
        <TouchableOpacity
          id="btn-login-submit"
          style={[
            styles.button,
            { backgroundColor: theme.colors.primary },
            loading && { opacity: 0.7 }
          ]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityLabel="Sign in"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.btnRow}>
              <LogIn size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>Sign In</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>New to FoodReach?</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        </View>

        {/* Register Link */}
        <TouchableOpacity
          id="link-goto-register"
          style={[styles.registerBtn, { borderColor: theme.colors.primary }]}
          onPress={() => navigate('Register')}
        >
          <Text style={[styles.registerBtnText, { color: theme.colors.primary }]}>
            Create an Account
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.footerNote, { color: theme.colors.textSecondary }]}>
        FoodReach © 2025 · Reducing food waste, one meal at a time.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32
  },
  headerControls: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  card: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    padding: 8
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 16
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5
  },
  subtitle: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 32
  },
  errorBanner: {
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
  eyeBtn: {
    position: 'absolute',
    right: 16,
    padding: 4
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: -4
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkboxIcon: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 6,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxLabel: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13.5,
    fontWeight: '600'
  },
  forgotText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13.5,
    fontWeight: '600'
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
    marginBottom: 28
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  dividerLine: {
    flex: 1,
    height: 1
  },
  dividerText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 12.5,
    fontWeight: '600',
    marginHorizontal: 14
  },
  registerBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  registerBtnText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontWeight: '700',
    fontSize: 14.5
  },
  footerNote: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    textAlign: 'center',
    fontSize: 11.5,
    marginTop: 36
  }
});

export default LoginScreen;
