import { useState, useEffect } from 'react';
import { useInView } from '../hooks/useInView';
import { Link } from '../router';
import { useProduct } from '../hooks/useProducts';
import { useBag } from '../context/BagContext';
import { media } from '../data/media';
import { track } from '../lib/analytics';
import { getProductStock } from '../lib/inventory';
import SizeGuide from '../components/SizeGuide';
import ShareButton from '../components/ShareButton';
import ProductGallery from '../components/ProductGallery';
import Stars from '../components/Stars';
import ReviewCard from '../components/ReviewCard';
import { getProductImages } from '../lib/cms';
import { getProductReviews, getAverageRating, type Review } from '../lib/reviews';
import NotFoundState from './NotFoundState';
import { products as allProducts } from '../data/catalog';

export default function ProductPage({ slug }: { slug: string }) {
  const { product } = useProduct(slug);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRatingStats] = useState({ avg: 0, count: 0 });

  useEffect(() => {
    if (!product) return;
    getProductReviews(product.slug).then(setReviews);
    getAverageRating(product.slug).then(setReviewRatingStats);
  }, [product]);

  // Track product view + inject JSON-LD + set per-product meta
  useEffect(() => {
    if (!product) return;
    track.viewProduct(product.name, product.priceValue);

    // Page title
    document.title = `${product.name} — LOWKEY`;

    // Meta description
    import('../utils/meta').then(m => m.setPageMeta(
      `${product.name} by LOWKEY — ${product.intro || 'Crafted in Port Said, Egypt.'} ${product.price}.`,
      `/product/${product.slug}`
    ));

    // JSON-LD Product schema
    const id = `ld-product-${product.slug}`;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      category: product.category,
      description: product.intro,
      brand: { '@type': 'Brand', name: 'LOWKEY' },
      offers: {
        '@type': 'Offer',
        price: product.priceValue,
        priceCurrency: 'EGP',
        availability: product.sizes.every(s => product.stock[s] === 'sold_out')
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      },
    });
    document.head.appendChild(script);
    return () => {
      document.getElementById(id)?.remove();
      document.title = 'LOWKEY — Stay Low. Leave Legacy.';
      import('../utils/meta').then(m => m.resetPageMeta());
    };
  }, [product]);
  const { add } = useBag();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(false);

  const [liveStock, setLiveStock] = useState<Record<string, number>>({});

  // Reset state when navigating to a different product + load live stock
  useEffect(() => {
    setSelectedSize(null);
    setAdded(false);
    setError(false);
    if (product) {
      getProductStock(product.slug).then(s => { if (Object.keys(s).length > 0) setLiveStock(s); });
    }
  }, [slug, product]);

  const { ref: heroRef, isInView: heroInView } = useInView(0.1);
  const { ref: storyRef, isInView: storyInView } = useInView(0.2);
  const { ref: detailRef, isInView: detailInView } = useInView(0.2);

  if (!product) return <NotFoundState label="Garment" />;

  const handleAdd = () => {
    if (!selectedSize) {
      setError(true);
      if (navigator.vibrate) navigator.vibrate(50);
      return;
    }
    setError(false);
    add(product.slug, selectedSize);
    setAdded(true);
    track.addToCart(product.name, product.priceValue, selectedSize);
    if (navigator.vibrate) navigator.vibrate(80);
    // Reset after 3s
    setTimeout(() => setAdded(false), 3000);
  };

  const specs = [
    { label: 'Fabric', value: product.fabric },
    { label: 'Weight', value: product.weight },
    { label: 'Origin', value: product.origin },
    { label: 'Fit', value: product.fit },
  ];

  return (
    <main className="bg-cream">
      {/* Breadcrumb */}
      <div className="pt-28 md:pt-32">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <Link
            to="/drop/001"
            className="text-stone text-[0.6rem] tracking-[0.3em] uppercase font-light hover:text-navy transition-colors duration-500"
          >
            ← Drop 001
          </Link>
        </div>
      </div>

      {/* Editorial Hero — full-screen imagery */}
      <section ref={heroRef} className="py-10 md:py-14">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Image */}
            <div
              className={`lg:col-span-7 transition-all duration-[1.5s] ${
                heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <ProductGallery
                images={getProductImages(product.slug, product.image)}
                name={product.name}
              />
            </div>

            {/* Purchase / Intro */}
            <div
              className={`lg:col-span-5 flex flex-col justify-center transition-all duration-[1.5s] delay-300 ${
                heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="lg:pl-4">
                <span className="text-stone text-[0.55rem] tracking-[0.3em] uppercase font-light">
                  {product.category}
                </span>
                <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-light text-charcoal mt-4 leading-[1.15] tracking-wide">
                  {product.name}
                </h1>
                {reviewRating.count > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Stars rating={reviewRating.avg} />
                    <span className="text-stone text-[0.6rem] font-light">{reviewRating.avg} ({reviewRating.count})</span>
                  </div>
                )}
                <p className="mt-5 text-stone text-sm leading-[1.9] font-light">
                  {product.intro}
                </p>

                <div className="mt-8 flex items-center justify-between">
                  <span className="font-serif text-2xl text-charcoal font-light">
                    {product.price}
                  </span>
                  <ShareButton title={product.name} price={product.price} />
                </div>

                {/* Sizes */}
                <div className="mt-8">
                  <span className="text-stone text-[0.6rem] tracking-[0.25em] uppercase font-light block mb-4">
                    Select Size
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {product.sizes.map((size) => {
                      // Use live DB stock if available, fallback to catalog
                      const qty = liveStock[size] ?? null;
                      const isSoldOut = qty !== null ? qty <= 0 : product.stock[size] === 'sold_out';
                      const isLow = qty !== null ? (qty > 0 && qty <= 5) : product.stock[size] === 'low';
                      
                      return (
                        <button
                          key={size}
                          onClick={() => {
                            if (!isSoldOut) {
                              setSelectedSize(size);
                              setError(false);
                            }
                          }}
                          disabled={isSoldOut}
                          className={`relative min-w-[3.5rem] h-14 border text-[0.7rem] tracking-[0.1em] font-light transition-all duration-500 flex flex-col items-center justify-center gap-1 px-2 ${
                            isSoldOut
                              ? 'border-sand/40 text-stone/30 cursor-not-allowed line-through'
                              : selectedSize === size
                              ? 'border-navy text-navy bg-navy/5 shadow-inner'
                              : 'border-sand/80 text-charcoal hover:border-navy hover:text-navy'
                          }`}
                        >
                          <span className="font-medium">{size}</span>
                          {isLow && !isSoldOut && (
                            <span className="text-[0.45rem] text-amber-600 font-medium uppercase tracking-tighter">
                              {qty} left
                            </span>
                          )}
                          {isSoldOut && (
                            <span className="text-[0.4rem] text-stone/40 uppercase tracking-tighter">Out</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-stone/50 text-[0.6rem] tracking-[0.1em] font-light flex items-center gap-2">
                      <span className="w-2 h-2 bg-sand rounded-full" /> قطع محدودة
                    </p>
                    <SizeGuide category={product.category} />
                  </div>
                </div>

                {/* Add — or Sold Out */}
                <div className="mt-8">
                  {(() => {
                    const allSoldOut = product.sizes.every(s => {
                      const q = liveStock[s];
                      return q !== undefined ? q <= 0 : product.stock[s] === 'sold_out';
                    });
                    
                    if (allSoldOut) {
                      return (
                        <div className="text-center py-4 border border-sand/50">
                          <p className="font-serif text-lg text-stone font-light">Sold Out</p>
                          <p className="text-stone/50 text-xs mt-1">نفدت — سجّل إيميلك وهنبلّغك لما ترجع</p>
                        </div>
                      );
                    }

                    const selectedQty = selectedSize ? (liveStock[selectedSize] ?? null) : null;
                    const showUrgency = selectedSize && selectedQty !== null && selectedQty > 0 && selectedQty <= 5;
                    
                    return <>
                      {showUrgency && (
                        <p className="mb-3 text-amber-700 text-[0.6rem] tracking-[0.15em] uppercase font-medium">
                          {selectedQty === 1 ? 'آخر قطعة في مقاسك — Last piece' : `${selectedQty} قطع فقط في مقاسك — Only ${selectedQty} left`}
                        </p>
                      )}
                      <button onClick={handleAdd} className="btn-luxury w-full justify-center">
                        {added ? 'Added ✓' : 'Add to Bag'}
                      </button>
                      {error && <p className="mt-3 text-stone text-[0.65rem] tracking-[0.1em] font-light italic">اختار مقاس — Select a size</p>}
                      <p className="mt-4 text-stone/60 text-[0.6rem] tracking-[0.12em] font-light text-center">
                        ↩ استبدال خلال ١٤ يوم &nbsp;·&nbsp; 14-Day Exchange
                      </p>
                    </>;
                  })()}
                </div>

                <p className="mt-6 text-stone/50 text-[0.6rem] tracking-[0.1em] font-light leading-relaxed">
                  Prepared and packaged by hand. Each order includes an archive card
                  and cream tissue.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Specs */}
      <section className="py-16 md:py-20 border-t border-sand/40">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {specs.map((spec) => (
              <div key={spec.label}>
                <span className="text-stone text-[0.55rem] tracking-[0.3em] uppercase font-light block">
                  {spec.label}
                </span>
                <span className="text-charcoal text-sm font-light mt-2 block">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fabric Story — close-ups */}
      <section ref={storyRef} className="bg-offwhite py-20 md:py-28">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <div className="max-w-xl mb-16">
            <span className="text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light">
              The Fabric Story
            </span>
            <h2 className="font-serif text-2xl md:text-3xl font-light text-charcoal mt-5 tracking-wide">
              Built to be felt, not just seen.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { img: media.craft.handsSewing, label: 'Material', text: product.fabric },
              { img: media.craft.tailorMachine, label: 'Construction', text: product.construction },
              { img: media.architecture.moroccanWall, label: 'The Mark', text: 'Woven label with embroidered archive number.' },
            ].map((f, i) => (
              <div
                key={f.label}
                className={`transition-all duration-[1.5s] ${
                  storyInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${i * 200}ms` }}
              >
                <div className="aspect-[4/3] overflow-hidden mb-6">
                  <img src={f.img} alt={f.label} loading="lazy" className="w-full h-full object-cover luxury-image" />
                </div>
                <span className="text-stone text-[0.55rem] tracking-[0.3em] uppercase font-light">
                  {f.label}
                </span>
                <p className="text-charcoal/60 text-sm font-light mt-2 leading-relaxed">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fit & Care */}
      <section ref={detailRef} className="py-24 md:py-32">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <span
            className={`text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light block transition-all duration-1000 ${
              detailInView ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Fit & Care
          </span>
          <h2
            className={`font-serif text-2xl md:text-3xl font-light text-charcoal mt-6 tracking-wide transition-all duration-1000 delay-200 ${
              detailInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Designed to improve with time.
          </h2>
          <p
            className={`mt-8 text-stone text-sm leading-[1.9] font-light max-w-md mx-auto transition-all duration-1000 delay-400 ${
              detailInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Pre-washed for minimal shrinkage and designed to develop a natural
            patina. Cold wash, hang dry. The fabric softens with each wear —
            becoming more personal with age. Fits {product.fit.toLowerCase()}.
          </p>
        </div>
      </section>

      {/* Reviews */}
      {reviewRating.count > 0 && (
        <section className="py-16 md:py-24 bg-offwhite">
          <div className="mx-auto max-w-3xl px-6">
            <div className="text-center mb-12">
              <span className="text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light">Customer Reviews</span>
              <div className="mt-4"><Stars rating={reviewRating.avg} size="lg" /></div>
              <p className="text-stone text-sm font-light mt-2">{reviewRating.avg} / 5 — {reviewRating.count} reviews</p>
            </div>
            <div className="space-y-4">
              {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          </div>
        </section>
      )}

      <div className="h-20" />

      {/* Complete the Look — Cross-sell */}
      {(() => {
        const others = allProducts.filter(p => p.slug !== product.slug).slice(0, 3);
        if (others.length === 0) return null;
        return (
          <section className="py-16 md:py-20 bg-sand/20 border-t border-sand/40">
            <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
              <div className="text-center mb-10">
                <span className="text-stone text-[0.55rem] tracking-[0.4em] uppercase font-light">From the same collection</span>
                <h3 className="font-serif text-xl font-light text-charcoal mt-3">Complete the Look</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {others.map(p => (
                  <Link key={p.slug} to={`/product/${p.slug}`} className="group block">
                    <div className="aspect-[3/4] overflow-hidden bg-offwhite mb-4">
                      <img
                        src={p.image}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <p className="text-charcoal text-sm font-light">{p.name}</p>
                    <p className="text-stone text-xs font-light mt-1">{p.price}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })()}
    </main>
  );
}
