import { useState } from 'react';
import { Link } from '../router';
import { useBag } from '../context/BagContext';
import type { Product } from '../data/catalog';
import { getProductImages } from '../lib/cms';

interface Props {
  product: Product;
  index?: number;
}

export default function CollectionShowcase({ product, index = 0 }: Props) {
  const { add } = useBag();
  const [hovered, setHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const images = getProductImages(product.slug);
  const primaryImage = imageError ? product.image : (images[0]?.url || product.image);
  const secondImage  = images[1]?.url;

  const isAvailable = product.sizes.some(s => product.stock[s] !== 'sold_out');
  const hasLowStock = product.sizes.some(s => product.stock[s] === 'low');
  const isSoldOut   = !isAvailable;

  return (
    <article
      className="product-card group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image ───────────────────────────────────────────────────── */}
      <Link to={`/product/${product.slug}`} className="block product-card__image">
        {/* Primary */}
        <img
          src={primaryImage}
          alt={product.name}
          loading={index < 2 ? 'eager' : 'lazy'}
          className={`absolute inset-0 w-full h-full object-cover luxury-image transition-all duration-1000 ${
            hovered && secondImage ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
          onError={() => setImageError(true)}
        />
        {/* Hover image */}
        {secondImage && (
          <img
            src={secondImage}
            alt={`${product.name} alternate`}
            loading="lazy"
            className={`absolute inset-0 w-full h-full object-cover luxury-image transition-all duration-1000 ${
              hovered ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
          />
        )}

        {/* Status badge */}
        {isSoldOut && (
          <div className="absolute top-4 left-4">
            <span className="badge-sold-out">Sold Out</span>
          </div>
        )}
        {hasLowStock && !isSoldOut && (
          <div className="absolute top-4 left-4">
            <span className="badge-low">Almost Gone</span>
          </div>
        )}

        {/* Quick add — appears on hover, desktop only */}
        {isAvailable && (
          <div className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-500 hidden md:block ${
            hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
          >
            <div className="bg-cream/95 backdrop-blur-sm py-3 px-4 flex gap-2">
              {product.sizes.map(size => {
                const soldOut = product.stock[size] === 'sold_out';
                return (
                  <button
                    key={size}
                    disabled={soldOut}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!soldOut) add(product.slug, size);
                    }}
                    className={`flex-1 type-label py-1.5 transition-colors duration-300 ${
                      soldOut
                        ? 'text-stone/30 cursor-not-allowed line-through'
                        : 'text-charcoal hover:bg-charcoal hover:text-cream'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Link>

      {/* ── Info ────────────────────────────────────────────────────── */}
      <div className="mt-4 flex items-start justify-between gap-2">
        <div>
          <p className="product-card__category">{product.category}</p>
          <Link to={`/product/${product.slug}`}>
            <h3 className="product-card__name">{product.name}</h3>
          </Link>
        </div>
        <p className="product-card__price shrink-0">{product.price}</p>
      </div>
    </article>
  );
}
