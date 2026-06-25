import { useState } from 'react';
import { useInView } from '../hooks/useInView';
import { Link, useRouter } from '../router';
import { useProducts } from '../hooks/useProducts';
import { useInventory, isProductSoldOut } from '../hooks/useInventory';
import { useCMS, getProductImages } from '../lib/cms';

function ProductCard({ product, index, visible, inventory }: { product: any; index: number; visible: boolean; inventory: any[] }) {
  const images = getProductImages(product.slug, product.image);
  const [hovered, setHovered] = useState(false);
  const secondImage = images.length > 1 ? images[1] : null;
  const soldOut = isProductSoldOut(product.slug, product.sizes, inventory);

  return (
    <Link
      to={`/product/${product.slug}`}
      className={`group block transition-all duration-[1.5s] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${soldOut ? 'grayscale-[0.5]' : ''}`}
      style={{ transitionDelay: visible ? `${index * 150}ms` : '0ms' }}
    >
      <div
        className="aspect-[3/4] overflow-hidden bg-sand/20 relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Main image */}
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover luxury-image transition-all duration-700 ${
            hovered && secondImage ? 'opacity-0 scale-[1.02]' : 'opacity-100 scale-100'
          }`}
        />
        {/* Second image on hover */}
        {secondImage && (
          <img
            src={secondImage}
            alt={`${product.name} 2`}
            loading="lazy"
            className={`absolute inset-0 w-full h-full object-cover luxury-image transition-all duration-700 ${
              hovered ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'
            }`}
          />
        )}

        {/* Sold Out Overlay */}
        {soldOut && (
          <div className="absolute inset-0 z-20 bg-charcoal/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="text-cream text-[0.6rem] tracking-[0.4em] uppercase border border-cream/30 px-4 py-2">
              Sold Out — نفد
            </span>
          </div>
        )}

        {/* Image count badge */}
        {!soldOut && images.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-charcoal/60 backdrop-blur-sm text-cream text-[0.45rem] tracking-wider px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {images.length} photos
          </span>
        )}
      </div>
      <div className="mt-4 md:mt-6">
        <div className="flex justify-between items-start">
          <h3 className="font-serif text-sm md:text-lg text-charcoal font-light tracking-wide group-hover:text-navy transition-colors duration-500">{product.name}</h3>
          {soldOut && <span className="text-[0.5rem] bg-stone/10 text-stone px-1.5 py-0.5 rounded uppercase tracking-widest">Sold Out</span>}
        </div>
        <span className="text-stone text-[0.6rem] md:text-xs font-light tracking-wide mt-1 block">
          {soldOut ? 'Out of Stock — نفد' : product.price}
        </span>
      </div>
    </Link>
  );
}

export default function CollectionShowcase({ id }: { id: string }) {
  const { navigate } = useRouter();
  const cms = useCMS();
  const { ref: gridRef, isInView: gridInView } = useInView(0.1);
  const { products } = useProducts();
  const { inventory } = useInventory();

  return (
    <section id={id} className="bg-cream">
      <div ref={gridRef} className="py-20 md:py-28 lg:py-36">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <div className={`mb-14 md:mb-20 text-center transition-all duration-1000 ${gridInView ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light">{cms.collection_label}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-x-4 md:gap-x-8 lg:gap-x-14 gap-y-10 md:gap-y-16 lg:gap-y-20">
            {products.slice(0, 4).map((product, i) => (
              <ProductCard key={product.slug} product={product} index={i} visible={gridInView} inventory={inventory} />
            ))}
          </div>
          <div className={`mt-16 md:mt-24 text-center transition-all duration-1000 delay-600 ${gridInView ? 'opacity-100' : 'opacity-0'}`}>
            <button onClick={() => navigate('/drop/001')} className="btn-luxury group">
              {cms.collection_cta}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transition-transform duration-500 group-hover:translate-x-1"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="0.75" /></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
