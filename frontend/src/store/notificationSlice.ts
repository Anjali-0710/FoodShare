import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationItem {
  _id: string;
  userId: string;
  role: 'donor' | 'ngo' | 'admin';
  type: string;
  title: string;
  message: string;
  donationId?: string;
  read: boolean;
  createdAt: string;
  userDetails?: {
    name: string;
    email: string;
    role: string;
  };
}

interface NotificationState {
  items: NotificationItem[];
  history: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  items: [],
  history: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<NotificationItem[]>) => {
      state.items = action.payload;
      state.unreadCount = action.payload.filter(n => !n.read).length;
      state.loading = false;
      state.error = null;
    },
    setHistory: (state, action: PayloadAction<NotificationItem[]>) => {
      state.history = action.payload;
      state.loading = false;
      state.error = null;
    },
    markReadLocal: (state, action: PayloadAction<string>) => {
      const idx = state.items.findIndex(n => n._id === action.payload);
      if (idx !== -1 && !state.items[idx].read) {
        state.items[idx].read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllReadLocal: (state) => {
      state.items.forEach(n => { n.read = true; });
      state.unreadCount = 0;
    },
    deleteLocal: (state, action: PayloadAction<string>) => {
      const idx = state.items.findIndex(n => n._id === action.payload);
      if (idx !== -1) {
        if (!state.items[idx].read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.items.splice(idx, 1);
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    }
  }
});

export const {
  setNotifications,
  setHistory,
  markReadLocal,
  markAllReadLocal,
  deleteLocal,
  setLoading,
  setError
} = notificationSlice.actions;

export default notificationSlice.reducer;
