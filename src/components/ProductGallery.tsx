import { useState, useRef, useEffect } from 'react';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface ProductGalleryProps {
  images: string[]; // URLs — videos end with .mp4/.webm/.mov
  name: string;
}

function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

export default function ProductGallery({ images, name }: ProductGalleryProps) {
  const items: MediaItem[] = images.map(url => ({ url, type: isVideo(url) ? 'video' : 'image' }));
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const touchStartX = useRef(0);
  const videoRefs = useRef<Record<number, HTMLVideoElement>>({});

  useEffect(() => { setCurrent(0); setLoaded({}); }, [images]);

  // Pause videos when not visible
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([idx, video]) => {
      if (parseInt(idx) === current) {
        video?.play().catch(() => {});
      } else {
        video?.pause();
      }
    });
  }, [current]);

  const next = () => setCurrent(i => (i + 1) % items.length);
  const prev = () => setCurrent(i => (i - 1 + items.length) % items.length);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
  };

  if (items.length <= 1 && items[0]?.type === 'image') {
    return (
      <div className="aspect-[3/4] overflow-hidden bg-sand/20">
        <img src={items[0].url} alt={name} loading="eager" className="w-full h-full object-cover luxury-image" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Main viewer */}
      <div
        className="aspect-[3/4] overflow-hidden bg-sand/20 relative cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {items.map((item, i) => (
          <div key={i} className={`absolute inset-0 transition-all duration-500 ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
            {item.type === 'video' ? (
              <video
                ref={el => { if (el) videoRefs.current[i] = el; }}
                src={item.url}
                muted
                loop
                playsInline
                autoPlay
                preload="auto"
                className="w-full h-full object-cover"
              />
            
            ) : (
              <img
                src={item.url}
                alt={`${name} ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                onLoad={() => setLoaded(p => ({ ...p, [i]: true }))}
                className={`w-full h-full object-cover luxury-image ${loaded[i] ? '' : 'blur-sm'}`}
              />
            )}
          </div>
        ))}

        {/* Counter */}
        <div className="absolute top-4 right-4 z-20 bg-charcoal/60 backdrop-blur-sm text-cream text-[0.5rem] tracking-wider px-2.5 py-1 rounded-full">
          {current + 1} / {items.length}
        </div>

        {/* Video indicator */}
        {items[current]?.type === 'video' && (
          <div className="absolute top-4 left-4 z-20 bg-charcoal/60 backdrop-blur-sm text-cream text-[0.5rem] px-2.5 py-1 rounded-full">
            ▶ Video
          </div>
        )}

        {/* Arrows */}
        {items.length > 1 && <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-cream/80 backdrop-blur-sm text-charcoal opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-full" aria-label="Previous">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1" /></svg>
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-cream/80 backdrop-blur-sm text-charcoal opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-full" aria-label="Next">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1" /></svg>
          </button>
        </>}
      </div>

      {/* Dots */}
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {items.map((item, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`transition-all duration-300 rounded-full ${i === current ? 'w-6 h-1.5 bg-navy' : `w-1.5 h-1.5 ${item.type === 'video' ? 'bg-navy/40' : 'bg-sand'}`}`}
              aria-label={`${item.type === 'video' ? 'Video' : 'Image'} ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Thumbnails (desktop) */}
      {items.length > 1 && (
        <div className="hidden md:flex gap-2 mt-4 overflow-x-auto pb-1">
          {items.map((item, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-16 h-20 shrink-0 overflow-hidden transition-all duration-300 relative ${i === current ? 'ring-1 ring-navy' : 'opacity-50 hover:opacity-80'}`}>
              {item.type === 'video' ? (
                <>
                  <video src={item.url} muted preload="metadata" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="text-white text-xs">▶</span></div>
                </>
              ) : (
                <img src={item.url} alt="" loading="lazy" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
