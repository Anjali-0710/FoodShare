import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DonationItem {
  id: string;
  foodType: 'Cooked Food' | 'Vegetables' | 'Fruits' | 'Bakery Items' | 'Beverages' | 'Grocery Items';
  quantity: number;
  unit: 'Kg' | 'Liters' | 'Plates' | 'Packets';
  bestBeforeDate: string;
  preparationTime: string;
  temperature: number;
  donorId: string;
  donorName: string;
  ngoId?: string;
  ngoName?: string;
  volunteerId?: string;
  volunteerName?: string;
  status: 'Pending' | 'Accepted' | 'Assigned' | 'Picked Up' | 'Delivered' | 'Completed' | 'Cancelled';
  pickupAddress: string;
  gpsLocation: { latitude: number; longitude: number };
  contactNumber: string;
  additionalNotes: string;
  imageUrls: string[];
  freshnessScore: number;
  qrCode: string;
  createdAt: string;
}

export interface NgoRecommendation {
  ngoId: string;
  name: string;
  distanceKm: number;
  matchScore: number;
  capacityRemaining: number;
  preferences: string[];
}

interface DonationState {
  items: DonationItem[];
  activeItem: DonationItem | null;
  recommendations: NgoRecommendation[];
  loading: boolean;
  error: string | null;
}

const initialState: DonationState = {
  items: [],
  activeItem: null,
  recommendations: [],
  loading: false,
  error: null,
};

const donationSlice = createSlice({
  name: 'donation',
  initialState,
  reducers: {
    setDonations: (state, action: PayloadAction<DonationItem[]>) => {
      state.items = action.payload;
      state.loading = false;
      state.error = null;
    },
    addDonation: (state, action: PayloadAction<DonationItem>) => {
      state.items.unshift(action.payload);
    },
    updateDonationInList: (state, action: PayloadAction<DonationItem>) => {
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.activeItem && state.activeItem.id === action.payload.id) {
        state.activeItem = action.payload;
      }
    },
    setActiveItem: (state, action: PayloadAction<DonationItem | null>) => {
      state.activeItem = action.payload;
    },
    setRecommendations: (state, action: PayloadAction<NgoRecommendation[]>) => {
      state.recommendations = action.payload;
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
  setDonations,
  addDonation,
  updateDonationInList,
  setActiveItem,
  setRecommendations,
  setLoading,
  setError,
} = donationSlice.actions;

export default donationSlice.reducer;
