import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';
import { User, Mail, Lock, Phone, MapPin, Award, ArrowLeft } from 'lucide-react-native';
import { setCredentials } from '../../store/authSlice';
import { apiCall } from '../../services/api';
import { AppTheme } from '../../theme/theme';

interface RegisterScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
  setOtpEmail?: (email: string) => void;
  setOtpDemoCode?: (code: string) => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ theme, navigate, setOtpEmail, setOtpDemoCode }) => {
  const dispatch = useDispatch();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'donor' | 'ngo' | 'volunteer' | null>(null);
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  
  // Custom states
  const [ngoCapacity, setNgoCapacity] = useState('150');
  const [preferences, setPreferences] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePreference = (type: string) => {
    if (preferences.includes(type)) {
      setPreferences(preferences.filter(p => p !== type));
    } else {
      setPreferences([...preferences, type]);
    }
  };

  const handleRegister = async () => {
    if (!role) {
      setError('Please select a role (Donor, NGO, or Volunteer) to register.');
      return;
    }
    if (!name || !email || !password || !confirmPassword || !contactNumber) {
      setError('Please fill in all mandatory profile fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (contactNumber.length < 8) {
      setError('Please provide a valid contact number.');
      return;
    }

    setLoading(true);
    setError(null);

    // Random GPS offset around Bengaluru for demo realism
    const offsetLat = (Math.random() - 0.5) * 0.05;
    const offsetLng = (Math.random() - 0.5) * 0.05;
    const latitude = 12.9716 + offsetLat;
    const longitude = 77.5946 + offsetLng;

    try {
      // Register directly in backend — no Firebase needed
      const response = await apiCall('/auth/register', {
        method: 'POST',
        body: {
          name,
          email,
          password,
          role,
          contactNumber,
          address: address || 'Bengaluru, Karnataka',
          latitude,
          longitude,
          ngoCapacity: role === 'ngo' ? Number(ngoCapacity) : undefined,
          foodTypePreference: preferences
        }
      });

      if (response.success) {
        if (setOtpEmail) setOtpEmail(email);
        if (setOtpDemoCode && response.code) setOtpDemoCode(response.code);
        navigate('OTP');
      } else {
        setError(response.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      const msg = err.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('exists')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('connect')) {
        setError('Cannot reach the server. Make sure the backend is running on port 5000.');
      } else {
        setError(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const foodCategories = ['Cooked Food', 'Vegetables', 'Fruits', 'Bakery Items', 'Beverages', 'Grocery Items'];

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Login')} id="btn-register-back">
        <ArrowLeft size={20} color={theme.colors.text} />
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Join our food preservation community</Text>

        {error && <Text style={styles.errorText} id="register-error-text">{error}</Text>}

        {/* Role Selector Tabs */}
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 8, marginLeft: 2 }}>
          Select Your Role
        </Text>
        <View style={[styles.roleTabs, { borderColor: theme.colors.border }]}>
          <TouchableOpacity
            id="tab-role-donor"
            style={[styles.roleTab, role === 'donor' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setRole('donor')}
          >
            <Text style={[styles.roleTabText, { color: role === 'donor' ? '#FFFFFF' : theme.colors.text }]}>Donor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            id="tab-role-ngo"
            style={[styles.roleTab, role === 'ngo' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setRole('ngo')}
          >
            <Text style={[styles.roleTabText, { color: role === 'ngo' ? '#FFFFFF' : theme.colors.text }]}>NGO</Text>
          </TouchableOpacity>

          <TouchableOpacity
            id="tab-role-volunteer"
            style={[styles.roleTab, role === 'volunteer' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setRole('volunteer')}
          >
            <Text style={[styles.roleTabText, { color: role === 'volunteer' ? '#FFFFFF' : theme.colors.text }]}>Volunteer</Text>
          </TouchableOpacity>
        </View>

        {/* Name Input */}
        <View style={styles.inputContainer}>
          <User size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            id="input-register-name"
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder={role === 'ngo' ? 'NGO Name' : 'Full Name'}
            placeholderTextColor={theme.colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Mail size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            id="input-register-email"
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Email Address"
            placeholderTextColor={theme.colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Lock size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            id="input-register-password"
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Password"
            placeholderTextColor={theme.colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <Lock size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            id="input-register-confirm-password"
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Confirm Password"
            placeholderTextColor={theme.colors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Contact Input */}
        <View style={styles.inputContainer}>
          <Phone size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            id="input-register-phone"
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Contact Phone Number"
            placeholderTextColor={theme.colors.textSecondary}
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
          />
        </View>

        {/* Address Input */}
        <View style={styles.inputContainer}>
          <MapPin size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            id="input-register-address"
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Address (for maps and tracking)"
            placeholderTextColor={theme.colors.textSecondary}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* NGO specific inputs */}
        {role === 'ngo' && (
          <View style={styles.roleExtraCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>NGO Configuration</Text>
            <View style={styles.inputContainer}>
              <Award size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                id="input-ngo-capacity"
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Serving Capacity (e.g. 150 Plates)"
                placeholderTextColor={theme.colors.textSecondary}
                value={ngoCapacity}
                onChangeText={setNgoCapacity}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* NGO/Volunteer food preferences */}
        {(role === 'ngo' || role === 'volunteer') && (
          <View style={styles.roleExtraCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {role === 'ngo' ? 'Target Food Requirements' : 'Preferred Categories'}
            </Text>
            <Text style={[styles.descText, { color: theme.colors.textSecondary }]}>
              Select the food categories you can accept or transport:
            </Text>
            <View style={styles.preferencesRow}>
              {foodCategories.map((cat) => {
                const selected = preferences.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.prefBadge,
                      { borderColor: theme.colors.border },
                      selected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                    ]}
                    onPress={() => togglePreference(cat)}
                  >
                    <Text style={[styles.prefText, { color: selected ? '#FFFFFF' : theme.colors.text }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Submit Register */}
        <TouchableOpacity
          id="btn-register-submit"
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Sign Up</Text>}
        </TouchableOpacity>

        {/* Log In Link */}
        <View style={styles.footerRow}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigate('Login')} id="link-goto-login">
            <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60
  },
  backBtn: {
    marginBottom: 16,
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: 12
  },
  card: {
    borderRadius: 16
  },
  title: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5
  },
  subtitle: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 28
  },
  errorText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EF4444' + '40',
    backgroundColor: '#EF4444' + '15',
    padding: 10,
    borderRadius: 12
  },
  roleTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24
  },
  roleTab: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  roleTabText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13,
    fontWeight: '700'
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 5
  },
  input: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 46,
    paddingRight: 16,
    fontSize: 14.5,
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  roleExtraCard: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.05)'
  },
  sectionTitle: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 10
  },
  descText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 11.5,
    marginBottom: 12
  },
  preferencesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  prefBadge: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14
  },
  prefText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    fontSize: 10.5,
    fontWeight: '700'
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
    marginTop: 10,
    marginBottom: 20
  },
  btnText: {
    fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15.5
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  }
});
export default RegisterScreen;
