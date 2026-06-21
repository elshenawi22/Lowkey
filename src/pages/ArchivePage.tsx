import { useState, useEffect } from 'react';
import { useInView } from '../hooks/useInView';
import { getCollections, type Collection } from '../lib/collections';
import { Link } from '../router';

export default function ArchivePage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const { ref: heroRef, isInView: heroInView } = useInView(0.2);
  const { ref: listRef, isInView: listInView } = useInView(0.1);

  useEffect(() => {
    document.title = 'The Archive — LOWKEY';
    getCollections().then(all => {
      setCollections(all.filter(c => c.status === 'live' || c.status === 'archived').sort((a, b) => b.sortOrder - a.sortOrder));
    });
    return () => { document.title = 'LOWKEY — Stay Low. Leave Legacy.'; };
  }, []);

  return (
    <main className="bg-cream min-h-screen pt-28 md:pt-36">
      {/* Header */}
      <section ref={heroRef} className="pb-16 md:pb-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <span className={`text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light block transition-all duration-1000 ${heroInView ? 'opacity-100' : 'opacity-0'}`}>
            The Archive
          </span>
          <h1 className={`font-serif text-4xl md:text-5xl lg:text-6xl font-light text-charcoal mt-6 leading-[1.1] tracking-wide transition-all duration-1000 delay-200 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Every drop is a chapter.
          </h1>
          <p className={`font-serif text-lg text-charcoal/40 font-light italic mt-4 transition-all duration-1000 delay-400 ${heroInView ? 'opacity-100' : 'opacity-0'}`}>
            كل مجموعة هي فصل من قصة LOWKEY.
          </p>
        </div>
      </section>

      {/* Collections */}
      <section ref={listRef} className="pb-24 md:pb-32">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <div className="space-y-0">
            {collections.map((col, i) => (
              <Link
                key={col.slug}
                to={`/drop/${col.slug}`}
                className={`group block border-t border-sand/40 transition-all duration-[1.5s] ${listInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="py-10 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Image */}
                  <div className="lg:col-span-5 overflow-hidden">
                    <div className="aspect-[16/10] overflow-hidden bg-sand/20">
                      <img src={col.heroImage || '/images/hero.jpg'} alt={col.name} loading="lazy"
                        className="w-full h-full object-cover luxury-image group-hover:scale-[1.04] transition-transform duration-[2s]" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="lg:col-span-7 lg:pl-8">
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-stone text-[0.55rem] tracking-[0.3em] uppercase font-light">{col.season}</span>
                      {col.status === 'live' && <span className="text-[0.45rem] bg-navy/10 text-navy px-2 py-0.5 rounded tracking-wider uppercase">Current</span>}
                      {col.status === 'archived' && <span className="text-[0.45rem] bg-sand/50 text-stone px-2 py-0.5 rounded tracking-wider uppercase">Archive</span>}
                    </div>
                    <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl text-charcoal font-light tracking-wide group-hover:text-navy transition-colors duration-500">
                      {col.name}
                    </h2>
                    <p className="mt-4 text-stone text-sm font-light leading-relaxed max-w-lg">
                      {col.description}
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-charcoal text-[0.6rem] tracking-[0.2em] uppercase font-light group-hover:text-navy transition-colors duration-500">
                      Explore
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transition-transform duration-500 group-hover:translate-x-1"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="0.75" /></svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {collections.length === 0 && (
            <p className="text-stone text-center py-20 font-serif text-lg italic">The archive is being written.</p>
          )}

          {collections.length === 1 && (
            <div className="border-t border-sand/40 py-16 md:py-24 text-center">
              <span className="text-stone text-[0.55rem] tracking-[0.3em] uppercase font-light">Next Chapter</span>
              <p className="font-serif text-2xl md:text-3xl text-charcoal/30 font-light italic mt-4">
                The next drop is being written.
              </p>
              <p className="text-stone/60 text-xs font-light mt-3">Join the list to hear first.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
