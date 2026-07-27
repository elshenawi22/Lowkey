// ============================================================================
// LOWKEY — Recently Viewed
// Shows last 8 viewed products (excluding current). Reads localStorage.
// ============================================================================

import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { getProduct } from '../data/catalog';
import { Link } from '../router';
import WishlistButton from './WishlistButton';

interface RecentlyViewedProps {
  currentSlug?: string;
}

export default function RecentlyViewed({ currentSlug }: RecentlyViewedProps) {
  const { slugs } = useRecentlyViewed(undefined); // Read only — tracking done in ProductPage
  const displayed = currentSlug ? slugs.filter(s => s !== currentSlug) : slugs;
  const products = displayed.map(s => getProduct(s)).filter(Boolean);

  if (products.length === 0) return null;

  return (
    <section
      aria-label="Recently viewed"
      className="py-16 md:py-20 border-t border-sand/40"
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
        <div className="flex items-baseline justify-between mb-10">
          <span className="text-stone text-[0.55rem] tracking-[0.4em] uppercase font-light">
            Recently Viewed
          </span>
          <span className="text-stone/40 text-[0.5rem] tracking-[0.2em] uppercase font-light">
            {products.length} {products.length === 1 ? 'piece' : 'pieces'}
          </span>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-5 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible snap-x snap-mandatory md:snap-none scrollbar-hide">
          {products.map(p => (
            <div
              key={p!.slug}
              className="relative shrink-0 w-44 md:w-auto snap-start group"
            >
              <Link to={`/product/${p!.slug}`} className="block">
                <div className="aspect-[3/4] overflow-hidden bg-offwhite mb-3">
                  <img
                    src={p!.image}
                    alt={p!.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 luxury-image"
                  />
                </div>
                <p className="text-charcoal text-sm font-light leading-snug">{p!.name}</p>
                <p className="text-stone text-xs font-light mt-1">{p!.price}</p>
              </Link>
              <div className="absolute top-3 right-3">
                <WishlistButton slug={p!.slug} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
