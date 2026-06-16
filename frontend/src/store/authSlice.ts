import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'donor' | 'ngo' | 'volunteer' | 'admin';
  contactNumber: string;
  address?: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
  };
  ngoCapacity?: number;
  foodTypePreference?: string[];
  volunteerScore?: number;
  completedPickups?: number;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  themeMode: 'light' | 'dark';
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  themeMode: 'light',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserProfile; token: string; rememberMe?: boolean }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      
      const remember = action.payload.rememberMe ?? true; // Default to true if not specified
      
      if (typeof window !== 'undefined') {
        if (remember) {
          if (window.localStorage) {
            window.localStorage.setItem('fs_token', action.payload.token);
            window.localStorage.setItem('fs_user', JSON.stringify(action.payload.user));
            window.localStorage.setItem('fs_remember', 'true');
          }
          if (window.sessionStorage) {
            window.sessionStorage.removeItem('fs_token');
            window.sessionStorage.removeItem('fs_user');
          }
        } else {
          if (window.sessionStorage) {
            window.sessionStorage.setItem('fs_token', action.payload.token);
            window.sessionStorage.setItem('fs_user', JSON.stringify(action.payload.user));
          }
          if (window.localStorage) {
            window.localStorage.removeItem('fs_token');
            window.localStorage.removeItem('fs_user');
            window.localStorage.setItem('fs_remember', 'false');
          }
        }
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      if (typeof window !== 'undefined') {
        if (window.localStorage) {
          window.localStorage.removeItem('fs_token');
          window.localStorage.removeItem('fs_user');
          window.localStorage.removeItem('fs_remember');
        }
        if (window.sessionStorage) {
          window.sessionStorage.setItem('fs_token', ''); // Clear session values
          window.sessionStorage.setItem('fs_user', '');
          window.sessionStorage.removeItem('fs_token');
          window.sessionStorage.removeItem('fs_user');
        }
      }
    },
    toggleTheme: (state) => {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
    },
    updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        if (typeof window !== 'undefined') {
          if (window.localStorage && window.localStorage.getItem('fs_user')) {
            window.localStorage.setItem('fs_user', JSON.stringify(state.user));
          }
          if (window.sessionStorage && window.sessionStorage.getItem('fs_user')) {
            window.sessionStorage.setItem('fs_user', JSON.stringify(state.user));
          }
        }
      }
    },
    updateKarmaPoints: (state, action: PayloadAction<number>) => {
      if (state.user && state.user.role === 'volunteer') {
        state.user.volunteerScore = (state.user.volunteerScore || 0) + action.payload;
        state.user.completedPickups = (state.user.completedPickups || 0) + 1;
      }
    }
  },
});

export const { setCredentials, logout, toggleTheme, updateProfile, updateKarmaPoints } = authSlice.actions;
export default authSlice.reducer;
