// ============================================================================
// LOWKEY — Back In Stock Modal
// Email required, WhatsApp optional. Submits to backInStock lib.
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { subscribeBackInStock } from '../lib/backInStock';

interface BackInStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productSlug: string;
  productName: string;
  size?: string;
  availableSizes: string[];
}

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function BackInStockModal({
  isOpen,
  onClose,
  productSlug,
  productName,
  size: defaultSize,
  availableSizes,
}: BackInStockModalProps) {
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedSize, setSelectedSize] = useState(defaultSize ?? availableSizes[0] ?? '');
  const [formState, setFormState] = useState<FormState>('idle');
  const emailRef = useRef<HTMLInputElement>(null);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setFormState('idle');
      setEmail('');
      setWhatsapp('');
      setSelectedSize(defaultSize ?? availableSizes[0] ?? '');
      setTimeout(() => emailRef.current?.focus(), 100);
    }
  }, [isOpen, defaultSize, availableSizes]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!email.includes('@') || !selectedSize) return;
    setFormState('loading');
    const { success } = await subscribeBackInStock(
      productSlug,
      selectedSize,
      email,
      whatsapp || undefined
    );
    setFormState(success ? 'success' : 'error');
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[80] bg-navy/40 backdrop-blur-[2px] transition-opacity duration-500 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notify me when back in stock"
        className={`fixed inset-0 z-[90] flex items-center justify-center px-6 transition-all duration-500 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="w-full max-w-md bg-cream p-10 relative">
          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-6 right-6 text-stone hover:text-charcoal transition-colors duration-300"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="0.75" />
            </svg>
          </button>

          <span className="text-stone text-[0.55rem] tracking-[0.35em] uppercase font-light block mb-6">
            Notify Me
          </span>
          <h2 className="font-serif text-2xl font-light text-charcoal mb-2 tracking-wide">
            {productName}
          </h2>
          <p className="text-stone text-sm font-light leading-relaxed mb-8">
            We'll let you know the moment your size is back.
            <br />
            <span className="text-[0.65rem] tracking-[0.1em]">هنبلّغك أول ما يرجع المقاس</span>
          </p>

          {formState === 'success' ? (
            <div className="text-center py-6">
              <p className="font-serif text-xl text-charcoal font-light mb-2">Done ✓</p>
              <p className="text-stone text-sm font-light">
                We'll notify you when {selectedSize} is back.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Size selector */}
              {availableSizes.length > 1 && (
                <div>
                  <label className="text-stone text-[0.55rem] tracking-[0.3em] uppercase font-light block mb-3">
                    Size
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map(s => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`min-w-[3rem] h-10 border text-[0.65rem] tracking-[0.1em] font-light transition-all duration-300 px-3 ${
                          selectedSize === s
                            ? 'border-navy text-navy bg-navy/5'
                            : 'border-sand/80 text-charcoal hover:border-navy'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label
                  htmlFor="bis-email"
                  className="text-stone text-[0.55rem] tracking-[0.3em] uppercase font-light block mb-2"
                >
                  Email *
                </label>
                <input
                  ref={emailRef}
                  id="bis-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-sand/80 bg-transparent px-4 py-3 text-sm font-light text-charcoal placeholder-stone/40 focus:outline-none focus:border-navy transition-colors duration-300"
                  required
                />
              </div>

              {/* WhatsApp (optional) */}
              <div>
                <label
                  htmlFor="bis-whatsapp"
                  className="text-stone text-[0.55rem] tracking-[0.3em] uppercase font-light block mb-2"
                >
                  WhatsApp{' '}
                  <span className="normal-case tracking-normal text-[0.5rem] text-stone/50">optional</span>
                </label>
                <input
                  id="bis-whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="+20 1XX XXX XXXX"
                  className="w-full border border-sand/80 bg-transparent px-4 py-3 text-sm font-light text-charcoal placeholder-stone/40 focus:outline-none focus:border-navy transition-colors duration-300"
                />
              </div>

              {formState === 'error' && (
                <p className="text-stone/70 text-[0.65rem] tracking-[0.1em] font-light italic">
                  Something went wrong. Please try again.
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!email.includes('@') || !selectedSize || formState === 'loading'}
                className="btn-luxury w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {formState === 'loading' ? 'Saving...' : 'Notify Me'}
              </button>

              <p className="text-stone/50 text-[0.55rem] font-light text-center">
                No spam. One email when it's back, nothing else.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
