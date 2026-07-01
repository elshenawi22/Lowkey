// ============================================================================
// LOWKEY — Supabase Client
// ============================================================================
// 
// لتفعيل Supabase:
// 1. اعمل حساب على https://supabase.com
// 2. اعمل project جديد
// 3. روح Settings → API
// 4. انسخ الـ URL و anon key
// 5. حط القيم هنا مباشرة (أو في .env)
//
// ============================================================================

import { createClient } from '@supabase/supabase-js';

// ✅ LOWKEY Supabase Configuration
const SUPABASE_URL = 'https://fbcuwavlzibphkekeqvn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiY3V3YXZsemlicGhrZWtlcXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MjE5MDIsImV4cCI6MjA5NzA5NzkwMn0.tGLXp6T9UtUB4a1bgESbW1zDfLiEQVWlR24QoU339TI';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!isSupabaseConfigured) {
  console.info('[LOWKEY] Supabase not configured — using localStorage fallback');
}
