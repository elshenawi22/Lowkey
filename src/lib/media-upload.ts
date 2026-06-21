// ============================================================================
// LOWKEY — Media Upload
// Supports images + videos → Supabase Storage
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabase';

export interface UploadedMedia {
  url: string;
  name: string;
  size: number;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

export async function uploadImage(file: File): Promise<UploadedMedia | null> {
  const isVideo = isVideoFile(file);
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  // Size check
  if (file.size > maxSize) {
    alert(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: ${maxSize / 1024 / 1024}MB`);
    return null;
  }

  if (!isSupabaseConfigured || !supabase) {
    return { url: URL.createObjectURL(file), name: file.name, size: file.size };
  }

  const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
  const name = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const path = `uploads/${name}`;

  // Upload to Supabase Storage with correct content type
  try {
    const { error: uploadErr } = await supabase.storage.from('media').upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    });

    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // Save to media table
      try {
        await supabase.from('media').insert({
          name: file.name,
          url: publicUrl,
          size_bytes: file.size,
        });
      } catch { /* ignore */ }

      return { url: publicUrl, name: file.name, size: file.size };
    }

    console.error('[Upload] Storage failed:', uploadErr.message);
    alert(`Upload failed: ${uploadErr.message}\n\nMake sure the "media" bucket exists in Supabase Storage and is set to Public.`);
    return null;
  } catch (e: any) {
    console.error('[Upload] Exception:', e);
    alert(`Upload error: ${e?.message || 'Unknown error'}`);
    return null;
  }
}

export async function getMediaList(): Promise<UploadedMedia[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data } = await supabase.from('media').select('*').order('created_at', { ascending: false });
  return (data || []).map((r: any) => ({ url: r.url, name: r.name, size: r.size_bytes || 0 }));
}

export async function deleteMedia(url: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  await supabase.from('media').delete().eq('url', url);
  if (url.includes('supabase') && url.includes('/uploads/')) {
    const path = 'uploads/' + url.split('/uploads/').pop();
    try { await supabase.storage.from('media').remove([path]); } catch { /* */ }
  }
  return true;
}
