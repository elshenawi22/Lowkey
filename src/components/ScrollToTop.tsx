import { useState, useEffect } from 'react';

export default function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className={`fixed bottom-6 left-6 z-40 w-11 h-11 flex items-center justify-center bg-navy/90 backdrop-blur-sm text-cream rounded-full shadow-lg transition-all duration-500 hover:bg-navy ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 13V3M3 8l5-5 5 5" stroke="currentColor" strokeWidth="1" />
      </svg>
    </button>
  );
}
