import { useInView } from '../hooks/useInView';
import { Link } from '../router';
import Hero from '../components/Hero';
import CollectionShowcase from '../components/CollectionShowcase';
import ReviewsSlider from '../components/ReviewsSlider';
import Newsletter from '../components/Newsletter';
import { useCMS } from '../lib/cms';
import { products } from '../data/catalog';

// ── Manifesto ────────────────────────────────────────────────────────────
function Manifesto() {
  const { ref, isInView } = useInView(0.25);
  return (
    <section ref={ref} className="bg-cream section-padding">
      <div className="container-narrow text-center">
        <span className={`eyebrow transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Philosophy
        </span>
        <div className={`transition-all duration-1000 delay-100 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}>
          <div className="divider" />
          <h2 className="type-h2 text-charcoal mt-8 mb-6" style={{ fontStyle: 'italic', letterSpacing: '0.04em' }}>
            We don't chase trends.<br />
            We build garments that outlast them.
          </h2>
          <p className="type-body-lg text-stone max-w-xl mx-auto">
            Egyptian cotton. Quiet details. Made in Port Said for those who value substance over noise.
          </p>
          <div className="divider mt-8" />
        </div>
        <div className={`mt-10 transition-all duration-700 delay-300 ${isInView ? 'opacity-100' : 'opacity-0'}`}>
          <Link to="/about" className="btn-ghost">
            Read the story →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Collection Grid ───────────────────────────────────────────────────────
function CollectionGrid() {
  const { ref, isInView } = useInView(0.1);
  const available = products.filter(p => p.sizes.some(s => p.stock[s] !== 'sold_out'));

  return (
    <section ref={ref} id="collection" className="bg-offwhite section-padding">
      <div className="container-lk">
        {/* Header */}
        <div className={`flex items-end justify-between mb-14 transition-all duration-700 ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div>
            <span className="eyebrow">Drop 001 — 2026</span>
            <h2 className="type-h2 text-charcoal">The Collection</h2>
          </div>
          <Link to="/drop/001" className="btn-ghost hidden md:flex">
            View all pieces →
          </Link>
        </div>

        {/* Grid — 2 col mobile, 4 col desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-14">
          {products.map((product, i) => (
            <div
              key={product.slug}
              className={`transition-all duration-1000 ${
                isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: `${i * 100 + 200}ms`,
                transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)'
              }}
            >
              <CollectionShowcase product={product} index={i} />
            </div>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-12 text-center md:hidden">
          <Link to="/drop/001" className="btn-luxury">View All Pieces</Link>
        </div>
      </div>
    </section>
  );
}

// ── Craft Stats ────────────────────────────────────────────────────────────
function CraftSection() {
  const { ref, isInView } = useInView(0.2);
  const stats = [
    { n: '220–260', unit: 'GSM', l: 'Heavyweight Construction',
      d: 'Substantial weight that drapes correctly and improves with every wash.' },
    { n: '100%', unit: '', l: 'Egyptian Long-Staple Cotton',
      d: 'Grown in the Nile Delta. Among the finest natural fibers in the world.' },
    { n: 'Port Said', unit: '', l: 'Made in Egypt',
      d: 'Rooted in one of the world\'s oldest maritime textile traditions.' },
  ];
  return (
    <section ref={ref} className="bg-navy section-padding overflow-hidden">
      <div className="container-lk">
        <span className={`eyebrow text-cream/40 transition-all duration-700 ${isInView ? 'opacity-100' : 'opacity-0'}`}>
          The Standard
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/8 mt-10">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`bg-navy p-10 lg:p-14 transition-all duration-1000 ${
                isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: `${i * 150 + 200}ms`,
                transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)'
              }}
            >
              {/* Big number */}
              <div className="flex items-baseline gap-2 mb-4">
                <span
                  className="text-cream font-light"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                    letterSpacing: '0.02em',
                    lineHeight: 1,
                  }}
                >
                  {s.n}
                </span>
                {s.unit && (
                  <span className="type-label text-cream/40">{s.unit}</span>
                )}
              </div>
              <p className="type-label text-cream/60 mb-4">{s.l}</p>
              <p className="type-caption text-cream/35 leading-relaxed max-w-xs">{s.d}</p>
            </div>
          ))}
        </div>

        <div className={`mt-12 transition-all duration-700 delay-600 ${isInView ? 'opacity-100' : 'opacity-0'}`}>
          <Link to="/about" className="btn-luxury btn-luxury-light">
            The LOWKEY Story
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Editorial Campaign Strip ─────────────────────────────────────────────
function EditorialStrip() {
  const { ref, isInView } = useInView(0.15);
  return (
    <section ref={ref} className="bg-cream overflow-hidden">
      <div className={`relative h-[55vh] min-h-[380px] max-h-[600px] transition-all duration-1200 ${
        isInView ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}>
        <img
          src="/images/collection-campaign.jpg"
          alt="Drop 001 — A Study in Heritage and Silence"
          loading="lazy"
          className="w-full h-full object-cover luxury-image"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex items-end container-lk pb-14">
          <div
            className={`transition-all duration-1000 delay-300 ${
              isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
          >
            <span className="type-label text-cream/60 block mb-3">Drop 001 — Campaign</span>
            <p
              className="text-cream max-w-lg"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                fontWeight: 300,
                fontStyle: 'italic',
                letterSpacing: '0.04em',
                lineHeight: 1.2,
              }}
            >
              "Quiet in its presence. Precise in its details."
            </p>
            <Link to="/drop/001" className="mt-6 inline-block btn-luxury btn-luxury-light">
              Explore Drop 001
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main>
      <Hero />
      <Manifesto />
      <CollectionGrid />
      <EditorialStrip />
      <CraftSection />
      <ReviewsSlider />
      <Newsletter />
    </main>
  );
}
