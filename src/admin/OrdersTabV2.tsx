// ============================================================================
// LOWKEY Admin — Orders Tab v2
// Timeline · Internal Notes · Tracking · Invoice · Packing Slip · Filters
// ============================================================================

import { useState, useMemo } from 'react';
import type { Order } from '../lib/database.types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ABtn, SearchBar, StatusBadge, Pagination, EmptyState,
  TableWrap, THead, TH, TD, Card, Modal, AInput, ASelect,
  ADM, fmtEGP, fmtDate, fmtTime, toast,
} from './ui';
import { logActivity } from './activityLog';

// ── Types ───────────────────────────────────────────────────────────────────
type OrderRow = Order & { created_at?: string; internal_notes?: string; tracking_number?: string; shipping_provider?: string; };
type SortKey = 'date' | 'total' | 'status' | 'customer';
type SortDir = 'asc' | 'desc';

const ALL_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PROVIDERS = ['Aramex', 'Egypt Post', 'Bosta', 'R2S', 'Mylerz', 'Other'];
const PER_PAGE = 20;

// ── Invoice HTML template ────────────────────────────────────────────────────
function buildInvoiceHTML(o: OrderRow, type: 'invoice' | 'packing'): string {
  const items = (o.items || []) as { name: string; size: string; qty: number; price: number }[];
  const total = Number(o.subtotal) || 0;
  const date = o.created_at ? new Date(o.created_at).toLocaleDateString('en-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const rows = items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px">${i.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;text-align:center">${i.size}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;text-align:center">${i.qty}</td>
      ${type === 'invoice' ? `<td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;text-align:right">EGP ${(i.price * i.qty).toLocaleString()}</td>` : ''}
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${type === 'invoice' ? 'Invoice' : 'Packing Slip'} — ${o.id}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 640px; margin: 40px auto; color: #111; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand { font-size: 22px; letter-spacing: 0.35em; font-weight: 300; }
    .doc-type { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #888; margin-top: 4px; }
    .meta { font-size: 12px; color: #666; text-align: right; }
    .section { margin-bottom: 28px; }
    .label { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #aaa; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #aaa; padding: 8px 0; border-bottom: 2px solid #111; text-align: left; }
    th:last-child { text-align: right; }
    .total-row td { padding: 12px 0; font-size: 15px; font-weight: 500; border-top: 2px solid #111; }
    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #eee; font-size: 11px; color: #aaa; text-align: center; }
    ${o.tracking_number ? '.tracking { background: #f5f5f5; padding: 14px 18px; margin: 20px 0; border-radius: 4px; }' : ''}
    @media print { body { margin: 20px; } }
  </style></head><body>
  <div class="header">
    <div>
      <div class="brand">LOWKEY</div>
      <div class="doc-type">${type === 'invoice' ? 'Invoice' : 'Packing Slip'}</div>
    </div>
    <div class="meta">
      <div><strong>${o.id}</strong></div>
      <div style="margin-top:4px">${date}</div>
      <div style="margin-top:4px;color:#888">${fmtTime(o.created_at || '')}</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px">
    <div class="section">
      <div class="label">Customer</div>
      <div style="font-size:14px;font-weight:500">${o.customer_name || ''}</div>
      <div style="font-size:12px;color:#666;margin-top:4px">${o.customer_phone || ''}</div>
      <div style="font-size:12px;color:#666">${o.customer_email || ''}</div>
    </div>
    <div class="section">
      <div class="label">Delivery Address</div>
      <div style="font-size:13px;line-height:1.6">${o.customer_address || ''}</div>
    </div>
  </div>

  ${o.tracking_number ? `<div class="tracking">
    <span class="label">Tracking</span>
    <div style="font-size:13px;margin-top:4px"><strong>${o.shipping_provider || ''}</strong> — ${o.tracking_number}</div>
  </div>` : ''}

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center">Size</th>
        <th style="text-align:center">Qty</th>
        ${type === 'invoice' ? '<th style="text-align:right">Total</th>' : '<th style="text-align:center">✓</th>'}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    ${type === 'invoice' ? `<tfoot><tr class="total-row"><td colspan="3">Total</td><td style="text-align:right">EGP ${total.toLocaleString()}</td></tr></tfoot>` : ''}
  </table>

  ${o.notes ? `<div style="margin-top:24px;padding:14px 18px;background:#f9f9f9;font-size:12px;color:#666"><span class="label">Notes: </span>${o.notes}</div>` : ''}

  <div class="footer">
    Made in Port Said, Egypt · lowkey-egy.com · Stay Low. Leave Legacy.
  </div>
  <script>setTimeout(() => window.print(), 400)</script>
  </body></html>`;
}

function printDoc(o: OrderRow, type: 'invoice' | 'packing') {
  const w = window.open('', '_blank');
  if (!w) { toast('Allow popups to print', 'warning'); return; }
  w.document.write(buildInvoiceHTML(o, type));
  w.document.close();
}

// ── Order Detail Panel ────────────────────────────────────────────────────────
function OrderDetail({ order, onClose, onUpdate }: {
  order: OrderRow;
  onClose: () => void;
  onUpdate: (o: OrderRow) => void;
}) {
  const [notes, setNotes] = useState(order.internal_notes || '');
  const [tracking, setTracking] = useState(order.tracking_number || '');
  const [provider, setProvider] = useState(order.shipping_provider || '');
  const [status, setStatus] = useState(order.status);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const patch = { status, internal_notes: notes, tracking_number: tracking, shipping_provider: provider };
    if (isSupabaseConfigured && supabase) {
      await supabase.from('orders').update(patch).eq('id', order.id!);
    }
    const updated = { ...order, ...patch };
    onUpdate(updated);
    logActivity('order.updated', 'order', order.id!, { status, tracking });
    toast('Order saved');
    setSaving(false);
  };

  const items = (order.items || []) as { name: string; size: string; qty: number; price: number }[];

  return (
    <Modal open={true} onClose={onClose} title={`Order ${order.id}`} width={680}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Timeline */}
        <Card title="Timeline">
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '4px 0' }}>
            {ALL_STATUSES.map((s, i) => {
              const idx = ALL_STATUSES.indexOf(status);
              const sIdx = ALL_STATUSES.indexOf(s);
              const isDone = sIdx <= idx;
              const isCurrent = s === status;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < ALL_STATUSES.length - 1 ? 1 : 'none' }}>
                  <div style={{ textAlign: 'center', minWidth: 72 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', border: `2px solid ${isCurrent ? ADM.blue : isDone ? ADM.green : ADM.border}`,
                      background: isCurrent ? ADM.blue : isDone ? ADM.green + '30' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 6px', fontSize: 10, color: isCurrent ? '#fff' : isDone ? ADM.green : ADM.dim,
                    }}>
                      {isDone && !isCurrent ? '✓' : (i + 1)}
                    </div>
                    <span style={{ fontSize: 9, color: isCurrent ? ADM.text : ADM.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {s}
                    </span>
                  </div>
                  {i < ALL_STATUSES.length - 1 && (
                    <div style={{ flex: 1, height: 1, background: sIdx < idx ? ADM.green : ADM.border, margin: '0 2px', marginBottom: 20 }} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Customer + Address */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Card title="Customer">
            <p style={{ fontSize: 13, color: ADM.text }}>{order.customer_name}</p>
            <p style={{ fontSize: 11, color: ADM.muted, marginTop: 4 }}>{order.customer_phone}</p>
            <p style={{ fontSize: 11, color: ADM.muted }}>{order.customer_email}</p>
            <a
              href={`https://wa.me/${(order.customer_phone || '').replace(/[^0-9]/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 8, fontSize: 10, color: '#25D366', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              💬 WhatsApp
            </a>
          </Card>
          <Card title="Address">
            <p style={{ fontSize: 12, color: ADM.muted, lineHeight: 1.7 }}>{order.customer_address}</p>
          </Card>
        </div>

        {/* Items */}
        <Card title="Items" noPad>
          <TableWrap>
            <THead>
              <TH>Product</TH><TH>Size</TH><TH>Qty</TH><TH right>Price</TH>
            </THead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <TD>{it.name}</TD>
                  <TD><span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{it.size}</span></TD>
                  <TD>{it.qty}</TD>
                  <TD right>{fmtEGP(it.price * it.qty)}</TD>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ padding: '10px 12px', fontSize: 12, color: ADM.muted, textAlign: 'right', fontWeight: 500 }}>Total</td>
                <TD right><span style={{ color: ADM.text, fontWeight: 500 }}>{fmtEGP(Number(order.subtotal))}</span></TD>
              </tr>
            </tbody>
          </TableWrap>
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card title="Customer Notes">
            <p style={{ fontSize: 12, color: ADM.muted, lineHeight: 1.7 }}>{order.notes}</p>
          </Card>
        )}

        {/* Edit fields */}
        <Card title="Fulfillment">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ASelect
              label="Status"
              value={status}
              onChange={v => setStatus(v as Order['status'])}
              options={ALL_STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
            />
            <ASelect
              label="Shipping Provider"
              value={provider}
              onChange={setProvider}
              options={[{ value: '', label: '— None —' }, ...PROVIDERS.map(p => ({ value: p, label: p }))]}
            />
          </div>
          <AInput label="Tracking Number" value={tracking} onChange={setTracking} placeholder="e.g. 1Z999AA10123456784" />
        </Card>

        <Card title="Internal Notes (Admin Only)">
          <AInput
            area
            value={notes}
            onChange={setNotes}
            placeholder="Notes visible only to the admin team…"
          />
        </Card>

        {/* Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <ABtn onClick={() => printDoc(order, 'invoice')}>🖨 Invoice</ABtn>
            <ABtn onClick={() => printDoc(order, 'packing')}>📦 Packing Slip</ABtn>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <ABtn variant="ghost" onClick={onClose}>Cancel</ABtn>
            <ABtn variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </ABtn>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Orders Tab ───────────────────────────────────────────────────────────
export default function OrdersTabV2({ orders: initialOrders, onStatus, onDelete }: {
  orders: OrderRow[];
  onStatus: (id: string, s: Order['status'], silent?: boolean) => void;
  onDelete: (id: string, silent?: boolean) => void;
}) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Sync with parent prop updates
  const mergedOrders = useMemo(() => {
    const map = new Map(orders.map(o => [o.id!, o]));
    initialOrders.forEach(o => { if (!map.has(o.id!)) map.set(o.id!, o); });
    return Array.from(map.values());
  }, [initialOrders, orders]);

  // ── Filter + Sort ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = mergedOrders;
    if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter);
    if (q.trim()) {
      const lower = q.toLowerCase();
      result = result.filter(o =>
        (o.customer_name || '').toLowerCase().includes(lower) ||
        (o.id || '').includes(lower) ||
        (o.customer_phone || '').includes(lower) ||
        (o.customer_email || '').toLowerCase().includes(lower) ||
        (o.customer_address || '').toLowerCase().includes(lower)
      );
    }
    if (dateFrom) result = result.filter(o => new Date(o.created_at || '') >= new Date(dateFrom));
    if (dateTo)   result = result.filter(o => new Date(o.created_at || '') <= new Date(dateTo + 'T23:59:59'));
    if (minTotal) result = result.filter(o => Number(o.subtotal) >= Number(minTotal));
    if (maxTotal) result = result.filter(o => Number(o.subtotal) <= Number(maxTotal));

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date')     cmp = new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      if (sortKey === 'total')    cmp = Number(a.subtotal) - Number(b.subtotal);
      if (sortKey === 'status')   cmp = (a.status || '').localeCompare(b.status || '');
      if (sortKey === 'customer') cmp = (a.customer_name || '').localeCompare(b.customer_name || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [mergedOrders, q, statusFilter, dateFrom, dateTo, minTotal, maxTotal, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Sort toggle ─────────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const sortIcon = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  // ── Selection ───────────────────────────────────────────────────────────
  const toggleOne = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(paginated.map(o => o.id!)));
  const clearSel = () => setSelected(new Set());
  const allSelected = paginated.length > 0 && paginated.every(o => selected.has(o.id!));

  // ── Bulk ────────────────────────────────────────────────────────────────
  const bulkStatus = async (newStatus: Order['status']) => {
    if (!selected.size || !confirm(`Change ${selected.size} orders to "${newStatus}"?`)) return;
    setBulkLoading(true);
    for (const id of selected) onStatus(id, newStatus, true);
    setOrders(prev => prev.map(o => selected.has(o.id!) ? { ...o, status: newStatus } : o));
    logActivity('order.bulk_status_changed', 'order', null, { count: selected.size, to: newStatus });
    toast(`${selected.size} orders → ${newStatus}`);
    clearSel(); setBulkLoading(false);
  };

  const bulkDelete = async () => {
    if (!selected.size || !confirm(`Delete ${selected.size} orders? Cannot be undone.`)) return;
    setBulkLoading(true);
    const ids = Array.from(selected);
    for (const id of ids) onDelete(id, true);
    setOrders(prev => prev.filter(o => !selected.has(o.id!)));
    logActivity('order.bulk_deleted', 'order', null, { count: ids.length });
    toast(`${ids.length} orders deleted`, 'info');
    clearSel(); setBulkLoading(false);
  };

  // ── CSV Export ──────────────────────────────────────────────────────────
  const exportCSV = (subset: OrderRow[]) => {
    const header = 'ID,Date,Name,Phone,Email,Address,Items,Total,Status,Tracking,Provider,Notes';
    const rows = subset.map(o => {
      const items = (o.items || []).map((i: any) => `${i.name}(${i.size})x${i.qty}`).join('; ');
      return `"${o.id}","${o.created_at || ''}","${o.customer_name || ''}","${o.customer_phone || ''}","${o.customer_email || ''}","${o.customer_address || ''}","${items}",${o.subtotal},"${o.status}","${o.tracking_number || ''}","${o.shipping_provider || ''}","${o.notes || ''}"`;
    });
    const csv = [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `lowkey-orders-${Date.now()}.csv`;
    a.click();
    toast(`Exported ${subset.length} orders`);
  };

  // ── Update detail order in local state ──────────────────────────────────
  const handleDetailUpdate = (updated: OrderRow) => {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    onStatus(updated.id!, updated.status, true);
    setDetailOrder(updated);
  };

  // ── Stats bar ───────────────────────────────────────────────────────────
  const statusCounts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = mergedOrders.filter(o => o.status === s).length;
    return acc;
  }, {} as Record<string, number>);
  const pendingRev = mergedOrders.filter(o => o.status === 'pending').reduce((s, o) => s + Number(o.subtotal), 0);

  const hasFilters = q || statusFilter !== 'all' || dateFrom || dateTo || minTotal || maxTotal;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {[
          ['all', 'All', mergedOrders.length],
          ...ALL_STATUSES.map(s => [s, s, statusCounts[s]])
        ].map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => { setStatusFilter(String(val)); setPage(1); clearSel(); }}
            style={{
              padding: '5px 12px', borderRadius: 5, fontSize: 10,
              letterSpacing: '0.1em', textTransform: 'capitalize', cursor: 'pointer',
              background: statusFilter === val ? '#ffffff' : ADM.surface,
              color: statusFilter === val ? '#000' : ADM.muted,
              border: `1px solid ${statusFilter === val ? 'transparent' : ADM.border}`,
              transition: 'all 0.2s',
            }}
          >
            {label} <span style={{ marginLeft: 4, opacity: 0.6 }}>{count}</span>
          </button>
        ))}
      </div>

      {/* ── Pending revenue alert ─────────────────────────────────────── */}
      {statusCounts['pending'] > 0 && (
        <div style={{
          background: '#92400e15', border: '1px solid #92400e30',
          borderRadius: 6, padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: '#f59e0b' }}>
            ⏳ {statusCounts['pending']} pending orders · {fmtEGP(pendingRev)} awaiting confirmation
          </span>
          <ABtn small variant="success" onClick={() => {
            if (confirm(`Confirm all ${statusCounts['pending']} pending orders?`)) {
              const pending = mergedOrders.filter(o => o.status === 'pending');
              pending.forEach(o => onStatus(o.id!, 'confirmed', true));
              setOrders(prev => prev.map(o => o.status === 'pending' ? { ...o, status: 'confirmed' } : o));
              toast(`${pending.length} orders confirmed`);
            }
          }}>Confirm All</ABtn>
        </div>
      )}

      {/* ── Search + Filter Row ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search by name, order ID, phone, email…" />
        </div>
        <ABtn onClick={() => setShowFilters(v => !v)}>
          {showFilters ? '✕ Filters' : '⊞ Filters'}{hasFilters && !showFilters ? ' •' : ''}
        </ABtn>
        <ABtn onClick={() => exportCSV(selected.size > 0 ? mergedOrders.filter(o => selected.has(o.id!)) : filtered)}>
          ↓ CSV {selected.size > 0 ? `(${selected.size})` : `(${filtered.length})`}
        </ABtn>
      </div>

      {/* ── Advanced Filters Panel ────────────────────────────────────── */}
      {showFilters && (
        <div style={{
          background: ADM.surface, border: `1px solid ${ADM.border}`,
          borderRadius: 8, padding: 16,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12,
        }}>
          <div>
            <label style={{ fontSize: 10, color: ADM.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Date From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              style={{ width: '100%', background: ADM.bg, border: `1px solid ${ADM.border}`, borderRadius: 5, padding: '7px 10px', fontSize: 12, color: ADM.text, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: ADM.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Date To</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              style={{ width: '100%', background: ADM.bg, border: `1px solid ${ADM.border}`, borderRadius: 5, padding: '7px 10px', fontSize: 12, color: ADM.text, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: ADM.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Min Total (EGP)</label>
            <input type="number" value={minTotal} onChange={e => { setMinTotal(e.target.value); setPage(1); }} placeholder="0"
              style={{ width: '100%', background: ADM.bg, border: `1px solid ${ADM.border}`, borderRadius: 5, padding: '7px 10px', fontSize: 12, color: ADM.text, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: ADM.muted, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Max Total (EGP)</label>
            <input type="number" value={maxTotal} onChange={e => { setMaxTotal(e.target.value); setPage(1); }} placeholder="∞"
              style={{ width: '100%', background: ADM.bg, border: `1px solid ${ADM.border}`, borderRadius: 5, padding: '7px 10px', fontSize: 12, color: ADM.text, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <ABtn onClick={() => { setDateFrom(''); setDateTo(''); setMinTotal(''); setMaxTotal(''); setPage(1); }}>
              Clear Filters
            </ABtn>
          </div>
        </div>
      )}

      {/* ── Bulk Action Bar ───────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div style={{
          background: '#0d1a0d', border: '1px solid #22c55e30',
          borderRadius: 8, padding: '10px 16px',
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        }}>
          <span style={{ fontSize: 11, color: ADM.green, fontWeight: 500 }}>{selected.size} selected</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 8 }}>
            {['confirmed', 'shipped', 'delivered'].map(s => (
              <ABtn key={s} small variant="success" onClick={() => bulkStatus(s as Order['status'])} disabled={bulkLoading}>
                → {s}
              </ABtn>
            ))}
            <ABtn small onClick={() => exportCSV(mergedOrders.filter(o => selected.has(o.id!)))}>CSV</ABtn>
            <ABtn small variant="danger" onClick={bulkDelete} disabled={bulkLoading}>Delete</ABtn>
          </div>
          <button onClick={clearSel} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: ADM.dim, cursor: 'pointer', fontSize: 14 }}>×</button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="○"
          title={hasFilters ? 'No orders match your filters' : 'No orders yet'}
          message={hasFilters ? 'Try adjusting your search or filters.' : 'Orders will appear here once customers start buying.'}
          action={hasFilters ? <ABtn onClick={() => { setQ(''); setStatusFilter('all'); setDateFrom(''); setDateTo(''); setMinTotal(''); setMaxTotal(''); }}>Clear All Filters</ABtn> : undefined}
        />
      ) : (
        <>
          <div style={{ fontSize: 10, color: ADM.dim, marginLeft: 2 }}>
            {filtered.length} order{filtered.length !== 1 ? 's' : ''} · Page {page}
          </div>
          <TableWrap>
            <THead>
              <TH><input type="checkbox" checked={allSelected} onChange={() => allSelected ? clearSel() : selectAll()} style={{ accentColor: ADM.green, cursor: 'pointer' }} /></TH>
              <TH>Order</TH>
              <TH><button onClick={() => toggleSort('customer')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Customer{sortIcon('customer')}</button></TH>
              <TH><button onClick={() => toggleSort('status')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Status{sortIcon('status')}</button></TH>
              <TH right><button onClick={() => toggleSort('total')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Total{sortIcon('total')}</button></TH>
              <TH><button onClick={() => toggleSort('date')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Date{sortIcon('date')}</button></TH>
              <TH>Tracking</TH>
              <TH right>Actions</TH>
            </THead>
            <tbody>
              {paginated.map(o => (
                <tr
                  key={o.id}
                  style={{
                    borderBottom: `1px solid ${ADM.border}08`,
                    background: selected.has(o.id!) ? '#22c55e05' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <TD>
                    <input
                      type="checkbox"
                      checked={selected.has(o.id!)}
                      onChange={() => toggleOne(o.id!)}
                      onClick={e => e.stopPropagation()}
                      style={{ accentColor: ADM.green, cursor: 'pointer' }}
                    />
                  </TD>
                  <TD mono>
                    <button
                      onClick={() => setDetailOrder(o)}
                      style={{ background: 'none', border: 'none', color: ADM.blue, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace', textDecoration: 'underline' }}
                    >
                      {o.id}
                    </button>
                    {o.internal_notes && <span title={o.internal_notes} style={{ marginLeft: 6, fontSize: 10, color: ADM.amber }}>📝</span>}
                  </TD>
                  <TD>
                    <div>
                      <p style={{ fontSize: 12, color: ADM.text }}>{o.customer_name}</p>
                      <p style={{ fontSize: 10, color: ADM.dim }}>{o.customer_phone}</p>
                    </div>
                  </TD>
                  <TD><StatusBadge status={o.status} /></TD>
                  <TD right><span style={{ fontSize: 12, color: ADM.text }}>{fmtEGP(Number(o.subtotal))}</span></TD>
                  <TD>
                    <div>
                      <p style={{ fontSize: 11, color: ADM.muted }}>{fmtDate(o.created_at || '')}</p>
                      <p style={{ fontSize: 10, color: ADM.dim }}>{fmtTime(o.created_at || '')}</p>
                    </div>
                  </TD>
                  <TD>
                    {o.tracking_number
                      ? <span style={{ fontSize: 10, color: ADM.green }}>✓ {o.tracking_number}</span>
                      : <span style={{ fontSize: 10, color: ADM.dim }}>—</span>}
                  </TD>
                  <TD right>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <ABtn small onClick={() => setDetailOrder(o)}>View</ABtn>
                      <ABtn small onClick={() => printDoc(o, 'invoice')}>Invoice</ABtn>
                      <a href={`https://wa.me/${(o.customer_phone || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '4px 10px', fontSize: 10, color: '#25D366', border: '1px solid #25D36640', borderRadius: 5, textDecoration: 'none', letterSpacing: '0.08em' }}>
                        WA
                      </a>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </TableWrap>

          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </>
      )}

      {/* ── Order Detail Modal ────────────────────────────────────────── */}
      {detailOrder && (
        <OrderDetail
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onUpdate={handleDetailUpdate}
        />
      )}
    </div>
  );
}
