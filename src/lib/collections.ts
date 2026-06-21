// ============================================================================
// LOWKEY — Collections System
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';

export type CollectionStatus = 'draft' | 'upcoming' | 'live' | 'archived';

export interface Collection {
  id?: string;
  slug: string;
  name: string;
  description: string;
  heroImage: string;
  season: string;
  launchDate: string;
  status: CollectionStatus;
  sortOrder: number;
  createdAt?: string;
}

const STORAGE_KEY = 'lowkey-collections';

const defaultCollection: Collection = {
  slug: 'drop-001',
  name: 'Drop 001',
  description: 'A Study in Heritage and Silence',
  heroImage: '/images/hero.jpg',
  season: '2026',
  launchDate: '2026',
  status: 'live',
  sortOrder: 1,
};

function fromRow(r: any): Collection {
  return {
    id: r.id, slug: r.slug, name: r.name, description: r.description || '',
    heroImage: r.hero_image || '', season: r.season || '', launchDate: r.launch_date || '',
    status: r.status || 'draft', sortOrder: r.sort_order || 0, createdAt: r.created_at,
  };
}

export async function getCollections(): Promise<Collection[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.from('collections').select('*').order('sort_order', { ascending: true });
      if (data && data.length > 0) return data.map(fromRow);
    } catch { /* fallback */ }
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* */ }
  return [defaultCollection];
}

export async function getLiveCollection(): Promise<Collection | null> {
  const all = await getCollections();
  return all.find(c => c.status === 'live') || null;
}

export async function getArchivedCollections(): Promise<Collection[]> {
  const all = await getCollections();
  return all.filter(c => c.status === 'archived');
}

export async function createCollection(c: Partial<Collection>): Promise<{ success: boolean; error?: string }> {
  const slug = c.slug || c.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '';
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('collections').insert({
      slug, name: c.name || '', description: c.description || '',
      hero_image: c.heroImage || '', season: c.season || '', launch_date: c.launchDate || '',
      status: c.status || 'draft', sort_order: c.sortOrder || 99,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
  // localStorage fallback
  const all = await getCollections();
  all.push({ ...defaultCollection, ...c, slug } as Collection);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return { success: true };
}

export async function updateCollection(slug: string, updates: Partial<Collection>): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured && supabase) {
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.heroImage !== undefined) payload.hero_image = updates.heroImage;
    if (updates.season !== undefined) payload.season = updates.season;
    if (updates.launchDate !== undefined) payload.launch_date = updates.launchDate;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
    const { error } = await supabase.from('collections').update(payload).eq('slug', slug);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
  const all = await getCollections();
  const idx = all.findIndex(c => c.slug === slug);
  if (idx >= 0) { all[idx] = { ...all[idx], ...updates }; localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); }
  return { success: true };
}

export async function deleteCollection(slug: string): Promise<{ success: boolean }> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('collections').delete().eq('slug', slug);
  }
  const all = await getCollections();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter(c => c.slug !== slug)));
  return { success: true };
}

// Auto-archive: when making a collection Live, archive all other Live ones
export async function setCollectionLive(slug: string): Promise<{ success: boolean }> {
  const all = await getCollections();
  for (const c of all) {
    if (c.status === 'live' && c.slug !== slug) {
      await updateCollection(c.slug, { status: 'archived' });
    }
  }
  await updateCollection(slug, { status: 'live' });
  return { success: true };
}
