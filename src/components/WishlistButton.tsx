// ============================================================================
// LOWKEY — Wishlist Button
// Minimal heart icon. Filled = saved. Uses WishlistContext.
// ============================================================================

import { useWishlist } from '../context/WishlistContext';

interface WishlistButtonProps {
  slug: string;
  className?: string;
}

export default function WishlistButton({ slug, className = '' }: WishlistButtonProps) {
  const { has, toggle } = useWishlist();
  const saved = has(slug);

  return (
    <button
      onClick={() => toggle(slug)}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      aria-pressed={saved}
      className={`group relative flex items-center justify-center transition-opacity duration-300 hover:opacity-70 ${className}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="0.8"
        className={`transition-all duration-500 ${
          saved ? 'text-charcoal scale-110' : 'text-stone scale-100'
        }`}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
