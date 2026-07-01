import { useState, useEffect } from 'react';
import { useBag } from '../context/BagContext';
import { createOrder } from '../lib/orders';
import { getProduct } from '../data/catalog';
import { getShippingOptions, type ShippingOption } from '../lib/shipping';
import { track } from '../lib/analytics';
import { notifyNewOrder } from '../lib/notifications';
import { decrementStock } from '../lib/inventory';
import { validateCode } from '../lib/discounts';
import { rateLimit, sanitize, isHoneypotFilled } from '../lib/security';
import { addReview, getReviews, type Review } from '../lib/reviews';
import { Link } from '../router';

interface CheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
}

function formatPhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0')) d = '2' + d;
  if (!d.startsWith('20')) d = '20' + d;
  return d;
}

function checkPhone(raw: string): { valid: boolean; formatted: string; error: string } {
  const f = formatPhone(raw);
  if (f.length < 12) return { valid: false, formatted: f, error: 'رقم الموبايل قصير' };
  if (f.length > 13) return { valid: false, formatted: f, error: 'رقم الموبايل طويل' };
  if (!/^201[0125]\d{8}$/.test(f)) return { valid: false, formatted: f, error: 'رقم موبايل مصري غير صحيح' };
  return { valid: true, formatted: f, error: '' };
}

function checkEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

