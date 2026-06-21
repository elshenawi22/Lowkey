import { useEffect, useState, useRef } from 'react';
import { useRouter } from '../router';
import { useCMS } from '../lib/cms';

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

export default function Hero() {
  const { navigate } = useRouter();
  const cms = useCMS();
  const [phase, setPhase] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // hero_image now supports both images AND videos — auto-detect
  const heroUrl = cms.hero_image || '/images/hero.jpg';
  const isVideo = isVideoUrl(heroUrl);

  useEffect(() => {
    if (!loaded) return;
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => setPhase(3), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [loaded]);

  useEffect(() => {
    if (isVideo && videoRef.current) {
      videoRef.current.oncanplay = () => setLoaded(true);
      videoRef.current.play().catch(() => {});
    }
  }, [isVideo]);

  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden bg-navy">
      <div className="absolute inset-0">
        {isVideo ? (
          <video ref={videoRef} src={heroUrl} muted loop playsInline preload="auto"
            className={`w-full h-full object-cover transition-all duration-[2s] ease-out ${phase >= 1 ? 'scale-100 opacity-100' : 'scale-110 opacity-0'}`}
            style={{ filter: 'contrast(0.95) saturate(0.9) brightness(1.02)' }} />
        ) : (
          <img src={heroUrl} alt={cms.hero_title} fetchPriority="high" loading="eager"
            onLoad={() => setLoaded(true)}
            className={`w-full h-full object-cover luxury-image transition-all duration-[2s] ease-out ${phase >= 1 ? 'scale-100 opacity-100' : 'scale-110 opacity-0'}`} />
        )}
        <div className="absolute inset-0 bg-navy/45" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-end h-full px-6 pb-24 md:pb-32">
        <div className="text-center">
          <h1 className={`font-serif text-cream transition-all duration-[1.8s] ease-out ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="block text-5xl md:text-7xl lg:text-[6.5rem] font-light tracking-[0.25em] leading-none">{cms.hero_title}</span>
          </h1>
          <p className={`font-serif text-cream/70 text-base md:text-xl lg:text-2xl font-light tracking-[0.12em] mt-5 md:mt-8 italic transition-all duration-[1.5s] ease-out ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
            {cms.hero_slogan}
          </p>
          <div className={`mt-10 md:mt-14 transition-all duration-[1.5s] ease-out ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <button onClick={() => navigate('/drop/001')} className="btn-luxury btn-luxury-light group">
              {cms.hero_cta}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transition-transform duration-500 group-hover:translate-x-1"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="0.75" /></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
