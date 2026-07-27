// ============================================================================
// LOWKEY Admin — Phase 3: Full Analytics Suite
// All tabs are powered by the existing useAnalytics hook + raw order data.
// No new DB tables required — all computed client-side from orders.
// ============================================================================

import { useMemo, useState, type ReactNode } from 'react';
import { ADM, fmtEGP } from './ui';
import type { Analytics, DayRevenue, ProductStat } from './useAnalytics';
import type { Order } from '../lib/database.types';
import { products as catalogProducts, archives } from '../data/catalog';

// ── Shared primitives ────────────────────────────────────────────────────────

const S = { ...ADM }; // alias

function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: S.surface, border: `1px solid ${S.border}`,
      borderRadius: 10, padding: 20, ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 9, color: S.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>{children}</p>;
}

function Big({ children, color = S.text }: { children: ReactNode; color?: string }) {
  return <p style={{ fontSize: 26, fontWeight: 200, color, lineHeight: 1.1 }}>{children}</p>;
}

function Row({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...style }}>{children}</div>;
}

function Grid({ children, cols = 4 }: { children: ReactNode; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${cols === 2 ? 260 : 180}px, 1fr))`, gap: 12 }}>
      {children}
    </div>
  );
}

function Pct({ value, max, color = S.accent }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 3, background: S.border, borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function Chip({ children, color = S.muted }: { children: ReactNode; color?: string }) {
  return (
    <span style={{ fontSize: 9, color, background: color + '18', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {children}
    </span>
  );
}

// Mini SVG sparkline
function Sparkline({ data, color = '#ffffff', h = 32 }: { data: number[]; color?: string; h?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 80;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
    </svg>
  );
}

// Mini bar chart (SVG, no lib dependency)
function BarChart({ data, color = '#ffffff55', accentColor = '#ffffff' }: {
  data: { label: string; value: number }[];
  color?: string; accentColor?: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 480; const H = 100; const barW = Math.max(4, W / data.length - 3);
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: H + 20 }}>
      {data.map((d, i) => {
        const bh = Math.max(2, (d.value / max) * H);
        const x = i * (W / data.length);
        const isMax = d.value === max;
        return (
          <g key={i}>
            <rect x={x} y={H - bh} width={barW} height={bh}
              fill={isMax ? accentColor : color} rx={2} />
            {data.length <= 12 && (
              <text x={x + barW / 2} y={H + 14} textAnchor="middle"
                fontSize={7} fill={ADM.dim}>{d.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function startOf(unit: 'day' | 'month' | 'year', offset = 0): Date {
  const d = new Date();
  if (unit === 'day') { d.setDate(d.getDate() + offset); d.setHours(0, 0, 0, 0); }
  else if (unit === 'month') { d.setMonth(d.getMonth() + offset, 1); d.setHours(0, 0, 0, 0); }
  else { d.setFullYear(d.getFullYear() + offset, 0, 1); d.setHours(0, 0, 0, 0); }
  return d;
}

const PAID = ['confirmed', 'processing', 'shipped', 'delivered'];

type RawOrder = Order & { created_at?: string; createdAt?: string };

function orderDate(o: RawOrder): Date {
  return new Date(o.created_at || o.createdAt || '');
}

// ============================================================================
// TAB 1 — Analytics Dashboard (enhanced version of existing)
// ============================================================================
export function AnalyticsDashboardTab({ a, orders }: { a: Analytics; orders: RawOrder[] }) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const cutoff = startOf('day', -days);
  const prevCutoff = startOf('day', -days * 2);

  const periodOrders = useMemo(
    () => orders.filter(o => PAID.includes(o.status) && orderDate(o) >= cutoff),
    [orders, cutoff]
  );
  const prevOrders = useMemo(
    () => orders.filter(o => PAID.includes(o.status) && orderDate(o) >= prevCutoff && orderDate(o) < cutoff),
    [orders, cutoff, prevCutoff]
  );

  const revenue = periodOrders.reduce((s, o) => s + Number(o.subtotal), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.subtotal), 0);
  const revDelta = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;

  const aov = periodOrders.length > 0 ? Math.round(revenue / periodOrders.length) : 0;
  const prevAov = prevOrders.length > 0
    ? Math.round(prevOrders.reduce((s, o) => s + Number(o.subtotal), 0) / prevOrders.length)
    : 0;

  // Revenue by day for sparkline
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = startOf('day', -i);
      map.set(d.toISOString().split('T')[0], 0);
    }
    periodOrders.forEach(o => {
      const day = (o.created_at || o.createdAt || '').split('T')[0];
      if (map.has(day)) map.set(day, (map.get(day) || 0) + Number(o.subtotal));
    });
    return Array.from(map.values());
  }, [periodOrders, days]);

  const cancelledRate = orders.length > 0
    ? Math.round((orders.filter(o => o.status === 'cancelled').length / orders.length) * 100)
    : 0;

  const bestDay = useMemo(() => {
    const map = new Map<string, number>();
    orders.filter(o => PAID.includes(o.status)).forEach(o => {
      const day = new Date(o.created_at || o.createdAt || '').toLocaleDateString('en-EG', { weekday: 'short' });
      map.set(day, (map.get(day) || 0) + Number(o.subtotal));
    });
    let best = { day: '—', revenue: 0 };
    map.forEach((rev, day) => { if (rev > best.revenue) best = { day, revenue: rev }; });
    return best;
  }, [orders]);

  const delta = (cur: number, prev: number) => {
    if (prev === 0) return null;
    const pct = Math.round(((cur - prev) / prev) * 100);
    return { pct, up: pct >= 0 };
  };

  const statCards = [
    {
      label: `Revenue (${period})`, value: fmtEGP(revenue),
      sub: revDelta !== null ? `${revDelta >= 0 ? '+' : ''}${revDelta}% vs prior period` : undefined,
      spark: byDay, color: revDelta !== null && revDelta >= 0 ? S.green : S.red,
    },
    {
      label: 'Paid Orders', value: String(periodOrders.length),
      sub: delta(periodOrders.length, prevOrders.length),
    },
    {
      label: 'AOV', value: fmtEGP(aov),
      sub: delta(aov, prevAov),
    },
    {
      label: 'Total Customers', value: String(new Set(orders.map(o => o.customerPhone)).size),
    },
    { label: 'Cancellation Rate', value: `${cancelledRate}%`, color: cancelledRate > 15 ? S.red : S.text },
    { label: 'Best Day of Week', value: bestDay.day, sub: fmtEGP(bestDay.revenue) },
    { label: 'Total Revenue (all time)', value: fmtEGP(a.revenueThisYear) },
    { label: 'Pending Now', value: String(a.pendingOrders), color: a.pendingOrders > 10 ? S.amber : S.text },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Period selector */}
      <Row style={{ justifyContent: 'flex-end' }}>
        {(['7d', '30d', '90d'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            background: period === p ? S.accent : 'transparent',
            color: period === p ? '#000' : S.muted,
            border: `1px solid ${period === p ? S.accent : S.border}`,
            borderRadius: 5, padding: '4px 10px', fontSize: 10, cursor: 'pointer',
            letterSpacing: '0.1em',
          }}>{p}</button>
        ))}
      </Row>

      {/* Stat cards */}
      <Grid>
        {statCards.map(s => (
          <Card key={s.label}>
            <Label>{s.label}</Label>
            <Big color={s.color}>{s.value}</Big>
            {s.spark && (
              <div style={{ marginTop: 8 }}>
                <Sparkline data={s.spark} color={typeof s.color === 'string' ? s.color : S.muted} />
              </div>
            )}
            {s.sub && typeof s.sub === 'string' && (
              <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>{s.sub}</p>
            )}
            {s.sub && typeof s.sub === 'object' && (
              <p style={{ fontSize: 9, color: (s.sub as { up: boolean }).up ? S.green : S.red, marginTop: 4 }}>
                {(s.sub as { pct: number; up: boolean }).up ? '+' : ''}{(s.sub as { pct: number }).pct}% vs prior period
              </p>
            )}
          </Card>
        ))}
      </Grid>

      {/* Revenue chart */}
      <Card>
        <Label>Daily Revenue — Last {days} days</Label>
        <BarChart
          data={a.revenueByDay.slice(-days).map(d => ({
            label: d.day.slice(5),
            value: d.revenue,
          }))}
          color={S.border2}
          accentColor={S.accent}
        />
      </Card>

      {/* Order status breakdown */}
      <Card>
        <Label>Order Status Breakdown</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {[
            { label: 'Delivered', count: a.deliveredOrders, color: S.green },
            { label: 'Shipped', count: a.shippedOrders, color: S.blue },
            { label: 'Processing', count: a.confirmedOrders, color: S.amber },
            { label: 'Pending', count: a.pendingOrders, color: S.muted },
            { label: 'Cancelled', count: a.cancelledOrders, color: S.red },
          ].map(s => (
            <div key={s.label}>
              <Row style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: S.text }}>{s.label}</span>
                <span style={{ fontSize: 11, color: s.color }}>{s.count}</span>
              </Row>
              <Pct value={s.count} max={a.totalOrders} color={s.color} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// TAB 2 — Conversion Funnel
// ============================================================================
export function ConversionFunnelTab({ orders }: { orders: RawOrder[] }) {
  // In a headless setup without analytics.js events, we approximate the funnel
  // from order status transitions: all orders attempted → paid → delivered
  const total = orders.length;
  const attempted = total; // every order = an intent to purchase
  const paid = orders.filter(o => PAID.includes(o.status)).length;
  const shipped = orders.filter(o => ['shipped', 'delivered'].includes(o.status)).length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const cancelled = orders.filter(o => o.status === 'cancelled').length;

  const steps = [
    { label: 'Order Placed', count: attempted, pct: 100, color: S.text },
    { label: 'Confirmed & Paid', count: paid, pct: attempted > 0 ? Math.round((paid / attempted) * 100) : 0, color: S.blue },
    { label: 'Shipped', count: shipped, pct: attempted > 0 ? Math.round((shipped / attempted) * 100) : 0, color: S.amber },
    { label: 'Delivered', count: delivered, pct: attempted > 0 ? Math.round((delivered / attempted) * 100) : 0, color: S.green },
  ];

  const dropRate = attempted > 0 ? Math.round((cancelled / attempted) * 100) : 0;

  // AOV by step
  const aovPaid = paid > 0
    ? Math.round(orders.filter(o => PAID.includes(o.status)).reduce((s, o) => s + Number(o.subtotal), 0) / paid)
    : 0;

  // Best converting day of week
  const dayMap = new Map<string, { orders: number; paid: number }>();
  orders.forEach(o => {
    const day = orderDate(o).toLocaleDateString('en-EG', { weekday: 'long' });
    const entry = dayMap.get(day) || { orders: 0, paid: 0 };
    entry.orders++;
    if (PAID.includes(o.status)) entry.paid++;
    dayMap.set(day, entry);
  });
  const bestConvertDay = Array.from(dayMap.entries())
    .map(([day, v]) => ({ day, rate: v.orders > 0 ? Math.round((v.paid / v.orders) * 100) : 0 }))
    .sort((a, b) => b.rate - a.rate)[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Grid>
        <Card>
          <Label>Conversion Rate</Label>
          <Big color={paid / attempted > 0.7 ? S.green : S.amber}>
            {attempted > 0 ? Math.round((paid / attempted) * 100) : 0}%
          </Big>
          <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>Orders confirmed / total placed</p>
        </Card>
        <Card>
          <Label>Cancellation Rate</Label>
          <Big color={dropRate > 20 ? S.red : S.text}>{dropRate}%</Big>
          <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>{cancelled} cancelled orders</p>
        </Card>
        <Card>
          <Label>Delivery Rate</Label>
          <Big color={S.green}>{attempted > 0 ? Math.round((delivered / attempted) * 100) : 0}%</Big>
          <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>{delivered} delivered</p>
        </Card>
        <Card>
          <Label>Best Converting Day</Label>
          <Big>{bestConvertDay?.day.slice(0, 3) || '—'}</Big>
          <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>{bestConvertDay?.rate}% conversion rate</p>
        </Card>
      </Grid>

      {/* Funnel visual */}
      <Card>
        <Label>Order Pipeline Funnel</Label>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {steps.map((step, i) => (
            <div key={step.label}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <Row style={{ gap: 8 }}>
                  <span style={{ fontSize: 10, color: S.dim }}>{i + 1}</span>
                  <span style={{ fontSize: 12, color: S.text }}>{step.label}</span>
                </Row>
                <Row style={{ gap: 12 }}>
                  <span style={{ fontSize: 11, color: step.color, fontWeight: 300 }}>{step.count.toLocaleString()}</span>
                  <span style={{ fontSize: 10, color: step.color, minWidth: 36, textAlign: 'right' }}>{step.pct}%</span>
                </Row>
              </Row>
              {/* Bar that narrows at each step */}
              <div style={{ height: 28, background: S.border, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${step.pct}%`, height: '100%',
                  background: step.color + '28',
                  borderLeft: `2px solid ${step.color}`,
                  transition: 'width 0.8s ease',
                }} />
              </div>
              {i < steps.length - 1 && (
                <p style={{ fontSize: 9, color: S.dim, marginTop: 3 }}>
                  ↓ {steps[i + 1].pct > 0 ? `${Math.round((steps[i + 1].count / Math.max(step.count, 1)) * 100)}% pass through` : 'No data'}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Conversion by day of week */}
      <Card>
        <Label>Conversion by Day of Week</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {Array.from(dayMap.entries())
            .map(([day, v]) => ({ day, rate: v.orders > 0 ? Math.round((v.paid / v.orders) * 100) : 0, orders: v.orders }))
            .sort((a, b) => b.rate - a.rate)
            .map(d => (
              <div key={d.day}>
                <Row style={{ justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: S.text }}>{d.day}</span>
                  <Row style={{ gap: 12 }}>
                    <span style={{ fontSize: 10, color: S.muted }}>{d.orders} orders</span>
                    <span style={{ fontSize: 11, color: d.rate >= 80 ? S.green : d.rate >= 60 ? S.amber : S.red }}>{d.rate}%</span>
                  </Row>
                </Row>
                <Pct value={d.rate} max={100} color={d.rate >= 80 ? S.green : d.rate >= 60 ? S.amber : S.muted} />
              </div>
            ))}
        </div>
      </Card>

      <Card>
        <Label>Average Order Value (Paid Orders)</Label>
        <Big>{fmtEGP(aovPaid)}</Big>
      </Card>
    </div>
  );
}

