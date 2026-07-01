// ============================================================================
// LOWKEY Admin — Activity Log
// ============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ActivityEntry {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, any>;
  createdAt: string;
}

export async function logActivity(action: string, entityType: string, entityId: string | null, details: Record<string, any> = {}) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('activity_log').insert({
      actor_email: user?.email || 'unknown',
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch (e) {
    // Activity logging must never block the actual operation
    console.warn('[ActivityLog] failed to record:', e);
  }
}

export async function getActivity(limit = 50): Promise<ActivityEntry[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    actorEmail: r.actor_email,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    details: r.details || {},
    createdAt: r.created_at,
  }));
}

// Human-readable label for an activity action
export function describeActivity(a: ActivityEntry): string {
  const who = a.actorEmail.split('@')[0];
  switch (a.action) {
    case 'order.status_changed':
      return `${who} changed order ${a.entityId} to "${a.details.to}"`;
    case 'order.deleted':
      return `${who} deleted order ${a.entityId}`;
    case 'order.bulk_status_changed':
      return `${who} updated ${a.details.count} orders to "${a.details.to}"`;
    case 'inventory.adjusted':
      return `${who} adjusted stock for ${a.details.product} (${a.details.size}): ${a.details.from} → ${a.details.to}`;
    case 'product.created':
      return `${who} created product "${a.details.name}"`;
    case 'product.updated':
      return `${who} updated product "${a.details.name}"`;
    case 'product.deleted':
      return `${who} deleted product "${a.details.name}"`;
    case 'discount.created':
      return `${who} created discount code "${a.entityId}"`;
    case 'discount.deleted':
      return `${who} deleted discount code "${a.entityId}"`;
    case 'review.featured':
      return `${who} ${a.details.featured ? 'featured' : 'unfeatured'} a review`;
    case 'review.deleted':
      return `${who} deleted a review`;
    case 'collection.created':
      return `${who} created collection "${a.details.name}"`;
    case 'collection.status_changed':
      return `${who} set collection "${a.details.name}" to ${a.details.status}`;
    default:
      return `${who} performed ${a.action}`;
  }
}
