import React, { useState, useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { store, RootState } from './src/store';
import { lightTheme, darkTheme } from './src/theme/theme';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationToast from './src/components/NotificationToast';
import { supabase } from './src/services/supabase';
import { AuthService } from './src/services/authService';
import { setCredentials, logout } from './src/store/authSlice';

// Programmatically load Google Fonts Outfit web asset
if (typeof document !== 'undefined') {
  const fontLinkId = 'google-fonts-outfit-ui';
  if (!document.getElementById(fontLinkId)) {
    const link = document.createElement('link');
    link.id = fontLinkId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap';
    document.head.appendChild(link);
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
  const [otpEmail, setOtpEmail] = useState('');

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
      });

    // Listen for auth state changes (login, logout, token refresh)
    let subscription: any;
    try {
      const authListener = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if (event === 'SIGNED_OUT' || !session) {
            dispatch(logout());
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Refresh profile data
            const sessionData = await AuthService.getSession();
            if (sessionData) {
              dispatch(setCredentials({ user: sessionData.user, token: sessionData.token }));
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

  // Simulate Push Notifications (FCM) based on role/actions to enhance UX
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let notificationTimer: NodeJS.Timeout;

    if (user.role === 'donor') {
      // Donors get notified when an NGO claims food
      notificationTimer = setTimeout(() => {
        setToastMessage('🔔 Care & Feed Foundation NGO has accepted your surplus Cooked Food donation!');
        setToastVisible(true);
      }, 10000); // Trigger 10 seconds in
    } else if (user.role === 'ngo') {
      // NGOs get notified when a volunteer starts delivery
      notificationTimer = setTimeout(() => {
        setToastMessage('🚚 Volunteer Rohan Sharma has claimed your accepted Fruits delivery! ETA: 8 Mins');
        setToastVisible(true);
      }, 12000);
    } else if (user.role === 'volunteer') {
      // Volunteers get warning if food decay is predicted
      notificationTimer = setTimeout(() => {
        setToastMessage('⚠️ Expiry Warning: A Cooked Food cargo is at 28°C and decays in 3 hours. Please pick up promptly!');
        setToastVisible(true);
      }, 8000);
    }

    return () => clearTimeout(notificationTimer);
  }, [isAuthenticated, user]);

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
        <AppNavigator 
          theme={theme} 
          currentScreen={screen} 
          setScreen={setScreen} 
          otpEmail={otpEmail}
          setOtpEmail={setOtpEmail}
        />
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
