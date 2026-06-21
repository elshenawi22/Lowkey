import Hero from '../components/Hero';
import CollectionShowcase from '../components/CollectionShowcase';
import ReviewsSlider from '../components/ReviewsSlider';
import Newsletter from '../components/Newsletter';
import { useInView } from '../hooks/useInView';
import { Link } from '../router';

function Manifesto() {
  const { ref, isInView } = useInView(0.3);
  return (
    <section ref={ref} className="bg-cream py-24 md:py-36 lg:py-44">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <div className={`transition-all duration-[1.5s] ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="w-10 h-px bg-navy/20 mx-auto mb-10" />
          <p className="font-serif text-xl md:text-2xl lg:text-3xl text-charcoal font-light leading-[1.5] tracking-wide">
            We don't chase trends.<br />
            We build garments that outlast them.
          </p>
          <p className="mt-8 text-stone text-sm md:text-base font-light leading-relaxed max-w-lg mx-auto">
            Egyptian cotton. Quiet details. Made in Port Said for those who value substance over noise.
          </p>
          <div className="w-10 h-px bg-navy/20 mx-auto mt-10" />
        </div>
      </div>
    </section>
  );
}

function CraftSection() {
  const { ref, isInView } = useInView(0.2);
  return (
    <section ref={ref} className="bg-offwhite py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-16 text-center">
          {[
            { n: '220-260', l: 'GSM Weight', d: 'Heavyweight construction that drapes properly and improves with age.' },
            { n: '100%', l: 'Egyptian Cotton', d: 'Long-staple fibers from the Nile Delta — the finest cotton on earth.' },
            { n: 'Port Said', l: 'Made in Egypt', d: 'Rooted in one of the world\'s oldest textile traditions.' },
          ].map((item, i) => (
            <div key={i} className={`transition-all duration-[1.5s] ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 200}ms` }}>
              <p className="font-serif text-3xl md:text-4xl text-charcoal font-light">{item.n}</p>
              <p className="text-stone text-[0.6rem] tracking-[0.3em] uppercase font-light mt-2">{item.l}</p>
              <p className="text-stone text-sm font-light leading-relaxed mt-4 max-w-xs mx-auto">{item.d}</p>
            </div>
          ))}
        </div>
        <div className={`mt-16 text-center transition-all duration-1000 delay-600 ${isInView ? 'opacity-100' : 'opacity-0'}`}>
          <Link to="/about" className="text-charcoal text-[0.6rem] tracking-[0.25em] uppercase font-light hover:text-navy transition-colors flex items-center justify-center gap-2">
            Our Story
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transition-transform duration-500 hover:translate-x-1"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="0.75" /></svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Manifesto />
      <CollectionShowcase id="collection" />
      <CraftSection />
      <ReviewsSlider />
      <Newsletter />
    </main>
  );
}
