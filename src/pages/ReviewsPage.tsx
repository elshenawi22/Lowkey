import { useState, useEffect } from 'react';
import { useInView } from '../hooks/useInView';
import { getReviews, getAllAverageRating, type Review } from '../lib/reviews';
import Stars from '../components/Stars';
import ReviewCard from '../components/ReviewCard';
import { Link } from '../router';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState({ avg: 0, count: 0 });
  const { ref, isInView } = useInView(0.1);

  useEffect(() => {
    getReviews().then(setReviews);
    getAllAverageRating().then(setRating);
  }, []);

  const { avg, count } = rating;

  useEffect(() => {
    document.title = 'Reviews — LOWKEY';
    return () => { document.title = 'LOWKEY — Stay Low. Leave Legacy.'; };
  }, []);

  return (
    <main className="bg-cream min-h-screen pt-32 pb-20">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-16">
          <span className="text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light">What Our Customers Say</span>
          <h1 className="font-serif text-3xl md:text-4xl text-charcoal font-light mt-4 tracking-wide">آراء عملائنا</h1>
          {count > 0 ? (
            <div className="mt-6">
              <Stars rating={avg} size="lg" />
              <p className="text-stone text-sm font-light mt-2">{avg} / 5 based on {count} reviews</p>
            </div>
          ) : (
            <p className="text-stone text-sm font-light mt-6 italic">No reviews yet — purchase to be the first.</p>
          )}
        </div>

        <div ref={ref} className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-serif text-xl text-charcoal/50 font-light italic">Be the first to leave a review.</p>
              <p className="text-stone text-sm font-light mt-2">بعد ما تستلم طلبك، شاركنا رأيك.</p>
            </div>
          ) : reviews.map((review, i) => (
            <div key={review.id} className={`transition-all duration-[1.5s] ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 100}ms` }}>
              <ReviewCard review={review} />
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link to="/" className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light hover:text-navy transition-colors">← Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
