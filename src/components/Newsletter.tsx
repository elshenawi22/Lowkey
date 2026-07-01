import { useState } from 'react';
import { useInView } from '../hooks/useInView';
import { saveSubscriber } from '../lib/newsletter';
import { notifyNewSubscriber } from '../lib/notifications';
import { track } from '../lib/analytics';
import { useCMS } from '../lib/cms';

export default function Newsletter() {
  const { ref, isInView } = useInView(0.3);
  const cms = useCMS();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;
    setStatus('loading');
    try {
      const r = await saveSubscriber(email.trim(), 'homepage');
      if (r.success) {
        setStatus('done');
        track.subscribe('homepage');
        notifyNewSubscriber(email.trim());
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section
      ref={ref}
      id="newsletter"
      className="bg-bone section-padding border-t border-sand/30"
    >
      <div className="container-narrow text-center">
        <div className={`transition-all duration-1000 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}>

          <span className="eyebrow">Early Access</span>
          <h2 className="type-h2 text-charcoal mb-4">
            {cms.newsletter_title || 'Be first for Drop 002'}
          </h2>
          <p className="type-body text-stone max-w-md mx-auto mb-12">
            {cms.newsletter_subtitle || 'Join the list and receive exclusive early access before the public launch.'}
          </p>

          {status === 'done' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-px bg-stone" />
              <p className="type-body text-charcoal">You're on the list.</p>
              <p className="type-caption text-stone">We'll be in touch before Drop 002 drops.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto border-b border-charcoal">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={status === 'loading'}
                className="flex-1 bg-transparent py-3 px-0 text-charcoal text-sm font-light placeholder:text-stone/50
                  border-none outline-none focus:outline-none disabled:opacity-50"
                style={{ fontFamily: 'var(--font-sans)', letterSpacing: '0.02em' }}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="type-label text-charcoal py-3 px-4 bg-transparent border-none cursor-pointer
                  hover:opacity-60 transition-opacity duration-300 disabled:opacity-40 shrink-0"
              >
                {status === 'loading' ? '···' : (cms.newsletter_btn || 'Join')}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="mt-3 type-caption text-stone/60">Something went wrong. Please try again.</p>
          )}

          <p className="mt-8 type-caption text-stone/40">
            No noise. No spam. Only what matters.
          </p>
        </div>
      </div>
    </section>
  );
}
