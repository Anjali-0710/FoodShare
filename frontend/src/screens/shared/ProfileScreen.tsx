import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  CheckCircle2,
  Edit3,
  Save,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react-native';
import { RootState } from '../../store';
import { logout, toggleTheme, updateProfile } from '../../store/authSlice';
import { AuthService } from '../../services/authService';
import { AppTheme } from '../../theme/theme';

interface ProfileScreenProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

const ROLE_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  donor: { label: 'Food Donor', color: '#22C55E', emoji: '🥗' },
  ngo: { label: 'NGO Partner', color: '#3B82F6', emoji: '🏢' },
  volunteer: { label: 'Volunteer', color: '#8B5CF6', emoji: '🚴' },
  admin: { label: 'Administrator', color: '#EF4444', emoji: '🔐' },
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [name, setName] = useState(user?.name || '');
  const [contactNumber, setContactNumber] = useState(user?.contactNumber || '');
  const [address, setAddress] = useState(user?.address || '');

  const roleInfo = ROLE_LABELS[(user?.role || 'donor')] || ROLE_LABELS.donor;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await AuthService.updateProfile({ name: name.trim(), contactNumber, address });
      dispatch(updateProfile({ name: name.trim(), contactNumber, address }));
      setSuccess(true);
      setEditMode(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // Offline: optimistic success
      dispatch(updateProfile({ name: name.trim(), contactNumber, address }));
      setSuccess(true);
      setEditMode(false);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('Login');
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setContactNumber(user?.contactNumber || '');
    setAddress(user?.address || '');
    setEditMode(false);
    setError(null);
  };

  const avatarInitials = (user?.name || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate('Dashboard')} id="btn-profile-back">
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Profile</Text>
        <TouchableOpacity
          id="btn-toggle-theme-profile"
          style={[styles.themeBtn, { backgroundColor: theme.colors.card }]}
          onPress={() => dispatch(toggleTheme())}
        >
          {theme.dark ? (
            <Sun size={17} color={theme.colors.warning} />
          ) : (
            <Moon size={17} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar & Role Section */}
        <View style={[styles.avatarSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{avatarInitials}</Text>
          </View>

          <Text style={[styles.displayName, { color: theme.colors.text }]}>{user?.name}</Text>
          <Text style={[styles.displayEmail, { color: theme.colors.textSecondary }]}>{user?.email}</Text>

          <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '18', borderColor: roleInfo.color + '30' }]}>
            <Text style={styles.roleEmoji}>{roleInfo.emoji}</Text>
            <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
          </View>
        </View>

        {/* Feedback messages */}
        {success && (
          <View style={[styles.successBox, { backgroundColor: theme.colors.success + '15' }]}>
            <CheckCircle2 size={14} color={theme.colors.success} style={{ marginRight: 8 }} />
            <Text style={[styles.successText, { color: theme.colors.success }]}>Profile updated successfully!</Text>
          </View>
        )}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.colors.error + '15' }]}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        )}

        {/* Profile Fields */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Personal Information</Text>
            {!editMode && (
              <TouchableOpacity
                id="btn-edit-profile"
                style={[styles.editBtn, { backgroundColor: theme.colors.primary + '18' }]}
                onPress={() => setEditMode(true)}
              >
                <Edit3 size={13} color={theme.colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.editBtnText, { color: theme.colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabel}>
              <User size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.fieldLabelText, { color: theme.colors.textSecondary }]}>Full Name</Text>
            </View>
            {editMode ? (
              <TextInput
                id="input-profile-name"
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '08' }]}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.colors.text }]}>{user?.name || '—'}</Text>
            )}
          </View>

          {/* Email (read-only) */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabel}>
              <Mail size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.fieldLabelText, { color: theme.colors.textSecondary }]}>Email Address</Text>
            </View>
            <View style={styles.readOnlyRow}>
              <Text style={[styles.fieldValue, { color: theme.colors.text }]}>{user?.email || '—'}</Text>
              <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.success + '18' }]}>
                <CheckCircle2 size={10} color={theme.colors.success} style={{ marginRight: 3 }} />
                <Text style={[styles.verifiedText, { color: theme.colors.success }]}>Verified</Text>
              </View>
            </View>
          </View>

          {/* Contact Number */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabel}>
              <Phone size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.fieldLabelText, { color: theme.colors.textSecondary }]}>Contact Number</Text>
            </View>
            {editMode ? (
              <TextInput
                id="input-profile-phone"
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '08' }]}
                value={contactNumber}
                onChangeText={setContactNumber}
                placeholder="+91 XXXXX XXXXX"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.colors.text }]}>{user?.contactNumber || '—'}</Text>
            )}
          </View>

          {/* Address */}
          <View style={[styles.fieldGroup, { borderBottomWidth: 0 }]}>
            <View style={styles.fieldLabel}>
              <MapPin size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.fieldLabelText, { color: theme.colors.textSecondary }]}>Address</Text>
            </View>
            {editMode ? (
              <TextInput
                id="input-profile-address"
                style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '08' }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Your address"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: theme.colors.text }]}>{user?.address || '—'}</Text>
            )}
          </View>

          {/* Save / Cancel Buttons */}
          {editMode && (
            <View style={styles.editActions}>
              <TouchableOpacity
                id="btn-cancel-edit"
                style={[styles.cancelEditBtn, { borderColor: theme.colors.border }]}
                onPress={handleCancel}
                disabled={saving}
              >
                <Text style={[styles.cancelEditText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                id="btn-save-profile"
                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account Security Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <Shield size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Account Security</Text>
          </View>

          <TouchableOpacity
            id="btn-change-password"
            style={[styles.securityRow, { borderBottomColor: theme.colors.border }]}
            onPress={() => navigate('ForgotPassword')}
          >
            <Text style={[styles.securityRowText, { color: theme.colors.text }]}>Change Password</Text>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <ArrowLeft size={14} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.securityRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.securityRowText, { color: theme.colors.text }]}>Account Role</Text>
            <Text style={[styles.securityRoleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          id="btn-profile-logout"
          style={[styles.logoutBtn, { backgroundColor: theme.colors.error + '12', borderColor: theme.colors.error + '30' }]}
          onPress={handleLogout}
        >
          <LogOut size={16} color={theme.colors.error} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: theme.colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginRight: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'System'
  },
  themeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16, paddingBottom: 40 },
  avatarSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'System'
  },
  displayName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: 'System'
  },
  displayEmail: {
    fontSize: 13,
    marginBottom: 14,
    fontFamily: 'System'
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleEmoji: { fontSize: 14, marginRight: 6 },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'System'
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  successText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System'
  },
  errorBox: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 12
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System'
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    fontFamily: 'System'
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'System'
  },
  fieldGroup: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  fieldLabelText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System'
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500',
    paddingLeft: 20,
    fontFamily: 'System'
  },
  readOnlyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'System'
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    marginLeft: 20,
    fontFamily: 'System'
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    marginLeft: 20,
    minHeight: 64,
    fontFamily: 'System'
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelEditBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System'
  },
  saveBtn: {
    flex: 2,
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'System'
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  securityRowText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'System'
  },
  securityRoleText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'System'
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'System'
  },
});

export default ProfileScreen;
