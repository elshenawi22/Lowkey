export default function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : 'text-xs';
  return (
    <span className={`${s} tracking-wider`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= Math.round(rating) ? 'text-amber-400' : 'text-sand'}>★</span>
      ))}
    </span>
  );
}
