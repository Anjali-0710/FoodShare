-- Migration: Add status column to profiles table
-- Allowed values: 'active', 'suspended'

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'suspended'));

-- Synchronize status for any existing suspended/deactivated accounts
UPDATE public.profiles
SET status = 'suspended'
WHERE is_active = false;

-- Create index on status column for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
