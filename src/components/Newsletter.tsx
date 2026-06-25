import { useState } from 'react';
import { useInView } from '../hooks/useInView';
import { subscribe } from '../lib/newsletter';
import { track } from '../lib/analytics';
import { notifyNewSubscriber } from '../lib/notifications';
import { useCMS } from '../lib/cms';
import { rateLimit, isValidEmail } from '../lib/security';

export default function Newsletter() {
  const { ref, isInView } = useInView(0.3);
  const cms = useCMS();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'loading') return;
    setStatus('loading');
    
    if (!isValidEmail(email)) { setStatus('error'); setErrorMsg('Invalid email'); return; }
    const rl = rateLimit('subscribe', 10);
    if (!rl.allowed) { setStatus('error'); setErrorMsg('Too many attempts'); return; }

    const result = await subscribe(email, 'newsletter');
    if (result.success) {
      setStatus('success');
      track.subscribe('newsletter');
      notifyNewSubscriber(email);
      setEmail('');
    } else if (result.error === 'already') {
      setStatus('error');
      setErrorMsg('أنت مشترك بالفعل ✓ — You are already subscribed');
    } else {
      setStatus('error');
      setErrorMsg(result.error || 'حدث خطأ');
    }
  };

  return (
    <section ref={ref} className="bg-sand/30 py-20 md:py-28 lg:py-36">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
        <div className="max-w-lg mx-auto text-center">
          <span className={`text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light block transition-all duration-1000 ${isInView ? 'opacity-100' : 'opacity-0'}`}>{cms.newsletter_label}</span>
          <h2 className={`font-serif text-2xl md:text-3xl font-light text-charcoal mt-6 tracking-wide transition-all duration-1000 delay-200 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>{cms.newsletter_title}</h2>
          <p className={`mt-4 text-stone text-sm font-light transition-all duration-1000 delay-300 ${isInView ? 'opacity-100' : 'opacity-0'}`}>{cms.newsletter_subtitle}</p>
          <div className={`mt-10 transition-all duration-1000 delay-500 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {status === 'success' ? (
              <div className="py-4">
                <p className="font-serif text-lg text-navy font-light">{cms.newsletter_success}</p>
                <p className="mt-2 text-stone text-sm font-light">You're on the list.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required disabled={status === 'loading'}
                  className="flex-1 bg-transparent border-b border-sand py-3 text-charcoal text-sm font-light placeholder:text-stone/50 focus:outline-none focus:border-navy transition-colors duration-500 disabled:opacity-50" />
                <button type="submit" disabled={status === 'loading'} className="btn-luxury text-[0.6rem] px-8 py-3 disabled:opacity-50">
                  {status === 'loading' ? '...' : cms.newsletter_btn}
                </button>
              </form>
            )}
            {status === 'error' && <p className="mt-3 text-red-600 text-sm font-light">{errorMsg}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
