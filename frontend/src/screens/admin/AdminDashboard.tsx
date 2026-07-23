import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  BarChart2,
  Users,
  Clipboard,
  LogOut,
  Sun,
  Moon,
  Search,
  FileText,
  CheckCircle,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Printer,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
  Heart,
  Truck,
  TrendingUp,
  MapPin,
  Calendar,
  AlertCircle,
  Camera,
  User
} from 'lucide-react-native';
import { RootState } from '../../store';
import { logout, toggleTheme } from '../../store/authSlice';
import { AdminService } from '../../services/adminService';
import { AuthService } from '../../services/authService';
import { AppTheme } from '../../theme/theme';
import { db, storage, isFirebaseConfigured, logoutFirebase } from '../../../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { supabase } from '../../services/supabase';
import { FirestoreNotificationService, AppNotification } from '../../services/FirestoreNotificationService';

interface AdminDashboardProps {
  theme: AppTheme;
  navigate: (screen: string) => void;
}

const MOCK_ADMIN_DATA = {
  stats: {
    totalDonations: 15,
    completedDonations: 8,
    activeDonations: 5,
    cancelledDonations: 2,
    totalDonors: 6,
    totalNgos: 4,
    totalVolunteers: 5,
    foodSavedKg: 142.5,
    totalBeneficiaries: 120,
    activeUsers: 15
  },
  charts: {
    categories: [
      { category: 'Cooked Food', count: 6 },
      { category: 'Vegetables', count: 4 },
      { category: 'Fruits', count: 3 },
      { category: 'Bakery Items', count: 2 },
      { category: 'Beverages', count: 0 },
      { category: 'Grocery Items', count: 0 }
    ],
    ngoPerformance: [
      { ngo: 'Care & Feed Foundation', completedCount: 5 },
      { ngo: 'Hunger Free India', completedCount: 3 }
    ],
    monthlyTrends: [
      { month: 'Apr', count: 2 },
      { month: 'May', count: 5 },
      { month: 'Jun', count: 8 }
    ]
  },
  users: [
    { _id: 'u1', id: 'u1', name: 'Rajesh Kumar', email: 'donor@foodreach.com', role: 'donor', contactNumber: '+91-98765-43210', address: '123 Donor Lane, Bangalore', isActive: true, createdAt: '2026-04-10T12:00:00Z' },
    { _id: 'u2', id: 'u2', name: 'Care & Feed Foundation', email: 'ngo@foodreach.com', role: 'ngo', contactNumber: '+91-80-2356-7890', address: '456 Charity Road, Bangalore', isActive: true, createdAt: '2026-05-15T12:00:00Z' },
    { _id: 'u3', id: 'u3', name: 'Rohan Sharma', email: 'volunteer@foodreach.com', role: 'volunteer', contactNumber: '+91-99887-65432', address: '789 Service St, Bangalore', isActive: true, createdAt: '2026-05-20T12:00:00Z', volunteerScore: 180 },
    { _id: 'u4', id: 'u4', name: 'Priya Hotels', email: 'priya@hotels.com', role: 'donor', contactNumber: '+91-80-9876-5432', address: '55 Plaza Way, Bangalore', isActive: true, createdAt: '2026-06-01T12:00:00Z' },
    { _id: 'u5', id: 'u5', name: 'Hunger Free India', email: 'hfi@ngo.org', role: 'ngo', contactNumber: '+91-22-4567-8901', address: '12 Civic Road, Bangalore', isActive: true, createdAt: '2026-06-05T12:00:00Z' },
    { _id: 'u6', id: 'u6', name: 'Anil Mehta', email: 'anil@volunteer.com', role: 'volunteer', contactNumber: '+91-99443-32211', address: '88 Green Park, Bangalore', isActive: false, createdAt: '2026-06-10T12:00:00Z', volunteerScore: 90 }
  ],
  donations: [
    { _id: 'd1', id: 'd1', donorName: 'Rajesh Kumar', foodType: 'Cooked Food', quantity: 50, unit: 'Plates', address: '123 Donor Lane, Bangalore', status: 'Completed', ngoName: 'Care & Feed Foundation', volunteerName: 'Rohan Sharma', createdAt: '2026-06-12T10:00:00Z' },
    { _id: 'd2', id: 'd2', donorName: 'Priya Hotels', foodType: 'Vegetables', quantity: 30, unit: 'Kg', address: '55 Plaza Way, Bangalore', status: 'Completed', ngoName: 'Hunger Free India', volunteerName: 'Rohan Sharma', createdAt: '2026-06-13T11:00:00Z' },
    { _id: 'd3', id: 'd3', donorName: 'Rajesh Kumar', foodType: 'Fruits', quantity: 15, unit: 'Kg', address: '123 Donor Lane, Bangalore', status: 'Assigned', ngoName: 'Care & Feed Foundation', volunteerName: 'Rohan Sharma', createdAt: '2026-06-14T09:00:00Z' },
    { _id: 'd4', id: 'd4', donorName: 'Priya Hotels', foodType: 'Bakery Items', quantity: 20, unit: 'Packets', address: '55 Plaza Way, Bangalore', status: 'Pending', createdAt: '2026-06-15T08:00:00Z' },
    { _id: 'd5', id: 'd5', donorName: 'Rajesh Kumar', foodType: 'Cooked Food', quantity: 40, unit: 'Plates', address: '123 Donor Lane, Bangalore', status: 'Cancelled', createdAt: '2026-06-15T14:00:00Z' }
  ],
  logs: [
    { _id: 'l1', id: 'l1', action: 'User Register Alert', details: 'New donor Rajesh Kumar registered successfully', timestamp: '2026-06-16T10:00:00Z', performedBy: 'system', role: 'system' },
    { _id: 'l2', id: 'l2', action: 'Donation Created', details: 'Priya Hotels posted Cooked Food donation (30 Plates)', timestamp: '2026-06-16T11:00:00Z', performedBy: 'priya@hotels.com', role: 'donor' },
    { _id: 'l3', id: 'l3', action: 'Donation Status Adjusted', details: 'Admin changed status of donation d3 to Assigned', timestamp: '2026-06-16T12:00:00Z', performedBy: 'admin@foodreach.com', role: 'admin' },
    { _id: 'l4', id: 'l4', action: 'User Account Deactivated', details: 'Deactivated login credentials for user ID: u6', timestamp: '2026-06-16T13:00:00Z', performedBy: 'admin@foodreach.com', role: 'admin' }
  ]
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ theme, navigate }) => {
  const dispatch = useDispatch();
  const { token, user, themeMode } = useSelector((state: RootState) => state.auth);
  const { width } = useWindowDimensions();

  // Tabs: analytics | users | donations | reports | logs
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'donations' | 'reports' | 'logs'>('analytics');
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [donationsList, setDonationsList] = useState<any[]>([]);
  const [logsList, setLogsList] = useState<any[]>([]);
  const [reportsData, setReportsData] = useState<any>({ donations: [], users: [], ngos: [], volunteers: [] });

  // Sidebar controls
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserRole, setSelectedUserRole] = useState<'all' | 'donor' | 'ngo' | 'volunteer'>('all');
  const [donationSearch, setDonationSearch] = useState('');
  const [selectedDonationStatus, setSelectedDonationStatus] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');

  // Modals / Details Views
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'donor', contactNumber: '', address: '' });
  const [userFormErrors, setUserFormErrors] = useState<Record<string, string>>({});

  const [viewingDonation, setViewingDonation] = useState<any>(null);
  const [editingDonation, setEditingDonation] = useState<any>(null);
  const [donationStatusVal, setDonationStatusVal] = useState('Pending');

  // Reports
  const [selectedReportType, setSelectedReportType] = useState<'donations' | 'users' | 'ngos' | 'volunteers' | 'monthly'>('donations');
  const [selectedReportMonth, setSelectedReportMonth] = useState<string>('All');
  const [reportPreviewList, setReportPreviewList] = useState<any[]>([]);

  // ==========================================
  // ADDED: Profile States
  // ==========================================
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('Anjali');
  const [profilePhone, setProfilePhone] = useState('9876543210');
  const [profileOrg, setProfileOrg] = useState('FoodReach Organization');
  const [profileAddress, setProfileAddress] = useState('Bangalore Operations Hub');
  const [profileBio, setProfileBio] = useState('Senior Administrator managing FoodReach Bangalore cluster operations.');
  const [profilePicUrl, setProfilePicUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80');
  const [dateJoined] = useState('2026-02-15');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  // Sign Out confirmation state
  const [showSignOutConfirmModal, setShowSignOutConfirmModal] = useState(false);

  // ==========================================
  // REAL-TIME FIRESTORE NOTIFICATIONS SYSTEM
  // ==========================================
  const [realtimeNotifs, setRealtimeNotifs] = useState<AppNotification[]>([]);
  const [showAllNotifsModal, setShowAllNotifsModal] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'All' | 'Unread' | 'Read'>('All');

  useEffect(() => {
    const unsubscribe = FirestoreNotificationService.subscribeAdminNotifications((notifs) => {
      setRealtimeNotifs(notifs);
    });
    return () => unsubscribe();
  }, []);

  const unreadCount = realtimeNotifs.filter(n => !n.isRead).length;
  const isDark = Boolean(theme?.dark || themeMode === 'dark');

  const handleMarkAsRead = (notificationId: string) => {
    if (!notificationId) return;
    setRealtimeNotifs(prev =>
      prev.map(n =>
        n.id === notificationId || n._id === notificationId ? { ...n, isRead: true } : n
      )
    );
    FirestoreNotificationService.markAsRead(notificationId).catch(console.error);
  };

  const handleMarkAllAsRead = () => {
    setRealtimeNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    FirestoreNotificationService.markAllAsRead(realtimeNotifs).catch(console.error);
  };

  const getFormattedTime = (isoString: string) => {
    if (!isoString) return 'Recently';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbar({ visible: true, message, type });
    setTimeout(() => {
      setSnackbar(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const isDesktop = width >= 1024;

  const loadAdminProfile = async () => {
    console.log('[loadAdminProfile] Starting loadAdminProfile...');
    try {
      if (!isFirebaseConfigured() || !db) {
        console.warn('[loadAdminProfile] Firebase is not configured. Skipping Firestore profile fetch.');
        return;
      }
      console.log('[loadAdminProfile] Calling getDoc...');
      const docRef = doc(db, 'profiles', user?.id || 'admin');
      const docSnap = await getDoc(docRef);
      console.log('[loadAdminProfile] getDoc finished, exists:', docSnap.exists());
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.name) setProfileName(data.name);
        if (data?.phone) setProfilePhone(data.phone);
        if (data?.organization) setProfileOrg(data.organization);
        if (data?.address) setProfileAddress(data.address);
        if (data?.bio) setProfileBio(data.bio);
        if (data?.profilePicUrl) setProfilePicUrl(data.profilePicUrl);
      }
    } catch (err) {
      console.warn('[loadAdminProfile] Failed to load profile from Firestore:', err);
    } finally {
      console.log('[loadAdminProfile] Finished loadAdminProfile');
    }
  };

  useEffect(() => {
    if (showProfileModal) {
      loadAdminProfile();
    }
  }, [showProfileModal]);

  const handleSaveAdminProfile = async () => {
    if (!profileName.trim()) {
      showSnackbar('Name cannot be empty.', 'error');
      return;
    }
    if (!/^\d+$/.test(profilePhone.trim())) {
      showSnackbar('Phone number must contain only digits.', 'error');
      return;
    }
    if (profileBio.length > 200) {
      showSnackbar('Bio cannot exceed 200 characters.', 'error');
      return;
    }

    if (!isFirebaseConfigured() || !db || !storage) {
      showSnackbar('Profile updated successfully (Offline Mode).', 'success');
      setIsEditingProfile(false);
      return;
    }

    setActionLoading(true);
    try {
      let finalPicUrl = profilePicUrl;
      // We simulate profile pic changes by uploading a pixel base64 to Storage if it starts with 'http' and isn't storage url
      if (profilePicUrl && !profilePicUrl.includes('firebasestorage')) {
        try {
          console.log('[handleSaveAdminProfile] Starting image upload...');
          const mockPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          const response = await fetch(`data:image/png;base64,${mockPngBase64}`);
          const blob = await response.blob();
          const storageRef = ref(storage, `profiles/${user?.id || 'admin'}/profile.png`);
          console.log('[handleSaveAdminProfile] Calling uploadBytes...');
          await uploadBytes(storageRef, blob);
          console.log('[handleSaveAdminProfile] uploadBytes finished, calling getDownloadURL...');
          finalPicUrl = await getDownloadURL(storageRef);
          console.log('[handleSaveAdminProfile] getDownloadURL finished:', finalPicUrl);
          setProfilePicUrl(finalPicUrl);
        } catch (storageErr) {
          console.warn('[handleSaveAdminProfile] Firebase Storage upload warning:', storageErr);
        }
      }

      console.log('[handleSaveAdminProfile] Calling setDoc...');
      await setDoc(doc(db, 'profiles', user?.id || 'admin'), {
        name: profileName,
        phone: profilePhone,
        organization: profileOrg,
        address: profileAddress,
        bio: profileBio,
        profilePicUrl: finalPicUrl,
        email: user?.email || 'admin@foodreach.com',
        role: user?.role || 'admin',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('[handleSaveAdminProfile] setDoc finished');

      showSnackbar('Profile updated successfully.', 'success');
      setIsEditingProfile(false);
    } catch (err: any) {
      console.error('[handleSaveAdminProfile] Firebase save failed:', err);
      showSnackbar(`Failed to save: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      showSnackbar('Current password is required.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showSnackbar('New password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showSnackbar('Passwords do not match.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      console.log('[handleUpdatePassword] Calling supabase.auth.updateUser...');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      console.log('[handleUpdatePassword] updateUser finished, error:', error);
      if (error) throw error;
      showSnackbar('Password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('[handleUpdatePassword] Password update failed:', err);
      showSnackbar(`Failed to update password: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchAdminData = async () => {
    if (isInitialLoad.current) {
      setLoading(true);
    }
    try {
      function withTimeout<T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
          )
        ]);
      }

      const [analyticsResult, usersResult, donationsResult, logsResult, reportsResult] = await Promise.allSettled([
        withTimeout(AdminService.getAnalytics(token), 10000),
        withTimeout(AdminService.getUsers(token), 10000),
        withTimeout(AdminService.getDonations(token), 10000),
        withTimeout(AdminService.getLogs(token), 10000),
        withTimeout(AdminService.getReports(token), 10000)
      ]);

      // Process Analytics
      if (analyticsResult.status === 'fulfilled' && analyticsResult.value?.success && analyticsResult.value?.analytics) {
        setStats(analyticsResult.value.analytics);
        const analyticsData = analyticsResult.value.analytics as any;
        setCharts({
          categories: Object.keys(analyticsData.foodTypeBreakdown || {}).map((k: string) => ({
            category: k,
            count: analyticsData.foodTypeBreakdown[k]
          })),
          ngoPerformance: analyticsData.ngoPerformance || MOCK_ADMIN_DATA.charts.ngoPerformance,
          monthlyTrends: analyticsData.monthlyTrends || MOCK_ADMIN_DATA.charts.monthlyTrends
        });
      } else {
        console.warn('[fetchAdminData] Analytics failed or timed out. Falling back to mock stats.');
        setStats(MOCK_ADMIN_DATA.stats);
        setCharts(MOCK_ADMIN_DATA.charts);
      }

      // Process Users
      let fetchedUsers: any[] = MOCK_ADMIN_DATA.users;
      if (usersResult.status === 'fulfilled' && usersResult.value?.success && Array.isArray(usersResult.value.users)) {
        fetchedUsers = usersResult.value.users.map((u: any) => ({ _id: u.id || u._id, ...u }));
      } else {
        console.warn('[fetchAdminData] Users fetch failed or timed out. Falling back to mock users.');
      }
      setUsersList(fetchedUsers);

      // Process Donations
      let fetchedDonations: any[] = MOCK_ADMIN_DATA.donations;
      if (donationsResult.status === 'fulfilled' && donationsResult.value?.success && Array.isArray(donationsResult.value.donations)) {
        fetchedDonations = donationsResult.value.donations.map((d: any) => ({ _id: d.id || d._id, ...d }));
      } else {
        console.warn('[fetchAdminData] Donations fetch failed or timed out. Falling back to mock donations.');
      }
      setDonationsList(fetchedDonations);

      // Process Logs
      let fetchedLogs: any[] = MOCK_ADMIN_DATA.logs;
      if (logsResult.status === 'fulfilled' && logsResult.value?.success && Array.isArray(logsResult.value.logs)) {
        fetchedLogs = logsResult.value.logs.map((l: any) => ({ _id: l.id || l._id, ...l }));
      } else {
        console.warn('[fetchAdminData] Logs fetch failed or timed out. Falling back to mock logs.');
      }
      setLogsList(fetchedLogs);

      // Process Reports
      if (reportsResult.status === 'fulfilled' && reportsResult.value?.success && (reportsResult.value as any)?.reports) {
        setReportsData((reportsResult.value as any).reports);
      } else {
        setReportsData({
          donations: (fetchedDonations ?? []).map(d => ({
            date: d?.createdAt ? new Date(d.createdAt).toLocaleDateString() : '',
            time: d?.createdAt ? new Date(d.createdAt).toLocaleTimeString() : '',
            foodType: d?.foodType ?? '',
            quantity: `${d?.quantity ?? 0} ${d?.unit ?? ''}`,
            donorName: d?.donorName ?? '',
            ngoName: d?.ngoName || 'N/A',
            volunteerName: d?.volunteerName || 'N/A',
            status: d?.status ?? ''
          })),
          users: (fetchedUsers ?? []).map(u => ({
            date: u?.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
            name: u?.name ?? '',
            email: u?.email ?? '',
            role: (u?.role ?? '').toUpperCase(),
            contact: u?.contactNumber ?? '',
            status: u?.isActive !== false ? 'Active' : 'Inactive'
          })),
          ngos: (fetchedUsers ?? []).filter(u => u?.role === 'ngo').map(u => ({
            ngoName: u?.name ?? '',
            email: u?.email ?? '',
            contact: u?.contactNumber ?? '',
            completedDeliveries: (fetchedDonations ?? []).filter(d => d?.ngoName === u?.name && d?.status === 'Completed').length,
            capacity: 100,
            status: u?.isActive !== false ? 'Active' : 'Inactive'
          })),
          volunteers: (fetchedUsers ?? []).filter(u => u?.role === 'volunteer').map(u => ({
            volunteerName: u?.name ?? '',
            email: u?.email ?? '',
            contact: u?.contactNumber ?? '',
            score: u?.volunteerScore || 0,
            completedDeliveries: (fetchedDonations ?? []).filter(d => d?.volunteerName === u?.name && d?.status === 'Completed').length,
            status: u?.isActive !== false ? 'Active' : 'Inactive'
          }))
        });
      }
    } catch (err) {
      console.warn('Backend server offline or access error. Running with seeded dashboard metrics.', err);
      setStats(MOCK_ADMIN_DATA.stats);
      setCharts(MOCK_ADMIN_DATA.charts);
      setUsersList(MOCK_ADMIN_DATA.users);
      setDonationsList(MOCK_ADMIN_DATA.donations);
      setLogsList(MOCK_ADMIN_DATA.logs);
      setReportsData({
        donations: (MOCK_ADMIN_DATA.donations ?? []).map(d => ({
          date: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '',
          time: d.createdAt ? new Date(d.createdAt).toLocaleTimeString() : '',
          foodType: d.foodType ?? '',
          quantity: `${d.quantity ?? 0} ${d.unit ?? ''}`,
          donorName: d.donorName ?? '',
          ngoName: d.ngoName || 'N/A',
          volunteerName: d.volunteerName || 'N/A',
          status: d.status ?? ''
        })),
        users: (MOCK_ADMIN_DATA.users ?? []).map(u => ({
          date: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
          name: u.name ?? '',
          email: u.email ?? '',
          role: (u.role ?? '').toUpperCase(),
          contact: u.contactNumber ?? '',
          status: u.isActive ? 'Active' : 'Inactive'
        })),
        ngos: (MOCK_ADMIN_DATA.users ?? []).filter(u => u?.role === 'ngo').map(u => ({
          ngoName: u.name ?? '',
          email: u.email ?? '',
          contact: u.contactNumber ?? '',
          completedDeliveries: (MOCK_ADMIN_DATA.donations ?? []).filter(d => d?.ngoName === u?.name && d?.status === 'Completed').length,
          capacity: 100,
          status: u.isActive ? 'Active' : 'Inactive'
        })),
        volunteers: (MOCK_ADMIN_DATA.users ?? []).filter(u => u?.role === 'volunteer').map(u => ({
          volunteerName: u.name ?? '',
          email: u.email ?? '',
          contact: u.contactNumber ?? '',
          score: u.volunteerScore || 0,
          completedDeliveries: (MOCK_ADMIN_DATA.donations ?? []).filter(d => d?.volunteerName === u?.name && d?.status === 'Completed').length,
          status: u.isActive ? 'Active' : 'Inactive'
        }))
      });
    } finally {
      if (isInitialLoad.current) {
        setLoading(false);
        isInitialLoad.current = false;
      }
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('[fetchUsers] Calling getUsers...');
      const usersRes = await AdminService.getUsers(token);
      console.log('[fetchUsers] getUsers finished:', usersRes?.success);
      if (usersRes.success) {
        setUsersList((usersRes.users || []).map((u: any) => ({ _id: u.id || u._id, ...u })));
      }
    } catch (err) {
      console.warn('Failed to refresh users list from Supabase:', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const getMonthlyCompleted = () => {
    const months = ['Apr', 'May', 'Jun'];
    const counts: Record<string, number> = { Apr: 0, May: 0, Jun: 0 };
    (donationsList ?? []).forEach(d => {
      if (d?.status === 'Completed') {
        const dateStr = d.createdAt || new Date().toISOString();
        const m = new Date(dateStr).toLocaleString('default', { month: 'short' });
        if (counts[m] !== undefined) counts[m]++;
      }
    });
    if (counts.Apr === 0 && counts.May === 0 && counts.Jun === 0) {
      return [{ month: 'Apr', count: 1 }, { month: 'May', count: 3 }, { month: 'Jun', count: 4 }];
    }
    return months.map(m => ({ month: m, count: counts[m] }));
  };

  const getVolunteerPerformance = () => {
    return (usersList ?? [])
      .filter(u => u?.role === 'volunteer')
      .map(u => ({
        name: u?.name ?? 'Volunteer',
        score: u?.volunteerScore || 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  const getUserGrowth = () => {
    const months = ['Apr', 'May', 'Jun'];
    const counts: Record<string, number> = { Apr: 1, May: 2, Jun: 3 };
    (usersList ?? []).forEach(u => {
      if (u?.createdAt) {
        const m = new Date(u.createdAt).toLocaleString('default', { month: 'short' });
        if (counts[m] !== undefined) counts[m]++;
      }
    });
    return months.map(m => ({ month: m, count: counts[m] }));
  };

  useEffect(() => {
    if (!reportsData) return;
    let baseList: any[] = [];
    if (selectedReportType === 'donations') {
      baseList = reportsData.donations || [];
    } else if (selectedReportType === 'users') {
      baseList = reportsData.users || [];
    } else if (selectedReportType === 'ngos') {
      baseList = reportsData.ngos || [];
    } else if (selectedReportType === 'volunteers') {
      baseList = reportsData.volunteers || [];
    } else if (selectedReportType === 'monthly') {
      const totalPostings = (donationsList ?? []).length;
      const totalCompleted = (donationsList ?? []).filter(d => d?.status === 'Completed').length;
      const totalFoodSaved = stats?.foodSavedKg || 0;
      const totalFeds = stats?.totalBeneficiaries || 0;
      baseList = [{
        month: 'June 2026',
        totalDonationsPosted: totalPostings,
        donationsCompleted: totalCompleted,
        totalFoodSavedKg: totalFoodSaved,
        beneficiariesAssisted: totalFeds,
        activeNGOs: (reportsData.ngos ?? []).filter((n: any) => n?.status === 'Active').length || 0,
        activeVolunteers: (reportsData.volunteers ?? []).filter((v: any) => v?.status === 'Active').length || 0
      }];
    }

    if (selectedReportMonth !== 'All' && selectedReportType !== 'monthly') {
      baseList = baseList.filter((item: any) => {
        const dateField = item?.date || item?.createdAt;
        if (!dateField) return true;
        const m = new Date(dateField).toLocaleString('default', { month: 'short' });
        return m === selectedReportMonth;
      });
    }
    setReportPreviewList(baseList);
  }, [reportsData, selectedReportType, selectedReportMonth, donationsList, usersList, stats]);

  const handleConfirmSignOut = async () => {
    setShowSignOutConfirmModal(false);
    setShowProfileModal(false);
    try {
      console.log('[handleConfirmSignOut] Performing full user signout...');
      dispatch(logout());
      await AuthService.logout();
      await supabase.auth.signOut();
      if (isFirebaseConfigured()) {
        await logoutFirebase();
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('fs_supabase_auth');
        window.localStorage.clear();
      }
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      navigate('Login');
    }
  };

  const handleLogout = () => {
    handleConfirmSignOut();
  };

  const handleEditUserClick = (item: any) => {
    setEditingUser(item);
    setUserForm({
      name: item?.name || '',
      email: item?.email || '',
      role: item?.role || 'donor',
      contactNumber: item?.contactNumber || '',
      address: item?.address || ''
    });
    setUserFormErrors({});
  };

  const handleSaveUser = async () => {
    const errors: Record<string, string> = {};
    if (!userForm.name.trim()) errors.name = 'Name is required';
    if (!userForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!userForm.contactNumber.trim()) errors.contactNumber = 'Contact number is required';
    if (!userForm.address.trim()) errors.address = 'Address is required';

    if (Object.keys(errors).length > 0) {
      setUserFormErrors(errors);
      return;
    }

    try {
      const id = editingUser?._id || editingUser?.id;
      console.log('[handleSaveUser] Calling updateUser for id:', id);
      const res = await AdminService.updateUser(id, userForm, token);
      console.log('[handleSaveUser] updateUser completed:', res?.success);
      if (res.success) {
        setUsersList(prev => (prev ?? []).map(u => (u?._id === id || u?.id === id) ? { ...u, ...userForm } : u));
        setEditingUser(null);
        alert('User details updated successfully!');
        await fetchUsers();
      }
    } catch (err: any) {
      console.warn('[handleSaveUser] updateUser failed:', err);
      alert(err.message || 'Failed to update user details.');
      const id = editingUser?._id || editingUser?.id;
      setUsersList(prev => (prev ?? []).map(u => (u?._id === id || u?.id === id) ? { ...u, ...userForm } : u));
      setEditingUser(null);
    }
  };

  const handleToggleUserActivation = async (item: any) => {
    const id = item?._id || item?.id;
    const isCurrentlyActive = item?.status ? item.status === 'active' : item?.isActive !== false;
    const nextStatus: 'active' | 'suspended' = isCurrentlyActive ? 'suspended' : 'active';
    const nextIsActive = nextStatus === 'active';

    try {
      console.log('[handleToggleUserActivation] Calling toggleUserStatus for id:', id, 'nextStatus:', nextStatus);
      const res = await AdminService.toggleUserStatus(id, nextStatus, token);
      console.log('[handleToggleUserActivation] toggleUserStatus completed:', res?.success);
      if (res.success) {
        setUsersList(prev => (prev ?? []).map(u => (u?._id === id || u?.id === id) ? { ...u, status: nextStatus, isActive: nextIsActive } : u));
        alert(`User account ${nextStatus === 'active' ? 'activated' : 'suspended'} successfully!`);
        await fetchUsers();
      }
    } catch (err: any) {
      console.warn('[handleToggleUserActivation] toggleUserStatus failed:', err);
      alert(err.message || 'Failed to toggle user status.');
      setUsersList(prev => (prev ?? []).map(u => (u?._id === id || u?.id === id) ? { ...u, status: nextStatus, isActive: nextIsActive } : u));
    }
  };

  const handleDeleteUser = async (item: any) => {
    const id = item?._id || item?.id;
    if (!confirm(`Are you sure you want to permanently delete user "${item?.name}"?`)) return;
    try {
      console.log('[handleDeleteUser] Calling deleteUser for id:', id);
      const res = await AdminService.deleteUser(id, token);
      console.log('[handleDeleteUser] deleteUser completed:', res?.success);
      if (res.success) {
        fetchAdminData();
      }
    } catch (err: any) {
      console.warn('[handleDeleteUser] deleteUser failed:', err);
      setUsersList(prev => (prev ?? []).filter(u => u?._id !== id && u?.id !== id));
    }
  };

  const handleOpenStatusEdit = (item: any) => {
    setEditingDonation(item);
    setDonationStatusVal(item?.status ?? 'Pending');
  };

  const handleSaveDonationStatus = async () => {
    const id = editingDonation?._id || editingDonation?.id;
    try {
      console.log('[handleSaveDonationStatus] Calling updateDonationStatus for id:', id);
      const res = await AdminService.updateDonationStatus(id, donationStatusVal, token);
      console.log('[handleSaveDonationStatus] updateDonationStatus completed:', res?.success);
      if (res.success) {
        setEditingDonation(null);
        fetchAdminData();
      }
    } catch (err: any) {
      console.warn('[handleSaveDonationStatus] updateDonationStatus failed:', err);
      setDonationsList(prev => (prev ?? []).map(d => (d?._id === id || d?.id === id) ? { ...d, status: donationStatusVal } : d));
      setEditingDonation(null);
    }
  };

  const handleDeleteDonation = async (item: any) => {
    const id = item?._id || item?.id;
    if (!confirm(`Are you sure you want to permanently delete this donation listing?`)) return;
    try {
      console.log('[handleDeleteDonation] Calling deleteDonation for id:', id);
      const res = await AdminService.deleteDonation(id, token);
      console.log('[handleDeleteDonation] deleteDonation completed:', res?.success);
      if (res.success) {
        fetchAdminData();
      }
    } catch (err: any) {
      console.warn('[handleDeleteDonation] deleteDonation failed:', err);
      setDonationsList(prev => (prev ?? []).filter(d => d?._id !== id && d?.id !== id));
    }
  };

  const handleExportCSV = () => {
    if (!reportPreviewList || !reportPreviewList.length) {
      alert('No data available to export');
      return;
    }
    const headers = reportPreviewList?.[0] ? Object.keys(reportPreviewList[0]) : [];
    const csvRows = [
      headers.join(','),
      ...(reportPreviewList ?? []).map(row =>
        headers.map(fieldName => {
          const val = row?.[fieldName] === null || row?.[fieldName] === undefined ? '' : row[fieldName];
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `foodreach_report_${selectedReportType}_${selectedReportMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    FirestoreNotificationService.notifyReportExported(selectedReportType, 'csv').catch(console.error);
  };

  const handleExportExcel = () => {
    if (!reportPreviewList || !reportPreviewList.length) {
      alert('No data available to export');
      return;
    }
    const headers = reportPreviewList?.[0] ? Object.keys(reportPreviewList[0]) : [];
    const reLt = new RegExp('\x3C', 'g');
    const reGt = new RegExp('\x3E', 'g');

    let xml = '\x3C?xml version="1.0"?\x3E\x3C?mso-application progid="Excel.Sheet"?\x3E\x3CWorkbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"\x3E';
    xml += '\x3CWorksheet ss:Name="' + selectedReportType.toUpperCase() + '"\x3E\x3CTable\x3E';

    xml += '\x3CRow\x3E';
    headers.forEach(h => {
      xml += '\x3CCell\x3E\x3CData ss:Type="String"\x3E' + h.toUpperCase().replace(reLt, '&lt;').replace(reGt, '&gt;') + '\x3C/Data\x3E\x3C/Cell\x3E';
    });
    xml += '\x3C/Row\x3E';

    (reportPreviewList ?? []).forEach(row => {
      xml += '\x3CRow\x3E';
      headers.forEach(h => {
        const val = row?.[h] === null || row?.[h] === undefined ? '' : String(row[h]);
        xml += '\x3CCell\x3E\x3CData ss:Type="String"\x3E' + val.replace(reLt, '&lt;').replace(reGt, '&gt;') + '\x3C/Data\x3E\x3C/Cell\x3E';
      });
      xml += '\x3C/Row\x3E';
    });

    xml += '\x3C/Table\x3E\x3C/Worksheet\x3E\x3C/Workbook\x3E';
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'foodreach_report_' + selectedReportType + '_' + selectedReportMonth + '.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    FirestoreNotificationService.notifyReportExported(selectedReportType, 'excel').catch(console.error);
  };

  const handlePrintPDF = () => {
    if (!reportPreviewList || !reportPreviewList.length) {
      alert('No data available to print');
      return;
    }
    const headers = reportPreviewList?.[0] ? Object.keys(reportPreviewList[0]) : [];
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow popups for PDF printing to work.');
      return;
    }

    const title = selectedReportType.toUpperCase() + ' REPORT - Month: ' + selectedReportMonth;
    let html = '\x3Chtml\x3E\x3Chead\x3E\x3Ctitle\x3E' + title + '\x3C/title\x3E';
    html += '\x3Cstyle\x3Ebody { font-family: "Segoe UI", sans-serif; padding: 30px; color: #1E293B; } h1 { color: #22C55E; font-size: 24px; } .subtitle { color: #64748B; font-size: 13px; margin-bottom: 25px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #E2E8F0; padding: 12px; font-size: 12px; } th { background-color: #F8FAFC; }\x3C/style\x3E\x3C/head\x3E';
    html += '\x3Cbody\x3E\x3Ch1\x3EFoodReach Admin Console\x3C/h1\x3E\x3Cdiv class="subtitle"\x3E' + title + ' (Generated on ' + new Date().toLocaleString() + ')\x3C/div\x3E\x3Ctable\x3E\x3Cthead\x3E\x3Ctr\x3E';
    headers.forEach(h => { html += '\x3Cth\x3E' + h + '\x3C/th\x3E'; });
    html += '\x3C/tr\x3E\x3C/thead\x3E\x3Ctbody\x3E';
    (reportPreviewList ?? []).forEach(row => {
      html += '\x3Ctr\x3E';
      headers.forEach(h => {
        const val = row?.[h] === null || row?.[h] === undefined ? 'N/A' : row[h];
        html += '\x3Ctd\x3E' + val + '\x3C/td\x3E';
      });
      html += '\x3C/tr\x3E';
    });
    html += '\x3C/tbody\x3E\x3C/table\x3E\x3Cscript\x3Ewindow.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };\x3C/script\x3E\x3C/body\x3E\x3C/html\x3E';

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredUsers = (usersList ?? []).filter(u => {
    const matchesSearch = (u?.name ?? '').toLowerCase().includes((userSearch ?? '').toLowerCase()) ||
      (u?.email ?? '').toLowerCase().includes((userSearch ?? '').toLowerCase()) ||
      (u?.contactNumber ?? '').toLowerCase().includes((userSearch ?? '').toLowerCase());
    const matchesRole = selectedUserRole === 'all' || u?.role === selectedUserRole;
    return matchesSearch && matchesRole;
  });

  const filteredDonations = (donationsList ?? []).filter(d => {
    const matchesSearch = (d?.foodType ?? '').toLowerCase().includes((donationSearch ?? '').toLowerCase()) ||
      (d?.donorName ?? '').toLowerCase().includes((donationSearch ?? '').toLowerCase()) ||
      (d?.ngoName ?? '').toLowerCase().includes((donationSearch ?? '').toLowerCase()) ||
      (d?.address ?? '').toLowerCase().includes((donationSearch ?? '').toLowerCase());
    const matchesStatus = selectedDonationStatus === 'all' || d?.status === selectedDonationStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredLogs = (logsList ?? []).filter(l =>
    (l?.action ?? '').toLowerCase().includes((logSearch ?? '').toLowerCase()) ||
    (l?.details ?? '').toLowerCase().includes((logSearch ?? '').toLowerCase()) ||
    (l?.performedBy ?? '').toLowerCase().includes((logSearch ?? '').toLowerCase())
  );

  const getInitials = (name: string) => {
    if (!name) return 'A';
    return (name ?? '').split(' ').filter(Boolean).map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
  };

  const MENU_ITEMS = [
    { key: 'analytics', label: 'Dashboard', icon: BarChart2 },
    { key: 'users', label: 'User Directory', icon: Users },
    { key: 'donations', label: 'Donation Orders', icon: CheckCircle },
    { key: 'reports', label: 'Reports Centre', icon: FileText },
    { key: 'logs', label: 'System Logs', icon: Clipboard },
  ];

  return (
    <View style={[styles.appContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      {/* Absolute overlay backdrop to close active dropdowns on click outside */}
      {(showNotifications || showProfileMenu) && (
        <TouchableOpacity
          style={styles.absoluteFillBackdrop}
          activeOpacity={1}
          onPress={() => {
            setShowNotifications(false);
            setShowProfileMenu(false);
          }}
        />
      )}
      {/* 1. COLLAPSIBLE SIDEBAR (For Desktop Viewports) */}
      {isDesktop && (
        <View style={[styles.sidebar, { backgroundColor: isDark ? '#1E293B' : 'rgba(255, 255, 255, 0.92)', borderRightColor: isDark ? '#334155' : '#E2E8F0' }, sidebarCollapsed && styles.sidebarCollapsed]}>
          <View style={styles.sidebarBrand}>
            <View style={styles.brandIconCircle}>
              <Heart size={16} color="#FFFFFF" />
            </View>
            {!sidebarCollapsed && <Text style={[styles.brandText, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>FoodReach</Text>}
          </View>

          <ScrollView style={styles.sidebarMenuScroll}>
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.sidebarMenuItem, isActive && styles.sidebarMenuItemActive, isDark && !isActive && { backgroundColor: 'transparent' }]}
                  onPress={() => setActiveTab(item.key as any)}
                >
                  <Icon size={20} color={isActive ? '#22C55E' : isDark ? '#94A3B8' : '#64748B'} />
                  {!sidebarCollapsed && (
                    <Text style={[styles.sidebarMenuItemText, { color: isDark ? '#CBD5E1' : '#64748B' }, isActive && styles.sidebarMenuItemTextActive]}>
                      {item.label}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={styles.sidebarCollapseBtn}
            onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight size={18} color={isDark ? '#94A3B8' : '#64748B'} /> : <ChevronLeft size={18} color={isDark ? '#94A3B8' : '#64748B'} />}
            {!sidebarCollapsed && <Text style={[styles.collapseText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Collapse Sidebar</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Mobile Drawer Overlay (for viewports below 1024px) */}
      {!isDesktop && !sidebarCollapsed && (
        <View style={styles.mobileDrawerOverlay}>
          <TouchableOpacity
            style={styles.mobileDrawerBackdrop}
            activeOpacity={1}
            onPress={() => setSidebarCollapsed(true)}
          />
          <View style={[styles.mobileDrawerContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={styles.sidebarBrand}>
              <View style={styles.brandIconCircle}>
                <Heart size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.brandText, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>FoodReach</Text>
              <TouchableOpacity
                style={{ marginLeft: 'auto', padding: 4 }}
                onPress={() => setSidebarCollapsed(true)}
              >
                <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarMenuScroll}>
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.sidebarMenuItem, isActive && styles.sidebarMenuItemActive]}
                    onPress={() => {
                      setActiveTab(item.key as any);
                      setSidebarCollapsed(true);
                    }}
                  >
                    <Icon size={20} color={isActive ? '#22C55E' : isDark ? '#94A3B8' : '#64748B'} />
                    <Text style={[styles.sidebarMenuItemText, { color: isDark ? '#CBD5E1' : '#64748B' }, isActive && styles.sidebarMenuItemTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#E2E8F0', marginVertical: 12, marginHorizontal: 16 }} />

              <TouchableOpacity
                style={styles.sidebarMenuItem}
                onPress={() => {
                  setSidebarCollapsed(true);
                  setShowProfileModal(true);
                }}
              >
                <User size={20} color="#22C55E" />
                <Text style={[styles.sidebarMenuItemText, { color: '#22C55E', fontWeight: '700' }]}>
                  Admin Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sidebarMenuItem}
                onPress={() => {
                  setSidebarCollapsed(true);
                  setShowSignOutConfirmModal(true);
                }}
              >
                <LogOut size={20} color="#EF4444" />
                <Text style={[styles.sidebarMenuItemText, { color: '#EF4444', fontWeight: '700' }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* 2. MAIN CONTENT CONTAINER */}
      <View style={styles.mainContent}>
        {/* Glassmorphism Header */}
        <View style={[styles.header, { backgroundColor: isDark ? '#1E293B' : 'rgba(255, 255, 255, 0.85)', borderBottomColor: isDark ? '#334155' : '#E2E8F0', paddingHorizontal: width < 600 ? 10 : 24 }]}>
          <View style={styles.headerLeft}>
            {!isDesktop && (
              <TouchableOpacity style={styles.mobileMenuBtn} onPress={() => setSidebarCollapsed(!sidebarCollapsed)}>
                <Menu size={22} color={isDark ? '#F8FAFC' : '#1E293B'} />
              </TouchableOpacity>
            )}
            <Text style={[styles.headerDashboardTitle, { color: isDark ? '#F8FAFC' : '#1E293B', fontSize: width < 400 ? 14 : 16 }]} numberOfLines={1}>
              Admin Console
            </Text>
          </View>

          <View style={[styles.headerRight, { gap: width < 480 ? 6 : 12 }]}>
            <TouchableOpacity
              style={styles.headerActionCircle}
              onPress={() => dispatch(toggleTheme())}
            >
              {theme?.dark ? <Sun size={18} color="#EAB308" /> : <Moon size={18} color="#22C55E" />}
            </TouchableOpacity>

            {/* Notifications Button */}
            <View style={{ position: 'relative', zIndex: 10001 }}>
              <TouchableOpacity
                style={styles.headerActionCircle}
                onPress={() => {
                  setShowNotifications(prev => !prev);
                  setShowProfileMenu(false);
                }}
              >
                <Bell size={18} color="#64748B" />
                {unreadCount > 0 && (
                  <View style={styles.notificationDotBadge}>
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {showNotifications && (
                <View style={[styles.dropdownPanel, { zIndex: 10002, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0', right: width < 480 ? -40 : 0, width: width < 400 ? 280 : 340 }]}>
                  <View style={[styles.dropdownHeader, { borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <Text style={[styles.dropdownHeaderTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>Real-time Alerts ({realtimeNotifs.length})</Text>
                    {unreadCount > 0 && (
                      <TouchableOpacity onPress={handleMarkAllAsRead}>
                        <Text style={{ fontSize: 12, color: '#22C55E', fontWeight: '700' }}>Mark all read</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView style={{ maxHeight: 280 }}>
                    {realtimeNotifs.length === 0 ? (
                      <View style={styles.notificationItem}>
                        <Text style={[styles.notificationText, { color: isDark ? '#94A3B8' : '#64748B' }]}>No alerts right now.</Text>
                      </View>
                    ) : (
                      realtimeNotifs.slice(0, 8).map((item) => (
                        <TouchableOpacity
                          key={item.id || item._id}
                          style={[styles.notificationItem, !item.isRead && { backgroundColor: isDark ? '#0F172A' : '#F0FDF4' }]}
                          onPress={() => {
                            handleMarkAsRead(item.id || item._id || '');
                            setShowNotifications(false);
                            navigate('NotificationCenter');
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.notificationText, { color: isDark ? '#F8FAFC' : '#0F172A' }, !item.isRead && { fontWeight: '800' }]}>
                              {item.title}
                            </Text>
                            <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>{item.message}</Text>
                          </View>
                          <Text style={[styles.notificationTime, { color: isDark ? '#64748B' : '#94A3B8' }]}>{getFormattedTime(item.createdAt)}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                  <TouchableOpacity
                    style={{ padding: 12, backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#E2E8F0', alignItems: 'center' }}
                    onPress={() => {
                      setShowNotifications(false);
                      navigate('NotificationCenter');
                    }}
                  >
                    <Text style={{ fontSize: 13, color: '#22C55E', fontWeight: '700' }}>View All Notifications</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.headerQuickExportBtn, { paddingHorizontal: width < 480 ? 8 : 12 }]}
              onPress={() => setActiveTab('reports')}
            >
              <FileText size={14} color="#FFFFFF" style={{ marginRight: width < 480 ? 0 : 6 }} />
              {width >= 480 && <Text style={styles.headerQuickExportText}>Export Report</Text>}
            </TouchableOpacity>

            {/* User Profile Avatar Section (Always Visible) */}
            <View style={{ position: 'relative', zIndex: 10001 }}>
              <TouchableOpacity
                style={styles.headerUserAvatarWrapper}
                onPress={() => {
                  setShowProfileModal(true);
                  setShowProfileMenu(false);
                  setShowNotifications(false);
                }}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{getInitials(profileName)}</Text>
                </View>
                {isDesktop && (
                  <View style={styles.headerUserTextDetails}>
                    <Text style={styles.headerUserDisplayName}>{profileName} - System Admin</Text>
                    <Text style={styles.headerUserRoleName}>System Admin</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!isDesktop && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mobileTabsScroll}
            contentContainerStyle={styles.mobileTabsContainer}
          >
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.mobileTabItem, activeTab === item.key && styles.mobileTabItemActive]}
                onPress={() => setActiveTab(item.key as any)}
              >
                <Text style={[styles.mobileTabText, activeTab === item.key && styles.mobileTabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.loadingText}>Fetching admin analytics...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
            {activeTab === 'analytics' && stats && charts && (
              <View>
                <View style={styles.metricsGrid}>
                  <View style={[styles.metricCard, { borderLeftColor: '#22C55E' }]}>
                    <View style={styles.metricCardHeader}>
                      <Text style={styles.metricCardLabel}>Food Saved (Total)</Text>
                      <View style={[styles.metricIconBox, { backgroundColor: '#DCFCE7' }]}>
                        <TrendingUp size={16} color="#22C55E" />
                      </View>
                    </View>
                    <Text style={styles.metricCardValue}>{stats?.foodSavedKg ?? 0} Kg</Text>
                    <Text style={styles.metricCardSub}>+12.4% from last month</Text>
                  </View>

                  <View style={[styles.metricCard, { borderLeftColor: '#3B82F6' }]}>
                    <View style={styles.metricCardHeader}>
                      <Text style={styles.metricCardLabel}>Beneficiaries Fed</Text>
                      <View style={[styles.metricIconBox, { backgroundColor: '#DBEAFE' }]}>
                        <Heart size={16} color="#3B82F6" />
                      </View>
                    </View>
                    <Text style={styles.metricCardValue}>{stats?.totalBeneficiaries ?? 0}</Text>
                    <Text style={styles.metricCardSub}>Active NGO distributions</Text>
                  </View>

                  <View style={[styles.metricCard, { borderLeftColor: '#F97316' }]}>
                    <View style={styles.metricCardHeader}>
                      <Text style={styles.metricCardLabel}>Active Orders</Text>
                      <View style={[styles.metricIconBox, { backgroundColor: '#FFEDD5' }]}>
                        <Truck size={16} color="#F97316" />
                      </View>
                    </View>
                    <Text style={styles.metricCardValue}>{stats?.activeDonations ?? 0}</Text>
                    <Text style={styles.metricCardSub}>Pending & assigned orders</Text>
                  </View>

                  <View style={[styles.metricCard, { borderLeftColor: '#8B5CF6' }]}>
                    <View style={styles.metricCardHeader}>
                      <Text style={styles.metricCardLabel}>Active Users</Text>
                      <View style={[styles.metricIconBox, { backgroundColor: '#F3E8FF' }]}>
                        <Users size={16} color="#8B5CF6" />
                      </View>
                    </View>
                    <Text style={styles.metricCardValue}>{stats?.activeUsers ?? 0}</Text>
                    <Text style={styles.metricCardSub}>Donors, NGOs & Volunteers</Text>
                  </View>
                </View>

                <View style={styles.dashboardGridRow}>
                  <View style={styles.dashboardGridCol}>
                    <View style={styles.panelCard}>
                      <Text style={styles.panelCardTitle}>Food Category Share</Text>
                      <Text style={styles.panelCardSubtitle}>Proportion of donations by weight category</Text>
                      <View style={styles.progressContainer}>
                        {(charts?.categories ?? []).map((c: any) => {
                          const maxCount = Math.max(...(charts?.categories ?? []).map((x: any) => x?.count ?? 0), 1);
                          const pct = ((c?.count ?? 0) / maxCount) * 100;
                          return (
                            <View key={c?.category ?? ''} style={styles.progressBarWrapper}>
                              <View style={styles.progressBarMetaRow}>
                                <Text style={styles.progressBarLabel}>{c?.category ?? ''}</Text>
                                <Text style={styles.progressBarVal}>{c?.count ?? 0}</Text>
                              </View>
                              <View style={styles.progressBarOuter}>
                                <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: '#22C55E' }]} />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  <View style={styles.dashboardGridCol}>
                    <View style={styles.panelCard}>
                      <Text style={styles.panelCardTitle}>NGO Performance</Text>
                      <Text style={styles.panelCardSubtitle}>Completed deliveries by partner organization</Text>
                      {!charts?.ngoPerformance || charts?.ngoPerformance?.length === 0 ? (
                        <View style={styles.emptyStateBox}>
                          <AlertCircle size={20} color="#64748B" />
                          <Text style={styles.emptyStateText}>No NGO orders completed yet.</Text>
                        </View>
                      ) : (
                        <View style={styles.progressContainer}>
                          {(charts?.ngoPerformance ?? []).map((ngo: any) => {
                            const max = Math.max(...(charts?.ngoPerformance ?? []).map((x: any) => x?.completedCount ?? 0), 1);
                            const pct = ((ngo?.completedCount ?? 0) / max) * 100;
                            return (
                              <View key={ngo?.ngo ?? ''} style={styles.progressBarWrapper}>
                                <View style={styles.progressBarMetaRow}>
                                  <Text style={styles.progressBarLabel}>{ngo?.ngo ?? ''}</Text>
                                  <Text style={styles.progressBarVal}>{ngo?.completedCount ?? 0}</Text>
                                </View>
                                <View style={styles.progressBarOuter}>
                                  <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: '#3B82F6' }]} />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.dashboardGridRow}>
                  <View style={[styles.dashboardGridCol, { flex: 1.5 }]}>
                    <View style={styles.panelCard}>
                      <Text style={styles.panelCardTitle}>Recent Donations</Text>
                      <Text style={styles.panelCardSubtitle}>Latest food donations listed on FoodReach</Text>
                      <View style={{ marginTop: 12 }}>
                        {(donationsList ?? []).slice(0, 4).map((d: any) => (
                          <View key={d?.id || d?._id} style={styles.recentDonationItemRow}>
                            <View style={styles.donationAvatarContainer}>
                              <Text style={styles.donationAvatarText}>{(d?.foodType ?? 'Food').charAt(0)}</Text>
                            </View>
                            <View style={styles.recentDonationDetails}>
                              <Text style={styles.recentDonationTitle}>{d?.foodType ?? 'Food Item'}</Text>
                              <Text style={styles.recentDonationSubtitle}>Qty: {d?.quantity ?? 0} {d?.unit ?? ''} • {d?.donorName ?? ''}</Text>
                            </View>
                            <View style={[styles.statusBadgeGreen, d?.status === 'Cancelled' && styles.statusBadgeRed, d?.status === 'Pending' && styles.statusBadgeYellow]}>
                              <Text style={styles.statusBadgeText}>{d?.status ?? 'Pending'}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={styles.dashboardGridCol}>
                    <View style={styles.panelCard}>
                      <Text style={styles.panelCardTitle}>Top Volunteers</Text>
                      <Text style={styles.panelCardSubtitle}>Volunteers leading delivery score metrics</Text>
                      <View style={{ marginTop: 12 }}>
                        {(getVolunteerPerformance() ?? []).map((v: any, index: number) => (
                          <View key={v?.name ?? ''} style={styles.leaderboardItemRow}>
                            <View style={styles.leaderboardBadge}>
                              <Text style={styles.leaderboardBadgeText}>#{index + 1}</Text>
                            </View>
                            <View style={styles.leaderboardInfo}>
                              <Text style={styles.leaderboardName}>{v?.name ?? ''}</Text>
                              <Text style={styles.leaderboardScore}>{v?.score ?? 0} Points</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'users' && (
              <View style={styles.panelCard}>
                <Text style={styles.panelCardTitle}>User Account Directory</Text>
                <Text style={styles.panelCardSubtitle}>Manage active donors, partner NGOs, and logistics volunteers</Text>

                <View style={styles.directoryControlsRow}>
                  <View style={styles.searchBarContainer}>
                    <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.directorySearchInput}
                      placeholder="Search accounts..."
                      placeholderTextColor="#94A3B8"
                      value={userSearch}
                      onChangeText={setUserSearch}
                    />
                  </View>
                  <View style={styles.directoryBadgeRow}>
                    {['all', 'donor', 'ngo', 'volunteer'].map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.directoryRoleChip, selectedUserRole === r && styles.directoryRoleChipActive]}
                        onPress={() => setSelectedUserRole(r as any)}
                      >
                        <Text style={[styles.directoryRoleText, selectedUserRole === r && styles.directoryRoleTextActive]}>
                          {r.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  {(filteredUsers ?? []).map((item) => (
                    <View key={item?.id || item?._id} style={styles.directoryItemCard}>
                      <View style={styles.directoryItemHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={styles.avatarCircleSmall}>
                            <Text style={styles.avatarTextSmall}>{getInitials(item?.name ?? 'Admin')}</Text>
                          </View>
                          <View style={{ marginLeft: 10 }}>
                            <Text style={styles.directoryItemName}>{item?.name ?? ''}</Text>
                            <Text style={styles.directoryItemMeta}>{item?.email ?? ''} • {item?.contactNumber ?? ''}</Text>
                          </View>
                        </View>
                        <View style={[styles.roleBadgeGreen, item?.role === 'ngo' && styles.roleBadgeBlue, item?.role === 'volunteer' && styles.roleBadgePurple]}>
                          <Text style={styles.roleBadgeText}>{(item?.role ?? '').toUpperCase()}</Text>
                        </View>
                      </View>

                      <View style={styles.directoryItemDetailsRow}>
                        <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.directoryItemAddressText} numberOfLines={1}>{item?.address ?? ''}</Text>
                      </View>

                      <View style={styles.directoryItemFooter}>
                        <View style={styles.statusIndicatorRow}>
                          <View style={[styles.statusDot, { backgroundColor: item?.isActive !== false ? '#22C55E' : '#EF4444' }]} />
                          <Text style={styles.statusTextLabel}>{item?.isActive !== false ? 'Active' : 'Suspended'}</Text>
                        </View>
                        
                        <View style={styles.directoryActionsGroup}>
                          <TouchableOpacity style={styles.directoryActionBtn} onPress={() => setViewingUser(item)}>
                            <Eye size={14} color="#64748B" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.directoryActionBtn} onPress={() => handleEditUserClick(item)}>
                            <Edit size={14} color="#22C55E" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.directoryStatusToggleBtn, { borderColor: item?.isActive !== false ? '#EF4444' : '#22C55E' }]}
                            onPress={() => handleToggleUserActivation(item)}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: item?.isActive !== false ? '#EF4444' : '#22C55E' }}>
                              {item?.isActive !== false ? 'Suspend' : 'Activate'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.directoryActionBtn} onPress={() => handleDeleteUser(item)}>
                            <Trash2 size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'donations' && (
              <View style={styles.panelCard}>
                <Text style={styles.panelCardTitle}>Donation Orders Panel</Text>
                <Text style={styles.panelCardSubtitle}>Track and edit statuses of food donation transfers</Text>

                <View style={styles.directoryControlsRow}>
                  <View style={styles.searchBarContainer}>
                    <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.directorySearchInput}
                      placeholder="Search donations..."
                      placeholderTextColor="#94A3B8"
                      value={donationSearch}
                      onChangeText={setDonationSearch}
                    />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, height: 32 }}>
                    {['all', 'Pending', 'Accepted', 'Assigned', 'Picked Up', 'Delivered', 'Completed', 'Cancelled'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[styles.directoryRoleChip, selectedDonationStatus === status && styles.directoryRoleChipActive, { marginRight: 6 }]}
                        onPress={() => setSelectedDonationStatus(status)}
                      >
                        <Text style={[styles.directoryRoleText, selectedDonationStatus === status && styles.directoryRoleTextActive]}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{ marginTop: 12 }}>
                  {(filteredDonations ?? []).map((item) => (
                    <View key={item?.id || item?._id} style={styles.directoryItemCard}>
                      <View style={styles.directoryItemHeader}>
                        <View>
                          <Text style={styles.directoryItemName}>{item?.foodType ?? 'Food Listing'}</Text>
                          <Text style={styles.directoryItemMeta}>Qty: {item?.quantity ?? 0} {item?.unit ?? ''} • Donor: {item?.donorName ?? ''}</Text>
                        </View>
                        <View style={[styles.statusBadgeGreen, item?.status === 'Cancelled' && styles.statusBadgeRed, item?.status === 'Pending' && styles.statusBadgeYellow]}>
                          <Text style={styles.statusBadgeText}>{item?.status ?? 'Pending'}</Text>
                        </View>
                      </View>

                      <View style={styles.donationDetailsMetadataList}>
                        <Text style={styles.donationDetailsMetadataItem}>🏢 NGO Partner: {item?.ngoName || 'Not matched'}</Text>
                        <Text style={styles.donationDetailsMetadataItem}>🚴 Logistics Volunteer: {item?.volunteerName || 'Not claimed'}</Text>
                        <Text style={styles.donationDetailsMetadataItem}>📍 Address: {item?.address ?? ''}</Text>
                      </View>

                      <View style={styles.directoryItemFooter}>
                        <Text style={styles.timestampText}>Posted: {item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</Text>
                        
                        <View style={styles.directoryActionsGroup}>
                          <TouchableOpacity style={styles.directoryActionBtn} onPress={() => setViewingDonation(item)}>
                            <Eye size={14} color="#64748B" />
                            <Text style={styles.directoryActionLabel}>View</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity style={styles.directoryActionBtn} onPress={() => handleOpenStatusEdit(item)}>
                            <Edit size={14} color="#22C55E" />
                            <Text style={[styles.directoryActionLabel, { color: '#22C55E' }]}>Status</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.directoryActionBtn} onPress={() => handleDeleteDonation(item)}>
                            <Trash2 size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'reports' && (
              <View style={styles.panelCard}>
                <Text style={styles.panelCardTitle}>System Reports Hub</Text>
                <Text style={styles.panelCardSubtitle}>Export structured audit records, metrics, and summaries</Text>

                <View style={styles.reportTabsRow}>
                  {[
                    { key: 'donations', label: 'Donations' },
                    { key: 'users', label: 'Platform Users' },
                    { key: 'ngos', label: 'NGO Partners' },
                    { key: 'volunteers', label: 'Volunteers' },
                    { key: 'monthly', label: 'Aggregate Summary' }
                  ].map(item => (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.directoryRoleChip, selectedReportType === item.key && styles.directoryRoleChipActive]}
                      onPress={() => setSelectedReportType(item.key as any)}
                    >
                      <Text style={[styles.directoryRoleText, selectedReportType === item.key && styles.directoryRoleTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.reportSettingsContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={16} color="#64748B" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>Month: </Text>
                    {['All', 'Apr', 'May', 'Jun'].map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.monthFilterChip, selectedReportMonth === m && styles.monthFilterChipActive]}
                        onPress={() => setSelectedReportMonth(m)}
                      >
                        <Text style={[styles.monthFilterText, selectedReportMonth === m && styles.monthFilterTextActive]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.exportActionsContainer}>
                    <TouchableOpacity style={styles.exportBtnAccent} onPress={handleExportCSV}>
                      <Download size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.exportBtnAccentText}>CSV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.exportBtnAccent, { backgroundColor: '#10B981' }]} onPress={handleExportExcel}>
                      <FileText size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.exportBtnAccentText}>Excel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.exportBtnAccent, { backgroundColor: '#8B5CF6' }]} onPress={handlePrintPDF}>
                      <Printer size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.exportBtnAccentText}>PDF Print</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.previewContainer}>
                  <Text style={styles.previewTitle}>Report Data Preview ({reportPreviewList?.length ?? 0} rows)</Text>
                  {!reportPreviewList || reportPreviewList.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <AlertCircle size={20} color="#64748B" />
                      <Text style={styles.emptyStateText}>No matching records found for current filters.</Text>
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                      <View>
                        <View style={styles.previewTableHeader}>
                          {(reportPreviewList?.[0] ? Object.keys(reportPreviewList[0]) : []).map(k => (
                            <Text key={k} style={styles.previewTableHeaderCell}>{k.toUpperCase()}</Text>
                          ))}
                        </View>
                        <FlatList
                          data={reportPreviewList}
                          keyExtractor={(item, index) => `preview_${index}`}
                          scrollEnabled={false}
                          renderItem={({ item }) => (
                            <View style={styles.previewTableRow}>
                              {(item ? Object.keys(item) : []).map(k => (
                                <Text key={k} style={styles.previewTableCell} numberOfLines={1}>
                                  {item?.[k] === null || item?.[k] === undefined ? 'N/A' : String(item[k])}
                                </Text>
                              ))}
                            </View>
                          )}
                        />
                      </View>
                    </ScrollView>
                  )}
                </View>
              </View>
            )}

            {activeTab === 'logs' && (
              <View style={styles.panelCard}>
                <View style={styles.panelCardHeaderRow}>
                  <View>
                    <Text style={styles.panelCardTitle}>Audit Logs Database</Text>
                    <Text style={styles.panelCardSubtitle}>Immutable history of administrator and operator actions</Text>
                  </View>
                  <TouchableOpacity style={styles.refreshBtnCircle} onPress={fetchAdminData}>
                    <RefreshCw size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchBarContainer}>
                  <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.directorySearchInput}
                    placeholder="Search logs by action details..."
                    placeholderTextColor="#94A3B8"
                    value={logSearch}
                    onChangeText={setLogSearch}
                  />
                </View>

                <View style={{ marginTop: 12 }}>
                  {(filteredLogs ?? []).map((item) => (
                    <View key={item?.id || item?._id} style={styles.auditLogItemCard}>
                      <View style={styles.auditLogHeader}>
                        <Text style={styles.auditLogActionTitle}>{item?.action ?? ''}</Text>
                        <Text style={styles.auditLogTime}>{item?.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</Text>
                      </View>
                      <Text style={styles.auditLogDetails}>{item?.details ?? ''}</Text>
                      <View style={styles.auditLogOperatorMeta}>
                        <View style={styles.operatorBullet} />
                        <Text style={styles.auditLogOperatorText}>Operator: {item?.performedBy ?? ''} ({item?.role ?? ''})</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* OVERLAY MODAL: VIEW USER DETAILS */}
      {viewingUser && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Account Record</Text>
              <TouchableOpacity onPress={() => setViewingUser(null)}>
                <X size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginVertical: 12 }}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Full Name</Text>
                <Text style={styles.modalDetailValue}>{viewingUser?.name ?? ''}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Email Address</Text>
                <Text style={styles.modalDetailValue}>{viewingUser?.email ?? ''}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>System Role</Text>
                <Text style={[styles.modalDetailValue, { color: '#22C55E', fontWeight: '700' }]}>{(viewingUser?.role ?? '').toUpperCase()}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Phone Number</Text>
                <Text style={styles.modalDetailValue}>{viewingUser?.contactNumber ?? ''}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Full Address</Text>
                <Text style={styles.modalDetailValue}>{viewingUser?.address ?? ''}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Account Status</Text>
                <Text style={[styles.modalDetailValue, { color: viewingUser?.isActive !== false ? '#22C55E' : '#EF4444', fontWeight: '700' }]}>
                  {viewingUser?.isActive !== false ? 'Active' : 'Suspended'}
                </Text>
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={() => setViewingUser(null)}>
              <Text style={styles.modalSubmitBtnText}>Close Record</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* OVERLAY MODAL: EDIT USER DETAILS */}
      {editingUser && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modify User Profile</Text>
              <TouchableOpacity onPress={() => setEditingUser(null)}>
                <X size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginVertical: 12 }}>
              <Text style={styles.inputLabelField}>Full Name</Text>
              <TextInput
                style={styles.modalTextInputField}
                value={userForm.name}
                onChangeText={(val) => setUserForm(prev => ({ ...prev, name: val }))}
              />
              {userFormErrors.name && <Text style={styles.errorTextHint}>{userFormErrors.name}</Text>}

              <Text style={styles.inputLabelField}>Email Address</Text>
              <TextInput
                style={styles.modalTextInputField}
                value={userForm.email}
                onChangeText={(val) => setUserForm(prev => ({ ...prev, email: val }))}
              />
              {userFormErrors.email && <Text style={styles.errorTextHint}>{userFormErrors.email}</Text>}

              <Text style={styles.inputLabelField}>Phone Number</Text>
              <TextInput
                style={styles.modalTextInputField}
                value={userForm.contactNumber}
                onChangeText={(val) => setUserForm(prev => ({ ...prev, contactNumber: val }))}
              />
              {userFormErrors.contactNumber && <Text style={styles.errorTextHint}>{userFormErrors.contactNumber}</Text>}

              <Text style={styles.inputLabelField}>Address Location</Text>
              <TextInput
                style={styles.modalTextInputField}
                value={userForm.address}
                onChangeText={(val) => setUserForm(prev => ({ ...prev, address: val }))}
              />
              {userFormErrors.address && <Text style={styles.errorTextHint}>{userFormErrors.address}</Text>}

              <Text style={styles.inputLabelField}>Role Profile Type</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                {['donor', 'ngo', 'volunteer'].map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.directoryRoleChip, userForm.role === r && styles.directoryRoleChipActive, { flex: 1 }]}
                    onPress={() => setUserForm(prev => ({ ...prev, role: r }))}
                  >
                    <Text style={[styles.directoryRoleText, userForm.role === r && styles.directoryRoleTextActive]}>
                      {r.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalActionsRowGroup}>
              <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: '#F1F5F9', flex: 1 }]} onPress={() => setEditingUser(null)}>
                <Text style={[styles.modalSubmitBtnText, { color: '#64748B' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtn, { flex: 1 }]} onPress={handleSaveUser}>
                <Text style={styles.modalSubmitBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* OVERLAY MODAL: CHANGE DONATION STATUS */}
      {editingDonation && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Donation Progress</Text>
              <TouchableOpacity onPress={() => setEditingDonation(null)}>
                <X size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginVertical: 12 }}>
              <Text style={[styles.inputLabelField, { marginBottom: 8 }]}>Select State Transition:</Text>
              <View style={{ gap: 6 }}>
                {['Pending', 'Accepted', 'Assigned', 'Picked Up', 'Delivered', 'Completed', 'Cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusSelectBtnItem, donationStatusVal === status && styles.statusSelectBtnItemActive]}
                    onPress={() => setDonationStatusVal(status)}
                  >
                    <Text style={[styles.statusSelectBtnText, donationStatusVal === status && styles.statusSelectBtnTextActive]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalActionsRowGroup}>
              <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: '#F1F5F9', flex: 1 }]} onPress={() => setEditingDonation(null)}>
                <Text style={[styles.modalSubmitBtnText, { color: '#64748B' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtn, { flex: 1 }]} onPress={handleSaveDonationStatus}>
                <Text style={styles.modalSubmitBtnText}>Commit Progress</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* OVERLAY MODAL: VIEW DONATION DETAILS */}
      {viewingDonation && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Donation Info</Text>
              <TouchableOpacity onPress={() => setViewingDonation(null)}>
                <X size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginVertical: 12 }}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Food Item Type</Text>
                <Text style={styles.modalDetailValue}>{viewingDonation?.foodType ?? ''}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Total Quantity</Text>
                <Text style={styles.modalDetailValue}>{viewingDonation?.quantity ?? 0} {viewingDonation?.unit ?? ''}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Order Status</Text>
                <Text style={[styles.modalDetailValue, { color: '#22C55E', fontWeight: '700' }]}>{(viewingDonation?.status ?? '').toUpperCase()}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Donor Account</Text>
                <Text style={styles.modalDetailValue}>{viewingDonation?.donorName ?? ''}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Matched NGO</Text>
                <Text style={styles.modalDetailValue}>{viewingDonation?.ngoName || 'Unassigned'}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Assigned Courier</Text>
                <Text style={styles.modalDetailValue}>{viewingDonation?.volunteerName || 'Not claimed'}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Pickup Address</Text>
                <Text style={styles.modalDetailValue}>{viewingDonation?.address ?? ''}</Text>
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={() => setViewingDonation(null)}>
              <Text style={styles.modalSubmitBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ==========================================
          ADDED: PROFILE EDIT MODAL
          ========================================== */}
      {showProfileModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 500, maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Administrator Profile Control</Text>
              <TouchableOpacity onPress={() => { setShowProfileModal(false); setIsEditingProfile(false); }}>
                <X size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 12 }}>
              {/* Profile Avatar Frame */}
              <View style={styles.profileAvatarFrame}>
                <View style={styles.profileAvatarContainer}>
                  <Text style={styles.profileAvatarChar}>{getInitials(profileName)}</Text>
                </View>
                {isEditingProfile && (
                  <View style={styles.cameraIconBadge}>
                    <Camera size={14} color="#FFFFFF" />
                  </View>
                )}
              </View>

              {isEditingProfile ? (
                // EDIT MODE
                <View>
                  <Text style={styles.inputLabelField}>Full Name</Text>
                  <TextInput
                    style={styles.modalTextInputField}
                    value={profileName}
                    onChangeText={setProfileName}
                    placeholder="Enter full name"
                  />

                  <Text style={styles.inputLabelField}>Email (Read Only)</Text>
                  <TextInput
                    style={[styles.modalTextInputField, styles.disabledInputField]}
                    value={user?.email || 'admin@foodreach.com'}
                    editable={false}
                  />

                  <Text style={styles.inputLabelField}>Phone Number</Text>
                  <TextInput
                    style={styles.modalTextInputField}
                    value={profilePhone}
                    onChangeText={setProfilePhone}
                    keyboardType="numeric"
                    placeholder="Enter phone number digits"
                  />

                  <Text style={styles.inputLabelField}>Role (Read Only)</Text>
                  <TextInput
                    style={[styles.modalTextInputField, styles.disabledInputField]}
                    value="System Admin"
                    editable={false}
                  />

                  <Text style={styles.inputLabelField}>Organization (Optional)</Text>
                  <TextInput
                    style={styles.modalTextInputField}
                    value={profileOrg}
                    onChangeText={setProfileOrg}
                    placeholder="Enter organization name"
                  />

                  <Text style={styles.inputLabelField}>Operating Address</Text>
                  <TextInput
                    style={styles.modalTextInputField}
                    value={profileAddress}
                    onChangeText={setProfileAddress}
                    placeholder="Enter office address"
                  />

                  <Text style={styles.inputLabelField}>Bio / About (Max 200 chars)</Text>
                  <TextInput
                    style={[styles.modalTextInputField, { height: 60 }]}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                    value={profileBio}
                    onChangeText={setProfileBio}
                    placeholder="Describe bio profile info"
                  />

                  <Text style={styles.inputLabelField}>Profile Photo URL</Text>
                  <TextInput
                    style={styles.modalTextInputField}
                    value={profilePicUrl}
                    onChangeText={setProfilePicUrl}
                    placeholder="Enter online picture URL path"
                  />

                  <View style={styles.modalActionsRowGroup}>
                    <TouchableOpacity
                      style={[styles.modalSubmitBtn, { backgroundColor: '#F1F5F9', flex: 1 }]}
                      onPress={() => setIsEditingProfile(false)}
                    >
                      <Text style={[styles.modalSubmitBtnText, { color: '#64748B' }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalSubmitBtn, { flex: 1 }]}
                      onPress={handleSaveAdminProfile}
                    >
                      <Text style={styles.modalSubmitBtnText}>Save Profile</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // VIEW MODE
                <View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Full Name</Text>
                    <Text style={styles.modalDetailValue}>{profileName}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Email Address</Text>
                    <Text style={styles.modalDetailValue}>{user?.email || 'admin@foodreach.com'}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Phone Number</Text>
                    <Text style={styles.modalDetailValue}>{profilePhone}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>System Role</Text>
                    <Text style={[styles.modalDetailValue, { color: '#22C55E', fontWeight: '800' }]}>System Admin</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Organization</Text>
                    <Text style={styles.modalDetailValue}>{profileOrg || 'N/A'}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Address</Text>
                    <Text style={styles.modalDetailValue}>{profileAddress}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Bio / About</Text>
                    <Text style={styles.modalDetailValue}>{profileBio || 'No bio entered.'}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Date Joined</Text>
                    <Text style={styles.modalDetailValue}>{dateJoined}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#22C55E' }]}
                    onPress={() => setIsEditingProfile(true)}
                  >
                    <Text style={[styles.modalSubmitBtnText, { color: '#22C55E' }]}>Edit Profile Details</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Password Section */}
              <View style={styles.passwordSectionWrapper}>
                <Text style={styles.passwordSectionTitle}>Security Settings</Text>
                
                <Text style={styles.inputLabelField}>Current Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInputField}
                    secureTextEntry={!showPasswords}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                  />
                  <TouchableOpacity onPress={() => setShowPasswords(!showPasswords)} style={styles.passwordEyeBtn}>
                    {showPasswords ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabelField}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInputField}
                    secureTextEntry={!showPasswords}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password (min. 6 characters)"
                  />
                </View>

                <Text style={styles.inputLabelField}>Confirm New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInputField}
                    secureTextEntry={!showPasswords}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                  />
                </View>

                <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleUpdatePassword}>
                  <Text style={styles.modalSubmitBtnText}>Update Credentials</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#EF4444', marginTop: 12 }]}
              onPress={() => setShowSignOutConfirmModal(true)}
            >
              <Text style={[styles.modalSubmitBtnText, { color: '#FFFFFF' }]}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#F1F5F9', marginTop: 8 }]}
              onPress={() => { setShowProfileModal(false); setIsEditingProfile(false); }}
            >
              <Text style={[styles.modalSubmitBtnText, { color: '#64748B' }]}>Close Profile Panel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* OVERLAY MODAL: CONFIRM SIGN OUT */}
      {showSignOutConfirmModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 400, backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>Confirm Sign Out</Text>
              <TouchableOpacity onPress={() => setShowSignOutConfirmModal(false)}>
                <X size={20} color={isDark ? '#F8FAFC' : '#1E293B'} />
              </TouchableOpacity>
            </View>
            
            <Text style={{ fontSize: 13.5, color: isDark ? '#CBD5E1' : '#475569', marginVertical: 16 }}>
              Are you sure you want to sign out?
            </Text>

            <View style={styles.modalActionsRowGroup}>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9', flex: 1, marginTop: 0 }]}
                onPress={() => setShowSignOutConfirmModal(false)}
              >
                <Text style={[styles.modalSubmitBtnText, { color: isDark ? '#CBD5E1' : '#64748B' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#EF4444', flex: 1, marginTop: 0 }]}
                onPress={handleConfirmSignOut}
              >
                <Text style={[styles.modalSubmitBtnText, { color: '#FFFFFF' }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* OVERLAY MODAL: VIEW ALL NOTIFICATIONS */}
      {showAllNotifsModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 650, maxHeight: '85%', backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Bell size={20} color="#22C55E" style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>All Notifications ({realtimeNotifs.length})</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAllNotifsModal(false)}>
                <X size={20} color={isDark ? '#F8FAFC' : '#1E293B'} />
              </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={{ flexDirection: 'row', gap: 10, marginVertical: 12 }}>
              {(['All', 'Unread', 'Read'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.statusSelectBtnItem,
                    notifFilter === tab && styles.statusSelectBtnItemActive
                  ]}
                  onPress={() => setNotifFilter(tab)}
                >
                  <Text style={[styles.statusSelectBtnText, notifFilter === tab && styles.statusSelectBtnTextActive]}>
                    {tab} ({tab === 'All' ? realtimeNotifs.length : tab === 'Unread' ? unreadCount : realtimeNotifs.length - unreadCount})
                  </Text>
                </TouchableOpacity>
              ))}

              {unreadCount > 0 && (
                <TouchableOpacity
                  style={[styles.statusSelectBtnItem, { marginLeft: 'auto', backgroundColor: '#F0FDF4', borderColor: '#22C55E' }]}
                  onPress={handleMarkAllAsRead}
                >
                  <Text style={{ fontSize: 11.5, color: '#22C55E', fontWeight: '700' }}>Mark All Read</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Notification List (Newest First) */}
            <ScrollView style={{ flex: 1, marginVertical: 8 }}>
              {realtimeNotifs.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B', fontSize: 14 }}>No notifications available.</Text>
                </View>
              ) : (
                realtimeNotifs
                  .filter(n => notifFilter === 'All' || (notifFilter === 'Unread' ? !n.isRead : n.isRead))
                  .map(item => (
                    <TouchableOpacity
                      key={item.id || item._id}
                      style={[
                        styles.notificationItem,
                        { paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0' },
                        !item.isRead && { backgroundColor: isDark ? '#1E293B' : '#F0FDF4', borderColor: isDark ? '#15803D' : '#BBF7D0' }
                      ]}
                      onPress={() => handleMarkAsRead(item.id || item._id || '')}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.notificationText, !item.isRead && { fontWeight: '800', color: '#0F172A' }]}>
                            {item.title}
                          </Text>
                          <Text style={styles.notificationTime}>{getFormattedTime(item.createdAt)}</Text>
                        </View>
                        <Text style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{item.message}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#E2E8F0' }}>
                            <Text style={{ fontSize: 10, color: '#475569', fontWeight: '600' }}>{item.type}</Text>
                          </View>
                          {!item.isRead && (
                            <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '700' }}>• Unread</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#F1F5F9', marginTop: 12 }]}
              onPress={() => setShowAllNotifsModal(false)}
            >
              <Text style={[styles.modalSubmitBtnText, { color: '#64748B' }]}>Close Notifications Panel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Snackbar Alert Banners */}
      {snackbar.visible && (
        <View style={[styles.snackbarContainer, snackbar.type === 'error' && styles.snackbarErrorBg]}>
          <Text style={styles.snackbarText}>{snackbar.message}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
  },
  absoluteFillBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    backgroundColor: 'transparent',
  },
  sidebar: {
    width: 250,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  sidebarCollapsed: {
    width: 70,
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  brandIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  sidebarMenuScroll: {
    flex: 1,
  },
  sidebarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
    marginVertical: 2,
  },
  sidebarMenuItemActive: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  sidebarMenuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  sidebarMenuItemTextActive: {
    color: '#22C55E',
  },
  sidebarCollapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  collapseText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 1000,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileMenuBtn: {
    padding: 6,
  },
  headerDashboardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAFBFD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDotBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerQuickExportBtn: {
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerQuickExportText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  headerUserAvatarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 6,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#22C55E',
  },
  headerUserTextDetails: {
    justifyContent: 'center',
  },
  headerUserDisplayName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerUserRoleName: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  dropdownPanel: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    zIndex: 9999,
    elevation: 9999,
    padding: 12,
  },
  dropdownHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  notificationItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  notificationText: {
    fontSize: 11,
    color: '#334155',
  },
  notificationTime: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 4,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
  },
  dropdownMenuItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  mobileTabsScroll: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexGrow: 0,
    height: 44,
  },
  mobileTabsContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 16,
  },
  mobileTabItem: {
    paddingVertical: 10,
  },
  mobileTabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#22C55E',
  },
  mobileTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  mobileTabTextActive: {
    color: '#22C55E',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
    fontStyle: 'italic',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#FAFBFD',
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  metricIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  metricCardSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '600',
  },
  dashboardGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 20,
  },
  dashboardGridCol: {
    flex: 1,
    minWidth: 300,
  },
  panelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  panelCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  panelCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 10,
    gap: 14,
  },
  progressBarWrapper: {
    flexDirection: 'column',
  },
  progressBarMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  progressBarVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#22C55E',
  },
  progressBarOuter: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  recentDonationItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  donationAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  donationAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#22C55E',
  },
  recentDonationDetails: {
    flex: 1,
  },
  recentDonationTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  recentDonationSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadgeGreen: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
  },
  statusBadgeRed: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeYellow: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  leaderboardItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  leaderboardBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  leaderboardBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  leaderboardScore: {
    fontSize: 10.5,
    color: '#D97706',
    fontWeight: '600',
  },
  directoryControlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
    marginBottom: 10,
  },
  searchBarContainer: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  directorySearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#1E293B',
  },
  directoryBadgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  directoryRoleChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  directoryRoleChipActive: {
    backgroundColor: '#22C55E',
  },
  directoryRoleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  directoryRoleTextActive: {
    color: '#FFFFFF',
  },
  directoryItemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  directoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarCircleSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarTextSmall: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  directoryItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  directoryItemMeta: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  roleBadgeGreen: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
  },
  roleBadgeBlue: {
    backgroundColor: '#DBEAFE',
  },
  roleBadgePurple: {
    backgroundColor: '#F3E8FF',
  },
  roleBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#22C55E',
  },
  directoryItemDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  directoryItemAddressText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  directoryItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusTextLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  directoryActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directoryActionBtn: {
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  directoryActionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  directoryStatusToggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  donationDetailsMetadataList: {
    marginTop: 10,
    gap: 4,
  },
  donationDetailsMetadataItem: {
    fontSize: 11,
    color: '#475569',
  },
  timestampText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  reportTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  reportSettingsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  monthFilterChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  monthFilterChipActive: {
    backgroundColor: '#22C55E',
  },
  monthFilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  monthFilterTextActive: {
    color: '#FFFFFF',
  },
  exportActionsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  exportBtnAccent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exportBtnAccentText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  previewContainer: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
  },
  previewTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
  },
  previewTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  previewTableHeaderCell: {
    width: 120,
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    paddingHorizontal: 6,
  },
  previewTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  previewTableCell: {
    width: 120,
    fontSize: 11,
    color: '#334155',
    paddingHorizontal: 6,
  },
  auditLogItemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  auditLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  auditLogActionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  auditLogTime: {
    fontSize: 9.5,
    color: '#94A3B8',
  },
  auditLogDetails: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 15,
  },
  auditLogOperatorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  operatorBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  auditLogOperatorText: {
    fontSize: 9.5,
    color: '#22C55E',
    fontWeight: '600',
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 11,
    color: '#64748B',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalDetailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalDetailLabel: {
    width: '35%',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  modalDetailValue: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
  },
  modalSubmitBtn: {
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  inputLabelField: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 10,
  },
  modalTextInputField: {
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  disabledInputField: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
    borderColor: '#E2E8F0',
  },
  errorTextHint: {
    fontSize: 9,
    color: '#EF4444',
    marginTop: 2,
  },
  modalActionsRowGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statusSelectBtnItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  statusSelectBtnItemActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  statusSelectBtnText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  statusSelectBtnTextActive: {
    color: '#FFFFFF',
  },
  floatingAiFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 998,
  },
  // Profile styles
  profileAvatarFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 16,
  },
  profileAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarChar: {
    fontSize: 28,
    fontWeight: '800',
    color: '#22C55E',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: '40%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  passwordSectionWrapper: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  passwordSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    height: 38,
    paddingHorizontal: 10,
  },
  passwordInputField: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    height: '100%',
  },
  passwordEyeBtn: {
    padding: 6,
  },
  snackbarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 99999,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  snackbarErrorBg: {
    backgroundColor: '#EF4444',
  },
  snackbarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  mobileDrawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20000,
    flexDirection: 'row',
  },
  mobileDrawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  mobileDrawerContent: {
    width: 270,
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 20001,
  },
});

export default AdminDashboard;
