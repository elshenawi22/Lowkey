import { Link } from '../router';
import { useCMS } from '../lib/cms';

export default function Footer() {
  const cms = useCMS();
  const year = new Date().getFullYear();

  const nav = [
    { label: 'Drop 001',     path: '/drop/001' },
    { label: 'Archive',      path: '/archive' },
    { label: 'Our Story',    path: '/about' },
    { label: 'Reviews',      path: '/reviews' },
    { label: 'Track Order',  path: '/track' },
    { label: 'Policy',       path: '/policy' },
  ];

  const instagramHandle = (cms.brand_instagram || '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
    .replace(/\/$/, '');

  return (
    <footer className="bg-ink text-cream/60 pt-20 pb-10">
      <div className="container-lk">

        {/* ── Top Row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 pb-16 border-b border-white/8">

          {/* Brand Column */}
          <div>
            <p className="type-label text-cream mb-6 tracking-[0.35em]">LOWKEY</p>
            <p className="type-body text-cream/40 leading-relaxed max-w-xs" style={{ fontSize: '0.8rem' }}>
              {cms.footer_tagline || 'A modern heritage fashion label. Born in Port Said. Built for permanence.'}
            </p>
            <p className="mt-6 type-label text-cream/25">
              {cms.footer_origin || 'Port Said, Egypt'}
            </p>
          </div>

          {/* Navigation Column */}
          <div>
            <p className="type-label text-cream/30 mb-6">Navigate</p>
            <nav className="flex flex-col gap-4">
              {nav.map(link => (
                <Link key={link.path} to={link.path} className="footer-link text-cream/50">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact Column */}
          <div>
            <p className="type-label text-cream/30 mb-6">Connect</p>
            <div className="flex flex-col gap-4">
              {instagramHandle && (
                <a
                  href={cms.brand_instagram || `https://instagram.com/${instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link text-cream/50"
                >
                  Instagram
                </a>
              )}
              <a
                href={`https://wa.me/${(cms.brand_phone || '').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link text-cream/50"
              >
                WhatsApp
              </a>
              {cms.brand_email && (
                <a href={`mailto:${cms.brand_email}`} className="footer-link text-cream/50">
                  {cms.brand_email}
                </a>
              )}
            </div>

            {/* Newsletter mini */}
            <div className="mt-10">
              <p className="type-label text-cream/30 mb-3">Drop 002 — Early Access</p>
              <Link
                to="/#newsletter"
                className="type-label text-cream/50 hover:text-cream transition-colors duration-300 flex items-center gap-2"
              >
                Join the list →
              </Link>
            </div>
          </div>
        </div>

        {/* ── Bottom Row ─────────────────────────────────────────────── */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="type-label text-cream/20">
            © {year} {cms.brand_name || 'LOWKEY'}. All rights reserved.
          </p>
          <p className="type-label text-cream/15" dir="rtl" lang="ar" style={{ fontFamily: 'var(--font-arabic)' }}>
            {cms.brand_tagline || 'ابقَ هادئاً. اترك أثراً.'}
          </p>
          <div className="flex items-center gap-6">
            <Link to="/policy" className="footer-link text-cream/20 text-[0.55rem]">Privacy</Link>
            <Link to="/policy" className="footer-link text-cream/20 text-[0.55rem]">Terms</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
