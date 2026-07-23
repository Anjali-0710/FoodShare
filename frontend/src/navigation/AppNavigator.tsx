import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { ShieldX, LogOut } from 'lucide-react-native';
import { RootState } from '../store';
import { logout } from '../store/authSlice';
import { AppTheme } from '../theme/theme';
import { ROLE_SCREENS, checkRouteAccess } from './guards';

// Screen Imports
import LoginScreen from '../screens/shared/LoginScreen';
import RegisterScreen from '../screens/shared/RegisterScreen';
import ForgotPasswordScreen from '../screens/shared/ForgotPasswordScreen';

import DonorDashboard from '../screens/donor/DonorDashboard';
import CreateDonationScreen from '../screens/donor/CreateDonationScreen';
import TrackDonationScreen from '../screens/donor/TrackDonationScreen';
import HistoryScreen from '../screens/donor/HistoryScreen';
import DonationListScreen from '../screens/donor/DonationListScreen';
import DonationDetailScreen from '../screens/donor/DonationDetailScreen';

import ProfileScreen from '../screens/shared/ProfileScreen';

import NgoDashboard from '../screens/ngo/NgoDashboard';
import BrowseDonationsScreen from '../screens/ngo/BrowseDonationsScreen';
import NgoRequestsScreen from '../screens/ngo/NgoRequestsScreen';
import NgoDonationDetailScreen from '../screens/ngo/NgoDonationDetailScreen';
import NgoNotificationsScreen from '../screens/ngo/NgoNotificationsScreen';

import VolunteerDashboard from '../screens/volunteer/VolunteerDashboard';
import PickupRouteScreen from '../screens/volunteer/PickupRouteScreen';
import LeaderboardScreen from '../screens/volunteer/LeaderboardScreen';
import VolunteerHistoryScreen from '../screens/volunteer/VolunteerHistoryScreen';
import VolunteerNotificationsScreen from '../screens/volunteer/VolunteerNotificationsScreen';
import NotificationCenterScreen from '../screens/shared/NotificationCenterScreen';
import NotificationHistoryScreen from '../screens/shared/NotificationHistoryScreen';
import MapsPlaygroundScreen from '../screens/shared/MapsPlaygroundScreen';
import ImageUploadPlaygroundScreen from '../screens/shared/ImageUploadPlaygroundScreen';

import AdminDashboard from '../screens/admin/AdminDashboard';

