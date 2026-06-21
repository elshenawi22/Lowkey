import { useState } from 'react';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

export default function SmartImage({ src, alt, className = '', priority = false }: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden bg-sand/20">
      {/* Skeleton */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse">
          <div className="w-8 h-px bg-sand/50" />
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-stone/30 text-[0.5rem] tracking-widest uppercase">No Image</span>
        </div>
      )}
      
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover luxury-image transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      />
    </div>
  );
}
