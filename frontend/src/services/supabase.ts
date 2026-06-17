import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ocsgzbmnnldpcsbfgocz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NdZzQBEthlCcKXp5c-tEQg_o5davYD8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: 'donor' | 'ngo' | 'volunteer' | 'admin';
          contact_number: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          ngo_capacity: number | null;
          food_type_preference: string[] | null;
          volunteer_score: number;
          completed_pickups: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role: 'donor' | 'ngo' | 'volunteer' | 'admin';
          contact_number?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          ngo_capacity?: number | null;
          food_type_preference?: string[] | null;
          volunteer_score?: number;
          completed_pickups?: number;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      donations: {
        Row: {
          id: string;
          food_type: string;
          quantity: number;
          unit: string;
          best_before_date: string | null;
          preparation_time: string | null;
          temperature: number | null;
          donor_id: string | null;
          donor_name: string | null;
          ngo_id: string | null;
          ngo_name: string | null;
          volunteer_id: string | null;
          volunteer_name: string | null;
          status: string;
          pickup_address: string | null;
          latitude: number | null;
          longitude: number | null;
          contact_number: string | null;
          additional_notes: string | null;
          image_urls: string[] | null;
          freshness_score: number | null;
          qr_code: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['donations']['Row'], 'id' | 'created_at'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['donations']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          title: string | null;
          message: string | null;
          type: string | null;
          is_read: boolean;
          related_donation_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      system_logs: {
        Row: {
          id: string;
          action: string | null;
          performed_by: string | null;
          role: string | null;
          details: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['system_logs']['Row'], 'id' | 'created_at'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['system_logs']['Insert']>;
      };
    };
  };
};

export default supabase;
