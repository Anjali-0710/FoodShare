-- ============================================================
-- FoodShare AI — Supabase PostgreSQL Schema
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. PROFILES TABLE (links to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('donor', 'ngo', 'volunteer', 'admin')),
  contact_number TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ngo_capacity INTEGER,
  food_type_preference TEXT[],
  volunteer_score INTEGER DEFAULT 0,
  completed_pickups INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DONATIONS TABLE
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'Kg',
  best_before_date TIMESTAMPTZ,
  preparation_time TIMESTAMPTZ,
  temperature DOUBLE PRECISION DEFAULT 25,
  donor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  donor_name TEXT,
  ngo_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ngo_name TEXT,
  volunteer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  volunteer_name TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Accepted','Assigned','Picked Up','Delivered','Completed','Cancelled')),
  pickup_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  contact_number TEXT,
  additional_notes TEXT,
  image_urls TEXT[],
  freshness_score INTEGER DEFAULT 80,
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  related_donation_id UUID REFERENCES public.donations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SYSTEM LOGS TABLE
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT,
  performed_by TEXT,
  role TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_donations_donor ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_ngo ON public.donations(ngo_id);
CREATE INDEX IF NOT EXISTS idx_donations_volunteer ON public.donations(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON public.donations(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
-- Users can read all profiles (needed for NGO/volunteer to see each other)
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow insert for new profiles (during registration)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow admin to delete profiles
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- DONATIONS POLICIES
-- All authenticated users can read donations
CREATE POLICY "donations_select_authenticated" ON public.donations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Donors can create donations
CREATE POLICY "donations_insert_donor" ON public.donations
  FOR INSERT WITH CHECK (auth.uid() = donor_id);

-- Donors, NGOs, volunteers, and admins can update donations
CREATE POLICY "donations_update_authenticated" ON public.donations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Only donor or admin can delete donations
CREATE POLICY "donations_delete_own_or_admin" ON public.donations
  FOR DELETE USING (
    auth.uid() = donor_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- NOTIFICATIONS POLICIES
-- Users see only their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Any authenticated user can create notifications (for system events)
CREATE POLICY "notifications_insert_authenticated" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- SYSTEM LOGS POLICIES
-- All authenticated users can read logs
CREATE POLICY "logs_select_authenticated" ON public.system_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Any authenticated user can insert logs
CREATE POLICY "logs_insert_authenticated" ON public.system_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- ENABLE REALTIME for notifications
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;

-- ============================================================
-- SEED: Initial admin account (optional — you can register via app)
-- ============================================================
-- NOTE: Run this AFTER creating an admin account via app signup
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@foodshare.com';

-- ============================================================
-- AUTO-CONFIRM USERS AT DATABASE LEVEL (Bypass SMTP/OTP)
-- Run this in your Supabase SQL Editor to make all new signups instantly verified
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = NOW();
  NEW.confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_auto_confirm_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();

