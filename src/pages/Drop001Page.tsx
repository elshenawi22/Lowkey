import { useEffect, useState, useRef } from 'react';
import { useInView } from '../hooks/useInView';
import { media } from '../data/media';
import { videos } from '../data/videos';
import { Link } from '../router';
import { useProducts } from '../hooks/useProducts';
import { useInventory, isProductSoldOut } from '../hooks/useInventory';
import VideoPlayer from '../components/VideoPlayer';
import { useCMS, getProductImages } from '../lib/cms';

function DropProductCard({ product, inventory }: { product: any; inventory: any[] }) {
  const images = getProductImages(product.slug, product.image);
  const [idx, setIdx] = useState(0);
  const touchX = useRef(0);
  const soldOut = isProductSoldOut(product.slug, product.sizes, inventory);

  return (
    <div
      className={`aspect-[3/4] overflow-hidden bg-sand/20 relative ${soldOut ? 'grayscale-[0.4]' : ''}`}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        const diff = touchX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) {
          setIdx(i => diff > 0 ? Math.min(i + 1, images.length - 1) : Math.max(i - 1, 0));
        }
      }}
    >
      {images.map((img, i) => {
        const isVid = /\.(mp4|webm|mov|m4v)/i.test(img);
        return (
          <div key={i} className={`absolute inset-0 transition-opacity duration-500 ${i === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
            {isVid ? (
              <video
                key={img}
                src={img}
                muted
                loop
                playsInline
                autoPlay
                preload="auto"
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={img} alt={`${product.name} ${i + 1}`} loading="lazy" className="w-full h-full object-cover luxury-image group-hover:scale-[1.04] transition-transform duration-[2s]" />
            )}
          </div>
        );
      })}

      {soldOut && (
        <div className="absolute inset-0 z-20 bg-charcoal/30 backdrop-blur-[1px] flex items-center justify-center">
          <span className="text-cream text-[0.55rem] tracking-[0.4em] uppercase border border-cream/20 px-4 py-2">
            Sold Out
          </span>
        </div>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button key={i} onClick={e => { e.preventDefault(); setIdx(i); }}
              className={`rounded-full transition-all duration-300 ${i === idx ? 'w-5 h-1 bg-cream' : 'w-1 h-1 bg-cream/40'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Drop001Page() {
  const cms = useCMS();
  const { products } = useProducts();
  const { inventory } = useInventory();
  const { ref: heroRef, isInView: heroInView } = useInView(0.1);
  const { ref: manifestoRef, isInView: manifestoInView } = useInView(0.2);
  const { ref: fabricRef, isInView: fabricInView } = useInView(0.15);
  const { ref: lookbookRef, isInView: lookbookInView } = useInView(0.1);
  const { ref: lineupRef, isInView: lineupInView } = useInView(0.1);

  useEffect(() => {
    document.title = 'Drop 001 — A Study in Heritage and Silence | LOWKEY';
    return () => { document.title = 'LOWKEY — Stay Low. Leave Legacy.'; };
  }, []);

  const heroImg = cms.drop_hero_image || media.drop001.hero;
  const fabricImg = cms.drop_fabric_image || media.texture.cottonBrown;
  const lb1 = cms.drop_lookbook1 || media.drop001.lookbook1;
  const lb2 = cms.drop_lookbook2 || media.craft.handSewing;
  const lb3 = cms.drop_lookbook3 || media.drop001.editorial;
  const lb4 = cms.drop_lookbook4 || media.heritage.libraryArched;

  return (
    <main className="bg-cream">
      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Drop 001" loading="eager" className="w-full h-full object-cover luxury-image" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy/60 via-navy/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/50 via-transparent to-navy/20" />
        </div>
        <div className="relative z-10 w-full">
          <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20 py-32">
            <div className="max-w-xl">
              <span className={`text-cream/50 text-[0.6rem] tracking-[0.5em] uppercase font-light block transition-all duration-1000 ${heroInView ? 'opacity-100' : 'opacity-0'}`}>{cms.drop_hero_label}</span>
              <h1 className={`font-serif text-5xl md:text-6xl lg:text-7xl font-light text-cream mt-8 leading-[1.05] tracking-wide whitespace-pre-line transition-all duration-[1.5s] delay-300 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>{cms.drop_hero_title}</h1>
              <div className={`w-12 h-px bg-cream/30 mt-10 transition-all duration-1000 delay-700 ${heroInView ? 'opacity-100' : 'opacity-0'}`} />
              <p className={`mt-10 text-cream/70 text-base md:text-lg font-light leading-relaxed max-w-md transition-all duration-[1.5s] delay-900 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>{cms.drop_hero_description}</p>
              <div className={`mt-12 transition-all duration-[1.5s] delay-[1100ms] ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                <button onClick={() => document.getElementById('lineup')?.scrollIntoView({ behavior: 'smooth' })} className="btn-luxury btn-luxury-light">{cms.drop_hero_cta}</button>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <span className="text-cream/40 text-[0.5rem] tracking-[0.3em] uppercase">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-cream/30 to-transparent" />
        </div>
      </section>

      {/* Manifesto */}
      <section ref={manifestoRef} className="py-28 md:py-40 lg:py-52 bg-offwhite">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <div className="max-w-3xl mx-auto text-center">
            <span className={`text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light block transition-all duration-1000 ${manifestoInView ? 'opacity-100' : 'opacity-0'}`}>{cms.drop_manifesto_label}</span>
            <h2 className={`font-serif text-3xl md:text-4xl lg:text-5xl font-light text-charcoal mt-10 leading-[1.3] tracking-wide whitespace-pre-line transition-all duration-[1.5s] delay-200 ${manifestoInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>{cms.drop_manifesto_title_ar}</h2>
            <p className={`font-serif text-xl md:text-2xl text-charcoal/50 font-light italic mt-8 transition-all duration-[1.5s] delay-400 ${manifestoInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>{cms.drop_manifesto_title_en}</p>
            <div className={`w-px h-16 bg-navy/20 mx-auto mt-12 transition-all duration-1000 delay-600 ${manifestoInView ? 'opacity-100' : 'opacity-0'}`} />
            <p className={`mt-12 text-stone text-sm md:text-base leading-[2] font-light max-w-lg mx-auto transition-all duration-[1.5s] delay-800 ${manifestoInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>{cms.drop_manifesto_body}</p>
          </div>
        </div>
      </section>

      {/* Fabric */}
      <section ref={fabricRef} className="py-24 md:py-32 lg:py-40">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className={`transition-all duration-[1.5s] ${fabricInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              <span className="text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light">{cms.drop_fabric_label}</span>
              <h2 className="font-serif text-3xl md:text-4xl font-light text-charcoal mt-6 leading-[1.25] tracking-wide">{cms.drop_fabric_title_ar}</h2>
              <p className="font-serif text-lg text-charcoal/50 font-light italic mt-2">{cms.drop_fabric_title_en}</p>
              <div className="w-10 h-px bg-navy/30 mt-8" />
              <p className="mt-8 text-stone text-sm leading-[2] font-light">{cms.drop_fabric_body}</p>
              <div className="mt-10 grid grid-cols-2 gap-6">
                <div><span className="text-charcoal font-serif text-2xl font-light">{cms.drop_fabric_stat1}</span><p className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light mt-1">{cms.drop_fabric_stat1_label}</p></div>
                <div><span className="text-charcoal font-serif text-2xl font-light">{cms.drop_fabric_stat2}</span><p className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light mt-1">{cms.drop_fabric_stat2_label}</p></div>
              </div>
            </div>
            <div className={`transition-all duration-[1.5s] delay-300 ${fabricInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
              <div className="aspect-[4/5] overflow-hidden"><img src={fabricImg} alt="Fabric detail" loading="lazy" className="w-full h-full object-cover luxury-image" /></div>
            </div>
          </div>
        </div>
      </section>

      {/* Video 1 */}
      <section className="relative">
        <div className="aspect-[21/9] md:aspect-[3/1]"><VideoPlayer src={cms.drop_video1_url || videos.drop001.tailorMeasuring} overlayOpacity={0.35} className="w-full h-full" /></div>
        <div className="absolute inset-0 flex items-center justify-center"><div className="text-center">
          <span className="text-cream/60 text-[0.55rem] tracking-[0.4em] uppercase font-light block">{cms.drop_video1_label}</span>
          <h3 className="font-serif text-2xl md:text-3xl lg:text-4xl text-cream font-light mt-4 tracking-wide">{cms.drop_video1_title_ar}</h3>
          <p className="font-serif text-base md:text-lg text-cream/60 font-light italic mt-2">{cms.drop_video1_title_en}</p>
        </div></div>
      </section>

      {/* Lookbook */}
      <section ref={lookbookRef} className="py-8 md:py-12 bg-sand/30">
        <div className="mx-auto max-w-[1800px] px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[lb1, lb2, lb3, lb4].map((img, i) => {
              const isVid = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(img);
              return (
                <div key={i} className={`overflow-hidden transition-all duration-[1.5s] ${lookbookInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${i * 150}ms` }}>
                  <div className="aspect-[3/4] overflow-hidden relative">
                    {isVid ? (
                      <video src={img} muted loop playsInline autoPlay preload="auto" className="w-full h-full object-cover hover:scale-[1.05] transition-transform duration-[2s]" />
                    ) : (
                      <img src={img} alt={`Lookbook ${i + 1}`} loading="lazy" className="w-full h-full object-cover luxury-image hover:scale-[1.05] transition-transform duration-[2s]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Lineup */}
      <section ref={lineupRef} id="lineup" className="py-24 md:py-32 lg:py-40">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <div className="text-center mb-16 md:mb-24">
            <span className={`text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light block transition-all duration-1000 ${lineupInView ? 'opacity-100' : 'opacity-0'}`}>{cms.drop_lineup_label}</span>
            <h2 className={`font-serif text-3xl md:text-4xl font-light text-charcoal mt-6 tracking-wide transition-all duration-1000 delay-200 ${lineupInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>{cms.drop_lineup_title_ar}</h2>
            <p className={`font-serif text-lg text-charcoal/50 font-light italic mt-2 transition-all duration-1000 delay-300 ${lineupInView ? 'opacity-100' : 'opacity-0'}`}>{cms.drop_lineup_title_en}</p>
          </div>
          <div className="space-y-20 md:space-y-32">
            {products.map((product, i) => (
              <div key={product.slug} className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center transition-all duration-[1.5s] ${lineupInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`} style={{ transitionDelay: `${400 + i * 200}ms` }}>
                <Link to={`/product/${product.slug}`} className={`group block overflow-hidden ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <DropProductCard product={product} inventory={inventory} />
                </Link>
                <div className={`${i % 2 === 1 ? 'lg:order-1 lg:text-right' : ''}`}>
                  <span className="text-stone text-[0.55rem] tracking-[0.3em] uppercase font-light">0{i + 1} — {product.category}</span>
                  {(() => {
                    const soldOut = isProductSoldOut(product.slug, product.sizes, inventory);
                    return (
                      <>
                        <div className={`flex items-center gap-4 ${i % 2 === 1 ? 'justify-end' : ''}`}>
                          <h3 className="font-serif text-2xl md:text-3xl lg:text-4xl text-charcoal font-light mt-4 tracking-wide">{product.name}</h3>
                          {soldOut && <span className="mt-4 text-[0.5rem] bg-stone/10 text-stone px-2 py-1 rounded-full uppercase tracking-widest">Sold Out</span>}
                        </div>
                        <div className={`w-10 h-px bg-navy/30 mt-6 ${i % 2 === 1 ? 'lg:ml-auto' : ''}`} />
                        <p className="mt-6 text-stone text-sm leading-[1.9] font-light max-w-md">{product.intro}</p>
                        <div className={`mt-6 flex items-center gap-6 flex-wrap ${i % 2 === 1 ? 'justify-end' : ''}`}>
                          <span className="text-stone text-[0.55rem] tracking-[0.25em] uppercase font-light">{product.fabric}</span>
                          <span className="text-stone/30">|</span>
                          <span className="text-stone text-[0.55rem] tracking-[0.25em] uppercase font-light">{product.weight}</span>
                        </div>
                        <div className={`mt-8 flex items-center gap-8 ${i % 2 === 1 ? 'justify-end' : ''}`}>
                          <span className="font-serif text-xl text-charcoal font-light">{soldOut ? 'Out of Stock' : product.price}</span>
                          <Link to={`/product/${product.slug}`} className="text-charcoal text-[0.6rem] tracking-[0.25em] uppercase font-light hover:text-navy transition-colors duration-500 flex items-center gap-2 group">
                            {soldOut ? 'View Archive' : 'View Details'}
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transition-transform duration-500 group-hover:translate-x-1"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="0.75" /></svg>
                          </Link>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video 2 */}
      <section className="relative">
        <div className="aspect-video md:aspect-[21/9]"><VideoPlayer src={cms.drop_video2_url || videos.drop001.sewingMachine} overlayOpacity={0.4} className="w-full h-full" /></div>
        <div className="absolute inset-0 flex items-center justify-center"><div className="text-center px-6">
          <span className="text-cream/50 text-[0.55rem] tracking-[0.4em] uppercase font-light block">{cms.drop_video2_label}</span>
          <h3 className="font-serif text-xl md:text-2xl lg:text-3xl text-cream font-light mt-4 tracking-wide max-w-lg mx-auto leading-relaxed">{cms.drop_video2_title_ar}</h3>
          <p className="font-serif text-sm md:text-base text-cream/50 font-light italic mt-2">{cms.drop_video2_title_en}</p>
        </div></div>
      </section>

      {/* Closing */}
      <section className="py-24 md:py-32 bg-navy">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="text-cream/40 text-[0.6rem] tracking-[0.4em] uppercase font-light">{cms.drop_closing_label}</span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-light text-cream mt-8 leading-[1.2] tracking-wide whitespace-pre-line">{cms.drop_closing_title}</h2>
          <div className="w-px h-12 bg-cream/20 mx-auto mt-10" />
          <p className="mt-10 text-cream/50 text-sm font-light leading-relaxed max-w-md mx-auto">{cms.drop_closing_body_en}<br />{cms.drop_closing_body_ar}</p>
        </div>
      </section>
    </main>
  );
}
