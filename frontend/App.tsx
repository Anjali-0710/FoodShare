import React, { useState, useEffect, useCallback } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { View, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { store, RootState } from './src/store';
import { lightTheme, darkTheme } from './src/theme/theme';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationToast from './src/components/NotificationToast';
import AIChatbot from './src/components/chatbot/AIChatbot';
import { supabase } from './src/services/supabase';
import { NotificationService } from './src/services/notificationService';
import { AuthService } from './src/services/authService';
import { setCredentials, logout } from './src/store/authSlice';
import { useSessionTimeout } from './src/hooks/useSessionTimeout';

// Programmatically load Google Fonts Outfit web asset
if (typeof document !== 'undefined') {
  document.title = 'FoodReach';
  const fontLinkId = 'google-fonts-outfit-ui';
  if (!document.getElementById(fontLinkId)) {
    const link = document.createElement('link');
    link.id = fontLinkId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  // Disable browser autofill styling & autocomplete globally
  const styleId = 'disable-autofill-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
        box-shadow: 0 0 0 1000px transparent inset !important;
        -webkit-text-fill-color: inherit !important;
        background-color: transparent !important;
        transition: background-color 9999s ease-in-out 0s;
      }
      input[autocomplete="off"],
      input[autocomplete="new-password"] {
        background-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
  }
}

const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const themeMode = useSelector((state: RootState) => state.auth.themeMode);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);

  const [screen, setScreen] = useState('Login');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Session timeout warning callback ─────────────────────────────────────
  const handleSessionWarning = useCallback(() => {
    setToastMessage('⏳ Your session will expire in 1 minute due to inactivity. Please interact to stay signed in.');
    setToastVisible(true);
  }, []);

  // ── 15-minute inactivity session timeout (web + native) ───────────────────
  useSessionTimeout(handleSessionWarning);

  // Selected Theme Choice
  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  // Supabase Auth session persistence — restores session on app load and listens for changes
  useEffect(() => {
    // Restore existing session safely
    AuthService.getSession()
      .then((sessionData) => {
        if (sessionData && !isAuthenticated) {
          dispatch(setCredentials({ user: sessionData.user, token: sessionData.token }));
        }
      })
      .catch((err) => {
        console.error('Failed to restore session:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // Listen for auth state changes (login, logout, token refresh)
    let subscription: any;
    try {
      const authListener = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if (event === 'SIGNED_OUT' || !session) {
            dispatch(logout());
          } else if (session?.user?.is_anonymous) {
            // Explicitly sign out anonymous users and dispatch logout
            await supabase.auth.signOut();
            dispatch(logout());
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Refresh profile data
            const sessionData = await AuthService.getSession();
            if (sessionData) {
              dispatch(setCredentials({ user: sessionData.user, token: sessionData.token }));
            } else {
              // Clear Supabase session if no corresponding database profile exists
              await supabase.auth.signOut();
              dispatch(logout());
            }
          }
        } catch (innerErr) {
          console.error('Error in auth state change handler:', innerErr);
        }
      });
      subscription = authListener.data?.subscription;
    } catch (err) {
      console.error('Failed to setup auth state change listener:', err);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Track authentication states to reset current routing screen
  useEffect(() => {
    if (isAuthenticated) {
      setScreen('Dashboard');
    } else {
      setScreen('Login');
    }
  }, [isAuthenticated]);

  // Real-time Database Notifications subscription
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const channel = NotificationService.subscribeToNotifications(user.id, (notif) => {
      setToastMessage(`🔔 ${notif.title}: ${notif.message}`);
      setToastVisible(true);
    });

    return () => {
      if (channel) {
        NotificationService.unsubscribe(channel);
      }
    };
  }, [isAuthenticated, user]);

  // ── Suspension monitor for active logged in users ─────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let isSubscribed = true;

    const checkSuspensionStatus = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active, status')
          .eq('id', user.id)
          .single();

        if (profile && isSubscribed) {
          const statusVal = (profile.status || '').toLowerCase();
          const isSuspended =
            profile.is_active === false ||
            statusVal === 'suspended' ||
            statusVal === 'blocked' ||
            statusVal === 'disabled' ||
            statusVal === 'inactive';

          if (isSuspended) {
            console.warn('[SuspensionMonitor] Logged in user suspended. Executing logout...');
            dispatch(logout());
            await AuthService.logout();
            setScreen('Login');
            setToastMessage('Your account has been suspended. Please contact the administrator.');
            setToastVisible(true);
          }
        }
      } catch (err) {
        console.warn('Suspension check warning:', err);
      }
    };

    checkSuspensionStatus();
    const interval = setInterval(checkSuspensionStatus, 8000);

    const channel = supabase
      .channel(`profile-suspension-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        async (payload) => {
          if (!isSubscribed) return;
          const updated = payload.new;
          const statusVal = (updated?.status || '').toLowerCase();
          const isSuspended =
            updated?.is_active === false ||
            statusVal === 'suspended' ||
            statusVal === 'blocked' ||
            statusVal === 'disabled' ||
            statusVal === 'inactive';

          if (isSuspended) {
            console.warn('[SuspensionMonitor Realtime] User suspended. Executing logout...');
            dispatch(logout());
            await AuthService.logout();
            setScreen('Login');
            setToastMessage('Your account has been suspended. Please contact the administrator.');
            setToastVisible(true);
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, dispatch]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Global Notifications Toast */}
      <NotificationToast
        visible={toastVisible}
        message={toastMessage}
        onClose={() => setToastVisible(false)}
        theme={theme}
      />

      <View style={styles.container}>
        {loading ? (
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            <AppNavigator
              theme={theme}
              currentScreen={screen}
              setScreen={setScreen}
            />
            {isAuthenticated && screen !== 'AIChat' && screen !== 'AIChatScreen' && (
              <AIChatbot theme={theme} />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  container: {
    flex: 1
  }
});
