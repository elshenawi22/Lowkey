import { useState, useEffect } from 'react';
import { getReviews } from '../lib/reviews';
import Stars from './Stars';

export default function ReviewToast() {
  const [show, setShow] = useState(false);
  const [review, setReview] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    let first: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;

    getReviews().then(all => {
      if (cancelled) return;
      const reviews = all.filter(r => r.verified);
      if (reviews.length === 0) return; // No fake reviews — wait for real ones

      const showRandom = () => {
        const r = reviews[Math.floor(Math.random() * reviews.length)];
        setReview(r);
        setShow(true);
        setTimeout(() => setShow(false), 6000);
      };

      first = setTimeout(showRandom, 15000);
      interval = setInterval(showRandom, 45000);
    });

    return () => { cancelled = true; if (first) clearTimeout(first); if (interval) clearInterval(interval); };
  }, []);

  if (!review) return null;

  return (
    <div className={`fixed bottom-20 left-4 z-40 max-w-xs transition-all duration-700 ${show ? 'opacity-100 translate-y-0 translate-x-0' : 'opacity-0 translate-y-4 -translate-x-4 pointer-events-none'}`}>
      <div className="bg-cream border border-sand/50 shadow-xl rounded-sm p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-navy/10 rounded-full flex items-center justify-center shrink-0">
            <span className="text-navy text-xs font-serif">{review.name[0]}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-charcoal text-xs font-light">{review.name}</span>
              <Stars rating={review.rating} />
            </div>
            <p className="text-stone text-[0.65rem] font-light leading-relaxed mt-1 line-clamp-2">
              "{review.text}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
