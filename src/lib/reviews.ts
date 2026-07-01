// ============================================================================
// LOWKEY — Reviews System (REAL reviews only — no defaults, no fake data)
// Reads/writes from Supabase so a review submitted on one device is visible
// to every visitor, not just the device that wrote it.
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';

export interface Review {
  id: string;
  productSlug: string;
  productName: string;
  name: string;
  rating: number;
  text: string;
  date: string;
  verified: boolean;
  featured: boolean;
}

const STORAGE_KEY = 'lowkey-reviews';

function readLocal(): Review[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function writeLocal(reviews: Review[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews)); } catch { /* ignore */ }
}

function fromRow(row: any): Review {
  return {
    id: row.id,
    productSlug: row.product_slug,
    productName: row.product_name,
    name: row.customer_name,
    rating: row.rating,
    text: row.review_text || '',
    date: (row.created_at || '').split('T')[0],
    verified: row.verified,
    featured: row.featured,
  };
}

export async function getReviews(): Promise<Review[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (!error && data) return data.map(fromRow);
    } catch { /* fall through to local */ }
  }
  return readLocal();
}

export async function getProductReviews(slug: string): Promise<Review[]> {
  return (await getReviews()).filter(r => r.productSlug === slug);
}

export async function getFeaturedReviews(): Promise<Review[]> {
  return (await getReviews()).filter(r => r.featured);
}

export async function getAverageRating(slug: string): Promise<{ avg: number; count: number }> {
  const reviews = await getProductReviews(slug);
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

export async function getAllAverageRating(): Promise<{ avg: number; count: number }> {
  const reviews = await getReviews();
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

export async function addReview(review: Omit<Review, 'id' | 'date' | 'verified'>): Promise<Review> {
  const newReview: Review = {
    ...review,
    id: `rev-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    verified: true,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('reviews').insert({
        product_slug: review.productSlug,
        product_name: review.productName,
        customer_name: review.name,
        rating: review.rating,
        review_text: review.text || null,
        verified: true,
        featured: review.featured || false,
      }).select().single();
      if (!error && data) return fromRow(data);
    } catch { /* fall through to local */ }
  }

  // Fallback: localStorage
  const all = readLocal();
  all.unshift(newReview);
  writeLocal(all);
  return newReview;
}

// Admin: feature/unfeature or moderate a review.
export async function setReviewFeatured(id: string, featured: boolean): Promise<{ success: boolean }> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('reviews').update({ featured }).eq('id', id);
    return { success: !error };
  }
  const all = readLocal().map(r => r.id === id ? { ...r, featured } : r);
  writeLocal(all);
  return { success: true };
}

export async function deleteReview(id: string): Promise<{ success: boolean }> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    return { success: !error };
  }
  writeLocal(readLocal().filter(r => r.id !== id));
  return { success: true };
}
