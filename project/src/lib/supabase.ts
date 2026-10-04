import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dekhpodsixpfonoqwkwx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRla2hwb2RzaXhwZm9ub3F3a3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MzAwNjEsImV4cCI6MjEwMjAwNjA2MX0.Bhk2ORbIS1OuHyXqdjxc0xot8rDxSyKHIMDZTmCYJgc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
