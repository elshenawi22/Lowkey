import { useEffect, useState } from 'react';
import { RouterProvider, useRouter } from './router';
import { BagProvider, useBag } from './context/BagContext';
import { initAnalytics } from './lib/analytics';
import { initBotDetection } from './lib/security';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import BagDrawer from './components/BagDrawer';
import WhatsAppButton from './components/WhatsAppButton';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import Drop001Page from './pages/Drop001Page';
import TrackPage from './pages/TrackPage';
import PolicyPage from './pages/PolicyPage';
import ArchivePage from './pages/ArchivePage';
import AboutPage from './pages/AboutPage';
import LaunchPage from './pages/LaunchPage';
import AdminPage from './pages/AdminPage';
import ReviewsPage from './pages/ReviewsPage';
import NotFoundState from './pages/NotFoundState';
import ReviewToast from './components/ReviewToast';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import { loadContent } from './lib/cms';

function Routes() {
  const { path } = useRouter();
  const { open: openBag } = useBag();
  const segments = path.split('/').filter(Boolean);
  const [launchMode, setLaunchMode] = useState(() => loadContent().launch_mode === 'on');

  // Wire the Navigation bag button event to the BagContext open()
  useEffect(() => {
    const handler = () => openBag();
    window.addEventListener('lk:open-bag', handler);
    return () => window.removeEventListener('lk:open-bag', handler);
  }, [openBag]);

  // Poll Supabase every 10 seconds for launch mode changes
  useEffect(() => {
    // Initial check
    const checkLaunch = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.from('site_content').select('data').eq('id', 'main').single();
          if (data?.data) {
            const isOn = (data.data as any).launch_mode === 'on';
            setLaunchMode(isOn);
            // Update localStorage so loadContent() stays in sync
            const current = loadContent();
            if (current.launch_mode !== (isOn ? 'on' : 'off')) {
              localStorage.setItem('lowkey-cms', JSON.stringify({ ...current, launch_mode: isOn ? 'on' : 'off' }));
            }
          }
        } catch { /* ignore */ }
      }
    };
    
    checkLaunch();
    const interval = setInterval(checkLaunch, 10000); // Check every 10 seconds
    
    // Also listen for CMS updates from admin (same tab)
    const handler = () => setLaunchMode(loadContent().launch_mode === 'on');
    window.addEventListener('lowkey-cms-update', handler);
    
    return () => { clearInterval(interval); window.removeEventListener('lowkey-cms-update', handler); };
  }, []);

  // Admin — always accessible
  if (segments[0] === 'lk-admin' || sessionStorage.getItem('lk-go-admin') === '1') {
    sessionStorage.removeItem('lk-go-admin');
    return <AdminPage />;
  }

  // Launch Mode — real-time from Supabase
  if (launchMode) return <LaunchPage />;

  // Normal
  let page;
  if (segments.length === 0) {
    page = <HomePage />;
  } else if (segments[0] === 'drop') {
    page = <Drop001Page />;
  } else if (segments[0] === 'product' && segments.length === 2) {
    page = <ProductPage slug={segments[1]} />;
  } else if (segments[0] === 'archive') {
    page = <ArchivePage />;
  } else if (segments[0] === 'about') {
    page = <AboutPage />;
  } else if (segments[0] === 'track') {
    page = <TrackPage />;
  } else if (segments[0] === 'policy') {
    page = <PolicyPage />;
  } else if (segments[0] === 'reviews') {
    page = <ReviewsPage />;
  } else {
    page = <NotFoundState />;
  }

  return (
    <>
      <Navigation />
      <div key={path} className="page-enter">{page}</div>
      <Footer />
    </>
  );
}

export default function App() {
  useEffect(() => { initAnalytics(); initBotDetection(); }, []);
  return (
    <ErrorBoundary>
      <RouterProvider>
        <BagProvider>
          <div className="min-h-screen bg-cream">
            <Routes />
            <BagDrawer />
            <WhatsAppButton />
            <ScrollToTop />
            <ReviewToast />
          </div>
        </BagProvider>
      </RouterProvider>
    </ErrorBoundary>
  );
}