export default function CheckoutDrawer({ isOpen, onClose, onBack }: CheckoutDrawerProps) {
  const { items, subtotal, clear } = useBag();
  const [status, setStatus] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [orderId, setOrderId] = useState('');
  const [savedItems, setSavedItems] = useState<{ slug: string; name: string; size: string; qty: number; price: number }[]>([]);
  const [savedTotal, setSavedTotal] = useState(0);
  const [randomReview, setRandomReview] = useState<Review | null>(null);
  const shippingOptions = getShippingOptions();
  const [shipping, setShipping] = useState<ShippingOption>(shippingOptions[0]);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountMsg, setDiscountMsg] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', notes: '',
  });

  useEffect(() => {
    getReviews().then(all => {
      if (all.length > 0) setRandomReview(all[Math.floor(Math.random() * all.length)]);
    });
  }, []);

  const total = subtotal + shipping.price - discount;

  const applyDiscount = async () => {
    if (!discountCode) return;
    const r = await validateCode(discountCode, subtotal);
    setDiscountMsg(r.message);
    setDiscount(r.valid ? r.discount : 0);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 3) e.name = 'الاسم مطلوب (3 حروف على الأقل)';
    const ph = checkPhone(form.phone);
    if (!form.phone.trim()) e.phone = 'رقم الموبايل مطلوب';
    else if (!ph.valid) e.phone = ph.error;
    if (!checkEmail(form.email)) e.email = 'إيميل غير صحيح';
    if (!form.city.trim()) e.city = 'المدينة مطلوبة';
    if (!form.address.trim() || form.address.trim().length < 5) e.address = 'العنوان مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;
    if (isHoneypotFilled(honeypot)) return;

    const rl = rateLimit('order', 10);
    if (!rl.allowed) { setErrorMsg('طلبات كتير. حاول بعد شوية.'); setStatus('error'); return; }

    if (!validate()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const phone = formatPhone(form.phone);

      const orderItems = items.map(item => {
        const p = getProduct(item.slug);
        return { slug: item.slug, name: p?.name || item.slug, size: item.size, qty: item.qty, price: p?.priceValue || 0 };
      });

      const fullAddress = sanitize(`${form.address}, ${form.city}`);
      const discountNote = discount > 0 ? ` | Discount: ${discountCode} (-EGP ${discount})` : '';

      const result = await createOrder({
        customerName: sanitize(form.name.trim()),
        customerEmail: form.email.toLowerCase().trim(),
        customerPhone: phone,
        customerAddress: fullAddress,
        items: orderItems,
        subtotal: Math.max(0, total),
        notes: `Shipping: ${shipping.labelAr} (EGP ${shipping.price})${discountNote}${form.notes ? ' | ' + sanitize(form.notes) : ''}`,
      });

      if (result.success) {
        const oid = result.orderId || '';
        setOrderId(oid);
        setSavedItems(orderItems);
        setSavedTotal(Math.max(0, total));
        setStatus('success');
        clear();
        track.purchase(oid, total);
        if (navigator.vibrate) navigator.vibrate(100);
        decrementStock(orderItems.map(i => ({ slug: i.slug, size: i.size, qty: i.qty })));
        // Awaited deliberately: opening WhatsApp right after (a tab switch)
        // can interrupt an in-flight background request on mobile browsers,
        // so we make sure the notification finishes sending first.
        await notifyNewOrder({ id: oid, name: form.name, phone, items: orderItems, total, address: fullAddress, shipping: shipping.labelAr });

        // Auto WhatsApp
        const itemsList = orderItems.map(i => `• ${i.name} (${i.size}) × ${i.qty}`).join('\n');
        const waMsg = `✅ *LOWKEY — تأكيد الطلب*\n\nرقم الطلب: *${oid}*\n\n${itemsList}\n\nالمجموع: *EGP ${Math.max(0, total).toLocaleString()}*\nالشحن: ${shipping.labelAr}\nالعنوان: ${fullAddress}\n\nشكراً لاختيارك LOWKEY 🤎`;
        setTimeout(() => {
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
        }, 500);
      } else {
        setErrorMsg(result.error || 'حدث خطأ في حفظ الطلب');
        setStatus('error');
      }
    } catch (err) {
      console.error('[LOWKEY] Order error:', err);
      setErrorMsg('حدث خطأ. حاول مرة ثانية.');
      setStatus('error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-navy/30 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="fixed top-0 right-0 z-[90] h-full w-full max-w-md bg-cream overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <button onClick={onBack} className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light hover:text-charcoal">← Back</button>
            <button onClick={onClose} className="text-stone hover:text-charcoal" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="0.75" /></svg>
            </button>
          </div>

          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-navy/10 flex items-center justify-center mx-auto mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="font-serif text-2xl text-charcoal font-light">تم استلام طلبك ✓</h3>
              <div className="mt-6 bg-sand/30 p-4 text-left">
                <p className="text-[0.6rem] tracking-[0.2em] uppercase text-stone font-light mb-2">رقم الطلب</p>
                <p className="font-mono text-charcoal text-lg">{orderId}</p>
                <div className="mt-4 space-y-1">{savedItems.map((it, i) => (
                  <p key={i} className="text-xs text-stone">{it.name} ({it.size}) × {it.qty} — EGP {(it.price * it.qty).toLocaleString()}</p>
                ))}</div>
                <p className="mt-3 text-sm text-charcoal font-light border-t border-sand/50 pt-2">المجموع: EGP {savedTotal.toLocaleString()}</p>
              </div>
              <p className="mt-6 text-stone text-sm font-light">تم فتح واتساب لتأكيد الطلب.</p>
              <Link to="/track" onClick={onClose} className="mt-4 inline-block text-navy text-[0.6rem] tracking-[0.2em] uppercase font-light hover:underline">تتبع طلبك →</Link>
              
              {/* Review submission — REAL customer reviews */}
              {!reviewSubmitted && (
                <div className="mt-8 pt-6 border-t border-sand/40">
                  <p className="font-serif text-lg text-charcoal font-light mb-3">شاركنا رأيك — Leave a review</p>
                  <div className="flex justify-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} onClick={() => setReviewRating(s)}
                        className={`text-2xl transition-colors duration-200 ${s <= reviewRating ? 'text-amber-400' : 'text-sand'}`}>
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} rows={2}
                    placeholder="What did you think of your purchase?"
                    className="w-full bg-transparent border border-sand/50 p-3 text-sm text-charcoal placeholder:text-stone/30 focus:outline-none focus:border-navy transition-colors resize-none rounded" />
                  <button
                    onClick={async () => {
                      if (!reviewRating || !reviewText.trim()) return;
                      for (const item of savedItems) {
                        await addReview({
                          productSlug: item.slug,
                          productName: item.name,
                          name: form.name,
                          rating: reviewRating,
                          text: reviewText.trim(),
                          featured: false,
                        });
                      }
                      setReviewSubmitted(true);
                    }}
                    disabled={!reviewRating || !reviewText.trim()}
                    className="btn-luxury mt-3 w-full justify-center disabled:opacity-30"
                  >
                    Submit Review
                  </button>
                </div>
              )}
              {reviewSubmitted && (
                <div className="mt-6 p-4 bg-sand/20 rounded-sm">
                  <p className="text-charcoal text-sm font-light">✓ شكراً لمشاركتك رأيك — Your review helps us grow.</p>
                </div>
              )}

              <button onClick={onClose} className="btn-luxury mt-4 w-full justify-center">تم</button>
            </div>
          ) : status === 'error' ? (
            <div className="text-center py-12">
              <h3 className="font-serif text-xl text-charcoal font-light">حدث خطأ</h3>
              <p className="mt-4 text-stone text-sm font-light">{errorMsg || 'حاول مرة ثانية'}</p>
              <button onClick={() => setStatus('form')} className="btn-luxury mt-8">حاول مرة ثانية</button>
            </div>
          ) : (
            <>
              <h3 className="font-serif text-xl text-charcoal font-light">إتمام الطلب</h3>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Fld label="الاسم بالكامل *" name="name" value={form.name} onChange={handleChange} error={errors.name} />
                <Fld label="رقم الموبايل *" name="phone" value={form.phone} onChange={handleChange} error={errors.phone} type="tel" placeholder="01012345678" hint="هيتحول تلقائي لـ 201012345678" />
                <Fld label="الإيميل *" name="email" value={form.email} onChange={handleChange} error={errors.email} type="email" />
                <Fld label="المدينة *" name="city" value={form.city} onChange={handleChange} error={errors.city} placeholder="القاهرة، بورسعيد..." />
                <Fld label="العنوان بالتفصيل *" name="address" value={form.address} onChange={handleChange} error={errors.address} area placeholder="الشارع، المنطقة..." />

                <div>
                  <label className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light block mb-3">الشحن</label>
                  <div className="space-y-2">{shippingOptions.map(opt => {
                    const deliveryDate = new Date();
                    const days = parseInt(opt.estimate.split('-')[1] || opt.estimate.split('-')[0]) || 3;
                    deliveryDate.setDate(deliveryDate.getDate() + days);
                    const dateLabel = deliveryDate.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
                    return (
                      <button key={opt.id} type="button" onClick={() => setShipping(opt)}
                        className={`w-full text-left p-3 border transition-all duration-300 ${shipping.id === opt.id ? 'border-navy bg-navy/5' : 'border-sand/60 hover:border-stone'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-charcoal text-sm font-light">{opt.labelAr}</span>
                            <p className="text-stone text-[0.55rem] font-light mt-0.5">وصول بحد أقصى {dateLabel}</p>
                          </div>
                          <span className="text-charcoal text-sm font-light shrink-0 ml-2">{opt.price === 0 ? 'مجاناً' : `EGP ${opt.price}`}</span>
                        </div>
                      </button>
                    );
                  })}</div>
                </div>

                <Fld label="ملاحظات" name="notes" value={form.notes} onChange={handleChange} area placeholder="أي تعليمات خاصة..." />

                <div>
                  <label className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light block mb-2">كود الخصم</label>
                  <div className="flex gap-2">
                    <input type="text" value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())} placeholder="LOWKEY10"
                      className="flex-1 bg-transparent border-b border-sand py-2 text-charcoal text-sm font-mono tracking-wider uppercase placeholder:text-stone/30 focus:outline-none focus:border-navy" />
                    <button type="button" onClick={applyDiscount} className="text-[0.6rem] tracking-[0.15em] uppercase text-navy border border-navy/30 px-4 py-2 hover:bg-navy hover:text-cream transition-all">Apply</button>
                  </div>
                  {discountMsg && <p className={`mt-2 text-xs ${discount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{discountMsg}</p>}
                </div>

                <div className="pt-4 border-t border-sand/50 space-y-2">
                  <div className="flex justify-between text-sm font-light"><span className="text-stone">المنتجات</span><span className="text-charcoal">EGP {subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm font-light"><span className="text-stone">الشحن — {shipping.labelAr}</span><span className="text-charcoal">{shipping.price === 0 ? 'مجاناً' : `EGP ${shipping.price}`}</span></div>
                  {discount > 0 && <div className="flex justify-between text-sm font-light"><span className="text-emerald-600">الخصم</span><span className="text-emerald-600">- EGP {discount.toLocaleString()}</span></div>}
                  <div className="flex justify-between items-center pt-3 border-t border-sand/30">
                    <span className="text-[0.6rem] tracking-[0.2em] uppercase text-stone font-light">المجموع</span>
                    <span className="font-serif text-xl text-charcoal font-light">EGP {Math.max(0, total).toLocaleString()}</span>
                  </div>
                </div>

                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <input type="text" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
                </div>

                <div className="flex items-center justify-center gap-2 text-stone/50 text-[0.55rem] font-light">
                  <span>🔒</span>
                  <span>Secure Checkout · دفع آمن عند الاستلام</span>
                </div>

                <button type="submit" disabled={status === 'loading'} className="btn-luxury w-full justify-center disabled:opacity-50">
                  {status === 'loading' ? 'جاري الإرسال...' : 'تأكيد الطلب'}
                </button>
                <p className="text-center text-stone/50 text-[0.55rem] font-light">الدفع عند الاستلام · هيتبعتلك تأكيد على الواتساب</p>
                
                {/* REAL reviews — shown dynamically if any exist */}
                {randomReview && (
                  <div className="mt-4 p-3 bg-sand/20 rounded-sm border border-sand/30">
                    <div className="flex items-center gap-1 text-amber-400 text-xs">{'★★★★★'.slice(0, randomReview.rating)}</div>
                    <p className="text-stone text-[0.55rem] font-light mt-1 italic">"{randomReview.text}"</p>
                    <p className="text-stone/50 text-[0.5rem] mt-1">— {randomReview.name} · Verified</p>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Fld({ label, name, value, onChange, error, type = 'text', placeholder, hint, area }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string; type?: string; placeholder?: string; hint?: string; area?: boolean;
}) {
  const cls = `w-full bg-transparent py-3 text-charcoal text-sm font-light placeholder:text-stone/40 focus:outline-none transition-colors ${error ? 'border-red-400' : 'focus:border-navy'}`;
  return <div>
    <label className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light block mb-1.5">{label}</label>
    {area ? <textarea name={name} value={value} onChange={onChange} rows={2} placeholder={placeholder} className={`${cls} border border-sand p-3 resize-none`} />
      : <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className={`${cls} border-b border-sand`} />}
    {hint && <p className="text-stone/40 text-[0.5rem] mt-0.5">{hint}</p>}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>;
}
