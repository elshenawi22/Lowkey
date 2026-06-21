import { useEffect } from 'react';
import { useInView } from '../hooks/useInView';
import { Link } from '../router';
import { useCMS } from '../lib/cms';
import { media } from '../data/media';

export default function AboutPage() {
  const cms = useCMS();
  const { ref: r1, isInView: v1 } = useInView(0.2);
  const { ref: r2, isInView: v2 } = useInView(0.2);
  const { ref: r3, isInView: v3 } = useInView(0.2);

  useEffect(() => {
    document.title = `${cms.story_title} — LOWKEY`;
    return () => { document.title = 'LOWKEY — Stay Low. Leave Legacy.'; };
  }, [cms.story_title]);

  const heroImg = cms.story_hero_image || media.heritage.libraryArched;
  const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(heroImg);
  const values = [
    { t: cms.story_value_1_title, d: cms.story_value_1_text },
    { t: cms.story_value_2_title, d: cms.story_value_2_text },
    { t: cms.story_value_3_title, d: cms.story_value_3_text },
  ];

  return (
    <main className="bg-cream">
      {/* Hero */}
      <section ref={r1} className="relative min-h-[60vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          {isVideo ? (
            <video
              src={heroImg}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover luxury-image"
            />
          ) : (
            <img src={heroImg} alt="" loading="eager" className="w-full h-full object-cover luxury-image" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/20 to-transparent" />
        </div>
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-20 pb-16 max-w-[1400px] mx-auto">
          <h1 className={`font-serif text-4xl md:text-5xl lg:text-6xl text-cream font-light tracking-wide transition-all duration-1000 ${v1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {cms.story_title}
          </h1>
        </div>
      </section>

      {/* Quote */}
      <section ref={r2} className="py-24 md:py-36">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className={`font-serif text-2xl md:text-3xl lg:text-4xl text-charcoal font-light leading-[1.4] tracking-wide whitespace-pre-line transition-all duration-[1.5s] ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {cms.story_quote_ar}
          </p>
          <p className={`font-serif text-lg text-charcoal/40 font-light italic mt-6 transition-all duration-[1.5s] delay-300 ${v2 ? 'opacity-100' : 'opacity-0'}`}>
            {cms.story_quote_en}
          </p>
          <div className={`w-10 h-px bg-navy/20 mx-auto my-12 transition-all duration-1000 delay-500 ${v2 ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`space-y-6 text-stone text-sm md:text-base font-light leading-[2] transition-all duration-[1.5s] delay-700 ${v2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <p>{cms.story_body_1}</p>
            <p>{cms.story_body_2}</p>
            <p>{cms.story_body_3}</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section ref={r3} className="py-20 md:py-28 bg-navy">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {values.map((v, i) => (
              <div key={i} className={`text-center transition-all duration-[1.5s] ${v3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${i * 200}ms` }}>
                <h3 className="font-serif text-xl text-cream font-light tracking-wide">{v.t}</h3>
                <div className="w-6 h-px bg-cream/20 mx-auto mt-4" />
                <p className="mt-4 text-cream/40 text-sm font-light leading-relaxed">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <p className="font-serif text-2xl md:text-3xl text-charcoal font-light italic">"Stay Low. Leave Legacy."</p>
        <Link to="/drop/001" className="btn-luxury mt-10">Explore Drop 001</Link>
      </section>
    </main>
  );
}
