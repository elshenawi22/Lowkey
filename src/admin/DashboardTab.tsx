// ============================================================================
// LOWKEY Admin — Dashboard Tab v2
// ============================================================================

import { useEffect, useState } from 'react';
import { useAnalytics } from './useAnalytics';
import { StatCard, RevenueChart, Card, Skeleton, ADM, fmtEGP, fmtNum, StatusBadge, fmtTime, EmptyState } from './ui';
import { getActivity, describeActivity, type ActivityEntry } from './activityLog';
import { Link } from '../router';

export default function DashboardTab() {
  const a = useAnalytics();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => { getActivity(8).then(setActivity); }, []);

  const revenueTrend = a.yesterdayRevenue > 0
    ? a.todayRevenue >= a.yesterdayRevenue ? 'up' : 'down'
    : 'flat';
  const revenueDelta = a.yesterdayRevenue > 0
    ? Math.round(((a.todayRevenue - a.yesterdayRevenue) / a.yesterdayRevenue) * 100)
    : null;

  if (a.loading && !a.lastUpdated) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={96} radius={8} />)}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 10, color: ADM.dim }}>
          {a.lastUpdated ? `Updated ${a.lastUpdated.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' })}` : ''}
        </p>
        <button onClick={() => a.refetch()} style={{
          background: 'none', border: `1px solid ${ADM.border}`, borderRadius: 5,
          padding: '5px 10px', fontSize: 10, color: ADM.muted, cursor: 'pointer', letterSpacing: '0.08em',
        }}>
          {a.loading ? 'REFRESHING···' : 'REFRESH'}
        </button>
      </div>

      {/* ── Revenue Row ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard
          label="Today's Revenue"
          value={fmtEGP(a.todayRevenue)}
          sub={revenueDelta !== null ? `${revenueDelta >= 0 ? '+' : ''}${revenueDelta}% vs yesterday` : 'No data yesterday'}
          trend={revenueTrend}
        />
        <StatCard label="Yesterday" value={fmtEGP(a.yesterdayRevenue)} />
        <StatCard label="Last 7 Days" value={fmtEGP(a.revenue7d)} />
        <StatCard label="Last 30 Days" value={fmtEGP(a.revenue30d)} />
        <StatCard label="This Month" value={fmtEGP(a.revenueThisMonth)} />
        <StatCard label="This Year" value={fmtEGP(a.revenueThisYear)} />
        <StatCard label="Avg Order Value" value={fmtEGP(a.aov)} />
        <StatCard label="Total Orders" value={fmtNum(a.totalOrders)} />
      </div>

      {/* ── Revenue Chart ───────────────────────────────────────────────── */}
      <RevenueChart data={a.revenueByDay} label="Revenue — Last 30 Days" />

      {/* ── Order Status + Subscribers Row ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Pending" value={fmtNum(a.pendingOrders)} color={a.pendingOrders > 0 ? ADM.amber : undefined} />
        <StatCard label="Confirmed" value={fmtNum(a.confirmedOrders)} />
        <StatCard label="Shipped" value={fmtNum(a.shippedOrders)} />
        <StatCard label="Delivered" value={fmtNum(a.deliveredOrders)} color={ADM.green} />
        <StatCard label="Cancelled" value={fmtNum(a.cancelledOrders)} color={a.cancelledOrders > 0 ? ADM.red : undefined} />
        <StatCard label="Newsletter Subs" value={fmtNum(a.totalSubs)} sub={`+${a.newSubsToday} today · +${a.newSubs7d} this week`} />
      </div>

      {/* ── Two Column: Top Products + Recent Activity ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Top Products */}
        <Card title="Best Selling Products">
          {a.topProducts.length === 0 ? (
            <EmptyState icon="○" title="No sales yet" message="Top products will appear once orders come in." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {a.topProducts.map((p, i) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, color: ADM.dim, width: 14 }}>{i + 1}</span>
                    <span style={{ fontSize: 12, color: ADM.text }}>{p.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 12, color: ADM.text }}>{fmtEGP(p.revenue)}</p>
                    <p style={{ fontSize: 9, color: ADM.dim }}>{p.orders} sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" action={<Link to="/lk-admin" className="" style={{ fontSize: 10, color: ADM.dim }}></Link>}>
          {activity.length === 0 ? (
            <EmptyState icon="○" title="No activity yet" message="Admin actions will be logged here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activity.map(act => (
                <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{ fontSize: 11, color: ADM.muted, lineHeight: 1.5 }}>{describeActivity(act)}</p>
                  <span style={{ fontSize: 9, color: ADM.dim, whiteSpace: 'nowrap' }}>{fmtTime(act.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Recent Orders ───────────────────────────────────────────────── */}
      <Card title="Recent Orders" noPad>
        {a.recentOrders.length === 0 ? (
          <div style={{ padding: 18 }}>
            <EmptyState icon="○" title="No orders yet" message="New orders will appear here in real time." />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${ADM.border}` }}>
                  {['Order', 'Customer', 'Status', 'Total', 'Date'].map(h => (
                    <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 9, color: ADM.dim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.recentOrders.slice(0, 6).map((o: any) => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${ADM.border}08` }}>
                    <td style={{ padding: '10px 18px', fontSize: 11, color: ADM.muted, fontFamily: 'monospace' }}>{o.id}</td>
                    <td style={{ padding: '10px 18px', fontSize: 12, color: ADM.text }}>{o.customer_name || o.customerName}</td>
                    <td style={{ padding: '10px 18px' }}><StatusBadge status={o.status} /></td>
                    <td style={{ padding: '10px 18px', fontSize: 12, color: ADM.text }}>{fmtEGP(Number(o.subtotal))}</td>
                    <td style={{ padding: '10px 18px', fontSize: 11, color: ADM.dim }}>{fmtTime(o.created_at || o.createdAt || '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