// ─── Inline Unauthorized Screen ────────────────────────────────────────────────
const UnauthorizedScreen: React.FC<{ theme: AppTheme; navigate: (s: string) => void }> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const handleLogout = () => {
    dispatch(logout());
    navigate('Login');
  };
  return (
    <View style={[uStyles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[uStyles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.error + '30' }]}>
        <ShieldX size={48} color={theme.colors.error} style={{ marginBottom: 16 }} />
        <Text style={[uStyles.title, { color: theme.colors.error }]}>Access Denied</Text>
        <Text style={[uStyles.subtitle, { color: theme.colors.textSecondary }]}>
          You do not have permission to view this page. Please contact your administrator if you believe this is an error.
        </Text>
        <TouchableOpacity
          id="btn-unauthorized-go-dashboard"
          style={[uStyles.btn, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigate('Dashboard')}
        >
          <Text style={uStyles.btnText}>Go to My Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          id="btn-unauthorized-logout"
          style={[uStyles.outlineBtn, { borderColor: theme.colors.border }]}
          onPress={handleLogout}
        >
          <LogOut size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[uStyles.outlineBtnText, { color: theme.colors.textSecondary }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const uStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, padding: 32, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn: { width: '100%', height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  outlineBtnText: { fontSize: 13, fontWeight: '600' },
});

// ─── Main Navigator ────────────────────────────────────────────────────────────
interface AppNavigatorProps {
  theme: AppTheme;
  currentScreen: string;
  setScreen: (screen: string) => void;
}

export const AppNavigator: React.FC<AppNavigatorProps> = ({
  theme,
  currentScreen,
  setScreen,
}) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  // Run the unified Route & Role guards check
  const access = checkRouteAccess(isAuthenticated, user, currentScreen);

  if (!access.allowed) {
    if (access.redirectScreen === 'Login') {
      if (currentScreen !== 'Login' && currentScreen !== 'Register' && currentScreen !== 'ForgotPassword') {
        setTimeout(() => setScreen('Login'), 0);
      }
      switch (currentScreen) {
        case 'Register':
          return <RegisterScreen theme={theme} navigate={setScreen} />;
        case 'ForgotPassword':
          return <ForgotPasswordScreen theme={theme} navigate={setScreen} />;
        case 'Login':
        default:
          return <LoginScreen theme={theme} navigate={setScreen} />;
      }
    }

    if (access.redirectScreen === 'Dashboard') {
      setTimeout(() => setScreen('Dashboard'), 0);
      return null;
    }

    if (access.redirectScreen === 'Unauthorized') {
      return <UnauthorizedScreen theme={theme} navigate={setScreen} />;
    }
  }

  // Handle unauthenticated state early rendering
  if (!isAuthenticated || !user) {
    switch (currentScreen) {
      case 'Register':
        return <RegisterScreen theme={theme} navigate={setScreen} />;
      case 'ForgotPassword':
        return <ForgotPasswordScreen theme={theme} navigate={setScreen} />;
      case 'Login':
      default:
        return <LoginScreen theme={theme} navigate={setScreen} />;
    }
  }

  const role = user.role;
  switch (role) {
    case 'donor':
      switch (currentScreen) {
        case 'CreateDonation':
          return <CreateDonationScreen theme={theme} navigate={setScreen} />;
        case 'TrackDonation':
          return <TrackDonationScreen theme={theme} navigate={setScreen} />;
        case 'History':
          return <HistoryScreen theme={theme} navigate={setScreen} />;
        case 'DonationList':
          return <DonationListScreen theme={theme} navigate={setScreen} />;
        case 'DonationDetail':
          return <DonationDetailScreen theme={theme} navigate={setScreen} />;
        case 'NotificationCenter':
        case 'Notifications':
        case 'NotificationCenterScreen':
          return <NotificationCenterScreen theme={theme} navigate={setScreen} />;
        case 'NotificationHistory':
          return <NotificationHistoryScreen theme={theme} navigate={setScreen} />;
        case 'Profile':
          return <ProfileScreen theme={theme} navigate={setScreen} />;
        case 'MapsPlayground':
          return <MapsPlaygroundScreen theme={theme} navigate={setScreen} />;
        case 'ImageUploadPlayground':
          return <ImageUploadPlaygroundScreen theme={theme} navigate={setScreen} />;
        case 'Dashboard':
        default:
          return <DonorDashboard theme={theme} navigate={setScreen} />;
      }

    case 'ngo':
      switch (currentScreen) {
        case 'BrowseDonations':
          return <BrowseDonationsScreen theme={theme} navigate={setScreen} />;
        case 'NgoRequests':
          return <NgoRequestsScreen theme={theme} navigate={setScreen} />;
        case 'NgoDonationDetail':
          return <NgoDonationDetailScreen theme={theme} navigate={setScreen} />;
        case 'NgoNotifications':
          return <NgoNotificationsScreen theme={theme} navigate={setScreen} />;
        case 'History':
          return <HistoryScreen theme={theme} navigate={setScreen} />;
        case 'NotificationCenter':
        case 'Notifications':
        case 'NotificationCenterScreen':
          return <NotificationCenterScreen theme={theme} navigate={setScreen} />;
        case 'NotificationHistory':
          return <NotificationHistoryScreen theme={theme} navigate={setScreen} />;
        case 'Profile':
          return <ProfileScreen theme={theme} navigate={setScreen} />;
        case 'MapsPlayground':
          return <MapsPlaygroundScreen theme={theme} navigate={setScreen} />;
        case 'ImageUploadPlayground':
          return <ImageUploadPlaygroundScreen theme={theme} navigate={setScreen} />;
        case 'Dashboard':
        default:
          return <NgoDashboard theme={theme} navigate={setScreen} />;
      }

    case 'volunteer':
      switch (currentScreen) {
        case 'PickupRoute':
          return <PickupRouteScreen theme={theme} navigate={setScreen} />;
        case 'Leaderboard':
          return <LeaderboardScreen theme={theme} navigate={setScreen} />;
        case 'VolunteerHistory':
          return <VolunteerHistoryScreen theme={theme} navigate={setScreen} />;
        case 'VolunteerNotifications':
          return <VolunteerNotificationsScreen theme={theme} navigate={setScreen} />;
        case 'NotificationCenter':
        case 'Notifications':
        case 'NotificationCenterScreen':
          return <NotificationCenterScreen theme={theme} navigate={setScreen} />;
        case 'NotificationHistory':
          return <NotificationHistoryScreen theme={theme} navigate={setScreen} />;
        case 'Profile':
          return <ProfileScreen theme={theme} navigate={setScreen} />;
        case 'MapsPlayground':
          return <MapsPlaygroundScreen theme={theme} navigate={setScreen} />;
        case 'ImageUploadPlayground':
          return <ImageUploadPlaygroundScreen theme={theme} navigate={setScreen} />;
        case 'Dashboard':
        default:
          return <VolunteerDashboard theme={theme} navigate={setScreen} />;
      }

    case 'admin':
      switch (currentScreen) {
        case 'NotificationCenter':
        case 'Notifications':
        case 'NotificationCenterScreen':
        case 'AdminNotifications':
          return <NotificationCenterScreen theme={theme} navigate={setScreen} />;
        case 'NotificationHistory':
          return <NotificationHistoryScreen theme={theme} navigate={setScreen} />;
        case 'Profile':
          return <ProfileScreen theme={theme} navigate={setScreen} />;
        case 'MapsPlayground':
          return <MapsPlaygroundScreen theme={theme} navigate={setScreen} />;
        case 'ImageUploadPlayground':
          return <ImageUploadPlaygroundScreen theme={theme} navigate={setScreen} />;
        case 'Dashboard':
        default:
          return <AdminDashboard theme={theme} navigate={setScreen} />;
      }

    default:
      // Unknown role — force logout
      return <UnauthorizedScreen theme={theme} navigate={setScreen} />;
  }
};

export default AppNavigator;
