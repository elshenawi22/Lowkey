import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Link } from '../router';
import { useCMS } from '../lib/cms';

interface TrackResult {
  id: string;
  status: string;
  items: { name: string; size: string; qty: number }[];
  subtotal: number;
  createdAt: string;
}

const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const statusAr: Record<string, string> = {
  pending: 'قيد المراجعة',
  confirmed: 'تم التأكيد',
  processing: 'جاري التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

export default function TrackPage() {
  const cms = useCMS();
  const [orderId, setOrderId] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('orders').select('*').eq('id', orderId.trim().toUpperCase()).single();
      if (data) {
        setResult({
          id: data.id,
          status: data.status,
          items: data.items as any[],
          subtotal: data.subtotal,
          createdAt: data.created_at,
        });
      } else {
        setNotFound(true);
      }
    } else {
      // localStorage fallback
      const saved = localStorage.getItem('lowkey-orders');
      if (saved) {
        const orders = JSON.parse(saved);
        const found = orders.find((o: any) => o.id === orderId.trim().toUpperCase());
        if (found) {
          setResult({ id: found.id, status: found.status, items: found.items, subtotal: found.subtotal, createdAt: '' });
        } else {
          setNotFound(true);
        }
      } else {
        setNotFound(true);
      }
    }
    setLoading(false);
  };

  const currentStep = result ? statusSteps.indexOf(result.status) : -1;

  return (
    <main className="bg-cream min-h-screen pt-20 md:pt-24 pb-20">
      <div className="mx-auto max-w-lg px-6">
        <div className="text-center mb-12">
          <span className="text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light">Order Tracking</span>
          <h1 className="font-serif text-2xl md:text-3xl text-charcoal font-light mt-4 tracking-wide">تتبع طلبك</h1>
        </div>

        {/* Search */}
        <form onSubmit={handleTrack} className="flex gap-3">
          <input
            type="text"
            value={orderId}
            onChange={e => setOrderId(e.target.value)}
            placeholder="LK-XXXXXX"
            className="flex-1 bg-transparent border-b border-sand py-3 text-charcoal text-sm font-light placeholder:text-stone/40 focus:outline-none focus:border-navy transition-colors text-center font-mono tracking-wider uppercase"
          />
          <button type="submit" disabled={loading} className="btn-luxury text-[0.6rem] px-6 py-3 disabled:opacity-50">
            {loading ? '...' : 'Track'}
          </button>
        </form>

        {notFound && (
          <div className="mt-10 text-center">
            <p className="text-stone text-sm font-light">لم نجد هذا الطلب</p>
            <p className="text-stone/50 text-xs mt-2">Order not found. Check the ID and try again.</p>
          </div>
        )}

        {result && (
          <div className="mt-12">
            {/* Order ID & Date */}
            <div className="text-center mb-10">
              <p className="font-mono text-sm text-charcoal">{result.id}</p>
              {result.createdAt && (
                <p className="text-stone text-xs mt-1">{new Date(result.createdAt).toLocaleDateString('en-EG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              )}
            </div>

            {/* Status */}
            {result.status === 'cancelled' ? (
              <div className="text-center py-8">
                <p className="text-red-500 text-sm font-light">تم إلغاء هذا الطلب</p>
                <p className="text-stone/50 text-xs mt-1">This order has been cancelled.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {statusSteps.map((step, i) => {
                  const active = i <= currentStep;
                  const current = i === currentStep;
                  return (
                    <div key={step} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full border-2 transition-all ${current ? 'border-navy bg-navy scale-125' : active ? 'border-navy bg-navy' : 'border-sand bg-cream'}`} />
                        {i < statusSteps.length - 1 && <div className={`w-px h-10 transition-all ${active ? 'bg-navy' : 'bg-sand/50'}`} />}
                      </div>
                      <div className="pb-6">
                        <p className={`text-sm font-light capitalize ${current ? 'text-charcoal font-normal' : active ? 'text-charcoal' : 'text-stone/50'}`}>
                          {statusAr[step] || step}
                        </p>
                        <p className={`text-xs mt-0.5 ${active ? 'text-stone' : 'text-stone/30'}`}>
                          {step.charAt(0).toUpperCase() + step.slice(1)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Items */}
            <div className="mt-8 pt-8 border-t border-sand/50">
              <span className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light">Items</span>
              <div className="mt-3 space-y-2">
                {result.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm font-light">
                    <span className="text-charcoal">{item.name} ({item.size}) × {item.qty}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-sand/30 flex justify-between">
                <span className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light">Total</span>
                <span className="font-serif text-lg text-charcoal font-light">EGP {result.subtotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Help */}
            <div className="mt-10 text-center">
              <a href={`https://wa.me/${(cms.brand_phone || '201091600978').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light hover:text-navy transition-colors">
                Need help? Contact us →
              </a>
            </div>
          </div>
        )}

        <div className="mt-16 text-center">
          <Link to="/" className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light hover:text-navy transition-colors">← Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
