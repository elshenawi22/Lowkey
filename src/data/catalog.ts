// ============================================================================
// LOWKEY — Catalog / Mock CMS Layer
// Single source of truth for archives (drops/collections) and products.
// In a production build this would be sourced from a CMS or database.
// Centralizing it here keeps components dumb and data swappable later.
// ============================================================================

export interface Product {
  slug: string;
  name: string;
  category: string;
  price: string;
  priceValue: number;
  image: string;
  images?: string[]; // Multiple product images
  fabric: string;
  weight: string;
  origin: string;
  fit: string;
  intro: string;
  construction: string;
  sizes: string[];
  stock: Record<string, 'available' | 'low' | 'sold_out'>;
}

export interface Archive {
  number: string;
  slug: string;
  title: string;
  subtitle: string;
  year: string;
  status: 'available' | 'forthcoming';
  campaign: string;
  narrative: string;
  productSlugs: string[];
}

export const products: Product[] = [
  {
    slug: 'heritage-knit-polo',
    name: 'Heritage Knit Polo',
    category: 'Knitwear',
    price: 'EGP 4,850',
    priceValue: 4850,
    image: '/images/product-polo.jpg',
    fabric: '100% Egyptian Long-Staple Cotton',
    weight: '220 GSM',
    origin: 'Made in Port Said, Egypt',
    fit: 'Relaxed Heritage',
    intro:
      'Constructed from premium Egyptian long-staple cotton, knitted in a fine gauge that balances structure with softness. A traditional ribbed collar, mother-of-pearl buttons and a relaxed heritage fit refined for modern proportions.',
    construction:
      'Fine-gauge knit with reinforced placket, cover-stitched hems and a linked collar. Designed to hold its shape through years of wear.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: { S: 'available', M: 'low', L: 'available', XL: 'available', XXL: 'sold_out' },
  },
  {
    slug: 'oxford-button-down',
    name: 'Oxford Button-Down',
    category: 'Shirting',
    price: 'EGP 3,750',
    priceValue: 3750,
    image: '/images/product-oxford.jpg',
    fabric: '100% Egyptian Oxford Cotton',
    weight: '180 GSM',
    origin: 'Made in Port Said, Egypt',
    fit: 'Classic Tailored',
    intro:
      'A foundational oxford woven from Egyptian compact cotton with a soft, textured hand. A button-down collar, mother-of-pearl buttons and a clean, unstructured body intended to be worn often and worn well.',
    construction:
      'Single-needle stitching throughout, gusseted side seams and a split back yoke. Pre-washed for a broken-in feel from the first wear.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: { S: 'available', M: 'available', L: 'available', XL: 'low', XXL: 'available' },
  },
  {
    slug: 'heavyweight-tee',
    name: 'Heavyweight Tee',
    category: 'Essentials',
    price: 'EGP 2,200',
    priceValue: 2200,
    image: '/images/product-tee.jpg',
    fabric: '100% Egyptian Compact Cotton',
    weight: '240 GSM',
    origin: 'Made in Port Said, Egypt',
    fit: 'Regular',
    intro:
      'A heavyweight essential cut from dense Egyptian compact cotton with a substantial, structured hand. Built to be the quiet foundation of a considered wardrobe — worn on its own or layered beneath tailoring.',
    construction:
      'Ribbed collar with internal taping, double-needle sleeves and a tubular body. Dense enough to drape, soft enough to live in.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    stock: { XS: 'available', S: 'available', M: 'available', L: 'available', XL: 'available' },
  },
  {
    slug: 'merino-crewneck',
    name: 'Merino Crewneck',
    category: 'Knitwear',
    price: 'EGP 5,850',
    priceValue: 5850,
    image: '/images/product-knit.jpg',
    fabric: '100% Extra-fine Merino Wool',
    weight: '260 GSM',
    origin: 'Made in Port Said, Egypt',
    fit: 'Relaxed',
    intro:
      'A lightweight crewneck spun from extra-fine merino — warm without weight, refined without effort. A year-round layer that bridges seasons with quiet ease.',
    construction:
      'Fully-fashioned knit construction with ribbed cuffs and hem. Naturally temperature-regulating and remarkably soft against the skin.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: { S: 'sold_out', M: 'available', L: 'available', XL: 'available', XXL: 'low' },
  },
];

export const archives: Archive[] = [
  {
    number: '001',
    slug: 'archive-001',
    title: 'A Study in Heritage and Silence',
    subtitle: 'The inaugural archive. Foundations, refined.',
    year: 'Released 2026',
    status: 'available',
    campaign: '/images/collection-campaign.jpg',
    narrative:
      'Our inaugural archive draws from tradition, material quality and the belief that garments should transcend seasons. Each piece is designed to become part of a personal uniform — quiet, considered, and made to be remembered rather than noticed.',
    productSlugs: [
      'heritage-knit-polo',
      'oxford-button-down',
      'heavyweight-tee',
      'merino-crewneck',
    ],
  },
  {
    number: '002',
    slug: 'archive-002',
    title: 'The Quiet Uniform',
    subtitle: 'الزي الهادئ — A study in restraint and repetition.',
    year: 'September 2026',
    status: 'forthcoming',
    campaign: '/images/heritage-interior.jpg',
    narrative:
      'The second archive explores the discipline of a uniform — fewer pieces, worn more often, refined to their essential form. What remains when you remove everything unnecessary?',
    productSlugs: [],
  },
  {
    number: '003',
    slug: 'archive-003',
    title: 'Material Memory',
    subtitle: 'How garments hold time.',
    year: 'Forthcoming',
    status: 'forthcoming',
    campaign: '/images/craft-fabric.jpg',
    narrative:
      'The third archive considers the way fabric remembers — the patina of wear, the softness of time, the quiet evidence of a life lived.',
    productSlugs: [],
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getArchive(slug: string): Archive | undefined {
  return archives.find((a) => a.slug === slug);
}

export function getProductsByArchive(archive: Archive): Product[] {
  return archive.productSlugs
    .map((slug) => getProduct(slug))
    .filter((p): p is Product => Boolean(p));
}
