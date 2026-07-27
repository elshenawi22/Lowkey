export function ImageSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-sand/30 animate-pulse ${className}`}>
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-8 h-px bg-sand/60" />
      </div>
    </div>
  );
}

export function TextSkeleton({ width = 'w-32', className = '' }: { width?: string; className?: string }) {
  return <div className={`h-3 bg-sand/30 animate-pulse rounded ${width} ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-sand/30 rounded" />
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-sand/30 rounded w-3/4" />
        <div className="h-3 bg-sand/30 rounded w-1/3" />
      </div>
    </div>
  );
}
