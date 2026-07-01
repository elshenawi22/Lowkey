import { useState, useEffect } from 'react';
import { useBag } from '../context/BagContext';
import { getProduct } from '../data/catalog';
import { Link } from '../router';
import CheckoutDrawer from './CheckoutDrawer';

export default function BagDrawer() {
  const { items, isOpen, close, remove, updateQty, subtotal, count } = useBag();
  const [showCheckout, setShowCheckout] = useState(false);

  // Reset checkout state when bag closes
  useEffect(() => {
    if (!isOpen) setShowCheckout(false);
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-navy/30 backdrop-blur-[2px] transition-opacity duration-700 ${
          isOpen && !showCheckout ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
      />

      {/* Bag Panel */}
      <aside
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-md bg-cream transition-transform duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
          isOpen && !showCheckout ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
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
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="0.75" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-8">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="font-serif text-xl text-charcoal/50 font-light italic">
                  فارغ
                </p>
                <p className="mt-2 text-stone text-[0.65rem] tracking-[0.2em] uppercase font-light">
                  Your selection is empty
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
              <ul className="divide-y divide-sand/40">
                {items.map((item) => {
                  const p = getProduct(item.slug);
                  if (!p) return null;
                  return (
                    <li key={`${item.slug}-${item.size}`} className="flex gap-5 py-6">
                      <Link to={`/product/${p.slug}`} onClick={close} className="shrink-0">
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
                            <h4 className="font-serif text-base text-charcoal font-light">
                              {p.name}
                            </h4>
                            <p className="text-stone text-[0.6rem] tracking-[0.2em] uppercase mt-1 font-light">
                              Size {item.size}
                            </p>
                          </div>
                          <span className="text-charcoal text-sm font-light">{p.price}</span>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => updateQty(item.slug, item.size, item.qty - 1)}
                              className="w-6 h-6 border border-sand text-stone hover:border-navy hover:text-navy transition-colors duration-500 flex items-center justify-center text-xs"
                            >
                              −
                            </button>
                            <span className="text-sm text-charcoal w-4 text-center font-light">
                              {item.qty}
                            </span>
                            <button
                              onClick={() => updateQty(item.slug, item.size, item.qty + 1)}
                              className="w-6 h-6 border border-sand text-stone hover:border-navy hover:text-navy transition-colors duration-500 flex items-center justify-center text-xs"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => remove(item.slug, item.size)}
                            className="text-stone/60 text-[0.6rem] tracking-[0.2em] uppercase hover:text-charcoal transition-colors duration-500"
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
            <div className="border-t border-sand/50 px-8 py-8 space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-[0.6rem] tracking-[0.3em] uppercase text-stone font-light">
                  المجموع / Subtotal
                </span>
                <span className="font-serif text-xl text-charcoal font-light">
                  EGP {subtotal.toLocaleString('en-EG')}
                </span>
              </div>
              <button
                onClick={() => setShowCheckout(true)}
                className="btn-luxury w-full justify-center"
              >
                Checkout
              </button>
              <p className="text-center text-stone/50 text-[0.55rem] font-light">
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
