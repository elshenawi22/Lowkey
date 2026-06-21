import { useState, useEffect } from 'react';
import { useCMS } from '../lib/cms';
import { subscribe } from '../lib/newsletter';
import { notifyNewSubscriber } from '../lib/notifications';

export default function LaunchPage() {
  const cms = useCMS();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'exists' | 'error'>('idle');
  const [phase, setPhase] = useState(0);
  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [hasCountdown, setHasCountdown] = useState(false);

  // Staged entrance
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 2000);
    const t4 = setTimeout(() => setPhase(4), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // Countdown
  useEffect(() => {
    if (!cms.launch_date) { setHasCountdown(false); return; }
    const target = new Date(cms.launch_date).getTime();
    if (isNaN(target)) { setHasCountdown(false); return; }
    setHasCountdown(true);
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setCountdown({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [cms.launch_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'loading') return;
    setStatus('loading');
    const r = await subscribe(email, 'launch-page');
    if (r.success) { setStatus('done'); notifyNewSubscriber(email); setEmail(''); }
    else if (r.error === 'already') { setStatus('exists'); }
    else { setStatus('error'); }
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  // Launch page background is always a static image now — large autoplay
  // video over weak mobile connections caused the background to flash and
  // disappear, since the browser would abort a 10MB+ video mid-load. A
  // photo loads in a fraction of the time and never silently fails this way.
  // If cms.launch_image happens to point at a video file (legacy data),
  // fall back straight to hero.jpg rather than trying to play it.
  const isImageUrl = !!cms.launch_image && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(cms.launch_image);
  const backgroundImage = isImageUrl ? cms.launch_image : '/images/hero.jpg';

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background — static image only (see note above) */}
      <div className="absolute inset-0 bg-navy">
        <img
          src={backgroundImage}
          alt=""
          loading="eager"
          className={`w-full h-full object-cover transition-all duration-[3s] ${phase >= 1 ? 'scale-100 opacity-100' : 'scale-110 opacity-0'}`}
          style={{ filter: 'contrast(0.9) saturate(0.8) brightness(0.4)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/30 via-transparent to-navy/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">

          {/* Logo */}
          <div className={`transition-all duration-[2s] ease-out ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h1 className="font-serif text-cream text-5xl md:text-6xl lg:text-7xl font-light tracking-[0.35em] leading-none">
              LOWKEY
            </h1>
            <div className="w-12 h-px bg-cream/20 mx-auto mt-6" />
          </div>

          {/* Title */}
          <div className={`mt-10 transition-all duration-[1.8s] ease-out ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="font-serif text-cream/90 text-lg md:text-xl lg:text-2xl font-light tracking-[0.05em] leading-relaxed">
              {cms.launch_title}
            </h2>
            <p className="font-serif text-cream/40 text-sm md:text-base font-light italic mt-2 tracking-wide">
              {cms.launch_subtitle}
            </p>
          </div>

          {/* Countdown */}
          {hasCountdown && (
            <div className={`mt-12 transition-all duration-[1.5s] ease-out ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="grid grid-cols-4 gap-4 max-w-xs mx-auto">
                {[
                  { v: countdown.d, l: 'Days', a: 'يوم' },
                  { v: countdown.h, l: 'Hours', a: 'ساعة' },
                  { v: countdown.m, l: 'Min', a: 'دقيقة' },
                  { v: countdown.s, l: 'Sec', a: 'ثانية' },
                ].map(({ v, l }) => (
                  <div key={l}>
                    <div className="border border-cream/10 bg-cream/[0.03] backdrop-blur-sm py-4 rounded">
                      <span className="font-serif text-cream text-3xl md:text-4xl font-light">{pad(v)}</span>
                    </div>
                    <p className="text-cream/25 text-[0.5rem] tracking-[0.2em] uppercase mt-2.5">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email */}
          <div className={`mt-12 transition-all duration-[1.5s] ease-out ${phase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {status === 'done' ? (
              <div>
                <p className="font-serif text-cream text-lg font-light">✓</p>
                <p className="text-cream/50 text-sm font-light mt-2">You're on the list.</p>
              </div>
            ) : status === 'exists' ? (
              <p className="text-cream/50 text-sm font-light">أنت مشترك بالفعل ✓</p>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
                <input
                  type="text" value={email}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '531999') {
                      sessionStorage.setItem('lk-go-admin', '1');
                      window.history.pushState(null, '', '/lk-admin');
                      window.location.reload();
                      return;
                    }
                    setEmail(v);
                  }}
                  placeholder="your@email.com" disabled={status === 'loading'}
                  className="flex-1 bg-cream/[0.05] backdrop-blur-sm border border-cream/10 py-3.5 px-5 text-cream text-sm placeholder:text-cream/20 focus:outline-none focus:border-cream/25 rounded transition-colors disabled:opacity-40"
                />
                <button type="submit" disabled={status === 'loading'}
                  className="bg-cream/10 backdrop-blur-sm border border-cream/15 text-cream py-3.5 px-6 text-[0.6rem] tracking-[0.2em] uppercase rounded hover:bg-cream/20 transition-all disabled:opacity-40">
                  {status === 'loading' ? '···' : 'Notify'}
                </button>
              </form>
            )}
            {status === 'error' && <p className="text-red-400/50 text-xs mt-3">Something went wrong</p>}
          </div>

          {/* Instagram */}
          <div className={`mt-14 transition-all duration-[1.5s] ease-out ${phase >= 4 ? 'opacity-100' : 'opacity-0'}`}>
            <a href={cms.brand_instagram} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 text-cream/25 text-[0.55rem] tracking-[0.25em] uppercase hover:text-cream/50 transition-colors duration-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              Instagram
            </a>
          </div>
        </div>
      </div>

      {/* Bottom — admin link hidden */}
      <div className={`absolute bottom-8 left-0 right-0 text-center transition-all duration-1000 ${phase >= 4 ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={() => { sessionStorage.setItem('lk-go-admin', '1'); window.history.pushState(null, '', '/lk-admin'); window.location.reload(); }}
          className="text-cream/10 text-[0.45rem] tracking-[0.3em] uppercase cursor-default bg-transparent border-none"
        >
          Port Said, Egypt
        </button>
      </div>
    </main>
  );
}
