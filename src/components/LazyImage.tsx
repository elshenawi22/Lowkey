// ============================================================================
// LOWKEY — LazyImage
// • Uses native loading="lazy" (supported in all target browsers)
// • Blur-up: shows a 20px blurred placeholder until full image loads
// • Accepts optional srcSet for responsive images
// • Fully accessible: alt always required, decorative images pass alt=""
// ============================================================================

import { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  srcSet?: string;
  sizes?: string;
  eager?: boolean;            // Force eager loading for LCP images
  placeholder?: string;       // Optional LQIP data URL
  onLoad?: () => void;
}

export default function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  srcSet,
  sizes,
  eager = false,
  placeholder,
  onLoad,
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(eager);
  const ref = useRef<HTMLDivElement>(null);

  // Only observe if not eager
  useEffect(() => {
    if (eager) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before it enters viewport
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [eager]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={placeholder && !loaded ? { backgroundImage: `url(${placeholder})`, backgroundSize: 'cover' } : undefined}
    >
      {/* Placeholder shimmer when no LQIP */}
      {!loaded && !placeholder && (
        <div className="absolute inset-0 bg-sand/30 animate-pulse" aria-hidden="true" />
      )}

      {inView && (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding={eager ? 'sync' : 'async'}
          fetchPriority={eager ? 'high' : 'auto'}
          width={width}
          height={height}
          srcSet={srcSet}
          sizes={sizes}
          onLoad={handleLoad}
          className={`w-full h-full object-cover transition-opacity duration-700 luxury-image ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
