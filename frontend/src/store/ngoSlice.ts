import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NgoNotification {
  id: string;
  type: 'new_donation' | 'accepted' | 'volunteer_assigned' | 'delivery_completed';
  title: string;
  message: string;
  donationId?: string;
  timestamp: string;
  read: boolean;
}

interface NgoState {
  myDonations: any[];
  activeDonation: any | null;
  notifications: NgoNotification[];
  unreadCount: number;
  loading: boolean;
}

const MOCK_NOTIFICATIONS: NgoNotification[] = [
  {
    id: 'notif_1',
    type: 'new_donation',
    title: 'New Donation Available!',
    message: '80 Plates of Biryani listed near Koramangala — High freshness score 94%',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    read: false,
  },
  {
    id: 'notif_2',
    type: 'volunteer_assigned',
    title: 'Volunteer Assigned',
    message: 'Rohan Sharma has been assigned to pick up your bread donation from Modern Bakery',
    donationId: 'c002',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    read: false,
  },
  {
    id: 'notif_3',
    type: 'delivery_completed',
    title: 'Delivery Completed! 🎉',
    message: 'Mixed Vegetables (25 Kg) successfully delivered. Community impact updated!',
    donationId: 'c003',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    read: true,
  },
  {
    id: 'notif_4',
    type: 'accepted',
    title: 'Donation Accepted',
    message: 'You accepted 40 Packets of Fresh Bread from Modern Bakery. Awaiting volunteer.',
    donationId: 'c001',
    timestamp: new Date(Date.now() - 8 * 3600000).toISOString(),
    read: true,
  },
];

const initialState: NgoState = {
  myDonations: [],
  activeDonation: null,
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: MOCK_NOTIFICATIONS.filter(n => !n.read).length,
  loading: false,
};

const ngoSlice = createSlice({
  name: 'ngo',
  initialState,
  reducers: {
    setMyDonations: (state, action: PayloadAction<any[]>) => {
      state.myDonations = action.payload;
      state.loading = false;
    },
    setActiveDonation: (state, action: PayloadAction<any | null>) => {
      state.activeDonation = action.payload;
    },
    updateDonationInList: (state, action: PayloadAction<any>) => {
      const index = state.myDonations.findIndex(
        d => d.id === action.payload.id || d._id === action.payload._id
      );
      if (index !== -1) {
        state.myDonations[index] = action.payload;
      }
      if (
        state.activeDonation &&
        (state.activeDonation.id === action.payload.id ||
          state.activeDonation._id === action.payload._id)
      ) {
        state.activeDonation = action.payload;
      }
    },
    removeDonation: (state, action: PayloadAction<string>) => {
      state.myDonations = state.myDonations.filter(
        d => d.id !== action.payload && d._id !== action.payload
      );
    },
    addNotification: (state, action: PayloadAction<NgoNotification>) => {
      state.notifications.unshift(action.payload);
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
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const {
  setMyDonations,
  setActiveDonation,
  updateDonationInList,
  removeDonation,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  setLoading,
} = ngoSlice.actions;

export default ngoSlice.reducer;
