// Test data registry — centralized store for all test inputs across modules
export const TestData = {
  validAdmin: {
    email: 'admin@foodreach.com',
    password: 'Admin@1234',
    role: 'admin'
  },
  validDonor: {
    email: 'donor@foodreach.com',
    password: 'Donor@1234',
    role: 'donor'
  },
  validVolunteer: {
    email: 'volunteer@foodreach.com',
    password: 'Volunteer@1234',
    role: 'volunteer'
  },
  invalidCredentials: [
    { email: 'wrong@foodreach.com', password: 'wrongpass', expectedError: 'Invalid credentials' },
    { email: '', password: 'Admin@1234', expectedError: 'Email is required' },
    { email: 'admin@foodreach.com', password: '', expectedError: 'Password is required' },
    { email: 'notanemail', password: 'Admin@1234', expectedError: 'Invalid email format' }
  ],
  donation: {
    foodName: 'Vegetable Biryani',
    quantity: '10',
    unit: 'kg',
    category: 'Cooked Food',
    expiryHours: '3',
    address: '12, Park Street, Kolkata - 700016',
    description: 'Freshly cooked vegetable biryani available for immediate pickup'
  },
  donationUpdate: {
    foodName: 'Updated Biryani Batch',
    quantity: '15'
  },
  profile: {
    validName: 'Anjali Sharma',
    validPhone: '9876543210',
    organization: 'FoodReach NGO',
    address: 'Delhi, India',
    bio: 'Admin working to reduce food waste and hunger across India.'
  },
  profileInvalid: {
    emptyName: '',
    invalidPhone: 'abc123',
    longBio: 'A'.repeat(210) // exceeds 200 char limit
  },
  search: {
    validKeyword: 'Biryani',
    noResultKeyword: 'xyznotfound999',
    specialChars: '!@#$%^'
  },
  largeFile: {
    sizeMB: 25,
    expectedError: 'File size exceeds limit'
  },
  notifications: {
    unreadCount: 3
  }
};
