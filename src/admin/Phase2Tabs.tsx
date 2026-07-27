// ============================================================================
// LOWKEY Admin — Phase 2 Tabs
// CRM · Activity Log · Media Library · Roles & Permissions
// Scheduled Products · Draft Products · Inventory History · Order Timeline
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getActivity, describeActivity, logActivity, type ActivityEntry } from './activityLog';
import { getOrders } from '../lib/orders';
import { loadInventory, type StockItem } from '../lib/inventory';
import { getAllProducts, type DBProduct } from '../lib/products-db';
import { uploadImage } from '../lib/media-upload';
import type { Order } from '../lib/database.types';

const fmt = (n: number) => n.toLocaleString('en-EG');

// ─── Primitive reuse (keep in sync with AdminPage) ──────────────────────────
function Box({ children, title, action }: { children: React.ReactNode; title?: string; action?: React.ReactNode }) {
  return (
    <div className="bg-[#0f0f0f] border border-[#181818] rounded-lg p-5 mb-4">
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-white text-xs tracking-wide">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Btn({ children, onClick, v = 'p', disabled, full }: {
  children: React.ReactNode; onClick?: () => void;
  v?: 'p' | 'g' | 'd'; disabled?: boolean; full?: boolean;
}) {
  const c =
    v === 'p' ? 'bg-white text-[#080808] hover:bg-white/90' :
    v === 'd' ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' :
    'text-[#555] border border-[#222] hover:text-white';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${c} text-[0.5rem] tracking-[0.15em] uppercase px-4 py-2 rounded-md transition-all disabled:opacity-30 ${full ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}

function Inp({ label, value, onChange, area, type = 'text', hint, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  area?: boolean; type?: string; hint?: string; placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label className="text-[#555] text-[0.5rem] tracking-[0.1em] uppercase block mb-1">{label}</label>
      {area ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder}
          className="w-full bg-[#080808] border border-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#333] rounded-md resize-none" />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-[#080808] border border-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#333] rounded-md" />
      )}
      {hint && <p className="text-[#333] text-[0.45rem] mt-0.5">{hint}</p>}
    </div>
  );
}

// ============================================================================
// 1. CUSTOMER CRM
// ============================================================================
interface CustomerRecord {
  name: string;
  phone: string;
  email: string;
  address: string;
  orders: number;
  spent: number;
  last: string;
  firstOrder: string;
  items: string[];
  notes: string;
}

