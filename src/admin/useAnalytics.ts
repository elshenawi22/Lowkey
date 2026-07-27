// ============================================================================
// LOWKEY Admin — Analytics Data Layer
// Real queries against Supabase with client-side aggregation
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Order } from '../lib/database.types';

export interface DayRevenue { day: string; revenue: number; orders: number; }
export interface ProductStat { name: string; orders: number; revenue: number; }
export interface Analytics {
  // Revenue
  todayRevenue: number;
  yesterdayRevenue: number;
  revenue7d: number;
  revenue30d: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  aov: number;               // Average Order Value
  // Orders
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  // Subscribers
  totalSubs: number;
  newSubsToday: number;
  newSubs7d: number;
  // Charts
  revenueByDay: DayRevenue[];
  // Products
  topProducts: ProductStat[];
  // Recent
  recentOrders: (Order & { createdAt?: string })[];
  loading: boolean;
  lastUpdated: Date | null;
}

const emptyAnalytics: Analytics = {
  todayRevenue: 0, yesterdayRevenue: 0, revenue7d: 0, revenue30d: 0,
  revenueThisMonth: 0, revenueThisYear: 0, aov: 0,
  totalOrders: 0, pendingOrders: 0, confirmedOrders: 0,
  shippedOrders: 0, deliveredOrders: 0, cancelledOrders: 0,
  totalSubs: 0, newSubsToday: 0, newSubs7d: 0,
  revenueByDay: [], topProducts: [], recentOrders: [],
  loading: false, lastUpdated: null,
};

function startOf(unit: 'day' | 'month' | 'year', offset = 0): Date {
  const d = new Date();
  if (unit === 'day') {
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
  } else if (unit === 'month') {
    d.setMonth(d.getMonth() + offset, 1);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setFullYear(d.getFullYear() + offset, 0, 1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

function dayLabel(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function useAnalytics() {
  const [data, setData] = useState<Analytics>(emptyAnalytics);

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setData(d => ({ ...d, loading: true }));

    try {
      // Fetch all data in parallel
      const [ordersRes, subsRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('subscribers').select('email, created_at').order('created_at', { ascending: false }),
      ]);

      const orders = (ordersRes.data || []) as (Order & { created_at?: string })[];
      const subs = subsRes.data || [];

      // ── Date boundaries ────────────────────────────────────────────────
      const todayStart = startOf('day');
      const yesterdayStart = startOf('day', -1);
      const d7 = startOf('day', -7);
      const d30 = startOf('day', -30);
      const monthStart = startOf('month');
      const yearStart = startOf('year');

      const paidStatuses = ['confirmed', 'processing', 'shipped', 'delivered'];

      const revenueOf = (os: typeof orders) =>
        os.filter(o => paidStatuses.includes(o.status)).reduce((s, o) => s + (Number(o.subtotal) || 0), 0);

      const since = (threshold: Date) =>
        orders.filter(o => new Date(o.created_at || '') >= threshold);

      const todayOrders = since(todayStart);
      const yesterdayOrders = orders.filter(o => {
        const d = new Date(o.created_at || '');
        return d >= yesterdayStart && d < todayStart;
      });

      // ── Revenue ────────────────────────────────────────────────────────
      const todayRevenue = revenueOf(todayOrders);
      const yesterdayRevenue = revenueOf(yesterdayOrders);
      const revenue7d = revenueOf(since(d7));
      const revenue30d = revenueOf(since(d30));
      const revenueThisMonth = revenueOf(since(monthStart));
      const revenueThisYear = revenueOf(since(yearStart));

      const paidOrders = orders.filter(o => paidStatuses.includes(o.status));
      const aov = paidOrders.length > 0
        ? Math.round(paidOrders.reduce((s, o) => s + (Number(o.subtotal) || 0), 0) / paidOrders.length)
        : 0;

      // ── Order counts ───────────────────────────────────────────────────
      const countByStatus = (s: string) => orders.filter(o => o.status === s).length;

      // ── Subscribers ────────────────────────────────────────────────────
      const subsSince = (d: Date) => subs.filter((s: any) => new Date(s.created_at) >= d).length;

      // ── Revenue by day (last 30 days) ──────────────────────────────────
      const byDay = new Map<string, { revenue: number; orders: number }>();
      for (let i = 29; i >= 0; i--) {
        const d = startOf('day', -i);
        byDay.set(dayLabel(d), { revenue: 0, orders: 0 });
      }
      orders.forEach(o => {
        const day = (o.created_at || '').split('T')[0];
        if (byDay.has(day) && paidStatuses.includes(o.status)) {
          const entry = byDay.get(day)!;
          entry.revenue += Number(o.subtotal) || 0;
          entry.orders += 1;
        }
      });
      const revenueByDay: DayRevenue[] = Array.from(byDay.entries()).map(([day, v]) => ({
        day, ...v
      }));

      // ── Top products ───────────────────────────────────────────────────
      const productMap = new Map<string, { orders: number; revenue: number }>();
      orders.filter(o => paidStatuses.includes(o.status)).forEach(o => {
        (o.items || []).forEach((item: any) => {
          const name = item.name || 'Unknown';
          const entry = productMap.get(name) || { orders: 0, revenue: 0 };
          entry.orders += item.qty || 1;
          entry.revenue += (item.price || 0) * (item.qty || 1);
          productMap.set(name, entry);
        });
      });
      const topProducts: ProductStat[] = Array.from(productMap.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setData({
        todayRevenue, yesterdayRevenue, revenue7d, revenue30d,
        revenueThisMonth, revenueThisYear, aov,
        totalOrders: orders.length,
        pendingOrders: countByStatus('pending'),
        confirmedOrders: countByStatus('confirmed'),
        shippedOrders: countByStatus('shipped'),
        deliveredOrders: countByStatus('delivered'),
        cancelledOrders: countByStatus('cancelled'),
        totalSubs: subs.length,
        newSubsToday: subsSince(todayStart),
        newSubs7d: subsSince(d7),
        revenueByDay,
        topProducts,
        recentOrders: orders.slice(0, 10) as any,
        loading: false,
        lastUpdated: new Date(),
      });
    } catch (err) {
      console.error('[Admin Analytics]', err);
      setData(d => ({ ...d, loading: false }));
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...data, refetch: fetch };
}
