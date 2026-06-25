import { useState, useEffect } from 'react';
import { useInView } from '../hooks/useInView';
import { getFeaturedReviews, getAllAverageRating, type Review } from '../lib/reviews';
import Stars from './Stars';
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

  const { avg, count } = rating;

  useEffect(() => {
    if (reviews.length <= 1) return;
    const timer = setInterval(() => setCurrent(i => (i + 1) % reviews.length), 5000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  // No reviews yet — don't show anything (no fake data)
  if (reviews.length === 0) return null;

  return (
    <section ref={ref} className="bg-offwhite py-16 md:py-24">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
        <div className={`text-center mb-10 transition-all duration-1000 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <Stars rating={avg} size="lg" />
          <p className="text-stone text-[0.6rem] tracking-[0.3em] uppercase font-light mt-3">
            {avg} / 5 — {count} Reviews
          </p>
        </div>

        <div className={`max-w-xl mx-auto text-center transition-all duration-1000 delay-200 ${isInView ? 'opacity-100' : 'opacity-0'}`}>
          <div className="relative min-h-[120px]">
            {reviews.map((r, i) => (
              <div key={r.id} className={`absolute inset-0 transition-all duration-700 ${i === current ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <p className="font-serif text-lg md:text-xl text-charcoal font-light leading-relaxed italic">
                  "{r.text}"
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="text-charcoal text-sm font-light">{r.name}</span>
                  {r.verified && <span className="text-[0.45rem] bg-navy/10 text-navy px-1.5 py-0.5 rounded uppercase tracking-wider">Verified</span>}
                </div>
              </div>
            ))}
          </div>

          {reviews.length > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {reviews.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-1.5 bg-navy' : 'w-1.5 h-1.5 bg-sand'}`} />
              ))}
            </div>
          )}
        </div>

        <div className={`text-center mt-8 transition-all duration-1000 delay-400 ${isInView ? 'opacity-100' : 'opacity-0'}`}>
          <Link to="/reviews" className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light hover:text-navy transition-colors">
            All Reviews →
          </Link>
        </div>
      </div>
    </section>
  );
}
