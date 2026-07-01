import { Link } from '../router';

export default function NotFoundState({ label = 'Page' }: { label?: string }) {
  return (
    <main className="bg-cream min-h-[70vh] flex items-center justify-center pt-20">
      <div className="text-center px-6">
        <span className="text-stone text-[0.6rem] tracking-[0.4em] uppercase font-light">
          {label} Not Found
        </span>
        <h1 className="font-serif text-3xl md:text-4xl font-light text-charcoal mt-6 tracking-wide italic">
          This page has been quietly retired.
        </h1>
        <Link to="/" className="btn-luxury mt-10 text-[0.6rem]">
          Return Home
        </Link>
      </div>
    </main>
  );
}
