import { useState, useEffect, useRef } from 'react';
import { useRouter, Link } from '../router';
import { useBag } from '../context/BagContext';
import { useCMS } from '../lib/cms';

export default function Navigation() {
  const { path, navigate } = useRouter();
  const { count } = useBag();
  const cms = useCMS();
  const [scrolled, setScrolled] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Determine if we're on a dark-hero page (home, drop, launch)
  const isDarkPage = path === '/' || path.startsWith('/drop') || path === '/launch';

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
      setAtTop(window.scrollY < 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [path]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Prevent scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const isLight = !isDarkPage || scrolled;

  const navLinks = [
    { label: 'Drop 001', path: '/drop/001' },
    { label: 'Archive',  path: '/archive' },
    { label: 'Story',    path: '/about' },
  ];

  return (
    <>
      {/* ── Main Nav ─────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          scrolled
            ? 'bg-cream/95 backdrop-blur-md border-b border-bone'
            : 'bg-transparent'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
      >
        <div className="container-lk">
          <div className="flex items-center justify-between h-16 md:h-20">

            {/* Left — Nav links (desktop) */}
            <nav className="hidden md:flex items-center gap-10">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link ${path.startsWith(link.path) ? 'active' : ''} ${
                    !isLight ? 'text-cream/60 hover:text-cream' : 'text-charcoal'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Center — Wordmark */}
            <Link
              to="/"
              className={`absolute left-1/2 -translate-x-1/2 tracking-[0.35em] text-[0.65rem] font-light transition-all duration-500 ${
                !isLight ? 'text-cream' : 'text-charcoal'
              }`}
              style={{ fontFamily: 'var(--font-sans)', letterSpacing: '0.35em', fontWeight: 300 }}
            >
              LOWKEY
            </Link>

            {/* Right — Bag + Menu */}
            <div className="flex items-center gap-6 ml-auto md:ml-0">
              {/* Bag */}
              <button
                aria-label="Open bag"
                onClick={() => {
                  const event = new CustomEvent('lk:open-bag');
                  window.dispatchEvent(event);
                }}
                className={`type-label relative transition-opacity duration-300 ${
                  !isLight ? 'text-cream/70 hover:text-cream' : 'text-stone hover:text-charcoal'
                }`}
              >
                Bag
                {count > 0 && (
                  <span className="absolute -top-2 -right-3 w-3.5 h-3.5 bg-charcoal text-cream rounded-full flex items-center justify-center"
                    style={{ fontSize: '0.45rem', fontFamily: 'var(--font-sans)' }}>
                    {count}
                  </span>
                )}
              </button>

              {/* Hamburger — mobile only */}
              <button
                aria-label="Menu"
                onClick={() => setMenuOpen(v => !v)}
                className={`md:hidden flex flex-col gap-[5px] p-1 transition-opacity duration-300 ${
                  !isLight ? 'text-cream' : 'text-charcoal'
                }`}
              >
                <span className={`block h-px w-5 bg-current transition-all duration-500 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                <span className={`block h-px bg-current transition-all duration-300 ${menuOpen ? 'opacity-0 w-0' : 'w-5'}`} />
                <span className={`block h-px w-5 bg-current transition-all duration-500 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Full-Screen Menu ──────────────────────────────────────── */}
      <div
        ref={menuRef}
        className={`fixed inset-0 z-40 flex flex-col bg-cream transition-all duration-700 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.25,0,0,1)' }}
      >
        {/* Close button */}
        <div className="container-lk flex justify-end pt-5 pb-0">
          <button
            onClick={() => setMenuOpen(false)}
            className="type-label text-stone hover:text-charcoal transition-colors duration-300 mt-1"
            aria-label="Close menu"
          >
            Close
          </button>
        </div>

        {/* Menu links — large display type */}
        <nav className="container-lk flex flex-col justify-center flex-1 gap-2 pb-20">
          {[
            { label: 'Home',     path: '/' },
            ...navLinks,
            { label: 'Reviews',  path: '/reviews' },
            { label: 'Track Order', path: '/track' },
          ].map((link, i) => (
            <Link
              key={link.path}
              to={link.path}
              className={`type-h2 text-charcoal/80 hover:text-charcoal transition-all duration-500 animate-fade-in-up delay-${(i + 1) * 100} ${
                menuOpen ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ fontFamily: 'var(--font-display)', fontWeight: 300, lineHeight: 1.4 }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Footer row */}
        <div className="container-lk pb-10 flex items-center justify-between border-t border-bone pt-6">
          <span className="type-label text-stone">{cms.brand_tagline || 'Stay Low. Leave Legacy.'}</span>
          <a
            href={`https://instagram.com/${(cms.brand_instagram || '').replace(/.*instagram.com\//, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="type-label text-stone hover:text-charcoal transition-colors"
          >
            Instagram
          </a>
        </div>
      </div>

      {/* Overlay for menu on desktop (safety) */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:block hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
