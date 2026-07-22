import bcrypt from 'bcryptjs';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'donor' | 'ngo' | 'volunteer' | 'admin';
  contactNumber: string;
  address: string;
  gpsLocation: { latitude: number; longitude: number };
  ngoCapacity?: number;
  foodTypePreference?: string[];
  volunteerScore: number;
  completedPickups: number;
  resetPasswordCode?: string;
  resetPasswordExpires?: Date;
  isVerified?: boolean;
  verificationCode?: string;
  verificationExpires?: Date;
  isActive?: boolean;
  createdAt: Date;
}

export interface MockDonation {
  id: string;
  foodType: 'Cooked Food' | 'Vegetables' | 'Fruits' | 'Bakery Items' | 'Beverages' | 'Grocery Items';
  quantity: number;
  unit: 'Kg' | 'Liters' | 'Plates' | 'Packets';
  bestBeforeDate: Date;
  preparationTime: Date;
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
  createdAt: Date;
}

export interface MockSystemLog {
  id: string;
  action: string;
  performedBy: string;
  role: string;
  details: string;
  timestamp: Date;
}

export const mockUsers: MockUser[] = [];
export const mockDonations: MockDonation[] = [];
export const mockSystemLogs: MockSystemLog[] = [];

// Seed Database
export const seedMockDatabase = async () => {
  if (mockUsers.length > 0) return; // already seeded

  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash('password123', salt);

  // Seed Users
  mockUsers.push(
    {
      id: 'usr_donor_1',
      name: 'Green Bakery & Cafe',
      email: 'donor@foodreach.com',
      passwordHash: commonPasswordHash,
      role: 'donor',
      contactNumber: '+919876543210',
      address: 'Connaught Place, New Delhi',
      gpsLocation: { latitude: 28.6304, longitude: 77.2177 },
      volunteerScore: 0,
      completedPickups: 0,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'usr_ngo_1',
      name: 'Care & Feed Foundation NGO',
      email: 'ngo@foodreach.com',
      passwordHash: commonPasswordHash,
      role: 'ngo',
      contactNumber: '+919999888877',
      address: 'Karol Bagh, New Delhi',
      gpsLocation: { latitude: 28.6448, longitude: 77.1903 },
      ngoCapacity: 250,
      foodTypePreference: ['Cooked Food', 'Vegetables', 'Grocery Items'],
      volunteerScore: 0,
      completedPickups: 0,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'usr_ngo_2',
      name: 'Hope Children Shelter',
      email: 'hope@foodreach.com',
      passwordHash: commonPasswordHash,
      role: 'ngo',
      contactNumber: '+919999111122',
      address: 'Okhla, New Delhi',
      gpsLocation: { latitude: 28.5355, longitude: 77.2639 },
      ngoCapacity: 120,
      foodTypePreference: ['Fruits', 'Beverages', 'Bakery Items'],
      volunteerScore: 0,
      completedPickups: 0,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'usr_volunteer_1',
      name: 'Rohan Sharma',
      email: 'volunteer@foodreach.com',
      passwordHash: commonPasswordHash,
      role: 'volunteer',
      contactNumber: '+919555444333',
      address: 'Rajendra Place, New Delhi',
      gpsLocation: { latitude: 28.6421, longitude: 77.1782 },
      foodTypePreference: ['Cooked Food', 'Vegetables', 'Bakery Items'],
      volunteerScore: 350,
      completedPickups: 7,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'usr_volunteer_2',
      name: 'Anjali Gupta',
      email: 'anjali@foodreach.com',
      passwordHash: commonPasswordHash,
      role: 'volunteer',
      contactNumber: '+919666777888',
      address: 'Saket, New Delhi',
      gpsLocation: { latitude: 28.5244, longitude: 77.2066 },
      foodTypePreference: ['Grocery Items', 'Fruits'],
      volunteerScore: 180,
      completedPickups: 4,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'usr_admin_1',
      name: 'Super Admin',
      email: 'admin@foodshare.com',
      passwordHash: commonPasswordHash,
      role: 'admin',
      contactNumber: '+919000000000',
      address: 'HQ Administrative Block, New Delhi',
      gpsLocation: { latitude: 28.6139, longitude: 77.2090 },
      volunteerScore: 0,
      completedPickups: 0,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    }
  );

  mockUsers.forEach(u => { u.isActive = true; u.isVerified = true; });

  // Seed Historical & Active Donations (For rich chart visualizations)
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  mockDonations.push(
    {
      id: 'don_1',
      foodType: 'Cooked Food',
      quantity: 50,
      unit: 'Plates',
      bestBeforeDate: new Date(now + 4 * 60 * 60 * 1000), // expires in 4 hours
      preparationTime: new Date(now - 2 * 60 * 60 * 1000), // prepped 2 hrs ago
      temperature: 26,
      donorId: 'usr_donor_1',
      donorName: 'Green Bakery & Cafe',
      status: 'Pending',
      pickupAddress: 'Connaught Place Main Circle, Near Metro Gate 3, New Delhi',
      gpsLocation: { latitude: 28.6304, longitude: 77.2177 },
      contactNumber: '+919876543210',
      additionalNotes: 'Freshly cooked rice and lentils from afternoon buffet. Packaged cleanly.',
      imageUrls: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c'],
      freshnessScore: 82,
      qrCode: 'QR_DON_1_8954',
      createdAt: new Date(now - 2 * 60 * 60 * 1000)
    },
    {
      id: 'don_2',
      foodType: 'Fruits',
      quantity: 15,
      unit: 'Kg',
      bestBeforeDate: new Date(now + 2 * oneDay),
      preparationTime: new Date(now - 4 * 60 * 60 * 1000),
      temperature: 24,
      donorId: 'usr_donor_1',
      donorName: 'Green Bakery & Cafe',
      ngoId: 'usr_ngo_1',
      ngoName: 'Care & Feed Foundation NGO',
      volunteerId: 'usr_volunteer_1',
      volunteerName: 'Rohan Sharma',
      status: 'Assigned',
      pickupAddress: 'Block E, Connaught Place, New Delhi',
      gpsLocation: { latitude: 28.6315, longitude: 77.2201 },
      contactNumber: '+919876543210',
      additionalNotes: 'Bananas and apples in good condition.',
      imageUrls: ['https://images.unsplash.com/photo-1619546813926-a78fa6372cd2'],
      freshnessScore: 90,
      qrCode: 'QR_DON_2_3120',
      createdAt: new Date(now - 4 * 60 * 60 * 1000)
    },
    // Historical items (Completed) for dashboard trends (simulating last 3 months)
    {
      id: 'don_hist_1',
      foodType: 'Cooked Food',
      quantity: 120,
      unit: 'Plates',
      bestBeforeDate: new Date(now - 10 * oneDay + 6 * 60 * 60 * 1000),
      preparationTime: new Date(now - 10 * oneDay),
      temperature: 28,
      donorId: 'usr_donor_1',
      donorName: 'Green Bakery & Cafe',
      ngoId: 'usr_ngo_1',
      ngoName: 'Care & Feed Foundation NGO',
      volunteerId: 'usr_volunteer_1',
      volunteerName: 'Rohan Sharma',
      status: 'Completed',
      pickupAddress: 'Connaught Place, New Delhi',
      gpsLocation: { latitude: 28.6304, longitude: 77.2177 },
      contactNumber: '+919876543210',
      additionalNotes: 'Biryani plates.',
      imageUrls: [],
      freshnessScore: 75,
      qrCode: 'QR_HIST_1',
      createdAt: new Date(now - 10 * oneDay)
    },
    {
      id: 'don_hist_2',
      foodType: 'Grocery Items',
      quantity: 40,
      unit: 'Kg',
      bestBeforeDate: new Date(now - 8 * oneDay + 180 * oneDay),
      preparationTime: new Date(now - 8 * oneDay),
      temperature: 22,
      donorId: 'usr_donor_1',
      donorName: 'Green Bakery & Cafe',
      ngoId: 'usr_ngo_2',
      ngoName: 'Hope Children Shelter',
      volunteerId: 'usr_volunteer_2',
      volunteerName: 'Anjali Gupta',
      status: 'Completed',
      pickupAddress: 'Connaught Place, New Delhi',
      gpsLocation: { latitude: 28.6304, longitude: 77.2177 },
      contactNumber: '+919876543210',
      additionalNotes: 'Wheat flour, pulses bags.',
      imageUrls: [],
      freshnessScore: 100,
      qrCode: 'QR_HIST_2',
      createdAt: new Date(now - 8 * oneDay)
    },
    {
      id: 'don_hist_3',
      foodType: 'Bakery Items',
      quantity: 30,
      unit: 'Packets',
      bestBeforeDate: new Date(now - 15 * oneDay + 2 * oneDay),
      preparationTime: new Date(now - 15 * oneDay),
      temperature: 25,
      donorId: 'usr_donor_1',
      donorName: 'Green Bakery & Cafe',
      ngoId: 'usr_ngo_2',
      ngoName: 'Hope Children Shelter',
      volunteerId: 'usr_volunteer_1',
      volunteerName: 'Rohan Sharma',
      status: 'Completed',
      pickupAddress: 'Connaught Place, New Delhi',
      gpsLocation: { latitude: 28.6304, longitude: 77.2177 },
      contactNumber: '+919876543210',
      additionalNotes: 'Breads, buns, cookies.',
      imageUrls: [],
      freshnessScore: 88,
      qrCode: 'QR_HIST_3',
      createdAt: new Date(now - 15 * oneDay)
    },
    {
      id: 'don_hist_4',
      foodType: 'Vegetables',
      quantity: 25,
      unit: 'Kg',
      bestBeforeDate: new Date(now - 20 * oneDay + 5 * oneDay),
      preparationTime: new Date(now - 20 * oneDay),
      temperature: 25,
      donorId: 'usr_donor_1',
      donorName: 'Green Bakery & Cafe',
      ngoId: 'usr_ngo_1',
      ngoName: 'Care & Feed Foundation NGO',
      volunteerId: 'usr_volunteer_2',
      volunteerName: 'Anjali Gupta',
      status: 'Completed',
      pickupAddress: 'Connaught Place, New Delhi',
      gpsLocation: { latitude: 28.6304, longitude: 77.2177 },
      contactNumber: '+919876543210',
      additionalNotes: 'Potatoes and Tomatoes.',
      imageUrls: [],
      freshnessScore: 92,
      qrCode: 'QR_HIST_4',
      createdAt: new Date(now - 20 * oneDay)
    }
  );

  // Seed system activity logs
  mockSystemLogs.push(
    {
      id: 'log_1',
      action: 'System Seeded',
      performedBy: 'System Engine',
      role: 'system',
      details: 'Populated demo dataset containing 6 user accounts and 6 food donations.',
      timestamp: new Date(now - 2 * oneDay)
    },
    {
      id: 'log_2',
      action: 'User Registered',
      performedBy: 'ngo@foodreach.com',
      role: 'ngo',
      details: 'New NGO account verified under name "Care & Feed Foundation NGO"',
      timestamp: new Date(now - 1.5 * oneDay)
    },
    {
      id: 'log_3',
      action: 'Donation Completed',
      performedBy: 'volunteer@foodreach.com',
      role: 'volunteer',
      details: 'Delivered 40Kg of Grocery Items from Green Bakery & Cafe to Hope Children Shelter. Verification code matched.',
      timestamp: new Date(now - 12 * 60 * 60 * 1000)
    }
  );
};
