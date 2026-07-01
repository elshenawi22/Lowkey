import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import AdminDashboardTab from '../admin/DashboardTab';
import { CommandPalette, ToastContainer, type Command, toast } from '../admin/ui';
import { logActivity } from '../admin/activityLog';
import { loadContent, saveContent, dispatchCMSUpdate, defaultContent, type SiteContent } from '../lib/cms';
import { getAllProducts, createProduct, updateProduct, deleteProduct, type DBProduct } from '../lib/products-db';
import { loadInventory, updateStock, type StockItem } from '../lib/inventory';
import { uploadImage, type UploadedMedia } from '../lib/media-upload';
import { getOrders, getOrderErrors, syncLocalOrdersToSupabase } from '../lib/orders';
import type { Order } from '../lib/database.types';
import { getDiscounts, saveDiscount, deleteDiscount, type DiscountCode } from '../lib/discounts';
import { getCollections, createCollection, updateCollection, deleteCollection, setCollectionLive, type Collection, type CollectionStatus } from '../lib/collections';
import { getReviews, setReviewFeatured, deleteReview, type Review } from '../lib/reviews';

interface Sub { email: string; source: string; createdAt?: string }
type Tab = 'dash' | 'orders' | 'collections' | 'products' | 'content' | 'customers' | 'discounts' | 'reviews' | 'settings';
const fmt = (n: number) => n.toLocaleString('en-EG');

