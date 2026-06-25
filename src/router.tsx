// ============================================================================
// LOWKEY — Router (History API)
// Real paths (e.g. /product/heritage-knit-polo) instead of hash fragments.
// Requires the host to rewrite all paths to index.html (see vercel.json) so
// a hard refresh on a deep link still serves the app instead of a 404.
// ============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type MouseEvent,
  type CSSProperties,
} from 'react';

interface RouterState {
  path: string;
  navigate: (to: string, section?: string) => void;
}

const RouterContext = createContext<RouterState>({
  path: '/',
  navigate: () => {},
});

function readPath(): string {
  const raw = window.location.pathname;
  if (!raw || raw === '') return '/';
  return raw.startsWith('/') ? raw : '/' + raw;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(readPath());
  // Stable ref shared between navigate() and the popstate listener so that
  // section-scroll intent survives the route change.
  const pendingSectionRef = useRef<string | null>(null);

  useEffect(() => {
    const onPopState = () => {
      setPath(readPath());
      // Scroll to top on navigation — unless we're scrolling to a home section.
      if (!pendingSectionRef.current) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // After arriving on home with a pending section, smooth-scroll to it.
  useEffect(() => {
    const section = pendingSectionRef.current;
    if (path === '/' && section) {
      pendingSectionRef.current = null;
      const el = document.getElementById(section);
      if (el) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth' }))
        );
      }
    }
  }, [path]);

  const navigate = useCallback((to: string, section?: string) => {
    if (section) {
      pendingSectionRef.current = section;
      // Already on the target route — just scroll.
      if (readPath() === to) {
        const el = document.getElementById(section);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        pendingSectionRef.current = null;
        return;
      }
    }
    // Same route, no section — just return to top.
    if (readPath() === to) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState(null, '', to);
    setPath(to);
    if (!section) window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRouter() {
  return useContext(RouterContext);
}

interface LinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  section?: string;
  onClick?: () => void;
  ariaLabel?: string;
  style?: CSSProperties;
}

// eslint-disable-next-line react-refresh/only-export-components
export function Link({
  to,
  children,
  className,
  section,
  onClick,
  ariaLabel,
  style,
}: LinkProps) {
  const { navigate } = useRouter();
  const handleClick = (e: MouseEvent) => {
    // Allow modifier-clicks (new tab etc.) to behave natively.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onClick?.();
    navigate(to, section);
  };
  return (
    <a
      href={to}
      className={className}
      onClick={handleClick}
      aria-label={ariaLabel}
      style={style}
    >
      {children}
    </a>
  );
}
