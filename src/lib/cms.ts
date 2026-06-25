// ============================================================================
// LOWKEY — CMS (Content Management System)
// Saves to Supabase (persistent) + localStorage (cache/fallback)
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'lowkey-cms';

export interface SiteContent {
  hero_image: string;
  hero_video: string; // mp4 URL — if set, plays as background instead of image
  hero_title: string;
  hero_slogan: string;
  hero_cta: string;

  collection_label: string;
  collection_cta: string;

  newsletter_label: string;
  newsletter_title: string;
  newsletter_subtitle: string;
  newsletter_btn: string;
  newsletter_success: string;

  footer_tagline: string;
  footer_origin: string;

  drop_hero_image: string;
  drop_hero_label: string;
  drop_hero_title: string;
  drop_hero_description: string;
  drop_hero_cta: string;

  drop_manifesto_label: string;
  drop_manifesto_title_ar: string;
  drop_manifesto_title_en: string;
  drop_manifesto_body: string;

  drop_fabric_label: string;
  drop_fabric_title_ar: string;
  drop_fabric_title_en: string;
  drop_fabric_body: string;
  drop_fabric_image: string;
  drop_fabric_stat1: string;
  drop_fabric_stat1_label: string;
  drop_fabric_stat2: string;
  drop_fabric_stat2_label: string;

  drop_video1_label: string;
  drop_video1_title_ar: string;
  drop_video1_title_en: string;
  drop_video1_url: string;

  drop_lookbook1: string;
  drop_lookbook2: string;
  drop_lookbook3: string;
  drop_lookbook4: string;

  drop_lineup_label: string;
  drop_lineup_title_ar: string;
  drop_lineup_title_en: string;

  drop_video2_label: string;
  drop_video2_title_ar: string;
  drop_video2_title_en: string;
  drop_video2_url: string;

  drop_closing_label: string;
  drop_closing_title: string;
  drop_closing_body_en: string;
  drop_closing_body_ar: string;

  brand_name: string;
  brand_phone: string;
  brand_instagram: string;
  brand_email: string;

  shipping_portsaid: string;
  shipping_cairo: string;
  shipping_alex: string;
  shipping_other: string;

  product_images_heritage_knit_polo: string;
  product_images_oxford_button_down: string;
  product_images_heavyweight_tee: string;
  product_images_merino_crewneck: string;

  // Story page
  story_hero_image: string;
  story_title: string;
  story_quote_ar: string;
  story_quote_en: string;
  story_body_1: string;
  story_body_2: string;
  story_body_3: string;
  story_value_1_title: string;
  story_value_1_text: string;
  story_value_2_title: string;
  story_value_2_text: string;
  story_value_3_title: string;
  story_value_3_text: string;

  // Launch Mode
  launch_mode: string; // 'on' or 'off'
  launch_image: string;
  launch_title: string;
  launch_subtitle: string;
  launch_date: string; // ISO date string for countdown
}

export const defaultContent: SiteContent = {
  hero_image: '',
  hero_video: '',
  hero_title: 'LOWKEY',
  hero_slogan: 'Stay Low. Leave Legacy.',
  hero_cta: 'Explore Drop 001',

  collection_label: 'Drop 001',
  collection_cta: 'View Drop 001',

  newsletter_label: 'Stay Updated',
  newsletter_title: 'كن أول من يعرف',
  newsletter_subtitle: 'سجّل إيميلك وكن أول من يعرف عن Drop 002 — قبل أي حد تاني.',
  newsletter_btn: 'انضم للقائمة',
  newsletter_success: '✓ تم التسجيل',

  footer_tagline: 'Stay Low. Leave Legacy.',
  footer_origin: 'Port Said, Egypt',

  drop_hero_image: '',
  drop_hero_label: 'Drop 001 — Released 2026',
  drop_hero_title: 'A Study in\nHeritage and\nSilence.',
  drop_hero_description: 'The inaugural archive. Four foundational pieces built on Egyptian cotton, quiet craftsmanship, and the belief that the strongest presence is often the quietest.',
  drop_hero_cta: 'View the Collection',

  drop_manifesto_label: 'The Manifesto',
  drop_manifesto_title_ar: 'في عالم مليء بالضوضاء،\nنختار الصمت.',
  drop_manifesto_title_en: 'In a world full of noise, we choose silence.',
  drop_manifesto_body: 'Drop 001 is not about trends. It is about foundations. Four pieces designed to become the quiet core of your wardrobe — worn daily, washed often, remembered always.',

  drop_fabric_label: 'The Fabric',
  drop_fabric_title_ar: 'قطن مصري طويل التيلة.',
  drop_fabric_title_en: 'Egyptian long-staple cotton.',
  drop_fabric_body: 'Every piece in Drop 001 begins with cotton grown in the Nile Delta — fibers longer and finer than any other region produces. This is not a marketing claim. It is agricultural reality, refined over centuries.',
  drop_fabric_image: '',
  drop_fabric_stat1: '220-260',
  drop_fabric_stat1_label: 'GSM Weight',
  drop_fabric_stat2: '100%',
  drop_fabric_stat2_label: 'Egyptian Cotton',

  drop_video1_label: 'The Process',
  drop_video1_title_ar: 'صُنع ليبقى. ليس ليُلاحظ.',
  drop_video1_title_en: 'Crafted with intention. Designed to endure.',
  drop_video1_url: '',

  drop_lookbook1: '',
  drop_lookbook2: '',
  drop_lookbook3: '',
  drop_lookbook4: '',

  drop_lineup_label: 'The Lineup',
  drop_lineup_title_ar: 'أربع قطع أساسية.',
  drop_lineup_title_en: 'Four foundational pieces.',

  drop_video2_label: 'Craftsmanship',
  drop_video2_title_ar: 'صُمم ليبقى. ليس ليتبدل.',
  drop_video2_title_en: 'Built for permanence. Not for trends.',
  drop_video2_url: '',

  drop_closing_label: 'Drop 001 — Port Said, Egypt',
  drop_closing_title: 'Stay Low.\nLeave Legacy.',
  drop_closing_body_en: 'Made in Port Said, Egypt. Built to last.',
  drop_closing_body_ar: 'صُنع في بورسعيد، مصر. صُمم ليبقى.',

  brand_name: 'LOWKEY',
  brand_phone: '201091600978',
  brand_instagram: 'https://www.instagram.com/lowkey_egy',
  brand_email: '',

  shipping_portsaid: '0',
  shipping_cairo: '60',
  shipping_alex: '60',
  shipping_other: '80',

  product_images_heritage_knit_polo: '',
  product_images_oxford_button_down: '',
  product_images_heavyweight_tee: '',
  product_images_merino_crewneck: '',

  story_hero_image: '',
  story_title: 'The Story',
  story_quote_ar: 'في عالم مليء بالضوضاء،\nنختار الصمت.',
  story_quote_en: 'In a world full of noise, we choose silence.',
  story_body_1: 'LOWKEY وُلدت في بورسعيد — مدينة على حافة قناة السويس، حيث تلتقي الثقافات منذ أكثر من قرن.',
  story_body_2: 'نؤمن أن أقوى حضور هو الأكثر هدوءاً. في زمن يطارد الظهور، نحن نقدّر البقاء. نصنع قطعاً تكبر معك، تُلبس كثيراً، وتُتذكر دائماً.',
  story_body_3: 'لا شيء صاخب. لا شيء زائد. كل شيء مقصود.',
  story_value_1_title: 'Craftsmanship',
  story_value_1_text: 'Egyptian long-staple cotton, selected for the way it ages.',
  story_value_2_title: 'Heritage',
  story_value_2_text: 'Rooted in Port Said — one of the oldest textile traditions.',
  story_value_3_title: 'Restraint',
  story_value_3_text: 'We remove the unnecessary. Only what matters remains.',

  launch_mode: 'off',
  launch_image: '',
  launch_title: 'New Collection Coming Soon',
  launch_subtitle: 'مجموعة جديدة قريباً',
  launch_date: '',
};

