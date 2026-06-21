import { Link } from '../router';
import { useCMS } from '../lib/cms';

export default function Footer() {
  const cms = useCMS();
  return (
    <footer className="bg-cream py-24 md:py-32 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 lg:px-20">
        <div className="text-center">
          <h2 className="font-serif text-2xl md:text-3xl tracking-[0.25em] font-light text-charcoal">{cms.brand_name}</h2>
          <p className="font-serif text-sm md:text-base text-charcoal/40 font-light italic mt-3 tracking-wide">{cms.footer_tagline}</p>
          <div className="mt-14 flex flex-wrap justify-center gap-8 md:gap-10">
            <Link to="/drop/001" className="text-stone text-[0.6rem] tracking-[0.25em] uppercase font-light hover:text-navy transition-colors duration-500">Drop 001</Link>
            <Link to="/archive" className="text-stone text-[0.6rem] tracking-[0.25em] uppercase font-light hover:text-navy transition-colors duration-500">Archive</Link>
            <Link to="/about" className="text-stone text-[0.6rem] tracking-[0.25em] uppercase font-light hover:text-navy transition-colors duration-500">Story</Link>
            <Link to="/track" className="text-stone text-[0.6rem] tracking-[0.25em] uppercase font-light hover:text-navy transition-colors duration-500">Track Order</Link>
            <a href={cms.brand_instagram} target="_blank" rel="noopener noreferrer" className="text-stone text-[0.6rem] tracking-[0.25em] uppercase font-light hover:text-navy transition-colors duration-500">Instagram</a>
          </div>
          <div className="mt-6">
            <Link to="/policy" className="text-stone/20 text-[0.5rem] tracking-[0.15em] font-light hover:text-stone/40 transition-colors duration-500">Privacy & Terms</Link>
          </div>
          <p className="mt-14 text-stone/30 text-[0.6rem] font-light tracking-[0.15em]">{cms.footer_origin}</p>
          <p className="mt-6 text-stone/20 text-[0.5rem] tracking-[0.2em] uppercase font-light">© 2026 {cms.brand_name}</p>
        </div>
      </div>
    </footer>
  );
}