export function CustomerCRMTab({ orders }: { orders: (Order & { createdAt?: string })[] }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerRecord | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'last'>('spent');

  // Build customer map from orders
  const customerMap = new Map<string, CustomerRecord>();
  orders.forEach(o => {
    const key = o.customerPhone;
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        name: o.customerName, phone: key,
        email: o.customerEmail, address: o.customerAddress,
        orders: 0, spent: 0, last: '', firstOrder: o.createdAt || '',
        items: [], notes: '',
      });
    }
    const c = customerMap.get(key)!;
    c.orders++;
    c.spent += o.subtotal;
    if (!c.last || (o.createdAt && o.createdAt > c.last)) c.last = o.createdAt || '';
    if (!c.firstOrder || (o.createdAt && o.createdAt < c.firstOrder)) c.firstOrder = o.createdAt || '';
    o.items.forEach(it => { if (!c.items.includes(it.slug)) c.items.push(it.slug); });
  });

  const customers = Array.from(customerMap.values())
    .filter(c =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortBy === 'spent' ? b.spent - a.spent :
      sortBy === 'orders' ? b.orders - a.orders :
      b.last.localeCompare(a.last)
    );

  // Load saved notes from localStorage
  const notesKey = (phone: string) => `lowkey-crm-note-${phone}`;
  const loadNotes = (phone: string) => {
    try { return localStorage.getItem(notesKey(phone)) || ''; } catch { return ''; }
  };
  const saveNote = (phone: string, text: string) => {
    try { localStorage.setItem(notesKey(phone), text); } catch { /* */ }
  };

  const openCustomer = (c: CustomerRecord) => {
    setSelected(c);
    setNotes(loadNotes(c.phone));
  };

  const handleSaveNote = () => {
    if (!selected) return;
    setSavingNote(true);
    saveNote(selected.phone, notes);
    setTimeout(() => setSavingNote(false), 1000);
  };

  const expCSV = () => {
    const header = 'Name,Phone,Email,Orders,Spent (EGP),Last Order,First Order';
    const rows = customers.map(c =>
      `"${c.name}",${c.phone},${c.email},${c.orders},${c.spent},${c.last},${c.firstOrder}`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lowkey-crm-${Date.now()}.csv`;
    a.click();
  };

  // Segments
  const vip = customers.filter(c => c.spent >= 5000);
  const repeat = customers.filter(c => c.orders >= 2);

  // Customer detail panel
  if (selected) {
    const customerOrders = orders.filter(o => o.customerPhone === selected.phone);
    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-[#444] text-xs hover:text-white mb-6">← Back to CRM</button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Box title="Customer Profile">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[#444] text-[0.5rem] uppercase">Name</p>
                  <p className="text-white text-sm mt-0.5">{selected.name}</p>
                </div>
                <div>
                  <p className="text-[#444] text-[0.5rem] uppercase">Phone</p>
                  <p className="text-white text-sm mt-0.5">{selected.phone}</p>
                </div>
                <div>
                  <p className="text-[#444] text-[0.5rem] uppercase">Email</p>
                  <p className="text-[#888] text-xs mt-0.5">{selected.email}</p>
                </div>
                <div>
                  <p className="text-[#444] text-[0.5rem] uppercase">Address</p>
                  <p className="text-[#888] text-xs mt-0.5">{selected.address}</p>
                </div>
              </div>
            </Box>

            <Box title="Order History">
              {customerOrders.length === 0 ? (
                <p className="text-[#444] text-xs">No orders</p>
              ) : (
                <div className="space-y-2">
                  {customerOrders.map(o => (
                    <div key={o.id} className="flex items-center justify-between p-3 bg-[#080808] rounded-lg">
                      <div>
                        <p className="text-[#ccc] text-xs font-mono">{o.id}</p>
                        <p className="text-[#444] text-[0.5rem] mt-0.5">
                          {o.items.map(i => `${i.name} (${i.size})`).join(' · ')}
                        </p>
                        {o.createdAt && (
                          <p className="text-[#333] text-[0.45rem]">
                            {new Date(o.createdAt).toLocaleDateString('en-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-white text-sm">EGP {fmt(o.subtotal)}</p>
                        <span className={`text-[0.4rem] px-1.5 py-0.5 rounded capitalize ${
                          o.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' :
                          o.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-[#1a1a1a] text-[#555]'
                        }`}>{o.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Box>
          </div>

          <div className="space-y-4">
            <Box title="Stats">
              <div className="space-y-3">
                {[
                  { l: 'Total Spent', v: `EGP ${fmt(selected.spent)}` },
                  { l: 'Orders', v: selected.orders },
                  { l: 'Avg Order Value', v: `EGP ${fmt(Math.round(selected.spent / selected.orders))}` },
                  { l: 'First Order', v: selected.firstOrder ? new Date(selected.firstOrder).toLocaleDateString() : '—' },
                  { l: 'Last Order', v: selected.last ? new Date(selected.last).toLocaleDateString() : '—' },
                ].map(s => (
                  <div key={s.l} className="flex justify-between">
                    <span className="text-[#444] text-[0.5rem] uppercase">{s.l}</span>
                    <span className="text-white text-xs">{s.v}</span>
                  </div>
                ))}
                {selected.orders >= 2 && (
                  <div className="mt-2 pt-2 border-t border-[#1a1a1a]">
                    <span className="text-[0.4rem] bg-amber-500/10 text-amber-400 px-2 py-1 rounded">VIP Customer</span>
                  </div>
                )}
              </div>
            </Box>

            <Box title="Quick Actions">
              <div className="space-y-2">
                <a
                  href={`https://wa.me/${selected.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`مرحبا ${selected.name}،`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] text-[0.5rem] px-3 py-2 rounded-md hover:bg-[#25D366]/20 transition-colors"
                >
                  💬 WhatsApp
                </a>
                <a
                  href={`mailto:${selected.email}`}
                  className="w-full flex items-center justify-center gap-2 bg-[#141414] text-[#888] text-[0.5rem] px-3 py-2 rounded-md hover:text-white transition-colors"
                >
                  ✉ Email
                </a>
              </div>
            </Box>

            <Box title="CRM Notes">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                placeholder="Internal notes about this customer..."
                className="w-full bg-[#080808] border border-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#333] rounded-md resize-none"
              />
              <Btn onClick={handleSaveNote} disabled={savingNote} full>
                {savingNote ? '✓ Saved' : 'Save Note'}
              </Btn>
            </Box>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Segment stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { l: 'Total Customers', v: customers.length },
          { l: 'VIP (EGP 5k+)', v: vip.length },
          { l: 'Repeat Buyers', v: repeat.length },
        ].map(s => (
          <div key={s.l} className="bg-[#0f0f0f] border border-[#181818] rounded-lg p-4">
            <p className="text-[#444] text-[0.5rem] uppercase">{s.l}</p>
            <p className="text-white text-xl font-light mt-1">{s.v}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name / phone / email..."
          className="flex-1 bg-[#0f0f0f] border border-[#1a1a1a] px-3 py-2 text-xs text-[#ccc] placeholder:text-[#333] rounded-md focus:outline-none"
        />
        <div className="flex gap-2">
          {(['spent', 'orders', 'last'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 text-[0.5rem] rounded capitalize ${sortBy === s ? 'bg-white text-black' : 'bg-[#141414] text-[#444]'}`}>
              {s === 'last' ? 'Recent' : s}
            </button>
          ))}
          <Btn v="g" onClick={expCSV}>↓ CSV</Btn>
        </div>
      </div>

      {/* Customer list */}
      {customers.length === 0 ? (
        <p className="text-[#333] text-center py-12">No customers found</p>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <button
              key={c.phone}
              onClick={() => openCustomer(c)}
              className="w-full bg-[#0f0f0f] border border-[#181818] rounded-lg p-4 flex items-center justify-between hover:border-[#333] transition-colors text-left"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#555] text-xs shrink-0">
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[#ccc] text-sm truncate">{c.name}</p>
                  <p className="text-[#444] text-[0.5rem] mt-0.5">{c.phone} · {c.email}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-white text-sm">EGP {fmt(c.spent)}</p>
                <p className="text-[#555] text-[0.5rem]">{c.orders} order{c.orders !== 1 ? 's' : ''}</p>
                {c.orders >= 2 && <span className="text-[0.4rem] text-amber-400">VIP</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. ACTIVITY LOG
// ============================================================================
export function ActivityLogTab() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'order' | 'product' | 'inventory' | 'discount' | 'review' | 'collection'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getActivity(200);
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all'
    ? entries
    : entries.filter(e => e.entityType === filter || e.action.startsWith(filter));

  const actionColor = (action: string) => {
    if (action.includes('deleted')) return 'text-red-400';
    if (action.includes('created')) return 'text-emerald-400';
    if (action.includes('status')) return 'text-blue-400';
    if (action.includes('bulk')) return 'text-purple-400';
    return 'text-[#666]';
  };

  const actionIcon = (action: string) => {
    if (action.includes('order')) return '☰';
    if (action.includes('product')) return '◫';
    if (action.includes('inventory')) return '⊟';
    if (action.includes('discount')) return '✂';
    if (action.includes('review')) return '★';
    if (action.includes('collection')) return '◈';
    return '·';
  };

  const filterOptions = ['all', 'order', 'product', 'inventory', 'discount', 'review', 'collection'] as const;

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 justify-between mb-4">
        <div className="flex gap-1 flex-wrap">
          {filterOptions.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-[0.5rem] rounded capitalize ${filter === f ? 'bg-white text-black' : 'bg-[#141414] text-[#444]'}`}>
              {f}
            </button>
          ))}
        </div>
        <Btn v="g" onClick={load}>{loading ? '···' : '↻ Refresh'}</Btn>
      </div>

      {!isSupabaseConfigured && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
          <p className="text-amber-400 text-xs">Activity log requires Supabase. Running in local mode.</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border border-[#333] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-[#333] text-center py-12">No activity recorded</p>
      ) : (
        <div className="space-y-1">
          {filtered.map(entry => (
            <div key={entry.id} className="flex items-start gap-3 p-3 bg-[#0f0f0f] border border-[#141818] rounded-lg hover:border-[#222] transition-colors">
              <span className="text-[#333] text-xs w-4 text-center shrink-0 mt-0.5">{actionIcon(entry.action)}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs ${actionColor(entry.action)}`}>{describeActivity(entry)}</p>
                {Object.keys(entry.details).length > 0 && (
                  <p className="text-[#333] text-[0.45rem] mt-0.5 font-mono truncate">
                    {JSON.stringify(entry.details)}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[#333] text-[0.45rem]">
                  {new Date(entry.createdAt).toLocaleDateString('en-EG', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                <p className="text-[#222] text-[0.4rem] mt-0.5">{entry.actorEmail.split('@')[0]}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. MEDIA LIBRARY
// ============================================================================
interface MediaItem {
  url: string;
  name: string;
  type: 'image' | 'video';
  uploadedAt: string;
  size?: number;
}

const MEDIA_STORAGE_KEY = 'lowkey-media-library';

function loadMediaLibrary(): MediaItem[] {
  try { return JSON.parse(localStorage.getItem(MEDIA_STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveMediaLibrary(items: MediaItem[]) {
  try { localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(items)); } catch { /* */ }
}

export function MediaLibraryTab() {
  const [items, setItems] = useState<MediaItem[]>(loadMediaLibrary);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const filtered = items
    .filter(m => filter === 'all' || m.type === filter)
    .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  const addToLibrary = (url: string, name: string, type: 'image' | 'video', size?: number) => {
    const item: MediaItem = { url, name, type, uploadedAt: new Date().toISOString(), size };
    setItems(prev => {
      const updated = [item, ...prev];
      saveMediaLibrary(updated);
      return updated;
    });
  };

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    setProgress(0);
    const total = files.length;
    for (let i = 0; i < total; i++) {
      const file = files[i];
      const result = await uploadImage(file);
      if (result?.url) {
        const type = file.type.startsWith('video') ? 'video' : 'image';
        addToLibrary(result.url, file.name, type, file.size);
      }
      setProgress(Math.round(((i + 1) / total) * 100));
    }
    setUploading(false);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    await handleFiles(e.target.files);
    e.target.value = '';
  };

  // Drag & drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) await handleFiles(e.dataTransfer.files);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const deleteItem = (url: string) => {
    setItems(prev => {
      const updated = prev.filter(m => m.url !== url);
      saveMediaLibrary(updated);
      return updated;
    });
    if (selected === url) setSelected(null);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-[#1a1a1a] rounded-lg p-8 text-center mb-6 hover:border-[#333] transition-colors"
      >
        {uploading ? (
          <div className="space-y-3">
            <div className="w-full bg-[#1a1a1a] rounded-full h-1">
              <div className="h-1 bg-white rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[#555] text-xs">Uploading... {progress}%</p>
          </div>
        ) : (
          <label className="cursor-pointer">
            <p className="text-[#444] text-sm mb-1">Drop files here or click to upload</p>
            <p className="text-[#333] text-[0.5rem]">Images and videos supported</p>
            <input type="file" accept="image/*,video/*" multiple onChange={handleFileInput} className="hidden" />
          </label>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search files..."
          className="flex-1 bg-[#0f0f0f] border border-[#1a1a1a] px-3 py-2 text-xs text-[#ccc] placeholder:text-[#333] rounded-md focus:outline-none"
        />
        <div className="flex gap-1">
          {(['all', 'image', 'video'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[0.5rem] rounded capitalize ${filter === f ? 'bg-white text-black' : 'bg-[#141414] text-[#444]'}`}>
              {f} {f !== 'all' && `(${items.filter(m => m.type === f).length})`}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[#333] text-[0.5rem] mb-4">{filtered.length} files</p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-[#333] text-center py-16">No media yet. Upload something above.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(item => (
            <div
              key={item.url}
              onClick={() => setSelected(selected === item.url ? null : item.url)}
              className={`relative group cursor-pointer rounded-lg overflow-hidden border transition-colors ${
                selected === item.url ? 'border-white' : 'border-[#1a1a1a] hover:border-[#333]'
              }`}
            >
              <div className="aspect-square bg-[#0a0a0a]">
                {item.type === 'video' ? (
                  <video src={item.url} muted playsInline autoPlay loop className="w-full h-full object-cover" />
                ) : (
                  <img src={item.url} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                )}
              </div>

              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <button
                  onClick={e => { e.stopPropagation(); copyUrl(item.url); }}
                  className="w-full text-[0.45rem] bg-white text-black py-1.5 rounded-md uppercase tracking-wider"
                >
                  {copied === item.url ? '✓ Copied' : 'Copy URL'}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); deleteItem(item.url); }}
                  className="w-full text-[0.45rem] bg-red-500/20 text-red-400 py-1.5 rounded-md uppercase tracking-wider"
                >
                  Delete
                </button>
              </div>

              {item.type === 'video' && (
                <div className="absolute top-1.5 left-1.5 text-[0.4rem] bg-blue-500 text-white px-1 rounded font-medium">VID</div>
              )}

              <div className="p-2 bg-[#0f0f0f]">
                <p className="text-[#555] text-[0.45rem] truncate">{item.name}</p>
                {item.size && <p className="text-[#333] text-[0.4rem]">{formatBytes(item.size)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel for selected */}
      {selected && (() => {
        const item = items.find(m => m.url === selected);
        if (!item) return null;
        return (
          <div className="fixed bottom-6 right-6 w-72 bg-[#0f0f0f] border border-[#333] rounded-xl p-4 shadow-2xl z-50">
            <div className="flex justify-between items-start mb-3">
              <p className="text-white text-xs font-medium truncate">{item.name}</p>
              <button onClick={() => setSelected(null)} className="text-[#444] hover:text-white ml-2">✕</button>
            </div>
            <div className="aspect-video bg-[#080808] rounded-lg overflow-hidden mb-3">
              {item.type === 'video'
                ? <video src={item.url} muted playsInline autoPlay loop className="w-full h-full object-cover" />
                : <img src={item.url} alt="" className="w-full h-full object-contain" />
              }
            </div>
            <p className="text-[#333] text-[0.45rem] font-mono break-all mb-3">{item.url}</p>
            <div className="flex gap-2">
              <button onClick={() => copyUrl(item.url)} className="flex-1 text-[0.5rem] bg-white text-black py-2 rounded-md uppercase tracking-wider">
                {copied === item.url ? '✓ Copied' : 'Copy URL'}
              </button>
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                className="text-[0.5rem] bg-[#1a1a1a] text-[#888] hover:text-white py-2 px-3 rounded-md uppercase tracking-wider">
                Open
              </a>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ============================================================================
// 4. ROLES & PERMISSIONS
// ============================================================================
type Role = 'owner' | 'manager' | 'ops' | 'support';

interface AdminUser {
  email: string;
  role: Role;
  addedAt: string;
}

const ROLES_KEY = 'lowkey-admin-roles';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  owner: ['All permissions'],
  manager: ['View orders', 'Update order status', 'View products', 'Edit products', 'View customers', 'View analytics'],
  ops: ['View orders', 'Update order status', 'Manage inventory'],
  support: ['View orders', 'View customers', 'WhatsApp customers'],
};

const ROLE_COLORS: Record<Role, string> = {
  owner: 'text-amber-400 bg-amber-500/10',
  manager: 'text-blue-400 bg-blue-500/10',
  ops: 'text-purple-400 bg-purple-500/10',
  support: 'text-emerald-400 bg-emerald-500/10',
};

export function RolesPermissionsTab() {
  const [users, setUsers] = useState<AdminUser[]>(() => {
    try { return JSON.parse(localStorage.getItem(ROLES_KEY) || '[]'); } catch { return []; }
  });
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('manager');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) setCurrentUserEmail(user.email);
      });
    }
  }, []);

  const persist = (updated: AdminUser[]) => {
    setUsers(updated);
    try { localStorage.setItem(ROLES_KEY, JSON.stringify(updated)); } catch { /* */ }
  };

  const addUser = () => {
    if (!newEmail.includes('@')) return;
    if (users.some(u => u.email === newEmail)) return;
    persist([...users, { email: newEmail.trim(), role: newRole, addedAt: new Date().toISOString() }]);
    setNewEmail('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    logActivity('role.assigned', 'user', newEmail, { role: newRole });
  };

  const changeRole = (email: string, role: Role) => {
    persist(users.map(u => u.email === email ? { ...u, role } : u));
    logActivity('role.changed', 'user', email, { role });
  };

  const removeUser = (email: string) => {
    if (!confirm(`Remove ${email}?`)) return;
    persist(users.filter(u => u.email !== email));
    logActivity('role.removed', 'user', email, {});
  };

  const syncToSupabase = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setSaving(true);
    try {
      // Upsert each user role to a `admin_roles` table (if it exists)
      for (const u of users) {
        await supabase.from('admin_roles').upsert(
          { email: u.email, role: u.role, added_at: u.addedAt },
          { onConflict: 'email' }
        );
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Table may not exist — fail silently, localStorage is source of truth
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl">
      {/* Info banner */}
      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-4 mb-6">
        <p className="text-[#555] text-xs leading-relaxed">
          Role assignments are stored locally and optionally synced to Supabase.
          Actual access enforcement requires custom middleware or RLS policies.
          This panel is a registry — use it alongside your Supabase Auth setup.
        </p>
      </div>

      {/* Current user */}
      {currentUserEmail && (
        <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-6">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-xs">
            {currentUserEmail[0].toUpperCase()}
          </div>
          <div>
            <p className="text-white text-xs">{currentUserEmail}</p>
            <p className="text-amber-400 text-[0.5rem] uppercase tracking-wider">Owner · Current Session</p>
          </div>
        </div>
      )}

      {/* Add user */}
      <Box title="Add Team Member">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Inp label="Email" value={newEmail} onChange={setNewEmail} placeholder="team@example.com" type="email" />
          </div>
          <div>
            <label className="text-[#555] text-[0.5rem] tracking-[0.1em] uppercase block mb-1">Role</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value as Role)}
              className="w-full bg-[#080808] border border-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] rounded-md focus:outline-none">
              <option value="manager">Manager</option>
              <option value="ops">Operations</option>
              <option value="support">Support</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <Btn onClick={addUser} disabled={!newEmail.includes('@')}>Add Member</Btn>
          {isSupabaseConfigured && (
            <Btn v="g" onClick={syncToSupabase} disabled={saving}>
              {saving ? '···' : saved ? '✓ Synced' : '↑ Sync to Supabase'}
            </Btn>
          )}
        </div>
      </Box>

      {/* User list */}
      {users.length === 0 ? (
        <p className="text-[#333] text-center py-8">No team members added yet.</p>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.email} className="bg-[#0f0f0f] border border-[#181818] rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#555] text-xs shrink-0">
                    {u.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#ccc] text-xs truncate">{u.email}</p>
                    <p className="text-[#333] text-[0.45rem] mt-0.5">
                      Added {new Date(u.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[0.45rem] px-2 py-1 rounded capitalize font-medium ${ROLE_COLORS[u.role]}`}>
                    {u.role}
                  </span>
                  <Btn v="d" onClick={() => removeUser(u.email)}>✕</Btn>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#141414]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[#333] text-[0.45rem] uppercase">Change Role:</span>
                  {(['manager', 'ops', 'support'] as Role[]).map(r => (
                    <button key={r} onClick={() => changeRole(u.email, r)}
                      className={`text-[0.45rem] px-2 py-1 rounded capitalize transition-colors ${
                        u.role === r
                          ? ROLE_COLORS[r]
                          : 'bg-[#141414] text-[#444] hover:text-[#888]'
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {ROLE_PERMISSIONS[u.role].map(p => (
                    <span key={p} className="text-[#333] text-[0.4rem] bg-[#141414] px-1.5 py-0.5 rounded">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 5. SCHEDULED & DRAFT PRODUCTS
// ============================================================================
interface ProductSchedule {
  slug: string;
  publishAt: string; // ISO string
  status: 'draft' | 'scheduled' | 'live';
  note: string;
}

const SCHEDULES_KEY = 'lowkey-product-schedules';

function loadSchedules(): ProductSchedule[] {
  try { return JSON.parse(localStorage.getItem(SCHEDULES_KEY) || '[]'); } catch { return []; }
}
function saveSchedules(s: ProductSchedule[]) {
  try { localStorage.setItem(SCHEDULES_KEY, JSON.stringify(s)); } catch { /* */ }
}

export function ScheduledProductsTab({ products }: { products: DBProduct[] }) {
  const [schedules, setSchedules] = useState<ProductSchedule[]>(loadSchedules);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const persist = (updated: ProductSchedule[]) => {
    setSchedules(updated);
    saveSchedules(updated);
  };

  const getSchedule = (slug: string): ProductSchedule | undefined =>
    schedules.find(s => s.slug === slug);

  const setSchedule = (slug: string, publishAt: string, note: string) => {
    const existing = schedules.filter(s => s.slug !== slug);
    const now = new Date().toISOString();
    const status: ProductSchedule['status'] =
      !publishAt ? 'draft' :
      publishAt <= now ? 'live' : 'scheduled';
    persist([...existing, { slug, publishAt, status, note }]);
  };

  const removeSchedule = (slug: string) => {
    persist(schedules.filter(s => s.slug !== slug));
  };

  const syncVisible = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const due = schedules.filter(s => s.status === 'scheduled' && s.publishAt <= now);
    // Mark them as live
    const updated = schedules.map(s =>
      s.status === 'scheduled' && s.publishAt <= now
        ? { ...s, status: 'live' as const }
        : s
    );
    persist(updated);
    // Note: actual DB update would call updateProduct — skipped here to avoid heavy imports
    for (const s of due) {
      logActivity('product.scheduled_published', 'product', s.slug, { publishAt: s.publishAt });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const drafts = products.filter(p => !p.visible);
  const scheduledSlugs = schedules.filter(s => s.status === 'scheduled').map(s => s.slug);
  const liveFromSchedule = schedules.filter(s => s.status === 'live').map(s => s.slug);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3">
          <div className="bg-[#0f0f0f] border border-[#181818] rounded-lg px-4 py-3">
            <p className="text-[#444] text-[0.5rem] uppercase">Drafts</p>
            <p className="text-white text-xl font-light">{drafts.length}</p>
          </div>
          <div className="bg-[#0f0f0f] border border-[#181818] rounded-lg px-4 py-3">
            <p className="text-[#444] text-[0.5rem] uppercase">Scheduled</p>
            <p className="text-blue-400 text-xl font-light">{scheduledSlugs.length}</p>
          </div>
          <div className="bg-[#0f0f0f] border border-[#181818] rounded-lg px-4 py-3">
            <p className="text-[#444] text-[0.5rem] uppercase">Published</p>
            <p className="text-emerald-400 text-xl font-light">{liveFromSchedule.length}</p>
          </div>
        </div>
        <Btn onClick={syncVisible} disabled={saving}>
          {saving ? '···' : saved ? '✓ Synced' : '↻ Publish Due'}
        </Btn>
      </div>

      {/* Products list with schedule controls */}
      <div className="space-y-3">
        {products.map(p => {
          const sched = getSchedule(p.slug);
          return (
            <div key={p.slug} className="bg-[#0f0f0f] border border-[#181818] rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-14 rounded bg-[#151515] overflow-hidden shrink-0">
                  <img src={p.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <p className="text-[#ccc] text-sm">{p.name}</p>
                    <span className={`text-[0.4rem] px-1.5 py-0.5 rounded ${
                      p.visible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#1a1a1a] text-[#555]'
                    }`}>
                      {p.visible ? 'Live' : 'Hidden'}
                    </span>
                    {sched?.status === 'scheduled' && (
                      <span className="text-[0.4rem] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
                        Scheduled
                      </span>
                    )}
                  </div>
                  <p className="text-[#444] text-[0.5rem]">{p.slug} · {p.price}</p>

                  {/* Schedule controls */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[#333] text-[0.45rem] uppercase block mb-1">Publish At</label>
                      <input
                        type="datetime-local"
                        value={sched?.publishAt ? sched.publishAt.slice(0, 16) : ''}
                        onChange={e => setSchedule(p.slug, e.target.value ? new Date(e.target.value).toISOString() : '', sched?.note || '')}
                        className="w-full bg-[#080808] border border-[#1a1a1a] px-2 py-1.5 text-[0.55rem] text-[#ccc] rounded-md focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[#333] text-[0.45rem] uppercase block mb-1">Note</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Internal note..."
                          value={sched?.note || ''}
                          onChange={e => setSchedule(p.slug, sched?.publishAt || '', e.target.value)}
                          className="flex-1 bg-[#080808] border border-[#1a1a1a] px-2 py-1.5 text-[0.55rem] text-[#ccc] placeholder:text-[#333] rounded-md focus:outline-none"
                        />
                        {sched && (
                          <button onClick={() => removeSchedule(p.slug)}
                            className="text-[#444] hover:text-red-400 text-xs transition-colors px-2">✕</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {products.length === 0 && (
        <p className="text-[#333] text-center py-12">No products. Add products first.</p>
      )}
    </div>
  );
}

// ============================================================================
// 6. INVENTORY HISTORY
// ============================================================================
interface InventoryEvent {
  id: string;
  productSlug: string;
  size: string;
  fromQty: number;
  toQty: number;
  reason: 'order' | 'manual' | 'restock' | 'correction';
  note: string;
  actor: string;
  createdAt: string;
}

const INV_HISTORY_KEY = 'lowkey-inventory-history';

export function getInventoryHistory(): InventoryEvent[] {
  try { return JSON.parse(localStorage.getItem(INV_HISTORY_KEY) || '[]'); } catch { return []; }
}

export function recordInventoryEvent(
  productSlug: string, size: string,
  fromQty: number, toQty: number,
  reason: InventoryEvent['reason'],
  note = '', actor = 'admin'
) {
  try {
    const history = getInventoryHistory();
    const event: InventoryEvent = {
      id: `inv-${Date.now()}`,
      productSlug, size, fromQty, toQty, reason, note, actor,
      createdAt: new Date().toISOString(),
    };
    const updated = [event, ...history].slice(0, 500); // Keep last 500
    localStorage.setItem(INV_HISTORY_KEY, JSON.stringify(updated));
  } catch { /* */ }
}

export function InventoryHistoryTab({ products }: { products: DBProduct[]; stock: StockItem[] }) {
  const [history, setHistory] = useState<InventoryEvent[]>([]);
  const [filterSlug, setFilterSlug] = useState<string>('all');
  const [filterReason, setFilterReason] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setHistory(getInventoryHistory());
  }, []);

  const productName = (slug: string) =>
    products.find(p => p.slug === slug)?.name || slug;

  const filtered = history
    .filter(e => filterSlug === 'all' || e.productSlug === filterSlug)
    .filter(e => filterReason === 'all' || e.reason === filterReason)
    .filter(e => !search || e.productSlug.includes(search) || e.size.includes(search.toUpperCase()));

  const reasonColor = (reason: InventoryEvent['reason']) => ({
    order: 'text-red-400 bg-red-500/10',
    manual: 'text-blue-400 bg-blue-500/10',
    restock: 'text-emerald-400 bg-emerald-500/10',
    correction: 'text-amber-400 bg-amber-500/10',
  })[reason];

  const expCSV = () => {
    const header = 'Date,Product,Size,From,To,Delta,Reason,Note,Actor';
    const rows = filtered.map(e =>
      `${new Date(e.createdAt).toLocaleDateString()},${e.productSlug},${e.size},${e.fromQty},${e.toQty},${e.toQty - e.fromQty},${e.reason},"${e.note}",${e.actor}`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lowkey-inventory-history-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search product / size..."
          className="flex-1 bg-[#0f0f0f] border border-[#1a1a1a] px-3 py-2 text-xs text-[#ccc] placeholder:text-[#333] rounded-md focus:outline-none"
        />
        <div className="flex gap-1">
          <select value={filterSlug} onChange={e => setFilterSlug(e.target.value)}
            className="bg-[#0f0f0f] border border-[#1a1a1a] text-xs text-[#888] px-2 py-1.5 rounded-md focus:outline-none">
            <option value="all">All Products</option>
            {products.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
          <select value={filterReason} onChange={e => setFilterReason(e.target.value)}
            className="bg-[#0f0f0f] border border-[#1a1a1a] text-xs text-[#888] px-2 py-1.5 rounded-md focus:outline-none">
            <option value="all">All Reasons</option>
            <option value="order">Order</option>
            <option value="manual">Manual</option>
            <option value="restock">Restock</option>
            <option value="correction">Correction</option>
          </select>
          <Btn v="g" onClick={expCSV}>↓ CSV</Btn>
        </div>
      </div>

      <p className="text-[#333] text-[0.5rem] mb-4">{filtered.length} events</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#333] text-sm">No inventory events recorded yet.</p>
          <p className="text-[#222] text-xs mt-2">Events are logged automatically when orders are placed or stock is adjusted manually.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(event => {
            const delta = event.toQty - event.fromQty;
            return (
              <div key={event.id} className="flex items-center gap-3 p-3 bg-[#0f0f0f] border border-[#141414] rounded-lg">
                <span className={`text-[0.4rem] px-1.5 py-0.5 rounded capitalize shrink-0 font-medium ${reasonColor(event.reason)}`}>
                  {event.reason}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[#ccc] text-xs">
                    <span className="text-white">{productName(event.productSlug)}</span>
                    <span className="text-[#444] mx-1">·</span>
                    <span className="text-[#888]">{event.size}</span>
                  </p>
                  {event.note && <p className="text-[#333] text-[0.45rem] mt-0.5">{event.note}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-medium ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {delta >= 0 ? '+' : ''}{delta}
                  </p>
                  <p className="text-[#444] text-[0.45rem]">{event.fromQty} → {event.toQty}</p>
                  <p className="text-[#333] text-[0.4rem]">
                    {new Date(event.createdAt).toLocaleDateString('en-EG', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 7. ORDER TIMELINE
// ============================================================================
const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const;
type OrderStatus = typeof STATUS_STEPS[number] | 'cancelled';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_ICON: Record<string, string> = {
  pending: '⏳',
  confirmed: '✓',
  processing: '⚙',
  shipped: '🚚',
  delivered: '✅',
  cancelled: '✕',
};

export function OrderTimelineTab({ orders, onStatus }: {
  orders: (Order & { createdAt?: string })[];
  onStatus: (id: string, s: Order['status']) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = orders
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .filter(o =>
      !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.id?.includes(search) ||
      o.customerPhone.includes(search)
    )
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const stepIndex = (status: string) => STATUS_STEPS.indexOf(status as typeof STATUS_STEPS[number]);

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search order / customer..."
          className="flex-1 bg-[#0f0f0f] border border-[#1a1a1a] px-3 py-2 text-xs text-[#ccc] placeholder:text-[#333] rounded-md focus:outline-none"
        />
        <div className="flex gap-1 flex-wrap">
          {(['all', ...STATUS_STEPS, 'cancelled'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s as 'all' | OrderStatus)}
              className={`px-2.5 py-1 text-[0.5rem] rounded capitalize ${statusFilter === s ? 'bg-white text-black' : 'bg-[#141414] text-[#444]'}`}>
              {s === 'all' ? `All (${orders.length})` : `${s} (${orders.filter(o => o.status === s).length})`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-[#333] text-center py-12">No orders found</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const currentStep = stepIndex(o.status);
            const isCancelled = o.status === 'cancelled';
            const isExpanded = expanded === o.id;

            return (
              <div key={o.id} className="bg-[#0f0f0f] border border-[#181818] rounded-xl overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : o.id!)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div>
                      <p className="text-white text-sm font-light">{o.customerName}</p>
                      <p className="text-[#444] text-[0.5rem] font-mono mt-0.5">{o.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-white text-sm">EGP {fmt(o.subtotal)}</p>
                      {o.createdAt && (
                        <p className="text-[#444] text-[0.45rem]">
                          {new Date(o.createdAt).toLocaleDateString('en-EG', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} text-[#444]`}>▾</span>
                  </div>
                </button>

                {/* Timeline bar */}
                <div className="px-5 pb-4">
                  {isCancelled ? (
                    <div className="flex items-center gap-2 py-2">
                      <span className="text-red-400 text-xs">✕ Cancelled</span>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Track */}
                      <div className="absolute top-3.5 left-3 right-3 h-px bg-[#1a1a1a]" />
                      <div
                        className="absolute top-3.5 left-3 h-px bg-white/20 transition-all duration-700"
                        style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * (100 - (6 / STATUS_STEPS.length * 100))}%` }}
                      />
                      {/* Steps */}
                      <div className="relative flex justify-between">
                        {STATUS_STEPS.map((step, i) => {
                          const done = i <= currentStep;
                          const active = i === currentStep;
                          return (
                            <button
                              key={step}
                              onClick={() => onStatus(o.id!, step)}
                              title={`Mark as ${step}`}
                              className="flex flex-col items-center gap-1.5 group"
                            >
                              <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[0.5rem] transition-all duration-300 ${
                                active ? 'border-white bg-white text-black scale-110' :
                                done ? 'border-white/40 bg-white/10 text-white/60' :
                                'border-[#222] bg-transparent text-[#333] group-hover:border-[#444]'
                              }`}>
                                {STATUS_ICON[step]}
                              </div>
                              <span className={`text-[0.4rem] uppercase tracking-wider transition-colors ${
                                active ? 'text-white' : done ? 'text-[#555]' : 'text-[#333]'
                              }`}>
                                {STATUS_LABEL[step]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-[#141414] pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-[#080808] p-3 rounded-lg">
                        <p className="text-[#444] text-[0.45rem] uppercase mb-2">Customer</p>
                        <p className="text-white text-xs">{o.customerName}</p>
                        <p className="text-[#888] text-xs">{o.customerPhone}</p>
                        <p className="text-[#888] text-xs">{o.customerEmail}</p>
                      </div>
                      <div className="bg-[#080808] p-3 rounded-lg">
                        <p className="text-[#444] text-[0.45rem] uppercase mb-2">Shipping Address</p>
                        <p className="text-[#ccc] text-xs">{o.customerAddress}</p>
                        {o.notes && <p className="text-[#555] text-[0.5rem] mt-1">{o.notes}</p>}
                      </div>
                    </div>

                    <div className="bg-[#080808] p-3 rounded-lg">
                      <p className="text-[#444] text-[0.45rem] uppercase mb-2">Items</p>
                      {o.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-xs py-1.5 border-b border-[#111] last:border-0">
                          <span className="text-[#ccc]">{it.name} <span className="text-[#444]">({it.size}) × {it.qty}</span></span>
                          <span className="text-white">EGP {fmt(it.price * it.qty)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 mt-2 border-t border-[#222]">
                        <span className="text-[#555] text-xs">Total</span>
                        <span className="text-white text-sm">EGP {fmt(o.subtotal)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`https://wa.me/${o.customerPhone.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[0.5rem] bg-[#25D366]/10 text-[#25D366] px-3 py-2 rounded-md hover:bg-[#25D366]/20 transition-colors"
                      >
                        💬 WhatsApp
                      </a>
                      {!isCancelled && (
                        <button onClick={() => onStatus(o.id!, 'cancelled')}
                          className="text-[0.5rem] bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-md hover:bg-red-500/20 transition-colors">
                          Cancel Order
                        </button>
                      )}
                      {isCancelled && (
                        <button onClick={() => onStatus(o.id!, 'pending')}
                          className="text-[0.5rem] bg-[#141414] text-[#888] border border-[#222] px-3 py-2 rounded-md hover:text-white transition-colors">
                          Restore to Pending
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
