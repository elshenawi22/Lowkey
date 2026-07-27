import { useState, useEffect } from 'react';
import { useInView } from '../hooks/useInView';
import { getFeaturedReviews, getAllAverageRating, type Review } from '../lib/reviews';
import { Link } from '../router';

export default function ReviewsSlider() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState({ avg: 0, count: 0 });
  const { ref, isInView } = useInView(0.2);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    getFeaturedReviews().then(setReviews);
    getAllAverageRating().then(setRating);
  }, []);

  useEffect(() => {
    if (reviews.length <= 1) return;
    const t = setInterval(() => setCurrent(i => (i + 1) % reviews.length), 6000);
    return () => clearInterval(t);
  }, [reviews.length]);

  if (reviews.length === 0) return null;

  const { avg, count } = rating;

  return (
    <section ref={ref} className="bg-cream section-padding-sm border-t border-bone">
      <div className="container-narrow text-center">

        {/* Rating summary */}
        <div className={`transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}>
          <span className="eyebrow">Customer Reviews</span>
          {/* Star row */}
          <div className="flex justify-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`text-lg ${i < Math.round(avg) ? 'text-charcoal' : 'text-sand'}`}>★</span>
            ))}
          </div>
          <p className="type-caption text-stone">{avg} / 5 &nbsp;·&nbsp; {count} {count === 1 ? 'review' : 'reviews'}</p>
        </div>

        {/* Review quote */}
        <div className={`relative mt-12 min-h-[140px] transition-all duration-1000 delay-200 ${
          isInView ? 'opacity-100' : 'opacity-0'
        }`}>
          {reviews.map((r, i) => (
            <div
              key={r.id}
              className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${
                i === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
              }`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
            >
              <p className="pull-quote border-l-0 text-center px-0 text-charcoal/80 max-w-lg mx-auto">
                "{r.text}"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-6 h-px bg-sand" />
                <span className="type-caption text-stone">{r.name}</span>
                {r.verified && (
                  <span className="type-label text-stone/50 border border-stone/20 px-2 py-0.5">Verified</span>
                )}
                <div className="w-6 h-px bg-sand" />
              </div>
            </div>
          ))}
        </div>

        {/* Dots */}
        {reviews.length > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Review ${i + 1}`}
                className={`rounded-full transition-all duration-500 ${
                  i === current ? 'w-8 h-1 bg-charcoal' : 'w-1 h-1 bg-sand hover:bg-stone'
                }`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
              />
            ))}
          </div>
        )}

        <div className={`mt-10 transition-all duration-700 delay-400 ${isInView ? 'opacity-100' : 'opacity-0'}`}>
          <Link to="/reviews" className="btn-ghost">
            All Reviews →
          </Link>
        </div>
      </div>
    </section>
  );
}
