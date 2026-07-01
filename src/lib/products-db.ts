// ============================================================================
// LOWKEY — Products Database Layer
// Reads from Supabase first, falls back to catalog.ts
// Admin can add/edit/delete products via Supabase
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { products as catalogProducts, type Product } from '../data/catalog';

export interface DBProduct {
  slug: string;
  name: string;
  category: string;
  price: string;
  priceValue: number;
  image: string;
  images: string;
  fabric: string;
  weight: string;
  origin: string;
  fit: string;
  intro: string;
  construction: string;
  sizes: string[];
  visible: boolean;
  sortOrder: number;
}

// Transform Supabase row → DBProduct
function fromRow(r: any): DBProduct {
  return {
    slug: r.slug,
    name: r.name,
    category: r.category || '',
    price: r.price || '',
    priceValue: r.price_value || 0,
    image: r.image || '',
    images: r.images || '',
    fabric: r.fabric || '',
    weight: r.weight || '',
    origin: r.origin || 'Made in Port Said, Egypt',
    fit: r.fit || '',
    intro: r.intro || '',
    construction: r.construction || '',
    sizes: r.sizes || [],
    visible: r.visible !== false,
    sortOrder: r.sort_order || 0,
  };
}

// Transform DBProduct → catalog Product (for the website)
function toProduct(p: DBProduct): Product {
  // Combine main image + extras into one array
  const allImages: string[] = [];
  if (p.image) allImages.push(p.image);
  if (p.images) {
    p.images.split(',').map(u => u.trim()).filter(Boolean).forEach(u => {
      if (!allImages.includes(u)) allImages.push(u);
    });
  }

  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    price: p.price,
    priceValue: p.priceValue,
    image: allImages[0] || p.image,
    images: allImages.length > 1 ? allImages : undefined,
    fabric: p.fabric,
    weight: p.weight,
    origin: p.origin,
    fit: p.fit,
    intro: p.intro,
    construction: p.construction,
    sizes: p.sizes,
    stock: {},
  };
}

// ============ READ ============

export async function getAllProducts(): Promise<DBProduct[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map(fromRow);
    }
  }
  // Fallback to catalog
  return catalogProducts.map((p, i) => ({
    slug: p.slug, name: p.name, category: p.category,
    price: p.price, priceValue: p.priceValue,
    image: p.image, images: p.images?.join(',') || '',
    fabric: p.fabric, weight: p.weight, origin: p.origin,
    fit: p.fit, intro: p.intro, construction: p.construction,
    sizes: p.sizes, visible: true, sortOrder: i + 1,
  }));
}

// Get visible products for the website
export async function getVisibleProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter(p => p.visible).map(toProduct);
}

// ============ CREATE ============

export async function createProduct(product: Partial<DBProduct>): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Database not connected' };

  const slug = product.slug || product.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') || '';
  
  const { error } = await supabase.from('products').insert({
    slug,
    name: product.name || '',
    category: product.category || '',
    price: product.price || '',
    price_value: product.priceValue || 0,
    image: product.image || '',
    images: product.images || '',
    fabric: product.fabric || '',
    weight: product.weight || '',
    origin: product.origin || 'Made in Port Said, Egypt',
    fit: product.fit || '',
    intro: product.intro || '',
    construction: product.construction || '',
    sizes: product.sizes || [],
    visible: product.visible !== false,
    sort_order: product.sortOrder || 99,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============ UPDATE ============

export async function updateProduct(slug: string, updates: Partial<DBProduct>): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Database not connected' };

  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.price !== undefined) payload.price = updates.price;
  if (updates.priceValue !== undefined) payload.price_value = updates.priceValue;
  if (updates.image !== undefined) payload.image = updates.image;
  if (updates.images !== undefined) payload.images = updates.images;
  if (updates.fabric !== undefined) payload.fabric = updates.fabric;
  if (updates.weight !== undefined) payload.weight = updates.weight;
  if (updates.origin !== undefined) payload.origin = updates.origin;
  if (updates.fit !== undefined) payload.fit = updates.fit;
  if (updates.intro !== undefined) payload.intro = updates.intro;
  if (updates.construction !== undefined) payload.construction = updates.construction;
  if (updates.sizes !== undefined) payload.sizes = updates.sizes;
  if (updates.visible !== undefined) payload.visible = updates.visible;
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;

  const { error } = await supabase.from('products').update(payload).eq('slug', slug);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============ DELETE ============

export async function deleteProduct(slug: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Database not connected' };

  const { error } = await supabase.from('products').delete().eq('slug', slug);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
