import { useState, useEffect, useMemo } from 'react';
import { useInView } from '../hooks/useInView';
import { Link } from '../router';
import { useProduct } from '../hooks/useProducts';
import { useBag } from '../context/BagContext';
import { useWishlist } from '../context/WishlistContext';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { media } from '../data/media';
import { track } from '../lib/analytics';
import { getProductStock } from '../lib/inventory';
import { getShippingOptions } from '../lib/shipping';
import SizeGuide from '../components/SizeGuide';
import ShareButton from '../components/ShareButton';
import ProductGallery from '../components/ProductGallery';
import Stars from '../components/Stars';
import ReviewCard from '../components/ReviewCard';
import WishlistButton from '../components/WishlistButton';
import BackInStockModal from '../components/BackInStockModal';
import ProductRecommendations from '../components/ProductRecommendations';
import RecentlyViewed from '../components/RecentlyViewed';
import { getProductImages } from '../lib/cms';
import { getProductReviews, getAverageRating, type Review } from '../lib/reviews';
import NotFoundState from './NotFoundState';

// ── Accordion item ──────────────────────────────────────────────────────────
interface AccordionItemProps {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionItem({ label, children, defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-sand/50">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-stone text-[0.6rem] tracking-[0.3em] uppercase font-light group-hover:text-charcoal transition-colors duration-300">
          {label}
        </span>
        <span
          className={`text-stone/60 text-lg font-extralight transition-transform duration-500 select-none ${
            open ? 'rotate-45' : 'rotate-0'
          }`}
          aria-hidden="true"
        >
          +
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,0,0,1)] ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pb-6 text-stone text-sm font-light leading-[1.9]">{children}</div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ProductPage({ slug }: { slug: string }) {
  const { product } = useProduct(slug);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRatingStats] = useState({ avg: 0, count: 0 });

  // Track this product as recently viewed
  const { trackView } = useRecentlyViewed(slug);

  useEffect(() => {
    if (!product) return;
    getProductReviews(product.slug).then(setReviews);
    getAverageRating(product.slug).then(setReviewRatingStats);
  }, [product]);

  // Track product view + inject JSON-LD + set per-product meta
  useEffect(() => {
    if (!product) return;
    track.viewProduct(product.name, product.priceValue);
    trackView(product.slug);

    document.title = `${product.name} — LOWKEY`;

    import('../utils/meta').then(m => {
      m.setPageMeta({
        title: `${product.name} — LOWKEY`,
        description: `${product.intro || 'Crafted in Port Said, Egypt.'} ${product.price}.`,
        canonicalPath: `/product/${product.slug}`,
        image: product.image,
        type: 'product',
        price: product.priceValue,
        currency: 'EGP',
        inStock: !product.sizes.every(s => product.stock[s] === 'sold_out'),
      });
      // Preload hero image as priority hint for LCP
      m.preloadImage(product.image);
    });

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
  }, [product, trackView]);

  const { add } = useBag();
  const { has: isWishlisted } = useWishlist();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(false);
  const [liveStock, setLiveStock] = useState<Record<string, number>>({});
  const [bisOpen, setBisOpen] = useState(false);

  useEffect(() => {
    setSelectedSize(null);
    setAdded(false);
    setError(false);
    if (product) {
      getProductStock(product.slug).then(s => {
        if (Object.keys(s).length > 0) setLiveStock(s);
      });
    }
  }, [slug, product]);

  const { ref: heroRef, isInView: heroInView } = useInView(0.1);
  const { ref: storyRef, isInView: storyInView } = useInView(0.2);
  const { ref: detailRef, isInView: detailInView } = useInView(0.2);

  const shippingOptions = useMemo(() => getShippingOptions(), []);

  if (!product) return <NotFoundState label="Garment" />;

  const allSoldOut = product.sizes.every(s => {
    const q = liveStock[s];
    return q !== undefined ? q <= 0 : product.stock[s] === 'sold_out';
  });

  const soldOutSizes = product.sizes.filter(s => {
    const q = liveStock[s];
    return q !== undefined ? q <= 0 : product.stock[s] === 'sold_out';
  });

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
      <div className="pt-20 md:pt-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <Link
            to="/drop/001"
            className="text-stone text-[0.6rem] tracking-[0.3em] uppercase font-light hover:text-navy transition-colors duration-500"
          >
            ← Drop 001
          </Link>
        </div>
      </div>

      {/* Editorial Hero */}
      <section ref={heroRef} className="py-10 md:py-14">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Gallery */}
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

                <div className="flex items-start justify-between mt-4">
                  <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-light text-charcoal leading-[1.15] tracking-wide">
                    {product.name}
                  </h1>
                  <WishlistButton
                    slug={product.slug}
                    className="mt-1 ml-4 shrink-0"
                  />
                </div>

                {reviewRating.count > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Stars rating={reviewRating.avg} />
                    <span className="text-stone text-[0.6rem] font-light">
                      {reviewRating.avg} ({reviewRating.count})
                    </span>
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
                          aria-pressed={selectedSize === size}
                          aria-label={`Size ${size}${isSoldOut ? ' — sold out' : isLow ? ` — only ${qty} left` : ''}`}
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

                {/* CTA — Add or Sold Out */}
                <div className="mt-8">
                  {allSoldOut ? (
                    <div className="space-y-4">
                      <div className="text-center py-4 border border-sand/50">
                        <p className="font-serif text-lg text-stone font-light">Sold Out</p>
                        <p className="text-stone/50 text-xs mt-1">نفدت — سجّل إيميلك وهنبلّغك لما ترجع</p>
                      </div>
                      <button
                        onClick={() => setBisOpen(true)}
                        className="w-full border border-stone/40 text-stone text-[0.65rem] tracking-[0.25em] uppercase font-light py-4 hover:border-charcoal hover:text-charcoal transition-all duration-500"
                      >
                        Notify Me When Back
                      </button>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const selectedQty = selectedSize ? (liveStock[selectedSize] ?? null) : null;
                        const showUrgency = selectedSize && selectedQty !== null && selectedQty > 0 && selectedQty <= 5;
                        return showUrgency ? (
                          <p className="mb-3 text-amber-700 text-[0.6rem] tracking-[0.15em] uppercase font-medium">
                            {selectedQty === 1
                              ? 'آخر قطعة في مقاسك — Last piece'
                              : `${selectedQty} قطع فقط في مقاسك — Only ${selectedQty} left`}
                          </p>
                        ) : null;
                      })()}

                      <button onClick={handleAdd} className="btn-luxury w-full justify-center">
                        {added ? 'Added ✓' : 'Add to Bag'}
                      </button>

                      {error && (
                        <p className="mt-3 text-stone text-[0.65rem] tracking-[0.1em] font-light italic">
                          اختار مقاس — Select a size
                        </p>
                      )}

                      {/* Back in stock for partially sold-out sizes */}
                      {soldOutSizes.length > 0 && soldOutSizes.length < product.sizes.length && (
                        <button
                          onClick={() => setBisOpen(true)}
                          className="mt-3 w-full text-stone/60 text-[0.55rem] tracking-[0.2em] uppercase font-light hover:text-stone transition-colors duration-300"
                        >
                          Notify me for sold-out sizes
                        </button>
                      )}

                      <p className="mt-4 text-stone/60 text-[0.6rem] tracking-[0.12em] font-light text-center">
                        ↩ استبدال خلال ١٤ يوم &nbsp;·&nbsp; 14-Day Exchange
                      </p>
                    </>
                  )}
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

      {/* Specs bar */}
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

      {/* Fabric Story */}
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
                  <img
                    src={f.img}
                    alt={f.label}
                    loading="lazy"
                    className="w-full h-full object-cover luxury-image"
                  />
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

      {/* Product Details — Accordion (Fabric, Care, Shipping, Returns) */}
      <section ref={detailRef} className={`py-16 md:py-20 transition-all duration-1000 ${detailInView ? 'opacity-100' : 'opacity-0'}`}>
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">

            {/* Left — editorial */}
            <div>
              <span className="text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light block">
                Fit & Care
              </span>
              <h2 className="font-serif text-2xl md:text-3xl font-light text-charcoal mt-6 tracking-wide">
                Designed to improve with time.
              </h2>
              <p className="mt-8 text-stone text-sm leading-[1.9] font-light">
                Pre-washed for minimal shrinkage and designed to develop a natural
                patina. Cold wash, hang dry. The fabric softens with each wear —
                becoming more personal with age. Fits {product.fit.toLowerCase()}.
              </p>
            </div>

            {/* Right — accordion */}
            <div>
              <AccordionItem label="Fabric & Materials" defaultOpen>
                <p>{product.fabric} — {product.weight}</p>
                <p className="mt-2 text-stone/70">{product.construction}</p>
              </AccordionItem>

              <AccordionItem label="Care Instructions">
                <ul className="space-y-2 text-stone/80">
                  <li>— Machine wash cold (30°C max)</li>
                  <li>— Hang dry. Do not tumble dry.</li>
                  <li>— Iron on low heat if needed</li>
                  <li>— Do not bleach</li>
                  <li>— Dry clean if preferred</li>
                </ul>
                <p className="mt-4 text-stone/50 text-xs">
                  غسيل بارد. علّقه بعيد عن الشمس. الكي على درجة منخفضة.
                </p>
              </AccordionItem>

              <AccordionItem label="Shipping">
                <div className="space-y-3">
                  {shippingOptions.map(opt => (
                    <div key={opt.id} className="flex justify-between items-baseline">
                      <span className="text-stone/80">
                        {opt.label}
                        <span className="text-stone/40 text-xs ml-2">({opt.estimate})</span>
                      </span>
                      <span className="text-charcoal font-light">
                        {opt.price === 0 ? 'Free' : `EGP ${opt.price}`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-stone/50 text-xs leading-relaxed">
                  Orders placed before 2pm ship same day. Tracking link sent via WhatsApp.
                </p>
              </AccordionItem>

              <AccordionItem label="Returns & Exchange">
                <ul className="space-y-2 text-stone/80">
                  <li>— 14-day exchange window</li>
                  <li>— Item must be unworn and in original packaging</li>
                  <li>— Contact us via WhatsApp to initiate</li>
                  <li>— Sale items are final sale</li>
                </ul>
                <p className="mt-4 text-stone/50 text-xs">
                  ١٤ يوم للاستبدال. المنتج يكون بحالته الأصلية. تواصل معنا على واتساب.
                </p>
              </AccordionItem>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      {reviewRating.count > 0 && (
        <section className="py-16 md:py-24 bg-offwhite">
          <div className="mx-auto max-w-3xl px-6">
            <div className="text-center mb-12">
              <span className="text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light">Customer Reviews</span>
              <div className="mt-4"><Stars rating={reviewRating.avg} size="lg" /></div>
              <p className="text-stone text-sm font-light mt-2">
                {reviewRating.avg} / 5 — {reviewRating.count} reviews
              </p>
            </div>
            <div className="space-y-4">
              {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          </div>
        </section>
      )}

      <div className="h-20" />

      {/* Recommendations — replaces old "Complete the Look" */}
      <ProductRecommendations current={product} />

      {/* Recently Viewed */}
      <RecentlyViewed currentSlug={product.slug} />

      {/* Back In Stock Modal */}
      <BackInStockModal
        isOpen={bisOpen}
        onClose={() => setBisOpen(false)}
        productSlug={product.slug}
        productName={product.name}
        size={selectedSize ?? undefined}
        availableSizes={soldOutSizes.length > 0 ? soldOutSizes : product.sizes}
      />
    </main>
  );
}
