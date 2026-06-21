import { useRef, useEffect, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}

export default function VideoPlayer({
  src,
  poster,
  className = '',
  overlay = true,
  overlayOpacity = 0.3,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Attempt autoplay
    const playVideo = async () => {
      try {
        await video.play();
      } catch {
        // Autoplay blocked — muted should help but some browsers still block
        video.muted = true;
        try {
          await video.play();
        } catch {
          // Still blocked — user will need to interact
        }
      }
    };

    if (video.readyState >= 3) {
      setIsLoaded(true);
      playVideo();
    } else {
      video.addEventListener('canplay', () => {
        setIsLoaded(true);
        playVideo();
      });
    }
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        className={`w-full h-full object-cover transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {overlay && (
        <div
          className="absolute inset-0 bg-navy pointer-events-none"
          style={{ opacity: overlayOpacity }}
        />
      )}
    </div>
  );
}
