// ============================================================================
// LOWKEY — Newsletter Service
// Handles email subscriptions with Supabase or localStorage fallback
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type { Subscriber } from './database.types';

const STORAGE_KEY = 'lowkey-subscribers';

export async function subscribe(email: string, source: string = 'website'): Promise<{ success: boolean; error?: string }> {
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email address' };
  }

  // Try Supabase first
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('subscribers').insert({
        email: email.toLowerCase().trim(),
        source,
      });

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'already' };
        }
        throw error;
      }
      
      return { success: true };
    } catch (err) {
      console.error('[LOWKEY] Supabase subscribe error:', err);
      return { success: false, error: 'Failed to subscribe' };
    }
  }

  // Fallback to localStorage
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const subscribers: Subscriber[] = existing ? JSON.parse(existing) : [];
    
    if (subscribers.some(s => s.email === email.toLowerCase().trim())) {
      return { success: false, error: 'already' };
    }
    
    subscribers.push({ email: email.toLowerCase().trim(), source });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscribers));
    
    console.info('[LOWKEY] Subscriber saved to localStorage:', email);
    return { success: true };
  } catch (err) {
    console.error('[LOWKEY] localStorage subscribe error:', err);
    return { success: false, error: 'Failed to subscribe' };
  }
}

// Get all subscribers (for admin)
export async function getSubscribers(): Promise<Subscriber[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[LOWKEY] Failed to fetch subscribers:', error);
      return [];
    }
    
    return (data || []).map(row => ({
      email: row.email,
      source: row.source,
    }));
  }

  // Fallback
  const existing = localStorage.getItem(STORAGE_KEY);
  return existing ? JSON.parse(existing) : [];
}
