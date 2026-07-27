// ============================================================================
// LOWKEY — Bag Drawer
// Free shipping progress · Estimated delivery · Better empty state
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { useBag } from '../context/BagContext';
import { getProduct } from '../data/catalog';
import { Link } from '../router';
import CheckoutDrawer from './CheckoutDrawer';

// Free shipping threshold in EGP — read from CMS if available
function getFreeShippingThreshold(): number {
  try {
    const s = localStorage.getItem('lowkey-cms');
    if (s) {
      const cms = JSON.parse(s);
      const val = parseInt(cms.free_shipping_threshold ?? '', 10);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch { /* ignore */ }
  return 1000;
}

// Estimated delivery copy based on city — shown post-checkout
// Shown in bag as generic estimate
const DELIVERY_ESTIMATE = '2–5 business days';

export default function BagDrawer() {
  const { items, isOpen, close, remove, updateQty, subtotal, count } = useBag();
  const [showCheckout, setShowCheckout] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const threshold = useMemo(getFreeShippingThreshold, []);
  const progress = Math.min((subtotal / threshold) * 100, 100);
  const remaining = Math.max(threshold - subtotal, 0);
  const freeShippingUnlocked = subtotal >= threshold;

  // Reset checkout state when bag closes
  useEffect(() => {
    if (!isOpen) {
      setShowCheckout(false);
      setRemovingKey(null);
    }
  }, [isOpen]);

  const handleRemove = (slug: string, size: string) => {
    const key = `${slug}-${size}`;
    setRemovingKey(key);
    // Brief delay for exit animation
    setTimeout(() => {
      remove(slug, size);
      setRemovingKey(null);
    }, 350);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-navy/30 backdrop-blur-[2px] transition-opacity duration-700 ${
          isOpen && !showCheckout ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Bag Panel */}
      <aside
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-md bg-cream transition-transform duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
          isOpen && !showCheckout ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Your Selection"
      >
        <div className="flex h-full flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-8 py-8 border-b border-sand/50">
            <span className="text-[0.6rem] tracking-[0.35em] uppercase text-stone font-light">
              Your Selection {count > 0 && `(${count})`}
            </span>
            <button
              onClick={close}
              className="text-stone hover:text-charcoal transition-colors duration-500"
              aria-label="Close bag"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="0.75" />
              </svg>
            </button>
          </div>

          {/* Free shipping progress bar */}
          {count > 0 && (
            <div className="px-8 py-4 border-b border-sand/30">
              <div
                className="h-px w-full bg-sand/60 relative overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Free shipping progress"
              >
                <div
                  className="absolute left-0 top-0 h-full bg-navy/60 transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-stone/70 text-[0.55rem] tracking-[0.2em] font-light">
                {freeShippingUnlocked ? (
                  <span className="text-charcoal">
                    ✓ Free shipping on this order
                  </span>
                ) : (
                  <>
                    EGP {remaining.toLocaleString('en-EG')} away from{' '}
                    <span className="text-charcoal font-normal">free shipping</span>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-8">
            {items.length === 0 ? (
              /* Better empty state */
              <div className="flex flex-col items-center justify-center h-full text-center">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 36 36"
                  fill="none"
                  className="text-sand mb-6"
                  aria-hidden="true"
                >
                  <path
                    d="M7 9h22l-2.5 14H9.5L7 9Z"
                    stroke="currentColor"
                    strokeWidth="0.6"
                  />
                  <path
                    d="M12 9V7a6 6 0 0 1 12 0v2"
                    stroke="currentColor"
                    strokeWidth="0.6"
                  />
                  <circle cx="13" cy="27" r="1.5" fill="currentColor" opacity="0.5" />
                  <circle cx="23" cy="27" r="1.5" fill="currentColor" opacity="0.5" />
                </svg>
                <p className="font-serif text-2xl text-charcoal/40 font-light italic tracking-wide">
                  فارغ
                </p>
                <p className="mt-2 text-stone/60 text-[0.6rem] tracking-[0.3em] uppercase font-light">
                  Nothing selected yet
                </p>
                <p className="mt-4 text-stone/40 text-xs font-light leading-relaxed max-w-[200px]">
                  Explore the archive and find what speaks to you.
                </p>
                <Link
                  to="/drop/001"
                  onClick={close}
                  className="btn-luxury mt-8 text-[0.6rem]"
                >
                  View Drop 001
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-sand/40" aria-label="Bag items">
                {items.map((item) => {
                  const p = getProduct(item.slug);
                  if (!p) return null;
                  const key = `${item.slug}-${item.size}`;
                  const isRemoving = removingKey === key;

                  return (
                    <li
                      key={key}
                      className={`flex gap-5 py-6 transition-all duration-350 ${
                        isRemoving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
                      }`}
                    >
                      <Link to={`/product/${p.slug}`} onClick={close} className="shrink-0" tabIndex={-1}>
                        <div className="w-20 h-24 overflow-hidden bg-sand/20">
                          <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            className="w-full h-full object-cover luxury-image"
                          />
                        </div>
                      </Link>

                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-serif text-base text-charcoal font-light leading-snug">
                              {p.name}
                            </h4>
                            <p className="text-stone text-[0.55rem] tracking-[0.2em] uppercase mt-1 font-light">
                              Size {item.size}
                            </p>
                          </div>
                          <span className="text-charcoal text-sm font-light">
                            EGP {(p.priceValue * item.qty).toLocaleString('en-EG')}
                          </span>
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-3">
                          {/* Qty control */}
                          <div className="flex items-center gap-3" role="group" aria-label={`Quantity for ${p.name}`}>
                            <button
                              onClick={() => updateQty(item.slug, item.size, item.qty - 1)}
                              aria-label="Decrease quantity"
                              className="w-7 h-7 border border-sand text-stone hover:border-navy hover:text-navy transition-colors duration-500 flex items-center justify-center text-sm font-light"
                            >
                              −
                            </button>
                            <span className="text-sm text-charcoal w-4 text-center font-light" aria-live="polite">
                              {item.qty}
                            </span>
                            <button
                              onClick={() => updateQty(item.slug, item.size, item.qty + 1)}
                              aria-label="Increase quantity"
                              className="w-7 h-7 border border-sand text-stone hover:border-navy hover:text-navy transition-colors duration-500 flex items-center justify-center text-sm font-light"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => handleRemove(item.slug, item.size)}
                            className="text-stone/50 text-[0.55rem] tracking-[0.2em] uppercase hover:text-charcoal transition-colors duration-500"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-sand/50 px-8 py-7 space-y-5">
              {/* Subtotal */}
              <div className="flex justify-between items-baseline">
                <span className="text-[0.6rem] tracking-[0.3em] uppercase text-stone font-light">
                  Subtotal
                </span>
                <span className="font-serif text-xl text-charcoal font-light">
                  EGP {subtotal.toLocaleString('en-EG')}
                </span>
              </div>

              {/* Estimated delivery line */}
              <p className="text-stone/60 text-[0.55rem] tracking-[0.15em] font-light flex items-center gap-2">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="0.6" />
                  <path d="M6 3.5v3l1.5 1.5" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" />
                </svg>
                Estimated delivery: {DELIVERY_ESTIMATE}
              </p>

              {/* CTA */}
              <button
                onClick={() => setShowCheckout(true)}
                className="btn-luxury w-full justify-center"
              >
                Checkout
              </button>

              <p className="text-center text-stone/50 text-[0.55rem] tracking-[0.1em] font-light">
                الدفع عند الاستلام أو بالتحويل
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Checkout Drawer */}
      <CheckoutDrawer
        isOpen={isOpen && showCheckout}
        onClose={() => {
          setShowCheckout(false);
          close();
        }}
        onBack={() => setShowCheckout(false)}
      />
    </>
  );
}
