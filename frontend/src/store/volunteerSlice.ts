import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DonationItem } from './donationSlice';

export interface LeaderboardUser {
  id: string;
  name: string;
  volunteerScore: number;
  completedPickups: number;
}

export interface VolunteerNotification {
  id: string;
  type: 'new_assignment' | 'pickup_reminder' | 'delivery_reminder' | 'completion_confirmation';
  title: string;
  message: string;
  donationId?: string;
  timestamp: string;
  read: boolean;
}

interface VolunteerState {
  leaderboard: LeaderboardUser[];
  activePickups: DonationItem[];
  subStatuses: Record<string, 'Pickup Started' | 'In Transit'>;
  notifications: VolunteerNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

const MOCK_NOTIFICATIONS: VolunteerNotification[] = [];

const initialState: VolunteerState = {
  leaderboard: [],
  activePickups: [],
  subStatuses: {},
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: MOCK_NOTIFICATIONS.filter(n => !n.read).length,
  loading: false,
  error: null,
};

const volunteerSlice = createSlice({
  name: 'volunteer',
  initialState,
  reducers: {
    setLeaderboard: (state, action: PayloadAction<LeaderboardUser[]>) => {
      state.leaderboard = action.payload;
      state.loading = false;
      state.error = null;
    },
    setActivePickups: (state, action: PayloadAction<DonationItem[]>) => {
      state.activePickups = action.payload;
      state.loading = false;
      state.error = null;
    },
    setSubStatus: (state, action: PayloadAction<{ id: string; status: 'Pickup Started' | 'In Transit' | null }>) => {
      const { id, status } = action.payload;
      if (status === null) {
        delete state.subStatuses[id];
      } else {
        state.subStatuses[id] = status;
      }
    },
    addVolunteerNotification: (state, action: PayloadAction<Omit<VolunteerNotification, 'id' | 'timestamp' | 'read'>>) => {
      const newNotif: VolunteerNotification = {
        ...action.payload,
        id: `v_notif_${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      state.notifications.unshift(newNotif);
      state.unreadCount += 1;
    },
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notif = state.notifications.find(n => n.id === action.payload);
      if (notif && !notif.read) {
        notif.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllNotificationsRead: (state) => {
      state.notifications.forEach(n => { n.read = true; });
      state.unreadCount = 0;
    },
    removePickupFromList: (state, action: PayloadAction<string>) => {
      state.activePickups = state.activePickups.filter((p) => p.id !== action.payload && (p as any)._id !== action.payload);
      delete state.subStatuses[action.payload];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setLeaderboard,
  setActivePickups,
  setSubStatus,
  addVolunteerNotification,
  markNotificationRead,
  markAllNotificationsRead,
  removePickupFromList,
  setLoading,
  setError,
} = volunteerSlice.actions;

export default volunteerSlice.reducer;

