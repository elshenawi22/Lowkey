import { useState, useEffect } from 'react';
import { useRouter } from '../router';
import { useBag } from '../context/BagContext';

export default function Navigation() {
  const { path, navigate } = useRouter();
  const { count, open } = useBag();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = path === '/';
  const dark = !scrolled && isHome && !menuOpen;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNav = (to: string) => {
    setMenuOpen(false);
    navigate(to);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          scrolled ? 'bg-cream/95 backdrop-blur-sm' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
          <div className="flex items-center justify-between h-20 md:h-24">
            {/* Logo */}
            <button onClick={() => handleNav('/')} className="relative z-50">
              <span
                className={`font-serif text-lg md:text-xl tracking-[0.3em] font-light transition-colors duration-700 ${
                  dark ? 'text-cream' : 'text-charcoal'
                } ${menuOpen ? 'text-charcoal' : ''}`}
              >
                LOWKEY
              </span>
            </button>

            {/* Desktop — minimal */}
            <div className="hidden md:flex items-center gap-10">
              <button
                onClick={() => handleNav('/drop/001')}
                className={`text-[0.6rem] tracking-[0.25em] uppercase font-light transition-colors duration-500 hover:opacity-100 ${
                  dark ? 'text-cream/70' : 'text-charcoal/60'
                }`}
              >
                Drop 001
              </button>
              <button
                onClick={() => handleNav('/archive')}
                className={`text-[0.6rem] tracking-[0.25em] uppercase font-light transition-colors duration-500 hover:opacity-100 ${
                  dark ? 'text-cream/70' : 'text-charcoal/60'
                }`}
              >
                Archive
              </button>
              <button
                onClick={() => handleNav('/about')}
                className={`text-[0.6rem] tracking-[0.25em] uppercase font-light transition-colors duration-500 hover:opacity-100 ${
                  dark ? 'text-cream/70' : 'text-charcoal/60'
                }`}
              >
                Story
              </button>
              <a
                href="https://www.instagram.com/lowkey_egy"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[0.6rem] tracking-[0.25em] uppercase font-light transition-colors duration-500 hover:opacity-100 ${
                  dark ? 'text-cream/70' : 'text-charcoal/60'
                }`}
              >
                Instagram
              </a>

              {/* Bag */}
              <button
                onClick={open}
                aria-label="Open selection"
                className={`relative transition-colors duration-500 hover:opacity-100 ${
                  dark ? 'text-cream/70' : 'text-charcoal/60'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 6h12l-1 9.5a1 1 0 0 1-1 .9H5a1 1 0 0 1-1-.9L3 6Z" stroke="currentColor" strokeWidth="0.75" />
                  <path d="M6.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="0.75" />
                </svg>
                {count > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-navy text-cream text-[0.5rem] w-4 h-4 rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile burger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`md:hidden relative z-50 p-2 transition-colors duration-700 ${
                menuOpen || !dark ? 'text-charcoal' : 'text-cream'
              }`}
              aria-label="Menu"
            >
              <div className="w-5 flex flex-col gap-1.5">
                <span className={`block h-px bg-current transition-all duration-500 ${menuOpen ? 'rotate-45 translate-y-[3.5px]' : ''}`} />
                <span className={`block h-px bg-current transition-all duration-500 ${menuOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-40 bg-cream transition-all duration-700 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-10">
          <button
            onClick={() => handleNav('/drop/001')}
            className="font-serif text-2xl tracking-[0.15em] text-charcoal font-light"
          >
            Drop 001
          </button>
          <button
            onClick={() => handleNav('/archive')}
            className="font-serif text-2xl tracking-[0.15em] text-charcoal font-light"
          >
            Archive
          </button>
          <button
            onClick={() => handleNav('/about')}
            className="font-serif text-2xl tracking-[0.15em] text-charcoal font-light"
          >
            Story
          </button>
          <a
            href="https://www.instagram.com/lowkey_egy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-serif text-2xl tracking-[0.15em] text-charcoal font-light"
            onClick={() => setMenuOpen(false)}
          >
            Instagram
          </a>
          <button
            onClick={() => { setMenuOpen(false); open(); }}
            className="text-stone text-xs tracking-[0.25em] uppercase font-light mt-4"
          >
            Selection ({count})
          </button>
        </div>
      </div>
    </>
  );
}
