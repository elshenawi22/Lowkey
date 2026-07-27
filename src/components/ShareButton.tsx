import { useState } from 'react';

interface ShareButtonProps {
  title: string;
  price: string;
}

export default function ShareButton({ title, price }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const url = window.location.href;
  const text = `${title} — ${price} | LOWKEY`;

  const share = async () => {
    // Use native share on mobile
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch { /* user cancelled */ }
    }
    
    // Fallback: copy link
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const whatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={share}
        className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light hover:text-navy transition-colors duration-500 flex items-center gap-1.5"
      >
        {copied ? '✓ Copied' : 'Share'}
      </button>
      <button
        onClick={whatsapp}
        className="text-stone text-[0.6rem] tracking-[0.2em] uppercase font-light hover:text-[#25D366] transition-colors duration-500"
      >
        WhatsApp
      </button>
    </div>
  );
}
