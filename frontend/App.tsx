import React, { useState, useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { store, RootState } from './src/store';
import { lightTheme, darkTheme } from './src/theme/theme';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationToast from './src/components/NotificationToast';

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
  const [otpDemoCode, setOtpDemoCode] = useState('');

  // Selected Theme Choice
  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  // JWT session persistence — validates real JWT format before restoring from local/session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let token = null;
      let userStr = null;
      let isSession = false;

      // 1. Try reading from localStorage first
      if (window.localStorage) {
        token = window.localStorage.getItem('fs_token');
        userStr = window.localStorage.getItem('fs_user');
      }

      // 2. If not found, fall back to sessionStorage
      if ((!token || !userStr) && window.sessionStorage) {
        token = window.sessionStorage.getItem('fs_token');
        userStr = window.sessionStorage.getItem('fs_user');
        isSession = true;
      }

      // A real JWT has exactly 3 dot-separated base64 segments
      const isRealJwt = (t: string) => {
        const parts = t.split('.');
        return parts.length === 3 && parts.every(p => p.length > 0);
      };

      if (token && userStr && isRealJwt(token)) {
        try {
          const parsedUser = JSON.parse(userStr);
          // Validate user object has required fields before restoring
          if (parsedUser?.id && parsedUser?.role && parsedUser?.email) {
            if (!isAuthenticated) {
              dispatch(setCredentials({ user: parsedUser, token, rememberMe: !isSession }));
            }
          } else {
            // Corrupt user data — clear from both storages
            if (window.localStorage) {
              window.localStorage.removeItem('fs_token');
              window.localStorage.removeItem('fs_user');
            }
            if (window.sessionStorage) {
              window.sessionStorage.removeItem('fs_token');
              window.sessionStorage.removeItem('fs_user');
            }
          }
        } catch (e) {
          // Corrupt session — clear from both storages
          if (window.localStorage) {
            window.localStorage.removeItem('fs_token');
            window.localStorage.removeItem('fs_user');
          }
          if (window.sessionStorage) {
            window.sessionStorage.removeItem('fs_token');
            window.sessionStorage.removeItem('fs_user');
          }
        }
      } else if (token && !isRealJwt(token)) {
        // Stale demo/mock token — clear it from both storages
        if (window.localStorage) {
          window.localStorage.removeItem('fs_token');
          window.localStorage.removeItem('fs_user');
        }
        if (window.sessionStorage) {
          window.sessionStorage.removeItem('fs_token');
          window.sessionStorage.removeItem('fs_user');
        }
        console.info('[FoodShare] Cleared invalid session token.');
      }
    }
  }, [dispatch, isAuthenticated]);

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
          otpDemoCode={otpDemoCode}
          setOtpDemoCode={setOtpDemoCode}
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