// ============================================================================
// TAB 3 — Customer Lifetime Value
// ============================================================================
export function CLVTab({ orders }: { orders: RawOrder[] }) {
  const [sort, setSort] = useState<'clv' | 'orders' | 'aov'>('clv');

  // Build per-customer CLV
  const customerData = useMemo(() => {
    const map = new Map<string, {
      name: string; phone: string; email: string;
      orders: RawOrder[]; clv: number; aov: number;
      firstOrder: Date | null; lastOrder: Date | null;
    }>();

    orders.filter(o => PAID.includes(o.status)).forEach(o => {
      const key = o.customerPhone;
      if (!map.has(key)) {
        map.set(key, { name: o.customerName, phone: key, email: o.customerEmail, orders: [], clv: 0, aov: 0, firstOrder: null, lastOrder: null });
      }
      const c = map.get(key)!;
      c.orders.push(o);
      c.clv += Number(o.subtotal);
      const d = orderDate(o);
      if (!c.firstOrder || d < c.firstOrder) c.firstOrder = d;
      if (!c.lastOrder || d > c.lastOrder) c.lastOrder = d;
    });

    return Array.from(map.values()).map(c => ({
      ...c,
      aov: c.orders.length > 0 ? Math.round(c.clv / c.orders.length) : 0,
    }));
  }, [orders]);

  const sorted = [...customerData].sort((a, b) =>
    sort === 'clv' ? b.clv - a.clv :
    sort === 'orders' ? b.orders.length - a.orders.length :
    b.aov - a.aov
  );

  const totalCLV = customerData.reduce((s, c) => s + c.clv, 0);
  const avgCLV = customerData.length > 0 ? Math.round(totalCLV / customerData.length) : 0;
  const medianCLV = (() => {
    const vals = customerData.map(c => c.clv).sort((a, b) => a - b);
    const m = Math.floor(vals.length / 2);
    return vals.length % 2 === 0 ? Math.round((vals[m - 1] + vals[m]) / 2) : vals[m] || 0;
  })();

  // Top 20% revenue concentration (Pareto)
  const sortedByClv = [...customerData].sort((a, b) => b.clv - a.clv);
  const top20Count = Math.max(1, Math.ceil(customerData.length * 0.2));
  const top20Revenue = sortedByClv.slice(0, top20Count).reduce((s, c) => s + c.clv, 0);
  const top20Pct = totalCLV > 0 ? Math.round((top20Revenue / totalCLV) * 100) : 0;

  // CLV histogram (buckets)
  const buckets = [
    { label: '< 1k', min: 0, max: 1000 },
    { label: '1–3k', min: 1000, max: 3000 },
    { label: '3–5k', min: 3000, max: 5000 },
    { label: '5–10k', min: 5000, max: 10000 },
    { label: '10k+', min: 10000, max: Infinity },
  ];
  const histData = buckets.map(b => ({
    label: b.label,
    value: customerData.filter(c => c.clv >= b.min && c.clv < b.max).length,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Grid>
        <Card>
          <Label>Average CLV</Label>
          <Big>{fmtEGP(avgCLV)}</Big>
          <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>Per paying customer</p>
        </Card>
        <Card>
          <Label>Median CLV</Label>
          <Big>{fmtEGP(medianCLV)}</Big>
          <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>50th percentile</p>
        </Card>
        <Card>
          <Label>Pareto (Top 20%)</Label>
          <Big color={S.amber}>{top20Pct}%</Big>
          <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>of revenue from {top20Count} customers</p>
        </Card>
        <Card>
          <Label>Total Customers</Label>
          <Big>{customerData.length}</Big>
        </Card>
      </Grid>

      {/* CLV Histogram */}
      <Card>
        <Label>CLV Distribution</Label>
        <BarChart data={histData} color={S.border2} accentColor={S.accent} />
      </Card>

      {/* Customer CLV table */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Label>Top Customers by Lifetime Value</Label>
          <Row style={{ gap: 6 }}>
            {(['clv', 'orders', 'aov'] as const).map(s => (
              <button key={s} onClick={() => setSort(s)} style={{
                background: sort === s ? S.accent : 'transparent',
                color: sort === s ? '#000' : S.muted,
                border: `1px solid ${sort === s ? S.accent : S.border}`,
                borderRadius: 4, padding: '3px 8px', fontSize: 9, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>{s.toUpperCase()}</button>
            ))}
          </Row>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.slice(0, 20).map((c, i) => {
            const daysSinceFirst = c.firstOrder
              ? Math.max(1, Math.round((Date.now() - c.firstOrder.getTime()) / 86400000))
              : 1;
            const monthlyValue = Math.round((c.clv / daysSinceFirst) * 30);
            return (
              <div key={c.phone} style={{
                background: i === 0 ? S.accent + '06' : 'transparent',
                border: `1px solid ${i === 0 ? S.border2 : S.border}`,
                borderRadius: 8, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 10, color: S.dim, width: 20, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: S.text, marginBottom: 2 }}>{c.name}</p>
                  <p style={{ fontSize: 9, color: S.muted }}>{c.phone}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 14, color: i < 3 ? S.amber : S.text, fontWeight: 200 }}>{fmtEGP(c.clv)}</p>
                  <p style={{ fontSize: 9, color: S.muted }}>{c.orders.length} orders · EGP {fmtEGP(c.aov).replace('EGP ', '')} AOV</p>
                  <p style={{ fontSize: 8, color: S.dim }}>~{fmtEGP(monthlyValue)}/mo</p>
                </div>
                {i < 3 && <Chip color={S.amber}>VIP</Chip>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// TAB 4 — Returning Customers
// ============================================================================
export function ReturningCustomersTab({ orders }: { orders: RawOrder[] }) {
  const paid = orders.filter(o => PAID.includes(o.status));

  const customerOrderCount = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number; lastOrder: Date | null }>();
    paid.forEach(o => {
      const key = o.customerPhone;
      const entry = map.get(key) || { name: o.customerName, count: 0, revenue: 0, lastOrder: null };
      entry.count++;
      entry.revenue += Number(o.subtotal);
      const d = orderDate(o);
      if (!entry.lastOrder || d > entry.lastOrder) entry.lastOrder = d;
      map.set(key, entry);
    });
    return map;
  }, [paid]);

  const newCustomers = Array.from(customerOrderCount.values()).filter(c => c.count === 1).length;
  const returning = Array.from(customerOrderCount.values()).filter(c => c.count >= 2).length;
  const total = customerOrderCount.size;
  const returnRate = total > 0 ? Math.round((returning / total) * 100) : 0;

  // Revenue split
  const returningRevenue = Array.from(customerOrderCount.values())
    .filter(c => c.count >= 2)
    .reduce((s, c) => s + c.revenue, 0);
  const totalRevenue = paid.reduce((s, o) => s + Number(o.subtotal), 0);
  const returningRevPct = totalRevenue > 0 ? Math.round((returningRevenue / totalRevenue) * 100) : 0;

  // Cohort: customers by first order month
  const cohortMap = new Map<string, { new: number; returning: number }>();
  Array.from(customerOrderCount.entries()).forEach(([, c]) => {
    // Find first order
    const customerOrders = paid.filter(o => o.customerPhone === Array.from(customerOrderCount.keys()).find(k => customerOrderCount.get(k) === c));
    const first = customerOrders.sort((a, b) => orderDate(a).getTime() - orderDate(b).getTime())[0];
    if (!first) return;
    const month = orderDate(first).toLocaleDateString('en-EG', { month: 'short', year: '2-digit' });
    const entry = cohortMap.get(month) || { new: 0, returning: 0 };
    if (c.count === 1) entry.new++;
    else entry.returning++;
    cohortMap.set(month, entry);
  });

  // Frequency distribution
  const freq = new Map<number, number>();
  Array.from(customerOrderCount.values()).forEach(c => {
    freq.set(c.count, (freq.get(c.count) || 0) + 1);
  });
  const freqData = Array.from(freq.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(0, 8)
    .map(([count, customers]) => ({ label: `${count}x`, value: customers }));

  const avgDaysBetween = useMemo(() => {
    let totalGaps = 0; let gapCount = 0;
    Array.from(customerOrderCount.keys()).forEach(phone => {
      const cOrders = paid
        .filter(o => o.customerPhone === phone)
        .sort((a, b) => orderDate(a).getTime() - orderDate(b).getTime());
      for (let i = 1; i < cOrders.length; i++) {
        const gap = (orderDate(cOrders[i]).getTime() - orderDate(cOrders[i - 1]).getTime()) / 86400000;
        totalGaps += gap;
        gapCount++;
      }
    });
    return gapCount > 0 ? Math.round(totalGaps / gapCount) : 0;
  }, [paid, customerOrderCount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Grid>
        <Card>
          <Label>Return Rate</Label>
          <Big color={returnRate >= 30 ? S.green : returnRate >= 15 ? S.amber : S.red}>{returnRate}%</Big>
          <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>{returning} of {total} customers returned</p>
          <Pct value={returnRate} max={100} color={returnRate >= 30 ? S.green : S.amber} />
        </Card>
        <Card>
          <Label>New Customers</Label>
          <Big>{newCustomers}</Big>
          <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>{total > 0 ? Math.round((newCustomers / total) * 100) : 0}% of base</p>
        </Card>
        <Card>
          <Label>Returning Revenue</Label>
          <Big color={S.green}>{returningRevPct}%</Big>
          <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>{fmtEGP(returningRevenue)} from repeat buyers</p>
        </Card>
        <Card>
          <Label>Avg Days Between Orders</Label>
          <Big>{avgDaysBetween > 0 ? `${avgDaysBetween}d` : '—'}</Big>
          <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>For repeat customers</p>
        </Card>
      </Grid>

      {/* Purchase frequency distribution */}
      <Card>
        <Label>Purchase Frequency Distribution</Label>
        <BarChart data={freqData} color={S.border2} accentColor={S.green} />
        <p style={{ fontSize: 9, color: S.dim, marginTop: 8 }}>X = number of orders per customer</p>
      </Card>

      {/* Top returning customers */}
      <Card>
        <Label>Most Loyal Customers</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {Array.from(customerOrderCount.entries())
            .filter(([, c]) => c.count >= 2)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([phone, c], i) => (
              <div key={phone} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: S.border + '33', borderRadius: 8,
              }}>
                <div>
                  <p style={{ fontSize: 12, color: S.text }}>{c.name}</p>
                  <p style={{ fontSize: 9, color: S.muted }}>{phone}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, color: S.green, fontWeight: 200 }}>{c.count} orders</p>
                  <p style={{ fontSize: 9, color: S.muted }}>{fmtEGP(c.revenue)} total</p>
                  {c.lastOrder && (
                    <p style={{ fontSize: 8, color: S.dim }}>
                      Last: {c.lastOrder.toLocaleDateString('en-EG', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
                {i === 0 && <Chip color={S.green}>Most Loyal</Chip>}
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// TAB 5 — Heatmaps (Integration Placeholder)
// ============================================================================
export function HeatmapsTab() {
  const [provider, setProvider] = useState<'hotjar' | 'clarity' | 'posthog' | null>(null);

  const providers = [
    {
      id: 'hotjar' as const,
      name: 'Hotjar',
      description: 'Session recordings, heatmaps, and conversion funnels.',
      embed: (id: string) => `<script>(function(h,o,t,j,a,r){ h.hj=h.hj||function(){...}; ... })(window,document,'https://static.hotjar.com/c/hotjar-${id}.js',...)</script>`,
      docsUrl: 'https://help.hotjar.com/hc/en-us/articles/115009336727',
    },
    {
      id: 'clarity' as const,
      name: 'Microsoft Clarity',
      description: 'Free heatmaps & session recordings from Microsoft.',
      embed: (id: string) => `<script type="text/javascript">(function(c,l,a,r,i,t,y){ c[a]=c[a]||function(){...}; ... })(window, document, "clarity", "script", "${id}")</script>`,
      docsUrl: 'https://clarity.microsoft.com/setup',
    },
    {
      id: 'posthog' as const,
      name: 'PostHog',
      description: 'Open-source analytics, heatmaps, and feature flags.',
      embed: (id: string) => `posthog.init('${id}', { api_host: 'https://app.posthog.com' })`,
      docsUrl: 'https://posthog.com/docs/getting-started/install',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        background: S.amber + '10', border: `1px solid ${S.amber}30`,
        borderRadius: 10, padding: 16,
      }}>
        <p style={{ fontSize: 10, color: S.amber, letterSpacing: '0.05em', marginBottom: 4 }}>Integration Placeholder</p>
        <p style={{ fontSize: 12, color: S.muted, lineHeight: 1.6 }}>
          Heatmaps require a third-party SDK injected into your storefront's{' '}
          <code style={{ color: S.text, background: S.border, padding: '1px 4px', borderRadius: 3 }}>&lt;head&gt;</code>.
          Choose a provider below and paste the generated snippet into <code style={{ color: S.text, background: S.border, padding: '1px 4px', borderRadius: 3 }}>index.html</code>.
        </p>
      </div>

      {/* Provider cards */}
      <Grid cols={2}>
        {providers.map(p => (
          <div
            key={p.id}
            onClick={() => setProvider(provider === p.id ? null : p.id)}
            style={{
              background: provider === p.id ? S.accent + '08' : S.surface,
              border: `1px solid ${provider === p.id ? S.accent + '40' : S.border}`,
              borderRadius: 10, padding: 20, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: S.text }}>{p.name}</p>
              {p.id === 'clarity' && <Chip color={S.green}>Free</Chip>}
              {p.id === 'posthog' && <Chip color={S.blue}>Open Source</Chip>}
            </Row>
            <p style={{ fontSize: 11, color: S.muted, lineHeight: 1.6 }}>{p.description}</p>
          </div>
        ))}
      </Grid>

      {/* Snippet preview for selected provider */}
      {provider && (() => {
        const p = providers.find(x => x.id === provider)!;
        const exampleId = provider === 'hotjar' ? '1234567' : provider === 'clarity' ? 'abcde12345' : 'phc_xxxxxxxx';
        return (
          <Card>
            <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <Label>{p.name} Setup</Label>
              <a href={p.docsUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 9, color: S.blue, textDecoration: 'none', letterSpacing: '0.05em' }}>
                View Docs →
              </a>
            </Row>
            <p style={{ fontSize: 11, color: S.muted, marginBottom: 12, lineHeight: 1.6 }}>
              1. Create an account at <strong style={{ color: S.text }}>{p.name}</strong> and get your project ID.<br />
              2. Paste the snippet below into <code style={{ color: S.accent }}>index.html</code> inside <code style={{ color: S.accent }}>&lt;head&gt;</code>.<br />
              3. Replace <code style={{ color: S.amber }}>{exampleId}</code> with your real project ID.
            </p>
            <div style={{
              background: '#080808', border: `1px solid ${S.border}`, borderRadius: 6,
              padding: 14, fontFamily: 'monospace', fontSize: 10, color: S.muted,
              overflowX: 'auto', lineHeight: 1.7,
            }}>
              {p.embed(exampleId)}
            </div>
            <p style={{ fontSize: 9, color: S.dim, marginTop: 12 }}>
              Note: heatmaps only work in production. Data appears 24–48 hours after first sessions.
            </p>
          </Card>
        );
      })()}

      {/* Pageview stats placeholder */}
      <Card>
        <Label>Pageview Data</Label>
        <p style={{ fontSize: 12, color: S.muted, lineHeight: 1.8 }}>
          Once a provider is connected, click maps, scroll depth, and rage-click reports will appear here
          via an embedded iframe. This panel is ready to host the dashboard.
        </p>
        <div style={{
          marginTop: 16, height: 200, background: S.border + '30',
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px dashed ${S.border}`,
        }}>
          <p style={{ fontSize: 10, color: S.dim }}>Heatmap dashboard iframe renders here after integration</p>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// TAB 6 — Sales Analytics
// ============================================================================
export function SalesAnalyticsTab({ a, orders }: { a: Analytics; orders: RawOrder[] }) {
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');

  const paid = orders.filter(o => PAID.includes(o.status));

  // Weekly aggregation
  const weeklyData = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    paid.forEach(o => {
      const d = orderDate(o);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      const entry = map.get(key) || { revenue: 0, orders: 0 };
      entry.revenue += Number(o.subtotal);
      entry.orders++;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([week, v]) => ({ label: week.slice(5), ...v }));
  }, [paid]);

  // Monthly aggregation
  const monthlyData = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    paid.forEach(o => {
      const key = (o.created_at || o.createdAt || '').slice(0, 7);
      const entry = map.get(key) || { revenue: 0, orders: 0 };
      entry.revenue += Number(o.subtotal);
      entry.orders++;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({
        label: new Date(month + '-01').toLocaleDateString('en-EG', { month: 'short', year: '2-digit' }),
        ...v,
      }));
  }, [paid]);

  const chartData = view === 'daily'
    ? a.revenueByDay.map(d => ({ label: d.day.slice(5), revenue: d.revenue, orders: d.orders }))
    : view === 'weekly'
    ? weeklyData
    : monthlyData;

  const barData = chartData.map(d => ({ label: d.label, value: metric === 'revenue' ? d.revenue : d.orders }));

  // Payment method breakdown (from order notes/metadata)
  const codOrders = orders.filter(o => !(o as any).paidOnline).length;
  const onlineOrders = orders.length - codOrders;

  // City breakdown
  const cityMap = new Map<string, { orders: number; revenue: number }>();
  paid.forEach(o => {
    const city = o.customerAddress?.split(',').pop()?.trim() || o.customerAddress || 'Other';
    const entry = cityMap.get(city) || { orders: 0, revenue: 0 };
    entry.orders++;
    entry.revenue += Number(o.subtotal);
    cityMap.set(city, entry);
  });
  const topCities = Array.from(cityMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  // Peak hour analysis
  const hourMap = new Map<number, number>();
  paid.forEach(o => {
    const h = orderDate(o).getHours();
    hourMap.set(h, (hourMap.get(h) || 0) + 1);
  });
  const peakHour = Array.from(hourMap.entries()).sort((a, b) => b[1] - a[1])[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary */}
      <Grid>
        {[
          { label: 'Total Revenue', value: fmtEGP(paid.reduce((s, o) => s + Number(o.subtotal), 0)) },
          { label: 'Paid Orders', value: paid.length },
          { label: 'Cash on Delivery', value: `${codOrders} orders` },
          { label: 'Peak Hour', value: peakHour ? `${peakHour[0]}:00` : '—', sub: peakHour ? `${peakHour[1]} orders` : undefined },
        ].map(s => (
          <Card key={s.label}>
            <Label>{s.label}</Label>
            <Big>{s.value}</Big>
            {s.sub && <p style={{ fontSize: 9, color: S.muted, marginTop: 4 }}>{s.sub}</p>}
          </Card>
        ))}
      </Grid>

      {/* Chart controls */}
      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <Label>Revenue & Orders Over Time</Label>
          <Row style={{ gap: 6 }}>
            {(['daily', 'weekly', 'monthly'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                background: view === v ? S.accent : 'transparent',
                color: view === v ? '#000' : S.muted,
                border: `1px solid ${view === v ? S.accent : S.border}`,
                borderRadius: 4, padding: '3px 8px', fontSize: 9, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>{v}</button>
            ))}
            <div style={{ width: 1, background: S.border }} />
            {(['revenue', 'orders'] as const).map(m => (
              <button key={m} onClick={() => setMetric(m)} style={{
                background: metric === m ? S.blue : 'transparent',
                color: metric === m ? '#fff' : S.muted,
                border: `1px solid ${metric === m ? S.blue : S.border}`,
                borderRadius: 4, padding: '3px 8px', fontSize: 9, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>{m}</button>
            ))}
          </Row>
        </Row>
        <BarChart data={barData} color={S.border2} accentColor={metric === 'revenue' ? S.accent : S.blue} />
      </Card>

      {/* City breakdown */}
      <Card>
        <Label>Revenue by City</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {topCities.map(([city, v]) => (
            <div key={city}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: S.text }}>{city}</span>
                <Row style={{ gap: 12 }}>
                  <span style={{ fontSize: 10, color: S.muted }}>{v.orders} orders</span>
                  <span style={{ fontSize: 11, color: S.text }}>{fmtEGP(v.revenue)}</span>
                </Row>
              </Row>
              <Pct value={v.revenue} max={topCities[0]?.[1].revenue || 1} color={S.accent + '60'} />
            </div>
          ))}
        </div>
      </Card>

      {/* Payment method */}
      <Card>
        <Label>Payment Methods</Label>
        <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
          {[
            { label: 'Cash on Delivery', count: codOrders, color: S.amber },
            { label: 'Online', count: onlineOrders, color: S.green },
          ].map(m => (
            <div key={m.label} style={{ flex: 1, background: S.border + '33', borderRadius: 8, padding: 16 }}>
              <Label>{m.label}</Label>
              <Big color={m.color}>{m.count}</Big>
              <Pct value={m.count} max={orders.length} color={m.color} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// TAB 7 — Top Products
// ============================================================================
export function TopProductsTab({ a, orders }: { a: Analytics; orders: RawOrder[] }) {
  const [sort, setSort] = useState<'revenue' | 'units' | 'orders'>('revenue');

  const paid = orders.filter(o => PAID.includes(o.status));

  const productStats = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; units: number; orders: number; revenue: number; sizes: Map<string, number> }>();
    paid.forEach(o => {
      o.items.forEach((item: any) => {
        const slug = item.slug || '';
        const entry = map.get(slug) || { name: item.name || slug, slug, units: 0, orders: 0, revenue: 0, sizes: new Map() };
        entry.units += item.qty || 1;
        entry.orders++;
        entry.revenue += (item.price || 0) * (item.qty || 1);
        const sz = item.size || '?';
        entry.sizes.set(sz, (entry.sizes.get(sz) || 0) + (item.qty || 1));
        map.set(slug, entry);
      });
    });
    return Array.from(map.values());
  }, [paid]);

  const sorted = [...productStats].sort((a, b) =>
    sort === 'revenue' ? b.revenue - a.revenue :
    sort === 'units' ? b.units - a.units :
    b.orders - a.orders
  );

  const topRevProduct = productStats.sort((a, b) => b.revenue - a.revenue)[0];
  const topUnitsProduct = productStats.sort((a, b) => b.units - a.units)[0];
  const totalRevenue = productStats.reduce((s, p) => s + p.revenue, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Grid>
        <Card>
          <Label>Top by Revenue</Label>
          <p style={{ fontSize: 13, color: S.text, marginTop: 4 }}>{topRevProduct?.name || '—'}</p>
          <Big color={S.amber}>{topRevProduct ? fmtEGP(topRevProduct.revenue) : '—'}</Big>
        </Card>
        <Card>
          <Label>Top by Units Sold</Label>
          <p style={{ fontSize: 13, color: S.text, marginTop: 4 }}>{topUnitsProduct?.name || '—'}</p>
          <Big color={S.green}>{topUnitsProduct?.units || 0}</Big>
        </Card>
        <Card>
          <Label>Total SKUs Sold</Label>
          <Big>{productStats.length}</Big>
        </Card>
        <Card>
          <Label>Total Product Revenue</Label>
          <Big>{fmtEGP(totalRevenue)}</Big>
        </Card>
      </Grid>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Label>Product Performance</Label>
          <Row style={{ gap: 6 }}>
            {(['revenue', 'units', 'orders'] as const).map(s => (
              <button key={s} onClick={() => setSort(s)} style={{
                background: sort === s ? S.accent : 'transparent',
                color: sort === s ? '#000' : S.muted,
                border: `1px solid ${sort === s ? S.accent : S.border}`,
                borderRadius: 4, padding: '3px 8px', fontSize: 9, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>{s}</button>
            ))}
          </Row>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((p, i) => {
            const catalog = catalogProducts.find(c => c.slug === p.slug);
            const revShare = totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0;
            const topSize = p.sizes.size > 0
              ? Array.from(p.sizes.entries()).sort((a, b) => b[1] - a[1])[0]
              : null;
            return (
              <div key={p.slug} style={{
                background: i === 0 ? S.amber + '08' : S.border + '22',
                border: `1px solid ${i === 0 ? S.amber + '30' : S.border}`,
                borderRadius: 8, padding: '12px 14px',
                display: 'flex', gap: 12, alignItems: 'center',
              }}>
                {/* Rank */}
                <span style={{ fontSize: 10, color: S.dim, width: 20, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</span>

                {/* Product thumbnail */}
                {catalog?.image && (
                  <div style={{ width: 40, height: 48, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: S.border }}>
                    <img src={catalog.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: S.text }}>{p.name}</p>
                  <Row style={{ gap: 8, marginTop: 3 }}>
                    <span style={{ fontSize: 9, color: S.muted }}>{p.units} units</span>
                    <span style={{ fontSize: 9, color: S.dim }}>·</span>
                    <span style={{ fontSize: 9, color: S.muted }}>{p.orders} orders</span>
                    {topSize && (
                      <>
                        <span style={{ fontSize: 9, color: S.dim }}>·</span>
                        <span style={{ fontSize: 9, color: S.muted }}>Top size: {topSize[0]}</span>
                      </>
                    )}
                  </Row>
                  <Pct value={revShare} max={100} color={i < 3 ? S.amber : S.muted} />
                </div>

                {/* Revenue */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 14, color: i < 3 ? S.amber : S.text, fontWeight: 200 }}>{fmtEGP(p.revenue)}</p>
                  <p style={{ fontSize: 9, color: S.muted }}>{revShare}% of total</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Size breakdown for top product */}
      {sorted[0] && sorted[0].sizes.size > 0 && (
        <Card>
          <Label>Size Breakdown — {sorted[0].name}</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {Array.from(sorted[0].sizes.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([size, count]) => (
                <div key={size}>
                  <Row style={{ justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: S.text }}>{size}</span>
                    <span style={{ fontSize: 11, color: S.muted }}>{count} units</span>
                  </Row>
                  <Pct value={count} max={sorted[0].units} color={S.accent + '60'} />
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// TAB 8 — Top Collections
// ============================================================================
export function TopCollectionsTab({ orders }: { orders: RawOrder[] }) {
  const paid = orders.filter(o => PAID.includes(o.status));

  const collectionStats = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; revenue: number; units: number; orders: number }>();

    paid.forEach(o => {
      o.items.forEach((item: any) => {
        const itemSlug = item.slug || '';
        // Find which archive this product belongs to
        const archive = archives.find(a => a.productSlugs.includes(itemSlug));
        const key = archive?.slug || 'uncategorised';
        const name = archive?.name || 'Uncategorised';
        const entry = map.get(key) || { name, slug: key, revenue: 0, units: 0, orders: 0 };
        entry.revenue += (item.price || 0) * (item.qty || 1);
        entry.units += item.qty || 1;
        entry.orders++;
        map.set(key, entry);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [paid]);

  const totalRevenue = collectionStats.reduce((s, c) => s + c.revenue, 0);

  // Period-over-period for each collection
  const now = new Date();
  const thisMonthStart = startOf('month');
  const lastMonthStart = startOf('month', -1);

  const collectionThisMonth = useMemo(() => {
    const map = new Map<string, number>();
    paid
      .filter(o => orderDate(o) >= thisMonthStart)
      .forEach(o => {
        o.items.forEach((item: any) => {
          const archive = archives.find(a => a.productSlugs.includes(item.slug || ''));
          const key = archive?.slug || 'uncategorised';
          map.set(key, (map.get(key) || 0) + (item.price || 0) * (item.qty || 1));
        });
      });
    return map;
  }, [paid, thisMonthStart]);

  const collectionLastMonth = useMemo(() => {
    const map = new Map<string, number>();
    paid
      .filter(o => orderDate(o) >= lastMonthStart && orderDate(o) < thisMonthStart)
      .forEach(o => {
        o.items.forEach((item: any) => {
          const archive = archives.find(a => a.productSlugs.includes(item.slug || ''));
          const key = archive?.slug || 'uncategorised';
          map.set(key, (map.get(key) || 0) + (item.price || 0) * (item.qty || 1));
        });
      });
    return map;
  }, [paid, lastMonthStart, thisMonthStart]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Grid>
        <Card>
          <Label>Collections Tracked</Label>
          <Big>{collectionStats.length}</Big>
        </Card>
        <Card>
          <Label>Best Collection</Label>
          <p style={{ fontSize: 13, color: S.text, marginTop: 4 }}>{collectionStats[0]?.name || '—'}</p>
          <Big color={S.amber}>{collectionStats[0] ? fmtEGP(collectionStats[0].revenue) : '—'}</Big>
        </Card>
        <Card>
          <Label>Total Collection Revenue</Label>
          <Big>{fmtEGP(totalRevenue)}</Big>
        </Card>
        <Card>
          <Label>Total Units (all collections)</Label>
          <Big>{collectionStats.reduce((s, c) => s + c.units, 0)}</Big>
        </Card>
      </Grid>

      {/* Bar chart */}
      <Card>
        <Label>Revenue by Collection</Label>
        <BarChart
          data={collectionStats.map(c => ({ label: c.name.split(' ')[0], value: c.revenue }))}
          color={S.border2}
          accentColor={S.amber}
        />
      </Card>

      {/* Collection cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {collectionStats.map((c, i) => {
          const thisM = collectionThisMonth.get(c.slug) || 0;
          const lastM = collectionLastMonth.get(c.slug) || 0;
          const mom = lastM > 0 ? Math.round(((thisM - lastM) / lastM) * 100) : null;
          const revShare = totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0;
          const archive = archives.find(a => a.slug === c.slug);

          return (
            <div key={c.slug} style={{
              background: i === 0 ? S.amber + '08' : S.surface,
              border: `1px solid ${i === 0 ? S.amber + '30' : S.border}`,
              borderRadius: 10, padding: 16,
            }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <Row style={{ gap: 8 }}>
                    <p style={{ fontSize: 13, color: S.text }}>{c.name}</p>
                    {i === 0 && <Chip color={S.amber}>Best Seller</Chip>}
                  </Row>
                  <p style={{ fontSize: 9, color: S.muted, marginTop: 2 }}>
                    {archive?.productSlugs.length || 0} products · {c.units} units · {c.orders} line items
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 18, color: i === 0 ? S.amber : S.text, fontWeight: 200 }}>{fmtEGP(c.revenue)}</p>
                  <p style={{ fontSize: 9, color: S.muted }}>{revShare}% of total</p>
                  {mom !== null && (
                    <p style={{ fontSize: 9, color: mom >= 0 ? S.green : S.red, marginTop: 2 }}>
                      {mom >= 0 ? '+' : ''}{mom}% MoM
                    </p>
                  )}
                </div>
              </Row>
              <Pct value={revShare} max={100} color={i === 0 ? S.amber : S.muted} />
            </div>
          );
        })}

        {collectionStats.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: S.dim }}>
            <p>No collection data yet. Orders with product slugs will populate this view.</p>
          </div>
        )}
      </div>
    </div>
  );
}
