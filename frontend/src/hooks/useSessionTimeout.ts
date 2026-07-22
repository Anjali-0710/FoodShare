import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../store/authSlice';
import { supabase } from '../services/supabase';
import { AuthService } from '../services/authService';

// ─── Configuration ────────────────────────────────────────────────────────────
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS  =  1 * 60 * 1000; // warn 1 min before expiry

// ─── Web activity events to watch ─────────────────────────────────────────────
const WEB_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
];

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * useSessionTimeout
 *
 * Automatically signs the user out after SESSION_TIMEOUT_MS of inactivity.
 * Works on both web (DOM events) and native (AppState changes).
 *
 * @param onWarning   Optional callback fired ~1 min before expiry so the UI can
 *                    show a "Session expiring soon" banner.
 */
export function useSessionTimeout(onWarning?: () => void) {
  const dispatch      = useDispatch();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  // Refs so closures always read the latest values without stale captures
  const timeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAuthRef    = useRef(isAuthenticated);
  const onWarningRef = useRef(onWarning);

  useEffect(() => { isAuthRef.current    = isAuthenticated; }, [isAuthenticated]);
  useEffect(() => { onWarningRef.current = onWarning;       }, [onWarning]);

  // ── Force logout ────────────────────────────────────────────────────────────
  const forceLogout = useCallback(async () => {
    try {
      await AuthService.logout();
    } catch (_) {
      await supabase.auth.signOut().catch(() => {});
    }
    dispatch(logout());
  }, [dispatch]);

  // ── Reset / restart the timeout countdown ──────────────────────────────────
  const resetTimer = useCallback(() => {
    if (!isAuthRef.current) return;

    // Clear any pending timers
    if (timeoutRef.current)  clearTimeout(timeoutRef.current);
    if (warningRef.current)  clearTimeout(warningRef.current);

    // Warning fires 1 min before expiry
    warningRef.current = setTimeout(() => {
      if (isAuthRef.current && onWarningRef.current) {
        onWarningRef.current();
      }
    }, SESSION_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Logout fires at SESSION_TIMEOUT_MS
    timeoutRef.current = setTimeout(() => {
      if (isAuthRef.current) {
        forceLogout();
      }
    }, SESSION_TIMEOUT_MS);
  }, [forceLogout]);

  // ── Stop all timers ─────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (timeoutRef.current)  clearTimeout(timeoutRef.current);
    if (warningRef.current)  clearTimeout(warningRef.current);
    timeoutRef.current = null;
    warningRef.current = null;
  }, []);

  // ── Effect: start / stop based on auth state ────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }

    // ── WEB: listen to DOM activity events ──────────────────────────────────
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleActivity = () => resetTimer();

      WEB_EVENTS.forEach(evt =>
        window.addEventListener(evt, handleActivity, { passive: true })
      );

      // Handle page visibility (tab switch / minimise)
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          resetTimer();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);

      resetTimer(); // kick off the first countdown

      return () => {
        clearTimers();
        WEB_EVENTS.forEach(evt =>
          window.removeEventListener(evt, handleActivity)
        );
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }

    // ── NATIVE (iOS / Android): use AppState ─────────────────────────────────
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // App returned to foreground — reset the countdown
        resetTimer();
      } else if (nextState === 'background' || nextState === 'inactive') {
        // App went to background — stop the countdown (OS may freeze the process)
        clearTimers();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    resetTimer(); // kick off the first countdown

    return () => {
      clearTimers();
      subscription.remove();
    };
  }, [isAuthenticated, resetTimer, clearTimers]);

  // Expose resetTimer so screens can call it on manual interactions
  return { resetTimer };
}
