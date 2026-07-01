import { useState, useEffect, useRef } from 'react';
import { useInView } from '../hooks/useInView';
import { useCMS } from '../lib/cms';
import { Link } from '../router';

export default function Hero() {
  const cms = useCMS();
  const [phase, setPhase] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const heroUrl = cms.hero_image || '/images/hero.jpg';
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(heroUrl);

  useEffect(() => {
    // Phase 0 → 1: reveal overlay fade (immediately)
    const t1 = setTimeout(() => setPhase(1), 100);
    // Phase 1 → 2: text reveal
    const t2 = setTimeout(() => setPhase(2), 800);
    // Phase 2 → 3: CTA
    const t3 = setTimeout(() => setPhase(3), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <section className="relative h-screen min-h-[600px] max-h-[1080px] flex flex-col overflow-hidden">

      {/* ── Background Media ──────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {isVideo ? (
          <video
            ref={videoRef}
            src={heroUrl}
            autoPlay muted loop playsInline
            loading="eager"
            className={`w-full h-full object-cover luxury-image transition-all duration-[2400ms] ${
              loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
            onLoadedData={() => setLoaded(true)}
          />
        ) : (
          <img
            src={heroUrl}
            alt=""
            loading="eager"
            fetchPriority="high"
            className={`w-full h-full object-cover luxury-image transition-all duration-[2400ms] ${
              loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
            onLoad={() => setLoaded(true)}
          />
        )}

        {/* Gradient — heavier at bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent via-40% to-black/70" />
        {/* Subtle vignette */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.25) 100%)'
        }} />
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col h-full">

        {/* Top area — eyebrow */}
        <div className="container-lk pt-32 md:pt-40">
          <span
            className={`type-label text-cream/60 transition-all duration-700 ${
              phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
          >
            {cms.hero_eyebrow || 'Drop 001 — 2026'}
          </span>
        </div>

        {/* Center — main headline */}
        <div className="flex-1 flex items-end container-lk pb-16 md:pb-20">
          <div className="max-w-4xl">
            {/* Headline */}
            <h1
              className={`type-h1 text-cream transition-all duration-1000 ${
                phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 300,
                fontStyle: 'italic',
                letterSpacing: '0.06em',
                lineHeight: 1.1,
                transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)',
              }}
            >
              {cms.hero_title || 'A Study in Heritage and Silence'}
            </h1>

            {/* Subline */}
            <p
              className={`mt-4 md:mt-6 type-body text-cream/65 max-w-lg transition-all duration-1000 delay-200 ${
                phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
            >
              {cms.hero_subtitle || 'Crafted in Port Said · Egyptian Long-Staple Cotton'}
            </p>

            {/* CTAs */}
            <div
              className={`mt-8 md:mt-10 flex flex-wrap items-center gap-4 md:gap-6 transition-all duration-700 delay-300 ${
                phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
            >
              <Link to="/drop/001" className="btn-luxury btn-luxury-light">
                {cms.hero_cta || 'View the Collection'}
              </Link>
              <Link to="/about" className="type-label text-cream/60 hover:text-cream transition-colors duration-300 flex items-center gap-2">
                Our Story
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom — scroll indicator */}
        <div
          className={`container-lk pb-6 flex items-center justify-between transition-all duration-700 delay-700 ${
            phase >= 3 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-px bg-cream/30" />
            <span className="type-label text-cream/40">Scroll</span>
          </div>
          <span className="type-label text-cream/30">Made in Egypt</span>
        </div>
      </div>
    </section>
  );
}
