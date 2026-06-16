import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import donationReducer from './donationSlice';
import volunteerReducer from './volunteerSlice';
import ngoReducer from './ngoSlice';
import notificationReducer from './notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    donation: donationReducer,
    volunteer: volunteerReducer,
    ngo: ngoReducer,
    notification: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
