import { useState, useEffect } from 'react';
import { loadInventory, type StockItem } from '../lib/inventory';

let cachedInventory: StockItem[] | null = null;

export function useInventory(): { inventory: StockItem[]; loading: boolean } {
  const [inventory, setInventory] = useState<StockItem[]>(cachedInventory || []);
  const [loading, setLoading] = useState(!cachedInventory);

  useEffect(() => {
    let cancelled = false;
    loadInventory().then(items => {
      if (!cancelled) {
        cachedInventory = items;
        setInventory(items);
        setLoading(false);
      }
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  return { inventory, loading };
}

export function isProductSoldOut(slug: string, sizes: string[], inventory: StockItem[]): boolean {
  const productStock = inventory.filter(i => i.productSlug === slug);
  
  // If we have stock info in the DB, use it
  if (productStock.length > 0) {
    return sizes.every(size => {
      const item = productStock.find(i => i.size === size);
      // If size exists in DB, check its quantity. If missing, assume it's out.
      return item ? item.quantity <= 0 : true;
    });
  }

  // Fallback: Check if it's a default product and check its default stock
  return false;
}
