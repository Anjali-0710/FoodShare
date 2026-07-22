-- ============================================================
-- FoodShare / FoodReach — Admin RLS Policy Migration
-- Run this once in: Supabase Dashboard > SQL Editor
-- ============================================================
-- Adds UPDATE and DELETE permissions for admin role users on profiles.
-- The existing "profiles_update_own" policy only allows self-update
-- (auth.uid() = id), which blocked admins from editing other users.
-- ============================================================

-- Helper function: returns TRUE when the current session belongs to an admin.
-- SECURITY DEFINER runs as the function owner (bypasses RLS on the inner SELECT)
-- so there is no infinite-recursion risk.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Grant admins the ability to UPDATE any profile row
-- (covers Activate, Deactivate, Edit name/email/contact/address)
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  USING (public.is_admin());

-- Grant admins the ability to DELETE any profile row
-- (existing policy only matched via subquery — replace with the helper for consistency)
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE
  USING (public.is_admin());
