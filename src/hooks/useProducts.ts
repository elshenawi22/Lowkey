import { useState, useEffect } from 'react';
import { getVisibleProducts } from '../lib/products-db';
import { products as fallbackProducts, type Product } from '../data/catalog';

let cachedProducts: Product[] | null = null;

export function useProducts(): { products: Product[]; loading: boolean } {
  const [products, setProducts] = useState<Product[]>(cachedProducts || fallbackProducts);
  const [loading, setLoading] = useState(!cachedProducts);

  useEffect(() => {
    if (cachedProducts) return;
    let cancelled = false;
    getVisibleProducts().then(p => {
      if (!cancelled && p.length > 0) {
        cachedProducts = p;
        setProducts(p);
        // Cache for getProductImages to read
        try {
          localStorage.setItem('lowkey-products-cache', JSON.stringify(p.map(prod => ({
            slug: prod.slug,
            image: prod.image,
            images: prod.images,
          }))));
        } catch { /* ignore */ }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  return { products, loading };
}

export function useProduct(slug: string): { product: Product | undefined; loading: boolean } {
  const { products, loading } = useProducts();
  return { product: products.find(p => p.slug === slug), loading };
}