// ================================================
// MAIN
// ================================================
export default function AdminPage() {
  // Real Supabase Auth session — not a client-side password flag.
  // `null` = not checked yet, `false` = checked & not logged in, Session = logged in.
  const [session, setSession] = useState<Session | null | false>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const auth = !!session;
  const [tab, setTab] = useState<Tab>('dash');
  const [orders, setOrders] = useState<(Order & { createdAt?: string })[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [cols, setCols] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [sb, setSb] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [prods, inv, allOrders, allCols] = await Promise.all([getAllProducts(), loadInventory(), getOrders(), getCollections()]);
    setCols(allCols);
    setProducts(prods); setStock(inv); setOrders(allOrders);
    // Update products cache for getProductImages
    try {
      const visibleProds = prods.filter(p => p.visible);
      localStorage.setItem('lowkey-products-cache', JSON.stringify(visibleProds.map(p => ({
        slug: p.slug, image: p.image, images: p.images,
      }))));
    } catch { /* */ }

    // Subscribers
    let allSubs: Sub[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.from('subscribers').select('*').order('created_at', { ascending: false });
        if (data) allSubs = data.map((r: any) => ({ email: r.email, source: r.source, createdAt: r.created_at }));
      } catch { /* ignore */ }
    }
    try {
      const local = localStorage.getItem('lowkey-subscribers');
      if (local) {
        const parsed: Sub[] = JSON.parse(local);
        const existing = new Set(allSubs.map(s => s.email));
        parsed.forEach(s => { if (!existing.has(s.email)) allSubs.push(s); });
      }
    } catch { /* ignore */ }
    setSubs(allSubs);
    setLoading(false);
  }, []);

  useEffect(() => { if (auth) load(); }, [auth, load]);

  // Real auth: check current session on mount, then listen for changes.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSession(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? false));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoggingIn(true);
    setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: pwd });
    setLoggingIn(false);
    if (error) {
      setErr('بيانات الدخول غير صحيحة');
      return;
    }
    setPwd('');
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  // Order actions
  const updStatus = async (id: string, s: Order['status'], silent = false) => {
    if (isSupabaseConfigured && supabase) await supabase.from('orders').update({ status: s }).eq('id', id);
    setOrders(p => p.map(o => o.id === id ? { ...o, status: s } : o));
    if (!silent) {
      logActivity('order.status_changed', 'order', id, { to: s });
      toast(`Order ${id} marked ${s}`);
    }
  };
  const delOrder = async (id: string, silent = false) => {
    if (!silent && !confirm('Delete?')) return;
    if (isSupabaseConfigured && supabase) await supabase.from('orders').delete().eq('id', id);
    setOrders(p => p.filter(o => o.id !== id));
    if (!silent) {
      logActivity('order.deleted', 'order', id);
      toast(`Order ${id} deleted`, 'info');
    }
  };

  // Still resolving the session — avoid flashing the login form.
  if (session === null) {
    return <main className="min-h-screen bg-[#080808]" />;
  }

  // Login
  if (!auth) return (
    <main className="min-h-screen bg-[#080808] flex items-center justify-center px-6">
      <form onSubmit={handleLogin} className="w-full max-w-xs text-center">
        <p className="text-white text-lg tracking-[0.5em] font-light mb-10">LOWKEY</p>
        <input type="email" autoComplete="username" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="Email" className="w-full bg-transparent border border-[#1a1a1a] py-3.5 px-4 text-white text-center text-sm placeholder:text-[#222] focus:outline-none focus:border-[#333] rounded-lg mb-3" />
        <input type="password" autoComplete="current-password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••" className="w-full bg-transparent border border-[#1a1a1a] py-3.5 px-4 text-white text-center text-sm tracking-[0.4em] placeholder:text-[#222] focus:outline-none focus:border-[#333] rounded-lg" />
        {err && <p className="text-red-500/50 text-xs mt-2">{err}</p>}
        <button disabled={loggingIn} className="w-full mt-4 bg-white text-[#080808] py-3 text-[0.6rem] tracking-[0.3em] uppercase rounded-lg disabled:opacity-50">{loggingIn ? '···' : 'Enter'}</button>
      </form>
    </main>
  );

  // Stats
  const pend = orders.filter(o => o.status === 'pending').length;
  const rev = orders.filter(o => ['confirmed', 'shipped', 'delivered'].includes(o.status)).reduce((s, o) => s + o.subtotal, 0);

  const navs: { id: Tab; icon: string; label: string; badge?: number }[] = [
    { id: 'dash', icon: '◐', label: 'Dashboard' },
    { id: 'orders', icon: '☰', label: 'Orders', badge: pend || undefined },
    { id: 'collections', icon: '◈', label: 'Collections' },
    { id: 'products', icon: '◫', label: 'Products' },
    { id: 'content', icon: '✎', label: 'Content' },
    { id: 'customers', icon: '◉', label: 'Customers' },
    { id: 'discounts', icon: '✂', label: 'Discounts' },
    { id: 'reviews', icon: '★', label: 'Reviews' },
    { id: 'settings', icon: '⚙', label: 'Settings' },
  ];

  const commands: Command[] = [
    ...navs.map(n => ({ id: `nav-${n.id}`, icon: n.icon, label: `Go to ${n.label}`, action: () => setTab(n.id) })),
    { id: 'refresh', icon: '↻', label: 'Refresh Data', action: () => load() },
    { id: 'logout', icon: '⏻', label: 'Sign Out', action: () => handleLogout() },
  ];

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[#999] flex">
      {sb && <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setSb(false)} />}
      <aside className={`fixed lg:static z-50 top-0 left-0 h-full w-52 bg-[#080808] border-r border-[#141414] flex flex-col transition-transform duration-300 ${sb ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-[#141414]"><p className="text-white text-xs tracking-[0.4em]">LOWKEY</p><p className="text-[#333] text-[0.45rem] tracking-[0.2em] mt-0.5">ADMIN</p></div>
        <nav className="flex-1 py-2">{navs.map(n => (
          <button key={n.id} onClick={() => { setTab(n.id); setSb(false); }} className={`w-full flex items-center gap-3 px-5 py-2.5 text-xs transition-all ${tab === n.id ? 'text-white bg-white/5' : 'text-[#444] hover:text-[#888] hover:bg-white/[0.02]'}`}>
            <span className="w-4 text-center opacity-50">{n.icon}</span><span className="tracking-wide">{n.label}</span>
            {n.badge && <span className="ml-auto bg-amber-500 text-black text-[0.45rem] w-4 h-4 rounded-full flex items-center justify-center">{n.badge}</span>}
          </button>
        ))}</nav>
        <div className="p-4 border-t border-[#141414] flex justify-between items-center">
          <span className="text-[#333] text-[0.5rem]">{isSupabaseConfigured ? '● Live' : '○ Local'}</span>
          <button onClick={handleLogout} className="text-[#333] text-[0.5rem] hover:text-white">Logout</button>
        </div>
      </aside>

      <main className="flex-1 min-h-screen overflow-y-auto">
        <header className="sticky top-0 z-30 bg-[#0b0b0b]/95 backdrop-blur-sm border-b border-[#141414] px-4 md:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSb(true)} className="lg:hidden text-[#444]"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.2" /></svg></button>
            <span className="text-white text-xs tracking-wide">{navs.find(n => n.id === tab)?.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setPaletteOpen(true)} className="hidden md:flex items-center gap-2 text-[#444] hover:text-[#888] text-[0.6rem] border border-[#1a1a1a] rounded-md px-2.5 py-1 transition-colors">
              <span>⌘K</span><span className="text-[#333]">Search</span>
            </button>
            <button onClick={load} disabled={loading} className="text-[#333] hover:text-white text-xs">{loading ? '···' : '↻'}</button>
          </div>
        </header>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
        <ToastContainer />

        <div className="p-4 md:p-6">
          {tab === 'dash' && <DashboardTab products={products} stock={stock} />}
          {tab === 'orders' && <OrdersTab orders={orders} onStatus={updStatus} onDelete={delOrder} />}
          {tab === 'collections' && <CollectionsTab collections={cols} onReload={load} onUpload={async f => { return await uploadImage(f); }} />}
          {tab === 'products' && <ProductsTab products={products} stock={stock} onReload={load} onUpload={async f => { return await uploadImage(f); }} onUpdateStock={(s, z, q) => { updateStock(s, z, q); setStock(p => { const n = [...p]; const i = n.findIndex(x => x.productSlug === s && x.size === z); if (i >= 0) n[i].quantity = q; else n.push({ productSlug: s, size: z, quantity: q }); return n; }); }} />}
          {tab === 'content' && <ContentTab onUpload={async f => { return await uploadImage(f); }} />}
          {tab === 'customers' && <CustomersTab orders={orders} subs={subs} />}
          {tab === 'discounts' && <DiscountsTab />}
          {tab === 'reviews' && <ReviewsTab />}
          {tab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}

// ================================================
// UI PRIMITIVES
// ================================================
function Box({ children, title, action }: { children: React.ReactNode; title?: string; action?: React.ReactNode }) {
  return <div className="bg-[#0f0f0f] border border-[#181818] rounded-lg p-5 mb-4">
    {(title || action) && <div className="flex items-center justify-between mb-4">{title && <h3 className="text-white text-xs tracking-wide">{title}</h3>}{action}</div>}
    {children}
  </div>;
}
function Stat({ l, v, w, a }: { l: string; v: string | number; w?: boolean; a?: boolean }) {
  return <div className={`p-4 rounded-lg border ${w ? 'bg-amber-500/5 border-amber-500/15' : a ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-[#0f0f0f] border-[#181818]'}`}>
    <p className="text-[#444] text-[0.5rem] tracking-[0.1em] uppercase">{l}</p>
    <p className={`text-lg font-light mt-1 ${w ? 'text-amber-400' : a ? 'text-emerald-400' : 'text-white'}`}>{v}</p>
  </div>;
}
function Inp({ label, value, onChange, area, hint, type = 'text', onFileUpload }: { label: string; value: string; onChange: (v: string) => void; area?: boolean; hint?: string; type?: string; onFileUpload?: (f: File) => Promise<string | null> }) {
  const isUrl = label.toLowerCase().includes('image') || label.toLowerCase().includes('url') || label.toLowerCase().includes('video') || label.toLowerCase().includes('media');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onFileUpload || !e.target.files) return;
    setUploading(true);
    const urls: string[] = value ? value.split(',').map(u => u.trim()).filter(Boolean) : [];
    for (let i = 0; i < e.target.files.length; i++) {
      const url = await onFileUpload(e.target.files[i]);
      if (url) urls.push(url);
    }
    onChange(urls.join(','));
    setUploading(false);
    e.target.value = '';
  };

  return <div className="mb-3">
    <label className="text-[#555] text-[0.5rem] tracking-[0.1em] uppercase block mb-1">{label}</label>
    {area ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="w-full bg-[#080808] border border-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#333] rounded-md resize-none" />
      : <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#080808] border border-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] focus:outline-none focus:border-[#333] rounded-md" />}
    {isUrl && onFileUpload && <div className="flex gap-2 mt-2">
      <label className={`inline-flex items-center gap-1 cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
        <span className="text-[0.5rem] bg-[#1a1a1a] text-[#888] hover:text-white px-3 py-1.5 rounded-md transition-colors">{uploading ? '...' : '📷 Image'}</span>
        <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
      </label>
      <label className={`inline-flex items-center gap-1 cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
        <span className="text-[0.5rem] bg-[#1a1a1a] text-[#888] hover:text-white px-3 py-1.5 rounded-md transition-colors">{uploading ? '...' : '🎬 Video'}</span>
        <input type="file" accept="video/mp4,video/webm,video/*" onChange={handleUpload} className="hidden" disabled={uploading} />
      </label>
    </div>}
    {hint && <p className="text-[#222] text-[0.45rem] mt-0.5">{hint}</p>}
    {isUrl && value && <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
      {value.split(',').map((u, i) => {
        const url = u.trim(); if (!url) return null;
        const isVid = /\.(mp4|webm|mov|m4v)/i.test(url);
        return (
          <div key={i} className="relative group shrink-0">
            <div className="w-20 h-24 rounded-md bg-[#151515] overflow-hidden border border-[#222]">
              {isVid ? (
                <div className="w-full h-full relative">
                  <video src={url} muted playsInline autoPlay loop preload="auto" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="text-white text-[0.5rem]">▶</span></div>
                </div>
              ) : (
                <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.opacity = '0.2')} />
              )}
            </div>
            <button 
              type="button" 
              onClick={() => { const arr = value.split(',').map(x => x.trim()).filter(Boolean); arr.splice(i, 1); onChange(arr.join(', ')); }} 
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[0.5rem] rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(url); }}
              className="absolute bottom-1 right-1 bg-black/60 text-white/50 text-[0.4rem] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Link
            </button>
            <span className="absolute bottom-1 left-1 text-[0.4rem] bg-black/60 text-white/50 px-1 rounded">{i + 1}</span>
          </div>
        );
      })}
    </div>}
  </div>;
}
function Btn({ children, onClick, v = 'p', disabled, full }: { children: React.ReactNode; onClick?: () => void; v?: 'p' | 'g' | 'd'; disabled?: boolean; full?: boolean }) {
  const c = v === 'p' ? 'bg-white text-[#080808] hover:bg-white/90' : v === 'd' ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' : 'text-[#555] border border-[#222] hover:text-white';
  return <button onClick={onClick} disabled={disabled} className={`${c} text-[0.5rem] tracking-[0.15em] uppercase px-4 py-2 rounded-md transition-all disabled:opacity-30 ${full ? 'w-full' : ''}`}>{children}</button>;
}

// ================================================
// DASHBOARD
// ================================================
function DashboardTab({ products, stock }: { products: DBProduct[]; stock: StockItem[] }) {
  const cms = loadContent();
  const isLaunch = cms.launch_mode === 'on';
  const outStk = stock.filter(s => s.quantity <= 0).length;
  const lowStk = stock.filter(s => s.quantity > 0 && s.quantity <= 5).length;

  return <>
    {/* Launch Mode Banner */}
    {isLaunch && <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4 flex items-center justify-between">
      <div><p className="text-amber-400 text-sm">⏸ Launch Mode is ON</p><p className="text-[#666] text-xs mt-0.5">Visitors see "Coming Soon" page</p></div>
      <p className="text-amber-400/50 text-[0.5rem] tracking-wider uppercase">Go to Settings to disable</p>
    </div>}

    {/* Real analytics dashboard */}
    <AdminDashboardTab />

    {/* Inventory health quick-glance — kept from v1, still useful alongside analytics */}
    {(outStk > 0 || lowStk > 0) && (
      <div className="mt-4 bg-[#0f0f0f] border border-[#181818] rounded-lg p-4">
        <p className="text-[#555] text-[0.55rem] uppercase tracking-wider mb-3">Inventory Alerts</p>
        <div className="flex gap-4">
          {outStk > 0 && <p className="text-red-400 text-xs">{outStk} variant{outStk > 1 ? 's' : ''} out of stock</p>}
          {lowStk > 0 && <p className="text-amber-400 text-xs">{lowStk} variant{lowStk > 1 ? 's' : ''} running low</p>}
        </div>
      </div>
    )}
  </>;
}

// ================================================

// ================================================
// ORDERS — with bulk selection & actions
// ================================================
function OrdersTab({ orders, onStatus, onDelete }: { orders: (Order & { createdAt?: string })[]; onStatus: (id: string, s: Order['status'], silent?: boolean) => void; onDelete: (id: string, silent?: boolean) => void }) {
  const [f, setF] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const sts = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const fl = orders
    .filter(o => f === 'all' || o.status === f)
    .filter(o => !q || o.customerName.toLowerCase().includes(q.toLowerCase()) || o.id!.includes(q) || o.customerPhone.includes(q));

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(fl.map(o => o.id!)));
  const clearSelect = () => setSelected(new Set());
  const allSelected = fl.length > 0 && fl.every(o => selected.has(o.id!));
  const selectedOrders = fl.filter(o => selected.has(o.id!));

  const bulkStatus = async (newStatus: Order['status']) => {
    if (!selected.size || !confirm(`Change ${selected.size} orders to "${newStatus}"?`)) return;
    setBulkLoading(true);
    for (const id of selected) onStatus(id, newStatus, true);
    logActivity('order.bulk_status_changed', 'order', null, { count: selected.size, to: newStatus });
    toast(`${selected.size} orders updated to "${newStatus}"`, 'success');
    clearSelect(); setBulkLoading(false);
  };

  const bulkDelete = async () => {
    if (!selected.size || !confirm(`Delete ${selected.size} orders? Cannot be undone.`)) return;
    setBulkLoading(true);
    const count = selected.size;
    for (const id of selected) onDelete(id, true);
    logActivity('order.bulk_deleted', 'order', null, { count });
    toast(`${count} orders deleted`, 'warning');
    clearSelect(); setBulkLoading(false);
  };

  const expCSV = (subset: (Order & { createdAt?: string })[]) => {
    const header = 'ID,Date,Name,Phone,Email,Address,Items,Total,Status,Notes';
    const rows = subset.map(o => {
      const items = o.items.map(i => `${i.name}(${i.size})x${i.qty}`).join('; ');
      return `${o.id},${o.createdAt || ''},"${o.customerName}",${o.customerPhone},${o.customerEmail},"${o.customerAddress}","${items}",${o.subtotal},${o.status},"${o.notes || ''}"`;
    });
    const csv = [header, ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `lowkey-orders-${Date.now()}.csv`;
    a.click();
  };

  const printShipping = (o: Order & { createdAt?: string }) => {
    const items = o.items.map(i => `${i.name} (${i.size}) \u00d7 ${i.qty}`).join(' | ');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Shipping - ${o.id}</title><style>
      body{font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto}
      h1{font-size:18px;margin:0 0 5px}h2{font-size:14px;color:#666;margin:0 0 20px}
      table{width:100%;border-collapse:collapse}td{padding:8px 0;border-bottom:1px solid #eee;font-size:13px}
      .label{color:#999;width:120px;font-size:11px;text-transform:uppercase}
      .total{font-size:16px;font-weight:bold;border-top:2px solid #000;padding-top:12px}
      @media print{body{padding:20px}}
    </style></head><body>
      <h1>LOWKEY</h1><h2>Shipping Label \u2014 ${o.id}</h2>
      <table>
        <tr><td class="label">Order ID</td><td>${o.id}</td></tr>
        <tr><td class="label">Date</td><td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</td></tr>
        <tr><td class="label">Customer</td><td><strong>${o.customerName}</strong></td></tr>
        <tr><td class="label">Phone</td><td>${o.customerPhone}</td></tr>
        <tr><td class="label">Email</td><td>${o.customerEmail}</td></tr>
        <tr><td class="label">Address</td><td><strong>${o.customerAddress}</strong></td></tr>
        <tr><td class="label">Items</td><td>${items}</td></tr>
        <tr><td class="label">Notes</td><td>${o.notes || '-'}</td></tr>
        <tr><td class="label total">Total</td><td class="total">EGP ${o.subtotal.toLocaleString()}</td></tr>
      </table>
      <script>setTimeout(()=>window.print(),300)</script>
    </body></html>`);
    w.document.close();
  };

  return <div>
    {/* Filters */}
    <div className="flex flex-col md:flex-row gap-3 justify-between mb-3">
      <div className="flex gap-1 flex-wrap">
        {sts.map(s => <button key={s} onClick={() => { setF(s); clearSelect(); }} className={`px-2 py-1 text-[0.5rem] rounded capitalize ${f === s ? 'bg-white text-black' : 'bg-[#141414] text-[#444]'}`}>{s}{s !== 'all' ? ` ${orders.filter(x => x.status === s).length}` : ''}</button>)}
      </div>
      <div className="flex gap-2">
        <input value={q} onChange={e => { setQ(e.target.value); clearSelect(); }} placeholder="Search name / ID / phone\u2026" className="bg-[#0f0f0f] border border-[#1a1a1a] px-3 py-1.5 text-xs text-[#ccc] placeholder:text-[#222] rounded-md w-44 focus:outline-none" />
        <Btn v="g" onClick={() => expCSV(fl)}>Export CSV</Btn>
      </div>
    </div>

    {/* Bulk action bar */}
    {selected.size > 0 && (
      <div className="mb-3 flex flex-wrap items-center gap-2 bg-[#0d1a0d] border border-emerald-500/20 rounded-lg px-4 py-2.5">
        <span className="text-emerald-400 text-xs font-medium">{selected.size} selected</span>
        <div className="flex gap-1.5 flex-wrap ml-2">
          <Btn v="g" onClick={() => bulkStatus('confirmed')}>{bulkLoading ? '\u00b7\u00b7\u00b7' : '\u2713 Confirm'}</Btn>
          <Btn v="g" onClick={() => bulkStatus('shipped')}>\ud83d\ude9a Shipped</Btn>
          <Btn v="g" onClick={() => bulkStatus('delivered')}>\u2705 Delivered</Btn>
          <Btn v="g" onClick={() => expCSV(selectedOrders)}>CSV Selected</Btn>
          <Btn v="d" onClick={bulkDelete}>\ud83d\uddd1 Delete</Btn>
        </div>
        <button onClick={clearSelect} className="ml-auto text-[#555] text-xs hover:text-white">\u2715 Clear</button>
      </div>
    )}

    {/* Select all */}
    <div className="flex items-center gap-3 mb-2 px-1">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={allSelected} onChange={() => allSelected ? clearSelect() : selectAll()} className="accent-emerald-500 w-3 h-3" />
        <span className="text-[#444] text-[0.5rem]">{allSelected ? 'Deselect all' : `Select all ${fl.length}`}</span>
      </label>
      <span className="text-[#333] text-[0.5rem]">{fl.length} orders</span>
    </div>

    {/* List */}
    <div className="space-y-2">
      {fl.length === 0 ? <p className="text-[#333] text-center py-12">No orders</p> : fl.map(o => (
        <div key={o.id} className={`bg-[#0f0f0f] border rounded-lg transition-colors ${selected.has(o.id!) ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-[#181818]'}`}>
          <div className="flex items-center gap-3 px-4 py-3">
            <input type="checkbox" checked={selected.has(o.id!)} onChange={() => toggleSelect(o.id!)} onClick={e => e.stopPropagation()} className="accent-emerald-500 w-3 h-3 shrink-0 cursor-pointer" />
            <button className="flex-1 flex items-center justify-between text-left min-w-0" onClick={() => setOpen(open === o.id ? null : o.id!)}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-[0.45rem] px-1.5 py-0.5 rounded capitalize shrink-0 ${o.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : o.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' : o.status === 'cancelled' ? 'bg-red-500/10 text-red-400' : o.status === 'shipped' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-[#888]'}`}>{o.status}</span>
                <div className="min-w-0"><p className="text-sm text-[#ccc] truncate">{o.customerName}</p><p className="text-[0.45rem] text-[#333] font-mono">{o.id}</p></div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right"><p className="text-sm text-white">EGP {fmt(o.subtotal)}</p>{o.createdAt && <p className="text-[0.4rem] text-[#333]">{new Date(o.createdAt).toLocaleDateString('en-EG', { day: 'numeric', month: 'short' })}</p>}</div>
                <span className={`text-[#333] text-xs transition-transform duration-200 ${open === o.id ? 'rotate-180' : ''}`}>\u25be</span>
              </div>
            </button>
          </div>
          {open === o.id && <div className="px-4 pb-4 border-t border-[#141414] pt-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[#080808] p-3 rounded-lg"><p className="text-[0.45rem] text-[#444] uppercase mb-2">Customer</p><p className="text-sm text-white">{o.customerName}</p><p className="text-xs text-[#888] mt-1">{o.customerPhone}</p><p className="text-xs text-[#888]">{o.customerEmail}</p></div>
              <div className="bg-[#080808] p-3 rounded-lg"><p className="text-[0.45rem] text-[#444] uppercase mb-2">Shipping Address</p><p className="text-sm text-[#ccc]">{o.customerAddress}</p></div>
            </div>
            {o.notes && <div className="bg-[#080808] p-3 rounded-lg"><p className="text-[0.45rem] text-[#444] uppercase mb-1">Notes / Shipping</p><p className="text-xs text-[#ccc]">{o.notes}</p></div>}
            <div className="bg-[#080808] p-3 rounded-lg">
              <p className="text-[0.45rem] text-[#444] uppercase mb-2">Items</p>
              {o.items.map((it, i) => <div key={i} className="flex justify-between text-xs py-1.5 border-b border-[#111] last:border-0"><span className="text-[#ccc]">{it.name} <span className="text-[#555]">({it.size}) \u00d7 {it.qty}</span></span><span className="text-white">EGP {fmt(it.price * it.qty)}</span></div>)}
              <div className="flex justify-between text-sm pt-2 mt-2 border-t border-[#222]"><span className="text-[#888]">Total</span><span className="text-white font-medium">EGP {fmt(o.subtotal)}</span></div>
            </div>
            {o.createdAt && <p className="text-[0.45rem] text-[#333]">Ordered: {new Date(o.createdAt).toLocaleDateString('en-EG', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
            <div className="flex flex-wrap gap-2 pt-2">
              <select value={o.status} onChange={e => onStatus(o.id!, e.target.value as Order['status'])} className="bg-[#080808] border border-[#1a1a1a] text-[0.5rem] text-[#ccc] px-2 py-1.5 rounded-md focus:outline-none">{sts.filter(s => s !== 'all').map(s => <option key={s} value={s}>{s}</option>)}</select>
              <a href={`https://wa.me/${o.customerPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-[#25D366]/10 text-[#25D366] text-[0.5rem] px-3 py-1.5 rounded-md hover:bg-[#25D366]/20">\ud83d\udcac WhatsApp</a>
              <Btn v="g" onClick={() => printShipping(o)}>\ud83d\uddb8 Print Label</Btn>
              <Btn v="d" onClick={() => onDelete(o.id!)}>Delete</Btn>
            </div>
          </div>}
        </div>
      ))}
    </div>
  </div>;
}
// ================================================
// PRODUCTS (Full CRUD)
// ================================================
function ProductsTab({ products, stock, onReload, onUpload, onUpdateStock }: {
  products: DBProduct[]; stock: StockItem[];
  onReload: () => void;
  onUpload: (f: File) => Promise<UploadedMedia | null>;
  onUpdateStock: (slug: string, size: string, qty: number) => void;
}) {
  const [editing, setEditing] = useState<DBProduct | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const blank: DBProduct = { slug: '', name: '', category: '', price: '', priceValue: 0, image: '', images: '', fabric: '', weight: '', origin: 'Made in Port Said, Egypt', fit: '', intro: '', construction: '', sizes: ['S', 'M', 'L', 'XL'], visible: true, sortOrder: products.length + 1 };

  const handleSave = async (p: DBProduct, isNew: boolean) => {
    setSaving(true); setMsg('');
    const result = isNew ? await createProduct(p) : await updateProduct(p.slug, p);
    if (result.success) { setMsg('✓'); setEditing(null); setAdding(false); onReload(); setTimeout(() => setMsg(''), 2000); }
    else setMsg(result.error || 'Error');
    setSaving(false);
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete ${slug}?`)) return;
    const r = await deleteProduct(slug); if (r.success) onReload(); else alert(r.error);
  };

  const handleUpload = async (file: File): Promise<string> => {
    const r = await onUpload(file);
    return r?.url || '';
  };

  // Product Editor
  if (editing || adding) {
    const p = editing || blank;
    return <ProductEditor
      product={p} isNew={adding} saving={saving} msg={msg}
      stock={stock.filter(s => s.productSlug === p.slug)}
      onSave={updated => handleSave(updated, adding)}
      onCancel={() => { setEditing(null); setAdding(false); }}
      onUpload={handleUpload}
      onUpdateStock={onUpdateStock}
    />;
  }

  // Products List
  return <div>
    <div className="flex justify-between items-center mb-5">
      <p className="text-[#555] text-xs">{products.length} products</p>
      <div className="flex gap-2">
        {msg && <span className="text-emerald-400 text-xs">{msg}</span>}
        <Btn onClick={() => setAdding(true)}>+ Add Product</Btn>
      </div>
    </div>
    <div className="space-y-2">{products.map(p => (
      <div key={p.slug} className="bg-[#0f0f0f] border border-[#181818] rounded-lg p-4 flex gap-4 items-center">
        <div className="w-14 h-16 rounded-md bg-[#151515] overflow-hidden shrink-0"><img src={p.image} alt="" loading="lazy" className="w-full h-full object-cover" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-white truncate">{p.name}</p>
            {!p.visible && <span className="text-[0.4rem] px-1.5 py-0.5 rounded bg-[#222] text-[#666]">Hidden</span>}
          </div>
          <p className="text-[0.5rem] text-[#444] mt-0.5">{p.category} · {p.price}</p>
          <div className="flex gap-1 mt-2">{p.sizes.map(s => {
            const q = stock.find(x => x.productSlug === p.slug && x.size === s)?.quantity ?? 0;
            return <span key={s} className={`text-[0.4rem] px-1 py-0.5 rounded ${q <= 0 ? 'bg-red-500/10 text-red-400' : q <= 5 ? 'bg-amber-500/10 text-amber-400' : 'bg-[#141414] text-[#555]'}`}>{s}:{q}</span>;
          })}</div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Btn v="g" onClick={() => setEditing(p)}>Edit</Btn>
          <Btn v="d" onClick={() => handleDelete(p.slug)}>✕</Btn>
        </div>
      </div>
    ))}</div>
  </div>;
}

// ================================================
// PRODUCT EDITOR
// ================================================
function ProductEditor({ product, isNew, saving, msg, stock, onSave, onCancel, onUpload, onUpdateStock }: {
  product: DBProduct; isNew: boolean; saving: boolean; msg: string;
  stock: StockItem[];
  onSave: (p: DBProduct) => void; onCancel: () => void;
  onUpload: (f: File) => Promise<string>;
  onUpdateStock: (slug: string, size: string, qty: number) => void;
}) {
  const [p, setP] = useState({ ...product });
  const [uploading, setUploading] = useState(false);
  const upd = (k: keyof DBProduct, v: any) => setP(prev => ({ ...prev, [k]: v }));

  // Unified media list: main image first, then extras
  const allMedia: string[] = [];
  if (p.image) allMedia.push(p.image);
  if (p.images) p.images.split(',').map(u => u.trim()).filter(Boolean).forEach(u => { if (u !== p.image) allMedia.push(u); });

  const syncMedia = (urls: string[]) => {
    upd('image', urls[0] || '');
    upd('images', urls.slice(1).join(','));
  };

  const removeMedia = (idx: number) => { const arr = [...allMedia]; arr.splice(idx, 1); syncMedia(arr); };
  const moveMedia = (from: number, to: number) => {
    if (isNaN(from) || from < 0 || from >= allMedia.length) return;
    const arr = [...allMedia]; const [item] = arr.splice(from, 1); arr.splice(to, 0, item); syncMedia(arr);
  };

  const uploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    setUploading(true);
    const newUrls = [...allMedia];
    for (let i = 0; i < files.length; i++) {
      const url = await onUpload(files[i]);
      if (url) newUrls.push(url);
    }
    syncMedia(newUrls);
    setUploading(false);
    e.target.value = '';
  };

  return <div>
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="text-[#444] text-xs hover:text-white">← Back</button>
        <span className="text-white text-xs">{isNew ? 'Add Product' : `Edit: ${p.name}`}</span>
      </div>
      <div className="flex gap-2 items-center">
        {msg && <span className="text-emerald-400 text-xs">{msg}</span>}
        <Btn v="g" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => onSave(p)} disabled={saving || !p.name}>{saving ? '...' : 'Save'}</Btn>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Main info */}
      <div className="lg:col-span-2 space-y-4">
        <Box title="Basic Info">
          <Inp label="Name" value={p.name} onChange={v => upd('name', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Category" value={p.category} onChange={v => upd('category', v)} />
            <Inp label="Slug" value={p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')} onChange={v => upd('slug', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Price (display)" value={p.price} onChange={v => upd('price', v)} />
            <Inp label="Price (value)" value={p.priceValue.toString()} onChange={v => upd('priceValue', parseInt(v) || 0)} type="number" />
          </div>
          <Inp label="Description" value={p.intro} onChange={v => upd('intro', v)} area />
          <Inp label="Construction" value={p.construction} onChange={v => upd('construction', v)} area />
        </Box>

        <Box title="Details">
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Fabric" value={p.fabric} onChange={v => upd('fabric', v)} />
            <Inp label="Weight" value={p.weight} onChange={v => upd('weight', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Origin" value={p.origin} onChange={v => upd('origin', v)} />
            <Inp label="Fit" value={p.fit} onChange={v => upd('fit', v)} />
          </div>
          <Inp label="Sizes (comma-separated)" value={p.sizes.join(',')} onChange={v => upd('sizes', v.split(',').map(s => s.trim()).filter(Boolean))} hint="مثال: XS,S,M,L,XL,XXL" />
        </Box>

        {/* Inventory (edit mode only) */}
        {!isNew && <Box title="Inventory">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{p.sizes.map(s => {
            const q = stock.find(x => x.size === s)?.quantity ?? 0;
            return <div key={s} className={`text-center p-3 rounded-lg border ${q <= 0 ? 'border-red-500/20 bg-red-500/5' : q <= 5 ? 'border-amber-500/20 bg-amber-500/5' : 'border-[#1a1a1a] bg-[#080808]'}`}>
              <p className="text-white text-xs font-medium">{s}</p>
              <input type="number" value={q} min={0} onChange={e => onUpdateStock(p.slug, s, Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-transparent text-center text-lg text-white font-light mt-1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              <p className={`text-[0.4rem] mt-0.5 ${q <= 0 ? 'text-red-400' : q <= 5 ? 'text-amber-400' : 'text-[#333]'}`}>{q <= 0 ? 'OUT' : q <= 5 ? 'LOW' : 'OK'}</p>
            </div>;
          })}</div>
        </Box>}
      </div>

      {/* Right: Media Gallery + Status */}
      <div className="space-y-4">
        <Box title={`Media Gallery (${allMedia.length})`}>
          <p className="text-[#444] text-[0.45rem] mb-3">The first item is the product cover. Videos are fully supported. Drag or use arrows to reorder.</p>
          
          {/* Upload buttons */}
          <div className="flex gap-2 mb-3">
            <label className={`flex-1 cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
              <div className="border border-dashed border-[#222] rounded-lg p-4 text-center hover:border-[#444] transition-colors">
                <p className="text-[#555] text-xs">{uploading ? 'Uploading...' : '📷 Images'}</p>
              </div>
              <input type="file" accept="image/*" multiple onChange={uploadMedia} className="hidden" disabled={uploading} />
            </label>
            <label className={`flex-1 cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
              <div className="border border-dashed border-[#222] rounded-lg p-4 text-center hover:border-[#444] transition-colors">
                <p className="text-[#555] text-xs">{uploading ? 'Uploading...' : '🎬 Videos'}</p>
              </div>
              <input type="file" accept="video/*" onChange={uploadMedia} className="hidden" disabled={uploading} />
            </label>
          </div>

          {/* Media Grid */}
          {allMedia.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {allMedia.map((url, i) => {
                const isVid = /\.(mp4|webm|mov|m4v)/i.test(url);
                return (
                  <div 
                    key={url} 
                    draggable
                    onDragStart={e => e.dataTransfer.setData('text/plain', i.toString())}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData('text/plain')); moveMedia(from, i); }}
                    className={`relative group rounded-lg overflow-hidden border ${i === 0 ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-[#1a1a1a]'}`}
                  >
                    <div className="aspect-[3/4] bg-[#0a0a0a]">
                      {isVid ? (
                        <video src={url} muted playsInline autoPlay loop preload="auto" className="w-full h-full object-cover" />
                      ) : (
                        <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                      )}
                    </div>
                    
                    {/* Overlays */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <span className={`text-[0.45rem] px-1.5 py-0.5 rounded font-medium ${i === 0 ? 'bg-emerald-500 text-white' : 'bg-black/60 text-white/80'}`}>
                        {i === 0 ? 'COVER' : i + 1}
                      </span>
                      {isVid && <span className="text-[0.45rem] bg-blue-500 text-white px-1.5 py-0.5 rounded font-medium uppercase tracking-tighter">Video</span>}
                    </div>

                    <button 
                      onClick={() => removeMedia(i)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                    >
                      ✕
                    </button>

                    <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <div className="flex gap-1">
                        {i > 0 && <button onClick={() => moveMedia(i, i-1)} className="w-7 h-7 bg-white/10 backdrop-blur-md text-white rounded-md flex items-center justify-center hover:bg-white/20">←</button>}
                        {i < allMedia.length - 1 && <button onClick={() => moveMedia(i, i+1)} className="w-7 h-7 bg-white/10 backdrop-blur-md text-white rounded-md flex items-center justify-center hover:bg-white/20">→</button>}
                      </div>
                      <button onClick={() => moveMedia(i, 0)} className="px-2 h-7 bg-white/10 backdrop-blur-md text-white text-[0.45rem] rounded-md hover:bg-white/20 uppercase tracking-tighter">Set Cover</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <Inp label="Manual Gallery URLs" value={allMedia.join(', ')} onChange={v => syncMedia(v.split(',').map(u => u.trim()).filter(Boolean))} area hint="You can also paste a list of URLs here." />
        </Box>

        <Box title="Status">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={p.visible} onChange={e => upd('visible', e.target.checked)} className="accent-emerald-500" />
            <span className="text-sm text-[#ccc]">Visible on site</span>
          </label>
          <Inp label="Sort Order" value={p.sortOrder.toString()} onChange={v => upd('sortOrder', parseInt(v) || 0)} type="number" />
        </Box>
      </div>
    </div>
  </div>;
}

// ================================================
// CONTENT CMS
// ================================================
function ContentTab({ onUpload }: { onUpload: (f: File) => Promise<UploadedMedia | null> }) {
  const [cms, setCms] = useState<SiteContent>(loadContent);
  const [saved, setSaved] = useState(false);
  const [sec, setSec] = useState('hero');
  const upd = (k: keyof SiteContent, v: string) => setCms(p => ({ ...p, [k]: v }));
  const save = async () => { await saveContent(cms); dispatchCMSUpdate(); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const reset = async () => { if (confirm('Reset all?')) { setCms({ ...defaultContent }); await saveContent(defaultContent); dispatchCMSUpdate(); } };

  const secs: { id: string; label: string; fields: { k: keyof SiteContent; l: string; a?: boolean; h?: string }[] }[] = [
    { id: 'hero', label: 'Hero', fields: [{ k: 'hero_image', l: 'Media URL (Image or mp4 Video)', h: 'If you paste an mp4 URL here, it will play as background video. Image otherwise.' }, { k: 'hero_video', l: 'Hero Video URL (DEPRECATED — use Media URL above)', h: 'Use the Media URL field above instead — it handles both images and videos.' }, { k: 'hero_title', l: 'Title' }, { k: 'hero_slogan', l: 'Slogan' }, { k: 'hero_cta', l: 'Button' }] },
    { id: 'collection', label: 'Collection', fields: [{ k: 'collection_label', l: 'Label' }, { k: 'collection_cta', l: 'Button' }] },
    { id: 'newsletter', label: 'Newsletter', fields: [{ k: 'newsletter_label', l: 'Label' }, { k: 'newsletter_title', l: 'Title' }, { k: 'newsletter_subtitle', l: 'Subtitle' }, { k: 'newsletter_btn', l: 'Button' }, { k: 'newsletter_success', l: 'Success' }] },
    { id: 'footer', label: 'Footer', fields: [{ k: 'footer_tagline', l: 'Tagline' }, { k: 'footer_origin', l: 'Origin' }] },
    { id: 'dh', label: 'Drop Hero', fields: [{ k: 'drop_hero_image', l: 'Media URL (Image or Video)', h: 'Empty = default' }, { k: 'drop_hero_label', l: 'Label' }, { k: 'drop_hero_title', l: 'Title', a: true }, { k: 'drop_hero_description', l: 'Description', a: true }, { k: 'drop_hero_cta', l: 'Button' }] },
    { id: 'dm', label: 'Manifesto', fields: [{ k: 'drop_manifesto_label', l: 'Label' }, { k: 'drop_manifesto_title_ar', l: 'Title AR', a: true }, { k: 'drop_manifesto_title_en', l: 'Title EN' }, { k: 'drop_manifesto_body', l: 'Body', a: true }] },
    { id: 'df', label: 'Fabric', fields: [{ k: 'drop_fabric_label', l: 'Label' }, { k: 'drop_fabric_title_ar', l: 'Title AR' }, { k: 'drop_fabric_title_en', l: 'Title EN' }, { k: 'drop_fabric_body', l: 'Body', a: true }, { k: 'drop_fabric_image', l: 'Media URL (Image or Video)', h: 'Empty = default' }] },
    { id: 'dv', label: 'Videos', fields: [{ k: 'drop_video1_url', l: 'Video 1 URL', h: 'mp4 video URL' }, { k: 'drop_video1_label', l: 'V1 Label' }, { k: 'drop_video1_title_ar', l: 'V1 Title AR' }, { k: 'drop_video1_title_en', l: 'V1 Title EN' }, { k: 'drop_video2_url', l: 'Video 2 URL', h: 'mp4 video URL' }, { k: 'drop_video2_label', l: 'V2 Label' }, { k: 'drop_video2_title_ar', l: 'V2 Title AR' }, { k: 'drop_video2_title_en', l: 'V2 Title EN' }] },
    { id: 'dl', label: 'Lookbook', fields: [{ k: 'drop_lookbook1', l: 'Media 1 URL', h: 'Empty = default' }, { k: 'drop_lookbook2', l: 'Media 2 URL' }, { k: 'drop_lookbook3', l: 'Media 3 URL' }, { k: 'drop_lookbook4', l: 'Media 4 URL' }] },
    { id: 'dlu', label: 'Lineup', fields: [{ k: 'drop_lineup_label', l: 'Label' }, { k: 'drop_lineup_title_ar', l: 'Title AR' }, { k: 'drop_lineup_title_en', l: 'Title EN' }] },
    { id: 'dc', label: 'Closing', fields: [{ k: 'drop_closing_label', l: 'Label' }, { k: 'drop_closing_title', l: 'Title', a: true }, { k: 'drop_closing_body_en', l: 'Body EN' }, { k: 'drop_closing_body_ar', l: 'Body AR' }] },
    { id: 'story', label: 'Story Page', fields: [{ k: 'story_hero_image', l: 'Media URL (Image or Video)', h: 'Upload or paste URL for the hero background — supports images and mp4 videos.' }, { k: 'story_title', l: 'Page Title' }, { k: 'story_quote_ar', l: 'Quote (Arabic)', a: true }, { k: 'story_quote_en', l: 'Quote (English)' }, { k: 'story_body_1', l: 'Paragraph 1', a: true }, { k: 'story_body_2', l: 'Paragraph 2', a: true }, { k: 'story_body_3', l: 'Paragraph 3', a: true }, { k: 'story_value_1_title', l: 'Value 1 Title' }, { k: 'story_value_1_text', l: 'Value 1 Text' }, { k: 'story_value_2_title', l: 'Value 2 Title' }, { k: 'story_value_2_text', l: 'Value 2 Text' }, { k: 'story_value_3_title', l: 'Value 3 Title' }, { k: 'story_value_3_text', l: 'Value 3 Text' }] },
  ];

  const cur = secs.find(s => s.id === sec);

  return <div>
    <div className="flex items-center justify-between mb-4">
      <div className="flex gap-1 overflow-x-auto pb-1">{secs.map(s => <button key={s.id} onClick={() => setSec(s.id)} className={`px-2.5 py-1 text-[0.5rem] rounded-md whitespace-nowrap ${sec === s.id ? 'bg-white text-black' : 'bg-[#141414] text-[#444]'}`}>{s.label}</button>)}</div>
      <div className="flex gap-2 shrink-0 ml-2">
        <Btn v="g" onClick={reset}>Reset</Btn>
        <Btn onClick={save}>{saved ? '✓' : 'Save'}</Btn>
      </div>
    </div>
    {cur && <Box title={cur.label}>{cur.fields.map(f => {
      const isMedia = f.l.toLowerCase().includes('image') || f.l.toLowerCase().includes('url') || f.l.toLowerCase().includes('video') || f.l.toLowerCase().includes('media');
      return <Inp key={f.k} label={f.l} value={cms[f.k] || ''} onChange={v => upd(f.k, v)} area={f.a} hint={f.h}
        onFileUpload={isMedia ? async (file: File) => { const r = await onUpload(file); return r?.url || null; } : undefined}
      />;
    })}</Box>}
  </div>;
}

// ================================================
// SETTINGS
// ================================================
// ================================================
// REVIEWS
// ================================================
function ReviewsTab() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'featured'>('all');

  useEffect(() => {
    getReviews().then(r => { setReviews(r); setLoading(false); });
  }, []);

  const handleFeatured = async (id: string, featured: boolean) => {
    await setReviewFeatured(id, featured);
    setReviews(prev => prev.map(r => r.id === id ? { ...r, featured } : r));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review? Cannot be undone.')) return;
    await deleteReview(id);
    setReviews(prev => prev.filter(r => r.id !== id));
  };

  const filtered = filter === 'featured' ? reviews.filter(r => r.featured) : reviews;

  if (loading) return <p className="text-[#555] text-xs py-8 text-center">Loading reviews…</p>;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['all', 'featured'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 text-[0.5rem] rounded capitalize ${filter === f ? 'bg-white text-black' : 'bg-[#141414] text-[#444]'}`}>
              {f} {f === 'featured' ? `(${reviews.filter(r => r.featured).length})` : `(${reviews.length})`}
            </button>
          ))}
        </div>
        <p className="text-[#333] text-[0.5rem]">{filtered.length} reviews</p>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-[#333] text-center py-12 text-sm">
          {filter === 'featured' ? 'No featured reviews yet.' : 'No reviews yet.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className={`bg-[#0f0f0f] border rounded-lg p-4 ${r.featured ? 'border-amber-500/30' : 'border-[#181818]'}`}>
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-amber-400 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    {r.featured && <span className="text-[0.4rem] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">FEATURED</span>}
                    {r.verified && <span className="text-[0.4rem] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">VERIFIED</span>}
                  </div>
                  <p className="text-[#ccc] text-xs mt-1">
                    <span className="text-white font-medium">{r.name}</span>
                    <span className="text-[#444] mx-1">·</span>
                    <span className="text-[#555]">{r.productName}</span>
                    <span className="text-[#444] mx-1">·</span>
                    <span className="text-[#444]">{r.date}</span>
                  </p>
                </div>
              </div>

              {/* Review text */}
              {r.text && (
                <p className="text-[#888] text-xs leading-relaxed italic border-l-2 border-[#222] pl-3 mb-3">
                  "{r.text}"
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleFeatured(r.id, !r.featured)}
                  className={`text-[0.5rem] px-3 py-1.5 rounded transition-colors ${
                    r.featured
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-[#141414] text-[#555] hover:text-amber-400 hover:bg-amber-500/5'
                  }`}>
                  {r.featured ? '★ Unfeature' : '☆ Feature'}
                </button>
                <Btn v="d" onClick={() => handleDelete(r.id)}>Delete</Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const [cms, setCms] = useState<SiteContent>(loadContent);
  const [saved, setSaved] = useState(false);
  const upd = (k: keyof SiteContent, v: string) => setCms(p => ({ ...p, [k]: v }));
  const save = async () => { await saveContent(cms); dispatchCMSUpdate(); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const isLaunch = cms.launch_mode === 'on';

  return <div className="max-w-lg space-y-4">
    {/* Launch Mode */}
    <Box title="🚀 Launch Mode">
      <div className={`p-4 rounded-lg border ${isLaunch ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">{isLaunch ? '⏸ Site is HIDDEN' : '✅ Site is LIVE'}</p>
            <p className="text-[0.5rem] text-[#666] mt-1">{isLaunch ? 'Visitors see "Coming Soon" page only' : 'All pages visible to visitors'}</p>
          </div>
          <button onClick={() => upd('launch_mode', isLaunch ? 'off' : 'on')}
            className={`px-4 py-2 text-[0.55rem] tracking-[0.15em] uppercase rounded-md transition-all ${isLaunch ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-amber-500 text-black hover:bg-amber-600'}`}>
            {isLaunch ? 'Go Live' : 'Enable Launch Mode'}
          </button>
        </div>
      </div>

      {isLaunch && <>
        <Inp label="Launch Media URL (Image or Video)" value={cms.launch_image} onChange={v => upd('launch_image', v)} onFileUpload={async (f: File) => { const r = await uploadImage(f); return r?.url || null; }} />
        <Inp label="Title" value={cms.launch_title} onChange={v => upd('launch_title', v)} />
        <Inp label="Subtitle" value={cms.launch_subtitle} onChange={v => upd('launch_subtitle', v)} />
        <Inp label="Launch Date (for countdown)" value={cms.launch_date} onChange={v => upd('launch_date', v)} type="datetime-local" hint="Leave empty = no countdown. When time comes, disable Launch Mode manually." />
      </>}
    </Box>

    <Box title="Brand">
      <Inp label="Name" value={cms.brand_name} onChange={v => upd('brand_name', v)} />
      <Inp label="Instagram" value={cms.brand_instagram} onChange={v => upd('brand_instagram', v)} />
      <Inp label="Email" value={cms.brand_email} onChange={v => upd('brand_email', v)} />
      <Inp label="WhatsApp" value={cms.brand_phone} onChange={v => upd('brand_phone', v)} />
    </Box>
    <Box title="Shipping (EGP)">
      <Inp label="Port Said" value={cms.shipping_portsaid} onChange={v => upd('shipping_portsaid', v)} type="number" />
      <Inp label="Cairo & Giza" value={cms.shipping_cairo} onChange={v => upd('shipping_cairo', v)} type="number" />
      <Inp label="Alexandria" value={cms.shipping_alex} onChange={v => upd('shipping_alex', v)} type="number" />
      <Inp label="Rest of Egypt" value={cms.shipping_other} onChange={v => upd('shipping_other', v)} type="number" />
    </Box>
    <Btn onClick={save} full>{saved ? '✓ Saved' : 'Save Settings'}</Btn>
  </div>;
}

// ================================================
// CUSTOMERS
// ================================================
function CustomersTab({ orders, subs }: { orders: (Order & { createdAt?: string })[]; subs: Sub[] }) {
  const map: Record<string, { name: string; phone: string; email: string; orders: number; spent: number; last: string }> = {};
  orders.forEach(o => {
    const k = o.customerPhone;
    if (!map[k]) map[k] = { name: o.customerName, phone: k, email: o.customerEmail, orders: 0, spent: 0, last: '' };
    map[k].orders++; map[k].spent += o.subtotal;
    if (o.createdAt && o.createdAt > map[k].last) map[k].last = o.createdAt;
  });
  const list = Object.values(map).sort((a, b) => b.spent - a.spent);

  const expCSV = () => {
    const c = 'Name,Phone,Email,Orders,Spent\n' + list.map(c => `"${c.name}",${c.phone},${c.email},${c.orders},${c.spent}`).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv' })); a.download = 'lowkey-customers.csv'; a.click();
  };

  return <div>
    <div className="flex justify-between mb-4">
      <p className="text-[#555] text-xs">{list.length} customers</p>
      <Btn v="g" onClick={expCSV}>↓ CSV</Btn>
    </div>

    {list.length === 0 ? <p className="text-[#333] text-center py-12">No customers yet</p> : <div className="space-y-2">{list.map(c => (
      <div key={c.phone} className="bg-[#0f0f0f] border border-[#181818] rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-white">{c.name}</p>
          <p className="text-[0.5rem] text-[#444] mt-0.5">{c.phone} · {c.email}</p>
          {c.last && <p className="text-[0.45rem] text-[#333] mt-0.5">Last: {new Date(c.last).toLocaleDateString()}</p>}
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-sm text-white font-light">EGP {fmt(c.spent)}</p>
          <p className="text-[0.5rem] text-[#555]">{c.orders} order{c.orders > 1 ? 's' : ''}</p>
          <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[0.5rem] text-[#25D366] hover:underline">WhatsApp →</a>
        </div>
      </div>
    ))}</div>}

    {subs.length > 0 && <>
      <h3 className="text-white text-xs tracking-wide mt-8 mb-3">Newsletter ({subs.length})</h3>
      <Box title="">{subs.map((s, i) => <div key={i} className="flex justify-between py-1.5 border-b border-[#141414] last:border-0 text-xs"><span className="text-[#ccc]">{s.email}</span><span className="text-[#333]">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}</span></div>)}</Box>
    </>}
  </div>;
}

// ================================================
// DISCOUNTS
// ================================================
function DiscountsTab() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removedCodes, setRemovedCodes] = useState<string[]>([]);

  useEffect(() => {
    getDiscounts().then(d => { setCodes(d); setLoading(false); });
  }, []);

  const add = () => setCodes(p => [...p, { code: '', type: 'percentage', value: 0, minOrder: 0, active: true }]);
  const remove = (i: number) => {
    const c = codes[i];
    if (c.code) setRemovedCodes(p => [...p, c.code]);
    setCodes(p => p.filter((_, idx) => idx !== i));
  };
  const upd = (i: number, field: keyof DiscountCode, val: any) => setCodes(p => p.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const save = async () => {
    setSaving(true);
    // Delete any codes removed in this session
    for (const code of removedCodes) await deleteDiscount(code);
    // Upsert every remaining code that has a non-empty code string
    for (const c of codes) {
      if (c.code.trim()) await saveDiscount({ ...c, code: c.code.trim().toUpperCase() });
    }
    setRemovedCodes([]);
    const fresh = await getDiscounts();
    setCodes(fresh);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <p className="text-[#555] text-xs">Loading…</p>;

  return <div className="max-w-xl">
    <div className="flex justify-between items-center mb-4">
      <p className="text-[#555] text-xs">{codes.length} codes</p>
      <div className="flex gap-2">
        <Btn v="g" onClick={add}>+ Add Code</Btn>
        <Btn onClick={save}>{saving ? '···' : saved ? '✓' : 'Save'}</Btn>
      </div>
    </div>

    <div className="space-y-3">{codes.map((c, i) => (
      <Box key={i} title="">
        <div className="grid grid-cols-2 gap-3">
          <Inp label="Code" value={c.code} onChange={v => upd(i, 'code', v.toUpperCase())} />
          <div className="mb-3">
            <label className="text-[#555] text-[0.5rem] tracking-[0.1em] uppercase block mb-1">Type</label>
            <select value={c.type} onChange={e => upd(i, 'type', e.target.value)} className="w-full bg-[#080808] border border-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] focus:outline-none rounded-md">
              <option value="percentage">Percentage %</option>
              <option value="fixed">Fixed EGP</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Inp label={c.type === 'percentage' ? 'Value (%)' : 'Value (EGP)'} value={c.value.toString()} onChange={v => upd(i, 'value', parseInt(v) || 0)} type="number" />
          <Inp label="Min Order (EGP)" value={c.minOrder.toString()} onChange={v => upd(i, 'minOrder', parseInt(v) || 0)} type="number" />
        </div>
        <div className="flex justify-between items-center mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={c.active} onChange={e => upd(i, 'active', e.target.checked)} className="accent-emerald-500" />
            <span className="text-xs text-[#ccc]">{c.active ? 'Active' : 'Disabled'}</span>
          </label>
          <Btn v="d" onClick={() => remove(i)}>Remove</Btn>
        </div>
      </Box>
    ))}</div>

    {codes.length === 0 && <p className="text-[#333] text-center py-12">No discount codes. Click "+ Add Code" to create one.</p>}
    <p className="text-[#444] text-[0.55rem] mt-3">Changes save to the database when you click Save — they're not live until then.</p>
  </div>;
}

// ================================================
// COLLECTIONS
// ================================================
function CollectionsTab({ collections, onReload, onUpload }: { collections: Collection[]; onReload: () => void; onUpload: (f: File) => Promise<UploadedMedia | null> }) {
  const [editing, setEditing] = useState<Collection | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const blank: Collection = { slug: '', name: '', description: '', heroImage: '', season: '2026', launchDate: '', status: 'draft', sortOrder: collections.length + 1 };

  const handleSave = async (c: Collection, isNew: boolean) => {
    setSaving(true);
    const result = isNew ? await createCollection(c) : await updateCollection(c.slug, c);
    if (result.success) { setEditing(null); setAdding(false); onReload(); }
    else alert(result.error);
    setSaving(false);
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete ${slug}?`)) return;
    await deleteCollection(slug); onReload();
  };

  const handleSetLive = async (slug: string) => {
    if (!confirm('This will archive any current Live collection. Continue?')) return;
    await setCollectionLive(slug); onReload();
  };

  const handleStatus = async (slug: string, status: CollectionStatus) => {
    await updateCollection(slug, { status }); onReload();
  };

  // Editor
  if (editing || adding) {
    const c = editing || blank;
    return <CollectionEditor
      collection={c} isNew={adding} saving={saving}
      onSave={updated => handleSave(updated, adding)}
      onCancel={() => { setEditing(null); setAdding(false); }}
      onUpload={async f => { const r = await onUpload(f); return r?.url || null; }}
    />;
  }

  const statusColor: Record<string, string> = {
    draft: 'bg-[#222] text-[#666]',
    upcoming: 'bg-blue-500/10 text-blue-400',
    live: 'bg-emerald-500/10 text-emerald-400',
    archived: 'bg-[#1a1a1a] text-[#555]',
  };

  return <div>
    <div className="flex justify-between items-center mb-5">
      <p className="text-[#555] text-xs">{collections.length} collections</p>
      <Btn onClick={() => setAdding(true)}>+ New Collection</Btn>
    </div>

    <div className="space-y-3">{collections.map(c => (
      <div key={c.slug} className="bg-[#0f0f0f] border border-[#181818] rounded-lg p-4">
        <div className="flex gap-4 items-center">
          {c.heroImage && <div className="w-20 h-14 rounded bg-[#151515] overflow-hidden shrink-0"><img src={c.heroImage} alt="" loading="lazy" className="w-full h-full object-cover" /></div>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[0.45rem] px-2 py-0.5 rounded capitalize ${statusColor[c.status] || ''}`}>{c.status}</span>
              <span className="text-[#333] text-[0.45rem]">{c.season}</span>
            </div>
            <h3 className="text-sm text-white truncate">{c.name}</h3>
            <p className="text-xs text-[#555] truncate">{c.description}</p>
          </div>
          <div className="flex gap-1.5 shrink-0 flex-wrap">
            {c.status !== 'live' && <Btn v="g" onClick={() => handleSetLive(c.slug)}>Go Live</Btn>}
            {c.status === 'live' && <Btn v="g" onClick={() => handleStatus(c.slug, 'archived')}>Archive</Btn>}
            {c.status === 'draft' && <Btn v="g" onClick={() => handleStatus(c.slug, 'upcoming')}>Upcoming</Btn>}
            <Btn v="g" onClick={() => setEditing(c)}>Edit</Btn>
            <Btn v="d" onClick={() => handleDelete(c.slug)}>✕</Btn>
          </div>
        </div>
      </div>
    ))}</div>
  </div>;
}

function CollectionEditor({ collection, saving, onSave, onCancel, onUpload }: {
  collection: Collection; isNew: boolean; saving: boolean;
  onSave: (c: Collection) => void; onCancel: () => void;
  onUpload: (f: File) => Promise<string | null>;
}) {
  const [c, setC] = useState({ ...collection });
  const [uploading, setUploading] = useState(false);
  const upd = (k: keyof Collection, v: any) => setC(p => ({ ...p, [k]: v }));

  const uploadHero = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); const url = await onUpload(file); if (url) upd('heroImage', url); setUploading(false);
  };

  return <div>
    <div className="flex items-center justify-between mb-5">
      <button onClick={onCancel} className="text-[#444] text-xs hover:text-white">← Back</button>
      <div className="flex gap-2">
        <Btn v="g" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => onSave(c)} disabled={saving || !c.name}>{saving ? '...' : 'Save'}</Btn>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Box title="Collection Info">
          <Inp label="Name" value={c.name} onChange={v => upd('name', v)} />
          <Inp label="Slug" value={c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')} onChange={v => upd('slug', v)} />
          <Inp label="Description" value={c.description} onChange={v => upd('description', v)} area />
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Season" value={c.season} onChange={v => upd('season', v)} />
            <Inp label="Launch Date" value={c.launchDate} onChange={v => upd('launchDate', v)} />
          </div>
          <Inp label="Sort Order" value={c.sortOrder.toString()} onChange={v => upd('sortOrder', parseInt(v) || 0)} type="number" />
        </Box>
      </div>

      <div className="space-y-4">
        <Box title="Hero Image">
          {c.heroImage && <div className="aspect-video rounded-lg bg-[#151515] overflow-hidden mb-3"><img src={c.heroImage} alt="" loading="lazy" className="w-full h-full object-cover" /></div>}
          <label className={`block cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
            <div className="border border-dashed border-[#222] rounded-lg p-4 text-center hover:border-[#444] transition-colors">
              <p className="text-[#555] text-xs">{uploading ? 'Uploading...' : 'Upload Image'}</p>
            </div>
            <input type="file" accept="image/*" onChange={uploadHero} className="hidden" disabled={uploading} />
          </label>
          <Inp label="or paste URL" value={c.heroImage} onChange={v => upd('heroImage', v)} />
        </Box>

        <Box title="Status">
          <select value={c.status} onChange={e => upd('status', e.target.value)}
            className="w-full bg-[#080808] border border-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] rounded-md focus:outline-none">
            <option value="draft">Draft</option>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="archived">Archived</option>
          </select>
        </Box>
      </div>
    </div>
  </div>;
}