// ============ LOAD ============
// Reads from localStorage cache first (instant), then syncs from Supabase

export function loadContent(): SiteContent {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultContent, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...defaultContent };
}

// Load from Supabase and update localStorage cache
async function syncFromSupabase(): Promise<SiteContent | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  
  try {
    const { data, error } = await supabase.from('site_content').select('data').eq('id', 'main').single();
    if (error || !data) return null;
    
    const content = { ...defaultContent, ...(data.data as Partial<SiteContent>) };
    // Update localStorage cache
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    return content;
  } catch {
    return null;
  }
}

// ============ SAVE ============
// Saves to both localStorage AND Supabase

export async function saveContent(content: Partial<SiteContent>): Promise<SiteContent> {
  const current = loadContent();
  const merged = { ...current, ...content };
  
  // Save to localStorage (instant)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  
  // Save to Supabase (persistent)
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('site_content').upsert({ 
        id: 'main', 
        data: merged, 
        updated_at: new Date().toISOString() 
      });
    } catch (err) {
      console.error('[LOWKEY] Failed to save CMS to Supabase:', err);
    }
  }
  
  return merged;
}

// ============ REACT HOOK ============

export function useCMS(): SiteContent {
  const [content, setContent] = useState<SiteContent>(loadContent);

  useEffect(() => {
    // Sync from Supabase on mount (background)
    syncFromSupabase().then(data => {
      if (data) setContent(data);
    });
    
    // Listen for CMS updates from admin
    const handler = () => setContent(loadContent());
    window.addEventListener('lowkey-cms-update', handler);
    return () => window.removeEventListener('lowkey-cms-update', handler);
  }, []);

  return content;
}

// Dispatch update event
export function dispatchCMSUpdate() {
  window.dispatchEvent(new Event('lowkey-cms-update'));
}

// Get single value
export function getContent(key: keyof SiteContent): string {
  return loadContent()[key];
}

// Get product images — checks Products DB cache first, then CMS
export function getProductImages(slug: string, fallbackImage: string): string[] {
  // 1. Check if useProducts cached data has images
  try {
    const productsCache = localStorage.getItem('lowkey-products-cache');
    if (productsCache) {
      const products = JSON.parse(productsCache);
      const found = products.find((p: any) => p.slug === slug);
      if (found) {
        const all: string[] = [];
        if (found.image) all.push(found.image);
        if (found.images) {
          const extras = typeof found.images === 'string' 
            ? found.images.split(',').map((u: string) => u.trim()).filter(Boolean)
            : found.images;
          extras.forEach((u: string) => { if (!all.includes(u)) all.push(u); });
        }
        if (all.length > 0) return all;
      }
    }
  } catch { /* ignore */ }

  // 2. Check CMS content
  const content = loadContent();
  const key = `product_images_${slug.replace(/-/g, '_')}` as keyof SiteContent;
  const raw = content[key];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      const urls = raw.split(',').map((u: string) => u.trim()).filter(Boolean);
      if (urls.length > 0) return urls;
    }
  }

  return [fallbackImage];
}
