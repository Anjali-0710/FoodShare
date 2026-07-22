/**
 * Whitelist mapping defining which screens are accessible by which user roles.
 */
export const ROLE_SCREENS: Record<string, string[]> = {
  donor:     ['Dashboard', 'CreateDonation', 'TrackDonation', 'History', 'DonationList', 'DonationDetail', 'Profile', 'NotificationCenter', 'NotificationHistory', 'MapsPlayground', 'ImageUploadPlayground', 'AIChat'],
  ngo:       ['Dashboard', 'BrowseDonations', 'NgoRequests', 'NgoDonationDetail', 'NgoNotifications', 'History', 'Profile', 'NotificationCenter', 'NotificationHistory', 'MapsPlayground', 'ImageUploadPlayground', 'AIChat'],
  volunteer: ['Dashboard', 'PickupRoute', 'Leaderboard', 'Profile', 'VolunteerHistory', 'VolunteerNotifications', 'NotificationCenter', 'NotificationHistory', 'MapsPlayground', 'ImageUploadPlayground', 'AIChat'],
  admin:     ['Dashboard', 'Profile', 'NotificationCenter', 'NotificationHistory', 'MapsPlayground', 'ImageUploadPlayground', 'AIChat'],
};

interface RouteAccessResult {
  allowed: boolean;
  redirectScreen: 'Login' | 'Dashboard' | 'Unauthorized' | null;
}

/**
 * Route & Role Guards validation checker
 * Implements strict security:
 * 1. Blocks unauthenticated users from reaching dashboard/app screens -> Redirects to Login.
 * 2. Redirects logged in users trying to hit login/signup screens -> Redirects to Dashboard.
 * 3. Enforces RBAC permissions based on user role -> Redirects to Unauthorized screen.
 */
export const checkRouteAccess = (
  isAuthenticated: boolean,
  user: { role: string } | null,
  targetScreen: string
): RouteAccessResult => {
  const isAuthScreen = ['Login', 'Register', 'ForgotPassword'].includes(targetScreen);

  // 1. Unauthenticated checks
  if (!isAuthenticated || !user) {
    if (isAuthScreen) {
      return { allowed: true, redirectScreen: null };
    }
    return { allowed: false, redirectScreen: 'Login' };
  }

  // 2. Authenticated user attempting to visit Login/Register/Forgot -> redirect to their default home
  if (isAuthScreen) {
    return { allowed: false, redirectScreen: 'Dashboard' };
  }

  // 3. Role-Based Access Control (RBAC) check
  const role = user.role;
  const allowedScreens = ROLE_SCREENS[role] || [];

  if (targetScreen === 'Dashboard') {
    return { allowed: true, redirectScreen: null };
  }

  if (allowedScreens.includes(targetScreen)) {
    return { allowed: true, redirectScreen: null };
  }

  // 4. Fallback: Block unauthorized route paths
  return { allowed: false, redirectScreen: 'Unauthorized' };
};
