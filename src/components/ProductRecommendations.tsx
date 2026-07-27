// ============================================================================
// LOWKEY — Product Recommendations
// Scores candidates by category, price range, archive membership.
// Shows top 3. Replaces the basic "Complete the Look" slice.
// ============================================================================

import { useMemo, memo } from 'react';
import { products as allProducts, archives, type Product } from '../data/catalog';
import { Link } from '../router';
import WishlistButton from './WishlistButton';

interface ProductRecommendationsProps {
  current: Product;
}

function scoreMatch(current: Product, candidate: Product): number {
  if (candidate.slug === current.slug) return -1;
  let score = 0;

  // Same category — highest signal
  if (candidate.category === current.category) score += 4;

  // Same collection / archive
  const currentArchive = archives.find(a => a.productSlugs.includes(current.slug));
  const candidateArchive = archives.find(a => a.productSlugs.includes(candidate.slug));
  if (currentArchive && candidateArchive && currentArchive.slug === candidateArchive.slug) {
    score += 3;
  }

  // Similar price band (within 30%)
  const priceDiff = Math.abs(candidate.priceValue - current.priceValue) / current.priceValue;
  if (priceDiff <= 0.3) score += 2;
  else if (priceDiff <= 0.6) score += 1;

  // Has stock (prefer available)
  const hasStock = candidate.sizes.some(s => candidate.stock[s] !== 'sold_out');
  if (hasStock) score += 1;

  return score;
}

export default memo(ProductRecommendations);
function ProductRecommendations({ current }: ProductRecommendationsProps) {  const recommendations = useMemo(() => {
    return allProducts
      .filter(p => p.slug !== current.slug)
      .map(p => ({ product: p, score: scoreMatch(current, p) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ product }) => product);
  }, [current]);

  if (recommendations.length === 0) return null;

  return (
    <section
      aria-label="You may also like"
      className="py-16 md:py-20 bg-sand/20 border-t border-sand/40"
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
        <div className="text-center mb-10">
          <span className="text-stone text-[0.55rem] tracking-[0.4em] uppercase font-light">
            You May Also Like
          </span>
          <h3 className="font-serif text-xl font-light text-charcoal mt-3">
            From the same archive
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {recommendations.map(p => {
            const allSoldOut = p.sizes.every(s => p.stock[s] === 'sold_out');
            return (
              <div key={p.slug} className="relative group">
                <Link to={`/product/${p.slug}`} className="block">
                  <div className="aspect-[3/4] overflow-hidden bg-offwhite mb-4">
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 luxury-image"
                    />
                    {allSoldOut && (
                      <div className="absolute inset-0 flex items-end p-4 pointer-events-none">
                        <span className="text-stone/60 text-[0.5rem] tracking-[0.2em] uppercase font-light bg-cream/80 px-2 py-1">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-stone text-[0.55rem] tracking-[0.25em] uppercase font-light">
                    {p.category}
                  </p>
                  <p className="text-charcoal text-sm font-light mt-1">{p.name}</p>
                  <p className="text-stone text-xs font-light mt-1">{p.price}</p>
                </Link>
                <div className="absolute top-3 right-3">
                  <WishlistButton slug={p.slug} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
// memo export already declared above via function name re-use
