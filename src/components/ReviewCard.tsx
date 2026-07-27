import Stars from './Stars';
import type { Review } from '../lib/reviews';

export default function ReviewCard({ review, compact }: { review: Review; compact?: boolean }) {
  return (
    <div className={`${compact ? 'p-4' : 'p-6'} bg-offwhite border border-sand/30 rounded-sm`}>
      <Stars rating={review.rating} size={compact ? 'sm' : 'md'} />
      <p className={`mt-3 text-charcoal font-light leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>
        "{review.text}"
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className={`text-charcoal font-light ${compact ? 'text-[0.6rem]' : 'text-xs'}`}>{review.name}</span>
        {review.verified && <span className="text-[0.45rem] bg-navy/10 text-navy px-1.5 py-0.5 rounded uppercase tracking-wider">Verified</span>}
      </div>
    </div>
  );
}
